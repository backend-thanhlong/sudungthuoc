"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { ChevronDown, ChevronRight, RefreshCw, Search } from "lucide-react";
import {
    Bar,
    CartesianGrid,
    Cell,
    ComposedChart,
    Line,
    ReferenceLine,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import type {
    AbcAnalysisResponse,
    AbcGroup,
    AbcGroupSummary,
    AbcItem,
    AbcParetoItem,
} from "@/lib/dashboard/abc-analysis";
import {
    compareReportMonthsDesc,
    isPrescriptionDrug,
    isSpecialControlDrug,
} from "@/lib/dashboard/abc-analysis";
import { useDashboardChartTheme } from "./chart-theme";
import ChartColorShortcut from "./ChartColorShortcut";
import { useChartColors } from "./ChartColorProvider";
import UsageOverviewSection from "./analysis/UsageOverviewSection";

interface Tab4Props {
    reportMonth: string;
    facilityId: string;
    apiPrefix?: string;
}

interface ParetoTooltipProps {
    active?: boolean;
    payload?: Array<{
        payload?: AbcParetoItem;
    }>;
}

type AbcFilter = "all" | AbcGroup;

const GROUPS: AbcGroup[] = ["A", "B", "C"];

const GROUP_BADGE_CLASS: Record<AbcGroup, string> = {
    A: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/70 dark:bg-rose-950/40 dark:text-rose-200",
    B: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-200",
    C: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-950/40 dark:text-emerald-200",
};

const formatCurrency = (value: number) =>
    new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(value);

const formatCompact = (value: number) =>
    new Intl.NumberFormat("vi-VN", { notation: "compact", compactDisplay: "short" }).format(value);

const formatNumber = (value: number, maximumFractionDigits = 2) =>
    new Intl.NumberFormat("vi-VN", { maximumFractionDigits }).format(value);

const formatPercent = (value: number) => `${formatNumber(value)}%`;

const normalizeSearchText = (value: string) =>
    value
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");

function getGroupSummary(summary: AbcAnalysisResponse["summary"], group: AbcGroup): AbcGroupSummary {
    return summary.groups.find((item) => item.group === group) ?? {
        group,
        drugCount: 0,
        value: 0,
        valuePercent: 0,
        quantity: 0,
        quantityPercent: 0,
    };
}

function getPriceRange(item: AbcItem) {
    if (item.pricePointCount === 0) {
        return "Không có giá";
    }

    if (item.minPrice === item.maxPrice) {
        return formatCurrency(item.minPrice);
    }

    return `${formatCurrency(item.minPrice)} - ${formatCurrency(item.maxPrice)}`;
}

function MetricCard({ label, value, sublabel }: { label: string; value: string; sublabel: string }) {
    return (
        <div className="rounded-xl border border-border bg-card p-3 text-card-foreground shadow-sm sm:p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
            <p className="mt-2 text-xl font-semibold text-foreground sm:text-2xl">{value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{sublabel}</p>
        </div>
    );
}

function GroupCard({ group, summary }: { group: AbcGroup; summary: AbcGroupSummary }) {
    return (
        <div className={`rounded-xl border p-3 shadow-sm sm:p-4 ${GROUP_BADGE_CLASS[group]}`}>
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className="text-sm font-semibold">Hạng {group}</p>
                    <p className="mt-2 text-xl font-bold sm:text-2xl">{summary.drugCount}</p>
                </div>
                <span className="rounded-full bg-background/70 px-2 py-1 text-xs font-semibold">
                    {formatPercent(summary.valuePercent)}
                </span>
            </div>
            <div className="mt-3 space-y-1 text-xs">
                <p>Giá trị: {formatCurrency(summary.value)}</p>
                <p>Số lượng: {formatNumber(summary.quantity)} ({formatPercent(summary.quantityPercent)})</p>
            </div>
        </div>
    );
}

function ParetoTooltip({ active, payload }: ParetoTooltipProps) {
    const item = payload?.[0]?.payload;
    const chartTheme = useDashboardChartTheme();

    if (!active || !item) {
        return null;
    }

    return (
        <div
            className="max-w-xs rounded-lg border px-3 py-2 text-sm shadow-xl"
            style={{
                backgroundColor: chartTheme.tooltipBackground,
                borderColor: chartTheme.tooltipBorder,
                color: chartTheme.tooltipText,
            }}
        >
            <p className="font-semibold">#{item.rank} {item.drugName}</p>
            <p className="mt-1">Giá trị: <span className="font-medium">{formatCurrency(item.totalValue)}</span></p>
            <p style={{ color: chartTheme.mutedText }}>% giá trị: {formatPercent(item.percent)}</p>
            <p style={{ color: chartTheme.mutedText }}>% tích lũy: {formatPercent(item.cumulativePercent)}</p>
            <p style={{ color: chartTheme.mutedText }}>Hạng: {item.group}</p>
        </div>
    );
}

function ToggleButton({
    active,
    children,
    onClick,
}: {
    active: boolean;
    children: ReactNode;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`min-h-9 rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${active
                ? "border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/45 dark:text-indigo-200"
                : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
        >
            {children}
        </button>
    );
}

function MonitoringList({ title, count, items }: { title: string; count: number; items: AbcItem[] }) {
    return (
        <div className="rounded-lg border border-border bg-muted/40 p-3">
            <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-foreground">{title}</p>
                <span className="rounded-full bg-card px-2 py-0.5 text-xs font-semibold text-foreground">
                    {formatNumber(count, 0)}
                </span>
            </div>
            {items.length > 0 ? (
                <ul className="mt-3 space-y-2">
                    {items.slice(0, 5).map((item) => (
                        <li key={`${title}-${item.drugKey}`} className="text-xs text-muted-foreground">
                            <span className="font-medium text-foreground">{item.drugName}</span>
                            <span className="ml-1">({formatCurrency(item.totalValue)})</span>
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="mt-3 text-xs text-muted-foreground">Không có dữ liệu</p>
            )}
        </div>
    );
}

export default function Tab4Analysis({ reportMonth, facilityId, apiPrefix = "/api/admin/dashboard" }: Tab4Props) {
    const [data, setData] = useState<AbcAnalysisResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [abcFilter, setAbcFilter] = useState<AbcFilter>("all");
    const [searchTerm, setSearchTerm] = useState("");
    const [showSpecialOnly, setShowSpecialOnly] = useState(false);
    const [showMultiPriceOnly, setShowMultiPriceOnly] = useState(false);
    const [showUnmappedOnly, setShowUnmappedOnly] = useState(false);
    const [expandedDrugKey, setExpandedDrugKey] = useState<string | null>(null);
    const chartTheme = useDashboardChartTheme();
    const chartColors = useChartColors();

    const isAdmin = apiPrefix.includes("/api/admin") || apiPrefix.includes("/api/public");
    const isAdminAllFacilities = isAdmin && !facilityId;

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams();
            if (reportMonth && reportMonth !== "all") params.set("reportMonth", reportMonth);
            if (facilityId) params.set("facilityId", facilityId);
            const res = await fetch(`${apiPrefix}/analysis?${params}`);
            const json = await res.json();

            if (!res.ok) {
                throw new Error(json?.error || "Không thể tải phân tích ABC");
            }

            setData(json);
            setExpandedDrugKey(null);
        } catch (err) {
            console.error(err);
            setError(err instanceof Error ? err.message : "Không thể tải phân tích ABC");
            setData(null);
        } finally {
            setLoading(false);
        }
    }, [reportMonth, facilityId, apiPrefix]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const filteredAbcItems = useMemo(() => {
        if (!data) {
            return [];
        }

        const normalizedSearch = normalizeSearchText(searchTerm);
        return data.abcItems.filter((item) => {
            if (abcFilter !== "all" && item.group !== abcFilter) {
                return false;
            }
            if (showSpecialOnly && !isSpecialControlDrug(item.kiemSoatDacBiet)) {
                return false;
            }
            if (showMultiPriceOnly && item.pricePointCount <= 1) {
                return false;
            }
            if (showUnmappedOnly && item.isMapped) {
                return false;
            }
            if (!normalizedSearch) {
                return true;
            }

            const haystack = normalizeSearchText([
                item.drugName,
                item.hoatChat,
                item.hamLuong,
                item.nhomThuoc,
            ].join(" "));
            return haystack.includes(normalizedSearch);
        });
    }, [abcFilter, data, searchTerm, showMultiPriceOnly, showSpecialOnly, showUnmappedOnly]);

    const monitoringItems = useMemo(() => {
        const items = data?.abcItems ?? [];
        return {
            specialA: items.filter((item) => item.group === "A" && isSpecialControlDrug(item.kiemSoatDacBiet)),
            multiPriceA: items.filter((item) => item.group === "A" && item.pricePointCount > 1),
            unmapped: items.filter((item) => !item.isMapped),
        };
    }, [data]);

    if (loading) {
        return (
            <div className="flex h-96 items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <div className="h-10 w-10 animate-spin rounded-full border-4 border-purple-200 border-t-purple-600" />
                    <p className="text-sm text-muted-foreground">Đang tính phân tích ABC...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-center dark:border-rose-900/70 dark:bg-rose-950/35">
                <p className="font-semibold text-rose-700 dark:text-rose-200">Không thể tải dữ liệu phân tích</p>
                <p className="mt-1 text-sm text-rose-600 dark:text-rose-300">{error}</p>
                <button
                    type="button"
                    onClick={fetchData}
                    className="mt-4 inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700"
                >
                    <RefreshCw className="h-4 w-4" />
                    Tải lại
                </button>
            </div>
        );
    }

    if (!data) {
        return <p className="py-8 text-center text-rose-500">Không thể tải dữ liệu</p>;
    }

    const noReportRows = data.summary.includedRows === 0 && data.summary.excludedRows === 0;
    const noIncludedRows = data.summary.includedRows === 0 && data.summary.excludedRows > 0;
    const tableColumnCount = isAdminAllFacilities ? 16 : 14;
    const groupBarColor: Record<AbcGroup, string> = {
        A: chartColors.resolveColor({ chartId: "dashboard.analysis.pareto", key: "abcA", semanticKey: "abcA" }),
        B: chartColors.resolveColor({ chartId: "dashboard.analysis.pareto", key: "abcB", semanticKey: "abcB" }),
        C: chartColors.resolveColor({ chartId: "dashboard.analysis.pareto", key: "abcC", semanticKey: "abcC" }),
    };
    const paretoLineColor = chartColors.resolveColor({ chartId: "dashboard.analysis.pareto", key: "line", semanticKey: "line" });

    return (
        <div className="space-y-4 sm:space-y-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                <MetricCard
                    label="Tổng giá trị tiêu thụ"
                    value={formatCurrency(data.summary.totalValue)}
                    sublabel="Tính theo xuất x đơn giá VAT"
                />
                <MetricCard
                    label="Tổng số lượng tiêu thụ"
                    value={formatNumber(data.summary.totalQuantity)}
                    sublabel="Tổng số lượng xuất"
                />
                <MetricCard
                    label="Số mặt hàng ABC"
                    value={formatNumber(data.summary.totalDrugs, 0)}
                    sublabel="Có giá trị tiêu thụ hợp lệ"
                />
                <MetricCard
                    label="Dòng cần kiểm tra"
                    value={formatNumber(data.summary.excludedRows, 0)}
                    sublabel="Không đưa vào xếp hạng ABC"
                />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {GROUPS.map((group) => (
                    <GroupCard key={group} group={group} summary={getGroupSummary(data.summary, group)} />
                ))}
            </div>

            {(noReportRows || noIncludedRows) && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900/70 dark:bg-amber-950/35 dark:text-amber-200">
                    {noReportRows
                        ? "Không có dữ liệu báo cáo cho phạm vi đã chọn."
                        : "Không có phát sinh tiêu thụ có giá trị để phân tích ABC."}
                </div>
            )}

            <UsageOverviewSection
                overview={data.usageOverview}
                isAdmin={isAdmin}
                isSingleFacility={Boolean(facilityId)}
            />

            <div className="rounded-xl border border-border bg-card p-4 text-card-foreground shadow-sm sm:p-5">
                <div className="mb-4 flex items-start justify-between gap-3">
                    <div>
                        <h3 className="font-semibold text-foreground">Biểu đồ Pareto ABC</h3>
                        <p className="text-xs text-muted-foreground">Bar là giá trị tiêu thụ, line là phần trăm tích lũy</p>
                    </div>
                    <ChartColorShortcut chartId="dashboard.analysis.pareto" />
                </div>
                <div className="h-[300px] sm:h-[380px]">
                    {data.paretoItems.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={data.paretoItems} margin={{ top: 10, right: 20, left: 10, bottom: 40 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
                                <XAxis
                                    dataKey="rank"
                                    tick={{ fontSize: 11, fill: chartTheme.axis }}
                                    tickFormatter={(value) => `#${value}`}
                                />
                                <YAxis
                                    yAxisId="value"
                                    tick={{ fontSize: 11, fill: chartTheme.axis }}
                                    tickFormatter={formatCompact}
                                    width={72}
                                />
                                <YAxis
                                    yAxisId="percent"
                                    orientation="right"
                                    domain={[0, 100]}
                                    tick={{ fontSize: 11, fill: chartTheme.axis }}
                                    tickFormatter={(value) => `${value}%`}
                                    width={46}
                                />
                                <Tooltip content={<ParetoTooltip />} />
                                <ReferenceLine yAxisId="percent" y={80} stroke={groupBarColor.A} strokeDasharray="4 4" />
                                <ReferenceLine yAxisId="percent" y={95} stroke={groupBarColor.B} strokeDasharray="4 4" />
                                <Bar yAxisId="value" dataKey="totalValue" name="Giá trị tiêu thụ" radius={[3, 3, 0, 0]}>
                                    {data.paretoItems.map((item) => (
                                        <Cell key={`pareto-${item.rank}`} fill={groupBarColor[item.group]} />
                                    ))}
                                </Bar>
                                <Line
                                    yAxisId="percent"
                                    type="monotone"
                                    dataKey="cumulativePercent"
                                    name="% tích lũy"
                                    stroke={paretoLineColor}
                                    strokeWidth={2}
                                    dot={false}
                                />
                            </ComposedChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex h-full items-center justify-center rounded-lg bg-muted/40 text-sm text-muted-foreground">
                            Không có dữ liệu để vẽ Pareto
                        </div>
                    )}
                </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-4 text-card-foreground shadow-sm sm:p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                        <h3 className="font-semibold text-foreground">Bảng chi tiết ABC</h3>
                        <p className="text-xs text-muted-foreground">Sắp xếp theo giá trị tiêu thụ giảm dần</p>
                    </div>
                    <div className="flex flex-col gap-3 lg:items-end">
                        <div className="relative w-full lg:w-[340px]">
                            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            <input
                                value={searchTerm}
                                onChange={(event) => setSearchTerm(event.target.value)}
                                placeholder="Tìm thuốc, hoạt chất, nhóm thuốc..."
                                className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm text-foreground outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20"
                            />
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {(["all", "A", "B", "C"] as AbcFilter[]).map((group) => (
                                <ToggleButton key={group} active={abcFilter === group} onClick={() => setAbcFilter(group)}>
                                    {group === "all" ? "Tất cả" : `Hạng ${group}`}
                                </ToggleButton>
                            ))}
                            <ToggleButton active={showSpecialOnly} onClick={() => setShowSpecialOnly((value) => !value)}>
                                KSĐB
                            </ToggleButton>
                            <ToggleButton active={showMultiPriceOnly} onClick={() => setShowMultiPriceOnly((value) => !value)}>
                                Nhiều giá
                            </ToggleButton>
                            <ToggleButton active={showUnmappedOnly} onClick={() => setShowUnmappedOnly((value) => !value)}>
                                Chưa ánh xạ
                            </ToggleButton>
                        </div>
                    </div>
                </div>

                <div className="mt-4 max-h-[640px] overflow-auto rounded-lg border border-border">
                    <table className="w-full min-w-[1280px] text-sm">
                        <thead className="sticky top-0 z-10">
                            <tr className="bg-slate-800 text-white dark:bg-muted dark:text-foreground">
                                <th className="w-10 p-3" />
                                <th className="p-3 text-left font-semibold">#</th>
                                <th className="p-3 text-left font-semibold">Tên thuốc</th>
                                <th className="p-3 text-left font-semibold">Hoạt chất</th>
                                <th className="p-3 text-left font-semibold">Hàm lượng</th>
                                <th className="p-3 text-left font-semibold">ĐVT</th>
                                {isAdminAllFacilities && <th className="p-3 text-right font-semibold">Số CSYT</th>}
                                {isAdminAllFacilities && <th className="p-3 text-left font-semibold">CSYT lớn nhất</th>}
                                <th className="p-3 text-right font-semibold">Số lượng</th>
                                <th className="p-3 text-right font-semibold">Đơn giá BQ</th>
                                <th className="p-3 text-right font-semibold">Khoảng giá</th>
                                <th className="p-3 text-right font-semibold">Giá trị</th>
                                <th className="p-3 text-right font-semibold">% giá trị</th>
                                <th className="p-3 text-right font-semibold">% tích lũy</th>
                                <th className="p-3 text-center font-semibold">Hạng</th>
                                <th className="p-3 text-left font-semibold">Ghi chú</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredAbcItems.map((item) => {
                                const canExpand = item.priceBreakdown.length > 1 || item.pricePointCount > 1;
                                const expanded = expandedDrugKey === item.drugKey;

                                return (
                                    <Fragment key={item.drugKey}>
                                        <tr key={item.drugKey} className="border-b border-border hover:bg-muted/40">
                                            <td className="p-3 text-center">
                                                {canExpand ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => setExpandedDrugKey(expanded ? null : item.drugKey)}
                                                        className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                                                        aria-label={expanded ? "Thu gọn chi tiết giá" : "Mở chi tiết giá"}
                                                    >
                                                        {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                                    </button>
                                                ) : null}
                                            </td>
                                            <td className="p-3 font-mono text-muted-foreground">{item.rank}</td>
                                            <td className="max-w-[260px] p-3">
                                                <p className="truncate font-medium text-foreground" title={item.drugName}>{item.drugName}</p>
                                                <p className="mt-1 truncate text-xs text-muted-foreground" title={item.nhomThuoc}>{item.nhomThuoc}</p>
                                            </td>
                                            <td className="max-w-[180px] truncate p-3 text-muted-foreground" title={item.hoatChat}>{item.hoatChat || "-"}</td>
                                            <td className="max-w-[120px] truncate p-3 text-muted-foreground" title={item.hamLuong}>{item.hamLuong || "-"}</td>
                                            <td className="p-3 text-muted-foreground">{item.donViTinh || "-"}</td>
                                            {isAdminAllFacilities && <td className="p-3 text-right font-mono text-foreground">{formatNumber(item.facilityCount || 0, 0)}</td>}
                                            {isAdminAllFacilities && <td className="max-w-[180px] truncate p-3 text-muted-foreground" title={item.topFacilityName}>{item.topFacilityName || "-"}</td>}
                                            <td className="p-3 text-right font-mono text-foreground">{formatNumber(item.totalQuantity)}</td>
                                            <td className="p-3 text-right font-mono text-foreground">{formatCurrency(item.weightedAveragePrice)}</td>
                                            <td className="p-3 text-right font-mono text-foreground">{getPriceRange(item)}</td>
                                            <td className="p-3 text-right font-mono font-semibold text-foreground">{formatCurrency(item.totalValue)}</td>
                                            <td className="p-3 text-right font-mono text-foreground">{formatPercent(item.percent)}</td>
                                            <td className="p-3 text-right font-mono text-foreground">{formatPercent(item.cumulativePercent)}</td>
                                            <td className="p-3 text-center">
                                                <span className={`inline-flex min-w-7 justify-center rounded-full border px-2 py-0.5 text-xs font-bold ${GROUP_BADGE_CLASS[item.group]}`}>
                                                    {item.group}
                                                </span>
                                            </td>
                                            <td className="p-3">
                                                <div className="flex flex-wrap gap-1">
                                                    {isSpecialControlDrug(item.kiemSoatDacBiet) && (
                                                        <span className="rounded-full bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-700 dark:bg-rose-950/40 dark:text-rose-200">KSĐB</span>
                                                    )}
                                                    {isPrescriptionDrug(item.isKeDon) && (
                                                        <span className="rounded-full bg-sky-50 px-2 py-0.5 text-xs font-medium text-sky-700 dark:bg-sky-950/40 dark:text-sky-200">Kê đơn</span>
                                                    )}
                                                    {!item.isMapped && (
                                                        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">Chưa ánh xạ</span>
                                                    )}
                                                    {item.pricePointCount > 1 && (
                                                        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-950/40 dark:text-amber-200">
                                                            {item.pricePointCount} mức giá
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                        {expanded && (
                                            <tr key={`${item.drugKey}-breakdown`} className="border-b border-border bg-muted/40">
                                                <td colSpan={tableColumnCount} className="p-4">
                                                    <div className="overflow-x-auto rounded-lg border border-border bg-card">
                                                        <table className="w-full min-w-[680px] text-xs">
                                                            <thead className="bg-muted text-muted-foreground">
                                                                <tr>
                                                                    <th className="p-2 text-left font-semibold">Kỳ báo cáo</th>
                                                                    {isAdminAllFacilities && <th className="p-2 text-left font-semibold">CSYT</th>}
                                                                    <th className="p-2 text-right font-semibold">Số lượng</th>
                                                                    <th className="p-2 text-right font-semibold">Đơn giá</th>
                                                                    <th className="p-2 text-right font-semibold">Thành tiền</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {[...item.priceBreakdown]
                                                                    .sort((left, right) => {
                                                                        const monthOrder = compareReportMonthsDesc(left.reportMonth, right.reportMonth);
                                                                        return monthOrder !== 0 ? monthOrder : right.value - left.value;
                                                                    })
                                                                    .map((entry) => (
                                                                        <tr key={`${entry.reportMonth}-${entry.facilityName || ""}-${entry.unitPrice}`} className="border-t border-border">
                                                                            <td className="p-2 text-foreground">{entry.reportMonth}</td>
                                                                            {isAdminAllFacilities && <td className="p-2 text-foreground">{entry.facilityName || "-"}</td>}
                                                                            <td className="p-2 text-right font-mono text-foreground">{formatNumber(entry.quantity)}</td>
                                                                            <td className="p-2 text-right font-mono text-foreground">{formatCurrency(entry.unitPrice)}</td>
                                                                            <td className="p-2 text-right font-mono font-medium text-foreground">{formatCurrency(entry.value)}</td>
                                                                        </tr>
                                                                    ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </Fragment>
                                );
                            })}
                        </tbody>
                    </table>
                    {filteredAbcItems.length === 0 && (
                        <div className="py-10 text-center text-sm text-muted-foreground">
                            {data.abcItems.length === 0 ? "Không có thuốc đủ điều kiện ABC" : "Không có thuốc phù hợp với bộ lọc hiện tại"}
                        </div>
                    )}
                </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-4 text-card-foreground shadow-sm sm:p-5">
                <div className="mb-4">
                    <h3 className="font-semibold text-foreground">Giám sát ABC</h3>
                    <p className="text-xs text-muted-foreground">Các nhóm cần kiểm tra sau khi phân hạng ABC</p>
                </div>
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
                    <MonitoringList
                        title="Hạng A kiểm soát đặc biệt"
                        count={monitoringItems.specialA.length}
                        items={monitoringItems.specialA}
                    />
                    <MonitoringList
                        title="Hạng A nhiều mức giá"
                        count={monitoringItems.multiPriceA.length}
                        items={monitoringItems.multiPriceA}
                    />
                    <MonitoringList
                        title="Xuất nhưng giá bằng 0"
                        count={data.dataQuality.zeroPriceWithConsumption}
                        items={[]}
                    />
                    <MonitoringList
                        title="Chưa ánh xạ có tiêu thụ"
                        count={data.dataQuality.unmappedWithConsumption}
                        items={monitoringItems.unmapped}
                    />
                </div>
                <div className="mt-4 grid grid-cols-1 gap-3 text-xs text-muted-foreground md:grid-cols-2">
                    <p>Dòng không đưa vào ABC: {formatNumber(data.dataQuality.negativeOrZeroValueRows, 0)}</p>
                    <p>Thuốc có nhiều mức giá: {formatNumber(data.dataQuality.multiPriceDrugs, 0)}</p>
                </div>
            </div>
        </div>
    );
}
