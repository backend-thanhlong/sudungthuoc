"use client";

import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronDown, ChevronRight } from "lucide-react";

// ===================== TYPES =====================
interface PhanLo {
    stt: number;
    tenPhanLo: string;
    donViTinh: string;
    soLuong: number | null;
    donGia: number | null;
    thanhTien: number | null;
    thoiGianThucHien: string;
    donViTinhThoiGian: string;
}

interface KetQuaLCNTLink {
    id: string;
    soQdPheDuyetKQLCNT: string;
    ngayPheDuyetKQLCNT: string;
}

interface GoiThau {
    id: string;
    tenGoiThau: string;
    giaGoiThau: number | null;
    linhVuc: string[];
    hinhThucLCNT: string;
    phuongThucLCNT: string;
    loaiHopDong: string[];
    phanLoaiGoiThau: string;
    chiTietNguonVon: string;
    soLuongPhanLo: number | null;
    thoiGianToChuc: string;
    thoiGianBatDau: string;
    thoiGianThucHien: string;
    trangThai: string;
    maThongBao: string;
    ketQuaLCNT: KetQuaLCNTLink | null;
    phanLos: PhanLo[];
}

interface KeHoachLCNT {
    id: string;
    quyTrinh: number;
    maKHLCNT: string;
    tenKHLCNT: string;
    soQuyetDinh: string;
    ngayPheDuyet: string;
    soLuongGoiThau: number | null;
    trangThai: string;
    createdAt: string;
    // Self-decision process fields (quyTrinh=2)
    loaiMuaSamTuQuyet?: string;
    thoiGianBatDauMuaSam?: string;
    thoiGianBatDauThucHienHopDong?: string;
    thoiGianThucHienHopDong?: string;
    thoiGianKetThucHopDong?: string;
    facility: {
        id: string;
        facilityName: string;
        facilityCode: string;
    };
    goiThaus: GoiThau[];
}

interface FacilityPlanGroup {
    facilityId: string;
    facilityName: string;
    facilityCode: string;
    plans: KeHoachLCNT[];
    planCount: number;
    totalPackages: number;
    publishedCount: number;
    latestCreatedAt: string | null;
    purchaseTypes: string[];
    latestPurchaseStartAt: string | null;
}

type ListTab = "quyTrinh1" | "quyTrinh2";

interface FacilityOption {
    id: string;
    facilityName: string;
    facilityCode: string;
}

interface KeHoachSummary {
    totalPlans: number;
    totalFacilities: number;
    totalGoiThaus: number;
    publishedPlans: number;
}

interface KeHoachLCNTListResponse {
    data: FacilityPlanGroup[];
    metadata?: {
        page?: number;
        limit?: number;
        total?: number;
        totalPages?: number;
        summary?: KeHoachSummary;
        facilities?: FacilityOption[];
    };
}

const PAGE_SIZE = 10;
const INITIAL_PAGE_STATE: Record<ListTab, number> = {
    quyTrinh1: 1,
    quyTrinh2: 1,
};
const INITIAL_TOTAL_PAGES: Record<ListTab, number> = {
    quyTrinh1: 1,
    quyTrinh2: 1,
};
const INITIAL_TOTAL_ROWS: Record<ListTab, number> = {
    quyTrinh1: 0,
    quyTrinh2: 0,
};
const INITIAL_GROUPED_PLANS: Record<ListTab, FacilityPlanGroup[]> = {
    quyTrinh1: [],
    quyTrinh2: [],
};
const EMPTY_SUMMARY: KeHoachSummary = {
    totalPlans: 0,
    totalFacilities: 0,
    totalGoiThaus: 0,
    publishedPlans: 0,
};

const formatDate = (value?: string | null) => (
    value ? new Date(value).toLocaleDateString("vi-VN") : "—"
);

const getPlanStatusClassName = (status: string) => (
    status === "Đã đăng tải"
        ? "bg-green-100 text-green-700"
        : "bg-amber-100 text-amber-700"
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

// ===================== COMPONENT =====================
export default function AdminKeHoachLCNTPage() {
    const [groupedPlansByTab, setGroupedPlansByTab] = useState<Record<ListTab, FacilityPlanGroup[]>>(INITIAL_GROUPED_PLANS);
    const [summary, setSummary] = useState<KeHoachSummary>(EMPTY_SUMMARY);
    const [uniqueFacilities, setUniqueFacilities] = useState<FacilityOption[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [filterFacility, setFilterFacility] = useState("all");
    const [listTab, setListTab] = useState<ListTab>("quyTrinh1");
    const [pageByTab, setPageByTab] = useState<Record<ListTab, number>>(INITIAL_PAGE_STATE);
    const [totalPagesByTab, setTotalPagesByTab] = useState<Record<ListTab, number>>(INITIAL_TOTAL_PAGES);
    const [totalRowsByTab, setTotalRowsByTab] = useState<Record<ListTab, number>>(INITIAL_TOTAL_ROWS);
    const [expandedFacilityIds, setExpandedFacilityIds] = useState<Set<string>>(new Set());
    const [selectedPlan, setSelectedPlan] = useState<KeHoachLCNT | null>(null);
    const [detailOpen, setDetailOpen] = useState(false);
    const [selectedGoiThau, setSelectedGoiThau] = useState<GoiThau | null>(null);
    const [goiThauDetailOpen, setGoiThauDetailOpen] = useState(false);
    const [deleteGoiThauOpen, setDeleteGoiThauOpen] = useState(false);
    const [goiThauToDelete, setGoiThauToDelete] = useState<GoiThau | null>(null);
    const [deleteGoiThauLoading, setDeleteGoiThauLoading] = useState(false);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const latestRequestId = useRef(0);

    const loadData = useCallback(async (tabToLoad: ListTab = listTab, pageToLoad: number = pageByTab[tabToLoad]) => {
        const requestId = latestRequestId.current + 1;
        latestRequestId.current = requestId;
        setLoading(true);

        try {
            const params = new URLSearchParams({
                tab: tabToLoad,
                page: pageToLoad.toString(),
                limit: PAGE_SIZE.toString(),
            });

            if (searchTerm.trim()) {
                params.set("searchTerm", searchTerm.trim());
            }

            if (filterFacility !== "all") {
                params.set("facilityId", filterFacility);
            }

            const res = await fetch(`/api/admin/ke-hoach-lcnt?${params.toString()}`);
            if (!res.ok) throw new Error("Failed to fetch");
            const data: KeHoachLCNTListResponse = await res.json();

            if (latestRequestId.current !== requestId) {
                return;
            }

            setGroupedPlansByTab((current) => ({
                ...current,
                [tabToLoad]: data.data || [],
            }));
            setTotalPagesByTab((current) => ({
                ...current,
                [tabToLoad]: data.metadata?.totalPages || 1,
            }));
            setTotalRowsByTab((current) => ({
                ...current,
                [tabToLoad]: data.metadata?.total || 0,
            }));
            setSummary(data.metadata?.summary || EMPTY_SUMMARY);
            setUniqueFacilities(data.metadata?.facilities || []);

            if (data.metadata?.page && data.metadata.page !== pageToLoad) {
                setPageByTab((current) => ({
                    ...current,
                    [tabToLoad]: data.metadata?.page || 1,
                }));
            }
        } catch (error) {
            if (latestRequestId.current !== requestId) {
                return;
            }

            console.error("Error loading:", error);
        } finally {
            if (latestRequestId.current === requestId) {
                setLoading(false);
            }
        }
    }, [filterFacility, listTab, pageByTab, searchTerm]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    useEffect(() => {
        if (filterFacility === "all") {
            setExpandedFacilityIds(new Set());
            return;
        }

        setExpandedFacilityIds(new Set([filterFacility]));
    }, [filterFacility]);

    useEffect(() => {
        if (!selectedPlan) {
            return;
        }

        const allPlans = [
            ...groupedPlansByTab.quyTrinh1.flatMap((group) => group.plans),
            ...groupedPlansByTab.quyTrinh2.flatMap((group) => group.plans),
        ];
        const latestSelectedPlan = allPlans.find((plan) => plan.id === selectedPlan.id);

        if (!latestSelectedPlan) {
            setSelectedPlan(null);
            setDetailOpen(false);
            setSelectedGoiThau(null);
            setGoiThauDetailOpen(false);
            return;
        }

        if (latestSelectedPlan !== selectedPlan) {
            setSelectedPlan(latestSelectedPlan);
        }

        if (!selectedGoiThau) {
            return;
        }

        const latestSelectedGoiThau = latestSelectedPlan.goiThaus.find((goiThau) => goiThau.id === selectedGoiThau.id);

        if (!latestSelectedGoiThau) {
            setSelectedGoiThau(null);
            setGoiThauDetailOpen(false);
            return;
        }

        if (latestSelectedGoiThau !== selectedGoiThau) {
            setSelectedGoiThau(latestSelectedGoiThau);
        }
    }, [groupedPlansByTab, selectedGoiThau, selectedPlan]);

    const handleViewDetail = (plan: KeHoachLCNT) => {
        setSelectedPlan(plan);
        setDetailOpen(true);
    };

    const handleGoiThauDetail = (goiThau: GoiThau) => {
        setSelectedGoiThau(goiThau);
        setGoiThauDetailOpen(true);
    };

    const handleDeleteGoiThau = (goiThau: GoiThau) => {
        setGoiThauToDelete(goiThau);
        setDeleteGoiThauOpen(true);
    };

    const handleDelete = (id: string) => {
        setDeleteId(id);
        setDeleteConfirmOpen(true);
    };

    const handleSearchTermChange = (value: string) => {
        setSearchTerm(value);
        setPageByTab(INITIAL_PAGE_STATE);
    };

    const handleFacilityFilterChange = (value: string) => {
        setFilterFacility(value);
        setPageByTab(INITIAL_PAGE_STATE);
    };

    const handleTabChange = (value: string) => {
        setListTab(value as ListTab);
    };

    const handlePageChange = (tab: ListTab, nextPage: number) => {
        setPageByTab((current) => ({
            ...current,
            [tab]: nextPage,
        }));
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

    const handleConfirmDelete = async () => {
        if (!deleteId) return;

        try {
            const res = await fetch(`/api/admin/ke-hoach-lcnt/${deleteId}`, {
                method: "DELETE",
            });

            if (!res.ok) {
                throw new Error("Failed to delete");
            }

            alert("Xóa kế hoạch thành công!");
            setDeleteConfirmOpen(false);
            setDeleteId(null);
            loadData();
        } catch (error) {
            console.error("Error deleting:", error);
            alert("Lỗi khi xóa kế hoạch!");
        }
    };

    const handleConfirmDeleteGoiThau = async () => {
        if (!selectedPlan || !goiThauToDelete) {
            return;
        }

        setDeleteGoiThauLoading(true);

        try {
            const res = await fetch(`/api/admin/ke-hoach-lcnt/${selectedPlan.id}/goi-thau/${goiThauToDelete.id}`, {
                method: "DELETE",
            });
            const data = await res.json().catch(() => null);

            if (!res.ok) {
                throw new Error(data?.message || "Failed to delete");
            }

            const deletedGoiThauId = goiThauToDelete.id;

            setSelectedPlan((current) => {
                if (!current || current.id !== selectedPlan.id) {
                    return current;
                }

                const nextGoiThaus = current.goiThaus.filter((goiThau) => goiThau.id !== deletedGoiThauId);

                return {
                    ...current,
                    goiThaus: nextGoiThaus,
                    soLuongGoiThau: nextGoiThaus.length,
                };
            });

            if (selectedGoiThau?.id === deletedGoiThauId) {
                setSelectedGoiThau(null);
                setGoiThauDetailOpen(false);
            }

            alert("Xóa gói thầu thành công!");
            setDeleteGoiThauOpen(false);
            setGoiThauToDelete(null);
            await loadData(listTab, pageByTab[listTab]);
        } catch (error) {
            console.error("Error deleting goi thau:", error);
            alert(error instanceof Error ? error.message : "Lỗi khi xóa gói thầu!");
        } finally {
            setDeleteGoiThauLoading(false);
        }
    };

    const groupedQuyTrinh1Plans = groupedPlansByTab.quyTrinh1;
    const groupedQuyTrinh2Plans = groupedPlansByTab.quyTrinh2;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold text-gray-800">
                    Quản lý Kế hoạch LCNT
                </h2>
                <p className="text-gray-500 mt-1">
                    Theo dõi và quản lý tất cả kế hoạch LCNT của các đơn vị
                </p>
            </div>

            {/* Stats cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="border-0 shadow-md bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-blue-100 text-sm">Tổng kế hoạch</p>
                                <p className="text-3xl font-bold mt-1">{summary.totalPlans}</p>
                            </div>
                            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-0 shadow-md bg-gradient-to-br from-emerald-500 to-emerald-600 text-white">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-emerald-100 text-sm">Đơn vị tham gia</p>
                                <p className="text-3xl font-bold mt-1">{summary.totalFacilities}</p>
                            </div>
                            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                </svg>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-0 shadow-md bg-gradient-to-br from-amber-500 to-amber-600 text-white">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-amber-100 text-sm">Tổng gói thầu</p>
                                <p className="text-3xl font-bold mt-1">{summary.totalGoiThaus}</p>
                            </div>
                            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                </svg>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-0 shadow-md bg-gradient-to-br from-purple-500 to-purple-600 text-white">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-purple-100 text-sm">Đã đăng tải</p>
                                <p className="text-3xl font-bold mt-1">{summary.publishedPlans}</p>
                            </div>
                            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Search & Filter */}
            <Card className="border-0 shadow-lg">
                <CardContent className="p-4">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                        <div className="flex-1">
                            <div className="relative">
                                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                                <Input
                                    value={searchTerm}
                                    onChange={(e) => handleSearchTermChange(e.target.value)}
                                    placeholder="Tìm theo mã, tên KHLCNT, tên/mã đơn vị..."
                                    className="pl-10"
                                />
                            </div>
                        </div>
                        <div className="w-full lg:w-72">
                            <Select value={filterFacility} onValueChange={handleFacilityFilterChange}>
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Tất cả đơn vị" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Tất cả đơn vị</SelectItem>
                                    {uniqueFacilities.map((f) => (
                                        <SelectItem key={f.id || f.facilityCode} value={f.id || f.facilityCode}>
                                            {f.facilityName}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        {(searchTerm || filterFacility !== "all") && (
                            <Button
                                variant="ghost"
                                className="justify-start text-gray-500 lg:justify-center"
                                onClick={() => {
                                    handleSearchTermChange("");
                                    handleFacilityFilterChange("all");
                                }}
                            >
                                Xóa bộ lọc
                            </Button>
                        )}
                        <Button onClick={() => loadData()} variant="outline" className="rounded-xl">
                            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            Làm mới
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Main table with tabs */}
            <Tabs value={listTab} onValueChange={handleTabChange}>
                <TabsList className="grid w-full grid-cols-2 max-w-2xl">
                    <TabsTrigger value="quyTrinh1">
                        <div className="flex items-center gap2">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            Quy trình 1: Luật Đấu thầu
                        </div>
                    </TabsTrigger>
                    <TabsTrigger value="quyTrinh2">
                        <div className="flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            Quy trình 2: Tự quyết định
                        </div>
                    </TabsTrigger>
                </TabsList>

                {/* Tab 1: Luật Đấu thầu */}
                <TabsContent value="quyTrinh1" className="mt-6">
                    <Card className="border-0 shadow-lg">
                        <CardContent className="p-0">
                            <div className="rounded-xl overflow-hidden">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-blue-600 hover:bg-blue-600">
                                            <TableHead className="text-white font-bold">STT</TableHead>
                                            <TableHead className="text-white font-bold">Đơn vị</TableHead>
                                            <TableHead className="text-white font-bold">Số KHLCNT</TableHead>
                                            <TableHead className="text-white font-bold">Tổng gói thầu</TableHead>
                                            <TableHead className="text-white font-bold">Đã đăng tải</TableHead>
                                            <TableHead className="text-white font-bold">Ngày tạo gần nhất</TableHead>
                                            <TableHead className="text-white font-bold">Trạng thái</TableHead>
                                            <TableHead className="text-white font-bold">Thao tác</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {loading ? (
                                            <TableRow>
                                                <TableCell colSpan={8} className="text-center py-12">
                                                    <div className="flex flex-col items-center gap-2 text-gray-400">
                                                        <svg className="animate-spin h-8 w-8" viewBox="0 0 24 24">
                                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                                        </svg>
                                                        <p>Đang tải dữ liệu...</p>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ) : groupedQuyTrinh1Plans.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={8} className="text-center py-12 text-gray-400">
                                                    <div className="flex flex-col items-center gap-3">
                                                        <svg className="w-12 h-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                        </svg>
                                                        <p>Chưa có kế hoạch theo Luật Đấu thầu.</p>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            groupedQuyTrinh1Plans.map((group, idx) => {
                                                const isExpanded = expandedFacilityIds.has(group.facilityId);
                                                const groupStatus = group.publishedCount === group.planCount
                                                    ? {
                                                        label: "Đã đăng tải",
                                                        className: "bg-green-100 text-green-700",
                                                        description: undefined,
                                                    }
                                                    : group.publishedCount > 0
                                                        ? {
                                                            label: "Đăng tải một phần",
                                                            className: "bg-blue-100 text-blue-700",
                                                            description: `${group.publishedCount}/${group.planCount} KHLCNT đã đăng tải`,
                                                        }
                                                        : {
                                                            label: "Chưa đăng tải",
                                                            className: "bg-amber-100 text-amber-700",
                                                            description: undefined,
                                                        };

                                                return (
                                                    <Fragment key={group.facilityId}>
                                                        <TableRow className={isExpanded ? "bg-blue-50/70" : ""}>
                                                            <TableCell className="font-medium">{(pageByTab.quyTrinh1 - 1) * PAGE_SIZE + idx + 1}</TableCell>
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
                                                            <TableCell className="font-medium">{group.planCount}</TableCell>
                                                            <TableCell className="font-medium text-indigo-600">{group.totalPackages}</TableCell>
                                                            <TableCell className="font-medium text-green-700">
                                                                {group.publishedCount}/{group.planCount}
                                                            </TableCell>
                                                            <TableCell className="text-sm text-gray-500">
                                                                {formatDate(group.latestCreatedAt)}
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
                                                                <TableCell colSpan={8} className="p-0">
                                                                    <div className="border-t bg-slate-50/70 px-4 py-4">
                                                                        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                                                                            <Table>
                                                                                <TableHeader>
                                                                                    <TableRow className="bg-slate-50">
                                                                                        <TableHead>STT</TableHead>
                                                                                        <TableHead>Mã KHLCNT</TableHead>
                                                                                        <TableHead>Tên KHLCNT</TableHead>
                                                                                        <TableHead>Số gói thầu</TableHead>
                                                                                        <TableHead>Trạng thái</TableHead>
                                                                                        <TableHead>Ngày tạo</TableHead>
                                                                                        <TableHead className="text-right">Thao tác</TableHead>
                                                                                    </TableRow>
                                                                                </TableHeader>
                                                                                <TableBody>
                                                                                    {group.plans.map((kh, planIndex) => (
                                                                                        <TableRow key={kh.id} className="hover:bg-blue-50/60">
                                                                                            <TableCell>{planIndex + 1}</TableCell>
                                                                                            <TableCell className="font-mono text-sm">{kh.maKHLCNT || "—"}</TableCell>
                                                                                            <TableCell className="max-w-[320px] whitespace-normal break-words align-top text-sm">{kh.tenKHLCNT || "—"}</TableCell>
                                                                                            <TableCell>
                                                                                                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700">
                                                                                                    {kh.goiThaus.length}
                                                                                                </span>
                                                                                            </TableCell>
                                                                                            <TableCell>
                                                                                                <span className={`inline-block rounded-full px-2 py-1 text-xs font-medium ${getPlanStatusClassName(kh.trangThai)}`}>
                                                                                                    {kh.trangThai}
                                                                                                </span>
                                                                                            </TableCell>
                                                                                            <TableCell className="text-sm text-gray-500">{formatDate(kh.createdAt)}</TableCell>
                                                                                            <TableCell className="text-right">
                                                                                                <div className="flex justify-end gap-2">
                                                                                                    <Button
                                                                                                        variant="ghost"
                                                                                                        size="sm"
                                                                                                        onClick={() => handleViewDetail(kh)}
                                                                                                        className="text-blue-600 hover:bg-blue-100 hover:text-blue-800"
                                                                                                    >
                                                                                                        Chi tiết
                                                                                                    </Button>
                                                                                                    <Button
                                                                                                        variant="ghost"
                                                                                                        size="sm"
                                                                                                        onClick={() => handleDelete(kh.id)}
                                                                                                        className="text-red-600 hover:bg-red-100 hover:text-red-800"
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
                                page={pageByTab.quyTrinh1}
                                totalPages={totalPagesByTab.quyTrinh1}
                                totalRows={totalRowsByTab.quyTrinh1}
                                currentCount={groupedQuyTrinh1Plans.length}
                                onPageChange={(nextPage) => handlePageChange("quyTrinh1", nextPage)}
                            />
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Tab 2: Tự quyết định */}
                <TabsContent value="quyTrinh2" className="mt-6">
                    <Card className="border-0 shadow-lg">
                        <CardContent className="p-0">
                            <div className="rounded-xl overflow-hidden">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-emerald-600 hover:bg-emerald-600">
                                            <TableHead className="text-white font-bold">STT</TableHead>
                                            <TableHead className="text-white font-bold">Đơn vị</TableHead>
                                            <TableHead className="text-white font-bold">Số KHLCNT</TableHead>
                                            <TableHead className="text-white font-bold">Loại mua sắm</TableHead>
                                            <TableHead className="text-white font-bold">Bắt đầu mua sắm gần nhất</TableHead>
                                            <TableHead className="text-white font-bold">Ngày tạo gần nhất</TableHead>
                                            <TableHead className="text-white font-bold">Trạng thái</TableHead>
                                            <TableHead className="text-white font-bold">Thao tác</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {loading ? (
                                            <TableRow>
                                                <TableCell colSpan={8} className="text-center py-12">
                                                    <div className="flex flex-col items-center gap-2 text-gray-400">
                                                        <svg className="animate-spin h-8 w-8" viewBox="0 0 24 24">
                                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                                        </svg>
                                                        <p>Đang tải dữ liệu...</p>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ) : groupedQuyTrinh2Plans.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={8} className="text-center py-12 text-gray-400">
                                                    <div className="flex flex-col items-center gap-3">
                                                        <svg className="w-12 h-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                                        </svg>
                                                        <p>Chưa có kế hoạch Tự quyết định.</p>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            groupedQuyTrinh2Plans.map((group, idx) => {
                                                const isExpanded = expandedFacilityIds.has(group.facilityId);
                                                const purchaseTypePreview = group.purchaseTypes.slice(0, 2).join(", ");
                                                const groupStatus = group.publishedCount === group.planCount
                                                    ? {
                                                        label: "Đã đăng tải",
                                                        className: "bg-green-100 text-green-700",
                                                        description: undefined,
                                                    }
                                                    : group.publishedCount > 0
                                                        ? {
                                                            label: "Đăng tải một phần",
                                                            className: "bg-blue-100 text-blue-700",
                                                            description: `${group.publishedCount}/${group.planCount} KHLCNT đã đăng tải`,
                                                        }
                                                        : {
                                                            label: "Chưa đăng tải",
                                                            className: "bg-amber-100 text-amber-700",
                                                            description: undefined,
                                                        };

                                                return (
                                                    <Fragment key={group.facilityId}>
                                                        <TableRow className={isExpanded ? "bg-emerald-50/70" : ""}>
                                                            <TableCell className="font-medium">{(pageByTab.quyTrinh2 - 1) * PAGE_SIZE + idx + 1}</TableCell>
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
                                                            <TableCell className="font-medium">{group.planCount}</TableCell>
                                                            <TableCell>
                                                                <div className="text-sm font-medium text-slate-900">
                                                                    {purchaseTypePreview || "—"}
                                                                </div>
                                                                {group.purchaseTypes.length > 2 && (
                                                                    <div className="text-xs text-slate-500">+{group.purchaseTypes.length - 2} loại khác</div>
                                                                )}
                                                            </TableCell>
                                                            <TableCell className="text-sm text-gray-500">
                                                                {formatDate(group.latestPurchaseStartAt)}
                                                            </TableCell>
                                                            <TableCell className="text-sm text-gray-500">
                                                                {formatDate(group.latestCreatedAt)}
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
                                                                <TableCell colSpan={8} className="p-0">
                                                                    <div className="border-t bg-slate-50/70 px-4 py-4">
                                                                        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                                                                            <Table>
                                                                                <TableHeader>
                                                                                    <TableRow className="bg-slate-50">
                                                                                        <TableHead>STT</TableHead>
                                                                                        <TableHead>Loại mua sắm</TableHead>
                                                                                        <TableHead>Ngày bắt đầu mua sắm</TableHead>
                                                                                        <TableHead>Ngày bắt đầu HĐ</TableHead>
                                                                                        <TableHead>Thời gian thực hiện</TableHead>
                                                                                        <TableHead>Ngày kết thúc HĐ</TableHead>
                                                                                        <TableHead>Ngày tạo</TableHead>
                                                                                        <TableHead className="text-right">Thao tác</TableHead>
                                                                                    </TableRow>
                                                                                </TableHeader>
                                                                                <TableBody>
                                                                                    {group.plans.map((kh, planIndex) => (
                                                                                        <TableRow key={kh.id} className="hover:bg-emerald-50/60">
                                                                                            <TableCell>{planIndex + 1}</TableCell>
                                                                                            <TableCell>
                                                                                                <span className="inline-block rounded-full bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-700">
                                                                                                    {kh.loaiMuaSamTuQuyet || "—"}
                                                                                                </span>
                                                                                            </TableCell>
                                                                                            <TableCell className="text-sm">{formatDate(kh.thoiGianBatDauMuaSam)}</TableCell>
                                                                                            <TableCell className="text-sm">{formatDate(kh.thoiGianBatDauThucHienHopDong)}</TableCell>
                                                                                            <TableCell className="text-sm">{kh.thoiGianThucHienHopDong || "—"}</TableCell>
                                                                                            <TableCell className="text-sm">{formatDate(kh.thoiGianKetThucHopDong)}</TableCell>
                                                                                            <TableCell className="text-sm text-gray-500">{formatDate(kh.createdAt)}</TableCell>
                                                                                            <TableCell className="text-right">
                                                                                                <div className="flex justify-end gap-2">
                                                                                                    <Button
                                                                                                        variant="ghost"
                                                                                                        size="sm"
                                                                                                        onClick={() => handleViewDetail(kh)}
                                                                                                        className="text-emerald-600 hover:bg-emerald-100 hover:text-emerald-800"
                                                                                                    >
                                                                                                        Chi tiết
                                                                                                    </Button>
                                                                                                    <Button
                                                                                                        variant="ghost"
                                                                                                        size="sm"
                                                                                                        onClick={() => handleDelete(kh.id)}
                                                                                                        className="text-red-600 hover:bg-red-100 hover:text-red-800"
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
                                page={pageByTab.quyTrinh2}
                                totalPages={totalPagesByTab.quyTrinh2}
                                totalRows={totalRowsByTab.quyTrinh2}
                                currentCount={groupedQuyTrinh2Plans.length}
                                onPageChange={(nextPage) => handlePageChange("quyTrinh2", nextPage)}
                            />
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* =================== DETAIL MODAL =================== */}
            <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
                <DialogContent className="!top-0 !left-0 !h-[100dvh] !w-screen !max-w-none !translate-x-0 !translate-y-0 !rounded-none !border-0 !p-0 !shadow-none flex flex-col gap-0 overflow-hidden sm:!max-w-none">
                    <DialogHeader className="shrink-0 border-b px-6 py-5 pr-16">
                        <DialogTitle className="text-xl text-blue-800">
                            Chi tiết Kế hoạch LCNT
                        </DialogTitle>
                    </DialogHeader>
                    {selectedPlan && (
                        <div className="flex-1 overflow-y-auto px-6 py-5">
                            <div className="space-y-6">
                            {/* Facility info */}
                            <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                                <h4 className="font-semibold text-blue-800 mb-3">Thông tin đơn vị</h4>
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    <div>
                                        <Label className="text-xs text-gray-500">Tên đơn vị</Label>
                                        <p className="font-medium">{selectedPlan.facility.facilityName}</p>
                                    </div>
                                    <div>
                                        <Label className="text-xs text-gray-500">Mã đơn vị</Label>
                                        <p className="font-medium">{selectedPlan.facility.facilityCode}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Plan info */}
                            <div className={`p-4 rounded-xl border ${selectedPlan.quyTrinh === 1
                                ? 'bg-indigo-50 border-indigo-100'
                                : 'bg-emerald-50 border-emerald-100'}`}>
                                <h4 className={`font-semibold mb-3 ${selectedPlan.quyTrinh === 1
                                    ? 'text-indigo-800'
                                    : 'text-emerald-800'}`}>
                                    Thông tin kế hoạch
                                </h4>
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
                                    <div>
                                        <Label className="text-xs text-gray-500">Quy trình</Label>
                                        <p className="font-medium">
                                            {selectedPlan.quyTrinh === 1 ? "Luật Đấu thầu" : "Tự quyết định"}
                                        </p>
                                    </div>

                                    {selectedPlan.quyTrinh === 1 ? (
                                        <>
                                            <div>
                                                <Label className="text-xs text-gray-500">Mã KHLCNT</Label>
                                                <p className="font-medium">{selectedPlan.maKHLCNT || "—"}</p>
                                            </div>
                                            <div>
                                                <Label className="text-xs text-gray-500">Tên KHLCNT</Label>
                                                <p className="font-medium">{selectedPlan.tenKHLCNT || "—"}</p>
                                            </div>
                                            <div>
                                                <Label className="text-xs text-gray-500">Số QĐ phê duyệt</Label>
                                                <p className="font-medium">{selectedPlan.soQuyetDinh || "—"}</p>
                                            </div>
                                            <div>
                                                <Label className="text-xs text-gray-500">Ngày phê duyệt</Label>
                                                <p className="font-medium">{selectedPlan.ngayPheDuyet || "—"}</p>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div>
                                                <Label className="text-xs text-gray-500">Loại mua sắm</Label>
                                                <span className="inline-block px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                                                    {selectedPlan.loaiMuaSamTuQuyet || "—"}
                                                </span>
                                            </div>
                                            <div>
                                                <Label className="text-xs text-gray-500">Ngày bắt đầu mua sắm</Label>
                                                <p className="font-medium">
                                                    {selectedPlan.thoiGianBatDauMuaSam
                                                        ? new Date(selectedPlan.thoiGianBatDauMuaSam).toLocaleDateString("vi-VN")
                                                        : "—"}
                                                </p>
                                            </div>
                                            <div>
                                                <Label className="text-xs text-gray-500">Ngày bắt đầu HĐ</Label>
                                                <p className="font-medium">
                                                    {selectedPlan.thoiGianBatDauThucHienHopDong
                                                        ? new Date(selectedPlan.thoiGianBatDauThucHienHopDong).toLocaleDateString("vi-VN")
                                                        : "—"}
                                                </p>
                                            </div>
                                            <div>
                                                <Label className="text-xs text-gray-500">Thời gian thực hiện</Label>
                                                <p className="font-medium">{selectedPlan.thoiGianThucHienHopDong || "—"}</p>
                                            </div>
                                            <div>
                                                <Label className="text-xs text-gray-500">Ngày kết thúc HĐ</Label>
                                                <p className="font-medium">
                                                    {selectedPlan.thoiGianKetThucHopDong
                                                        ? new Date(selectedPlan.thoiGianKetThucHopDong).toLocaleDateString("vi-VN")
                                                        : "—"}
                                                </p>
                                            </div>
                                        </>
                                    )}

                                    <div>
                                        <Label className="text-xs text-gray-500">Trạng thái</Label>
                                        <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getPlanStatusClassName(selectedPlan.trangThai)}`}>
                                            {selectedPlan.trangThai}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Gói thầu table - only for quyTrinh === 1 */}
                            {selectedPlan.quyTrinh === 1 && (
                                <div>
                                    <h4 className="font-semibold text-gray-800 mb-3">
                                        Danh sách gói thầu ({selectedPlan.goiThaus.length})
                                    </h4>
                                    {selectedPlan.goiThaus.length === 0 ? (
                                        <div className="text-center py-6 text-gray-400 border rounded-xl">
                                            Chưa có gói thầu nào
                                        </div>
                                    ) : (
                                        <div className="overflow-x-auto rounded-xl border">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow className="bg-blue-600 hover:bg-blue-600">
                                                        <TableHead className="text-white font-bold">STT</TableHead>
                                                        <TableHead className="text-white font-bold">Tên gói thầu</TableHead>
                                                        <TableHead className="text-white font-bold">Giá gói thầu</TableHead>
                                                        <TableHead className="text-white font-bold">Hình thức</TableHead>
                                                        <TableHead className="text-white font-bold">Phân loại</TableHead>
                                                        <TableHead className="text-white font-bold">Số QĐ phê duyệt KQLCNT</TableHead>
                                                        <TableHead className="text-white font-bold">Phần lô</TableHead>
                                                        <TableHead className="text-white font-bold">Thao tác</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {selectedPlan.goiThaus.map((gt, idx) => (
                                                        <TableRow key={gt.id} className="hover:bg-blue-50/50">
                                                            <TableCell>{idx + 1}</TableCell>
                                                            <TableCell className="font-medium">{gt.tenGoiThau}</TableCell>
                                                            <TableCell>
                                                                {gt.giaGoiThau
                                                                    ? Number(gt.giaGoiThau).toLocaleString("vi-VN") + " ₫"
                                                                    : "—"}
                                                            </TableCell>
                                                            <TableCell className="text-sm">{gt.hinhThucLCNT || "—"}</TableCell>
                                                            <TableCell className="text-sm max-w-xs truncate">{gt.phanLoaiGoiThau || "—"}</TableCell>
                                                            <TableCell className="min-w-[190px]">
                                                                {gt.ketQuaLCNT ? (
                                                                    <Link
                                                                        href={`/dashboard/admin/mua-sam/ket-qua-lcnt/${encodeURIComponent(gt.ketQuaLCNT.id)}`}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="font-mono text-sm font-semibold text-blue-600 underline-offset-4 hover:text-blue-800 hover:underline"
                                                                    >
                                                                        {gt.ketQuaLCNT.soQdPheDuyetKQLCNT}
                                                                    </Link>
                                                                ) : (
                                                                    <span className="text-gray-400">—</span>
                                                                )}
                                                            </TableCell>
                                                            <TableCell className="text-center">
                                                                <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-100 text-amber-700 font-bold text-xs">
                                                                    {gt.phanLos.length}
                                                                </span>
                                                            </TableCell>
                                                            <TableCell>
                                                                <div className="flex items-center gap-2">
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        onClick={() => handleGoiThauDetail(gt)}
                                                                        className="text-blue-600 hover:text-blue-800 text-xs"
                                                                    >
                                                                        Chi tiết
                                                                    </Button>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        onClick={() => handleDeleteGoiThau(gt)}
                                                                        className="text-red-600 hover:text-red-800 text-xs"
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
                                    )}
                                </div>
                            )}
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* =================== GOI THAU DETAIL MODAL =================== */}
            <Dialog open={goiThauDetailOpen} onOpenChange={setGoiThauDetailOpen}>
                <DialogContent className="!top-0 !left-0 !h-[100dvh] !w-screen !max-w-none !translate-x-0 !translate-y-0 !rounded-none !border-0 !p-0 !shadow-none flex flex-col gap-0 overflow-hidden sm:!max-w-none">
                    <DialogHeader className="shrink-0 border-b px-6 py-5 pr-16">
                        <DialogTitle className="text-lg text-blue-800">
                            Chi tiết gói thầu
                        </DialogTitle>
                    </DialogHeader>
                    {selectedGoiThau && (
                        <div className="flex-1 overflow-y-auto px-6 py-5">
                            <div className="space-y-4">
                            <div className="grid grid-cols-1 gap-4 rounded-xl bg-gray-50 p-4 md:grid-cols-2 xl:grid-cols-3">
                                <div>
                                    <Label className="text-xs text-gray-500">Tên gói thầu</Label>
                                    <p className="font-medium">{selectedGoiThau.tenGoiThau}</p>
                                </div>
                                <div>
                                    <Label className="text-xs text-gray-500">Giá gói thầu</Label>
                                    <p className="font-medium">
                                        {selectedGoiThau.giaGoiThau
                                            ? Number(selectedGoiThau.giaGoiThau).toLocaleString("vi-VN") + " ₫"
                                            : "—"}
                                    </p>
                                </div>
                                <div>
                                    <Label className="text-xs text-gray-500">Lĩnh vực</Label>
                                    <p className="font-medium">{selectedGoiThau.linhVuc.join(", ") || "—"}</p>
                                </div>
                                <div>
                                    <Label className="text-xs text-gray-500">Hình thức LCNT</Label>
                                    <p className="font-medium">{selectedGoiThau.hinhThucLCNT || "—"}</p>
                                </div>
                                <div>
                                    <Label className="text-xs text-gray-500">Phương thức LCNT</Label>
                                    <p className="font-medium">{selectedGoiThau.phuongThucLCNT || "—"}</p>
                                </div>
                                <div>
                                    <Label className="text-xs text-gray-500">Loại hợp đồng</Label>
                                    <p className="font-medium">{selectedGoiThau.loaiHopDong.join(", ") || "—"}</p>
                                </div>
                                <div>
                                    <Label className="text-xs text-gray-500">Phân loại gói thầu</Label>
                                    <p className="font-medium">{selectedGoiThau.phanLoaiGoiThau || "—"}</p>
                                </div>
                                <div>
                                    <Label className="text-xs text-gray-500">Nguồn vốn</Label>
                                    <p className="font-medium">{selectedGoiThau.chiTietNguonVon || "—"}</p>
                                </div>
                                <div>
                                    <Label className="text-xs text-gray-500">TG bắt đầu</Label>
                                    <p className="font-medium">{selectedGoiThau.thoiGianBatDau || "—"}</p>
                                </div>
                                <div>
                                    <Label className="text-xs text-gray-500">TG thực hiện</Label>
                                    <p className="font-medium">{selectedGoiThau.thoiGianThucHien || "—"}</p>
                                </div>
                            </div>

                            {/* Phần lô table */}
                            {selectedGoiThau.phanLos.length > 0 && (
                                <div>
                                    <h4 className="font-semibold text-gray-800 mb-2">
                                        Danh sách phần lô ({selectedGoiThau.phanLos.length})
                                    </h4>
                                    <div className="overflow-x-auto rounded-xl border">
                                        <Table>
                                            <TableHeader>
                                                <TableRow className="bg-amber-100 hover:bg-amber-100">
                                                    <TableHead className="font-bold text-amber-900">STT</TableHead>
                                                    <TableHead className="font-bold text-amber-900">Tên phần lô</TableHead>
                                                    <TableHead className="font-bold text-amber-900">ĐVT</TableHead>
                                                    <TableHead className="font-bold text-amber-900">SL</TableHead>
                                                    <TableHead className="font-bold text-amber-900">Đơn giá</TableHead>
                                                    <TableHead className="font-bold text-amber-900">Thành tiền</TableHead>
                                                    <TableHead className="font-bold text-amber-900">TG TH</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {selectedGoiThau.phanLos.map((pl) => (
                                                    <TableRow key={pl.stt}>
                                                        <TableCell>{pl.stt}</TableCell>
                                                        <TableCell>{pl.tenPhanLo}</TableCell>
                                                        <TableCell>{pl.donViTinh}</TableCell>
                                                        <TableCell>{pl.soLuong?.toLocaleString("vi-VN") ?? "—"}</TableCell>
                                                        <TableCell>{pl.donGia?.toLocaleString("vi-VN") ?? "—"}</TableCell>
                                                        <TableCell>{pl.thanhTien?.toLocaleString("vi-VN") ?? "—"}</TableCell>
                                                        <TableCell>{pl.thoiGianThucHien} {pl.donViTinhThoiGian}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </div>
                            )}
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            <Dialog
                open={deleteGoiThauOpen}
                onOpenChange={(open) => {
                    if (deleteGoiThauLoading) {
                        return;
                    }

                    setDeleteGoiThauOpen(open);

                    if (!open) {
                        setGoiThauToDelete(null);
                    }
                }}
            >
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-red-600">Xác nhận xóa gói thầu</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <p className="text-gray-700">
                            Bạn có chắc chắn muốn xóa gói thầu này không?
                        </p>
                        <div className="rounded-lg border border-red-100 bg-red-50 p-3">
                            <p className="text-sm text-gray-500">Tên gói thầu</p>
                            <p className="font-medium text-gray-800">{goiThauToDelete?.tenGoiThau || "—"}</p>
                        </div>
                        <p className="text-sm text-gray-500">
                            Chỉ có thể xóa gói thầu chưa có thông báo mời thầu liên kết.
                        </p>
                        <div className="flex justify-end gap-3">
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setDeleteGoiThauOpen(false);
                                    setGoiThauToDelete(null);
                                }}
                                disabled={deleteGoiThauLoading}
                            >
                                Hủy
                            </Button>
                            <Button
                                onClick={handleConfirmDeleteGoiThau}
                                className="bg-red-600 hover:bg-red-700 text-white"
                                disabled={deleteGoiThauLoading}
                            >
                                {deleteGoiThauLoading ? "Đang xóa..." : "Xóa"}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-red-600">Xác nhận xóa</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <p className="text-gray-700">
                            Bạn có chắc chắn muốn xóa kế hoạch LCNT này không?
                        </p>
                        <p className="text-sm text-gray-500">
                            Hành động này không thể hoàn tác. Tất cả gói thầu và phần lô liên quan cũng sẽ bị xóa.
                        </p>
                        <div className="flex justify-end gap-3">
                            <Button
                                variant="outline"
                                onClick={() => setDeleteConfirmOpen(false)}
                            >
                                Hủy
                            </Button>
                            <Button
                                onClick={handleConfirmDelete}
                                className="bg-red-600 hover:bg-red-700 text-white"
                            >
                                Xóa
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
