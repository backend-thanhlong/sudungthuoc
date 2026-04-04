"use client";

import { useState, useEffect, useCallback } from "react";

interface ActivityLog {
    id: string;
    userId: string;
    action: string;
    entityType: string;
    entityId: string | null;
    details: string | null;
    createdAt: string;
    user: {
        id: string;
        username: string;
        facilityName: string | null;
        role: string;
    };
}

interface UserOption {
    id: string;
    username: string;
    facilityName: string | null;
    role: string;
}

const ACTION_LABELS: Record<string, string> = {
    LOGIN: "Đăng nhập",
    LOGOUT: "Đăng xuất",
    CREATE: "Tạo mới",
    UPDATE: "Cập nhật",
    DELETE: "Xóa",
    APPROVE: "Phê duyệt",
    REJECT: "Từ chối",
    EXPORT: "Xuất file",
    IMPORT: "Nhập file",
    SUBMIT: "Gửi",
};

const ENTITY_TYPE_LABELS: Record<string, string> = {
    user: "Người dùng",
    report: "Báo cáo tồn kho",
    mapping: "Ánh xạ thuốc",
    master_drug: "Danh mục thuốc",
    lcnt: "KH LCNT",
    goi_thau: "Gói thầu",
    tbmt: "Thông báo mời thầu",
    ket_qua: "Kết quả LCNT",
    report_period: "Kỳ báo cáo",
    notification: "Thông báo",
};

const ACTION_COLORS: Record<string, string> = {
    LOGIN: "bg-blue-100 text-blue-700",
    CREATE: "bg-green-100 text-green-700",
    UPDATE: "bg-yellow-100 text-yellow-700",
    DELETE: "bg-red-100 text-red-700",
    APPROVE: "bg-emerald-100 text-emerald-700",
    REJECT: "bg-red-100 text-red-700",
    EXPORT: "bg-purple-100 text-purple-700",
    IMPORT: "bg-indigo-100 text-indigo-700",
    SUBMIT: "bg-cyan-100 text-cyan-700",
};

export default function ActivityLogsPage() {
    const [logs, setLogs] = useState<ActivityLog[]>([]);
    const [users, setUsers] = useState<UserOption[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);

    // Filters
    const [filterUserId, setFilterUserId] = useState("");
    const [filterAction, setFilterAction] = useState("");
    const [filterEntityType, setFilterEntityType] = useState("");
    const [filterStartDate, setFilterStartDate] = useState("");
    const [filterEndDate, setFilterEndDate] = useState("");

    const fetchLogs = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            params.set("page", page.toString());
            params.set("limit", "30");
            if (filterUserId) params.set("userId", filterUserId);
            if (filterAction) params.set("action", filterAction);
            if (filterEntityType) params.set("entityType", filterEntityType);
            if (filterStartDate) params.set("startDate", filterStartDate);
            if (filterEndDate) params.set("endDate", filterEndDate);

            const res = await fetch(`/api/admin/activity-logs?${params.toString()}`);
            const data = await res.json();

            setLogs(data.logs || []);
            setUsers(data.users || []);
            setTotalPages(data.pagination?.totalPages || 1);
            setTotal(data.pagination?.total || 0);
        } catch (error) {
            console.error("Failed to fetch activity logs:", error);
        }
        setLoading(false);
    }, [page, filterUserId, filterAction, filterEntityType, filterStartDate, filterEndDate]);

    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    const handleResetFilters = () => {
        setFilterUserId("");
        setFilterAction("");
        setFilterEntityType("");
        setFilterStartDate("");
        setFilterEndDate("");
        setPage(1);
    };

    const formatDate = (dateStr: string) => {
        const d = new Date(dateStr);
        return d.toLocaleString("vi-VN", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
        });
    };

    const parseDetails = (details: string | null) => {
        if (!details) return null;
        try {
            return JSON.parse(details);
        } catch {
            return null;
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">📋 Nhật ký Hoạt động</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Theo dõi tất cả hoạt động trên hệ thống
                    </p>
                </div>
                <div className="text-sm text-gray-600 bg-white px-4 py-2 rounded-lg shadow-sm border">
                    Tổng: <span className="font-semibold text-blue-600">{total}</span> bản ghi
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl shadow-sm border p-4">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Người dùng</label>
                        <select
                            value={filterUserId}
                            onChange={(e) => { setFilterUserId(e.target.value); setPage(1); }}
                            className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="">Tất cả</option>
                            {users.map((u) => (
                                <option key={u.id} value={u.id}>
                                    {u.facilityName || u.username} ({u.role})
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Hành động</label>
                        <select
                            value={filterAction}
                            onChange={(e) => { setFilterAction(e.target.value); setPage(1); }}
                            className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="">Tất cả</option>
                            {Object.entries(ACTION_LABELS).map(([k, v]) => (
                                <option key={k} value={k}>{v}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Loại đối tượng</label>
                        <select
                            value={filterEntityType}
                            onChange={(e) => { setFilterEntityType(e.target.value); setPage(1); }}
                            className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="">Tất cả</option>
                            {Object.entries(ENTITY_TYPE_LABELS).map(([k, v]) => (
                                <option key={k} value={k}>{v}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Từ ngày</label>
                        <input
                            type="date"
                            value={filterStartDate}
                            onChange={(e) => { setFilterStartDate(e.target.value); setPage(1); }}
                            className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Đến ngày</label>
                        <div className="flex gap-2">
                            <input
                                type="date"
                                value={filterEndDate}
                                onChange={(e) => { setFilterEndDate(e.target.value); setPage(1); }}
                                className="flex-1 px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                            <button
                                onClick={handleResetFilters}
                                className="px-3 py-2 text-sm text-gray-600 hover:text-red-600 border rounded-lg hover:bg-red-50 transition-colors"
                                title="Xóa bộ lọc"
                            >
                                ✕
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        <span className="ml-3 text-gray-500">Đang tải...</span>
                    </div>
                ) : logs.length === 0 ? (
                    <div className="text-center py-20 text-gray-400">
                        <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <p className="font-medium">Chưa có nhật ký hoạt động</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-blue-600 text-white">
                                    <th className="px-4 py-3 text-left font-semibold">Thời gian</th>
                                    <th className="px-4 py-3 text-left font-semibold">Người dùng</th>
                                    <th className="px-4 py-3 text-left font-semibold">Hành động</th>
                                    <th className="px-4 py-3 text-left font-semibold">Đối tượng</th>
                                    <th className="px-4 py-3 text-left font-semibold">Chi tiết</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {logs.map((log) => {
                                    const details = parseDetails(log.details);
                                    return (
                                        <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-4 py-3 whitespace-nowrap text-gray-600">
                                                {formatDate(log.createdAt)}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-7 h-7 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                                                        {(log.user.facilityName || log.user.username)?.[0]?.toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-gray-900 text-xs">
                                                            {log.user.facilityName || log.user.username}
                                                        </p>
                                                        <p className="text-xs text-gray-400">{log.user.role}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${ACTION_COLORS[log.action] || "bg-gray-100 text-gray-600"}`}>
                                                    {ACTION_LABELS[log.action] || log.action}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-gray-600">
                                                {ENTITY_TYPE_LABELS[log.entityType] || log.entityType}
                                                {log.entityId && (
                                                    <span className="text-xs text-gray-400 ml-1">
                                                        ({log.entityId.slice(0, 8)}...)
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-gray-500 text-xs max-w-xs truncate">
                                                {details ? (
                                                    <span title={JSON.stringify(details, null, 2)}>
                                                        {Object.entries(details).slice(0, 3).map(([k, v]) => (
                                                            <span key={k} className="mr-2">
                                                                <span className="text-gray-400">{k}:</span>{" "}
                                                                <span className="text-gray-700">{String(v).slice(0, 30)}</span>
                                                            </span>
                                                        ))}
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-300">—</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50">
                        <p className="text-sm text-gray-600">
                            Trang {page}/{totalPages} — {total} bản ghi
                        </p>
                        <div className="flex gap-1">
                            <button
                                onClick={() => setPage(Math.max(1, page - 1))}
                                disabled={page <= 1}
                                className="px-3 py-1 text-sm border rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                ← Trước
                            </button>
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                const p = Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
                                if (p > totalPages) return null;
                                return (
                                    <button
                                        key={p}
                                        onClick={() => setPage(p)}
                                        className={`px-3 py-1 text-sm border rounded-lg transition-colors ${p === page
                                            ? "bg-blue-600 text-white border-blue-600"
                                            : "hover:bg-white"
                                            }`}
                                    >
                                        {p}
                                    </button>
                                );
                            })}
                            <button
                                onClick={() => setPage(Math.min(totalPages, page + 1))}
                                disabled={page >= totalPages}
                                className="px-3 py-1 text-sm border rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Sau →
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
