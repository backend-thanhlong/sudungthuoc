"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
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
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogPortal,
    DialogOverlay,
    DialogTrigger,
} from "@/components/ui/dialog";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { readExcel, exportExcel } from "@/lib/excel";
import { Settings2, Pencil, Trash2, Trash, Search } from "lucide-react";
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

    tieuChuan: string | null;
    tuoiTho: string | null;
    duongDung: string | null;
    nguonGoc: string | null;

    congTySanXuat: string | null;
    nuocSanXuat: string | null;
    diaChiSanXuat: string | null;

    congTyDangKy: string | null;
    nuocDangKy: string | null;
    diaChiDangKy: string | null;

    nhomThuoc: string | null;
    nhomDieuTri: string | null;
    isKeDon: string | null;
    kiemSoatDacBiet: string | null;
    isTrongNuoc: string | null;

    isActive: boolean;
}

const COLUMN_CONFIG = [
    { id: "tenThuoc", label: "Tên thuốc" },
    { id: "hoatChat", label: "Hoạt chất" },
    { id: "hamLuong", label: "Hàm lượng" },
    { id: "soDangKy", label: "Số đăng ký" },
    { id: "dangBaoChe", label: "Dạng bào chế" },
    { id: "quyCach", label: "Quy cách" },
    { id: "duongDung", label: "Đường dùng" },
    { id: "donViTinh", label: "Đơn vị tính" },
];

const PAGE_SIZE_OPTIONS = [20, 50, 100] as const;

const INITIAL_FORM_DATA = {
    maChung: "",
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
    nhomDieuTri: "",
    isKeDon: "",
    kiemSoatDacBiet: "",
    isTrongNuoc: "",
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
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [wrappedColumns, setWrappedColumns] = useState<Record<string, boolean>>({
        tenThuoc: true,
        hoatChat: false,
        hamLuong: false,
        soDangKy: false,
        dangBaoChe: false,
        quyCach: false,
        duongDung: false,
        donViTinh: false,
    });
    const [isDeleteAllOpen, setIsDeleteAllOpen] = useState(false);

    const fetchDrugs = useCallback(async (
        currentPage: number,
        search: string,
        field: string = "ALL",
        currentMappingStatus: string = "all",
        currentLimit: number = limit
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

    // Only fetch when page changes or when activeSearchTerm changes (from button/Enter)
    useEffect(() => {
        fetchDrugs(page, activeSearchTerm, searchField, mappingStatus, limit);
    }, [fetchDrugs, page, activeSearchTerm, searchField, mappingStatus, limit]);

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

        // Optimistic Update
        if (editingId) {
            // Preserve existing fields that are not in formData but required in MasterDrug
            // Actually, best to just merge what we have. 
            // We need to be careful with nulls vs empty strings if types mismatch, 
            // but formData uses empty strings not nulls. 
            // Let's do a meaningful merge.
            setDrugs(prev => prev.map(d => d.id === editingId ? { ...d, ...formData } : d));
            setIsDialogOpen(false); // Close immediately
            // Reset form data and editingId later or now? 
            // If we close dialog, we should reset.
        }

        try {
            const url = editingId
                ? `/api/admin/master-drugs/${editingId}`
                : "/api/admin/master-drugs";

            const method = editingId ? "PATCH" : "POST";

            const res = await fetch(url, {
                method: method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });

            if (res.ok) {
                toast.success(editingId ? "Cập nhật thuốc thành công" : "Thêm thuốc thành công");
                if (!editingId) {
                    // For creating new, we can't fully optimistic update easily without an ID, 
                    // so we just rely on fetchDrugs.
                    // But for edit, we already did optimistic.
                    setIsDialogOpen(false);
                    setEditingId(null);
                    setFormData({ ...INITIAL_FORM_DATA });
                }
                fetchDrugs(page, searchTerm, searchField, mappingStatus); // Sync with server eventually
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
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const rawData = await readExcel(file) as any[];

            // Map headers to data model
            const mappedData = rawData.map(row => ({
                maChung: row['Mã chung'] || row['maChung'] || row['MaChung'],
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
                nhomDieuTri: row['Nhóm điều trị'] || row['nhomDieuTri'],
                isKeDon: row['Thuốc kê đơn'] || row['thuocKeDon'],
                kiemSoatDacBiet: row['Thuốc kiểm soát đặc biệt'] || row['kiemSoatDacBiet'],
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
                toast.success(`Nhập thành công: ${data.stats.success}, Bỏ qua: ${data.stats.skipped}, Lỗi: ${data.stats.error}`, { id: toastId });
                fetchDrugs(page, searchTerm, searchField, mappingStatus);
            } else {
                toast.error("Lỗi khi nhập dữ liệu", { id: toastId });
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
                "Nhóm thuốc": "Nhóm 1",
                "Nhóm điều trị": "Giảm đau, hạ sốt",
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
                "Thuốc kê đơn": "",
                "Thuốc kiểm soát đặc biệt": "",
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
                fetchDrugs(page, searchTerm, searchField, mappingStatus);
            }
        } catch {
            toast.error("Đã xảy ra lỗi");
        }
    };

    const handleEdit = (drug: MasterDrug) => {
        setEditingId(drug.id);
        setFormData({
            maChung: drug.maChung,
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

            nhomThuoc: drug.nhomThuoc || "",
            nhomDieuTri: drug.nhomDieuTri || "",
            isKeDon: drug.isKeDon || "",
            kiemSoatDacBiet: drug.kiemSoatDacBiet || "",
            isTrongNuoc: drug.isTrongNuoc || "",
        });
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
                // fetchDrugs(page, searchTerm); // No need to fetch immediately if we trust optimistic
                // But better to sync in background or just leave it
                // If we don't fetch, pagination might be slightly off until next nav, but that's fine for "instant" feel
                // Let's just re-fetch to be safe but the UI is already updated
                fetchDrugs(page, searchTerm, searchField, mappingStatus);
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
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="bg-white">
                                <Settings2 className="w-4 h-4 mr-2" />
                                Hiển thị
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                            <DropdownMenuLabel>Tùy chỉnh xuống dòng</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {COLUMN_CONFIG.map((column) => (
                                <DropdownMenuCheckboxItem
                                    key={column.id}
                                    checked={wrappedColumns[column.id]}
                                    onCheckedChange={(checked) =>
                                        setWrappedColumns((prev) => ({ ...prev, [column.id]: checked }))
                                    }
                                >
                                    {column.label}
                                </DropdownMenuCheckboxItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>

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

                                                        <div className="grid grid-cols-2 gap-3">
                                                            <div className="space-y-1.5">
                                                                <Label htmlFor="maChung" className="text-xs font-semibold text-gray-600">Mã chung <span className="text-red-500">*</span></Label>
                                                                <Input id="maChung" value={formData.maChung}
                                                                    onChange={(e) => setFormData({ ...formData, maChung: e.target.value })}
                                                                    placeholder="MC001" required className="h-9" />
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
                                                                        <Input id="nhomThuoc" value={formData.nhomThuoc}
                                                                            onChange={(e) => setFormData({ ...formData, nhomThuoc: e.target.value })}
                                                                            placeholder="vd: Nhóm 1" className="h-9" />
                                                                    </div>
                                                                    <div className="space-y-1.5">
                                                                        <Label htmlFor="nhomDieuTri" className="text-xs font-semibold text-gray-600">Nhóm điều trị</Label>
                                                                        <Input id="nhomDieuTri" value={formData.nhomDieuTri}
                                                                            onChange={(e) => setFormData({ ...formData, nhomDieuTri: e.target.value })}
                                                                            placeholder="vd: Giảm đau, hạ sốt" className="h-9" />
                                                                    </div>
                                                                </div>
                                                                <div className="grid grid-cols-3 gap-3">
                                                                    <div className="space-y-1.5">
                                                                        <Label htmlFor="isKeDon" className="text-xs font-semibold text-gray-600">Kê đơn</Label>
                                                                        <Input id="isKeDon" value={formData.isKeDon}
                                                                            onChange={(e) => setFormData({ ...formData, isKeDon: e.target.value })}
                                                                            placeholder="Có / Không" className="h-9" />
                                                                    </div>
                                                                    <div className="space-y-1.5">
                                                                        <Label htmlFor="kiemSoatDacBiet" className="text-xs font-semibold text-gray-600">KS đặc biệt</Label>
                                                                        <Input id="kiemSoatDacBiet" value={formData.kiemSoatDacBiet}
                                                                            onChange={(e) => setFormData({ ...formData, kiemSoatDacBiet: e.target.value })}
                                                                            placeholder="Có / Không" className="h-9" />
                                                                    </div>
                                                                    <div className="space-y-1.5">
                                                                        <Label htmlFor="isTrongNuoc" className="text-xs font-semibold text-gray-600">Trong nước</Label>
                                                                        <Input id="isTrongNuoc" value={formData.isTrongNuoc}
                                                                            onChange={(e) => setFormData({ ...formData, isTrongNuoc: e.target.value })}
                                                                            placeholder="Có / Không" className="h-9" />
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
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-blue-600 hover:bg-blue-600">
                                        <TableHead className="w-[50px] text-center text-white font-bold">STT</TableHead>
                                        <TableHead className="text-white font-bold">Tên thuốc</TableHead>
                                        <TableHead className="text-white font-bold">Hoạt chất</TableHead>
                                        <TableHead className="text-white font-bold">Hàm lượng</TableHead>
                                        <TableHead className="text-white font-bold">Số đăng ký</TableHead>
                                        <TableHead className="text-white font-bold">Dạng bào chế</TableHead>
                                        <TableHead className="text-white font-bold">Quy cách</TableHead>
                                        <TableHead className="text-white font-bold">Đường dùng</TableHead>
                                        <TableHead className="text-white font-bold">Đơn vị tính</TableHead>
                                        <TableHead className="text-white font-bold">Nhóm điều trị</TableHead>
                                        <TableHead className="text-right text-white font-bold">Thao tác</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {drugs.map((drug, index) => (
                                        <TableRow key={drug.id}>
                                            <TableCell className="text-center">{(page - 1) * limit + index + 1}</TableCell>
                                            <TableCell className={wrappedColumns.tenThuoc ? "font-medium" : "font-medium max-w-xs truncate"}>
                                                {drug.tenThuoc}
                                            </TableCell>
                                            <TableCell className={wrappedColumns.hoatChat ? "text-gray-600" : "text-gray-600 max-w-xs truncate"}>
                                                {drug.hoatChat || "-"}
                                            </TableCell>
                                            <TableCell className={wrappedColumns.hamLuong ? "" : "whitespace-nowrap"}>
                                                {drug.hamLuong || "-"}
                                            </TableCell>
                                            <TableCell>
                                                <code className={`px-2 py-1 bg-gray-100 rounded text-sm ${wrappedColumns.soDangKy ? "" : "whitespace-nowrap"}`}>
                                                    {drug.soDangKy || "-"}
                                                </code>
                                            </TableCell>
                                            <TableCell className={wrappedColumns.dangBaoChe ? "" : "whitespace-nowrap"}>
                                                {drug.dangBaoChe || "-"}
                                            </TableCell>
                                            <TableCell className={wrappedColumns.quyCach ? "" : "max-w-xs truncate"}>
                                                {drug.quyCach || "-"}
                                            </TableCell>
                                            <TableCell className={wrappedColumns.duongDung ? "" : "whitespace-nowrap"}>
                                                {drug.duongDung || "-"}
                                            </TableCell>
                                            <TableCell className={wrappedColumns.donViTinh ? "" : "whitespace-nowrap"}>
                                                {drug.donViTinh || "-"}
                                            </TableCell>
                                            <TableCell className="max-w-xs truncate">
                                                {drug.nhomDieuTri || "-"}
                                            </TableCell>
                                            <TableCell className="text-right whitespace-nowrap">
                                                {isAdmin && (
                                                    <>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                                            onClick={() => handleEdit(drug)}
                                                            title="Sửa"
                                                        >
                                                            <Pencil className="w-4 h-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                                            onClick={() => handleDelete(drug.id)}
                                                            title="Xóa"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => toggleDrugStatus(drug.id, drug.isActive)}
                                                        >
                                                            {drug.isActive ? "Ẩn" : "Hiện"}
                                                        </Button>
                                                    </>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {drugs.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={11} className="text-center text-gray-500 py-8">
                                                {searchTerm ? "Không tìm thấy thuốc phù hợp" : "Chưa có thuốc trong danh mục"}
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                            {/* Pagination Controls */}
                            <div className="flex items-center justify-between mt-4">
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-2 text-sm text-gray-500">
                                        <span>Hiển thị</span>
                                        <Select value={limit.toString()} onValueChange={handlePageSizeChange}>
                                            <SelectTrigger className="w-[120px] bg-white">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {PAGE_SIZE_OPTIONS.map((pageSize) => (
                                                    <SelectItem key={pageSize} value={pageSize.toString()}>
                                                        {pageSize} dòng
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="text-sm text-gray-500">
                                        Trang {page} / {totalPages}
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setPage(1)}
                                        disabled={page === 1}
                                        title="Trang đầu"
                                    >
                                        Trang đầu
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setPage(p => Math.max(1, p - 1))}
                                        disabled={page === 1}
                                        title="Trang trước"
                                    >
                                        Trước
                                    </Button>

                                    {/* Numbered Pagination */}
                                    {(() => {
                                        const pages = [];
                                        if (totalPages <= 7) {
                                            for (let i = 1; i <= totalPages; i++) {
                                                pages.push(i);
                                            }
                                        } else {
                                            // Always include first page
                                            pages.push(1);

                                            // Logic for ellipsis and middle pages
                                            if (page > 3) {
                                                pages.push('...');
                                            }

                                            // Middle pages
                                            let start = Math.max(2, page - 1);
                                            let end = Math.min(totalPages - 1, page + 1);

                                            // Adjust window if close to start or end
                                            if (page < 3) {
                                                start = 2;
                                                end = 4;
                                            } else if (page > totalPages - 2) {
                                                start = totalPages - 3;
                                                end = totalPages - 1;
                                            }

                                            for (let i = start; i <= end; i++) {
                                                pages.push(i);
                                            }

                                            if (page < totalPages - 2) {
                                                pages.push('...');
                                            }

                                            // Always include last page
                                            pages.push(totalPages);
                                        }

                                        return pages.map((p, index) => (
                                            p === '...' ? (
                                                <Button
                                                    key={`ellipsis-${index}`}
                                                    variant="ghost"
                                                    size="sm"
                                                    disabled
                                                    className="w-9 px-0"
                                                >
                                                    ...
                                                </Button>
                                            ) : (
                                                <Button
                                                    key={p}
                                                    variant={page === p ? "default" : "outline"}
                                                    size="sm"
                                                    onClick={() => setPage(Number(p))}
                                                    className={`w-9 px-0 ${page === p ? "bg-emerald-600 hover:bg-emerald-700" : ""}`}
                                                >
                                                    {p}
                                                </Button>
                                            )
                                        ));
                                    })()}

                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                        disabled={page === totalPages}
                                        title="Trang sau"
                                    >
                                        Sau
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setPage(totalPages)}
                                        disabled={page === totalPages}
                                        title="Trang cuối"
                                    >
                                        Trang cuối
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

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
        </div >
    );
}
