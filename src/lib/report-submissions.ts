import prisma from "@/lib/prisma";

export const REPORT_SUBMITTED_STATUS = "SUBMITTED" as const;

export interface ReportMonthSummary {
    id: string;
    facilityId: string;
    month: string;
    drugCount: number;
    reportedRowCount: number;
    skippedRowCount: number;
    totalImport: number;
    totalExport: number;
    lastUpdated: Date | null;
    status: typeof REPORT_SUBMITTED_STATUS;
    isLegacy: boolean;
}

type ReportSummaryFilter = {
    facilityId?: string;
    month?: string;
};

const getReportMonthSortValue = (reportMonth: string) => {
    if (!/^\d{2}\/\d{4}$/.test(reportMonth)) return 0;
    const [month, year] = reportMonth.split("/").map(Number);
    return year * 100 + month;
};

const buildSummaryKey = (facilityId: string, reportMonth: string) => `${facilityId}___${reportMonth}`;

const buildInventoryReportWhere = (filter: ReportSummaryFilter) => ({
    ...(filter.facilityId ? { facilityId: filter.facilityId } : {}),
    ...(filter.month ? { reportMonth: filter.month } : {}),
});

const buildSubmissionWhere = (filter: ReportSummaryFilter) => ({
    ...(filter.facilityId ? { facilityId: filter.facilityId } : {}),
    ...(filter.month ? { reportMonth: filter.month } : {}),
});

export async function hasExistingFacilityReportMonth(facilityId: string, reportMonth: string) {
    const [submission, row] = await Promise.all([
        prisma.facilityReportSubmission.findUnique({
            where: {
                facilityId_reportMonth: {
                    facilityId,
                    reportMonth,
                },
            },
            select: { id: true },
        }),
        prisma.inventoryReport.findFirst({
            where: { facilityId, reportMonth },
            select: { id: true },
        }),
    ]);

    return Boolean(submission || row);
}

export async function listSubmittedFacilityIdsForMonth(reportMonth: string) {
    const [submissions, legacyRows] = await Promise.all([
        prisma.facilityReportSubmission.findMany({
            where: { reportMonth },
            select: { facilityId: true },
        }),
        prisma.inventoryReport.findMany({
            where: { reportMonth },
            select: { facilityId: true },
            distinct: ["facilityId"],
        }),
    ]);

    return new Set([
        ...submissions.map((submission) => submission.facilityId),
        ...legacyRows.map((row) => row.facilityId),
    ]);
}

export async function listReportMonthSummaries(filter: ReportSummaryFilter = {}): Promise<ReportMonthSummary[]> {
    const inventoryReportWhere = buildInventoryReportWhere(filter);
    const submissionWhere = buildSubmissionWhere(filter);

    const [submissions, reportGroups, allRows] = await Promise.all([
        prisma.facilityReportSubmission.findMany({
            where: submissionWhere,
            orderBy: [
                { reportMonth: "desc" },
                { submittedAt: "desc" },
            ],
        }),
        prisma.inventoryReport.groupBy({
            by: ["facilityId", "reportMonth"],
            where: inventoryReportWhere,
            _count: { id: true },
            _max: { updatedAt: true },
            orderBy: [
                { reportMonth: "desc" },
                { facilityId: "asc" },
            ],
        }),
        prisma.inventoryReport.findMany({
            where: inventoryReportWhere,
            select: {
                facilityId: true,
                reportMonth: true,
                nhap: true,
                xuat: true,
                giaVat: true,
            },
        }),
    ]);

    type Totals = {
        totalImport: number;
        totalExport: number;
    };

    const totalsByKey = new Map<string, Totals>();
    for (const row of allRows) {
        const key = buildSummaryKey(row.facilityId, row.reportMonth);
        const current = totalsByKey.get(key) || { totalImport: 0, totalExport: 0 };
        const nhap = Number(row.nhap) || 0;
        const xuat = Number(row.xuat) || 0;
        const giaVat = Number(row.giaVat) || 0;

        current.totalImport += nhap * giaVat;
        current.totalExport += xuat * giaVat;
        totalsByKey.set(key, current);
    }

    const submissionKeySet = new Set(
        submissions.map((submission) => buildSummaryKey(submission.facilityId, submission.reportMonth))
    );

    const summaries: ReportMonthSummary[] = submissions.map((submission) => {
        const key = buildSummaryKey(submission.facilityId, submission.reportMonth);
        const totals = totalsByKey.get(key);

        return {
            id: key,
            facilityId: submission.facilityId,
            month: submission.reportMonth,
            drugCount: submission.reportedRowCount,
            reportedRowCount: submission.reportedRowCount,
            skippedRowCount: submission.skippedRowCount,
            totalImport: totals?.totalImport ?? 0,
            totalExport: totals?.totalExport ?? 0,
            lastUpdated: submission.updatedAt ?? submission.submittedAt,
            status: REPORT_SUBMITTED_STATUS,
            isLegacy: false,
        };
    });

    reportGroups.forEach((group) => {
        const key = buildSummaryKey(group.facilityId, group.reportMonth);
        if (submissionKeySet.has(key)) return;

        const totals = totalsByKey.get(key);
        summaries.push({
            id: key,
            facilityId: group.facilityId,
            month: group.reportMonth,
            drugCount: group._count.id,
            reportedRowCount: group._count.id,
            skippedRowCount: 0,
            totalImport: totals?.totalImport ?? 0,
            totalExport: totals?.totalExport ?? 0,
            lastUpdated: group._max.updatedAt,
            status: REPORT_SUBMITTED_STATUS,
            isLegacy: true,
        });
    });

    return summaries.sort((left, right) => {
        const monthDiff = getReportMonthSortValue(right.month) - getReportMonthSortValue(left.month);
        if (monthDiff !== 0) return monthDiff;

        if ((right.lastUpdated?.getTime() || 0) !== (left.lastUpdated?.getTime() || 0)) {
            return (right.lastUpdated?.getTime() || 0) - (left.lastUpdated?.getTime() || 0);
        }

        return left.facilityId.localeCompare(right.facilityId);
    });
}
