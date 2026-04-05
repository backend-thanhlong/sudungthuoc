import type {
    DrugOption,
    DrugSearchResponse,
    DrugSortOption,
    FacilityCompareResponse,
    FacilitySearchResponse,
    FacilitySortOption,
    InventoryFacilityOption,
} from "@/lib/inventory-search/types";

export type {
    DrugOption,
    DrugSearchResponse,
    DrugSortOption,
    FacilityCompareResponse,
    FacilitySearchResponse,
    FacilitySortOption,
    InventoryFacilityOption,
};

export type InventoryViewMode = "drug" | "facility" | "compare";

export const VIEW_MODE_OPTIONS: Array<{ value: InventoryViewMode; label: string }> = [
    { value: "drug", label: "Theo thuốc" },
    { value: "facility", label: "Theo cơ sở" },
    { value: "compare", label: "So sánh cơ sở" },
];

export const DRUG_SORT_OPTIONS: Array<{ value: DrugSortOption; label: string }> = [
    { value: "drugNameAsc", label: "Tên thuốc A-Z" },
    { value: "totalStockDesc", label: "Tổng tồn kho giảm dần" },
    { value: "facilityCountDesc", label: "Số cơ sở giảm dần" },
];

export const FACILITY_SORT_OPTIONS: Array<{ value: FacilitySortOption; label: string }> = [
    { value: "drugNameAsc", label: "Tên thuốc A-Z" },
    { value: "currentStockDesc", label: "Tồn kho giảm dần" },
    { value: "priceVATAsc", label: "Giá VAT tăng dần" },
];

export const formatDrugOptionLabel = (drug: DrugOption) => {
    const suffix = [drug.hoatChat, drug.hamLuong].filter(Boolean).join(" • ");
    return suffix ? `${drug.tenThuoc} (${suffix})` : drug.tenThuoc;
};
