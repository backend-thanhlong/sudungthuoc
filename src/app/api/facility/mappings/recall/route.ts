import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { logActivity, ACTIONS, ENTITY_TYPES } from "@/lib/activity-log";

// POST recall mappings - revert WAITING_APPROVAL → PENDING_MAPPING
export async function POST() {
    try {
        const session = await auth();
        if (!session || session.user.role !== "FACILITY") {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        // Revert all WAITING_APPROVAL back to PENDING_MAPPING
        const result = await prisma.facilityDrugMap.updateMany({
            where: {
                facilityId: session.user.id,
                status: "WAITING_APPROVAL",
            },
            data: {
                status: "PENDING_MAPPING",
            },
        });

        if (result.count > 0) {
            logActivity({
                userId: session.user.id,
                action: ACTIONS.UPDATE,
                entityType: ENTITY_TYPES.MAPPING,
                details: { count: result.count, action: "RECALL_SUBMISSION" },
            });
        }

        return NextResponse.json({
            message: `Đã thu hồi ${result.count} ánh xạ`,
            count: result.count,
        });
    } catch (error) {
        console.error("Error recalling mappings:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}
