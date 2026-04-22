"use client";

import { useState, useEffect } from "react";
import {
    Tooltip, ResponsiveContainer, Treemap,
} from "recharts";

interface Tab3Props {
    reportMonth: string;
    facilityId: string;
    apiPrefix?: string;
}

const COLORS = [
    "#6366f1", "#ec4899", "#14b8a6", "#f59e0b", "#3b82f6",
    "#8b5cf6", "#ef4444", "#10b981", "#f97316", "#06b6d4",
];

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
    const { x, y, width, height, name, value, index } = props;
    if (width < 30 || height < 20) return null;
    return (
        <g>
            <rect
                x={x}
                y={y}
                width={width}
                height={height}
                fill={COLORS[index % COLORS.length]}
                stroke="#fff"
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
                    <p className="text-sm text-gray-500">Đang tải dữ liệu...</p>
                </div>
            </div>
        );
    }

    if (!data) return <p className="text-center text-red-500 py-8">Không thể tải dữ liệu</p>;

    const { ganttData, expiringContracts, treemapData, priceComparison } = data;

    // Process Gantt chart data
    const ganttMinDate = ganttData.length > 0 ? Math.min(...ganttData.map((g: any) => g.startMs)) : Date.now();
    const ganttMaxDate = ganttData.length > 0 ? Math.max(...ganttData.map((g: any) => g.endMs)) : Date.now() + 365 * 24 * 60 * 60 * 1000;
    const ganttRange = ganttMaxDate - ganttMinDate || 1;

    const ganttBarData = ganttData.map((g: any) => ({
        ...g,
        offset: ((g.startMs - ganttMinDate) / ganttRange) * 100,
        width: ((g.endMs - g.startMs) / ganttRange) * 100,
    }));

    return (
        <div className="space-y-6">
            {/* Gantt Chart */}
            <div className="bg-white rounded-xl shadow-lg p-5 border border-gray-100">
                <h3 className="font-semibold text-gray-800 mb-1">Tiến độ hợp đồng cung ứng</h3>
                <p className="text-xs text-gray-500 mb-4">Biểu đồ Gantt - Đỏ: Sắp hết hạn (30 ngày), Xanh: Còn hiệu lực, Xám: Đã hết hạn</p>
                <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                    <div className="min-w-[700px]">
                        {/* Timeline header */}
                        <div className="flex items-center text-xs text-gray-400 mb-2 px-2">
                            <div className="w-48 shrink-0" />
                            <div className="flex-1 flex justify-between">
                                <span>{new Date(ganttMinDate).toLocaleDateString('vi-VN')}</span>
                                <span>{new Date((ganttMinDate + ganttMaxDate) / 2).toLocaleDateString('vi-VN')}</span>
                                <span>{new Date(ganttMaxDate).toLocaleDateString('vi-VN')}</span>
                            </div>
                        </div>
                        {ganttBarData.map((g: any, i: number) => (
                            <div key={i} className="flex items-center gap-2 py-1.5 px-2 hover:bg-gray-50 rounded transition-colors group">
                                <div className="w-48 shrink-0 text-xs text-gray-700 truncate font-medium" title={g.soQd}>
                                    {g.soQd}
                                </div>
                                <div className="flex-1 relative h-6 bg-gray-50 rounded-full overflow-hidden">
                                    <div
                                        className={`absolute top-0 h-full rounded-full transition-all ${g.status === "expired" ? "bg-gray-400" :
                                            g.status === "expiring" ? "bg-gradient-to-r from-red-500 to-rose-500" :
                                                "bg-gradient-to-r from-emerald-500 to-teal-500"
                                            }`}
                                        style={{
                                            left: `${g.offset}%`,
                                            width: `${Math.max(g.width, 0.5)}%`,
                                        }}
                                        title={`${g.congTy} | ${formatDateStr(g.startDate)} - ${formatDateStr(g.endDate)} | ${g.drugCount} thuốc`}
                                    />
                                </div>
                                <div className="w-16 text-xs text-gray-500 text-right">{g.drugCount} thuốc</div>
                            </div>
                        ))}
                        {ganttBarData.length === 0 && (
                            <p className="text-center text-gray-400 py-8">Không có dữ liệu hợp đồng</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Expiring Contracts Table */}
            <div className="bg-white rounded-xl shadow-lg p-5 border border-gray-100">
                <div className="flex items-center gap-2 mb-1">
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-amber-100 text-amber-600 text-lg">⏰</span>
                    <h3 className="font-semibold text-gray-800">Hợp đồng sắp hết hạn (trong 60 ngày)</h3>
                </div>
                <p className="text-xs text-gray-500 mb-4 ml-9">Cần chuẩn bị kế hoạch đấu thầu mới</p>
                <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
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
                                <tr key={i} className="border-b border-gray-50 hover:bg-amber-50/50 transition-colors">
                                    <td className="p-3 text-gray-700 font-mono text-xs">{c.soQd}</td>
                                    <td className="p-3 text-gray-700">{c.congTy}</td>
                                    <td className="p-3 font-medium text-gray-800">{c.drugName}</td>
                                    <td className="p-3 text-gray-600">{c.facility}</td>
                                    <td className="p-3 text-amber-600 font-semibold">{formatDateStr(c.ngayKetThuc)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {(!expiringContracts || expiringContracts.length === 0) && (
                        <p className="text-center text-gray-400 py-8">Không có hợp đồng sắp hết hạn</p>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Treemap */}
                <div className="bg-white rounded-xl shadow-lg p-5 border border-gray-100">
                    <h3 className="font-semibold text-gray-800 mb-1">Top 10 nhà cung ứng</h3>
                    <p className="text-xs text-gray-500 mb-4">Theo giá trị cung ứng (Nhập * Giá VAT)</p>
                    <div className="h-[350px]">
                        {treemapData && treemapData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <Treemap
                                    data={treemapData}
                                    dataKey="value"
                                    aspectRatio={4 / 3}
                                    content={<CustomTreemapContent />}
                                >
                                    <Tooltip
                                        contentStyle={{ backgroundColor: "white", borderRadius: "10px", border: "1px solid #e2e8f0", boxShadow: "0 10px 25px -5px rgb(0 0 0 / 0.1)" }}
                                        formatter={((value: any) => [formatCurrency(Number(value)), "Giá trị"]) as any}
                                    />
                                </Treemap>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex items-center justify-center h-full text-gray-400">Không có dữ liệu</div>
                        )}
                    </div>
                </div>

                {/* Price Comparison */}
                <div className="bg-white rounded-xl shadow-lg p-5 border border-gray-100">
                    <h3 className="font-semibold text-gray-800 mb-1">So sánh giá giữa các gói thầu</h3>
                    <p className="text-xs text-gray-500 mb-4">Phát hiện chênh lệch giá vô lý (&gt; 5%)</p>
                    <div className="overflow-y-auto max-h-[350px] space-y-3">
                        {priceComparison?.map((pc: any, i: number) => (
                            <div key={i} className="border border-gray-100 rounded-lg p-3">
                                <div className="flex items-center justify-between mb-2">
                                    <div>
                                        <span className="font-medium text-sm text-gray-800">{pc.hoatChat}</span>
                                        <span className="text-xs text-gray-500 ml-2">{pc.hamLuong}</span>
                                    </div>
                                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${pc.variance > 50 ? "bg-red-100 text-red-700" :
                                        pc.variance > 20 ? "bg-amber-100 text-amber-700" :
                                            "bg-yellow-100 text-yellow-700"
                                        }`}>
                                        ↕ {pc.variance}%
                                    </span>
                                </div>
                                <div className="space-y-1">
                                    {pc.items?.map((item: any, j: number) => (
                                        <div key={j} className="flex justify-between items-center text-xs py-1 px-2 bg-gray-50 rounded">
                                            <span className="text-gray-600 truncate flex-1">{item.congTy}</span>
                                            <span className="text-gray-400 mx-2 truncate max-w-[120px]">{item.soQd}</span>
                                            <span className={`font-mono font-semibold ${item.giaVat === pc.maxPrice ? "text-red-600" :
                                                item.giaVat === pc.minPrice ? "text-emerald-600" :
                                                    "text-gray-700"
                                                }`}>
                                                {formatCurrency(item.giaVat)}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                        {(!priceComparison || priceComparison.length === 0) && (
                            <p className="text-center text-gray-400 py-8">Không phát hiện chênh lệch giá đáng kể</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
