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
    PieChart, Pie, Cell, Legend,
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

interface BidItem {
    name: string;
    moiThau: number;
    trungThau: number;
}

interface TimelineItem {
    name: string;
    date: string;
    quyTrinh: string;
    trangThai: string;
}

interface FacilityThongKeResponse {
    kpis: SummaryKpis;
    pieHinhThuc: ValueItem[];
    valueByKeHoach: ValueItem[];
    statusData: PackageStatusChartItem[];
    statusBreakdown: PackageStatusBreakdown;
    statusSummary: PackageStatusSummary;
    bidData: BidItem[];
    pieQuyTrinh: ValueItem[];
    timeline: TimelineItem[];
}

export default function FacilityMuaSamThongKe() {
    const [data, setData] = useState<FacilityThongKeResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const chartColors = useChartColors();

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const res = await fetch("/api/facility/mua-sam/thong-ke");
                if (!res.ok) {
                    throw new Error("Không thể tải thống kê mua sắm");
                }
                const json: FacilityThongKeResponse = await res.json();
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
                    <div className="w-10 h-10 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin" />
                    <p className="text-sm text-gray-500">Đang tải dữ liệu thống kê...</p>
                </div>
            </div>
        );
    }

    if (!data) return <p className="text-center text-red-500 py-8">Không thể tải dữ liệu</p>;

    const {
        kpis,
        pieHinhThuc,
        valueByKeHoach,
        statusData,
        statusBreakdown,
        statusSummary,
        bidData,
        pieQuyTrinh,
        timeline,
    } = data;
    const neutralColor = chartColors.resolveColor({ semanticKey: "neutral" });
    const bidColor = chartColors.resolveColor({ chartId: "muaSam.procurementType", key: "bid", semanticKey: "bid" });
    const serviceColor = chartColors.resolveColor({ chartId: "muaSam.procurementType", key: "service", semanticKey: "service" });
    const successColor = chartColors.resolveColor({ chartId: "muaSam.procurementType", key: "success", semanticKey: "success" });
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
                <div className="relative overflow-hidden rounded-xl shadow-lg bg-gradient-to-br from-teal-500 to-emerald-600 text-white p-5">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-8 -mt-8" />
                    <p className="text-sm font-medium opacity-90">Kế hoạch LCNT</p>
                    <p className="text-3xl font-bold mt-1">{kpis.keHoachCount}</p>
                    <p className="text-xs opacity-75 mt-1">Đã lập</p>
                </div>
                <div className="relative overflow-hidden rounded-xl shadow-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-white p-5">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-8 -mt-8" />
                    <p className="text-sm font-medium opacity-90">Gói thầu</p>
                    <p className="text-3xl font-bold mt-1">{kpis.totalGoiThau}</p>
                    <p className="text-xs opacity-75 mt-1">Tổng số gói</p>
                </div>
                <div className="relative overflow-hidden rounded-xl shadow-lg bg-gradient-to-br from-violet-500 to-purple-600 text-white p-5">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-8 -mt-8" />
                    <p className="text-sm font-medium opacity-90">Tổng giá trị gói thầu</p>
                    <p className="text-2xl font-bold mt-1">{formatCurrency(kpis.totalGiaTriGoiThau)}</p>
                    <p className="text-xs opacity-75 mt-1">Ước tính</p>
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
                {/* Bar: Giá trị theo kế hoạch */}
                <div className="bg-white rounded-xl shadow-lg p-5 border border-gray-100">
                    <div className="mb-1 flex items-center justify-between gap-3">
                        <h3 className="font-semibold text-gray-800">Giá trị gói thầu theo kế hoạch</h3>
                        <ChartColorShortcut chartId="muaSam.topFacilities" />
                    </div>
                    <p className="text-xs text-gray-500 mb-4">Tổng giá trị gói thầu từng kế hoạch LCNT</p>
                    <div className="h-[380px]">
                        {valueByKeHoach && valueByKeHoach.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={valueByKeHoach} margin={{ top: 10, right: 20, left: 10, bottom: 80 }}>
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
                                        {valueByKeHoach.map((item: any, i: number) => (
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
                />
            </div>

            {/* Tỷ lệ trúng thầu */}
            <div className="bg-white rounded-xl shadow-lg p-5 border border-gray-100">
                <div className="mb-1 flex items-center justify-between gap-3">
                    <h3 className="font-semibold text-gray-800">Tỷ lệ trúng thầu</h3>
                    <ChartColorShortcut chartId="muaSam.procurementType" />
                </div>
                <p className="text-xs text-gray-500 mb-4">So sánh mời thầu vs trúng thầu theo từng gói</p>
                <div className="h-[300px]">
                    {bidData && bidData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={bidData} margin={{ top: 10, right: 30, left: 10, bottom: 60 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                <XAxis
                                    dataKey="name"
                                    angle={-25}
                                    textAnchor="end"
                                    height={80}
                                    tick={{ fontSize: 10, fill: neutralColor }}
                                    interval={0}
                                />
                                <YAxis tick={{ fontSize: 11, fill: neutralColor }} allowDecimals={false} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: "white", borderRadius: "10px", border: "1px solid #e2e8f0", boxShadow: "0 10px 25px -5px rgb(0 0 0 / 0.1)" }}
                                />
                                <Legend wrapperStyle={{ fontSize: 12 }} />
                                <Bar dataKey="moiThau" name="Mời thầu" fill={bidColor} radius={[4, 4, 0, 0]} />
                                <Bar dataKey="trungThau" name="Trúng thầu" fill={successColor} radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex items-center justify-center h-full text-gray-400">Chưa có dữ liệu kết quả LCNT</div>
                    )}
                </div>
            </div>

            {/* Timeline kế hoạch */}
            <div className="bg-white rounded-xl shadow-lg p-5 border border-gray-100">
                <h3 className="font-semibold text-gray-800 mb-1">Timeline kế hoạch LCNT</h3>
                <p className="text-xs text-gray-500 mb-4">Danh sách kế hoạch theo thời gian</p>
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                    {timeline && timeline.length > 0 ? (
                        timeline.map((item: any, i: number) => (
                            <div key={i} className="flex items-start gap-4 group">
                                <div className="flex flex-col items-center">
                                    <div className={`w-4 h-4 rounded-full border-2 ${item.quyTrinh === "Luật Đấu thầu"
                                            ? "border-indigo-500 bg-indigo-100"
                                            : "border-amber-500 bg-amber-100"
                                        }`} />
                                    {i < timeline.length - 1 && (
                                        <div className="w-0.5 h-8 bg-gray-200" />
                                    )}
                                </div>
                                <div className="flex-1 -mt-1 pb-2">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-medium text-sm text-gray-800">{item.name}</span>
                                        <span className={`text-xs px-2 py-0.5 rounded-full ${item.quyTrinh === "Luật Đấu thầu"
                                                ? "bg-indigo-100 text-indigo-700"
                                                : "bg-amber-100 text-amber-700"
                                            }`}>
                                            {item.quyTrinh}
                                        </span>
                                        <span className={`text-xs px-2 py-0.5 rounded-full ${item.trangThai === "Đã đăng tải"
                                                ? "bg-emerald-100 text-emerald-700"
                                                : "bg-gray-100 text-gray-600"
                                            }`}>
                                            {item.trangThai}
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-0.5">
                                        {new Date(item.date).toLocaleDateString("vi-VN")}
                                    </p>
                                </div>
                            </div>
                        ))
                    ) : (
                        <p className="text-center text-gray-400 py-8">Chưa có kế hoạch nào</p>
                    )}
                </div>
            </div>
        </div>
    );
}
