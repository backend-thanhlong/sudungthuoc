"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

// ===================== COMPONENT =====================
export default function AdminKeHoachLCNTPage() {
    const [keHoachList, setKeHoachList] = useState<KeHoachLCNT[]>([]);
    const [filteredList, setFilteredList] = useState<KeHoachLCNT[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [filterFacility, setFilterFacility] = useState("");
    const [listTab, setListTab] = useState("quyTrinh1"); // Tab for list view
    const [selectedPlan, setSelectedPlan] = useState<KeHoachLCNT | null>(null);
    const [detailOpen, setDetailOpen] = useState(false);
    const [selectedGoiThau, setSelectedGoiThau] = useState<GoiThau | null>(null);
    const [goiThauDetailOpen, setGoiThauDetailOpen] = useState(false);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [deleteId, setDeleteId] = useState<string | null>(null);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/admin/ke-hoach-lcnt");
            if (!res.ok) throw new Error("Failed to fetch");
            const data = await res.json();

            const mapped: KeHoachLCNT[] = data.map((item: any) => ({
                id: item.id,
                quyTrinh: item.quyTrinh,
                maKHLCNT: item.maKHLCNT || "",
                tenKHLCNT: item.tenKHLCNT || "",
                soQuyetDinh: item.soQuyetDinh || "",
                ngayPheDuyet: item.ngayPheDuyet
                    ? new Date(item.ngayPheDuyet).toISOString().split("T")[0]
                    : "",
                soLuongGoiThau: item.soLuongGoiThau,
                trangThai: item.trangThai || "Chưa đăng tải",
                createdAt: item.createdAt,
                // Self-decision process fields
                loaiMuaSamTuQuyet: item.loaiMuaSamTuQuyet || "",
                thoiGianBatDauMuaSam: item.thoiGianBatDauMuaSam
                    ? new Date(item.thoiGianBatDauMuaSam).toISOString().split("T")[0]
                    : "",
                thoiGianBatDauThucHienHopDong: item.thoiGianBatDauThucHienHopDong
                    ? new Date(item.thoiGianBatDauThucHienHopDong).toISOString().split("T")[0]
                    : "",
                thoiGianThucHienHopDong: item.thoiGianThucHienHopDong || "",
                thoiGianKetThucHopDong: item.thoiGianKetThucHopDong
                    ? new Date(item.thoiGianKetThucHopDong).toISOString().split("T")[0]
                    : "",
                facility: {
                    id: item.facility?.id || "",
                    facilityName: item.facility?.facilityName || "—",
                    facilityCode: item.facility?.facilityCode || "—",
                },
                goiThaus: item.goiThaus?.map((gt: any) => ({
                    id: gt.id,
                    tenGoiThau: gt.tenGoiThau || "",
                    giaGoiThau: gt.giaGoiThau ? Number(gt.giaGoiThau) : null,
                    linhVuc: gt.linhVuc ? JSON.parse(gt.linhVuc) : [],
                    hinhThucLCNT: gt.hinhThucLCNT || "",
                    phuongThucLCNT: gt.phuongThucLCNT || "",
                    loaiHopDong: gt.loaiHopDong ? JSON.parse(gt.loaiHopDong) : [],
                    phanLoaiGoiThau: gt.phanLoaiGoiThau || "",
                    chiTietNguonVon: gt.chiTietNguonVon || "",
                    soLuongPhanLo: gt.soLuongPhanLo,
                    thoiGianToChuc: gt.thoiGianToChuc || "",
                    thoiGianBatDau: gt.thoiGianBatDau
                        ? new Date(gt.thoiGianBatDau).toISOString().split("T")[0]
                        : "",
                    thoiGianThucHien: gt.thoiGianThucHien || "",
                    trangThai: gt.trangThai || "",
                    maThongBao: gt.maThongBao || "",
                    phanLos: gt.phanLos?.map((pl: any) => ({
                        stt: pl.stt,
                        tenPhanLo: pl.tenPhanLo || "",
                        donViTinh: pl.donViTinh || "",
                        soLuong: pl.soLuong ? Number(pl.soLuong) : null,
                        donGia: pl.donGia ? Number(pl.donGia) : null,
                        thanhTien: pl.thanhTien ? Number(pl.thanhTien) : null,
                        thoiGianThucHien: pl.thoiGianThucHien || "",
                        donViTinhThoiGian: pl.donViTinhThoiGian || "",
                    })) || [],
                })) || [],
            }));

            setKeHoachList(mapped);
            setFilteredList(mapped);
        } catch (error) {
            console.error("Error loading:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Filter logic
    useEffect(() => {
        let result = keHoachList;

        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            result = result.filter(
                (kh) =>
                    kh.maKHLCNT.toLowerCase().includes(term) ||
                    kh.tenKHLCNT.toLowerCase().includes(term) ||
                    kh.facility.facilityName.toLowerCase().includes(term) ||
                    kh.facility.facilityCode.toLowerCase().includes(term)
            );
        }

        if (filterFacility) {
            result = result.filter((kh) => kh.facility.facilityCode === filterFacility);
        }

        setFilteredList(result);
    }, [searchTerm, filterFacility, keHoachList]);

    const uniqueFacilities = Array.from(
        new Map(keHoachList.map((kh) => [kh.facility.facilityCode, kh.facility])).values()
    );

    const handleViewDetail = (plan: KeHoachLCNT) => {
        setSelectedPlan(plan);
        setDetailOpen(true);
    };

    const handleGoiThauDetail = (goiThau: GoiThau) => {
        setSelectedGoiThau(goiThau);
        setGoiThauDetailOpen(true);
    };

    const handleDelete = (id: string) => {
        setDeleteId(id);
        setDeleteConfirmOpen(true);
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

    // Stats
    const totalPlans = keHoachList.length;
    const totalFacilities = uniqueFacilities.length;
    const totalGoiThaus = keHoachList.reduce((sum, kh) => sum + kh.goiThaus.length, 0);
    const publishedPlans = keHoachList.filter((kh) => kh.trangThai === "Đã đăng tải").length;

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
                                <p className="text-3xl font-bold mt-1">{totalPlans}</p>
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
                                <p className="text-3xl font-bold mt-1">{totalFacilities}</p>
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
                                <p className="text-3xl font-bold mt-1">{totalGoiThaus}</p>
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
                                <p className="text-3xl font-bold mt-1">{publishedPlans}</p>
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
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1">
                            <div className="relative">
                                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                                <Input
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="Tìm theo mã, tên KHLCNT, tên/mã đơn vị..."
                                    className="pl-10"
                                />
                            </div>
                        </div>
                        <div className="w-full md:w-64">
                            <select
                                value={filterFacility}
                                onChange={(e) => setFilterFacility(e.target.value)}
                                className="w-full h-10 rounded-md border border-gray-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">Tất cả đơn vị</option>
                                {uniqueFacilities.map((f) => (
                                    <option key={f.facilityCode} value={f.facilityCode}>
                                        {f.facilityName} ({f.facilityCode})
                                    </option>
                                ))}
                            </select>
                        </div>
                        <Button onClick={loadData} variant="outline" className="rounded-xl">
                            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            Làm mới
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Main table with tabs */}
            <Tabs value={listTab} onValueChange={setListTab}>
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
                                            <TableHead className="text-white font-bold">Mã KHLCNT</TableHead>
                                            <TableHead className="text-white font-bold">Tên KHLCNT</TableHead>
                                            <TableHead className="text-white font-bold">Số gói thầu</TableHead>
                                            <TableHead className="text-white font-bold">Trạng thái</TableHead>
                                            <TableHead className="text-white font-bold">Ngày tạo</TableHead>
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
                                        ) : filteredList.filter(kh => kh.quyTrinh === 1).length === 0 ? (
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
                                            filteredList.filter(kh => kh.quyTrinh === 1).map((kh, idx) => (
                                                <TableRow key={kh.id} className="hover:bg-blue-50/50">
                                                    <TableCell className="font-medium">{idx + 1}</TableCell>
                                                    <TableCell>
                                                        <div>
                                                            <p className="font-medium text-gray-800 text-sm">{kh.facility.facilityName}</p>
                                                            <p className="text-xs text-gray-400">{kh.facility.facilityCode}</p>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="font-mono text-sm">{kh.maKHLCNT || "—"}</TableCell>
                                                    <TableCell className="max-w-xs truncate text-sm">{kh.tenKHLCNT || "—"}</TableCell>
                                                    <TableCell className="text-center">
                                                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold text-sm">
                                                            {kh.goiThaus.length}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell>
                                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${kh.trangThai === "Đã đăng tải"
                                                            ? "bg-green-100 text-green-700"
                                                            : "bg-amber-100 text-amber-700"
                                                            }`}>
                                                            {kh.trangThai}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="text-sm text-gray-500">
                                                        {new Date(kh.createdAt).toLocaleDateString("vi-VN")}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex gap-2">
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => handleViewDetail(kh)}
                                                                className="text-blue-600 hover:text-blue-800 hover:bg-blue-100"
                                                            >
                                                                <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                                </svg>
                                                                Chi tiết
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => handleDelete(kh.id)}
                                                                className="text-red-600 hover:text-red-800 hover:bg-red-100"
                                                            >
                                                                <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                                </svg>
                                                                Xóa
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
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
                                            <TableHead className="text-white font-bold">Loại mua sắm</TableHead>
                                            <TableHead className="text-white font-bold">Ngày bắt đầu mua sắm</TableHead>
                                            <TableHead className="text-white font-bold">Ngày bắt đầu HĐ</TableHead>
                                            <TableHead className="text-white font-bold">Thời gian thực hiện</TableHead>
                                            <TableHead className="text-white font-bold">Ngày kết thúc HĐ</TableHead>
                                            <TableHead className="text-white font-bold">Ngày tạo</TableHead>
                                            <TableHead className="text-white font-bold">Thao tác</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {loading ? (
                                            <TableRow>
                                                <TableCell colSpan={9} className="text-center py-12">
                                                    <div className="flex flex-col items-center gap-2 text-gray-400">
                                                        <svg className="animate-spin h-8 w-8" viewBox="0 0 24 24">
                                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                                        </svg>
                                                        <p>Đang tải dữ liệu...</p>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ) : filteredList.filter(kh => kh.quyTrinh === 2).length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={9} className="text-center py-12 text-gray-400">
                                                    <div className="flex flex-col items-center gap-3">
                                                        <svg className="w-12 h-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                                        </svg>
                                                        <p>Chưa có kế hoạch Tự quyết định.</p>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            filteredList.filter(kh => kh.quyTrinh === 2).map((kh, idx) => (
                                                <TableRow key={kh.id} className="hover:bg-emerald-50/50">
                                                    <TableCell className="font-medium">{idx + 1}</TableCell>
                                                    <TableCell>
                                                        <div>
                                                            <p className="font-medium text-gray-800 text-sm">{kh.facility.facilityName}</p>
                                                            <p className="text-xs text-gray-400">{kh.facility.facilityCode}</p>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                                                            {kh.loaiMuaSamTuQuyet || "—"}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="text-sm">
                                                        {kh.thoiGianBatDauMuaSam
                                                            ? new Date(kh.thoiGianBatDauMuaSam).toLocaleDateString("vi-VN")
                                                            : "—"}
                                                    </TableCell>
                                                    <TableCell className="text-sm">
                                                        {kh.thoiGianBatDauThucHienHopDong
                                                            ? new Date(kh.thoiGianBatDauThucHienHopDong).toLocaleDateString("vi-VN")
                                                            : "—"}
                                                    </TableCell>
                                                    <TableCell className="text-sm">{kh.thoiGianThucHienHopDong || "—"}</TableCell>
                                                    <TableCell className="text-sm">
                                                        {kh.thoiGianKetThucHopDong
                                                            ? new Date(kh.thoiGianKetThucHopDong).toLocaleDateString("vi-VN")
                                                            : "—"}
                                                    </TableCell>
                                                    <TableCell className="text-sm text-gray-500">
                                                        {new Date(kh.createdAt).toLocaleDateString("vi-VN")}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex gap-2">
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => handleViewDetail(kh)}
                                                                className="text-emerald-600 hover:text-emerald-800 hover:bg-emerald-100"
                                                            >
                                                                <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                                </svg>
                                                                Chi tiết
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => handleDelete(kh.id)}
                                                                className="text-red-600 hover:text-red-800 hover:bg-red-100"
                                                            >
                                                                <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                                </svg>
                                                                Xóa
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* =================== DETAIL MODAL =================== */}
            <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
                <DialogContent className="sm:max-w-4xl max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-xl text-blue-800">
                            Chi tiết Kế hoạch LCNT
                        </DialogTitle>
                    </DialogHeader>
                    {selectedPlan && (
                        <div className="space-y-6">
                            {/* Facility info */}
                            <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                                <h4 className="font-semibold text-blue-800 mb-3">Thông tin đơn vị</h4>
                                <div className="grid grid-cols-2 gap-4">
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
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
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
                                        <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${selectedPlan.trangThai === "Đã đăng tải"
                                            ? "bg-green-100 text-green-700"
                                            : "bg-amber-100 text-amber-700"
                                            }`}>
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
                                        <div className="rounded-xl border overflow-hidden">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow className="bg-blue-600 hover:bg-blue-600">
                                                        <TableHead className="text-white font-bold">STT</TableHead>
                                                        <TableHead className="text-white font-bold">Tên gói thầu</TableHead>
                                                        <TableHead className="text-white font-bold">Giá gói thầu</TableHead>
                                                        <TableHead className="text-white font-bold">Hình thức</TableHead>
                                                        <TableHead className="text-white font-bold">Phân loại</TableHead>
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
                                                            <TableCell className="text-center">
                                                                <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-100 text-amber-700 font-bold text-xs">
                                                                    {gt.phanLos.length}
                                                                </span>
                                                            </TableCell>
                                                            <TableCell>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => handleGoiThauDetail(gt)}
                                                                    className="text-blue-600 hover:text-blue-800 text-xs"
                                                                >
                                                                    Chi tiết
                                                                </Button>
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
                    )}
                </DialogContent>
            </Dialog>

            {/* =================== GOI THAU DETAIL MODAL =================== */}
            <Dialog open={goiThauDetailOpen} onOpenChange={setGoiThauDetailOpen}>
                <DialogContent className="sm:max-w-3xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-lg text-blue-800">
                            Chi tiết gói thầu
                        </DialogTitle>
                    </DialogHeader>
                    {selectedGoiThau && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-xl">
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
                                    <div className="rounded-xl border overflow-hidden">
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
                    )}
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
