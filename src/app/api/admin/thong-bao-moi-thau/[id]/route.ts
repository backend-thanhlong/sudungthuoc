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
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        void request;
        const { user } = await requireActiveSessionUser("ADMIN");
        const { id } = await params;

        const existing = await prisma.thongBaoMoiThau.findUnique({
            where: { id },
            select: {
                id: true,
                maTBMT: true,
                goiThauId: true,
                goiThau: {
                    select: {
                        id: true,
                        tenGoiThau: true,
                        keHoach: {
                            select: {
                                id: true,
                                maKHLCNT: true,
                                facility: {
                                    select: {
                                        facilityName: true,
                                        facilityCode: true,
                                        username: true,
                                    },
                                },
                            },
                        },
                    },
                },
                ketQuaLCNTs: {
                    select: {
                        id: true,
                    },
                    take: 1,
                },
            },
        });

        if (!existing) {
            return NextResponse.json(
                { message: "Thông báo mời thầu không tồn tại" },
                { status: 404 }
            );
        }

        if (existing.ketQuaLCNTs.length > 0) {
            return NextResponse.json(
                { message: "Không thể xóa thông báo mời thầu đã có kết quả LCNT" },
                { status: 409 }
            );
        }

        await prisma.thongBaoMoiThau.delete({
            where: { id },
        });

        const facilityName = existing.goiThau.keHoach.facility.facilityName
            || existing.goiThau.keHoach.facility.facilityCode
            || existing.goiThau.keHoach.facility.username;

        await prisma.activityLog.create({
            data: {
                userId: user.id,
                action: "DELETE",
                entityType: "tbmt",
                entityId: id,
                details: JSON.stringify({
                    maTBMT: existing.maTBMT,
                    goiThauId: existing.goiThauId,
                    tenGoiThau: existing.goiThau.tenGoiThau,
                    keHoachId: existing.goiThau.keHoach.id,
                    maKHLCNT: existing.goiThau.keHoach.maKHLCNT,
                    facilityName,
                    message: `Admin xóa TBMT ${existing.maTBMT} của ${facilityName}`,
                }),
            },
        });

        return NextResponse.json({ message: "Deleted successfully" });
    } catch (error: unknown) {
        return handleRouteError(error, "Error deleting thong bao moi thau:");
    }
}
