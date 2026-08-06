"use client";

import { useState, useEffect } from "react";
import PackageStatusChartCard from "@/components/mua-sam/PackageStatusChartCard";
import {
    type PackageStatusBreakdown,
    type PackageStatusChartItem,
    type PackageStatusSummary,
} from "@/lib/mua-sam-package-status";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend, LineChart, Line,
} from "recharts";
import ChartColorShortcut from "@/components/dashboard/ChartColorShortcut";
import { useChartColors } from "@/components/dashboard/ChartColorProvider";
import { normalizeDynamicChartKey } from "@/lib/chart-colors";

const formatCurrency = (value: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value);

const formatCompact = (value: number) =>
    new Intl.NumberFormat('vi-VN', { notation: "compact", compactDisplay: "short" }).format(value);

interface SummaryKpis {
    keHoachCount: number;
    totalGoiThau: number;
    totalGiaTriGoiThau: number;
    tbmtCount: number;
    ketQuaCount: number;
    totalGiaTriTrungThau: number;
    tyLeTrungThau: number;
}

interface ValueItem {
    name: string;
    value: number;
}

interface BidRateFacilityItem {
    name: string;
    moiThau: number;
    trungThau: number;
    tyLe: number;
}

interface TrendItem {
    month: string;
    count: number;
}

interface AdminThongKeResponse {
    kpis: SummaryKpis;
    pieHinhThuc: ValueItem[];
    topFacilities: ValueItem[];
    statusData: PackageStatusChartItem[];
    statusBreakdown: PackageStatusBreakdown;
    statusSummary: PackageStatusSummary;
    bidRateByFacility: BidRateFacilityItem[];
    trendData: TrendItem[];
    pieQuyTrinh: ValueItem[];
}

export default function AdminMuaSamThongKe() {
    const [data, setData] = useState<AdminThongKeResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const chartColors = useChartColors();

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const res = await fetch("/api/admin/mua-sam/thong-ke");
                if (!res.ok) {
                    throw new Error("Không thể tải thống kê mua sắm");
                }
                const json: AdminThongKeResponse = await res.json();
                setData(json);
            } catch (e) {
                console.error(e);
                setData(null);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                    <p className="text-sm text-gray-500">Đang tải dữ liệu thống kê...</p>
                </div>
            </div>
        );
    }

    if (!data) return <p className="text-center text-red-500 py-8">Không thể tải dữ liệu</p>;

    const {
        kpis,
        pieHinhThuc,
        topFacilities,
        statusData,
        statusBreakdown,
        statusSummary,
        bidRateByFacility,
        trendData,
        pieQuyTrinh,
    } = data;
    const neutralColor = chartColors.resolveColor({ semanticKey: "neutral" });
    const bidColor = chartColors.resolveColor({ chartId: "muaSam.procurementType", key: "bid", semanticKey: "bid" });
    const serviceColor = chartColors.resolveColor({ chartId: "muaSam.procurementType", key: "service", semanticKey: "service" });
    const lineColor = chartColors.resolveColor({ semanticKey: "line" });
    const dynamicProcurementColor = (label: string, index: number) => chartColors.resolveColor({
        chartId: "muaSam.procurementType",
        key: normalizeDynamicChartKey(label),
        index,
    });
    const dynamicFacilityColor = (label: string, index: number) => chartColors.resolveColor({
        chartId: "muaSam.topFacilities",
        key: normalizeDynamicChartKey(label),
        index,
    });

    return (
        <div className="space-y-6">
            {/* KPI Scorecards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="relative overflow-hidden rounded-xl shadow-lg bg-gradient-to-br from-indigo-500 to-purple-600 text-white p-5">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-8 -mt-8" />
                    <p className="text-sm font-medium opacity-90">Tổng kế hoạch LCNT</p>
                    <p className="text-3xl font-bold mt-1">{kpis.keHoachCount}</p>
                    <p className="text-xs opacity-75 mt-1">Toàn hệ thống</p>
                </div>
                <div className="relative overflow-hidden rounded-xl shadow-lg bg-gradient-to-br from-blue-500 to-cyan-600 text-white p-5">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-8 -mt-8" />
                    <p className="text-sm font-medium opacity-90">Tổng số gói thầu</p>
                    <p className="text-3xl font-bold mt-1">{kpis.totalGoiThau}</p>
                    <p className="text-xs opacity-75 mt-1">Đã tạo trên hệ thống</p>
                </div>
                <div className="relative overflow-hidden rounded-xl shadow-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white p-5">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-8 -mt-8" />
                    <p className="text-sm font-medium opacity-90">Tổng giá trị gói thầu</p>
                    <p className="text-2xl font-bold mt-1">{formatCurrency(kpis.totalGiaTriGoiThau)}</p>
                    <p className="text-xs opacity-75 mt-1">Tổng ước tính</p>
                </div>
                <div className="relative overflow-hidden rounded-xl shadow-lg bg-gradient-to-br from-amber-500 to-orange-600 text-white p-5">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-8 -mt-8" />
                    <p className="text-sm font-medium opacity-90">Giá trị trúng thầu</p>
                    <p className="text-2xl font-bold mt-1">{formatCurrency(kpis.totalGiaTriTrungThau)}</p>
                    <p className="text-xs opacity-75 mt-1">Tỷ lệ trúng: {kpis.tyLeTrungThau}%</p>
                </div>
            </div>

            {/* Second row KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white rounded-xl shadow-md border border-gray-100 p-5 flex items-center gap-4">
                    <div className="w-12 h-12 bg-violet-100 rounded-xl flex items-center justify-center">
                        <svg className="w-6 h-6 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                        </svg>
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-gray-800">{kpis.tbmtCount}</p>
                        <p className="text-sm text-gray-500">Thông báo mời thầu</p>
                    </div>
                </div>
                <div className="bg-white rounded-xl shadow-md border border-gray-100 p-5 flex items-center gap-4">
                    <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                        <svg className="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-gray-800">{kpis.ketQuaCount}</p>
                        <p className="text-sm text-gray-500">Kết quả LCNT</p>
                    </div>
                </div>
                <div className="bg-white rounded-xl shadow-md border border-gray-100 p-5 flex items-center gap-4">
                    <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                        <svg className="w-6 h-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                        </svg>
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-gray-800">{kpis.tyLeTrungThau}%</p>
                        <p className="text-sm text-gray-500">Tỷ lệ trúng thầu</p>
                    </div>
                </div>
            </div>

            {/* Charts Row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Pie: Hình thức LCNT */}
                <div className="bg-white rounded-xl shadow-lg p-5 border border-gray-100">
                    <div className="mb-1 flex items-center justify-between gap-3">
                        <h3 className="font-semibold text-gray-800">Phân bổ hình thức LCNT</h3>
                        <ChartColorShortcut chartId="muaSam.procurementType" />
                    </div>
                    <p className="text-xs text-gray-500 mb-4">Theo số lượng gói thầu</p>
                    <div className="h-[320px]">
                        {pieHinhThuc && pieHinhThuc.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={pieHinhThuc}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={110}
                                        paddingAngle={3}
                                        dataKey="value"
                                        label={({ name, percent }: any) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
                                        labelLine={{ strokeWidth: 2 }}
                                    >
                                        {pieHinhThuc.map((item: any, i: number) => (
                                            <Cell key={i} fill={dynamicProcurementColor(item.name, i)} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                    <Legend wrapperStyle={{ fontSize: 12 }} />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex items-center justify-center h-full text-gray-400">Chưa có dữ liệu</div>
                        )}
                    </div>
                </div>

                {/* Pie: Quy trình */}
                <div className="bg-white rounded-xl shadow-lg p-5 border border-gray-100">
                    <div className="mb-1 flex items-center justify-between gap-3">
                        <h3 className="font-semibold text-gray-800">Phân bổ quy trình mua sắm</h3>
                        <ChartColorShortcut chartId="muaSam.procurementType" />
                    </div>
                    <p className="text-xs text-gray-500 mb-4">Luật Đấu thầu vs Tự quyết định</p>
                    <div className="h-[320px]">
                        {pieQuyTrinh && pieQuyTrinh.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={pieQuyTrinh}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={110}
                                        paddingAngle={5}
                                        dataKey="value"
                                        label={({ name, percent }: any) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
                                        labelLine={{ strokeWidth: 2 }}
                                    >
                                        <Cell fill={bidColor} />
                                        <Cell fill={serviceColor} />
                                    </Pie>
                                    <Tooltip />
                                    <Legend wrapperStyle={{ fontSize: 12 }} />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex items-center justify-center h-full text-gray-400">Chưa có dữ liệu</div>
                        )}
                    </div>
                </div>
            </div>

            {/* Charts Row 2 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Bar: Top cơ sở */}
                <div className="bg-white rounded-xl shadow-lg p-5 border border-gray-100">
                    <div className="mb-1 flex items-center justify-between gap-3">
                        <h3 className="font-semibold text-gray-800">Top 10 CSYT có giá trị gói thầu lớn nhất</h3>
                        <ChartColorShortcut chartId="muaSam.topFacilities" />
                    </div>
                    <p className="text-xs text-gray-500 mb-4">Tổng giá trị gói thầu theo cơ sở</p>
                    <div className="h-[380px]">
                        {topFacilities && topFacilities.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={topFacilities} margin={{ top: 10, right: 20, left: 10, bottom: 80 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                    <XAxis
                                        dataKey="name"
                                        angle={-35}
                                        textAnchor="end"
                                        height={100}
                                        tick={{ fontSize: 10, fill: neutralColor }}
                                        interval={0}
                                    />
                                    <YAxis tick={{ fontSize: 11, fill: neutralColor }} tickFormatter={formatCompact} width={70} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: "white", borderRadius: "10px", border: "1px solid #e2e8f0", boxShadow: "0 10px 25px -5px rgb(0 0 0 / 0.1)" }}
                                        formatter={((value: any) => [formatCurrency(Number(value)), "Giá trị"]) as any}
                                    />
                                    <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                                        {topFacilities.map((item: any, i: number) => (
                                            <Cell key={i} fill={dynamicFacilityColor(item.name, i)} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex items-center justify-center h-full text-gray-400">Chưa có dữ liệu</div>
                        )}
                    </div>
                </div>

                <PackageStatusChartCard
                    statusData={statusData}
                    statusBreakdown={statusBreakdown}
                    statusSummary={statusSummary}
                    showFacilityColumn
                />
            </div>

            {/* Line Chart: Xu hướng */}
            <div className="bg-white rounded-xl shadow-lg p-5 border border-gray-100">
                <div className="mb-1 flex items-center justify-between gap-3">
                    <h3 className="font-semibold text-gray-800">Xu hướng đấu thầu theo thời gian</h3>
                    <ChartColorShortcut chartId="muaSam.procurementType" />
                </div>
                <p className="text-xs text-gray-500 mb-4">Số gói thầu được tạo mỗi tháng</p>
                <div className="h-[300px]">
                    {trendData && trendData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={trendData} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                <XAxis dataKey="month" tick={{ fontSize: 11, fill: neutralColor }} />
                                <YAxis tick={{ fontSize: 11, fill: neutralColor }} allowDecimals={false} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: "white", borderRadius: "10px", border: "1px solid #e2e8f0", boxShadow: "0 10px 25px -5px rgb(0 0 0 / 0.1)" }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="count"
                                    stroke={lineColor}
                                    strokeWidth={3}
                                    dot={{ r: 5, fill: lineColor, strokeWidth: 2, stroke: "#fff" }}
                                    activeDot={{ r: 7, fill: lineColor }}
                                    name="Số gói thầu"
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex items-center justify-center h-full text-gray-400">Chưa có dữ liệu</div>
                    )}
                </div>
            </div>

            {/* Tỷ lệ trúng thầu theo cơ sở */}
            <div className="bg-white rounded-xl shadow-lg p-5 border border-gray-100">
                <h3 className="font-semibold text-gray-800 mb-1">Tỷ lệ trúng thầu theo cơ sở</h3>
                <p className="text-xs text-gray-500 mb-4">So sánh số mặt hàng mời thầu và trúng thầu</p>
                <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                    <table className="w-full text-sm">
                        <thead className="sticky top-0">
                            <tr className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white">
                                <th className="text-left p-3 font-semibold rounded-tl-lg">STT</th>
                                <th className="text-left p-3 font-semibold">Cơ sở y tế</th>
                                <th className="text-right p-3 font-semibold">Mời thầu</th>
                                <th className="text-right p-3 font-semibold">Trúng thầu</th>
                                <th className="text-left p-3 font-semibold rounded-tr-lg w-1/4">Tỷ lệ</th>
                            </tr>
                        </thead>
                        <tbody>
                            {bidRateByFacility?.map((f: any, i: number) => (
                                <tr key={i} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                                    <td className="p-3 text-gray-500">{i + 1}</td>
                                    <td className="p-3 font-medium text-gray-700">{f.name}</td>
                                    <td className="p-3 text-right font-mono text-gray-700">{f.moiThau}</td>
                                    <td className="p-3 text-right font-mono text-gray-700">{f.trungThau}</td>
                                    <td className="p-3">
                                        <div className="flex items-center gap-2">
                                            <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
                                                <div
                                                    className="h-full rounded-full transition-all bg-gradient-to-r from-indigo-500 to-blue-500"
                                                    style={{ width: `${Math.max(f.tyLe, 2)}%` }}
                                                />
                                            </div>
                                            <span className="text-xs text-gray-600 w-12 text-right font-semibold">
                                                {f.tyLe}%
                                            </span>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {(!bidRateByFacility || bidRateByFacility.length === 0) && (
                        <p className="text-center text-gray-400 py-8">Chưa có dữ liệu kết quả LCNT</p>
                    )}
                </div>
            </div>
        </div>
    );
}
