"use client";

import { useMemo, useState } from "react";
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Legend,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import type {
    FacilityUsageComparison,
    UsageDimensionKey,
    UsageMetricKey,
    UsageOverview,
    UsageSlice,
} from "@/lib/dashboard/abc-analysis";
import { useDashboardChartTheme } from "../chart-theme";
import ChartColorShortcut from "../ChartColorShortcut";
import { useChartColors } from "../ChartColorProvider";
import { normalizeDynamicChartKey } from "@/lib/chart-colors";

interface UsageOverviewSectionProps {
    overview: UsageOverview;
    isAdmin: boolean;
    isSingleFacility: boolean;
}

interface UsageChartDatum extends UsageSlice {
    metricValue: number;
    metricPercent: number;
    fill: string;
}

interface UsageSliceTooltipProps {
    active?: boolean;
    payload?: Array<{
        payload?: UsageChartDatum;
    }>;
    metric: UsageMetricKey;
    hiddenPercentLabels?: string[];
}

interface FacilityStackDatum {
    facilityName: string;
    totalMetric: number;
    totalValue: number;
    totalQuantity: number;
    [key: string]: number | string;
}

interface FacilityTooltipProps {
    active?: boolean;
    payload?: Array<{
        name?: string;
        value?: number;
        color?: string;
        payload?: FacilityStackDatum;
    }>;
    metric: UsageMetricKey;
}

const DIMENSION_OPTIONS: Array<{ key: UsageDimensionKey; label: string }> = [
    { key: "drugGroup", label: "Nhóm thuốc" },
    { key: "therapeuticGroup", label: "Nhóm điều trị" },
    { key: "specialControl", label: "KSĐB" },
    { key: "prescription", label: "Kê đơn" },
    { key: "domestic", label: "Trong nước" },
];
const NON_SPECIAL_CONTROL_LABEL = "Không phải thuốc kiểm soát đặc biệt";

const formatCurrency = (value: number) =>
    new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(value);

const formatCompact = (value: number) =>
    new Intl.NumberFormat("vi-VN", { notation: "compact", compactDisplay: "short", maximumFractionDigits: 1 }).format(value);

const formatNumber = (value: number, maximumFractionDigits = 2) =>
    new Intl.NumberFormat("vi-VN", { maximumFractionDigits }).format(value);

const formatPercent = (value: number) => `${formatNumber(value)}%`;

const truncateLabel = (value: string, maxLength = 28) =>
    value.length > maxLength ? `${value.slice(0, maxLength - 1)}...` : value;

function getMetricValue(item: UsageSlice, metric: UsageMetricKey) {
    return metric === "value" ? item.value : item.quantity;
}

function getMetricPercent(item: UsageSlice, metric: UsageMetricKey) {
    return metric === "value" ? item.percentValue : item.percentQuantity;
}

function getMetricLabel(metric: UsageMetricKey) {
    return metric === "value" ? "Giá trị sử dụng" : "Số lượng sử dụng";
}

function formatMetric(value: number, metric: UsageMetricKey) {
    return metric === "value" ? formatCurrency(value) : formatNumber(value);
}

function formatMetricCompact(value: number) {
    return formatCompact(value);
}

function shouldHidePercent(label: string, hiddenPercentLabels?: string[]) {
    return hiddenPercentLabels?.includes(label) ?? false;
}

function normalizeChartSlices(
    slices: UsageSlice[],
    metric: UsageMetricKey,
    limit = 10,
    getFill?: (item: UsageSlice, index: number) => string
): UsageChartDatum[] {
    const positiveSlices = slices
        .filter((item) => getMetricValue(item, metric) > 0)
        .sort((left, right) => getMetricValue(right, metric) - getMetricValue(left, metric));

    const visibleSlices = positiveSlices.length > limit
        ? positiveSlices.slice(0, limit - 1)
        : positiveSlices;
    const overflowSlices = positiveSlices.length > limit
        ? positiveSlices.slice(limit - 1)
        : [];

    const rows = visibleSlices.map((item, index) => ({
        ...item,
        metricValue: getMetricValue(item, metric),
        metricPercent: getMetricPercent(item, metric),
        fill: getFill?.(item, index) ?? "#1974D3",
    }));

    if (overflowSlices.length > 0) {
        const otherValue = overflowSlices.reduce((sum, item) => sum + item.value, 0);
        const otherQuantity = overflowSlices.reduce((sum, item) => sum + item.quantity, 0);
        const otherDrugCount = overflowSlices.reduce((sum, item) => sum + item.drugCount, 0);
        const otherPercentValue = overflowSlices.reduce((sum, item) => sum + item.percentValue, 0);
        const otherPercentQuantity = overflowSlices.reduce((sum, item) => sum + item.percentQuantity, 0);
        const otherSlice = {
            key: "other",
            label: "Khác",
            value: otherValue,
            quantity: otherQuantity,
            drugCount: otherDrugCount,
            percentValue: otherPercentValue,
            percentQuantity: otherPercentQuantity,
            metricValue: metric === "value" ? otherValue : otherQuantity,
            metricPercent: metric === "value" ? otherPercentValue : otherPercentQuantity,
            fill: "#00001B",
        };
        rows.push({
            ...otherSlice,
            fill: getFill?.(otherSlice, rows.length) ?? otherSlice.fill,
        });
    }

    return rows;
}

function UsageSliceTooltip({ active, payload, metric, hiddenPercentLabels }: UsageSliceTooltipProps) {
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
            <p className="font-semibold">{item.label}</p>
            <p className="mt-1">
                {getMetricLabel(metric)}: <span className="font-medium">{formatMetric(item.metricValue, metric)}</span>
            </p>
            <p style={{ color: chartTheme.mutedText }}>Giá trị: {formatCurrency(item.value)}</p>
            <p style={{ color: chartTheme.mutedText }}>Số lượng: {formatNumber(item.quantity)}</p>
            <p style={{ color: chartTheme.mutedText }}>Số mặt hàng: {formatNumber(item.drugCount, 0)}</p>
            {!shouldHidePercent(item.label, hiddenPercentLabels) && (
                <p style={{ color: chartTheme.mutedText }}>Tỷ trọng: {formatPercent(item.metricPercent)}</p>
            )}
        </div>
    );
}

function EmptyChart() {
    return (
        <div className="flex h-full items-center justify-center rounded-lg bg-muted/40 text-sm text-muted-foreground">
            Không có dữ liệu cho chiều phân tích này
        </div>
    );
}

function UsageBreakdownBarChart({
    title,
    subtitle,
    slices,
    metric,
    chartId,
}: {
    title: string;
    subtitle: string;
    slices: UsageSlice[];
    metric: UsageMetricKey;
    chartId: string;
}) {
    const chartColors = useChartColors();
    const chartData = useMemo(() => normalizeChartSlices(
        slices,
        metric,
        10,
        (item, index) => chartColors.resolveColor({
            chartId,
            key: normalizeDynamicChartKey(item.label),
            index,
        })
    ), [chartColors, chartId, metric, slices]);
    const chartTheme = useDashboardChartTheme();

    return (
        <div className="rounded-xl border border-border bg-card p-4 text-card-foreground shadow-sm sm:p-5">
            <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                    <h3 className="font-semibold text-foreground">{title}</h3>
                    <p className="text-xs text-muted-foreground">{subtitle}</p>
                </div>
                <ChartColorShortcut chartId={chartId} />
            </div>
            <div className="h-[300px] sm:h-[340px]">
                {chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} layout="vertical" margin={{ top: 8, right: 18, left: 8, bottom: 8 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
                            <XAxis
                                type="number"
                                tick={{ fontSize: 11, fill: chartTheme.axis }}
                                tickFormatter={formatMetricCompact}
                            />
                            <YAxis
                                type="category"
                                dataKey="label"
                                width={150}
                                tick={{ fontSize: 11, fill: chartTheme.axis }}
                                tickFormatter={(value: string) => truncateLabel(value)}
                            />
                            <Tooltip content={<UsageSliceTooltip metric={metric} />} />
                            <Bar dataKey="metricValue" radius={[0, 4, 4, 0]}>
                                {chartData.map((item) => (
                                    <Cell key={item.key} fill={item.fill} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                ) : (
                    <EmptyChart />
                )}
            </div>
        </div>
    );
}

function UsageDonutChart({
    title,
    slices,
    metric,
    chartId,
    hiddenPercentLabels,
}: {
    title: string;
    slices: UsageSlice[];
    metric: UsageMetricKey;
    chartId: string;
    hiddenPercentLabels?: string[];
}) {
    const chartColors = useChartColors();
    const chartData = useMemo(() => normalizeChartSlices(
        slices,
        metric,
        4,
        (item, index) => chartColors.resolveColor({
            chartId,
            key: normalizeDynamicChartKey(item.label),
            index,
        })
    ), [chartColors, chartId, metric, slices]);
    const chartTheme = useDashboardChartTheme();

    return (
        <div className="rounded-xl border border-border bg-card p-4 text-card-foreground shadow-sm sm:p-5">
            <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                    <h3 className="font-semibold text-foreground">{title}</h3>
                    <p className="text-xs text-muted-foreground">Theo {getMetricLabel(metric).toLowerCase()}</p>
                </div>
                <ChartColorShortcut chartId={chartId} />
            </div>
            <div className="h-[240px] sm:h-[260px]">
                {chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={chartData}
                                dataKey="metricValue"
                                nameKey="label"
                                cx="50%"
                                cy="47%"
                                innerRadius="42%"
                                outerRadius="68%"
                                paddingAngle={2}
                                label={({ percent, payload }: { percent?: number; payload?: UsageChartDatum }) =>
                                    percent && percent > 0.05 && payload && !shouldHidePercent(payload.label, hiddenPercentLabels)
                                        ? `${(percent * 100).toFixed(0)}%`
                                        : ""
                                }
                            >
                                {chartData.map((item) => (
                                    <Cell key={item.key} fill={item.fill} />
                                ))}
                            </Pie>
                            <Tooltip content={<UsageSliceTooltip metric={metric} hiddenPercentLabels={hiddenPercentLabels} />} />
                            <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8, color: chartTheme.axis }} />
                        </PieChart>
                    </ResponsiveContainer>
                ) : (
                    <EmptyChart />
                )}
            </div>
        </div>
    );
}

function FacilityUsageTooltip({ active, payload, metric }: FacilityTooltipProps) {
    const row = payload?.[0]?.payload;
    const visiblePayload = payload?.filter((item) => Number(item.value || 0) > 0) ?? [];
    const chartTheme = useDashboardChartTheme();

    if (!active || !row) {
        return null;
    }

    return (
        <div
            className="max-w-sm rounded-lg border px-3 py-2 text-sm shadow-xl"
            style={{
                backgroundColor: chartTheme.tooltipBackground,
                borderColor: chartTheme.tooltipBorder,
                color: chartTheme.tooltipText,
            }}
        >
            <p className="font-semibold">{row.facilityName}</p>
            <p className="mt-1">
                Tổng {getMetricLabel(metric).toLowerCase()}:{" "}
                <span className="font-medium">{formatMetric(row.totalMetric, metric)}</span>
            </p>
            <div className="mt-2 space-y-1">
                {visiblePayload.map((item) => (
                    <div key={`${row.facilityName}-${item.name}`} className="flex items-center justify-between gap-4 text-xs">
                        <span className="flex items-center gap-2" style={{ color: chartTheme.mutedText }}>
                            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                            {item.name}
                        </span>
                        <span className="font-mono">{formatMetric(Number(item.value || 0), metric)}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

function buildFacilityStackData(
    facilities: FacilityUsageComparison[],
    dimension: UsageDimensionKey,
    metric: UsageMetricKey,
    getSeriesColor: (label: string, index: number) => string
) {
    const topFacilities = [...facilities]
        .filter((facility) => (metric === "value" ? facility.totalValue : facility.totalQuantity) > 0)
        .sort((left, right) => {
            const leftValue = metric === "value" ? left.totalValue : left.totalQuantity;
            const rightValue = metric === "value" ? right.totalValue : right.totalQuantity;
            return rightValue - leftValue;
        })
        .slice(0, 10);
    const sliceTotals = new Map<string, { label: string; total: number }>();

    topFacilities.forEach((facility) => {
        facility.dimensions[dimension].forEach((slice) => {
            const existing = sliceTotals.get(slice.key) ?? { label: slice.label, total: 0 };
            existing.total += getMetricValue(slice, metric);
            sliceTotals.set(slice.key, existing);
        });
    });

    const topSlices = Array.from(sliceTotals.entries())
        .filter(([, item]) => item.total > 0)
        .sort((left, right) => right[1].total - left[1].total)
        .slice(0, 6);
    const topSliceKeys = new Set(topSlices.map(([key]) => key));
    const hasOther = topFacilities.some((facility) =>
        facility.dimensions[dimension].some((slice) => !topSliceKeys.has(slice.key) && getMetricValue(slice, metric) > 0)
    );
    const series = [
        ...topSlices.map(([key, item], index) => ({
            sourceKey: key,
            dataKey: `s${index}`,
            label: item.label,
            color: getSeriesColor(item.label, index),
        })),
        ...(hasOther
            ? [{
                sourceKey: "other",
                dataKey: `s${topSlices.length}`,
                label: "Khác",
                color: getSeriesColor("Khác", topSlices.length),
            }]
            : []),
    ];
    const data = topFacilities.map((facility) => {
        const totalMetric = metric === "value" ? facility.totalValue : facility.totalQuantity;
        const row: FacilityStackDatum = {
            facilityName: facility.facilityName,
            totalMetric,
            totalValue: facility.totalValue,
            totalQuantity: facility.totalQuantity,
        };

        series.forEach((item) => {
            row[item.dataKey] = 0;
        });

        facility.dimensions[dimension].forEach((slice) => {
            const seriesItem = series.find((item) => item.sourceKey === slice.key)
                ?? series.find((item) => item.sourceKey === "other");

            if (seriesItem) {
                row[seriesItem.dataKey] = Number(row[seriesItem.dataKey] || 0) + getMetricValue(slice, metric);
            }
        });

        return row;
    });

    return { data, series };
}

function AdminFacilityUsageChart({
    overview,
    dimension,
    metric,
    isSingleFacility,
    onDimensionChange,
}: {
    overview: UsageOverview;
    dimension: UsageDimensionKey;
    metric: UsageMetricKey;
    isSingleFacility: boolean;
    onDimensionChange: (value: UsageDimensionKey) => void;
}) {
    const comparison = useMemo(() => overview.facilityComparison ?? [], [overview.facilityComparison]);
    const chartColors = useChartColors();
    const { data, series } = useMemo(
        () => buildFacilityStackData(
            comparison,
            dimension,
            metric,
            (label, index) => chartColors.resolveColor({
                chartId: "dashboard.analysis.facilityComparison",
                key: normalizeDynamicChartKey(label),
                index,
            })
        ),
        [chartColors, comparison, dimension, metric]
    );
    const chartTheme = useDashboardChartTheme();

    return (
        <div className="rounded-xl border border-border bg-card p-4 text-card-foreground shadow-sm sm:p-5">
            <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                    <div className="flex items-start gap-2">
                        <div>
                            <h3 className="font-semibold text-foreground">Top CSYT theo sử dụng</h3>
                            <p className="text-xs text-muted-foreground">
                                {isSingleFacility ? "Cơ sở đang chọn" : "Top 10 cơ sở, chia theo chiều phân tích"}
                            </p>
                        </div>
                        <ChartColorShortcut chartId="dashboard.analysis.facilityComparison" />
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                    {DIMENSION_OPTIONS.map((option) => (
                        <button
                            key={option.key}
                            type="button"
                            onClick={() => onDimensionChange(option.key)}
                            className={`rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${dimension === option.key
                                ? "border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/45 dark:text-indigo-200"
                                : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
                                }`}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
            </div>
            <div className="h-[340px] sm:h-[420px]">
                {data.length > 0 && series.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data} layout="vertical" margin={{ top: 8, right: 20, left: 12, bottom: 8 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
                            <XAxis
                                type="number"
                                tick={{ fontSize: 11, fill: chartTheme.axis }}
                                tickFormatter={formatMetricCompact}
                            />
                            <YAxis
                                type="category"
                                dataKey="facilityName"
                                width={170}
                                tick={{ fontSize: 11, fill: chartTheme.axis }}
                                tickFormatter={(value: string) => truncateLabel(value, 26)}
                            />
                            <Tooltip content={<FacilityUsageTooltip metric={metric} />} />
                            <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8, color: chartTheme.axis }} />
                            {series.map((item, index) => (
                                <Bar
                                    key={item.dataKey}
                                    dataKey={item.dataKey}
                                    name={item.label}
                                    stackId="usage"
                                    fill={item.color}
                                    radius={index === series.length - 1 ? [0, 4, 4, 0] : [0, 0, 0, 0]}
                                />
                            ))}
                        </BarChart>
                    </ResponsiveContainer>
                ) : (
                    <EmptyChart />
                )}
            </div>
        </div>
    );
}

export default function UsageOverviewSection({ overview, isAdmin, isSingleFacility }: UsageOverviewSectionProps) {
    const [usageMetric, setUsageMetric] = useState<UsageMetricKey>("value");
    const [adminComparisonDimension, setAdminComparisonDimension] = useState<UsageDimensionKey>("drugGroup");
    const hasMappedUsage = overview.totalQuantity > 0;

    return (
        <section className="space-y-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                    <h2 className="text-lg font-semibold text-foreground">Tổng quan về Phân tích sử dụng thuốc</h2>
                    <p className="text-sm text-muted-foreground">
                        Cơ cấu sử dụng thuốc đã ánh xạ theo nhóm thuốc, nhóm điều trị và các thuộc tính quản lý
                    </p>
                </div>
                <div className="inline-flex w-full rounded-lg border border-border bg-card p-1 shadow-sm sm:w-fit">
                    {(["value", "quantity"] as UsageMetricKey[]).map((metric) => (
                        <button
                            key={metric}
                            type="button"
                            onClick={() => setUsageMetric(metric)}
                            className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors sm:flex-none ${usageMetric === metric
                                ? "bg-indigo-600 text-white"
                                : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                }`}
                        >
                            {metric === "value" ? "Giá trị" : "Số lượng"}
                        </button>
                    ))}
                </div>
            </div>

            {overview.excludedUnmapped.rowCount > 0 && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900/70 dark:bg-amber-950/35 dark:text-amber-200">
                    Biểu đồ chỉ tính thuốc đã ánh xạ. Đã loại {formatNumber(overview.excludedUnmapped.rowCount, 0)} dòng
                    chưa ánh xạ ({formatMetric(usageMetric === "value" ? overview.excludedUnmapped.value : overview.excludedUnmapped.quantity, usageMetric)}).
                </div>
            )}

            {!hasMappedUsage ? (
                <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground shadow-sm">
                    Không có thuốc đã ánh xạ có phát sinh sử dụng để vẽ biểu đồ.
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                        <UsageBreakdownBarChart
                            title="Cơ cấu theo nhóm thuốc"
                            subtitle="Top nhóm thuốc theo phạm vi đang chọn"
                            slices={overview.byDrugGroup}
                            metric={usageMetric}
                            chartId="dashboard.analysis.usageDrugGroup"
                        />
                        <UsageBreakdownBarChart
                            title="Cơ cấu theo nhóm điều trị"
                            subtitle="Top nhóm điều trị theo phạm vi đang chọn"
                            slices={overview.byTherapeuticGroup}
                            metric={usageMetric}
                            chartId="dashboard.analysis.usageTherapeuticGroup"
                        />
                    </div>

                    <UsageBreakdownBarChart
                        title="Top nhóm sử dụng cao nhất"
                        subtitle="Gộp góc nhìn nhóm thuốc và nhóm điều trị"
                        slices={overview.topGroups}
                        metric={usageMetric}
                        chartId="dashboard.analysis.usageTopGroups"
                    />

                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                        <UsageDonutChart
                            title="Thuốc kiểm soát đặc biệt"
                            slices={overview.bySpecialControl}
                            metric={usageMetric}
                            chartId="dashboard.analysis.attributes"
                            hiddenPercentLabels={[NON_SPECIAL_CONTROL_LABEL]}
                        />
                        <UsageDonutChart title="Kê đơn" slices={overview.byPrescription} metric={usageMetric} chartId="dashboard.analysis.attributes" />
                        <UsageDonutChart title="Trong nước" slices={overview.byDomestic} metric={usageMetric} chartId="dashboard.analysis.attributes" />
                    </div>

                    {isAdmin && (
                        <AdminFacilityUsageChart
                            overview={overview}
                            dimension={adminComparisonDimension}
                            metric={usageMetric}
                            isSingleFacility={isSingleFacility}
                            onDimensionChange={setAdminComparisonDimension}
                        />
                    )}
                </>
            )}
        </section>
    );
}
