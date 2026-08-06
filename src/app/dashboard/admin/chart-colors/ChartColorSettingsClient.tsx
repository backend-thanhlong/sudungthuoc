"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
    ArrowDown,
    ArrowUp,
    Loader2,
    Palette,
    Plus,
    RotateCcw,
    Save,
    Trash2,
} from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { useChartColors } from "@/components/dashboard/ChartColorProvider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    CHART_COLOR_REGISTRY,
    DEFAULT_CHART_COLOR_SETTINGS,
    normalizeDynamicChartKey,
    normalizeHexColor,
    resolveChartColorSource,
    validateChartColorSettings,
    type ChartColorRegistryItem,
    type ChartColorSettings,
    type ChartSemanticKey,
} from "@/lib/chart-colors";
import { cn } from "@/lib/utils";

interface ChartColorSettingsClientProps {
    initialChartId?: string;
}

interface AdminChartColorResponse {
    settings: ChartColorSettings;
    defaults: ChartColorSettings;
    registry: ChartColorRegistryItem[];
    updatedAt: string | null;
    updatedById: string | null;
}

const AREA_LABELS: Record<string, string> = {
    dashboard: "Dashboard",
    mua_sam: "Mua sắm",
    reports: "Báo cáo",
    inventory: "Tồn kho",
};

const SEMANTIC_GROUPS: Array<{
    title: string;
    keys: Array<{ key: ChartSemanticKey; label: string }>;
}> = [
    {
        title: "Tồn kho và báo cáo",
        keys: [
            { key: "inventory", label: "Tồn kho" },
            { key: "import", label: "Nhập" },
            { key: "export", label: "Xuất" },
            { key: "value", label: "Giá trị" },
            { key: "insurance", label: "BHYT" },
            { key: "service", label: "Dịch vụ" },
        ],
    },
    {
        title: "Trạng thái và rủi ro",
        keys: [
            { key: "success", label: "Thành công/An toàn" },
            { key: "warning", label: "Cảnh báo" },
            { key: "danger", label: "Nguy cơ cao" },
            { key: "neutral", label: "Trung tính" },
            { key: "muted", label: "Làm mờ" },
            { key: "line", label: "Đường biểu đồ" },
        ],
    },
    {
        title: "Đấu thầu và ABC",
        keys: [
            { key: "bid", label: "Đấu thầu" },
            { key: "abcA", label: "ABC A" },
            { key: "abcB", label: "ABC B" },
            { key: "abcC", label: "ABC C" },
        ],
    },
];

const PREVIEW_DATA = [
    { label: "A", value: 82 },
    { label: "B", value: 64 },
    { label: "C", value: 52 },
    { label: "D", value: 40 },
    { label: "E", value: 28 },
    { label: "F", value: 18 },
];

function formatDateTime(value: string | null) {
    if (!value) {
        return "Chưa lưu cấu hình";
    }

    return new Date(value).toLocaleString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function safeColor(value: string) {
    return normalizeHexColor(value) ?? "#000000";
}

function cloneSettings(settings: ChartColorSettings): ChartColorSettings {
    return {
        version: 1,
        palette: [...settings.palette],
        semantic: { ...settings.semantic },
        chartOverrides: Object.fromEntries(
            Object.entries(settings.chartOverrides).map(([chartId, overrides]) => [chartId, { ...overrides }])
        ),
    };
}

function ColorControl({
    id,
    label,
    value,
    helper,
    onChange,
}: {
    id: string;
    label: string;
    value: string;
    helper?: string;
    onChange: (value: string) => void;
}) {
    const normalized = normalizeHexColor(value);

    return (
        <div className="grid gap-2 rounded-lg border border-border bg-card p-3">
            <div className="flex items-center justify-between gap-3">
                <Label htmlFor={id}>{label}</Label>
                {helper && <span className="text-xs text-muted-foreground">{helper}</span>}
            </div>
            <div className="flex items-center gap-2">
                <Input
                    id={id}
                    type="color"
                    value={safeColor(value)}
                    onChange={(event) => onChange(event.target.value)}
                    className="h-9 w-12 shrink-0 p-1"
                />
                <Input
                    value={value}
                    onChange={(event) => onChange(event.target.value)}
                    className={cn("font-mono text-sm", !normalized && "border-red-400 focus-visible:ring-red-500/30")}
                />
            </div>
            {!normalized && <p className="text-xs text-red-600">Mã màu không hợp lệ</p>}
        </div>
    );
}

function SourceBadge({ source }: { source: string }) {
    const label = {
        override: "Override",
        semantic: "Nghiệp vụ",
        palette: "Palette",
        fallback: "Fallback",
        default: "Mặc định",
    }[source] ?? source;

    return (
        <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            {label}
        </span>
    );
}

export default function ChartColorSettingsClient({ initialChartId }: ChartColorSettingsClientProps) {
    const chartColors = useChartColors();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [settings, setSettings] = useState<ChartColorSettings>(DEFAULT_CHART_COLOR_SETTINGS);
    const [defaults, setDefaults] = useState<ChartColorSettings>(DEFAULT_CHART_COLOR_SETTINGS);
    const [registry, setRegistry] = useState<ChartColorRegistryItem[]>(CHART_COLOR_REGISTRY);
    const [updatedAt, setUpdatedAt] = useState<string | null>(null);
    const [selectedChartId, setSelectedChartId] = useState(initialChartId || CHART_COLOR_REGISTRY[0]?.id || "");
    const [dynamicLabel, setDynamicLabel] = useState("");
    const [dynamicColor, setDynamicColor] = useState("#64748B");
    const [activeTab, setActiveTab] = useState(initialChartId ? "charts" : "palette");

    const validation = useMemo(() => validateChartColorSettings(settings, { strict: true }), [settings]);
    const selectedChart = registry.find((chart) => chart.id === selectedChartId) ?? registry[0];
    const selectedOverrides = selectedChart ? settings.chartOverrides[selectedChart.id] ?? {} : {};
    const groupedCharts = useMemo(() => {
        return registry.reduce<Record<string, ChartColorRegistryItem[]>>((groups, chart) => {
            groups[chart.area] = groups[chart.area] ?? [];
            groups[chart.area].push(chart);
            return groups;
        }, {});
    }, [registry]);

    const loadSettings = useCallback(async () => {
        setLoading(true);
        try {
            const response = await fetch("/api/admin/chart-colors", { cache: "no-store" });
            const payload = await response.json().catch(() => null) as AdminChartColorResponse | null;
            if (!response.ok || !payload) {
                throw new Error((payload as { message?: string } | null)?.message || "Không thể tải cấu hình màu");
            }

            setSettings(cloneSettings(payload.settings));
            setDefaults(cloneSettings(payload.defaults));
            setRegistry(payload.registry);
            setUpdatedAt(payload.updatedAt);

            if (initialChartId && payload.registry.some((chart) => chart.id === initialChartId)) {
                setSelectedChartId(initialChartId);
            } else if (!payload.registry.some((chart) => chart.id === selectedChartId)) {
                setSelectedChartId(payload.registry[0]?.id || "");
            }
        } catch (error) {
            console.error(error);
            toast.error(error instanceof Error ? error.message : "Không thể tải cấu hình màu");
        } finally {
            setLoading(false);
        }
    }, [initialChartId, selectedChartId]);

    useEffect(() => {
        loadSettings();
    }, [loadSettings]);

    const updateSettings = (updater: (current: ChartColorSettings) => ChartColorSettings) => {
        setSettings((current) => updater(cloneSettings(current)));
    };

    const updatePaletteColor = (index: number, color: string) => {
        updateSettings((current) => {
            current.palette[index] = color;
            return current;
        });
    };

    const movePaletteColor = (index: number, direction: -1 | 1) => {
        updateSettings((current) => {
            const nextIndex = index + direction;
            if (nextIndex < 0 || nextIndex >= current.palette.length) {
                return current;
            }

            const next = [...current.palette];
            [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
            current.palette = next;
            return current;
        });
    };

    const removePaletteColor = (index: number) => {
        updateSettings((current) => {
            current.palette = current.palette.filter((_, itemIndex) => itemIndex !== index);
            return current;
        });
    };

    const addPaletteColor = () => {
        updateSettings((current) => {
            current.palette.push("#64748B");
            return current;
        });
    };

    const updateSemanticColor = (key: ChartSemanticKey, color: string) => {
        updateSettings((current) => {
            current.semantic[key] = color;
            return current;
        });
    };

    const setChartOverride = (chartId: string, key: string, color: string) => {
        updateSettings((current) => {
            current.chartOverrides[chartId] = {
                ...(current.chartOverrides[chartId] ?? {}),
                [key]: color,
            };
            return current;
        });
    };

    const removeChartOverride = (chartId: string, key: string) => {
        updateSettings((current) => {
            const overrides = { ...(current.chartOverrides[chartId] ?? {}) };
            delete overrides[key];
            if (Object.keys(overrides).length > 0) {
                current.chartOverrides[chartId] = overrides;
            } else {
                delete current.chartOverrides[chartId];
            }
            return current;
        });
    };

    const clearSelectedChartOverrides = () => {
        if (!selectedChart) {
            return;
        }

        updateSettings((current) => {
            delete current.chartOverrides[selectedChart.id];
            return current;
        });
    };

    const addDynamicOverride = () => {
        if (!selectedChart || !selectedChart.supportsDynamicLabels) {
            return;
        }

        const key = normalizeDynamicChartKey(dynamicLabel);
        setChartOverride(selectedChart.id, key, dynamicColor);
        setDynamicLabel("");
        setDynamicColor("#64748B");
    };

    const save = async () => {
        const result = validateChartColorSettings(settings, { strict: true });
        if (result.errors.length > 0) {
            toast.error(result.errors[0]);
            return;
        }

        setSaving(true);
        try {
            const response = await fetch("/api/admin/chart-colors", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ settings: result.settings }),
            });
            const payload = await response.json().catch(() => null) as AdminChartColorResponse | { message?: string; errors?: string[] } | null;

            if (!response.ok || !payload || !("settings" in payload)) {
                const errorPayload = payload as { message?: string; errors?: string[] } | null;
                const message = errorPayload?.errors?.[0] || errorPayload?.message || "Không thể lưu cấu hình màu";
                throw new Error(message);
            }

            setSettings(cloneSettings(payload.settings));
            setDefaults(cloneSettings(payload.defaults));
            setRegistry(payload.registry);
            setUpdatedAt(payload.updatedAt);
            void chartColors.refresh();
            toast.success("Đã lưu bảng màu biểu đồ");
        } catch (error) {
            console.error(error);
            toast.error(error instanceof Error ? error.message : "Không thể lưu cấu hình màu");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex min-h-[360px] items-center justify-center">
                <div className="flex items-center gap-3 text-muted-foreground">
                    <Loader2 className="size-5 animate-spin" />
                    Đang tải bảng màu biểu đồ...
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                    <div className="flex items-center gap-2">
                        <Palette className="size-6 text-blue-600" />
                        <h2 className="text-2xl font-bold text-foreground">Bảng màu biểu đồ</h2>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Quản trị palette chung, màu nghiệp vụ và override riêng cho từng biểu đồ.
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">Cập nhật gần nhất: {formatDateTime(updatedAt)}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="outline" onClick={loadSettings} disabled={saving}>
                        <RotateCcw className="size-4" />
                        Tải lại
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setSettings(cloneSettings(defaults))} disabled={saving}>
                        <RotateCcw className="size-4" />
                        Khôi phục mặc định
                    </Button>
                    <Button type="button" onClick={save} disabled={saving || validation.errors.length > 0}>
                        {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                        Lưu thay đổi
                    </Button>
                </div>
            </div>

            {validation.errors.length > 0 && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    {validation.errors[0]}
                </div>
            )}

            <Card>
                <CardHeader>
                    <CardTitle>Preview palette hiện tại</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="h-48">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={PREVIEW_DATA} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                                <YAxis tick={{ fontSize: 11 }} />
                                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                                    {PREVIEW_DATA.map((item, index) => (
                                        <Cell
                                            key={item.label}
                                            fill={resolveChartColorSource(settings, { index }).color}
                                        />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="h-auto flex-wrap">
                    <TabsTrigger value="palette">Palette chung</TabsTrigger>
                    <TabsTrigger value="semantic">Màu nghiệp vụ</TabsTrigger>
                    <TabsTrigger value="charts">Theo biểu đồ</TabsTrigger>
                </TabsList>

                <TabsContent value="palette" className="space-y-4">
                    <Card>
                        <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                            <div>
                                <CardTitle>Palette chung</CardTitle>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    Dùng cho biểu đồ có danh mục động, tối thiểu 3 và tối đa 12 màu.
                                </p>
                            </div>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={addPaletteColor}
                                disabled={settings.palette.length >= 12}
                            >
                                <Plus className="size-4" />
                                Thêm màu
                            </Button>
                        </CardHeader>
                        <CardContent>
                            <div className="grid gap-3 lg:grid-cols-2">
                                {settings.palette.map((color, index) => (
                                    <div key={`${index}-${color}`} className="rounded-lg border border-border p-3">
                                        <ColorControl
                                            id={`palette-${index}`}
                                            label={`Màu ${index + 1}`}
                                            value={color}
                                            helper={`index ${index}`}
                                            onChange={(value) => updatePaletteColor(index, value)}
                                        />
                                        <div className="mt-2 flex justify-end gap-1">
                                            <Button type="button" variant="ghost" size="icon-sm" onClick={() => movePaletteColor(index, -1)} disabled={index === 0}>
                                                <ArrowUp className="size-4" />
                                            </Button>
                                            <Button type="button" variant="ghost" size="icon-sm" onClick={() => movePaletteColor(index, 1)} disabled={index === settings.palette.length - 1}>
                                                <ArrowDown className="size-4" />
                                            </Button>
                                            <Button type="button" variant="ghost" size="icon-sm" onClick={() => removePaletteColor(index)} disabled={settings.palette.length <= 3}>
                                                <Trash2 className="size-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="semantic" className="space-y-4">
                    {SEMANTIC_GROUPS.map((group) => (
                        <Card key={group.title}>
                            <CardHeader>
                                <CardTitle>{group.title}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                                    {group.keys.map((item) => (
                                        <ColorControl
                                            key={item.key}
                                            id={`semantic-${item.key}`}
                                            label={item.label}
                                            value={settings.semantic[item.key]}
                                            helper={item.key}
                                            onChange={(value) => updateSemanticColor(item.key, value)}
                                        />
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </TabsContent>

                <TabsContent value="charts" className="grid gap-4 xl:grid-cols-[320px_1fr]">
                    <Card>
                        <CardHeader>
                            <CardTitle>Danh sách biểu đồ</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {Object.entries(groupedCharts).map(([area, charts]) => (
                                <div key={area}>
                                    <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
                                        {AREA_LABELS[area] ?? area}
                                    </p>
                                    <div className="space-y-1">
                                        {charts.map((chart) => (
                                            <button
                                                key={chart.id}
                                                type="button"
                                                onClick={() => setSelectedChartId(chart.id)}
                                                className={cn(
                                                    "w-full rounded-lg px-3 py-2 text-left text-sm transition-colors",
                                                    selectedChart?.id === chart.id
                                                        ? "bg-blue-50 font-semibold text-blue-700 dark:bg-blue-950/45 dark:text-blue-200"
                                                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                                )}
                                            >
                                                {chart.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                            <div>
                                <CardTitle>{selectedChart?.label || "Biểu đồ"}</CardTitle>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    Override riêng chỉ áp dụng cho biểu đồ này. Xóa override để quay lại màu nghiệp vụ hoặc palette.
                                </p>
                            </div>
                            {selectedChart && (
                                <Button type="button" variant="outline" onClick={clearSelectedChartOverrides}>
                                    <Trash2 className="size-4" />
                                    Xóa override biểu đồ
                                </Button>
                            )}
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {selectedChart && selectedChart.fixedKeys.length > 0 ? (
                                <div className="grid gap-3 md:grid-cols-2">
                                    {selectedChart.fixedKeys.map((item, index) => {
                                        const resolved = resolveChartColorSource(settings, {
                                            chartId: selectedChart.id,
                                            key: item.key,
                                            semanticKey: item.semanticKey,
                                            index,
                                        });
                                        const overrideValue = selectedOverrides[item.key] ?? resolved.color;

                                        return (
                                            <div key={item.key} className="rounded-lg border border-border p-3">
                                                <ColorControl
                                                    id={`chart-${selectedChart.id}-${item.key}`}
                                                    label={item.label}
                                                    value={overrideValue}
                                                    helper={item.key}
                                                    onChange={(value) => setChartOverride(selectedChart.id, item.key, value)}
                                                />
                                                <div className="mt-2 flex items-center justify-between gap-3">
                                                    <SourceBadge source={resolved.source} />
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => removeChartOverride(selectedChart.id, item.key)}
                                                        disabled={!selectedOverrides[item.key]}
                                                    >
                                                        Xóa override
                                                    </Button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                                    Biểu đồ này chủ yếu dùng dữ liệu động nên sẽ lấy màu theo palette chung, trừ khi thêm override động bên dưới.
                                </div>
                            )}

                            {selectedChart?.supportsDynamicLabels && (
                                <div className="rounded-lg border border-border p-4">
                                    <h3 className="font-semibold text-foreground">Override nhãn động</h3>
                                    <p className="mt-1 text-sm text-muted-foreground">
                                        Dùng cho nhóm thuốc, cơ sở hoặc nhãn thay đổi theo dữ liệu. Key sẽ được chuẩn hóa từ nhãn.
                                    </p>
                                    <div className="mt-3 grid gap-3 md:grid-cols-[1fr_160px_auto]">
                                        <Input
                                            value={dynamicLabel}
                                            onChange={(event) => setDynamicLabel(event.target.value)}
                                            placeholder="Nhập nhãn, ví dụ: Kháng sinh"
                                        />
                                        <Input
                                            type="color"
                                            value={safeColor(dynamicColor)}
                                            onChange={(event) => setDynamicColor(event.target.value)}
                                            className="h-9"
                                        />
                                        <Button type="button" onClick={addDynamicOverride} disabled={!dynamicLabel.trim()}>
                                            <Plus className="size-4" />
                                            Thêm
                                        </Button>
                                    </div>
                                    <div className="mt-3 space-y-2">
                                        {Object.entries(selectedOverrides)
                                            .filter(([key]) => key.startsWith("dynamic:"))
                                            .map(([key, color]) => (
                                                <div key={key} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2">
                                                    <div className="flex items-center gap-2">
                                                        <span className="h-4 w-4 rounded-full border" style={{ backgroundColor: safeColor(color) }} />
                                                        <span className="font-mono text-sm">{key}</span>
                                                    </div>
                                                    <Button type="button" variant="ghost" size="sm" onClick={() => removeChartOverride(selectedChart.id, key)}>
                                                        Xóa
                                                    </Button>
                                                </div>
                                            ))}
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
