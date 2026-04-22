import { roundTo, type SnapshotMetric } from "@/lib/dashboard/supply-risk";

export type SupplyScope = "admin" | "facility";

export type SupplyContractRiskBucket =
    | "expired"
    | "within_30_days"
    | "within_60_days"
    | "within_90_days";

export interface SupplySummaryMetrics {
    endingInventoryValue: number;
    exportValue: number;
    stockoutCount: number;
    shortageUnderOneMonthCount: number;
    deadStockCount: number;
    contractExpiringCount: number;
}

export interface SupplyValueRiskRow {
    facility: string;
    drugName: string;
    hoatChat: string;
    hamLuong: string;
    supplierName: string;
    awardDecision: string;
    tonCuoi: number;
    currentXuat: number;
    demandAvg: number;
    monthsOfCover: number;
    giaVat: number;
    endingInventoryValue: number;
    exportValue: number;
    riskValue: number;
}

export interface SupplyContractRiskRow {
    facility: string;
    drugName: string;
    hoatChat: string;
    hamLuong: string;
    supplierName: string;
    awardDecision: string;
    contractStartDate: string;
    contractEndDate: string;
    daysToExpiry: number;
    bucket: SupplyContractRiskBucket;
    tonCuoi: number;
    currentXuat: number;
    demandAvg: number;
    monthsOfCover: number;
    endingInventoryValue: number;
}

export interface SupplySupplierDependencyRow {
    supplierName: string;
    facilityCount: number;
    activeDrugCount: number;
    endingInventoryValue: number;
    riskValue: number;
    expiringContractCount: number;
    expiredContractCount: number;
}

export interface SupplyDataCoverage {
    activeFacilityCount: number;
    reportingFacilityCount: number;
    snapshotRowCount: number;
    rowsWithPrice: number;
    rowsWithContractInfo: number;
    rowsMappedMasterDrug: number;
    rowsWithDomesticClassification: number;
}

export interface SupplyInsightsData {
    summaryMetrics: SupplySummaryMetrics;
    topOverstockByValue: SupplyValueRiskRow[];
    topShortageByRiskValue: SupplyValueRiskRow[];
    contractRisk: SupplyContractRiskRow[];
    supplierDependency: SupplySupplierDependencyRow[];
    dataCoverage: SupplyDataCoverage | null;
}

interface BuildSupplyInsightsInput {
    metrics: SnapshotMetric[];
    scope: SupplyScope;
    activeFacilityCount?: number;
    today?: Date;
}

const CONTRACT_BUCKET_ORDER: Record<SupplyContractRiskBucket, number> = {
    expired: 0,
    within_30_days: 1,
    within_60_days: 2,
    within_90_days: 3,
};

const DAY_IN_MS = 24 * 60 * 60 * 1000;

function normalizeText(value: string) {
    return value.trim();
}

function normalizeSupplierName(value: string) {
    return normalizeText(value) || "Chưa khai báo";
}

function parseContractDate(value: string) {
    const normalized = value.trim();
    if (!/^\d{8}$/.test(normalized)) {
        return null;
    }

    const year = Number(normalized.slice(0, 4));
    const month = Number(normalized.slice(4, 6));
    const day = Number(normalized.slice(6, 8));
    if (month < 1 || month > 12 || day < 1 || day > 31) {
        return null;
    }

    return new Date(Date.UTC(year, month - 1, day));
}

function getTodayUtc(today: Date) {
    return new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
}

function getDaysToExpiry(endDate: Date, todayUtc: Date) {
    return Math.floor((endDate.getTime() - todayUtc.getTime()) / DAY_IN_MS);
}

function getContractBucket(daysToExpiry: number) {
    if (daysToExpiry < 0) {
        return "expired" satisfies SupplyContractRiskBucket;
    }
    if (daysToExpiry <= 30) {
        return "within_30_days" satisfies SupplyContractRiskBucket;
    }
    if (daysToExpiry <= 60) {
        return "within_60_days" satisfies SupplyContractRiskBucket;
    }
    if (daysToExpiry <= 90) {
        return "within_90_days" satisfies SupplyContractRiskBucket;
    }

    return null;
}

function hasContractTriplet(metric: SnapshotMetric) {
    return Boolean(metric.soQdTrungThau && metric.tenCongTy && metric.ngayKetThucHd);
}

function toRiskValue(metric: SnapshotMetric) {
    return roundTo(metric.demandAvg * metric.giaVat);
}

function toMonthsOfCover(metric: SnapshotMetric) {
    return metric.monthsOfCover ?? 0;
}

function toValueRiskRow(metric: SnapshotMetric): SupplyValueRiskRow {
    return {
        facility: metric.facility,
        drugName: metric.drugName,
        hoatChat: metric.hoatChat,
        hamLuong: metric.hamLuong,
        supplierName: normalizeSupplierName(metric.tenCongTy),
        awardDecision: metric.soQdTrungThau,
        tonCuoi: metric.currentTonCuoi,
        currentXuat: metric.currentXuat,
        demandAvg: metric.demandAvg,
        monthsOfCover: toMonthsOfCover(metric),
        giaVat: metric.giaVat,
        endingInventoryValue: metric.endingInventoryValue,
        exportValue: metric.exportValue,
        riskValue: toRiskValue(metric),
    };
}

function buildSummaryMetrics(metrics: SnapshotMetric[], todayUtc: Date): SupplySummaryMetrics {
    const contractExpiringCount = metrics.filter(metric => {
        if (metric.demandAvg <= 0) {
            return false;
        }

        const endDate = parseContractDate(metric.ngayKetThucHd);
        if (!endDate) {
            return false;
        }

        const daysToExpiry = getDaysToExpiry(endDate, todayUtc);
        return daysToExpiry >= 0 && daysToExpiry <= 90;
    }).length;

    return {
        endingInventoryValue: roundTo(metrics.reduce((sum, metric) => sum + metric.endingInventoryValue, 0)),
        exportValue: roundTo(metrics.reduce((sum, metric) => sum + metric.exportValue, 0)),
        stockoutCount: metrics.filter(metric => metric.currentTonCuoi === 0 && metric.demandAvg > 0).length,
        shortageUnderOneMonthCount: metrics.filter(metric => metric.monthsOfCover !== null && metric.monthsOfCover > 0 && metric.monthsOfCover < 1).length,
        deadStockCount: metrics.filter(metric => metric.currentTonCuoi > 0 && metric.demandAvg === 0).length,
        contractExpiringCount,
    };
}

function buildContractRiskRows(metrics: SnapshotMetric[], todayUtc: Date) {
    return metrics
        .filter(metric => metric.demandAvg > 0)
        .map(metric => {
            const endDate = parseContractDate(metric.ngayKetThucHd);
            if (!endDate) {
                return null;
            }

            const daysToExpiry = getDaysToExpiry(endDate, todayUtc);
            const bucket = getContractBucket(daysToExpiry);
            if (!bucket) {
                return null;
            }

            return {
                facility: metric.facility,
                drugName: metric.drugName,
                hoatChat: metric.hoatChat,
                hamLuong: metric.hamLuong,
                supplierName: normalizeSupplierName(metric.tenCongTy),
                awardDecision: metric.soQdTrungThau,
                contractStartDate: metric.ngayBatDauHd,
                contractEndDate: metric.ngayKetThucHd,
                daysToExpiry,
                bucket,
                tonCuoi: metric.currentTonCuoi,
                currentXuat: metric.currentXuat,
                demandAvg: metric.demandAvg,
                monthsOfCover: toMonthsOfCover(metric),
                endingInventoryValue: metric.endingInventoryValue,
            } satisfies SupplyContractRiskRow;
        })
        .filter((metric): metric is SupplyContractRiskRow => metric !== null)
        .sort((left, right) => {
            const bucketDelta = CONTRACT_BUCKET_ORDER[left.bucket] - CONTRACT_BUCKET_ORDER[right.bucket];
            if (bucketDelta !== 0) {
                return bucketDelta;
            }
            if (left.daysToExpiry !== right.daysToExpiry) {
                return left.daysToExpiry - right.daysToExpiry;
            }

            return right.endingInventoryValue - left.endingInventoryValue;
        })
        .slice(0, 100);
}

function buildSupplierDependencyRows(metrics: SnapshotMetric[], todayUtc: Date) {
    const supplierMap = new Map<string, SupplySupplierDependencyRow & { facilityIds: Set<string> }>();

    for (const metric of metrics.filter(item => item.demandAvg > 0)) {
        const supplierName = normalizeSupplierName(metric.tenCongTy);
        const currentSupplier = supplierMap.get(supplierName) ?? {
            supplierName,
            facilityCount: 0,
            activeDrugCount: 0,
            endingInventoryValue: 0,
            riskValue: 0,
            expiringContractCount: 0,
            expiredContractCount: 0,
            facilityIds: new Set<string>(),
        };

        currentSupplier.activeDrugCount += 1;
        currentSupplier.endingInventoryValue += metric.endingInventoryValue;
        currentSupplier.riskValue += toRiskValue(metric);
        currentSupplier.facilityIds.add(metric.facilityId);

        const endDate = parseContractDate(metric.ngayKetThucHd);
        if (endDate) {
            const daysToExpiry = getDaysToExpiry(endDate, todayUtc);
            if (daysToExpiry < 0) {
                currentSupplier.expiredContractCount += 1;
            } else if (daysToExpiry <= 90) {
                currentSupplier.expiringContractCount += 1;
            }
        }

        supplierMap.set(supplierName, currentSupplier);
    }

    return Array.from(supplierMap.values())
        .map(item => ({
            supplierName: item.supplierName,
            facilityCount: item.facilityIds.size,
            activeDrugCount: item.activeDrugCount,
            endingInventoryValue: roundTo(item.endingInventoryValue),
            riskValue: roundTo(item.riskValue),
            expiringContractCount: item.expiringContractCount,
            expiredContractCount: item.expiredContractCount,
        }))
        .sort((left, right) => {
            if (right.riskValue !== left.riskValue) {
                return right.riskValue - left.riskValue;
            }
            return right.endingInventoryValue - left.endingInventoryValue;
        })
        .slice(0, 20);
}

function buildDataCoverage(metrics: SnapshotMetric[], activeFacilityCount?: number): SupplyDataCoverage {
    return {
        activeFacilityCount: activeFacilityCount ?? new Set(metrics.map(metric => metric.facilityId)).size,
        reportingFacilityCount: new Set(metrics.map(metric => metric.facilityId)).size,
        snapshotRowCount: metrics.length,
        rowsWithPrice: metrics.filter(metric => metric.giaVat > 0).length,
        rowsWithContractInfo: metrics.filter(hasContractTriplet).length,
        rowsMappedMasterDrug: metrics.filter(metric => metric.isMappedMasterDrug).length,
        rowsWithDomesticClassification: metrics.filter(metric => Boolean(metric.isTrongNuoc)).length,
    };
}

export function buildSupplyInsights({
    metrics,
    scope,
    activeFacilityCount,
    today = new Date(),
}: BuildSupplyInsightsInput): SupplyInsightsData {
    const todayUtc = getTodayUtc(today);

    const topOverstockByValue = metrics
        .filter(metric => metric.endingInventoryValue > 0 && metric.monthsOfCover !== null && metric.monthsOfCover >= 3)
        .map(toValueRiskRow)
        .sort((left, right) => {
            if (right.endingInventoryValue !== left.endingInventoryValue) {
                return right.endingInventoryValue - left.endingInventoryValue;
            }
            return right.monthsOfCover - left.monthsOfCover;
        })
        .slice(0, 20);

    const topShortageByRiskValue = metrics
        .filter(metric => metric.demandAvg > 0 && metric.monthsOfCover !== null && metric.monthsOfCover < 1)
        .map(toValueRiskRow)
        .sort((left, right) => {
            if (right.riskValue !== left.riskValue) {
                return right.riskValue - left.riskValue;
            }
            return left.monthsOfCover - right.monthsOfCover;
        })
        .slice(0, 20);

    return {
        summaryMetrics: buildSummaryMetrics(metrics, todayUtc),
        topOverstockByValue,
        topShortageByRiskValue,
        contractRisk: buildContractRiskRows(metrics, todayUtc),
        supplierDependency: buildSupplierDependencyRows(metrics, todayUtc),
        dataCoverage: scope === "admin" ? buildDataCoverage(metrics, activeFacilityCount) : null,
    };
}
