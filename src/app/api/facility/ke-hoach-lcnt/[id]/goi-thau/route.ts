import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";

const safeParseNumber = (val: unknown) => {
    if (val === null || val === undefined || val === "") {
        return null;
    }

    const parsed = parseFloat(String(val));
    return Number.isNaN(parsed) ? null : parsed;
};

const safeParseInt = (val: unknown) => {
    if (val === null || val === undefined || val === "") {
        return null;
    }

    const parsed = parseInt(String(val), 10);
    return Number.isNaN(parsed) ? null : parsed;
};

const normalizeOptionalString = (val: unknown) => {
    if (typeof val !== "string") {
        return null;
    }

    const trimmed = val.trim();
    return trimmed === "" ? null : trimmed;
};

const calculateGiaGoiThauFromPhanLos = (phanLos: unknown[]) => {
    let hasThanhTien = false;

    const total = phanLos.reduce((sum: number, pl) => {
        const thanhTien = safeParseNumber((pl as { thanhTien?: unknown } | null)?.thanhTien);

        if (thanhTien === null) {
            return sum;
        }

        hasThanhTien = true;
        return sum + thanhTien;
    }, 0);

    return hasThanhTien ? total : null;
};

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
        const phanLos = Array.isArray(body.phanLos) ? body.phanLos : [];
        const giaGoiThau = calculateGiaGoiThauFromPhanLos(phanLos);

        const goiThau = await prisma.goiThau.create({
            data: {
                keHoachId: id,
                tenGoiThau: body.tenGoiThau,
                giaGoiThau,
                linhVuc: body.linhVuc ? JSON.stringify(body.linhVuc) : null,
                hinhThucLCNT: body.hinhThucLCNT || null,
                phuongThucLCNT: body.phuongThucLCNT || null,
                loaiHopDong: body.loaiHopDong ? JSON.stringify(body.loaiHopDong) : null,
                phanLoaiGoiThau: body.phanLoaiGoiThau || null,
                chiTietNguonVon: body.chiTietNguonVon || null,
                soLuongPhanLo: safeParseInt(body.soLuongPhanLo),
                thoiGianToChuc: body.thoiGianToChuc || null,
                thoiGianBatDau: normalizeOptionalString(body.thoiGianBatDau),
                thoiGianThucHien: body.thoiGianThucHien || null,
                phanLos: phanLos.length > 0
                    ? {
                        create: phanLos.map((pl: any, index: number) => ({
                            stt: safeParseInt(pl.stt) ?? index + 1,
                            tenPhanLo: pl.tenPhanLo || "",
                            donViTinh: pl.donViTinh || null,
                            soLuong: safeParseNumber(pl.soLuong),
                            donGia: safeParseNumber(pl.donGia),
                            thanhTien: safeParseNumber(pl.thanhTien),
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
