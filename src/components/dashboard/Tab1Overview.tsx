"use client";

import { useState, useEffect } from "react";
import { Search, X } from "lucide-react";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend, Treemap,
} from "recharts";
import {
    useDashboardChartTheme,
} from "./chart-theme";
import ChartColorShortcut from "./ChartColorShortcut";
import { useChartColors } from "./ChartColorProvider";
import {
    Map,
    MapControls,
    MapMarker,
    MarkerContent,
    MarkerPopup,
    MarkerTooltip,
} from "@/components/ui/map";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { normalizeDynamicChartKey } from "@/lib/chart-colors";

interface Tab1Props {
    reportMonth: string;
    facilityId: string;
    apiPrefix?: string;
    masterDrugApiUrl?: string;
}

interface Kpis {
    totalInventoryValue: number;
    domesticRatio: number;
    domesticUsageLineRatio?: number;
    domesticUsageLineCount?: number;
    classifiedUsageLineCount?: number;
    distinctDrugCount: number;
}

interface StackedBarDatum {
    facility: string;
    [key: string]: string | number;
}

interface FacilityImportExportInventoryDatum {
    facility: string;
    importValue: number;
    exportValue: number;
    inventoryValue: number;
    total: number;
}

interface DonutDatum {
    name: string;
    value: number;
}

interface HeatmapDatum {
    address: string;
    value: number;
}

interface InventoryMapDatum {
    facilityId: string;
    facilityName: string;
    address: string;
    latitude: number;
    longitude: number;
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
    facilityImportExportInventory?: FacilityImportExportInventoryDatum[];
    inventoryByFacilityDrugGroup?: StackedBarDatum[];
    inventoryDrugGroups?: string[];
    drugGroups: string[];
    donutData: DonutDatum[];
    topExportByFacility: StackedBarDatum[];
    topImportTreemap: TreemapDatum[];
    heatmapData: HeatmapDatum[];
    inventoryMapData?: InventoryMapDatum[];
    mapMissingCoordinateCount?: number;
}

interface MapDrugOption {
    id: string;
    maChung: string;
    tenThuoc: string;
    hoatChat: string | null;
    soDangKy: string | null;
}

type FacilityInventoryFilter = "all" | "top3" | "top5" | "top10" | "bottom3" | "bottom5" | "bottom10";

interface TreemapContentProps {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    name?: string;
    value?: number;
    fill?: string;
    drugGroup?: string;
    children?: TreemapDatum[];
    payload?: TreemapDatum;
}

interface TreemapTooltipProps {
    active?: boolean;
    payload?: Array<{ payload?: TreemapDatum }>;
}

interface MetricBarDatum {
    name: string;
    value: number;
}

const formatCurrency = (value: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value);

const formatCompact = (value: number) =>
    new Intl.NumberFormat('vi-VN', { notation: "compact", compactDisplay: "short" }).format(value);

const formatPercent = (value: number) =>
    new Intl.NumberFormat('vi-VN', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(value);

const formatTooltipCurrency = (value: number | string | undefined): [string] => [formatCurrency(Number(value ?? 0))];
const truncateLabel = (value: string, maxLength = 24) =>
    value.length > maxLength ? `${value.slice(0, maxLength - 1)}…` : value;
const formatMapDrugLabel = (drug: MapDrugOption) => `${drug.maChung} - ${drug.tenThuoc}`;
const DEFAULT_MAP_CENTER: [number, number] = [105.7469, 10.0452];
const FACILITY_INVENTORY_FILTER_OPTIONS: Array<{ value: FacilityInventoryFilter; label: string }> = [
    { value: "all", label: "Tất cả đơn vị đã báo cáo" },
    { value: "top3", label: "Top 3 giá trị lớn nhất" },
    { value: "top5", label: "Top 5 giá trị lớn nhất" },
    { value: "top10", label: "Top 10 giá trị lớn nhất" },
    { value: "bottom3", label: "Top 3 giá trị nhỏ nhất" },
    { value: "bottom5", label: "Top 5 giá trị nhỏ nhất" },
    { value: "bottom10", label: "Top 10 giá trị nhỏ nhất" },
];

const filterFacilityInventoryData = <T extends { facility: string; total?: number }>(
    rows: T[],
    filter: FacilityInventoryFilter
) => {
    if (filter === "all") {
        return rows;
    }

    const limit = Number(filter.replace(/\D/g, ""));
    const sortedRows = [...rows].sort((left, right) => {
        const leftTotal = Number(left.total || 0);
        const rightTotal = Number(right.total || 0);
        const totalDiff = filter.startsWith("bottom")
            ? leftTotal - rightTotal
            : rightTotal - leftTotal;

        if (totalDiff !== 0) {
            return totalDiff;
        }

        return String(left.facility).localeCompare(String(right.facility), "vi");
    });

    return sortedRows.slice(0, limit);
};

const sortMetricBars = (rows: MetricBarDatum[]) =>
    rows
        .filter((item) => Number.isFinite(item.value) && item.value > 0)
        .sort((left, right) => right.value - left.value || left.name.localeCompare(right.name, "vi"));

const buildMetricBarsFromStackedDatum = (row?: StackedBarDatum): MetricBarDatum[] => {
    if (!row) {
        return [];
    }

    return sortMetricBars(
        Object.entries(row)
            .filter(([key]) => key !== "facility" && key !== "total")
            .map(([name, value]) => ({
                name,
                value: Number(value || 0),
            }))
    );
};

function getInventoryMarkerSize(value: number, maxValue: number) {
    if (maxValue <= 0) {
        return 16;
    }

    return Math.round(14 + Math.sqrt(value / maxValue) * 28);
}

const ImportTreemapContent = ({
    x = 0,
    y = 0,
    width = 0,
    height = 0,
    name = "",
    value = 0,
    fill,
    drugGroup,
    children,
    payload,
}: TreemapContentProps) => {
    if (width < 6 || height < 6) {
        return null;
    }

    const isParentNode = Boolean((payload?.children ?? children)?.length);

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
                fill={payload?.fill || fill || "var(--primary)"}
                stroke="#fff"
                strokeWidth={2}
                rx={4}
                opacity={0.92}
            />
            {width > 70 && height > 36 && (
                <>
                    <text x={x + 8} y={y + 18} fill="#fff" fontSize={11} fontWeight="bold">
                        {truncateLabel(payload?.drugGroup || drugGroup || name, Math.max(8, Math.floor(width / 8)))}
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

export default function Tab1Overview({
    reportMonth,
    facilityId,
    apiPrefix = "/api/admin/dashboard",
    masterDrugApiUrl = "/api/admin/master-drugs",
}: Tab1Props) {
    const [data, setData] = useState<OverviewData | null>(null);
    const [loading, setLoading] = useState(true);
    const [mapDrugQuery, setMapDrugQuery] = useState("");
    const [mapDrugOptions, setMapDrugOptions] = useState<MapDrugOption[]>([]);
    const [selectedMapDrug, setSelectedMapDrug] = useState<MapDrugOption | null>(null);
    const [isMapDrugLoading, setIsMapDrugLoading] = useState(false);
    const [isMapDrugSearchFocused, setIsMapDrugSearchFocused] = useState(false);
    const [facilityInventoryFilter, setFacilityInventoryFilter] = useState<FacilityInventoryFilter>("all");
    const chartTheme = useDashboardChartTheme();
    const chartColors = useChartColors();
    const isFacilityDashboard = apiPrefix.includes("/api/facility/dashboard");
    const isAdminDashboard = apiPrefix.includes("/api/admin/dashboard");
    const showDomesticUsageLineCard = isAdminDashboard || apiPrefix.includes("/api/public/dashboard");
    const selectedMapDrugId = selectedMapDrug?.id || "";
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
                if (selectedMapDrugId) params.set("mapMasterDrugId", selectedMapDrugId);
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
    }, [reportMonth, facilityId, apiPrefix, selectedMapDrugId]);

    useEffect(() => {
        const query = mapDrugQuery.trim();

        if (query.length < 2) {
            setMapDrugOptions([]);
            setIsMapDrugLoading(false);
            return;
        }

        const controller = new AbortController();
        const timeoutId = window.setTimeout(async () => {
            setIsMapDrugLoading(true);
            try {
                const params = new URLSearchParams({
                    search: query,
                    limit: "8",
                });
                const response = await fetch(`${masterDrugApiUrl}?${params}`, {
                    signal: controller.signal,
                });

                if (!response.ok) {
                    throw new Error(`Failed to load drug options: ${response.status}`);
                }

                const payload: { data?: MapDrugOption[] } = await response.json();
                setMapDrugOptions(payload.data || []);
            } catch (error) {
                if (error instanceof DOMException && error.name === "AbortError") {
                    return;
                }

                console.error("Map drug search error:", error);
                setMapDrugOptions([]);
            } finally {
                setIsMapDrugLoading(false);
            }
        }, 250);

        return () => {
            window.clearTimeout(timeoutId);
            controller.abort();
        };
    }, [mapDrugQuery, masterDrugApiUrl]);

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
        facilityImportExportInventory = [],
        inventoryByFacilityDrugGroup = [],
        inventoryDrugGroups = [],
        drugGroups = [],
        donutData = [],
        topExportByFacility = [],
        topImportTreemap = [],
        heatmapData = [],
        inventoryMapData = [],
        mapMissingCoordinateCount = 0,
    } = data;
    const shouldRenderInventoryMap = Array.isArray(data.inventoryMapData)
        || typeof data.mapMissingCoordinateCount === "number";

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
        ...inventoryDrugGroups,
        ...drugGroups,
        ...topExportDrugGroups,
        ...topImportDrugGroups,
    ]));
    const groupColorMap = allOverviewDrugGroups.reduce<Record<string, string>>((acc, group, index) => {
        const groupLabel = String(group || "Khác");
        acc[groupLabel] = chartColors.resolveColor({
            chartId: "dashboard.overview.inventoryValue",
            key: normalizeDynamicChartKey(groupLabel),
            index,
        });
        return acc;
    }, {});
    const topImportTreemapData = topImportTreemap.map((facilityNode) => ({
        ...facilityNode,
        children: (facilityNode.children || []).map((groupNode) => {
            const groupLabel = String(groupNode.drugGroup || groupNode.name || "Khác");
            return {
                ...groupNode,
                fill: groupColorMap[groupLabel] || chartColors.resolveColor({ index: 0 }),
            };
        }),
    }));

    const getHeatmapShareColor = (share: number) => {
        if (share >= 0.2) {
            return chartColors.resolveColor({ semanticKey: "inventory" });
        }
        if (share >= 0.1) {
            return chartColors.resolveColor({ semanticKey: "import" });
        }
        if (share >= 0.05) {
            return chartColors.resolveColor({ semanticKey: "warning" });
        }
        return chartColors.resolveColor({ semanticKey: "service" });
    };
    const mapMaxValue = inventoryMapData.reduce((max, item) => Math.max(max, Number(item.value || 0)), 0);
    const mapCenter: [number, number] = inventoryMapData.length > 0
        ? [
            inventoryMapData.reduce((sum, item) => sum + Number(item.longitude), 0) / inventoryMapData.length,
            inventoryMapData.reduce((sum, item) => sum + Number(item.latitude), 0) / inventoryMapData.length,
        ]
        : DEFAULT_MAP_CENTER;
    const inventoryMapColor = chartColors.resolveColor({ semanticKey: "inventory" });
    const mapKey = `${mapCenter[0].toFixed(4)}-${mapCenter[1].toFixed(4)}-${inventoryMapData.length}-${selectedMapDrugId || "all"}`;
    const showMapDrugSearchDropdown = isMapDrugSearchFocused && mapDrugQuery.trim().length >= 2;
    const filteredInventoryByFacilityDrugGroup = filterFacilityInventoryData(
        inventoryByFacilityDrugGroup,
        facilityInventoryFilter
    );
    const filteredFacilityImportExportInventory = filterFacilityInventoryData(
        facilityImportExportInventory,
        facilityInventoryFilter
    );
    const hasFacilityImportExportInventory = filteredFacilityImportExportInventory.some((item) =>
        Number(item.importValue || 0) > 0 || Number(item.exportValue || 0) > 0 || Number(item.inventoryValue || 0) > 0
    );
    const hasFacilityDrugGroupInventory = filteredInventoryByFacilityDrugGroup.some((item) => Number(item.total || 0) > 0);
    const facilityDrugGroupChartWidth = Math.max(960, filteredInventoryByFacilityDrugGroup.length * 72);
    const facilityImportExportChartWidth = Math.max(960, filteredFacilityImportExportInventory.length * 104);
    const importValueColor = chartColors.resolveColor({ semanticKey: "import" });
    const exportValueColor = chartColors.resolveColor({ semanticKey: "export" });
    const inventoryValueColor = chartColors.resolveColor({ semanticKey: "inventory" });
    const facilityInventoryBars = sortMetricBars(
        heatmapData.map((item) => ({
            name: item.address,
            value: Number(item.value || 0),
        }))
    );
    const facilityExportBars = buildMetricBarsFromStackedDatum(topExportByFacility[0]);
    const facilityImportBars = sortMetricBars(
        (topImportTreemap[0]?.children || []).map((item) => ({
            name: String(item.drugGroup || item.name || "Khác"),
            value: Number(item.value || 0),
        }))
    );
    const facilityFlowSource = facilityImportExportInventory[0];
    const facilityFlowData = [
        { name: "Giá trị nhập", value: Number(facilityFlowSource?.importValue || 0), fill: importValueColor },
        { name: "Giá trị xuất", value: Number(facilityFlowSource?.exportValue || 0), fill: exportValueColor },
        { name: "Giá trị tồn", value: Number(facilityFlowSource?.inventoryValue || 0), fill: inventoryValueColor },
    ];
    const hasFacilityFlowData = facilityFlowData.some((item) => item.value > 0);
    const hasDonutData = donutData.some((item) => Number(item.value || 0) > 0);

    const renderFacilityMetricBarChart = (
        rows: MetricBarDatum[],
        chartId: string,
        semanticKey: "inventory" | "import" | "export"
    ) => (
        <div className="h-[300px] sm:h-[340px]">
            {rows.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={rows}
                        layout="vertical"
                        margin={{ top: 8, right: 18, left: 12, bottom: 8 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
                        <XAxis
                            type="number"
                            tick={{ fontSize: 11, fill: chartTheme.axis }}
                            tickFormatter={formatCompact}
                        />
                        <YAxis
                            type="category"
                            dataKey="name"
                            width={128}
                            tick={{ fontSize: 11, fill: chartTheme.axis }}
                            tickFormatter={(value: string) => truncateLabel(value, 20)}
                        />
                        <Tooltip
                            contentStyle={tooltipStyle}
                            formatter={formatTooltipCurrency}
                            labelFormatter={(label) => `Nhóm thuốc: ${label}`}
                        />
                        <Bar dataKey="value" name="Giá trị" radius={[0, 4, 4, 0]}>
                            {rows.map((item, index) => (
                                <Cell
                                    key={`${item.name}-${index}`}
                                    fill={chartColors.resolveColor({
                                        chartId,
                                        key: normalizeDynamicChartKey(item.name),
                                        semanticKey,
                                        index,
                                    })}
                                />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground/70">Không có dữ liệu</div>
            )}
        </div>
    );

    if (isFacilityDashboard) {
        return (
            <div className="space-y-4 sm:space-y-6">
                {/* KPI Scorecards */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div className="relative overflow-hidden rounded-xl border-0 bg-gradient-to-br from-indigo-500 to-purple-600 p-4 text-white shadow-lg sm:p-5">
                        <div className="absolute right-0 top-0 h-20 w-20 -mr-8 -mt-8 rounded-full bg-card/10" />
                        <p className="text-sm font-medium opacity-90">Tổng giá trị tồn kho</p>
                        <p className="mt-1 text-xl font-bold sm:text-2xl">{formatCurrency(kpis.totalInventoryValue)}</p>
                        <p className="mt-1 text-xs opacity-75">Đơn vị hiện tại</p>
                    </div>
                    <div className="relative overflow-hidden rounded-xl border-0 bg-gradient-to-br from-emerald-500 to-teal-600 p-4 text-white shadow-lg sm:p-5">
                        <div className="absolute right-0 top-0 h-20 w-20 -mr-8 -mt-8 rounded-full bg-card/10" />
                        <p className="text-sm font-medium opacity-90">Tỷ lệ thuốc nội</p>
                        <p className="mt-1 text-xl font-bold sm:text-2xl">{kpis.domesticRatio}%</p>
                        <p className="mt-1 text-xs opacity-75">Theo giá trị xuất kho</p>
                    </div>
                    <div className="relative overflow-hidden rounded-xl border-0 bg-gradient-to-br from-blue-500 to-cyan-600 p-4 text-white shadow-lg sm:p-5">
                        <div className="absolute right-0 top-0 h-20 w-20 -mr-8 -mt-8 rounded-full bg-card/10" />
                        <p className="text-sm font-medium opacity-90">Số mặt hàng quản lý</p>
                        <p className="mt-1 text-xl font-bold sm:text-2xl">{kpis.distinctDrugCount.toLocaleString()}</p>
                        <p className="mt-1 text-xs opacity-75">Mã thuốc phân biệt</p>
                    </div>
                </div>

                <div className="rounded-xl border border-border bg-card p-4 text-card-foreground shadow-sm sm:p-5">
                    <h3 className="mb-1 font-semibold text-foreground">Giá trị Nhập - Xuất - Tồn</h3>
                    <p className="mb-4 text-xs text-muted-foreground">
                        Tổng giá trị nhập, xuất và tồn kho của đơn vị trong kỳ đã chọn
                    </p>
                    <div className="h-[300px] sm:h-[340px]">
                        {hasFacilityFlowData ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={facilityFlowData} margin={{ top: 12, right: 20, left: 8, bottom: 24 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
                                    <XAxis
                                        dataKey="name"
                                        tick={{ fontSize: 12, fill: chartTheme.axis }}
                                        interval={0}
                                    />
                                    <YAxis tick={{ fontSize: 11, fill: chartTheme.axis }} tickFormatter={formatCompact} width={78} />
                                    <Tooltip contentStyle={tooltipStyle} formatter={formatTooltipCurrency} />
                                    <Bar dataKey="value" name="Giá trị" radius={[4, 4, 0, 0]}>
                                        {facilityFlowData.map((item) => (
                                            <Cell key={item.name} fill={item.fill} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex h-full items-center justify-center text-muted-foreground/70">Không có dữ liệu</div>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
                    <div className="rounded-xl border border-border bg-card p-4 text-card-foreground shadow-sm sm:p-5">
                        <div className="mb-1 flex items-start justify-between gap-3">
                            <div>
                                <h3 className="font-semibold text-foreground">Cơ cấu tồn kho theo nhóm thuốc</h3>
                                <p className="mt-1 text-xs text-muted-foreground">Sắp xếp theo giá trị tồn kho giảm dần</p>
                            </div>
                            <ChartColorShortcut chartId="dashboard.overview.inventoryValue" />
                        </div>
                        {renderFacilityMetricBarChart(
                            facilityInventoryBars,
                            "dashboard.overview.inventoryValue",
                            "inventory"
                        )}
                    </div>

                    <div className="rounded-xl border border-border bg-card p-4 text-card-foreground shadow-sm sm:p-5">
                        <div className="mb-1 flex items-start justify-between gap-3">
                            <div>
                                <h3 className="font-semibold text-foreground">BHYT vs. Dịch vụ</h3>
                                <p className="mt-1 text-xs text-muted-foreground">Tỷ lệ giá trị sử dụng</p>
                            </div>
                            <ChartColorShortcut chartId="dashboard.overview.insuranceService" />
                        </div>
                        <div className="h-[300px] sm:h-[340px]">
                            {hasDonutData ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={donutData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius="42%"
                                            outerRadius="68%"
                                            paddingAngle={3}
                                            dataKey="value"
                                            label={({ name, percent }: { name?: string; percent?: number }) =>
                                                `${name || ""}: ${((percent || 0) * 100).toFixed(1)}%`
                                            }
                                            labelLine={{ strokeWidth: 2 }}
                                        >
                                            <Cell fill={chartColors.resolveColor({ chartId: "dashboard.overview.insuranceService", key: "insurance", semanticKey: "insurance" })} />
                                            <Cell fill={chartColors.resolveColor({ chartId: "dashboard.overview.insuranceService", key: "service", semanticKey: "service" })} />
                                        </Pie>
                                        <Tooltip contentStyle={tooltipStyle} formatter={formatTooltipCurrency} />
                                        <Legend wrapperStyle={{ color: chartTheme.axis }} />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="flex h-full items-center justify-center text-muted-foreground/70">Không có dữ liệu</div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
                    <div className="rounded-xl border border-border bg-card p-4 text-card-foreground shadow-sm sm:p-5">
                        <div className="mb-1 flex items-start justify-between gap-3">
                            <div>
                                <h3 className="font-semibold text-foreground">Cơ cấu giá trị xuất theo nhóm thuốc</h3>
                                <p className="mt-1 text-xs text-muted-foreground">Tính theo xuất x giá VAT</p>
                            </div>
                            <ChartColorShortcut chartId="dashboard.overview.inventoryValue" />
                        </div>
                        {renderFacilityMetricBarChart(
                            facilityExportBars,
                            "dashboard.overview.inventoryValue",
                            "export"
                        )}
                    </div>

                    <div className="rounded-xl border border-border bg-card p-4 text-card-foreground shadow-sm sm:p-5">
                        <div className="mb-1 flex items-start justify-between gap-3">
                            <div>
                                <h3 className="font-semibold text-foreground">Cơ cấu giá trị nhập theo nhóm thuốc</h3>
                                <p className="mt-1 text-xs text-muted-foreground">Tính theo nhập x giá VAT</p>
                            </div>
                            <ChartColorShortcut chartId="dashboard.overview.inventoryValue" />
                        </div>
                        {renderFacilityMetricBarChart(
                            facilityImportBars,
                            "dashboard.overview.inventoryValue",
                            "import"
                        )}
                    </div>
                </div>

                <div className="rounded-xl border border-border bg-card p-4 text-card-foreground shadow-sm sm:p-5">
                    <h3 className="mb-1 font-semibold text-foreground">Chi tiết tồn kho theo nhóm thuốc</h3>
                    <p className="mb-4 text-xs text-muted-foreground">Sắp xếp theo giá trị tồn kho giảm dần</p>
                    <div className="space-y-3 md:hidden">
                        {facilityInventoryBars.map((item, index) => {
                            const share = totalHeatmapValue > 0 ? item.value / totalHeatmapValue : 0;

                            return (
                                <div key={`${item.name}-${index}`} className="rounded-lg border border-border bg-muted/30 p-3">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="text-xs text-muted-foreground">#{index + 1}</p>
                                            <p className="mt-1 font-medium text-foreground">{item.name}</p>
                                        </div>
                                        <p className="shrink-0 text-right font-mono text-sm font-semibold text-foreground">
                                            {formatCurrency(item.value)}
                                        </p>
                                    </div>
                                    <div className="mt-3 flex items-center gap-2">
                                        <div className="h-3 flex-1 overflow-hidden rounded-full bg-muted">
                                            <div
                                                className="h-full rounded-full"
                                                style={{
                                                    width: `${share * 100}%`,
                                                    backgroundColor: getHeatmapShareColor(share),
                                                }}
                                            />
                                        </div>
                                        <span className="w-16 text-right text-xs text-muted-foreground">
                                            {formatPercent(share * 100)}%
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                        {facilityInventoryBars.length === 0 && (
                            <p className="py-8 text-center text-muted-foreground/70">Không có dữ liệu</p>
                        )}
                    </div>
                    <div className="hidden max-h-[400px] overflow-x-auto overflow-y-auto md:block">
                        <table className="w-full text-sm">
                            <thead className="sticky top-0">
                                <tr className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white">
                                    <th className="rounded-tl-lg p-3 text-left font-semibold">STT</th>
                                    <th className="p-3 text-left font-semibold">Nhóm thuốc</th>
                                    <th className="p-3 text-right font-semibold">Giá trị tồn kho</th>
                                    <th className="w-1/3 rounded-tr-lg p-3 text-left font-semibold">Tỷ trọng</th>
                                </tr>
                            </thead>
                            <tbody>
                                {facilityInventoryBars.map((item, index) => {
                                    const share = totalHeatmapValue > 0 ? item.value / totalHeatmapValue : 0;

                                    return (
                                        <tr key={`${item.name}-${index}`} className="border-b border-border transition-colors hover:bg-muted/40">
                                            <td className="p-3 text-muted-foreground">{index + 1}</td>
                                            <td className="p-3 font-medium text-foreground">{item.name}</td>
                                            <td className="p-3 text-right font-mono text-foreground">{formatCurrency(item.value)}</td>
                                            <td className="p-3">
                                                <div className="flex items-center gap-2">
                                                    <div className="h-3 flex-1 overflow-hidden rounded-full bg-muted">
                                                        <div
                                                            className="h-full rounded-full transition-all"
                                                            style={{
                                                                width: `${share * 100}%`,
                                                                backgroundColor: getHeatmapShareColor(share),
                                                            }}
                                                        />
                                                    </div>
                                                    <span className="w-16 text-right text-xs text-muted-foreground">
                                                        {formatPercent(share * 100)}%
                                                    </span>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                        {facilityInventoryBars.length === 0 && (
                            <p className="py-8 text-center text-muted-foreground/70">Không có dữ liệu</p>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4 sm:space-y-6">
            {/* KPI Scorecards */}
            <div className={`grid grid-cols-1 gap-4 ${showDomesticUsageLineCard ? "sm:grid-cols-2 lg:grid-cols-4" : "md:grid-cols-3"}`}>
                <div className="relative overflow-hidden rounded-xl border-0 shadow-lg bg-gradient-to-br from-indigo-500 to-purple-600 text-white p-4 sm:p-5">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-card/10 rounded-full -mr-8 -mt-8" />
                    <p className="text-sm font-medium opacity-90">Tổng giá trị tồn kho</p>
                    <p className="mt-1 text-xl font-bold sm:text-2xl">{formatCurrency(kpis.totalInventoryValue)}</p>
                    <p className="text-xs opacity-75 mt-1">{isFacilityDashboard ? "Đơn vị hiện tại" : "Toàn ngành"}</p>
                </div>
                <div className="relative overflow-hidden rounded-xl border-0 shadow-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white p-4 sm:p-5">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-card/10 rounded-full -mr-8 -mt-8" />
                    <p className="text-sm font-medium opacity-90">Tỷ lệ thuốc nội</p>
                    <p className="mt-1 text-xl font-bold sm:text-2xl">{kpis.domesticRatio}%</p>
                    <p className="text-xs opacity-75 mt-1">Theo giá trị xuất kho</p>
                </div>
                {showDomesticUsageLineCard && (
                    <div className="relative overflow-hidden rounded-xl border-0 shadow-lg bg-gradient-to-br from-emerald-500 to-lime-600 text-white p-4 sm:p-5">
                        <div className="absolute top-0 right-0 w-20 h-20 bg-card/10 rounded-full -mr-8 -mt-8" />
                        <p className="text-sm font-medium opacity-90">Tỷ lệ sử dụng thuốc Trong nước</p>
                        <p className="mt-1 text-xl font-bold sm:text-2xl">
                            {formatPercent(kpis.domesticUsageLineRatio ?? 0)}%
                        </p>
                        <p className="text-xs opacity-75 mt-1">Theo số dòng sử dụng đã phân loại</p>
                    </div>
                )}
                <div className="relative overflow-hidden rounded-xl border-0 shadow-lg bg-gradient-to-br from-blue-500 to-cyan-600 text-white p-4 sm:p-5">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-card/10 rounded-full -mr-8 -mt-8" />
                    <p className="text-sm font-medium opacity-90">Số mặt hàng quản lý</p>
                    <p className="mt-1 text-xl font-bold sm:text-2xl">{kpis.distinctDrugCount.toLocaleString()}</p>
                    <p className="text-xs opacity-75 mt-1">Mã thuốc phân biệt</p>
                </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-4 text-card-foreground shadow-sm sm:p-5">
                <div className="mb-1 flex items-start justify-between gap-3">
                    <h3 className="font-semibold text-foreground">
                        {isFacilityDashboard
                            ? "Giá trị xuất - nhập - tồn của đơn vị"
                            : "Giá trị xuất - nhập - tồn của tất cả đơn vị"}
                    </h3>
                    <div className="flex flex-col items-end gap-2 sm:flex-row sm:items-center">
                        {!isFacilityDashboard && (
                            <Select
                                value={facilityInventoryFilter}
                                onValueChange={(value) => setFacilityInventoryFilter(value as FacilityInventoryFilter)}
                            >
                                <SelectTrigger className="w-[220px] bg-background" size="sm">
                                    <SelectValue placeholder="Hiển thị" />
                                </SelectTrigger>
                                <SelectContent align="end">
                                    {FACILITY_INVENTORY_FILTER_OPTIONS.map((option) => (
                                        <SelectItem key={option.value} value={option.value}>
                                            {option.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                    </div>
                </div>
                <p className="mb-4 text-xs text-muted-foreground">
                    {isFacilityDashboard
                        ? "Mỗi nhóm cột thể hiện giá trị nhập, giá trị xuất và giá trị tồn của đơn vị"
                        : "Mỗi CSYT gồm 3 cột: giá trị nhập, giá trị xuất và giá trị tồn; bộ lọc dùng chung với biểu đồ tồn kho theo nhóm bên dưới"}
                </p>
                <div className="overflow-x-auto pb-2">
                    <div className="h-[360px] sm:h-[440px]" style={{ minWidth: facilityImportExportChartWidth }}>
                        {hasFacilityImportExportInventory ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    data={filteredFacilityImportExportInventory}
                                    margin={{ top: 10, right: 20, left: 10, bottom: 90 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
                                    <XAxis
                                        dataKey="facility"
                                        angle={-35}
                                        textAnchor="middle"
                                        height={110}
                                        tick={{ fontSize: 10, fill: chartTheme.axis }}
                                        interval={0}
                                        tickFormatter={(value: string) => truncateLabel(value, 22)}
                                    />
                                    <YAxis tick={{ fontSize: 11, fill: chartTheme.axis }} tickFormatter={formatCompact} width={78} />
                                    <Tooltip
                                        contentStyle={tooltipStyle}
                                        formatter={formatTooltipCurrency}
                                        labelFormatter={(label) => `CSYT: ${label}`}
                                    />
                                    <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8, color: chartTheme.axis }} />
                                    <Bar dataKey="importValue" name="Giá trị nhập" fill={importValueColor} radius={[3, 3, 0, 0]} />
                                    <Bar dataKey="exportValue" name="Giá trị xuất" fill={exportValueColor} radius={[3, 3, 0, 0]} />
                                    <Bar dataKey="inventoryValue" name="Giá trị tồn" fill={inventoryValueColor} radius={[3, 3, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex h-full items-center justify-center text-muted-foreground/70">Không có dữ liệu</div>
                        )}
                    </div>
                </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-4 text-card-foreground shadow-sm sm:p-5">
                <div className="mb-1 flex items-start justify-between gap-3">
                    <h3 className="font-semibold text-foreground">
                        {isFacilityDashboard
                            ? "Giá trị tồn kho của đơn vị theo nhóm thuốc"
                            : "Giá trị tồn kho tất cả đơn vị theo nhóm thuốc"}
                    </h3>
                    <div className="flex flex-col items-end gap-2 sm:flex-row sm:items-center">
                        <ChartColorShortcut chartId="dashboard.overview.inventoryValue" />
                    </div>
                </div>
                <p className="mb-4 text-xs text-muted-foreground">
                    {isFacilityDashboard
                        ? "Trục X là đơn vị hiện tại, trục Y là giá trị tồn kho, cột chia theo Hóa dược, Dược liệu, Sinh phẩm, Thuốc cổ truyền, Vắc xin và Khác"
                        : "Trục X là CSYT, trục Y là giá trị tồn kho, cột chia theo Hóa dược, Dược liệu, Sinh phẩm, Thuốc cổ truyền, Vắc xin và Khác"}
                </p>
                <div className="overflow-x-auto pb-2">
                    <div className="h-[360px] sm:h-[440px]" style={{ minWidth: facilityDrugGroupChartWidth }}>
                        {hasFacilityDrugGroupInventory ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    data={filteredInventoryByFacilityDrugGroup}
                                    margin={{ top: 10, right: 20, left: 10, bottom: 90 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
                                    <XAxis
                                        dataKey="facility"
                                        angle={-35}
                                        textAnchor="middle"
                                        height={110}
                                        tick={{ fontSize: 10, fill: chartTheme.axis }}
                                        interval={0}
                                        tickFormatter={(value: string) => truncateLabel(value, 22)}
                                    />
                                    <YAxis tick={{ fontSize: 11, fill: chartTheme.axis }} tickFormatter={formatCompact} width={78} />
                                    <Tooltip
                                        contentStyle={tooltipStyle}
                                        formatter={formatTooltipCurrency}
                                        labelFormatter={(label) => `CSYT: ${label}`}
                                    />
                                    <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8, color: chartTheme.axis }} />
                                    {inventoryDrugGroups.map((group, index) => (
                                        <Bar
                                            key={group}
                                            dataKey={group}
                                            stackId="inventory"
                                            fill={groupColorMap[group] || chartColors.resolveColor({ index })}
                                            radius={index === inventoryDrugGroups.length - 1 ? [3, 3, 0, 0] : [0, 0, 0, 0]}
                                        />
                                    ))}
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex h-full items-center justify-center text-muted-foreground/70">Không có dữ liệu</div>
                        )}
                    </div>
                </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
                {/* Stacked Bar Chart */}
                <div className="rounded-xl border border-border bg-card p-4 text-card-foreground shadow-sm sm:p-5">
                    <div className="mb-1 flex items-start justify-between gap-3">
                        <h3 className="font-semibold text-foreground">Top 10 CSYT tồn kho lớn nhất</h3>
                        <ChartColorShortcut chartId="dashboard.overview.inventoryValue" />
                    </div>
                    <p className="text-xs text-muted-foreground mb-4">Chia theo nhóm thuốc</p>
                    <div className="h-[300px] sm:h-[380px]">
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
                                        fill={groupColorMap[group] || chartColors.resolveColor({ index: i })}
                                        radius={i === drugGroups.length - 1 ? [3, 3, 0, 0] : [0, 0, 0, 0]}
                                    />
                                ))}
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Donut Chart */}
                <div className="rounded-xl border border-border bg-card p-4 text-card-foreground shadow-sm sm:p-5">
                    <div className="mb-1 flex items-start justify-between gap-3">
                        <h3 className="font-semibold text-foreground">BHYT vs. Dịch vụ</h3>
                        <ChartColorShortcut chartId="dashboard.overview.insuranceService" />
                    </div>
                    <p className="text-xs text-muted-foreground mb-4">Tỷ lệ giá trị sử dụng</p>
                    <div className="h-[300px] sm:h-[380px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={donutData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius="42%"
                                    outerRadius="68%"
                                    paddingAngle={3}
                                    dataKey="value"
                                    label={({ name, percent }: { name?: string; percent?: number }) =>
                                        `${name || ""}: ${((percent || 0) * 100).toFixed(1)}%`
                                    }
                                    labelLine={{ strokeWidth: 2 }}
                                >
                                    <Cell fill={chartColors.resolveColor({ chartId: "dashboard.overview.insuranceService", key: "insurance", semanticKey: "insurance" })} />
                                    <Cell fill={chartColors.resolveColor({ chartId: "dashboard.overview.insuranceService", key: "service", semanticKey: "service" })} />
                                </Pie>
                                <Tooltip contentStyle={tooltipStyle} formatter={formatTooltipCurrency} />
                                <Legend wrapperStyle={{ color: chartTheme.axis }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
                <div className="rounded-xl border border-border bg-card p-4 text-card-foreground shadow-sm sm:p-5">
                    <div className="mb-1 flex items-start justify-between gap-3">
                        <h3 className="font-semibold text-foreground">Top 10 cơ sở giá trị Xuất lớn nhất</h3>
                        <ChartColorShortcut chartId="dashboard.overview.inventoryValue" />
                    </div>
                    <p className="text-xs text-muted-foreground mb-4">Tính theo xuat × giaVat, chia theo nhóm thuốc</p>
                    <div className="h-[340px] sm:h-[420px]">
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
                                            fill={groupColorMap[group] || chartColors.resolveColor({ index })}
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

                <div className="rounded-xl border border-border bg-card p-4 text-card-foreground shadow-sm sm:p-5">
                    <div className="mb-1 flex items-start justify-between gap-3">
                        <h3 className="font-semibold text-foreground">Top 10 cơ sở giá trị Nhập lớn nhất</h3>
                        <ChartColorShortcut chartId="dashboard.overview.inventoryValue" />
                    </div>
                    <p className="text-xs text-muted-foreground mb-4">Tính theo nhap × giaVat, cơ cấu theo nhóm thuốc</p>
                    <div className="h-[320px] sm:h-[420px]">
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

            {shouldRenderInventoryMap && (
                <div className="rounded-xl border border-border bg-card p-4 text-card-foreground shadow-sm sm:p-5">
                    <div className="mb-1 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                            <h3 className="font-semibold text-foreground">Giá trị tồn kho theo địa chỉ</h3>
                            <p className="text-xs text-muted-foreground">
                                {selectedMapDrug
                                    ? `Đang lọc: ${formatMapDrugLabel(selectedMapDrug)}`
                                    : "Dựa trên tọa độ đã nhập trong hồ sơ CSYT"}
                            </p>
                        </div>
                        <div className="flex w-full flex-col gap-2 lg:w-[420px] lg:items-end">
                            <div className="text-xs text-muted-foreground">
                                {inventoryMapData.length.toLocaleString("vi-VN")} CSYT có tọa độ
                                {mapMissingCoordinateCount > 0 && `, ${mapMissingCoordinateCount.toLocaleString("vi-VN")} CSYT thiếu tọa độ`}
                            </div>
                            <div className="w-full">
                                <label htmlFor="map-drug-filter" className="sr-only">Lọc thuốc trên bản đồ</label>
                                <div className="relative">
                                    <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                                    <input
                                        id="map-drug-filter"
                                        type="search"
                                        value={mapDrugQuery}
                                        onChange={(event) => setMapDrugQuery(event.target.value)}
                                        onFocus={() => setIsMapDrugSearchFocused(true)}
                                        onBlur={() => window.setTimeout(() => setIsMapDrugSearchFocused(false), 120)}
                                        placeholder="Tìm thuốc cho bản đồ"
                                        className="h-9 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm text-foreground outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/25"
                                    />
                                    {showMapDrugSearchDropdown && (
                                        <div className="absolute right-0 z-30 mt-1 max-h-72 w-full overflow-y-auto rounded-lg border border-border bg-popover text-popover-foreground shadow-xl">
                                            {isMapDrugLoading ? (
                                                <div className="px-3 py-2 text-sm text-muted-foreground">Đang tìm...</div>
                                            ) : mapDrugOptions.length > 0 ? (
                                                mapDrugOptions.map((drug) => (
                                                    <button
                                                        key={drug.id}
                                                        type="button"
                                                        className="block w-full px-3 py-2 text-left text-sm transition-colors hover:bg-muted focus:bg-muted focus:outline-none"
                                                        onMouseDown={(event) => event.preventDefault()}
                                                        onClick={() => {
                                                            setSelectedMapDrug(drug);
                                                            setMapDrugQuery("");
                                                            setMapDrugOptions([]);
                                                            setIsMapDrugSearchFocused(false);
                                                        }}
                                                    >
                                                        <span className="block truncate font-medium text-foreground">
                                                            {formatMapDrugLabel(drug)}
                                                        </span>
                                                        <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                                                            {[drug.hoatChat, drug.soDangKy ? `SĐK: ${drug.soDangKy}` : null]
                                                                .filter(Boolean)
                                                                .join(" · ") || "Chưa có hoạt chất/SĐK"}
                                                        </span>
                                                    </button>
                                                ))
                                            ) : (
                                                <div className="px-3 py-2 text-sm text-muted-foreground">Không có kết quả</div>
                                            )}
                                        </div>
                                    )}
                                </div>
                                <div className="mt-2 flex min-h-7 items-center justify-end">
                                    {selectedMapDrug ? (
                                        <div className="flex max-w-full items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 dark:border-blue-900/70 dark:bg-blue-950/45 dark:text-blue-200">
                                            <span className="min-w-0 truncate">{formatMapDrugLabel(selectedMapDrug)}</span>
                                            <button
                                                type="button"
                                                aria-label="Bỏ lọc thuốc trên bản đồ"
                                                className="shrink-0 rounded-full p-0.5 transition-colors hover:bg-blue-100 dark:hover:bg-blue-900"
                                                onClick={() => {
                                                    setSelectedMapDrug(null);
                                                    setMapDrugQuery("");
                                                    setMapDrugOptions([]);
                                                }}
                                            >
                                                <X className="size-3.5" />
                                            </button>
                                        </div>
                                    ) : (
                                        <span className="text-xs text-muted-foreground">Tất cả thuốc</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="mt-4 h-[640px] overflow-hidden rounded-lg border border-border bg-muted/30 sm:h-[920px]">
                        {inventoryMapData.length > 0 ? (
                            <Map key={mapKey} center={mapCenter} zoom={10.2}>
                                {inventoryMapData.map((item) => {
                                    const markerSize = getInventoryMarkerSize(item.value, mapMaxValue);

                                    return (
                                        <MapMarker
                                            key={item.facilityId}
                                            longitude={item.longitude}
                                            latitude={item.latitude}
                                        >
                                            <MarkerContent>
                                                <div
                                                    className="rounded-full border-2 border-white shadow-lg ring-2 ring-white/50 transition-transform hover:scale-110"
                                                    style={{
                                                        width: markerSize,
                                                        height: markerSize,
                                                        backgroundColor: inventoryMapColor,
                                                        opacity: 0.86,
                                                    }}
                                                />
                                            </MarkerContent>
                                            <MarkerTooltip>{item.facilityName}</MarkerTooltip>
                                            <MarkerPopup className="w-72">
                                                <div className="space-y-2">
                                                    <div>
                                                        <p className="font-semibold leading-tight text-foreground">{item.facilityName}</p>
                                                        <p className="mt-1 text-xs text-muted-foreground">{item.address}</p>
                                                    </div>
                                                    <div className="rounded-md bg-muted px-3 py-2">
                                                        <p className="text-xs text-muted-foreground">Giá trị tồn kho</p>
                                                        <p className="font-mono text-sm font-semibold text-foreground">
                                                            {formatCurrency(item.value)}
                                                        </p>
                                                    </div>
                                                    <p className="font-mono text-[11px] text-muted-foreground">
                                                        {item.latitude.toFixed(5)}, {item.longitude.toFixed(5)}
                                                    </p>
                                                </div>
                                            </MarkerPopup>
                                        </MapMarker>
                                    );
                                })}
                                <MapControls />
                            </Map>
                        ) : (
                            <div className="flex h-full items-center justify-center px-4 text-center text-sm text-muted-foreground">
                                Chưa có CSYT nào có đủ tọa độ để hiển thị trên bản đồ
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Heatmap Table */}
            <div className="rounded-xl border border-border bg-card p-4 text-card-foreground shadow-sm sm:p-5">
                <h3 className="font-semibold text-foreground mb-1">Phân bố tồn kho theo địa bàn</h3>
                <p className="text-xs text-muted-foreground mb-4">Dựa trên địa chỉ cơ sở báo cáo</p>
                <div className="space-y-3 md:hidden">
                    {heatmapData.map((item: HeatmapDatum, i: number) => {
                        const share = totalHeatmapValue > 0 ? Number(item.value) / totalHeatmapValue : 0;

                        return (
                            <div key={`${item.address}-${i}`} className="rounded-lg border border-border bg-muted/30 p-3">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="text-xs text-muted-foreground">#{i + 1}</p>
                                        <p className="mt-1 font-medium text-foreground">{item.address}</p>
                                    </div>
                                    <p className="shrink-0 text-right font-mono text-sm font-semibold text-foreground">
                                        {formatCurrency(item.value)}
                                    </p>
                                </div>
                                <div className="mt-3 flex items-center gap-2">
                                    <div className="h-3 flex-1 overflow-hidden rounded-full bg-muted">
                                        <div
                                            className="h-full rounded-full"
                                            style={{
                                                width: `${share * 100}%`,
                                                backgroundColor: getHeatmapShareColor(share),
                                            }}
                                        />
                                    </div>
                                    <span className="w-16 text-right text-xs text-muted-foreground">
                                        {formatPercent(share * 100)}%
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                    {heatmapData.length === 0 && (
                        <p className="text-center text-muted-foreground/70 py-8">Không có dữ liệu</p>
                    )}
                </div>
                <div className="hidden overflow-x-auto max-h-[400px] overflow-y-auto md:block">
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
                                                            backgroundColor: getHeatmapShareColor(share),
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
