import prisma from "@/lib/prisma";

export interface PublicDashboardKpis {
    activeFacilityCount: number;
    submittedFacilityCount: number;
    submissionRate: number;
    totalInventoryValue: number;
    totalExportValue: number;
    distinctMappedDrugCount: number;
    domesticExportRatio: number;
}

export interface PublicDashboardGroupBreakdown {
    name: string;
    inventoryValue: number;
    exportValue: number;
}

export interface PublicDashboardValueBreakdown {
    name: string;
    value: number;
}

export interface PublicDashboardTrendPoint {
    reportMonth: string;
    inventoryValue: number;
    exportValue: number;
    submittedFacilityCount: number;
    submissionRate: number;
}

export interface PublicDashboardResponse {
    reportPeriods: string[];
    selectedReportMonth: string | null;
    updatedAt: string | null;
    kpis: PublicDashboardKpis;
    groupValueBreakdown: PublicDashboardGroupBreakdown[];
    payerBreakdown: PublicDashboardValueBreakdown[];
    domesticBreakdown: PublicDashboardValueBreakdown[];
    trend: PublicDashboardTrendPoint[];
}

export class PublicDashboardError extends Error {
    status: number;

    constructor(status: number, message: string) {
        super(message);
        this.name = "PublicDashboardError";
        this.status = status;
    }
}

const EMPTY_KPIS: PublicDashboardKpis = {
    activeFacilityCount: 0,
    submittedFacilityCount: 0,
    submissionRate: 0,
    totalInventoryValue: 0,
    totalExportValue: 0,
    distinctMappedDrugCount: 0,
    domesticExportRatio: 0,
};

const normalizeFlag = (value: string | null | undefined) =>
    value
        ?.trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") || "";

export const isPositiveFlag = (value: string | null | undefined) => {
    const normalized = normalizeFlag(value);
    return normalized === "co" || normalized === "true" || normalized === "1" || normalized === "x" || normalized === "yes";
};

export const isDomesticDrug = (value: string | null | undefined) => {
    const normalized = normalizeFlag(value);
    return normalized === "trong nuoc" || normalized === "co" || normalized === "true" || normalized === "1";
};

const roundPercent = (value: number) => Math.round(value * 100) / 100;

const safeRatio = (part: number, total: number) => {
    if (!Number.isFinite(part) || !Number.isFinite(total) || total <= 0) {
        return 0;
    }

    return roundPercent((part / total) * 100);
};

const createEmptyResponse = (reportPeriods: string[], selectedReportMonth: string | null): PublicDashboardResponse => ({
    reportPeriods,
    selectedReportMonth,
    updatedAt: null,
    kpis: EMPTY_KPIS,
    groupValueBreakdown: [],
    payerBreakdown: [
        { name: "BHYT", value: 0 },
        { name: "Dịch vụ", value: 0 },
        { name: "Khác", value: 0 },
    ],
    domesticBreakdown: [
        { name: "Trong nước", value: 0 },
        { name: "Khác/Chưa rõ", value: 0 },
    ],
    trend: [],
});

function buildTopGroups(groupMap: Map<string, PublicDashboardGroupBreakdown>) {
    const sortedGroups = Array.from(groupMap.values())
        .filter((item) => item.inventoryValue > 0 || item.exportValue > 0)
        .sort((a, b) => b.inventoryValue - a.inventoryValue);

    const topGroups = sortedGroups.slice(0, 10);
    const remainingGroups = sortedGroups.slice(10);

    if (remainingGroups.length === 0) {
        return topGroups;
    }

    const other = remainingGroups.reduce<PublicDashboardGroupBreakdown>(
        (acc, item) => ({
            name: acc.name,
            inventoryValue: acc.inventoryValue + item.inventoryValue,
            exportValue: acc.exportValue + item.exportValue,
        }),
        { name: "Khác", inventoryValue: 0, exportValue: 0 }
    );

    return [...topGroups, other];
}

function getLatestDate(...dates: Array<Date | null | undefined>) {
    const timestamps = dates
        .map((date) => date?.getTime())
        .filter((timestamp): timestamp is number => Number.isFinite(timestamp));

    if (timestamps.length === 0) {
        return null;
    }

    return new Date(Math.max(...timestamps)).toISOString();
}

export async function getPublicDashboardData(reportMonth?: string): Promise<PublicDashboardResponse> {
    const periods = await prisma.reportPeriod.findMany({
        orderBy: [
            { year: "desc" },
            { periodMonth: "desc" },
        ],
        select: {
            month: true,
            updatedAt: true,
        },
    });

    const reportPeriods = periods.map((period) => period.month);
    const selectedReportMonth = reportMonth?.trim() || reportPeriods[0] || null;

    if (!selectedReportMonth) {
        return createEmptyResponse(reportPeriods, null);
    }

    if (!reportPeriods.includes(selectedReportMonth)) {
        throw new PublicDashboardError(400, "Kỳ báo cáo không tồn tại");
    }

    const trendMonths = reportPeriods.slice(0, 12).reverse();

    const [
        activeFacilityCount,
        submissions,
        reports,
        trendReports,
        trendSubmissions,
        latestReport,
        latestSubmission,
    ] = await Promise.all([
        prisma.user.count({
            where: {
                role: "FACILITY",
                isActive: true,
            },
        }),
        prisma.facilityReportSubmission.findMany({
            where: {
                reportMonth: selectedReportMonth,
            },
            select: {
                facilityId: true,
            },
            distinct: ["facilityId"],
        }),
        prisma.inventoryReport.findMany({
            where: {
                reportMonth: selectedReportMonth,
            },
            select: {
                mapId: true,
                xuat: true,
                giaVat: true,
                thanhTienTonCuoi: true,
                bhyt: true,
                dichVu: true,
                drugMap: {
                    select: {
                        masterDrug: {
                            select: {
                                nhomThuoc: true,
                                isTrongNuoc: true,
                            },
                        },
                    },
                },
            },
        }),
        prisma.inventoryReport.findMany({
            where: {
                reportMonth: {
                    in: trendMonths,
                },
            },
            select: {
                reportMonth: true,
                xuat: true,
                giaVat: true,
                thanhTienTonCuoi: true,
            },
        }),
        prisma.facilityReportSubmission.findMany({
            where: {
                reportMonth: {
                    in: trendMonths,
                },
            },
            select: {
                reportMonth: true,
                facilityId: true,
            },
            distinct: ["reportMonth", "facilityId"],
        }),
        prisma.inventoryReport.findFirst({
            where: {
                reportMonth: selectedReportMonth,
            },
            select: {
                updatedAt: true,
            },
            orderBy: {
                updatedAt: "desc",
            },
        }),
        prisma.facilityReportSubmission.findFirst({
            where: {
                reportMonth: selectedReportMonth,
            },
            select: {
                updatedAt: true,
            },
            orderBy: {
                updatedAt: "desc",
            },
        }),
    ]);

    const submittedFacilityCount = submissions.length;
    const groupMap = new Map<string, PublicDashboardGroupBreakdown>();
    const distinctMapIds = new Set<string>();
    let totalInventoryValue = 0;
    let totalExportValue = 0;
    let domesticExportValue = 0;
    let bhytValue = 0;
    let dichVuValue = 0;

    reports.forEach((report) => {
        const inventoryValue = Number(report.thanhTienTonCuoi || 0);
        const exportValue = Number(report.xuat || 0) * Number(report.giaVat || 0);
        const drugGroup = report.drugMap?.masterDrug?.nhomThuoc?.trim() || "Khác/Chưa phân nhóm";

        totalInventoryValue += inventoryValue;
        totalExportValue += exportValue;
        distinctMapIds.add(report.mapId);

        if (isDomesticDrug(report.drugMap?.masterDrug?.isTrongNuoc)) {
            domesticExportValue += exportValue;
        }

        if (isPositiveFlag(report.bhyt)) {
            bhytValue += exportValue;
        } else if (isPositiveFlag(report.dichVu)) {
            dichVuValue += exportValue;
        }

        const currentGroup = groupMap.get(drugGroup) || {
            name: drugGroup,
            inventoryValue: 0,
            exportValue: 0,
        };

        groupMap.set(drugGroup, {
            ...currentGroup,
            inventoryValue: currentGroup.inventoryValue + inventoryValue,
            exportValue: currentGroup.exportValue + exportValue,
        });
    });

    const trendValueMap = new Map<string, { inventoryValue: number; exportValue: number }>();
    const trendSubmissionMap = new Map<string, Set<string>>();

    trendMonths.forEach((month) => {
        trendValueMap.set(month, { inventoryValue: 0, exportValue: 0 });
        trendSubmissionMap.set(month, new Set());
    });

    trendReports.forEach((report) => {
        const current = trendValueMap.get(report.reportMonth);
        if (!current) {
            return;
        }

        current.inventoryValue += Number(report.thanhTienTonCuoi || 0);
        current.exportValue += Number(report.xuat || 0) * Number(report.giaVat || 0);
    });

    trendSubmissions.forEach((submission) => {
        trendSubmissionMap.get(submission.reportMonth)?.add(submission.facilityId);
    });

    const trend = trendMonths.map((month) => {
        const values = trendValueMap.get(month) || { inventoryValue: 0, exportValue: 0 };
        const monthSubmittedFacilityCount = trendSubmissionMap.get(month)?.size || 0;

        return {
            reportMonth: month,
            inventoryValue: Math.round(values.inventoryValue),
            exportValue: Math.round(values.exportValue),
            submittedFacilityCount: monthSubmittedFacilityCount,
            submissionRate: safeRatio(monthSubmittedFacilityCount, activeFacilityCount),
        };
    });

    const otherPayerValue = Math.max(totalExportValue - bhytValue - dichVuValue, 0);
    const selectedPeriodUpdatedAt = periods.find((period) => period.month === selectedReportMonth)?.updatedAt;

    return {
        reportPeriods,
        selectedReportMonth,
        updatedAt: getLatestDate(selectedPeriodUpdatedAt, latestReport?.updatedAt, latestSubmission?.updatedAt),
        kpis: {
            activeFacilityCount,
            submittedFacilityCount,
            submissionRate: safeRatio(submittedFacilityCount, activeFacilityCount),
            totalInventoryValue: Math.round(totalInventoryValue),
            totalExportValue: Math.round(totalExportValue),
            distinctMappedDrugCount: distinctMapIds.size,
            domesticExportRatio: safeRatio(domesticExportValue, totalExportValue),
        },
        groupValueBreakdown: buildTopGroups(groupMap).map((item) => ({
            ...item,
            inventoryValue: Math.round(item.inventoryValue),
            exportValue: Math.round(item.exportValue),
        })),
        payerBreakdown: [
            { name: "BHYT", value: Math.round(bhytValue) },
            { name: "Dịch vụ", value: Math.round(dichVuValue) },
            { name: "Khác", value: Math.round(otherPayerValue) },
        ],
        domesticBreakdown: [
            { name: "Trong nước", value: Math.round(domesticExportValue) },
            { name: "Khác/Chưa rõ", value: Math.round(Math.max(totalExportValue - domesticExportValue, 0)) },
        ],
        trend,
    };
}
