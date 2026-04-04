"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
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
import * as XLSX from "xlsx";

interface PhanLoResult {
    phanLoGoiThauId: string;
    stt: number;
    tenPhanLo: string;
    donViTinh: string;
    soLuong: number;
    donGia: number;
    thanhTien: number;
    thoiGianThucHien: string;
    donViTinhThoiGian: string;
    ketQua: string;
    donGiaTrungThau: number | null;
    nhaThauTrungThau: string;
}

interface KetQuaLCNTForm {
    soQdPheDuyetKQLCNT: string;
    ngayPheDuyetKQLCNT: string;
    soMatHangMoiThau: number | null;
    soMatHangTrungThau: number | null;
    tongGiaTriTrungThau: number | null;
}

export default function KetQuaLCNTDetailPage({ params }: { params: Promise<{ tbmtId: string }> }) {
    const router = useRouter();
    const { tbmtId } = use(params);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [excelModalOpen, setExcelModalOpen] = useState(false);
    const [existingData, setExistingData] = useState<any>(null);
    const [goiThauId, setGoiThauId] = useState<string>("");
    const [phanLoResults, setPhanLoResults] = useState<PhanLoResult[]>([]);

    const [form, setForm] = useState<KetQuaLCNTForm>({
        soQdPheDuyetKQLCNT: "",
        ngayPheDuyetKQLCNT: "",
        soMatHangMoiThau: null,
        soMatHangTrungThau: null,
        tongGiaTriTrungThau: null,
    });

    // Load existing data
    useEffect(() => {
        const loadData = async () => {
            try {
                setLoading(true);
                const res = await fetch(`/api/facility/ket-qua-lcnt/${tbmtId}`);
                if (res.ok) {
                    const data = await res.json();
                    console.log("API Response:", data);
                    if (data && data.ketQuaPhanLos) {
                        // Existing results found
                        setExistingData(data);
                        setGoiThauId(data.goiThauId);
                        console.log("Set goiThauId from existing data:", data.goiThauId);
                        setForm({
                            soQdPheDuyetKQLCNT: data.soQdPheDuyetKQLCNT,
                            ngayPheDuyetKQLCNT: new Date(data.ngayPheDuyetKQLCNT).toISOString().split("T")[0],
                            soMatHangMoiThau: data.soMatHangMoiThau,
                            soMatHangTrungThau: data.soMatHangTrungThau,
                            tongGiaTriTrungThau: Number(data.tongGiaTriTrungThau),
                        });

                        // Map existing lot results
                        const lotResults: PhanLoResult[] = data.ketQuaPhanLos.map((kqpl: any) => ({
                            phanLoGoiThauId: kqpl.phanLoGoiThauId,
                            stt: kqpl.phanLoGoiThau.stt,
                            tenPhanLo: kqpl.phanLoGoiThau.tenPhanLo,
                            donViTinh: kqpl.phanLoGoiThau.donViTinh || "",
                            soLuong: Number(kqpl.phanLoGoiThau.soLuong || 0),
                            donGia: Number(kqpl.phanLoGoiThau.donGia || 0),
                            thanhTien: Number(kqpl.phanLoGoiThau.thanhTien || 0),
                            thoiGianThucHien: kqpl.phanLoGoiThau.thoiGianThucHien || "",
                            donViTinhThoiGian: kqpl.phanLoGoiThau.donViTinhThoiGian || "",
                            ketQua: kqpl.ketQua,
                            donGiaTrungThau: kqpl.donGiaTrungThau ? Number(kqpl.donGiaTrungThau) : null,
                            nhaThauTrungThau: kqpl.nhaThauTrungThau || "",
                        }));
                        setPhanLoResults(lotResults);
                    } else if (data && data.goiThauId) {
                        // No existing results - new report, but we have TBMT info
                        setGoiThauId(data.goiThauId);
                        console.log("Set goiThauId from TBMT data:", data.goiThauId);
                        setExistingData(null);
                    }
                }
            } catch (error) {
                console.error("Error loading data:", error);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [tbmtId]);

    const handleDownloadTemplate = async () => {
        try {
            const res = await fetch(`/api/facility/ket-qua-lcnt/${tbmtId}/template`);
            if (res.ok) {
                const blob = await res.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `Ket_Qua_LCNT_${tbmtId}.xlsx`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
            } else {
                alert("Lỗi khi tải file mẫu");
            }
        } catch (error) {
            console.error("Error downloading template:", error);
            alert("Lỗi khi tải file mẫu");
        }
    };

    const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const data = evt.target?.result;
                if (!data) return;
                const workbook = XLSX.read(data, { type: "array" });
                const sheetName = workbook.SheetNames[0];
                const sheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json(sheet);

                const parsed: PhanLoResult[] = jsonData.map((row: any) => ({
                    phanLoGoiThauId: row["_phanLoId"] || "",
                    stt: row["STT"] || 0,
                    tenPhanLo: row["Tên phần lô"] || "",
                    donViTinh: row["Đơn vị tính"] || "",
                    soLuong: row["Số lượng"] ? Number(row["Số lượng"]) : 0,
                    donGia: row["Đơn giá"] ? Number(row["Đơn giá"]) : 0,
                    thanhTien: row["Thành tiền"] ? Number(row["Thành tiền"]) : 0,
                    thoiGianThucHien: row["Thời gian thực hiện gói thầu"]?.toString() || "",
                    donViTinhThoiGian: row["Đơn vị tính TGTHHGT"] || "",
                    ketQua: row["Kết quả"] || "",
                    donGiaTrungThau: row["Đơn giá trúng thầu"] ? Number(row["Đơn giá trúng thầu"]) : null,
                    nhaThauTrungThau: row["Nhà thầu trúng thầu"] || "",
                }));

                setPhanLoResults(parsed);
                setExcelModalOpen(false);
            } catch (err) {
                console.error("Error reading Excel:", err);
                alert("Lỗi đọc file Excel. Vui lòng kiểm tra định dạng file.");
            }
        };
        reader.readAsArrayBuffer(file);

        // Reset file input
        e.target.value = "";
    };

    const handleSave = async () => {
        // Validation
        if (!form.soQdPheDuyetKQLCNT || !form.ngayPheDuyetKQLCNT) {
            alert("Vui lòng nhập đầy đủ thông tin bắt buộc!");
            return;
        }

        if (phanLoResults.length === 0) {
            alert("Vui lòng nhập dữ liệu phần lô từ file Excel!");
            return;
        }

        if (!goiThauId) {
            console.error("goiThauId is empty!");
            alert("Lỗi: Không tìm thấy thông tin gói thầu. Vui lòng tải lại trang.");
            return;
        }

        setSaving(true);
        try {
            console.log("Saving with goiThauId:", goiThauId);
            const payload = {
                goiThauId: goiThauId,
                thongBaoMoiThauId: tbmtId,
                ...form,
                ketQuaPhanLos: phanLoResults,
            };

            let res;
            if (existingData) {
                // Update existing
                res = await fetch(`/api/facility/ket-qua-lcnt/${tbmtId}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                });
            } else {
                // Create new
                res = await fetch("/api/facility/ket-qua-lcnt", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                });
            }

            if (res.ok) {
                alert("Đã lưu kết quả LCNT thành công!");
                router.push("/dashboard/facility/mua-sam/ket-qua-lcnt");
            } else {
                const errorData = await res.json().catch(() => ({}));
                alert(`Lỗi: ${errorData.message || "Không thể lưu dữ liệu"}`);
            }
        } catch (error) {
            console.error("Error saving:", error);
            alert("Lỗi khi lưu dữ liệu");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-gray-500">Đang tải dữ liệu...</div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button
                    variant="ghost"
                    onClick={() => router.push("/dashboard/facility/mua-sam/ket-qua-lcnt")}
                    className="text-gray-600 hover:text-blue-700 hover:bg-blue-50 rounded-xl"
                >
                    <svg className="w-5 h-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Quay lại
                </Button>
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">
                        {existingData ? "Chỉnh sửa Kết quả LCNT" : "Báo cáo Kết quả LCNT"}
                    </h2>
                    <p className="text-gray-500 mt-0.5 text-sm">
                        Nhập thông tin kết quả lựa chọn nhà thầu
                    </p>
                </div>
            </div>

            {/* General Information Form */}
            <Card className="border-0 shadow-lg">
                <CardHeader>
                    <CardTitle className="text-lg text-blue-800">
                        Thông tin chung về kết quả LCNT
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="soQd">
                                Số QĐ phê duyệt kết quả LCNT <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                id="soQd"
                                value={form.soQdPheDuyetKQLCNT}
                                onChange={(e) => setForm({ ...form, soQdPheDuyetKQLCNT: e.target.value })}
                                placeholder="Ví dụ: 123/QĐ-SYT"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="ngayPheDuyet">
                                Ngày phê duyệt KQLCNT <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                id="ngayPheDuyet"
                                type="date"
                                value={form.ngayPheDuyetKQLCNT}
                                onChange={(e) => setForm({ ...form, ngayPheDuyetKQLCNT: e.target.value })}
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="soMatHangMoiThau">Số mặt hàng mời thầu</Label>
                            <Input
                                id="soMatHangMoiThau"
                                type="number"
                                value={form.soMatHangMoiThau || ""}
                                onChange={(e) => setForm({ ...form, soMatHangMoiThau: e.target.value ? parseInt(e.target.value) : null })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="soMatHangTrungThau">Số mặt hàng trúng thầu</Label>
                            <Input
                                id="soMatHangTrungThau"
                                type="number"
                                value={form.soMatHangTrungThau || ""}
                                onChange={(e) => setForm({ ...form, soMatHangTrungThau: e.target.value ? parseInt(e.target.value) : null })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="tongGiaTriTrungThau">Tổng giá trị trúng thầu (VNĐ)</Label>
                            <Input
                                id="tongGiaTriTrungThau"
                                type="number"
                                value={form.tongGiaTriTrungThau || ""}
                                onChange={(e) => setForm({ ...form, tongGiaTriTrungThau: e.target.value ? parseFloat(e.target.value) : null })}
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Lot Results Section */}
            <Card className="border-0 shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-lg text-blue-800">
                        Kết quả từng phần lô
                    </CardTitle>
                    <Button
                        onClick={() => setExcelModalOpen(true)}
                        className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white"
                    >
                        <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        Nhận dữ liệu phần lô từ file Excel
                    </Button>
                </CardHeader>
                <CardContent>
                    {phanLoResults.length === 0 ? (
                        <div className="text-center py-12 text-gray-400">
                            <svg className="w-12 h-12 mx-auto text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <p className="mt-3">Chưa có dữ liệu phần lô</p>
                            <p className="text-sm mt-1">Nhấn nút "Nhận dữ liệu phần lô từ file Excel" để nhập dữ liệu</p>
                        </div>
                    ) : (
                        <div className="rounded-xl overflow-hidden border">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-gray-100">
                                        <TableHead>STT</TableHead>
                                        <TableHead>Tên phần lô</TableHead>
                                        <TableHead>Đơn vị tính</TableHead>
                                        <TableHead>Số lượng</TableHead>
                                        <TableHead>Đơn giá</TableHead>
                                        <TableHead>Kết quả</TableHead>
                                        <TableHead>Đơn giá trúng thầu</TableHead>
                                        <TableHead>Nhà thầu trúng thầu</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {phanLoResults.map((item, idx) => (
                                        <TableRow key={idx}>
                                            <TableCell>{item.stt}</TableCell>
                                            <TableCell className="max-w-xs truncate">{item.tenPhanLo}</TableCell>
                                            <TableCell>{item.donViTinh}</TableCell>
                                            <TableCell>{item.soLuong}</TableCell>
                                            <TableCell>{item.donGia.toLocaleString("vi-VN")}</TableCell>
                                            <TableCell>
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${item.ketQua === "Trúng thầu"
                                                    ? "bg-green-100 text-green-700"
                                                    : "bg-gray-100 text-gray-700"
                                                    }`}>
                                                    {item.ketQua || "—"}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                {item.donGiaTrungThau ? item.donGiaTrungThau.toLocaleString("vi-VN") : "—"}
                                            </TableCell>
                                            <TableCell className="max-w-xs truncate">{item.nhaThauTrungThau || "—"}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Save Button */}
            <div className="flex justify-end gap-3">
                <Button
                    variant="outline"
                    onClick={() => router.push("/dashboard/facility/mua-sam/ket-qua-lcnt")}
                >
                    Hủy
                </Button>
                <Button
                    onClick={handleSave}
                    disabled={saving}
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                >
                    {saving ? "Đang lưu..." : "Lưu lại"}
                </Button>
            </div>

            {/* Excel Import Modal */}
            <Dialog open={excelModalOpen} onOpenChange={setExcelModalOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Nhận dữ liệu phần lô từ Excel</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Bước 1: Tải file mẫu</Label>
                            <Button
                                onClick={handleDownloadTemplate}
                                variant="outline"
                                className="w-full"
                            >
                                <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                Tải file mẫu
                            </Button>
                        </div>
                        <div className="space-y-2">
                            <Label>Bước 2: Chọn file đã điền</Label>
                            <Input
                                type="file"
                                accept=".xlsx,.xls"
                                onChange={handleExcelUpload}
                            />
                        </div>
                        <div className="text-sm text-gray-500">
                            <p className="font-medium">Hướng dẫn:</p>
                            <ol className="list-decimal list-inside space-y-1 mt-2">
                                <li>Tải file mẫu Excel</li>
                                <li>Điền thông tin kết quả vào các cột bổ sung</li>
                                <li>Lưu file và chọn file để tải lên</li>
                            </ol>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
