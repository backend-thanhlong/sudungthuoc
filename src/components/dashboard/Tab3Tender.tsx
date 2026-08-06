"use client";

import { useState, useEffect } from "react";
import {
    Tooltip, ResponsiveContainer, Treemap,
} from "recharts";
import {
    useDashboardChartTheme,
} from "./chart-theme";
import ChartColorShortcut from "./ChartColorShortcut";
import { useChartColors } from "./ChartColorProvider";
import { normalizeDynamicChartKey } from "@/lib/chart-colors";

interface Tab3Props {
    reportMonth: string;
    facilityId: string;
    apiPrefix?: string;
}

const formatCurrency = (value: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value);

const formatCompact = (value: number) =>
    new Intl.NumberFormat('vi-VN', { notation: "compact", compactDisplay: "short" }).format(value);

function formatDateStr(dateStr: string | null): string {
    if (!dateStr) return "N/A";
    if (/^\d{8}$/.test(dateStr)) {
        return `${dateStr.substring(6, 8)}/${dateStr.substring(4, 6)}/${dateStr.substring(0, 4)}`;
    }
    return dateStr;
}

// Custom Treemap content renderer
const CustomTreemapContent = (props: any) => {
    const { x, y, width, height, name, value } = props;
    if (width < 30 || height < 20) return null;
    const fill = props.fill || props.payload?.fill || "#1974D3";
    return (
        <g>
            <rect
                x={x}
                y={y}
                width={width}
                height={height}
                fill={fill}
                stroke="var(--background)"
                strokeWidth={2}
                rx={4}
                opacity={0.85}
            />
            {width > 60 && height > 35 && (
                <>
                    <text x={x + 8} y={y + 18} fill="#fff" fontSize={11} fontWeight="bold">
                        {name?.length > Math.floor(width / 7) ? name.substring(0, Math.floor(width / 7)) + "..." : name}
                    </text>
                    <text x={x + 8} y={y + 34} fill="rgba(255,255,255,0.8)" fontSize={10}>
                        {formatCompact(value)}
                    </text>
                </>
            )}
        </g>
    );
};

export default function Tab3Tender({ reportMonth, facilityId, apiPrefix = "/api/admin/dashboard" }: Tab3Props) {
    const [data, setData] = useState<any>(null);
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
        const fetchData = async () => {
            setLoading(true);
            try {
                const params = new URLSearchParams();
                if (reportMonth && reportMonth !== "all") params.set("reportMonth", reportMonth);
                if (facilityId) params.set("facilityId", facilityId);
                const res = await fetch(`${apiPrefix}/tender?${params}`);
                const json = await res.json();
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
                    <div className="w-10 h-10 border-4 border-amber-200 border-t-amber-600 rounded-full animate-spin" />
                    <p className="text-sm text-muted-foreground">Đang tải dữ liệu...</p>
                </div>
            </div>
        );
    }

    if (!data) return <p className="text-center text-red-500 py-8">Không thể tải dữ liệu</p>;

    const { ganttData, expiringContracts, treemapData, priceComparison } = data;
    const tenderStatusColors = {
        expired: chartColors.resolveColor({ chartId: "dashboard.tender.timeline", key: "expired", semanticKey: "neutral" }),
        expiring: chartColors.resolveColor({ chartId: "dashboard.tender.timeline", key: "expiring", semanticKey: "warning" }),
        active: chartColors.resolveColor({ chartId: "dashboard.tender.timeline", key: "active", semanticKey: "success" }),
    };

    // Process Gantt chart data
    const ganttMinDate = ganttData.length > 0 ? Math.min(...ganttData.map((g: any) => g.startMs)) : Date.now();
    const ganttMaxDate = ganttData.length > 0 ? Math.max(...ganttData.map((g: any) => g.endMs)) : Date.now() + 365 * 24 * 60 * 60 * 1000;
    const ganttRange = ganttMaxDate - ganttMinDate || 1;

    const ganttBarData = ganttData.map((g: any) => ({
        ...g,
        offset: ((g.startMs - ganttMinDate) / ganttRange) * 100,
        width: ((g.endMs - g.startMs) / ganttRange) * 100,
    }));
    const treemapDataWithColors = (treemapData || []).map((item: any, index: number) => ({
        ...item,
        fill: chartColors.resolveColor({
            chartId: "dashboard.tender.timeline",
            key: normalizeDynamicChartKey(String(item.name || item.congTy || index)),
            index,
        }),
    }));

    return (
        <div className="space-y-4 sm:space-y-6">
            {/* Gantt Chart */}
            <div className="rounded-xl border border-border bg-card p-4 text-card-foreground shadow-sm sm:p-5">
                <div className="mb-1 flex items-start justify-between gap-3">
                    <h3 className="font-semibold text-foreground">Tiến độ hợp đồng cung ứng</h3>
                    <ChartColorShortcut chartId="dashboard.tender.timeline" />
                </div>
                <p className="text-xs text-muted-foreground mb-4">Biểu đồ Gantt - Đỏ: Sắp hết hạn (30 ngày), Xanh: Còn hiệu lực, Xám: Đã hết hạn</p>
                <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                    <div className="min-w-[700px]">
                        {/* Timeline header */}
                        <div className="flex items-center text-xs text-muted-foreground/70 mb-2 px-2">
                            <div className="w-48 shrink-0" />
                            <div className="flex-1 flex justify-between">
                                <span>{new Date(ganttMinDate).toLocaleDateString('vi-VN')}</span>
                                <span>{new Date((ganttMinDate + ganttMaxDate) / 2).toLocaleDateString('vi-VN')}</span>
                                <span>{new Date(ganttMaxDate).toLocaleDateString('vi-VN')}</span>
                            </div>
                        </div>
                        {ganttBarData.map((g: any, i: number) => (
                            <div key={i} className="flex items-center gap-2 py-1.5 px-2 hover:bg-muted/40 rounded transition-colors group">
                                <div className="w-48 shrink-0 text-xs text-foreground truncate font-medium" title={g.soQd}>
                                    {g.soQd}
                                </div>
                                <div className="flex-1 relative h-6 bg-muted/40 rounded-full overflow-hidden">
                                    <div
                                        className="absolute top-0 h-full rounded-full transition-all"
                                        style={{
                                            left: `${g.offset}%`,
                                            width: `${Math.max(g.width, 0.5)}%`,
                                            backgroundColor: g.status === "expired"
                                                ? tenderStatusColors.expired
                                                : g.status === "expiring"
                                                    ? tenderStatusColors.expiring
                                                    : tenderStatusColors.active,
                                            opacity: g.status === "expired" ? 0.45 : 1,
                                        }}
                                        title={`${g.congTy} | ${formatDateStr(g.startDate)} - ${formatDateStr(g.endDate)} | ${g.drugCount} thuốc`}
                                    />
                                </div>
                                <div className="w-16 text-xs text-muted-foreground text-right">{g.drugCount} thuốc</div>
                            </div>
                        ))}
                        {ganttBarData.length === 0 && (
                            <p className="text-center text-muted-foreground/70 py-8">Không có dữ liệu hợp đồng</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Expiring Contracts Table */}
            <div className="rounded-xl border border-border bg-card p-4 text-card-foreground shadow-sm sm:p-5">
                <div className="flex items-center gap-2 mb-1">
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-amber-100 text-amber-600 dark:bg-amber-950/40 dark:text-amber-200 text-lg">⏰</span>
                    <h3 className="font-semibold text-foreground">Hợp đồng sắp hết hạn (trong 60 ngày)</h3>
                </div>
                <p className="mb-4 text-xs text-muted-foreground sm:ml-9">Cần chuẩn bị kế hoạch đấu thầu mới</p>
                <div>
                    <div className="max-h-[300px] space-y-3 overflow-y-auto md:hidden">
                        {expiringContracts?.map((c: any, i: number) => (
                            <div key={`${c.soQd}-${i}`} className="rounded-lg border border-amber-100 bg-amber-50/40 p-3 dark:border-amber-900/60 dark:bg-amber-950/15">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="font-mono text-xs text-muted-foreground">{c.soQd}</p>
                                        <p className="mt-1 font-medium text-foreground">{c.drugName}</p>
                                        <p className="mt-1 text-xs text-muted-foreground">{c.congTy}</p>
                                        <p className="text-xs text-muted-foreground">{c.facility}</p>
                                    </div>
                                    <p className="shrink-0 text-right text-sm font-semibold text-amber-600 dark:text-amber-300">
                                        {formatDateStr(c.ngayKetThuc)}
                                    </p>
                                </div>
                            </div>
                        ))}
                        {(!expiringContracts || expiringContracts.length === 0) && (
                            <p className="text-center text-muted-foreground/70 py-8">Không có hợp đồng sắp hết hạn</p>
                        )}
                    </div>
                    <div className="hidden overflow-x-auto max-h-[300px] overflow-y-auto md:block">
                    <table className="w-full text-sm">
                        <thead className="sticky top-0">
                            <tr className="bg-gradient-to-r from-amber-500 to-orange-500 text-white">
                                <th className="text-left p-3 font-semibold rounded-tl-lg">Số QĐ</th>
                                <th className="text-left p-3 font-semibold">Công ty</th>
                                <th className="text-left p-3 font-semibold">Tên thuốc</th>
                                <th className="text-left p-3 font-semibold">Cơ sở</th>
                                <th className="text-left p-3 font-semibold rounded-tr-lg">Ngày kết thúc</th>
                            </tr>
                        </thead>
                        <tbody>
                            {expiringContracts?.map((c: any, i: number) => (
                                <tr key={i} className="border-b border-border hover:bg-amber-50/50 dark:hover:bg-amber-950/20 transition-colors">
                                    <td className="p-3 text-foreground font-mono text-xs">{c.soQd}</td>
                                    <td className="p-3 text-foreground">{c.congTy}</td>
                                    <td className="p-3 font-medium text-foreground">{c.drugName}</td>
                                    <td className="p-3 text-muted-foreground">{c.facility}</td>
                                    <td className="p-3 font-semibold text-amber-600 dark:text-amber-300">{formatDateStr(c.ngayKetThuc)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {(!expiringContracts || expiringContracts.length === 0) && (
                        <p className="text-center text-muted-foreground/70 py-8">Không có hợp đồng sắp hết hạn</p>
                    )}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
                {/* Treemap */}
                <div className="rounded-xl border border-border bg-card p-4 text-card-foreground shadow-sm sm:p-5">
                    <div className="mb-1 flex items-start justify-between gap-3">
                        <h3 className="font-semibold text-foreground">Top 10 nhà cung ứng</h3>
                        <ChartColorShortcut chartId="dashboard.tender.timeline" />
                    </div>
                    <p className="text-xs text-muted-foreground mb-4">Theo giá trị cung ứng (Nhập * Giá VAT)</p>
                    <div className="h-[300px] sm:h-[350px]">
                        {treemapDataWithColors.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <Treemap
                                    data={treemapDataWithColors}
                                    dataKey="value"
                                    aspectRatio={4 / 3}
                                    content={<CustomTreemapContent />}
                                >
                                    <Tooltip
                                        contentStyle={tooltipStyle}
                                        formatter={((value: any) => [formatCurrency(Number(value)), "Giá trị"]) as any}
                                    />
                                </Treemap>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex items-center justify-center h-full text-muted-foreground/70">Không có dữ liệu</div>
                        )}
                    </div>
                </div>

                {/* Price Comparison */}
                <div className="rounded-xl border border-border bg-card p-4 text-card-foreground shadow-sm sm:p-5">
                    <h3 className="font-semibold text-foreground mb-1">So sánh giá giữa các gói thầu</h3>
                    <p className="text-xs text-muted-foreground mb-4">Phát hiện chênh lệch giá vô lý (&gt; 5%)</p>
                    <div className="overflow-y-auto max-h-[350px] space-y-3">
                        {priceComparison?.map((pc: any, i: number) => (
                            <div key={i} className="border border-border rounded-lg p-3">
                                <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                            <span className="font-mono text-xs font-semibold text-blue-600 dark:text-blue-300">{pc.maChung}</span>
                                            <span className="font-medium text-sm text-foreground">{pc.drugName || pc.hoatChat}</span>
                                        </div>
                                        <div className="mt-0.5 text-xs text-muted-foreground">
                                            {[pc.hoatChat, pc.hamLuong].filter(Boolean).join(" - ")}
                                        </div>
                                    </div>
                                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${pc.variance > 50 ? "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-200" :
                                        pc.variance > 20 ? "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-200" :
                                            "bg-yellow-100 text-yellow-700 dark:bg-yellow-950/40 dark:text-yellow-200"
                                        }`}>
                                        ↕ {pc.variance}%
                                    </span>
                                </div>
                                <div className="space-y-1">
                                    {pc.items?.map((item: any, j: number) => (
                                        <div key={j} className="flex flex-col gap-1 rounded bg-muted/40 px-2 py-1 text-xs sm:flex-row sm:items-center sm:justify-between">
                                            <span className="min-w-0 flex-1 truncate text-muted-foreground">{item.facility || item.congTy}</span>
                                            <span className="min-w-0 flex-1 truncate text-muted-foreground">{item.congTy}</span>
                                            <span className="text-muted-foreground/70 sm:mx-2 sm:max-w-[120px] sm:truncate">{item.soQd}</span>
                                            <span className={`font-mono font-semibold sm:text-right ${item.giaVat === pc.maxPrice ? "text-red-600 dark:text-red-300" :
                                                item.giaVat === pc.minPrice ? "text-emerald-600 dark:text-emerald-300" :
                                                    "text-foreground"
                                                }`}>
                                                {formatCurrency(item.giaVat)}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                        {(!priceComparison || priceComparison.length === 0) && (
                            <p className="text-center text-muted-foreground/70 py-8">Không phát hiện chênh lệch giá đáng kể</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
