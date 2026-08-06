"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import * as XLSX from "xlsx";

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
    id?: string;
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
    yeuCauTBMT: boolean;
    phanLos: PhanLo[];
    thongBaoMoiThaus?: Array<{
        id: string;
        maTBMT?: string;
    }>;
    ketQuaLCNTs?: Array<{ id: string }>;
}

interface KeHoachLCNT {
    id?: string;
    quyTrinh: number;
    loaiMuaSam?: string;
    maKHLCNT: string;
    tenKHLCNT: string;
    soQuyetDinh: string;
    ngayPheDuyet: string;
    soLuongGoiThau: number | null;
    trangThai: string;
    // Self-decision process fields (quyTrinh=2)
    loaiMuaSamTuQuyet?: string;
    thoiGianBatDauMuaSam?: string;
    thoiGianBatDauThucHienHopDong?: string;
    thoiGianThucHienHopDong?: string;
    thoiGianKetThucHopDong?: string;
    createdAt?: string;
    goiThaus?: GoiThau[];
}

type ProcurementTypeFilter = "all" | "Thuốc" | "Hóa chất, vật tư, thiết bị y tế";

// ===================== CONSTANTS =====================
const HINH_THUC_OPTIONS = [
    "Đấu thầu rộng rãi",
    "Chào hàng cạnh tranh",
    "Mua sắm trực tiếp",
    "Chỉ định thầu",
    "Chào giá trực tuyến",
];

const PHUONG_THUC_OPTIONS = [
    "Một giai đoạn một túi hồ sơ",
    "Một giai đoạn hai túi hồ sơ",
];

const LOAI_HOP_DONG_OPTIONS = [
    "Trọn gói",
    "Đơn giá cố định",
    "Đơn giá điều chỉnh",
];

const PHAN_LOAI_OPTIONS = [
    "Gói thầu thuốc generic",
    "Gói thầu thuốc biệt dược gốc",
    "Gói thầu thuốc dược liệu, thuốc có kết hợp dược chất với các dược liệu, thuốc cổ truyền",
    "Gói thầu dược liệu",
    "Gói thầu vị thuốc cổ truyền",
    "Gói thầu mua sắm hóa chất, vật tư, thiết bị y tế",
];

const LINH_VUC_OPTIONS = [
    "Mua sắm thuốc",
    "Mua sắm Hóa chất, vật tư",
];

const PROCUREMENT_TYPE_FILTER_OPTIONS: Array<{
    value: ProcurementTypeFilter;
    label: string;
}> = [
    { value: "all", label: "Tất cả" },
    { value: "Thuốc", label: "Thuốc" },
    { value: "Hóa chất, vật tư, thiết bị y tế", label: "Hóa chất, vật tư, thiết bị y tế" },
];

const EMPTY_KE_HOACH: KeHoachLCNT = {
    quyTrinh: 0,
    loaiMuaSam: "",
    maKHLCNT: "",
    tenKHLCNT: "",
    soQuyetDinh: "",
    ngayPheDuyet: "",
    soLuongGoiThau: null,
    trangThai: "Chưa đăng tải",
    loaiMuaSamTuQuyet: "",
    thoiGianBatDauMuaSam: "",
    thoiGianBatDauThucHienHopDong: "",
    thoiGianThucHienHopDong: "",
    thoiGianKetThucHopDong: "",
};

const EMPTY_GOI_THAU: GoiThau = {
    tenGoiThau: "",
    giaGoiThau: null,
    linhVuc: [],
    hinhThucLCNT: "",
    phuongThucLCNT: "",
    loaiHopDong: [],
    phanLoaiGoiThau: "",
    chiTietNguonVon: "",
    soLuongPhanLo: null,
    thoiGianToChuc: "",
    thoiGianBatDau: "",
    thoiGianThucHien: "",
    trangThai: "Chưa hoàn thành",
    maThongBao: "",
    yeuCauTBMT: true,
    phanLos: [],
};

const parseNullableNumber = (value: unknown): number | null => {
    if (value === null || value === undefined) {
        return null;
    }

    if (typeof value === "string") {
        const trimmed = value.trim();
        if (trimmed === "") {
            return null;
        }

        const parsed = Number(trimmed);
        return Number.isNaN(parsed) ? null : parsed;
    }

    const parsed = Number(value);
    return Number.isNaN(parsed) ? null : parsed;
};

const normalizeImportText = (value: unknown) =>
    typeof value === "string" ? value.trim() : "";

const normalizeDurationImportValue = (value: unknown) => {
    if (typeof value === "string") {
        return value.trim();
    }

    if (typeof value === "number" && Number.isFinite(value)) {
        return String(value);
    }

    return "";
};

const isImportedPhanLoBlank = (row: PhanLo) =>
    row.tenPhanLo === ""
    && row.donViTinh === ""
    && row.soLuong === null
    && row.donGia === null
    && row.thanhTien === null
    && row.thoiGianThucHien === ""
    && row.donViTinhThoiGian === "";

const formatDisplayText = (value: string | null | undefined) => {
    if (typeof value !== "string") {
        return "—";
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : "—";
};

const formatDisplayCombinedText = (...values: Array<string | null | undefined>) => {
    const combined = values
        .map((value) => (typeof value === "string" ? value.trim() : ""))
        .filter(Boolean)
        .join(" ");

    return combined || "—";
};

const hasDisplayNumber = (value: number | null | undefined): value is number =>
    value !== null && value !== undefined;

const calculateGiaGoiThauFromPhanLos = (currentPhanLos: PhanLo[]): number | null => {
    let hasThanhTien = false;

    const total = currentPhanLos.reduce((sum, phanLo) => {
        const thanhTien = parseNullableNumber(phanLo.thanhTien);

        if (thanhTien === null) {
            return sum;
        }

        hasThanhTien = true;
        return sum + thanhTien;
    }, 0);

    return hasThanhTien ? total : null;
};

const mapPhanLoFromApi = (phanLo: any): PhanLo => ({
    stt: Number(phanLo.stt) || 0,
    tenPhanLo: phanLo.tenPhanLo || "",
    donViTinh: phanLo.donViTinh || "",
    soLuong: parseNullableNumber(phanLo.soLuong),
    donGia: parseNullableNumber(phanLo.donGia),
    thanhTien: parseNullableNumber(phanLo.thanhTien),
    thoiGianThucHien: phanLo.thoiGianThucHien?.toString() || "",
    donViTinhThoiGian: phanLo.donViTinhThoiGian?.toString() || "",
});

const sortPhanLosByStt = (items: PhanLo[]) =>
    [...items].sort((left, right) => left.stt - right.stt);

const mapGoiThauFromApi = (goiThau: any): GoiThau => ({
    id: goiThau.id,
    tenGoiThau: goiThau.tenGoiThau,
    giaGoiThau: parseNullableNumber(goiThau.giaGoiThau),
    linhVuc: goiThau.linhVuc ? JSON.parse(goiThau.linhVuc) : [],
    hinhThucLCNT: goiThau.hinhThucLCNT || "",
    phuongThucLCNT: goiThau.phuongThucLCNT || "",
    loaiHopDong: goiThau.loaiHopDong ? JSON.parse(goiThau.loaiHopDong) : [],
    phanLoaiGoiThau: goiThau.phanLoaiGoiThau || "",
    chiTietNguonVon: goiThau.chiTietNguonVon || "",
    soLuongPhanLo: goiThau.soLuongPhanLo,
    thoiGianToChuc: goiThau.thoiGianToChuc || "",
    thoiGianBatDau: typeof goiThau.thoiGianBatDau === "string" ? goiThau.thoiGianBatDau : "",
    thoiGianThucHien: goiThau.thoiGianThucHien || "",
    trangThai: goiThau.trangThai || "",
    maThongBao: goiThau.maThongBao || "",
    yeuCauTBMT: goiThau.yeuCauTBMT !== false,
    phanLos: sortPhanLosByStt(goiThau.phanLos?.map(mapPhanLoFromApi) || []),
    thongBaoMoiThaus: goiThau.thongBaoMoiThaus || [],
    ketQuaLCNTs: goiThau.ketQuaLCNTs || [],
});

const canEditGoiThau = (goiThau: GoiThau) =>
    Boolean(goiThau.id) &&
    (goiThau.thongBaoMoiThaus?.length || 0) === 0 &&
    (goiThau.ketQuaLCNTs?.length || 0) === 0;

const getGoiThauDisplayStatus = (goiThau: Pick<GoiThau, "ketQuaLCNTs">) =>
    (goiThau.ketQuaLCNTs?.length || 0) > 0 ? "Hoàn thành" : "Chưa hoàn thành";

const getGoiThauStatusBadgeClassName = (status: string) =>
    status === "Hoàn thành"
        ? "bg-green-100 text-green-700"
        : "bg-amber-100 text-amber-700";

const getLinkedThongBaoCode = (
    goiThau: Pick<GoiThau, "thongBaoMoiThaus" | "maThongBao" | "yeuCauTBMT">
) => goiThau.yeuCauTBMT
    ? formatDisplayText(goiThau.thongBaoMoiThaus?.[0]?.maTBMT || goiThau.maThongBao)
    : "Không yêu cầu TBMT";

const filterPlansByProcurementType = (
    plans: KeHoachLCNT[],
    procurementTypeFilter: ProcurementTypeFilter,
    getProcurementType: (plan: KeHoachLCNT) => string | undefined
) => {
    if (procurementTypeFilter === "all") {
        return plans;
    }

    return plans.filter((plan) => getProcurementType(plan) === procurementTypeFilter);
};

// ===================== COMPONENT =====================
export default function LapKeHoachLCNTPage() {
    const { data: session } = useSession();

    // View mode: "list" | "detail"
    const [viewMode, setViewMode] = useState<"list" | "detail">("list");
    const [editMode, setEditMode] = useState(false); // true when editing existing plan
    const [activeTab, setActiveTab] = useState("tab1");
    const [listTab, setListTab] = useState("quyTrinh1"); // Tab for list view
    const [procurementTypeFilter, setProcurementTypeFilter] = useState<ProcurementTypeFilter>("all");
    const [loading, setLoading] = useState(false);
    const [successModalOpen, setSuccessModalOpen] = useState(false);
    const [excelModalOpen, setExcelModalOpen] = useState(false);
    const [showGoiThauForm, setShowGoiThauForm] = useState(false);
    const [viewGoiThauDialogOpen, setViewGoiThauDialogOpen] = useState(false);
    const [selectedGoiThau, setSelectedGoiThau] = useState<GoiThau | null>(null);
    const [editingGoiThauId, setEditingGoiThauId] = useState<string | null>(null);

    // All plans
    const [keHoachList, setKeHoachList] = useState<KeHoachLCNT[]>([]);

    // Current plan being edited
    const [keHoach, setKeHoach] = useState<KeHoachLCNT>({ ...EMPTY_KE_HOACH });

    // Goi thau for current plan
    const [goiThauList, setGoiThauList] = useState<GoiThau[]>([]);
    const [goiThauForm, setGoiThauForm] = useState<GoiThau>({ ...EMPTY_GOI_THAU });
    const [phanLos, setPhanLos] = useState<PhanLo[]>([]);
    const calculatedGiaGoiThau = calculateGiaGoiThauFromPhanLos(phanLos);

    // ===================== DATA LOADING =====================
    const loadKeHoachList = useCallback(async () => {
        try {
            const res = await fetch("/api/facility/ke-hoach-lcnt");
            if (res.ok) {
                const data = await res.json();
                setKeHoachList(
                    data.map((item: any) => ({
                        id: item.id,
                        quyTrinh: item.quyTrinh,
                        loaiMuaSam: item.loaiMuaSam || "",
                        maKHLCNT: item.maKHLCNT || "",
                        tenKHLCNT: item.tenKHLCNT || "",
                        soQuyetDinh: item.soQuyetDinh || "",
                        ngayPheDuyet: item.ngayPheDuyet
                            ? new Date(item.ngayPheDuyet).toISOString().split("T")[0]
                            : "",
                        soLuongGoiThau: item.soLuongGoiThau,
                        trangThai: item.trangThai || "Chưa đăng tải",
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
                        createdAt: item.createdAt,
                        goiThaus: item.goiThaus?.map(mapGoiThauFromApi) || [],
                    }))
                );
            }
        } catch (err) {
            console.error("Error loading data:", err);
        }
    }, []);

    useEffect(() => {
        loadKeHoachList();
    }, [loadKeHoachList]);

    // ===================== HANDLERS =====================
    const handleCreateNew = () => {
        setKeHoach({ ...EMPTY_KE_HOACH });
        setGoiThauList([]);
        setGoiThauForm({ ...EMPTY_GOI_THAU });
        setPhanLos([]);
        setActiveTab("tab1");
        setShowGoiThauForm(false);
        setEditingGoiThauId(null);
        setEditMode(false);
        setViewMode("detail");
    };

    const handleProcurementTypeFilterChange = (value: string) => {
        if (
            value === "Thuốc"
            || value === "Hóa chất, vật tư, thiết bị y tế"
        ) {
            setProcurementTypeFilter(value);
            return;
        }

        setProcurementTypeFilter("all");
    };

    const handleSelectPlan = (plan: KeHoachLCNT) => {
        setKeHoach(plan);
        setGoiThauList(plan.goiThaus || []);
        setActiveTab("tab1");
        setShowGoiThauForm(false);
        setEditingGoiThauId(null);
        setEditMode(false); // view mode by default
        setViewMode("detail");
    };

    const handleEditPlan = (plan: KeHoachLCNT) => {
        setKeHoach(plan);
        setGoiThauList(plan.goiThaus || []);
        setActiveTab("tab1");
        setShowGoiThauForm(false);
        setEditingGoiThauId(null);
        setEditMode(true); // enable edit mode
        setViewMode("detail");
    };

    const handleBackToList = () => {
        setViewMode("list");
        setShowGoiThauForm(false);
        setEditingGoiThauId(null);
        loadKeHoachList();
    };

    const handleCreateGoiThau = () => {
        setGoiThauForm({ ...EMPTY_GOI_THAU });
        setPhanLos([]);
        setEditingGoiThauId(null);
        setShowGoiThauForm(true);
    };

    const handleEditGoiThau = (goiThau: GoiThau) => {
        if (!canEditGoiThau(goiThau)) {
            alert("Không thể sửa gói thầu đã có dữ liệu liên kết.");
            return;
        }

        setGoiThauForm({
            ...EMPTY_GOI_THAU,
            ...goiThau,
            linhVuc: [...goiThau.linhVuc],
            loaiHopDong: [...goiThau.loaiHopDong],
            phanLos: goiThau.phanLos.map((phanLo) => ({ ...phanLo })),
            thongBaoMoiThaus: goiThau.thongBaoMoiThaus || [],
            ketQuaLCNTs: goiThau.ketQuaLCNTs || [],
        });
        setPhanLos(goiThau.phanLos.map((phanLo) => ({ ...phanLo })));
        setEditingGoiThauId(goiThau.id || null);
        setShowGoiThauForm(true);
    };

    const handleCloseGoiThauForm = () => {
        setShowGoiThauForm(false);
        setEditingGoiThauId(null);
        setGoiThauForm({ ...EMPTY_GOI_THAU });
        setPhanLos([]);
    };

    const handleSaveKeHoach = async () => {
        if (keHoach.quyTrinh === 0) {
            alert("Vui lòng chọn quy trình!");
            return;
        }

        setLoading(true);
        try {
            if (editMode && keHoach.id) {
                // Update existing
                const res = await fetch(`/api/facility/ke-hoach-lcnt/${keHoach.id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(keHoach),
                });

                if (!res.ok) {
                    const errData = await res.json().catch(() => ({}));
                    throw new Error(errData.message || `API error ${res.status}`);
                }

                alert("Cập nhật kế hoạch thành công!");
                setEditMode(false);
                loadKeHoachList();
            } else {
                // Create new
                const res = await fetch("/api/facility/ke-hoach-lcnt", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(keHoach),
                });

                if (!res.ok) {
                    const errData = await res.json().catch(() => ({}));
                    throw new Error(errData.message || `API error ${res.status}`);
                }

                const data = await res.json();
                setKeHoach({ ...keHoach, id: data.id });

                // Only show success modal for quyTrinh=1, for quyTrinh=2 go back to list
                if (keHoach.quyTrinh === 1) {
                    setSuccessModalOpen(true);
                } else {
                    alert("Đã tạo thành công kế hoạch!");
                    handleBackToList();
                }
            }
        } catch (error: any) {
            console.error("Error saving KHLCNT:", error);
            alert(`Lỗi khi lưu KHLCNT: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveGoiThau = async () => {
        if (!goiThauForm.tenGoiThau) {
            alert("Vui lòng nhập tên gói thầu!");
            return;
        }

        if (!keHoach.id) {
            alert("Vui lòng lưu kế hoạch LCNT trước!");
            return;
        }

        setLoading(true);
        try {
            const isEditingGoiThau = Boolean(editingGoiThauId);
            const soLuongPhanLo = phanLos.length || goiThauForm.soLuongPhanLo;
            const existingGoiThau = goiThauList.find((item) => item.id === editingGoiThauId);

            const res = await fetch(
                isEditingGoiThau
                    ? `/api/facility/ke-hoach-lcnt/${keHoach.id}/goi-thau/${editingGoiThauId}`
                    : `/api/facility/ke-hoach-lcnt/${keHoach.id}/goi-thau`,
                {
                method: isEditingGoiThau ? "PATCH" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...goiThauForm,
                    giaGoiThau: calculatedGiaGoiThau,
                    soLuongPhanLo,
                    phanLos: phanLos,
                }),
                }
            );

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.message || `API error ${res.status}`);
            }

            const data = await res.json();
            const savedGoiThau: GoiThau = {
                ...mapGoiThauFromApi(data),
                thongBaoMoiThaus: existingGoiThau?.thongBaoMoiThaus || data.thongBaoMoiThaus || [],
                ketQuaLCNTs: existingGoiThau?.ketQuaLCNTs || data.ketQuaLCNTs || [],
            };
            const updatedGoiThauList = isEditingGoiThau
                ? goiThauList.map((item) => (item.id === editingGoiThauId ? savedGoiThau : item))
                : [...goiThauList, savedGoiThau];

            setGoiThauList(updatedGoiThauList);
            setKeHoach((prev) => ({
                ...prev,
                goiThaus: updatedGoiThauList,
            }));
            handleCloseGoiThauForm();
            loadKeHoachList();
            alert(isEditingGoiThau ? "Cập nhật gói thầu thành công!" : "Đã lưu gói thầu thành công!");
        } catch (error: any) {
            console.error("Error saving goi thau:", error);
            alert(`Lỗi khi lưu gói thầu: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleDownloadTemplate = () => {
        const templateData = [
            {
                STT: 1,
                "Tên phần lô": "Ví dụ: Phần lô 1",
                "Đơn vị tính": "Viên",
                "Số lượng": 1000,
                "Đơn giá": 5000,
                "Thành tiền": 5000000,
                "Thời gian thực hiện gói thầu": "12",
                "Đơn vị tính TGTHHGT": "Tháng",
            },
        ];
        const ws = XLSX.utils.json_to_sheet(templateData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "PhanLo");
        XLSX.writeFile(wb, "Mau_Phan_Lo_Goi_Thau.xlsx");
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
                const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
                    defval: "",
                });

                const parsed = jsonData.map((row, idx): { rowNumber: number; value: PhanLo } => ({
                    rowNumber: idx + 2,
                    value: {
                    stt: parseNullableNumber(row["STT"]) ?? idx + 1,
                    tenPhanLo: normalizeImportText(row["Tên phần lô"]),
                    donViTinh: normalizeImportText(row["Đơn vị tính"]),
                    soLuong: parseNullableNumber(row["Số lượng"]),
                    donGia: parseNullableNumber(row["Đơn giá"]),
                    thanhTien: parseNullableNumber(row["Thành tiền"]),
                    thoiGianThucHien: normalizeDurationImportValue(row["Thời gian thực hiện gói thầu"]),
                    donViTinhThoiGian: normalizeImportText(row["Đơn vị tính TGTHHGT"]),
                    },
                }));
                const meaningfulRows = parsed.filter((item) => !isImportedPhanLoBlank(item.value));

                if (meaningfulRows.length === 0) {
                    alert("File Excel không có dòng phần lô hợp lệ để nhập.");
                    return;
                }

                const rowsMissingTenPhanLo = meaningfulRows
                    .filter((item) => item.value.tenPhanLo === "")
                    .map((item) => item.rowNumber);

                if (rowsMissingTenPhanLo.length > 0) {
                    alert(
                        `File Excel có dòng thiếu Tên phần lô: ${rowsMissingTenPhanLo.join(", ")}. Vui lòng kiểm tra lại file trước khi nhập.`
                    );
                    return;
                }

                const importedPhanLos = meaningfulRows.map((item) => item.value);
                setPhanLos(importedPhanLos);
                setGoiThauForm((prev) => ({ ...prev, soLuongPhanLo: importedPhanLos.length }));
                setExcelModalOpen(false);
            } catch (err) {
                console.error("Error reading Excel:", err);
                alert("Lỗi đọc file Excel. Vui lòng kiểm tra định dạng file.");
            }
        };
        reader.readAsArrayBuffer(file);
        e.target.value = "";
    };

    // ===================== RENDER: LIST VIEW =====================
    if (viewMode === "list") {
        const quyTrinh1Plans = keHoachList.filter((kh) => kh.quyTrinh === 1);
        const quyTrinh2Plans = keHoachList.filter((kh) => kh.quyTrinh === 2);
        const filteredQuyTrinh1Plans = filterPlansByProcurementType(
            quyTrinh1Plans,
            procurementTypeFilter,
            (kh) => kh.loaiMuaSam
        );
        const filteredQuyTrinh2Plans = filterPlansByProcurementType(
            quyTrinh2Plans,
            procurementTypeFilter,
            (kh) => kh.loaiMuaSamTuQuyet
        );
        const isProcurementTypeFilterApplied = procurementTypeFilter !== "all";
        const visiblePlanCount = listTab === "quyTrinh1"
            ? filteredQuyTrinh1Plans.length
            : filteredQuyTrinh2Plans.length;
        const totalPlanCount = listTab === "quyTrinh1"
            ? quyTrinh1Plans.length
            : quyTrinh2Plans.length;

        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800">
                            Lập Kế hoạch lựa chọn nhà thầu
                        </h2>
                        <p className="text-gray-500 mt-1">
                            Quản lý danh sách kế hoạch LCNT
                        </p>
                    </div>
                    <Button
                        onClick={handleCreateNew}
                        className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl shadow-lg px-6"
                    >
                        <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Tạo Kế hoạch
                    </Button>
                </div>

                <Tabs value={listTab} onValueChange={setListTab}>
                    <TabsList className="grid w-full grid-cols-2 max-w-2xl">
                        <TabsTrigger value="quyTrinh1">
                            <div className="flex items-center gap-2">
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

                    <div className="mt-4 flex flex-col gap-4 rounded-xl border border-slate-200 bg-slate-50/80 p-4 md:flex-row md:items-end md:justify-between">
                        <div className="space-y-1">
                            <p className="text-sm font-semibold text-slate-700">Bộ lọc danh sách</p>
                            <p className="text-sm text-slate-500">
                                Áp dụng cho cả hai tab theo loại mua sắm tương ứng.
                            </p>
                        </div>
                        <div className="w-full space-y-2 md:max-w-sm">
                            <Label className="text-sm text-slate-600">Loại mua sắm</Label>
                            <Select
                                value={procurementTypeFilter}
                                onValueChange={handleProcurementTypeFilterChange}
                            >
                                <SelectTrigger className="bg-white">
                                    <SelectValue placeholder="Chọn loại mua sắm" />
                                </SelectTrigger>
                                <SelectContent>
                                    {PROCUREMENT_TYPE_FILTER_OPTIONS.map((option) => (
                                        <SelectItem key={option.value} value={option.value}>
                                            {option.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-slate-500">
                                Đang hiển thị {visiblePlanCount}/{totalPlanCount} kế hoạch
                            </p>
                        </div>
                    </div>

                    <TabsContent value="quyTrinh1" className="mt-6">
                        <Card className="border-0 shadow-lg">
                            <CardContent className="p-0">
                                <div className="rounded-xl overflow-hidden">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="bg-blue-600 hover:bg-blue-600">
                                                <TableHead className="text-white font-bold">STT</TableHead>
                                                <TableHead className="text-white font-bold">Mã KHLCNT</TableHead>
                                                <TableHead className="text-white font-bold">Tên KHLCNT</TableHead>
                                                <TableHead className="text-white font-bold">Số gói thầu</TableHead>
                                                <TableHead className="text-white font-bold">Trạng thái</TableHead>
                                                <TableHead className="text-white font-bold">Ngày tạo</TableHead>
                                                <TableHead className="text-white font-bold">Thao tác</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {filteredQuyTrinh1Plans.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={7} className="text-center py-12 text-gray-400">
                                                        <div className="flex flex-col items-center gap-3">
                                                            <svg className="w-12 h-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                            </svg>
                                                            <p>
                                                                {isProcurementTypeFilterApplied
                                                                    ? "Không có kế hoạch phù hợp với loại mua sắm đã chọn."
                                                                    : "Chưa có kế hoạch theo Luật Đấu thầu."}
                                                            </p>
                                                            <p className="text-sm">
                                                                {isProcurementTypeFilterApplied
                                                                    ? "Thử chọn \"Tất cả\" hoặc đổi sang loại mua sắm khác."
                                                                    : "Nhấn \"Tạo Kế hoạch\" để bắt đầu."}
                                                            </p>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                filteredQuyTrinh1Plans.map((kh, idx) => (
                                                    <TableRow key={kh.id} className="hover:bg-blue-50/50">
                                                        <TableCell className="font-medium">{idx + 1}</TableCell>
                                                        <TableCell>{kh.maKHLCNT || "—"}</TableCell>
                                                        <TableCell className="max-w-xs whitespace-normal break-words">{kh.tenKHLCNT || "—"}</TableCell>
                                                        <TableCell>{kh.goiThaus?.length || 0}</TableCell>
                                                        <TableCell>
                                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${kh.trangThai === "Đã đăng tải"
                                                                ? "bg-green-100 text-green-700"
                                                                : "bg-amber-100 text-amber-700"
                                                                }`}>
                                                                {kh.trangThai}
                                                            </span>
                                                        </TableCell>
                                                        <TableCell className="text-sm text-gray-500">
                                                            {kh.createdAt
                                                                ? new Date(kh.createdAt).toLocaleDateString("vi-VN")
                                                                : "—"}
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="flex gap-2">
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => handleSelectPlan(kh)}
                                                                    className="text-blue-600 hover:text-blue-800 hover:bg-blue-100"
                                                                >
                                                                    <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                                    </svg>
                                                                    Xem
                                                                </Button>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => handleEditPlan(kh)}
                                                                    className="text-emerald-600 hover:text-emerald-800 hover:bg-emerald-100"
                                                                >
                                                                    <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                                    </svg>
                                                                    Sửa
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

                    <TabsContent value="quyTrinh2" className="mt-6">
                        <Card className="border-0 shadow-lg">
                            <CardContent className="p-0">
                                <div className="rounded-xl overflow-hidden">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="bg-emerald-600 hover:bg-emerald-600">
                                                <TableHead className="text-white font-bold">STT</TableHead>
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
                                            {filteredQuyTrinh2Plans.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={8} className="text-center py-12 text-gray-400">
                                                        <div className="flex flex-col items-center gap-3">
                                                            <svg className="w-12 h-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                                            </svg>
                                                            <p>
                                                                {isProcurementTypeFilterApplied
                                                                    ? "Không có kế hoạch phù hợp với loại mua sắm đã chọn."
                                                                    : "Chưa có kế hoạch Tự quyết định."}
                                                            </p>
                                                            <p className="text-sm">
                                                                {isProcurementTypeFilterApplied
                                                                    ? "Thử chọn \"Tất cả\" hoặc đổi sang loại mua sắm khác."
                                                                    : "Nhấn \"Tạo Kế hoạch\" để bắt đầu."}
                                                            </p>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                filteredQuyTrinh2Plans.map((kh, idx) => (
                                                    <TableRow key={kh.id} className="hover:bg-emerald-50/50">
                                                        <TableCell className="font-medium">{idx + 1}</TableCell>
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
                                                            {kh.createdAt
                                                                ? new Date(kh.createdAt).toLocaleDateString("vi-VN")
                                                                : "—"}
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="flex gap-2">
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => handleSelectPlan(kh)}
                                                                    className="text-emerald-600 hover:text-emerald-800 hover:bg-emerald-100"
                                                                >
                                                                    <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                                    </svg>
                                                                    Xem
                                                                </Button>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => handleEditPlan(kh)}
                                                                    className="text-emerald-600 hover:text-emerald-800 hover:bg-emerald-100"
                                                                >
                                                                    <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                                    </svg>
                                                                    Sửa
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
            </div>
        );
    }

    // ===================== RENDER: DETAIL VIEW =====================
    return (
        <div className="space-y-6">
            {/* Header with back button */}
            <div className="flex items-center gap-4">
                <Button
                    variant="ghost"
                    onClick={handleBackToList}
                    className="text-gray-600 hover:text-blue-700 hover:bg-blue-50 rounded-xl"
                >
                    <svg className="w-5 h-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Quay lại
                </Button>
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">
                        {keHoach.id ? "Chi tiết Kế hoạch LCNT" : "Tạo Kế hoạch LCNT mới"}
                    </h2>
                    <p className="text-gray-500 mt-0.5 text-sm">
                        {keHoach.id ? keHoach.tenKHLCNT || keHoach.maKHLCNT || "" : "Nhập thông tin kế hoạch lựa chọn nhà thầu"}
                    </p>
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className={`grid w-full max-w-md ${keHoach.quyTrinh === 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                    <TabsTrigger value="tab1">Thông tin chung</TabsTrigger>
                    {keHoach.quyTrinh === 1 && (
                        <TabsTrigger value="tab2">Thông tin gói thầu</TabsTrigger>
                    )}
                </TabsList>

                {/* =================== TAB 1 =================== */}
                <TabsContent value="tab1">
                    <Card className="border-0 shadow-lg">
                        <CardHeader>
                            <CardTitle className="text-lg text-blue-800">
                                Thông tin chung
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Auto-filled info */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-blue-50 rounded-xl border border-blue-100">
                                <div>
                                    <Label className="text-sm text-gray-500">Tên đơn vị</Label>
                                    <p className="font-semibold text-gray-800 mt-1">
                                        {session?.user?.name || "—"}
                                    </p>
                                </div>
                                <div>
                                    <Label className="text-sm text-gray-500">Mã đơn vị</Label>
                                    <p className="font-semibold text-gray-800 mt-1">
                                        {session?.user?.facilityCode || "—"}
                                    </p>
                                </div>
                                <div>
                                    <Label className="text-sm text-gray-500">Phân loại tự chủ</Label>
                                    <p className="font-semibold text-gray-800 mt-1">—</p>
                                </div>
                            </div>

                            {/* Quy trình selection */}
                            <div className="space-y-3">
                                <Label className="text-base font-semibold text-gray-700">
                                    Quy trình <span className="text-red-500">*</span>
                                </Label>
                                <div className="space-y-3">
                                    <label className="flex items-start gap-3 p-4 rounded-xl border border-gray-200 hover:border-blue-400 hover:bg-blue-50/50 cursor-pointer transition-all">
                                        <input
                                            type="radio"
                                            name="quyTrinh"
                                            value={1}
                                            checked={keHoach.quyTrinh === 1}
                                            onChange={() => setKeHoach({ ...keHoach, quyTrinh: 1 })}
                                            className="mt-1 w-4 h-4 text-blue-600"
                                            disabled={!!keHoach.id && !editMode}
                                        />
                                        <div>
                                            <p className="font-medium text-gray-800">
                                                1. Áp dụng quy trình theo Luật Đấu thầu
                                            </p>
                                            <p className="text-sm text-gray-500 mt-0.5">
                                                Thực hiện đầy đủ quy trình theo quy định
                                            </p>
                                        </div>
                                    </label>
                                    <label className="flex items-start gap-3 p-4 rounded-xl border border-gray-200 hover:border-blue-400 hover:bg-blue-50/50 cursor-pointer transition-all">
                                        <input
                                            type="radio"
                                            name="quyTrinh"
                                            value={2}
                                            checked={keHoach.quyTrinh === 2}
                                            onChange={() => setKeHoach({ ...keHoach, quyTrinh: 2 })}
                                            className="mt-1 w-4 h-4 text-blue-600"
                                            disabled={!!keHoach.id && !editMode}
                                        />
                                        <div>
                                            <p className="font-medium text-gray-800">
                                                2. Không áp dụng quy trình theo Luật đấu thầu (tự quyết định)
                                            </p>
                                            <p className="text-sm text-gray-500 mt-0.5">
                                                Cơ sở tự quyết định quy trình mua sắm
                                            </p>
                                        </div>
                                    </label>
                                </div>
                            </div>

                            {/* KHLCNT Details - only shown when quyTrinh === 1 */}
                            {keHoach.quyTrinh === 1 && (
                                <div className="space-y-4 p-5 bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl border border-indigo-100">
                                    <h3 className="font-semibold text-indigo-800 text-base">
                                        Thông tin Kế hoạch LCNT
                                    </h3>
                                    <div className="space-y-4">
                                        {/* Loại mua sắm */}
                                        <div className="space-y-3">
                                            <Label className="text-base font-semibold text-gray-700">
                                                Loại mua sắm <span className="text-red-500">*</span>
                                            </Label>
                                            <div className="space-y-3">
                                                <label className="flex items-start gap-3 p-4 rounded-xl border border-gray-200 hover:border-blue-400 hover:bg-blue-50/50 cursor-pointer transition-all">
                                                    <input
                                                        type="radio"
                                                        name="loaiMuaSam"
                                                        value="Thuốc"
                                                        checked={keHoach.loaiMuaSam === "Thuốc"}
                                                        onChange={(e) => setKeHoach({ ...keHoach, loaiMuaSam: e.target.value })}
                                                        className="mt-1 w-4 h-4 text-blue-600"
                                                        disabled={!!keHoach.id && !editMode}
                                                    />
                                                    <div>
                                                        <p className="font-medium text-gray-800">
                                                            1. Thuốc
                                                        </p>
                                                    </div>
                                                </label>
                                                <label className="flex items-start gap-3 p-4 rounded-xl border border-gray-200 hover:border-blue-400 hover:bg-blue-50/50 cursor-pointer transition-all">
                                                    <input
                                                        type="radio"
                                                        name="loaiMuaSam"
                                                        value="Hóa chất, vật tư, thiết bị y tế"
                                                        checked={keHoach.loaiMuaSam === "Hóa chất, vật tư, thiết bị y tế"}
                                                        onChange={(e) => setKeHoach({ ...keHoach, loaiMuaSam: e.target.value })}
                                                        className="mt-1 w-4 h-4 text-blue-600"
                                                        disabled={!!keHoach.id && !editMode}
                                                    />
                                                    <div>
                                                        <p className="font-medium text-gray-800">
                                                            2. Hóa chất, vật tư, thiết bị y tế
                                                        </p>
                                                    </div>
                                                </label>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="maKHLCNT">Mã KHLCNT</Label>
                                            <Input
                                                id="maKHLCNT"
                                                value={keHoach.maKHLCNT}
                                                onChange={(e) => setKeHoach({ ...keHoach, maKHLCNT: e.target.value })}
                                                placeholder="Nhập mã KHLCNT"
                                                disabled={!!keHoach.id && !editMode}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="tenKHLCNT">Tên KHLCNT</Label>
                                            <Input
                                                id="tenKHLCNT"
                                                value={keHoach.tenKHLCNT}
                                                onChange={(e) => setKeHoach({ ...keHoach, tenKHLCNT: e.target.value })}
                                                placeholder="Nhập tên KHLCNT"
                                                disabled={!!keHoach.id && !editMode}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="soQuyetDinh">Số Quyết định phê duyệt KHLCNT</Label>
                                            <Input
                                                id="soQuyetDinh"
                                                value={keHoach.soQuyetDinh}
                                                onChange={(e) => setKeHoach({ ...keHoach, soQuyetDinh: e.target.value })}
                                                placeholder="Nhập số quyết định"
                                                disabled={!!keHoach.id && !editMode}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="ngayPheDuyet">Ngày phê duyệt KHLCNT</Label>
                                            <Input
                                                id="ngayPheDuyet"
                                                type="date"
                                                value={keHoach.ngayPheDuyet}
                                                onChange={(e) => setKeHoach({ ...keHoach, ngayPheDuyet: e.target.value })}
                                                disabled={!!keHoach.id && !editMode}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="soLuongGoiThau">Số lượng gói thầu</Label>
                                            <Input
                                                id="soLuongGoiThau"
                                                type="number"
                                                value={keHoach.soLuongGoiThau ?? ""}
                                                onChange={(e) => setKeHoach({
                                                    ...keHoach,
                                                    soLuongGoiThau: e.target.value ? parseInt(e.target.value) : null,
                                                })}
                                                placeholder="Nhập số lượng"
                                                disabled={!!keHoach.id && !editMode}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Trạng thái</Label>
                                            <Select
                                                value={keHoach.trangThai}
                                                onValueChange={(val) => setKeHoach({ ...keHoach, trangThai: val })}
                                                disabled={!!keHoach.id && !editMode}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Chọn trạng thái" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="Chưa đăng tải">Chưa đăng tải</SelectItem>
                                                    <SelectItem value="Đã đăng tải">Đã đăng tải</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Self-Decision Process Section - only shown when quyTrinh === 2 */}
                            {keHoach.quyTrinh === 2 && (
                                <div className="space-y-4 p-5 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl border border-emerald-100">
                                    <h3 className="font-semibold text-emerald-800 text-base">
                                        Thông tin Mua sắm Tự quyết định
                                    </h3>
                                    <div className="space-y-4">
                                        {/* Loại mua sắm */}
                                        <div className="space-y-3">
                                            <Label className="text-base font-semibold text-gray-700">
                                                Loại mua sắm <span className="text-red-500">*</span>
                                            </Label>
                                            <div className="space-y-3">
                                                <label className="flex items-start gap-3 p-4 rounded-xl border border-gray-200 hover:border-emerald-400 hover:bg-emerald-50/50 cursor-pointer transition-all">
                                                    <input
                                                        type="radio"
                                                        name="loaiMuaSamTuQuyet"
                                                        value="Thuốc"
                                                        checked={keHoach.loaiMuaSamTuQuyet === "Thuốc"}
                                                        onChange={(e) => setKeHoach({ ...keHoach, loaiMuaSamTuQuyet: e.target.value })}
                                                        className="mt-1 w-4 h-4 text-emerald-600"
                                                        disabled={!!keHoach.id && !editMode}
                                                    />
                                                    <div>
                                                        <p className="font-medium text-gray-800">
                                                            1. Thuốc
                                                        </p>
                                                    </div>
                                                </label>
                                                <label className="flex items-start gap-3 p-4 rounded-xl border border-gray-200 hover:border-emerald-400 hover:bg-emerald-50/50 cursor-pointer transition-all">
                                                    <input
                                                        type="radio"
                                                        name="loaiMuaSamTuQuyet"
                                                        value="Hóa chất, vật tư, thiết bị y tế"
                                                        checked={keHoach.loaiMuaSamTuQuyet === "Hóa chất, vật tư, thiết bị y tế"}
                                                        onChange={(e) => setKeHoach({ ...keHoach, loaiMuaSamTuQuyet: e.target.value })}
                                                        className="mt-1 w-4 h-4 text-emerald-600"
                                                        disabled={!!keHoach.id && !editMode}
                                                    />
                                                    <div>
                                                        <p className="font-medium text-gray-800">
                                                            2. Hóa chất, vật tư, thiết bị y tế
                                                        </p>
                                                    </div>
                                                </label>
                                            </div>
                                        </div>

                                        {/* Date fields */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="thoiGianBatDauMuaSam">
                                                    Thời gian bắt đầu mua sắm (dự kiến nếu chưa thực hiện)
                                                </Label>
                                                <Input
                                                    id="thoiGianBatDauMuaSam"
                                                    type="date"
                                                    value={keHoach.thoiGianBatDauMuaSam}
                                                    onChange={(e) => setKeHoach({ ...keHoach, thoiGianBatDauMuaSam: e.target.value })}
                                                    disabled={!!keHoach.id && !editMode}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="thoiGianBatDauThucHienHopDong">
                                                    Thời gian bắt đầu thực hiện hợp đồng (dự kiến nếu chưa thực hiện)
                                                </Label>
                                                <Input
                                                    id="thoiGianBatDauThucHienHopDong"
                                                    type="date"
                                                    value={keHoach.thoiGianBatDauThucHienHopDong}
                                                    onChange={(e) => setKeHoach({ ...keHoach, thoiGianBatDauThucHienHopDong: e.target.value })}
                                                    disabled={!!keHoach.id && !editMode}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="thoiGianThucHienHopDong">
                                                    Thời gian thực hiện hợp đồng (dự kiến nếu chưa thực hiện)
                                                </Label>
                                                <Input
                                                    id="thoiGianThucHienHopDong"
                                                    type="text"
                                                    value={keHoach.thoiGianThucHienHopDong}
                                                    onChange={(e) => setKeHoach({ ...keHoach, thoiGianThucHienHopDong: e.target.value })}
                                                    placeholder="VD: 12 tháng"
                                                    disabled={!!keHoach.id && !editMode}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="thoiGianKetThucHopDong">
                                                    Thời gian kết thúc hợp đồng (dự kiến nếu chưa thực hiện)
                                                </Label>
                                                <Input
                                                    id="thoiGianKetThucHopDong"
                                                    type="date"
                                                    value={keHoach.thoiGianKetThucHopDong}
                                                    onChange={(e) => setKeHoach({ ...keHoach, thoiGianKetThucHopDong: e.target.value })}
                                                    disabled={!!keHoach.id && !editMode}
                                                />
                                            </div>
                                        </div>

                                        {/* Excel import button */}
                                        <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <h4 className="font-semibold text-amber-800">Dữ liệu phần lô</h4>
                                                    <p className="text-sm text-amber-600 mt-0.5">Nhập dữ liệu phần lô từ file Excel</p>
                                                </div>
                                                <Button
                                                    onClick={() => setExcelModalOpen(true)}
                                                    className="bg-amber-500 hover:bg-amber-600 text-white rounded-xl"
                                                    type="button"
                                                >
                                                    <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                                    </svg>
                                                    Nhận dữ liệu từ Excel
                                                </Button>
                                            </div>

                                            {phanLos.length > 0 && (
                                                <div className="mt-4 rounded-lg border overflow-hidden">
                                                    <Table>
                                                        <TableHeader>
                                                            <TableRow className="bg-amber-100">
                                                                <TableHead className="font-bold text-amber-900">STT</TableHead>
                                                                <TableHead className="font-bold text-amber-900">Tên phần lô</TableHead>
                                                                <TableHead className="font-bold text-amber-900">Đơn vị tính</TableHead>
                                                                <TableHead className="font-bold text-amber-900">Số lượng</TableHead>
                                                                <TableHead className="font-bold text-amber-900">Đơn giá</TableHead>
                                                                <TableHead className="font-bold text-amber-900">Thành tiền</TableHead>
                                                                <TableHead className="font-bold text-amber-900">TG thực hiện</TableHead>
                                                                <TableHead className="font-bold text-amber-900">ĐVT TG</TableHead>
                                                            </TableRow>
                                                        </TableHeader>
                                                        <TableBody>
                                                            {phanLos.map((pl) => (
                                                                <TableRow key={pl.stt}>
                                                                    <TableCell>{pl.stt}</TableCell>
                                                                    <TableCell>{formatDisplayText(pl.tenPhanLo)}</TableCell>
                                                                    <TableCell>{formatDisplayText(pl.donViTinh)}</TableCell>
                                                                    <TableCell>{pl.soLuong?.toLocaleString("vi-VN") ?? "—"}</TableCell>
                                                                    <TableCell>{pl.donGia?.toLocaleString("vi-VN") ?? "—"}</TableCell>
                                                                    <TableCell>{pl.thanhTien?.toLocaleString("vi-VN") ?? "—"}</TableCell>
                                                                    <TableCell>{formatDisplayText(pl.thoiGianThucHien)}</TableCell>
                                                                    <TableCell>{formatDisplayText(pl.donViTinhThoiGian)}</TableCell>
                                                                </TableRow>
                                                            ))}
                                                        </TableBody>
                                                    </Table>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Save button - for new plans OR edit mode */}
                            {(!keHoach.id || editMode) && (
                                <div className="flex justify-end pt-4">
                                    <Button
                                        onClick={handleSaveKeHoach}
                                        disabled={loading || keHoach.quyTrinh === 0}
                                        className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-8 py-2.5 rounded-xl shadow-lg hover:shadow-xl transition-all"
                                    >
                                        {loading ? (
                                            <span className="flex items-center gap-2">
                                                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                                </svg>
                                                Đang lưu...
                                            </span>
                                        ) : (
                                            editMode ? "CẬP NHẬT" : "LƯU"
                                        )}
                                    </Button>
                                </div>
                            )}

                            {/* If plan already saved and NOT in edit mode, show button to go to tab 2 (only for quyTrinh=1) */}
                            {keHoach.id && !editMode && keHoach.quyTrinh === 1 && (
                                <div className="flex justify-end pt-4">
                                    <Button
                                        onClick={() => setActiveTab("tab2")}
                                        className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-xl px-6 shadow-lg"
                                    >
                                        Xem gói thầu →
                                    </Button>
                                </div>
                            )}

                            {/* For quyTrinh=2, show back to list button after saving */}
                            {keHoach.id && !editMode && keHoach.quyTrinh === 2 && (
                                <div className="flex justify-end pt-4">
                                    <Button
                                        onClick={handleBackToList}
                                        className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white rounded-xl px-6 shadow-lg"
                                    >
                                        Quay lại danh sách
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* =================== TAB 2 =================== */}
                <TabsContent value="tab2">
                    <div className="space-y-6">
                        {/* Section 1: Bảng danh sách gói thầu */}
                        <Card className="border-0 shadow-lg">
                            <CardHeader className="flex flex-row items-center justify-between">
                                <CardTitle className="text-lg text-blue-800">
                                    Danh sách gói thầu
                                </CardTitle>
                                <Button
                                    onClick={handleCreateGoiThau}
                                    className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-xl shadow-md"
                                >
                                    <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                    Thêm gói thầu
                                </Button>
                            </CardHeader>
                            <CardContent>
                                <div className="rounded-xl border overflow-hidden">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="bg-blue-600 hover:bg-blue-600">
                                                <TableHead className="text-white font-bold">STT</TableHead>
                                                <TableHead className="text-white font-bold">Tên gói thầu</TableHead>
                                                <TableHead className="text-white font-bold">Giá gói thầu</TableHead>
                                                <TableHead className="text-white font-bold">Số lượng phần lô</TableHead>
                                                <TableHead className="text-white font-bold">Luồng TBMT</TableHead>
                                                <TableHead className="text-white font-bold">Trạng thái</TableHead>
                                                <TableHead className="text-white font-bold">Mã thông báo liên kết</TableHead>
                                                <TableHead className="text-white font-bold">Chọn thao tác</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {goiThauList.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={8} className="text-center py-8 text-gray-400">
                                                        Chưa có gói thầu nào. Nhấn &quot;Thêm gói thầu&quot; để bắt đầu.
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                goiThauList.map((gt, idx) => {
                                                    const displayStatus = getGoiThauDisplayStatus(gt);

                                                    return (
                                                        <TableRow key={gt.id || idx} className="hover:bg-blue-50/50">
                                                            <TableCell className="font-medium">{idx + 1}</TableCell>
                                                            <TableCell>{gt.tenGoiThau}</TableCell>
                                                            <TableCell>
                                                                {hasDisplayNumber(gt.giaGoiThau) ? Number(gt.giaGoiThau).toLocaleString("vi-VN") : "—"}
                                                            </TableCell>
                                                            <TableCell>{gt.soLuongPhanLo ?? "—"}</TableCell>
                                                            <TableCell>
                                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${gt.yeuCauTBMT ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-700"}`}>
                                                                    {gt.yeuCauTBMT ? "Có TBMT" : "Không yêu cầu TBMT"}
                                                                </span>
                                                            </TableCell>
                                                            <TableCell>
                                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getGoiThauStatusBadgeClassName(displayStatus)}`}>
                                                                    {displayStatus}
                                                                </span>
                                                            </TableCell>
                                                            <TableCell>{getLinkedThongBaoCode(gt)}</TableCell>
                                                            <TableCell>
                                                                <div className="flex gap-2">
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        className="text-blue-600 hover:text-blue-800 hover:bg-blue-100"
                                                                        onClick={() => {
                                                                            setSelectedGoiThau(gt);
                                                                            setViewGoiThauDialogOpen(true);
                                                                        }}
                                                                    >
                                                                        <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                                        </svg>
                                                                        Xem
                                                                    </Button>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        onClick={() => handleEditGoiThau(gt)}
                                                                        disabled={!canEditGoiThau(gt)}
                                                                        title={
                                                                            canEditGoiThau(gt)
                                                                                ? "Sửa thông tin gói thầu"
                                                                                : "Không thể sửa gói thầu đã có dữ liệu liên kết"
                                                                        }
                                                                        className="text-emerald-600 hover:text-emerald-800 hover:bg-emerald-100 disabled:text-gray-400 disabled:hover:bg-transparent"
                                                                    >
                                                                        <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                                        </svg>
                                                                        Sửa
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

                        {/* Section 2: Form chi tiết gói thầu */}
                        {showGoiThauForm && (
                            <Card className="border-0 shadow-lg">
                                <CardHeader>
                                    <CardTitle className="text-lg text-blue-800">
                                        {editingGoiThauId ? "Sửa thông tin gói thầu" : "Thông tin chi tiết gói thầu"}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="tenGoiThau">Tên gói thầu <span className="text-red-500">*</span></Label>
                                            <Input
                                                id="tenGoiThau"
                                                value={goiThauForm.tenGoiThau}
                                                onChange={(e) => setGoiThauForm({ ...goiThauForm, tenGoiThau: e.target.value })}
                                                placeholder="Nhập tên gói thầu"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Luồng Thông báo mời thầu</Label>
                                            <Select
                                                value={goiThauForm.yeuCauTBMT ? "required" : "not-required"}
                                                onValueChange={(val) => setGoiThauForm({ ...goiThauForm, yeuCauTBMT: val === "required" })}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="required">Có Thông báo mời thầu</SelectItem>
                                                    <SelectItem value="not-required">Không có Thông báo mời thầu</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="giaGoiThau">Giá gói thầu (VNĐ)</Label>
                                            <Input
                                                id="giaGoiThau"
                                                type="number"
                                                value={calculatedGiaGoiThau ?? ""}
                                                readOnly
                                                placeholder="Được tính tự động từ phần lô"
                                                className="bg-gray-50"
                                            />
                                            <p className="text-xs text-gray-500">
                                                Hệ thống tự động lấy tổng cột Thành tiền của các phần lô.
                                            </p>
                                        </div>
                                    </div>

                                    {/* Lĩnh vực */}
                                    <div className="space-y-2">
                                        <Label className="font-semibold">Lĩnh vực</Label>
                                        <Select
                                            value={goiThauForm.linhVuc[0] || ""}
                                            onValueChange={(val) =>
                                                setGoiThauForm((prev) => ({
                                                    ...prev,
                                                    linhVuc: val ? [val] : [],
                                                }))
                                            }
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Chọn lĩnh vực" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {LINH_VUC_OPTIONS.map((opt) => (
                                                    <SelectItem key={opt} value={opt}>
                                                        {opt}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Hình thức LCNT</Label>
                                            <Select value={goiThauForm.hinhThucLCNT} onValueChange={(val) => setGoiThauForm({ ...goiThauForm, hinhThucLCNT: val })}>
                                                <SelectTrigger><SelectValue placeholder="Chọn hình thức" /></SelectTrigger>
                                                <SelectContent>
                                                    {HINH_THUC_OPTIONS.map((opt) => (<SelectItem key={opt} value={opt}>{opt}</SelectItem>))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Phương thức LCNT</Label>
                                            <Select value={goiThauForm.phuongThucLCNT} onValueChange={(val) => setGoiThauForm({ ...goiThauForm, phuongThucLCNT: val })}>
                                                <SelectTrigger><SelectValue placeholder="Chọn phương thức" /></SelectTrigger>
                                                <SelectContent>
                                                    {PHUONG_THUC_OPTIONS.map((opt) => (<SelectItem key={opt} value={opt}>{opt}</SelectItem>))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    {/* Loại hợp đồng */}
                                    <div className="space-y-2">
                                        <Label className="font-semibold">Loại hợp đồng</Label>
                                        <Select
                                            value={goiThauForm.loaiHopDong[0] || ""}
                                            onValueChange={(val) =>
                                                setGoiThauForm((prev) => ({
                                                    ...prev,
                                                    loaiHopDong: val ? [val] : [],
                                                }))
                                            }
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Chọn loại hợp đồng" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {LOAI_HOP_DONG_OPTIONS.map((opt) => (
                                                    <SelectItem key={opt} value={opt}>
                                                        {opt}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Phân loại gói thầu</Label>
                                            <Select value={goiThauForm.phanLoaiGoiThau} onValueChange={(val) => setGoiThauForm({ ...goiThauForm, phanLoaiGoiThau: val })}>
                                                <SelectTrigger><SelectValue placeholder="Chọn phân loại" /></SelectTrigger>
                                                <SelectContent>
                                                    {PHAN_LOAI_OPTIONS.map((opt) => (<SelectItem key={opt} value={opt}>{opt}</SelectItem>))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="chiTietNguonVon">Chi tiết nguồn vốn</Label>
                                            <Input id="chiTietNguonVon" value={goiThauForm.chiTietNguonVon} onChange={(e) => setGoiThauForm({ ...goiThauForm, chiTietNguonVon: e.target.value })} placeholder="Nhập chi tiết nguồn vốn" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="soLuongPhanLo">Số lượng phần lô</Label>
                                            <Input id="soLuongPhanLo" type="number" value={goiThauForm.soLuongPhanLo ?? ""} onChange={(e) => setGoiThauForm({ ...goiThauForm, soLuongPhanLo: e.target.value ? parseInt(e.target.value) : null })} placeholder="Nhập số lượng" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="thoiGianToChuc">Thời gian tổ chức LCNT</Label>
                                            <Input id="thoiGianToChuc" value={goiThauForm.thoiGianToChuc} onChange={(e) => setGoiThauForm({ ...goiThauForm, thoiGianToChuc: e.target.value })} placeholder="Nhập thời gian" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="thoiGianBatDau">Thời gian bắt đầu tổ chức LCNT</Label>
                                            <Input
                                                id="thoiGianBatDau"
                                                type="text"
                                                value={goiThauForm.thoiGianBatDau}
                                                onChange={(e) => setGoiThauForm({ ...goiThauForm, thoiGianBatDau: e.target.value })}
                                                placeholder="VD: Quý III/2026 hoặc sau khi phê duyệt"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="thoiGianThucHien">Thời gian thực hiện gói thầu</Label>
                                            <Input id="thoiGianThucHien" value={goiThauForm.thoiGianThucHien} onChange={(e) => setGoiThauForm({ ...goiThauForm, thoiGianThucHien: e.target.value })} placeholder="VD: 12 tháng" />
                                        </div>
                                    </div>

                                    {/* Excel import section */}
                                    <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h4 className="font-semibold text-amber-800">Dữ liệu phần lô</h4>
                                                <p className="text-sm text-amber-600 mt-0.5">Nhập dữ liệu phần lô từ file Excel</p>
                                            </div>
                                            <Button onClick={() => setExcelModalOpen(true)} className="bg-amber-500 hover:bg-amber-600 text-white rounded-xl">
                                                <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                                </svg>
                                                Nhận dữ liệu từ Excel
                                            </Button>
                                        </div>

                                        {phanLos.length > 0 && (
                                            <div className="mt-4 rounded-lg border overflow-hidden">
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow className="bg-amber-100">
                                                            <TableHead className="font-bold text-amber-900">STT</TableHead>
                                                            <TableHead className="font-bold text-amber-900">Tên phần lô</TableHead>
                                                            <TableHead className="font-bold text-amber-900">Đơn vị tính</TableHead>
                                                            <TableHead className="font-bold text-amber-900">Số lượng</TableHead>
                                                            <TableHead className="font-bold text-amber-900">Đơn giá</TableHead>
                                                            <TableHead className="font-bold text-amber-900">Thành tiền</TableHead>
                                                            <TableHead className="font-bold text-amber-900">TG thực hiện</TableHead>
                                                            <TableHead className="font-bold text-amber-900">ĐVT TG</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {phanLos.map((pl) => (
                                                            <TableRow key={pl.stt}>
                                                                <TableCell>{pl.stt}</TableCell>
                                                                <TableCell>{formatDisplayText(pl.tenPhanLo)}</TableCell>
                                                                <TableCell>{formatDisplayText(pl.donViTinh)}</TableCell>
                                                                <TableCell>{pl.soLuong?.toLocaleString("vi-VN") ?? "—"}</TableCell>
                                                                <TableCell>{pl.donGia?.toLocaleString("vi-VN") ?? "—"}</TableCell>
                                                                <TableCell>{pl.thanhTien?.toLocaleString("vi-VN") ?? "—"}</TableCell>
                                                                <TableCell>{formatDisplayText(pl.thoiGianThucHien)}</TableCell>
                                                                <TableCell>{formatDisplayText(pl.donViTinhThoiGian)}</TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            </div>
                                        )}
                                    </div>

                                    {/* Save button */}
                                    <div className="flex justify-end gap-3 pt-4">
                                        <Button variant="outline" onClick={handleCloseGoiThauForm} className="rounded-xl">
                                            Hủy
                                        </Button>
                                        <Button
                                            onClick={handleSaveGoiThau}
                                            disabled={loading}
                                            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-8 py-2.5 rounded-xl shadow-lg hover:shadow-xl transition-all"
                                        >
                                            {loading
                                                ? "Đang lưu..."
                                                : editingGoiThauId
                                                    ? "CẬP NHẬT GÓI THẦU"
                                                    : "LƯU GÓI THẦU"}
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </TabsContent>
            </Tabs>

            {/* =================== SUCCESS MODAL =================== */}
            <Dialog open={successModalOpen} onOpenChange={setSuccessModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-center">
                            <div className="flex flex-col items-center gap-3">
                                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                                    <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                                <span className="text-xl font-bold text-gray-800">Thông báo</span>
                            </div>
                        </DialogTitle>
                    </DialogHeader>
                    <div className="text-center space-y-4">
                        <p className="text-gray-600 text-lg">Đã tạo thành công KHLCNT</p>
                        <div className="flex justify-center gap-3 pt-2">
                            <Button variant="outline" onClick={() => setSuccessModalOpen(false)} className="rounded-xl">
                                Đóng
                            </Button>
                            <Button
                                onClick={() => {
                                    setSuccessModalOpen(false);
                                    setActiveTab("tab2");
                                }}
                                className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-xl px-6 shadow-lg"
                            >
                                TẠO GÓI THẦU
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* =================== VIEW GOI THAU DIALOG =================== */}
            <Dialog open={viewGoiThauDialogOpen} onOpenChange={setViewGoiThauDialogOpen}>
                <DialogContent className="flex h-[95vh] w-[95vw] max-w-[95vw] flex-col gap-0 overflow-hidden p-0 sm:max-w-[95vw]">
                    <DialogHeader className="shrink-0 border-b px-6 py-4">
                        <DialogTitle className="text-xl text-blue-800">Chi tiết Gói thầu</DialogTitle>
                    </DialogHeader>
                    <div className="flex-1 overflow-y-auto px-6 py-5">
                        {selectedGoiThau ? (
                            <div className="space-y-6">
                                {/* Basic Information */}
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                                    <div className="space-y-2">
                                        <Label className="text-sm text-gray-500">Tên gói thầu</Label>
                                        <p className="font-medium text-gray-800">{formatDisplayText(selectedGoiThau.tenGoiThau)}</p>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-sm text-gray-500">Giá gói thầu</Label>
                                        <p className="font-medium text-gray-800">
                                            {hasDisplayNumber(selectedGoiThau.giaGoiThau) ? Number(selectedGoiThau.giaGoiThau).toLocaleString("vi-VN") + " VNĐ" : "—"}
                                        </p>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-sm text-gray-500">Hình thức LCNT</Label>
                                        <p className="font-medium text-gray-800">{formatDisplayText(selectedGoiThau.hinhThucLCNT)}</p>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-sm text-gray-500">Phương thức LCNT</Label>
                                        <p className="font-medium text-gray-800">{formatDisplayText(selectedGoiThau.phuongThucLCNT)}</p>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-sm text-gray-500">Phân loại gói thầu</Label>
                                        <p className="font-medium text-gray-800">{formatDisplayText(selectedGoiThau.phanLoaiGoiThau)}</p>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-sm text-gray-500">Trạng thái</Label>
                                        <p className="font-medium text-gray-800">{getGoiThauDisplayStatus(selectedGoiThau)}</p>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-sm text-gray-500">Luồng TBMT</Label>
                                        <p className="font-medium text-gray-800">
                                            {selectedGoiThau.yeuCauTBMT ? "Có Thông báo mời thầu" : "Không có Thông báo mời thầu"}
                                        </p>
                                    </div>
                                </div>

                                {/* Linh vuc */}
                                <div className="space-y-2">
                                    <Label className="text-sm text-gray-500">Lĩnh vực</Label>
                                    <div className="flex flex-wrap gap-2">
                                        {selectedGoiThau.linhVuc && selectedGoiThau.linhVuc.length > 0 ? (
                                            selectedGoiThau.linhVuc.map((lv, idx) => (
                                                <span key={idx} className="rounded-full bg-blue-100 px-3 py-1 text-sm text-blue-700">
                                                    {lv}
                                                </span>
                                            ))
                                        ) : (
                                            <span className="text-gray-500">Chưa có</span>
                                        )}
                                    </div>
                                </div>

                                {/* Loai hop dong */}
                                <div className="space-y-2">
                                    <Label className="text-sm text-gray-500">Loại hợp đồng</Label>
                                    <div className="flex flex-wrap gap-2">
                                        {selectedGoiThau.loaiHopDong && selectedGoiThau.loaiHopDong.length > 0 ? (
                                            selectedGoiThau.loaiHopDong.map((lhd, idx) => (
                                                <span key={idx} className="rounded-full bg-emerald-100 px-3 py-1 text-sm text-emerald-700">
                                                    {lhd}
                                                </span>
                                            ))
                                        ) : (
                                            <span className="text-gray-500">Chưa có</span>
                                        )}
                                    </div>
                                </div>

                                {/* Additional details */}
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                                    <div className="space-y-2">
                                        <Label className="text-sm text-gray-500">Chi tiết nguồn vốn</Label>
                                        <p className="font-medium text-gray-800">{formatDisplayText(selectedGoiThau.chiTietNguonVon)}</p>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-sm text-gray-500">Số lượng phần lô</Label>
                                        <p className="font-medium text-gray-800">{selectedGoiThau.soLuongPhanLo ?? "—"}</p>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-sm text-gray-500">Thời gian tổ chức</Label>
                                        <p className="font-medium text-gray-800">{formatDisplayText(selectedGoiThau.thoiGianToChuc)}</p>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-sm text-gray-500">Thời gian bắt đầu</Label>
                                        <p className="font-medium text-gray-800">{formatDisplayText(selectedGoiThau.thoiGianBatDau)}</p>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-sm text-gray-500">Thời gian thực hiện</Label>
                                        <p className="font-medium text-gray-800">{formatDisplayText(selectedGoiThau.thoiGianThucHien)}</p>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-sm text-gray-500">Mã thông báo</Label>
                                        <p className="font-medium text-gray-800">{getLinkedThongBaoCode(selectedGoiThau)}</p>
                                    </div>
                                </div>

                                {/* Phan lo table */}
                                {selectedGoiThau.phanLos && selectedGoiThau.phanLos.length > 0 && (
                                    <div className="space-y-2">
                                        <Label className="text-sm text-gray-500">Danh sách phần lô</Label>
                                        <div className="overflow-x-auto rounded-lg border">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow className="bg-gray-100">
                                                        <TableHead>STT</TableHead>
                                                        <TableHead>Tên phần lô</TableHead>
                                                        <TableHead>Đơn vị tính</TableHead>
                                                        <TableHead>Số lượng</TableHead>
                                                        <TableHead>Đơn giá</TableHead>
                                                        <TableHead>Thành tiền</TableHead>
                                                        <TableHead>TG thực hiện</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {selectedGoiThau.phanLos.map((pl, idx) => (
                                                        <TableRow key={idx}>
                                                            <TableCell>{pl.stt}</TableCell>
                                                            <TableCell>{formatDisplayText(pl.tenPhanLo)}</TableCell>
                                                            <TableCell>{formatDisplayText(pl.donViTinh)}</TableCell>
                                                            <TableCell>{pl.soLuong?.toLocaleString("vi-VN") ?? "—"}</TableCell>
                                                            <TableCell>{pl.donGia?.toLocaleString("vi-VN") ?? "—"}</TableCell>
                                                            <TableCell>{pl.thanhTien?.toLocaleString("vi-VN") ?? "—"}</TableCell>
                                                            <TableCell>{formatDisplayCombinedText(pl.thoiGianThucHien, pl.donViTinhThoiGian)}</TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="py-12 text-center text-gray-400">Không có dữ liệu gói thầu</div>
                        )}
                    </div>
                    <div className="flex shrink-0 justify-end border-t px-6 py-4">
                        <Button
                            onClick={() => setViewGoiThauDialogOpen(false)}
                            className="bg-gray-500 text-white hover:bg-gray-600 rounded-xl"
                        >
                            Đóng
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* =================== EXCEL IMPORT MODAL =================== */}
            <Dialog open={excelModalOpen} onOpenChange={setExcelModalOpen}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Nhập dữ liệu phần lô từ Excel</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-6 py-4">
                        <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h4 className="font-medium text-blue-800">Bước 1: Tải file mẫu</h4>
                                    <p className="text-sm text-blue-600 mt-0.5">Tải file mẫu Excel để nhập dữ liệu</p>
                                </div>
                                <Button onClick={handleDownloadTemplate} variant="outline" className="border-blue-300 text-blue-700 hover:bg-blue-100 rounded-xl">
                                    <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                    </svg>
                                    Tải file mẫu
                                </Button>
                            </div>
                        </div>
                        <div className="p-4 bg-green-50 rounded-xl border border-green-200">
                            <h4 className="font-medium text-green-800 mb-3">Bước 2: Chọn file đã nhập dữ liệu</h4>
                            <Input type="file" accept=".xlsx,.xls" onChange={handleExcelUpload} />
                        </div>
                        <div className="flex justify-end">
                            <Button onClick={() => setExcelModalOpen(false)} className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl px-6">
                                Hoàn tất
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
