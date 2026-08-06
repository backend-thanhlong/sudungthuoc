import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { ACTIONS, ENTITY_TYPES, logActivity } from "@/lib/activity-log";
import { isRouteError, requireActiveSessionUser } from "@/lib/server-authz";
import { getSystemMaintenanceState } from "@/lib/system-maintenance";

const RESET_CONFIRMATION = "XOA DU LIEU XNT";

async function getResetCounts() {
    const [
        reportReviewLogs,
        reportSubmissions,
        inventoryReports,
        facilityDrugMaps,
    ] = await Promise.all([
        prisma.reportReviewLog.count(),
        prisma.facilityReportSubmission.count(),
        prisma.inventoryReport.count(),
        prisma.facilityDrugMap.count(),
    ]);

    return {
        reportReviewLogs,
        reportSubmissions,
        inventoryReports,
        facilityDrugMaps,
    };
}

export async function GET() {
    try {
        await requireActiveSessionUser("ADMIN");
        const [maintenance, counts] = await Promise.all([
            getSystemMaintenanceState(),
            getResetCounts(),
        ]);

        return NextResponse.json({
            confirmation: RESET_CONFIRMATION,
            maintenanceEnabled: maintenance.enabled,
            counts,
        });
    } catch (error) {
        if (isRouteError(error)) {
            return NextResponse.json({ message: error.message }, { status: error.status });
        }

        console.error("Error loading XNT mapping reset summary:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const sessionContext = await requireActiveSessionUser("ADMIN");
        const body = await request.json().catch(() => null) as { confirmation?: unknown } | null;

        if (body?.confirmation !== RESET_CONFIRMATION) {
            return NextResponse.json(
                { message: `Vui lòng nhập đúng chuỗi xác nhận: ${RESET_CONFIRMATION}` },
                { status: 400 }
            );
        }

        const maintenance = await getSystemMaintenanceState();
        if (!maintenance.enabled) {
            return NextResponse.json(
                { message: "Cần bật chế độ bảo trì trước khi xóa dữ liệu XNT và ánh xạ" },
                { status: 409 }
            );
        }

        const before = await getResetCounts();

        const [
            reportReviewLogs,
            reportSubmissions,
            inventoryReports,
            facilityDrugMaps,
        ] = await prisma.$transaction([
            prisma.reportReviewLog.deleteMany(),
            prisma.facilityReportSubmission.deleteMany(),
            prisma.inventoryReport.deleteMany(),
            prisma.facilityDrugMap.deleteMany(),
        ]);

        const deleted = {
            reportReviewLogs: reportReviewLogs.count,
            reportSubmissions: reportSubmissions.count,
            inventoryReports: inventoryReports.count,
            facilityDrugMaps: facilityDrugMaps.count,
        };

        await logActivity({
            userId: sessionContext.user.id,
            action: ACTIONS.XNT_MAPPING_RESET,
            entityType: ENTITY_TYPES.XNT_MAPPING_RESET,
            details: {
                before,
                deleted,
            },
        });

        return NextResponse.json({
            message: "Đã xóa dữ liệu XNT và ánh xạ hiện tại",
            deleted,
        });
    } catch (error) {
        if (isRouteError(error)) {
            return NextResponse.json({ message: error.message }, { status: error.status });
        }

        console.error("Error resetting XNT mapping data:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}
