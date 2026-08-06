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
import { Pencil, Trash2, Download, RotateCcw, AlertCircle, CheckCircle2, Lock, FileWarning, Upload, PowerOff, RefreshCw, ArrowRight } from "lucide-react";
import { readExcel, readExcelRequiredSheet, exportMultiSheetExcelAdvanced } from "@/lib/excel";
import {
    NHOM_TCKT_OPTIONS,
    compareReportDates,
    isCategoryMarked,
    normalizeNhomTckt,
    parseStrictNumber,
    parseReportDateValue,
} from "@/lib/report-validation";

const APPROVED_MAPPING_SHEET_NAME = "Danh sách thuốc nội bộ đã duyệt";

const APPROVED_MAPPING_IMPORT_COLUMNS = [
    { label: "Mã nội bộ", aliases: ["Mã nội bộ", "Ma noi bo", "maNoiBo", "MaNoiBo"] },
    { label: "Tên thuốc nội bộ", aliases: ["Tên thuốc nội bộ", "Ten thuoc noi bo", "tenThuocNoiBo", "TenThuocNoiBo"] },
    { label: "Hoạt chất nội bộ", aliases: ["Hoạt chất nội bộ", "Hoat chat noi bo", "hoatChatNoiBo", "HoatChatNoiBo"] },
    { label: "SĐK nội bộ", aliases: ["SĐK nội bộ", "SDK noi bo", "SĐK", "SDK", "soDangKyNoiBo", "SoDangKyNoiBo"] },
    { label: "ĐVT nội bộ", aliases: ["ĐVT nội bộ", "DVT noi bo", "ĐVT", "DVT", "donViTinhNoiBo", "DonViTinhNoiBo"] },
    { label: "Nhóm TCKT", aliases: ["Nhóm TCKT", "Nhom TCKT", "nhomTckt", "NhomTCKT"] },
] as const;

interface DrugMapping {
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
    demandRoundingEnabled: boolean;
    demandPackageUnit: string | null;
    demandPackageSize: number | string | null;
    demandPlanningLocked: boolean;
    demandPlanningLockedAt: string | null;
    demandPlanningUnlockedAt: string | null;
    demandPlanningLockReason: string | null;
    status: string;
    adminNote: string | null;
    isOutOfCatalog: boolean;
    isActive: boolean;
    inactiveFromMonth: string | null;
    inactiveReason: string | null;
    inactiveAt: string | null;
    reactivatedFromMonth: string | null;
    reactivatedAt: string | null;
    reportCount?: number;
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

type ImportIssue = {
    row: number;
    maNoiBo: string;
    message: string;
    type: "error" | "warning" | "skip";
};

const getCurrentReportMonth = () => {
    const now = new Date();
    return `${String(now.getMonth() + 1).padStart(2, "0")}/${now.getFullYear()}`;
};

function getExcelCell(row: Record<string, unknown>, aliases: readonly string[]) {
    for (const alias of aliases) {
        if (Object.prototype.hasOwnProperty.call(row, alias)) {
            return row[alias];
        }
    }

    return "";
}

function hasAnyColumn(row: Record<string, unknown>, aliases: readonly string[]) {
    return aliases.some((alias) => Object.prototype.hasOwnProperty.call(row, alias));
}

const normalizeMappingCategory = (value: unknown) => {
    const text = String(value ?? "").trim();
    if (!text) return { value: null, valid: true };
    return { value: isCategoryMarked(text) ? "X" : text, valid: isCategoryMarked(text) };
};

const formatMappingGiaVat = (value: number | string | null | undefined) =>
    Number(value || 0).toLocaleString("vi-VN");

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
    const [isNhomTcktImporting, setIsNhomTcktImporting] = useState(false);
    const [searchMaster, setSearchMaster] = useState("");
    const [searchMasterField, setSearchMasterField] = useState<"soDangKy" | "tenThuoc">("soDangKy");
    const [isNhomTcktDialogOpen, setIsNhomTcktDialogOpen] = useState(false);
    const [nhomTcktDraft, setNhomTcktDraft] = useState("");
    const [isLifecycleDialogOpen, setIsLifecycleDialogOpen] = useState(false);
    const [lifecycleAction, setLifecycleAction] = useState<"deactivate" | "reactivate">("deactivate");
    const [lifecycleEffectiveMonth, setLifecycleEffectiveMonth] = useState(getCurrentReportMonth());
    const [lifecycleReason, setLifecycleReason] = useState("");
    const [isDemandLockDialogOpen, setIsDemandLockDialogOpen] = useState(false);
    const [nextDemandLockState, setNextDemandLockState] = useState(false);
    const [demandLockReason, setDemandLockReason] = useState("");

    // Import error reporting
    const [importErrors, setImportErrors] = useState<ImportIssue[]>([]);
    const [isErrorDialogOpen, setIsErrorDialogOpen] = useState(false);
    const [importSummary, setImportSummary] = useState<{ total: number; success: number; errors: number; skipped: number }>({ total: 0, success: 0, errors: 0, skipped: 0 });
    const [importDialogTitle, setImportDialogTitle] = useState("Báo cáo lỗi nhập liệu");
    const [importDialogDescription, setImportDialogDescription] = useState("Kết quả xử lý file Excel — có một số dòng cần kiểm tra lại");

    // New state for editing internal info
    const [isEditInfoDialogOpen, setIsEditInfoDialogOpen] = useState(false);
    const [isDemandRoundingDialogOpen, setIsDemandRoundingDialogOpen] = useState(false);
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
        demandRoundingEnabled: false,
        demandPackageUnit: "",
        demandPackageSize: "",
    });
    const [demandRoundingForm, setDemandRoundingForm] = useState({
        enabled: false,
        packageUnit: "",
        packageSize: "",
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
    const fetchMasterDrugs = useCallback(async (search: string, searchField: "soDangKy" | "tenThuoc") => {
        try {
            const params = new URLSearchParams();
            params.set("limit", "50"); // Fetch top 50 matches
            params.set("searchField", searchField);
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
            fetchMasterDrugs(searchMaster, searchMasterField);
        }, 500); // 500ms debounce

        return () => clearTimeout(timer);
    }, [searchMaster, searchMasterField, fetchMasterDrugs]);

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
            giaVat: String(mapping.giaVat ?? ""),
            bhyt: mapping.bhyt || "",
            dichVu: mapping.dichVu || "",
            soQdTrungThau: mapping.soQdTrungThau || "",
            tenCongTy: mapping.tenCongTy || "",
            ngayBatDauHd: mapping.ngayBatDauHd || "",
            ngayKetThucHd: mapping.ngayKetThucHd || "",
            demandRoundingEnabled: Boolean(mapping.demandRoundingEnabled),
            demandPackageUnit: mapping.demandPackageUnit || "",
            demandPackageSize:
                mapping.demandPackageSize === null || mapping.demandPackageSize === undefined
                    ? ""
                    : String(mapping.demandPackageSize),
        });
        setIsEditInfoDialogOpen(true);
    };

    const handleOpenDemandRoundingDialog = (mapping: DrugMapping) => {
        setSelectedMapping(mapping);
        setDemandRoundingForm({
            enabled: Boolean(mapping.demandRoundingEnabled),
            packageUnit: mapping.demandPackageUnit || "",
            packageSize:
                mapping.demandPackageSize === null || mapping.demandPackageSize === undefined
                    ? ""
                    : String(mapping.demandPackageSize),
        });
        setIsDemandRoundingDialogOpen(true);
    };

    const handleSaveDemandRounding = async () => {
        if (!selectedMapping) return;

        const packageSize = parseStrictNumber(demandRoundingForm.packageSize);
        const packageUnit = demandRoundingForm.packageUnit.trim();

        if (demandRoundingForm.enabled && !packageUnit) {
            toast.error("Vui lòng nhập đơn vị quy cách dự trù");
            return;
        }

        if (
            demandRoundingForm.enabled &&
            (!packageSize.valid || packageSize.blank || packageSize.value <= 0)
        ) {
            toast.error("Số lượng trong 1 quy cách phải lớn hơn 0");
            return;
        }

        setIsProcessing(true);
        try {
            const res = await fetch(`/api/facility/mappings/${selectedMapping.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    demandRoundingEnabled: demandRoundingForm.enabled,
                    demandPackageUnit: packageUnit || null,
                    demandPackageSize:
                        demandRoundingForm.enabled && packageSize.valid
                            ? packageSize.value
                            : null,
                }),
            });

            if (res.ok) {
                toast.success("Đã cập nhật quy cách dự trù");
                setIsDemandRoundingDialogOpen(false);
                fetchMappings();
                return;
            }

            const errorData = await res.json().catch(() => null);
            toast.error(errorData?.message || "Không thể cập nhật quy cách dự trù");
        } catch {
            toast.error("Đã xảy ra lỗi");
        } finally {
            setIsProcessing(false);
        }
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
            const res = await fetch(`/api/facility/mappings/${selectedMapping.id}`, {
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

            if (res.ok) {
                toast.success("Đã cập nhật thông tin thuốc");
                setIsEditInfoDialogOpen(false);
                fetchMappings();
            } else {
                const errorData = await res.json().catch(() => null);
                toast.error(errorData?.message || "Không thể cập nhật thông tin");
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

    const handleOpenLifecycleDialog = (mapping: DrugMapping, action: "deactivate" | "reactivate") => {
        setSelectedMapping(mapping);
        setLifecycleAction(action);
        setLifecycleEffectiveMonth(getCurrentReportMonth());
        setLifecycleReason("");
        setIsLifecycleDialogOpen(true);
    };

    const handleSaveLifecycle = async () => {
        if (!selectedMapping) return;

        if (!/^(0[1-9]|1[0-2])\/\d{4}$/.test(lifecycleEffectiveMonth.trim())) {
            toast.error("Tháng hiệu lực phải theo định dạng MM/YYYY");
            return;
        }

        setIsProcessing(true);
        try {
            const res = await fetch(`/api/facility/mappings/${selectedMapping.id}/lifecycle`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: lifecycleAction,
                    effectiveMonth: lifecycleEffectiveMonth.trim(),
                    reason: lifecycleReason,
                }),
            });

            const data = await res.json().catch(() => null);
            if (!res.ok) {
                toast.error(data?.message || "Không thể cập nhật trạng thái sử dụng thuốc");
                return;
            }

            toast.success(lifecycleAction === "deactivate" ? "Đã ngừng sử dụng thuốc" : "Đã kích hoạt lại thuốc");
            setIsLifecycleDialogOpen(false);
            fetchMappings();
        } catch {
            toast.error("Đã xảy ra lỗi");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleOpenDemandLockDialog = (mapping: DrugMapping, locked: boolean) => {
        setSelectedMapping(mapping);
        setNextDemandLockState(locked);
        setDemandLockReason("");
        setIsDemandLockDialogOpen(true);
    };

    const handleSaveDemandLock = async () => {
        if (!selectedMapping) return;

        setIsProcessing(true);
        try {
            const res = await fetch(`/api/facility/mappings/${selectedMapping.id}/demand-lock`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    locked: nextDemandLockState,
                    reason: demandLockReason,
                }),
            });

            const data = await res.json().catch(() => null);
            if (!res.ok) {
                toast.error(data?.message || "Không thể cập nhật trạng thái dự trù");
                return;
            }

            toast.success(nextDemandLockState ? "Đã khóa dự trù thuốc" : "Đã mở dự trù thuốc");
            setIsDemandLockDialogOpen(false);
            fetchMappings();
        } catch {
            toast.error("Đã xảy ra lỗi");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDelete = async (mapping: DrugMapping) => {
        const isApprovedMapping = mapping.status === "APPROVED" || mapping.status === "AUTO_MAPPED";
        const confirmMessage = isApprovedMapping
            ? "Thuốc đã duyệt này chưa có báo cáo XNT. Bạn có chắc muốn xóa khỏi danh mục?"
            : "Bạn có chắc chắn muốn xóa thuốc này không?";

        if (!confirm(confirmMessage)) return;

        // Optimistic Delete
        const previousMappings = [...mappings];
        setMappings(prev => prev.filter(m => m.id !== mapping.id));

        try {
            const res = await fetch(`/api/facility/mappings/${mapping.id}`, {
                method: "DELETE",
            });

            if (res.ok) {
                toast.success("Đã xóa thuốc khỏi danh sách");
            } else {
                const errorData = await res.json().catch(() => null);
                setMappings(previousMappings);
                toast.error(errorData?.message || "Không thể xóa thuốc");
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
                "Nhóm TCKT",
                "Không",
                "Danh mục",
                `Nếu xác định được nhóm, chỉ nhập một trong: ${NHOM_TCKT_OPTIONS.join(", ")}. Nếu không xác định được thì để trống.`,
                "Nhóm 1"
            ],
            [
                "Giá VAT (*)",
                "Có",
                "Số",
                "Đơn giá bao gồm VAT, cố định theo thuốc trong quá trình báo cáo XNT. Không được nhập âm.",
                "25000"
            ],
            [
                "BHYT",
                "Có điều kiện",
                "X hoặc trống",
                "Nhập X nếu thuốc thuộc nhóm BHYT. Phải đánh dấu X ở ít nhất một trong hai cột BHYT hoặc Dịch vụ.",
                "X"
            ],
            [
                "Dịch vụ",
                "Có điều kiện",
                "X hoặc trống",
                "Nhập X nếu thuốc thuộc nhóm Dịch vụ. Có thể đánh dấu cả BHYT và Dịch vụ nếu thuốc dùng cho cả hai.",
                ""
            ],
            [
                "Số QĐ trúng thầu",
                "Không",
                "Văn bản (Text)",
                "Số quyết định trúng thầu/hợp đồng gắn với thuốc và mã nội bộ này. Hệ thống sẽ tự đưa sang báo cáo XNT.",
                "123/QĐ-BV"
            ],
            [
                "Tên Công ty",
                "Không",
                "Văn bản (Text)",
                "Tên công ty cung cấp thuốc. Hệ thống sẽ tự đưa sang báo cáo XNT.",
                "Công ty TNHH ABC"
            ],
            [
                "Ngày bắt đầu HĐ",
                "Không",
                "Văn bản dạng YYYYMMDD",
                "Ngày bắt đầu hiệu lực hợp đồng. Để trống nếu chưa có.",
                "20260101"
            ],
            [
                "Ngày kết thúc HĐ",
                "Không",
                "Văn bản dạng YYYYMMDD",
                "Ngày kết thúc hợp đồng. Không được nhỏ hơn Ngày bắt đầu HĐ.",
                "20261231"
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
                "Nhóm TCKT": "Nhóm 1",
                "Giá VAT": 25000,
                "BHYT": "X",
                "Dịch vụ": "",
                "Số QĐ trúng thầu": "123/QĐ-BV",
                "Tên Công ty": "Công ty TNHH ABC",
                "Ngày bắt đầu HĐ": "20260101",
                "Ngày kết thúc HĐ": "20261231"
            },
            {
                "Mã nội bộ": "T002",
                "Tên thuốc": "Vitamin C 500mg",
                "Hoạt chất": "Ascorbic acid",
                "Số đăng ký": "",
                "Đơn vị tính": "Viên",
                "Nhóm TCKT": "",
                "Giá VAT": 12000,
                "BHYT": "",
                "Dịch vụ": "X",
                "Số QĐ trúng thầu": "",
                "Tên Công ty": "",
                "Ngày bắt đầu HĐ": "",
                "Ngày kết thúc HĐ": ""
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
                [{ wch: 15 }, { wch: 30 }, { wch: 20 }, { wch: 18 }, { wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 8 }, { wch: 8 }, { wch: 20 }, { wch: 28 }, { wch: 16 }, { wch: 16 }],
            ]
        );
        toast.success("Đã tải xuống file mẫu");
    };

    const handleImport = async (files: FileList | null) => {
        if (!files || files.length === 0) return;

        const file = files[0];
        setIsImporting(true);
        setImportDialogTitle("Báo cáo lỗi nhập liệu");
        setImportDialogDescription("Kết quả xử lý file Excel — có một số dòng cần kiểm tra lại");
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
                const giaVatRaw = row['Giá VAT'] ?? row['Gia VAT'] ?? row['giaVat'] ?? row['GiaVat'] ?? '';
                const bhytRaw = row['BHYT'] || row['bhyt'] || '';
                const dichVuRaw = row['Dịch vụ'] || row['Dich vu'] || row['dichVu'] || row['DichVu'] || '';
                const soQdTrungThau = row['Số QĐ trúng thầu'] || row['Số QĐ TT'] || row['soQdTrungThau'] || row['SoQdTrungThau'] || '';
                const tenCongTy = row['Tên Công ty'] || row['Tên công ty'] || row['tenCongTy'] || row['TenCongTy'] || '';
                const ngayBatDauHdRaw = row['Ngày bắt đầu HĐ'] || row['Ngày BĐ HĐ'] || row['ngayBatDauHd'] || row['NgayBatDauHd'] || '';
                const ngayKetThucHdRaw = row['Ngày kết thúc HĐ'] || row['Ngày KT HĐ'] || row['ngayKetThucHd'] || row['NgayKetThucHd'] || '';
                const nhomTcktText = String(nhomTcktRaw).trim();
                const nhomTckt = normalizeNhomTckt(nhomTcktRaw);
                const giaVat = parseStrictNumber(giaVatRaw);
                const bhyt = normalizeMappingCategory(bhytRaw);
                const dichVu = normalizeMappingCategory(dichVuRaw);
                const ngayBatDauHd = parseReportDateValue(ngayBatDauHdRaw);
                const ngayKetThucHd = parseReportDateValue(ngayKetThucHdRaw);

                const maNoiBoStr = String(maNoiBo).trim();
                const tenThuocStr = String(tenThuocNoiBo).trim();

                // Validate required fields
                if (!maNoiBoStr) {
                    clientErrors.push({ row: rowNum, maNoiBo: '', message: 'Thiếu mã nội bộ (bắt buộc)', type: 'error' });
                }
                if (!tenThuocStr) {
                    clientErrors.push({ row: rowNum, maNoiBo: maNoiBoStr, message: 'Thiếu tên thuốc (bắt buộc)', type: 'error' });
                }
                if (nhomTcktText && !nhomTckt) {
                    clientErrors.push({
                        row: rowNum,
                        maNoiBo: maNoiBoStr,
                        message: `Nhóm TCKT không hợp lệ. Nếu có nhập, chỉ được nhập: ${NHOM_TCKT_OPTIONS.join(", ")}`,
                        type: 'error',
                    });
                }
                if (!giaVat.valid || giaVat.blank || giaVat.value < 0) {
                    clientErrors.push({
                        row: rowNum,
                        maNoiBo: maNoiBoStr,
                        message: giaVat.blank
                            ? 'Thiếu Giá VAT (bắt buộc)'
                            : giaVat.value < 0
                                ? 'Giá VAT không được âm'
                                : 'Giá VAT phải là số hợp lệ',
                        type: 'error',
                    });
                }
                if (!bhyt.valid) {
                    clientErrors.push({
                        row: rowNum,
                        maNoiBo: maNoiBoStr,
                        message: 'BHYT chỉ được nhập "X" hoặc để trống',
                        type: 'error',
                    });
                }
                if (!dichVu.valid) {
                    clientErrors.push({
                        row: rowNum,
                        maNoiBo: maNoiBoStr,
                        message: 'Dịch vụ chỉ được nhập "X" hoặc để trống',
                        type: 'error',
                    });
                }
                if (bhyt.valid && dichVu.valid && !bhyt.value && !dichVu.value) {
                    clientErrors.push({
                        row: rowNum,
                        maNoiBo: maNoiBoStr,
                        message: 'Phải đánh dấu X ở ít nhất một trong hai cột BHYT hoặc Dịch vụ',
                        type: 'error',
                    });
                }
                if (!ngayBatDauHd.valid) {
                    clientErrors.push({
                        row: rowNum,
                        maNoiBo: maNoiBoStr,
                        message: 'Ngày bắt đầu HĐ phải theo định dạng YYYYMMDD và là ngày hợp lệ',
                        type: 'error',
                    });
                }
                if (!ngayKetThucHd.valid) {
                    clientErrors.push({
                        row: rowNum,
                        maNoiBo: maNoiBoStr,
                        message: 'Ngày kết thúc HĐ phải theo định dạng YYYYMMDD và là ngày hợp lệ',
                        type: 'error',
                    });
                }
                if (
                    ngayBatDauHd.valid
                    && ngayKetThucHd.valid
                    && ngayBatDauHd.value
                    && ngayKetThucHd.value
                    && compareReportDates(ngayBatDauHd.value, ngayKetThucHd.value) > 0
                ) {
                    clientErrors.push({
                        row: rowNum,
                        maNoiBo: maNoiBoStr,
                        message: 'Ngày bắt đầu HĐ không được lớn hơn Ngày kết thúc HĐ',
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
                    nhomTckt: nhomTcktText || null,
                    giaVat: giaVat.value,
                    bhyt: bhyt.value,
                    dichVu: dichVu.value,
                    soQdTrungThau: String(soQdTrungThau).trim() || null,
                    tenCongTy: String(tenCongTy).trim() || null,
                    ngayBatDauHd: ngayBatDauHd.value,
                    ngayKetThucHd: ngayKetThucHd.value,
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
            "Giá VAT": Number(m.giaVat || 0),
            "BHYT": m.bhyt || "",
            "Dịch vụ": m.dichVu || "",
            "Số QĐ trúng thầu": m.soQdTrungThau || "",
            "Tên Công ty": m.tenCongTy || "",
            "Ngày bắt đầu HĐ": m.ngayBatDauHd || "",
            "Ngày kết thúc HĐ": m.ngayKetThucHd || "",
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

    const handleImportApprovedNhomTckt = async (files: FileList | null) => {
        if (!files || files.length === 0) return;

        const file = files[0];
        setIsNhomTcktImporting(true);
        setImportDialogTitle("Báo cáo cập nhật Nhóm TCKT");
        setImportDialogDescription("Kết quả xử lý file Excel đã duyệt — có một số dòng cần kiểm tra lại");
        const toastId = toast.loading("Đang đọc file Excel đã duyệt...");

        try {
            const rawData = await readExcelRequiredSheet(file, APPROVED_MAPPING_SHEET_NAME) as Record<string, unknown>[];

            if (rawData.length === 0) {
                toast.error("File Excel trống hoặc sheet đã duyệt không có dữ liệu", { id: toastId });
                return;
            }

            const firstRow = rawData[0];
            const missingColumns = APPROVED_MAPPING_IMPORT_COLUMNS
                .filter((column) => !hasAnyColumn(firstRow, column.aliases))
                .map((column) => column.label);

            if (missingColumns.length > 0) {
                toast.error(`File thiếu cột bắt buộc: ${missingColumns.join(", ")}`, { id: toastId });
                return;
            }

            const rows = rawData.map((row, idx) => ({
                _rowIndex: idx + 2,
                maNoiBo: String(getExcelCell(row, APPROVED_MAPPING_IMPORT_COLUMNS[0].aliases)).trim(),
                tenThuocNoiBo: String(getExcelCell(row, APPROVED_MAPPING_IMPORT_COLUMNS[1].aliases)).trim(),
                hoatChatNoiBo: String(getExcelCell(row, APPROVED_MAPPING_IMPORT_COLUMNS[2].aliases)).trim(),
                soDangKyNoiBo: String(getExcelCell(row, APPROVED_MAPPING_IMPORT_COLUMNS[3].aliases)).trim(),
                donViTinhNoiBo: String(getExcelCell(row, APPROVED_MAPPING_IMPORT_COLUMNS[4].aliases)).trim(),
                nhomTckt: String(getExcelCell(row, APPROVED_MAPPING_IMPORT_COLUMNS[5].aliases)).trim(),
            }));

            toast.loading(`Đang cập nhật Nhóm TCKT cho ${rows.length} dòng...`, { id: toastId });

            const res = await fetch("/api/facility/mappings/nhom-tckt/import", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ rows }),
            });
            const data = await res.json().catch(() => null) as {
                total?: number;
                updated?: number;
                unchanged?: number;
                errors?: { row: number; maNoiBo: string; message: string }[];
                message?: string;
            } | null;

            if (!res.ok) {
                toast.error(data?.message || "Không thể cập nhật Nhóm TCKT từ Excel", { id: toastId });
                return;
            }

            const issues: ImportIssue[] = (data?.errors || []).map((error) => ({
                ...error,
                type: "error" as const,
            }));
            const updated = data?.updated || 0;
            const unchanged = data?.unchanged || 0;
            const total = data?.total ?? rows.length;

            if (issues.length > 0) {
                setImportErrors(issues);
                setImportSummary({
                    total,
                    success: updated,
                    errors: issues.length,
                    skipped: unchanged,
                });
                setIsErrorDialogOpen(true);
                toast.success(`Đã cập nhật ${updated} dòng, ${unchanged} dòng không đổi, có ${issues.length} dòng cần xem lại`, { id: toastId });
            } else {
                toast.success(`Đã cập nhật ${updated} dòng Nhóm TCKT, ${unchanged} dòng không đổi`, { id: toastId });
            }

            fetchMappings();
        } catch (error) {
            const message = error instanceof Error ? error.message : "Lỗi đọc file Excel";
            toast.error(message, { id: toastId });
        } finally {
            setIsNhomTcktImporting(false);
            const input = document.getElementById("nhom-tckt-excel-upload") as HTMLInputElement;
            if (input) input.value = "";
        }
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

    const activeMappings = mappings.filter((m) => m.isActive !== false);
    const inactiveMappings = mappings.filter((m) => m.isActive === false);
    const pendingMappings = activeMappings.filter((m) => m.status === "PENDING_MAPPING");
    const waitingMappings = activeMappings.filter((m) => m.status === "WAITING_APPROVAL");
    const approvedMappings = activeMappings.filter((m) => m.status === "APPROVED" || m.status === "AUTO_MAPPED");
    const rejectedMappings = activeMappings.filter((m) => m.status === "REJECTED");
    const mappingsAIReviewEvidence = {
        summary: {
            total: mappings.length,
            pending: pendingMappings.length,
            waitingApproval: waitingMappings.length,
            approved: approvedMappings.length,
            rejected: rejectedMappings.length,
            inactive: inactiveMappings.length,
            missingInfo: mappings.filter((mapping) =>
                !mapping.hoatChatNoiBo || !mapping.soDangKyNoiBo || !mapping.donViTinhNoiBo || (!mapping.bhyt && !mapping.dichVu)
            ).length,
        },
        rows: [
            ...mappings
                .filter((mapping) => !mapping.hoatChatNoiBo || !mapping.soDangKyNoiBo || !mapping.donViTinhNoiBo || (!mapping.bhyt && !mapping.dichVu))
                .slice(0, 30)
                .map((mapping) => ({
                    maNoiBo: mapping.maNoiBo,
                    tenThuocNoiBo: mapping.tenThuocNoiBo,
                    hoatChatNoiBo: mapping.hoatChatNoiBo,
                    soDangKyNoiBo: mapping.soDangKyNoiBo,
                    donViTinhNoiBo: mapping.donViTinhNoiBo,
                    nhomTckt: mapping.nhomTckt,
                    giaVat: mapping.giaVat,
                    bhyt: mapping.bhyt,
                    dichVu: mapping.dichVu,
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
    const readyPendingMappings = pendingMappings.filter((m) => (m.masterDrug || m.isOutOfCatalog) && (m.bhyt || m.dichVu));
    const submitApprovalDisabled = isProcessing || readyPendingMappings.length === 0;
    const submitApprovalTitle = isProcessing
        ? "Đang gửi duyệt lên Sở"
        : readyPendingMappings.length === 0
            ? "Không có thuốc chờ xử lý đủ điều kiện gửi duyệt. Cần có ánh xạ hoặc đánh dấu ngoài danh mục, đồng thời có BHYT hoặc Dịch vụ."
            : `Sẵn sàng gửi ${readyPendingMappings.length} thuốc lên Sở duyệt`;

    // Use server-side results directly
    const filteredMasterDrugs = masterDrugs;

    const mappingTableColumnClasses = {
        withAction: ["w-[110px]", "w-[220px]", "w-[110px]", "w-[115px]", "w-[110px]", "w-[80px]", "w-[80px]", "w-[110px]", "w-[220px]", "w-[110px]", "w-[120px]", "w-[115px]", "w-[130px]", "w-[250px]"],
        withoutAction: ["w-[110px]", "w-[240px]", "w-[110px]", "w-[115px]", "w-[110px]", "w-[80px]", "w-[80px]", "w-[110px]", "w-[240px]", "w-[110px]", "w-[120px]", "w-[115px]", "w-[130px]"],
    };
    const actionColumnClass = "sticky right-0 z-10 bg-white text-right shadow-[-8px_0_8px_-8px_rgba(15,23,42,0.18)]";

    const MappingTable = ({
        items,
        showAction = false,
        showLifecycleActions = false,
        allowDeleteApprovedWithoutReports = false,
    }: {
        items: DrugMapping[];
        showAction?: boolean;
        showLifecycleActions?: boolean;
        allowDeleteApprovedWithoutReports?: boolean;
    }) => {
        const hasActionColumn = showAction || showLifecycleActions;
        const columnClasses = hasActionColumn ? mappingTableColumnClasses.withAction : mappingTableColumnClasses.withoutAction;

        return (
            <TooltipProvider delayDuration={300}>
                <Table className={`${hasActionColumn ? "min-w-[1870px]" : "min-w-[1680px]"} w-full table-fixed`}>
                    <colgroup>
                        {columnClasses.map((className, index) => (
                            <col key={index} className={className} />
                        ))}
                    </colgroup>
                    <TableHeader>
                        <TableRow className="bg-blue-600 hover:bg-blue-600">
                            <TableHead className="text-white font-bold">Mã nội bộ</TableHead>
                            <TableHead className="text-white font-bold">Tên thuốc nội bộ</TableHead>
                            <TableHead className="text-white font-bold">SĐK nội bộ</TableHead>
                            <TableHead className="text-white font-bold">Nhóm TCKT</TableHead>
                            <TableHead className="text-white font-bold text-right">Giá VAT</TableHead>
                            <TableHead className="text-white font-bold text-center">BHYT</TableHead>
                            <TableHead className="text-white font-bold text-center">Dịch vụ</TableHead>
                            <TableHead className="bg-emerald-50/50 text-white font-bold">Mã chung</TableHead>
                            <TableHead className="bg-emerald-50/50 text-white font-bold">Tên thuốc mapping</TableHead>
                            <TableHead className="bg-emerald-50/50 text-white font-bold">Hàm lượng</TableHead>
                            <TableHead className="bg-emerald-50/50 text-white font-bold">Dạng bào chế</TableHead>
                            <TableHead className="bg-emerald-50/50 text-white font-bold">SĐK mapping</TableHead>
                            <TableHead className="text-white font-bold">Trạng thái</TableHead>
                            {hasActionColumn && <TableHead className="sticky right-0 z-20 bg-blue-600 text-right text-white font-bold shadow-[-8px_0_8px_-8px_rgba(15,23,42,0.35)]">Thao tác</TableHead>}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {items.map((mapping) => (
                            <TableRow key={mapping.id}>
                                <TableCell>
                                    <code className="px-2 py-1 bg-gray-100 rounded text-sm">{mapping.maNoiBo}</code>
                                </TableCell>
                                <TableCell className="whitespace-normal font-medium">
                                    <CompactMappingText value={mapping.tenThuocNoiBo} lines={2} />
                                </TableCell>
                                <TableCell>{mapping.soDangKyNoiBo || "-"}</TableCell>
                                <TableCell>
                                    {mapping.nhomTckt ? (
                                        <Badge className="bg-indigo-100 text-indigo-700 border-0">{mapping.nhomTckt}</Badge>
                                    ) : (
                                        <div className="flex flex-col items-start gap-1.5">
                                            <Badge className="bg-slate-100 text-slate-600 border-0">Chưa xác định</Badge>
                                            <Button
                                                type="button"
                                                size="xs"
                                                variant="outline"
                                                className="border-slate-300 text-slate-700 hover:bg-slate-50"
                                                onClick={() => handleOpenNhomTcktDialog(mapping)}
                                            >
                                                Thiết lập
                                            </Button>
                                        </div>
                                    )}
                                </TableCell>
                                <TableCell className="text-right tabular-nums">{formatMappingGiaVat(mapping.giaVat)}</TableCell>
                                <TableCell className="text-center">
                                    {mapping.bhyt ? <Badge className="bg-emerald-100 text-emerald-700 border-0">X</Badge> : <span className="text-gray-400">-</span>}
                                </TableCell>
                                <TableCell className="text-center">
                                    {mapping.dichVu ? <Badge className="bg-blue-100 text-blue-700 border-0">X</Badge> : <span className="text-gray-400">-</span>}
                                </TableCell>
                                <TableCell className="bg-emerald-50/50">
                                    {mapping.masterDrug ? (
                                        <code className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded text-sm">
                                            {mapping.masterDrug.maChung}
                                        </code>
                                    ) : "-"}
                                </TableCell>
                                <TableCell className="whitespace-normal bg-emerald-50/50">
                                    {mapping.isOutOfCatalog ? (
                                        <CompactMappingText value="Ngoài danh mục" lines={1} className="text-amber-600 italic" />
                                    ) : mapping.masterDrug ? (
                                        <CompactMappingText value={mapping.masterDrug.tenThuoc} lines={2} className="text-emerald-600 font-medium" />
                                    ) : (
                                        <CompactMappingText value="Chưa mapping" lines={1} className="text-gray-400" />
                                    )}
                                </TableCell>
                                <TableCell className="bg-emerald-50/50">
                                    <CompactMappingText value={mapping.masterDrug?.hamLuong} />
                                </TableCell>
                                <TableCell className="bg-emerald-50/50">
                                    <CompactMappingText value={mapping.masterDrug?.dangBaoChe} />
                                </TableCell>
                                <TableCell className="bg-emerald-50/50">
                                    {mapping.masterDrug?.soDangKy || "-"}
                                </TableCell>
                                <TableCell>
                                    {getStatusBadge(mapping.status)}
                                    {mapping.isActive === false && (
                                        <div className="mt-1">
                                            <Badge className="bg-slate-100 text-slate-700">Ngừng từ {mapping.inactiveFromMonth || "-"}</Badge>
                                        </div>
                                    )}
                                    {mapping.demandPlanningLocked && (
                                        <div className="mt-1">
                                            <Badge className="bg-amber-100 text-amber-800">Khóa dự trù</Badge>
                                            {mapping.demandPlanningLockReason ? (
                                                <p className="mt-1 text-xs text-amber-700">
                                                    {mapping.demandPlanningLockReason}
                                                </p>
                                            ) : null}
                                        </div>
                                    )}
                                    {mapping.adminNote && (
                                        <p className="text-xs text-red-500 mt-1">Lý do: {mapping.adminNote}</p>
                                    )}
                                </TableCell>
                                {hasActionColumn && (
                                    <TableCell className={actionColumnClass}>
                                        {showLifecycleActions && mapping.isActive === false ? (
                                            <div className="flex justify-end">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="text-green-700 border-green-300 hover:bg-green-50"
                                                    onClick={() => handleOpenLifecycleDialog(mapping, "reactivate")}
                                                >
                                                    <RefreshCw className="w-4 h-4 mr-1.5" />
                                                    Kích hoạt lại
                                                </Button>
                                            </div>
                                        ) : showLifecycleActions
                                            && allowDeleteApprovedWithoutReports
                                            && (mapping.status === "APPROVED" || mapping.status === "AUTO_MAPPED")
                                            && mapping.reportCount === 0 ? (
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="text-blue-700 border-blue-300 hover:bg-blue-50"
                                                    onClick={() => handleOpenDemandRoundingDialog(mapping)}
                                                >
                                                    Quy cách
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className={
                                                        mapping.demandPlanningLocked
                                                            ? "text-green-700 border-green-300 hover:bg-green-50"
                                                            : "text-amber-700 border-amber-300 hover:bg-amber-50"
                                                    }
                                                    onClick={() => handleOpenDemandLockDialog(mapping, !mapping.demandPlanningLocked)}
                                                >
                                                    {mapping.demandPlanningLocked ? (
                                                        <RefreshCw className="w-4 h-4 mr-1.5" />
                                                    ) : (
                                                        <Lock className="w-4 h-4 mr-1.5" />
                                                    )}
                                                    {mapping.demandPlanningLocked ? "Mở dự trù" : "Khóa dự trù"}
                                                </Button>
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                                    onClick={() => handleDelete(mapping)}
                                                    title="Xóa thuốc đã duyệt chưa có báo cáo XNT"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        ) : showLifecycleActions && (mapping.status === "APPROVED" || mapping.status === "AUTO_MAPPED") ? (
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="text-blue-700 border-blue-300 hover:bg-blue-50"
                                                    onClick={() => handleOpenDemandRoundingDialog(mapping)}
                                                >
                                                    Quy cách
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className={
                                                        mapping.demandPlanningLocked
                                                            ? "text-green-700 border-green-300 hover:bg-green-50"
                                                            : "text-amber-700 border-amber-300 hover:bg-amber-50"
                                                    }
                                                    onClick={() => handleOpenDemandLockDialog(mapping, !mapping.demandPlanningLocked)}
                                                >
                                                    {mapping.demandPlanningLocked ? (
                                                        <RefreshCw className="w-4 h-4 mr-1.5" />
                                                    ) : (
                                                        <Lock className="w-4 h-4 mr-1.5" />
                                                    )}
                                                    {mapping.demandPlanningLocked ? "Mở dự trù" : "Khóa dự trù"}
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="text-slate-700 border-slate-300 hover:bg-slate-50"
                                                    onClick={() => handleOpenLifecycleDialog(mapping, "deactivate")}
                                                >
                                                    <PowerOff className="w-4 h-4 mr-1.5" />
                                                    Ngừng sử dụng
                                                </Button>
                                            </div>
                                        ) : LOCKED_STATUSES.includes(mapping.status) ? (
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
                                                    onClick={() => handleDelete(mapping)}
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
                                <TableCell colSpan={hasActionColumn ? 14 : 13} className="text-center text-gray-500 py-8">
                                    Không có dữ liệu
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TooltipProvider>
        );
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div className="min-w-0">
                    <h2 className="text-3xl font-bold text-gray-800">Quản lý danh mục thuốc</h2>
                    <p className="text-gray-500 mt-1">Ánh xạ thuốc nội bộ với danh mục dùng chung</p>
                </div>
                <div className="flex w-full flex-wrap gap-2 xl:w-auto xl:justify-end">
                    <AIReviewButton
                        surface="facility_mappings"
                        message="Kiểm tra danh mục thuốc nội bộ và ánh xạ hiện tại, nêu lỗi cần xử lý, cảnh báo nên kiểm tra và bước tiếp theo."
                        evidence={mappingsAIReviewEvidence}
                        disabled={isLoading || mappings.length === 0}
                        disabledReason="Cần có dữ liệu danh mục thuốc trước khi kiểm tra bằng AI"
                    />
                    <Button
                        variant="outline"
                        className="w-full bg-white text-blue-600 border-blue-200 hover:bg-blue-50 sm:w-auto"
                        onClick={handleDownloadTemplate}
                    >
                        <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Tải mẫu Excel
                    </Button>
                    <div className="relative w-full sm:w-auto">
                        <input
                            id="excel-upload"
                            type="file"
                            accept=".xlsx, .xls"
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                            onChange={(e) => handleImport(e.target.files)}
                            disabled={isImporting}
                            title="Chọn file Excel"
                        />
                        <Button variant="outline" disabled={isImporting} className="w-full sm:w-auto">
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
                    <div className="w-full sm:w-auto" title={submitApprovalTitle}>
                        <Button
                            className="w-full border border-transparent bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-sm hover:from-blue-600 hover:to-purple-600 disabled:border-slate-200 disabled:bg-none disabled:bg-slate-100 disabled:text-slate-500 disabled:opacity-100 sm:w-auto"
                            onClick={handleSubmitForApproval}
                            disabled={submitApprovalDisabled}
                        >
                            <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Gửi duyệt lên Sở
                        </Button>
                    </div>
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
                    <CardDescription>
                        Tổng cộng {mappings.length} thuốc trong danh mục nội bộ, {activeMappings.length} đang sử dụng
                    </CardDescription>
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
                                <TabsTrigger value="inactive">Ngừng sử dụng ({inactiveMappings.length})</TabsTrigger>
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
                                <div className="flex flex-wrap justify-end gap-2 mb-4">
                                    <div className="relative">
                                        <input
                                            id="nhom-tckt-excel-upload"
                                            type="file"
                                            accept=".xlsx, .xls"
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 disabled:cursor-not-allowed"
                                            onChange={(e) => handleImportApprovedNhomTckt(e.target.files)}
                                            disabled={isNhomTcktImporting || approvedMappings.length === 0}
                                            title="Chọn file Excel đã duyệt"
                                        />
                                        <Button
                                            variant="outline"
                                            className="text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                                            disabled={isNhomTcktImporting || approvedMappings.length === 0}
                                        >
                                            {isNhomTcktImporting ? (
                                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600 mr-2"></div>
                                            ) : (
                                                <Upload className="w-4 h-4 mr-2" />
                                            )}
                                            Cập nhật Nhóm TCKT
                                        </Button>
                                    </div>
                                    <Button
                                        variant="outline"
                                        className="text-green-600 border-green-200 hover:bg-green-50"
                                        onClick={handleExportApproved}
                                        disabled={approvedMappings.length === 0}
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
                                <MappingTable
                                    items={approvedMappings}
                                    showLifecycleActions={true}
                                    allowDeleteApprovedWithoutReports={true}
                                />
                            </TabsContent>
                            <TabsContent value="inactive" className="mt-4">
                                {inactiveMappings.length > 0 && (
                                    <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg">
                                        <PowerOff className="w-4 h-4 text-slate-600" />
                                        <span className="text-sm text-slate-700">
                                            Thuốc ngừng sử dụng sẽ không xuất hiện trong mẫu báo cáo từ tháng hiệu lực.
                                        </span>
                                    </div>
                                )}
                                <MappingTable items={inactiveMappings} showLifecycleActions={true} />
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
                                        <div className="mt-0.5 flex items-center gap-2">
                                            <span className="font-medium text-gray-900">{selectedMapping?.tenThuocNoiBo}</span>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button
                                                        type="button"
                                                        size="icon"
                                                        variant="outline"
                                                        className="h-7 w-7 shrink-0"
                                                        disabled={!selectedMapping?.tenThuocNoiBo}
                                                        onClick={() => {
                                                            setSearchMasterField("tenThuoc");
                                                            setSearchMaster(selectedMapping?.tenThuocNoiBo || "");
                                                        }}
                                                        aria-label="Dùng tên thuốc để tìm kiếm"
                                                    >
                                                        <ArrowRight className="h-4 w-4" />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent>Dùng tên thuốc để tìm kiếm</TooltipContent>
                                            </Tooltip>
                                        </div>
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
                                        <div className="mt-0.5 flex items-center gap-2 text-sm">
                                            <span>{selectedMapping?.soDangKyNoiBo || "-"}</span>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button
                                                        type="button"
                                                        size="icon"
                                                        variant="outline"
                                                        className="h-7 w-7"
                                                        disabled={!selectedMapping?.soDangKyNoiBo}
                                                        onClick={() => {
                                                            setSearchMasterField("soDangKy");
                                                            setSearchMaster(selectedMapping?.soDangKyNoiBo || "");
                                                        }}
                                                        aria-label="Dùng Số đăng ký để tìm kiếm"
                                                    >
                                                        <ArrowRight className="h-4 w-4" />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent>Dùng Số đăng ký để tìm kiếm</TooltipContent>
                                            </Tooltip>
                                        </div>
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
                                    <div className="flex gap-2">
                                        <Select
                                            value={searchMasterField}
                                            onValueChange={(value) => setSearchMasterField(value as "soDangKy" | "tenThuoc")}
                                        >
                                            <SelectTrigger className="w-[150px] bg-white">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="soDangKy">Số đăng ký</SelectItem>
                                                <SelectItem value="tenThuoc">Tên thuốc</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <div className="relative flex-1">
                                            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                            </svg>
                                            <Input
                                                className="pl-9 bg-white"
                                                placeholder={searchMasterField === "soDangKy" ? "Tìm theo Số đăng ký trong danh mục dùng chung..." : "Tìm theo Tên thuốc trong danh mục dùng chung..."}
                                                value={searchMaster}
                                                onChange={(e) => setSearchMaster(e.target.value)}
                                            />
                                        </div>
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
                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Giá VAT</label>
                                <Input
                                    inputMode="decimal"
                                    value={editFormData.giaVat}
                                    onChange={(e) => setEditFormData({ ...editFormData, giaVat: e.target.value })}
                                />
                            </div>
                            <label className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium">
                                <input
                                    type="checkbox"
                                    className="h-4 w-4"
                                    checked={editFormData.bhyt === "X"}
                                    onChange={(e) => setEditFormData({ ...editFormData, bhyt: e.target.checked ? "X" : "" })}
                                />
                                BHYT
                            </label>
                            <label className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium">
                                <input
                                    type="checkbox"
                                    className="h-4 w-4"
                                    checked={editFormData.dichVu === "X"}
                                    onChange={(e) => setEditFormData({ ...editFormData, dichVu: e.target.checked ? "X" : "" })}
                                />
                                Dịch vụ
                            </label>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
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
                        <div className="grid grid-cols-2 gap-4">
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
                        <div className="rounded-md border p-3 space-y-3">
                            <label className="flex items-center gap-2 text-sm font-medium">
                                <input
                                    type="checkbox"
                                    className="h-4 w-4"
                                    checked={editFormData.demandRoundingEnabled}
                                    onChange={(e) =>
                                        setEditFormData({
                                            ...editFormData,
                                            demandRoundingEnabled: e.target.checked,
                                        })
                                    }
                                />
                                Làm tròn số lượng khi lập dự trù
                            </label>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Đơn vị quy cách</label>
                                    <Input
                                        placeholder="vỉ, hộp, chai..."
                                        value={editFormData.demandPackageUnit}
                                        onChange={(e) =>
                                            setEditFormData({
                                                ...editFormData,
                                                demandPackageUnit: e.target.value,
                                            })
                                        }
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Số lượng / 1 quy cách</label>
                                    <Input
                                        inputMode="decimal"
                                        placeholder="10"
                                        value={editFormData.demandPackageSize}
                                        onChange={(e) =>
                                            setEditFormData({
                                                ...editFormData,
                                                demandPackageSize: e.target.value,
                                            })
                                        }
                                    />
                                </div>
                            </div>
                            <p className="text-xs text-gray-500">
                                Ví dụ: 1 vỉ = 10 viên. Khi gợi ý 7 viên, hệ thống đề xuất 10 viên.
                            </p>
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

            <Dialog open={isDemandRoundingDialogOpen} onOpenChange={setIsDemandRoundingDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Cấu hình quy cách dự trù</DialogTitle>
                        <DialogDescription>
                            Thiết lập cách làm tròn số lượng dự trù cho {selectedMapping?.tenThuocNoiBo || "thuốc này"}.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <label className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium">
                            <input
                                type="checkbox"
                                className="h-4 w-4"
                                checked={demandRoundingForm.enabled}
                                onChange={(e) =>
                                    setDemandRoundingForm({
                                        ...demandRoundingForm,
                                        enabled: e.target.checked,
                                    })
                                }
                            />
                            Làm tròn số lượng khi lập dự trù
                        </label>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Đơn vị quy cách</label>
                                <Input
                                    placeholder="vỉ, hộp, chai..."
                                    value={demandRoundingForm.packageUnit}
                                    onChange={(e) =>
                                        setDemandRoundingForm({
                                            ...demandRoundingForm,
                                            packageUnit: e.target.value,
                                        })
                                    }
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Số lượng / 1 quy cách</label>
                                <Input
                                    inputMode="decimal"
                                    placeholder="10"
                                    value={demandRoundingForm.packageSize}
                                    onChange={(e) =>
                                        setDemandRoundingForm({
                                            ...demandRoundingForm,
                                            packageSize: e.target.value,
                                        })
                                    }
                                />
                            </div>
                        </div>
                        <div className="rounded-md bg-blue-50 px-3 py-2 text-sm text-blue-800">
                            Ví dụ: đơn vị nhỏ nhất là viên, 1 vỉ = 10 viên. Nếu gợi ý 7 viên, hệ thống đề xuất 10 viên.
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsDemandRoundingDialogOpen(false)}>
                            Hủy
                        </Button>
                        <Button onClick={handleSaveDemandRounding} disabled={isProcessing}>
                            {isProcessing ? "Đang lưu..." : "Lưu quy cách"}
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
                            Chỉ thiết lập khi đã xác định được nhóm. Sau khi lưu, cơ sở không thể tự thay đổi lại.
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

            <Dialog open={isLifecycleDialogOpen} onOpenChange={setIsLifecycleDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {lifecycleAction === "deactivate" ? "Ngừng sử dụng thuốc" : "Kích hoạt lại thuốc"}
                        </DialogTitle>
                        <DialogDescription>
                            {selectedMapping?.tenThuocNoiBo}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="rounded-lg border bg-slate-50 p-3 text-sm">
                            <p className="text-slate-500">Mã nội bộ</p>
                            <p className="font-semibold text-slate-900">{selectedMapping?.maNoiBo}</p>
                            {lifecycleAction === "deactivate" ? (
                                <p className="mt-2 text-slate-600">
                                    Từ tháng hiệu lực, thuốc sẽ không còn xuất hiện trong mẫu báo cáo. Hệ thống sẽ chặn nếu tồn cuối tháng trước còn lớn hơn 0.
                                </p>
                            ) : (
                                <p className="mt-2 text-slate-600">
                                    Từ tháng hiệu lực, thuốc sẽ xuất hiện lại trong mẫu báo cáo nếu tháng đó chưa được nộp.
                                </p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Tháng hiệu lực</label>
                            <Input
                                placeholder="MM/YYYY"
                                value={lifecycleEffectiveMonth}
                                onChange={(e) => setLifecycleEffectiveMonth(e.target.value)}
                            />
                        </div>
                        {lifecycleAction === "deactivate" && (
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Lý do</label>
                                <Input
                                    placeholder="Ví dụ: Không còn sử dụng tại cơ sở"
                                    value={lifecycleReason}
                                    onChange={(e) => setLifecycleReason(e.target.value)}
                                />
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsLifecycleDialogOpen(false)}>Hủy</Button>
                        <Button onClick={handleSaveLifecycle} disabled={isProcessing}>
                            {isProcessing
                                ? "Đang lưu..."
                                : lifecycleAction === "deactivate"
                                    ? "Ngừng sử dụng"
                                    : "Kích hoạt lại"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isDemandLockDialogOpen} onOpenChange={setIsDemandLockDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {nextDemandLockState ? "Khóa dự trù thuốc" : "Mở dự trù thuốc"}
                        </DialogTitle>
                        <DialogDescription>
                            {selectedMapping?.tenThuocNoiBo}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="rounded-lg border bg-slate-50 p-3 text-sm">
                            <p className="text-slate-500">Mã nội bộ</p>
                            <p className="font-semibold text-slate-900">{selectedMapping?.maNoiBo}</p>
                            {nextDemandLockState ? (
                                <p className="mt-2 text-slate-600">
                                    Thuốc sẽ không còn hiển thị trong modal Lập dự trù. Báo cáo XNT và trạng thái ánh xạ không bị ảnh hưởng.
                                </p>
                            ) : (
                                <p className="mt-2 text-slate-600">
                                    Thuốc sẽ hiển thị lại trong modal Lập dự trù nếu vẫn đang sử dụng và đã đủ điều kiện ánh xạ.
                                </p>
                            )}
                        </div>
                        {nextDemandLockState ? (
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Lý do</label>
                                <Input
                                    placeholder="Ví dụ: Không lập dự trù trong đợt này"
                                    value={demandLockReason}
                                    onChange={(event) => setDemandLockReason(event.target.value)}
                                />
                            </div>
                        ) : null}
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsDemandLockDialogOpen(false)}>Hủy</Button>
                        <Button onClick={handleSaveDemandLock} disabled={isProcessing}>
                            {isProcessing
                                ? "Đang lưu..."
                                : nextDemandLockState
                                    ? "Khóa dự trù"
                                    : "Mở dự trù"}
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
                            {importDialogTitle}
                        </DialogTitle>
                        <DialogDescription>
                            {importDialogDescription}
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
