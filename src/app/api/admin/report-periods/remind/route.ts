import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { createNotificationForFacility } from "@/lib/notifications";
import { listSubmittedFacilityIdsForMonth } from "@/lib/report-submissions";

/**
 * POST /api/admin/report-periods/remind
 * Body: { month: "MM/YYYY" }
 * Sends a reminder notification to all FACILITY users who have NOT yet submitted
 * a report for the given month.
 */
export async function POST(req: NextRequest) {
    try {
        const session = await auth();
        if (!session || session.user.role !== "ADMIN") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { month } = await req.json();
        if (!month) {
            return NextResponse.json({ error: "Missing month" }, { status: 400 });
        }

        // Get all active facilities
        const allFacilities = await prisma.user.findMany({
            where: { role: "FACILITY", isActive: true },
            select: { id: true, facilityName: true },
        });

        // Get facilities that have already submitted for this month
        const submittedIds = await listSubmittedFacilityIdsForMonth(month);

        // Facilities that have NOT submitted yet
        const pending = allFacilities.filter((f) => !submittedIds.has(f.id));

        if (pending.length === 0) {
            return NextResponse.json({ message: "Tất cả cơ sở đã nộp báo cáo", count: 0 });
        }

        // Get deadline of this period (if any)
        const period = await (prisma.reportPeriod as any).findUnique({ where: { month } });
        const deadlineText = period?.deadline
            ? ` Hạn nộp: ${new Date(period.deadline).toLocaleDateString("vi-VN")}.`
            : "";

        // Send notifications in parallel (fire-and-forget per facility)
        await Promise.all(
            pending.map((facility) =>
                createNotificationForFacility(
                    facility.id,
                    "REPORT_REMINDER",
                    `Nhắc nhở nộp báo cáo tháng ${month}`,
                    `Cơ sở chưa nộp báo cáo tồn kho tháng ${month}. Vui lòng tải mẫu và nộp trước hạn.${deadlineText}`,
                    "report",
                    undefined,
                    "/dashboard/facility/reports"
                )
            )
        );

        // Mark period as reminderSent
        if (period) {
            await (prisma.reportPeriod as any).update({
                where: { month },
                data: { reminderSent: true },
            });
        }

        return NextResponse.json({
            message: `Đã gửi nhắc nhở đến ${pending.length} cơ sở chưa nộp báo cáo`,
            count: pending.length,
        });
    } catch (error) {
        console.error("Error sending reminders:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
