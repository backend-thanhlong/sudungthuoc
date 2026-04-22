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

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string; goiThauId: string }> }
) {
    try {
        const { user } = await requireActiveSessionUser("FACILITY");
        const { id: keHoachId, goiThauId } = await params;
        const body = await request.json();

        const existing = await prisma.goiThau.findUnique({
            where: { id: goiThauId },
            select: {
                id: true,
                keHoachId: true,
                keHoach: {
                    select: {
                        facilityId: true,
                    },
                },
                thongBaoMoiThaus: {
                    select: { id: true },
                },
                ketQuaLCNTs: {
                    select: { id: true },
                },
            },
        });

        if (!existing) {
            return NextResponse.json({ message: "Gói thầu không tồn tại" }, { status: 404 });
        }

        if (existing.keHoach.facilityId !== user.id) {
            return NextResponse.json({ message: "Forbidden" }, { status: 403 });
        }

        if (existing.keHoachId !== keHoachId) {
            return NextResponse.json(
                { message: "Gói thầu không thuộc kế hoạch hiện tại" },
                { status: 400 }
            );
        }

        if (existing.thongBaoMoiThaus.length > 0 || existing.ketQuaLCNTs.length > 0) {
            return NextResponse.json(
                { message: "Không thể sửa gói thầu đã có dữ liệu liên kết" },
                { status: 409 }
            );
        }

        const phanLos = Array.isArray(body.phanLos) ? body.phanLos : [];
        const giaGoiThau = calculateGiaGoiThauFromPhanLos(phanLos);

        const updated = await prisma.$transaction(async (tx) => {
            await tx.goiThau.update({
                where: { id: goiThauId },
                data: {
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
                },
            });

            await tx.phanLoGoiThau.deleteMany({
                where: { goiThauId },
            });

            if (phanLos.length > 0) {
                await tx.phanLoGoiThau.createMany({
                    data: phanLos.map((pl: any, index: number) => ({
                        goiThauId,
                        stt: pl.stt ? (parseInt(String(pl.stt), 10) || index + 1) : index + 1,
                        tenPhanLo: pl.tenPhanLo || "",
                        donViTinh: pl.donViTinh || null,
                        soLuong: safeParseNumber(pl.soLuong),
                        donGia: safeParseNumber(pl.donGia),
                        thanhTien: safeParseNumber(pl.thanhTien),
                        thoiGianThucHien: pl.thoiGianThucHien?.toString() || null,
                        donViTinhThoiGian: pl.donViTinhThoiGian?.toString() || null,
                    })),
                });
            }

            return tx.goiThau.findUnique({
                where: { id: goiThauId },
                include: {
                    phanLos: {
                        orderBy: { stt: "asc" },
                    },
                    thongBaoMoiThaus: {
                        select: { id: true },
                    },
                    ketQuaLCNTs: {
                        select: { id: true },
                    },
                },
            });
        });

        return NextResponse.json(updated);
    } catch (error: unknown) {
        return handleRouteError(error, "Error updating goi thau:");
    }
}
