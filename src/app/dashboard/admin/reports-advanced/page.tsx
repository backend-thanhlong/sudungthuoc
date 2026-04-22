"use client";

import { useState, useEffect, useCallback } from "react";
import {
    BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, Legend,
} from "recharts";

// ========================= TAB 1: SO SÁNH CƠ SỞ =========================

function ComparisonTab() {
    const [drugName, setDrugName] = useState("");
    const [reportMonth, setReportMonth] = useState("");
    const [data, setData] = useState<any[]>([]);
    const [months, setMonths] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);

    const handleSearch = async () => {
        if (!drugName.trim()) return;
        setLoading(true);
        setSearched(true);
        try {
            const params = new URLSearchParams({ drugName: drugName.trim() });
            if (reportMonth) params.set("reportMonth", reportMonth);
            const res = await fetch(`/api/admin/reports/comparison?${params.toString()}`);
            const result = await res.json();
            setData(result.comparison || []);
            if (result.months?.length > 0 && months.length === 0) {
                setMonths(result.months);
            }
        } catch (error) {
            console.error("Failed to fetch comparison:", error);
        }
        setLoading(false);
    };

    // Fetch months on mount
    useEffect(() => {
        fetch("/api/admin/reports/comparison?drugName=_init_")
            .then(r => r.json())
            .then(d => { if (d.months) setMonths(d.months); })
            .catch(() => { });
    }, []);

    const formatCurrency = (value: number) =>
        new Intl.NumberFormat("vi-VN").format(Math.round(value));

    return (
        <div className="space-y-4">
            {/* Search */}
            <div className="flex flex-col md:flex-row gap-3">
                <div className="flex-1">
                    <input
                        type="text"
                        value={drugName}
                        onChange={(e) => setDrugName(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                        placeholder="Nhập tên thuốc để so sánh giữa các cơ sở..."
                        className="w-full px-4 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>
                <select
                    value={reportMonth}
                    onChange={(e) => setReportMonth(e.target.value)}
                    className="px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                >
                    <option value="">Tất cả các kỳ</option>
                    {months.map((m) => (
                        <option key={m} value={m}>{m}</option>
                    ))}
                </select>
                <button
                    onClick={handleSearch}
                    disabled={!drugName.trim() || loading}
                    className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium transition-colors"
                >
                    {loading ? "Đang tìm..." : "🔍 So sánh"}
                </button>
            </div>

            {/* Results */}
            {searched && !loading && data.length === 0 && (
                <div className="text-center py-12 text-gray-400">
                    <p className="text-lg">Không tìm thấy dữ liệu</p>
                    <p className="text-sm mt-1">Thử tìm kiếm với tên thuốc khác</p>
                </div>
            )}

            {data.length > 0 && (
                <>
                    {/* Chart */}
                    <div className="bg-gray-50 rounded-xl p-4">
                        <h3 className="text-sm font-semibold text-gray-700 mb-3">Biểu đồ so sánh tồn cuối</h3>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                <XAxis dataKey="facilityName" tick={{ fontSize: 11 }} angle={-15} textAnchor="end" height={60} />
                                <YAxis tick={{ fontSize: 11 }} />
                                <Tooltip formatter={(value: number | undefined) => formatCurrency(value ?? 0)} />
                                <Bar dataKey="tonCuoi" name="Tồn cuối" fill="#6366f1" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="nhap" name="Nhập" fill="#10b981" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="xuat" name="Xuất" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-blue-600 text-white">
                                    <th className="px-3 py-2.5 text-left font-semibold">Cơ sở</th>
                                    <th className="px-3 py-2.5 text-left font-semibold">Thuốc</th>
                                    <th className="px-3 py-2.5 text-right font-semibold">Tồn đầu</th>
                                    <th className="px-3 py-2.5 text-right font-semibold">Nhập</th>
                                    <th className="px-3 py-2.5 text-right font-semibold">Xuất</th>
                                    <th className="px-3 py-2.5 text-right font-semibold">Tồn cuối</th>
                                    <th className="px-3 py-2.5 text-right font-semibold">Giá VAT</th>
                                    <th className="px-3 py-2.5 text-right font-semibold">Thành tiền</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {data.map((row, i) => (
                                    <tr key={i} className="hover:bg-gray-50">
                                        <td className="px-3 py-2 font-medium">{row.facilityName}</td>
                                        <td className="px-3 py-2 text-gray-600">{row.drugName}</td>
                                        <td className="px-3 py-2 text-right">{formatCurrency(row.tonDau)}</td>
                                        <td className="px-3 py-2 text-right text-green-600">{formatCurrency(row.nhap)}</td>
                                        <td className="px-3 py-2 text-right text-orange-600">{formatCurrency(row.xuat)}</td>
                                        <td className="px-3 py-2 text-right font-semibold">{formatCurrency(row.tonCuoi)}</td>
                                        <td className="px-3 py-2 text-right">{formatCurrency(row.giaVat)}</td>
                                        <td className="px-3 py-2 text-right font-semibold text-blue-700">{formatCurrency(row.thanhTien)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </div>
    );
}

// ========================= TAB 2: XU HƯỚNG =========================

function TrendsTab() {
    const [facilityId, setFacilityId] = useState("");
    const [monthRange, setMonthRange] = useState("6");
    const [data, setData] = useState<any[]>([]);
    const [facilities, setFacilities] = useState<any[]>([]);
    const [summary, setSummary] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const fetchTrends = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ months: monthRange });
            if (facilityId) params.set("facilityId", facilityId);
            const res = await fetch(`/api/admin/reports/trends?${params.toString()}`);
            const result = await res.json();
            setData(result.trends || []);
            setFacilities(result.facilities || []);
            setSummary(result.summary || null);
        } catch (error) {
            console.error("Failed to fetch trends:", error);
        }
        setLoading(false);
    }, [facilityId, monthRange]);

    useEffect(() => {
        fetchTrends();
    }, [fetchTrends]);

    const formatCurrency = (value: number) =>
        new Intl.NumberFormat("vi-VN").format(Math.round(value));

    const formatCompact = (value: number) => {
        if (value >= 1e9) return `${(value / 1e9).toFixed(1)} tỷ`;
        if (value >= 1e6) return `${(value / 1e6).toFixed(1)} tr`;
        if (value >= 1e3) return `${(value / 1e3).toFixed(1)} k`;
        return value.toString();
    };

    return (
        <div className="space-y-4">
            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-3">
                <select
                    value={facilityId}
                    onChange={(e) => setFacilityId(e.target.value)}
                    className="px-3 py-2 border rounded-lg text-sm flex-1 focus:ring-2 focus:ring-blue-500"
                >
                    <option value="">Tất cả cơ sở</option>
                    {facilities.map((f: any) => (
                        <option key={f.id} value={f.id}>{f.facilityName || f.username}</option>
                    ))}
                </select>
                <select
                    value={monthRange}
                    onChange={(e) => setMonthRange(e.target.value)}
                    className="px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                >
                    <option value="3">3 tháng gần nhất</option>
                    <option value="6">6 tháng gần nhất</option>
                    <option value="12">12 tháng gần nhất</option>
                </select>
            </div>

            {/* Summary cards */}
            {summary && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
                        <p className="text-xs text-blue-600 font-medium">TB Nhập/tháng</p>
                        <p className="text-lg font-bold text-blue-900 mt-1">{formatCurrency(summary.avgImport)}</p>
                    </div>
                    <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl p-4 border border-emerald-100">
                        <p className="text-xs text-emerald-600 font-medium">TB Xuất/tháng</p>
                        <p className="text-lg font-bold text-emerald-900 mt-1">{formatCurrency(summary.avgExport)}</p>
                    </div>
                    <div className="bg-gradient-to-br from-purple-50 to-violet-50 rounded-xl p-4 border border-purple-100">
                        <p className="text-xs text-purple-600 font-medium">TB Giá trị tồn kho</p>
                        <p className="text-lg font-bold text-purple-900 mt-1">{formatCompact(summary.avgInventoryValue)}</p>
                    </div>
                    <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-4 border border-amber-100">
                        <p className="text-xs text-amber-600 font-medium">Xu hướng</p>
                        <p className="text-lg font-bold mt-1">
                            {summary.trend === "increasing"
                                ? <span className="text-red-600">📈 Tăng</span>
                                : summary.trend === "decreasing"
                                    ? <span className="text-green-600">📉 Giảm</span>
                                    : <span className="text-gray-600">➡️ Ổn định</span>
                            }
                        </p>
                    </div>
                </div>
            )}

            {loading ? (
                <div className="flex items-center justify-center py-16">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
            ) : data.length === 0 ? (
                <div className="text-center py-16 text-gray-400">Chưa có dữ liệu xu hướng</div>
            ) : (
                <>
                    {/* Nhập/Xuất Line chart */}
                    <div className="bg-gray-50 rounded-xl p-4">
                        <h3 className="text-sm font-semibold text-gray-700 mb-3">Biểu đồ Nhập - Xuất</h3>
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                                <YAxis tick={{ fontSize: 11 }} tickFormatter={formatCompact} />
                                <Tooltip formatter={(value: number | undefined) => formatCurrency(value ?? 0)} />
                                <Legend />
                                <Line type="monotone" dataKey="nhap" name="Nhập" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} />
                                <Line type="monotone" dataKey="xuat" name="Xuất" stroke="#f59e0b" strokeWidth={2} dot={{ r: 4 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Giá trị tồn kho Bar chart */}
                    <div className="bg-gray-50 rounded-xl p-4">
                        <h3 className="text-sm font-semibold text-gray-700 mb-3">Giá trị tồn kho theo tháng</h3>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                                <YAxis tick={{ fontSize: 11 }} tickFormatter={formatCompact} />
                                <Tooltip formatter={(value: number | undefined) => formatCurrency(value ?? 0)} />
                                <Bar dataKey="giaTriTonKho" name="Giá trị tồn kho" fill="#6366f1" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Data table */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-blue-600 text-white">
                                    <th className="px-3 py-2.5 text-left font-semibold">Tháng</th>
                                    <th className="px-3 py-2.5 text-right font-semibold">Số mặt hàng</th>
                                    <th className="px-3 py-2.5 text-right font-semibold">Tồn đầu</th>
                                    <th className="px-3 py-2.5 text-right font-semibold">Nhập</th>
                                    <th className="px-3 py-2.5 text-right font-semibold">Xuất</th>
                                    <th className="px-3 py-2.5 text-right font-semibold">Tồn cuối</th>
                                    <th className="px-3 py-2.5 text-right font-semibold">Giá trị tồn kho</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {data.map((row, i) => (
                                    <tr key={i} className="hover:bg-gray-50">
                                        <td className="px-3 py-2 font-medium">{row.month}</td>
                                        <td className="px-3 py-2 text-right">{formatCurrency(row.soMatHang)}</td>
                                        <td className="px-3 py-2 text-right">{formatCurrency(row.tonDau)}</td>
                                        <td className="px-3 py-2 text-right text-green-600">{formatCurrency(row.nhap)}</td>
                                        <td className="px-3 py-2 text-right text-orange-600">{formatCurrency(row.xuat)}</td>
                                        <td className="px-3 py-2 text-right font-semibold">{formatCurrency(row.tonCuoi)}</td>
                                        <td className="px-3 py-2 text-right font-semibold text-blue-700">{formatCompact(row.giaTriTonKho)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </div>
    );
}

// ========================= TAB 3: CẢNH BÁO TỒN KHO =========================

function AlertsTab() {
    const [reportMonth, setReportMonth] = useState("");
    const [filterSeverity, setFilterSeverity] = useState("");
    const [alerts, setAlerts] = useState<any[]>([]);
    const [months, setMonths] = useState<string[]>([]);
    const [summary, setSummary] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const fetchAlerts = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (reportMonth) params.set("reportMonth", reportMonth);
            if (filterSeverity) params.set("severity", filterSeverity);
            const res = await fetch(`/api/admin/reports/alerts?${params.toString()}`);
            const result = await res.json();
            setAlerts(result.alerts || []);
            setMonths(result.months || []);
            setSummary(result.summary || null);
        } catch (error) {
            console.error("Failed to fetch alerts:", error);
        }
        setLoading(false);
    }, [reportMonth, filterSeverity]);

    useEffect(() => {
        fetchAlerts();
    }, [fetchAlerts]);

    const ALERT_TYPE_LABELS: Record<string, string> = {
        BALANCE_MISMATCH: "Chênh lệch tồn kho",
        HIGH_INVENTORY: "Tồn kho cao bất thường",
        ZERO_INVENTORY: "Hết hàng bất thường",
        HIGH_VALUE: "Giá trị tồn kho cao",
    };

    const ALERT_TYPE_ICONS: Record<string, string> = {
        BALANCE_MISMATCH: "⚠️",
        HIGH_INVENTORY: "📦",
        ZERO_INVENTORY: "🚫",
        HIGH_VALUE: "💰",
    };

    return (
        <div className="space-y-4">
            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-3">
                <select
                    value={reportMonth}
                    onChange={(e) => setReportMonth(e.target.value)}
                    className="px-3 py-2 border rounded-lg text-sm flex-1 focus:ring-2 focus:ring-blue-500"
                >
                    <option value="">Tất cả các kỳ</option>
                    {months.map((m) => (
                        <option key={m} value={m}>{m}</option>
                    ))}
                </select>
                <select
                    value={filterSeverity}
                    onChange={(e) => setFilterSeverity(e.target.value)}
                    className="px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                >
                    <option value="">Tất cả mức độ</option>
                    <option value="danger">🔴 Nghiêm trọng</option>
                    <option value="warning">🟡 Cảnh báo</option>
                </select>
            </div>

            {/* Summary cards */}
            {summary && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-4 border border-red-200">
                        <p className="text-xs text-red-600 font-medium">Tổng cảnh báo</p>
                        <p className="text-2xl font-bold text-red-800 mt-1">{summary.totalAlerts}</p>
                    </div>
                    <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-xl p-4 border border-red-100">
                        <p className="text-xs text-red-600 font-medium">🔴 Nghiêm trọng</p>
                        <p className="text-2xl font-bold text-red-800 mt-1">{summary.dangerCount}</p>
                    </div>
                    <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-xl p-4 border border-amber-100">
                        <p className="text-xs text-amber-600 font-medium">🟡 Cảnh báo</p>
                        <p className="text-2xl font-bold text-amber-800 mt-1">{summary.warningCount}</p>
                    </div>
                    <div className="bg-white rounded-xl p-4 border">
                        <p className="text-xs text-gray-500 font-medium">Phân loại</p>
                        <div className="mt-1 space-y-0.5 text-xs">
                            {summary.byType && Object.entries(summary.byType).map(([type, count]) => (
                                <div key={type} className="flex justify-between">
                                    <span className="text-gray-600">{ALERT_TYPE_LABELS[type] || type}</span>
                                    <span className="font-semibold">{count as number}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Alerts list */}
            {loading ? (
                <div className="flex items-center justify-center py-16">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
                </div>
            ) : alerts.length === 0 ? (
                <div className="text-center py-16">
                    <div className="text-5xl mb-4">✅</div>
                    <p className="text-gray-600 font-medium">Không phát hiện cảnh báo bất thường</p>
                    <p className="text-sm text-gray-400 mt-1">Dữ liệu tồn kho đang ổn định</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {alerts.map((alert) => (
                        <div
                            key={alert.id}
                            className={`rounded-xl border p-4 transition-colors ${alert.severity === "danger"
                                ? "bg-red-50 border-red-200 hover:bg-red-100"
                                : "bg-amber-50 border-amber-200 hover:bg-amber-100"
                                }`}
                        >
                            <div className="flex items-start gap-3">
                                <span className="text-xl mt-0.5">
                                    {ALERT_TYPE_ICONS[alert.type] || "⚠️"}
                                </span>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${alert.severity === "danger"
                                            ? "bg-red-200 text-red-800"
                                            : "bg-amber-200 text-amber-800"
                                            }`}>
                                            {alert.severity === "danger" ? "Nghiêm trọng" : "Cảnh báo"}
                                        </span>
                                        <span className="text-xs text-gray-500 bg-white px-2 py-0.5 rounded-full">
                                            {ALERT_TYPE_LABELS[alert.type] || alert.type}
                                        </span>
                                        <span className="text-xs text-gray-400">
                                            {alert.reportMonth}
                                        </span>
                                    </div>
                                    <p className="font-medium text-gray-900 mt-1">
                                        {alert.facilityName} — {alert.drugName}
                                    </p>
                                    <p className="text-sm text-gray-600 mt-0.5">{alert.message}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ========================= MAIN PAGE =========================

export default function AdvancedReportsPage() {
    const [activeTab, setActiveTab] = useState(0);

    const tabs = [
        { label: "📊 So sánh cơ sở", component: <ComparisonTab /> },
        { label: "📈 Xu hướng", component: <TrendsTab /> },
        { label: "🚨 Cảnh báo tồn kho", component: <AlertsTab /> },
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900">📊 Báo cáo Nâng cao</h1>
                <p className="text-sm text-gray-500 mt-1">
                    So sánh liên cơ sở, phân tích xu hướng, và phát hiện bất thường tồn kho
                </p>
            </div>

            {/* Tabs */}
            <div className="bg-white rounded-xl shadow-sm border">
                <div className="flex border-b">
                    {tabs.map((tab, i) => (
                        <button
                            key={i}
                            onClick={() => setActiveTab(i)}
                            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors relative ${activeTab === i
                                ? "text-blue-700 bg-blue-50/50"
                                : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                                }`}
                        >
                            {tab.label}
                            {activeTab === i && (
                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
                            )}
                        </button>
                    ))}
                </div>
                <div className="p-6">
                    {tabs[activeTab].component}
                </div>
            </div>
        </div>
    );
}
