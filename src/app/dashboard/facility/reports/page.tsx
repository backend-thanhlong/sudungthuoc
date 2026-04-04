"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { readExcel } from "@/lib/excel";
import { Badge } from "@/components/ui/badge";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
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
    DialogDescription,
} from "@/components/ui/dialog";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Eye, Loader2, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { validateReportRow, parseRawRow, ValidationWarning } from "@/lib/report-validation";

interface PreviewRow {
    stt: number;
    maNoiBo?: string;
    maThuoc?: string;
    drugName: string;
    tonDau: number;
    nhap: number;
    xuat: number;
    tonCuoi: number;
    giaVat: number;
    thanhTienTonCuoi: number;
    bhyt?: string | null;
    dichVu?: string | null;
    warnings: ValidationWarning[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rawRow: any;
}

export default function FacilityReportsPage() {
    const [selectedMonth, setSelectedMonth] = useState("");
    const [isDownloading, setIsDownloading] = useState(false);
    const [periods, setPeriods] = useState<{ value: string; label: string; deadline?: string | null }[]>([]);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [reports, setReports] = useState<any[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Preview state
    const [previewRows, setPreviewRows] = useState<PreviewRow[]>([]);
    const [isPreviewing, setIsPreviewing] = useState(false);
    const [isParsingFile, setIsParsingFile] = useState(false);

    // Detail modal state
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [detailData, setDetailData] = useState<any[]>([]);
    const [detailMonth, setDetailMonth] = useState<string>("");
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [isDetailLoading, setIsDetailLoading] = useState(false);

    const fetchReports = async () => {
        try {
            const res = await fetch("/api/facility/reports");
            if (res.ok) {
                const data = await res.json();
                setReports(data);
            }
        } catch {
            console.error("Failed to fetch reports");
        }
    };

    useEffect(() => {
        const fetchPeriods = async () => {
            try {
                const res = await fetch("/api/facility/report-periods");
                if (res.ok) {
                    const data = await res.json();
                    setPeriods(data);
                }
            } catch {
                toast.error("Không thể tải danh sách kỳ báo cáo");
            }
        };
        fetchPeriods();
        fetchReports();
    }, []);

    const handleDownloadTemplate = async () => {
        if (!selectedMonth) {
            toast.error("Vui lòng chọn tháng báo cáo");
            return;
        }
        setIsDownloading(true);
        try {
            const res = await fetch(`/api/facility/reports/template?month=${selectedMonth}`);
            if (res.ok) {
                const blob = await res.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `bao_cao_${selectedMonth.replace("/", "_")}.xlsx`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                a.remove();
                toast.success("Đã tải mẫu báo cáo");
            } else {
                toast.error("Không thể tải mẫu báo cáo");
            }
        } catch {
            toast.error("Đã xảy ra lỗi");
        } finally {
            setIsDownloading(false);
        }
    };

    const currentMonthReport = reports.find(r => r.month === selectedMonth);
    const isApproved = currentMonthReport?.status === "APPROVED";
    const isRejected = currentMonthReport?.status === "REJECTED";
    const isPending = currentMonthReport?.status === "PENDING";

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            setSelectedFile(file);
            setIsPreviewing(false);
            setPreviewRows([]);

            if (!selectedMonth) {
                toast.warning("Vui lòng chọn tháng báo cáo trước khi chọn file");
                return;
            }

            // Auto-parse and preview
            setIsParsingFile(true);
            try {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const rawData = await readExcel(file) as any[];
                if (!rawData || rawData.length === 0) {
                    toast.error("File không có dữ liệu");
                    return;
                }
                const rows: PreviewRow[] = rawData.map((row, idx) => {
                    const parsed = parseRawRow(row);
                    if (!parsed) return null;
                    const warnings = validateReportRow(parsed);
                    return {
                        stt: idx + 1,
                        maNoiBo: parsed.maNoiBo,
                        maThuoc: parsed.maThuoc,
                        drugName: parsed.drugName,
                        tonDau: parsed.tonDau,
                        nhap: parsed.nhap,
                        xuat: parsed.xuat,
                        tonCuoi: parsed.tonCuoi,
                        giaVat: parsed.giaVat,
                        thanhTienTonCuoi: parsed.thanhTienTonCuoi,
                        bhyt: parsed.bhyt,
                        dichVu: parsed.dichVu,
                        warnings,
                        rawRow: row,
                    };
                }).filter(Boolean) as PreviewRow[];
                setPreviewRows(rows);
                setIsPreviewing(true);
            } catch (err) {
                console.error(err);
                toast.error("Không thể đọc file Excel");
            } finally {
                setIsParsingFile(false);
            }
        }
    };

    const totalErrors = previewRows.reduce((acc, r) => acc + r.warnings.length, 0);
    const validRows = previewRows.filter(r => r.warnings.length === 0).length;

    const handleUploadReport = async () => {
        if (!selectedFile || !selectedMonth) {
            toast.error("Vui lòng chọn tháng và file báo cáo");
            return;
        }
        if (totalErrors > 0) {
            toast.error(`Còn ${totalErrors} lỗi trong file. Vui lòng sửa trước khi nộp.`);
            return;
        }

        setIsUploading(true);
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const rawData = await readExcel(selectedFile) as any[];
            if (!rawData || rawData.length === 0) {
                toast.error("File không có dữ liệu");
                return;
            }

            const res = await fetch("/api/facility/reports", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ month: selectedMonth, data: rawData }),
            });

            if (res.ok) {
                toast.success("Nộp báo cáo thành công");
                setSelectedFile(null);
                setPreviewRows([]);
                setIsPreviewing(false);
                if (fileInputRef.current) fileInputRef.current.value = "";
                fetchReports();
            } else {
                const errorData = await res.json();
                if (errorData.warnings && errorData.warnings.length > 0) {
                    toast.error(`Báo cáo không được lưu: ${errorData.warnings.length} lỗi tính toán`, { duration: 8000 });
                    errorData.warnings.slice(0, 5).forEach((w: { message: string }) => {
                        toast.error(w.message, { duration: 12000 });
                    });
                } else {
                    toast.error(errorData.error || errorData.message || "Lỗi khi nộp báo cáo");
                }
            }
        } catch (error) {
            console.error(error);
            toast.error("Đã xảy ra lỗi khi xử lý file");
        } finally {
            setIsUploading(false);
        }
    };

    const handleViewDetail = async (month: string) => {
        setDetailMonth(month);
        setIsDetailOpen(true);
        setIsDetailLoading(true);
        try {
            const res = await fetch(`/api/facility/reports/detail?month=${encodeURIComponent(month)}`);
            if (res.ok) {
                const data = await res.json();
                setDetailData(data);
            } else {
                toast.error("Không thể tải chi tiết báo cáo");
            }
        } catch {
            toast.error("Lỗi kết nối");
        } finally {
            setIsDetailLoading(false);
        }
    };

    const selectedPeriod = periods.find(p => p.value === selectedMonth);
    const deadline = selectedPeriod?.deadline;

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold text-gray-800">Báo cáo hàng tháng</h2>
                <p className="text-gray-500 mt-1">Tải mẫu và nộp báo cáo tồn kho/sử dụng thuốc</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Download Template */}
                <Card className="border-0 shadow-lg">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <svg className="w-6 h-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            Tải mẫu báo cáo
                        </CardTitle>
                        <CardDescription>
                            Hệ thống sẽ xuất file Excel chứa danh sách thuốc đã được duyệt
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <label className="text-sm font-medium text-gray-700 mb-2 block">
                                Chọn tháng báo cáo
                            </label>
                            <Select value={selectedMonth} onValueChange={(v) => {
                                setSelectedMonth(v);
                                setPreviewRows([]);
                                setIsPreviewing(false);
                                setSelectedFile(null);
                                if (fileInputRef.current) fileInputRef.current.value = "";
                            }}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Chọn tháng..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {periods.map((month) => (
                                        <SelectItem key={month.value} value={month.value}>
                                            {month.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            {/* Deadline indicator */}
                            {deadline && (
                                <div className={`mt-2 flex items-center gap-1.5 text-sm ${new Date(deadline) < new Date() ? "text-red-600" : "text-orange-600"}`}>
                                    <AlertCircle className="w-4 h-4" />
                                    Hạn nộp: {new Date(deadline).toLocaleDateString("vi-VN")}
                                    {new Date(deadline) < new Date() && " (Đã quá hạn)"}
                                </div>
                            )}
                        </div>

                        <Button
                            className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600"
                            onClick={handleDownloadTemplate}
                            disabled={!selectedMonth || isDownloading}
                        >
                            {isDownloading ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Đang tải...
                                </>
                            ) : (
                                <>
                                    <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                    </svg>
                                    Tải mẫu báo cáo
                                </>
                            )}
                        </Button>

                        <div className="p-4 bg-blue-50 rounded-lg">
                            <p className="text-sm text-blue-700">
                                <strong>Lưu ý:</strong> Mẫu báo cáo chỉ bao gồm các thuốc có trạng thái{" "}
                                <span className="font-semibold">Đã duyệt</span> hoặc{" "}
                                <span className="font-semibold">Tự động khớp</span>.
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* Upload Report */}
                <Card className="border-0 shadow-lg">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <svg className="w-6 h-6 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                            </svg>
                            Nộp báo cáo
                        </CardTitle>
                        <CardDescription>
                            Upload file Excel đã điền số liệu tồn kho thực tế
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {isApproved ? (
                            <div className="p-8 text-center bg-emerald-50 rounded-lg border border-emerald-100">
                                <CheckCircle className="w-12 h-12 mx-auto text-emerald-500 mb-4" />
                                <h3 className="text-lg font-medium text-emerald-800 mb-2">Đã được duyệt</h3>
                                <p className="text-emerald-600">Báo cáo tháng {selectedMonth} đã được duyệt. Không thể nộp lại.</p>
                            </div>
                        ) : (
                            <>
                                {isRejected && (
                                    <div className="p-4 bg-red-50 rounded-lg border border-red-100">
                                        <h4 className="font-semibold text-red-800 flex items-center gap-2">
                                            <XCircle className="w-5 h-5" />
                                            Báo cáo bị từ chối
                                        </h4>
                                        <p className="text-red-600 mt-1">Lý do: {currentMonthReport.adminNote}</p>
                                        <p className="text-sm text-red-500 mt-2">Vui lòng chỉnh sửa và nộp lại file mới.</p>
                                    </div>
                                )}

                                {isPending && (
                                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                                        <p className="text-blue-700 text-sm flex items-center gap-2">
                                            <AlertCircle className="w-5 h-5" />
                                            Báo cáo đang chờ duyệt. Bạn có thể nộp lại để cập nhật số liệu.
                                        </p>
                                    </div>
                                )}

                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    className="hidden"
                                    accept=".xlsx, .xls"
                                    onChange={handleFileSelect}
                                />

                                <div
                                    className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer ${selectedFile
                                        ? totalErrors > 0 ? "border-red-400 bg-red-50" : "border-emerald-500 bg-emerald-50"
                                        : "border-gray-200 hover:border-emerald-400"}`}
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    {isParsingFile ? (
                                        <div className="flex flex-col items-center">
                                            <Loader2 className="w-10 h-10 animate-spin text-gray-400 mb-2" />
                                            <p className="text-gray-500">Đang phân tích file...</p>
                                        </div>
                                    ) : selectedFile ? (
                                        <div>
                                            <p className={`font-medium mb-1 ${totalErrors > 0 ? "text-red-700" : "text-emerald-700"}`}>{selectedFile.name}</p>
                                            <p className="text-xs text-gray-500">click để thay đổi file</p>
                                        </div>
                                    ) : (
                                        <>
                                            <svg className="w-10 h-10 mx-auto text-gray-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                            </svg>
                                            <p className="text-gray-600 mb-1">Kéo thả hoặc click để chọn file Excel</p>
                                            <p className="text-sm text-gray-400">Hỗ trợ .xlsx, .xls</p>
                                        </>
                                    )}
                                </div>

                                {/* Preview summary */}
                                {isPreviewing && previewRows.length > 0 && (
                                    <div className={`p-3 rounded-lg text-sm ${totalErrors > 0 ? "bg-red-50 border border-red-200" : "bg-emerald-50 border border-emerald-200"}`}>
                                        <div className="flex items-center gap-2 font-medium mb-1">
                                            {totalErrors > 0 ? (
                                                <><XCircle className="w-4 h-4 text-red-600" /><span className="text-red-700">{totalErrors} lỗi cần sửa trước khi nộp</span></>
                                            ) : (
                                                <><CheckCircle className="w-4 h-4 text-emerald-600" /><span className="text-emerald-700">Tất cả {validRows} dòng hợp lệ – sẵn sàng nộp</span></>
                                            )}
                                        </div>
                                        {totalErrors > 0 && (
                                            <p className="text-red-600 text-xs">Xem chi tiết lỗi trong bảng preview bên dưới</p>
                                        )}
                                    </div>
                                )}

                                <Button
                                    variant="default"
                                    className="w-full bg-emerald-600 hover:bg-emerald-700"
                                    disabled={!selectedFile || !selectedMonth || isUploading || totalErrors > 0 || !isPreviewing}
                                    onClick={handleUploadReport}
                                >
                                    {isUploading ? "Đang xử lý..." : (isRejected ? "Nộp lại báo cáo" : "Xác nhận nộp báo cáo")}
                                </Button>
                            </>
                        )}

                        <div className="p-4 bg-emerald-50 rounded-lg">
                            <p className="text-sm text-emerald-700">
                                <strong>Hướng dẫn:</strong> Điền đầy đủ Tồn đầu, Nhập, Xuất, Tồn cuối, Giá VAT, Thành tiền vào file mẫu rồi upload. Hệ thống sẽ kiểm tra tự động.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Preview Table */}
            {isPreviewing && previewRows.length > 0 && (
                <Card className="border-0 shadow-lg">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            Preview dữ liệu
                            {totalErrors > 0 ? (
                                <Badge className="bg-red-100 text-red-700 border-0">{totalErrors} lỗi</Badge>
                            ) : (
                                <Badge className="bg-emerald-100 text-emerald-700 border-0">Hợp lệ</Badge>
                            )}
                        </CardTitle>
                        <CardDescription>
                            Kiểm tra dữ liệu trước khi nộp. Các dòng có lỗi được tô màu đỏ.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="overflow-x-auto p-0">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs uppercase bg-gray-50 text-gray-600 sticky top-0">
                                <tr>
                                    <th className="px-3 py-3">STT</th>
                                    <th className="px-3 py-3">Mã NB</th>
                                    <th className="px-3 py-3 min-w-[200px]">Tên thuốc</th>
                                    <th className="px-3 py-3 text-right">Tồn đầu</th>
                                    <th className="px-3 py-3 text-right">Nhập</th>
                                    <th className="px-3 py-3 text-right">Xuất</th>
                                    <th className="px-3 py-3 text-right">Tồn cuối</th>
                                    <th className="px-3 py-3 text-right">Giá VAT</th>
                                    <th className="px-3 py-3 text-right">Thành tiền</th>
                                    <th className="px-3 py-3 text-center">BHYT/DV</th>
                                    <th className="px-3 py-3">Trạng thái</th>
                                </tr>
                            </thead>
                            <tbody>
                                {previewRows.map((row) => (
                                    <tr key={row.stt} className={`border-b ${row.warnings.length > 0 ? "bg-red-50" : "bg-white hover:bg-gray-50"}`}>
                                        <td className="px-3 py-2 text-gray-500">{row.stt}</td>
                                        <td className="px-3 py-2 text-xs text-gray-500">{row.maNoiBo}</td>
                                        <td className="px-3 py-2 font-medium text-gray-800">{row.drugName}</td>
                                        <td className="px-3 py-2 text-right">{row.tonDau.toLocaleString("vi-VN")}</td>
                                        <td className="px-3 py-2 text-right text-blue-600">{row.nhap.toLocaleString("vi-VN")}</td>
                                        <td className="px-3 py-2 text-right text-orange-600">{row.xuat.toLocaleString("vi-VN")}</td>
                                        <td className={`px-3 py-2 text-right font-semibold ${row.warnings.some(w => w.message.includes("Tồn cuối")) ? "text-red-600" : "text-gray-800"}`}>
                                            {row.tonCuoi.toLocaleString("vi-VN")}
                                        </td>
                                        <td className="px-3 py-2 text-right">{row.giaVat.toLocaleString("vi-VN")}</td>
                                        <td className={`px-3 py-2 text-right ${row.warnings.some(w => w.message.includes("Thành tiền")) ? "text-red-600 font-semibold" : ""}`}>
                                            {row.thanhTienTonCuoi.toLocaleString("vi-VN")}
                                        </td>
                                        <td className="px-3 py-2 text-center text-xs">
                                            {row.bhyt?.trim().toLowerCase() === "x" && <span className="text-emerald-600 font-bold">BH</span>}
                                            {row.bhyt?.trim().toLowerCase() === "x" && row.dichVu?.trim().toLowerCase() === "x" && " / "}
                                            {row.dichVu?.trim().toLowerCase() === "x" && <span className="text-blue-600 font-bold">DV</span>}
                                            {!row.bhyt?.trim() && !row.dichVu?.trim() && <span className="text-red-500">—</span>}
                                        </td>
                                        <td className="px-3 py-2">
                                            {row.warnings.length === 0 ? (
                                                <CheckCircle className="w-4 h-4 text-emerald-500" />
                                            ) : (
                                                <div className="space-y-1">
                                                    {row.warnings.map((w, i) => (
                                                        <p key={i} className="text-xs text-red-600">{w.message}</p>
                                                    ))}
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </CardContent>
                </Card>
            )}

            {/* Report History */}
            <Card className="border-0 shadow-lg">
                <CardHeader>
                    <CardTitle>Lịch sử báo cáo</CardTitle>
                    <CardDescription>Các báo cáo đã nộp</CardDescription>
                </CardHeader>
                <CardContent>
                    {reports.length === 0 ? (
                        <div className="text-center text-gray-500 py-8">
                            <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <p>Chưa có báo cáo nào được nộp</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Tháng báo cáo</TableHead>
                                    <TableHead>Số thuốc</TableHead>
                                    <TableHead>Tổng nhập</TableHead>
                                    <TableHead>Tổng xuất</TableHead>
                                    <TableHead>Cập nhật lần cuối</TableHead>
                                    <TableHead>Trạng thái</TableHead>
                                    <TableHead className="text-right">Thao tác</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {reports.map((report) => (
                                    <TableRow key={report.month}>
                                        <TableCell className="font-medium text-gray-900">{report.month}</TableCell>
                                        <TableCell>{report.drugCount}</TableCell>
                                        <TableCell className="text-blue-600">{new Intl.NumberFormat("vi-VN").format(report.totalImport || 0)}</TableCell>
                                        <TableCell className="text-orange-600">{new Intl.NumberFormat("vi-VN").format(report.totalExport || 0)}</TableCell>
                                        <TableCell className="text-gray-400 text-sm">{new Date(report.lastUpdated).toLocaleString("vi-VN")}</TableCell>
                                        <TableCell>
                                            {report.status === "APPROVED" && (
                                                <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-0">Đã duyệt</Badge>
                                            )}
                                            {report.status === "REJECTED" && (
                                                <div className="flex flex-col gap-1">
                                                    <Badge className="bg-red-100 text-red-700 hover:bg-red-200 border-0 w-fit">Bị từ chối</Badge>
                                                    {report.adminNote && (
                                                        <span className="text-xs text-red-500 max-w-[200px] truncate" title={report.adminNote}>Lý do: {report.adminNote}</span>
                                                    )}
                                                </div>
                                            )}
                                            {(!report.status || report.status === "PENDING") && (
                                                <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-200 border-0">Chờ xử lý</Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="text-gray-600 hover:text-gray-800"
                                                onClick={() => handleViewDetail(report.month)}
                                            >
                                                <Eye className="w-4 h-4 mr-1" />
                                                Xem chi tiết
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* Detail Modal */}
            <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
                <DialogContent className="max-w-[95vw] w-[95vw] h-[90vh] flex flex-col p-0">
                    <DialogHeader className="p-6 pb-2">
                        <DialogTitle>Chi tiết báo cáo tháng {detailMonth}</DialogTitle>
                        <DialogDescription>
                            {detailData.length} mặt hàng đã báo cáo
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex-1 overflow-auto px-6 pb-6">
                        {isDetailLoading ? (
                            <div className="flex items-center justify-center h-full">
                                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                            </div>
                        ) : (
                            <Table>
                                <TableHeader className="sticky top-0 bg-white z-10">
                                    <TableRow>
                                        <TableHead>STT</TableHead>
                                        <TableHead>Mã NB</TableHead>
                                        <TableHead className="min-w-[200px]">Tên thuốc</TableHead>
                                        <TableHead>Hoạt chất</TableHead>
                                        <TableHead>ĐVT</TableHead>
                                        <TableHead className="text-right">Tồn đầu</TableHead>
                                        <TableHead className="text-right">Nhập</TableHead>
                                        <TableHead className="text-right">Xuất</TableHead>
                                        <TableHead className="text-right">Tồn cuối</TableHead>
                                        <TableHead className="text-right">Giá VAT</TableHead>
                                        <TableHead className="text-right">Thành tiền</TableHead>
                                        <TableHead>BHYT/DV</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {detailData.map((item) => (
                                        <TableRow key={item.id}>
                                            <TableCell>{item.stt}</TableCell>
                                            <TableCell className="text-xs text-gray-500">{item.maNoiBo}</TableCell>
                                            <TableCell className="font-medium">{item.drugName}</TableCell>
                                            <TableCell className="text-xs text-gray-500">{item.hoatChat}</TableCell>
                                            <TableCell>{item.donViTinh}</TableCell>
                                            <TableCell className="text-right">{Number(item.tonDau).toLocaleString("vi-VN")}</TableCell>
                                            <TableCell className="text-right text-blue-600">{Number(item.nhap).toLocaleString("vi-VN")}</TableCell>
                                            <TableCell className="text-right text-orange-600">{Number(item.xuat).toLocaleString("vi-VN")}</TableCell>
                                            <TableCell className="text-right font-bold">{Number(item.tonCuoi).toLocaleString("vi-VN")}</TableCell>
                                            <TableCell className="text-right">{Number(item.giaVat).toLocaleString("vi-VN")}</TableCell>
                                            <TableCell className="text-right">{Number(item.thanhTienTonCuoi).toLocaleString("vi-VN")}</TableCell>
                                            <TableCell>
                                                {item.bhyt?.trim().toLowerCase() === "x" && <span className="text-xs font-semibold text-emerald-600">BH</span>}
                                                {item.dichVu?.trim().toLowerCase() === "x" && <span className="text-xs font-semibold text-blue-600 ml-1">DV</span>}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
