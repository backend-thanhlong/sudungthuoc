"use client";

import { Fragment, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { getDownloadFileName, triggerBlobDownload } from "@/lib/browser-download";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronDown, ChevronRight, Loader2, Trash2 } from "lucide-react";

const DETAIL_PAGE_SIZE = 50;
const DETAIL_SEARCH_FIELDS = [
    { value: "all", label: "Tất cả trường" },
    { value: "maNoiBo", label: "Mã nội bộ" },
    { value: "tenThuocNoiBo", label: "Tên thuốc (nội bộ)" },
    { value: "hoatChatNoiBo", label: "Hoạt chất (nội bộ)" },
    { value: "soDangKyNoiBo", label: "SĐK nội bộ" },
    { value: "maChung", label: "Mã chung" },
    { value: "maBhyt", label: "Mã BHYT" },
    { value: "tenThuoc", label: "Tên thuốc (DM)" },
    { value: "hoatChat", label: "Hoạt chất" },
    { value: "soDangKy", label: "Số đăng ký" },
    { value: "soQdTrungThau", label: "Số QĐ TT" },
    { value: "tenCongTy", label: "Tên công ty" },
] as const;

const DETAIL_SEARCH_FIELD_LABELS = Object.fromEntries(
    DETAIL_SEARCH_FIELDS.map((field) => [field.value, field.label])
) as Record<(typeof DETAIL_SEARCH_FIELDS)[number]["value"], string>;

type DetailReportContext = {
    facilityId: string;
    facilityName: string;
    month: string;
    drugCount: number;
};

type ReportSummary = {
    id: string;
    facilityId: string;
    facilityName: string;
    month: string;
    drugCount: number;
    totalImport: number;
    totalExport: number;
    lastUpdated: string | null;
    status: string;
    skippedRowCount: number;
};

type NotSubmittedFacility = {
    id: string;
    facilityName: string;
};

type SummaryState = {
    totalReports: number;
    uniqueFacilities: number;
    totalImport: number;
    totalExport: number;
};

type ReportPeriod = {
    id: string;
    month: string;
};

type FacilityOption = {
    id: string;
    name: string;
};

type DetailReportItem = {
    id: string;
    [key: string]: string | number | null;
};

type FacilityReportGroup = {
    facilityId: string;
    facilityName: string;
    reports: ReportSummary[];
    submissionCount: number;
    totalImport: number;
    totalExport: number;
    latestSubmittedAt: string | null;
    latestReportMonth: string | null;
    hasSkippedRows: boolean;
};

const numberFormatter = new Intl.NumberFormat("vi-VN");

const formatCurrency = (value: number) => numberFormatter.format(value);

const formatDate = (value: string | null) => value ? new Date(value).toLocaleDateString("vi-VN") : "—";

const buildFacilityReportGroups = (items: ReportSummary[]): FacilityReportGroup[] => {
    const groups = new Map<string, FacilityReportGroup>();

    items.forEach((report) => {
        const existing = groups.get(report.facilityId);
        if (existing) {
            existing.reports.push(report);
            existing.submissionCount += 1;
            existing.totalImport += Number(report.totalImport) || 0;
            existing.totalExport += Number(report.totalExport) || 0;
            existing.hasSkippedRows = existing.hasSkippedRows || report.skippedRowCount > 0;

            const currentLatest = existing.latestSubmittedAt ? new Date(existing.latestSubmittedAt).getTime() : 0;
            const nextLatest = report.lastUpdated ? new Date(report.lastUpdated).getTime() : 0;
            if (nextLatest > currentLatest) {
                existing.latestSubmittedAt = report.lastUpdated;
                existing.latestReportMonth = report.month;
            }

            return;
        }

        groups.set(report.facilityId, {
            facilityId: report.facilityId,
            facilityName: report.facilityName,
            reports: [report],
            submissionCount: 1,
            totalImport: Number(report.totalImport) || 0,
            totalExport: Number(report.totalExport) || 0,
            latestSubmittedAt: report.lastUpdated,
            latestReportMonth: report.month,
            hasSkippedRows: report.skippedRowCount > 0,
        });
    });

    return Array.from(groups.values());
};

export default function AdminReportsPage() {
    const [reports, setReports] = useState<ReportSummary[]>([]);
    const [filteredReports, setFilteredReports] = useState<ReportSummary[]>([]);
    const [notSubmitted, setNotSubmitted] = useState<NotSubmittedFacility[]>([]);
    const [summary, setSummary] = useState<SummaryState>({ totalReports: 0, uniqueFacilities: 0, totalImport: 0, totalExport: 0 });
    const [isLoading, setIsLoading] = useState(true);
    const [isExporting, setIsExporting] = useState(false);

    // Filters
    const [periods, setPeriods] = useState<ReportPeriod[]>([]);
    const [facilities, setFacilities] = useState<FacilityOption[]>([]);
    const [selectedMonth, setSelectedMonth] = useState<string>("all");
    const [selectedFacility, setSelectedFacility] = useState<string>("all");

    // Selection for bulk actions
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [expandedFacilityIds, setExpandedFacilityIds] = useState<Set<string>>(new Set());

    // Detail/Review state
    const [selectedReport, setSelectedReport] = useState<DetailReportContext | null>(null);
    const [detailData, setDetailData] = useState<DetailReportItem[]>([]);
    const [isDetailLoading, setIsDetailLoading] = useState(false);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [detailPage, setDetailPage] = useState(1);
    const [detailTotal, setDetailTotal] = useState(0);
    const [detailTotalPages, setDetailTotalPages] = useState(1);
    const [detailSearchField, setDetailSearchField] = useState<(typeof DETAIL_SEARCH_FIELDS)[number]["value"]>("all");
    const [detailAppliedSearchField, setDetailAppliedSearchField] = useState<(typeof DETAIL_SEARCH_FIELDS)[number]["value"]>("all");
    const [detailSearchInput, setDetailSearchInput] = useState("");
    const [detailSearchTerm, setDetailSearchTerm] = useState("");

    const fetchReports = async (month?: string) => {
        try {
            const url = month && month !== "all" ? `/api/admin/reports?month=${encodeURIComponent(month)}` : "/api/admin/reports";
            const res = await fetch(url);
            if (res.ok) {
                const data = await res.json();
                setReports((data.reports || []) as ReportSummary[]);
                setSummary(data.summary || { totalReports: 0, uniqueFacilities: 0, totalImport: 0, totalExport: 0 });
                setNotSubmitted((data.notSubmitted || []) as NotSubmittedFacility[]);

                const facilityMap = new Map<string, string>();
                ((data.reports || []) as ReportSummary[]).forEach((r) => {
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
        if (selectedFacility === "all") {
            setExpandedFacilityIds(new Set());
            return;
        }

        setExpandedFacilityIds(new Set([selectedFacility]));
    }, [selectedMonth, selectedFacility]);

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
                const contentDisposition = res.headers.get("Content-Disposition");
                const fallbackFileName = mode === "detail" ? "Bao_Cao_ChiTiet.xlsx" : "Bao_Cao_TongHop.xlsx";
                const fileName = getDownloadFileName(contentDisposition, fallbackFileName);

                triggerBlobDownload(blob, fileName);
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

    const handleDelete = async (report: ReportSummary) => {
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

    const fetchDetailPage = async (
        report: DetailReportContext,
        page: number,
        search = {
            field: detailAppliedSearchField,
            term: detailSearchTerm,
        }
    ) => {
        setIsDetailLoading(true);
        try {
            const params = new URLSearchParams({
                facilityId: report.facilityId,
                month: report.month,
                page: page.toString(),
                limit: DETAIL_PAGE_SIZE.toString(),
                searchField: search.field,
            });
            if (search.term) params.set("searchTerm", search.term);
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

    const handleViewDetails = (report: DetailReportContext) => {
        setSelectedReport(report);
        setIsDetailOpen(true);
        setDetailData([]);
        setDetailPage(1);
        setDetailTotal(0);
        setDetailTotalPages(1);
        setDetailSearchField("all");
        setDetailAppliedSearchField("all");
        setDetailSearchInput("");
        setDetailSearchTerm("");
        void fetchDetailPage(report, 1, { field: "all", term: "" });
    };

    const handleDetailPageChange = (page: number) => {
        if (!selectedReport || page < 1 || page > detailTotalPages || page === detailPage) return;
        void fetchDetailPage(selectedReport, page, {
            field: detailAppliedSearchField,
            term: detailSearchTerm,
        });
    };

    const handleDetailSearch = () => {
        if (!selectedReport) return;
        const nextSearchTerm = detailSearchInput.trim();
        setDetailSearchInput(nextSearchTerm);
        setDetailAppliedSearchField(detailSearchField);
        setDetailSearchTerm(nextSearchTerm);
        setDetailPage(1);
        void fetchDetailPage(selectedReport, 1, {
            field: detailSearchField,
            term: nextSearchTerm,
        });
    };

    const handleResetDetailSearch = () => {
        if (!selectedReport) return;
        setDetailSearchField("all");
        setDetailAppliedSearchField("all");
        setDetailSearchInput("");
        setDetailSearchTerm("");
        setDetailPage(1);
        void fetchDetailPage(selectedReport, 1, {
            field: "all",
            term: "",
        });
    };

    const getStatusBadge = (status: string) => {
        if (status === "SUBMITTED") {
            return <Badge className="bg-emerald-100 text-emerald-700 border-0">Đã nộp</Badge>;
        }

        return <Badge variant="secondary">{status}</Badge>;
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
    const groupedReports = buildFacilityReportGroups(filteredReports);
    const allReportsSelected = filteredReports.length > 0 && selectedIds.size === filteredReports.length;
    const headerCheckboxIndeterminate = selectedIds.size > 0 && selectedIds.size < filteredReports.length;

    const toggleFacilityExpanded = (facilityId: string) => {
        setExpandedFacilityIds((current) => {
            const next = new Set(current);
            if (next.has(facilityId)) {
                next.delete(facilityId);
            } else {
                next.add(facilityId);
            }
            return next;
        });
    };

    const toggleFacilitySelection = (group: FacilityReportGroup) => {
        setSelectedIds((current) => {
            const next = new Set(current);
            const allGroupReportsSelected = group.reports.every((report) => next.has(report.id));

            group.reports.forEach((report) => {
                if (allGroupReportsSelected) {
                    next.delete(report.id);
                } else {
                    next.add(report.id);
                }
            });

            return next;
        });
    };

    const detailRangeStart = detailTotal === 0 ? 0 : (detailPage - 1) * DETAIL_PAGE_SIZE + 1;
    const detailRangeEnd = detailTotal === 0 ? 0 : Math.min(detailTotal, (detailPage - 1) * DETAIL_PAGE_SIZE + detailData.length);
    const hasActiveDetailSearch = detailSearchTerm.length > 0;
    const detailSearchFieldLabel = DETAIL_SEARCH_FIELD_LABELS[detailAppliedSearchField];
    const canResetDetailSearch = detailSearchField !== "all"
        || detailAppliedSearchField !== "all"
        || detailSearchInput.length > 0
        || detailSearchTerm.length > 0;
    const selectedReportHasNoSavedRows = (selectedReport?.drugCount || 0) === 0;

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
                            ? `Danh sách ${groupedReports.length} đơn vị đã nộp báo cáo`
                            : `Hiển thị ${groupedReports.length} đơn vị với ${filteredReports.length} / ${reports.length} báo cáo`}
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
                                            ref={(element) => {
                                                if (element) element.indeterminate = headerCheckboxIndeterminate;
                                            }}
                                            checked={allReportsSelected}
                                            onChange={toggleSelectAll} />
                                    </TableHead>
                                    <TableHead>Cơ sở Y tế</TableHead>
                                    <TableHead>Số lần nộp</TableHead>
                                    <TableHead>Tổng tiền nhập</TableHead>
                                    <TableHead>Tổng tiền xuất</TableHead>
                                    <TableHead>Lần nộp gần nhất</TableHead>
                                    <TableHead>Trạng thái</TableHead>
                                    <TableHead className="text-right">Thao tác</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {groupedReports.map((group) => {
                                    const isExpanded = expandedFacilityIds.has(group.facilityId);
                                    const selectedCount = group.reports.filter((report) => selectedIds.has(report.id)).length;
                                    const allGroupReportsSelected = group.reports.length > 0 && selectedCount === group.reports.length;
                                    const groupCheckboxIndeterminate = selectedCount > 0 && selectedCount < group.reports.length;
                                    const hasSelectedChildReports = selectedCount > 0;

                                    return (
                                        <Fragment key={group.facilityId}>
                                            <TableRow className={hasSelectedChildReports ? "bg-blue-50/70" : ""}>
                                                <TableCell>
                                                    <input
                                                        type="checkbox"
                                                        className="rounded"
                                                        ref={(element) => {
                                                            if (element) element.indeterminate = groupCheckboxIndeterminate;
                                                        }}
                                                        checked={allGroupReportsSelected}
                                                        onChange={() => toggleFacilitySelection(group)}
                                                    />
                                                </TableCell>
                                                <TableCell className="min-w-[280px]">
                                                    <button
                                                        type="button"
                                                        onClick={() => toggleFacilityExpanded(group.facilityId)}
                                                        className="flex items-start gap-2 text-left"
                                                        aria-expanded={isExpanded}
                                                    >
                                                        {isExpanded ? (
                                                            <ChevronDown className="mt-0.5 h-4 w-4 text-slate-500" />
                                                        ) : (
                                                            <ChevronRight className="mt-0.5 h-4 w-4 text-slate-500" />
                                                        )}
                                                        <div>
                                                            <div className="font-medium text-slate-900">{group.facilityName}</div>
                                                            <div className="text-xs text-slate-500">
                                                                {group.submissionCount} lần nộp
                                                            </div>
                                                        </div>
                                                    </button>
                                                </TableCell>
                                                <TableCell className="font-medium">{group.submissionCount}</TableCell>
                                                <TableCell className="font-medium text-blue-600">{formatCurrency(group.totalImport)}</TableCell>
                                                <TableCell className="font-medium text-red-600">{formatCurrency(group.totalExport)}</TableCell>
                                                <TableCell className="text-sm text-gray-500">
                                                    <div>{formatDate(group.latestSubmittedAt)}</div>
                                                    {group.latestReportMonth && (
                                                        <div className="text-xs text-gray-400">Kỳ {group.latestReportMonth}</div>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    {getStatusBadge(group.reports[0]?.status || "SUBMITTED")}
                                                    {group.hasSkippedRows && (
                                                        <p className="mt-1 text-xs text-amber-600">
                                                            Có báo cáo chứa dòng bỏ qua
                                                        </p>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => toggleFacilityExpanded(group.facilityId)}
                                                    >
                                                        {isExpanded ? "Thu gọn" : "Mở"}
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                            {isExpanded && (
                                                <TableRow className="bg-slate-50/70">
                                                    <TableCell colSpan={8} className="p-0">
                                                        <div className="border-t bg-slate-50/70 px-4 py-4">
                                                            <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                                                                <Table>
                                                                    <TableHeader>
                                                                        <TableRow className="bg-slate-50">
                                                                            <TableHead className="w-10"> </TableHead>
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
                                                                        {group.reports.map((report) => (
                                                                            <TableRow key={report.id} className={selectedIds.has(report.id) ? "bg-blue-50" : ""}>
                                                                                <TableCell>
                                                                                    <input
                                                                                        type="checkbox"
                                                                                        className="rounded"
                                                                                        checked={selectedIds.has(report.id)}
                                                                                        onChange={() => toggleSelect(report.id)}
                                                                                    />
                                                                                </TableCell>
                                                                                <TableCell className="font-medium">{report.month}</TableCell>
                                                                                <TableCell>{report.drugCount}</TableCell>
                                                                                <TableCell className="font-medium text-blue-600">{formatCurrency(Number(report.totalImport) || 0)}</TableCell>
                                                                                <TableCell className="font-medium text-red-600">{formatCurrency(Number(report.totalExport) || 0)}</TableCell>
                                                                                <TableCell className="text-sm text-gray-500">{formatDate(report.lastUpdated)}</TableCell>
                                                                                <TableCell>
                                                                                    {getStatusBadge(report.status)}
                                                                                    {report.skippedRowCount > 0 && (
                                                                                        <p className="mt-1 text-xs text-amber-600">
                                                                                            {report.skippedRowCount} dòng bỏ qua
                                                                                        </p>
                                                                                    )}
                                                                                </TableCell>
                                                                                <TableCell className="text-right space-x-2">
                                                                                    <Button size="sm" variant="outline" onClick={() => handleViewDetails(report)}>Xem</Button>
                                                                                    <Button size="sm" variant="outline" className="border-red-200 text-red-600 hover:bg-red-50" onClick={() => handleDelete(report)}>
                                                                                        <Trash2 className="w-3.5 h-3.5" />
                                                                                    </Button>
                                                                                </TableCell>
                                                                            </TableRow>
                                                                        ))}
                                                                    </TableBody>
                                                                </Table>
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </Fragment>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* Detail Dialog */}
            <Dialog
                open={isDetailOpen}
                onOpenChange={(open) => {
                    setIsDetailOpen(open);
                    if (!open) {
                        setSelectedReport(null);
                        setDetailData([]);
                        setIsDetailLoading(false);
                        setDetailPage(1);
                        setDetailTotal(0);
                        setDetailTotalPages(1);
                        setDetailSearchField("all");
                        setDetailAppliedSearchField("all");
                        setDetailSearchInput("");
                        setDetailSearchTerm("");
                    }
                }}
            >
                <DialogContent className="!top-0 !left-0 !h-[100dvh] !w-screen !max-w-none !translate-x-0 !translate-y-0 !rounded-none !border-0 !p-0 !shadow-none flex flex-col gap-0 overflow-hidden sm:!max-w-none">
                    <DialogHeader className="shrink-0 border-b px-6 py-5 pr-16">
                        <DialogTitle>Chi tiết báo cáo - {selectedReport?.facilityName}</DialogTitle>
                        <DialogDescription>
                            Tháng báo cáo: {selectedReport?.month} | Tổng số thuốc: {selectedReport?.drugCount}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-6 py-5">
                        <div className="mb-3 inline-flex w-fit rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700">
                            Báo cáo đã nộp và được chốt tự động
                        </div>

                        <div className="flex min-h-0 flex-1 flex-col gap-3">
                            <form
                                className="flex flex-wrap items-center gap-2"
                                onSubmit={(event) => {
                                    event.preventDefault();
                                    handleDetailSearch();
                                }}
                            >
                                <Select value={detailSearchField} onValueChange={(value) => setDetailSearchField(value as (typeof DETAIL_SEARCH_FIELDS)[number]["value"])}>
                                    <SelectTrigger className="w-[220px] bg-white">
                                        <SelectValue placeholder="Chọn trường tìm kiếm" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {DETAIL_SEARCH_FIELDS.map((field) => (
                                            <SelectItem key={field.value} value={field.value}>{field.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                <Input
                                    value={detailSearchInput}
                                    onChange={(event) => setDetailSearchInput(event.target.value)}
                                    placeholder="Nhập từ khóa tìm kiếm..."
                                    className="min-w-[260px] flex-1 bg-white"
                                />

                                <Button type="submit" disabled={isDetailLoading}>
                                    Tìm kiếm
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={handleResetDetailSearch}
                                    disabled={isDetailLoading || !canResetDetailSearch}
                                >
                                    Đặt lại
                                </Button>
                            </form>

                            {hasActiveDetailSearch && (
                                <div className="text-sm text-gray-600">
                                    Kết quả tìm kiếm cho <span className="font-medium">&quot;{detailSearchTerm}&quot;</span> trong trường <span className="font-medium">{detailSearchFieldLabel}</span>
                                </div>
                            )}

                            {isDetailLoading ? (
                                <div className="flex flex-1 items-center justify-center">
                                    <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                                </div>
                            ) : detailData.length === 0 ? (
                                <div className="flex flex-1 items-center justify-center text-gray-500">
                                    <div className="text-center">
                                        <p className="text-base font-medium text-gray-600">
                                            {hasActiveDetailSearch
                                                ? "Không tìm thấy dữ liệu phù hợp"
                                                : selectedReportHasNoSavedRows
                                                    ? "Báo cáo này không có dòng dữ liệu đã lưu"
                                                    : "Không có dữ liệu chi tiết"}
                                        </p>
                                        {hasActiveDetailSearch && (
                                            <p className="text-sm text-gray-400 mt-1">
                                                Thử đổi trường tìm kiếm hoặc từ khóa khác.
                                            </p>
                                        )}
                                        {!hasActiveDetailSearch && selectedReportHasNoSavedRows && (
                                            <p className="text-sm text-gray-400 mt-1">
                                                Toàn bộ dòng trong file nộp đã được đánh dấu Bỏ qua.
                                            </p>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="flex items-center justify-between text-sm text-gray-600">
                                        <span>Hiển thị {detailRangeStart}-{detailRangeEnd} / {detailTotal} dòng</span>
                                        <span>Trang {detailPage} / {detailTotalPages}</span>
                                    </div>

                                    <div className="min-h-0 flex-1 overflow-auto">
                                        <table className="text-xs border-collapse w-max min-w-full">
                                            <thead className="sticky top-0 bg-white z-10">
                                                <tr className="border-b border-gray-200">
                                                    <th className="px-2 py-2 text-left font-medium text-gray-500 w-8 whitespace-nowrap">STT</th>
                                                    <th className="px-2 py-2 text-left font-medium text-gray-500 w-[90px] whitespace-nowrap bg-orange-50">Mã nội bộ</th>
                                                    <th className="px-2 py-2 text-left font-medium text-gray-500 w-[160px] bg-orange-50">Tên thuốc (nội bộ)</th>
                                                    <th className="px-2 py-2 text-left font-medium text-gray-500 w-[130px] bg-orange-50">Hoạt chất (nội bộ)</th>
                                                    <th className="px-2 py-2 text-left font-medium text-gray-500 w-[100px] whitespace-nowrap bg-orange-50">SĐK nội bộ</th>
                                                    <th className="px-2 py-2 text-left font-medium text-gray-500 w-[70px] whitespace-nowrap bg-orange-50">ĐVT NB</th>
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
                                                    <th className="px-2 py-2 text-right font-medium text-gray-500 w-[70px] whitespace-nowrap bg-emerald-50">Tồn đầu</th>
                                                    <th className="px-2 py-2 text-right font-medium text-gray-500 w-[65px] whitespace-nowrap bg-emerald-50">Nhập</th>
                                                    <th className="px-2 py-2 text-right font-medium text-gray-500 w-[65px] whitespace-nowrap bg-emerald-50">Xuất</th>
                                                    <th className="px-2 py-2 text-right font-semibold text-gray-700 w-[70px] whitespace-nowrap bg-emerald-50">Tồn cuối</th>
                                                    <th className="px-2 py-2 text-right font-medium text-gray-500 w-[90px] whitespace-nowrap bg-emerald-50">Giá VAT</th>
                                                    <th className="px-2 py-2 text-right font-medium text-gray-500 w-[110px] bg-emerald-50">TT tồn cuối</th>
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
                                                        <td className="px-2 py-1.5 break-all">{item.maNoiBo}</td>
                                                        <td className="px-2 py-1.5 break-words">{item.tenThuocNoiBo}</td>
                                                        <td className="px-2 py-1.5 text-gray-500 break-words">{item.hoatChatNoiBo || <span className="text-gray-300">—</span>}</td>
                                                        <td className="px-2 py-1.5 break-all">{item.soDangKyNoiBo || <span className="text-gray-300">—</span>}</td>
                                                        <td className="px-2 py-1.5">{item.donViTinhNoiBo || <span className="text-gray-300">—</span>}</td>
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
                                                        <td className="px-2 py-1.5 text-right tabular-nums">{new Intl.NumberFormat("vi-VN").format(Number(item.tonDau))}</td>
                                                        <td className="px-2 py-1.5 text-right text-blue-600 tabular-nums">{new Intl.NumberFormat("vi-VN").format(Number(item.nhap))}</td>
                                                        <td className="px-2 py-1.5 text-right text-red-600 tabular-nums">{new Intl.NumberFormat("vi-VN").format(Number(item.xuat))}</td>
                                                        <td className="px-2 py-1.5 text-right font-bold tabular-nums">{new Intl.NumberFormat("vi-VN").format(Number(item.tonCuoi))}</td>
                                                        <td className="px-2 py-1.5 text-right tabular-nums">{new Intl.NumberFormat("vi-VN").format(Number(item.giaVat))}</td>
                                                        <td className="px-2 py-1.5 text-right font-medium text-emerald-700 tabular-nums">{new Intl.NumberFormat("vi-VN").format(Number(item.thanhTienTonCuoi))}</td>
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
                                </>
                            )}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
