import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";

// Statuses that facility cannot edit
const LOCKED_STATUSES = ["WAITING_APPROVAL", "APPROVED"];

// PATCH update mapping
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
        const body = await request.json();

        // Verify ownership
        const mapping = await prisma.facilityDrugMap.findFirst({
            where: { id, facilityId: session.user.id },
        });

        if (!mapping) {
            return NextResponse.json({ message: "Mapping not found" }, { status: 404 });
        }

        // Block edit when mapping is locked (submitted for approval or already approved)
        if (LOCKED_STATUSES.includes(mapping.status)) {
            return NextResponse.json(
                {
                    message:
                        mapping.status === "WAITING_APPROVAL"
                            ? "Không thể chỉnh sửa thuốc đang chờ duyệt. Vui lòng thu hồi yêu cầu trước khi sửa."
                            : "Không thể chỉnh sửa thuốc đã được duyệt.",
                },
                { status: 403 }
            );
        }

        const updated = await prisma.facilityDrugMap.update({
            where: { id },
            data: {
                masterDrugId: body.masterDrugId !== undefined ? body.masterDrugId : mapping.masterDrugId,
                isOutOfCatalog: body.isOutOfCatalog !== undefined ? body.isOutOfCatalog : mapping.isOutOfCatalog,
                status: body.status || mapping.status,
                // Allow updating internal fields if needed (e.g. correcting typo)
                maNoiBo: body.maNoiBo || mapping.maNoiBo,
                tenThuocNoiBo: body.tenThuocNoiBo || mapping.tenThuocNoiBo,
                hoatChatNoiBo: body.hoatChatNoiBo !== undefined ? body.hoatChatNoiBo : mapping.hoatChatNoiBo,
                soDangKyNoiBo: body.soDangKyNoiBo !== undefined ? body.soDangKyNoiBo : mapping.soDangKyNoiBo,
                donViTinhNoiBo: body.donViTinhNoiBo !== undefined ? body.donViTinhNoiBo : mapping.donViTinhNoiBo,
            },
        });

        return NextResponse.json(updated);
    } catch (error) {
        console.error("Error updating mapping:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}

// DELETE a mapping (only if deletable status)
export async function DELETE(
    _request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (!session || session.user.role !== "FACILITY") {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;

        const mapping = await prisma.facilityDrugMap.findFirst({
            where: { id, facilityId: session.user.id },
        });

        if (!mapping) {
            return NextResponse.json({ message: "Mapping not found" }, { status: 404 });
        }

        // Block delete when locked
        if (LOCKED_STATUSES.includes(mapping.status)) {
            return NextResponse.json(
                {
                    message:
                        mapping.status === "WAITING_APPROVAL"
                            ? "Không thể xóa thuốc đang chờ duyệt. Vui lòng thu hồi yêu cầu trước."
                            : "Không thể xóa thuốc đã được duyệt.",
                },
                { status: 403 }
            );
        }

        await prisma.facilityDrugMap.delete({ where: { id } });
        return NextResponse.json({ message: "Deleted successfully" });
    } catch (error) {
        console.error("Error deleting mapping:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}
