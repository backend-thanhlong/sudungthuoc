"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import AIReviewButton from "@/components/ai/AIReviewButton";
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
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Pencil, Trash2, Download, RotateCcw, AlertCircle, CheckCircle2, Lock, FileWarning } from "lucide-react";
import { readExcel, exportMultiSheetExcelAdvanced } from "@/lib/excel";
import { NHOM_TCKT_OPTIONS, normalizeNhomTckt } from "@/lib/report-validation";

interface DrugMapping {
    id: string;
    maNoiBo: string;
    tenThuocNoiBo: string;
    hoatChatNoiBo: string | null;
    soDangKyNoiBo: string | null;
    donViTinhNoiBo: string | null;
    nhomTckt: string | null;
    status: string;
    adminNote: string | null;
    isOutOfCatalog: boolean;
    masterDrug: {
        id: string;
        maChung: string;
        tenThuoc: string;
        hoatChat: string | null;
        hamLuong: string | null;
        dangBaoChe: string | null;
        soDangKy: string | null;
        quyCach: string | null;
        donViTinh: string | null;
    } | null;
}

interface MasterDrug {
    id: string;
    maChung: string;
    maBhyt: string | null;
    tenThuoc: string;
    hoatChat: string | null;
    hamLuong: string | null;
    dangBaoChe: string | null;
    soDangKy: string | null;
    quyCach: string | null;
    donViTinh: string | null;
}

function CompactMappingText({
    value,
    className = "",
    lines = 1,
}: {
    value?: string | null;
    className?: string;
    lines?: 1 | 2;
}) {
    const text = value?.trim();

    if (!text) {
        return <span className="text-gray-400">-</span>;
    }

    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <span
                    tabIndex={0}
                    className={`block min-w-0 cursor-help ${lines === 2 ? "line-clamp-2 whitespace-normal break-words" : "truncate"} ${className}`}
                >
                    {text}
                </span>
            </TooltipTrigger>
            <TooltipContent side="top" align="start" className="max-w-md whitespace-normal break-words leading-relaxed">
                {text}
            </TooltipContent>
        </Tooltip>
    );
}

export default function FacilityMappingsPage() {
    const [mappings, setMappings] = useState<DrugMapping[]>([]);
    const [masterDrugs, setMasterDrugs] = useState<MasterDrug[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedMapping, setSelectedMapping] = useState<DrugMapping | null>(null);
    const [selectedMasterDrugId, setSelectedMasterDrugId] = useState<string>("");
    const [isOutOfCatalog, setIsOutOfCatalog] = useState(false);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [searchMaster, setSearchMaster] = useState("");
    const [isNhomTcktDialogOpen, setIsNhomTcktDialogOpen] = useState(false);
    const [nhomTcktDraft, setNhomTcktDraft] = useState("");

    // Import error reporting
    const [importErrors, setImportErrors] = useState<{ row: number; maNoiBo: string; message: string; type: 'error' | 'warning' | 'skip' }[]>([]);
    const [isErrorDialogOpen, setIsErrorDialogOpen] = useState(false);
    const [importSummary, setImportSummary] = useState<{ total: number; success: number; errors: number; skipped: number }>({ total: 0, success: 0, errors: 0, skipped: 0 });

    // New state for editing internal info
    const [isEditInfoDialogOpen, setIsEditInfoDialogOpen] = useState(false);
    const [editFormData, setEditFormData] = useState({
        maNoiBo: "",
        tenThuocNoiBo: "",
        hoatChatNoiBo: "",
        soDangKyNoiBo: "",
        donViTinhNoiBo: "",
    });

    const fetchMappings = useCallback(async () => {
        try {
            const res = await fetch("/api/facility/mappings");
            if (res.ok) {
                const data = await res.json();
                setMappings(data);
            }
        } catch (error) {
            console.error("Error fetching mappings:", error);
            toast.error("Không thể tải danh sách thuốc");
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Server-side search for master drugs
    const fetchMasterDrugs = useCallback(async (search: string) => {
        try {
            const params = new URLSearchParams();
            params.set("limit", "50"); // Fetch top 50 matches
            if (search) {
                params.set("search", search);
            }

            const res = await fetch(`/api/admin/master-drugs?${params.toString()}`);
            if (res.ok) {
                const response = await res.json();
                setMasterDrugs(response.data || []);
            }
        } catch (error) {
            console.error("Error fetching master drugs:", error);
        }
    }, []);

    useEffect(() => {
        fetchMappings();
    }, [fetchMappings]);

    // Debounce search effect
    useEffect(() => {
        const timer = setTimeout(() => {
            fetchMasterDrugs(searchMaster);
        }, 500); // 500ms debounce

        return () => clearTimeout(timer);
    }, [searchMaster, fetchMasterDrugs]);

    const handleSelectMapping = (mapping: DrugMapping) => {
        setSelectedMapping(mapping);
        setSelectedMasterDrugId(mapping.masterDrug?.id || "");
        setIsOutOfCatalog(mapping.isOutOfCatalog);
        setIsDialogOpen(true);
    };

    const handleSaveMapping = async () => {
        if (!selectedMapping) return;
        setIsProcessing(true);

        try {
            const res = await fetch(`/api/facility/mappings/${selectedMapping.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    masterDrugId: isOutOfCatalog ? null : selectedMasterDrugId || null,
                    isOutOfCatalog,
                    status: "PENDING_MAPPING", // Will be updated to WAITING_APPROVAL when submitting
                }),
            });

            if (res.ok) {
                toast.success("Đã lưu ánh xạ");
                setIsDialogOpen(false);
                fetchMappings();
            }
        } catch {
            toast.error("Đã xảy ra lỗi");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleEditInfo = (mapping: DrugMapping) => {
        setSelectedMapping(mapping);
        setEditFormData({
            maNoiBo: mapping.maNoiBo,
            tenThuocNoiBo: mapping.tenThuocNoiBo,
            hoatChatNoiBo: mapping.hoatChatNoiBo || "",
            soDangKyNoiBo: mapping.soDangKyNoiBo || "",
            donViTinhNoiBo: mapping.donViTinhNoiBo || "",
        });
        setIsEditInfoDialogOpen(true);
    };

    const handleSaveInfo = async () => {
        if (!selectedMapping) return;
        setIsProcessing(true);

        try {
            const res = await fetch(`/api/facility/mappings/${selectedMapping.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(editFormData),
            });

            if (res.ok) {
                toast.success("Đã cập nhật thông tin thuốc");
                setIsEditInfoDialogOpen(false);
                fetchMappings();
            } else {
                toast.error("Không thể cập nhật thông tin");
            }
        } catch {
            toast.error("Đã xảy ra lỗi");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleOpenNhomTcktDialog = (mapping: DrugMapping) => {
        setSelectedMapping(mapping);
        setNhomTcktDraft("");
        setIsNhomTcktDialogOpen(true);
    };

    const handleSaveNhomTckt = async () => {
        if (!selectedMapping) return;
        const normalized = normalizeNhomTckt(nhomTcktDraft);
        if (!normalized) {
            toast.error("Vui lòng chọn Nhóm TCKT hợp lệ");
            return;
        }

        setIsProcessing(true);
        try {
            const res = await fetch(`/api/facility/mappings/${selectedMapping.id}/nhom-tckt`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ nhomTckt: normalized }),
            });

            if (res.ok) {
                toast.success("Đã thiết lập Nhóm TCKT");
                setIsNhomTcktDialogOpen(false);
                fetchMappings();
                return;
            }

            const errorData = await res.json().catch(() => null);
            toast.error(errorData?.message || "Không thể thiết lập Nhóm TCKT");
        } catch {
            toast.error("Đã xảy ra lỗi");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Bạn có chắc chắn muốn xóa thuốc này không?")) return;

        // Optimistic Delete
        const previousMappings = [...mappings];
        setMappings(prev => prev.filter(m => m.id !== id));

        try {
            const res = await fetch(`/api/facility/mappings/${id}`, {
                method: "DELETE",
            });

            if (res.ok) {
                toast.success("Đã xóa thuốc khỏi danh sách");
            } else {
                setMappings(previousMappings);
                toast.error("Không thể xóa thuốc");
            }
        } catch {
            setMappings(previousMappings);
            toast.error("Đã xảy ra lỗi");
        }
    };

    const handleDownloadTemplate = () => {
        // Sheet 1: Instruction sheet (array-of-arrays for full row control)
        const instructionRows: any[][] = [
            ["HƯỚNG DẪN NHẬP FILE MẪU DANH MỤC THUỐC NỘI BỘ"],
            [""],
            ["Lưu ý chung:"],
            ["  • Vui lòng nhập dữ liệu tại sheet \"Mẫu nhập liệu\"."],
            ["  • Không thay đổi tên các cột tiêu đề (hàng 1 của sheet Mẫu nhập liệu)."],
            ["  • Không xóa hoặc sửa sheet Hướng dẫn này."],
            ["  • Các cột đánh dấu (*) là bắt buộc phải nhập."],
            [""],
            // Table header
            ["Tên cột", "Bắt buộc", "Kiểu dữ liệu", "Mô tả", "Ví dụ"],
            [
                "Mã nội bộ (*)",
                "Có",
                "Văn bản (Text)",
                "Mã thuốc do cơ sở tự đặt. Mỗi mã phải là duy nhất trong danh mục. Không được để trống.",
                "T001"
            ],
            [
                "Tên thuốc (*)",
                "Có",
                "Văn bản (Text)",
                "Tên đầy đủ của thuốc theo danh mục nội bộ của cơ sở. Không được để trống.",
                "Paracetamol 500mg"
            ],
            [
                "Hoạt chất",
                "Không",
                "Văn bản (Text)",
                "Tên hoạt chất chính của thuốc. Nên nhập để hỗ trợ tự động ánh xạ.",
                "Paracetamol"
            ],
            [
                "Số đăng ký",
                "Không",
                "Văn bản (Text)",
                "Số đăng ký lưu hành thuốc tại Việt Nam (VD-xxxxx-xx). Nên nhập để hệ thống tự động khớp với danh mục dùng chung.",
                "VD-12345-23"
            ],
            [
                "Đơn vị tính",
                "Không",
                "Văn bản (Text)",
                "Đơn vị tính của thuốc (Viên, Lọ, Ống, Chai, Gói, Hộp, v.v.).",
                "Viên"
            ],
            [
                "Nhóm TCKT (*)",
                "Có",
                "Danh mục",
                `Nhóm TCKT cố định theo mã nội bộ. Chỉ được nhập một trong: ${NHOM_TCKT_OPTIONS.join(", ")}.`,
                "Nhóm 1"
            ],
            [""],
            ["Quy trình sau khi upload:"],
            ["  1. Upload file Excel này lên hệ thống."],
            ["  2. Hệ thống sẽ tự động ánh xạ các thuốc có Số đăng ký và Tên thuốc trùng khớp với danh mục dùng chung."],
            ["  3. Các thuốc chưa được ánh xạ sẽ có trạng thái \"Chờ xử lý\" - bạn cần chọn ánh xạ thủ công."],
            ["  4. Sau khi hoàn tất ánh xạ, nhấn \"Gửi duyệt lên Sở\" để trình duyệt."],
        ];

        // Sheet 2: Data template
        const templateData = [
            {
                "Mã nội bộ": "T001",
                "Tên thuốc": "Paracetamol 500mg",
                "Hoạt chất": "Paracetamol",
                "Số đăng ký": "VD-12345-23",
                "Đơn vị tính": "Viên",
                "Nhóm TCKT": "Nhóm 1"
            },
            {
                "Mã nội bộ": "T002",
                "Tên thuốc": "Vitamin C 500mg",
                "Hoạt chất": "Ascorbic acid",
                "Số đăng ký": "",
                "Đơn vị tính": "Viên",
                "Nhóm TCKT": "Nhóm 2"
            }
        ];

        exportMultiSheetExcelAdvanced(
            [
                { sheetName: "Hướng dẫn nhập liệu", type: "aoa", data: instructionRows },
                { sheetName: "Mẫu nhập liệu", type: "json", data: templateData },
            ],
            "Mau_Danh_Muc_Noi_Bo",
            [
                // Column widths for instruction sheet
                [{ wch: 22 }, { wch: 10 }, { wch: 18 }, { wch: 70 }, { wch: 20 }],
                // Column widths for data sheet
                [{ wch: 15 }, { wch: 30 }, { wch: 20 }, { wch: 18 }, { wch: 14 }, { wch: 14 }],
            ]
        );
        toast.success("Đã tải xuống file mẫu");
    };

    const handleImport = async (files: FileList | null) => {
        if (!files || files.length === 0) return;

        const file = files[0];
        setIsImporting(true);
        const toastId = toast.loading("Đang đọc file Excel...");

        try {
            // Read the "Mẫu nhập liệu" sheet if it exists, otherwise fallback to first sheet
            const rawData = await readExcel(file, "Mẫu nhập liệu") as any[];

            if (rawData.length === 0) {
                toast.error("File Excel trống hoặc không tìm thấy dữ liệu", { id: toastId });
                return;
            }

            // Client-side validation: check each row
            const clientErrors: { row: number; maNoiBo: string; message: string; type: 'error' | 'warning' | 'skip' }[] = [];
            const maNoiBoSeen = new Map<string, number>(); // track maNoiBo -> first row index for duplicate detection

            // Map headers to data model and attach _rowIndex (Excel row = array index + 2 because row 1 is header)
            const mappedData = rawData.map((row, idx) => {
                const rowNum = idx + 2; // Excel row number (1-indexed, row 1 = header)
                const maNoiBo = row['Mã nội bộ'] || row['maNoiBo'] || row['MaNoiBo'] || '';
                const tenThuocNoiBo = row['Tên thuốc'] || row['tenThuocNoiBo'] || row['TenThuoc'] || '';
                const hoatChatNoiBo = row['Hoạt chất'] || row['hoatChatNoiBo'] || row['HoatChat'] || '';
                const soDangKyNoiBo = row['Số đăng ký'] || row['soDangKyNoiBo'] || row['SoDangKy'] || '';
                const donViTinhNoiBo = row['Đơn vị tính'] || row['donViTinhNoiBo'] || row['DVT'] || '';
                const nhomTcktRaw = row['Nhóm TCKT'] || row['nhomTckt'] || row['NhomTCKT'] || '';
                const nhomTckt = normalizeNhomTckt(nhomTcktRaw);

                const maNoiBoStr = String(maNoiBo).trim();
                const tenThuocStr = String(tenThuocNoiBo).trim();

                // Validate required fields
                if (!maNoiBoStr) {
                    clientErrors.push({ row: rowNum, maNoiBo: '', message: 'Thiếu mã nội bộ (bắt buộc)', type: 'error' });
                }
                if (!tenThuocStr) {
                    clientErrors.push({ row: rowNum, maNoiBo: maNoiBoStr, message: 'Thiếu tên thuốc (bắt buộc)', type: 'error' });
                }
                if (!nhomTckt) {
                    clientErrors.push({
                        row: rowNum,
                        maNoiBo: maNoiBoStr,
                        message: `Thiếu hoặc sai Nhóm TCKT. Chỉ được nhập: ${NHOM_TCKT_OPTIONS.join(", ")}`,
                        type: 'error',
                    });
                }

                // Duplicate maNoiBo within the same file
                if (maNoiBoStr) {
                    if (maNoiBoSeen.has(maNoiBoStr)) {
                        clientErrors.push({
                            row: rowNum,
                            maNoiBo: maNoiBoStr,
                            message: `Mã nội bộ "${maNoiBoStr}" bị trùng với dòng ${maNoiBoSeen.get(maNoiBoStr)}`,
                            type: 'error',
                        });
                    } else {
                        maNoiBoSeen.set(maNoiBoStr, rowNum);
                    }
                }

                return {
                    _rowIndex: rowNum,
                    maNoiBo: maNoiBoStr,
                    tenThuocNoiBo: tenThuocStr,
                    hoatChatNoiBo: String(hoatChatNoiBo).trim() || null,
                    soDangKyNoiBo: String(soDangKyNoiBo).trim() || null,
                    donViTinhNoiBo: String(donViTinhNoiBo).trim() || null,
                    nhomTckt,
                };
            });

            // Even with client errors, still send valid rows to the server
            toast.loading(`Đang nhập ${mappedData.length} dòng...`, { id: toastId });

            const res = await fetch('/api/facility/mappings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ drugs: mappedData })
            });

            const data = await res.json();

            // Merge server errors & skipped with client errors
            const allIssues = [
                ...clientErrors,
                ...(data.errors || []).map((e: { row: number; maNoiBo: string; message: string }) => ({ ...e, type: 'error' as const })),
                ...(data.skipped || []).map((s: { row: number; maNoiBo: string; message: string }) => ({ ...s, type: 'skip' as const })),
            ];

            // Deduplicate by row + message
            const seen = new Set<string>();
            const uniqueIssues = allIssues.filter(issue => {
                const key = `${issue.row}:${issue.message}`;
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            });

            // Sort by row number
            uniqueIssues.sort((a, b) => a.row - b.row);

            const successCount = data.count || 0;
            const errorCount = uniqueIssues.filter(i => i.type === 'error').length;
            const skipCount = uniqueIssues.filter(i => i.type === 'skip').length;

            if (uniqueIssues.length > 0) {
                setImportErrors(uniqueIssues);
                setImportSummary({
                    total: mappedData.length,
                    success: successCount,
                    errors: errorCount,
                    skipped: skipCount,
                });
                setIsErrorDialogOpen(true);
                if (successCount > 0) {
                    toast.success(`Nhập thành công ${successCount} thuốc, có ${errorCount + skipCount} dòng cần xem lại`, { id: toastId });
                } else {
                    toast.error(`Không có dòng nào được nhập — ${errorCount + skipCount} dòng bị lỗi`, { id: toastId });
                }
            } else {
                toast.success(`Nhập thành công: ${successCount} thuốc`, { id: toastId });
            }

            fetchMappings();
        } catch (e) {
            console.error(e);
            toast.error("Lỗi đọc file Excel", { id: toastId });
        } finally {
            setIsImporting(false);
            const input = document.getElementById('excel-upload') as HTMLInputElement;
            if (input) input.value = '';
        }
    };

    const handleRecall = async () => {
        if (!confirm(`Bạn có chắc muốn thu hồi ${waitingMappings.length} thuốc đang chờ duyệt?\nSau khi thu hồi, bạn có thể chỉnh sửa và gửi lại.`)) return;

        setIsProcessing(true);
        try {
            const res = await fetch("/api/facility/mappings/recall", {
                method: "POST",
            });

            if (res.ok) {
                const data = await res.json();
                toast.success(`Đã thu hồi ${data.count} thuốc về trạng thái chờ xử lý`);
                fetchMappings();
            } else {
                const err = await res.json();
                toast.error(err.message || "Không thể thu hồi");
            }
        } catch {
            toast.error("Đã xảy ra lỗi");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleSubmitForApproval = async () => {
        const pendingMappings = mappings.filter(
            (m) => m.status === "PENDING_MAPPING" && (m.masterDrug || m.isOutOfCatalog)
        );

        if (pendingMappings.length === 0) {
            toast.error("Không có thuốc nào cần gửi duyệt");
            return;
        }

        setIsProcessing(true);
        try {
            const res = await fetch("/api/facility/mappings/submit", {
                method: "POST",
            });

            if (res.ok) {
                const data = await res.json();
                toast.success(`Đã gửi ${data.count} thuốc lên Sở duyệt`);
                fetchMappings();
            }
        } catch {
            toast.error("Đã xảy ra lỗi");
        } finally {
            setIsProcessing(false);
        }
    };



    const handleExportApproved = () => {
        if (approvedMappings.length === 0) {
            toast.error("Không có danh sách đã duyệt để xuất");
            return;
        }

        const sheet1Data = approvedMappings.map((m, index) => ({
            "STT": index + 1,
            "Mã nội bộ": m.maNoiBo,
            "Tên thuốc nội bộ": m.tenThuocNoiBo,
            "Hoạt chất nội bộ": m.hoatChatNoiBo,
            "SĐK nội bộ": m.soDangKyNoiBo,
            "ĐVT nội bộ": m.donViTinhNoiBo,
            "Nhóm TCKT": m.nhomTckt || "",
        }));

        const sheet2Data = approvedMappings.map((m, index) => ({
            "STT": index + 1,
            "Mã chung": m.masterDrug?.maChung || "",
            "Tên thuốc dùng chung": m.masterDrug?.tenThuoc || "",
            "Hoạt chất": m.masterDrug?.hoatChat || "",
            "Hàm lượng": m.masterDrug?.hamLuong || "",
            "Dạng bào chế": m.masterDrug?.dangBaoChe || "",
            "Số đăng ký": m.masterDrug?.soDangKy || "",
            "ĐVT": m.masterDrug?.donViTinh || "",
            "Quy cách": m.masterDrug?.quyCach || ""
        }));

        exportMultiSheetExcelAdvanced([
            { sheetName: "Danh sách thuốc nội bộ đã duyệt", data: sheet1Data },
            { sheetName: "Danh mục dùng chung", data: sheet2Data }
        ], "Danh_Sach_Thuoc_Da_Duyet_Va_Mapping");

        toast.success("Đã xuất file Excel thành công");
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "PENDING_MAPPING":
                return <Badge className="bg-gray-100 text-gray-800">Chờ xử lý</Badge>;
            case "WAITING_APPROVAL":
                return <Badge className="bg-amber-100 text-amber-800">Chờ duyệt</Badge>;
            case "APPROVED":
                return <Badge className="bg-green-100 text-green-800">Đã duyệt</Badge>;
            case "AUTO_MAPPED":
                return <Badge className="bg-blue-100 text-blue-800">Tự động</Badge>;
            case "REJECTED":
                return <Badge className="bg-red-100 text-red-800">Từ chối</Badge>;
            default:
                return <Badge variant="secondary">{status}</Badge>;
        }
    };

    const pendingMappings = mappings.filter((m) => m.status === "PENDING_MAPPING");
    const waitingMappings = mappings.filter((m) => m.status === "WAITING_APPROVAL");
    const approvedMappings = mappings.filter((m) => m.status === "APPROVED" || m.status === "AUTO_MAPPED");
    const rejectedMappings = mappings.filter((m) => m.status === "REJECTED");
    const mappingsAIReviewEvidence = {
        summary: {
            total: mappings.length,
            pending: pendingMappings.length,
            waitingApproval: waitingMappings.length,
            approved: approvedMappings.length,
            rejected: rejectedMappings.length,
            missingInfo: mappings.filter((mapping) =>
                !mapping.hoatChatNoiBo || !mapping.soDangKyNoiBo || !mapping.donViTinhNoiBo || !mapping.nhomTckt
            ).length,
        },
        rows: [
            ...mappings
                .filter((mapping) => !mapping.hoatChatNoiBo || !mapping.soDangKyNoiBo || !mapping.donViTinhNoiBo || !mapping.nhomTckt)
                .slice(0, 30)
                .map((mapping) => ({
                    maNoiBo: mapping.maNoiBo,
                    tenThuocNoiBo: mapping.tenThuocNoiBo,
                    hoatChatNoiBo: mapping.hoatChatNoiBo,
                    soDangKyNoiBo: mapping.soDangKyNoiBo,
                    donViTinhNoiBo: mapping.donViTinhNoiBo,
                    nhomTckt: mapping.nhomTckt,
                    status: mapping.status,
                    type: "MISSING_INFO",
                })),
            ...rejectedMappings.slice(0, 30).map((mapping) => ({
                maNoiBo: mapping.maNoiBo,
                tenThuocNoiBo: mapping.tenThuocNoiBo,
                status: mapping.status,
                adminNote: mapping.adminNote,
                type: "REJECTED",
            })),
        ].slice(0, 30),
    };

    // Ids for disabled/locked statuses
    const LOCKED_STATUSES = ["WAITING_APPROVAL", "APPROVED"];
    const readyPendingMappings = pendingMappings.filter((m) => (m.masterDrug || m.isOutOfCatalog) && m.nhomTckt);

    // Use server-side results directly
    const filteredMasterDrugs = masterDrugs;

    const MappingTable = ({ items, showAction = false }: { items: DrugMapping[]; showAction?: boolean }) => (
        <TooltipProvider delayDuration={300}>
            <Table className={`${showAction ? "w-[1480px]" : "w-[1310px]"} table-fixed`}>
            <TableHeader>
                <TableRow className="bg-blue-600 hover:bg-blue-600">
                    <TableHead className="w-[115px] text-white font-bold">Mã nội bộ</TableHead>
                    <TableHead className="w-[180px] text-white font-bold">Tên thuốc nội bộ</TableHead>
                    <TableHead className="w-[110px] text-white font-bold">SĐK nội bộ</TableHead>
                    <TableHead className="w-[110px] text-white font-bold">Nhóm TCKT</TableHead>
                    <TableHead className="w-[110px] bg-emerald-50/50 text-white font-bold">Mã chung</TableHead>
                    <TableHead className="w-[180px] bg-emerald-50/50 text-white font-bold">Tên thuốc mapping</TableHead>
                    <TableHead className="w-[110px] bg-emerald-50/50 text-white font-bold">Hàm lượng</TableHead>
                    <TableHead className="w-[120px] bg-emerald-50/50 text-white font-bold">Dạng bào chế</TableHead>
                    <TableHead className="w-[120px] bg-emerald-50/50 text-white font-bold">SĐK mapping</TableHead>
                    <TableHead className="w-[150px] text-white font-bold">Trạng thái</TableHead>
                    {showAction && <TableHead className="w-[170px] text-right text-white font-bold">Thao tác</TableHead>}
                </TableRow>
            </TableHeader>
            <TableBody>
                {items.map((mapping) => (
                    <TableRow key={mapping.id}>
                        <TableCell>
                            <code className="px-2 py-1 bg-gray-100 rounded text-sm">{mapping.maNoiBo}</code>
                        </TableCell>
                        <TableCell className="w-[180px] max-w-[180px] whitespace-normal font-medium">
                            <CompactMappingText value={mapping.tenThuocNoiBo} lines={2} />
                        </TableCell>
                        <TableCell>{mapping.soDangKyNoiBo || "-"}</TableCell>
                        <TableCell>
                            {mapping.nhomTckt ? (
                                <Badge className="bg-indigo-100 text-indigo-700 border-0">{mapping.nhomTckt}</Badge>
                            ) : (
                                <div className="flex flex-col items-start gap-1.5">
                                    <Badge className="bg-amber-100 text-amber-700 border-0">Chưa thiết lập</Badge>
                                    <Button
                                        type="button"
                                        size="xs"
                                        variant="outline"
                                        className="border-amber-300 text-amber-700 hover:bg-amber-50"
                                        onClick={() => handleOpenNhomTcktDialog(mapping)}
                                    >
                                        Thiết lập
                                    </Button>
                                </div>
                            )}
                        </TableCell>
                        <TableCell className="bg-emerald-50/50">
                            {mapping.masterDrug ? (
                                <code className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded text-sm">
                                    {mapping.masterDrug.maChung}
                                </code>
                            ) : "-"}
                        </TableCell>
                        <TableCell className="w-[180px] max-w-[180px] whitespace-normal bg-emerald-50/50">
                            {mapping.isOutOfCatalog ? (
                                <CompactMappingText value="Ngoài danh mục" lines={1} className="text-amber-600 italic" />
                            ) : mapping.masterDrug ? (
                                <CompactMappingText value={mapping.masterDrug.tenThuoc} lines={2} className="text-emerald-600 font-medium" />
                            ) : (
                                <CompactMappingText value="Chưa mapping" lines={1} className="text-gray-400" />
                            )}
                        </TableCell>
                        <TableCell className="w-[110px] max-w-[110px] bg-emerald-50/50">
                            <CompactMappingText value={mapping.masterDrug?.hamLuong} />
                        </TableCell>
                        <TableCell className="w-[120px] max-w-[120px] bg-emerald-50/50">
                            <CompactMappingText value={mapping.masterDrug?.dangBaoChe} />
                        </TableCell>
                        <TableCell className="bg-emerald-50/50">
                            {mapping.masterDrug?.soDangKy || "-"}
                        </TableCell>
                        <TableCell>
                            {getStatusBadge(mapping.status)}
                            {mapping.adminNote && (
                                <p className="text-xs text-red-500 mt-1">Lý do: {mapping.adminNote}</p>
                            )}
                        </TableCell>
                        {showAction && (
                            <TableCell className="text-right">
                                {LOCKED_STATUSES.includes(mapping.status) ? (
                                    <div className="flex items-center justify-end gap-1 text-gray-400">
                                        <Lock className="w-3.5 h-3.5" />
                                        <span className="text-xs">
                                            {mapping.status === "WAITING_APPROVAL" ? "Đang chờ duyệt" : "Đã duyệt"}
                                        </span>
                                    </div>
                                ) : (
                                    <div className="flex justify-end gap-2">
                                        <Button size="sm" variant="outline" onClick={() => handleSelectMapping(mapping)}>
                                            Chọn mapping
                                        </Button>
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                            onClick={() => handleEditInfo(mapping)}
                                            title="Chỉnh sửa thông tin"
                                        >
                                            <Pencil className="w-4 h-4" />
                                        </Button>
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                            onClick={() => handleDelete(mapping.id)}
                                            title="Xóa"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                )}
                            </TableCell>
                        )}
                    </TableRow>
                ))}
                {items.length === 0 && (
                    <TableRow>
                        <TableCell colSpan={showAction ? 11 : 10} className="text-center text-gray-500 py-8">
                            Không có dữ liệu
                        </TableCell>
                    </TableRow>
                )}
            </TableBody>
            </Table>
        </TooltipProvider>
    );

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold text-gray-800">Quản lý danh mục thuốc</h2>
                    <p className="text-gray-500 mt-1">Ánh xạ thuốc nội bộ với danh mục dùng chung</p>
                </div>
                <div className="flex flex-wrap justify-end gap-2">
                    <AIReviewButton
                        surface="facility_mappings"
                        message="Kiểm tra danh mục thuốc nội bộ và ánh xạ hiện tại, nêu lỗi cần xử lý, cảnh báo nên kiểm tra và bước tiếp theo."
                        evidence={mappingsAIReviewEvidence}
                        disabled={isLoading || mappings.length === 0}
                        disabledReason="Cần có dữ liệu danh mục thuốc trước khi kiểm tra bằng AI"
                    />
                    <Button
                        variant="outline"
                        className="bg-white text-blue-600 border-blue-200 hover:bg-blue-50"
                        onClick={handleDownloadTemplate}
                    >
                        <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Tải mẫu Excel
                    </Button>
                    <div className="relative">
                        <input
                            id="excel-upload"
                            type="file"
                            accept=".xlsx, .xls"
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                            onChange={(e) => handleImport(e.target.files)}
                            disabled={isImporting}
                            title="Chọn file Excel"
                        />
                        <Button variant="outline" disabled={isImporting}>
                            {isImporting ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
                            ) : (
                                <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                </svg>
                            )}
                            Upload Excel
                        </Button>
                    </div>
                    <Button
                        className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
                        onClick={handleSubmitForApproval}
                        disabled={isProcessing || readyPendingMappings.length === 0}
                    >
                        <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Gửi duyệt lên Sở
                    </Button>
                </div>
            </div>

            {/* Rejection alert banner */}
            {rejectedMappings.length > 0 && (
                <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                        <p className="font-semibold text-red-800">
                            {rejectedMappings.length} thuốc bị từ chối — cần xử lý lại
                        </p>
                        <p className="text-sm text-red-600 mt-0.5">
                            Vào tab <span className="font-medium">"Từ chối"</span> để xem lý do và chọn lại ánh xạ phù hợp, sau đó gửi duyệt lại.
                        </p>
                    </div>
                    <Button
                        size="sm"
                        variant="outline"
                        className="shrink-0 text-red-600 border-red-300 hover:bg-red-100"
                        onClick={() => {
                            const tab = document.querySelector('[data-value="rejected"]') as HTMLButtonElement;
                            tab?.click();
                        }}
                    >
                        Xem ngay
                    </Button>
                </div>
            )}

            <Card className="border-0 shadow-lg">
                <CardHeader>
                    <CardTitle>Danh sách thuốc</CardTitle>
                    <CardDescription>Tổng cộng {mappings.length} thuốc trong danh mục nội bộ</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex items-center justify-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                        </div>
                    ) : (
                        <Tabs defaultValue="pending">
                            <TabsList>
                                <TabsTrigger value="pending">Chờ xử lý ({pendingMappings.length})</TabsTrigger>
                                <TabsTrigger value="waiting" data-value="waiting">
                                    Chờ duyệt ({waitingMappings.length})
                                    {waitingMappings.length > 0 && (
                                        <span className="ml-1.5 w-2 h-2 rounded-full bg-amber-500 inline-block" />
                                    )}
                                </TabsTrigger>
                                <TabsTrigger value="approved">Đã duyệt ({approvedMappings.length})</TabsTrigger>
                                <TabsTrigger value="rejected" data-value="rejected">
                                    Từ chối ({rejectedMappings.length})
                                    {rejectedMappings.length > 0 && (
                                        <span className="ml-1.5 w-2 h-2 rounded-full bg-red-500 inline-block" />
                                    )}
                                </TabsTrigger>
                            </TabsList>
                            <TabsContent value="pending" className="mt-4">
                                <MappingTable items={pendingMappings} showAction={true} />
                            </TabsContent>
                            <TabsContent value="waiting" className="mt-4">
                                {waitingMappings.length > 0 && (
                                    <div className="flex items-center justify-between mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                                        <div className="flex items-center gap-2 text-amber-800">
                                            <AlertCircle className="w-4 h-4" />
                                            <span className="text-sm font-medium">
                                                {waitingMappings.length} thuốc đang chờ Admin xét duyệt
                                            </span>
                                        </div>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="text-amber-700 border-amber-300 hover:bg-amber-100"
                                            onClick={handleRecall}
                                            disabled={isProcessing}
                                        >
                                            <RotateCcw className="w-4 h-4 mr-1.5" />
                                            Thu hồi yêu cầu
                                        </Button>
                                    </div>
                                )}
                                <MappingTable items={waitingMappings} />
                            </TabsContent>
                            <TabsContent value="approved" className="mt-4">
                                <div className="flex justify-end mb-4">
                                    <Button
                                        variant="outline"
                                        className="text-green-600 border-green-200 hover:bg-green-50"
                                        onClick={handleExportApproved}
                                    >
                                        <Download className="w-4 h-4 mr-2" />
                                        Xuất Excel Đã Duyệt
                                    </Button>
                                </div>
                                {approvedMappings.length > 0 && (
                                    <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
                                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                                        <span className="text-sm text-green-700">
                                            {approvedMappings.length} thuốc đã được phê duyệt và sẵn sàng báo cáo
                                        </span>
                                    </div>
                                )}
                                <MappingTable items={approvedMappings} />
                            </TabsContent>
                            <TabsContent value="rejected" className="mt-4">
                                {rejectedMappings.length > 0 && (
                                    <div className="mb-4 space-y-2">
                                        {rejectedMappings.map((m) => m.adminNote && (
                                            <div key={m.id} className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                                                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                                                <div className="text-sm">
                                                    <span className="font-semibold text-red-800">{m.tenThuocNoiBo}</span>
                                                    <span className="text-red-600 ml-2">— Lý do: {m.adminNote}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                <MappingTable items={rejectedMappings} showAction={true} />
                            </TabsContent>
                        </Tabs>
                    )}
                </CardContent>
            </Card>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="!max-w-[95vw] w-[95vw] h-[95vh] flex flex-col sm:max-w-[95vw]">
                    <DialogHeader>
                        <DialogTitle>Chọn ánh xạ thuốc</DialogTitle>
                        <DialogDescription>
                            Tìm và chọn thuốc tương ứng trong danh mục dùng chung
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid grid-cols-12 gap-6 flex-1 overflow-hidden min-h-0 pt-4">
                        {/* Left Column: Local Info & Settings */}
                        <div className="col-span-4 flex flex-col gap-4 overflow-y-auto pr-2 border-r">
                            <div className="p-4 bg-gray-50 rounded-lg border">
                                <h4 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    Thông tin thuốc nội bộ
                                </h4>
                                <div className="space-y-3">
                                    <div>
                                        <span className="text-xs text-gray-500 uppercase font-semibold">Tên thuốc</span>
                                        <div className="font-medium text-gray-900 mt-0.5">{selectedMapping?.tenThuocNoiBo}</div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <span className="text-xs text-gray-500 uppercase font-semibold">Mã nội bộ</span>
                                            <div className="mt-0.5"><code className="px-1.5 py-0.5 bg-gray-200 rounded text-sm font-medium">{selectedMapping?.maNoiBo}</code></div>
                                        </div>
                                        <div>
                                            <span className="text-xs text-gray-500 uppercase font-semibold">Đơn vị tính</span>
                                            <div className="mt-0.5 text-sm">{selectedMapping?.donViTinhNoiBo || "-"}</div>
                                        </div>
                                    </div>
                                    <div>
                                        <span className="text-xs text-gray-500 uppercase font-semibold">Hoạt chất</span>
                                        <div className="mt-0.5 text-sm">{selectedMapping?.hoatChatNoiBo || "-"}</div>
                                    </div>
                                    <div>
                                        <span className="text-xs text-gray-500 uppercase font-semibold">Số đăng ký</span>
                                        <div className="mt-0.5 text-sm">{selectedMapping?.soDangKyNoiBo || "-"}</div>
                                    </div>
                                </div>
                            </div>

                            <div className="p-4 rounded-lg border border-amber-200 bg-amber-50">
                                <div className="flex items-start gap-3">
                                    <input
                                        type="checkbox"
                                        id="outOfCatalog"
                                        checked={isOutOfCatalog}
                                        onChange={(e) => {
                                            setIsOutOfCatalog(e.target.checked);
                                            if (e.target.checked) setSelectedMasterDrugId("");
                                        }}
                                        className="mt-1 w-4 h-4 text-amber-600 focus:ring-amber-500 border-gray-300 rounded"
                                    />
                                    <div>
                                        <label htmlFor="outOfCatalog" className="text-sm font-medium text-amber-900 block">
                                            Thuốc ngoài danh mục dùng chung
                                        </label>
                                        <p className="text-xs text-amber-700 mt-1">
                                            Chọn mục này nếu thuốc không có trong danh mục của Sở/Bộ Y tế.
                                            Thuốc này sẽ được theo dõi riêng.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right Column: Search & Master List */}
                        <div className="col-span-8 flex flex-col gap-4 overflow-hidden h-full">
                            {!isOutOfCatalog ? (
                                <>
                                    <div className="relative">
                                        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                        </svg>
                                        <Input
                                            className="pl-9 bg-white"
                                            placeholder="Tìm kiếm trong danh mục dùng chung (Tên thuốc, Mã chung, SĐK, Hoạt chất)..."
                                            value={searchMaster}
                                            onChange={(e) => setSearchMaster(e.target.value)}
                                        />
                                    </div>

                                    <div className="flex-1 overflow-auto border rounded-lg bg-white shadow-sm">
                                        <Table>
                                            <TableHeader className="sticky top-0 bg-gray-50 z-10">
                                                <TableRow>
                                                    <TableHead className="w-[100px]">Mã chung</TableHead>
                                                    <TableHead>Tên thuốc</TableHead>
                                                    <TableHead>Hoạt chất / Hàm lượng</TableHead>
                                                    <TableHead>SĐK / ĐVT</TableHead>
                                                    <TableHead className="w-[80px] text-right">Thao tác</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {filteredMasterDrugs.slice(0, 50).map((drug) => (
                                                    <TableRow
                                                        key={drug.id}
                                                        className={`
                                                            cursor-pointer transition-colors
                                                            ${selectedMasterDrugId === drug.id ? "bg-blue-50 hover:bg-blue-100" : "hover:bg-gray-50"}
                                                        `}
                                                        onClick={() => setSelectedMasterDrugId(drug.id)}
                                                    >
                                                        <TableCell className="align-top">
                                                            <code className="block px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded text-xs whitespace-nowrap mb-1">
                                                                {drug.maChung}
                                                            </code>
                                                            {drug.maBhyt && <div className="text-xs text-gray-500">{drug.maBhyt}</div>}
                                                        </TableCell>
                                                        <TableCell className="align-top">
                                                            <div className="font-medium text-sm text-gray-900">{drug.tenThuoc}</div>
                                                        </TableCell>
                                                        <TableCell className="align-top">
                                                            <div className="text-sm">{drug.hoatChat}</div>
                                                            <div className="text-xs text-gray-500 mt-0.5">{drug.hamLuong}</div>
                                                        </TableCell>
                                                        <TableCell className="align-top">
                                                            <div className="text-sm font-medium">{drug.soDangKy}</div>
                                                            <div className="text-xs text-gray-500 mt-0.5">{drug.donViTinh} - {drug.quyCach}</div>
                                                        </TableCell>
                                                        <TableCell className="text-right align-top">
                                                            {selectedMasterDrugId === drug.id && (
                                                                <div className="flex justify-end">
                                                                    <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white">
                                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                                        </svg>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                                {filteredMasterDrugs.length === 0 && (
                                                    <TableRow>
                                                        <TableCell colSpan={5} className="text-center text-gray-500 py-12">
                                                            <div className="flex flex-col items-center gap-2">
                                                                <svg className="w-10 h-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                                                </svg>
                                                                <span className="font-medium">Không tìm thấy thuốc phù hợp</span>
                                                                <span className="text-sm">Thử tìm bằng từ khóa khác hoặc kiểm tra lại bộ lọc</span>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                )}
                                            </TableBody>
                                        </Table>
                                    </div>
                                    <div className="text-xs text-gray-500 text-right">
                                        Hiển thị {Math.min(filteredMasterDrugs.length, 50)} / {filteredMasterDrugs.length} kết quả
                                    </div>
                                </>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                                    <div className="p-4 bg-white rounded-full shadow-sm mb-4">
                                        <svg className="w-8 h-8 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                        </svg>
                                    </div>
                                    <h3 className="font-medium text-gray-900">Đã chọn: Ngoài danh mục</h3>
                                    <p className="text-sm text-gray-500 mt-1 max-w-sm text-center">
                                        Thuốc này sẽ không được ánh xạ với danh mục dùng chung.
                                        Bạn có thể thay đổi tùy chọn này bằng cách bỏ chọn ô bên trái.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    <DialogFooter className="pt-4 border-t">
                        <Button variant="ghost" onClick={() => setIsDialogOpen(false)}>
                            Hủy bỏ
                        </Button>
                        <Button
                            onClick={handleSaveMapping}
                            disabled={isProcessing || (!isOutOfCatalog && !selectedMasterDrugId)}
                            className={!isOutOfCatalog && !selectedMasterDrugId ? "opacity-50" : ""}
                        >
                            {isProcessing ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                    Đang lưu...
                                </>
                            ) : (
                                "Lưu ánh xạ"
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Dialog Edit Info */}
            <Dialog open={isEditInfoDialogOpen} onOpenChange={setIsEditInfoDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Chỉnh sửa thông tin thuốc</DialogTitle>
                        <DialogDescription>
                            Cập nhật thông tin thuốc nội bộ (nếu có sai sót khi nhập)
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="grid grid-cols-2 gap-4">
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
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsEditInfoDialogOpen(false)}>Hủy</Button>
                        <Button onClick={handleSaveInfo} disabled={isProcessing}>
                            {isProcessing ? "Đang lưu..." : "Lưu thay đổi"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Dialog Setup Nhóm TCKT */}
            <Dialog open={isNhomTcktDialogOpen} onOpenChange={setIsNhomTcktDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Thiết lập Nhóm TCKT</DialogTitle>
                        <DialogDescription>
                            Nhóm TCKT cố định theo mã nội bộ. Sau khi lưu, cơ sở không thể tự thay đổi lại.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="rounded-lg border bg-slate-50 p-3 text-sm">
                            <p className="text-slate-500">Mã nội bộ</p>
                            <p className="font-semibold text-slate-900">{selectedMapping?.maNoiBo}</p>
                            <p className="mt-2 text-slate-500">Tên thuốc</p>
                            <p className="font-medium text-slate-900">{selectedMapping?.tenThuocNoiBo}</p>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Nhóm TCKT</label>
                            <Select value={nhomTcktDraft} onValueChange={setNhomTcktDraft}>
                                <SelectTrigger className="bg-white">
                                    <SelectValue placeholder="Chọn nhóm..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {NHOM_TCKT_OPTIONS.map((option) => (
                                        <SelectItem key={option} value={option}>{option}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsNhomTcktDialogOpen(false)}>Hủy</Button>
                        <Button onClick={handleSaveNhomTckt} disabled={isProcessing || !nhomTcktDraft}>
                            {isProcessing ? "Đang lưu..." : "Lưu Nhóm TCKT"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Import Error Report Dialog */}
            <Dialog open={isErrorDialogOpen} onOpenChange={setIsErrorDialogOpen}>
                <DialogContent className="!max-w-[700px] w-full max-h-[85vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-red-700">
                            <FileWarning className="w-5 h-5" />
                            Báo cáo lỗi nhập liệu
                        </DialogTitle>
                        <DialogDescription>
                            Kết quả xử lý file Excel — có một số dòng cần kiểm tra lại
                        </DialogDescription>
                    </DialogHeader>

                    {/* Summary cards */}
                    <div className="grid grid-cols-4 gap-3 py-3">
                        <div className="p-3 bg-gray-50 rounded-lg text-center border">
                            <div className="text-lg font-bold text-gray-800">{importSummary.total}</div>
                            <div className="text-xs text-gray-500">Tổng dòng</div>
                        </div>
                        <div className="p-3 bg-green-50 rounded-lg text-center border border-green-200">
                            <div className="text-lg font-bold text-green-700">{importSummary.success}</div>
                            <div className="text-xs text-green-600">Thành công</div>
                        </div>
                        <div className="p-3 bg-red-50 rounded-lg text-center border border-red-200">
                            <div className="text-lg font-bold text-red-700">{importSummary.errors}</div>
                            <div className="text-xs text-red-600">Lỗi</div>
                        </div>
                        <div className="p-3 bg-amber-50 rounded-lg text-center border border-amber-200">
                            <div className="text-lg font-bold text-amber-700">{importSummary.skipped}</div>
                            <div className="text-xs text-amber-600">Bỏ qua</div>
                        </div>
                    </div>

                    {/* Error table */}
                    <div className="flex-1 overflow-auto border rounded-lg">
                        <Table>
                            <TableHeader className="sticky top-0 bg-gray-50 z-10">
                                <TableRow>
                                    <TableHead className="w-[70px]">Dòng</TableHead>
                                    <TableHead className="w-[120px]">Mã nội bộ</TableHead>
                                    <TableHead className="w-[80px]">Loại</TableHead>
                                    <TableHead>Mô tả lỗi</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {importErrors.map((err, idx) => (
                                    <TableRow key={idx} className={err.type === 'error' ? 'bg-red-50/50' : err.type === 'skip' ? 'bg-amber-50/50' : ''}>
                                        <TableCell>
                                            <code className="px-1.5 py-0.5 bg-gray-100 rounded text-sm font-mono">{err.row}</code>
                                        </TableCell>
                                        <TableCell>
                                            {err.maNoiBo ? (
                                                <code className="px-1.5 py-0.5 bg-gray-100 rounded text-sm">{err.maNoiBo}</code>
                                            ) : (
                                                <span className="text-gray-400 italic text-sm">—</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {err.type === 'error' ? (
                                                <Badge className="bg-red-100 text-red-700 text-xs">Lỗi</Badge>
                                            ) : (
                                                <Badge className="bg-amber-100 text-amber-700 text-xs">Bỏ qua</Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-sm">{err.message}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>

                    <DialogFooter className="pt-3 border-t">
                        <p className="text-xs text-gray-500 flex-1">
                            Vui lòng sửa file Excel và upload lại các dòng bị lỗi
                        </p>
                        <Button variant="outline" onClick={() => setIsErrorDialogOpen(false)}>
                            Đóng
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
