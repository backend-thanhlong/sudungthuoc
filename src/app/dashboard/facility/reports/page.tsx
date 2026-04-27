"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import AIReviewButton from "@/components/ai/AIReviewButton";
import { readExcel } from "@/lib/excel";
import { triggerBlobDownload } from "@/lib/browser-download";
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
import { Input } from "@/components/ui/input";
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
import {
    findDuplicateRowTokens,
    parseRawRow,
    REPORT_FIELD_BO_QUA,
    REPORT_VALIDATION_CODES,
    REPORT_ROW_TOKEN_COLUMN,
    isSkipMarked,
    validateReportRow,
    ValidationWarning,
} from "@/lib/report-validation";

interface PreviewRow {
    stt: number;
    excelRowNumber: number;
    maNoiBo?: string;
    maThuoc?: string;
    rowToken?: string | null;
    drugName: string;
    tonDau: number;
    nhap: number;
    xuat: number;
    tonCuoi: number;
    giaVat: number;
    thanhTienTonCuoi: number;
    bhyt?: string | null;
    dichVu?: string | null;
    boQua?: string | null;
    isSkipped: boolean;
    warnings: ValidationWarning[];
    rawRow: any;
}

interface ServerValidationError {
    rowNumber: number;
    field: string;
    code: string;
    message: string;
}

const DETAIL_PAGE_SIZE = 50;
const DETAIL_SEARCH_FIELDS = [
    { value: "all", label: "Tất cả trường" },
    { value: "maNoiBo", label: "Mã nội bộ" },
    { value: "tenThuocNoiBo", label: "Tên thuốc (nội bộ)" },
    { value: "hoatChatNoiBo", label: "Hoạt chất (nội bộ)" },
    { value: "soDangKyNoiBo", label: "SĐK nội bộ" },
    { value: "maChung", label: "Mã chung" },
    { value: "maBhyt", label: "Mã BHYT" },
    { value: "tenThuoc", label: "Tên thuốc (DM)" },
    { value: "hoatChat", label: "Hoạt chất" },
    { value: "soDangKy", label: "Số đăng ký" },
    { value: "soQdTrungThau", label: "Số QĐ TT" },
    { value: "tenCongTy", label: "Tên công ty" },
] as const;

type DetailSearchField = (typeof DETAIL_SEARCH_FIELDS)[number]["value"];

const DETAIL_SEARCH_FIELD_LABELS = Object.fromEntries(
    DETAIL_SEARCH_FIELDS.map((field) => [field.value, field.label])
) as Record<DetailSearchField, string>;

interface DetailReportRow {
    id: string;
    maNoiBo: string;
    tenThuocNoiBo: string;
    hoatChatNoiBo: string;
    soDangKyNoiBo: string;
    donViTinhNoiBo: string;
    maChung: string;
    maBhyt: string;
    tenThuoc: string;
    hoatChat: string;
    hamLuong: string;
    dangBaoChe: string;
    soDangKy: string;
    donViTinh: string;
    quyCach: string;
    duongDung: string;
    congTySanXuat: string;
    nuocSanXuat: string;
    congTyDangKy: string;
    nhomThuoc: string;
    tonDau: number;
    nhap: number;
    xuat: number;
    tonCuoi: number;
    giaVat: number;
    thanhTienTonCuoi: number;
    soQdTrungThau: string;
    tenCongTy: string;
    ngayBatDauHd: string;
    ngayKetThucHd: string;
    bhyt: string;
    dichVu: string;
}

export default function FacilityReportsPage() {
    const [selectedMonth, setSelectedMonth] = useState("");
    const [isDownloading, setIsDownloading] = useState(false);
    const [periods, setPeriods] = useState<{ value: string; label: string; deadline?: string | null }[]>([]);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [reports, setReports] = useState<any[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Preview state
    const [previewRows, setPreviewRows] = useState<PreviewRow[]>([]);
    const [isPreviewing, setIsPreviewing] = useState(false);
    const [isParsingFile, setIsParsingFile] = useState(false);
    const [serverValidationErrors, setServerValidationErrors] = useState<ServerValidationError[]>([]);
    const [isServerValidating, setIsServerValidating] = useState(false);
    const [hasServerValidatedSuccess, setHasServerValidatedSuccess] = useState(false);

    // Detail modal state
    const [detailData, setDetailData] = useState<DetailReportRow[]>([]);
    const [detailMonth, setDetailMonth] = useState<string>("");
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [isDetailLoading, setIsDetailLoading] = useState(false);
    const [detailPage, setDetailPage] = useState(1);
    const [detailTotal, setDetailTotal] = useState(0);
    const [detailTotalPages, setDetailTotalPages] = useState(1);
    const [detailSearchField, setDetailSearchField] = useState<DetailSearchField>("all");
    const [detailAppliedSearchField, setDetailAppliedSearchField] = useState<DetailSearchField>("all");
    const [detailSearchInput, setDetailSearchInput] = useState("");
    const [detailSearchTerm, setDetailSearchTerm] = useState("");

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
                triggerBlobDownload(blob, `bao_cao_${selectedMonth.replace("/", "_")}.xlsx`);
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
    const isSubmitted = Boolean(currentMonthReport);

    const resetUploadValidationState = () => {
        setPreviewRows([]);
        setIsPreviewing(false);
        setServerValidationErrors([]);
        setIsServerValidating(false);
        setHasServerValidatedSuccess(false);
    };

    const validateReportPayload = async (rawData: unknown[], month: string) => {
        setIsServerValidating(true);
        setServerValidationErrors([]);
        setHasServerValidatedSuccess(false);

        try {
            const res = await fetch("/api/facility/reports/validate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ month, data: rawData }),
            });

            if (res.ok) {
                setHasServerValidatedSuccess(true);
                return true;
            }

            const errorData = await res.json().catch(() => null);
            setServerValidationErrors(errorData?.errors || []);
            toast.error(errorData?.message || "Không thể kiểm tra dữ liệu với máy chủ");
            return false;
        } catch (error) {
            console.error(error);
            toast.error("Không thể kiểm tra dữ liệu với máy chủ");
            return false;
        } finally {
            setIsServerValidating(false);
        }
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            setSelectedFile(file);
            resetUploadValidationState();

            if (!selectedMonth) {
                toast.warning("Vui lòng chọn tháng báo cáo trước khi chọn file");
                return;
            }

            // Auto-parse and preview
            setIsParsingFile(true);
            try {
                const rawData = await readExcel(file) as any[];
                if (!rawData || rawData.length === 0) {
                    toast.error("File không có dữ liệu");
                    return;
                }
                const parsedRows = rawData
                    .map((row) => parseRawRow(row))
                    .filter((row): row is NonNullable<ReturnType<typeof parseRawRow>> => Boolean(row));
                const duplicateTokens = findDuplicateRowTokens(parsedRows);
                const rows: PreviewRow[] = rawData.map((row, idx) => {
                    const parsed = parseRawRow(row);
                    if (!parsed) return null;
                    const warnings = validateReportRow(parsed);
                    const isSkipped = isSkipMarked(parsed.boQua);
                    if (parsed.rowToken && duplicateTokens.has(parsed.rowToken.trim())) {
                        warnings.push({
                            drug: parsed.drugName,
                            field: REPORT_ROW_TOKEN_COLUMN,
                            code: REPORT_VALIDATION_CODES.duplicateRowToken,
                            message: `${parsed.drugName}: Mã định danh dòng bị trùng trong file.`,
                        });
                    }
                    return {
                        stt: idx + 1,
                        excelRowNumber: idx + 2,
                        maNoiBo: parsed.maNoiBo,
                        maThuoc: parsed.maThuoc,
                        rowToken: parsed.rowToken,
                        drugName: parsed.drugName,
                        tonDau: parsed.tonDau,
                        nhap: parsed.nhap,
                        xuat: parsed.xuat,
                        tonCuoi: parsed.tonCuoi,
                        giaVat: parsed.giaVat,
                        thanhTienTonCuoi: parsed.thanhTienTonCuoi,
                        bhyt: parsed.bhyt,
                        dichVu: parsed.dichVu,
                        boQua: parsed.boQua,
                        isSkipped,
                        warnings,
                        rawRow: row,
                    };
                }).filter(Boolean) as PreviewRow[];
                setPreviewRows(rows);
                setIsPreviewing(true);

                const localErrorCount = rows.reduce((acc, row) => acc + row.warnings.length, 0);
                if (rows.length > 0 && localErrorCount === 0) {
                    setIsParsingFile(false);
                    await validateReportPayload(rawData, selectedMonth);
                }
            } catch (err) {
                console.error(err);
                toast.error("Không thể đọc file Excel");
            } finally {
                setIsParsingFile(false);
            }
        }
    };

    const serverErrorsByRow = serverValidationErrors.reduce((map, error) => {
        const rowErrors = map.get(error.rowNumber) || [];
        rowErrors.push(error);
        map.set(error.rowNumber, rowErrors);
        return map;
    }, new Map<number, ServerValidationError[]>());

    const previewRowsWithErrors = previewRows.map((row) => {
        const serverErrors = serverErrorsByRow.get(row.excelRowNumber) || [];
        const combinedErrors: ValidationWarning[] = [
            ...row.warnings,
            ...serverErrors.map((error) => ({
                drug: row.drugName,
                field: error.field,
                code: error.code as ValidationWarning["code"],
                message: error.message,
            })),
        ];
        return {
            ...row,
            combinedErrors,
        };
    });

    const localErrorCount = previewRows.reduce((acc, row) => acc + row.warnings.length, 0);
    const serverErrorCount = serverValidationErrors.length;
    const totalErrors = localErrorCount + serverErrorCount;
    const skippedRows = previewRowsWithErrors.filter((row) => row.isSkipped).length;
    const reportedRows = previewRowsWithErrors.filter((row) => !row.isSkipped).length;
    const canSubmit = Boolean(
        selectedFile
        && selectedMonth
        && !isUploading
        && !isServerValidating
        && isPreviewing
        && totalErrors === 0
        && hasServerValidatedSuccess
    );
    const reportAIReviewEvidence = previewRowsWithErrors.length > 0
        ? {
            summary: {
                selectedMonth,
                totalRows: previewRowsWithErrors.length,
                reportedRows,
                skippedRows,
                localErrorCount,
                serverErrorCount,
                totalErrors,
                serverValidated: hasServerValidatedSuccess,
            },
            rows: previewRowsWithErrors
                .filter(row => row.combinedErrors.length > 0)
                .slice(0, 30)
                .map(row => ({
                    stt: row.stt,
                    excelRowNumber: row.excelRowNumber,
                    maNoiBo: row.maNoiBo,
                    maThuoc: row.maThuoc,
                    drugName: row.drugName,
                    tonDau: row.tonDau,
                    nhap: row.nhap,
                    xuat: row.xuat,
                    tonCuoi: row.tonCuoi,
                    giaVat: row.giaVat,
                    thanhTienTonCuoi: row.thanhTienTonCuoi,
                    warnings: row.combinedErrors.map(error => ({
                        field: error.field,
                        code: error.code,
                        message: error.message,
                    })),
                })),
        }
        : undefined;
    const canAIReviewReport = Boolean(selectedMonth && (previewRowsWithErrors.length > 0 || currentMonthReport));

    const handleUploadReport = async () => {
        if (!selectedFile || !selectedMonth) {
            toast.error("Vui lòng chọn tháng và file báo cáo");
            return;
        }
        if (isServerValidating) {
            toast.error("Dữ liệu đang được kiểm tra với máy chủ. Vui lòng đợi hoàn tất.");
            return;
        }
        if (totalErrors > 0) {
            toast.error(`Còn ${totalErrors} lỗi trong file. Vui lòng sửa trước khi nộp.`);
            return;
        }
        if (!hasServerValidatedSuccess) {
            toast.error("File chưa được xác thực với máy chủ. Vui lòng chọn lại file để kiểm tra.");
            return;
        }

        setIsUploading(true);
        try {
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
                const responseData = await res.json().catch(() => null);
                const successCount = responseData?.stats?.success ?? 0;
                const skippedCount = responseData?.stats?.skipped ?? 0;
                toast.success(`Nộp báo cáo thành công (${successCount} dòng báo cáo, ${skippedCount} dòng bỏ qua)`);
                setSelectedFile(null);
                resetUploadValidationState();
                if (fileInputRef.current) fileInputRef.current.value = "";
                fetchReports();
            } else {
                const errorData = await res.json();
                if (errorData.errors && errorData.errors.length > 0) {
                    setServerValidationErrors(errorData.errors);
                    setHasServerValidatedSuccess(false);
                    toast.error(errorData.message || `Báo cáo không được lưu: ${errorData.errors.length} lỗi`);
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

    const resetDetailState = () => {
        setDetailMonth("");
        setDetailData([]);
        setIsDetailLoading(false);
        setDetailPage(1);
        setDetailTotal(0);
        setDetailTotalPages(1);
        setDetailSearchField("all");
        setDetailAppliedSearchField("all");
        setDetailSearchInput("");
        setDetailSearchTerm("");
    };

    const fetchDetailPage = async (
        month: string,
        page: number,
        search = {
            field: detailAppliedSearchField,
            term: detailSearchTerm,
        }
    ) => {
        setIsDetailLoading(true);
        try {
            const params = new URLSearchParams({
                month,
                page: page.toString(),
                limit: DETAIL_PAGE_SIZE.toString(),
                searchField: search.field,
            });
            if (search.term) params.set("searchTerm", search.term);

            const res = await fetch(`/api/facility/reports/detail?${params.toString()}`);
            if (!res.ok) {
                toast.error("Không thể tải chi tiết báo cáo");
                return;
            }

            const data = await res.json();
            setDetailData(data.items || []);
            setDetailPage(data.pagination?.page || page);
            setDetailTotal(data.pagination?.total || 0);
            setDetailTotalPages(data.pagination?.totalPages || 1);
        } catch {
            toast.error("Lỗi kết nối");
        } finally {
            setIsDetailLoading(false);
        }
    };

    const handleViewDetail = (month: string) => {
        setDetailMonth(month);
        setIsDetailOpen(true);
        setDetailData([]);
        setDetailPage(1);
        setDetailTotal(0);
        setDetailTotalPages(1);
        setDetailSearchField("all");
        setDetailAppliedSearchField("all");
        setDetailSearchInput("");
        setDetailSearchTerm("");
        void fetchDetailPage(month, 1, { field: "all", term: "" });
    };

    const handleDetailPageChange = (page: number) => {
        if (!detailMonth || page < 1 || page > detailTotalPages || page === detailPage) return;
        void fetchDetailPage(detailMonth, page, {
            field: detailAppliedSearchField,
            term: detailSearchTerm,
        });
    };

    const handleDetailSearch = () => {
        if (!detailMonth) return;
        const nextSearchTerm = detailSearchInput.trim();
        setDetailSearchInput(nextSearchTerm);
        setDetailAppliedSearchField(detailSearchField);
        setDetailSearchTerm(nextSearchTerm);
        setDetailPage(1);
        void fetchDetailPage(detailMonth, 1, {
            field: detailSearchField,
            term: nextSearchTerm,
        });
    };

    const handleResetDetailSearch = () => {
        if (!detailMonth) return;
        setDetailSearchField("all");
        setDetailAppliedSearchField("all");
        setDetailSearchInput("");
        setDetailSearchTerm("");
        setDetailPage(1);
        void fetchDetailPage(detailMonth, 1, {
            field: "all",
            term: "",
        });
    };

    const selectedPeriod = periods.find(p => p.value === selectedMonth);
    const selectedDetailReport = reports.find((report) => report.month === detailMonth);
    const deadline = selectedPeriod?.deadline;
    const detailRangeStart = detailTotal === 0 ? 0 : (detailPage - 1) * DETAIL_PAGE_SIZE + 1;
    const detailRangeEnd = detailTotal === 0 ? 0 : Math.min(detailTotal, (detailPage - 1) * DETAIL_PAGE_SIZE + detailData.length);
    const hasActiveDetailSearch = detailSearchTerm.length > 0;
    const detailSearchFieldLabel = DETAIL_SEARCH_FIELD_LABELS[detailAppliedSearchField];
    const canResetDetailSearch = detailSearchField !== "all"
        || detailAppliedSearchField !== "all"
        || detailSearchInput.length > 0
        || detailSearchTerm.length > 0;
    const detailReportHasNoSavedRows = (selectedDetailReport?.drugCount || 0) === 0;
    const formatDetailNumber = (value: number | string | null | undefined) => new Intl.NumberFormat("vi-VN").format(Number(value || 0));
    const renderDetailText = (value: string | null | undefined) => {
        if (!value?.trim()) return <span className="text-gray-300">—</span>;
        return value;
    };

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
                                resetUploadValidationState();
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
                            disabled={!selectedMonth || isDownloading || isSubmitted}
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
                            {isSubmitted && (
                                <p className="text-sm text-blue-700 mt-2">
                                    Tháng {selectedMonth} đã được nộp và chốt. Không thể tải lại mẫu để nộp tiếp.
                                </p>
                            )}
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
                        {isSubmitted ? (
                            <div className="p-8 text-center bg-emerald-50 rounded-lg border border-emerald-100">
                                <CheckCircle className="w-12 h-12 mx-auto text-emerald-500 mb-4" />
                                <h3 className="text-lg font-medium text-emerald-800 mb-2">Đã nộp</h3>
                                <p className="text-emerald-600">Báo cáo tháng {selectedMonth} đã được nộp và chốt. Không thể nộp lại.</p>
                            </div>
                        ) : (
                            <>
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
                                    <div className={`p-3 rounded-lg text-sm ${totalErrors > 0
                                        ? "bg-red-50 border border-red-200"
                                        : hasServerValidatedSuccess
                                            ? "bg-emerald-50 border border-emerald-200"
                                            : "bg-blue-50 border border-blue-200"}`}>
                                        <div className="flex items-center gap-2 font-medium mb-1">
                                            {totalErrors > 0 ? (
                                                <><XCircle className="w-4 h-4 text-red-600" /><span className="text-red-700">{totalErrors} lỗi cần sửa trước khi nộp</span></>
                                            ) : isServerValidating ? (
                                                <><Loader2 className="w-4 h-4 text-blue-600 animate-spin" /><span className="text-blue-700">Đang kiểm tra dữ liệu với máy chủ</span></>
                                            ) : (
                                                <><CheckCircle className="w-4 h-4 text-emerald-600" /><span className="text-emerald-700">{reportedRows} dòng báo cáo, {skippedRows} dòng bỏ qua – sẵn sàng nộp</span></>
                                            )}
                                        </div>
                                        {totalErrors > 0 && (
                                            <p className="text-red-600 text-xs">Xem chi tiết lỗi trong bảng preview bên dưới</p>
                                        )}
                                        {!totalErrors && isServerValidating && (
                                            <p className="text-blue-600 text-xs">Máy chủ đang đối chiếu token dòng, dữ liệu mẫu và tồn cuối tháng trước.</p>
                                        )}
                                        {!totalErrors && !isServerValidating && !hasServerValidatedSuccess && (
                                            <p className="text-blue-600 text-xs">Chưa hoàn tất xác thực với máy chủ. Nút nộp sẽ mở khi kiểm tra xong.</p>
                                        )}
                                    </div>
                                )}

                                <div className="flex justify-end">
                                    <AIReviewButton
                                        surface="facility_reports"
                                        message="Kiểm tra báo cáo Xuất-Nhập-Tồn này và chỉ ra lỗi cần xử lý, cảnh báo nên kiểm tra, cùng bước tiếp theo."
                                        context={{ reportMonth: selectedMonth }}
                                        evidence={reportAIReviewEvidence}
                                        disabled={!canAIReviewReport}
                                        disabledReason="Chọn kỳ báo cáo và có dữ liệu preview hoặc báo cáo đã nộp trước khi kiểm tra bằng AI"
                                    />
                                </div>

                                <Button
                                    variant="default"
                                    className="w-full bg-emerald-600 hover:bg-emerald-700"
                                    disabled={!canSubmit}
                                    onClick={handleUploadReport}
                                >
                                    {isUploading
                                        ? "Đang xử lý..."
                                        : isServerValidating
                                            ? "Đang xác thực dữ liệu..."
                                            : "Xác nhận nộp báo cáo"}
                                </Button>
                            </>
                        )}

                        <div className="p-4 bg-emerald-50 rounded-lg">
                            <p className="text-sm text-emerald-700">
                                <strong>Hướng dẫn:</strong> Điền số liệu cho các dòng cần báo cáo. Nếu thuốc không phát sinh dữ liệu trong tháng, nhập <span className="font-semibold">{REPORT_FIELD_BO_QUA}</span> = X. Nếu không bỏ qua dòng, phải đánh dấu X ở ít nhất một trong hai cột BHYT hoặc Dịch vụ; có thể đánh dấu cả hai. Hệ thống sẽ kiểm tra tự động trước khi nộp.
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
                            ) : isServerValidating ? (
                                <Badge className="bg-blue-100 text-blue-700 border-0">Đang kiểm tra</Badge>
                            ) : !hasServerValidatedSuccess ? (
                                <Badge className="bg-blue-100 text-blue-700 border-0">Chờ xác thực</Badge>
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
                                    <th className="px-3 py-3 text-center">Bỏ qua</th>
                                    <th className="px-3 py-3">Trạng thái</th>
                                </tr>
                            </thead>
                            <tbody>
                                {previewRowsWithErrors.map((row) => (
                                    <tr key={`${row.stt}-${row.excelRowNumber}`} className={`border-b ${row.combinedErrors.length > 0 ? "bg-red-50" : row.isSkipped ? "bg-amber-50" : "bg-white hover:bg-gray-50"}`}>
                                        <td className="px-3 py-2 text-gray-500">{row.stt}</td>
                                        <td className="px-3 py-2 text-xs text-gray-500">{row.maNoiBo}</td>
                                        <td className="px-3 py-2 font-medium text-gray-800">{row.drugName}</td>
                                        <td className="px-3 py-2 text-right">{row.tonDau.toLocaleString("vi-VN")}</td>
                                        <td className="px-3 py-2 text-right text-blue-600">{row.nhap.toLocaleString("vi-VN")}</td>
                                        <td className="px-3 py-2 text-right text-orange-600">{row.xuat.toLocaleString("vi-VN")}</td>
                                        <td className={`px-3 py-2 text-right font-semibold ${row.combinedErrors.some((warning) => warning.field === "Tồn cuối") ? "text-red-600" : "text-gray-800"}`}>
                                            {row.tonCuoi.toLocaleString("vi-VN")}
                                        </td>
                                        <td className="px-3 py-2 text-right">{row.giaVat.toLocaleString("vi-VN")}</td>
                                        <td className={`px-3 py-2 text-right ${row.combinedErrors.some((warning) => warning.field === "Thành tiền tồn cuối") ? "text-red-600 font-semibold" : ""}`}>
                                            {row.thanhTienTonCuoi.toLocaleString("vi-VN")}
                                        </td>
                                        <td className="px-3 py-2 text-center text-xs">
                                            {row.bhyt?.trim().toLowerCase() === "x" && <span className="text-emerald-600 font-bold">BH</span>}
                                            {row.bhyt?.trim().toLowerCase() === "x" && row.dichVu?.trim().toLowerCase() === "x" && " / "}
                                            {row.dichVu?.trim().toLowerCase() === "x" && <span className="text-blue-600 font-bold">DV</span>}
                                            {!row.bhyt?.trim() && !row.dichVu?.trim() && <span className="text-gray-400">—</span>}
                                        </td>
                                        <td className="px-3 py-2 text-center text-xs">
                                            {row.isSkipped ? (
                                                <Badge className="bg-amber-100 text-amber-700 border-0">X</Badge>
                                            ) : (
                                                <span className="text-gray-400">—</span>
                                            )}
                                        </td>
                                        <td className="px-3 py-2">
                                            {row.combinedErrors.length === 0 ? (
                                                row.isSkipped ? (
                                                    <Badge className="bg-amber-100 text-amber-700 border-0">Bỏ qua</Badge>
                                                ) : (
                                                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                                                )
                                            ) : (
                                                <div className="space-y-1">
                                                    {row.combinedErrors.map((w, i) => (
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
                                    <TableHead>Tổng tiền nhập</TableHead>
                                    <TableHead>Tổng tiền xuất</TableHead>
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
                                        <TableCell className="text-gray-400 text-sm">{report.lastUpdated ? new Date(report.lastUpdated).toLocaleString("vi-VN") : "—"}</TableCell>
                                        <TableCell>
                                            <div className="flex flex-col gap-1">
                                                <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-0 w-fit">Đã nộp</Badge>
                                                {report.skippedRowCount > 0 && (
                                                    <span className="text-xs text-amber-600">{report.skippedRowCount} dòng bỏ qua</span>
                                                )}
                                            </div>
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
            <Dialog
                open={isDetailOpen}
                onOpenChange={(open) => {
                    setIsDetailOpen(open);
                    if (!open) resetDetailState();
                }}
            >
                <DialogContent className="max-w-[95vw] sm:max-w-[95vw] w-[95vw] h-[90vh] flex flex-col p-0">
                    <DialogHeader className="p-6 pb-2">
                        <DialogTitle>Chi tiết báo cáo tháng {detailMonth}</DialogTitle>
                        <DialogDescription>
                            Tổng số mặt hàng: {formatDetailNumber(detailTotal)}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex flex-1 flex-col overflow-hidden px-6 pb-6">
                        <form
                            className="flex flex-wrap items-center gap-2 pb-3"
                            onSubmit={(event) => {
                                event.preventDefault();
                                handleDetailSearch();
                            }}
                        >
                            <Select value={detailSearchField} onValueChange={(value) => setDetailSearchField(value as DetailSearchField)}>
                                <SelectTrigger className="w-[220px] bg-white">
                                    <SelectValue placeholder="Chọn trường tìm kiếm" />
                                </SelectTrigger>
                                <SelectContent>
                                    {DETAIL_SEARCH_FIELDS.map((field) => (
                                        <SelectItem key={field.value} value={field.value}>{field.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <Input
                                value={detailSearchInput}
                                onChange={(event) => setDetailSearchInput(event.target.value)}
                                placeholder="Nhập từ khóa tìm kiếm..."
                                className="min-w-[260px] flex-1 bg-white"
                            />

                            <Button type="submit" disabled={isDetailLoading}>
                                Tìm kiếm
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={handleResetDetailSearch}
                                disabled={isDetailLoading || !canResetDetailSearch}
                            >
                                Đặt lại
                            </Button>
                        </form>

                        {hasActiveDetailSearch && (
                            <div className="pb-3 text-sm text-gray-600">
                                Kết quả tìm kiếm cho <span className="font-medium">&quot;{detailSearchTerm}&quot;</span> trong trường{" "}
                                <span className="font-medium">{detailSearchFieldLabel}</span>
                            </div>
                        )}

                        {isDetailLoading ? (
                            <div className="flex flex-1 items-center justify-center">
                                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                            </div>
                        ) : detailData.length === 0 ? (
                            <div className="flex flex-1 items-center justify-center text-gray-500">
                                <div className="text-center">
                                    <p className="text-base font-medium text-gray-600">
                                        {hasActiveDetailSearch
                                            ? "Không tìm thấy dữ liệu phù hợp"
                                            : detailReportHasNoSavedRows
                                                ? "Báo cáo này không có dòng dữ liệu đã lưu"
                                                : "Không có dữ liệu chi tiết"}
                                    </p>
                                    {hasActiveDetailSearch && (
                                        <p className="text-sm text-gray-400 mt-1">
                                            Thử đổi trường tìm kiếm hoặc từ khóa khác.
                                        </p>
                                    )}
                                    {!hasActiveDetailSearch && detailReportHasNoSavedRows && (
                                        <p className="text-sm text-gray-400 mt-1">
                                            Tất cả các dòng trong file nộp tháng này đã được đánh dấu Bỏ qua.
                                        </p>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="flex items-center justify-between pb-3 text-sm text-gray-600">
                                    <span>Hiển thị {detailRangeStart}-{detailRangeEnd} / {formatDetailNumber(detailTotal)} dòng</span>
                                    <span>Trang {detailPage} / {detailTotalPages}</span>
                                </div>

                                <div className="overflow-auto flex-1">
                                    <table className="text-xs border-collapse w-max min-w-full">
                                        <thead className="sticky top-0 bg-white z-10">
                                            <tr className="border-b border-gray-200">
                                                <th className="px-2 py-2 text-left font-medium text-gray-500 w-8 whitespace-nowrap">STT</th>
                                                <th className="px-2 py-2 text-left font-medium text-gray-500 w-[90px] whitespace-nowrap bg-orange-50">Mã nội bộ</th>
                                                <th className="px-2 py-2 text-left font-medium text-gray-500 w-[160px] bg-orange-50">Tên thuốc (nội bộ)</th>
                                                <th className="px-2 py-2 text-left font-medium text-gray-500 w-[130px] bg-orange-50">Hoạt chất (nội bộ)</th>
                                                <th className="px-2 py-2 text-left font-medium text-gray-500 w-[100px] whitespace-nowrap bg-orange-50">SĐK nội bộ</th>
                                                <th className="px-2 py-2 text-left font-medium text-gray-500 w-[70px] whitespace-nowrap bg-orange-50">ĐVT NB</th>
                                                <th className="px-2 py-2 text-left font-medium text-gray-500 w-[80px] whitespace-nowrap bg-blue-50">Mã chung</th>
                                                <th className="px-2 py-2 text-left font-medium text-gray-500 w-[80px] whitespace-nowrap bg-blue-50">Mã BHYT</th>
                                                <th className="px-2 py-2 text-left font-medium text-gray-500 w-[160px] bg-blue-50">Tên thuốc (DM)</th>
                                                <th className="px-2 py-2 text-left font-medium text-gray-500 w-[130px] bg-blue-50">Hoạt chất</th>
                                                <th className="px-2 py-2 text-left font-medium text-gray-500 w-[100px] bg-blue-50">Hàm lượng</th>
                                                <th className="px-2 py-2 text-left font-medium text-gray-500 w-[110px] bg-blue-50">Dạng bào chế</th>
                                                <th className="px-2 py-2 text-left font-medium text-gray-500 w-[100px] bg-blue-50">Số đăng ký</th>
                                                <th className="px-2 py-2 text-left font-medium text-gray-500 w-[65px] whitespace-nowrap bg-blue-50">ĐVT</th>
                                                <th className="px-2 py-2 text-left font-medium text-gray-500 w-[90px] bg-blue-50">Quy cách</th>
                                                <th className="px-2 py-2 text-left font-medium text-gray-500 w-[80px] bg-blue-50">Đường dùng</th>
                                                <th className="px-2 py-2 text-left font-medium text-gray-500 w-[130px] bg-blue-50">Công ty SX</th>
                                                <th className="px-2 py-2 text-left font-medium text-gray-500 w-[75px] bg-blue-50">Nước SX</th>
                                                <th className="px-2 py-2 text-left font-medium text-gray-500 w-[130px] bg-blue-50">Công ty ĐK</th>
                                                <th className="px-2 py-2 text-left font-medium text-gray-500 w-[100px] bg-blue-50">Nhóm thuốc</th>
                                                <th className="px-2 py-2 text-right font-medium text-gray-500 w-[70px] whitespace-nowrap bg-emerald-50">Tồn đầu</th>
                                                <th className="px-2 py-2 text-right font-medium text-gray-500 w-[65px] whitespace-nowrap bg-emerald-50">Nhập</th>
                                                <th className="px-2 py-2 text-right font-medium text-gray-500 w-[65px] whitespace-nowrap bg-emerald-50">Xuất</th>
                                                <th className="px-2 py-2 text-right font-semibold text-gray-700 w-[70px] whitespace-nowrap bg-emerald-50">Tồn cuối</th>
                                                <th className="px-2 py-2 text-right font-medium text-gray-500 w-[90px] whitespace-nowrap bg-emerald-50">Giá VAT</th>
                                                <th className="px-2 py-2 text-right font-medium text-gray-500 w-[110px] bg-emerald-50">TT tồn cuối</th>
                                                <th className="px-2 py-2 text-left font-medium text-gray-500 w-[110px] bg-purple-50">Số QĐ TT</th>
                                                <th className="px-2 py-2 text-left font-medium text-gray-500 w-[130px] bg-purple-50">Tên công ty</th>
                                                <th className="px-2 py-2 text-left font-medium text-gray-500 w-[90px] whitespace-nowrap bg-purple-50">Ngày BĐ HĐ</th>
                                                <th className="px-2 py-2 text-left font-medium text-gray-500 w-[90px] whitespace-nowrap bg-purple-50">Ngày KT HĐ</th>
                                                <th className="px-2 py-2 text-left font-medium text-gray-500 w-[55px] whitespace-nowrap bg-purple-50">BHYT</th>
                                                <th className="px-2 py-2 text-left font-medium text-gray-500 w-[60px] whitespace-nowrap bg-purple-50">Dịch vụ</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {detailData.map((item, index) => (
                                                <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                                                    <td className="px-2 py-1.5 text-gray-400">{(detailPage - 1) * DETAIL_PAGE_SIZE + index + 1}</td>
                                                    <td className="px-2 py-1.5 break-all">{renderDetailText(item.maNoiBo)}</td>
                                                    <td className="px-2 py-1.5 break-words">{renderDetailText(item.tenThuocNoiBo)}</td>
                                                    <td className="px-2 py-1.5 text-gray-500 break-words">{renderDetailText(item.hoatChatNoiBo)}</td>
                                                    <td className="px-2 py-1.5 break-all">{renderDetailText(item.soDangKyNoiBo)}</td>
                                                    <td className="px-2 py-1.5">{renderDetailText(item.donViTinhNoiBo)}</td>
                                                    <td className="px-2 py-1.5 font-medium text-blue-700 break-all">{renderDetailText(item.maChung)}</td>
                                                    <td className="px-2 py-1.5 break-all">{renderDetailText(item.maBhyt)}</td>
                                                    <td className="px-2 py-1.5 font-medium break-words">{renderDetailText(item.tenThuoc)}</td>
                                                    <td className="px-2 py-1.5 text-gray-500 break-words">{renderDetailText(item.hoatChat)}</td>
                                                    <td className="px-2 py-1.5 break-words">{renderDetailText(item.hamLuong)}</td>
                                                    <td className="px-2 py-1.5 break-words">{renderDetailText(item.dangBaoChe)}</td>
                                                    <td className="px-2 py-1.5 break-all">{renderDetailText(item.soDangKy)}</td>
                                                    <td className="px-2 py-1.5">{renderDetailText(item.donViTinh)}</td>
                                                    <td className="px-2 py-1.5 break-words">{renderDetailText(item.quyCach)}</td>
                                                    <td className="px-2 py-1.5 break-words">{renderDetailText(item.duongDung)}</td>
                                                    <td className="px-2 py-1.5 break-words">{renderDetailText(item.congTySanXuat)}</td>
                                                    <td className="px-2 py-1.5 break-words">{renderDetailText(item.nuocSanXuat)}</td>
                                                    <td className="px-2 py-1.5 break-words">{renderDetailText(item.congTyDangKy)}</td>
                                                    <td className="px-2 py-1.5 break-words">{renderDetailText(item.nhomThuoc)}</td>
                                                    <td className="px-2 py-1.5 text-right tabular-nums">{formatDetailNumber(item.tonDau)}</td>
                                                    <td className="px-2 py-1.5 text-right text-blue-600 tabular-nums">{formatDetailNumber(item.nhap)}</td>
                                                    <td className="px-2 py-1.5 text-right text-red-600 tabular-nums">{formatDetailNumber(item.xuat)}</td>
                                                    <td className="px-2 py-1.5 text-right font-bold tabular-nums">{formatDetailNumber(item.tonCuoi)}</td>
                                                    <td className="px-2 py-1.5 text-right tabular-nums">{formatDetailNumber(item.giaVat)}</td>
                                                    <td className="px-2 py-1.5 text-right font-medium text-emerald-700 tabular-nums">{formatDetailNumber(item.thanhTienTonCuoi)}</td>
                                                    <td className="px-2 py-1.5 break-all">{renderDetailText(item.soQdTrungThau)}</td>
                                                    <td className="px-2 py-1.5 break-words">{renderDetailText(item.tenCongTy)}</td>
                                                    <td className="px-2 py-1.5 whitespace-nowrap">{renderDetailText(item.ngayBatDauHd)}</td>
                                                    <td className="px-2 py-1.5 whitespace-nowrap">{renderDetailText(item.ngayKetThucHd)}</td>
                                                    <td className="px-2 py-1.5">{renderDetailText(item.bhyt)}</td>
                                                    <td className="px-2 py-1.5">{renderDetailText(item.dichVu)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {detailTotalPages > 1 && (
                                    <div className="flex items-center justify-between border-t pt-3">
                                        <p className="text-sm text-gray-600">
                                            Hiển thị {detailRangeStart}-{detailRangeEnd} / {formatDetailNumber(detailTotal)} dòng
                                        </p>
                                        <div className="flex gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleDetailPageChange(detailPage - 1)}
                                                disabled={isDetailLoading || detailPage <= 1}
                                            >
                                                Trước
                                            </Button>
                                            <Button variant="outline" size="sm" disabled>
                                                Trang {detailPage} / {detailTotalPages}
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleDetailPageChange(detailPage + 1)}
                                                disabled={isDetailLoading || detailPage >= detailTotalPages}
                                            >
                                                Sau
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
