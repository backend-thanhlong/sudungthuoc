import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";

// PATCH - update an existing KHLCNT
export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const body = await request.json();

        // Check ownership
        const existing = await prisma.keHoachLCNT.findUnique({
            where: { id },
            select: { facilityId: true },
        });

        if (!existing) {
            return NextResponse.json({ message: "KHLCNT not found" }, { status: 404 });
        }

        if (existing.facilityId !== session.user.id) {
            return NextResponse.json({ message: "Forbidden" }, { status: 403 });
        }

        // Update the KHLCNT
        const updated = await prisma.keHoachLCNT.update({
            where: { id },
            data: {
                quyTrinh: body.quyTrinh,
                loaiMuaSam: body.loaiMuaSam || null,
                maKHLCNT: body.maKHLCNT || null,
                tenKHLCNT: body.tenKHLCNT || null,
                soQuyetDinh: body.soQuyetDinh || null,
                ngayPheDuyet: body.ngayPheDuyet ? new Date(body.ngayPheDuyet) : null,
                soLuongGoiThau: body.soLuongGoiThau ? parseInt(body.soLuongGoiThau.toString()) : null,
                trangThai: body.trangThai || "Chưa đăng tải",
                // Self-decision process fields (quyTrinh=2)
                loaiMuaSamTuQuyet: body.loaiMuaSamTuQuyet || null,
                thoiGianBatDauMuaSam: body.thoiGianBatDauMuaSam ? new Date(body.thoiGianBatDauMuaSam) : null,
                thoiGianBatDauThucHienHopDong: body.thoiGianBatDauThucHienHopDong ? new Date(body.thoiGianBatDauThucHienHopDong) : null,
                thoiGianThucHienHopDong: body.thoiGianThucHienHopDong || null,
                thoiGianKetThucHopDong: body.thoiGianKetThucHopDong ? new Date(body.thoiGianKetThucHopDong) : null,
            },
        });

        return NextResponse.json(updated);
    } catch (error: any) {
        console.error("Error updating KHLCNT:", error);
        return NextResponse.json(
            { message: error.message || "Internal server error" },
            { status: 500 }
        );
    }
}
