"use client";

import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
    AlertDialog,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

interface Facility {
    id: string;
    facilityName: string;
    facilityCode: string;
}

interface KeHoach {
    id: string;
    maKHLCNT: string | null;
    tenKHLCNT: string | null;
    facility: Facility;
}

interface GoiThau {
    id: string;
    tenGoiThau: string;
    giaGoiThau: number | null;
    soLuongPhanLo: number | null;
    keHoach: KeHoach;
}

interface TBMTRecord {
    id: string;
    maTBMT: string;
    ngayDangTai: string;
    soQdPheDuyetHSMT: string;
    ngayPheDuyetHSMT: string;
    ngayDongThau: string;
    createdAt: string;
    goiThau: GoiThau;
}

interface FacilityTBMTGroup {
    facilityId: string;
    facilityName: string;
    facilityCode: string;
    tbmtCount: number;
    totalPackages: number;
    activeCount: number;
    latestPublishedAt: string | null;
    latestCreatedAt: string | null;
    latestClosingAt: string | null;
    tbmts: TBMTRecord[];
}

interface Summary {
    totalTBMT: number;
    totalFacilities: number;
    totalPackages: number;
    activeTBMTCount: number;
}

interface FacilityOption {
    id: string;
    facilityName: string;
    facilityCode: string;
}

interface TBMTResponse {
    data: FacilityTBMTGroup[];
    metadata?: {
        page?: number;
        limit?: number;
        total?: number;
        totalPages?: number;
        summary?: Summary;
        facilities?: FacilityOption[];
    };
}

interface PaginationControlsProps {
    page: number;
    totalPages: number;
    totalRows: number;
    currentCount: number;
    onPageChange: (page: number) => void;
}

const PAGE_SIZE = 10;
const EMPTY_SUMMARY: Summary = {
    totalTBMT: 0,
    totalFacilities: 0,
    totalPackages: 0,
    activeTBMTCount: 0,
};

const formatDate = (value?: string | null) => (
    value ? new Date(value).toLocaleDateString("vi-VN") : "—"
);

const formatNumber = (value?: number | null) => (
    new Intl.NumberFormat("vi-VN").format(value || 0)
);

const formatCurrency = (value?: number | null) => {
    if (value === null || value === undefined) {
        return "—";
    }

    return new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: "VND",
        maximumFractionDigits: 0,
    }).format(value);
};

function PaginationControls({
    page,
    totalPages,
    totalRows,
    currentCount,
    onPageChange,
}: PaginationControlsProps) {
    if (totalRows === 0) {
        return null;
    }

    const rangeStart = (page - 1) * PAGE_SIZE + 1;
    const rangeEnd = rangeStart + currentCount - 1;

    return (
        <div className="mt-4 flex flex-col gap-3 border-t px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-1 text-sm text-gray-500 sm:flex-row sm:items-center sm:gap-4">
                <span>Hiển thị {rangeStart}-{rangeEnd} / {totalRows} dòng</span>
                <span>Trang {page} / {totalPages}</span>
            </div>
            <div className="flex gap-2">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange(page - 1)}
                    disabled={page === 1}
                >
                    Trước
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange(page + 1)}
                    disabled={page === totalPages}
                >
                    Sau
                </Button>
            </div>
        </div>
    );
}

function getGroupStatus(group: FacilityTBMTGroup) {
    if (group.activeCount === 0) {
        return {
            label: "Đã đóng thầu",
            className: "bg-slate-100 text-slate-700",
            description: undefined,
        };
    }

    if (group.activeCount === group.tbmtCount) {
        return {
            label: "Đang mở",
            className: "bg-emerald-100 text-emerald-700",
            description: `${group.activeCount}/${group.tbmtCount} TBMT còn hiệu lực`,
        };
    }

    return {
        label: "Mở một phần",
        className: "bg-amber-100 text-amber-700",
        description: `${group.activeCount}/${group.tbmtCount} TBMT còn hiệu lực`,
    };
}

export default function AdminThongBaoMoiThauPage() {
    const [groupedData, setGroupedData] = useState<FacilityTBMTGroup[]>([]);
    const [summary, setSummary] = useState<Summary>(EMPTY_SUMMARY);
    const [facilities, setFacilities] = useState<FacilityOption[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedFacility, setSelectedFacility] = useState<string>("all");
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalRows, setTotalRows] = useState(0);
    const [expandedFacilityIds, setExpandedFacilityIds] = useState<Set<string>>(new Set());
    const [selectedTBMT, setSelectedTBMT] = useState<TBMTRecord | null>(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [tbmtToDelete, setTbmtToDelete] = useState<TBMTRecord | null>(null);
    const [deleteLoading, setDeleteLoading] = useState(false);

    const latestRequestId = useRef(0);

    const loadData = useCallback(async (pageToLoad: number = page) => {
        const requestId = latestRequestId.current + 1;
        latestRequestId.current = requestId;
        setLoading(true);

        try {
            const params = new URLSearchParams({
                page: pageToLoad.toString(),
                limit: PAGE_SIZE.toString(),
            });

            if (searchTerm.trim()) {
                params.set("searchTerm", searchTerm.trim());
            }

            if (selectedFacility !== "all") {
                params.set("facilityId", selectedFacility);
            }

            const res = await fetch(`/api/admin/thong-bao-moi-thau?${params.toString()}`);
            if (!res.ok) {
                throw new Error("Failed to fetch");
            }

            const result: TBMTResponse = await res.json();
            if (latestRequestId.current !== requestId) {
                return;
            }

            setGroupedData(result.data || []);
            setSummary(result.metadata?.summary || EMPTY_SUMMARY);
            setFacilities(result.metadata?.facilities || []);
            setTotalPages(result.metadata?.totalPages || 1);
            setTotalRows(result.metadata?.total || 0);

            if (result.metadata?.page && result.metadata.page !== pageToLoad) {
                setPage(result.metadata.page);
            }
        } catch (error) {
            if (latestRequestId.current !== requestId) {
                return;
            }

            console.error("Error loading admin TBMT:", error);
            toast.error("Lỗi khi tải dữ liệu thông báo mời thầu");
        } finally {
            if (latestRequestId.current === requestId) {
                setLoading(false);
            }
        }
    }, [page, searchTerm, selectedFacility]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    useEffect(() => {
        if (selectedFacility === "all") {
            setExpandedFacilityIds(new Set());
            return;
        }

        setExpandedFacilityIds(new Set([selectedFacility]));
    }, [selectedFacility]);

    const handleSearchTermChange = (value: string) => {
        setSearchTerm(value);
        setPage(1);
        setExpandedFacilityIds(new Set());
    };

    const handleFacilityChange = (value: string) => {
        setSelectedFacility(value);
        setPage(1);
    };

    const handlePageChange = (nextPage: number) => {
        const safePage = Math.max(1, Math.min(totalPages, nextPage));
        if (safePage === page) {
            return;
        }

        setExpandedFacilityIds(new Set());
        setPage(safePage);
    };

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

    const handleViewDetails = (tbmt: TBMTRecord) => {
        setSelectedTBMT(tbmt);
        setIsDetailOpen(true);
    };

    const handleRequestDelete = (tbmt: TBMTRecord) => {
        setTbmtToDelete(tbmt);
    };

    const handleConfirmDelete = async () => {
        if (!tbmtToDelete) {
            return;
        }

        setDeleteLoading(true);

        try {
            const tbmtId = tbmtToDelete.id;
            const res = await fetch(`/api/admin/thong-bao-moi-thau/${tbmtId}`, {
                method: "DELETE",
            });
            const data = await res.json().catch(() => null);

            if (!res.ok) {
                throw new Error(data?.message || "Failed to delete");
            }

            if (selectedTBMT?.id === tbmtId) {
                setSelectedTBMT(null);
                setIsDetailOpen(false);
            }

            setTbmtToDelete(null);
            toast.success("Xóa thông báo mời thầu thành công");
            await loadData();
        } catch (error) {
            console.error("Error deleting admin TBMT:", error);
            toast.error(
                error instanceof Error
                    ? error.message
                    : "Lỗi khi xóa thông báo mời thầu"
            );
        } finally {
            setDeleteLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-gray-800">Quản lý Thông báo mời thầu</h2>
                <p className="mt-1 text-gray-500">Theo dõi thông báo mời thầu của các đơn vị theo dạng nhóm</p>
            </div>

            <Card className="border-0 shadow-lg">
                <CardContent className="p-4">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                        <div className="flex-1">
                            <div className="relative">
                                <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                                <Input
                                    value={searchTerm}
                                    onChange={(e) => handleSearchTermChange(e.target.value)}
                                    placeholder="Tìm mã TBMT, tên gói thầu, mã/tên KHLCNT, tên/mã đơn vị..."
                                    className="pl-10"
                                />
                            </div>
                        </div>
                        <div className="w-full lg:w-72">
                            <Select value={selectedFacility} onValueChange={handleFacilityChange}>
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Tất cả đơn vị" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Tất cả đơn vị</SelectItem>
                                    {facilities.map((facility) => (
                                        <SelectItem key={facility.id} value={facility.id}>
                                            {facility.facilityName || facility.facilityCode || "Không rõ"}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        {(searchTerm || selectedFacility !== "all") && (
                            <Button
                                variant="ghost"
                                className="justify-start text-gray-500 lg:justify-center"
                                onClick={() => {
                                    handleSearchTermChange("");
                                    handleFacilityChange("all");
                                }}
                            >
                                Xóa bộ lọc
                            </Button>
                        )}
                        <Button onClick={() => loadData()} variant="outline" className="rounded-xl">
                            <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            Làm mới
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
                <Card className="border-0 border-l-4 border-l-blue-500 shadow-lg">
                    <CardContent className="pt-6">
                        <div className="text-3xl font-bold text-blue-600">{formatNumber(summary.totalTBMT)}</div>
                        <p className="text-gray-500">Tổng TBMT</p>
                    </CardContent>
                </Card>
                <Card className="border-0 border-l-4 border-l-emerald-500 shadow-lg">
                    <CardContent className="pt-6">
                        <div className="text-3xl font-bold text-emerald-600">{formatNumber(summary.totalFacilities)}</div>
                        <p className="text-gray-500">Đơn vị có TBMT</p>
                    </CardContent>
                </Card>
                <Card className="border-0 border-l-4 border-l-amber-500 shadow-lg">
                    <CardContent className="pt-6">
                        <div className="text-3xl font-bold text-amber-600">{formatNumber(summary.totalPackages)}</div>
                        <p className="text-gray-500">Tổng gói thầu</p>
                    </CardContent>
                </Card>
                <Card className="border-0 border-l-4 border-l-indigo-500 shadow-lg">
                    <CardContent className="pt-6">
                        <div className="text-3xl font-bold text-indigo-600">{formatNumber(summary.activeTBMTCount)}</div>
                        <p className="text-gray-500">TBMT còn hiệu lực</p>
                    </CardContent>
                </Card>
            </div>

            <Card className="border-0 shadow-lg">
                <CardHeader>
                    <CardTitle>Danh sách thông báo mời thầu theo đơn vị</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-hidden rounded-xl">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-blue-600 hover:bg-blue-600">
                                    <TableHead className="text-white font-bold">STT</TableHead>
                                    <TableHead className="text-white font-bold">Đơn vị</TableHead>
                                    <TableHead className="text-white font-bold">Số TBMT</TableHead>
                                    <TableHead className="text-white font-bold">Số gói thầu</TableHead>
                                    <TableHead className="text-white font-bold">Ngày đăng tải gần nhất</TableHead>
                                    <TableHead className="text-white font-bold">Trạng thái</TableHead>
                                    <TableHead className="text-white font-bold">Thao tác</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="py-12 text-center">
                                            <div className="flex flex-col items-center gap-2 text-gray-400">
                                                <Loader2 className="h-8 w-8 animate-spin" />
                                                <p>Đang tải dữ liệu...</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : groupedData.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="py-12 text-center text-gray-400">
                                            <div className="flex flex-col items-center gap-3">
                                                <svg className="h-12 w-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                </svg>
                                                <p>Không tìm thấy thông báo mời thầu.</p>
                                                <p className="text-sm">Dữ liệu sẽ hiển thị khi có TBMT khớp bộ lọc đang chọn.</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    groupedData.map((group, idx) => {
                                        const isExpanded = expandedFacilityIds.has(group.facilityId);
                                        const groupStatus = getGroupStatus(group);

                                        return (
                                            <Fragment key={group.facilityId}>
                                                <TableRow className={isExpanded ? "bg-blue-50/70" : ""}>
                                                    <TableCell className="font-medium">{(page - 1) * PAGE_SIZE + idx + 1}</TableCell>
                                                    <TableCell className="min-w-[260px]">
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
                                                                <p className="font-medium text-slate-900">{group.facilityName}</p>
                                                                <p className="text-xs text-slate-500">{group.facilityCode || "—"}</p>
                                                            </div>
                                                        </button>
                                                    </TableCell>
                                                    <TableCell className="font-medium">{formatNumber(group.tbmtCount)}</TableCell>
                                                    <TableCell className="font-medium text-indigo-600">{formatNumber(group.totalPackages)}</TableCell>
                                                    <TableCell className="text-sm text-gray-500">
                                                        {formatDate(group.latestPublishedAt || group.latestCreatedAt)}
                                                    </TableCell>
                                                    <TableCell>
                                                        <span className={`inline-block rounded-full px-2 py-1 text-xs font-medium ${groupStatus.className}`}>
                                                            {groupStatus.label}
                                                        </span>
                                                        {groupStatus.description && (
                                                            <p className="mt-1 text-xs text-slate-500">{groupStatus.description}</p>
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
                                                        <TableCell colSpan={7} className="p-0">
                                                            <div className="border-t bg-slate-50/70 px-4 py-4">
                                                                <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                                                                    <Table>
                                                                        <TableHeader>
                                                                            <TableRow className="bg-slate-50">
                                                                                <TableHead>STT</TableHead>
                                                                                <TableHead>Mã KHLCNT</TableHead>
                                                                                <TableHead>Tên KHLCNT</TableHead>
                                                                                <TableHead>Tên gói thầu</TableHead>
                                                                                <TableHead>Mã TBMT</TableHead>
                                                                                <TableHead>Ngày đăng tải</TableHead>
                                                                                <TableHead>Ngày đóng thầu</TableHead>
                                                                                <TableHead className="text-right">Thao tác</TableHead>
                                                                            </TableRow>
                                                                        </TableHeader>
                                                                        <TableBody>
                                                                            {group.tbmts.map((record, recordIndex) => (
                                                                                <TableRow key={record.id} className="hover:bg-blue-50/50">
                                                                                    <TableCell>{recordIndex + 1}</TableCell>
                                                                                    <TableCell className="font-mono text-sm">{record.goiThau.keHoach.maKHLCNT || "—"}</TableCell>
                                                                                    <TableCell className="max-w-[320px] whitespace-normal break-words align-top text-sm">{record.goiThau.keHoach.tenKHLCNT || "—"}</TableCell>
                                                                                    <TableCell className="max-w-[320px] whitespace-normal break-words align-top text-sm">{record.goiThau.tenGoiThau || "—"}</TableCell>
                                                                                    <TableCell>
                                                                                        <Badge className="border-0 bg-blue-100 text-blue-700 hover:bg-blue-200">
                                                                                            {record.maTBMT}
                                                                                        </Badge>
                                                                                    </TableCell>
                                                                                    <TableCell className="text-sm text-gray-500">{formatDate(record.ngayDangTai)}</TableCell>
                                                                                    <TableCell className="text-sm text-gray-500">{formatDate(record.ngayDongThau)}</TableCell>
                                                                                    <TableCell className="text-right">
                                                                                        <div className="flex justify-end gap-2">
                                                                                            <Button
                                                                                                variant="ghost"
                                                                                                size="sm"
                                                                                                onClick={() => handleViewDetails(record)}
                                                                                                className="text-blue-600 hover:bg-blue-100 hover:text-blue-800"
                                                                                            >
                                                                                                Chi tiết
                                                                                            </Button>
                                                                                            <Button
                                                                                                variant="ghost"
                                                                                                size="sm"
                                                                                                onClick={() => handleRequestDelete(record)}
                                                                                                className="text-red-600 hover:bg-red-100 hover:text-red-700"
                                                                                            >
                                                                                                Xóa
                                                                                            </Button>
                                                                                        </div>
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
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </div>
                    <PaginationControls
                        page={page}
                        totalPages={totalPages}
                        totalRows={totalRows}
                        currentCount={groupedData.length}
                        onPageChange={handlePageChange}
                    />
                </CardContent>
            </Card>

            <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
                <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold text-blue-800">
                            Chi tiết Thông báo mời thầu
                        </DialogTitle>
                    </DialogHeader>

                    {selectedTBMT && (
                        <div className="mt-4 space-y-6">
                            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                                <h3 className="mb-3 flex items-center gap-2 font-semibold text-blue-900">
                                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                    </svg>
                                    Thông tin đơn vị
                                </h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label className="text-sm text-gray-600">Tên đơn vị</Label>
                                        <p className="mt-1 font-medium">
                                            {selectedTBMT.goiThau.keHoach.facility.facilityName || "—"}
                                        </p>
                                    </div>
                                    <div>
                                        <Label className="text-sm text-gray-600">Mã đơn vị</Label>
                                        <p className="mt-1 font-medium">
                                            {selectedTBMT.goiThau.keHoach.facility.facilityCode || "—"}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                                <h3 className="mb-3 flex items-center gap-2 font-semibold text-gray-900">
                                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                    </svg>
                                    Thông tin kế hoạch LCNT
                                </h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label className="text-sm text-gray-600">Mã KHLCNT</Label>
                                        <p className="mt-1 font-medium">
                                            {selectedTBMT.goiThau.keHoach.maKHLCNT || "—"}
                                        </p>
                                    </div>
                                    <div className="col-span-2">
                                        <Label className="text-sm text-gray-600">Tên KHLCNT</Label>
                                        <p className="mt-1 break-words font-medium">
                                            {selectedTBMT.goiThau.keHoach.tenKHLCNT || "—"}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                                <h3 className="mb-3 flex items-center gap-2 font-semibold text-gray-900">
                                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                                    </svg>
                                    Thông tin gói thầu
                                </h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="col-span-2">
                                        <Label className="text-sm text-gray-600">Tên gói thầu</Label>
                                        <p className="mt-1 break-words font-medium">{selectedTBMT.goiThau.tenGoiThau || "—"}</p>
                                    </div>
                                    <div>
                                        <Label className="text-sm text-gray-600">Giá gói thầu</Label>
                                        <p className="mt-1 font-medium">
                                            {formatCurrency(selectedTBMT.goiThau.giaGoiThau)}
                                        </p>
                                    </div>
                                    <div>
                                        <Label className="text-sm text-gray-600">Số lượng phần lô</Label>
                                        <p className="mt-1 font-medium">
                                            {selectedTBMT.goiThau.soLuongPhanLo || "—"}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-lg border border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-4">
                                <h3 className="mb-3 flex items-center gap-2 font-semibold text-blue-900">
                                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    Thông tin TBMT
                                </h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label className="text-sm text-gray-600">Mã TBMT</Label>
                                        <p className="mt-1 font-medium text-blue-700">{selectedTBMT.maTBMT}</p>
                                    </div>
                                    <div>
                                        <Label className="text-sm text-gray-600">Ngày đăng tải TBMT</Label>
                                        <p className="mt-1 font-medium">
                                            {formatDate(selectedTBMT.ngayDangTai)}
                                        </p>
                                    </div>
                                    <div>
                                        <Label className="text-sm text-gray-600">Số QĐ phê duyệt HSMT</Label>
                                        <p className="mt-1 font-medium">{selectedTBMT.soQdPheDuyetHSMT || "—"}</p>
                                    </div>
                                    <div>
                                        <Label className="text-sm text-gray-600">Ngày phê duyệt HSMT</Label>
                                        <p className="mt-1 font-medium">
                                            {formatDate(selectedTBMT.ngayPheDuyetHSMT)}
                                        </p>
                                    </div>
                                    <div className="col-span-2">
                                        <Label className="text-sm text-gray-600">Ngày đóng thầu</Label>
                                        <p className="mt-1 font-medium">
                                            {formatDate(selectedTBMT.ngayDongThau)}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            <AlertDialog
                open={!!tbmtToDelete}
                onOpenChange={(open) => {
                    if (!open && !deleteLoading) {
                        setTbmtToDelete(null);
                    }
                }}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Xác nhận xóa Thông báo mời thầu</AlertDialogTitle>
                        <AlertDialogDescription>
                            Bạn có chắc chắn muốn xóa thông báo mời thầu này không?
                            {tbmtToDelete && (
                                <span className="mt-2 block text-gray-700">
                                    <strong>Gói thầu:</strong> {tbmtToDelete.goiThau.tenGoiThau}
                                    <br />
                                    <strong>Mã TBMT:</strong> {tbmtToDelete.maTBMT}
                                    <br />
                                    <strong>Đơn vị:</strong> {tbmtToDelete.goiThau.keHoach.facility.facilityName}
                                </span>
                            )}
                            <span className="mt-2 block font-medium text-red-600">
                                Chỉ có thể xóa thông báo mời thầu chưa có kết quả LCNT liên kết.
                            </span>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={deleteLoading}>Hủy</AlertDialogCancel>
                        <Button
                            onClick={handleConfirmDelete}
                            disabled={deleteLoading}
                            className="bg-red-600 text-white hover:bg-red-700"
                        >
                            {deleteLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Đang xóa...
                                </>
                            ) : (
                                "Xóa"
                            )}
                        </Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
