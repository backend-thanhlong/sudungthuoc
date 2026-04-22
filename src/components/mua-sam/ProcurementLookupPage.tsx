"use client";

import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { getDownloadFileName, triggerBlobDownload } from "@/lib/browser-download";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogDescription,
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

type ProcurementStatusFilter =
    | "all"
    | "no_tbmt"
    | "has_tbmt_no_kqlcnt"
    | "has_kqlcnt";

type ProcurementTypeFilter =
    | "all"
    | "Thuốc"
    | "Hóa chất, vật tư, thiết bị y tế";

type ProcurementStatusLabel =
    | "Chưa có TBMT"
    | "Đã có TBMT, chưa có KQLCNT"
    | "Đã có KQLCNT";

interface ProcurementLookupFacilityOption {
    id: string;
    facilityName: string;
    facilityCode: string | null;
}

interface ProcurementLookupSummary {
    totalPackages: number;
    chuaCoTBMT: number;
    daCoTBMTChuaCoKQLCNT: number;
    daCoKQLCNT: number;
}

interface ProcurementLookupPhanLoResult {
    phanLoGoiThauId: string;
    tenPhanLo: string;
    ketQua: string | null;
    donGiaTrungThau: number | null;
    nhaThauTrungThau: string | null;
}

interface ProcurementLookupItem {
    facilityId: string;
    facilityName: string;
    facilityCode: string | null;
    keHoachId: string;
    maKHLCNT: string | null;
    tenKHLCNT: string | null;
    soQuyetDinh: string | null;
    ngayPheDuyet: string | null;
    goiThauId: string;
    tenGoiThau: string;
    giaGoiThau: number | null;
    hinhThucLCNT: string | null;
    phuongThucLCNT: string | null;
    loaiHopDong: string[];
    soLuongPhanLo: number | null;
    trangThaiGoiThau: string | null;
    maTBMT: string | null;
    ngayDangTaiTBMT: string | null;
    ngayDongThau: string | null;
    soQdPheDuyetKQLCNT: string | null;
    ngayPheDuyetKQLCNT: string | null;
    soMatHangMoiThau: number | null;
    soMatHangTrungThau: number | null;
    tongGiaTriTrungThau: number | null;
    soLuongNhaThauTrung: number;
    danhSachNhaThauTrung: string[];
    procurementStatus: ProcurementStatusLabel;
    phanLoResults: ProcurementLookupPhanLoResult[];
}

interface ProcurementLookupResponse {
    data: ProcurementLookupItem[];
    metadata?: {
        page?: number;
        limit?: number;
        total?: number;
        totalPages?: number;
        facilities?: ProcurementLookupFacilityOption[];
        summary?: ProcurementLookupSummary;
    };
}

interface AppliedFilters {
    searchTerm: string;
    facilityId: string;
    procurementStatus: ProcurementStatusFilter;
    procurementType: ProcurementTypeFilter;
    fromDate: string;
    toDate: string;
}

interface ProcurementLookupPageProps {
    role: "admin" | "facility";
    apiUrl: string;
    pageTitle: string;
    pageDescription: string;
}

interface PaginationControlsProps {
    currentCount: number;
    page: number;
    totalPages: number;
    totalRows: number;
    onPageChange: (nextPage: number) => void;
}

const EMPTY_SUMMARY: ProcurementLookupSummary = {
    totalPackages: 0,
    chuaCoTBMT: 0,
    daCoTBMTChuaCoKQLCNT: 0,
    daCoKQLCNT: 0,
};

const DEFAULT_FILTERS: AppliedFilters = {
    searchTerm: "",
    facilityId: "all",
    procurementStatus: "all",
    procurementType: "all",
    fromDate: "",
    toDate: "",
};

const STATUS_OPTIONS: Array<{
    value: ProcurementStatusFilter;
    label: string;
}> = [
    {
        value: "all",
        label: "Tất cả trạng thái",
    },
    {
        value: "no_tbmt",
        label: "Chưa có TBMT",
    },
    {
        value: "has_tbmt_no_kqlcnt",
        label: "Đã có TBMT, chưa có KQLCNT",
    },
    {
        value: "has_kqlcnt",
        label: "Đã có KQLCNT",
    },
];

const PROCUREMENT_TYPE_OPTIONS: Array<{
    value: ProcurementTypeFilter;
    label: string;
}> = [
    {
        value: "all",
        label: "Tất cả loại mua sắm",
    },
    {
        value: "Thuốc",
        label: "Thuốc",
    },
    {
        value: "Hóa chất, vật tư, thiết bị y tế",
        label: "Hóa chất, vật tư, thiết bị y tế",
    },
];

function formatDate(value?: string | null) {
    return value ? new Date(value).toLocaleDateString("vi-VN") : "—";
}

function formatNumber(value?: number | null) {
    return new Intl.NumberFormat("vi-VN").format(value || 0);
}

function formatCurrency(value?: number | null) {
    if (value === null || value === undefined) {
        return "—";
    }

    return new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: "VND",
        maximumFractionDigits: 0,
    }).format(value);
}

function getPlanLabel(item: ProcurementLookupItem) {
    return item.tenKHLCNT?.trim() || item.maKHLCNT?.trim() || "—";
}

function getStatusBadgeClassName(status: ProcurementStatusLabel) {
    if (status === "Đã có KQLCNT") {
        return "bg-emerald-100 text-emerald-700 hover:bg-emerald-100";
    }

    if (status === "Đã có TBMT, chưa có KQLCNT") {
        return "bg-amber-100 text-amber-700 hover:bg-amber-100";
    }

    return "bg-slate-100 text-slate-700 hover:bg-slate-100";
}

async function getErrorMessage(response: Response, fallbackMessage = "Không thể tải dữ liệu tra cứu") {
    try {
        const payload = await response.json() as { message?: string };
        return payload.message || fallbackMessage;
    } catch {
        return fallbackMessage;
    }
}

function buildLookupSearchParams(
    filters: AppliedFilters,
    role: "admin" | "facility",
    options?: {
        page?: number;
        limit?: number;
    }
) {
    const params = new URLSearchParams();

    if (options?.page) {
        params.set("page", options.page.toString());
    }

    if (options?.limit) {
        params.set("limit", options.limit.toString());
    }

    if (filters.searchTerm) {
        params.set("searchTerm", filters.searchTerm);
    }

    if (role === "admin" && filters.facilityId !== "all") {
        params.set("facilityId", filters.facilityId);
    }

    if (filters.procurementStatus !== "all") {
        params.set("procurementStatus", filters.procurementStatus);
    }

    if (filters.procurementType !== "all") {
        params.set("procurementType", filters.procurementType);
    }

    if (filters.fromDate) {
        params.set("fromDate", filters.fromDate);
    }

    if (filters.toDate) {
        params.set("toDate", filters.toDate);
    }

    return params;
}

function PaginationControls({
    currentCount,
    page,
    totalPages,
    totalRows,
    onPageChange,
}: PaginationControlsProps) {
    if (totalRows === 0) {
        return null;
    }

    const rangeStart = (page - 1) * 20 + 1;
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

export default function ProcurementLookupPage({
    role,
    apiUrl,
    pageTitle,
    pageDescription,
}: ProcurementLookupPageProps) {
    const [rows, setRows] = useState<ProcurementLookupItem[]>([]);
    const [summary, setSummary] = useState<ProcurementLookupSummary>(EMPTY_SUMMARY);
    const [facilities, setFacilities] = useState<ProcurementLookupFacilityOption[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchInput, setSearchInput] = useState("");
    const [selectedFacility, setSelectedFacility] = useState("all");
    const [selectedStatus, setSelectedStatus] = useState<ProcurementStatusFilter>("all");
    const [selectedProcurementType, setSelectedProcurementType] = useState<ProcurementTypeFilter>("all");
    const [fromDateInput, setFromDateInput] = useState("");
    const [toDateInput, setToDateInput] = useState("");
    const [appliedFilters, setAppliedFilters] = useState<AppliedFilters>(DEFAULT_FILTERS);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalRows, setTotalRows] = useState(0);
    const [selectedItem, setSelectedItem] = useState<ProcurementLookupItem | null>(null);
    const [detailOpen, setDetailOpen] = useState(false);
    const [isExporting, setIsExporting] = useState(false);

    const latestRequestId = useRef(0);

    const loadData = useCallback(async (pageToLoad: number = page) => {
        const requestId = latestRequestId.current + 1;
        latestRequestId.current = requestId;
        setLoading(true);

        try {
            const params = buildLookupSearchParams(appliedFilters, role, {
                page: pageToLoad,
                limit: 20,
            });

            const response = await fetch(`${apiUrl}?${params.toString()}`);
            if (!response.ok) {
                throw new Error(await getErrorMessage(response));
            }

            const result: ProcurementLookupResponse = await response.json();
            if (latestRequestId.current !== requestId) {
                return;
            }

            setRows(result.data || []);
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

            console.error("Unable to load procurement lookup:", error);
            toast.error(error instanceof Error ? error.message : "Không thể tải dữ liệu tra cứu");
            setRows([]);
            setSummary(EMPTY_SUMMARY);
            setTotalPages(1);
            setTotalRows(0);
        } finally {
            if (latestRequestId.current === requestId) {
                setLoading(false);
            }
        }
    }, [apiUrl, appliedFilters, page, role]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (fromDateInput && toDateInput && fromDateInput > toDateInput) {
            toast.error("Từ ngày không được lớn hơn Đến ngày");
            return;
        }

        setPage(1);
        setAppliedFilters({
            searchTerm: searchInput.trim(),
            facilityId: selectedFacility,
            procurementStatus: selectedStatus,
            procurementType: selectedProcurementType,
            fromDate: fromDateInput,
            toDate: toDateInput,
        });
    };

    const handleReset = () => {
        setSearchInput("");
        setSelectedFacility("all");
        setSelectedStatus("all");
        setSelectedProcurementType("all");
        setFromDateInput("");
        setToDateInput("");
        setPage(1);
        setAppliedFilters(DEFAULT_FILTERS);
    };

    const handleDetailOpen = (item: ProcurementLookupItem) => {
        setSelectedItem(item);
        setDetailOpen(true);
    };

    const handleDetailOpenChange = (open: boolean) => {
        setDetailOpen(open);

        if (!open) {
            setSelectedItem(null);
        }
    };

    const handleExportExcel = async () => {
        setIsExporting(true);

        try {
            const params = buildLookupSearchParams(appliedFilters, role);
            const response = await fetch(`/api/admin/mua-sam/tra-cuu/export?${params.toString()}`);

            if (!response.ok) {
                throw new Error(await getErrorMessage(response, "Không thể xuất Excel tra cứu"));
            }

            const blob = await response.blob();
            const contentDisposition = response.headers.get("Content-Disposition");
            const fileName = getDownloadFileName(contentDisposition, "Tra_Cuu_Mua_Sam.xlsx");

            triggerBlobDownload(blob, fileName);
            toast.success("Đã xuất file Excel thành công");
        } catch (error) {
            console.error("Unable to export procurement lookup:", error);
            toast.error(
                error instanceof Error
                    ? error.message
                    : "Không thể xuất Excel tra cứu"
            );
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">{pageTitle}</h1>
                <p className="mt-1 text-sm text-gray-500">{pageDescription}</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <Card className="border-0 shadow-sm">
                    <CardHeader className="gap-1 pb-3">
                        <CardDescription>Tổng gói thầu</CardDescription>
                        <CardTitle className="text-3xl">{formatNumber(summary.totalPackages)}</CardTitle>
                    </CardHeader>
                </Card>
                <Card className="border-0 shadow-sm">
                    <CardHeader className="gap-1 pb-3">
                        <CardDescription>Chưa có TBMT</CardDescription>
                        <CardTitle className="text-3xl">{formatNumber(summary.chuaCoTBMT)}</CardTitle>
                    </CardHeader>
                </Card>
                <Card className="border-0 shadow-sm">
                    <CardHeader className="gap-1 pb-3">
                        <CardDescription>Đã có TBMT, chưa có KQLCNT</CardDescription>
                        <CardTitle className="text-3xl">{formatNumber(summary.daCoTBMTChuaCoKQLCNT)}</CardTitle>
                    </CardHeader>
                </Card>
                <Card className="border-0 shadow-sm">
                    <CardHeader className="gap-1 pb-3">
                        <CardDescription>Đã có KQLCNT</CardDescription>
                        <CardTitle className="text-3xl">{formatNumber(summary.daCoKQLCNT)}</CardTitle>
                    </CardHeader>
                </Card>
            </div>

            <Card className="border-0 shadow-sm">
                <CardHeader className="pb-4">
                    <CardTitle className="text-lg">Bộ lọc tra cứu</CardTitle>
                    <CardDescription>
                        Tra cứu theo gói thầu quy trình 1, tìm xuyên suốt từ KHLCNT đến kết quả lựa chọn nhà thầu.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form className="grid gap-4 lg:grid-cols-2 xl:grid-cols-7" onSubmit={handleSearchSubmit}>
                        <div className="space-y-2 xl:col-span-2">
                            <Label htmlFor="lookup-search">Từ khóa</Label>
                            <Input
                                id="lookup-search"
                                placeholder="Tên gói thầu, mã KHLCNT, mã TBMT, số QĐ KQLCNT..."
                                value={searchInput}
                                onChange={(event) => setSearchInput(event.target.value)}
                            />
                        </div>

                        {role === "admin" && (
                            <div className="space-y-2">
                                <Label>Đơn vị</Label>
                                <Select value={selectedFacility} onValueChange={setSelectedFacility}>
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Tất cả đơn vị" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Tất cả đơn vị</SelectItem>
                                        {facilities.map((facility) => (
                                            <SelectItem key={facility.id} value={facility.id}>
                                                {facility.facilityName}{facility.facilityCode ? ` (${facility.facilityCode})` : ""}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label>Trạng thái tiến trình</Label>
                            <Select
                                value={selectedStatus}
                                onValueChange={(value) => setSelectedStatus(value as ProcurementStatusFilter)}
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Tất cả trạng thái" />
                                </SelectTrigger>
                                <SelectContent>
                                    {STATUS_OPTIONS.map((option) => (
                                        <SelectItem key={option.value} value={option.value}>
                                            {option.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Loại mua sắm</Label>
                            <Select
                                value={selectedProcurementType}
                                onValueChange={(value) => setSelectedProcurementType(value as ProcurementTypeFilter)}
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Tất cả loại mua sắm" />
                                </SelectTrigger>
                                <SelectContent>
                                    {PROCUREMENT_TYPE_OPTIONS.map((option) => (
                                        <SelectItem key={option.value} value={option.value}>
                                            {option.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="lookup-from-date">Từ ngày phê duyệt KHLCNT</Label>
                            <Input
                                id="lookup-from-date"
                                type="date"
                                value={fromDateInput}
                                onChange={(event) => setFromDateInput(event.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="lookup-to-date">Đến ngày phê duyệt KHLCNT</Label>
                            <Input
                                id="lookup-to-date"
                                type="date"
                                value={toDateInput}
                                onChange={(event) => setToDateInput(event.target.value)}
                            />
                        </div>

                        <div className="flex items-end gap-2 xl:col-span-6">
                            <Button type="submit" disabled={loading}>
                                {loading ? <Loader2 className="animate-spin" /> : null}
                                Tìm kiếm
                            </Button>
                            <Button type="button" variant="outline" onClick={handleReset} disabled={loading}>
                                Đặt lại
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
                <CardHeader className="pb-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                            <CardTitle className="text-lg">Danh sách gói thầu</CardTitle>
                            <CardDescription>
                                Mỗi dòng thể hiện tiến trình mua sắm đầy đủ của một gói thầu.
                            </CardDescription>
                        </div>

                        {role === "admin" && (
                            <Button
                                type="button"
                                variant="outline"
                                onClick={handleExportExcel}
                                disabled={isExporting}
                            >
                                {isExporting ? <Loader2 className="animate-spin" /> : null}
                                {isExporting ? "Đang xuất..." : "Xuất Excel"}
                            </Button>
                        )}
                    </div>
                </CardHeader>
                <CardContent className="px-0">
                    {loading ? (
                        <div className="flex min-h-64 items-center justify-center text-gray-500">
                            <Loader2 className="mr-2 animate-spin" />
                            Đang tải dữ liệu...
                        </div>
                    ) : (
                        <>
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-blue-600 hover:bg-blue-600">
                                        {role === "admin" && (
                                            <TableHead className="px-4 text-white font-bold">Đơn vị</TableHead>
                                        )}
                                        <TableHead className="px-4 text-white font-bold">Mã KHLCNT</TableHead>
                                        <TableHead className="px-4 text-white font-bold">Tên KHLCNT</TableHead>
                                        <TableHead className="px-4 text-white font-bold">Tên gói thầu</TableHead>
                                        <TableHead className="px-4 text-white font-bold">Giá gói thầu</TableHead>
                                        <TableHead className="px-4 text-white font-bold">Mã TBMT</TableHead>
                                        <TableHead className="px-4 text-white font-bold">Ngày đăng tải TBMT</TableHead>
                                        <TableHead className="px-4 text-white font-bold">Số QĐ KQLCNT</TableHead>
                                        <TableHead className="px-4 text-white font-bold">Ngày phê duyệt KQLCNT</TableHead>
                                        <TableHead className="px-4 text-white font-bold">Số MH trúng thầu</TableHead>
                                        <TableHead className="px-4 text-white font-bold">Tổng giá trị trúng thầu</TableHead>
                                        <TableHead className="px-4 text-white font-bold">Số nhà thầu</TableHead>
                                        <TableHead className="px-4 text-white font-bold">Trạng thái</TableHead>
                                        <TableHead className="px-4 text-white font-bold">Thao tác</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {rows.length === 0 ? (
                                        <TableRow>
                                            <TableCell
                                                colSpan={role === "admin" ? 14 : 13}
                                                className="px-4 py-12 text-center text-gray-400"
                                            >
                                                Không có gói thầu nào phù hợp với điều kiện tra cứu.
                                            </TableCell>
                                        </TableRow>
                                    ) : rows.map((item) => (
                                        <TableRow key={item.goiThauId} className="hover:bg-blue-50/40">
                                            {role === "admin" && (
                                                <TableCell className="px-4">
                                                    <div className="min-w-[180px]">
                                                        <p className="font-medium text-gray-900">{item.facilityName}</p>
                                                        <p className="text-xs text-gray-500">{item.facilityCode || "—"}</p>
                                                    </div>
                                                </TableCell>
                                            )}
                                            <TableCell className="px-4 font-mono text-sm">{item.maKHLCNT || "—"}</TableCell>
                                            <TableCell className="px-4 max-w-[280px] whitespace-normal break-words text-sm">
                                                {item.tenKHLCNT || "—"}
                                            </TableCell>
                                            <TableCell className="px-4 max-w-[280px] whitespace-normal break-words text-sm font-medium">
                                                {item.tenGoiThau || "—"}
                                            </TableCell>
                                            <TableCell className="px-4 text-sm">{formatCurrency(item.giaGoiThau)}</TableCell>
                                            <TableCell className="px-4 font-mono text-sm">{item.maTBMT || "—"}</TableCell>
                                            <TableCell className="px-4 text-sm">{formatDate(item.ngayDangTaiTBMT)}</TableCell>
                                            <TableCell className="px-4 max-w-[200px] whitespace-normal break-words text-sm">
                                                {item.soQdPheDuyetKQLCNT || "—"}
                                            </TableCell>
                                            <TableCell className="px-4 text-sm">{formatDate(item.ngayPheDuyetKQLCNT)}</TableCell>
                                            <TableCell className="px-4 text-sm">{item.soMatHangTrungThau ?? "—"}</TableCell>
                                            <TableCell className="px-4 text-sm">{formatCurrency(item.tongGiaTriTrungThau)}</TableCell>
                                            <TableCell className="px-4 text-sm">{formatNumber(item.soLuongNhaThauTrung)}</TableCell>
                                            <TableCell className="px-4">
                                                <Badge className={getStatusBadgeClassName(item.procurementStatus)}>
                                                    {item.procurementStatus}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="px-4">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleDetailOpen(item)}
                                                >
                                                    Xem chi tiết
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>

                            <PaginationControls
                                currentCount={rows.length}
                                page={page}
                                totalPages={totalPages}
                                totalRows={totalRows}
                                onPageChange={setPage}
                            />
                        </>
                    )}
                </CardContent>
            </Card>

            <Dialog open={detailOpen} onOpenChange={handleDetailOpenChange}>
                <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-5xl">
                    <DialogHeader>
                        <DialogTitle>Chi tiết gói thầu</DialogTitle>
                        <DialogDescription>
                            {selectedItem ? selectedItem.tenGoiThau : "Chi tiết tiến trình mua sắm của gói thầu"}
                        </DialogDescription>
                    </DialogHeader>

                    {selectedItem ? (
                        <div className="space-y-6">
                            <div className="grid gap-4 md:grid-cols-2">
                                <Card>
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-base">Thông tin đơn vị</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        <div>
                                            <Label className="text-xs text-gray-500">Tên đơn vị</Label>
                                            <p className="mt-1 font-medium">{selectedItem.facilityName}</p>
                                        </div>
                                        <div>
                                            <Label className="text-xs text-gray-500">Mã đơn vị</Label>
                                            <p className="mt-1 font-medium">{selectedItem.facilityCode || "—"}</p>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-base">Thông tin KHLCNT</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        <div>
                                            <Label className="text-xs text-gray-500">Mã KHLCNT</Label>
                                            <p className="mt-1 font-medium">{selectedItem.maKHLCNT || "—"}</p>
                                        </div>
                                        <div>
                                            <Label className="text-xs text-gray-500">Tên KHLCNT</Label>
                                            <p className="mt-1 font-medium">{selectedItem.tenKHLCNT || "—"}</p>
                                        </div>
                                        <div>
                                            <Label className="text-xs text-gray-500">Số quyết định</Label>
                                            <p className="mt-1 font-medium">{selectedItem.soQuyetDinh || "—"}</p>
                                        </div>
                                        <div>
                                            <Label className="text-xs text-gray-500">Ngày phê duyệt</Label>
                                            <p className="mt-1 font-medium">{formatDate(selectedItem.ngayPheDuyet)}</p>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            <Card>
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-base">Thông tin gói thầu</CardTitle>
                                </CardHeader>
                                <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                                    <div className="xl:col-span-2">
                                        <Label className="text-xs text-gray-500">Tên gói thầu</Label>
                                        <p className="mt-1 font-medium">{selectedItem.tenGoiThau}</p>
                                    </div>
                                    <div>
                                        <Label className="text-xs text-gray-500">Giá gói thầu</Label>
                                        <p className="mt-1 font-medium">{formatCurrency(selectedItem.giaGoiThau)}</p>
                                    </div>
                                    <div>
                                        <Label className="text-xs text-gray-500">Số lượng phần lô</Label>
                                        <p className="mt-1 font-medium">{selectedItem.soLuongPhanLo ?? "—"}</p>
                                    </div>
                                    <div>
                                        <Label className="text-xs text-gray-500">Hình thức LCNT</Label>
                                        <p className="mt-1 font-medium">{selectedItem.hinhThucLCNT || "—"}</p>
                                    </div>
                                    <div>
                                        <Label className="text-xs text-gray-500">Phương thức LCNT</Label>
                                        <p className="mt-1 font-medium">{selectedItem.phuongThucLCNT || "—"}</p>
                                    </div>
                                    <div className="xl:col-span-2">
                                        <Label className="text-xs text-gray-500">Loại hợp đồng</Label>
                                        <p className="mt-1 font-medium">
                                            {selectedItem.loaiHopDong.length > 0
                                                ? selectedItem.loaiHopDong.join(", ")
                                                : "—"}
                                        </p>
                                    </div>
                                    <div>
                                        <Label className="text-xs text-gray-500">Trạng thái gói thầu</Label>
                                        <p className="mt-1 font-medium">{selectedItem.trangThaiGoiThau || "—"}</p>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-base">Tiến trình và kết quả</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                                        <div>
                                            <Label className="text-xs text-gray-500">Trạng thái tiến trình</Label>
                                            <div className="mt-1">
                                                <Badge className={getStatusBadgeClassName(selectedItem.procurementStatus)}>
                                                    {selectedItem.procurementStatus}
                                                </Badge>
                                            </div>
                                        </div>
                                        <div>
                                            <Label className="text-xs text-gray-500">Mã TBMT</Label>
                                            <p className="mt-1 font-medium">{selectedItem.maTBMT || "—"}</p>
                                        </div>
                                        <div>
                                            <Label className="text-xs text-gray-500">Ngày đăng tải TBMT</Label>
                                            <p className="mt-1 font-medium">{formatDate(selectedItem.ngayDangTaiTBMT)}</p>
                                        </div>
                                        <div>
                                            <Label className="text-xs text-gray-500">Ngày đóng thầu</Label>
                                            <p className="mt-1 font-medium">{formatDate(selectedItem.ngayDongThau)}</p>
                                        </div>
                                        <div>
                                            <Label className="text-xs text-gray-500">Số QĐ KQLCNT</Label>
                                            <p className="mt-1 font-medium">{selectedItem.soQdPheDuyetKQLCNT || "—"}</p>
                                        </div>
                                        <div>
                                            <Label className="text-xs text-gray-500">Ngày phê duyệt KQLCNT</Label>
                                            <p className="mt-1 font-medium">{formatDate(selectedItem.ngayPheDuyetKQLCNT)}</p>
                                        </div>
                                        <div>
                                            <Label className="text-xs text-gray-500">Số mặt hàng mời thầu</Label>
                                            <p className="mt-1 font-medium">{selectedItem.soMatHangMoiThau ?? "—"}</p>
                                        </div>
                                        <div>
                                            <Label className="text-xs text-gray-500">Số mặt hàng trúng thầu</Label>
                                            <p className="mt-1 font-medium">{selectedItem.soMatHangTrungThau ?? "—"}</p>
                                        </div>
                                        <div className="md:col-span-2">
                                            <Label className="text-xs text-gray-500">Tổng giá trị trúng thầu</Label>
                                            <p className="mt-1 font-medium">{formatCurrency(selectedItem.tongGiaTriTrungThau)}</p>
                                        </div>
                                        <div className="md:col-span-2">
                                            <Label className="text-xs text-gray-500">Kế hoạch</Label>
                                            <p className="mt-1 font-medium">{getPlanLabel(selectedItem)}</p>
                                        </div>
                                    </div>

                                    <div>
                                        <Label className="text-xs text-gray-500">Danh sách nhà thầu trúng thầu</Label>
                                        {selectedItem.danhSachNhaThauTrung.length > 0 ? (
                                            <div className="mt-2 flex flex-wrap gap-2">
                                                {selectedItem.danhSachNhaThauTrung.map((contractor) => (
                                                    <Badge key={contractor} variant="outline" className="whitespace-normal py-1 text-left">
                                                        {contractor}
                                                    </Badge>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="mt-2 text-sm text-gray-500">Chưa có nhà thầu trúng thầu.</p>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-base">Chi tiết phần lô</CardTitle>
                                </CardHeader>
                                <CardContent className="px-0">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="px-4">Tên phần lô</TableHead>
                                                <TableHead className="px-4">Kết quả</TableHead>
                                                <TableHead className="px-4">Đơn giá trúng thầu</TableHead>
                                                <TableHead className="px-4">Nhà thầu trúng thầu</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {selectedItem.phanLoResults.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={4} className="px-4 py-8 text-center text-gray-500">
                                                        Chưa có dữ liệu chi tiết phần lô.
                                                    </TableCell>
                                                </TableRow>
                                            ) : selectedItem.phanLoResults.map((phanLo) => (
                                                <TableRow key={phanLo.phanLoGoiThauId}>
                                                    <TableCell className="px-4 max-w-[260px] whitespace-normal break-words">
                                                        {phanLo.tenPhanLo}
                                                    </TableCell>
                                                    <TableCell className="px-4">{phanLo.ketQua || "—"}</TableCell>
                                                    <TableCell className="px-4">{formatCurrency(phanLo.donGiaTrungThau)}</TableCell>
                                                    <TableCell className="px-4 max-w-[260px] whitespace-normal break-words">
                                                        {phanLo.nhaThauTrungThau || "—"}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                        </div>
                    ) : null}
                </DialogContent>
            </Dialog>
        </div>
    );
}
