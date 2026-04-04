import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";

// GET - list gói thầu for a KHLCNT
export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (!session) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;

        // Verify ownership
        const keHoach = await prisma.keHoachLCNT.findFirst({
            where: { id, facilityId: session.user.id },
        });
        if (!keHoach) {
            return NextResponse.json({ message: "KHLCNT not found" }, { status: 404 });
        }

        const goiThaus = await prisma.goiThau.findMany({
            where: { keHoachId: id },
            include: { phanLos: { orderBy: { stt: "asc" } } },
            orderBy: { createdAt: "asc" },
        });

        return NextResponse.json(goiThaus);
    } catch (error) {
        console.error("Error fetching goi thau:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}

// POST - create gói thầu with nested phần lô
export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (!session) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;

        // Verify ownership
        const keHoach = await prisma.keHoachLCNT.findFirst({
            where: { id, facilityId: session.user.id },
        });
        if (!keHoach) {
            return NextResponse.json({ message: "KHLCNT not found" }, { status: 404 });
        }

        const body = await request.json();

        const safeParseNumber = (val: any) => val !== null && val !== undefined && val !== "" && !isNaN(parseFloat(val)) ? parseFloat(val) : null;
        const safeParseInt = (val: any) => val !== null && val !== undefined && val !== "" && !isNaN(parseInt(val, 10)) ? parseInt(val, 10) : null;
        const safeParseDate = (val: any) => {
            if (!val || typeof val !== 'string' || val.trim() === '') return null;
            const d = new Date(val);
            return isNaN(d.getTime()) ? null : d;
        };

        const goiThau = await prisma.goiThau.create({
            data: {
                keHoachId: id,
                tenGoiThau: body.tenGoiThau,
                giaGoiThau: safeParseNumber(body.giaGoiThau),
                linhVuc: body.linhVuc ? JSON.stringify(body.linhVuc) : null,
                hinhThucLCNT: body.hinhThucLCNT || null,
                phuongThucLCNT: body.phuongThucLCNT || null,
                loaiHopDong: body.loaiHopDong ? JSON.stringify(body.loaiHopDong) : null,
                phanLoaiGoiThau: body.phanLoaiGoiThau || null,
                chiTietNguonVon: body.chiTietNguonVon || null,
                soLuongPhanLo: safeParseInt(body.soLuongPhanLo),
                thoiGianToChuc: body.thoiGianToChuc || null,
                thoiGianBatDau: safeParseDate(body.thoiGianBatDau),
                thoiGianThucHien: body.thoiGianThucHien || null,
                phanLos: body.phanLos && body.phanLos.length > 0
                    ? {
                        create: body.phanLos.map((pl: any, index: number) => ({
                            stt: pl.stt ? (parseInt(pl.stt, 10) || index + 1) : index + 1,
                            tenPhanLo: pl.tenPhanLo || "",
                            donViTinh: pl.donViTinh || null,
                            soLuong: pl.soLuong ? (!isNaN(parseFloat(pl.soLuong)) ? parseFloat(pl.soLuong) : null) : null,
                            donGia: pl.donGia ? (!isNaN(parseFloat(pl.donGia)) ? parseFloat(pl.donGia) : null) : null,
                            thanhTien: pl.thanhTien ? (!isNaN(parseFloat(pl.thanhTien)) ? parseFloat(pl.thanhTien) : null) : null,
                            thoiGianThucHien: pl.thoiGianThucHien?.toString() || null,
                            donViTinhThoiGian: pl.donViTinhThoiGian?.toString() || null,
                        })),
                    }
                    : undefined,
            },
            include: { phanLos: true },
        });

        return NextResponse.json(goiThau, { status: 201 });
    } catch (error: any) {
        console.error("Error creating goi thau:", error);
        return NextResponse.json({ message: error.message || "Internal server error" }, { status: 500 });
    }
}
