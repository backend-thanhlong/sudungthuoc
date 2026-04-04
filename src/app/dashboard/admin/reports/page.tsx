"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, CheckCircle2, XCircle, Clock, Trash2 } from "lucide-react";

const DETAIL_PAGE_SIZE = 50;

export default function AdminReportsPage() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [reports, setReports] = useState<any[]>([]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [filteredReports, setFilteredReports] = useState<any[]>([]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [notSubmitted, setNotSubmitted] = useState<any[]>([]);
    const [summary, setSummary] = useState({ totalReports: 0, uniqueFacilities: 0, totalImport: 0, totalExport: 0 });
    const [isLoading, setIsLoading] = useState(true);
    const [isExporting, setIsExporting] = useState(false);

    // Filters
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [periods, setPeriods] = useState<any[]>([]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [facilities, setFacilities] = useState<any[]>([]);
    const [selectedMonth, setSelectedMonth] = useState<string>("all");
    const [selectedFacility, setSelectedFacility] = useState<string>("all");

    // Selection for bulk actions
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    // Detail/Review state
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [selectedReport, setSelectedReport] = useState<any>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [detailData, setDetailData] = useState<any[]>([]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [reviewLog, setReviewLog] = useState<any[]>([]);
    const [isDetailLoading, setIsDetailLoading] = useState(false);
    const [isReviewLogLoading, setIsReviewLogLoading] = useState(false);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [detailPage, setDetailPage] = useState(1);
    const [detailTotal, setDetailTotal] = useState(0);
    const [detailTotalPages, setDetailTotalPages] = useState(1);

    // Bulk reject note dialog
    const [bulkAction, setBulkAction] = useState<"APPROVED" | "REJECTED" | null>(null);
    const [bulkNote, setBulkNote] = useState("");
    const [isBulkLoading, setIsBulkLoading] = useState(false);

    const fetchReports = async (month?: string) => {
        try {
            const url = month && month !== "all" ? `/api/admin/reports?month=${encodeURIComponent(month)}` : "/api/admin/reports";
            const res = await fetch(url);
            if (res.ok) {
                const data = await res.json();
                setReports(data.reports || []);
                setSummary(data.summary || { totalReports: 0, uniqueFacilities: 0, totalImport: 0, totalExport: 0 });
                setNotSubmitted(data.notSubmitted || []);

                const facilityMap = new Map<string, string>();
                (data.reports || []).forEach((r: { facilityId: string; facilityName: string }) => {
                    if (!facilityMap.has(r.facilityId)) facilityMap.set(r.facilityId, r.facilityName);
                });
                setFacilities(Array.from(facilityMap.entries()).map(([id, name]) => ({ id, name })));
            }
        } catch (error) {
            console.error("Error fetching reports:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchPeriods = async () => {
        try {
            const res = await fetch("/api/admin/report-periods");
            if (res.ok) {
                const data = await res.json();
                setPeriods(data);
            }
        } catch (error) {
            console.error("Error fetching periods:", error);
        }
    };

    useEffect(() => {
        let filtered = [...reports];
        if (selectedMonth !== "all") filtered = filtered.filter(r => r.month === selectedMonth);
        if (selectedFacility !== "all") filtered = filtered.filter(r => r.facilityId === selectedFacility);
        setFilteredReports(filtered);
        setSummary({
            totalReports: filtered.length,
            uniqueFacilities: new Set(filtered.map(r => r.facilityId)).size,
            totalImport: filtered.reduce((acc, curr) => acc + (Number(curr.totalImport) || 0), 0),
            totalExport: filtered.reduce((acc, curr) => acc + (Number(curr.totalExport) || 0), 0),
        });
        setSelectedIds(new Set());
    }, [reports, selectedMonth, selectedFacility]);

    useEffect(() => {
        fetchReports(selectedMonth !== "all" ? selectedMonth : undefined);
    }, [selectedMonth]);

    useEffect(() => {
        fetchReports();
        fetchPeriods();
    }, []);

    const handleExportExcel = async (mode: "summary" | "detail" = "summary") => {
        setIsExporting(true);
        try {
            const params = new URLSearchParams();
            if (selectedMonth !== "all") params.set("month", selectedMonth);
            if (selectedFacility !== "all") params.set("facilityId", selectedFacility);
            params.set("mode", mode);
            const res = await fetch(`/api/admin/reports/export?${params.toString()}`);
            if (res.ok) {
                const blob = await res.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                const contentDisposition = res.headers.get("Content-Disposition");
                let fileName = mode === "detail" ? "Bao_Cao_ChiTiet.xlsx" : "Bao_Cao_TongHop.xlsx";
                if (contentDisposition) {
                    const match = contentDisposition.match(/filename="?(.+?)"?$/);
                    if (match) fileName = decodeURIComponent(match[1]);
                }
                a.download = fileName;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
                toast.success(mode === "detail" ? "Đã xuất file Excel chi tiết (mỗi cơ sở 1 sheet)!" : "Đã xuất file Excel tổng hợp!");
            } else {
                const err = await res.json().catch(() => ({}));
                toast.error(err.message || "Lỗi khi xuất Excel");
            }
        } catch {
            toast.error("Lỗi kết nối khi xuất Excel");
        } finally {
            setIsExporting(false);
        }
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleReview = async (report: any, status: "APPROVED" | "REJECTED") => {
        let note = "";
        if (status === "REJECTED") {
            const reason = window.prompt("Nhập lý do từ chối:");
            if (reason === null) return;
            note = reason;
        }
        try {
            const res = await fetch("/api/admin/reports/review", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ facilityId: report.facilityId, month: report.month, status, adminNote: note }),
            });
            if (res.ok) {
                toast.success(`Đã ${status === "APPROVED" ? "duyệt" : "từ chối"} báo cáo`);
                fetchReports(selectedMonth !== "all" ? selectedMonth : undefined);
            } else {
                toast.error("Đã xảy ra lỗi");
            }
        } catch {
            toast.error("Lỗi kết nối");
        }
    };

    const handleBulkAction = async () => {
        if (!bulkAction || selectedIds.size === 0) return;
        setIsBulkLoading(true);
        try {
            const items = filteredReports
                .filter(r => selectedIds.has(r.id))
                .map(r => ({ facilityId: r.facilityId, month: r.month }));
            const res = await fetch("/api/admin/reports/review", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ items, status: bulkAction, adminNote: bulkNote }),
            });
            const data = await res.json();
            if (res.ok) {
                toast.success(data.message);
                setBulkAction(null);
                setBulkNote("");
                setSelectedIds(new Set());
                fetchReports(selectedMonth !== "all" ? selectedMonth : undefined);
            } else {
                toast.error(data.message || "Đã xảy ra lỗi");
            }
        } catch {
            toast.error("Lỗi kết nối");
        } finally {
            setIsBulkLoading(false);
        }
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleDelete = async (report: any) => {
        if (!confirm(`Bạn có chắc chắn muốn xóa toàn bộ dữ liệu báo cáo tháng ${report.month} của ${report.facilityName}?\nHành động này không thể hoàn tác!`)) return;
        try {
            const res = await fetch("/api/admin/reports", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ facilityId: report.facilityId, month: report.month }),
            });
            const data = await res.json();
            if (res.ok) {
                toast.success(data.message);
                fetchReports(selectedMonth !== "all" ? selectedMonth : undefined);
            } else {
                toast.error(data.message || "Không thể xóa báo cáo");
            }
        } catch {
            toast.error("Lỗi kết nối");
        }
    };

    const handleBulkDelete = async () => {
        const count = selectedIds.size;
        if (!confirm(`Bạn có chắc chắn muốn xóa ${count} báo cáo đã chọn?\nHành động này không thể hoàn tác!`)) return;
        try {
            const items = filteredReports
                .filter(r => selectedIds.has(r.id))
                .map(r => ({ facilityId: r.facilityId, month: r.month }));
            const res = await fetch("/api/admin/reports", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ items }),
            });
            const data = await res.json();
            if (res.ok) {
                toast.success(data.message);
                setSelectedIds(new Set());
                fetchReports(selectedMonth !== "all" ? selectedMonth : undefined);
            } else {
                toast.error(data.message || "Không thể xóa báo cáo");
            }
        } catch {
            toast.error("Lỗi kết nối");
        }
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fetchDetailPage = async (report: any, page: number) => {
        setIsDetailLoading(true);
        try {
            const params = new URLSearchParams({
                facilityId: report.facilityId,
                month: report.month,
                page: page.toString(),
                limit: DETAIL_PAGE_SIZE.toString(),
            });
            const res = await fetch(`/api/admin/reports/detail?${params.toString()}`);
            if (!res.ok) {
                toast.error("Không thể tải dữ liệu chi tiết");
                return;
            }

            const data = await res.json();
            setDetailData(data.items || []);
            setDetailPage(data.pagination?.page || page);
            setDetailTotal(data.pagination?.total || 0);
            setDetailTotalPages(data.pagination?.totalPages || 1);
        } catch {
            toast.error("Lỗi kết nối");
        } finally {
            setIsDetailLoading(false);
        }
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fetchReviewLog = async (report: any) => {
        setIsReviewLogLoading(true);
        try {
            const res = await fetch(`/api/admin/reports/review-log?facilityId=${report.facilityId}&month=${encodeURIComponent(report.month)}`);
            if (!res.ok) {
                toast.error("Không thể tải lịch sử duyệt");
                return;
            }

            setReviewLog(await res.json());
        } catch {
            toast.error("Lỗi kết nối");
        } finally {
            setIsReviewLogLoading(false);
        }
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleViewDetails = (report: any) => {
        setSelectedReport(report);
        setIsDetailOpen(true);
        setDetailData([]);
        setReviewLog([]);
        setDetailPage(1);
        setDetailTotal(0);
        setDetailTotalPages(1);
        void fetchDetailPage(report, 1);
        void fetchReviewLog(report);
    };

    const handleDetailPageChange = (page: number) => {
        if (!selectedReport || page < 1 || page > detailTotalPages || page === detailPage) return;
        void fetchDetailPage(selectedReport, page);
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "APPROVED": return <Badge className="bg-emerald-100 text-emerald-700 border-0">Đã duyệt</Badge>;
            case "REJECTED": return <Badge className="bg-red-100 text-red-700 border-0">Từ chối</Badge>;
            default: return <Badge className="bg-blue-100 text-blue-700 border-0">Chờ duyệt</Badge>;
        }
    };

    // Compute submission progress
    const totalFacilities = facilities.length + notSubmitted.length;
    const submittedCount = filteredReports.length > 0 && selectedMonth !== "all"
        ? new Set(filteredReports.filter(r => r.month === selectedMonth).map(r => r.facilityId)).size
        : 0;
    const showProgress = selectedMonth !== "all" && totalFacilities > 0;

    const toggleSelect = (id: string) => {
        const next = new Set(selectedIds);
        if (next.has(id)) next.delete(id); else next.add(id);
        setSelectedIds(next);
    };
    const toggleSelectAll = () => {
        if (selectedIds.size === filteredReports.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredReports.map(r => r.id)));
        }
    };

    const detailRangeStart = detailTotal === 0 ? 0 : (detailPage - 1) * DETAIL_PAGE_SIZE + 1;
    const detailRangeEnd = detailTotal === 0 ? 0 : Math.min(detailTotal, (detailPage - 1) * DETAIL_PAGE_SIZE + detailData.length);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold text-gray-800">Báo cáo tổng hợp</h2>
                    <p className="text-gray-500 mt-1">Tổng hợp dữ liệu tồn kho/sử dụng từ các cơ sở</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        onClick={() => handleExportExcel("summary")}
                        disabled={isExporting || filteredReports.length === 0}
                        variant="outline"
                        className="border-green-600 text-green-700 hover:bg-green-50"
                        title="Xuất 1 sheet tổng hợp tất cả cơ sở">
                        {isExporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
                        Xuất tổng hợp
                    </Button>
                    <Button
                        onClick={() => handleExportExcel("detail")}
                        disabled={isExporting || filteredReports.length === 0}
                        className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg"
                        title="Xuất nhiều sheet – mỗi cơ sở/tháng là 1 sheet riêng">
                        {isExporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
                        Xuất chi tiết
                    </Button>
                </div>
            </div>

            {/* Filters */}
            <Card className="border-0 shadow-lg">
                <CardContent className="pt-6">
                    <div className="flex items-center gap-4 flex-wrap">
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-600 whitespace-nowrap">Kỳ báo cáo:</span>
                            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                                <SelectTrigger className="w-[180px]"><SelectValue placeholder="Tất cả" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Tất cả</SelectItem>
                                    {periods.map((p) => (
                                        <SelectItem key={p.id} value={p.month}>{p.month}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-600 whitespace-nowrap">Cơ sở:</span>
                            <Select value={selectedFacility} onValueChange={setSelectedFacility}>
                                <SelectTrigger className="w-[250px]"><SelectValue placeholder="Tất cả" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Tất cả cơ sở</SelectItem>
                                    {facilities.map((f) => (
                                        <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        {(selectedMonth !== "all" || selectedFacility !== "all") && (
                            <Button variant="ghost" size="sm" onClick={() => { setSelectedMonth("all"); setSelectedFacility("all"); }} className="text-gray-500">
                                Xóa bộ lọc
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Progress bar tỷ lệ nộp */}
            {showProgress && (
                <Card className="border-0 shadow-lg">
                    <CardContent className="pt-5 pb-5">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-700">Tỷ lệ nộp báo cáo tháng {selectedMonth}</span>
                            <span className="text-sm font-bold text-gray-800">{submittedCount} / {totalFacilities} cơ sở</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-3">
                            <div
                                className="bg-gradient-to-r from-emerald-400 to-emerald-600 h-3 rounded-full transition-all duration-700"
                                style={{ width: totalFacilities > 0 ? `${(submittedCount / totalFacilities) * 100}%` : "0%" }}
                            />
                        </div>
                        {notSubmitted.length > 0 && (
                            <div className="mt-3">
                                <p className="text-xs font-medium text-orange-600 mb-1.5">Chưa nộp ({notSubmitted.length} cơ sở):</p>
                                <div className="flex flex-wrap gap-1.5">
                                    {notSubmitted.map(f => (
                                        <Badge key={f.id} className="bg-orange-100 text-orange-700 border-0 text-xs">{f.facilityName}</Badge>
                                    ))}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card className="border-0 shadow-lg border-l-4 border-l-blue-500"><CardContent className="pt-6">
                    <div className="text-3xl font-bold text-blue-600">{summary.totalReports}</div>
                    <p className="text-gray-500">Tổng số báo cáo nộp</p>
                </CardContent></Card>
                <Card className="border-0 shadow-lg border-l-4 border-l-emerald-500"><CardContent className="pt-6">
                    <div className="text-3xl font-bold text-emerald-600">{summary.uniqueFacilities}</div>
                    <p className="text-gray-500">Cơ sở đã nộp</p>
                </CardContent></Card>
                <Card className="border-0 shadow-lg border-l-4 border-l-amber-500"><CardContent className="pt-6">
                    <div className="text-3xl font-bold text-amber-600">{new Intl.NumberFormat("vi-VN").format(summary.totalImport)}</div>
                    <p className="text-gray-500">Tổng tiền nhập trong kỳ</p>
                </CardContent></Card>
                <Card className="border-0 shadow-lg border-l-4 border-l-red-500"><CardContent className="pt-6">
                    <div className="text-3xl font-bold text-red-600">{new Intl.NumberFormat("vi-VN").format(summary.totalExport)}</div>
                    <p className="text-gray-500">Tổng tiền xuất trong kỳ</p>
                </CardContent></Card>
            </div>

            {/* Bulk action bar */}
            {selectedIds.size > 0 && (
                <Card className="border-0 shadow-lg bg-blue-50 border border-blue-200">
                    <CardContent className="py-3 flex items-center gap-3 flex-wrap">
                        <span className="text-sm font-medium text-blue-800">Đã chọn {selectedIds.size} báo cáo</span>
                        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white"
                            onClick={() => setBulkAction("APPROVED")}>
                            <CheckCircle2 className="w-4 h-4 mr-1" /> Duyệt tất cả đã chọn
                        </Button>
                        <Button size="sm" variant="outline" className="border-red-300 text-red-600 hover:bg-red-50"
                            onClick={() => setBulkAction("REJECTED")}>
                            <XCircle className="w-4 h-4 mr-1" /> Từ chối tất cả đã chọn
                        </Button>
                        <Button size="sm" variant="outline" className="border-red-500 text-red-700 hover:bg-red-50 font-semibold"
                            onClick={handleBulkDelete}>
                            <Trash2 className="w-4 h-4 mr-1" /> Xóa tất cả đã chọn
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>Bỏ chọn</Button>
                    </CardContent>
                </Card>
            )}

            {/* Reports Table */}
            <Card className="border-0 shadow-lg">
                <CardHeader>
                    <CardTitle>Dữ liệu báo cáo</CardTitle>
                    <CardDescription>
                        {filteredReports.length === reports.length
                            ? "Danh sách báo cáo"
                            : `Hiển thị ${filteredReports.length} / ${reports.length} báo cáo`}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-gray-400" /></div>
                    ) : filteredReports.length === 0 ? (
                        <div className="text-center text-gray-500 py-16">
                            <p className="text-lg font-medium text-gray-600 mb-2">Chưa có dữ liệu báo cáo</p>
                            <p className="text-gray-400">{selectedMonth !== "all" || selectedFacility !== "all" ? "Không có báo cáo phù hợp bộ lọc" : "Dữ liệu sẽ hiển thị khi các cơ sở nộp báo cáo"}</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-10">
                                        <input type="checkbox" className="rounded"
                                            checked={selectedIds.size === filteredReports.length && filteredReports.length > 0}
                                            onChange={toggleSelectAll} />
                                    </TableHead>
                                    <TableHead>Cơ sở Y tế</TableHead>
                                    <TableHead>Tháng báo cáo</TableHead>
                                    <TableHead>Số thuốc</TableHead>
                                    <TableHead>Tiền nhập</TableHead>
                                    <TableHead>Tiền xuất</TableHead>
                                    <TableHead>Ngày nộp</TableHead>
                                    <TableHead>Trạng thái</TableHead>
                                    <TableHead className="text-right">Thao tác</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredReports.map((report) => (
                                    <TableRow key={report.id} className={selectedIds.has(report.id) ? "bg-blue-50" : ""}>
                                        <TableCell>
                                            <input type="checkbox" className="rounded"
                                                checked={selectedIds.has(report.id)}
                                                onChange={() => toggleSelect(report.id)} />
                                        </TableCell>
                                        <TableCell className="font-medium">{report.facilityName}</TableCell>
                                        <TableCell>{report.month}</TableCell>
                                        <TableCell>{report.drugCount}</TableCell>
                                        <TableCell className="text-blue-600 font-medium">{new Intl.NumberFormat("vi-VN").format(report.totalImport)}</TableCell>
                                        <TableCell className="text-red-600 font-medium">{new Intl.NumberFormat("vi-VN").format(report.totalExport)}</TableCell>
                                        <TableCell className="text-gray-500 text-sm">{new Date(report.lastUpdated).toLocaleDateString("vi-VN")}</TableCell>
                                        <TableCell>
                                            {getStatusBadge(report.status)}
                                            {report.adminNote && (
                                                <p className="text-xs text-red-500 mt-1 max-w-[150px] truncate" title={report.adminNote}>
                                                    Lý do: {report.adminNote}
                                                </p>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right space-x-2">
                                            <Button size="sm" variant="outline" onClick={() => handleViewDetails(report)}>Xem</Button>
                                            {report.status !== "APPROVED" && (
                                                <>
                                                    <Button size="sm" variant="outline" className="text-emerald-600 border-emerald-200 hover:bg-emerald-50" onClick={() => handleReview(report, "APPROVED")}>Duyệt</Button>
                                                    <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => handleReview(report, "REJECTED")}>Từ chối</Button>
                                                </>
                                            )}
                                            <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => handleDelete(report)}>
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* Bulk Action Dialog */}
            <Dialog open={bulkAction !== null} onOpenChange={() => { setBulkAction(null); setBulkNote(""); }}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>{bulkAction === "APPROVED" ? "Duyệt" : "Từ chối"} {selectedIds.size} báo cáo</DialogTitle>
                        <DialogDescription>
                            {bulkAction === "REJECTED" ? "Nhập lý do từ chối (áp dụng cho tất cả báo cáo đã chọn)." : "Xác nhận duyệt tất cả báo cáo đã chọn?"}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        {bulkAction === "REJECTED" && (
                            <textarea
                                className="w-full border rounded-md p-3 text-sm min-h-[80px] focus:outline-none focus:ring-2 focus:ring-blue-300"
                                placeholder="Lý do từ chối..."
                                value={bulkNote}
                                onChange={e => setBulkNote(e.target.value)}
                            />
                        )}
                        <div className="flex gap-2 justify-end">
                            <Button variant="ghost" onClick={() => { setBulkAction(null); setBulkNote(""); }}>Hủy</Button>
                            <Button
                                className={bulkAction === "APPROVED" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700"}
                                onClick={handleBulkAction}
                                disabled={isBulkLoading || (bulkAction === "REJECTED" && !bulkNote.trim())}
                            >
                                {isBulkLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                                Xác nhận
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Detail Dialog */}
            <Dialog
                open={isDetailOpen}
                onOpenChange={(open) => {
                    setIsDetailOpen(open);
                    if (!open) {
                        setSelectedReport(null);
                        setDetailData([]);
                        setReviewLog([]);
                        setIsDetailLoading(false);
                        setIsReviewLogLoading(false);
                        setDetailPage(1);
                        setDetailTotal(0);
                        setDetailTotalPages(1);
                    }
                }}
            >
                <DialogContent className="max-w-[90vw] sm:max-w-[90vw] w-[90vw] h-[90vh] flex flex-col p-0">
                    <DialogHeader className="p-6 pb-2">
                        <DialogTitle>Chi tiết báo cáo - {selectedReport?.facilityName}</DialogTitle>
                        <DialogDescription>
                            Tháng báo cáo: {selectedReport?.month} | Tổng số thuốc: {selectedReport?.drugCount}
                        </DialogDescription>
                    </DialogHeader>

                    <Tabs defaultValue="detail" className="flex-1 flex flex-col overflow-hidden px-6 pb-6">
                        <TabsList className="w-fit mb-3">
                            <TabsTrigger value="detail">Dữ liệu báo cáo</TabsTrigger>
                            <TabsTrigger value="log">
                                Lịch sử duyệt {reviewLog.length > 0 && <Badge className="ml-1 bg-gray-200 text-gray-700 border-0">{reviewLog.length}</Badge>}
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="detail" className="flex-1 overflow-hidden mt-0">
                            {isDetailLoading ? (
                                <div className="flex items-center justify-center h-48"><Loader2 className="w-8 h-8 animate-spin text-gray-400" /></div>
                            ) : detailData.length === 0 ? (
                                <div className="flex items-center justify-center h-48 text-gray-500">
                                    Không có dữ liệu chi tiết
                                </div>
                            ) : (
                                <div className="flex h-full flex-col gap-3">
                                    {detailTotalPages > 1 && (
                                        <div className="flex items-center justify-between text-sm text-gray-600">
                                            <span>Hiển thị {detailRangeStart}-{detailRangeEnd} / {detailTotal} dòng</span>
                                            <span>Trang {detailPage} / {detailTotalPages}</span>
                                        </div>
                                    )}

                                    <div className="overflow-auto flex-1">
                                        <table className="text-xs border-collapse w-max min-w-full">
                                            <thead className="sticky top-0 bg-white z-10">
                                                <tr className="border-b border-gray-200">
                                                    <th className="px-2 py-2 text-left font-medium text-gray-500 w-8 whitespace-nowrap">STT</th>
                                                    {/* Thuốc nội bộ */}
                                                    <th className="px-2 py-2 text-left font-medium text-gray-500 w-[90px] whitespace-nowrap bg-orange-50">Mã nội bộ</th>
                                                    <th className="px-2 py-2 text-left font-medium text-gray-500 w-[160px] bg-orange-50">Tên thuốc (nội bộ)</th>
                                                    <th className="px-2 py-2 text-left font-medium text-gray-500 w-[130px] bg-orange-50">Hoạt chất (nội bộ)</th>
                                                    <th className="px-2 py-2 text-left font-medium text-gray-500 w-[100px] whitespace-nowrap bg-orange-50">SĐK nội bộ</th>
                                                    <th className="px-2 py-2 text-left font-medium text-gray-500 w-[70px] whitespace-nowrap bg-orange-50">ĐVT NB</th>
                                                    {/* Danh mục chung */}
                                                    <th className="px-2 py-2 text-left font-medium text-gray-500 w-[80px] whitespace-nowrap bg-blue-50">Mã chung</th>
                                                    <th className="px-2 py-2 text-left font-medium text-gray-500 w-[80px] whitespace-nowrap bg-blue-50">Mã BHYT</th>
                                                    <th className="px-2 py-2 text-left font-medium text-gray-500 w-[160px] bg-blue-50">Tên thuốc (DM)</th>
                                                    <th className="px-2 py-2 text-left font-medium text-gray-500 w-[130px] bg-blue-50">Hoạt chất</th>
                                                    <th className="px-2 py-2 text-left font-medium text-gray-500 w-[100px] bg-blue-50">Hàm lượng</th>
                                                    <th className="px-2 py-2 text-left font-medium text-gray-500 w-[110px] bg-blue-50">Dạng bào chế</th>
                                                    <th className="px-2 py-2 text-left font-medium text-gray-500 w-[100px] bg-blue-50">Số đăng ký</th>
                                                    <th className="px-2 py-2 text-left font-medium text-gray-500 w-[65px] whitespace-nowrap bg-blue-50">ĐVT</th>
                                                    <th className="px-2 py-2 text-left font-medium text-gray-500 w-[90px] bg-blue-50">Quy cách</th>
                                                    <th className="px-2 py-2 text-left font-medium text-gray-500 w-[80px] bg-blue-50">Đường dùng</th>
                                                    <th className="px-2 py-2 text-left font-medium text-gray-500 w-[130px] bg-blue-50">Công ty SX</th>
                                                    <th className="px-2 py-2 text-left font-medium text-gray-500 w-[75px] bg-blue-50">Nước SX</th>
                                                    <th className="px-2 py-2 text-left font-medium text-gray-500 w-[130px] bg-blue-50">Công ty ĐK</th>
                                                    <th className="px-2 py-2 text-left font-medium text-gray-500 w-[100px] bg-blue-50">Nhóm thuốc</th>
                                                    {/* Số liệu báo cáo */}
                                                    <th className="px-2 py-2 text-right font-medium text-gray-500 w-[70px] whitespace-nowrap bg-emerald-50">Tồn đầu</th>
                                                    <th className="px-2 py-2 text-right font-medium text-gray-500 w-[65px] whitespace-nowrap bg-emerald-50">Nhập</th>
                                                    <th className="px-2 py-2 text-right font-medium text-gray-500 w-[65px] whitespace-nowrap bg-emerald-50">Xuất</th>
                                                    <th className="px-2 py-2 text-right font-semibold text-gray-700 w-[70px] whitespace-nowrap bg-emerald-50">Tồn cuối</th>
                                                    <th className="px-2 py-2 text-right font-medium text-gray-500 w-[90px] whitespace-nowrap bg-emerald-50">Giá VAT</th>
                                                    <th className="px-2 py-2 text-right font-medium text-gray-500 w-[110px] bg-emerald-50">TT tồn cuối</th>
                                                    {/* Thông tin hợp đồng */}
                                                    <th className="px-2 py-2 text-left font-medium text-gray-500 w-[110px] bg-purple-50">Số QĐ TT</th>
                                                    <th className="px-2 py-2 text-left font-medium text-gray-500 w-[130px] bg-purple-50">Tên công ty</th>
                                                    <th className="px-2 py-2 text-left font-medium text-gray-500 w-[90px] whitespace-nowrap bg-purple-50">Ngày BĐ HĐ</th>
                                                    <th className="px-2 py-2 text-left font-medium text-gray-500 w-[90px] whitespace-nowrap bg-purple-50">Ngày KT HĐ</th>
                                                    <th className="px-2 py-2 text-left font-medium text-gray-500 w-[55px] whitespace-nowrap bg-purple-50">BHYT</th>
                                                    <th className="px-2 py-2 text-left font-medium text-gray-500 w-[60px] whitespace-nowrap bg-purple-50">Dịch vụ</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {detailData.map((item, index) => (
                                                    <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                                                        <td className="px-2 py-1.5 text-gray-400">{(detailPage - 1) * DETAIL_PAGE_SIZE + index + 1}</td>
                                                        {/* Thuốc nội bộ */}
                                                        <td className="px-2 py-1.5 break-all">{item.maNoiBo}</td>
                                                        <td className="px-2 py-1.5 break-words">{item.tenThuocNoiBo}</td>
                                                        <td className="px-2 py-1.5 text-gray-500 break-words">{item.hoatChatNoiBo || <span className="text-gray-300">—</span>}</td>
                                                        <td className="px-2 py-1.5 break-all">{item.soDangKyNoiBo || <span className="text-gray-300">—</span>}</td>
                                                        <td className="px-2 py-1.5">{item.donViTinhNoiBo || <span className="text-gray-300">—</span>}</td>
                                                        {/* Danh mục chung */}
                                                        <td className="px-2 py-1.5 font-medium text-blue-700 break-all">{item.maChung || <span className="text-gray-300">—</span>}</td>
                                                        <td className="px-2 py-1.5 break-all">{item.maBhyt || <span className="text-gray-300">—</span>}</td>
                                                        <td className="px-2 py-1.5 font-medium break-words">{item.tenThuoc || <span className="text-gray-300">—</span>}</td>
                                                        <td className="px-2 py-1.5 text-gray-500 break-words">{item.hoatChat || <span className="text-gray-300">—</span>}</td>
                                                        <td className="px-2 py-1.5 break-words">{item.hamLuong || <span className="text-gray-300">—</span>}</td>
                                                        <td className="px-2 py-1.5 break-words">{item.dangBaoChe || <span className="text-gray-300">—</span>}</td>
                                                        <td className="px-2 py-1.5 break-all">{item.soDangKy || <span className="text-gray-300">—</span>}</td>
                                                        <td className="px-2 py-1.5">{item.donViTinh || <span className="text-gray-300">—</span>}</td>
                                                        <td className="px-2 py-1.5 break-words">{item.quyCach || <span className="text-gray-300">—</span>}</td>
                                                        <td className="px-2 py-1.5 break-words">{item.duongDung || <span className="text-gray-300">—</span>}</td>
                                                        <td className="px-2 py-1.5 break-words">{item.congTySanXuat || <span className="text-gray-300">—</span>}</td>
                                                        <td className="px-2 py-1.5 break-words">{item.nuocSanXuat || <span className="text-gray-300">—</span>}</td>
                                                        <td className="px-2 py-1.5 break-words">{item.congTyDangKy || <span className="text-gray-300">—</span>}</td>
                                                        <td className="px-2 py-1.5 break-words">{item.nhomThuoc || <span className="text-gray-300">—</span>}</td>
                                                        {/* Số liệu báo cáo */}
                                                        <td className="px-2 py-1.5 text-right tabular-nums">{new Intl.NumberFormat("vi-VN").format(Number(item.tonDau))}</td>
                                                        <td className="px-2 py-1.5 text-right text-blue-600 tabular-nums">{new Intl.NumberFormat("vi-VN").format(Number(item.nhap))}</td>
                                                        <td className="px-2 py-1.5 text-right text-red-600 tabular-nums">{new Intl.NumberFormat("vi-VN").format(Number(item.xuat))}</td>
                                                        <td className="px-2 py-1.5 text-right font-bold tabular-nums">{new Intl.NumberFormat("vi-VN").format(Number(item.tonCuoi))}</td>
                                                        <td className="px-2 py-1.5 text-right tabular-nums">{new Intl.NumberFormat("vi-VN").format(Number(item.giaVat))}</td>
                                                        <td className="px-2 py-1.5 text-right font-medium text-emerald-700 tabular-nums">{new Intl.NumberFormat("vi-VN").format(Number(item.thanhTienTonCuoi))}</td>
                                                        {/* Thông tin hợp đồng */}
                                                        <td className="px-2 py-1.5 break-all">{item.soQdTrungThau || <span className="text-gray-300">—</span>}</td>
                                                        <td className="px-2 py-1.5 break-words">{item.tenCongTy || <span className="text-gray-300">—</span>}</td>
                                                        <td className="px-2 py-1.5 whitespace-nowrap">{item.ngayBatDauHd || <span className="text-gray-300">—</span>}</td>
                                                        <td className="px-2 py-1.5 whitespace-nowrap">{item.ngayKetThucHd || <span className="text-gray-300">—</span>}</td>
                                                        <td className="px-2 py-1.5">{item.bhyt || <span className="text-gray-300">—</span>}</td>
                                                        <td className="px-2 py-1.5">{item.dichVu || <span className="text-gray-300">—</span>}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    {detailTotalPages > 1 && (
                                        <div className="flex items-center justify-between border-t pt-3">
                                            <p className="text-sm text-gray-600">
                                                Hiển thị {detailRangeStart}-{detailRangeEnd} / {detailTotal} dòng
                                            </p>
                                            <div className="flex gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleDetailPageChange(detailPage - 1)}
                                                    disabled={isDetailLoading || detailPage <= 1}
                                                >
                                                    Trước
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    disabled
                                                >
                                                    Trang {detailPage} / {detailTotalPages}
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleDetailPageChange(detailPage + 1)}
                                                    disabled={isDetailLoading || detailPage >= detailTotalPages}
                                                >
                                                    Sau
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </TabsContent>


                        <TabsContent value="log" className="flex-1 overflow-auto mt-0">
                            {isReviewLogLoading ? (
                                <div className="flex items-center justify-center h-48"><Loader2 className="w-8 h-8 animate-spin text-gray-400" /></div>
                            ) : reviewLog.length === 0 ? (
                                <div className="text-center py-16 text-gray-400">
                                    <Clock className="w-12 h-12 mx-auto mb-3 opacity-30" />
                                    <p>Chưa có lịch sử duyệt</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {reviewLog.map((log) => (
                                        <div key={log.id} className={`p-4 rounded-lg border ${log.status === "APPROVED" ? "bg-emerald-50 border-emerald-200" : log.status === "REJECTED" ? "bg-red-50 border-red-200" : "bg-gray-50 border-gray-200"}`}>
                                            <div className="flex items-center justify-between mb-1">
                                                <div className="flex items-center gap-2">
                                                    {log.status === "APPROVED" ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <XCircle className="w-4 h-4 text-red-600" />}
                                                    <span className={`font-semibold text-sm ${log.status === "APPROVED" ? "text-emerald-700" : "text-red-700"}`}>
                                                        {log.status === "APPROVED" ? "Đã duyệt" : "Đã từ chối"}
                                                    </span>
                                                </div>
                                                <span className="text-xs text-gray-400">{new Date(log.createdAt).toLocaleString("vi-VN")}</span>
                                            </div>
                                            <p className="text-xs text-gray-600">Người duyệt: <span className="font-medium">{log.adminName}</span></p>
                                            {log.adminNote && <p className="text-xs text-gray-600 mt-1">Ghi chú: {log.adminNote}</p>}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </TabsContent>
                    </Tabs>
                </DialogContent>
            </Dialog>
        </div>
    );
}
