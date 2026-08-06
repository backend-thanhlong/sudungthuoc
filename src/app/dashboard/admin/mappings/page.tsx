"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
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
    DialogFooter,
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
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { Trash2, XCircle, Download, Pencil, Search, X } from "lucide-react";
import { exportExcel } from "@/lib/excel";
import {
    compareReportDates,
    isCategoryMarked,
    normalizeReportText,
    parseReportDateValue,
    parseStrictNumber,
} from "@/lib/report-validation";

type ListTab = "pending" | "summary";
type DetailViewMode = "pending" | "all";

const FACILITY_PAGE_SIZE = 10;
const DETAIL_PAGE_SIZE = 50;
const DETAIL_SEARCH_FIELDS = [
    { value: "all", label: "Tất cả trường" },
    { value: "maNoiBo", label: "Mã nội bộ" },
    { value: "tenThuocNoiBo", label: "Tên thuốc nội bộ" },
    { value: "hoatChatNoiBo", label: "Hoạt chất nội bộ" },
    { value: "soDangKyNoiBo", label: "SĐK nội bộ" },
    { value: "nhomTckt", label: "Nhóm TCKT" },
    { value: "maChung", label: "Mã DQG" },
    { value: "tenThuoc", label: "Tên thuốc DQG" },
    { value: "hoatChat", label: "Hoạt chất DQG" },
    { value: "soDangKy", label: "SĐK DQG" },
    { value: "status", label: "Trạng thái" },
] as const;
type DetailSearchField = (typeof DETAIL_SEARCH_FIELDS)[number]["value"];
const DETAIL_SEARCH_FIELD_LABELS = Object.fromEntries(
    DETAIL_SEARCH_FIELDS.map((field) => [field.value, field.label])
) as Record<DetailSearchField, string>;

interface MasterDrugSummary {
    id: string;
    maChung: string;
    tenThuoc: string;
    hoatChat: string | null;
    hamLuong: string | null;
    dangBaoChe: string | null;
    soDangKy: string | null;
    donViTinh: string | null;
}

interface MappingDetailItem {
    id: string;
    maNoiBo: string;
    tenThuocNoiBo: string;
    hoatChatNoiBo: string | null;
    soDangKyNoiBo: string | null;
    donViTinhNoiBo: string | null;
    nhomTckt: string | null;
    giaVat: number | string;
    bhyt: string | null;
    dichVu: string | null;
    soQdTrungThau: string | null;
    tenCongTy: string | null;
    ngayBatDauHd: string | null;
    ngayKetThucHd: string | null;
    status: string;
    adminNote: string | null;
    isOutOfCatalog: boolean;
    createdAt: string;
    updatedAt: string;
    masterDrug: MasterDrugSummary | null;
}

interface FacilitySummaryItem {
    facilityCode: string;
    facilityName: string;
    pendingCount: number;
    approvedCount: number;
    rejectedCount: number;
    totalUploaded: number;
    successCount: number;
    lastRequestDate: string | null;
    lastApprovalDate: string | null;
    lastActivityDate: string | null;
}

interface PaginationMeta {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

interface FacilityListState {
    items: FacilitySummaryItem[];
    pagination: PaginationMeta;
    isLoading: boolean;
    isLoaded: boolean;
}

interface FacilityListResponse {
    items?: FacilitySummaryItem[];
    pagination?: Partial<PaginationMeta>;
}

interface DetailFacilitySummary {
    facilityCode: string;
    facilityName: string;
    pendingCount: number;
}

interface FacilityDetailResponse {
    facility?: DetailFacilitySummary;
    items?: MappingDetailItem[];
    pagination?: Partial<PaginationMeta>;
}

const createPagination = (limit: number): PaginationMeta => ({
    page: 1,
    limit,
    total: 0,
    totalPages: 1,
});

const createFacilityListState = (): FacilityListState => ({
    items: [],
    pagination: createPagination(FACILITY_PAGE_SIZE),
    isLoading: false,
    isLoaded: false,
});

const INITIAL_LIST_STATES: Record<ListTab, FacilityListState> = {
    pending: createFacilityListState(),
    summary: createFacilityListState(),
};

const ADMIN_EDITABLE_MAPPING_STATUSES = new Set(["APPROVED", "AUTO_MAPPED"]);

const normalizeMappingCategory = (value: unknown) => {
    const normalized = normalizeReportText(value);
    if (!normalized) return { value: "", valid: true };
    return { value: isCategoryMarked(normalized) ? "X" : normalized, valid: isCategoryMarked(normalized) };
};

const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    try {
        return new Date(dateString).toLocaleDateString("vi-VN", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
        });
    } catch {
        return dateString;
    }
};

const getStatusBadge = (status: string) => {
    switch (status) {
        case "WAITING_APPROVAL":
            return <Badge className="bg-amber-100 text-amber-800">Chờ duyệt</Badge>;
        case "APPROVED":
            return <Badge className="bg-green-100 text-green-800">Đã duyệt</Badge>;
        case "REJECTED":
            return <Badge className="bg-red-100 text-red-800">Từ chối</Badge>;
        case "AUTO_MAPPED":
            return <Badge className="bg-blue-100 text-blue-800">Tự động</Badge>;
        default:
            return <Badge variant="secondary">{status}</Badge>;
    }
};

interface PaginationControlsProps {
    page: number;
    pageSize: number;
    totalPages: number;
    totalItems: number;
    currentCount: number;
    itemLabel: string;
    onPageChange: (page: number) => void;
}

function PaginationControls({
    page,
    pageSize,
    totalPages,
    totalItems,
    currentCount,
    itemLabel,
    onPageChange,
}: PaginationControlsProps) {
    if (totalItems === 0 || currentCount === 0) {
        return null;
    }

    const rangeStart = (page - 1) * pageSize + 1;
    const rangeEnd = Math.min(totalItems, (page - 1) * pageSize + currentCount);

    return (
        <div className="mt-4 flex flex-col gap-3 border-t px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-1 text-sm text-gray-500 sm:flex-row sm:items-center sm:gap-4">
                <span>Hiển thị {rangeStart}-{rangeEnd} / {totalItems} {itemLabel}</span>
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

function FacilityPendingTable({
    summaries,
    page,
    onOpenDetail,
}: {
    summaries: FacilitySummaryItem[];
    page: number;
    onOpenDetail: (facilityCode: string, viewMode: DetailViewMode) => void;
}) {
    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead className="w-[50px]">STT</TableHead>
                    <TableHead>Tên cơ sở</TableHead>
                    <TableHead className="text-center">Số thuốc cần duyệt</TableHead>
                    <TableHead>Ngày yêu cầu duyệt</TableHead>
                    <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {summaries.map((summary, index) => (
                    <TableRow key={summary.facilityCode}>
                        <TableCell>{(page - 1) * FACILITY_PAGE_SIZE + index + 1}</TableCell>
                        <TableCell>
                            <div>
                                <p className="font-medium">{summary.facilityName}</p>
                                <code className="text-xs text-gray-500">{summary.facilityCode}</code>
                            </div>
                        </TableCell>
                        <TableCell className="text-center font-bold text-amber-600">
                            {summary.pendingCount}
                        </TableCell>
                        <TableCell>{formatDate(summary.lastRequestDate)}</TableCell>
                        <TableCell className="text-right">
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => onOpenDetail(summary.facilityCode, "pending")}
                            >
                                Xem cụ thể danh mục
                            </Button>
                        </TableCell>
                    </TableRow>
                ))}
                {summaries.length === 0 && (
                    <TableRow>
                        <TableCell colSpan={5} className="py-8 text-center text-gray-500">
                            Không có yêu cầu chờ duyệt
                        </TableCell>
                    </TableRow>
                )}
            </TableBody>
        </Table>
    );
}

function FacilitySummaryTable({
    summaries,
    page,
    onOpenDetail,
    onDeleteFacility,
}: {
    summaries: FacilitySummaryItem[];
    page: number;
    onOpenDetail: (facilityCode: string, viewMode: DetailViewMode) => void;
    onDeleteFacility: (facility: { code: string; name: string }) => void;
}) {
    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead className="w-[50px]">STT</TableHead>
                    <TableHead>Tên cơ sở</TableHead>
                    <TableHead className="text-center">Tổng thuốc upload</TableHead>
                    <TableHead className="text-center">Ánh xạ thành công</TableHead>
                    <TableHead>Ngày yêu cầu duyệt</TableHead>
                    <TableHead className="text-center">Số thuốc đã duyệt</TableHead>
                    <TableHead className="text-center">Số thuốc từ chối</TableHead>
                    <TableHead>Ngày Duyệt</TableHead>
                    <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {summaries.map((summary, index) => (
                    <TableRow key={summary.facilityCode}>
                        <TableCell>{(page - 1) * FACILITY_PAGE_SIZE + index + 1}</TableCell>
                        <TableCell>
                            <div>
                                <p className="font-medium">{summary.facilityName}</p>
                                <code className="text-xs text-gray-500">{summary.facilityCode}</code>
                            </div>
                        </TableCell>
                        <TableCell className="text-center font-bold text-gray-700">
                            {summary.totalUploaded}
                        </TableCell>
                        <TableCell className="text-center font-bold text-blue-600">
                            {summary.successCount}
                        </TableCell>
                        <TableCell>{formatDate(summary.lastRequestDate)}</TableCell>
                        <TableCell className="text-center font-medium text-green-600">
                            {summary.approvedCount}
                        </TableCell>
                        <TableCell className="text-center font-medium text-red-600">
                            {summary.rejectedCount}
                        </TableCell>
                        <TableCell>{formatDate(summary.lastApprovalDate)}</TableCell>
                        <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => onOpenDetail(summary.facilityCode, "all")}
                                >
                                    Xem chi tiết
                                </Button>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    className="text-red-500 hover:bg-red-50 hover:text-red-700"
                                    title="Xóa tất cả dữ liệu thuốc"
                                    onClick={() => onDeleteFacility({
                                        code: summary.facilityCode,
                                        name: summary.facilityName,
                                    })}
                                >
                                    <Trash2 size={16} />
                                </Button>
                            </div>
                        </TableCell>
                    </TableRow>
                ))}
                {summaries.length === 0 && (
                    <TableRow>
                        <TableCell colSpan={9} className="py-8 text-center text-gray-500">
                            Không có dữ liệu
                        </TableCell>
                    </TableRow>
                )}
            </TableBody>
        </Table>
    );
}

function TableLoadingState() {
    return (
        <div className="flex items-center justify-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-amber-500" />
        </div>
    );
}

export default function MappingsApprovalPage() {
    const [activeTab, setActiveTab] = useState<ListTab>("pending");
    const [listStates, setListStates] = useState<Record<ListTab, FacilityListState>>(INITIAL_LIST_STATES);
    const [pageByTab, setPageByTab] = useState<Record<ListTab, number>>({
        pending: 1,
        summary: 1,
    });

    const [selectedMapping, setSelectedMapping] = useState<MappingDetailItem | null>(null);
    const [rejectNote, setRejectNote] = useState("");
    const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
    const [isEditInfoDialogOpen, setIsEditInfoDialogOpen] = useState(false);
    const [editFormData, setEditFormData] = useState({
        maNoiBo: "",
        tenThuocNoiBo: "",
        hoatChatNoiBo: "",
        soDangKyNoiBo: "",
        donViTinhNoiBo: "",
        giaVat: "",
        bhyt: "",
        dichVu: "",
        soQdTrungThau: "",
        tenCongTy: "",
        ngayBatDauHd: "",
        ngayKetThucHd: "",
    });
    const [isProcessing, setIsProcessing] = useState(false);

    const [selectedFacilityCode, setSelectedFacilityCode] = useState<string | null>(null);
    const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
    const [detailViewMode, setDetailViewMode] = useState<DetailViewMode>("pending");
    const [detailFacility, setDetailFacility] = useState<DetailFacilitySummary | null>(null);
    const [detailItems, setDetailItems] = useState<MappingDetailItem[]>([]);
    const [detailPagination, setDetailPagination] = useState<PaginationMeta>(createPagination(DETAIL_PAGE_SIZE));
    const [isDetailLoading, setIsDetailLoading] = useState(false);
    const [detailSearchField, setDetailSearchField] = useState<DetailSearchField>("all");
    const [detailAppliedSearchField, setDetailAppliedSearchField] = useState<DetailSearchField>("all");
    const [detailSearchInput, setDetailSearchInput] = useState("");
    const [detailSearchTerm, setDetailSearchTerm] = useState("");
    const [selectedDetailIds, setSelectedDetailIds] = useState<string[]>([]);
    const selectAllDetailCheckboxRef = useRef<HTMLInputElement>(null);

    const [facilityToDelete, setFacilityToDelete] = useState<{ code: string; name: string } | null>(null);
    const [facilityToApprove, setFacilityToApprove] = useState<{ code: string; name: string } | null>(null);
    const [facilityToReject, setFacilityToReject] = useState<{ code: string; name: string } | null>(null);
    const [rejectAllNote, setRejectAllNote] = useState("");

    const latestRequestIds = useRef({
        pending: 0,
        summary: 0,
        detail: 0,
    });

    const loadFacilityTab = useCallback(async (tab: ListTab, pageToLoad: number) => {
        const requestId = latestRequestIds.current[tab] + 1;
        latestRequestIds.current[tab] = requestId;

        setListStates((prev) => ({
            ...prev,
            [tab]: {
                ...prev[tab],
                isLoading: true,
            },
        }));

        try {
            const params = new URLSearchParams({
                tab,
                page: pageToLoad.toString(),
                limit: FACILITY_PAGE_SIZE.toString(),
            });

            const res = await fetch(`/api/admin/mappings/facilities?${params.toString()}`);
            if (!res.ok) {
                throw new Error("Failed to fetch");
            }

            const result: FacilityListResponse = await res.json();
            if (latestRequestIds.current[tab] !== requestId) {
                return;
            }

            const nextPagination: PaginationMeta = {
                page: result.pagination?.page ?? pageToLoad,
                limit: result.pagination?.limit ?? FACILITY_PAGE_SIZE,
                total: result.pagination?.total ?? 0,
                totalPages: result.pagination?.totalPages ?? 1,
            };

            setListStates((prev) => ({
                ...prev,
                [tab]: {
                    items: result.items || [],
                    pagination: nextPagination,
                    isLoading: false,
                    isLoaded: true,
                },
            }));

            if (nextPagination.page !== pageToLoad) {
                setPageByTab((prev) => ({
                    ...prev,
                    [tab]: nextPagination.page,
                }));
            }
        } catch (error) {
            if (latestRequestIds.current[tab] !== requestId) {
                return;
            }

            console.error(`Error fetching ${tab} facilities:`, error);
            toast.error("Không thể tải danh sách ánh xạ");

            setListStates((prev) => ({
                ...prev,
                [tab]: {
                    ...prev[tab],
                    isLoading: false,
                    isLoaded: true,
                },
            }));
        }
    }, []);

    const loadDetailPage = useCallback(async (
        facilityCode: string,
        viewMode: DetailViewMode,
        pageToLoad: number,
        search = {
            field: detailAppliedSearchField,
            term: detailSearchTerm,
        }
    ) => {
        const requestId = latestRequestIds.current.detail + 1;
        latestRequestIds.current.detail = requestId;
        setIsDetailLoading(true);
        setSelectedDetailIds([]);

        try {
            const params = new URLSearchParams({
                viewMode,
                page: pageToLoad.toString(),
                limit: DETAIL_PAGE_SIZE.toString(),
                searchField: search.field,
            });
            if (search.term) {
                params.set("searchTerm", search.term);
            }

            const res = await fetch(`/api/admin/mappings/facilities/${facilityCode}/details?${params.toString()}`);
            if (!res.ok) {
                throw new Error("Failed to fetch detail");
            }

            const result: FacilityDetailResponse = await res.json();
            if (latestRequestIds.current.detail !== requestId) {
                return;
            }

            setDetailFacility(result.facility || null);
            setDetailItems(result.items || []);
            setDetailPagination({
                page: result.pagination?.page ?? pageToLoad,
                limit: result.pagination?.limit ?? DETAIL_PAGE_SIZE,
                total: result.pagination?.total ?? 0,
                totalPages: result.pagination?.totalPages ?? 1,
            });
            setIsDetailLoading(false);
        } catch (error) {
            if (latestRequestIds.current.detail !== requestId) {
                return;
            }

            console.error("Error fetching facility detail:", error);
            toast.error("Không thể tải chi tiết cơ sở");
            setIsDetailLoading(false);
        }
    }, [detailAppliedSearchField, detailSearchTerm]);

    useEffect(() => {
        void Promise.all([
            loadFacilityTab("pending", 1),
            loadFacilityTab("summary", 1),
        ]);
    }, [loadFacilityTab]);

    const refreshAfterMutation = useCallback(async (options?: { refetchDetail?: boolean }) => {
        const shouldRefetchDetail = options?.refetchDetail && isDetailDialogOpen && !!selectedFacilityCode;
        const pendingPromise = loadFacilityTab("pending", pageByTab.pending);
        const summaryPromise = loadFacilityTab("summary", pageByTab.summary);
        const detailPromise = shouldRefetchDetail && selectedFacilityCode
            ? loadDetailPage(selectedFacilityCode, detailViewMode, detailPagination.page)
            : Promise.resolve();

        await Promise.all([pendingPromise, summaryPromise, detailPromise]);
    }, [
        detailPagination.page,
        detailViewMode,
        isDetailDialogOpen,
        loadDetailPage,
        loadFacilityTab,
        pageByTab.pending,
        pageByTab.summary,
        selectedFacilityCode,
    ]);

    const openDetailDialog = (facilityCode: string, viewMode: DetailViewMode) => {
        setSelectedFacilityCode(facilityCode);
        setDetailViewMode(viewMode);
        setDetailFacility(null);
        setDetailItems([]);
        setDetailPagination(createPagination(DETAIL_PAGE_SIZE));
        setDetailSearchField("all");
        setDetailAppliedSearchField("all");
        setDetailSearchInput("");
        setDetailSearchTerm("");
        setSelectedDetailIds([]);
        setIsDetailDialogOpen(true);
        void loadDetailPage(facilityCode, viewMode, 1, { field: "all", term: "" });
    };

    const handleDetailDialogChange = (open: boolean) => {
        setIsDetailDialogOpen(open);
        if (!open) {
            latestRequestIds.current.detail += 1;
            setSelectedFacilityCode(null);
            setDetailFacility(null);
            setDetailItems([]);
            setDetailPagination(createPagination(DETAIL_PAGE_SIZE));
            setDetailSearchField("all");
            setDetailAppliedSearchField("all");
            setDetailSearchInput("");
            setDetailSearchTerm("");
            setSelectedDetailIds([]);
            setIsDetailLoading(false);
        }
    };

    const handleTabChange = (value: string) => {
        const nextTab = value === "summary" ? "summary" : "pending";
        setActiveTab(nextTab);

        if (!listStates[nextTab].isLoaded) {
            void loadFacilityTab(nextTab, pageByTab[nextTab]);
        }
    };

    const handleFacilityPageChange = (tab: ListTab, nextPage: number) => {
        const totalPages = listStates[tab].pagination.totalPages;
        const safePage = Math.max(1, Math.min(totalPages, nextPage));

        if (safePage === pageByTab[tab]) {
            return;
        }

        setPageByTab((prev) => ({
            ...prev,
            [tab]: safePage,
        }));
        void loadFacilityTab(tab, safePage);
    };

    const handleDetailPageChange = (nextPage: number) => {
        if (!selectedFacilityCode) {
            return;
        }

        const safePage = Math.max(1, Math.min(detailPagination.totalPages, nextPage));
        if (safePage === detailPagination.page) {
            return;
        }

        void loadDetailPage(selectedFacilityCode, detailViewMode, safePage, {
            field: detailAppliedSearchField,
            term: detailSearchTerm,
        });
    };

    const handleDetailSearch = () => {
        if (!selectedFacilityCode) {
            return;
        }

        const nextSearchTerm = detailSearchInput.trim();
        setDetailSearchInput(nextSearchTerm);
        setDetailAppliedSearchField(detailSearchField);
        setDetailSearchTerm(nextSearchTerm);
        setDetailPagination((prev) => ({ ...prev, page: 1 }));
        void loadDetailPage(selectedFacilityCode, detailViewMode, 1, {
            field: detailSearchField,
            term: nextSearchTerm,
        });
    };

    const handleResetDetailSearch = () => {
        if (!selectedFacilityCode) {
            return;
        }

        setDetailSearchField("all");
        setDetailAppliedSearchField("all");
        setDetailSearchInput("");
        setDetailSearchTerm("");
        setDetailPagination((prev) => ({ ...prev, page: 1 }));
        void loadDetailPage(selectedFacilityCode, detailViewMode, 1, {
            field: "all",
            term: "",
        });
    };

    const toggleDetailSelection = (mappingId: string) => {
        setSelectedDetailIds((current) => (
            current.includes(mappingId)
                ? current.filter((id) => id !== mappingId)
                : [...current, mappingId]
        ));
    };

    const handleToggleVisiblePendingSelection = () => {
        const visiblePendingIds = detailItems
            .filter((mapping) => mapping.status === "WAITING_APPROVAL")
            .map((mapping) => mapping.id);

        if (visiblePendingIds.length === 0) {
            return;
        }

        const allVisibleSelected = visiblePendingIds.every((id) => selectedDetailIds.includes(id));
        setSelectedDetailIds((current) => {
            if (allVisibleSelected) {
                return current.filter((id) => !visiblePendingIds.includes(id));
            }

            return Array.from(new Set([...current, ...visiblePendingIds]));
        });
    };

    const handleApprove = async (mappingId: string) => {
        setIsProcessing(true);
        try {
            const res = await fetch(`/api/admin/mappings/${mappingId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: "APPROVED" }),
            });

            if (!res.ok) {
                throw new Error("Failed to approve mapping");
            }

            toast.success("Đã duyệt ánh xạ");
            await refreshAfterMutation({ refetchDetail: true });
        } catch (error) {
            console.error("Approve error:", error);
            toast.error("Đã xảy ra lỗi");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleReject = async () => {
        if (!selectedMapping) return;
        setIsProcessing(true);

        try {
            const res = await fetch(`/api/admin/mappings/${selectedMapping.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: "REJECTED", adminNote: rejectNote }),
            });

            if (!res.ok) {
                throw new Error("Failed to reject mapping");
            }

            toast.success("Đã từ chối ánh xạ");
            setIsRejectDialogOpen(false);
            setSelectedMapping(null);
            setRejectNote("");
            await refreshAfterMutation({ refetchDetail: true });
        } catch (error) {
            console.error("Reject error:", error);
            toast.error("Đã xảy ra lỗi");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleOpenEditInfo = (mapping: MappingDetailItem) => {
        setSelectedMapping(mapping);
        setEditFormData({
            maNoiBo: mapping.maNoiBo,
            tenThuocNoiBo: mapping.tenThuocNoiBo,
            hoatChatNoiBo: mapping.hoatChatNoiBo || "",
            soDangKyNoiBo: mapping.soDangKyNoiBo || "",
            donViTinhNoiBo: mapping.donViTinhNoiBo || "",
            giaVat: String(mapping.giaVat ?? ""),
            bhyt: mapping.bhyt || "",
            dichVu: mapping.dichVu || "",
            soQdTrungThau: mapping.soQdTrungThau || "",
            tenCongTy: mapping.tenCongTy || "",
            ngayBatDauHd: mapping.ngayBatDauHd || "",
            ngayKetThucHd: mapping.ngayKetThucHd || "",
        });
        setIsEditInfoDialogOpen(true);
    };

    const handleSaveInfo = async () => {
        if (!selectedMapping) return;

        const ngayBatDauHd = parseReportDateValue(editFormData.ngayBatDauHd);
        const ngayKetThucHd = parseReportDateValue(editFormData.ngayKetThucHd);
        const giaVat = parseStrictNumber(editFormData.giaVat);
        const bhyt = normalizeMappingCategory(editFormData.bhyt);
        const dichVu = normalizeMappingCategory(editFormData.dichVu);

        if (!ngayBatDauHd.valid) {
            toast.error("Ngày bắt đầu HĐ phải theo định dạng YYYYMMDD và là ngày hợp lệ");
            return;
        }

        if (!ngayKetThucHd.valid) {
            toast.error("Ngày kết thúc HĐ phải theo định dạng YYYYMMDD và là ngày hợp lệ");
            return;
        }

        if (
            ngayBatDauHd.value
            && ngayKetThucHd.value
            && compareReportDates(ngayBatDauHd.value, ngayKetThucHd.value) > 0
        ) {
            toast.error("Ngày bắt đầu HĐ không được lớn hơn Ngày kết thúc HĐ");
            return;
        }

        if (!giaVat.valid || giaVat.blank || giaVat.value < 0) {
            toast.error(
                giaVat.blank
                    ? "Vui lòng nhập Giá VAT"
                    : giaVat.value < 0
                        ? "Giá VAT không được âm"
                        : "Giá VAT phải là số hợp lệ"
            );
            return;
        }

        if (!bhyt.valid || !dichVu.valid) {
            toast.error('BHYT và Dịch vụ chỉ được nhập "X" hoặc để trống');
            return;
        }

        if (!bhyt.value && !dichVu.value) {
            toast.error("Phải đánh dấu X ở ít nhất một trong hai cột BHYT hoặc Dịch vụ");
            return;
        }

        setIsProcessing(true);

        try {
            const res = await fetch(`/api/admin/mappings/${selectedMapping.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...editFormData,
                    giaVat: giaVat.value,
                    bhyt: bhyt.value,
                    dichVu: dichVu.value,
                    ngayBatDauHd: ngayBatDauHd.value,
                    ngayKetThucHd: ngayKetThucHd.value,
                }),
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => null);
                throw new Error(errorData?.message || "Không thể cập nhật thông tin");
            }

            toast.success("Đã cập nhật thông tin thuốc");
            setIsEditInfoDialogOpen(false);
            await refreshAfterMutation({ refetchDetail: true });
        } catch (error) {
            console.error("Edit mapping info error:", error);
            toast.error(error instanceof Error ? error.message : "Đã xảy ra lỗi");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDeleteHistory = async () => {
        if (!facilityToDelete) return;

        setIsProcessing(true);
        try {
            const res = await fetch("/api/admin/mappings", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ facilityCode: facilityToDelete.code }),
            });

            if (!res.ok) {
                throw new Error("Failed to delete mappings");
            }

            const data = await res.json();
            toast.success(`Đã xóa ${data.count} bản ghi đã duyệt/từ chối`);
            await refreshAfterMutation({
                refetchDetail: selectedFacilityCode === facilityToDelete.code,
            });
        } catch (error) {
            console.error("Delete error:", error);
            toast.error("Đã xảy ra lỗi khi xóa");
        } finally {
            setIsProcessing(false);
            setFacilityToDelete(null);
        }
    };

    const handleBulkApprove = async () => {
        if (!facilityToApprove) return;

        setIsProcessing(true);
        try {
            const res = await fetch("/api/admin/mappings", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ facilityCode: facilityToApprove.code, status: "APPROVED" }),
            });

            if (!res.ok) {
                throw new Error("Failed to bulk approve mappings");
            }

            const data = await res.json();
            toast.success(`Đã duyệt tất cả ${data.count} thuốc`);
            setIsDetailDialogOpen(false);
            await refreshAfterMutation();
        } catch (error) {
            console.error("Bulk approve error:", error);
            toast.error("Đã xảy ra lỗi khi duyệt");
        } finally {
            setIsProcessing(false);
            setFacilityToApprove(null);
        }
    };

    const handleApproveSelected = async () => {
        if (!selectedFacilityCode || !detailFacility) return;

        const visiblePendingIds = new Set(
            detailItems
                .filter((mapping) => mapping.status === "WAITING_APPROVAL")
                .map((mapping) => mapping.id)
        );
        const mappingIds = selectedDetailIds.filter((id) => visiblePendingIds.has(id));

        if (mappingIds.length === 0) {
            toast.info("Vui lòng chọn thuốc chờ duyệt");
            return;
        }

        setIsProcessing(true);
        try {
            const res = await fetch("/api/admin/mappings", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    facilityCode: selectedFacilityCode,
                    status: "APPROVED",
                    mappingIds,
                }),
            });

            if (!res.ok) {
                throw new Error("Failed to approve selected mappings");
            }

            const data = await res.json();
            toast.success(`Đã duyệt ${data.count} thuốc được chọn`);
            setSelectedDetailIds([]);
            await refreshAfterMutation({ refetchDetail: true });
        } catch (error) {
            console.error("Selected approve error:", error);
            toast.error("Đã xảy ra lỗi khi duyệt thuốc đã chọn");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleBulkReject = async () => {
        if (!facilityToReject) return;

        setIsProcessing(true);
        try {
            const res = await fetch("/api/admin/mappings", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    facilityCode: facilityToReject.code,
                    status: "REJECTED",
                    adminNote: rejectAllNote,
                }),
            });

            if (!res.ok) {
                throw new Error("Failed to bulk reject mappings");
            }

            const data = await res.json();
            toast.success(`Đã từ chối ${data.count} thuốc`);
            setIsDetailDialogOpen(false);
            await refreshAfterMutation();
        } catch (error) {
            console.error("Bulk reject error:", error);
            toast.error("Đã xảy ra lỗi");
        } finally {
            setIsProcessing(false);
            setFacilityToReject(null);
            setRejectAllNote("");
        }
    };

    const handleExportOutOfCatalog = async () => {
        if (!selectedFacilityCode || !detailFacility) {
            return;
        }

        try {
            const exportLimit = 200;
            let currentPage = 1;
            let totalPages = 1;
            const outOfCatalogMappings: MappingDetailItem[] = [];

            while (currentPage <= totalPages) {
                const params = new URLSearchParams({
                    viewMode: "pending",
                    page: currentPage.toString(),
                    limit: exportLimit.toString(),
                });

                const res = await fetch(`/api/admin/mappings/facilities/${selectedFacilityCode}/details?${params.toString()}`);
                if (!res.ok) {
                    throw new Error("Failed to export out-of-catalog mappings");
                }

                const result: FacilityDetailResponse = await res.json();
                outOfCatalogMappings.push(
                    ...(result.items || []).filter((item) => item.isOutOfCatalog),
                );
                totalPages = result.pagination?.totalPages || 1;
                currentPage += 1;
            }

            if (outOfCatalogMappings.length === 0) {
                toast.info("Không có thuốc ngoài danh mục nào");
                return;
            }

            const exportData = outOfCatalogMappings.map((mapping, index) => ({
                "STT": index + 1,
                "Mã nội bộ": mapping.maNoiBo,
                "Tên thuốc nội bộ": mapping.tenThuocNoiBo,
                "Hoạt chất nội bộ": mapping.hoatChatNoiBo || "",
                "SĐK nội bộ": mapping.soDangKyNoiBo || "",
                "ĐVT nội bộ": mapping.donViTinhNoiBo || "",
                "Ngày yêu cầu": new Date(mapping.createdAt).toLocaleDateString("vi-VN"),
                "Trạng thái": mapping.status === "WAITING_APPROVAL" ? "Chờ duyệt" : mapping.status,
            }));

            exportExcel(
                exportData,
                `Thuoc_Ngoai_DM_${detailFacility.facilityCode}_${new Date().toISOString().split("T")[0]}`,
            );
        } catch (error) {
            console.error("Export out-of-catalog error:", error);
            toast.error("Không thể xuất Excel ngoài danh mục");
        }
    };

    const pendingState = listStates.pending;
    const summaryState = listStates.summary;
    const isInitialLoading = !pendingState.isLoaded && pendingState.isLoading;
    const hasActiveDetailSearch = detailSearchTerm.length > 0;
    const canResetDetailSearch = detailSearchField !== "all"
        || detailAppliedSearchField !== "all"
        || detailSearchInput.length > 0
        || detailSearchTerm.length > 0;
    const visiblePendingDetailIds = detailItems
        .filter((mapping) => mapping.status === "WAITING_APPROVAL")
        .map((mapping) => mapping.id);
    const selectedVisiblePendingCount = selectedDetailIds.filter((id) => visiblePendingDetailIds.includes(id)).length;
    const allVisiblePendingSelected = visiblePendingDetailIds.length > 0
        && selectedVisiblePendingCount === visiblePendingDetailIds.length;
    const someVisiblePendingSelected = selectedVisiblePendingCount > 0 && !allVisiblePendingSelected;

    useEffect(() => {
        if (selectAllDetailCheckboxRef.current) {
            selectAllDetailCheckboxRef.current.indeterminate = someVisiblePendingSelected;
        }
    }, [someVisiblePendingSelected]);

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold text-gray-800">Duyệt ánh xạ thuốc</h2>
                <p className="mt-1 text-gray-500">Phê duyệt yêu cầu ánh xạ từ các cơ sở y tế</p>
            </div>

            <Card className="border-0 shadow-lg">
                <CardHeader>
                    <CardTitle>Danh sách ánh xạ</CardTitle>
                    <CardDescription>Quản lý yêu cầu ánh xạ từ các cơ sở</CardDescription>
                </CardHeader>
                <CardContent>
                    {isInitialLoading ? (
                        <TableLoadingState />
                    ) : (
                        <Tabs value={activeTab} onValueChange={handleTabChange}>
                            <TabsList>
                                <TabsTrigger value="pending">
                                    Chờ duyệt ({pendingState.pagination.total} cơ sở)
                                </TabsTrigger>
                                <TabsTrigger value="summary">
                                    Tổng hợp
                                </TabsTrigger>
                            </TabsList>

                            <TabsContent value="pending" className="mt-4">
                                {pendingState.isLoading && !pendingState.isLoaded ? (
                                    <TableLoadingState />
                                ) : (
                                    <>
                                        <FacilityPendingTable
                                            summaries={pendingState.items}
                                            page={pendingState.pagination.page}
                                            onOpenDetail={openDetailDialog}
                                        />
                                        {pendingState.pagination.total > FACILITY_PAGE_SIZE && (
                                            <PaginationControls
                                                page={pendingState.pagination.page}
                                                pageSize={pendingState.pagination.limit}
                                                totalPages={pendingState.pagination.totalPages}
                                                totalItems={pendingState.pagination.total}
                                                currentCount={pendingState.items.length}
                                                itemLabel="cơ sở"
                                                onPageChange={(nextPage) => handleFacilityPageChange("pending", nextPage)}
                                            />
                                        )}
                                    </>
                                )}
                            </TabsContent>

                            <TabsContent value="summary" className="mt-4">
                                {summaryState.isLoading && !summaryState.isLoaded ? (
                                    <TableLoadingState />
                                ) : (
                                    <>
                                        <FacilitySummaryTable
                                            summaries={summaryState.items}
                                            page={summaryState.pagination.page}
                                            onOpenDetail={openDetailDialog}
                                            onDeleteFacility={setFacilityToDelete}
                                        />
                                        {summaryState.pagination.total > FACILITY_PAGE_SIZE && (
                                            <PaginationControls
                                                page={summaryState.pagination.page}
                                                pageSize={summaryState.pagination.limit}
                                                totalPages={summaryState.pagination.totalPages}
                                                totalItems={summaryState.pagination.total}
                                                currentCount={summaryState.items.length}
                                                itemLabel="cơ sở"
                                                onPageChange={(nextPage) => handleFacilityPageChange("summary", nextPage)}
                                            />
                                        )}
                                    </>
                                )}
                            </TabsContent>
                        </Tabs>
                    )}
                </CardContent>
            </Card>

            <Dialog open={isDetailDialogOpen} onOpenChange={handleDetailDialogChange}>
                <DialogContent
                    className={
                        detailViewMode === "all"
                            ? "left-0 top-0 flex h-[100dvh] w-screen max-w-none translate-x-0 translate-y-0 flex-col rounded-none border-0 p-4 shadow-none sm:max-w-none sm:p-6"
                            : "flex h-[85vh] w-[95vw] max-w-[1200px] flex-col p-6 sm:max-w-none"
                    }
                >
                    <DialogHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <DialogTitle className="text-xl">
                                    {detailViewMode === "pending" ? "Duyệt thuốc" : "Danh sách thuốc"} - {detailFacility?.facilityName}
                                </DialogTitle>
                                <DialogDescription>
                                    {detailViewMode === "pending"
                                        ? "Danh sách thuốc chờ duyệt của cơ sở. Vui lòng kiểm tra kỹ thông tin trước khi phê duyệt."
                                        : "Tổng hợp danh sách thuốc của cơ sở."}
                                </DialogDescription>
                            </div>
                            {detailViewMode === "pending" && detailFacility && detailFacility.pendingCount > 0 && (
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="outline"
                                        className="border-slate-300 text-slate-700 hover:bg-slate-50"
                                        onClick={handleExportOutOfCatalog}
                                    >
                                        <Download className="mr-1.5 h-4 w-4" />
                                        Xuất Excel ngoài danh mục
                                    </Button>
                                    <Button
                                        variant="outline"
                                        className="border-red-300 text-red-600 hover:bg-red-50"
                                        onClick={() => setFacilityToReject({
                                            code: detailFacility.facilityCode,
                                            name: detailFacility.facilityName,
                                        })}
                                    >
                                        <XCircle className="mr-1.5 h-4 w-4" />
                                        Từ chối tất cả ({detailFacility.pendingCount})
                                    </Button>
                                    <Button
                                        variant="outline"
                                        className="border-green-300 text-green-700 hover:bg-green-50"
                                        onClick={handleApproveSelected}
                                        disabled={isProcessing || selectedVisiblePendingCount === 0}
                                    >
                                        Duyệt đã chọn ({selectedVisiblePendingCount})
                                    </Button>
                                    <Button
                                        className="bg-green-600 hover:bg-green-700"
                                        onClick={() => setFacilityToApprove({
                                            code: detailFacility.facilityCode,
                                            name: detailFacility.facilityName,
                                        })}
                                    >
                                        Duyệt tất cả ({detailFacility.pendingCount})
                                    </Button>
                                </div>
                            )}
                        </div>
                    </DialogHeader>

                    {detailViewMode === "all" && (
                        <div className="mt-4 rounded-md border bg-slate-50 p-3">
                            <form
                                className="flex flex-col gap-2 lg:flex-row lg:items-center"
                                onSubmit={(event) => {
                                    event.preventDefault();
                                    handleDetailSearch();
                                }}
                            >
                                <Select
                                    value={detailSearchField}
                                    onValueChange={(value) => setDetailSearchField(value as DetailSearchField)}
                                >
                                    <SelectTrigger className="bg-white lg:w-[220px]">
                                        <SelectValue placeholder="Chọn trường tìm kiếm" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {DETAIL_SEARCH_FIELDS.map((field) => (
                                            <SelectItem key={field.value} value={field.value}>
                                                {field.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                <div className="relative min-w-0 flex-1">
                                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                    <Input
                                        value={detailSearchInput}
                                        onChange={(event) => setDetailSearchInput(event.target.value)}
                                        placeholder="Tìm mã, tên thuốc, hoạt chất, SĐK, trạng thái..."
                                        className="bg-white pl-9"
                                    />
                                </div>

                                <div className="flex gap-2">
                                    <Button type="submit" disabled={isDetailLoading}>
                                        <Search className="mr-1.5 h-4 w-4" />
                                        Tìm kiếm
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={handleResetDetailSearch}
                                        disabled={isDetailLoading || !canResetDetailSearch}
                                    >
                                        <X className="mr-1.5 h-4 w-4" />
                                        Xóa
                                    </Button>
                                </div>
                            </form>
                            {hasActiveDetailSearch && (
                                <p className="mt-2 text-sm text-slate-600">
                                    Kết quả tìm kiếm cho <span className="font-medium">&quot;{detailSearchTerm}&quot;</span>
                                    {" "}trong <span className="font-medium">{DETAIL_SEARCH_FIELD_LABELS[detailAppliedSearchField]}</span>
                                </p>
                            )}
                        </div>
                    )}

                    <div className="mt-4 min-h-0 flex-1 overflow-auto rounded-md border">
                        {isDetailLoading ? (
                            <TableLoadingState />
                        ) : (
                            <Table>
                                <TableHeader className="sticky top-0 z-10 bg-gray-50">
                                    <TableRow>
                                        <TableHead className="w-[44px] bg-gray-100 text-center">
                                            {detailViewMode === "pending" && (
                                                <input
                                                    ref={selectAllDetailCheckboxRef}
                                                    type="checkbox"
                                                    aria-label="Chọn tất cả thuốc chờ duyệt đang hiển thị"
                                                    checked={allVisiblePendingSelected}
                                                    onChange={handleToggleVisiblePendingSelection}
                                                    disabled={isProcessing || visiblePendingDetailIds.length === 0}
                                                    className="h-4 w-4 rounded border-slate-300 text-green-600 focus:ring-green-500"
                                                />
                                            )}
                                        </TableHead>
                                        <TableHead className="w-[40px] bg-gray-100 font-bold text-gray-700">STT</TableHead>
                                        <TableHead className="min-w-[150px] bg-gray-100 font-bold text-gray-700">Thuốc nội bộ</TableHead>
                                        <TableHead className="min-w-[150px] bg-gray-100 font-bold text-gray-700">Hoạt chất / Hàm lượng (NB)</TableHead>
                                        <TableHead className="min-w-[120px] bg-gray-100 font-bold text-gray-700">SĐK / ĐVT (NB)</TableHead>
                                        <TableHead className="min-w-[110px] bg-gray-100 font-bold text-gray-700">Nhóm TCKT</TableHead>
                                        <TableHead className="min-w-[200px] bg-gray-100 font-bold text-gray-700">Thuốc Dược Quốc Gia</TableHead>
                                        <TableHead className="min-w-[100px] bg-gray-100 font-bold text-gray-700">Trạng thái</TableHead>
                                        <TableHead className="sticky right-0 min-w-[120px] bg-gray-100 text-right font-bold text-gray-700">Thao tác</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {detailItems.map((mapping, index) => (
                                        <TableRow key={mapping.id} className="hover:bg-slate-50">
                                            <TableCell className="text-center">
                                                {detailViewMode === "pending" && (
                                                    <input
                                                        type="checkbox"
                                                        aria-label={`Chọn thuốc ${mapping.tenThuocNoiBo}`}
                                                        checked={selectedDetailIds.includes(mapping.id)}
                                                        onChange={() => toggleDetailSelection(mapping.id)}
                                                        disabled={isProcessing || mapping.status !== "WAITING_APPROVAL"}
                                                        className="h-4 w-4 rounded border-slate-300 text-green-600 focus:ring-green-500 disabled:cursor-not-allowed disabled:opacity-40"
                                                    />
                                                )}
                                            </TableCell>
                                            <TableCell className="whitespace-nowrap">
                                                {(detailPagination.page - 1) * detailPagination.limit + index + 1}
                                            </TableCell>
                                            <TableCell className="min-w-[180px] max-w-[250px] whitespace-normal break-words">
                                                <div className="space-y-1">
                                                    <p className="font-semibold leading-tight text-blue-700">{mapping.tenThuocNoiBo}</p>
                                                    <div className="flex items-center gap-2">
                                                        <code className="rounded border bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-600">
                                                            {mapping.maNoiBo}
                                                        </code>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="min-w-[150px] max-w-[200px] whitespace-normal break-words">
                                                <div className="space-y-1.5 text-sm">
                                                    <div>
                                                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Hoạt chất</span>
                                                        <p className="font-medium text-slate-700">{mapping.hoatChatNoiBo || "-"}</p>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="min-w-[120px] max-w-[160px] whitespace-normal break-words">
                                                <div className="space-y-2 text-sm">
                                                    <div>
                                                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">SĐK</span>
                                                        <p className="font-medium text-slate-700">{mapping.soDangKyNoiBo || "-"}</p>
                                                    </div>
                                                    <div>
                                                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">ĐVT</span>
                                                        <p className="text-slate-700">{mapping.donViTinhNoiBo || "-"}</p>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="min-w-[110px] whitespace-nowrap">
                                                {mapping.nhomTckt ? (
                                                    <Badge className="border-0 bg-indigo-100 text-indigo-700">
                                                        {mapping.nhomTckt}
                                                    </Badge>
                                                ) : (
                                                    <span className="text-gray-300">-</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="min-w-[240px] max-w-[320px] whitespace-normal break-words">
                                                {mapping.isOutOfCatalog ? (
                                                    <div className="rounded-md border border-amber-200 bg-amber-50 p-3">
                                                        <span className="flex items-center gap-2 font-medium text-amber-700">
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" x2="12" y1="8" y2="12" /><line x1="12" x2="12.01" y1="16" y2="16" /></svg>
                                                            Khai báo ngoài danh mục
                                                        </span>
                                                    </div>
                                                ) : mapping.masterDrug ? (
                                                    <div className="group relative space-y-2 rounded-md border border-emerald-100 bg-emerald-50/50 p-2.5">
                                                        <div>
                                                            <p className="font-bold leading-tight text-emerald-800">{mapping.masterDrug.tenThuoc}</p>
                                                            <div className="mt-1 flex gap-2">
                                                                <code className="rounded border border-emerald-200 bg-emerald-100 px-1 font-mono text-[10px] text-emerald-800">
                                                                    {mapping.masterDrug.maChung}
                                                                </code>
                                                                {mapping.masterDrug.soDangKy && (
                                                                    <span className="rounded border border-emerald-200 bg-white px-1 text-[10px] text-emerald-700">
                                                                        SĐK: {mapping.masterDrug.soDangKy}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {mapping.masterDrug.hoatChat && (
                                                            <div className="mt-1 border-t border-emerald-100 pt-1.5">
                                                                <p className="text-xs text-emerald-800">
                                                                    <span className="mr-1 opacity-60">HC:</span>
                                                                    {mapping.masterDrug.hoatChat}
                                                                </p>
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="italic text-gray-300">Chưa map danh mục</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="whitespace-nowrap">{getStatusBadge(mapping.status)}</TableCell>
                                            <TableCell className="sticky right-0 whitespace-nowrap bg-white text-right shadow-[-10px_0_10px_-5px_rgba(0,0,0,0.05)] group-hover:bg-slate-50">
                                                <div className="flex justify-end gap-2 px-1">
                                                    {mapping.status === "WAITING_APPROVAL" && (
                                                        <>
                                                            <Button
                                                                size="sm"
                                                                className="h-8 bg-green-600 px-3 hover:bg-green-700"
                                                                onClick={() => handleApprove(mapping.id)}
                                                                disabled={isProcessing}
                                                            >
                                                                Duyệt
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                className="h-8 px-3 text-red-600 hover:bg-red-50 hover:text-red-700"
                                                                onClick={() => {
                                                                    setSelectedMapping(mapping);
                                                                    setIsRejectDialogOpen(true);
                                                                }}
                                                                disabled={isProcessing}
                                                            >
                                                                Từ chối
                                                            </Button>
                                                        </>
                                                    )}
                                                    {ADMIN_EDITABLE_MAPPING_STATUSES.has(mapping.status) && (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="h-8 px-3"
                                                            onClick={() => handleOpenEditInfo(mapping)}
                                                            disabled={isProcessing}
                                                        >
                                                            <Pencil className="mr-1.5 h-3.5 w-3.5" />
                                                            Chỉnh sửa
                                                        </Button>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {detailItems.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={9} className="py-12 text-center text-gray-500">
                                                <div className="flex flex-col items-center gap-2">
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="text-gray-300"><circle cx="12" cy="12" r="10" /><path d="m9 12 2 2 4-4" /></svg>
                                                    <p>{hasActiveDetailSearch ? "Không có kết quả phù hợp" : "Không có dữ liệu"}</p>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        )}
                    </div>

                    {detailPagination.total > DETAIL_PAGE_SIZE && (
                        <PaginationControls
                            page={detailPagination.page}
                            pageSize={detailPagination.limit}
                            totalPages={detailPagination.totalPages}
                            totalItems={detailPagination.total}
                            currentCount={detailItems.length}
                            itemLabel="thuốc"
                            onPageChange={handleDetailPageChange}
                        />
                    )}

                    <DialogFooter className="pt-0">
                        <Button variant="outline" onClick={() => handleDetailDialogChange(false)}>
                            Đóng
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Từ chối ánh xạ</DialogTitle>
                        <DialogDescription>
                            Vui lòng nhập lý do từ chối để cơ sở biết cách điều chỉnh
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <p className="mb-2 text-sm text-gray-500">Thuốc nội bộ:</p>
                            <p className="font-medium">{selectedMapping?.tenThuocNoiBo}</p>
                        </div>
                        <div>
                            <p className="mb-2 text-sm text-gray-500">Lý do từ chối:</p>
                            <Textarea
                                placeholder="VD: Sai hàm lượng, Chọn sai mã..."
                                value={rejectNote}
                                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setRejectNote(e.target.value)}
                                rows={3}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsRejectDialogOpen(false)}>
                            Hủy
                        </Button>
                        <Button variant="destructive" onClick={handleReject} disabled={isProcessing}>
                            {isProcessing ? "Đang xử lý..." : "Xác nhận từ chối"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isEditInfoDialogOpen} onOpenChange={setIsEditInfoDialogOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Chỉnh sửa thông tin thuốc</DialogTitle>
                        <DialogDescription>
                            Cập nhật thông tin thuốc đã được ánh xạ của cơ sở.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Mã nội bộ</label>
                                <Input
                                    value={editFormData.maNoiBo}
                                    onChange={(e) => setEditFormData({ ...editFormData, maNoiBo: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Đơn vị tính</label>
                                <Input
                                    value={editFormData.donViTinhNoiBo}
                                    onChange={(e) => setEditFormData({ ...editFormData, donViTinhNoiBo: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Tên thuốc</label>
                            <Input
                                value={editFormData.tenThuocNoiBo}
                                onChange={(e) => setEditFormData({ ...editFormData, tenThuocNoiBo: e.target.value })}
                            />
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Hoạt chất</label>
                                <Input
                                    value={editFormData.hoatChatNoiBo}
                                    onChange={(e) => setEditFormData({ ...editFormData, hoatChatNoiBo: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Số đăng ký</label>
                                <Input
                                    value={editFormData.soDangKyNoiBo}
                                    onChange={(e) => setEditFormData({ ...editFormData, soDangKyNoiBo: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="grid gap-4 sm:grid-cols-3">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Giá VAT</label>
                                <Input
                                    inputMode="decimal"
                                    value={editFormData.giaVat}
                                    onChange={(e) => setEditFormData({ ...editFormData, giaVat: e.target.value })}
                                />
                            </div>
                            <label className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium sm:mt-7">
                                <input
                                    type="checkbox"
                                    className="h-4 w-4"
                                    checked={editFormData.bhyt === "X"}
                                    onChange={(e) => setEditFormData({ ...editFormData, bhyt: e.target.checked ? "X" : "" })}
                                />
                                BHYT
                            </label>
                            <label className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium sm:mt-7">
                                <input
                                    type="checkbox"
                                    className="h-4 w-4"
                                    checked={editFormData.dichVu === "X"}
                                    onChange={(e) => setEditFormData({ ...editFormData, dichVu: e.target.checked ? "X" : "" })}
                                />
                                Dịch vụ
                            </label>
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Số QĐ trúng thầu</label>
                                <Input
                                    value={editFormData.soQdTrungThau}
                                    onChange={(e) => setEditFormData({ ...editFormData, soQdTrungThau: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Tên Công ty</label>
                                <Input
                                    value={editFormData.tenCongTy}
                                    onChange={(e) => setEditFormData({ ...editFormData, tenCongTy: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Ngày bắt đầu HĐ</label>
                                <Input
                                    placeholder="YYYYMMDD"
                                    value={editFormData.ngayBatDauHd}
                                    onChange={(e) => setEditFormData({ ...editFormData, ngayBatDauHd: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Ngày kết thúc HĐ</label>
                                <Input
                                    placeholder="YYYYMMDD"
                                    value={editFormData.ngayKetThucHd}
                                    onChange={(e) => setEditFormData({ ...editFormData, ngayKetThucHd: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditInfoDialogOpen(false)} disabled={isProcessing}>
                            Hủy
                        </Button>
                        <Button onClick={handleSaveInfo} disabled={isProcessing}>
                            {isProcessing ? "Đang lưu..." : "Lưu thay đổi"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AlertDialog open={!!facilityToDelete} onOpenChange={(open) => !open && setFacilityToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Xác nhận xóa dữ liệu</AlertDialogTitle>
                        <AlertDialogDescription>
                            Bạn có chắc chắn muốn xóa các thuốc <strong>Đã duyệt</strong>, <strong>Từ chối</strong> và <strong>Tự động</strong> của cơ sở: <br />
                            <span className="font-bold text-gray-900">{facilityToDelete?.name}</span>?
                            <br /><br />
                            Các thuốc đang <strong>Chờ duyệt</strong> sẽ được <strong>GIỮ LẠI</strong>.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isProcessing}>Hủy</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-red-600 hover:bg-red-700"
                            onClick={(e) => {
                                e.preventDefault();
                                handleDeleteHistory();
                            }}
                            disabled={isProcessing}
                        >
                            {isProcessing ? "Đang xóa..." : "Xác nhận xóa"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={!!facilityToApprove} onOpenChange={(open) => !open && setFacilityToApprove(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Xác nhận duyệt tất cả</AlertDialogTitle>
                        <AlertDialogDescription>
                            Bạn có chắc chắn muốn duyệt <strong>TẤT CẢ</strong> thuốc đang chờ duyệt của cơ sở: <br />
                            <span className="font-bold text-gray-900">{facilityToApprove?.name}</span>?
                            <br /><br />
                            Toàn bộ thuốc ở trạng thái Chờ duyệt sẽ được chuyển sang Đã duyệt.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isProcessing}>Hủy</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-green-600 hover:bg-green-700"
                            onClick={(e) => {
                                e.preventDefault();
                                handleBulkApprove();
                            }}
                            disabled={isProcessing}
                        >
                            {isProcessing ? "Đang xử lý..." : "Xác nhận duyệt"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <Dialog open={!!facilityToReject} onOpenChange={(open) => !open && (setFacilityToReject(null), setRejectAllNote(""))}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Từ chối tất cả ánh xạ</DialogTitle>
                        <DialogDescription>
                            Bạn sắp từ chối <strong>TẤT CẢ</strong> thuốc đang chờ duyệt của:{" "}
                            <span className="font-bold text-gray-900">{facilityToReject?.name}</span>
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3">
                        <p className="text-sm text-gray-600">Lý do từ chối (sẽ gửi đến cơ sở):</p>
                        <Textarea
                            placeholder="VD: Thông tin ánh xạ không chính xác, cần kiểm tra lại danh mục..."
                            value={rejectAllNote}
                            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setRejectAllNote(e.target.value)}
                            rows={3}
                        />
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setFacilityToReject(null);
                                setRejectAllNote("");
                            }}
                            disabled={isProcessing}
                        >
                            Hủy
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleBulkReject}
                            disabled={isProcessing}
                        >
                            {isProcessing ? "Đang xử lý..." : "Xác nhận từ chối tất cả"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
