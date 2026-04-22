export type DrugSortOption = "drugNameAsc" | "totalStockDesc" | "facilityCountDesc";
export type FacilitySortOption = "drugNameAsc" | "currentStockDesc" | "priceVATAsc";

export interface InventoryFacilityOption {
    id: string;
    facilityCode: string;
    facilityName: string;
    facilityType: string;
}

export interface InventorySnapshotRow {
    facilityId: string;
    facilityCode: string;
    facilityName: string;
    facilityType: string;
    mapId: string;
    masterDrugId: string | null;
    drugCode: string;
    drugName: string;
    activeIngredient: string;
    dosage: string;
    soDangKy: string;
    unit: string;
    currentStock: number;
    priceVAT: number;
    reportMonth: string;
}

export interface DrugFacilityStock {
    facilityId: string;
    facilityCode: string;
    facilityName: string;
    facilityType: string;
    currentStock: number;
    priceVAT: number;
    reportMonth: string;
}

export interface DrugSearchItem {
    masterDrugId: string | null;
    drugCode: string;
    drugName: string;
    activeIngredient: string;
    dosage: string;
    soDangKy: string;
    unit: string;
    facilities: DrugFacilityStock[];
    totalStock: number;
    facilityCount: number;
}

export interface DrugSearchResponse {
    results: DrugSearchItem[];
    total: number;
    page: number;
    limit: number;
}

export interface FacilityInventoryItem {
    masterDrugId: string | null;
    drugCode: string;
    drugName: string;
    activeIngredient: string;
    dosage: string;
    soDangKy: string;
    unit: string;
    currentStock: number;
    priceVAT: number;
    reportMonth: string;
}

export interface FacilityInventorySummary {
    drugCount: number;
    totalStock: number;
}

export interface FacilitySearchResponse {
    facility: InventoryFacilityOption | null;
    summary: FacilityInventorySummary;
    results: FacilityInventoryItem[];
    total: number;
    page: number;
    limit: number;
}

export interface DrugOption {
    masterDrugId: string;
    maChung: string;
    tenThuoc: string;
    hoatChat: string;
    hamLuong: string;
    unit: string;
}

export interface CompareFacilityValue extends InventoryFacilityOption {
    currentStock: number | null;
    priceVAT: number | null;
    reportMonth: string | null;
    hasData: boolean;
}

export interface CompareMetricValue {
    facilityId: string;
    display: string;
    highlighted: boolean;
    missing: boolean;
}

export interface CompareMetric {
    key: "currentStock" | "priceVAT" | "reportMonth";
    label: string;
    values: CompareMetricValue[];
}

export interface FacilityCompareResponse {
    drug: DrugOption;
    facilities: CompareFacilityValue[];
    metrics: CompareMetric[];
    reportMonthMismatch: boolean;
}
