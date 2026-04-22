import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
    isRouteError,
    requireActiveSessionUser,
} from "@/lib/server-authz";

const handleRouteError = (error: unknown, context: string) => {
    if (isRouteError(error)) {
        return NextResponse.json({ message: error.message }, { status: error.status });
    }

    console.error(context, error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
};

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string; goiThauId: string }> }
) {
    try {
        void request;
        const { user } = await requireActiveSessionUser("ADMIN");
        const { id: keHoachId, goiThauId } = await params;

        const existing = await prisma.goiThau.findUnique({
            where: { id: goiThauId },
            select: {
                id: true,
                keHoachId: true,
                tenGoiThau: true,
                thongBaoMoiThaus: {
                    select: {
                        id: true,
                    },
                },
            },
        });

        if (!existing) {
            return NextResponse.json({ message: "Gói thầu không tồn tại" }, { status: 404 });
        }

        if (existing.keHoachId !== keHoachId) {
            return NextResponse.json(
                { message: "Gói thầu không thuộc kế hoạch hiện tại" },
                { status: 400 }
            );
        }

        if (existing.thongBaoMoiThaus.length > 0) {
            return NextResponse.json(
                { message: "Không thể xóa gói thầu đã có thông báo mời thầu" },
                { status: 409 }
            );
        }

        await prisma.goiThau.delete({
            where: { id: goiThauId },
        });

        await prisma.activityLog.create({
            data: {
                userId: user.id,
                action: "DELETE",
                entityType: "goi_thau",
                entityId: goiThauId,
                details: JSON.stringify({
                    keHoachId,
                    goiThauId,
                    tenGoiThau: existing.tenGoiThau,
                    message: `Admin xóa gói thầu: ${existing.tenGoiThau || goiThauId}`,
                }),
            },
        });

        return NextResponse.json({ message: "Deleted successfully" });
    } catch (error: unknown) {
        return handleRouteError(error, "Error deleting goi thau:");
    }
}
