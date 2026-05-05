"use client";

import { useEffect, useState } from "react";
import {
    CartesianGrid,
    Cell,
    ReferenceLine,
    ResponsiveContainer,
    Scatter,
    ScatterChart,
    Tooltip,
    XAxis,
    YAxis,
    ZAxis,
} from "recharts";
import type {
    DeadStockRow,
    DemandWindow,
    ScatterPoint,
    ScatterSeverity,
    StockoutActualRow,
    StockoutForecastRow,
    SupplyDashboardData,
    SupplySeverity,
    SupplyTransferData,
} from "@/lib/dashboard/supply-risk";
import type { SupplyInsightsData, SupplyScope } from "@/lib/dashboard/supply-insights";
import SupplySummaryCards from "@/components/dashboard/supply/SupplySummaryCards";
import SupplyValueSections from "@/components/dashboard/supply/SupplyValueSections";
import SupplyContractSections from "@/components/dashboard/supply/SupplyContractSections";
import SupplyCoverageSection from "@/components/dashboard/supply/SupplyCoverageSection";
import { useDashboardChartTheme } from "./chart-theme";

interface Tab2Props {
    reportMonth: string;
    facilityId: string;
    apiPrefix?: string;
    scope: SupplyScope;
}

interface SupplyResponse extends SupplyDashboardData, SupplyInsightsData {
    hoatChatList: string[];
}

const DEMAND_WINDOW_OPTIONS: Array<{ value: DemandWindow; label: string }> = [
    { value: 1, label: "1 kỳ gần nhất" },
    { value: 3, label: "TB 3 kỳ" },
    { value: 6, label: "TB 6 kỳ" },
];

const SEVERITY_META: Record<SupplySeverity, { label: string; className: string }> = {
    danger: {
        label: "Đỏ",
        className: "border border-red-200 bg-red-100 text-red-700 dark:border-red-900/70 dark:bg-red-950/40 dark:text-red-200",
    },
    warning: {
        label: "Cam",
        className: "border border-amber-200 bg-amber-100 text-amber-700 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-200",
    },
    watch: {
        label: "Vàng",
        className: "border border-yellow-200 bg-yellow-100 text-yellow-700 dark:border-yellow-900/70 dark:bg-yellow-950/40 dark:text-yellow-200",
    },
};

const SCATTER_SEVERITY_META: Record<ScatterSeverity, { label: string; color: string }> = {
    danger: { label: "Dưới 1 tháng", color: "#dc2626" },
    warning: { label: "1 đến < 2 tháng", color: "#f59e0b" },
    watch: { label: "2 đến < 3 tháng", color: "#eab308" },
    safe: { label: "Từ 3 tháng", color: "#10b981" },
};

const formatCompact = (value: number) =>
    new Intl.NumberFormat("vi-VN", { notation: "compact", compactDisplay: "short" }).format(value);

const formatNumber = (value: number) =>
    new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 2 }).format(value);

function getDemandWindowLabel(demandWindow: DemandWindow) {
    if (demandWindow === 1) {
        return "1 kỳ gần nhất";
    }
    if (demandWindow === 6) {
        return "Trung bình 6 kỳ gần nhất";
    }

    return "Trung bình 3 kỳ gần nhất";
}

function buildSupplyQueryString({
    reportMonth,
    facilityId,
    demandWindow,
    hoatChat,
}: {
    reportMonth: string;
    facilityId: string;
    demandWindow: DemandWindow;
    hoatChat?: string;
}) {
    const params = new URLSearchParams();
    if (reportMonth && reportMonth !== "all") {
        params.set("reportMonth", reportMonth);
    }
    if (facilityId) {
        params.set("facilityId", facilityId);
    }
    params.set("demandWindow", String(demandWindow));
    if (hoatChat?.trim()) {
        params.set("hoatChat", hoatChat.trim());
    }

    return params.toString();
}

function StockoutActualTable({ rows }: { rows: StockoutActualRow[] }) {
    return (
        <div className="overflow-x-auto max-h-[350px] overflow-y-auto">
            <table className="w-full text-sm">
                <thead className="sticky top-0">
                    <tr className="bg-gradient-to-r from-red-600 to-rose-600 text-white">
                        <th className="text-left p-3 font-semibold rounded-tl-lg">STT</th>
                        <th className="text-left p-3 font-semibold">Cơ sở</th>
                        <th className="text-left p-3 font-semibold">Tên thuốc</th>
                        <th className="text-left p-3 font-semibold">Hoạt chất</th>
                        <th className="text-right p-3 font-semibold">Xuất kỳ này</th>
                        <th className="text-right p-3 font-semibold rounded-tr-lg">Nhu cầu BQ</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((item, index) => (
                        <tr
                            key={`${item.facility}-${item.drugName}-${index}`}
                            className="border-b border-border hover:bg-red-50/50 dark:hover:bg-red-950/20 transition-colors"
                        >
                            <td className="p-3 text-muted-foreground">{index + 1}</td>
                            <td className="p-3 text-foreground">{item.facility}</td>
                            <td className="p-3">
                                <p className="font-medium text-foreground">{item.drugName}</p>
                                {item.hamLuong && <p className="text-xs text-muted-foreground">{item.hamLuong}</p>}
                            </td>
                            <td className="p-3 text-muted-foreground">{item.hoatChat}</td>
                            <td className="p-3 text-right font-mono text-red-600 font-semibold">{formatNumber(item.currentXuat)}</td>
                            <td className="p-3 text-right font-mono text-foreground">{formatNumber(item.demandAvg)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
            {rows.length === 0 && (
                <p className="text-center text-muted-foreground/70 py-8">Không có thuốc hết hàng cuối kỳ trong bộ lọc hiện tại</p>
            )}
        </div>
    );
}

function StockoutForecastTable({ rows }: { rows: StockoutForecastRow[] }) {
    return (
        <div className="overflow-x-auto max-h-[350px] overflow-y-auto">
            <table className="w-full text-sm">
                <thead className="sticky top-0">
                    <tr className="bg-gradient-to-r from-amber-500 to-orange-500 text-white">
                        <th className="text-left p-3 font-semibold rounded-tl-lg">STT</th>
                        <th className="text-left p-3 font-semibold">Cơ sở</th>
                        <th className="text-left p-3 font-semibold">Tên thuốc</th>
                        <th className="text-left p-3 font-semibold">Hoạt chất</th>
                        <th className="text-right p-3 font-semibold">Tồn cuối</th>
                        <th className="text-right p-3 font-semibold">Nhu cầu BQ</th>
                        <th className="text-right p-3 font-semibold">Số tháng đủ dùng</th>
                        <th className="text-center p-3 font-semibold rounded-tr-lg">Mức độ</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((item, index) => (
                        <tr
                            key={`${item.facility}-${item.drugName}-${index}`}
                            className="border-b border-border hover:bg-amber-50/40 dark:hover:bg-amber-950/20 transition-colors"
                        >
                            <td className="p-3 text-muted-foreground">{index + 1}</td>
                            <td className="p-3 text-foreground">{item.facility}</td>
                            <td className="p-3">
                                <p className="font-medium text-foreground">{item.drugName}</p>
                                {item.hamLuong && <p className="text-xs text-muted-foreground">{item.hamLuong}</p>}
                            </td>
                            <td className="p-3 text-muted-foreground">{item.hoatChat}</td>
                            <td className="p-3 text-right font-mono text-foreground">{formatNumber(item.currentTonCuoi)}</td>
                            <td className="p-3 text-right font-mono text-foreground">{formatNumber(item.demandAvg)}</td>
                            <td className="p-3 text-right font-mono font-semibold text-amber-700">{formatNumber(item.monthsOfCover)}</td>
                            <td className="p-3 text-center">
                                <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${SEVERITY_META[item.severity].className}`}>
                                    {SEVERITY_META[item.severity].label}
                                </span>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            {rows.length === 0 && (
                <p className="text-center text-muted-foreground/70 py-8">Không có thuốc nào có độ phủ tồn kho dưới 3 tháng</p>
            )}
        </div>
    );
}

function DeadStockTable({ rows }: { rows: DeadStockRow[] }) {
    return (
        <div className="overflow-x-auto max-h-60 overflow-y-auto">
            <table className="w-full text-xs">
                <thead className="sticky top-0">
                    <tr className="bg-slate-700 text-white dark:bg-muted dark:text-foreground">
                        <th className="text-left p-2 font-semibold rounded-tl-lg">STT</th>
                        <th className="text-left p-2 font-semibold">Cơ sở</th>
                        <th className="text-left p-2 font-semibold">Tên thuốc</th>
                        <th className="text-left p-2 font-semibold">Hoạt chất</th>
                        <th className="text-right p-2 font-semibold rounded-tr-lg">Tồn cuối</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((item, index) => (
                        <tr key={`${item.facility}-${item.drugName}-${index}`} className="border-b border-border hover:bg-muted/40">
                            <td className="p-2 text-muted-foreground">{index + 1}</td>
                            <td className="p-2 text-foreground">{item.facility}</td>
                            <td className="p-2">
                                <p className="font-medium text-foreground">{item.drugName}</p>
                                {item.hamLuong && <p className="text-[11px] text-muted-foreground">{item.hamLuong}</p>}
                            </td>
                            <td className="p-2 text-muted-foreground">{item.hoatChat}</td>
                            <td className="p-2 text-right font-mono text-foreground font-semibold">{formatNumber(item.tonCuoi)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
            {rows.length === 0 && (
                <p className="text-center text-muted-foreground/70 py-6">Không có thuốc tồn kho không phát sinh nhu cầu trong cửa sổ đang chọn</p>
            )}
        </div>
    );
}

export default function Tab2Supply({
    reportMonth,
    facilityId,
    apiPrefix = "/api/admin/dashboard",
    scope,
}: Tab2Props) {
    const [data, setData] = useState<SupplyResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedHoatChat, setSelectedHoatChat] = useState("");
    const [transferData, setTransferData] = useState<SupplyTransferData | null>(null);
    const [transferLoading, setTransferLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [demandWindow, setDemandWindow] = useState<DemandWindow>(3);
    const chartTheme = useDashboardChartTheme();

    useEffect(() => {
        let isCancelled = false;

        const fetchData = async () => {
            setLoading(true);
            try {
                const queryString = buildSupplyQueryString({ reportMonth, facilityId, demandWindow });
                const response = await fetch(`${apiPrefix}/supply?${queryString}`, { cache: "no-store" });
                if (!response.ok) {
                    throw new Error(`Failed to load supply dashboard: ${response.status}`);
                }

                const json = await response.json() as SupplyResponse;
                if (!isCancelled) {
                    setData(json);
                }
            } catch (error) {
                console.error(error);
                if (!isCancelled) {
                    setData(null);
                }
            } finally {
                if (!isCancelled) {
                    setLoading(false);
                }
            }
        };

        void fetchData();

        return () => {
            isCancelled = true;
        };
    }, [reportMonth, facilityId, apiPrefix, demandWindow]);

    useEffect(() => {
        if (!selectedHoatChat) {
            setTransferData(null);
            setTransferLoading(false);
            return;
        }

        let isCancelled = false;

        const fetchTransferData = async () => {
            setTransferLoading(true);
            try {
                const queryString = buildSupplyQueryString({
                    reportMonth,
                    facilityId,
                    demandWindow,
                    hoatChat: selectedHoatChat,
                });
                const response = await fetch(`${apiPrefix}/supply?${queryString}`, { cache: "no-store" });
                if (!response.ok) {
                    throw new Error(`Failed to load transfer suggestion: ${response.status}`);
                }

                const json = await response.json() as SupplyResponse;
                if (!isCancelled) {
                    setTransferData(json.transferData);
                }
            } catch (error) {
                console.error(error);
                if (!isCancelled) {
                    setTransferData(null);
                }
            } finally {
                if (!isCancelled) {
                    setTransferLoading(false);
                }
            }
        };

        void fetchTransferData();

        return () => {
            isCancelled = true;
        };
    }, [selectedHoatChat, reportMonth, facilityId, apiPrefix, demandWindow]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-10 h-10 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
                    <p className="text-sm text-muted-foreground">Đang tải dữ liệu...</p>
                </div>
            </div>
        );
    }

    if (!data) {
        return <p className="text-center text-red-500 py-8">Không thể tải dữ liệu</p>;
    }

    const filteredHoatChatList = data.hoatChatList
        ?.filter(hoatChat => hoatChat.toLowerCase().includes(searchTerm.toLowerCase()))
        ?.slice(0, 30) || [];
    const effectiveReportMonth = data.effectiveReportMonth || (reportMonth !== "all" ? reportMonth : null);
    const demandWindowLabel = getDemandWindowLabel(data.demandWindow);

    return (
        <div className="space-y-6">
            <div className="rounded-xl border border-border bg-card p-5 text-card-foreground shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <h3 className="font-semibold text-foreground">Thiết lập cảnh báo cung ứng</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                            {effectiveReportMonth
                                ? `Đang tính theo kỳ ${effectiveReportMonth}, chuẩn nhu cầu: ${demandWindowLabel}`
                                : "Không có dữ liệu kỳ báo cáo trong bộ lọc hiện tại"}
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {DEMAND_WINDOW_OPTIONS.map(option => (
                            <button
                                key={option.value}
                                type="button"
                                onClick={() => setDemandWindow(option.value)}
                                className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                                    demandWindow === option.value
                                        ? "bg-indigo-600 text-white shadow-md"
                                        : "bg-muted text-muted-foreground hover:bg-muted"
                                }`}
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <SupplySummaryCards metrics={data.summaryMetrics} />

            <div className="rounded-xl border border-border bg-card p-5 text-card-foreground shadow-sm">
                <div className="flex items-center gap-2 mb-1">
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-200 text-lg">!</span>
                    <h3 className="font-semibold text-foreground">Đã hết hàng cuối kỳ</h3>
                </div>
                <p className="text-xs text-muted-foreground mb-4 ml-9">
                    Thuốc đã tồn cuối = 0 ở kỳ đang xem và vẫn còn nhu cầu sử dụng theo chuẩn nhu cầu đã chọn
                </p>
                <StockoutActualTable rows={data.stockoutActual} />
            </div>

            <div className="rounded-xl border border-border bg-card p-5 text-card-foreground shadow-sm">
                <div className="flex items-center gap-2 mb-1">
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-amber-100 text-amber-600 dark:bg-amber-950/40 dark:text-amber-200 text-lg">!</span>
                    <h3 className="font-semibold text-foreground">Nguy cơ đứt gãy</h3>
                </div>
                <p className="text-xs text-muted-foreground mb-4 ml-9">
                    Thuốc vẫn còn tồn kho nhưng độ phủ dưới 3 tháng. Mức độ báo động: đỏ &lt; 1 tháng, cam 1 đến &lt; 2 tháng, vàng 2 đến &lt; 3 tháng
                </p>
                <StockoutForecastTable rows={data.stockoutForecast} />
            </div>

            <div className="rounded-xl border border-border bg-card p-5 text-card-foreground shadow-sm">
                <h3 className="font-semibold text-foreground mb-1">Ma trận Nhu cầu/Độ phủ tồn kho</h3>
                <p className="text-xs text-muted-foreground mb-4">
                    Snapshot kỳ {effectiveReportMonth || "N/A"}. Trục X là nhu cầu bình quân theo cửa sổ đã chọn, trục Y là số tháng đủ dùng.
                </p>
                <div className="flex flex-wrap gap-2 text-xs mb-4">
                    {Object.entries(SCATTER_SEVERITY_META).map(([severity, meta]) => (
                        <span
                            key={severity}
                            className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-muted-foreground"
                        >
                            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: meta.color }} />
                            {meta.label}
                        </span>
                    ))}
                </div>
                <div className="h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <ScatterChart margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
                            <XAxis
                                type="number"
                                dataKey="demandAvg"
                                name="Nhu cầu bình quân"
                                tick={{ fontSize: 11, fill: chartTheme.axis }}
                                tickFormatter={formatCompact}
                                label={{ value: "Nhu cầu bình quân / kỳ", position: "bottom", offset: 0, style: { fontSize: 12, fill: chartTheme.mutedText } }}
                            />
                            <YAxis
                                type="number"
                                dataKey="monthsOfCover"
                                name="Số tháng đủ dùng"
                                tick={{ fontSize: 11, fill: chartTheme.axis }}
                                tickFormatter={formatNumber}
                                label={{ value: "Số tháng đủ dùng", angle: -90, position: "insideLeft", style: { fontSize: 12, fill: chartTheme.mutedText } }}
                            />
                            <ZAxis range={[30, 60]} />
                            <ReferenceLine y={1} stroke="#dc2626" strokeDasharray="4 4" label={{ value: "1 tháng", fill: "#dc2626", fontSize: 11 }} />
                            <ReferenceLine y={3} stroke="#10b981" strokeDasharray="4 4" label={{ value: "3 tháng", fill: "#10b981", fontSize: 11 }} />
                            <Tooltip
                                cursor={{ strokeDasharray: "3 3" }}
                                contentStyle={{
                                    backgroundColor: chartTheme.tooltipBackground,
                                    borderRadius: "10px",
                                    border: `1px solid ${chartTheme.tooltipBorder}`,
                                    color: chartTheme.tooltipText,
                                    boxShadow: "0 10px 25px -5px rgb(0 0 0 / 0.1)",
                                }}
                                content={({ payload }) => {
                                    const point = payload?.[0]?.payload as ScatterPoint | undefined;
                                    if (!point) {
                                        return null;
                                    }

                                    return (
                                        <div className="bg-card rounded-lg border border-border p-3 shadow-xl text-sm">
                                            <p className="font-semibold text-foreground">{point.drugName}</p>
                                            <p className="text-muted-foreground">{point.facility}</p>
                                            <p className="text-muted-foreground">{point.hoatChat}</p>
                                            {point.hamLuong && <p className="text-muted-foreground/70">{point.hamLuong}</p>}
                                            <p className="text-blue-600">Nhu cầu BQ: {formatNumber(point.demandAvg)}</p>
                                            <p className="text-emerald-600">Tồn cuối: {formatNumber(point.tonCuoi)}</p>
                                            <p className="text-amber-600">Xuất kỳ này: {formatNumber(point.currentXuat)}</p>
                                            <p className="text-rose-600">Độ phủ: {formatNumber(point.monthsOfCover)} tháng</p>
                                        </div>
                                    );
                                }}
                            />
                            <Scatter data={data.scatterData} fillOpacity={0.85}>
                                {data.scatterData.map((point, index) => (
                                    <Cell key={`${point.facility}-${point.drugName}-${index}`} fill={SCATTER_SEVERITY_META[point.severity].color} />
                                ))}
                            </Scatter>
                        </ScatterChart>
                    </ResponsiveContainer>
                </div>
                {data.scatterData.length === 0 && (
                    <p className="text-center text-muted-foreground/70 py-6">Không có thuốc nào phát sinh nhu cầu để hiển thị trên ma trận</p>
                )}

                <div className="mt-5 rounded-xl border border-border bg-muted/40 p-4">
                    <div className="flex items-center justify-between gap-3 mb-3">
                        <div>
                            <h4 className="font-semibold text-foreground">Tồn kho không có nhu cầu</h4>
                            <p className="text-xs text-muted-foreground">
                                Các thuốc còn tồn nhưng không có lịch sử xuất trong cửa sổ nhu cầu đã chọn. Nhóm này được tách khỏi scatter để tránh làm sai diễn giải biểu đồ.
                            </p>
                        </div>
                        <span className="inline-flex items-center rounded-full bg-muted px-3 py-1 text-xs font-semibold text-foreground">
                            {data.deadStockData.length} thuốc
                        </span>
                    </div>
                    <DeadStockTable rows={data.deadStockData} />
                </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-5 text-card-foreground shadow-sm">
                <h3 className="font-semibold text-foreground mb-1">Gợi ý điều chuyển thuốc</h3>
                <p className="text-xs text-muted-foreground mb-4">
                    Chọn hoạt chất để xem CSYT thừa hoặc thiếu theo kỳ {effectiveReportMonth || "N/A"} và chuẩn nhu cầu {demandWindowLabel.toLowerCase()}
                </p>
                <div className="flex flex-col gap-3 md:flex-row md:items-start mb-4">
                    <div className="flex-1 max-w-md relative">
                        <input
                            type="text"
                            placeholder="Tìm hoạt chất..."
                            value={searchTerm}
                            onChange={(event) => {
                                const nextValue = event.target.value;
                                setSearchTerm(nextValue);
                                if (selectedHoatChat && nextValue.trim() !== selectedHoatChat) {
                                    setSelectedHoatChat("");
                                }
                            }}
                            className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                        />
                        {searchTerm && filteredHoatChatList.length > 0 && (
                            <div className="absolute z-10 top-full left-0 right-0 bg-card border border-border rounded-lg shadow-xl mt-1 max-h-48 overflow-y-auto">
                                {filteredHoatChatList.map((hoatChat, index) => (
                                    <button
                                        key={`${hoatChat}-${index}`}
                                        type="button"
                                        className="w-full px-4 py-2 text-left text-sm text-foreground transition-colors hover:bg-indigo-50 dark:hover:bg-indigo-950/25"
                                        onClick={() => {
                                            setSelectedHoatChat(hoatChat);
                                            setSearchTerm(hoatChat);
                                        }}
                                    >
                                        {hoatChat}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={() => {
                            const nextHoatChat = searchTerm.trim();
                            if (nextHoatChat) {
                                setSelectedHoatChat(nextHoatChat);
                            }
                        }}
                        disabled={!searchTerm.trim() || transferLoading}
                        className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {transferLoading ? "Đang tải..." : "Phân tích"}
                    </button>
                </div>

                {selectedHoatChat && (
                    <p className="text-xs text-muted-foreground mb-4">
                        Đang phân tích hoạt chất: <span className="font-semibold text-foreground">{selectedHoatChat}</span>
                    </p>
                )}

                {!selectedHoatChat && (
                    <p className="text-center text-muted-foreground/70 py-6 text-sm">Nhập hoặc chọn một hoạt chất để hiện gợi ý điều chuyển</p>
                )}

                {selectedHoatChat && transferData && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="overflow-hidden rounded-lg border border-emerald-200 dark:border-emerald-900/70">
                            <div className="border-b border-emerald-200 bg-emerald-50 px-4 py-2 dark:border-emerald-900/70 dark:bg-emerald-950/35">
                                <h4 className="flex items-center gap-2 text-sm font-semibold text-emerald-800 dark:text-emerald-200">
                                    <span className="text-emerald-500 dark:text-emerald-300">+</span> CSYT đang THỪA
                                    <span className="text-xs font-normal text-emerald-600 dark:text-emerald-300">(Độ phủ &gt; 3 tháng)</span>
                                </h4>
                            </div>
                            <div className="max-h-60 overflow-y-auto">
                                <table className="w-full text-xs">
                                    <thead>
                                        <tr className="bg-emerald-50/50 dark:bg-emerald-950/20">
                                            <th className="text-left p-2">Cơ sở</th>
                                            <th className="text-right p-2">Tồn cuối</th>
                                            <th className="text-right p-2">Nhu cầu BQ</th>
                                            <th className="text-right p-2">Tháng đủ dùng</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {transferData.surplus.map((item, index) => (
                                            <tr key={`${item.facility}-${index}`} className="border-t border-border">
                                                <td className="p-2">{item.facility}</td>
                                                <td className="p-2 text-right font-mono">{formatNumber(item.tonCuoi)}</td>
                                                <td className="p-2 text-right font-mono">{formatNumber(item.demandAvg)}</td>
                                                <td className="p-2 text-right font-mono font-semibold text-emerald-600 dark:text-emerald-300">{formatNumber(item.monthsOfCover)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {transferData.surplus.length === 0 && (
                                    <p className="text-center text-muted-foreground/70 py-4 text-xs">Không có CSYT nào dư tồn trên 3 tháng</p>
                                )}
                            </div>
                        </div>

                        <div className="overflow-hidden rounded-lg border border-red-200 dark:border-red-900/70">
                            <div className="border-b border-red-200 bg-red-50 px-4 py-2 dark:border-red-900/70 dark:bg-red-950/35">
                                <h4 className="flex items-center gap-2 text-sm font-semibold text-red-800 dark:text-red-200">
                                    <span className="text-red-500 dark:text-red-300">-</span> CSYT đang THIẾU
                                    <span className="text-xs font-normal text-red-600 dark:text-red-300">(Tồn cuối = 0 và vẫn có nhu cầu)</span>
                                </h4>
                            </div>
                            <div className="max-h-60 overflow-y-auto">
                                <table className="w-full text-xs">
                                    <thead>
                                        <tr className="bg-red-50/50 dark:bg-red-950/20">
                                            <th className="text-left p-2">Cơ sở</th>
                                            <th className="text-right p-2">Tồn cuối</th>
                                            <th className="text-right p-2">Nhu cầu BQ</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {transferData.shortage.map((item, index) => (
                                            <tr key={`${item.facility}-${index}`} className="border-t border-border">
                                                <td className="p-2">{item.facility}</td>
                                                <td className="p-2 text-right font-mono text-red-600 dark:text-red-300">0</td>
                                                <td className="p-2 text-right font-mono">{formatNumber(item.demandAvg)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {transferData.shortage.length === 0 && (
                                    <p className="text-center text-muted-foreground/70 py-4 text-xs">Không có CSYT nào tồn bằng 0 trong kỳ này</p>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <SupplyValueSections
                scope={scope}
                topOverstockByValue={data.topOverstockByValue}
                topShortageByRiskValue={data.topShortageByRiskValue}
            />

            <SupplyContractSections
                scope={scope}
                contractRisk={data.contractRisk}
                supplierDependency={data.supplierDependency}
            />

            {scope === "admin" && <SupplyCoverageSection data={data.dataCoverage} />}
        </div>
    );
}
