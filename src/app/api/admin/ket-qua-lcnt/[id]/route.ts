import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";

// GET /api/admin/ket-qua-lcnt/[id]
// Get detail of a specific LCNT result
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (!session || session.user.role !== "ADMIN") {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;

        const ketQua = await prisma.ketQuaLCNT.findUnique({
            where: { id },
            include: {
                goiThau: {
                    include: {
                        keHoach: {
                            include: {
                                facility: {
                                    select: {
                                        facilityName: true,
                                        username: true,
                                    },
                                },
                            },
                        },
                        phanLos: {
                            orderBy: { stt: "asc" },
                        },
                    },
                },
                thongBaoMoiThau: true,
                ketQuaPhanLos: {
                    include: {
                        phanLoGoiThau: true,
                    },
                    orderBy: {
                        phanLoGoiThau: {
                            stt: "asc",
                        },
                    },
                },
            },
        });

        if (!ketQua) {
            return NextResponse.json(
                { message: "Kết quả LCNT không tồn tại" },
                { status: 404 }
            );
        }

        return NextResponse.json(ketQua);
    } catch (error) {
        console.error("Error fetching ket qua LCNT detail:", error);
        return NextResponse.json(
            { message: "Internal server error" },
            { status: 500 }
        );
    }
}

// DELETE /api/admin/ket-qua-lcnt/[id]
// Delete a specific LCNT result (admin only)
export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (!session || session.user.role !== "ADMIN") {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;

        // Check if exists
        const existing = await prisma.ketQuaLCNT.findUnique({
            where: { id },
            include: {
                goiThau: {
                    include: {
                        keHoach: {
                            include: {
                                facility: {
                                    select: { facilityName: true, username: true },
                                },
                            },
                        },
                    },
                },
                thongBaoMoiThau: true,
            },
        });

        if (!existing) {
            return NextResponse.json(
                { message: "Kết quả LCNT không tồn tại" },
                { status: 404 }
            );
        }

        // Delete the KetQuaLCNT (cascade will delete related KetQuaPhanLo)
        await prisma.ketQuaLCNT.delete({
            where: { id },
        });

        // Log the deletion action
        const facilityName = existing.goiThau.keHoach.facility.facilityName || existing.goiThau.keHoach.facility.username;
        await prisma.activityLog.create({
            data: {
                userId: session.user.id,
                action: "DELETE",
                entityType: "lcnt",
                entityId: id,
                details: JSON.stringify({
                    soQdPheDuyetKQLCNT: existing.soQdPheDuyetKQLCNT,
                    maTBMT: existing.thongBaoMoiThau.maTBMT,
                    facilityName,
                    message: `Admin xóa Kết quả LCNT (QĐ: ${existing.soQdPheDuyetKQLCNT}, TBMT: ${existing.thongBaoMoiThau.maTBMT}) của ${facilityName}`,
                }),
            },
        });

        return NextResponse.json({ message: "Deleted successfully" });
    } catch (error: any) {
        console.error("Error deleting KetQuaLCNT:", error);
        return NextResponse.json(
            { message: error.message || "Internal server error" },
            { status: 500 }
        );
    }
}
