import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";

// GET - list KHLCNT for current user
export async function GET() {
    try {
        const session = await auth();
        if (!session) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        if (session.user.role !== "FACILITY") {
            return NextResponse.json({ message: "Forbidden – endpoint chỉ dành cho cơ sở" }, { status: 403 });
        }

        const keHoachs = await prisma.keHoachLCNT.findMany({
            where: { facilityId: session.user.id },
            include: { goiThaus: { include: { phanLos: true } } },
            orderBy: { createdAt: "desc" },
        });

        return NextResponse.json(keHoachs);
    } catch (error) {
        console.error("Error fetching KHLCNT:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}

// POST - create new KHLCNT
export async function POST(request: Request) {
    try {
        const session = await auth();
        if (!session) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        console.log("Creating KHLCNT for user:", session.user.id, "body:", JSON.stringify(body));

        const keHoach = await prisma.keHoachLCNT.create({
            data: {
                facilityId: session.user.id,
                quyTrinh: Number(body.quyTrinh),
                loaiMuaSam: body.loaiMuaSam || null,
                maKHLCNT: body.maKHLCNT || null,
                tenKHLCNT: body.tenKHLCNT || null,
                soQuyetDinh: body.soQuyetDinh || null,
                ngayPheDuyet: body.ngayPheDuyet ? new Date(body.ngayPheDuyet) : null,
                soLuongGoiThau: body.soLuongGoiThau != null ? Number(body.soLuongGoiThau) : null,
                trangThai: body.trangThai || null,
                // Self-decision process fields (quyTrinh=2)
                loaiMuaSamTuQuyet: body.loaiMuaSamTuQuyet || null,
                thoiGianBatDauMuaSam: body.thoiGianBatDauMuaSam ? new Date(body.thoiGianBatDauMuaSam) : null,
                thoiGianBatDauThucHienHopDong: body.thoiGianBatDauThucHienHopDong ? new Date(body.thoiGianBatDauThucHienHopDong) : null,
                thoiGianThucHienHopDong: body.thoiGianThucHienHopDong || null,
                thoiGianKetThucHopDong: body.thoiGianKetThucHopDong ? new Date(body.thoiGianKetThucHopDong) : null,
            },
        });

        return NextResponse.json(keHoach, { status: 201 });
    } catch (error: any) {
        console.error("Error creating KHLCNT:", error);
        return NextResponse.json(
            { message: error.message || "Internal server error" },
            { status: 500 }
        );
    }
}
