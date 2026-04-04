
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { logActivity, ACTIONS, ENTITY_TYPES } from "@/lib/activity-log";
import { createNotificationForFacility } from "@/lib/notifications";

/**
 * POST /api/admin/reports/review
 * Supports both single and bulk review.
 * Body variants:
 *   Single: { facilityId, month, status, adminNote }
 *   Bulk:   { items: [{facilityId, month}][], status, adminNote }
 */
export async function POST(request: Request) {
    try {
        const session = await auth();
        if (!session || session.user.role !== "ADMIN") {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { status, adminNote } = body;

        if (!status || !["APPROVED", "REJECTED"].includes(status)) {
            return NextResponse.json({ message: "Invalid status" }, { status: 400 });
        }

        // Normalise to array of {facilityId, month}
        type ReviewItem = { facilityId: string; month: string };
        let items: ReviewItem[] = [];

        if (body.items && Array.isArray(body.items)) {
            // Bulk mode
            items = body.items;
        } else if (body.facilityId && body.month) {
            // Single mode (backward compatible)
            items = [{ facilityId: body.facilityId, month: body.month }];
        } else {
            return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
        }

        let totalUpdated = 0;

        for (const item of items) {
            const { facilityId, month } = item;

            // Update all InventoryReport rows for this facility+month
            const updateResult = await prisma.inventoryReport.updateMany({
                where: { facilityId, reportMonth: month },
                data: { status, adminNote: adminNote || null }
            });
            totalUpdated += updateResult.count;

            // Write review log entry
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (prisma as any).reportReviewLog.create({
                data: {
                    facilityId,
                    reportMonth: month,
                    status,
                    adminNote: adminNote || null,
                    adminId: session.user.id,
                }
            });

            // Log activity
            logActivity({
                userId: session.user.id,
                action: status === "APPROVED" ? ACTIONS.APPROVE : ACTIONS.REJECT,
                entityType: ENTITY_TYPES.REPORT,
                entityId: facilityId,
                details: { month, status, adminNote, count: updateResult.count },
            });

            // Notify facility
            const statusLabel = status === "APPROVED" ? "phê duyệt" : "từ chối";
            createNotificationForFacility(
                facilityId,
                status === "APPROVED" ? "REPORT_APPROVED" : "REPORT_REJECTED",
                `Báo cáo đã được ${statusLabel}`,
                `Báo cáo tồn kho tháng ${month} đã được ${statusLabel}${adminNote ? `. Ghi chú: ${adminNote}` : ""}`,
                "report",
                undefined,
                "/dashboard/facility/reports"
            );
        }

        return NextResponse.json({
            message: `Đã ${status === "APPROVED" ? "duyệt" : "từ chối"} ${items.length} báo cáo (${totalUpdated} dòng dữ liệu)`,
            count: items.length,
        });

    } catch (error) {
        console.error("Error reviewing report:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}
