"use client";

import { useEffect, useMemo, useState } from "react";
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Legend,
    Line,
    LineChart,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import {
    Map,
    MapControls,
    MapMarker,
    MarkerContent,
    MarkerPopup,
    MarkerTooltip,
} from "@/components/ui/map";
import { normalizeDynamicChartKey } from "@/lib/chart-colors";
import { useChartColors } from "./ChartColorProvider";
import ChartColorShortcut from "./ChartColorShortcut";
import { useDashboardChartTheme } from "./chart-theme";

interface Tab5RareDrugsProps {
    reportMonth: string;
    facilityId: string;
    apiPrefix?: string;
}

interface Kpis {
    rareDrugCount: number;
    reportingFacilityCount: number;
    totalExportValue: number;
    totalInventoryValue: number;
    totalEndingQuantity: number;
}

interface FacilityExportDatum {
    facilityId: string;
    facilityName: string;
    address: string;
    exportValue: number;
    inventoryValue: number;
    endingQuantity: number;
}

interface DrugInventoryDatum {
    drugId: string;
    drugName: string;
    activeIngredient: string | null;
    unit: string | null;
    inventoryValue: number;
    exportValue: number;
    endingQuantity: number;
}

interface MonthlyTrendDatum {
    reportMonth: string;
    exportValue: number;
    inventoryValue: number;
}

interface InsuranceServiceDatum {
    name: string;
    value: number;
}

interface FacilityMapDatum {
    facilityId: string;
    facilityName: string;
    address: string;
    latitude: number;
    longitude: number;
    inventoryValue: number;
    exportValue: number;
}

interface RareDrugsData {
    kpis: Kpis;
    facilityExportData: FacilityExportDatum[];
    facilityHeatmapData: FacilityExportDatum[];
    drugInventoryData: DrugInventoryDatum[];
    monthlyTrend: MonthlyTrendDatum[];
    insuranceServiceData: InsuranceServiceDatum[];
    facilityMapData: FacilityMapDatum[];
    mapMissingCoordinateCount: number;
}

const DEFAULT_MAP_CENTER: [number, number] = [105.7469, 10.0452];

const formatCurrency = (value: number) =>
    new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: "VND",
        maximumFractionDigits: 0,
    }).format(value);

const formatCompact = (value: number) =>
    new Intl.NumberFormat("vi-VN", {
        notation: "compact",
        compactDisplay: "short",
        maximumFractionDigits: 1,
    }).format(value);

const formatNumber = (value: number) =>
    new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(value);

const formatPercent = (value: number) =>
    new Intl.NumberFormat("vi-VN", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    }).format(value);

const formatTooltipCurrency = (value: number | string | undefined): [string] => [
    formatCurrency(Number(value ?? 0)),
];

const truncateLabel = (value: string, maxLength = 30) =>
    value.length > maxLength ? `${value.slice(0, maxLength - 1)}…` : value;

function getMarkerSize(value: number, maxValue: number) {
    if (maxValue <= 0) {
        return 16;
    }

    return Math.round(14 + Math.sqrt(value / maxValue) * 28);
}

export default function Tab5RareDrugs({
    reportMonth,
    facilityId,
    apiPrefix = "/api/admin/dashboard",
}: Tab5RareDrugsProps) {
    const [data, setData] = useState<RareDrugsData | null>(null);
    const [loading, setLoading] = useState(true);
    const chartTheme = useDashboardChartTheme();
    const chartColors = useChartColors();

    const tooltipStyle = {
        backgroundColor: chartTheme.tooltipBackground,
        borderRadius: "10px",
        border: `1px solid ${chartTheme.tooltipBorder}`,
        color: chartTheme.tooltipText,
        boxShadow: "0 10px 25px -5px rgb(0 0 0 / 0.1)",
    };

    useEffect(() => {
        const controller = new AbortController();

        const fetchData = async () => {
            setLoading(true);
            try {
                const params = new URLSearchParams();
                if (reportMonth && reportMonth !== "all") params.set("reportMonth", reportMonth);
                if (facilityId) params.set("facilityId", facilityId);

                const response = await fetch(`${apiPrefix}/rare-drugs?${params}`, {
                    signal: controller.signal,
                });

                if (!response.ok) {
                    throw new Error(`Failed to load rare drugs dashboard: ${response.status}`);
                }

                const payload: RareDrugsData = await response.json();
                setData(payload);
            } catch (error) {
                if (error instanceof DOMException && error.name === "AbortError") {
                    return;
                }

                console.error("Rare drugs dashboard fetch error:", error);
                setData(null);
            } finally {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            }
        };

        fetchData();

        return () => controller.abort();
    }, [apiPrefix, facilityId, reportMonth]);

    const colors = useMemo(() => ({
        export: chartColors.resolveColor({
            chartId: "dashboard.rareDrugs.facilityExport",
            key: "exportValue",
            semanticKey: "export",
        }),
        inventory: chartColors.resolveColor({
            chartId: "dashboard.rareDrugs.drugInventory",
            key: "inventoryValue",
            semanticKey: "inventory",
        }),
        insurance: chartColors.resolveColor({
            chartId: "dashboard.rareDrugs.insuranceService",
            key: "insurance",
            semanticKey: "insurance",
        }),
        service: chartColors.resolveColor({
            chartId: "dashboard.rareDrugs.insuranceService",
            key: "service",
            semanticKey: "service",
        }),
    }), [chartColors]);

    if (loading) {
        return (
            <div className="flex h-96 items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-600" />
                    <p className="text-sm text-muted-foreground">Đang tải dữ liệu thuốc hiếm...</p>
                </div>
            </div>
        );
    }

    if (!data) {
        return <p className="py-8 text-center text-red-500">Không thể tải dữ liệu thuốc hiếm</p>;
    }

    const {
        kpis,
        facilityExportData = [],
        facilityHeatmapData = [],
        drugInventoryData = [],
        monthlyTrend = [],
        insuranceServiceData = [],
        facilityMapData = [],
        mapMissingCoordinateCount = 0,
    } = data;

    const facilityExportChartHeight = Math.max(360, facilityExportData.length * 34);
    const drugInventoryChartHeight = Math.max(360, drugInventoryData.length * 34);
    const mapMaxValue = facilityMapData.reduce((max, item) => Math.max(max, Number(item.inventoryValue || 0)), 0);
    const mapCenter: [number, number] = facilityMapData.length > 0
        ? [
            facilityMapData.reduce((sum, item) => sum + Number(item.longitude), 0) / facilityMapData.length,
            facilityMapData.reduce((sum, item) => sum + Number(item.latitude), 0) / facilityMapData.length,
        ]
        : DEFAULT_MAP_CENTER;
    const mapKey = `${mapCenter[0].toFixed(4)}-${mapCenter[1].toFixed(4)}-${facilityMapData.length}`;
    const totalHeatmapInventoryValue = facilityHeatmapData.reduce((sum, item) => sum + Number(item.inventoryValue || 0), 0);

    return (
        <div className="space-y-4 sm:space-y-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
                <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-rose-500 to-red-600 p-4 text-white shadow-lg sm:p-5">
                    <div className="absolute right-0 top-0 h-20 w-20 rounded-full bg-card/10 -mr-8 -mt-8" />
                    <p className="text-sm font-medium opacity-90">Số thuốc hiếm</p>
                    <p className="mt-1 text-xl font-bold sm:text-2xl">{formatNumber(kpis.rareDrugCount)}</p>
                    <p className="mt-1 text-xs opacity-75">Có phát sinh báo cáo</p>
                </div>
                <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 p-4 text-white shadow-lg sm:p-5">
                    <div className="absolute right-0 top-0 h-20 w-20 rounded-full bg-card/10 -mr-8 -mt-8" />
                    <p className="text-sm font-medium opacity-90">Đơn vị báo cáo</p>
                    <p className="mt-1 text-xl font-bold sm:text-2xl">{formatNumber(kpis.reportingFacilityCount)}</p>
                    <p className="mt-1 text-xs opacity-75">Có thuốc hiếm</p>
                </div>
                <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 p-4 text-white shadow-lg sm:p-5">
                    <div className="absolute right-0 top-0 h-20 w-20 rounded-full bg-card/10 -mr-8 -mt-8" />
                    <p className="text-sm font-medium opacity-90">Giá trị xuất kho</p>
                    <p className="mt-1 text-xl font-bold sm:text-2xl">{formatCurrency(kpis.totalExportValue)}</p>
                    <p className="mt-1 text-xs opacity-75">xuat × giaVat</p>
                </div>
                <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 p-4 text-white shadow-lg sm:p-5">
                    <div className="absolute right-0 top-0 h-20 w-20 rounded-full bg-card/10 -mr-8 -mt-8" />
                    <p className="text-sm font-medium opacity-90">Giá trị tồn kho</p>
                    <p className="mt-1 text-xl font-bold sm:text-2xl">{formatCurrency(kpis.totalInventoryValue)}</p>
                    <p className="mt-1 text-xs opacity-75">Thành tiền tồn cuối</p>
                </div>
                <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 p-4 text-white shadow-lg sm:p-5">
                    <div className="absolute right-0 top-0 h-20 w-20 rounded-full bg-card/10 -mr-8 -mt-8" />
                    <p className="text-sm font-medium opacity-90">Số lượng tồn</p>
                    <p className="mt-1 text-xl font-bold sm:text-2xl">{formatNumber(kpis.totalEndingQuantity)}</p>
                    <p className="mt-1 text-xs opacity-75">Tổng tồn cuối</p>
                </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-4 text-card-foreground shadow-sm sm:p-5">
                <div className="mb-1 flex items-start justify-between gap-3">
                    <div>
                        <h3 className="font-semibold text-foreground">Tất cả đơn vị theo giá trị xuất thuốc hiếm</h3>
                        <p className="text-xs text-muted-foreground">Tính theo xuat × giaVat, không giới hạn Top</p>
                    </div>
                    <ChartColorShortcut chartId="dashboard.rareDrugs.facilityExport" />
                </div>
                <div className="mt-4 max-h-[720px] overflow-y-auto overflow-x-auto pb-2">
                    <div className="min-w-[960px]" style={{ height: facilityExportChartHeight }}>
                        {facilityExportData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    data={facilityExportData}
                                    layout="vertical"
                                    margin={{ top: 10, right: 28, left: 20, bottom: 10 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
                                    <XAxis
                                        type="number"
                                        tick={{ fontSize: 11, fill: chartTheme.axis }}
                                        tickFormatter={formatCompact}
                                    />
                                    <YAxis
                                        type="category"
                                        dataKey="facilityName"
                                        width={190}
                                        interval={0}
                                        tick={{ fontSize: 11, fill: chartTheme.axis }}
                                        tickFormatter={(value: string) => truncateLabel(value, 28)}
                                    />
                                    <Tooltip
                                        contentStyle={tooltipStyle}
                                        formatter={formatTooltipCurrency}
                                        labelFormatter={(label) => `Đơn vị: ${label}`}
                                    />
                                    <Bar dataKey="exportValue" name="Giá trị xuất" fill={colors.export} radius={[0, 4, 4, 0]} />
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
                    <div>
                        <h3 className="font-semibold text-foreground">Tất cả thuốc hiếm theo giá trị tồn kho</h3>
                        <p className="text-xs text-muted-foreground">Tính theo thành tiền tồn cuối, không giới hạn Top</p>
                    </div>
                    <ChartColorShortcut chartId="dashboard.rareDrugs.drugInventory" />
                </div>
                <div className="mt-4 max-h-[720px] overflow-y-auto overflow-x-auto pb-2">
                    <div className="min-w-[1040px]" style={{ height: drugInventoryChartHeight }}>
                        {drugInventoryData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    data={drugInventoryData}
                                    layout="vertical"
                                    margin={{ top: 10, right: 28, left: 20, bottom: 10 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
                                    <XAxis
                                        type="number"
                                        tick={{ fontSize: 11, fill: chartTheme.axis }}
                                        tickFormatter={formatCompact}
                                    />
                                    <YAxis
                                        type="category"
                                        dataKey="drugName"
                                        width={250}
                                        interval={0}
                                        tick={{ fontSize: 11, fill: chartTheme.axis }}
                                        tickFormatter={(value: string) => truncateLabel(value, 36)}
                                    />
                                    <Tooltip
                                        contentStyle={tooltipStyle}
                                        formatter={formatTooltipCurrency}
                                        labelFormatter={(label) => `Thuốc: ${label}`}
                                    />
                                    <Bar dataKey="inventoryValue" name="Giá trị tồn kho" fill={colors.inventory} radius={[0, 4, 4, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex h-full items-center justify-center text-muted-foreground/70">Không có dữ liệu</div>
                        )}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
                <div className="rounded-xl border border-border bg-card p-4 text-card-foreground shadow-sm sm:p-5">
                    <h3 className="font-semibold text-foreground">Xu hướng theo tháng của giá trị xuất kho thuốc hiếm</h3>
                    <p className="mb-4 text-xs text-muted-foreground">So sánh giá trị xuất và tồn kho theo kỳ báo cáo</p>
                    <div className="h-[320px] sm:h-[380px]">
                        {monthlyTrend.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={monthlyTrend} margin={{ top: 10, right: 20, left: 10, bottom: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
                                    <XAxis dataKey="reportMonth" tick={{ fontSize: 11, fill: chartTheme.axis }} />
                                    <YAxis tick={{ fontSize: 11, fill: chartTheme.axis }} tickFormatter={formatCompact} width={78} />
                                    <Tooltip contentStyle={tooltipStyle} formatter={formatTooltipCurrency} />
                                    <Legend wrapperStyle={{ color: chartTheme.axis }} />
                                    <Line
                                        type="monotone"
                                        dataKey="exportValue"
                                        name="Giá trị xuất"
                                        stroke={colors.export}
                                        strokeWidth={3}
                                        dot={{ r: 3 }}
                                        activeDot={{ r: 5 }}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="inventoryValue"
                                        name="Giá trị tồn"
                                        stroke={colors.inventory}
                                        strokeWidth={2}
                                        dot={{ r: 3 }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex h-full items-center justify-center text-muted-foreground/70">Không có dữ liệu</div>
                        )}
                    </div>
                </div>

                <div className="rounded-xl border border-border bg-card p-4 text-card-foreground shadow-sm sm:p-5">
                    <div className="mb-1 flex items-start justify-between gap-3">
                        <div>
                            <h3 className="font-semibold text-foreground">Cơ cấu BHYT/Dịch vụ của thuốc hiếm</h3>
                            <p className="text-xs text-muted-foreground">Theo giá trị xuất kho</p>
                        </div>
                        <ChartColorShortcut chartId="dashboard.rareDrugs.insuranceService" />
                    </div>
                    <div className="h-[320px] sm:h-[380px]">
                        {insuranceServiceData.some((item) => item.value > 0) ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={insuranceServiceData}
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
                                        <Cell fill={colors.insurance} />
                                        <Cell fill={colors.service} />
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

            <div className="rounded-xl border border-border bg-card p-4 text-card-foreground shadow-sm sm:p-5">
                <div className="mb-1 flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                        <h3 className="font-semibold text-foreground">Bản đồ đơn vị có tồn kho thuốc hiếm</h3>
                        <p className="text-xs text-muted-foreground">Dựa trên tọa độ đã nhập trong hồ sơ CSYT</p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        {facilityMapData.length.toLocaleString("vi-VN")} CSYT có tọa độ
                        {mapMissingCoordinateCount > 0 && `, ${mapMissingCoordinateCount.toLocaleString("vi-VN")} CSYT thiếu tọa độ`}
                    </p>
                </div>
                <div className="mt-4 h-[320px] overflow-hidden rounded-lg border border-border bg-muted/30 sm:h-[460px]">
                    {facilityMapData.length > 0 ? (
                        <Map key={mapKey} center={mapCenter} zoom={10.2}>
                            {facilityMapData.map((item) => {
                                const markerSize = getMarkerSize(item.inventoryValue, mapMaxValue);

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
                                                    backgroundColor: colors.inventory,
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
                                                    <p className="text-xs text-muted-foreground">Giá trị tồn kho thuốc hiếm</p>
                                                    <p className="font-mono text-sm font-semibold text-foreground">
                                                        {formatCurrency(item.inventoryValue)}
                                                    </p>
                                                </div>
                                                <div className="rounded-md bg-muted px-3 py-2">
                                                    <p className="text-xs text-muted-foreground">Giá trị xuất kho thuốc hiếm</p>
                                                    <p className="font-mono text-sm font-semibold text-foreground">
                                                        {formatCurrency(item.exportValue)}
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

            <div className="rounded-xl border border-border bg-card p-4 text-card-foreground shadow-sm sm:p-5">
                <h3 className="mb-1 font-semibold text-foreground">Heatmap đơn vị có tồn kho thuốc hiếm</h3>
                <p className="mb-4 text-xs text-muted-foreground">Tỷ trọng theo giá trị tồn kho thuốc hiếm của từng đơn vị</p>
                <div className="space-y-3 md:hidden">
                    {facilityHeatmapData.map((item) => {
                        const share = totalHeatmapInventoryValue > 0 ? item.inventoryValue / totalHeatmapInventoryValue : 0;
                        const color = chartColors.resolveColor({
                            chartId: "dashboard.rareDrugs.facilityHeatmap",
                            key: normalizeDynamicChartKey(item.facilityName),
                            index: Math.round(share * 100),
                            semanticKey: share >= 0.1 ? "inventory" : "service",
                        });

                        return (
                            <div key={item.facilityId} className="rounded-lg border border-border bg-muted/30 p-3">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="truncate font-medium text-foreground">{item.facilityName}</p>
                                        <p className="mt-1 truncate text-xs text-muted-foreground">{item.address}</p>
                                    </div>
                                    <p className="shrink-0 text-right font-mono text-sm font-semibold text-foreground">
                                        {formatCurrency(item.inventoryValue)}
                                    </p>
                                </div>
                                <div className="mt-3 flex items-center gap-2">
                                    <div className="h-3 flex-1 overflow-hidden rounded-full bg-muted">
                                        <div
                                            className="h-full rounded-full"
                                            style={{
                                                width: `${share * 100}%`,
                                                backgroundColor: color,
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
                    {facilityHeatmapData.length === 0 && (
                        <p className="py-8 text-center text-muted-foreground/70">Không có dữ liệu</p>
                    )}
                </div>
                <div className="hidden max-h-[460px] overflow-y-auto overflow-x-auto md:block">
                    <table className="w-full text-sm">
                        <thead className="sticky top-0">
                            <tr className="bg-gradient-to-r from-rose-600 to-emerald-600 text-white">
                                <th className="rounded-tl-lg p-3 text-left font-semibold">STT</th>
                                <th className="p-3 text-left font-semibold">Đơn vị</th>
                                <th className="p-3 text-left font-semibold">Địa chỉ</th>
                                <th className="p-3 text-right font-semibold">Giá trị tồn kho</th>
                                <th className="w-1/4 rounded-tr-lg p-3 text-left font-semibold">Tỷ trọng</th>
                            </tr>
                        </thead>
                        <tbody>
                            {facilityHeatmapData.map((item, index) => {
                                const share = totalHeatmapInventoryValue > 0 ? item.inventoryValue / totalHeatmapInventoryValue : 0;
                                const color = chartColors.resolveColor({
                                    chartId: "dashboard.rareDrugs.facilityHeatmap",
                                    key: normalizeDynamicChartKey(item.facilityName),
                                    index,
                                    semanticKey: share >= 0.1 ? "inventory" : "service",
                                });

                                return (
                                    <tr key={item.facilityId} className="border-b border-border transition-colors hover:bg-muted/40">
                                        <td className="p-3 text-muted-foreground">{index + 1}</td>
                                        <td className="p-3 font-medium text-foreground">{item.facilityName}</td>
                                        <td className="p-3 text-muted-foreground">{item.address}</td>
                                        <td className="p-3 text-right font-mono text-foreground">{formatCurrency(item.inventoryValue)}</td>
                                        <td className="p-3">
                                            <div className="flex items-center gap-2">
                                                <div className="h-3 flex-1 overflow-hidden rounded-full bg-muted">
                                                    <div
                                                        className="h-full rounded-full transition-all"
                                                        style={{
                                                            width: `${share * 100}%`,
                                                            backgroundColor: color,
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
                    {facilityHeatmapData.length === 0 && (
                        <p className="py-8 text-center text-muted-foreground/70">Không có dữ liệu</p>
                    )}
                </div>
            </div>
        </div>
    );
}
