import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { createNotificationForFacility } from "@/lib/notifications";
import { logActivity, ACTIONS, ENTITY_TYPES } from "@/lib/activity-log";

// PATCH update mapping status
export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (!session || session.user.role !== "ADMIN") {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const body = await request.json();
        const { status, adminNote } = body;

        // Fetch full mapping with facility info for notification
        const existingMapping = await prisma.facilityDrugMap.findUnique({
            where: { id },
            include: {
                facility: { select: { id: true, facilityName: true } },
            },
        });

        if (!existingMapping) {
            return NextResponse.json({ message: "Mapping not found" }, { status: 404 });
        }

        const mapping = await prisma.facilityDrugMap.update({
            where: { id },
            data: {
                status,
                adminNote: adminNote || null,
            },
        });

        // Log activity
        logActivity({
            userId: session.user.id,
            action: status === "APPROVED" ? ACTIONS.APPROVE : ACTIONS.REJECT,
            entityType: ENTITY_TYPES.MAPPING,
            entityId: id,
            details: { status, adminNote, tenThuoc: existingMapping.tenThuocNoiBo },
        });

        // Notify the facility about the individual decision
        if (existingMapping.facility) {
            const facilityId = existingMapping.facility.id;
            const tenThuoc = existingMapping.tenThuocNoiBo;

            if (status === "APPROVED") {
                createNotificationForFacility(
                    facilityId,
                    "MAPPING_APPROVED",
                    "Ánh xạ thuốc được duyệt",
                    `Thuốc "${tenThuoc}" đã được Admin phê duyệt ánh xạ`,
                    "mapping",
                    id,
                    "/dashboard/facility/mappings"
                );
            } else if (status === "REJECTED") {
                createNotificationForFacility(
                    facilityId,
                    "MAPPING_REJECTED",
                    "Ánh xạ thuốc bị từ chối",
                    `Thuốc "${tenThuoc}" bị từ chối. Lý do: ${adminNote || "Không có"}`,
                    "mapping",
                    id,
                    "/dashboard/facility/mappings"
                );
            }
        }

        return NextResponse.json(mapping);
    } catch (error) {
        console.error("Error updating mapping:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}
