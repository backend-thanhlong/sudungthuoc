"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
    DialogHeader,
    DialogTitle,
    DialogDescription,
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
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface KetQuaItem {
    id: string;
    facilityId: string;
    facilityName: string;
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
    soPhanLo: number;
    createdAt: string;
}

interface Summary {
    totalResults: number;
    totalFacilities: number;
    totalMatHangTrungThau: number;
    tongGiaTriTrungThau: number;
}

export default function AdminKetQuaLCNTPage() {
    const [data, setData] = useState<KetQuaItem[]>([]);
    const [filteredData, setFilteredData] = useState<KetQuaItem[]>([]);
    const [summary, setSummary] = useState<Summary>({
        totalResults: 0,
        totalFacilities: 0,
        totalMatHangTrungThau: 0,
        tongGiaTriTrungThau: 0,
    });
    const [loading, setLoading] = useState(true);
    const [selectedFacility, setSelectedFacility] = useState<string>("all");
    const [facilities, setFacilities] = useState<{ id: string; name: string }[]>([]);

    // Detail dialog
    const [detailOpen, setDetailOpen] = useState(false);
    const [detailLoading, setDetailLoading] = useState(false);
    const [detailData, setDetailData] = useState<any>(null);

    // Delete state
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [deleteItem, setDeleteItem] = useState<KetQuaItem | null>(null);
    const [deleteLoading, setDeleteLoading] = useState(false);

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            const res = await fetch("/api/admin/ket-qua-lcnt");
            if (res.ok) {
                const result = await res.json();
                setData(result.results || []);
                setSummary(result.summary || {
                    totalResults: 0,
                    totalFacilities: 0,
                    totalMatHangTrungThau: 0,
                    tongGiaTriTrungThau: 0,
                });

                // Extract unique facilities
                const facilityMap = new Map<string, string>();
                (result.results || []).forEach((r: KetQuaItem) => {
                    if (!facilityMap.has(r.facilityId)) {
                        facilityMap.set(r.facilityId, r.facilityName);
                    }
                });
                setFacilities(
                    Array.from(facilityMap.entries()).map(([id, name]) => ({ id, name }))
                );
            } else {
                toast.error("Lỗi khi tải dữ liệu");
            }
        } catch (error) {
            console.error("Error loading data:", error);
            toast.error("Lỗi kết nối");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Filter data
    useEffect(() => {
        let filtered = [...data];
        if (selectedFacility !== "all") {
            filtered = filtered.filter((r) => r.facilityId === selectedFacility);
        }
        setFilteredData(filtered);

        // Update summary for filtered data
        setSummary({
            totalResults: filtered.length,
            totalFacilities: new Set(filtered.map((r) => r.facilityId)).size,
            totalMatHangTrungThau: filtered.reduce((acc, r) => acc + r.soMatHangTrungThau, 0),
            tongGiaTriTrungThau: filtered.reduce((acc, r) => acc + Number(r.tongGiaTriTrungThau), 0),
        });
    }, [data, selectedFacility]);

    const handleViewDetail = async (id: string) => {
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
    };

    const handleDelete = async () => {
        if (!deleteId) return;
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

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold text-gray-800">Kết quả LCNT</h2>
                <p className="text-gray-500 mt-1">
                    Tổng hợp kết quả lựa chọn nhà thầu từ tất cả cơ sở
                </p>
            </div>

            {/* Filter */}
            <Card className="border-0 shadow-lg">
                <CardContent className="pt-6">
                    <div className="flex items-center gap-4 flex-wrap">
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-600 whitespace-nowrap">
                                Cơ sở:
                            </span>
                            <Select value={selectedFacility} onValueChange={setSelectedFacility}>
                                <SelectTrigger className="w-[280px]">
                                    <SelectValue placeholder="Tất cả" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Tất cả cơ sở</SelectItem>
                                    {facilities.map((f) => (
                                        <SelectItem key={f.id} value={f.id}>
                                            {f.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        {selectedFacility !== "all" && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedFacility("all")}
                                className="text-gray-500 hover:text-gray-700"
                            >
                                <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                                Xóa bộ lọc
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card className="border-0 shadow-lg border-l-4 border-l-blue-500">
                    <CardContent className="pt-6">
                        <div className="text-3xl font-bold text-blue-600">{summary.totalResults}</div>
                        <p className="text-gray-500">Tổng kết quả LCNT</p>
                    </CardContent>
                </Card>
                <Card className="border-0 shadow-lg border-l-4 border-l-emerald-500">
                    <CardContent className="pt-6">
                        <div className="text-3xl font-bold text-emerald-600">{summary.totalFacilities}</div>
                        <p className="text-gray-500">Cơ sở đã báo cáo</p>
                    </CardContent>
                </Card>
                <Card className="border-0 shadow-lg border-l-4 border-l-amber-500">
                    <CardContent className="pt-6">
                        <div className="text-3xl font-bold text-amber-600">
                            {new Intl.NumberFormat("vi-VN").format(summary.totalMatHangTrungThau)}
                        </div>
                        <p className="text-gray-500">Tổng mặt hàng trúng thầu</p>
                    </CardContent>
                </Card>
                <Card className="border-0 shadow-lg border-l-4 border-l-indigo-500">
                    <CardContent className="pt-6">
                        <div className="text-3xl font-bold text-indigo-600">
                            {new Intl.NumberFormat("vi-VN", {
                                style: "currency",
                                currency: "VND",
                                maximumFractionDigits: 0,
                            }).format(summary.tongGiaTriTrungThau)}
                        </div>
                        <p className="text-gray-500">Tổng giá trị trúng thầu</p>
                    </CardContent>
                </Card>
            </div>

            {/* Table */}
            <Card className="border-0 shadow-lg">
                <CardHeader>
                    <CardTitle>Danh sách kết quả LCNT</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="rounded-xl overflow-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-blue-600 hover:bg-blue-600">
                                    <TableHead className="text-white font-bold">STT</TableHead>
                                    <TableHead className="text-white font-bold">Cơ sở</TableHead>
                                    <TableHead className="text-white font-bold">Mã KHLCNT</TableHead>
                                    <TableHead className="text-white font-bold">Tên gói thầu</TableHead>
                                    <TableHead className="text-white font-bold">Mã TBMT</TableHead>
                                    <TableHead className="text-white font-bold">Số QĐ phê duyệt</TableHead>
                                    <TableHead className="text-white font-bold">Ngày phê duyệt</TableHead>
                                    <TableHead className="text-white font-bold text-right">MH mời thầu</TableHead>
                                    <TableHead className="text-white font-bold text-right">MH trúng thầu</TableHead>
                                    <TableHead className="text-white font-bold text-right">Giá trị trúng thầu</TableHead>
                                    <TableHead className="text-white font-bold">Thao tác</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredData.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={11} className="text-center py-12 text-gray-400">
                                            <div className="flex flex-col items-center gap-3">
                                                <svg className="w-12 h-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                <p>Chưa có kết quả LCNT nào.</p>
                                                <p className="text-sm">
                                                    Dữ liệu sẽ hiển thị khi các cơ sở báo cáo kết quả LCNT.
                                                </p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredData.map((item, idx) => (
                                        <TableRow key={item.id} className="hover:bg-blue-50/50">
                                            <TableCell className="font-medium">{idx + 1}</TableCell>
                                            <TableCell>
                                                <span className="font-medium text-gray-800">
                                                    {item.facilityName}
                                                </span>
                                            </TableCell>
                                            <TableCell>{item.maKHLCNT || "—"}</TableCell>
                                            <TableCell className="max-w-xs truncate">
                                                {item.tenGoiThau || "—"}
                                            </TableCell>
                                            <TableCell>
                                                <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-200 border-0">
                                                    {item.maTBMT}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>{item.soQdPheDuyetKQLCNT}</TableCell>
                                            <TableCell className="text-sm text-gray-500">
                                                {new Date(item.ngayPheDuyetKQLCNT).toLocaleDateString("vi-VN")}
                                            </TableCell>
                                            <TableCell className="text-right">{item.soMatHangMoiThau}</TableCell>
                                            <TableCell className="text-right font-medium text-emerald-600">
                                                {item.soMatHangTrungThau}
                                            </TableCell>
                                            <TableCell className="text-right font-medium text-indigo-600">
                                                {new Intl.NumberFormat("vi-VN").format(Number(item.tongGiaTriTrungThau))}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleViewDetail(item.id)}
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
                                                        onClick={() => {
                                                            setDeleteId(item.id);
                                                            setDeleteItem(item);
                                                        }}
                                                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
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

            {/* Detail Dialog */}
            <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
                <DialogContent className="max-w-[85vw] sm:max-w-[85vw] w-[85vw] max-h-[85vh] flex flex-col p-0">
                    <DialogHeader className="p-6 pb-2">
                        <DialogTitle>
                            Chi tiết Kết quả LCNT
                            {detailData && (
                                <span className="text-gray-500 font-normal text-base ml-2">
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

                    <div className="flex-1 overflow-auto p-6 pt-0 space-y-4">
                        {detailLoading ? (
                            <div className="flex items-center justify-center h-48">
                                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                            </div>
                        ) : detailData ? (
                            <>
                                {/* General Info */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-gray-50 rounded-xl p-4">
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
                                            {new Intl.NumberFormat("vi-VN", {
                                                style: "currency",
                                                currency: "VND",
                                                maximumFractionDigits: 0,
                                            }).format(Number(detailData.tongGiaTriTrungThau))}
                                        </p>
                                    </div>
                                </div>

                                {/* Lot Results Table */}
                                <div>
                                    <h4 className="font-semibold text-gray-800 mb-3">
                                        Kết quả từng phần lô ({detailData.ketQuaPhanLos?.length || 0} phần lô)
                                    </h4>
                                    <div className="rounded-xl overflow-hidden border">
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
                                                {(detailData.ketQuaPhanLos || []).map(
                                                    (kqpl: any, idx: number) => (
                                                        <TableRow key={kqpl.id || idx}>
                                                            <TableCell>{kqpl.phanLoGoiThau?.stt || idx + 1}</TableCell>
                                                            <TableCell className="max-w-xs truncate">
                                                                {kqpl.phanLoGoiThau?.tenPhanLo || "—"}
                                                            </TableCell>
                                                            <TableCell>
                                                                {kqpl.phanLoGoiThau?.donViTinh || "—"}
                                                            </TableCell>
                                                            <TableCell className="text-right">
                                                                {kqpl.phanLoGoiThau?.soLuong
                                                                    ? new Intl.NumberFormat("vi-VN").format(
                                                                        Number(kqpl.phanLoGoiThau.soLuong)
                                                                    )
                                                                    : "—"}
                                                            </TableCell>
                                                            <TableCell className="text-right">
                                                                {kqpl.phanLoGoiThau?.donGia
                                                                    ? new Intl.NumberFormat("vi-VN").format(
                                                                        Number(kqpl.phanLoGoiThau.donGia)
                                                                    )
                                                                    : "—"}
                                                            </TableCell>
                                                            <TableCell className="text-right">
                                                                {kqpl.phanLoGoiThau?.thanhTien
                                                                    ? new Intl.NumberFormat("vi-VN").format(
                                                                        Number(kqpl.phanLoGoiThau.thanhTien)
                                                                    )
                                                                    : "—"}
                                                            </TableCell>
                                                            <TableCell>
                                                                <Badge
                                                                    className={
                                                                        kqpl.ketQua === "Trúng thầu"
                                                                            ? "bg-emerald-100 text-emerald-700 border-0"
                                                                            : "bg-gray-100 text-gray-700 border-0"
                                                                    }
                                                                >
                                                                    {kqpl.ketQua || "—"}
                                                                </Badge>
                                                            </TableCell>
                                                            <TableCell className="text-right font-medium text-emerald-600">
                                                                {kqpl.donGiaTrungThau
                                                                    ? new Intl.NumberFormat("vi-VN").format(
                                                                        Number(kqpl.donGiaTrungThau)
                                                                    )
                                                                    : "—"}
                                                            </TableCell>
                                                            <TableCell className="max-w-xs truncate">
                                                                {kqpl.nhaThauTrungThau || "—"}
                                                            </TableCell>
                                                        </TableRow>
                                                    )
                                                )}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="text-center text-gray-400 py-12">
                                Không có dữ liệu
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={!!deleteId} onOpenChange={(open) => { if (!open) { setDeleteId(null); setDeleteItem(null); } }}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Xác nhận xóa Kết quả LCNT</AlertDialogTitle>
                        <AlertDialogDescription>
                            Bạn có chắc chắn muốn xóa kết quả LCNT này không?
                            {deleteItem && (
                                <span className="block mt-2 text-gray-700">
                                    <strong>Gói thầu:</strong> {deleteItem.tenGoiThau}<br />
                                    <strong>Mã TBMT:</strong> {deleteItem.maTBMT}<br />
                                    <strong>Cơ sở:</strong> {deleteItem.facilityName}
                                </span>
                            )}
                            <span className="block mt-2 text-red-600 font-medium">
                                Hành động này không thể hoàn tác. Tất cả kết quả phần lô liên quan cũng sẽ bị xóa.
                            </span>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={deleteLoading}>Hủy</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            disabled={deleteLoading}
                            className="bg-red-600 hover:bg-red-700 text-white"
                        >
                            {deleteLoading ? (
                                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Đang xóa...</>
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
