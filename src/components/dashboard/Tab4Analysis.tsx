"use client";

import { useState, useEffect } from "react";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, Legend,
} from "recharts";

interface Tab4Props {
    reportMonth: string;
    facilityId: string;
    apiPrefix?: string;
}

const formatCurrency = (value: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value);

const formatCompact = (value: number) =>
    new Intl.NumberFormat('vi-VN', { notation: "compact", compactDisplay: "short" }).format(value);

export default function Tab4Analysis({ reportMonth, facilityId, apiPrefix = "/api/admin/dashboard" }: Tab4Props) {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [compareId1, setCompareId1] = useState<string>("");
    const [compareId2, setCompareId2] = useState<string>("");
    const [comparisonData, setComparisonData] = useState<any>(null);
    const [compareLoading, setCompareLoading] = useState(false);
    const [abcFilter, setAbcFilter] = useState<string>("all");

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const params = new URLSearchParams();
                if (reportMonth && reportMonth !== "all") params.set("reportMonth", reportMonth);
                if (facilityId) params.set("facilityId", facilityId);
                const res = await fetch(`${apiPrefix}/analysis?${params}`);
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

    const fetchComparison = async () => {
        if (!compareId1 || !compareId2) return;
        setCompareLoading(true);
        try {
            const params = new URLSearchParams();
            if (reportMonth && reportMonth !== "all") params.set("reportMonth", reportMonth);
            if (facilityId) params.set("facilityId", facilityId);
            params.set("compareId1", compareId1);
            params.set("compareId2", compareId2);
            const res = await fetch(`${apiPrefix}/analysis?${params}`);
            const json = await res.json();
            setComparisonData(json.comparisonData);
        } catch (e) {
            console.error(e);
        } finally {
            setCompareLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-10 h-10 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
                    <p className="text-sm text-gray-500">Đang tải dữ liệu...</p>
                </div>
            </div>
        );
    }

    if (!data) return <p className="text-center text-red-500 py-8">Không thể tải dữ liệu</p>;

    const { abcData, abcSummary, specialDrugs, facilities } = data;

    const filteredAbcData = abcFilter === "all" ? abcData : abcData?.filter((d: any) => d.group === abcFilter);

    const groupColors: Record<string, string> = { A: "bg-red-100 text-red-700", B: "bg-amber-100 text-amber-700", C: "bg-green-100 text-green-700" };

    return (
        <div className="space-y-6">
            {/* ABC Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="rounded-xl shadow-lg bg-gradient-to-br from-red-500 to-rose-600 text-white p-5">
                    <p className="text-sm font-medium opacity-90">Nhóm A</p>
                    <p className="text-2xl font-bold mt-1">{abcSummary?.groupA || 0}</p>
                    <p className="text-xs opacity-75 mt-1">80% tổng giá trị sử dụng</p>
                </div>
                <div className="rounded-xl shadow-lg bg-gradient-to-br from-amber-500 to-orange-600 text-white p-5">
                    <p className="text-sm font-medium opacity-90">Nhóm B</p>
                    <p className="text-2xl font-bold mt-1">{abcSummary?.groupB || 0}</p>
                    <p className="text-xs opacity-75 mt-1">15% tổng giá trị sử dụng</p>
                </div>
                <div className="rounded-xl shadow-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white p-5">
                    <p className="text-sm font-medium opacity-90">Nhóm C</p>
                    <p className="text-2xl font-bold mt-1">{abcSummary?.groupC || 0}</p>
                    <p className="text-xs opacity-75 mt-1">5% tổng giá trị sử dụng</p>
                </div>
                <div className="rounded-xl shadow-lg bg-gradient-to-br from-purple-500 to-indigo-600 text-white p-5">
                    <p className="text-sm font-medium opacity-90">Tổng mặt hàng</p>
                    <p className="text-2xl font-bold mt-1">{abcSummary?.totalDrugs || 0}</p>
                    <p className="text-xs opacity-75 mt-1">Có giá trị sử dụng &gt; 0</p>
                </div>
            </div>

            {/* ABC Analysis Table */}
            <div className="bg-white rounded-xl shadow-lg p-5 border border-gray-100">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h3 className="font-semibold text-gray-800">Phân tích ABC</h3>
                        <p className="text-xs text-gray-500">Phân loại thuốc theo giá trị sử dụng</p>
                    </div>
                    <div className="flex gap-1">
                        {["all", "A", "B", "C"].map(g => (
                            <button
                                key={g}
                                onClick={() => setAbcFilter(g)}
                                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${abcFilter === g
                                    ? "bg-indigo-600 text-white"
                                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                    }`}
                            >
                                {g === "all" ? "Tất cả" : `Nhóm ${g}`}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                    <table className="w-full text-sm">
                        <thead className="sticky top-0">
                            <tr className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
                                <th className="text-left p-3 font-semibold rounded-tl-lg">#</th>
                                <th className="text-left p-3 font-semibold">Tên thuốc</th>
                                <th className="text-left p-3 font-semibold">Hoạt chất</th>
                                <th className="text-left p-3 font-semibold">Nhóm thuốc</th>
                                <th className="text-right p-3 font-semibold">Giá trị sử dụng</th>
                                <th className="text-right p-3 font-semibold">% Tích lũy</th>
                                <th className="text-center p-3 font-semibold">Nhóm</th>
                                <th className="text-center p-3 font-semibold rounded-tr-lg">Đặc biệt</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredAbcData?.map((d: any) => (
                                <tr key={d.rank} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                                    <td className="p-3 text-gray-500">{d.rank}</td>
                                    <td className="p-3 font-medium text-gray-800 max-w-[200px] truncate" title={d.drugName}>{d.drugName}</td>
                                    <td className="p-3 text-gray-600 max-w-[150px] truncate" title={d.hoatChat}>{d.hoatChat}</td>
                                    <td className="p-3 text-gray-600 text-xs">{d.nhomThuoc}</td>
                                    <td className="p-3 text-right font-mono text-gray-700">{formatCurrency(d.totalValue)}</td>
                                    <td className="p-3 text-right font-mono text-gray-500">{d.cumulativePercent}%</td>
                                    <td className="p-3 text-center">
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${groupColors[d.group] || ""}`}>
                                            {d.group}
                                        </span>
                                    </td>
                                    <td className="p-3 text-center">
                                        {(d.kiemSoatDacBiet?.toLowerCase().includes("có") || d.kiemSoatDacBiet === "true" || d.kiemSoatDacBiet === "1" || d.kiemSoatDacBiet === "x" || d.kiemSoatDacBiet === "X") && (
                                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-rose-100 text-rose-700">KSĐB</span>
                                        )}
                                        {(d.isKeDon?.toLowerCase().includes("có") || d.isKeDon === "true" || d.isKeDon === "1" || d.isKeDon === "x" || d.isKeDon === "X") && (
                                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 ml-1">KĐ</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {(!filteredAbcData || filteredAbcData.length === 0) && (
                        <p className="text-center text-gray-400 py-8">Không có dữ liệu</p>
                    )}
                </div>
            </div>

            {/* Special Drug Monitoring */}
            <div className="bg-white rounded-xl shadow-lg p-5 border border-gray-100">
                <div className="flex items-center gap-2 mb-1">
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-rose-100 text-rose-600 text-lg">🔒</span>
                    <h3 className="font-semibold text-gray-800">Giám sát thuốc kiểm soát đặc biệt</h3>
                </div>
                <p className="text-xs text-gray-500 mb-4 ml-9">Thuốc gây nghiện, hướng thần, tiền chất</p>
                <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
                    <table className="w-full text-sm">
                        <thead className="sticky top-0">
                            <tr className="bg-gradient-to-r from-rose-600 to-pink-600 text-white">
                                <th className="text-left p-3 font-semibold rounded-tl-lg">STT</th>
                                <th className="text-left p-3 font-semibold">Tên thuốc</th>
                                <th className="text-left p-3 font-semibold">Hoạt chất</th>
                                <th className="text-left p-3 font-semibold">Hàm lượng</th>
                                <th className="text-right p-3 font-semibold">Giá trị sử dụng</th>
                                <th className="text-center p-3 font-semibold rounded-tr-lg">Loại</th>
                            </tr>
                        </thead>
                        <tbody>
                            {specialDrugs?.map((d: any, i: number) => (
                                <tr key={i} className="border-b border-gray-50 hover:bg-rose-50/50 transition-colors">
                                    <td className="p-3 text-gray-500">{i + 1}</td>
                                    <td className="p-3 font-medium text-gray-800">{d.drugName}</td>
                                    <td className="p-3 text-gray-600">{d.hoatChat}</td>
                                    <td className="p-3 text-gray-600">{d.hamLuong}</td>
                                    <td className="p-3 text-right font-mono text-gray-700">{formatCurrency(d.totalValue)}</td>
                                    <td className="p-3 text-center">
                                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-rose-100 text-rose-700">KSĐB</span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {(!specialDrugs || specialDrugs.length === 0) && (
                        <p className="text-center text-gray-400 py-8">Không phát hiện thuốc kiểm soát đặc biệt</p>
                    )}
                </div>
            </div>

            {/* Facility Comparison */}
            <div className="bg-white rounded-xl shadow-lg p-5 border border-gray-100">
                <h3 className="font-semibold text-gray-800 mb-1">So sánh cơ cấu sử dụng thuốc</h3>
                <p className="text-xs text-gray-500 mb-4">Chọn 2 CSYT để so sánh</p>
                <div className="flex flex-wrap gap-3 mb-4">
                    <select
                        value={compareId1}
                        onChange={(e) => setCompareId1(e.target.value)}
                        className="flex-1 min-w-[200px] px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                    >
                        <option value="">-- Chọn CSYT thứ nhất --</option>
                        {facilities?.map((f: any) => (
                            <option key={f.id} value={f.id}>{f.name} {f.type ? `(${f.type})` : ""}</option>
                        ))}
                    </select>
                    <select
                        value={compareId2}
                        onChange={(e) => setCompareId2(e.target.value)}
                        className="flex-1 min-w-[200px] px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                    >
                        <option value="">-- Chọn CSYT thứ hai --</option>
                        {facilities?.map((f: any) => (
                            <option key={f.id} value={f.id}>{f.name} {f.type ? `(${f.type})` : ""}</option>
                        ))}
                    </select>
                    <button
                        onClick={fetchComparison}
                        disabled={!compareId1 || !compareId2 || compareLoading}
                        className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {compareLoading ? "Đang tải..." : "So sánh"}
                    </button>
                </div>

                {comparisonData && (
                    <div>
                        <div className="flex items-center justify-center gap-4 mb-4 text-sm">
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 rounded bg-indigo-500" />
                                <span className="font-medium">{comparisonData.facility1?.name}</span>
                            </div>
                            <span className="text-gray-400">vs</span>
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 rounded bg-emerald-500" />
                                <span className="font-medium">{comparisonData.facility2?.name}</span>
                            </div>
                        </div>
                        <div className="h-[400px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={comparisonData.chartData} margin={{ top: 10, right: 30, left: 10, bottom: 60 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                    <XAxis
                                        dataKey="nhomThuoc"
                                        angle={-35}
                                        textAnchor="end"
                                        height={80}
                                        tick={{ fontSize: 10, fill: "#64748b" }}
                                        interval={0}
                                    />
                                    <YAxis tick={{ fontSize: 11, fill: "#64748b" }} tickFormatter={formatCompact} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: "white", borderRadius: "10px", border: "1px solid #e2e8f0", boxShadow: "0 10px 25px -5px rgb(0 0 0 / 0.1)" }}
                                        formatter={((value: any) => [formatCurrency(Number(value))]) as any}
                                    />
                                    <Legend />
                                    <Bar dataKey="facility1" name={comparisonData.facility1?.name} fill="#6366f1" radius={[3, 3, 0, 0]} />
                                    <Bar dataKey="facility2" name={comparisonData.facility2?.name} fill="#10b981" radius={[3, 3, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                )}
                {!comparisonData && (
                    <div className="flex items-center justify-center h-48 bg-gray-50 rounded-lg border border-gray-200">
                        <p className="text-gray-400 text-sm">Chọn 2 CSYT và nhấn "So sánh" để xem biểu đồ</p>
                    </div>
                )}
            </div>
        </div>
    );
}
