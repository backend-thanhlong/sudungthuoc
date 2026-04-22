import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { logActivity, ACTIONS, ENTITY_TYPES } from "@/lib/activity-log";
import { listReportMonthSummaries, listSubmittedFacilityIdsForMonth } from "@/lib/report-submissions";

/**
 * GET /api/admin/reports
 * Returns consolidated list of reports (grouped by facility+month).
 * When ?month=MM/YYYY is provided, also returns which facilities have NOT submitted yet.
 */
export async function GET(request: Request) {
    try {
        const session = await auth();
        if (!session || session.user.role !== "ADMIN") {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const filterMonth = searchParams.get("month");

        const reportSummaries = await listReportMonthSummaries(
            filterMonth ? { month: filterMonth } : {}
        );

        const facilities = await prisma.user.findMany({
            where: { role: 'FACILITY' },
            select: { id: true, facilityName: true, username: true }
        });
        const facilityMap = new Map<string, string>();
        facilities.forEach(f => facilityMap.set(f.id, f.facilityName || f.username));

        const consolidatedReports = reportSummaries.map((summary) => ({
            id: summary.id,
            facilityId: summary.facilityId,
            facilityName: facilityMap.get(summary.facilityId) || 'Unknown Facility',
            month: summary.month,
            drugCount: summary.drugCount,
            totalImport: summary.totalImport,
            totalExport: summary.totalExport,
            lastUpdated: summary.lastUpdated,
            status: summary.status,
            skippedRowCount: summary.skippedRowCount,
        }));

        const summary = {
            totalReports: consolidatedReports.length,
            uniqueFacilities: new Set(consolidatedReports.map(r => r.facilityId)).size,
            totalImport: consolidatedReports.reduce((acc, curr) => acc + (Number(curr.totalImport) || 0), 0),
            totalExport: consolidatedReports.reduce((acc, curr) => acc + (Number(curr.totalExport) || 0), 0),
        };

        let notSubmitted: { id: string; facilityName: string }[] = [];
        if (filterMonth) {
            const submittedIds = await listSubmittedFacilityIdsForMonth(filterMonth);
            notSubmitted = facilities.filter(f => !submittedIds.has(f.id)).map(f => ({ id: f.id, facilityName: f.facilityName || f.username }));
        }

        return NextResponse.json({ reports: consolidatedReports, summary, notSubmitted });

    } catch (error) {
        console.error("Error fetching admin reports:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}

/**
 * DELETE /api/admin/reports
 * Deletes all InventoryReport rows for one or multiple facility+month combinations.
 * Body variants:
 *   Single: { facilityId, month }
 *   Bulk:   { items: [{facilityId, month}][] }
 */
export async function DELETE(request: Request) {
    try {
        const session = await auth();
        if (!session || session.user.role !== "ADMIN") {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();

        type DeleteItem = { facilityId: string; month: string };
        let items: DeleteItem[] = [];

        if (body.items && Array.isArray(body.items)) {
            items = body.items;
        } else if (body.facilityId && body.month) {
            items = [{ facilityId: body.facilityId, month: body.month }];
        } else {
            return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
        }

        let totalDeleted = 0;

        for (const { facilityId, month } of items) {
            const [reportDeleteResult] = await prisma.$transaction([
                prisma.inventoryReport.deleteMany({
                    where: { facilityId, reportMonth: month },
                }),
                prisma.facilityReportSubmission.deleteMany({
                    where: { facilityId, reportMonth: month },
                }),
                (prisma as any).reportReviewLog.deleteMany({
                    where: { facilityId, reportMonth: month },
                }),
            ]);
            totalDeleted += reportDeleteResult.count;

            logActivity({
                userId: session.user.id,
                action: ACTIONS.DELETE,
                entityType: ENTITY_TYPES.REPORT,
                entityId: facilityId,
                details: { month, deletedRows: reportDeleteResult.count },
            });
        }

        return NextResponse.json({
            message: `Đã xóa ${items.length} báo cáo (${totalDeleted} dòng dữ liệu)`,
            count: items.length,
            deletedRows: totalDeleted,
        });

    } catch (error) {
        console.error("Error deleting reports:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}
