"use client";

import { useState, useEffect } from "react";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend, Treemap,
} from "recharts";
import { useDashboardChartTheme } from "./chart-theme";

interface Tab1Props {
    reportMonth: string;
    facilityId: string;
    apiPrefix?: string;
}

interface Kpis {
    totalInventoryValue: number;
    domesticRatio: number;
    distinctDrugCount: number;
}

interface StackedBarDatum {
    facility: string;
    [key: string]: string | number;
}

interface DonutDatum {
    name: string;
    value: number;
}

interface HeatmapDatum {
    address: string;
    value: number;
}

interface TreemapDatum {
    name: string;
    value: number;
    facility?: string;
    drugGroup?: string;
    fill?: string;
    children?: TreemapDatum[];
    [key: string]: unknown;
}

interface OverviewData {
    kpis: Kpis;
    stackedBarData: StackedBarDatum[];
    drugGroups: string[];
    donutData: DonutDatum[];
    topExportByFacility: StackedBarDatum[];
    topImportTreemap: TreemapDatum[];
    heatmapData: HeatmapDatum[];
}

interface TreemapContentProps {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    name?: string;
    value?: number;
    payload?: TreemapDatum;
}

interface TreemapTooltipProps {
    active?: boolean;
    payload?: Array<{ payload?: TreemapDatum }>;
}

const COLORS = [
    "#6366f1", "#ec4899", "#14b8a6", "#f59e0b", "#3b82f6",
    "#8b5cf6", "#ef4444", "#10b981", "#f97316", "#06b6d4",
    "#a855f7", "#84cc16", "#e11d48", "#0ea5e9",
];

const formatCurrency = (value: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value);

const formatCompact = (value: number) =>
    new Intl.NumberFormat('vi-VN', { notation: "compact", compactDisplay: "short" }).format(value);

const formatPercent = (value: number) =>
    new Intl.NumberFormat('vi-VN', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(value);

const formatTooltipCurrency = (value: number | string | undefined): [string] => [formatCurrency(Number(value ?? 0))];
const truncateLabel = (value: string, maxLength = 24) =>
    value.length > maxLength ? `${value.slice(0, maxLength - 1)}…` : value;

const ImportTreemapContent = ({
    x = 0,
    y = 0,
    width = 0,
    height = 0,
    name = "",
    value = 0,
    payload,
}: TreemapContentProps) => {
    if (width < 6 || height < 6) {
        return null;
    }

    const isParentNode = Boolean(payload?.children?.length);

    if (isParentNode) {
        return (
            <g>
                <rect
                    x={x}
                    y={y}
                    width={width}
                    height={height}
                    fill="var(--muted)"
                    stroke="var(--border)"
                    strokeWidth={2}
                    rx={6}
                />
                {width > 90 && height > 28 && (
                    <text x={x + 8} y={y + 18} fill="var(--foreground)" fontSize={11} fontWeight="bold">
                        {truncateLabel(name, Math.max(10, Math.floor(width / 7)))}
                    </text>
                )}
            </g>
        );
    }

    return (
        <g>
            <rect
                x={x}
                y={y}
                width={width}
                height={height}
                fill={payload?.fill || "#6366f1"}
                stroke="#fff"
                strokeWidth={2}
                rx={4}
                opacity={0.92}
            />
            {width > 70 && height > 36 && (
                <>
                    <text x={x + 8} y={y + 18} fill="#fff" fontSize={11} fontWeight="bold">
                        {truncateLabel(payload?.drugGroup || name, Math.max(8, Math.floor(width / 8)))}
                    </text>
                    {width > 90 && height > 52 && (
                        <text x={x + 8} y={y + 34} fill="rgba(255,255,255,0.82)" fontSize={10}>
                            {formatCompact(value)}
                        </text>
                    )}
                </>
            )}
        </g>
    );
};

const ImportTreemapTooltip = ({ active, payload }: TreemapTooltipProps) => {
    const node = payload?.[0]?.payload;

    if (!active || !node) {
        return null;
    }

    const isParentNode = Boolean(node.children?.length);

    return (
        <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-xl">
            <p className="text-sm font-semibold text-foreground">
                {isParentNode ? node.facility || node.name : node.facility || "Unknown"}
            </p>
            {!isParentNode && (
                <p className="text-xs text-muted-foreground">
                    Nhóm thuốc: {node.drugGroup || node.name}
                </p>
            )}
            <p className="mt-1 text-sm text-foreground">
                Giá trị nhập: <span className="font-semibold">{formatCurrency(node.value)}</span>
            </p>
        </div>
    );
};

export default function Tab1Overview({ reportMonth, facilityId, apiPrefix = "/api/admin/dashboard" }: Tab1Props) {
    const [data, setData] = useState<OverviewData | null>(null);
    const [loading, setLoading] = useState(true);
    const chartTheme = useDashboardChartTheme();
    const tooltipStyle = {
        backgroundColor: chartTheme.tooltipBackground,
        borderRadius: "10px",
        border: `1px solid ${chartTheme.tooltipBorder}`,
        color: chartTheme.tooltipText,
        boxShadow: "0 10px 25px -5px rgb(0 0 0 / 0.1)",
    };

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const params = new URLSearchParams();
                if (reportMonth && reportMonth !== "all") params.set("reportMonth", reportMonth);
                if (facilityId) params.set("facilityId", facilityId);
                const res = await fetch(`${apiPrefix}/overview?${params}`);
                const json: OverviewData = await res.json();
                setData(json);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [reportMonth, facilityId, apiPrefix]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                    <p className="text-sm text-muted-foreground">Đang tải dữ liệu...</p>
                </div>
            </div>
        );
    }

    if (!data) return <p className="text-center text-red-500 py-8">Không thể tải dữ liệu</p>;

    const {
        kpis,
        stackedBarData = [],
        drugGroups = [],
        donutData = [],
        topExportByFacility = [],
        topImportTreemap = [],
        heatmapData = [],
    } = data;

    const totalHeatmapValue = heatmapData.reduce((sum: number, item: HeatmapDatum) => sum + Number(item.value || 0), 0);
    const topExportDrugGroups = Array.from(new Set(
        topExportByFacility.flatMap((item) =>
            Object.keys(item).filter((key) => key !== "facility" && key !== "total")
        )
    ));
    const topImportDrugGroups = Array.from(new Set(
        topImportTreemap.flatMap((facilityNode) =>
            (facilityNode.children || []).map((groupNode) => groupNode.drugGroup || groupNode.name)
        )
    ));
    const allOverviewDrugGroups = Array.from(new Set([
        ...drugGroups,
        ...topExportDrugGroups,
        ...topImportDrugGroups,
    ]));
    const groupColorMap = allOverviewDrugGroups.reduce<Record<string, string>>((acc, group, index) => {
        acc[group] = COLORS[index % COLORS.length];
        return acc;
    }, {});
    const topImportTreemapData = topImportTreemap.map((facilityNode) => ({
        ...facilityNode,
        children: (facilityNode.children || []).map((groupNode) => ({
            ...groupNode,
            fill: groupColorMap[groupNode.drugGroup || groupNode.name] || COLORS[0],
        })),
    }));

    return (
        <div className="space-y-6">
            {/* KPI Scorecards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="relative overflow-hidden rounded-xl border-0 shadow-lg bg-gradient-to-br from-indigo-500 to-purple-600 text-white p-5">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-card/10 rounded-full -mr-8 -mt-8" />
                    <p className="text-sm font-medium opacity-90">Tổng giá trị tồn kho</p>
                    <p className="text-2xl font-bold mt-1">{formatCurrency(kpis.totalInventoryValue)}</p>
                    <p className="text-xs opacity-75 mt-1">Toàn ngành</p>
                </div>
                <div className="relative overflow-hidden rounded-xl border-0 shadow-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white p-5">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-card/10 rounded-full -mr-8 -mt-8" />
                    <p className="text-sm font-medium opacity-90">Tỷ lệ thuốc nội</p>
                    <p className="text-2xl font-bold mt-1">{kpis.domesticRatio}%</p>
                    <p className="text-xs opacity-75 mt-1">Theo giá trị xuất kho</p>
                </div>
                <div className="relative overflow-hidden rounded-xl border-0 shadow-lg bg-gradient-to-br from-blue-500 to-cyan-600 text-white p-5">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-card/10 rounded-full -mr-8 -mt-8" />
                    <p className="text-sm font-medium opacity-90">Số mặt hàng quản lý</p>
                    <p className="text-2xl font-bold mt-1">{kpis.distinctDrugCount.toLocaleString()}</p>
                    <p className="text-xs opacity-75 mt-1">Mã thuốc phân biệt</p>
                </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Stacked Bar Chart */}
                <div className="rounded-xl border border-border bg-card p-5 text-card-foreground shadow-sm">
                    <h3 className="font-semibold text-foreground mb-1">Top 10 CSYT tồn kho lớn nhất</h3>
                    <p className="text-xs text-muted-foreground mb-4">Chia theo nhóm thuốc</p>
                    <div className="h-[380px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stackedBarData} margin={{ top: 10, right: 20, left: 10, bottom: 60 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
                                <XAxis
                                    dataKey="facility"
                                    angle={-35}
                                    textAnchor="end"
                                    height={80}
                                    tick={{ fontSize: 10, fill: chartTheme.axis }}
                                    interval={0}
                                />
                                <YAxis tick={{ fontSize: 11, fill: chartTheme.axis }} tickFormatter={formatCompact} width={70} />
                                <Tooltip
                                    contentStyle={tooltipStyle}
                                    formatter={formatTooltipCurrency}
                                />
                                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8, color: chartTheme.axis }} />
                                {drugGroups.map((group: string, i: number) => (
                                    <Bar
                                        key={group}
                                        dataKey={group}
                                        stackId="a"
                                        fill={groupColorMap[group] || COLORS[i % COLORS.length]}
                                        radius={i === drugGroups.length - 1 ? [3, 3, 0, 0] : [0, 0, 0, 0]}
                                    />
                                ))}
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Donut Chart */}
                <div className="rounded-xl border border-border bg-card p-5 text-card-foreground shadow-sm">
                    <h3 className="font-semibold text-foreground mb-1">BHYT vs. Dịch vụ</h3>
                    <p className="text-xs text-muted-foreground mb-4">Tỷ lệ giá trị sử dụng</p>
                    <div className="h-[380px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={donutData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={80}
                                    outerRadius={130}
                                    paddingAngle={3}
                                    dataKey="value"
                                    label={({ name, percent }: { name?: string; percent?: number }) =>
                                        `${name || ""}: ${((percent || 0) * 100).toFixed(1)}%`
                                    }
                                    labelLine={{ strokeWidth: 2 }}
                                >
                                    <Cell fill="#6366f1" />
                                    <Cell fill="#f59e0b" />
                                </Pie>
                                <Tooltip contentStyle={tooltipStyle} formatter={formatTooltipCurrency} />
                                <Legend wrapperStyle={{ color: chartTheme.axis }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="rounded-xl border border-border bg-card p-5 text-card-foreground shadow-sm">
                    <h3 className="font-semibold text-foreground mb-1">Top 10 cơ sở giá trị Xuất lớn nhất</h3>
                    <p className="text-xs text-muted-foreground mb-4">Tính theo xuat × giaVat, chia theo nhóm thuốc</p>
                    <div className="h-[420px]">
                        {topExportByFacility.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    data={topExportByFacility}
                                    layout="vertical"
                                    margin={{ top: 10, right: 20, left: 16, bottom: 10 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
                                    <XAxis
                                        type="number"
                                        tick={{ fontSize: 11, fill: chartTheme.axis }}
                                        tickFormatter={formatCompact}
                                    />
                                    <YAxis
                                        type="category"
                                        dataKey="facility"
                                        width={150}
                                        tick={{ fontSize: 11, fill: chartTheme.axis }}
                                        tickFormatter={(value: string) => truncateLabel(value, 24)}
                                    />
                                    <Tooltip
                                        contentStyle={tooltipStyle}
                                        formatter={formatTooltipCurrency}
                                    />
                                    <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8, color: chartTheme.axis }} />
                                    {topExportDrugGroups.map((group, index) => (
                                        <Bar
                                            key={group}
                                            dataKey={group}
                                            stackId="a"
                                            fill={groupColorMap[group] || COLORS[index % COLORS.length]}
                                            radius={index === topExportDrugGroups.length - 1 ? [0, 4, 4, 0] : [0, 0, 0, 0]}
                                        />
                                    ))}
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex items-center justify-center h-full text-muted-foreground/70">Không có dữ liệu</div>
                        )}
                    </div>
                </div>

                <div className="rounded-xl border border-border bg-card p-5 text-card-foreground shadow-sm">
                    <h3 className="font-semibold text-foreground mb-1">Top 10 cơ sở giá trị Nhập lớn nhất</h3>
                    <p className="text-xs text-muted-foreground mb-4">Tính theo nhap × giaVat, cơ cấu theo nhóm thuốc</p>
                    <div className="h-[420px]">
                        {topImportTreemapData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <Treemap
                                    data={topImportTreemapData}
                                    dataKey="value"
                                    aspectRatio={4 / 3}
                                    content={<ImportTreemapContent />}
                                >
                                    <Tooltip content={<ImportTreemapTooltip />} />
                                </Treemap>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex items-center justify-center h-full text-muted-foreground/70">Không có dữ liệu</div>
                        )}
                    </div>
                </div>
            </div>

            {/* Heatmap Table */}
            <div className="rounded-xl border border-border bg-card p-5 text-card-foreground shadow-sm">
                <h3 className="font-semibold text-foreground mb-1">Phân bố tồn kho theo địa bàn</h3>
                <p className="text-xs text-muted-foreground mb-4">Dựa trên địa chỉ cơ sở báo cáo</p>
                <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                    <table className="w-full text-sm">
                        <thead className="sticky top-0">
                            <tr className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white">
                                <th className="text-left p-3 font-semibold rounded-tl-lg">STT</th>
                                <th className="text-left p-3 font-semibold">Địa bàn</th>
                                <th className="text-right p-3 font-semibold">Giá trị tồn kho</th>
                                <th className="text-left p-3 font-semibold rounded-tr-lg w-1/3">Tỷ trọng</th>
                            </tr>
                        </thead>
                        <tbody>
                            {heatmapData.map((item: HeatmapDatum, i: number) => {
                                const share = totalHeatmapValue > 0 ? Number(item.value) / totalHeatmapValue : 0;
                                const hue = 120 - share * 120; // green -> red
                                return (
                                    <tr key={i} className="border-b border-border hover:bg-muted/40 transition-colors">
                                        <td className="p-3 text-muted-foreground">{i + 1}</td>
                                        <td className="p-3 font-medium text-foreground">{item.address}</td>
                                        <td className="p-3 text-right font-mono text-foreground">{formatCurrency(item.value)}</td>
                                        <td className="p-3">
                                            <div className="flex items-center gap-2">
                                                <div className="flex-1 bg-muted rounded-full h-3 overflow-hidden">
                                                    <div
                                                        className="h-full rounded-full transition-all"
                                                        style={{
                                                            width: `${share * 100}%`,
                                                            backgroundColor: `hsl(${hue}, 70%, 50%)`,
                                                        }}
                                                    />
                                                </div>
                                                <span className="text-xs text-muted-foreground w-16 text-right">
                                                    {formatPercent(share * 100)}%
                                                </span>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    {heatmapData.length === 0 && (
                        <p className="text-center text-muted-foreground/70 py-8">Không có dữ liệu</p>
                    )}
                </div>
            </div>
        </div>
    );
}
