import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { logActivity, ACTIONS, ENTITY_TYPES } from "@/lib/activity-log";
import { createNotificationForFacility } from "@/lib/notifications";

// GET all mappings for admin
export async function GET() {
    try {
        const session = await auth();
        if (!session || session.user.role !== "ADMIN") {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const mappings = await prisma.facilityDrugMap.findMany({
            include: {
                facility: {
                    select: {
                        facilityName: true,
                        facilityCode: true,
                    },
                },
                masterDrug: {
                    select: {
                        id: true,
                        maChung: true,
                        tenThuoc: true,
                        hoatChat: true,
                        soDangKy: true,
                        hamLuong: true,
                        dangBaoChe: true,
                        donViTinh: true,
                        quyCach: true,
                    },
                },
            },
            orderBy: { updatedAt: "desc" },
        });

        return NextResponse.json(mappings);
    } catch (error) {
        console.error("Error fetching mappings:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}

// DELETE processed mappings (Approved/Rejected) for a facility
export async function DELETE(req: Request) {
    try {
        const session = await auth();
        if (!session || session.user.role !== "ADMIN") {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { facilityCode } = body;

        if (!facilityCode) {
            return NextResponse.json({ message: "Missing facilityCode" }, { status: 400 });
        }

        const result = await prisma.facilityDrugMap.deleteMany({
            where: {
                facility: {
                    facilityCode: facilityCode
                },
                status: {
                    not: "WAITING_APPROVAL"
                }
            }
        });

        return NextResponse.json({ message: "Deleted successfully", count: result.count });
    } catch (error) {
        console.error("Error deleting mappings:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}

// BULK APPROVE OR REJECT for a facility
export async function PATCH(req: Request) {
    try {
        const session = await auth();
        if (!session || session.user.role !== "ADMIN") {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { facilityCode, status, adminNote } = body;

        if (!facilityCode || !status) {
            return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
        }

        if (status !== "APPROVED" && status !== "REJECTED") {
            return NextResponse.json({ message: "Status must be APPROVED or REJECTED" }, { status: 400 });
        }

        const result = await prisma.facilityDrugMap.updateMany({
            where: {
                facility: {
                    facilityCode: facilityCode
                },
                status: "WAITING_APPROVAL"
            },
            data: {
                status,
                adminNote: status === "APPROVED" ? null : (adminNote || null),
            }
        });

        // Get facility user id from facilityCode
        const facility = await prisma.user.findFirst({
            where: { facilityCode },
            select: { id: true, facilityName: true },
        });

        // Log activity
        logActivity({
            userId: session.user.id,
            action: status === "APPROVED" ? ACTIONS.APPROVE : ACTIONS.REJECT,
            entityType: ENTITY_TYPES.MAPPING,
            details: { facilityCode, count: result.count, status, adminNote },
        });

        // Notify facility
        if (facility && result.count > 0) {
            if (status === "APPROVED") {
                createNotificationForFacility(
                    facility.id,
                    "MAPPING_APPROVED",
                    "Ánh xạ thuốc đã được phê duyệt",
                    `${result.count} ánh xạ thuốc đã được Admin phê duyệt`,
                    "mapping",
                    undefined,
                    "/dashboard/facility/mappings"
                );
            } else {
                createNotificationForFacility(
                    facility.id,
                    "MAPPING_REJECTED",
                    "Ánh xạ thuốc bị từ chối",
                    `${result.count} ánh xạ thuốc bị từ chối. Lý do: ${adminNote || "Không có"}`,
                    "mapping",
                    undefined,
                    "/dashboard/facility/mappings"
                );
            }
        }

        return NextResponse.json({ message: "Updated successfully", count: result.count });
    } catch (error) {
        console.error("Error bulk updating mappings:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}
