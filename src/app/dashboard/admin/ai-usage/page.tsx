"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
    AlertTriangle,
    BarChart3,
    CheckCircle2,
    DollarSign,
    Loader2,
    RefreshCw,
    Settings,
    Sparkles,
    Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

interface UserOption {
    id: string;
    username: string;
    facilityName: string | null;
    role: string;
}

interface AggregateRow {
    key: string;
    label: string;
    requests: number;
    success: number;
    errors: number;
    quotaExceeded: number;
    cacheHits: number;
    fallbackRequests: number;
    inputTokens: number;
    outputTokens: number;
    estimatedCostUsd: number;
}

interface SummaryRow extends AggregateRow {
    uniqueUsers: number;
}

interface RecentAIUsage {
    id: string;
    action?: string;
    entityType?: string;
    createdAt: string;
    user: UserOption;
    role?: string;
    mode?: string;
    surface?: string;
    model?: string;
    status: "success" | "error" | "quota_exceeded";
    usedFallback: boolean;
    cacheHit: boolean;
    inputTokens: number;
    outputTokens: number;
    estimatedCostUsd: number;
    errorCode?: string;
    warnings: string[];
    toolNames: string[];
}

interface AIUsageResponse {
    filters: {
        startDate: string;
        endDate: string;
        userId: string;
        role: string;
        mode: string;
        model: string;
        status: string;
        toolName: string;
        cacheHit: string;
        usedFallback: string;
        errorCode: string;
        includeHealth: boolean;
    };
    users: UserOption[];
    summary: SummaryRow;
    byDate: AggregateRow[];
    byRole: AggregateRow[];
    byMode: AggregateRow[];
    byModel: AggregateRow[];
    byUser: AggregateRow[];
    recent: RecentAIUsage[];
    scanned: number;
    maxScan: number;
}

function defaultStartDate() {
    const date = new Date();
    date.setDate(date.getDate() - 13);
    return date.toISOString().slice(0, 10);
}

function today() {
    return new Date().toISOString().slice(0, 10);
}

function formatNumber(value: number) {
    return new Intl.NumberFormat("vi-VN").format(value || 0);
}

function formatCost(value: number) {
    if (!value) {
        return "$0";
    }

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

function getStatusBadge(status: RecentAIUsage["status"]) {
    if (status === "success") {
        return <Badge className="bg-emerald-100 text-emerald-700">Thành công</Badge>;
    }
    if (status === "quota_exceeded") {
        return <Badge className="bg-amber-100 text-amber-700">Hết quota</Badge>;
    }
    return <Badge className="bg-red-100 text-red-700">Lỗi</Badge>;
}

function getModeLabel(mode?: string) {
    if (mode === "chat") return "Chat";
    if (mode === "review") return "Kiểm tra";
    return mode || "Không rõ";
}

function getRoleLabel(role?: string) {
    if (role === "ADMIN") return "Admin";
    if (role === "FACILITY") return "Cơ sở";
    return role || "Không rõ";
}

function maxRequests(rows: AggregateRow[]) {
    return Math.max(1, ...rows.map(row => row.requests));
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
    icon: typeof Sparkles;
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

function AggregateList({
    title,
    rows,
    emptyText,
}: {
    title: string;
    rows: AggregateRow[];
    emptyText: string;
}) {
    const max = maxRequests(rows);

    return (
        <Card className="rounded-lg border-slate-200 shadow-sm">
            <CardHeader className="pb-2">
                <CardTitle className="text-base text-slate-900">{title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                {rows.length === 0 ? (
                    <p className="py-6 text-center text-sm text-slate-400">{emptyText}</p>
                ) : rows.map(row => (
                    <div key={row.key} className="space-y-1.5">
                        <div className="flex items-center justify-between gap-3 text-sm">
                            <span className="min-w-0 truncate font-medium text-slate-700">{row.label}</span>
                            <span className="shrink-0 text-slate-500">{formatNumber(row.requests)} lượt</span>
                        </div>
                        <div className="h-2 rounded-full bg-slate-100">
                            <div
                                className="h-2 rounded-full bg-blue-600"
                                style={{ width: `${Math.max(4, (row.requests / max) * 100)}%` }}
                            />
                        </div>
                        <p className="text-xs text-slate-500">
                            {formatCost(row.estimatedCostUsd)} · cache {formatNumber(row.cacheHits)} · fallback {formatNumber(row.fallbackRequests)}
                        </p>
                    </div>
                ))}
            </CardContent>
        </Card>
    );
}

export default function AdminAIUsagePage() {
    const [data, setData] = useState<AIUsageResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [startDate, setStartDate] = useState(defaultStartDate);
    const [endDate, setEndDate] = useState(today);
    const [userId, setUserId] = useState("");
    const [role, setRole] = useState("");
    const [mode, setMode] = useState("");
    const [status, setStatus] = useState("");
    const [toolName, setToolName] = useState("");
    const [cacheHit, setCacheHit] = useState("");
    const [usedFallback, setUsedFallback] = useState("");
    const [errorCode, setErrorCode] = useState("");
    const [includeHealth, setIncludeHealth] = useState(false);

    const modelOptions = useMemo(() => {
        const models = new Set<string>();
        data?.byModel.forEach(row => {
            if (row.key) {
                models.add(row.key);
            }
        });
        return Array.from(models).sort();
    }, [data?.byModel]);
    const [model, setModel] = useState("");
    const toolOptions = useMemo(() => {
        const tools = new Set<string>();
        data?.recent.forEach(log => log.toolNames.forEach(tool => tools.add(tool)));
        return Array.from(tools).sort();
    }, [data?.recent]);
    const errorOptions = useMemo(() => {
        const errors = new Set<string>();
        data?.recent.forEach(log => {
            if (log.errorCode) errors.add(log.errorCode);
        });
        return Array.from(errors).sort();
    }, [data?.recent]);

    const loadUsage = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const params = new URLSearchParams();
            params.set("startDate", startDate);
            params.set("endDate", endDate);
            if (userId) params.set("userId", userId);
            if (role) params.set("role", role);
            if (mode) params.set("mode", mode);
            if (model) params.set("model", model);
            if (status) params.set("status", status);
            if (toolName) params.set("toolName", toolName);
            if (cacheHit) params.set("cacheHit", cacheHit);
            if (usedFallback) params.set("usedFallback", usedFallback);
            if (errorCode) params.set("errorCode", errorCode);
            if (includeHealth) params.set("includeHealth", "true");

            const response = await fetch(`/api/admin/ai-usage?${params.toString()}`);
            const payload = await response.json().catch(() => null);

            if (!response.ok) {
                throw new Error(payload?.message || "Không thể tải thống kê AI");
            }

            setData(payload);
        } catch (usageError) {
            setData(null);
            setError(usageError instanceof Error ? usageError.message : "Lỗi kết nối");
        } finally {
            setLoading(false);
        }
    }, [cacheHit, endDate, errorCode, includeHealth, mode, model, role, startDate, status, toolName, usedFallback, userId]);

    useEffect(() => {
        void loadUsage();
    }, [loadUsage]);

    const summary = data?.summary;
    const totalTokens = (summary?.inputTokens || 0) + (summary?.outputTokens || 0);

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                    <div className="flex items-center gap-2">
                        <div className="flex size-10 items-center justify-center rounded-lg bg-blue-600 text-white">
                            <Sparkles className="size-5" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-950">Theo dõi sử dụng AI</h1>
                            <p className="text-sm text-slate-500">
                                Quản trị quota, model, cache và chi phí ước tính từ ActivityLog.
                            </p>
                        </div>
                    </div>
                </div>
                <Button variant="outline" onClick={loadUsage} disabled={loading}>
                    {loading ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
                    Tải lại
                </Button>
                <Button variant="outline" asChild>
                    <Link href="/dashboard/admin/ai-agent">
                        <Settings className="size-4" />
                        Quản trị AI
                    </Link>
                </Button>
            </div>

            <Card className="rounded-lg border-slate-200 shadow-sm">
                <CardContent className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-8">
                    <label className="space-y-1 text-xs font-medium text-slate-500">
                        Từ ngày
                        <input
                            type="date"
                            value={startDate}
                            onChange={(event) => setStartDate(event.target.value)}
                            className="h-10 w-full rounded-md border border-slate-200 px-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                        />
                    </label>
                    <label className="space-y-1 text-xs font-medium text-slate-500">
                        Đến ngày
                        <input
                            type="date"
                            value={endDate}
                            onChange={(event) => setEndDate(event.target.value)}
                            className="h-10 w-full rounded-md border border-slate-200 px-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                        />
                    </label>
                    <label className="space-y-1 text-xs font-medium text-slate-500 xl:col-span-2">
                        Người dùng
                        <select
                            value={userId}
                            onChange={(event) => setUserId(event.target.value)}
                            className="h-10 w-full rounded-md border border-slate-200 px-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                        >
                            <option value="">Tất cả</option>
                            {data?.users.map(user => (
                                <option key={user.id} value={user.id}>
                                    {user.facilityName || user.username} ({getRoleLabel(user.role)})
                                </option>
                            ))}
                        </select>
                    </label>
                    <label className="space-y-1 text-xs font-medium text-slate-500">
                        Role
                        <select
                            value={role}
                            onChange={(event) => setRole(event.target.value)}
                            className="h-10 w-full rounded-md border border-slate-200 px-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                        >
                            <option value="">Tất cả</option>
                            <option value="ADMIN">Admin</option>
                            <option value="FACILITY">Cơ sở</option>
                        </select>
                    </label>
                    <label className="space-y-1 text-xs font-medium text-slate-500">
                        Mode
                        <select
                            value={mode}
                            onChange={(event) => setMode(event.target.value)}
                            className="h-10 w-full rounded-md border border-slate-200 px-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                        >
                            <option value="">Tất cả</option>
                            <option value="chat">Chat</option>
                            <option value="review">Kiểm tra</option>
                        </select>
                    </label>
                    <label className="space-y-1 text-xs font-medium text-slate-500">
                        Trạng thái
                        <select
                            value={status}
                            onChange={(event) => setStatus(event.target.value)}
                            className="h-10 w-full rounded-md border border-slate-200 px-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                        >
                            <option value="">Tất cả</option>
                            <option value="success">Thành công</option>
                            <option value="error">Lỗi</option>
                            <option value="quota_exceeded">Hết quota</option>
                        </select>
                    </label>
                    {modelOptions.length > 0 && (
                        <label className="space-y-1 text-xs font-medium text-slate-500 xl:col-span-2">
                            Model
                            <select
                                value={model}
                                onChange={(event) => setModel(event.target.value)}
                                className="h-10 w-full rounded-md border border-slate-200 px-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                            >
                                <option value="">Tất cả</option>
                                {modelOptions.map(modelName => (
                                    <option key={modelName} value={modelName}>{modelName}</option>
                                ))}
                            </select>
                        </label>
                    )}
                    {toolOptions.length > 0 && (
                        <label className="space-y-1 text-xs font-medium text-slate-500 xl:col-span-2">
                            Tool
                            <select
                                value={toolName}
                                onChange={(event) => setToolName(event.target.value)}
                                className="h-10 w-full rounded-md border border-slate-200 px-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                            >
                                <option value="">Tất cả</option>
                                {toolOptions.map(tool => (
                                    <option key={tool} value={tool}>{tool}</option>
                                ))}
                            </select>
                        </label>
                    )}
                    <label className="space-y-1 text-xs font-medium text-slate-500">
                        Cache
                        <select
                            value={cacheHit}
                            onChange={(event) => setCacheHit(event.target.value)}
                            className="h-10 w-full rounded-md border border-slate-200 px-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                        >
                            <option value="">Tất cả</option>
                            <option value="true">Cache hit</option>
                            <option value="false">Không cache</option>
                        </select>
                    </label>
                    <label className="space-y-1 text-xs font-medium text-slate-500">
                        Fallback
                        <select
                            value={usedFallback}
                            onChange={(event) => setUsedFallback(event.target.value)}
                            className="h-10 w-full rounded-md border border-slate-200 px-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                        >
                            <option value="">Tất cả</option>
                            <option value="true">Có fallback</option>
                            <option value="false">Không fallback</option>
                        </select>
                    </label>
                    {errorOptions.length > 0 && (
                        <label className="space-y-1 text-xs font-medium text-slate-500 xl:col-span-2">
                            Mã lỗi
                            <select
                                value={errorCode}
                                onChange={(event) => setErrorCode(event.target.value)}
                                className="h-10 w-full rounded-md border border-slate-200 px-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                            >
                                <option value="">Tất cả</option>
                                {errorOptions.map(code => (
                                    <option key={code} value={code}>{code}</option>
                                ))}
                            </select>
                        </label>
                    )}
                    <label className="flex h-10 items-center gap-2 self-end rounded-md border border-slate-200 px-3 text-sm text-slate-700">
                        <input
                            type="checkbox"
                            checked={includeHealth}
                            onChange={(event) => setIncludeHealth(event.target.checked)}
                            className="size-4 accent-blue-600"
                        />
                        Health check
                    </label>
                </CardContent>
            </Card>

            {error ? (
                <Card className="rounded-lg border-red-200 bg-red-50 shadow-sm">
                    <CardContent className="flex items-center gap-3 p-5 text-red-700">
                        <AlertTriangle className="size-5" />
                        <p className="font-medium">{error}</p>
                    </CardContent>
                </Card>
            ) : loading ? (
                <Card className="rounded-lg border-slate-200 shadow-sm">
                    <CardContent className="flex h-64 items-center justify-center gap-3 p-5 text-slate-500">
                        <Loader2 className="size-6 animate-spin" />
                        Đang tải thống kê AI...
                    </CardContent>
                </Card>
            ) : (
                <>
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                        <StatCard
                            title="Tổng request"
                            value={formatNumber(summary?.requests || 0)}
                            helper={`${formatNumber(summary?.uniqueUsers || 0)} người dùng`}
                            icon={Sparkles}
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
                            title="Token ước tính"
                            value={formatNumber(totalTokens)}
                            helper={`${formatNumber(summary?.inputTokens || 0)} input, ${formatNumber(summary?.outputTokens || 0)} output`}
                            icon={BarChart3}
                            tone="slate"
                        />
                        <StatCard
                            title="Chi phí ước tính"
                            value={formatCost(summary?.estimatedCostUsd || 0)}
                            helper="Dựa trên bảng giá local trong usage.ts"
                            icon={DollarSign}
                            tone="amber"
                        />
                        <StatCard
                            title="Cache / fallback"
                            value={`${formatNumber(summary?.cacheHits || 0)} / ${formatNumber(summary?.fallbackRequests || 0)}`}
                            helper="Cache hit / dùng fallback model"
                            icon={Zap}
                            tone="blue"
                        />
                    </div>

                    <div className="grid gap-4 xl:grid-cols-3">
                        <AggregateList
                            title="Theo ngày"
                            rows={data?.byDate || []}
                            emptyText="Chưa có request AI trong khoảng thời gian này"
                        />
                        <AggregateList
                            title="Theo model"
                            rows={data?.byModel || []}
                            emptyText="Chưa có dữ liệu model"
                        />
                        <AggregateList
                            title="Top người dùng"
                            rows={data?.byUser || []}
                            emptyText="Chưa có dữ liệu người dùng"
                        />
                    </div>

                    <div className="grid gap-4 lg:grid-cols-2">
                        <AggregateList
                            title="Theo role"
                            rows={(data?.byRole || []).map(row => ({ ...row, label: getRoleLabel(row.key) }))}
                            emptyText="Chưa có dữ liệu role"
                        />
                        <AggregateList
                            title="Theo mode"
                            rows={(data?.byMode || []).map(row => ({ ...row, label: getModeLabel(row.key) }))}
                            emptyText="Chưa có dữ liệu mode"
                        />
                    </div>

                    <Card className="rounded-lg border-slate-200 shadow-sm">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base text-slate-900">Request gần đây</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {data?.recent.length ? (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Thời gian</TableHead>
                                            <TableHead>Người dùng</TableHead>
                                            <TableHead>Mode</TableHead>
                                            <TableHead>Model</TableHead>
                                            <TableHead>Trạng thái</TableHead>
                                            <TableHead className="text-right">Cost</TableHead>
                                            <TableHead>Ghi chú</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {data.recent.map(log => (
                                            <TableRow key={log.id}>
                                                <TableCell className="text-slate-600">{formatDateTime(log.createdAt)}</TableCell>
                                                <TableCell>
                                                    <div className="min-w-40">
                                                        <p className="font-medium text-slate-900">
                                                            {log.user.facilityName || log.user.username}
                                                        </p>
                                                        <p className="text-xs text-slate-500">{getRoleLabel(log.role || log.user.role)}</p>
                                                    </div>
                                                </TableCell>
                                                <TableCell>{getModeLabel(log.mode)}</TableCell>
                                                <TableCell className="max-w-52 truncate text-slate-600">
                                                    {log.model || "local-or-unset"}
                                                </TableCell>
                                                <TableCell>{getStatusBadge(log.status)}</TableCell>
                                                <TableCell className="text-right text-slate-600">
                                                    {formatCost(log.estimatedCostUsd)}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-wrap gap-1">
                                                        {log.cacheHit && <Badge variant="outline">Cache</Badge>}
                                                        {log.usedFallback && <Badge variant="outline">Fallback</Badge>}
                                                        {log.errorCode && <Badge className="bg-red-100 text-red-700">{log.errorCode}</Badge>}
                                                        {log.toolNames.slice(0, 2).map(tool => (
                                                            <Badge key={tool} variant="secondary">{tool}</Badge>
                                                        ))}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            ) : (
                                <p className="py-12 text-center text-sm text-slate-400">
                                    Chưa có request AI phù hợp bộ lọc hiện tại.
                                </p>
                            )}
                            {data && data.scanned >= data.maxScan && (
                                <p className="mt-3 text-xs text-amber-600">
                                    API đang giới hạn quét {formatNumber(data.maxScan)} ActivityLog mới nhất trong khoảng lọc.
                                </p>
                            )}
                        </CardContent>
                    </Card>
                </>
            )}
        </div>
    );
}
