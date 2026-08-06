"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import TherapeuticGroupPicker, {
    type TherapeuticGroupOption,
} from "@/components/master-drugs/TherapeuticGroupPicker";
import DuplicateDrugsReviewDialog, {
    type DuplicateRegistrationResponse,
} from "@/components/master-drugs/DuplicateDrugsReviewDialog";
import MasterDrugsPagination from "@/components/master-drugs/MasterDrugsPagination";
import MasterDrugsTable from "@/components/master-drugs/MasterDrugsTable";
import MasterDrugsViewOptions from "@/components/master-drugs/MasterDrugsViewOptions";
import {
    areColumnFiltersEqual,
    clearColumnFilterForColumn,
    COLUMN_FILTER_FIELDS,
    createEmptyColumnFilters,
    DEFAULT_VISIBLE_COLUMNS,
    DEFAULT_WRAPPED_COLUMNS,
    DOMESTIC_OPTIONS,
    DRUG_GROUP_OPTIONS,
    hasAnyColumnFilters,
    PRESCRIPTION_OPTIONS,
    TABLE_COLUMNS,
    type ColumnFilterKey,
    type ColumnFilters,
    type MasterDrug,
    type TableColumnId,
    type WrappableColumnId,
} from "@/components/master-drugs/master-drugs-config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Dialog,
    DialogPortal,
    DialogOverlay,
    DialogTrigger,
} from "@/components/ui/dialog";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Search, Trash, X } from "lucide-react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { readExcel, exportExcel } from "@/lib/excel";
import {
    normalizeSpecialControlValue,
    SPECIAL_CONTROL_OPTIONS,
} from "@/lib/master-drugs/special-control";
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

const INITIAL_FORM_DATA = {
    maChung: "",
    maAtc: "",
    maBhyt: "",
    tenThuoc: "",
    hoatChat: "",
    hamLuong: "",
    dangBaoChe: "",
    soDangKy: "",
    quyCach: "",
    donViTinh: "",

    tieuChuan: "",
    tuoiTho: "",
    duongDung: "",
    nguonGoc: "",

    congTySanXuat: "",
    nuocSanXuat: "",
    diaChiSanXuat: "",

    congTyDangKy: "",
    nuocDangKy: "",
    diaChiDangKy: "",

    nhomThuoc: "",
    therapeuticGroupId: "",
    isKeDon: "",
    kiemSoatDacBiet: "",
    isThuocHiem: false,
    isTrongNuoc: "",
};

const SPECIAL_CONTROL_NONE_VALUE = "__none__";

const normalizePrescriptionValue = (value: string | null | undefined) => {
    if (!value) return "";

    const normalizedValue = value.trim().toLowerCase();

    if (normalizedValue === "thuốc kê đơn" || normalizedValue === "thuoc ke don" || normalizedValue === "có" || normalizedValue === "co") {
        return "Thuốc kê đơn";
    }

    if (normalizedValue === "thuốc không kê đơn" || normalizedValue === "thuoc khong ke don" || normalizedValue === "không" || normalizedValue === "khong") {
        return "Thuốc không kê đơn";
    }

    return "";
};

const normalizeDrugGroupValue = (value: string | null | undefined) => {
    if (!value) return "";

    const trimmedValue = value.trim();

    return DRUG_GROUP_OPTIONS.some((option) => option === trimmedValue)
        ? trimmedValue
        : "";
};

const normalizeDomesticValue = (value: string | null | undefined) => {
    if (!value) return "";

    const normalizedValue = value.trim().toLowerCase();

    if (normalizedValue === "trong nước" || normalizedValue === "trong nuoc" || normalizedValue === "có" || normalizedValue === "co") {
        return "Trong nước";
    }

    if (normalizedValue === "nước ngoài" || normalizedValue === "nuoc ngoai" || normalizedValue === "không" || normalizedValue === "khong") {
        return "Nước ngoài";
    }

    return "";
};

const normalizeImportedBooleanFlag = (value: unknown) => {
    if (typeof value === "boolean") {
        return value;
    }

    if (typeof value === "number") {
        return value === 1;
    }

    if (typeof value !== "string") {
        return false;
    }

    const normalizedValue = value.trim().toLowerCase();
    return ["1", "true", "yes", "y", "có", "co", "x"].includes(normalizedValue);
};

export default function MasterDrugsPage() {
    const { data: session } = useSession();
    const isAdmin = session?.user?.role === "ADMIN";

    const [drugs, setDrugs] = useState<MasterDrug[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [activeSearchTerm, setActiveSearchTerm] = useState(""); // The actual search query being used
    const [searchField, setSearchField] = useState("ALL");
    const [mappingStatus, setMappingStatus] = useState("all");
    const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState<number>(20);
    const [totalPages, setTotalPages] = useState(1);
    const [totalRecords, setTotalRecords] = useState(0);

    const [editingId, setEditingId] = useState<string | null>(null);

    const [formData, setFormData] = useState(INITIAL_FORM_DATA);
    const [selectedTherapeuticGroup, setSelectedTherapeuticGroup] = useState<TherapeuticGroupOption | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [visibleColumns, setVisibleColumns] = useState<Record<TableColumnId, boolean>>(DEFAULT_VISIBLE_COLUMNS);
    const [wrappedColumns, setWrappedColumns] = useState<Record<WrappableColumnId, boolean>>(DEFAULT_WRAPPED_COLUMNS);
    const [isDeleteAllOpen, setIsDeleteAllOpen] = useState(false);
    const [isDeleteSelectedOpen, setIsDeleteSelectedOpen] = useState(false);
    const [isDeleteDuplicatesOpen, setIsDeleteDuplicatesOpen] = useState(false);
    const [isDuplicateReviewOpen, setIsDuplicateReviewOpen] = useState(false);
    const [isDeletingSelected, setIsDeletingSelected] = useState(false);
    const [isDeletingDuplicates, setIsDeletingDuplicates] = useState(false);
    const [selectedDrugIds, setSelectedDrugIds] = useState<Set<string>>(() => new Set());
    const [columnFiltersDraft, setColumnFiltersDraft] = useState<ColumnFilters>(() => createEmptyColumnFilters());
    const [columnFiltersApplied, setColumnFiltersApplied] = useState<ColumnFilters>(() => createEmptyColumnFilters());
    const [selectedTherapeuticGroupFilter, setSelectedTherapeuticGroupFilter] = useState<TherapeuticGroupOption | null>(null);
    const [therapeuticGroupFilterResetKey, setTherapeuticGroupFilterResetKey] = useState(0);
    const [duplicateRegistrations, setDuplicateRegistrations] = useState<DuplicateRegistrationResponse | null>(null);
    const [isDuplicateRegistrationsLoading, setIsDuplicateRegistrationsLoading] = useState(false);

    const handleColumnVisibilityChange = (columnId: TableColumnId, checked: boolean) => {
        const column = TABLE_COLUMNS.find((item) => item.id === columnId);
        if (!column || column.required) {
            return;
        }

        setVisibleColumns((prev) => ({
            ...prev,
            [columnId]: checked,
        }));

        if (!checked) {
            const nextDraftFilters = clearColumnFilterForColumn(columnFiltersDraft, columnId);
            const nextAppliedFilters = clearColumnFilterForColumn(columnFiltersApplied, columnId);

            if (!areColumnFiltersEqual(columnFiltersDraft, nextDraftFilters)) {
                setColumnFiltersDraft(nextDraftFilters);
            }

            if (!areColumnFiltersEqual(columnFiltersApplied, nextAppliedFilters)) {
                setColumnFiltersApplied(nextAppliedFilters);
                setPage(1);
            }

            if (columnId === "therapeuticGroup") {
                setSelectedTherapeuticGroupFilter(null);
                setTherapeuticGroupFilterResetKey((prev) => prev + 1);
            }
        }
    };

    const fetchDrugs = useCallback(async (
        currentPage: number,
        search: string,
        field: string = "ALL",
        currentMappingStatus: string = "all",
        currentLimit: number = limit,
        appliedColumnFilters: ColumnFilters = createEmptyColumnFilters()
    ) => {
        setIsLoading(true);
        try {
            const params = new URLSearchParams({
                page: currentPage.toString(),
                limit: currentLimit.toString(),
                search: search,
                searchField: field,
                mappingStatus: currentMappingStatus,
            });

            for (const filterKey of COLUMN_FILTER_FIELDS) {
                const filterValue = appliedColumnFilters[filterKey].trim();
                if (filterValue) {
                    params.set(filterKey, filterValue);
                }
            }

            const res = await fetch(`/api/admin/master-drugs?${params.toString()}`);
            if (res.ok) {
                const result = await res.json();
                setDrugs(result.data);
                setTotalPages(result.metadata.totalPages);
                setTotalRecords(result.metadata.total);
            }
        } catch (error) {
            console.error("Error fetching drugs:", error);
            toast.error("Không thể tải danh sách thuốc");
        } finally {
            setIsLoading(false);
        }
    }, [limit]);

    const fetchDuplicateRegistrations = useCallback(async () => {
        if (!isAdmin) return;

        setIsDuplicateRegistrationsLoading(true);
        try {
            const res = await fetch("/api/admin/master-drugs/duplicate-registrations");
            if (!res.ok) {
                throw new Error("Unable to fetch duplicate registrations");
            }

            const result = await res.json() as DuplicateRegistrationResponse;
            setDuplicateRegistrations(result);
        } catch (error) {
            console.error("Error fetching duplicate registrations:", error);
        } finally {
            setIsDuplicateRegistrationsLoading(false);
        }
    }, [isAdmin]);

    // Only fetch when page changes or when activeSearchTerm changes (from button/Enter)
    useEffect(() => {
        fetchDrugs(page, activeSearchTerm, searchField, mappingStatus, limit, columnFiltersApplied);
    }, [fetchDrugs, page, activeSearchTerm, searchField, mappingStatus, limit, columnFiltersApplied]);

    useEffect(() => {
        if (isAdmin) {
            fetchDuplicateRegistrations();
        }
    }, [fetchDuplicateRegistrations, isAdmin]);

    useEffect(() => {
        setSelectedDrugIds((previousIds) => {
            const visibleIds = new Set(drugs.map((drug) => drug.id));
            const nextIds = new Set(Array.from(previousIds).filter((id) => visibleIds.has(id)));

            return nextIds.size === previousIds.size ? previousIds : nextIds;
        });
    }, [drugs]);

    const refetchCurrentPage = useCallback(() => {
        fetchDrugs(page, activeSearchTerm, searchField, mappingStatus, limit, columnFiltersApplied);
        if (isAdmin) {
            fetchDuplicateRegistrations();
        }
    }, [fetchDrugs, fetchDuplicateRegistrations, isAdmin, page, activeSearchTerm, searchField, mappingStatus, limit, columnFiltersApplied]);

    // Handle search execution
    const handleSearch = () => {
        setActiveSearchTerm(searchTerm);
        setPage(1); // Reset to first page on new search
    };

    const handleMappingStatusChange = (value: string) => {
        setPage(1);
        setMappingStatus(value);
    };

    const handlePageSizeChange = (value: string) => {
        setPage(1);
        setLimit(Number(value));
    };

    const handleColumnFilterChange = (field: ColumnFilterKey, value: string) => {
        setColumnFiltersDraft((prev) => ({
            ...prev,
            [field]: value,
        }));
    };

    const handleTherapeuticGroupColumnFilterChange = (value: TherapeuticGroupOption | null) => {
        setSelectedTherapeuticGroupFilter(value);
        handleColumnFilterChange("therapeuticGroupId", value?.id || "");
    };

    const handleApplyColumnFilters = () => {
        setColumnFiltersApplied({ ...columnFiltersDraft });
        setPage(1);
    };

    const handleClearColumnFilters = () => {
        setColumnFiltersDraft(createEmptyColumnFilters());
        setColumnFiltersApplied(createEmptyColumnFilters());
        setSelectedTherapeuticGroupFilter(null);
        setTherapeuticGroupFilterResetKey((prev) => prev + 1);
        setPage(1);
    };

    const hasActiveDataFilters = Boolean(activeSearchTerm.trim())
        || mappingStatus !== "all"
        || hasAnyColumnFilters(columnFiltersApplied);
    const selectedDrugCount = selectedDrugIds.size;

    const handleToggleSelectedDrug = useCallback((id: string, checked: boolean) => {
        setSelectedDrugIds((previousIds) => {
            const nextIds = new Set(previousIds);
            if (checked) {
                nextIds.add(id);
            } else {
                nextIds.delete(id);
            }
            return nextIds;
        });
    }, []);

    const handleToggleCurrentPageSelected = useCallback((checked: boolean) => {
        setSelectedDrugIds((previousIds) => {
            const nextIds = new Set(previousIds);
            for (const drug of drugs) {
                if (checked) {
                    nextIds.add(drug.id);
                } else {
                    nextIds.delete(drug.id);
                }
            }
            return nextIds;
        });
    }, [drugs]);

    // Handle Enter key press
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        const previousDrugs = [...drugs]; // Backup
        const payload = {
            ...formData,
            therapeuticGroupId: selectedTherapeuticGroup?.id || "",
        };

        // Optimistic Update
        if (editingId) {
            setDrugs(prev => prev.map((drug) => drug.id === editingId
                ? {
                    ...drug,
                    ...payload,
                    therapeuticGroupId: selectedTherapeuticGroup?.id || null,
                    therapeuticGroup: selectedTherapeuticGroup,
                }
                : drug));
            setIsDialogOpen(false); // Close immediately
        }

        try {
            const url = editingId
                ? `/api/admin/master-drugs/${editingId}`
                : "/api/admin/master-drugs";

            const method = editingId ? "PATCH" : "POST";

            const res = await fetch(url, {
                method: method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (res.ok) {
                toast.success(editingId ? "Cập nhật thuốc thành công" : "Thêm thuốc thành công");
                if (!editingId) {
                    setIsDialogOpen(false);
                    setEditingId(null);
                    setFormData({ ...INITIAL_FORM_DATA });
                    setSelectedTherapeuticGroup(null);
                }
                refetchCurrentPage();
            } else {
                if (editingId) {
                    setDrugs(previousDrugs); // Revert optimistic update
                }
                const error = await res.json();
                toast.error(error.message || (editingId ? "Không thể cập nhật thuốc" : "Không thể thêm thuốc"));
            }
        } catch {
            if (editingId) {
                setDrugs(previousDrugs); // Revert optimistic update
            }
            toast.error("Đã xảy ra lỗi");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleImport = async (files: FileList | null) => {
        if (!files || files.length === 0) return;

        const file = files[0];
        setIsImporting(true);
        const toastId = toast.loading("Đang đọc file Excel...");

        try {
            const rawData = await readExcel(file) as any[];

            // Map headers to data model
            const mappedData = rawData.map(row => ({
                maChung: row['Mã chung'] || row['maChung'] || row['MaChung'],
                maAtc: row['Mã ATC'] || row['maAtc'] || row['MaATC'],
                maBhyt: row['Mã BHYT'] || row['maBhyt'] || row['MaBHYT'],
                tenThuoc: row['Tên thuốc'] || row['tenThuoc'] || row['TenThuoc'],
                hoatChat: row['Hoạt chất'] || row['hoatChat'] || row['HoatChat'],
                hamLuong: row['Hàm lượng'] || row['hamLuong'] || row['HamLuong'],
                dangBaoChe: row['Dạng bào chế'] || row['dangBaoChe'] || row['DangBaoChe'],
                soDangKy: row['Số đăng ký'] || row['soDangKy'] || row['SoDangKy'],
                quyCach: row['Quy cách'] || row['quyCach'] || row['QuyCach'],
                donViTinh: row['Đơn vị tính'] || row['DVT'] || row['donViTinh'],

                tieuChuan: row['Tiêu chuẩn'] || row['tieuChuan'],
                tuoiTho: row['Tuổi thọ'] || row['tuoiTho'],
                duongDung: row['Đường dùng'] || row['duongDung'],
                nguonGoc: row['Nguồn gốc'] || row['nguonGoc'],

                congTySanXuat: row['Công ty sản xuất'] || row['congTySanXuat'],
                nuocSanXuat: row['Nước sản xuất'] || row['nuocSanXuat'],
                diaChiSanXuat: row['Địa chỉ sản xuất'] || row['diaChiSanXuat'],

                congTyDangKy: row['Công ty đăng ký'] || row['congTyDangKy'],
                nuocDangKy: row['Nước đăng ký'] || row['nuocDangKy'],
                diaChiDangKy: row['Địa chỉ đăng ký'] || row['diaChiDangKy'],

                nhomThuoc: row['Nhóm thuốc'] || row['nhomThuoc'],
                therapeuticGroupName: row['Nhóm điều trị'] || row['therapeuticGroupName'] || row['nhomDieuTri'],
                isKeDon: row['Thuốc kê đơn'] || row['thuocKeDon'],
                kiemSoatDacBiet: row['Thuốc kiểm soát đặc biệt'] ?? row['kiemSoatDacBiet'],
                isThuocHiem: normalizeImportedBooleanFlag(row['Thuốc hiếm'] ?? row['thuocHiem'] ?? row['isThuocHiem']),
                isTrongNuoc: row['Thuốc trong nước'] || row['thuocTrongNuoc'],
            })).filter(item => item.maChung && item.tenThuoc);

            if (mappedData.length === 0) {
                toast.error("Không tìm thấy dữ liệu hợp lệ (cần cột 'Mã chung' và 'Tên thuốc')", { id: toastId });
                return;
            }

            toast.loading(`Đang nhập ${mappedData.length} thuốc...`, { id: toastId });

            const res = await fetch('/api/admin/master-drugs/import', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ drugs: mappedData })
            });

            if (res.ok) {
                const data = await res.json();
                const createdTherapeuticGroups = data.stats.createdTherapeuticGroups || 0;
                const therapeuticGroupText = createdTherapeuticGroups > 0
                    ? `, Tạo mới nhóm điều trị: ${createdTherapeuticGroups}`
                    : "";
                const importMessage = `Nhập thành công: ${data.stats.success}, Bỏ qua: ${data.stats.skipped}, Lỗi: ${data.stats.error}${therapeuticGroupText}`;
                const firstErrorText = data.errors?.[0] ? `. ${data.errors[0]}` : "";
                if (data.stats.error > 0) {
                    toast.warning(`${importMessage}${firstErrorText}`, { id: toastId });
                } else {
                    toast.success(importMessage, { id: toastId });
                }
                refetchCurrentPage();
            } else {
                const error = await res.json().catch(() => null);
                toast.error(error?.message || "Lỗi khi nhập dữ liệu", { id: toastId });
            }
        } catch (e) {
            console.error(e);
            toast.error("Lỗi đọc file Excel", { id: toastId });
        } finally {
            setIsImporting(false);
            const input = document.getElementById('excel-upload') as HTMLInputElement;
            if (input) input.value = '';
        }
    };

    const handleDownloadTemplate = () => {
        const templateData = [
            {
                "Mã chung": "MC001",
                "Mã BHYT": "BHYT.001",
                "Tên thuốc": "Paracetamol 500mg",
                "Hoạt chất": "Paracetamol",
                "Hàm lượng": "500mg",
                "Dạng bào chế": "Viên nén",
                "Số đăng ký": "VD-12345-23",
                "Quy cách": "Hộp 10 vỉ x 10 viên",
                "Đơn vị tính": "Viên",
                "Tiêu chuẩn": "TCCS",
                "Tuổi thọ": "36 tháng",
                "Đường dùng": "Uống",
                "Nguồn gốc": "Tổng hợp",
                "Công ty sản xuất": "Công ty A",
                "Nước sản xuất": "Việt Nam",
                "Địa chỉ sản xuất": "Hà Nội",
                "Công ty đăng ký": "Công ty B",
                "Nước đăng ký": "Việt Nam",
                "Địa chỉ đăng ký": "Hồ Chí Minh",
                "Nhóm thuốc": "Hóa dược",
                "Nhóm điều trị": "Giảm đau, hạ sốt",
                "Thuốc hiếm": "Không",
                "Thuốc kê đơn": "Không",
                "Thuốc kiểm soát đặc biệt": "",
                "Thuốc trong nước": "Có"
            },
            {
                "Mã chung": "MC002",
                "Mã BHYT": "",
                "Tên thuốc": "Tên thuốc mẫu 2",
                "Hoạt chất": "",
                "Hàm lượng": "",
                "Dạng bào chế": "",
                "Số đăng ký": "",
                "Quy cách": "",
                "Đơn vị tính": "Lọ",
                "Tiêu chuẩn": "",
                "Tuổi thọ": "",
                "Đường dùng": "",
                "Nguồn gốc": "",
                "Công ty sản xuất": "",
                "Nước sản xuất": "",
                "Địa chỉ sản xuất": "",
                "Công ty đăng ký": "",
                "Nước đăng ký": "",
                "Địa chỉ đăng ký": "",
                "Nhóm thuốc": "",
                "Nhóm điều trị": "",
                "Thuốc hiếm": "Không",
                "Thuốc kê đơn": "",
                "Thuốc kiểm soát đặc biệt": SPECIAL_CONTROL_OPTIONS[0],
                "Thuốc trong nước": ""
            }
        ];
        exportExcel(templateData, "Mau_Danh_Muc_Thuoc");
        toast.success("Đã tải xuống file mẫu");
    };

    const handleExportMapped = async () => {
        setIsExporting(true);
        const toastId = toast.loading("Đang xuất dữ liệu...");
        try {
            const res = await fetch("/api/admin/master-drugs/export-mapped");
            if (res.ok) {
                const { data } = await res.json();
                if (data.length === 0) {
                    toast.error("Không có dữ liệu thuốc được ánh xạ thành công", { id: toastId });
                    return;
                }
                exportExcel(data, "Danh_Muc_Dung_Chung_Da_Anh_Xa_Thanh_Cong");
                toast.success(`Đã xuất ${data.length} thuốc`, { id: toastId });
            } else {
                toast.error("Lỗi khi xuất dữ liệu", { id: toastId });
            }
        } catch (error) {
            console.error(error);
            toast.error("Đã xảy ra lỗi", { id: toastId });
        } finally {
            setIsExporting(false);
        }
    };

    const toggleDrugStatus = async (drugId: string, currentStatus: boolean) => {
        try {
            const res = await fetch(`/api/admin/master-drugs/${drugId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ isActive: !currentStatus }),
            });

            if (res.ok) {
                toast.success(currentStatus ? "Đã ẩn thuốc" : "Đã hiện thuốc");
                refetchCurrentPage();
            }
        } catch {
            toast.error("Đã xảy ra lỗi");
        }
    };

    const handleEdit = (drug: MasterDrug) => {
        setEditingId(drug.id);
        setFormData({
            maChung: drug.maChung,
            maAtc: drug.maAtc || "",
            maBhyt: drug.maBhyt || "",
            tenThuoc: drug.tenThuoc,
            hoatChat: drug.hoatChat || "",
            hamLuong: drug.hamLuong || "",
            dangBaoChe: drug.dangBaoChe || "",
            soDangKy: drug.soDangKy || "",
            quyCach: drug.quyCach || "",
            donViTinh: drug.donViTinh || "",

            tieuChuan: drug.tieuChuan || "",
            tuoiTho: drug.tuoiTho || "",
            duongDung: drug.duongDung || "",
            nguonGoc: drug.nguonGoc || "",

            congTySanXuat: drug.congTySanXuat || "",
            nuocSanXuat: drug.nuocSanXuat || "",
            diaChiSanXuat: drug.diaChiSanXuat || "",

            congTyDangKy: drug.congTyDangKy || "",
            nuocDangKy: drug.nuocDangKy || "",
            diaChiDangKy: drug.diaChiDangKy || "",

            nhomThuoc: normalizeDrugGroupValue(drug.nhomThuoc),
            therapeuticGroupId: drug.therapeuticGroupId || "",
            isKeDon: normalizePrescriptionValue(drug.isKeDon),
            kiemSoatDacBiet: normalizeSpecialControlValue(drug.kiemSoatDacBiet) || "",
            isThuocHiem: drug.isThuocHiem,
            isTrongNuoc: normalizeDomesticValue(drug.isTrongNuoc),
        });
        setSelectedTherapeuticGroup(drug.therapeuticGroup || null);
        setIsDialogOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Bạn có chắc chắn muốn xóa thuốc này không? Hành động này không thể hoàn tác.")) return;

        // Optimistic Delete
        const previousDrugs = [...drugs];
        setDrugs((prev) => prev.filter((d) => d.id !== id));
        setTotalRecords((prev) => prev - 1); // Adjust count immediately

        try {
            const res = await fetch(`/api/admin/master-drugs/${id}`, {
                method: "DELETE",
            });

            if (res.ok) {
                toast.success("Đã xóa thuốc");
                setSelectedDrugIds((previousIds) => {
                    const nextIds = new Set(previousIds);
                    nextIds.delete(id);
                    return nextIds;
                });
                // fetchDrugs(page, searchTerm); // No need to fetch immediately if we trust optimistic
                // But better to sync in background or just leave it
                // If we don't fetch, pagination might be slightly off until next nav, but that's fine for "instant" feel
                // Let's just re-fetch to be safe but the UI is already updated
                refetchCurrentPage();
            } else {
                // Revert
                setDrugs(previousDrugs);
                setTotalRecords((prev) => prev + 1);
                const errorData = await res.json().catch(() => ({}));
                toast.error(errorData.message || "Không thể xóa thuốc");
            }
        } catch {
            // Revert
            setDrugs(previousDrugs);
            setTotalRecords((prev) => prev + 1);
            toast.error("Đã xảy ra lỗi khi xóa");
        }
    };

    const handleDeleteSelected = async () => {
        const ids = Array.from(selectedDrugIds);
        if (ids.length === 0) {
            setIsDeleteSelectedOpen(false);
            return;
        }

        setIsDeletingSelected(true);
        try {
            const res = await fetch("/api/admin/master-drugs/bulk-delete", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ids }),
            });

            const data = await res.json().catch(() => ({}));

            if (res.ok) {
                toast.success(`Đã xóa ${data.deletedCount || ids.length} thuốc đã chọn`);
                setSelectedDrugIds(new Set());
                setIsDeleteSelectedOpen(false);
                refetchCurrentPage();
            } else {
                toast.error(data.message || "Không thể xóa các thuốc đã chọn");
            }
        } catch (error) {
            console.error(error);
            toast.error("Đã xảy ra lỗi khi xóa thuốc đã chọn");
        } finally {
            setIsDeletingSelected(false);
        }
    };

    const handleDeleteDuplicates = async () => {
        setIsDeletingDuplicates(true);
        try {
            const res = await fetch("/api/admin/master-drugs/delete-duplicates", {
                method: "POST",
            });

            const data = await res.json().catch(() => ({}));

            if (res.ok) {
                const deletedCount = typeof data.deletedCount === "number" ? data.deletedCount : 0;
                const skippedLinkedCount = typeof data.skippedLinkedCount === "number" ? data.skippedLinkedCount : 0;

                if (deletedCount > 0) {
                    toast.success(
                        skippedLinkedCount > 0
                            ? `Đã xóa ${deletedCount} dòng trùng. Bỏ qua ${skippedLinkedCount} dòng đang có liên kết.`
                            : `Đã xóa ${deletedCount} dòng trùng`,
                    );
                } else if (skippedLinkedCount > 0) {
                    toast.warning(`Không có dòng trùng có thể xóa. ${skippedLinkedCount} dòng đang có liên kết.`);
                } else {
                    toast.info("Không tìm thấy dòng trùng cần xóa");
                }

                setIsDeleteDuplicatesOpen(false);
                refetchCurrentPage();
            } else {
                toast.error(data.message || "Không thể xóa dòng trùng");
            }
        } catch (error) {
            console.error(error);
            toast.error("Đã xảy ra lỗi khi xóa dòng trùng");
        } finally {
            setIsDeletingDuplicates(false);
        }
    };

    const handleDeleteAll = async () => {
        setIsSubmitting(true);
        try {
            const res = await fetch("/api/admin/master-drugs", {
                method: "DELETE",
            });

            if (res.ok) {
                toast.success("Đã xóa tất cả thuốc");
                setDrugs([]);
                setTotalRecords(0);
                setSelectedDrugIds(new Set());
                setDuplicateRegistrations({
                    summary: {
                        duplicateRegistrationCount: 0,
                        duplicateDrugCount: 0,
                    },
                    groups: [],
                });
                setIsDeleteAllOpen(false);
            } else {
                toast.error("Không thể xóa dữ liệu");
            }
        } catch (error) {
            console.error(error);
            toast.error("Đã xảy ra lỗi");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold text-gray-800">Danh mục dùng chung</h2>
                    <p className="text-gray-500 mt-1">Quản lý danh sách thuốc chuẩn của Sở Y tế</p>
                </div>

                <div className="flex gap-2">
                    <MasterDrugsViewOptions
                        visibleColumns={visibleColumns}
                        wrappedColumns={wrappedColumns}
                        onColumnVisibilityChange={handleColumnVisibilityChange}
                        onWrappedColumnChange={(columnId, checked) =>
                            setWrappedColumns((prev) => ({ ...prev, [columnId]: checked }))
                        }
                        onShowAllColumns={() => setVisibleColumns({ ...DEFAULT_VISIBLE_COLUMNS })}
                    />

                    {isAdmin && (
                        <>
                            <Button
                                variant="outline"
                                className="bg-white text-blue-600 border-blue-200 hover:bg-blue-50"
                                onClick={handleDownloadTemplate}
                            >
                                <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                Tải mẫu
                            </Button>

                            <Button
                                variant="outline"
                                className="bg-white text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                                onClick={handleExportMapped}
                                disabled={isExporting}
                            >
                                {isExporting ? (
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-emerald-600 mr-2"></div>
                                ) : (
                                    <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                    </svg>
                                )}
                                Xuất Excel
                            </Button>

                            <Button
                                variant="destructive"
                                onClick={() => setIsDeleteSelectedOpen(true)}
                                disabled={selectedDrugCount === 0}
                            >
                                <Trash className="w-4 h-4 mr-2" />
                                Xóa đã chọn ({selectedDrugCount})
                            </Button>

                            <Button
                                variant="outline"
                                className="border-orange-200 bg-white text-orange-700 hover:bg-orange-50"
                                onClick={() => setIsDeleteDuplicatesOpen(true)}
                                disabled={isDeletingDuplicates}
                            >
                                <Trash className="w-4 h-4 mr-2" />
                                Xóa dòng trùng
                            </Button>

                            <Button
                                variant="destructive"
                                onClick={() => setIsDeleteAllOpen(true)}
                                disabled={drugs.length === 0}
                            >
                                <Trash className="w-4 h-4 mr-2" />
                                Xóa tất cả
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
                                <Button variant="outline" disabled={isImporting} className="bg-white">
                                    {isImporting ? (
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
                                    ) : (
                                        <svg className="w-5 h-5 mr-2 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                        </svg>
                                    )}
                                    Import Excel
                                </Button>
                            </div>

                            <Dialog open={isDialogOpen} onOpenChange={(open) => {
                                setIsDialogOpen(open);
                                if (!open) {
                                    setEditingId(null);
                                    setFormData({ ...INITIAL_FORM_DATA });
                                    setSelectedTherapeuticGroup(null);
                                }
                            }}>
                                <DialogTrigger asChild>
                                    <Button className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600">
                                        <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                        </svg>
                                        Thêm thuốc
                                    </Button>
                                </DialogTrigger>
                                {/* CUSTOM LANDSCAPE MODAL — bypasses DialogContent sm:max-w-lg */}
                                <DialogPortal>
                                    <DialogOverlay />
                                    <DialogPrimitive.Content
                                        className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2
                                               w-[96vw] max-w-[1400px] max-h-[92vh]
                                               bg-white rounded-xl shadow-2xl flex flex-col
                                               border border-gray-200
                                               data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95
                                               data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95
                                               outline-none"
                                    >
                                        {/* ── MODAL HEADER ── */}
                                        <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-gray-100 shrink-0">
                                            <div>
                                                <h2 className="text-xl font-bold text-gray-900">
                                                    {editingId ? "✏️ Cập nhật thuốc" : "➕ Thêm thuốc mới"}
                                                </h2>
                                                <p className="text-sm text-gray-500 mt-0.5">
                                                    {editingId ? "Cập nhật thông tin thuốc trong danh mục dùng chung" : "Nhập đầy đủ thông tin để thêm thuốc vào danh mục dùng chung"}
                                                </p>
                                            </div>
                                            <DialogPrimitive.Close
                                                onClick={() => setIsDialogOpen(false)}
                                                className="rounded-md p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                                            >
                                                <X className="w-5 h-5" />
                                            </DialogPrimitive.Close>
                                        </div>

                                        {/* ── MODAL BODY: 3-COLUMN LANDSCAPE ── */}
                                        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
                                            <div className="flex-1 overflow-y-auto px-6 py-5">
                                                <div className="grid grid-cols-3 divide-x divide-gray-100 gap-x-0">

                                                    {/* ══════════════════════
                                                    CỘT 1: Thông tin cơ bản
                                                ══════════════════════ */}
                                                    <div className="pr-8 space-y-4">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className="w-2 h-5 rounded-full bg-emerald-500 inline-block"></span>
                                                            <h3 className="text-sm font-semibold text-gray-700">Thông tin cơ bản</h3>
                                                        </div>

                                                        <div className="grid grid-cols-3 gap-3">
                                                            <div className="space-y-1.5">
                                                                <Label htmlFor="maChung" className="text-xs font-semibold text-gray-600">Mã chung <span className="text-red-500">*</span></Label>
                                                                <Input id="maChung" value={formData.maChung}
                                                                    onChange={(e) => setFormData({ ...formData, maChung: e.target.value })}
                                                                    placeholder="MC001" required className="h-9" />
                                                            </div>
                                                            <div className="space-y-1.5">
                                                                <Label htmlFor="maAtc" className="text-xs font-semibold text-gray-600">Mã ATC</Label>
                                                                <Input id="maAtc" value={formData.maAtc}
                                                                    onChange={(e) => setFormData({ ...formData, maAtc: e.target.value })}
                                                                    placeholder="ATC001" className="h-9" />
                                                            </div>
                                                            <div className="space-y-1.5">
                                                                <Label htmlFor="maBhyt" className="text-xs font-semibold text-gray-600">Mã BHYT</Label>
                                                                <Input id="maBhyt" value={formData.maBhyt}
                                                                    onChange={(e) => setFormData({ ...formData, maBhyt: e.target.value })}
                                                                    placeholder="BHYT001" className="h-9" />
                                                            </div>
                                                        </div>

                                                        <div className="space-y-1.5">
                                                            <Label htmlFor="tenThuoc" className="text-xs font-semibold text-gray-600">Tên thuốc <span className="text-red-500">*</span></Label>
                                                            <Input id="tenThuoc" value={formData.tenThuoc}
                                                                onChange={(e) => setFormData({ ...formData, tenThuoc: e.target.value })}
                                                                placeholder="vd: Paracetamol 500mg" required className="h-9" />
                                                        </div>

                                                        <div className="grid grid-cols-2 gap-3">
                                                            <div className="space-y-1.5">
                                                                <Label htmlFor="hoatChat" className="text-xs font-semibold text-gray-600">Hoạt chất</Label>
                                                                <Input id="hoatChat" value={formData.hoatChat}
                                                                    onChange={(e) => setFormData({ ...formData, hoatChat: e.target.value })}
                                                                    placeholder="Paracetamol" className="h-9" />
                                                            </div>
                                                            <div className="space-y-1.5">
                                                                <Label htmlFor="hamLuong" className="text-xs font-semibold text-gray-600">Hàm lượng</Label>
                                                                <Input id="hamLuong" value={formData.hamLuong}
                                                                    onChange={(e) => setFormData({ ...formData, hamLuong: e.target.value })}
                                                                    placeholder="500mg" className="h-9" />
                                                            </div>
                                                        </div>

                                                        <div className="grid grid-cols-2 gap-3">
                                                            <div className="space-y-1.5">
                                                                <Label htmlFor="soDangKy" className="text-xs font-semibold text-gray-600">Số đăng ký</Label>
                                                                <Input id="soDangKy" value={formData.soDangKy}
                                                                    onChange={(e) => setFormData({ ...formData, soDangKy: e.target.value })}
                                                                    placeholder="VD-12345-19" className="h-9" />
                                                            </div>
                                                            <div className="space-y-1.5">
                                                                <Label htmlFor="donViTinh" className="text-xs font-semibold text-gray-600">Đơn vị tính</Label>
                                                                <Input id="donViTinh" value={formData.donViTinh}
                                                                    onChange={(e) => setFormData({ ...formData, donViTinh: e.target.value })}
                                                                    placeholder="Viên / Hộp" className="h-9" />
                                                            </div>
                                                        </div>

                                                        <div className="grid grid-cols-2 gap-3">
                                                            <div className="space-y-1.5">
                                                                <Label htmlFor="dangBaoChe" className="text-xs font-semibold text-gray-600">Dạng bào chế</Label>
                                                                <Input id="dangBaoChe" value={formData.dangBaoChe}
                                                                    onChange={(e) => setFormData({ ...formData, dangBaoChe: e.target.value })}
                                                                    placeholder="Viên nén" className="h-9" />
                                                            </div>
                                                            <div className="space-y-1.5">
                                                                <Label htmlFor="duongDung" className="text-xs font-semibold text-gray-600">Đường dùng</Label>
                                                                <Input id="duongDung" value={formData.duongDung}
                                                                    onChange={(e) => setFormData({ ...formData, duongDung: e.target.value })}
                                                                    placeholder="Uống" className="h-9" />
                                                            </div>
                                                        </div>

                                                        <div className="space-y-1.5">
                                                            <Label htmlFor="quyCach" className="text-xs font-semibold text-gray-600">Quy cách đóng gói</Label>
                                                            <Input id="quyCach" value={formData.quyCach}
                                                                onChange={(e) => setFormData({ ...formData, quyCach: e.target.value })}
                                                                placeholder="vd: Hộp 10 vỉ x 10 viên" className="h-9" />
                                                        </div>
                                                    </div>

                                                    {/* ══════════════════════
                                                    CỘT 2: Chất lượng & Sản xuất
                                                ══════════════════════ */}
                                                    <div className="px-8 space-y-4">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className="w-2 h-5 rounded-full bg-blue-500 inline-block"></span>
                                                            <h3 className="text-sm font-semibold text-gray-700">Chất lượng &amp; Sản xuất</h3>
                                                        </div>

                                                        <div className="grid grid-cols-3 gap-3">
                                                            <div className="space-y-1.5">
                                                                <Label htmlFor="tieuChuan" className="text-xs font-semibold text-gray-600">Tiêu chuẩn</Label>
                                                                <Input id="tieuChuan" value={formData.tieuChuan}
                                                                    onChange={(e) => setFormData({ ...formData, tieuChuan: e.target.value })}
                                                                    placeholder="TCCS" className="h-9" />
                                                            </div>
                                                            <div className="space-y-1.5">
                                                                <Label htmlFor="tuoiTho" className="text-xs font-semibold text-gray-600">Tuổi thọ</Label>
                                                                <Input id="tuoiTho" value={formData.tuoiTho}
                                                                    onChange={(e) => setFormData({ ...formData, tuoiTho: e.target.value })}
                                                                    placeholder="36 tháng" className="h-9" />
                                                            </div>
                                                            <div className="space-y-1.5">
                                                                <Label htmlFor="nguonGoc" className="text-xs font-semibold text-gray-600">Nguồn gốc</Label>
                                                                <Input id="nguonGoc" value={formData.nguonGoc}
                                                                    onChange={(e) => setFormData({ ...formData, nguonGoc: e.target.value })}
                                                                    placeholder="Tổng hợp" className="h-9" />
                                                            </div>
                                                        </div>

                                                        <div className="pt-3 border-t border-gray-100">
                                                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Công ty sản xuất</p>
                                                            <div className="space-y-3">
                                                                <div className="space-y-1.5">
                                                                    <Label htmlFor="congTySanXuat" className="text-xs font-semibold text-gray-600">Tên công ty</Label>
                                                                    <Input id="congTySanXuat" value={formData.congTySanXuat}
                                                                        onChange={(e) => setFormData({ ...formData, congTySanXuat: e.target.value })}
                                                                        placeholder="vd: Công ty Dược phẩm A" className="h-9" />
                                                                </div>
                                                                <div className="grid grid-cols-2 gap-3">
                                                                    <div className="space-y-1.5">
                                                                        <Label htmlFor="nuocSanXuat" className="text-xs font-semibold text-gray-600">Nước sản xuất</Label>
                                                                        <Input id="nuocSanXuat" value={formData.nuocSanXuat}
                                                                            onChange={(e) => setFormData({ ...formData, nuocSanXuat: e.target.value })}
                                                                            placeholder="Việt Nam" className="h-9" />
                                                                    </div>
                                                                    <div className="space-y-1.5">
                                                                        <Label htmlFor="diaChiSanXuat" className="text-xs font-semibold text-gray-600">Địa chỉ sản xuất</Label>
                                                                        <Input id="diaChiSanXuat" value={formData.diaChiSanXuat}
                                                                            onChange={(e) => setFormData({ ...formData, diaChiSanXuat: e.target.value })}
                                                                            placeholder="Hà Nội" className="h-9" />
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* ══════════════════════
                                                    CỘT 3: Đăng ký & Phân loại
                                                ══════════════════════ */}
                                                    <div className="pl-8 space-y-4">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className="w-2 h-5 rounded-full bg-purple-500 inline-block"></span>
                                                            <h3 className="text-sm font-semibold text-gray-700">Đăng ký &amp; Phân loại</h3>
                                                        </div>

                                                        <div className="pt-0">
                                                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Công ty đăng ký</p>
                                                            <div className="space-y-3">
                                                                <div className="space-y-1.5">
                                                                    <Label htmlFor="congTyDangKy" className="text-xs font-semibold text-gray-600">Tên công ty</Label>
                                                                    <Input id="congTyDangKy" value={formData.congTyDangKy}
                                                                        onChange={(e) => setFormData({ ...formData, congTyDangKy: e.target.value })}
                                                                        placeholder="vd: Công ty Dược phẩm B" className="h-9" />
                                                                </div>
                                                                <div className="grid grid-cols-2 gap-3">
                                                                    <div className="space-y-1.5">
                                                                        <Label htmlFor="nuocDangKy" className="text-xs font-semibold text-gray-600">Nước đăng ký</Label>
                                                                        <Input id="nuocDangKy" value={formData.nuocDangKy}
                                                                            onChange={(e) => setFormData({ ...formData, nuocDangKy: e.target.value })}
                                                                            placeholder="Việt Nam" className="h-9" />
                                                                    </div>
                                                                    <div className="space-y-1.5">
                                                                        <Label htmlFor="diaChiDangKy" className="text-xs font-semibold text-gray-600">Địa chỉ đăng ký</Label>
                                                                        <Input id="diaChiDangKy" value={formData.diaChiDangKy}
                                                                            onChange={(e) => setFormData({ ...formData, diaChiDangKy: e.target.value })}
                                                                            placeholder="TP.HCM" className="h-9" />
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="pt-3 border-t border-gray-100">
                                                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Phân loại thuốc</p>
                                                            <div className="space-y-3">
                                                                <div className="grid grid-cols-2 gap-3">
                                                                    <div className="space-y-1.5">
                                                                        <Label htmlFor="nhomThuoc" className="text-xs font-semibold text-gray-600">Nhóm thuốc</Label>
                                                                        <Select
                                                                            value={formData.nhomThuoc || undefined}
                                                                            onValueChange={(value) => setFormData({ ...formData, nhomThuoc: value })}
                                                                        >
                                                                            <SelectTrigger id="nhomThuoc" className="h-9 bg-white">
                                                                                <SelectValue placeholder="Chọn nhóm thuốc" />
                                                                            </SelectTrigger>
                                                                            <SelectContent>
                                                                                {DRUG_GROUP_OPTIONS.map((option) => (
                                                                                    <SelectItem key={option} value={option}>
                                                                                        {option}
                                                                                    </SelectItem>
                                                                                ))}
                                                                            </SelectContent>
                                                                        </Select>
                                                                    </div>
                                                                    <div className="space-y-1.5">
                                                                        <Label className="text-xs font-semibold text-gray-600">Nhóm điều trị</Label>
                                                                        <TherapeuticGroupPicker
                                                                            value={selectedTherapeuticGroup}
                                                                            onChange={(value) => {
                                                                                setSelectedTherapeuticGroup(value);
                                                                                setFormData({
                                                                                    ...formData,
                                                                                    therapeuticGroupId: value?.id || "",
                                                                                });
                                                                            }}
                                                                        />
                                                                    </div>
                                                                </div>
                                                                <div className="grid grid-cols-2 gap-3">
                                                                    <div className="space-y-1.5">
                                                                        <Label htmlFor="isThuocHiem" className="text-xs font-semibold text-gray-600">Thuốc hiếm</Label>
                                                                        <Select
                                                                            value={String(formData.isThuocHiem)}
                                                                            onValueChange={(value) => setFormData({ ...formData, isThuocHiem: value === "true" })}
                                                                        >
                                                                            <SelectTrigger id="isThuocHiem" className="h-9 bg-white">
                                                                                <SelectValue placeholder="Chọn trạng thái" />
                                                                            </SelectTrigger>
                                                                            <SelectContent>
                                                                                <SelectItem value="false">Không</SelectItem>
                                                                                <SelectItem value="true">Có</SelectItem>
                                                                            </SelectContent>
                                                                        </Select>
                                                                    </div>
                                                                    <div className="space-y-1.5">
                                                                        <Label htmlFor="isKeDon" className="text-xs font-semibold text-gray-600">Kê đơn</Label>
                                                                        <Select
                                                                            value={formData.isKeDon || undefined}
                                                                            onValueChange={(value) => setFormData({ ...formData, isKeDon: value })}
                                                                        >
                                                                            <SelectTrigger id="isKeDon" className="h-9 bg-white">
                                                                                <SelectValue placeholder="Chọn loại kê đơn" />
                                                                            </SelectTrigger>
                                                                            <SelectContent>
                                                                                {PRESCRIPTION_OPTIONS.map((option) => (
                                                                                    <SelectItem key={option} value={option}>
                                                                                        {option}
                                                                                    </SelectItem>
                                                                                ))}
                                                                            </SelectContent>
                                                                        </Select>
                                                                    </div>
                                                                    <div className="space-y-1.5">
                                                                        <Label htmlFor="kiemSoatDacBiet" className="text-xs font-semibold text-gray-600">KS đặc biệt</Label>
                                                                        <Select
                                                                            value={formData.kiemSoatDacBiet || SPECIAL_CONTROL_NONE_VALUE}
                                                                            onValueChange={(value) => setFormData({
                                                                                ...formData,
                                                                                kiemSoatDacBiet: value === SPECIAL_CONTROL_NONE_VALUE ? "" : value,
                                                                            })}
                                                                        >
                                                                            <SelectTrigger id="kiemSoatDacBiet" className="h-9 bg-white">
                                                                                <SelectValue placeholder="Không phải thuốc kiểm soát đặc biệt" />
                                                                            </SelectTrigger>
                                                                            <SelectContent>
                                                                                <SelectItem value={SPECIAL_CONTROL_NONE_VALUE}>
                                                                                    Không phải thuốc kiểm soát đặc biệt
                                                                                </SelectItem>
                                                                                {SPECIAL_CONTROL_OPTIONS.map((option) => (
                                                                                    <SelectItem key={option} value={option}>
                                                                                        {option}
                                                                                    </SelectItem>
                                                                                ))}
                                                                            </SelectContent>
                                                                        </Select>
                                                                    </div>
                                                                    <div className="space-y-1.5">
                                                                        <Label htmlFor="isTrongNuoc" className="text-xs font-semibold text-gray-600">Trong nước</Label>
                                                                        <Select
                                                                            value={formData.isTrongNuoc || undefined}
                                                                            onValueChange={(value) => setFormData({ ...formData, isTrongNuoc: value })}
                                                                        >
                                                                            <SelectTrigger id="isTrongNuoc" className="h-9 bg-white">
                                                                                <SelectValue placeholder="Chọn xuất xứ" />
                                                                            </SelectTrigger>
                                                                            <SelectContent>
                                                                                {DOMESTIC_OPTIONS.map((option) => (
                                                                                    <SelectItem key={option} value={option}>
                                                                                        {option}
                                                                                    </SelectItem>
                                                                                ))}
                                                                            </SelectContent>
                                                                        </Select>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                </div>{/* end 3-col grid */}
                                            </div>{/* end scroll area */}

                                            {/* ── MODAL FOOTER ── */}
                                            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 shrink-0">
                                                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="min-w-[90px]">
                                                    Hủy
                                                </Button>
                                                <Button
                                                    type="submit"
                                                    disabled={isSubmitting}
                                                    className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 min-w-[140px]"
                                                >
                                                    {isSubmitting ? "Đang xử lý..." : (editingId ? "💾 Lưu thay đổi" : "✅ Thêm thuốc")}
                                                </Button>
                                            </div>
                                        </form>
                                    </DialogPrimitive.Content>
                                </DialogPortal>
                            </Dialog>
                        </>
                    )}
                </div>
            </div>

            <Card className="border-0 shadow-lg">
                <CardHeader>
                    {isAdmin && duplicateRegistrations && duplicateRegistrations.summary.duplicateRegistrationCount > 0 && (
                        <div className="mb-4 flex justify-end">
                            <Button
                                type="button"
                                size="sm"
                                className="bg-amber-600 text-white hover:bg-amber-700"
                                onClick={() => setIsDuplicateReviewOpen(true)}
                            >
                                Rà soát thuốc trùng
                            </Button>
                        </div>
                    )}
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Danh sách thuốc</CardTitle>
                            <CardDescription>
                                {mappingStatus === "mapped"
                                    ? `Hiển thị ${totalRecords} thuốc đã được ánh xạ`
                                    : mappingStatus === "unmapped"
                                        ? `Hiển thị ${totalRecords} thuốc chưa được ánh xạ`
                                        : `Tổng cộng ${totalRecords} thuốc trong danh mục`}
                            </CardDescription>
                        </div>
                    </div>

                    {/* Search Box */}
                    <div className="mt-4 space-y-2">
                        <div className="flex gap-2">
                            <Select value={mappingStatus} onValueChange={handleMappingStatusChange}>
                                <SelectTrigger className="w-[220px] bg-white">
                                    <SelectValue placeholder="Trạng thái ánh xạ" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Tất cả trạng thái</SelectItem>
                                    <SelectItem value="mapped">Đã được ánh xạ</SelectItem>
                                    <SelectItem value="unmapped">Chưa được ánh xạ</SelectItem>
                                </SelectContent>
                            </Select>

                            <Select value={searchField} onValueChange={setSearchField}>
                                <SelectTrigger className="w-[160px] bg-white">
                                    <SelectValue placeholder="Tất cả" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL">TẤT CẢ</SelectItem>
                                    <SelectItem value="tenThuoc">Tên thuốc</SelectItem>
                                    <SelectItem value="soDangKy">Số GPLH</SelectItem>
                                    <SelectItem value="hoatChat">Hoạt chất</SelectItem>
                                    <SelectItem value="maChung">Mã chung</SelectItem>
                                    <SelectItem value="maAtc">Mã ATC</SelectItem>
                                    <SelectItem value="maBhyt">Mã BHYT</SelectItem>
                                </SelectContent>
                            </Select>

                            <Input
                                placeholder="Nhập từ khóa tìm kiếm theo Số GPLH và Tên thuốc..."
                                value={searchTerm}
                                onChange={(e) => {
                                    setSearchTerm(e.target.value);
                                }}
                                onKeyDown={handleKeyDown}
                                className="flex-1 bg-white"
                            />

                            <Button
                                className="bg-cyan-500 hover:bg-cyan-600 text-white px-6"
                                onClick={handleSearch}
                            >
                                <Search className="w-4 h-4 mr-2" />
                                TÌM KIẾM
                            </Button>
                        </div>

                        <button
                            onClick={() => setShowAdvancedSearch(!showAdvancedSearch)}
                            className="text-cyan-500 hover:text-cyan-600 text-sm font-medium flex items-center gap-1"
                        >
                            Tra cứu nâng cao
                            <svg
                                className={`w-4 h-4 transition-transform ${showAdvancedSearch ? 'rotate-180' : ''}`}
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>

                        {showAdvancedSearch && (
                            <div className="border rounded-lg p-4 bg-gray-50 space-y-3">
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <Label className="text-sm text-gray-600">Tên thuốc</Label>
                                        <Input className="mt-1 bg-white" placeholder="Nhập tên thuốc" />
                                    </div>
                                    <div>
                                        <Label className="text-sm text-gray-600">Số GPLH</Label>
                                        <Input className="mt-1 bg-white" placeholder="Nhập số GPLH" />
                                    </div>
                                    <div>
                                        <Label className="text-sm text-gray-600">Hoạt chất</Label>
                                        <Input className="mt-1 bg-white" placeholder="Nhập hoạt chất" />
                                    </div>
                                    <div>
                                        <Label className="text-sm text-gray-600">Mã chung</Label>
                                        <Input className="mt-1 bg-white" placeholder="Nhập mã chung" />
                                    </div>
                                </div>
                                <div className="flex gap-2 justify-end">
                                    <Button variant="outline" onClick={() => setShowAdvancedSearch(false)}>
                                        Đóng
                                    </Button>
                                    <Button className="bg-cyan-500 hover:bg-cyan-600">
                                        Tìm kiếm nâng cao
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex items-center justify-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <MasterDrugsTable
                                drugs={drugs}
                                isAdmin={isAdmin}
                                page={page}
                                limit={limit}
                                visibleColumns={visibleColumns}
                                wrappedColumns={wrappedColumns}
                                columnFiltersDraft={columnFiltersDraft}
                                selectedTherapeuticGroupFilter={selectedTherapeuticGroupFilter}
                                therapeuticGroupFilterResetKey={therapeuticGroupFilterResetKey}
                                hasActiveDataFilters={hasActiveDataFilters}
                                onColumnFilterChange={handleColumnFilterChange}
                                onTherapeuticGroupFilterChange={handleTherapeuticGroupColumnFilterChange}
                                onApplyColumnFilters={handleApplyColumnFilters}
                                onClearColumnFilters={handleClearColumnFilters}
                                onEdit={handleEdit}
                                onDelete={handleDelete}
                                onToggleDrugStatus={toggleDrugStatus}
                                selectedIds={selectedDrugIds}
                                onToggleSelected={handleToggleSelectedDrug}
                                onTogglePageSelected={handleToggleCurrentPageSelected}
                            />
                            <MasterDrugsPagination
                                page={page}
                                totalPages={totalPages}
                                limit={limit}
                                onPageChange={setPage}
                                onPageSizeChange={handlePageSizeChange}
                            />
                        </div>
                    )}
                </CardContent>
            </Card>

            <DuplicateDrugsReviewDialog
                open={isDuplicateReviewOpen}
                onOpenChange={setIsDuplicateReviewOpen}
                data={duplicateRegistrations}
                isRefreshing={isDuplicateRegistrationsLoading}
                onRefreshDuplicates={fetchDuplicateRegistrations}
                onDeleted={refetchCurrentPage}
            />

            <AlertDialog open={isDeleteAllOpen} onOpenChange={setIsDeleteAllOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Bạn có chắc chắn muốn xóa tất cả?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Hành động này sẽ xóa toàn bộ danh sách thuốc trong danh mục dùng chung.
                            Hành động này không thể hoàn tác. Vui lòng cân nhắc kỹ trước khi thực hiện.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Hủy bỏ</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteAll} className="bg-red-600 hover:bg-red-700">
                            {isSubmitting ? "Đang xóa..." : "Xóa tất cả"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={isDeleteDuplicatesOpen} onOpenChange={setIsDeleteDuplicatesOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Xóa các dòng thuốc trùng?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Hệ thống sẽ nhóm trùng theo Số đăng ký, Tên thuốc và Hàm lượng.
                            Mỗi nhóm chỉ giữ lại 1 dòng. Các dòng đang có ánh xạ, thuốc công ty hoặc đơn hàng liên quan sẽ được bỏ qua để bảo vệ dữ liệu.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeletingDuplicates}>Hủy bỏ</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(event) => {
                                event.preventDefault();
                                handleDeleteDuplicates();
                            }}
                            disabled={isDeletingDuplicates}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            {isDeletingDuplicates ? "Đang xóa..." : "Xóa dòng trùng"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={isDeleteSelectedOpen} onOpenChange={setIsDeleteSelectedOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Xóa các thuốc đã chọn?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Hành động này sẽ xóa {selectedDrugCount} thuốc đang được chọn trong danh mục dùng chung.
                            Nếu có thuốc đang được ánh xạ, hệ thống sẽ chặn xóa để bảo vệ dữ liệu liên quan.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeletingSelected}>Hủy bỏ</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(event) => {
                                event.preventDefault();
                                handleDeleteSelected();
                            }}
                            disabled={isDeletingSelected || selectedDrugCount === 0}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            {isDeletingSelected ? "Đang xóa..." : `Xóa ${selectedDrugCount} thuốc`}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div >
    );
}
