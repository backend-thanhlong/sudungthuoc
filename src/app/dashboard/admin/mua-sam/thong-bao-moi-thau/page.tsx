"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

interface Facility {
    id: string;
    facilityName: string | null;
    facilityCode: string | null;
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

interface TBMT {
    id: string;
    maTBMT: string;
    ngayDangTai: string;
    soQdPheDuyetHSMT: string;
    ngayPheDuyetHSMT: string;
    ngayDongThau: string;
    createdAt: string;
    goiThau: GoiThau;
}

export default function AdminThongBaoMoiThauPage() {
    const [tbmtRecords, setTbmtRecords] = useState<TBMT[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedFacility, setSelectedFacility] = useState<string>("all");
    const [selectedTBMT, setSelectedTBMT] = useState<TBMT | null>(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);

    useEffect(() => {
        loadTBMTRecords();
    }, []);

    const loadTBMTRecords = async () => {
        try {
            setLoading(true);
            const res = await fetch("/api/admin/thong-bao-moi-thau");
            if (res.ok) {
                const data = await res.json();
                setTbmtRecords(data);
            }
        } catch (error) {
            console.error("Error loading TBMT records:", error);
        } finally {
            setLoading(false);
        }
    };

    // Get unique facilities for filter dropdown
    const facilities = useMemo(() => {
        const uniqueFacilities = new Map<string, Facility>();
        tbmtRecords.forEach(record => {
            const facility = record.goiThau.keHoach.facility;
            if (!uniqueFacilities.has(facility.id)) {
                uniqueFacilities.set(facility.id, facility);
            }
        });
        return Array.from(uniqueFacilities.values());
    }, [tbmtRecords]);

    // Filter and search records
    const filteredRecords = useMemo(() => {
        let filtered = tbmtRecords;

        // Filter by facility
        if (selectedFacility !== "all") {
            filtered = filtered.filter(
                record => record.goiThau.keHoach.facility.id === selectedFacility
            );
        }

        // Search
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(record =>
                record.maTBMT.toLowerCase().includes(query) ||
                record.goiThau.tenGoiThau.toLowerCase().includes(query) ||
                (record.goiThau.keHoach.maKHLCNT?.toLowerCase().includes(query)) ||
                (record.goiThau.keHoach.tenKHLCNT?.toLowerCase().includes(query)) ||
                (record.goiThau.keHoach.facility.facilityName?.toLowerCase().includes(query)) ||
                (record.goiThau.keHoach.facility.facilityCode?.toLowerCase().includes(query))
            );
        }

        return filtered;
    }, [tbmtRecords, selectedFacility, searchQuery]);

    const handleViewDetails = (tbmt: TBMT) => {
        setSelectedTBMT(tbmt);
        setIsDetailOpen(true);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="flex flex-col items-center gap-4">
                    <svg className="animate-spin h-12 w-12 text-blue-600" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <p className="text-gray-600">Đang tải dữ liệu...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-gray-800">Quản lý Thông báo mời thầu</h2>
                <p className="text-gray-500 mt-1">Xem và quản lý tất cả thông báo mời thầu từ các đơn vị</p>
            </div>

            {/* Filters */}
            <Card className="border-0 shadow-lg">
                <CardContent className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="facility-filter">Lọc theo đơn vị</Label>
                            <Select value={selectedFacility} onValueChange={setSelectedFacility}>
                                <SelectTrigger id="facility-filter" className="mt-1">
                                    <SelectValue placeholder="Tất cả đơn vị" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Tất cả đơn vị</SelectItem>
                                    {facilities.map(facility => (
                                        <SelectItem key={facility.id} value={facility.id}>
                                            {facility.facilityName || facility.facilityCode || "Không rõ"}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <Label htmlFor="search">Tìm kiếm</Label>
                            <Input
                                id="search"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Tìm mã TBMT, tên gói thầu, kế hoạch, đơn vị..."
                                className="mt-1"
                            />
                        </div>
                    </div>

                    <div className="mt-4 text-sm text-gray-600">
                        Tìm thấy <span className="font-semibold text-blue-600">{filteredRecords.length}</span> kết quả
                    </div>
                </CardContent>
            </Card>

            {/* Table */}
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
                                    <TableHead className="text-white font-bold">Tên gói thầu</TableHead>
                                    <TableHead className="text-white font-bold">Mã TBMT</TableHead>
                                    <TableHead className="text-white font-bold">Ngày đăng tải</TableHead>
                                    <TableHead className="text-white font-bold">Ngày đóng thầu</TableHead>
                                    <TableHead className="text-white font-bold">Thao tác</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredRecords.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={9} className="text-center py-12 text-gray-400">
                                            <div className="flex flex-col items-center gap-3">
                                                <svg className="w-12 h-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                </svg>
                                                <p>Không tìm thấy thông báo mời thầu</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredRecords.map((record, idx) => (
                                        <TableRow key={record.id} className="hover:bg-blue-50/50">
                                            <TableCell className="font-medium">{idx + 1}</TableCell>
                                            <TableCell className="max-w-xs">
                                                <div className="truncate">
                                                    {record.goiThau.keHoach.facility.facilityName || "—"}
                                                </div>
                                                <div className="text-xs text-gray-500">
                                                    {record.goiThau.keHoach.facility.facilityCode || "—"}
                                                </div>
                                            </TableCell>
                                            <TableCell>{record.goiThau.keHoach.maKHLCNT || "—"}</TableCell>
                                            <TableCell className="max-w-xs truncate">
                                                {record.goiThau.keHoach.tenKHLCNT || "—"}
                                            </TableCell>
                                            <TableCell className="max-w-xs truncate">
                                                {record.goiThau.tenGoiThau}
                                            </TableCell>
                                            <TableCell className="font-medium text-blue-700">
                                                {record.maTBMT}
                                            </TableCell>
                                            <TableCell>
                                                {new Date(record.ngayDangTai).toLocaleDateString("vi-VN")}
                                            </TableCell>
                                            <TableCell>
                                                {new Date(record.ngayDongThau).toLocaleDateString("vi-VN")}
                                            </TableCell>
                                            <TableCell>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => handleViewDetails(record)}
                                                    className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 border-blue-300"
                                                >
                                                    <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                    </svg>
                                                    Xem chi tiết
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            {/* Details Dialog */}
            <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold text-blue-800">
                            Chi tiết Thông báo mời thầu
                        </DialogTitle>
                    </DialogHeader>

                    {selectedTBMT && (
                        <div className="space-y-6 mt-4">
                            {/* Facility Info */}
                            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                                <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                    </svg>
                                    Thông tin đơn vị
                                </h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label className="text-sm text-gray-600">Tên đơn vị</Label>
                                        <p className="font-medium mt-1">
                                            {selectedTBMT.goiThau.keHoach.facility.facilityName || "—"}
                                        </p>
                                    </div>
                                    <div>
                                        <Label className="text-sm text-gray-600">Mã đơn vị</Label>
                                        <p className="font-medium mt-1">
                                            {selectedTBMT.goiThau.keHoach.facility.facilityCode || "—"}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Plan Info */}
                            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                    </svg>
                                    Thông tin kế hoạch LCNT
                                </h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label className="text-sm text-gray-600">Mã KHLCNT</Label>
                                        <p className="font-medium mt-1">
                                            {selectedTBMT.goiThau.keHoach.maKHLCNT || "—"}
                                        </p>
                                    </div>
                                    <div className="col-span-2">
                                        <Label className="text-sm text-gray-600">Tên KHLCNT</Label>
                                        <p className="font-medium mt-1">
                                            {selectedTBMT.goiThau.keHoach.tenKHLCNT || "—"}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Package Info */}
                            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                                    </svg>
                                    Thông tin gói thầu
                                </h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="col-span-2">
                                        <Label className="text-sm text-gray-600">Tên gói thầu</Label>
                                        <p className="font-medium mt-1">{selectedTBMT.goiThau.tenGoiThau}</p>
                                    </div>
                                    <div>
                                        <Label className="text-sm text-gray-600">Giá gói thầu</Label>
                                        <p className="font-medium mt-1">
                                            {selectedTBMT.goiThau.giaGoiThau
                                                ? selectedTBMT.goiThau.giaGoiThau.toLocaleString("vi-VN") + " VNĐ"
                                                : "—"}
                                        </p>
                                    </div>
                                    <div>
                                        <Label className="text-sm text-gray-600">Số lượng phần lô</Label>
                                        <p className="font-medium mt-1">
                                            {selectedTBMT.goiThau.soLuongPhanLo || "—"}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* TBMT Info */}
                            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
                                <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    Thông tin TBMT
                                </h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label className="text-sm text-gray-600">Mã TBMT</Label>
                                        <p className="font-medium mt-1 text-blue-700">{selectedTBMT.maTBMT}</p>
                                    </div>
                                    <div>
                                        <Label className="text-sm text-gray-600">Ngày đăng tải TBMT</Label>
                                        <p className="font-medium mt-1">
                                            {new Date(selectedTBMT.ngayDangTai).toLocaleDateString("vi-VN")}
                                        </p>
                                    </div>
                                    <div>
                                        <Label className="text-sm text-gray-600">Số QĐ phê duyệt HSMT</Label>
                                        <p className="font-medium mt-1">{selectedTBMT.soQdPheDuyetHSMT}</p>
                                    </div>
                                    <div>
                                        <Label className="text-sm text-gray-600">Ngày phê duyệt HSMT</Label>
                                        <p className="font-medium mt-1">
                                            {new Date(selectedTBMT.ngayPheDuyetHSMT).toLocaleDateString("vi-VN")}
                                        </p>
                                    </div>
                                    <div className="col-span-2">
                                        <Label className="text-sm text-gray-600">Ngày đóng thầu</Label>
                                        <p className="font-medium mt-1">
                                            {new Date(selectedTBMT.ngayDongThau).toLocaleDateString("vi-VN")}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
