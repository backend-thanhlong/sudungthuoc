"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

interface TBMT {
    id: string;
    maTBMT: string;
    ngayDangTai: string;
    soQdPheDuyetHSMT: string;
    ngayPheDuyetHSMT: string;
    ngayDongThau: string;
}

interface GoiThau {
    id: string;
    tenGoiThau: string;
    giaGoiThau: number | null;
    soLuongPhanLo: number | null;
    thongBaoMoiThaus: TBMT[];
}

interface KeHoach {
    id: string;
    maKHLCNT: string | null;
    tenKHLCNT: string | null;
    goiThaus: GoiThau[];
}

interface TBMTForm {
    maTBMT: string;
    ngayDangTai: string;
    soQdPheDuyetHSMT: string;
    ngayPheDuyetHSMT: string;
    ngayDongThau: string;
}

export default function ThongBaoMoiThauPage() {
    const { data: session } = useSession();
    const [step, setStep] = useState(1); // 1: Plan list, 2: Package list, 3: TBMT form, 4: View details
    const [viewMode, setViewMode] = useState<"view" | "edit">("edit"); // view or edit mode
    const [keHoachs, setKeHoachs] = useState<KeHoach[]>([]);
    const [selectedKeHoach, setSelectedKeHoach] = useState<KeHoach | null>(null);
    const [selectedGoiThau, setSelectedGoiThau] = useState<GoiThau | null>(null);
    const [tbmtForm, setTbmtForm] = useState<TBMTForm>({
        maTBMT: "",
        ngayDangTai: "",
        soQdPheDuyetHSMT: "",
        ngayPheDuyetHSMT: "",
        ngayDongThau: "",
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadKeHoachs();
    }, []);

    const loadKeHoachs = async () => {
        try {
            const res = await fetch("/api/facility/thong-bao-moi-thau");
            if (res.ok) {
                const data = await res.json();
                setKeHoachs(data);
            }
        } catch (error) {
            console.error("Error loading plans:", error);
        }
    };

    const handleSelectKeHoach = (kh: KeHoach) => {
        setSelectedKeHoach(kh);
        setStep(2);
    };

    const handleViewDetails = (gt: GoiThau) => {
        setSelectedGoiThau(gt);
        setViewMode("view");
        if (gt.thongBaoMoiThaus && gt.thongBaoMoiThaus.length > 0) {
            const existing = gt.thongBaoMoiThaus[0];
            setTbmtForm({
                maTBMT: existing.maTBMT,
                ngayDangTai: new Date(existing.ngayDangTai).toISOString().split("T")[0],
                soQdPheDuyetHSMT: existing.soQdPheDuyetHSMT,
                ngayPheDuyetHSMT: new Date(existing.ngayPheDuyetHSMT).toISOString().split("T")[0],
                ngayDongThau: new Date(existing.ngayDongThau).toISOString().split("T")[0],
            });
        }
        setStep(4); // Go to view mode
    };

    const handleEditTBMT = (gt: GoiThau) => {
        setSelectedGoiThau(gt);
        setViewMode("edit");
        if (gt.thongBaoMoiThaus && gt.thongBaoMoiThaus.length > 0) {
            const existing = gt.thongBaoMoiThaus[0];
            setTbmtForm({
                maTBMT: existing.maTBMT,
                ngayDangTai: new Date(existing.ngayDangTai).toISOString().split("T")[0],
                soQdPheDuyetHSMT: existing.soQdPheDuyetHSMT,
                ngayPheDuyetHSMT: new Date(existing.ngayPheDuyetHSMT).toISOString().split("T")[0],
                ngayDongThau: new Date(existing.ngayDongThau).toISOString().split("T")[0],
            });
        }
        setStep(3);
    };

    const handleCreateTBMT = (gt: GoiThau) => {
        setSelectedGoiThau(gt);
        setViewMode("edit");
        setTbmtForm({
            maTBMT: "",
            ngayDangTai: "",
            soQdPheDuyetHSMT: "",
            ngayPheDuyetHSMT: "",
            ngayDongThau: "",
        });
        setStep(3);
    };

    const handleSaveTBMT = async () => {
        if (!selectedGoiThau) return;

        // Validation
        if (!tbmtForm.maTBMT || !tbmtForm.ngayDangTai || !tbmtForm.soQdPheDuyetHSMT ||
            !tbmtForm.ngayPheDuyetHSMT || !tbmtForm.ngayDongThau) {
            alert("Vui lòng điền đầy đủ thông tin!");
            return;
        }

        setLoading(true);
        try {
            const isUpdate = selectedGoiThau.thongBaoMoiThaus && selectedGoiThau.thongBaoMoiThaus.length > 0;
            const method = isUpdate ? "PATCH" : "POST";

            const res = await fetch(`/api/facility/thong-bao-moi-thau/${selectedGoiThau.id}`, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(tbmtForm),
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.message || "Failed to save TBMT");
            }

            alert(isUpdate ? "Cập nhật thành công!" : "Tạo mới thành công!");
            // Reset and go back to step 1
            setStep(1);
            setSelectedKeHoach(null);
            setSelectedGoiThau(null);
            loadKeHoachs();
        } catch (error: any) {
            console.error("Error saving TBMT:", error);
            alert(`Lỗi: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    // Render based on step
    if (step === 1) {
        return (
            <div className="space-y-6">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Thông báo mời thầu</h2>
                    <p className="text-gray-500 mt-1">Chọn kế hoạch LCNT (Quy trình 1: Luật Đấu thầu)</p>
                </div>

                <Card className="border-0 shadow-lg">
                    <CardContent className="p-0">
                        <div className="rounded-xl overflow-hidden">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-blue-600 hover:bg-blue-600">
                                        <TableHead className="text-white font-bold">STT</TableHead>
                                        <TableHead className="text-white font-bold">Mã KHLCNT</TableHead>
                                        <TableHead className="text-white font-bold">Tên KHLCNT</TableHead>
                                        <TableHead className="text-white font-bold">Thao tác</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {keHoachs.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={4} className="text-center py-12 text-gray-400">
                                                <div className="flex flex-col items-center gap-3">
                                                    <svg className="w-12 h-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                    </svg>
                                                    <p>Chưa có kế hoạch LCNT theo Luật Đấu thầu</p>
                                                    <p className="text-sm">Vui lòng tạo kế hoạch trước khi thêm thông báo mời thầu</p>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        keHoachs.map((kh, idx) => (
                                            <TableRow key={kh.id} className="hover:bg-blue-50/50">
                                                <TableCell className="font-medium">{idx + 1}</TableCell>
                                                <TableCell>{kh.maKHLCNT || "—"}</TableCell>
                                                <TableCell className="max-w-md truncate">{kh.tenKHLCNT || "—"}</TableCell>
                                                <TableCell>
                                                    <Button
                                                        size="sm"
                                                        onClick={() => handleSelectKeHoach(kh)}
                                                        className="bg-blue-600 hover:bg-blue-700 text-white"
                                                    >
                                                        <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                        </svg>
                                                        Chọn
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
            </div>
        );
    }

    if (step === 2 && selectedKeHoach) {
        return (
            <div className="space-y-6">
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        onClick={() => setStep(1)}
                        className="text-gray-600 hover:text-blue-700 hover:bg-blue-50 rounded-xl"
                    >
                        <svg className="w-5 h-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Quay lại
                    </Button>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800">Chọn gói thầu</h2>
                        <p className="text-gray-500 mt-1">{selectedKeHoach.tenKHLCNT || selectedKeHoach.maKHLCNT}</p>
                    </div>
                </div>

                <Card className="border-0 shadow-lg">
                    <CardContent className="p-0">
                        <div className="rounded-xl overflow-hidden">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-blue-600 hover:bg-blue-600">
                                        <TableHead className="text-white font-bold">STT</TableHead>
                                        <TableHead className="text-white font-bold">Tên gói thầu</TableHead>
                                        <TableHead className="text-white font-bold">Giá gói thầu</TableHead>
                                        <TableHead className="text-white font-bold">Số lượng phần lô</TableHead>
                                        <TableHead className="text-white font-bold">Trạng thái TBMT</TableHead>
                                        <TableHead className="text-white font-bold">Thao tác</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {selectedKeHoach.goiThaus.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center py-12 text-gray-400">
                                                <div className="flex flex-col items-center gap-3">
                                                    <svg className="w-12 h-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                                                    </svg>
                                                    <p>Chưa có gói thầu</p>
                                                    <p className="text-sm">Vui lòng thêm gói thầu vào kế hoạch này</p>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        selectedKeHoach.goiThaus.map((gt, idx) => {
                                            const hasTBMT = gt.thongBaoMoiThaus && gt.thongBaoMoiThaus.length > 0;
                                            return (
                                                <TableRow key={gt.id} className="hover:bg-blue-50/50">
                                                    <TableCell className="font-medium">{idx + 1}</TableCell>
                                                    <TableCell className="max-w-md truncate">{gt.tenGoiThau}</TableCell>
                                                    <TableCell>
                                                        {gt.giaGoiThau ? gt.giaGoiThau.toLocaleString("vi-VN") + " VNĐ" : "—"}
                                                    </TableCell>
                                                    <TableCell>{gt.soLuongPhanLo || "—"}</TableCell>
                                                    <TableCell>
                                                        {hasTBMT ? (
                                                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                                                                Đã có TBMT
                                                            </span>
                                                        ) : (
                                                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                                                                Chưa có TBMT
                                                            </span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex gap-2">
                                                            {hasTBMT && (
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    onClick={() => handleViewDetails(gt)}
                                                                    className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 border-blue-300"
                                                                >
                                                                    <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                                    </svg>
                                                                    Xem chi tiết
                                                                </Button>
                                                            )}
                                                            <Button
                                                                size="sm"
                                                                onClick={() => hasTBMT ? handleEditTBMT(gt) : handleCreateTBMT(gt)}
                                                                className={hasTBMT
                                                                    ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                                                                    : "bg-blue-600 hover:bg-blue-700 text-white"
                                                                }
                                                            >
                                                                <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    {hasTBMT ? (
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                                    ) : (
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                                                    )}
                                                                </svg>
                                                                {hasTBMT ? "Sửa" : "Tạo TBMT"}
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (step === 3 && selectedGoiThau) {
        const isUpdate = selectedGoiThau.thongBaoMoiThaus && selectedGoiThau.thongBaoMoiThaus.length > 0;

        return (
            <div className="space-y-6">
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        onClick={() => setStep(2)}
                        className="text-gray-600 hover:text-blue-700 hover:bg-blue-50 rounded-xl"
                    >
                        <svg className="w-5 h-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Quay lại
                    </Button>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800">
                            {isUpdate ? "Cập nhật" : "Tạo mới"} Thông báo mời thầu
                        </h2>
                        <p className="text-gray-500 mt-1">{selectedGoiThau.tenGoiThau}</p>
                    </div>
                </div>

                <Card className="border-0 shadow-lg">
                    <CardHeader>
                        <CardTitle className="text-lg text-blue-800">Thông tin TBMT</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="maTBMT">
                                    Mã TBMT <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="maTBMT"
                                    value={tbmtForm.maTBMT}
                                    onChange={(e) => setTbmtForm({ ...tbmtForm, maTBMT: e.target.value })}
                                    placeholder="Nhập mã TBMT"
                                    className="mt-1"
                                />
                            </div>

                            <div>
                                <Label htmlFor="ngayDangTai">
                                    Ngày đăng tải TBMT <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="ngayDangTai"
                                    type="date"
                                    value={tbmtForm.ngayDangTai}
                                    onChange={(e) => setTbmtForm({ ...tbmtForm, ngayDangTai: e.target.value })}
                                    className="mt-1"
                                />
                            </div>

                            <div>
                                <Label htmlFor="soQdPheDuyetHSMT">
                                    Số QĐ phê duyệt HSMT <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="soQdPheDuyetHSMT"
                                    value={tbmtForm.soQdPheDuyetHSMT}
                                    onChange={(e) => setTbmtForm({ ...tbmtForm, soQdPheDuyetHSMT: e.target.value })}
                                    placeholder="Nhập số quyết định phê duyệt HSMT"
                                    className="mt-1"
                                />
                            </div>

                            <div>
                                <Label htmlFor="ngayPheDuyetHSMT">
                                    Ngày phê duyệt HSMT <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="ngayPheDuyetHSMT"
                                    type="date"
                                    value={tbmtForm.ngayPheDuyetHSMT}
                                    onChange={(e) => setTbmtForm({ ...tbmtForm, ngayPheDuyetHSMT: e.target.value })}
                                    className="mt-1"
                                />
                            </div>

                            <div>
                                <Label htmlFor="ngayDongThau">
                                    Ngày đóng thầu <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="ngayDongThau"
                                    type="date"
                                    value={tbmtForm.ngayDongThau}
                                    onChange={(e) => setTbmtForm({ ...tbmtForm, ngayDongThau: e.target.value })}
                                    className="mt-1"
                                />
                            </div>
                        </div>

                        <div className="flex gap-4 pt-4 border-t">
                            <Button
                                onClick={handleSaveTBMT}
                                disabled={loading}
                                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6"
                            >
                                {loading ? (
                                    <>
                                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Đang lưu...
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                                        </svg>
                                        Lưu lại
                                    </>
                                )}
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => setStep(2)}
                                disabled={loading}
                            >
                                Hủy
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (step === 4 && selectedGoiThau && viewMode === "view") {
        return (
            <div className="space-y-6">
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        onClick={() => setStep(2)}
                        className="text-gray-600 hover:text-blue-700 hover:bg-blue-50 rounded-xl"
                    >
                        <svg className="w-5 h-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Quay lại
                    </Button>
                    <div className="flex-1">
                        <h2 className="text-2xl font-bold text-gray-800">Chi tiết Thông báo mời thầu</h2>
                        <p className="text-gray-500 mt-1">{selectedGoiThau.tenGoiThau}</p>
                    </div>
                    <Button
                        onClick={() => handleEditTBMT(selectedGoiThau)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                        <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Chỉnh sửa
                    </Button>
                </div>

                <Card className="border-0 shadow-lg">
                    <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
                        <CardTitle className="text-lg text-blue-800 flex items-center gap-2">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            Thông tin TBMT
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label className="text-sm font-semibold text-gray-600">Mã TBMT</Label>
                                <p className="text-base font-medium text-gray-900 bg-gray-50 px-4 py-3 rounded-lg border border-gray-200">
                                    {tbmtForm.maTBMT || "—"}
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-sm font-semibold text-gray-600">Ngày đăng tải TBMT</Label>
                                <p className="text-base font-medium text-gray-900 bg-gray-50 px-4 py-3 rounded-lg border border-gray-200">
                                    {tbmtForm.ngayDangTai ? new Date(tbmtForm.ngayDangTai).toLocaleDateString("vi-VN") : "—"}
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-sm font-semibold text-gray-600">Số QĐ phê duyệt HSMT</Label>
                                <p className="text-base font-medium text-gray-900 bg-gray-50 px-4 py-3 rounded-lg border border-gray-200">
                                    {tbmtForm.soQdPheDuyetHSMT || "—"}
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-sm font-semibold text-gray-600">Ngày phê duyệt HSMT</Label>
                                <p className="text-base font-medium text-gray-900 bg-gray-50 px-4 py-3 rounded-lg border border-gray-200">
                                    {tbmtForm.ngayPheDuyetHSMT ? new Date(tbmtForm.ngayPheDuyetHSMT).toLocaleDateString("vi-VN") : "—"}
                                </p>
                            </div>

                            <div className="space-y-2 md:col-span-2">
                                <Label className="text-sm font-semibold text-gray-600">Ngày đóng thầu</Label>
                                <p className="text-base font-medium text-gray-900 bg-gray-50 px-4 py-3 rounded-lg border border-gray-200">
                                    {tbmtForm.ngayDongThau ? new Date(tbmtForm.ngayDongThau).toLocaleDateString("vi-VN") : "—"}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return null;
}
