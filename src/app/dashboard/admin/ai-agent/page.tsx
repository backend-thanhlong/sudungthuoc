"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
    Activity,
    AlertTriangle,
    Bot,
    CheckCircle2,
    Gauge,
    Loader2,
    RefreshCw,
    Save,
    Search,
    ShieldCheck,
    SlidersHorizontal,
    Stethoscope,
    UserCog,
    Wrench,
    XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

type Role = "ADMIN" | "FACILITY";
type TriState = "inherit" | "true" | "false";
type ProviderSlot = "primary" | "fallback";

interface AIQuota {
    adminChatPerDay: number;
    adminReviewPerDay: number;
    facilityChatPerDay: number;
    facilityReviewPerDay: number;
}

interface AISettings {
    globalEnabled: boolean;
    chatEnabled: boolean;
    reviewEnabled: boolean;
    fallbackEnabled: boolean;
    quota: AIQuota;
}

interface ProviderRuntimeStatus {
    slot: ProviderSlot;
    provider: "google" | "openai" | "deepseek";
    model: string;
    configured: boolean;
}

interface ProviderStatus {
    hasGoogleApiKey: boolean;
    hasOpenAIApiKey: boolean;
    hasDeepSeekApiKey: boolean;
    primary: ProviderRuntimeStatus;
    fallback: ProviderRuntimeStatus;
}

interface SettingsResponse {
    settings: AISettings;
    defaults: AISettings;
    providerStatus: ProviderStatus;
    policyVersion: string;
}

interface UsageSummary {
    requests: number;
    success: number;
    errors: number;
    quotaExceeded: number;
    cacheHits: number;
    fallbackRequests: number;
    inputTokens: number;
    outputTokens: number;
    estimatedCostUsd: number;
    uniqueUsers: number;
}

interface RecentAIUsage {
    id: string;
    createdAt: string;
    user: {
        id: string;
        username: string;
        facilityName: string | null;
        role: Role;
    };
    role?: Role;
    mode?: string;
    model?: string;
    status: "success" | "error" | "quota_exceeded";
    usedFallback: boolean;
    cacheHit: boolean;
    estimatedCostUsd: number;
    errorCode?: string;
    warnings: string[];
    toolNames: string[];
}

interface UsageResponse {
    summary: UsageSummary;
    recent: RecentAIUsage[];
}

interface AIUserPolicy {
    enabled: boolean | null;
    chatDailyLimit: number | null;
    reviewDailyLimit: number | null;
    allowFallback: boolean | null;
    note: string | null;
    updatedAt?: string;
}

interface AIManagedUser {
    id: string;
    username: string;
    facilityName: string | null;
    facilityCode: string | null;
    role: Role;
    label: string;
    aiUserPolicy: AIUserPolicy | null;
    effectivePolicy: {
        enabled: boolean;
        chatEnabled: boolean;
        reviewEnabled: boolean;
        chatDailyLimit: number;
        reviewDailyLimit: number;
        allowFallback: boolean;
    };
    usageToday: {
        requests: number;
        chat: number;
        review: number;
        success: number;
        errors: number;
        quotaExceeded: number;
    };
}

interface UsersResponse {
    users: AIManagedUser[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

interface ToolRow {
    name: string;
    label: string;
    description: string;
    roles: Role[];
    modes: string[];
    surfaces?: string[];
    enabledByRole: Record<Role, boolean | null>;
}

interface ToolsResponse {
    roles: Role[];
    tools: ToolRow[];
}

interface HealthResult {
    ok: boolean;
    provider: string;
    model: string;
    configured: boolean;
    latencyMs: number;
    errorCode?: string;
    message: string;
}

interface UserPolicyDraft {
    enabled: TriState;
    chatDailyLimit: string;
    reviewDailyLimit: string;
    allowFallback: TriState;
    note: string;
}

function formatNumber(value: number) {
    return new Intl.NumberFormat("vi-VN").format(value || 0);
}

function formatCost(value: number) {
    if (!value) return "$0";
    return `$${value.toFixed(6).replace(/0+$/, "").replace(/\.$/, "")}`;
}

function formatDateTime(value: string) {
    return new Date(value).toLocaleString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function roleLabel(role?: string) {
    if (role === "ADMIN") return "Admin";
    if (role === "FACILITY") return "Cơ sở";
    return role || "Không rõ";
}

function modeLabel(mode?: string) {
    if (mode === "chat") return "Chat";
    if (mode === "review") return "Kiểm tra";
    return mode || "Không rõ";
}

function statusBadge(status: RecentAIUsage["status"]) {
    if (status === "success") {
        return <Badge className="bg-emerald-100 text-emerald-700">Thành công</Badge>;
    }
    if (status === "quota_exceeded") {
        return <Badge className="bg-amber-100 text-amber-700">Hết quota</Badge>;
    }
    return <Badge className="bg-red-100 text-red-700">Lỗi</Badge>;
}

function boolBadge(value: boolean, trueLabel = "Bật", falseLabel = "Tắt") {
    return value
        ? <Badge className="bg-emerald-100 text-emerald-700">{trueLabel}</Badge>
        : <Badge className="bg-slate-100 text-slate-600">{falseLabel}</Badge>;
}

function toolKey(toolName: string, role: Role) {
    return `${toolName}:${role}`;
}

function triStateValue(value: boolean | null | undefined): TriState {
    if (value === true) return "true";
    if (value === false) return "false";
    return "inherit";
}

function triStatePayload(value: TriState) {
    if (value === "true") return true;
    if (value === "false") return false;
    return null;
}

function numericPayload(value: string) {
    const trimmed = value.trim();
    if (!trimmed) return null;
    return Number.parseInt(trimmed, 10);
}

function StatCard({
    title,
    value,
    helper,
    icon: Icon,
    tone,
}: {
    title: string;
    value: string;
    helper: string;
    icon: typeof Bot;
    tone: "blue" | "emerald" | "amber" | "red" | "slate";
}) {
    const toneClass = {
        blue: "bg-blue-50 text-blue-700",
        emerald: "bg-emerald-50 text-emerald-700",
        amber: "bg-amber-50 text-amber-700",
        red: "bg-red-50 text-red-700",
        slate: "bg-slate-100 text-slate-700",
    }[tone];

    return (
        <Card className="rounded-lg border-slate-200 shadow-sm">
            <CardContent className="flex items-start justify-between gap-3 p-5">
                <div className="min-w-0">
                    <p className="text-sm text-slate-500">{title}</p>
                    <p className="mt-2 text-2xl font-semibold tracking-normal text-slate-950">{value}</p>
                    <p className="mt-1 text-xs text-slate-500">{helper}</p>
                </div>
                <div className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${toneClass}`}>
                    <Icon className="size-5" />
                </div>
            </CardContent>
        </Card>
    );
}

function SettingToggle({
    label,
    checked,
    onChange,
}: {
    label: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
}) {
    return (
        <label className="flex min-h-12 items-center justify-between gap-4 rounded-lg border border-slate-200 px-4 py-3">
            <span className="text-sm font-medium text-slate-800">{label}</span>
            <input
                type="checkbox"
                checked={checked}
                onChange={(event) => onChange(event.target.checked)}
                className="size-5 accent-blue-600"
            />
        </label>
    );
}

export default function AdminAIAgentConsolePage() {
    const [settingsData, setSettingsData] = useState<SettingsResponse | null>(null);
    const [settingsDraft, setSettingsDraft] = useState<AISettings | null>(null);
    const [usageData, setUsageData] = useState<UsageResponse | null>(null);
    const [usersData, setUsersData] = useState<UsersResponse | null>(null);
    const [toolsData, setToolsData] = useState<ToolsResponse | null>(null);
    const [toolDraft, setToolDraft] = useState<Record<string, boolean>>({});
    const [healthResults, setHealthResults] = useState<Partial<Record<ProviderSlot, HealthResult>>>({});
    const [loading, setLoading] = useState(true);
    const [savingSettings, setSavingSettings] = useState(false);
    const [savingTools, setSavingTools] = useState(false);
    const [runningHealth, setRunningHealth] = useState<ProviderSlot | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);
    const [userSearch, setUserSearch] = useState("");
    const [userRole, setUserRole] = useState("");
    const [selectedUser, setSelectedUser] = useState<AIManagedUser | null>(null);
    const [userDraft, setUserDraft] = useState<UserPolicyDraft>({
        enabled: "inherit",
        chatDailyLimit: "",
        reviewDailyLimit: "",
        allowFallback: "inherit",
        note: "",
    });
    const [savingUser, setSavingUser] = useState(false);

    const loadSettings = useCallback(async () => {
        const response = await fetch("/api/admin/ai-agent/settings");
        const payload = await response.json().catch(() => null);
        if (!response.ok) {
            throw new Error(payload?.message || "Không thể tải cấu hình AI");
        }
        setSettingsData(payload);
        setSettingsDraft(payload.settings);
    }, []);

    const loadUsage = useCallback(async () => {
        const response = await fetch("/api/admin/ai-usage");
        const payload = await response.json().catch(() => null);
        if (!response.ok) {
            throw new Error(payload?.message || "Không thể tải usage AI");
        }
        setUsageData(payload);
    }, []);

    const loadTools = useCallback(async () => {
        const response = await fetch("/api/admin/ai-agent/tools");
        const payload = await response.json().catch(() => null);
        if (!response.ok) {
            throw new Error(payload?.message || "Không thể tải tool policy");
        }
        setToolsData(payload);
        const nextDraft: Record<string, boolean> = {};
        payload.tools.forEach((tool: ToolRow) => {
            payload.roles.forEach((role: Role) => {
                const value = tool.enabledByRole[role];
                if (value !== null) {
                    nextDraft[toolKey(tool.name, role)] = value;
                }
            });
        });
        setToolDraft(nextDraft);
    }, []);

    const loadUsers = useCallback(async () => {
        const params = new URLSearchParams();
        if (userSearch.trim()) params.set("search", userSearch.trim());
        if (userRole) params.set("role", userRole);
        const response = await fetch(`/api/admin/ai-agent/users?${params.toString()}`);
        const payload = await response.json().catch(() => null);
        if (!response.ok) {
            throw new Error(payload?.message || "Không thể tải user policy");
        }
        setUsersData(payload);
    }, [userRole, userSearch]);

    const loadAll = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            await Promise.all([loadSettings(), loadUsage(), loadTools(), loadUsers()]);
        } catch (loadError) {
            setError(loadError instanceof Error ? loadError.message : "Lỗi kết nối");
        } finally {
            setLoading(false);
        }
    }, [loadSettings, loadTools, loadUsage, loadUsers]);

    useEffect(() => {
        setLoading(true);
        setError(null);
        Promise.all([loadSettings(), loadUsage(), loadTools()])
            .catch((loadError) => {
                setError(loadError instanceof Error ? loadError.message : "Lỗi kết nối");
            })
            .finally(() => setLoading(false));
    }, [loadSettings, loadTools, loadUsage]);

    useEffect(() => {
        void loadUsers().catch((loadError) => {
            setError(loadError instanceof Error ? loadError.message : "Không thể tải user policy");
        });
    }, [loadUsers]);

    const summary = usageData?.summary;
    const totalTokens = (summary?.inputTokens || 0) + (summary?.outputTokens || 0);

    const providerRows = useMemo(() => {
        if (!settingsData) return [];
        return [settingsData.providerStatus.primary, settingsData.providerStatus.fallback];
    }, [settingsData]);

    async function saveSettings() {
        if (!settingsDraft) return;
        setSavingSettings(true);
        setNotice(null);
        setError(null);
        try {
            const response = await fetch("/api/admin/ai-agent/settings", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(settingsDraft),
            });
            const payload = await response.json().catch(() => null);
            if (!response.ok) {
                throw new Error(payload?.message || "Không thể lưu cấu hình AI");
            }
            setSettingsData(previous => previous ? { ...previous, ...payload } : payload);
            setSettingsDraft(payload.settings);
            setNotice("Đã lưu cấu hình AI");
        } catch (saveError) {
            setError(saveError instanceof Error ? saveError.message : "Lỗi kết nối");
        } finally {
            setSavingSettings(false);
        }
    }

    function openUserDialog(user: AIManagedUser) {
        setSelectedUser(user);
        setUserDraft({
            enabled: triStateValue(user.aiUserPolicy?.enabled),
            chatDailyLimit: user.aiUserPolicy?.chatDailyLimit === null || user.aiUserPolicy?.chatDailyLimit === undefined
                ? ""
                : String(user.aiUserPolicy.chatDailyLimit),
            reviewDailyLimit: user.aiUserPolicy?.reviewDailyLimit === null || user.aiUserPolicy?.reviewDailyLimit === undefined
                ? ""
                : String(user.aiUserPolicy.reviewDailyLimit),
            allowFallback: triStateValue(user.aiUserPolicy?.allowFallback),
            note: user.aiUserPolicy?.note || "",
        });
    }

    async function saveUserPolicy() {
        if (!selectedUser) return;
        setSavingUser(true);
        setError(null);
        try {
            const response = await fetch(`/api/admin/ai-agent/users/${selectedUser.id}/policy`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    enabled: triStatePayload(userDraft.enabled),
                    chatDailyLimit: numericPayload(userDraft.chatDailyLimit),
                    reviewDailyLimit: numericPayload(userDraft.reviewDailyLimit),
                    allowFallback: triStatePayload(userDraft.allowFallback),
                    note: userDraft.note.trim() || null,
                }),
            });
            const payload = await response.json().catch(() => null);
            if (!response.ok) {
                throw new Error(payload?.message || "Không thể lưu policy user");
            }
            setSelectedUser(null);
            setNotice("Đã lưu policy user");
            await loadUsers();
        } catch (saveError) {
            setError(saveError instanceof Error ? saveError.message : "Lỗi kết nối");
        } finally {
            setSavingUser(false);
        }
    }

    async function resetUserPolicy(user: AIManagedUser) {
        if (!window.confirm(`Reset policy AI cho ${user.label}?`)) {
            return;
        }
        setError(null);
        try {
            const response = await fetch(`/api/admin/ai-agent/users/${user.id}/policy`, { method: "DELETE" });
            const payload = await response.json().catch(() => null);
            if (!response.ok) {
                throw new Error(payload?.message || "Không thể reset policy user");
            }
            setNotice("Đã reset policy user");
            await loadUsers();
        } catch (resetError) {
            setError(resetError instanceof Error ? resetError.message : "Lỗi kết nối");
        }
    }

    async function saveTools() {
        if (!toolsData) return;
        setSavingTools(true);
        setError(null);
        try {
            const policies = toolsData.tools.flatMap(tool => toolsData.roles
                .filter(role => tool.enabledByRole[role] !== null)
                .map(role => ({
                    toolName: tool.name,
                    role,
                    enabled: toolDraft[toolKey(tool.name, role)] !== false,
                })));
            const response = await fetch("/api/admin/ai-agent/tools", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ policies }),
            });
            const payload = await response.json().catch(() => null);
            if (!response.ok) {
                throw new Error(payload?.message || "Không thể lưu tool policy");
            }
            setNotice("Đã lưu tool policy");
            await loadTools();
        } catch (saveError) {
            setError(saveError instanceof Error ? saveError.message : "Lỗi kết nối");
        } finally {
            setSavingTools(false);
        }
    }

    async function runHealth(slot: ProviderSlot) {
        setRunningHealth(slot);
        setError(null);
        try {
            const response = await fetch("/api/admin/ai-agent/health-check", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ provider: slot }),
            });
            const payload = await response.json().catch(() => null);
            setHealthResults(previous => ({ ...previous, [slot]: payload }));
            if (!response.ok && !payload) {
                throw new Error("Health check thất bại");
            }
        } catch (healthError) {
            setError(healthError instanceof Error ? healthError.message : "Lỗi kết nối");
        } finally {
            setRunningHealth(null);
        }
    }

    if (loading) {
        return (
            <div className="flex min-h-[420px] items-center justify-center gap-3 text-slate-500">
                <Loader2 className="size-6 animate-spin" />
                Đang tải quản trị AI...
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-lg bg-blue-600 text-white">
                        <Bot className="size-5" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold tracking-normal text-slate-950">Quản trị AI</h1>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-500">
                            {settingsData && boolBadge(settingsData.settings.globalEnabled, "Global bật", "Global tắt")}
                            {settingsData && <Badge variant="outline">Policy {settingsData.policyVersion}</Badge>}
                        </div>
                    </div>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button variant="outline" onClick={loadAll}>
                        <RefreshCw className="size-4" />
                        Tải lại
                    </Button>
                    <Button variant="outline" asChild>
                        <Link href="/dashboard/admin/ai-usage">
                            <Activity className="size-4" />
                            Theo dõi AI
                        </Link>
                    </Button>
                </div>
            </div>

            {error && (
                <Card className="rounded-lg border-red-200 bg-red-50 shadow-sm">
                    <CardContent className="flex items-center gap-3 p-4 text-red-700">
                        <AlertTriangle className="size-5" />
                        <p className="text-sm font-medium">{error}</p>
                    </CardContent>
                </Card>
            )}
            {notice && (
                <Card className="rounded-lg border-emerald-200 bg-emerald-50 shadow-sm">
                    <CardContent className="flex items-center gap-3 p-4 text-emerald-700">
                        <CheckCircle2 className="size-5" />
                        <p className="text-sm font-medium">{notice}</p>
                    </CardContent>
                </Card>
            )}

            <Tabs defaultValue="overview" className="space-y-4">
                <TabsList className="flex h-auto w-full flex-wrap justify-start rounded-lg bg-slate-100 p-1">
                    <TabsTrigger value="overview"><Gauge className="size-4" />Tổng quan</TabsTrigger>
                    <TabsTrigger value="settings"><SlidersHorizontal className="size-4" />Cấu hình</TabsTrigger>
                    <TabsTrigger value="users"><UserCog className="size-4" />Người dùng</TabsTrigger>
                    <TabsTrigger value="tools"><Wrench className="size-4" />Tools</TabsTrigger>
                    <TabsTrigger value="audit"><Activity className="size-4" />Audit</TabsTrigger>
                    <TabsTrigger value="health"><Stethoscope className="size-4" />Health</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                        <StatCard
                            title="Request"
                            value={formatNumber(summary?.requests || 0)}
                            helper={`${formatNumber(summary?.uniqueUsers || 0)} người dùng`}
                            icon={Bot}
                            tone="blue"
                        />
                        <StatCard
                            title="Thành công"
                            value={formatNumber(summary?.success || 0)}
                            helper={`${formatNumber(summary?.errors || 0)} lỗi, ${formatNumber(summary?.quotaExceeded || 0)} hết quota`}
                            icon={CheckCircle2}
                            tone="emerald"
                        />
                        <StatCard
                            title="Token"
                            value={formatNumber(totalTokens)}
                            helper={`${formatNumber(summary?.inputTokens || 0)} input, ${formatNumber(summary?.outputTokens || 0)} output`}
                            icon={Gauge}
                            tone="slate"
                        />
                        <StatCard
                            title="Cost"
                            value={formatCost(summary?.estimatedCostUsd || 0)}
                            helper="Ước tính từ ActivityLog"
                            icon={ShieldCheck}
                            tone="amber"
                        />
                        <StatCard
                            title="Cache / fallback"
                            value={`${formatNumber(summary?.cacheHits || 0)} / ${formatNumber(summary?.fallbackRequests || 0)}`}
                            helper="Cache hit / fallback model"
                            icon={RefreshCw}
                            tone="blue"
                        />
                    </div>

                    <div className="grid gap-4 lg:grid-cols-2">
                        <Card className="rounded-lg border-slate-200 shadow-sm">
                            <CardHeader>
                                <CardTitle className="text-base">Provider</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {providerRows.map(provider => (
                                    <div key={provider.slot} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-4 py-3">
                                        <div className="min-w-0">
                                            <p className="font-medium text-slate-900">
                                                {provider.slot === "primary" ? "Primary" : "Fallback"} · {provider.provider}
                                            </p>
                                            <p className="truncate text-sm text-slate-500">{provider.model}</p>
                                        </div>
                                        {boolBadge(provider.configured, "Configured", "Missing key")}
                                    </div>
                                ))}
                            </CardContent>
                        </Card>

                        <Card className="rounded-lg border-slate-200 shadow-sm">
                            <CardHeader>
                                <CardTitle className="text-base">Request gần đây</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {(usageData?.recent || []).slice(0, 5).map(log => (
                                    <div key={log.id} className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-medium text-slate-900">
                                                {log.user.facilityName || log.user.username}
                                            </p>
                                            <p className="text-xs text-slate-500">{formatDateTime(log.createdAt)} · {modeLabel(log.mode)}</p>
                                        </div>
                                        {statusBadge(log.status)}
                                    </div>
                                ))}
                                {!usageData?.recent?.length && <p className="py-8 text-center text-sm text-slate-400">Chưa có log AI</p>}
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="settings" className="space-y-4">
                    {settingsDraft && (
                        <>
                            <div className="grid gap-4 lg:grid-cols-2">
                                <Card className="rounded-lg border-slate-200 shadow-sm">
                                    <CardHeader>
                                        <CardTitle className="text-base">Policy</CardTitle>
                                    </CardHeader>
                                    <CardContent className="grid gap-3">
                                        <SettingToggle label="Global AI" checked={settingsDraft.globalEnabled} onChange={(checked) => setSettingsDraft({ ...settingsDraft, globalEnabled: checked })} />
                                        <SettingToggle label="Chat" checked={settingsDraft.chatEnabled} onChange={(checked) => setSettingsDraft({ ...settingsDraft, chatEnabled: checked })} />
                                        <SettingToggle label="Review" checked={settingsDraft.reviewEnabled} onChange={(checked) => setSettingsDraft({ ...settingsDraft, reviewEnabled: checked })} />
                                        <SettingToggle label="Fallback" checked={settingsDraft.fallbackEnabled} onChange={(checked) => setSettingsDraft({ ...settingsDraft, fallbackEnabled: checked })} />
                                    </CardContent>
                                </Card>

                                <Card className="rounded-lg border-slate-200 shadow-sm">
                                    <CardHeader>
                                        <CardTitle className="text-base">Quota mặc định</CardTitle>
                                    </CardHeader>
                                    <CardContent className="grid gap-3 sm:grid-cols-2">
                                        {([
                                            ["adminChatPerDay", "Admin chat"],
                                            ["adminReviewPerDay", "Admin review"],
                                            ["facilityChatPerDay", "Cơ sở chat"],
                                            ["facilityReviewPerDay", "Cơ sở review"],
                                        ] as const).map(([field, label]) => (
                                            <Label key={field} className="flex-col items-start gap-1">
                                                <span className="text-xs text-slate-500">{label}</span>
                                                <Input
                                                    type="number"
                                                    min={0}
                                                    max={1000}
                                                    value={settingsDraft.quota[field]}
                                                    onChange={(event) => setSettingsDraft({
                                                        ...settingsDraft,
                                                        quota: {
                                                            ...settingsDraft.quota,
                                                            [field]: Number.parseInt(event.target.value || "0", 10),
                                                        },
                                                    })}
                                                />
                                            </Label>
                                        ))}
                                    </CardContent>
                                </Card>
                            </div>

                            <div className="flex justify-end">
                                <Button onClick={saveSettings} disabled={savingSettings}>
                                    {savingSettings ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                                    Lưu cấu hình
                                </Button>
                            </div>
                        </>
                    )}
                </TabsContent>

                <TabsContent value="users" className="space-y-4">
                    <Card className="rounded-lg border-slate-200 shadow-sm">
                        <CardContent className="grid gap-3 p-4 md:grid-cols-[minmax(0,1fr)_180px]">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                                <Input
                                    value={userSearch}
                                    onChange={(event) => setUserSearch(event.target.value)}
                                    placeholder="Tên, username, mã cơ sở"
                                    className="pl-9"
                                />
                            </div>
                            <select
                                value={userRole}
                                onChange={(event) => setUserRole(event.target.value)}
                                className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900"
                            >
                                <option value="">Tất cả role</option>
                                <option value="ADMIN">Admin</option>
                                <option value="FACILITY">Cơ sở</option>
                            </select>
                        </CardContent>
                    </Card>

                    <Card className="rounded-lg border-slate-200 shadow-sm">
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Người dùng</TableHead>
                                        <TableHead>Policy</TableHead>
                                        <TableHead>Quota</TableHead>
                                        <TableHead>Hôm nay</TableHead>
                                        <TableHead className="text-right">Thao tác</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {(usersData?.users || []).map(user => (
                                        <TableRow key={user.id}>
                                            <TableCell>
                                                <div className="min-w-48">
                                                    <p className="font-medium text-slate-900">{user.label}</p>
                                                    <p className="text-xs text-slate-500">{user.username} · {roleLabel(user.role)}</p>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-wrap gap-1">
                                                    {boolBadge(user.effectivePolicy.enabled, "Enabled", "Disabled")}
                                                    {user.aiUserPolicy && <Badge variant="outline">Override</Badge>}
                                                    {user.effectivePolicy.allowFallback && <Badge variant="outline">Fallback</Badge>}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-sm text-slate-600">
                                                Chat {formatNumber(user.effectivePolicy.chatDailyLimit)} · Review {formatNumber(user.effectivePolicy.reviewDailyLimit)}
                                            </TableCell>
                                            <TableCell className="text-sm text-slate-600">
                                                {formatNumber(user.usageToday.requests)} request
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button size="sm" variant="outline" onClick={() => openUserDialog(user)}>Sửa</Button>
                                                    <Button size="sm" variant="ghost" onClick={() => resetUserPolicy(user)} disabled={!user.aiUserPolicy}>Reset</Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                            {!usersData?.users?.length && <p className="py-12 text-center text-sm text-slate-400">Không có user phù hợp</p>}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="tools" className="space-y-4">
                    <Card className="rounded-lg border-slate-200 shadow-sm">
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Tool</TableHead>
                                        <TableHead>Mode</TableHead>
                                        <TableHead className="text-center">Admin</TableHead>
                                        <TableHead className="text-center">Cơ sở</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {(toolsData?.tools || []).map(tool => (
                                        <TableRow key={tool.name}>
                                            <TableCell>
                                                <div className="max-w-xl">
                                                    <p className="font-medium text-slate-900">{tool.label}</p>
                                                    <p className="text-xs text-slate-500">{tool.name}</p>
                                                    <p className="mt-1 text-sm text-slate-500">{tool.description}</p>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-sm text-slate-600">{tool.modes.join(", ")}</TableCell>
                                            {(["ADMIN", "FACILITY"] as Role[]).map(role => {
                                                const supported = tool.enabledByRole[role] !== null;
                                                return (
                                                    <TableCell key={role} className="text-center">
                                                        {supported ? (
                                                            <input
                                                                type="checkbox"
                                                                checked={toolDraft[toolKey(tool.name, role)] !== false}
                                                                onChange={(event) => setToolDraft({
                                                                    ...toolDraft,
                                                                    [toolKey(tool.name, role)]: event.target.checked,
                                                                })}
                                                                className="size-5 accent-blue-600"
                                                            />
                                                        ) : (
                                                            <span className="text-slate-300">-</span>
                                                        )}
                                                    </TableCell>
                                                );
                                            })}
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                    <div className="flex justify-end">
                        <Button onClick={saveTools} disabled={savingTools}>
                            {savingTools ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                            Lưu tool policy
                        </Button>
                    </div>
                </TabsContent>

                <TabsContent value="audit" className="space-y-4">
                    <Card className="rounded-lg border-slate-200 shadow-sm">
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Thời gian</TableHead>
                                        <TableHead>Người dùng</TableHead>
                                        <TableHead>Mode</TableHead>
                                        <TableHead>Model</TableHead>
                                        <TableHead>Trạng thái</TableHead>
                                        <TableHead>Ghi chú</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {(usageData?.recent || []).map(log => (
                                        <TableRow key={log.id}>
                                            <TableCell className="text-slate-600">{formatDateTime(log.createdAt)}</TableCell>
                                            <TableCell>
                                                <p className="font-medium text-slate-900">{log.user.facilityName || log.user.username}</p>
                                                <p className="text-xs text-slate-500">{roleLabel(log.role || log.user.role)}</p>
                                            </TableCell>
                                            <TableCell>{modeLabel(log.mode)}</TableCell>
                                            <TableCell className="max-w-56 truncate text-slate-600">{log.model || "local-or-unset"}</TableCell>
                                            <TableCell>{statusBadge(log.status)}</TableCell>
                                            <TableCell>
                                                <div className="flex flex-wrap gap-1">
                                                    {log.cacheHit && <Badge variant="outline">Cache</Badge>}
                                                    {log.usedFallback && <Badge variant="outline">Fallback</Badge>}
                                                    {log.errorCode && <Badge className="bg-red-100 text-red-700">{log.errorCode}</Badge>}
                                                    {log.toolNames.slice(0, 2).map(tool => <Badge key={tool} variant="secondary">{tool}</Badge>)}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                            {!usageData?.recent?.length && <p className="py-12 text-center text-sm text-slate-400">Chưa có log AI</p>}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="health" className="space-y-4">
                    <div className="grid gap-4 lg:grid-cols-2">
                        {providerRows.map(provider => {
                            const result = healthResults[provider.slot];
                            return (
                                <Card key={provider.slot} className="rounded-lg border-slate-200 shadow-sm">
                                    <CardHeader>
                                        <CardTitle className="flex items-center justify-between gap-3 text-base">
                                            <span>{provider.slot === "primary" ? "Primary" : "Fallback"} provider</span>
                                            {boolBadge(provider.configured, "Configured", "Missing key")}
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div>
                                            <p className="text-sm font-medium text-slate-900">{provider.provider}</p>
                                            <p className="text-sm text-slate-500">{provider.model}</p>
                                        </div>
                                        <Button onClick={() => runHealth(provider.slot)} disabled={runningHealth === provider.slot}>
                                            {runningHealth === provider.slot ? <Loader2 className="size-4 animate-spin" /> : <Stethoscope className="size-4" />}
                                            Test provider
                                        </Button>
                                        {result && (
                                            <div className={`rounded-lg border p-3 text-sm ${result.ok ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700"}`}>
                                                <div className="flex items-center gap-2 font-medium">
                                                    {result.ok ? <CheckCircle2 className="size-4" /> : <XCircle className="size-4" />}
                                                    {result.ok ? "OK" : result.errorCode || "ERROR"}
                                                </div>
                                                <p className="mt-1">{result.message}</p>
                                                <p className="mt-1 text-xs opacity-80">{formatNumber(result.latencyMs)}ms</p>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                </TabsContent>
            </Tabs>

            <Dialog open={Boolean(selectedUser)} onOpenChange={(open) => !open && setSelectedUser(null)}>
                <DialogContent className="sm:max-w-xl">
                    <DialogHeader>
                        <DialogTitle>Policy user</DialogTitle>
                        <DialogDescription>
                            {selectedUser?.label} · {selectedUser ? roleLabel(selectedUser.role) : ""}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4">
                        <div className="grid gap-3 sm:grid-cols-2">
                            <Label className="flex-col items-start gap-1">
                                <span className="text-xs text-slate-500">Enabled</span>
                                <select
                                    value={userDraft.enabled}
                                    onChange={(event) => setUserDraft({ ...userDraft, enabled: event.target.value as TriState })}
                                    className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                                >
                                    <option value="inherit">Inherit</option>
                                    <option value="true">Bật</option>
                                    <option value="false">Tắt</option>
                                </select>
                            </Label>
                            <Label className="flex-col items-start gap-1">
                                <span className="text-xs text-slate-500">Fallback</span>
                                <select
                                    value={userDraft.allowFallback}
                                    onChange={(event) => setUserDraft({ ...userDraft, allowFallback: event.target.value as TriState })}
                                    className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                                >
                                    <option value="inherit">Inherit</option>
                                    <option value="true">Bật</option>
                                    <option value="false">Tắt</option>
                                </select>
                            </Label>
                            <Label className="flex-col items-start gap-1">
                                <span className="text-xs text-slate-500">Chat daily limit</span>
                                <Input
                                    type="number"
                                    min={0}
                                    max={1000}
                                    value={userDraft.chatDailyLimit}
                                    onChange={(event) => setUserDraft({ ...userDraft, chatDailyLimit: event.target.value })}
                                    placeholder="Inherit"
                                />
                            </Label>
                            <Label className="flex-col items-start gap-1">
                                <span className="text-xs text-slate-500">Review daily limit</span>
                                <Input
                                    type="number"
                                    min={0}
                                    max={1000}
                                    value={userDraft.reviewDailyLimit}
                                    onChange={(event) => setUserDraft({ ...userDraft, reviewDailyLimit: event.target.value })}
                                    placeholder="Inherit"
                                />
                            </Label>
                        </div>
                        <Label className="flex-col items-start gap-1">
                            <span className="text-xs text-slate-500">Note</span>
                            <Textarea
                                value={userDraft.note}
                                onChange={(event) => setUserDraft({ ...userDraft, note: event.target.value })}
                                maxLength={500}
                            />
                        </Label>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setSelectedUser(null)}>Đóng</Button>
                        <Button onClick={saveUserPolicy} disabled={savingUser}>
                            {savingUser ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                            Lưu
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
