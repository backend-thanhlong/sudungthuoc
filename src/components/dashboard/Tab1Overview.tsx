"use client";

import { useState, useEffect } from "react";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend,
} from "recharts";

interface Tab1Props {
    reportMonth: string;
    facilityId: string;
    apiPrefix?: string;
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

export default function Tab1Overview({ reportMonth, facilityId, apiPrefix = "/api/admin/dashboard" }: Tab1Props) {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const params = new URLSearchParams();
                if (reportMonth && reportMonth !== "all") params.set("reportMonth", reportMonth);
                if (facilityId) params.set("facilityId", facilityId);
                const res = await fetch(`${apiPrefix}/overview?${params}`);
                const json = await res.json();
                setData(json);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [reportMonth, facilityId]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                    <p className="text-sm text-gray-500">Đang tải dữ liệu...</p>
                </div>
            </div>
        );
    }

    if (!data) return <p className="text-center text-red-500 py-8">Không thể tải dữ liệu</p>;

    const { kpis, stackedBarData, drugGroups, donutData, heatmapData } = data;

    // Max value for heatmap color scale
    const maxHeatmapVal = Math.max(...heatmapData.map((h: any) => h.value), 1);

    return (
        <div className="space-y-6">
            {/* KPI Scorecards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="relative overflow-hidden rounded-xl border-0 shadow-lg bg-gradient-to-br from-indigo-500 to-purple-600 text-white p-5">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-8 -mt-8" />
                    <p className="text-sm font-medium opacity-90">Tổng giá trị tồn kho</p>
                    <p className="text-2xl font-bold mt-1">{formatCurrency(kpis.totalInventoryValue)}</p>
                    <p className="text-xs opacity-75 mt-1">Toàn ngành</p>
                </div>
                <div className="relative overflow-hidden rounded-xl border-0 shadow-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white p-5">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-8 -mt-8" />
                    <p className="text-sm font-medium opacity-90">Tỷ lệ thuốc nội</p>
                    <p className="text-2xl font-bold mt-1">{kpis.domesticRatio}%</p>
                    <p className="text-xs opacity-75 mt-1">Theo giá trị xuất kho</p>
                </div>
                <div className="relative overflow-hidden rounded-xl border-0 shadow-lg bg-gradient-to-br from-blue-500 to-cyan-600 text-white p-5">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-8 -mt-8" />
                    <p className="text-sm font-medium opacity-90">Số mặt hàng quản lý</p>
                    <p className="text-2xl font-bold mt-1">{kpis.distinctDrugCount.toLocaleString()}</p>
                    <p className="text-xs opacity-75 mt-1">Mã thuốc phân biệt</p>
                </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Stacked Bar Chart */}
                <div className="bg-white rounded-xl shadow-lg p-5 border border-gray-100">
                    <h3 className="font-semibold text-gray-800 mb-1">Top 10 CSYT tồn kho lớn nhất</h3>
                    <p className="text-xs text-gray-500 mb-4">Chia theo nhóm thuốc</p>
                    <div className="h-[380px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stackedBarData} margin={{ top: 10, right: 20, left: 10, bottom: 60 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                <XAxis
                                    dataKey="facility"
                                    angle={-35}
                                    textAnchor="end"
                                    height={80}
                                    tick={{ fontSize: 10, fill: "#64748b" }}
                                    interval={0}
                                />
                                <YAxis tick={{ fontSize: 11, fill: "#64748b" }} tickFormatter={formatCompact} width={70} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: "white", borderRadius: "10px", border: "1px solid #e2e8f0", boxShadow: "0 10px 25px -5px rgb(0 0 0 / 0.1)" }}
                                    formatter={((value: any) => [formatCurrency(Number(value))]) as any}
                                />
                                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                                {drugGroups.map((group: string, i: number) => (
                                    <Bar
                                        key={group}
                                        dataKey={group}
                                        stackId="a"
                                        fill={COLORS[i % COLORS.length]}
                                        radius={i === drugGroups.length - 1 ? [3, 3, 0, 0] : [0, 0, 0, 0]}
                                    />
                                ))}
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Donut Chart */}
                <div className="bg-white rounded-xl shadow-lg p-5 border border-gray-100">
                    <h3 className="font-semibold text-gray-800 mb-1">BHYT vs. Dịch vụ</h3>
                    <p className="text-xs text-gray-500 mb-4">Tỷ lệ giá trị sử dụng</p>
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
                                    label={({ name, percent }: any) => `${name}: ${((percent || 0) * 100).toFixed(1)}%`}
                                    labelLine={{ strokeWidth: 2 }}
                                >
                                    <Cell fill="#6366f1" />
                                    <Cell fill="#f59e0b" />
                                </Pie>
                                <Tooltip formatter={((value: any) => [formatCurrency(Number(value))]) as any} />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Heatmap Table */}
            <div className="bg-white rounded-xl shadow-lg p-5 border border-gray-100">
                <h3 className="font-semibold text-gray-800 mb-1">Phân bố tồn kho theo địa bàn</h3>
                <p className="text-xs text-gray-500 mb-4">Dựa trên địa chỉ cơ sở báo cáo</p>
                <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                    <table className="w-full text-sm">
                        <thead className="sticky top-0">
                            <tr className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white">
                                <th className="text-left p-3 font-semibold rounded-tl-lg">STT</th>
                                <th className="text-left p-3 font-semibold">Địa bàn</th>
                                <th className="text-right p-3 font-semibold">Giá trị tồn kho</th>
                                <th className="text-left p-3 font-semibold rounded-tr-lg w-1/3">Mức độ</th>
                            </tr>
                        </thead>
                        <tbody>
                            {heatmapData.map((item: any, i: number) => {
                                const intensity = item.value / maxHeatmapVal;
                                const hue = 120 - intensity * 120; // green -> red
                                return (
                                    <tr key={i} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                                        <td className="p-3 text-gray-500">{i + 1}</td>
                                        <td className="p-3 font-medium text-gray-700">{item.address}</td>
                                        <td className="p-3 text-right font-mono text-gray-700">{formatCurrency(item.value)}</td>
                                        <td className="p-3">
                                            <div className="flex items-center gap-2">
                                                <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
                                                    <div
                                                        className="h-full rounded-full transition-all"
                                                        style={{
                                                            width: `${Math.max(intensity * 100, 2)}%`,
                                                            backgroundColor: `hsl(${hue}, 70%, 50%)`,
                                                        }}
                                                    />
                                                </div>
                                                <span className="text-xs text-gray-500 w-12 text-right">
                                                    {(intensity * 100).toFixed(0)}%
                                                </span>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    {heatmapData.length === 0 && (
                        <p className="text-center text-gray-400 py-8">Không có dữ liệu</p>
                    )}
                </div>
            </div>
        </div>
    );
}
