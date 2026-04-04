import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { logActivity, ACTIONS, ENTITY_TYPES } from "@/lib/activity-log";

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

        const reportGroups = await prisma.inventoryReport.groupBy({
            by: ['facilityId', 'reportMonth'],
            _count: { mapId: true },
            _max: { updatedAt: true },
            orderBy: { reportMonth: 'desc' }
        });

        const facilities = await prisma.user.findMany({
            where: { role: 'FACILITY' },
            select: { id: true, facilityName: true, username: true }
        });
        const facilityMap = new Map<string, string>();
        facilities.forEach(f => facilityMap.set(f.id, f.facilityName || f.username));

        // Fetch all rows needed to compute monetary values (nhap*giaVat, xuat*giaVat)
        const allRows = await prisma.inventoryReport.findMany({
            where: reportGroups.length > 0
                ? { OR: reportGroups.map(g => ({ facilityId: g.facilityId, reportMonth: g.reportMonth })) }
                : { id: 'none' },
            select: { facilityId: true, reportMonth: true, nhap: true, xuat: true, giaVat: true, status: true, adminNote: true },
        });

        // Group rows by facilityId+reportMonth key
        type GroupAcc = { totalImportValue: number; totalExportValue: number; status: string; adminNote: string | null };
        const groupMap = new Map<string, GroupAcc>();
        for (const row of allRows) {
            const key = `${row.facilityId}-${row.reportMonth}`;
            const nhap = Number(row.nhap) || 0;
            const xuat = Number(row.xuat) || 0;
            const giaVat = Number(row.giaVat) || 0;
            if (!groupMap.has(key)) {
                groupMap.set(key, { totalImportValue: 0, totalExportValue: 0, status: row.status, adminNote: row.adminNote ?? null });
            }
            const acc = groupMap.get(key)!;
            acc.totalImportValue += nhap * giaVat;
            acc.totalExportValue += xuat * giaVat;
            // Keep last non-PENDING status as representative
            if (row.status !== 'PENDING') acc.status = row.status;
            if (row.adminNote) acc.adminNote = row.adminNote;
        }

        const consolidatedReports = reportGroups.map(group => {
            const key = `${group.facilityId}-${group.reportMonth}`;
            const acc = groupMap.get(key);
            return {
                id: key,
                facilityId: group.facilityId,
                facilityName: facilityMap.get(group.facilityId) || 'Unknown Facility',
                month: group.reportMonth,
                drugCount: group._count.mapId,
                totalImport: acc?.totalImportValue ?? 0,
                totalExport: acc?.totalExportValue ?? 0,
                lastUpdated: group._max.updatedAt,
                status: acc?.status || 'PENDING',
                adminNote: acc?.adminNote,
            };
        });

        const summary = {
            totalReports: consolidatedReports.length,
            uniqueFacilities: new Set(consolidatedReports.map(r => r.facilityId)).size,
            totalImport: consolidatedReports.reduce((acc, curr) => acc + (Number(curr.totalImport) || 0), 0),
            totalExport: consolidatedReports.reduce((acc, curr) => acc + (Number(curr.totalExport) || 0), 0),
        };

        let notSubmitted: { id: string; facilityName: string }[] = [];
        if (filterMonth) {
            const submittedIds = new Set(consolidatedReports.filter(r => r.month === filterMonth).map(r => r.facilityId));
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
            const result = await prisma.inventoryReport.deleteMany({
                where: { facilityId, reportMonth: month },
            });
            totalDeleted += result.count;

            logActivity({
                userId: session.user.id,
                action: ACTIONS.DELETE,
                entityType: ENTITY_TYPES.REPORT,
                entityId: facilityId,
                details: { month, deletedRows: result.count },
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
