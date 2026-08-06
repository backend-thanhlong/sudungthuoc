import type { TherapeuticGroupOption } from "@/components/master-drugs/TherapeuticGroupPicker";

export interface MasterDrug {
    id: string;
    maChung: string;
    maBhyt: string | null;
    maAtc: string | null;
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
    therapeuticGroupId: string | null;
    therapeuticGroup: TherapeuticGroupOption | null;
    isKeDon: string | null;
    kiemSoatDacBiet: string | null;
    isThuocHiem: boolean;
    isTrongNuoc: string | null;

    isActive: boolean;
}

export const TABLE_COLUMNS = [
    { id: "stt", label: "STT", required: true, defaultVisible: true },
    { id: "maAtc", label: "Mã ATC", required: false, defaultVisible: true },
    { id: "maBhyt", label: "Mã BHYT", required: false, defaultVisible: true },
    { id: "tenThuoc", label: "Tên thuốc", required: true, defaultVisible: true },
    { id: "hoatChat", label: "Hoạt chất", required: true, defaultVisible: true },
    { id: "hamLuong", label: "Hàm lượng", required: true, defaultVisible: true },
    { id: "soDangKy", label: "Số đăng ký", required: true, defaultVisible: true },
    { id: "dangBaoChe", label: "Dạng bào chế", required: true, defaultVisible: true },
    { id: "quyCach", label: "Quy cách", required: false, defaultVisible: true },
    { id: "duongDung", label: "Đường dùng", required: true, defaultVisible: true },
    { id: "donViTinh", label: "Đơn vị tính", required: false, defaultVisible: true },
    { id: "isTrongNuoc", label: "Trong nước", required: false, defaultVisible: true },
    { id: "isKeDon", label: "Kê đơn", required: false, defaultVisible: true },
    { id: "nhomThuoc", label: "Nhóm thuốc", required: false, defaultVisible: true },
    { id: "therapeuticGroup", label: "Nhóm điều trị", required: false, defaultVisible: true },
    { id: "isThuocHiem", label: "Thuốc hiếm", required: false, defaultVisible: true },
    { id: "actions", label: "Thao tác", required: true, defaultVisible: true },
] as const;

export type TableColumnId = (typeof TABLE_COLUMNS)[number]["id"];

export const COLUMN_FILTER_FIELDS = [
    "maAtc",
    "maBhyt",
    "tenThuoc",
    "hoatChat",
    "hamLuong",
    "soDangKy",
    "dangBaoChe",
    "quyCach",
    "duongDung",
    "donViTinh",
    "isTrongNuoc",
    "isKeDon",
    "nhomThuoc",
    "therapeuticGroupId",
    "isThuocHiem",
] as const;

export type ColumnFilterKey = (typeof COLUMN_FILTER_FIELDS)[number];
export type ColumnFilters = Record<ColumnFilterKey, string>;

export const COLUMN_FILTER_KEY_BY_COLUMN_ID: Partial<Record<TableColumnId, ColumnFilterKey>> = {
    maAtc: "maAtc",
    maBhyt: "maBhyt",
    tenThuoc: "tenThuoc",
    hoatChat: "hoatChat",
    hamLuong: "hamLuong",
    soDangKy: "soDangKy",
    dangBaoChe: "dangBaoChe",
    quyCach: "quyCach",
    duongDung: "duongDung",
    donViTinh: "donViTinh",
    isTrongNuoc: "isTrongNuoc",
    isKeDon: "isKeDon",
    nhomThuoc: "nhomThuoc",
    therapeuticGroup: "therapeuticGroupId",
    isThuocHiem: "isThuocHiem",
};

export const createEmptyColumnFilters = (): ColumnFilters => ({
    maAtc: "",
    maBhyt: "",
    tenThuoc: "",
    hoatChat: "",
    hamLuong: "",
    soDangKy: "",
    dangBaoChe: "",
    quyCach: "",
    duongDung: "",
    donViTinh: "",
    isTrongNuoc: "",
    isKeDon: "",
    nhomThuoc: "",
    therapeuticGroupId: "",
    isThuocHiem: "",
});

export const hasAnyColumnFilters = (filters: ColumnFilters) =>
    COLUMN_FILTER_FIELDS.some((field) => filters[field].trim() !== "");

export const areColumnFiltersEqual = (left: ColumnFilters, right: ColumnFilters) =>
    COLUMN_FILTER_FIELDS.every((field) => left[field] === right[field]);

export const clearColumnFilterForColumn = (filters: ColumnFilters, columnId: TableColumnId) => {
    const filterKey = COLUMN_FILTER_KEY_BY_COLUMN_ID[columnId];
    if (!filterKey || !filters[filterKey]) {
        return filters;
    }

    return {
        ...filters,
        [filterKey]: "",
    };
};

export const WRAPPABLE_COLUMN_CONFIG = [
    { id: "tenThuoc", label: "Tên thuốc" },
    { id: "hoatChat", label: "Hoạt chất" },
    { id: "hamLuong", label: "Hàm lượng" },
    { id: "soDangKy", label: "Số đăng ký" },
    { id: "dangBaoChe", label: "Dạng bào chế" },
    { id: "quyCach", label: "Quy cách" },
    { id: "duongDung", label: "Đường dùng" },
    { id: "donViTinh", label: "Đơn vị tính" },
] as const;

export type WrappableColumnId = (typeof WRAPPABLE_COLUMN_CONFIG)[number]["id"];

export const DEFAULT_VISIBLE_COLUMNS = TABLE_COLUMNS.reduce((acc, column) => {
    acc[column.id] = column.defaultVisible;
    return acc;
}, {} as Record<TableColumnId, boolean>);

export const DEFAULT_WRAPPED_COLUMNS: Record<WrappableColumnId, boolean> = {
    tenThuoc: false,
    hoatChat: false,
    hamLuong: false,
    soDangKy: false,
    dangBaoChe: false,
    quyCach: false,
    duongDung: false,
    donViTinh: false,
};

export const PAGE_SIZE_OPTIONS = [20, 50, 100] as const;
export const DRUG_GROUP_OPTIONS = [
    "Hóa dược",
    "Dược liệu",
    "Vắc xin",
    "Sinh phẩm",
    "Nguyên liệu làm thuốc",
] as const;
export const PRESCRIPTION_OPTIONS = [
    "Thuốc kê đơn",
    "Thuốc không kê đơn",
] as const;
export const DOMESTIC_OPTIONS = [
    "Trong nước",
    "Nước ngoài",
] as const;

export const isMasterDrugColumnVisible = (
    columnId: TableColumnId,
    visibleColumns: Record<TableColumnId, boolean>,
) => {
    const column = TABLE_COLUMNS.find((item) => item.id === columnId);
    if (!column) {
        return true;
    }

    return column.required || visibleColumns[columnId];
};
