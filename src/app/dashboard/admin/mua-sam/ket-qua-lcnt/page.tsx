"use client";

import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface KetQuaItem {
    id: string;
    facilityId: string;
    facilityName: string;
    facilityCode: string;
    maKHLCNT: string | null;
    tenKHLCNT: string | null;
    tenGoiThau: string;
    giaGoiThau: number | null;
    maTBMT: string;
    ngayDangTaiTBMT: string;
    soQdPheDuyetKQLCNT: string;
    ngayPheDuyetKQLCNT: string;
    soMatHangMoiThau: number;
    soMatHangTrungThau: number;
    tongGiaTriTrungThau: number;
    createdAt: string;
}

interface FacilityResultGroup {
    facilityId: string;
    facilityName: string;
    facilityCode: string;
    resultCount: number;
    totalMatHangTrungThau: number;
    tongGiaTriTrungThau: number;
    latestApprovedAt: string | null;
    latestCreatedAt: string | null;
    results: KetQuaItem[];
}

interface Summary {
    totalResults: number;
    totalFacilities: number;
    totalMatHangTrungThau: number;
    tongGiaTriTrungThau: number;
}

interface FacilityOption {
    id: string;
    facilityName: string;
    facilityCode: string;
}

interface KetQuaLCNTResponse {
    data: FacilityResultGroup[];
    metadata?: {
        page?: number;
        limit?: number;
        total?: number;
        totalPages?: number;
        summary?: Summary;
        facilities?: FacilityOption[];
    };
}

const PAGE_SIZE = 10;
const EMPTY_SUMMARY: Summary = {
    totalResults: 0,
    totalFacilities: 0,
    totalMatHangTrungThau: 0,
    tongGiaTriTrungThau: 0,
};

const formatDate = (value?: string | null) => (
    value ? new Date(value).toLocaleDateString("vi-VN") : "—"
);

const formatNumber = (value?: number | null) => (
    new Intl.NumberFormat("vi-VN").format(value || 0)
);

const formatCurrency = (value?: number | null) => (
    new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: "VND",
        maximumFractionDigits: 0,
    }).format(value || 0)
);

interface PaginationControlsProps {
    page: number;
    totalPages: number;
    totalRows: number;
    currentCount: number;
    onPageChange: (page: number) => void;
}

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
                    title="Trang trước"
                >
                    Trước
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange(page + 1)}
                    disabled={page === totalPages}
                    title="Trang sau"
                >
                    Sau
                </Button>
            </div>
        </div>
    );
}

export default function AdminKetQuaLCNTPage() {
    const [groupedData, setGroupedData] = useState<FacilityResultGroup[]>([]);
    const [summary, setSummary] = useState<Summary>(EMPTY_SUMMARY);
    const [facilities, setFacilities] = useState<FacilityOption[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedFacility, setSelectedFacility] = useState<string>("all");
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalRows, setTotalRows] = useState(0);
    const [expandedFacilityIds, setExpandedFacilityIds] = useState<Set<string>>(new Set());

    const [detailOpen, setDetailOpen] = useState(false);
    const [detailLoading, setDetailLoading] = useState(false);
    const [detailData, setDetailData] = useState<any>(null);

    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [deleteItem, setDeleteItem] = useState<KetQuaItem | null>(null);
    const [deleteLoading, setDeleteLoading] = useState(false);

    const latestRequestId = useRef(0);
    const initialDetailIdHandled = useRef<string | null>(null);

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

            const res = await fetch(`/api/admin/ket-qua-lcnt?${params.toString()}`);
            if (!res.ok) {
                throw new Error("Failed to fetch");
            }

            const result: KetQuaLCNTResponse = await res.json();
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

            console.error("Error loading data:", error);
            toast.error("Lỗi khi tải dữ liệu");
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
    };

    const handleFacilityChange = (value: string) => {
        setSelectedFacility(value);
        setPage(1);
    };

    const handlePageChange = (nextPage: number) => {
        setPage(nextPage);
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

    const handleViewDetail = useCallback(async (id: string) => {
        setDetailOpen(true);
        setDetailLoading(true);
        setDetailData(null);

        try {
            const res = await fetch(`/api/admin/ket-qua-lcnt/${id}`);
            if (res.ok) {
                const result = await res.json();
                setDetailData(result);
            } else {
                toast.error("Không thể tải chi tiết");
            }
        } catch (error) {
            console.error(error);
            toast.error("Lỗi kết nối");
        } finally {
            setDetailLoading(false);
        }
    }, []);

    useEffect(() => {
        const detailId = new URLSearchParams(window.location.search).get("detailId")?.trim();

        if (!detailId || initialDetailIdHandled.current === detailId) {
            return;
        }

        initialDetailIdHandled.current = detailId;
        void handleViewDetail(detailId);
    }, [handleViewDetail]);

    const handleDelete = async () => {
        if (!deleteId) {
            return;
        }

        try {
            setDeleteLoading(true);
            const res = await fetch(`/api/admin/ket-qua-lcnt/${deleteId}`, {
                method: "DELETE",
            });

            if (res.ok) {
                toast.success("Đã xóa kết quả LCNT thành công");
                setDeleteId(null);
                setDeleteItem(null);
                loadData();
            } else {
                const result = await res.json();
                toast.error(result.message || "Lỗi khi xóa");
            }
        } catch (error) {
            console.error("Error deleting:", error);
            toast.error("Lỗi kết nối");
        } finally {
            setDeleteLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold text-gray-800">Kết quả LCNT</h2>
                <p className="text-gray-500 mt-1">
                    Tổng hợp kết quả lựa chọn nhà thầu từ tất cả cơ sở
                </p>
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
                                    onChange={(event) => handleSearchTermChange(event.target.value)}
                                    placeholder="Tìm theo cơ sở, mã KHLCNT, tên gói thầu, mã TBMT, số QĐ..."
                                    className="pl-10"
                                />
                            </div>
                        </div>
                        <div className="w-full lg:w-72">
                            <Select value={selectedFacility} onValueChange={handleFacilityChange}>
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Tất cả cơ sở" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Tất cả cơ sở</SelectItem>
                                    {facilities.map((facility) => (
                                        <SelectItem key={facility.id} value={facility.id}>
                                            {facility.facilityName}
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
                        <div className="text-3xl font-bold text-blue-600">{summary.totalResults}</div>
                        <p className="text-gray-500">Tổng kết quả LCNT</p>
                    </CardContent>
                </Card>
                <Card className="border-0 border-l-4 border-l-emerald-500 shadow-lg">
                    <CardContent className="pt-6">
                        <div className="text-3xl font-bold text-emerald-600">{summary.totalFacilities}</div>
                        <p className="text-gray-500">Cơ sở đã báo cáo</p>
                    </CardContent>
                </Card>
                <Card className="border-0 border-l-4 border-l-amber-500 shadow-lg">
                    <CardContent className="pt-6">
                        <div className="text-3xl font-bold text-amber-600">
                            {formatNumber(summary.totalMatHangTrungThau)}
                        </div>
                        <p className="text-gray-500">Tổng mặt hàng trúng thầu</p>
                    </CardContent>
                </Card>
                <Card className="border-0 border-l-4 border-l-indigo-500 shadow-lg">
                    <CardContent className="pt-6">
                        <div className="text-3xl font-bold text-indigo-600">
                            {formatCurrency(summary.tongGiaTriTrungThau)}
                        </div>
                        <p className="text-gray-500">Tổng giá trị trúng thầu</p>
                    </CardContent>
                </Card>
            </div>

            <Card className="border-0 shadow-lg">
                <CardHeader>
                    <CardTitle>Danh sách kết quả LCNT theo cơ sở</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-hidden rounded-xl">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-blue-600 hover:bg-blue-600">
                                    <TableHead className="text-white font-bold">STT</TableHead>
                                    <TableHead className="text-white font-bold">Cơ sở</TableHead>
                                    <TableHead className="text-white font-bold">Số KQLCNT</TableHead>
                                    <TableHead className="text-white font-bold text-right">Tổng MH trúng thầu</TableHead>
                                    <TableHead className="text-white font-bold text-right">Tổng giá trị trúng thầu</TableHead>
                                    <TableHead className="text-white font-bold">Ngày phê duyệt gần nhất</TableHead>
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
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                <p>Chưa có kết quả LCNT nào.</p>
                                                <p className="text-sm">Dữ liệu sẽ hiển thị khi các cơ sở báo cáo kết quả LCNT.</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    groupedData.map((group, idx) => {
                                        const isExpanded = expandedFacilityIds.has(group.facilityId);

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
                                                    <TableCell className="font-medium">{group.resultCount}</TableCell>
                                                    <TableCell className="text-right font-medium text-emerald-600">
                                                        {formatNumber(group.totalMatHangTrungThau)}
                                                    </TableCell>
                                                    <TableCell className="text-right font-medium text-indigo-600">
                                                        {formatCurrency(group.tongGiaTriTrungThau)}
                                                    </TableCell>
                                                    <TableCell className="text-sm text-gray-500">
                                                        {formatDate(group.latestApprovedAt || group.latestCreatedAt)}
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
                                                                                <TableHead>Tên gói thầu</TableHead>
                                                                                <TableHead>Mã TBMT</TableHead>
                                                                                <TableHead>Số QĐ phê duyệt</TableHead>
                                                                                <TableHead>Ngày phê duyệt</TableHead>
                                                                                <TableHead className="text-right">MH mời thầu</TableHead>
                                                                                <TableHead className="text-right">MH trúng thầu</TableHead>
                                                                                <TableHead className="text-right">Giá trị trúng thầu</TableHead>
                                                                                <TableHead className="text-right">Thao tác</TableHead>
                                                                            </TableRow>
                                                                        </TableHeader>
                                                                        <TableBody>
                                                                            {group.results.map((item, resultIndex) => (
                                                                                <TableRow key={item.id} className="hover:bg-blue-50/50">
                                                                                    <TableCell>{resultIndex + 1}</TableCell>
                                                                                    <TableCell className="font-mono text-sm">{item.maKHLCNT || "—"}</TableCell>
                                                                                    <TableCell className="max-w-[320px] whitespace-normal break-words align-top text-sm">{item.tenGoiThau || "—"}</TableCell>
                                                                                    <TableCell>
                                                                                        <Badge className="border-0 bg-blue-100 text-blue-700 hover:bg-blue-200">
                                                                                            {item.maTBMT}
                                                                                        </Badge>
                                                                                    </TableCell>
                                                                                    <TableCell>{item.soQdPheDuyetKQLCNT}</TableCell>
                                                                                    <TableCell className="text-sm text-gray-500">
                                                                                        {formatDate(item.ngayPheDuyetKQLCNT)}
                                                                                    </TableCell>
                                                                                    <TableCell className="text-right">
                                                                                        {formatNumber(item.soMatHangMoiThau)}
                                                                                    </TableCell>
                                                                                    <TableCell className="text-right font-medium text-emerald-600">
                                                                                        {formatNumber(item.soMatHangTrungThau)}
                                                                                    </TableCell>
                                                                                    <TableCell className="text-right font-medium text-indigo-600">
                                                                                        {formatNumber(item.tongGiaTriTrungThau)}
                                                                                    </TableCell>
                                                                                    <TableCell className="text-right">
                                                                                        <div className="flex justify-end gap-2">
                                                                                            <Button
                                                                                                variant="ghost"
                                                                                                size="sm"
                                                                                                onClick={() => handleViewDetail(item.id)}
                                                                                                className="text-blue-600 hover:bg-blue-100 hover:text-blue-800"
                                                                                            >
                                                                                                Chi tiết
                                                                                            </Button>
                                                                                            <Button
                                                                                                variant="ghost"
                                                                                                size="sm"
                                                                                                onClick={() => {
                                                                                                    setDeleteId(item.id);
                                                                                                    setDeleteItem(item);
                                                                                                }}
                                                                                                className="text-red-500 hover:bg-red-50 hover:text-red-700"
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

            <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
                <DialogContent className="flex max-h-[85vh] w-[85vw] max-w-[85vw] flex-col p-0 sm:max-w-[85vw]">
                    <DialogHeader className="p-6 pb-2">
                        <DialogTitle>
                            Chi tiết Kết quả LCNT
                            {detailData && (
                                <span className="ml-2 text-base font-normal text-gray-500">
                                    — {detailData.goiThau?.keHoach?.facility?.facilityName}
                                </span>
                            )}
                        </DialogTitle>
                        {detailData && (
                            <DialogDescription>
                                Gói thầu: {detailData.goiThau?.tenGoiThau} | Mã TBMT:{" "}
                                {detailData.thongBaoMoiThau?.maTBMT}
                            </DialogDescription>
                        )}
                    </DialogHeader>

                    <div className="flex-1 space-y-4 overflow-auto p-6 pt-0">
                        {detailLoading ? (
                            <div className="flex h-48 items-center justify-center">
                                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                            </div>
                        ) : detailData ? (
                            <>
                                <div className="grid grid-cols-2 gap-4 rounded-xl bg-gray-50 p-4 md:grid-cols-4">
                                    <div>
                                        <p className="text-xs text-gray-500">Số QĐ phê duyệt KQLCNT</p>
                                        <p className="font-semibold">{detailData.soQdPheDuyetKQLCNT}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500">Ngày phê duyệt</p>
                                        <p className="font-semibold">
                                            {new Date(detailData.ngayPheDuyetKQLCNT).toLocaleDateString("vi-VN")}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500">Số MH mời thầu / trúng thầu</p>
                                        <p className="font-semibold">
                                            {detailData.soMatHangMoiThau} / {detailData.soMatHangTrungThau}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500">Tổng giá trị trúng thầu</p>
                                        <p className="font-semibold text-indigo-600">
                                            {formatCurrency(Number(detailData.tongGiaTriTrungThau))}
                                        </p>
                                    </div>
                                </div>

                                <div>
                                    <h4 className="mb-3 font-semibold text-gray-800">
                                        Kết quả từng phần lô ({detailData.ketQuaPhanLos?.length || 0} phần lô)
                                    </h4>
                                    <div className="overflow-hidden rounded-xl border">
                                        <Table>
                                            <TableHeader>
                                                <TableRow className="bg-gray-100">
                                                    <TableHead>STT</TableHead>
                                                    <TableHead>Tên phần lô</TableHead>
                                                    <TableHead>Đơn vị tính</TableHead>
                                                    <TableHead className="text-right">Số lượng</TableHead>
                                                    <TableHead className="text-right">Đơn giá</TableHead>
                                                    <TableHead className="text-right">Thành tiền</TableHead>
                                                    <TableHead>Kết quả</TableHead>
                                                    <TableHead className="text-right">Đơn giá trúng thầu</TableHead>
                                                    <TableHead>Nhà thầu trúng thầu</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {(detailData.ketQuaPhanLos || []).map((kqpl: any, idx: number) => (
                                                    <TableRow key={kqpl.id || idx}>
                                                        <TableCell>{kqpl.phanLoGoiThau?.stt || idx + 1}</TableCell>
                                                        <TableCell className="max-w-xs truncate">
                                                            {kqpl.phanLoGoiThau?.tenPhanLo || "—"}
                                                        </TableCell>
                                                        <TableCell>{kqpl.phanLoGoiThau?.donViTinh || "—"}</TableCell>
                                                        <TableCell className="text-right">
                                                            {kqpl.phanLoGoiThau?.soLuong
                                                                ? formatNumber(Number(kqpl.phanLoGoiThau.soLuong))
                                                                : "—"}
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            {kqpl.phanLoGoiThau?.donGia
                                                                ? formatNumber(Number(kqpl.phanLoGoiThau.donGia))
                                                                : "—"}
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            {kqpl.phanLoGoiThau?.thanhTien
                                                                ? formatNumber(Number(kqpl.phanLoGoiThau.thanhTien))
                                                                : "—"}
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge
                                                                className={
                                                                    kqpl.ketQua === "Trúng thầu"
                                                                        ? "border-0 bg-emerald-100 text-emerald-700"
                                                                        : "border-0 bg-gray-100 text-gray-700"
                                                                }
                                                            >
                                                                {kqpl.ketQua || "—"}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="text-right font-medium text-emerald-600">
                                                            {kqpl.donGiaTrungThau
                                                                ? formatNumber(Number(kqpl.donGiaTrungThau))
                                                                : "—"}
                                                        </TableCell>
                                                        <TableCell className="max-w-xs truncate">
                                                            {kqpl.nhaThauTrungThau || "—"}
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="py-12 text-center text-gray-400">Không có dữ liệu</div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            <AlertDialog
                open={!!deleteId}
                onOpenChange={(open) => {
                    if (!open) {
                        setDeleteId(null);
                        setDeleteItem(null);
                    }
                }}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Xác nhận xóa Kết quả LCNT</AlertDialogTitle>
                        <AlertDialogDescription>
                            Bạn có chắc chắn muốn xóa kết quả LCNT này không?
                            {deleteItem && (
                                <span className="mt-2 block text-gray-700">
                                    <strong>Gói thầu:</strong> {deleteItem.tenGoiThau}
                                    <br />
                                    <strong>Mã TBMT:</strong> {deleteItem.maTBMT}
                                    <br />
                                    <strong>Cơ sở:</strong> {deleteItem.facilityName}
                                </span>
                            )}
                            <span className="mt-2 block font-medium text-red-600">
                                Hành động này không thể hoàn tác. Tất cả kết quả phần lô liên quan cũng sẽ bị xóa.
                            </span>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={deleteLoading}>Hủy</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
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
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
