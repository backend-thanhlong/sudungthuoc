import { normalizeSpecialControlValue } from "@/lib/master-drugs/special-control";

export type AbcGroup = "A" | "B" | "C";
export type UsageMetricKey = "value" | "quantity";
export type UsageDimensionKey = "drugGroup" | "therapeuticGroup" | "specialControl" | "prescription" | "domestic";

type NumericLike = number | string | { toString(): string } | null | undefined;

export interface RawAbcReport {
    facilityId: string;
    reportMonth: string;
    xuat: NumericLike;
    giaVat: NumericLike;
    drugMap?: {
        maNoiBo?: string | null;
        tenThuocNoiBo?: string | null;
        hoatChatNoiBo?: string | null;
        donViTinhNoiBo?: string | null;
        masterDrugId?: string | null;
        masterDrug?: {
            tenThuoc?: string | null;
            hoatChat?: string | null;
            hamLuong?: string | null;
            donViTinh?: string | null;
            nhomThuoc?: string | null;
            therapeuticGroup?: {
                name?: string | null;
            } | null;
            isKeDon?: string | null;
            kiemSoatDacBiet?: string | null;
            isTrongNuoc?: string | null;
        } | null;
    } | null;
    facility?: {
        facilityName?: string | null;
        facilityType?: string | null;
    } | null;
}

export interface AbcGroupSummary {
    group: AbcGroup;
    drugCount: number;
    value: number;
    valuePercent: number;
    quantity: number;
    quantityPercent: number;
}

export interface AbcSummary {
    totalValue: number;
    totalQuantity: number;
    totalDrugs: number;
    includedRows: number;
    excludedRows: number;
    groups: AbcGroupSummary[];
}

export interface AbcPriceBreakdown {
    reportMonth: string;
    facilityName?: string;
    quantity: number;
    unitPrice: number;
    value: number;
}

export interface AbcItem {
    rank: number;
    drugKey: string;
    drugName: string;
    hoatChat: string;
    hamLuong: string;
    donViTinh: string;
    nhomThuoc: string;
    totalQuantity: number;
    weightedAveragePrice: number;
    minPrice: number;
    maxPrice: number;
    pricePointCount: number;
    totalValue: number;
    percent: number;
    cumulativePercent: number;
    group: AbcGroup;
    isMapped: boolean;
    isKeDon: string;
    kiemSoatDacBiet: string;
    facilityCount?: number;
    topFacilityName?: string;
    priceBreakdown: AbcPriceBreakdown[];
}

export interface AbcParetoItem {
    rank: number;
    drugName: string;
    totalValue: number;
    percent: number;
    cumulativePercent: number;
    group: AbcGroup;
}

export interface AbcDataQuality {
    zeroPriceWithConsumption: number;
    unmappedWithConsumption: number;
    negativeOrZeroValueRows: number;
    multiPriceDrugs: number;
}

export interface UsageSlice {
    key: string;
    label: string;
    value: number;
    quantity: number;
    drugCount: number;
    percentValue: number;
    percentQuantity: number;
}

export interface FacilityUsageComparison {
    facilityId: string;
    facilityName: string;
    totalValue: number;
    totalQuantity: number;
    dimensions: Record<UsageDimensionKey, UsageSlice[]>;
}

export interface UsageOverview {
    mappedOnly: true;
    totalValue: number;
    totalQuantity: number;
    mappedDrugCount: number;
    excludedUnmapped: {
        rowCount: number;
        value: number;
        quantity: number;
    };
    byDrugGroup: UsageSlice[];
    byTherapeuticGroup: UsageSlice[];
    bySpecialControl: UsageSlice[];
    byPrescription: UsageSlice[];
    byDomestic: UsageSlice[];
    topGroups: UsageSlice[];
    facilityComparison?: FacilityUsageComparison[];
}

export interface AbcAnalysisResponse {
    summary: AbcSummary;
    abcItems: AbcItem[];
    paretoItems: AbcParetoItem[];
    specialDrugItems: AbcItem[];
    dataQuality: AbcDataQuality;
    usageOverview: UsageOverview;
}

export interface BuildAbcAnalysisOptions {
    scope: "admin" | "facility";
    limit?: number;
}

interface DrugAccumulator {
    drugKey: string;
    drugName: string;
    hoatChat: string;
    hamLuong: string;
    donViTinh: string;
    nhomThuoc: string;
    isMapped: boolean;
    isKeDon: string;
    kiemSoatDacBiet: string;
    totalQuantity: number;
    totalValue: number;
    pricePoints: Set<string>;
    facilityValues: Map<string, { name: string; value: number }>;
    breakdown: Map<string, AbcPriceBreakdown>;
}

interface UsageDimensionEntry {
    key: string;
    label: string;
}

interface UsageSliceAccumulator extends UsageDimensionEntry {
    value: number;
    quantity: number;
    drugIds: Set<string>;
}

interface UsageFacilityAccumulator {
    facilityId: string;
    facilityName: string;
    totalValue: number;
    totalQuantity: number;
    dimensions: Record<UsageDimensionKey, Map<string, UsageSliceAccumulator>>;
}

const DEFAULT_LIMIT = 500;
const MAX_LIMIT = 2000;
const PARETO_LIMIT = 50;
const REPORT_MONTH_PATTERN = /^(\d{2})\/(\d{4})$/;
const NON_SPECIAL_CONTROL_LABEL = "Không phải thuốc kiểm soát đặc biệt";
const LEGACY_SPECIAL_CONTROL_LABEL = "Có KSĐB";
const PRESCRIPTION_LABEL = "Thuốc kê đơn";
const NON_PRESCRIPTION_LABEL = "Thuốc không kê đơn";
const UNKNOWN_PRESCRIPTION_LABEL = "Chưa phân loại kê đơn";
const USAGE_DIMENSION_KEYS: UsageDimensionKey[] = [
    "drugGroup",
    "therapeuticGroup",
    "specialControl",
    "prescription",
    "domestic",
];

const emptyGroupSummary = (group: AbcGroup): AbcGroupSummary => ({
    group,
    drugCount: 0,
    value: 0,
    valuePercent: 0,
    quantity: 0,
    quantityPercent: 0,
});

function toNumber(value: NumericLike) {
    const numeric = Number(value ?? 0);
    return Number.isFinite(numeric) ? numeric : 0;
}

function roundTo(value: number, digits = 2) {
    const factor = 10 ** digits;
    return Math.round(value * factor) / factor;
}

function normalizeText(value: string | null | undefined, fallback = "") {
    const text = value?.trim();
    return text || fallback;
}

function normalizeFlag(value: string | null | undefined) {
    return value
        ?.trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") || "";
}

export function isTruthyReportFlag(value: string | null | undefined) {
    const normalized = normalizeFlag(value);
    return normalized === "co" || normalized === "true" || normalized === "1" || normalized === "x";
}

export function isSpecialControlDrug(value: string | null | undefined) {
    return normalizeSpecialControlValue(value) !== null || isTruthyReportFlag(value);
}

export function isPrescriptionDrug(value: string | null | undefined) {
    const normalized = normalizeFlag(value);

    if (isFalseyPrescriptionFlag(normalized)) {
        return false;
    }

    return (
        normalized === "thuoc ke don" ||
        normalized === "ke don" ||
        isTruthyReportFlag(value)
    );
}

function isFalseyPrescriptionFlag(normalized: string) {
    return (
        normalized === "thuoc khong ke don" ||
        normalized === "khong ke don" ||
        normalized === "khong" ||
        normalized === "no" ||
        normalized === "false" ||
        normalized === "0"
    );
}

function getSpecialControlUsageLabel(value: string | null | undefined) {
    const specialControlValue = normalizeSpecialControlValue(value);
    if (specialControlValue) {
        return specialControlValue;
    }

    return isTruthyReportFlag(value) ? LEGACY_SPECIAL_CONTROL_LABEL : NON_SPECIAL_CONTROL_LABEL;
}

function getPrescriptionUsageLabel(value: string | null | undefined) {
    const normalized = normalizeFlag(value);
    if (!normalized) {
        return UNKNOWN_PRESCRIPTION_LABEL;
    }
    if (normalized === "thuoc ke don" || normalized === "ke don" || isTruthyReportFlag(value)) {
        return PRESCRIPTION_LABEL;
    }
    if (isFalseyPrescriptionFlag(normalized)) {
        return NON_PRESCRIPTION_LABEL;
    }

    return UNKNOWN_PRESCRIPTION_LABEL;
}

function isDomesticDrugFlag(value: string | null | undefined) {
    const normalized = normalizeFlag(value);
    return normalized === "trong nuoc" || normalized === "co" || normalized === "true" || normalized === "1";
}

export function parseReportMonth(reportMonth: string) {
    const match = REPORT_MONTH_PATTERN.exec(reportMonth);
    if (!match) {
        return null;
    }

    const month = Number(match[1]);
    const year = Number(match[2]);
    if (month < 1 || month > 12) {
        return null;
    }

    return year * 12 + month - 1;
}

export function compareReportMonthsDesc(left: string, right: string) {
    const leftValue = parseReportMonth(left);
    const rightValue = parseReportMonth(right);

    if (leftValue === null && rightValue === null) {
        return right.localeCompare(left);
    }
    if (leftValue === null) {
        return 1;
    }
    if (rightValue === null) {
        return -1;
    }

    return rightValue - leftValue;
}

function getLimitedValue(limit: number | undefined) {
    if (!limit || !Number.isFinite(limit)) {
        return DEFAULT_LIMIT;
    }

    return Math.min(Math.max(Math.floor(limit), 1), MAX_LIMIT);
}

function getDrugKey(report: RawAbcReport) {
    const masterDrugId = report.drugMap?.masterDrugId;
    if (masterDrugId) {
        return `master:${masterDrugId}`;
    }

    const internalCode = normalizeText(report.drugMap?.maNoiBo, "unknown");
    return `unmapped:${report.facilityId}:${internalCode}`;
}

function getFacilityName(report: RawAbcReport) {
    return normalizeText(report.facility?.facilityName, "Không rõ CSYT");
}

function createAccumulator(report: RawAbcReport, drugKey: string): DrugAccumulator {
    const masterDrug = report.drugMap?.masterDrug;
    const isMapped = Boolean(report.drugMap?.masterDrugId);

    return {
        drugKey,
        drugName: normalizeText(masterDrug?.tenThuoc, normalizeText(report.drugMap?.tenThuocNoiBo, "Chưa rõ tên thuốc")),
        hoatChat: normalizeText(masterDrug?.hoatChat, normalizeText(report.drugMap?.hoatChatNoiBo, "")),
        hamLuong: normalizeText(masterDrug?.hamLuong),
        donViTinh: normalizeText(masterDrug?.donViTinh, normalizeText(report.drugMap?.donViTinhNoiBo, "")),
        nhomThuoc: normalizeText(masterDrug?.nhomThuoc, "Khác"),
        isMapped,
        isKeDon: normalizeText(masterDrug?.isKeDon),
        kiemSoatDacBiet: normalizeText(masterDrug?.kiemSoatDacBiet),
        totalQuantity: 0,
        totalValue: 0,
        pricePoints: new Set<string>(),
        facilityValues: new Map<string, { name: string; value: number }>(),
        breakdown: new Map<string, AbcPriceBreakdown>(),
    };
}

function addBreakdown(accumulator: DrugAccumulator, report: RawAbcReport, quantity: number, unitPrice: number, value: number) {
    const facilityName = getFacilityName(report);
    const breakdownKey = `${report.reportMonth}|${facilityName}|${roundTo(unitPrice, 4)}`;
    const existing = accumulator.breakdown.get(breakdownKey);

    if (existing) {
        existing.quantity = roundTo(existing.quantity + quantity);
        existing.value = roundTo(existing.value + value);
        return;
    }

    accumulator.breakdown.set(breakdownKey, {
        reportMonth: report.reportMonth,
        facilityName,
        quantity: roundTo(quantity),
        unitPrice: roundTo(unitPrice, 4),
        value: roundTo(value),
    });
}

function getTopFacilityName(facilityValues: Map<string, { name: string; value: number }>) {
    let topName = "";
    let topValue = 0;

    facilityValues.forEach((facility) => {
        if (facility.value > topValue) {
            topName = facility.name;
            topValue = facility.value;
        }
    });

    return topName || undefined;
}

function buildPriceBreakdown(accumulator: DrugAccumulator) {
    return Array.from(accumulator.breakdown.values())
        .sort((left, right) => {
            const monthOrder = compareReportMonthsDesc(left.reportMonth, right.reportMonth);
            if (monthOrder !== 0) {
                return monthOrder;
            }
            return right.value - left.value;
        });
}

function toAbcItem(
    accumulator: DrugAccumulator,
    rank: number,
    grandTotalValue: number,
    cumulativeBefore: number,
    scope: BuildAbcAnalysisOptions["scope"]
): AbcItem {
    const cumulativeValue = cumulativeBefore + accumulator.totalValue;
    const percent = grandTotalValue > 0 ? accumulator.totalValue / grandTotalValue * 100 : 0;
    const cumulativePercent = grandTotalValue > 0 ? cumulativeValue / grandTotalValue * 100 : 0;
    const group: AbcGroup = cumulativeBefore / grandTotalValue * 100 < 80
        ? "A"
        : cumulativeBefore / grandTotalValue * 100 < 95
            ? "B"
            : "C";
    const prices = Array.from(accumulator.pricePoints, Number).sort((a, b) => a - b);
    const weightedAveragePrice = accumulator.totalQuantity > 0
        ? accumulator.totalValue / accumulator.totalQuantity
        : 0;

    return {
        rank,
        drugKey: accumulator.drugKey,
        drugName: accumulator.drugName,
        hoatChat: accumulator.hoatChat,
        hamLuong: accumulator.hamLuong,
        donViTinh: accumulator.donViTinh,
        nhomThuoc: accumulator.nhomThuoc,
        totalQuantity: roundTo(accumulator.totalQuantity),
        weightedAveragePrice: roundTo(weightedAveragePrice, 4),
        minPrice: roundTo(prices[0] || 0, 4),
        maxPrice: roundTo(prices[prices.length - 1] || 0, 4),
        pricePointCount: prices.length,
        totalValue: Math.round(accumulator.totalValue),
        percent: roundTo(percent),
        cumulativePercent: roundTo(cumulativePercent),
        group,
        isMapped: accumulator.isMapped,
        isKeDon: accumulator.isKeDon,
        kiemSoatDacBiet: accumulator.kiemSoatDacBiet,
        facilityCount: scope === "admin" ? accumulator.facilityValues.size : undefined,
        topFacilityName: scope === "admin" ? getTopFacilityName(accumulator.facilityValues) : undefined,
        priceBreakdown: buildPriceBreakdown(accumulator),
    };
}

function buildSummary(items: AbcItem[], includedRows: number, excludedRows: number): AbcSummary {
    const totalValue = items.reduce((sum, item) => sum + item.totalValue, 0);
    const totalQuantity = items.reduce((sum, item) => sum + item.totalQuantity, 0);
    const groupMap: Record<AbcGroup, AbcGroupSummary> = {
        A: emptyGroupSummary("A"),
        B: emptyGroupSummary("B"),
        C: emptyGroupSummary("C"),
    };

    items.forEach((item) => {
        const group = groupMap[item.group];
        group.drugCount += 1;
        group.value += item.totalValue;
        group.quantity += item.totalQuantity;
    });

    const groups = (["A", "B", "C"] as AbcGroup[]).map((group) => ({
        ...groupMap[group],
        value: Math.round(groupMap[group].value),
        valuePercent: totalValue > 0 ? roundTo(groupMap[group].value / totalValue * 100) : 0,
        quantity: roundTo(groupMap[group].quantity),
        quantityPercent: totalQuantity > 0 ? roundTo(groupMap[group].quantity / totalQuantity * 100) : 0,
    }));

    return {
        totalValue: Math.round(totalValue),
        totalQuantity: roundTo(totalQuantity),
        totalDrugs: items.length,
        includedRows,
        excludedRows,
        groups,
    };
}

function createUsageDimensionMaps(): Record<UsageDimensionKey, Map<string, UsageSliceAccumulator>> {
    return {
        drugGroup: new Map(),
        therapeuticGroup: new Map(),
        specialControl: new Map(),
        prescription: new Map(),
        domestic: new Map(),
    };
}

function getUsageDimensionKey(dimension: UsageDimensionKey, label: string) {
    const normalized = normalizeFlag(label).replace(/[^a-z0-9]+/g, "-") || "unknown";
    return `${dimension}:${normalized}`;
}

function getPrescriptionUsageDimensions(): UsageDimensionEntry[] {
    return [PRESCRIPTION_LABEL, NON_PRESCRIPTION_LABEL, UNKNOWN_PRESCRIPTION_LABEL].map((label) => ({
        key: getUsageDimensionKey("prescription", label),
        label,
    }));
}

function getUsageDimensions(report: RawAbcReport): Record<UsageDimensionKey, UsageDimensionEntry> {
    const masterDrug = report.drugMap?.masterDrug;
    const drugGroupLabel = normalizeText(masterDrug?.nhomThuoc, "Chưa phân nhóm");
    const therapeuticGroupLabel = normalizeText(masterDrug?.therapeuticGroup?.name, "Chưa phân nhóm điều trị");
    const specialControlLabel = getSpecialControlUsageLabel(masterDrug?.kiemSoatDacBiet);
    const prescriptionLabel = getPrescriptionUsageLabel(masterDrug?.isKeDon);
    const domesticLabel = isDomesticDrugFlag(masterDrug?.isTrongNuoc) ? "Trong nước" : "Nước ngoài hoặc chưa rõ";

    return {
        drugGroup: {
            key: getUsageDimensionKey("drugGroup", drugGroupLabel),
            label: drugGroupLabel,
        },
        therapeuticGroup: {
            key: getUsageDimensionKey("therapeuticGroup", therapeuticGroupLabel),
            label: therapeuticGroupLabel,
        },
        specialControl: {
            key: getUsageDimensionKey("specialControl", specialControlLabel),
            label: specialControlLabel,
        },
        prescription: {
            key: getUsageDimensionKey("prescription", prescriptionLabel),
            label: prescriptionLabel,
        },
        domestic: {
            key: isDomesticDrugFlag(masterDrug?.isTrongNuoc) ? "domestic:yes" : "domestic:no",
            label: domesticLabel,
        },
    };
}

function addUsageToMap(
    map: Map<string, UsageSliceAccumulator>,
    dimension: UsageDimensionEntry,
    masterDrugId: string,
    quantity: number,
    value: number
) {
    const accumulator = map.get(dimension.key) ?? {
        key: dimension.key,
        label: dimension.label,
        value: 0,
        quantity: 0,
        drugIds: new Set<string>(),
    };

    accumulator.value += value;
    accumulator.quantity += quantity;
    accumulator.drugIds.add(masterDrugId);
    map.set(dimension.key, accumulator);
}

function toUsageSlices(
    map: Map<string, UsageSliceAccumulator>,
    totalValue: number,
    totalQuantity: number,
    fixedDimensions?: UsageDimensionEntry[]
): UsageSlice[] {
    const values = new Map(map);
    fixedDimensions?.forEach((dimension) => {
        if (!values.has(dimension.key)) {
            values.set(dimension.key, {
                key: dimension.key,
                label: dimension.label,
                value: 0,
                quantity: 0,
                drugIds: new Set<string>(),
            });
        }
    });

    const slices = Array.from(values.values())
        .map((item) => ({
            key: item.key,
            label: item.label,
            value: Math.round(item.value),
            quantity: roundTo(item.quantity),
            drugCount: item.drugIds.size,
            percentValue: totalValue > 0 ? roundTo(item.value / totalValue * 100) : 0,
            percentQuantity: totalQuantity > 0 ? roundTo(item.quantity / totalQuantity * 100) : 0,
        }));

    if (fixedDimensions) {
        const fixedOrder = new Map(fixedDimensions.map((dimension, index) => [dimension.key, index]));
        return slices.sort((left, right) =>
            (fixedOrder.get(left.key) ?? Number.MAX_SAFE_INTEGER) -
            (fixedOrder.get(right.key) ?? Number.MAX_SAFE_INTEGER)
        );
    }

    return slices.sort((left, right) => right.value - left.value || right.quantity - left.quantity || left.label.localeCompare(right.label, "vi"));
}

function createFacilityAccumulator(report: RawAbcReport): UsageFacilityAccumulator {
    return {
        facilityId: report.facilityId,
        facilityName: getFacilityName(report),
        totalValue: 0,
        totalQuantity: 0,
        dimensions: createUsageDimensionMaps(),
    };
}

function buildTopGroups(byDrugGroup: UsageSlice[], byTherapeuticGroup: UsageSlice[]) {
    const candidates: UsageSlice[] = [
        ...byDrugGroup.map((item) => ({
            ...item,
            key: `topGroup:${item.key}`,
            label: `Nhóm thuốc: ${item.label}`,
        })),
        ...byTherapeuticGroup.map((item) => ({
            ...item,
            key: `topTherapeuticGroup:${item.key}`,
            label: `Nhóm điều trị: ${item.label}`,
        })),
    ];

    return candidates
        .sort((left, right) => right.value - left.value || right.quantity - left.quantity || left.label.localeCompare(right.label, "vi"))
        .slice(0, 10);
}

function buildUsageOverview(
    reports: RawAbcReport[],
    scope: BuildAbcAnalysisOptions["scope"]
): UsageOverview {
    const dimensionMaps = createUsageDimensionMaps();
    const mappedDrugIds = new Set<string>();
    const facilityMap = new Map<string, UsageFacilityAccumulator>();
    let totalValue = 0;
    let totalQuantity = 0;
    let excludedUnmappedRows = 0;
    let excludedUnmappedValue = 0;
    let excludedUnmappedQuantity = 0;

    reports.forEach((report) => {
        const quantity = toNumber(report.xuat);

        if (quantity <= 0) {
            return;
        }

        const rawValue = quantity * toNumber(report.giaVat);
        const value = rawValue > 0 ? rawValue : 0;
        const masterDrugId = report.drugMap?.masterDrugId;

        if (!masterDrugId) {
            excludedUnmappedRows += 1;
            excludedUnmappedValue += value;
            excludedUnmappedQuantity += quantity;
            return;
        }

        mappedDrugIds.add(masterDrugId);
        totalValue += value;
        totalQuantity += quantity;

        const dimensions = getUsageDimensions(report);
        USAGE_DIMENSION_KEYS.forEach((dimensionKey) => {
            addUsageToMap(dimensionMaps[dimensionKey], dimensions[dimensionKey], masterDrugId, quantity, value);
        });

        if (scope === "admin") {
            const facilityAccumulator = facilityMap.get(report.facilityId) ?? createFacilityAccumulator(report);
            facilityAccumulator.totalValue += value;
            facilityAccumulator.totalQuantity += quantity;
            USAGE_DIMENSION_KEYS.forEach((dimensionKey) => {
                addUsageToMap(
                    facilityAccumulator.dimensions[dimensionKey],
                    dimensions[dimensionKey],
                    masterDrugId,
                    quantity,
                    value
                );
            });
            facilityMap.set(report.facilityId, facilityAccumulator);
        }
    });

    const byDrugGroup = toUsageSlices(dimensionMaps.drugGroup, totalValue, totalQuantity);
    const byTherapeuticGroup = toUsageSlices(dimensionMaps.therapeuticGroup, totalValue, totalQuantity);
    const bySpecialControl = toUsageSlices(dimensionMaps.specialControl, totalValue, totalQuantity);
    const prescriptionDimensions = getPrescriptionUsageDimensions();
    const byPrescription = toUsageSlices(dimensionMaps.prescription, totalValue, totalQuantity, prescriptionDimensions);
    const byDomestic = toUsageSlices(dimensionMaps.domestic, totalValue, totalQuantity);
    const facilityComparison = scope === "admin"
        ? Array.from(facilityMap.values())
            .map((facility) => ({
                facilityId: facility.facilityId,
                facilityName: facility.facilityName,
                totalValue: Math.round(facility.totalValue),
                totalQuantity: roundTo(facility.totalQuantity),
                dimensions: {
                    drugGroup: toUsageSlices(facility.dimensions.drugGroup, facility.totalValue, facility.totalQuantity),
                    therapeuticGroup: toUsageSlices(facility.dimensions.therapeuticGroup, facility.totalValue, facility.totalQuantity),
                    specialControl: toUsageSlices(facility.dimensions.specialControl, facility.totalValue, facility.totalQuantity),
                    prescription: toUsageSlices(facility.dimensions.prescription, facility.totalValue, facility.totalQuantity, prescriptionDimensions),
                    domestic: toUsageSlices(facility.dimensions.domestic, facility.totalValue, facility.totalQuantity),
                },
            }))
            .sort((left, right) => right.totalValue - left.totalValue || right.totalQuantity - left.totalQuantity)
        : undefined;

    return {
        mappedOnly: true,
        totalValue: Math.round(totalValue),
        totalQuantity: roundTo(totalQuantity),
        mappedDrugCount: mappedDrugIds.size,
        excludedUnmapped: {
            rowCount: excludedUnmappedRows,
            value: Math.round(excludedUnmappedValue),
            quantity: roundTo(excludedUnmappedQuantity),
        },
        byDrugGroup,
        byTherapeuticGroup,
        bySpecialControl,
        byPrescription,
        byDomestic,
        topGroups: buildTopGroups(byDrugGroup, byTherapeuticGroup),
        facilityComparison,
    };
}

export function buildAbcAnalysis(
    reports: RawAbcReport[],
    options: BuildAbcAnalysisOptions
): AbcAnalysisResponse {
    const limit = getLimitedValue(options.limit);
    const usageOverview = buildUsageOverview(reports, options.scope);
    const accumulators = new Map<string, DrugAccumulator>();
    let includedRows = 0;
    let excludedRows = 0;
    let zeroPriceWithConsumption = 0;
    let unmappedWithConsumption = 0;

    reports.forEach((report) => {
        const quantity = toNumber(report.xuat);
        const unitPrice = toNumber(report.giaVat);
        const usageValue = quantity * unitPrice;
        const isMapped = Boolean(report.drugMap?.masterDrugId);

        if (quantity > 0 && unitPrice <= 0) {
            zeroPriceWithConsumption += 1;
        }
        if (quantity > 0 && !isMapped) {
            unmappedWithConsumption += 1;
        }
        if (usageValue <= 0) {
            excludedRows += 1;
            return;
        }

        includedRows += 1;
        const drugKey = getDrugKey(report);
        const accumulator = accumulators.get(drugKey) ?? createAccumulator(report, drugKey);
        const facilityName = getFacilityName(report);
        const existingFacilityValue = accumulator.facilityValues.get(report.facilityId)?.value || 0;

        accumulator.totalQuantity += quantity;
        accumulator.totalValue += usageValue;
        accumulator.pricePoints.add(String(roundTo(unitPrice, 4)));
        accumulator.facilityValues.set(report.facilityId, {
            name: facilityName,
            value: existingFacilityValue + usageValue,
        });
        addBreakdown(accumulator, report, quantity, unitPrice, usageValue);
        accumulators.set(drugKey, accumulator);
    });

    const sortedAccumulators = Array.from(accumulators.values())
        .sort((left, right) => right.totalValue - left.totalValue);
    const grandTotalValue = sortedAccumulators.reduce((sum, accumulator) => sum + accumulator.totalValue, 0);

    let cumulativeBefore = 0;
    const allItems = sortedAccumulators.map((accumulator, index) => {
        const item = toAbcItem(accumulator, index + 1, grandTotalValue, cumulativeBefore, options.scope);
        cumulativeBefore += accumulator.totalValue;
        return item;
    });

    const summary = buildSummary(allItems, includedRows, excludedRows);
    const limitedItems = allItems.slice(0, limit);

    return {
        summary,
        abcItems: limitedItems,
        paretoItems: allItems.slice(0, PARETO_LIMIT).map((item) => ({
            rank: item.rank,
            drugName: item.drugName,
            totalValue: item.totalValue,
            percent: item.percent,
            cumulativePercent: item.cumulativePercent,
            group: item.group,
        })),
        specialDrugItems: allItems
            .filter((item) => isSpecialControlDrug(item.kiemSoatDacBiet))
            .slice(0, 50),
        dataQuality: {
            zeroPriceWithConsumption,
            unmappedWithConsumption,
            negativeOrZeroValueRows: excludedRows,
            multiPriceDrugs: allItems.filter((item) => item.pricePointCount > 1).length,
        },
        usageOverview,
    };
}
