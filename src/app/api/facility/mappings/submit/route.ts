import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { createNotificationForAdmins } from "@/lib/notifications";
import { logActivity, ACTIONS, ENTITY_TYPES } from "@/lib/activity-log";

// POST submit mappings for approval
export async function POST() {
    try {
        const session = await auth();
        if (!session || session.user.role !== "FACILITY") {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const missingNhomTcktCount = await prisma.facilityDrugMap.count({
            where: {
                facilityId: session.user.id,
                status: "PENDING_MAPPING",
                OR: [
                    { masterDrugId: { not: null } },
                    { isOutOfCatalog: true },
                ],
                nhomTckt: null,
            },
        });

        if (missingNhomTcktCount > 0) {
            return NextResponse.json({
                message: `Còn ${missingNhomTcktCount} thuốc chưa thiết lập Nhóm TCKT. Vui lòng thiết lập trước khi gửi duyệt.`,
            }, { status: 400 });
        }

        // Update all complete PENDING_MAPPING with masterDrug or isOutOfCatalog to WAITING_APPROVAL
        const result = await prisma.facilityDrugMap.updateMany({
            where: {
                facilityId: session.user.id,
                status: "PENDING_MAPPING",
                OR: [
                    { masterDrugId: { not: null } },
                    { isOutOfCatalog: true },
                ],
                nhomTckt: { not: null },
            },
            data: {
                status: "WAITING_APPROVAL",
            },
        });

        if (result.count > 0) {
            // Notify all admins that a facility has submitted mappings for approval
            const facilityName = session.user.name || "Cơ sở y tế";
            createNotificationForAdmins(
                "MAPPING_SUBMITTED",
                "Yêu cầu duyệt ánh xạ thuốc mới",
                `${facilityName} đã gửi ${result.count} ánh xạ thuốc chờ duyệt`,
                "mapping",
                undefined,
                "/dashboard/admin/mappings"
            );

            // Log activity
            logActivity({
                userId: session.user.id,
                action: ACTIONS.CREATE,
                entityType: ENTITY_TYPES.MAPPING,
                details: { count: result.count, action: "SUBMIT_FOR_APPROVAL" },
            });
        }

        return NextResponse.json({
            message: `Submitted ${result.count} mappings for approval`,
            count: result.count,
        });
    } catch (error) {
        console.error("Error submitting mappings:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}
