import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";

// DELETE - remove a KHLCNT (admin only)
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (!session || session.user.role !== "ADMIN") {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;

        // Check if exists
        const existing = await prisma.keHoachLCNT.findUnique({
            where: { id },
        });

        if (!existing) {
            return NextResponse.json({ message: "KHLCNT not found" }, { status: 404 });
        }

        // Delete the KHLCNT (cascade will delete related GoiThau, ThongBaoMoiThau, KetQuaLCNT, etc.)
        await prisma.keHoachLCNT.delete({
            where: { id },
        });

        // Log the deletion action
        await prisma.activityLog.create({
            data: {
                userId: session.user.id,
                action: "DELETE",
                entityType: "lcnt",
                entityId: id,
                details: JSON.stringify({
                    maKHLCNT: existing.maKHLCNT,
                    tenKHLCNT: existing.tenKHLCNT,
                    message: `Admin xóa KHLCNT: ${existing.maKHLCNT || existing.tenKHLCNT || id}`,
                }),
            },
        });

        return NextResponse.json({ message: "Deleted successfully" });
    } catch (error: any) {
        console.error("Error deleting KHLCNT:", error);
        return NextResponse.json(
            { message: error.message || "Internal server error" },
            { status: 500 }
        );
    }
}
