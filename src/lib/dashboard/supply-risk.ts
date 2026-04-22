export type DemandWindow = 1 | 3 | 6;

export type SupplySeverity = "danger" | "warning" | "watch";

export type ScatterSeverity = SupplySeverity | "safe";

type NumericLike = number | string | { toString(): string } | null | undefined;

export interface RawSupplyReport {
    facilityId: string;
    mapId: string;
    reportMonth: string;
    tonCuoi: NumericLike;
    xuat: NumericLike;
    giaVat?: NumericLike;
    thanhTienTonCuoi?: NumericLike;
    soQdTrungThau?: string | null;
    tenCongTy?: string | null;
    ngayBatDauHd?: string | null;
    ngayKetThucHd?: string | null;
    bhyt?: string | null;
    dichVu?: string | null;
    drugMap?: {
        tenThuocNoiBo?: string | null;
        hoatChatNoiBo?: string | null;
        masterDrug?: {
            tenThuoc?: string | null;
            hoatChat?: string | null;
            hamLuong?: string | null;
            isTrongNuoc?: string | null;
        } | null;
    } | null;
    facility?: {
        facilityName?: string | null;
    } | null;
}

export interface SupplyReportRow {
    facilityId: string;
    facility: string;
    mapId: string;
    reportMonth: string;
    tonCuoi: number;
    xuat: number;
    drugName: string;
    hoatChat: string;
    hamLuong: string;
    giaVat: number;
    thanhTienTonCuoi: number;
    soQdTrungThau: string;
    tenCongTy: string;
    ngayBatDauHd: string;
    ngayKetThucHd: string;
    bhyt: string;
    dichVu: string;
    isMappedMasterDrug: boolean;
    isTrongNuoc: string;
}

export interface StockoutActualRow {
    facility: string;
    drugName: string;
    hoatChat: string;
    hamLuong: string;
    tonCuoi: number;
    xuat: number;
    currentXuat: number;
    demandAvg: number;
}

export interface StockoutForecastRow {
    facility: string;
    drugName: string;
    hoatChat: string;
    hamLuong: string;
    tonCuoi: number;
    currentTonCuoi: number;
    currentXuat: number;
    demandAvg: number;
    monthsOfCover: number;
    severity: SupplySeverity;
}

export interface ScatterPoint {
    facility: string;
    drugName: string;
    hoatChat: string;
    hamLuong: string;
    tonCuoi: number;
    currentXuat: number;
    demandAvg: number;
    monthsOfCover: number;
    severity: ScatterSeverity;
}

export interface DeadStockRow {
    facility: string;
    drugName: string;
    hoatChat: string;
    hamLuong: string;
    tonCuoi: number;
    currentXuat: number;
}

export interface TransferFacilityRow {
    facility: string;
    tonCuoi: number;
    currentXuat: number;
    demandAvg: number;
    monthsOfCover: number;
}

export interface SupplyTransferData {
    surplus: TransferFacilityRow[];
    shortage: TransferFacilityRow[];
}

export interface SupplyDashboardData {
    effectiveReportMonth: string | null;
    demandWindow: DemandWindow;
    stockoutActual: StockoutActualRow[];
    stockoutForecast: StockoutForecastRow[];
    stockoutRisk: StockoutActualRow[];
    scatterData: ScatterPoint[];
    deadStockData: DeadStockRow[];
    transferData: SupplyTransferData | null;
}

export interface SnapshotMetric {
    facilityId: string;
    facility: string;
    mapId: string;
    reportMonth: string;
    drugName: string;
    hoatChat: string;
    hamLuong: string;
    currentTonCuoi: number;
    currentXuat: number;
    demandAvg: number;
    monthsOfCover: number | null;
    giaVat: number;
    endingInventoryValue: number;
    exportValue: number;
    soQdTrungThau: string;
    tenCongTy: string;
    ngayBatDauHd: string;
    ngayKetThucHd: string;
    bhyt: string;
    dichVu: string;
    isMappedMasterDrug: boolean;
    isTrongNuoc: string;
}

interface BuildSupplyDashboardDataInput {
    reports: SupplyReportRow[];
    selectedReportMonth?: string;
    demandWindow: DemandWindow;
    hoatChat?: string;
}

const REPORT_MONTH_PATTERN = /^(\d{2})\/(\d{4})$/;

const FORECAST_SEVERITY_ORDER: Record<SupplySeverity, number> = {
    danger: 0,
    warning: 1,
    watch: 2,
};

function toNumber(value: NumericLike) {
    return Number(value ?? 0);
}

export function roundTo(value: number, digits = 2) {
    const factor = 10 ** digits;
    return Math.round(value * factor) / factor;
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

function isAtOrBefore(reportMonth: string, effectiveMonthValue: number | null) {
    if (effectiveMonthValue === null) {
        return true;
    }

    const reportMonthValue = parseReportMonth(reportMonth);
    if (reportMonthValue === null) {
        return false;
    }

    return reportMonthValue <= effectiveMonthValue;
}

export function resolveEffectiveReportMonth(reports: SupplyReportRow[], selectedReportMonth?: string) {
    if (selectedReportMonth) {
        return selectedReportMonth;
    }

    const uniqueMonths = Array.from(new Set(reports.map(report => report.reportMonth)));
    uniqueMonths.sort(compareReportMonthsDesc);

    return uniqueMonths[0] ?? null;
}

export function buildSnapshotMetrics(
    reports: SupplyReportRow[],
    effectiveReportMonth: string | null,
    demandWindow: DemandWindow
): SnapshotMetric[] {
    if (!effectiveReportMonth) {
        return [];
    }

    const reportsByGroup = new Map<string, SupplyReportRow[]>();
    for (const report of reports) {
        const groupKey = `${report.facilityId}:${report.mapId}`;
        const currentReports = reportsByGroup.get(groupKey) ?? [];
        currentReports.push(report);
        reportsByGroup.set(groupKey, currentReports);
    }

    for (const groupedReports of reportsByGroup.values()) {
        groupedReports.sort((left, right) => compareReportMonthsDesc(left.reportMonth, right.reportMonth));
    }

    const effectiveMonthValue = parseReportMonth(effectiveReportMonth);
    const snapshotReports = reports.filter(report => report.reportMonth === effectiveReportMonth);

    return snapshotReports.map(report => {
        const groupKey = `${report.facilityId}:${report.mapId}`;
        const historyReports = (reportsByGroup.get(groupKey) ?? [])
            .filter(historyReport => isAtOrBefore(historyReport.reportMonth, effectiveMonthValue))
            .slice(0, demandWindow);

        const demandAvg = historyReports.length > 0
            ? roundTo(historyReports.reduce((sum, historyReport) => sum + historyReport.xuat, 0) / historyReports.length)
            : 0;
        const monthsOfCover = demandAvg > 0 ? roundTo(report.tonCuoi / demandAvg) : null;

        return {
            facilityId: report.facilityId,
            facility: report.facility,
            mapId: report.mapId,
            reportMonth: report.reportMonth,
            drugName: report.drugName,
            hoatChat: report.hoatChat,
            hamLuong: report.hamLuong,
            currentTonCuoi: report.tonCuoi,
            currentXuat: report.xuat,
            demandAvg,
            monthsOfCover,
            giaVat: report.giaVat,
            endingInventoryValue: report.thanhTienTonCuoi,
            exportValue: roundTo(report.xuat * report.giaVat),
            soQdTrungThau: report.soQdTrungThau,
            tenCongTy: report.tenCongTy,
            ngayBatDauHd: report.ngayBatDauHd,
            ngayKetThucHd: report.ngayKetThucHd,
            bhyt: report.bhyt,
            dichVu: report.dichVu,
            isMappedMasterDrug: report.isMappedMasterDrug,
            isTrongNuoc: report.isTrongNuoc,
        };
    });
}

function toSeverity(monthsOfCover: number): SupplySeverity {
    if (monthsOfCover < 1) {
        return "danger";
    }
    if (monthsOfCover < 2) {
        return "warning";
    }

    return "watch";
}

function toScatterSeverity(monthsOfCover: number): ScatterSeverity {
    if (monthsOfCover < 1) {
        return "danger";
    }
    if (monthsOfCover < 2) {
        return "warning";
    }
    if (monthsOfCover < 3) {
        return "watch";
    }

    return "safe";
}

function matchesHoatChat(metric: SnapshotMetric, hoatChat: string) {
    const normalizedFilter = hoatChat.trim().toLowerCase();
    if (!normalizedFilter) {
        return false;
    }

    return metric.hoatChat.toLowerCase().includes(normalizedFilter);
}

function buildTransferData(metrics: SnapshotMetric[], hoatChat?: string) {
    if (!hoatChat?.trim()) {
        return null;
    }

    const facilityMetrics = new Map<string, TransferFacilityRow>();
    for (const metric of metrics.filter(item => matchesHoatChat(item, hoatChat))) {
        const currentFacility = facilityMetrics.get(metric.facilityId) ?? {
            facility: metric.facility,
            tonCuoi: 0,
            currentXuat: 0,
            demandAvg: 0,
            monthsOfCover: 0,
        };

        currentFacility.tonCuoi += metric.currentTonCuoi;
        currentFacility.currentXuat += metric.currentXuat;
        currentFacility.demandAvg += metric.demandAvg;
        facilityMetrics.set(metric.facilityId, currentFacility);
    }

    const aggregatedMetrics = Array.from(facilityMetrics.values()).map(metric => ({
        ...metric,
        tonCuoi: roundTo(metric.tonCuoi),
        currentXuat: roundTo(metric.currentXuat),
        demandAvg: roundTo(metric.demandAvg),
        monthsOfCover: metric.demandAvg > 0 ? roundTo(metric.tonCuoi / metric.demandAvg) : 0,
    }));

    const surplus = aggregatedMetrics
        .filter(metric => metric.tonCuoi > 0 && metric.demandAvg > 0 && metric.monthsOfCover > 3)
        .sort((left, right) => right.monthsOfCover - left.monthsOfCover);

    const shortage = aggregatedMetrics
        .filter(metric => metric.tonCuoi === 0 && metric.demandAvg > 0)
        .sort((left, right) => right.demandAvg - left.demandAvg);

    return { surplus, shortage };
}

export function normalizeDemandWindow(value: string | null | undefined): DemandWindow {
    if (value === "1") {
        return 1;
    }
    if (value === "6") {
        return 6;
    }

    return 3;
}

export function normalizeSupplyReportRow(report: RawSupplyReport): SupplyReportRow {
    return {
        facilityId: report.facilityId,
        facility: report.facility?.facilityName || "Unknown",
        mapId: report.mapId,
        reportMonth: report.reportMonth,
        tonCuoi: toNumber(report.tonCuoi),
        xuat: toNumber(report.xuat),
        drugName: report.drugMap?.masterDrug?.tenThuoc || report.drugMap?.tenThuocNoiBo || "N/A",
        hoatChat: report.drugMap?.masterDrug?.hoatChat || report.drugMap?.hoatChatNoiBo || "N/A",
        hamLuong: report.drugMap?.masterDrug?.hamLuong || "",
        giaVat: toNumber(report.giaVat),
        thanhTienTonCuoi: toNumber(report.thanhTienTonCuoi),
        soQdTrungThau: report.soQdTrungThau?.trim() || "",
        tenCongTy: report.tenCongTy?.trim() || "",
        ngayBatDauHd: report.ngayBatDauHd?.trim() || "",
        ngayKetThucHd: report.ngayKetThucHd?.trim() || "",
        bhyt: report.bhyt?.trim() || "",
        dichVu: report.dichVu?.trim() || "",
        isMappedMasterDrug: Boolean(report.drugMap?.masterDrug),
        isTrongNuoc: report.drugMap?.masterDrug?.isTrongNuoc?.trim() || "",
    };
}

export function buildSupplyDashboardDataFromMetrics({
    metrics,
    effectiveReportMonth,
    demandWindow,
    hoatChat,
}: {
    metrics: SnapshotMetric[];
    effectiveReportMonth: string | null;
    demandWindow: DemandWindow;
    hoatChat?: string;
}): SupplyDashboardData {
    const stockoutActual = metrics
        .filter(metric => metric.currentTonCuoi === 0 && metric.demandAvg > 0)
        .map(metric => ({
            facility: metric.facility,
            drugName: metric.drugName,
            hoatChat: metric.hoatChat,
            hamLuong: metric.hamLuong,
            tonCuoi: 0,
            xuat: metric.currentXuat,
            currentXuat: metric.currentXuat,
            demandAvg: metric.demandAvg,
        }))
        .sort((left, right) => {
            if (right.demandAvg !== left.demandAvg) {
                return right.demandAvg - left.demandAvg;
            }

            return right.currentXuat - left.currentXuat;
        })
        .slice(0, 100);

    const stockoutForecast = metrics
        .filter(metric => metric.currentTonCuoi > 0 && metric.demandAvg > 0 && metric.monthsOfCover !== null && metric.monthsOfCover < 3)
        .map(metric => ({
            facility: metric.facility,
            drugName: metric.drugName,
            hoatChat: metric.hoatChat,
            hamLuong: metric.hamLuong,
            tonCuoi: metric.currentTonCuoi,
            currentTonCuoi: metric.currentTonCuoi,
            currentXuat: metric.currentXuat,
            demandAvg: metric.demandAvg,
            monthsOfCover: metric.monthsOfCover ?? 0,
            severity: toSeverity(metric.monthsOfCover ?? 0),
        }))
        .sort((left, right) => {
            const severityDelta = FORECAST_SEVERITY_ORDER[left.severity] - FORECAST_SEVERITY_ORDER[right.severity];
            if (severityDelta !== 0) {
                return severityDelta;
            }
            if (left.monthsOfCover !== right.monthsOfCover) {
                return left.monthsOfCover - right.monthsOfCover;
            }

            return right.demandAvg - left.demandAvg;
        })
        .slice(0, 100);

    const scatterData = metrics
        .filter(metric => metric.demandAvg > 0 && metric.monthsOfCover !== null)
        .map(metric => ({
            facility: metric.facility,
            drugName: metric.drugName,
            hoatChat: metric.hoatChat,
            hamLuong: metric.hamLuong,
            tonCuoi: metric.currentTonCuoi,
            currentXuat: metric.currentXuat,
            demandAvg: metric.demandAvg,
            monthsOfCover: metric.monthsOfCover ?? 0,
            severity: toScatterSeverity(metric.monthsOfCover ?? 0),
        }))
        .sort((left, right) => {
            if (right.demandAvg !== left.demandAvg) {
                return right.demandAvg - left.demandAvg;
            }

            return right.tonCuoi - left.tonCuoi;
        })
        .slice(0, 500);

    const deadStockData = metrics
        .filter(metric => metric.currentTonCuoi > 0 && metric.demandAvg === 0)
        .map(metric => ({
            facility: metric.facility,
            drugName: metric.drugName,
            hoatChat: metric.hoatChat,
            hamLuong: metric.hamLuong,
            tonCuoi: metric.currentTonCuoi,
            currentXuat: metric.currentXuat,
        }))
        .sort((left, right) => right.tonCuoi - left.tonCuoi)
        .slice(0, 50);

    return {
        effectiveReportMonth,
        demandWindow,
        stockoutActual,
        stockoutForecast,
        stockoutRisk: stockoutActual,
        scatterData,
        deadStockData,
        transferData: buildTransferData(metrics, hoatChat),
    };
}

export function buildSupplyDashboardData({
    reports,
    selectedReportMonth,
    demandWindow,
    hoatChat,
}: BuildSupplyDashboardDataInput): SupplyDashboardData {
    const effectiveReportMonth = resolveEffectiveReportMonth(reports, selectedReportMonth);
    const metrics = buildSnapshotMetrics(reports, effectiveReportMonth, demandWindow);

    return buildSupplyDashboardDataFromMetrics({
        metrics,
        effectiveReportMonth,
        demandWindow,
        hoatChat,
    });
}
