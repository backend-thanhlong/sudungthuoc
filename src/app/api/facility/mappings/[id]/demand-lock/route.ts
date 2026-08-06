import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { ACTIONS, ENTITY_TYPES, logActivity } from "@/lib/activity-log";
import prisma from "@/lib/prisma";

const normalizeOptionalText = (value: unknown) => {
    if (value === null || value === undefined) return null;
    const normalized = String(value).trim().replace(/\s+/g, " ");
    return normalized || null;
};

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (!session || session.user.role !== "FACILITY") {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const body = await request.json() as {
            locked?: unknown;
            reason?: unknown;
        };

        if (typeof body.locked !== "boolean") {
            return NextResponse.json(
                { message: "locked phải là boolean" },
                { status: 400 }
            );
        }

        const mapping = await prisma.facilityDrugMap.findFirst({
            where: { id, facilityId: session.user.id },
            select: {
                id: true,
                tenThuocNoiBo: true,
                maNoiBo: true,
                demandPlanningLocked: true,
            },
        });

        if (!mapping) {
            return NextResponse.json({ message: "Mapping not found" }, { status: 404 });
        }

        const now = new Date();
        const updated = await prisma.facilityDrugMap.update({
            where: { id },
            data: body.locked
                ? {
                    demandPlanningLocked: true,
                    demandPlanningLockedAt: now,
                    demandPlanningLockReason: normalizeOptionalText(body.reason),
                }
                : {
                    demandPlanningLocked: false,
                    demandPlanningUnlockedAt: now,
                    demandPlanningLockReason: null,
                },
            include: { masterDrug: true },
        });

        logActivity({
            userId: session.user.id,
            action: ACTIONS.UPDATE,
            entityType: ENTITY_TYPES.MAPPING,
            entityId: id,
            details: {
                action: body.locked
                    ? "LOCK_DEMAND_PLANNING"
                    : "UNLOCK_DEMAND_PLANNING",
                maNoiBo: mapping.maNoiBo,
                tenThuoc: mapping.tenThuocNoiBo,
                reason: body.locked ? normalizeOptionalText(body.reason) : null,
            },
        });

        return NextResponse.json(updated);
    } catch (error) {
        console.error("Error updating demand planning lock:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}
