import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireActiveSessionUser, isRouteError } from "@/lib/server-authz";
import { NHOM_TCKT_OPTIONS, normalizeNhomTckt } from "@/lib/report-validation";

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const sessionContext = await requireActiveSessionUser("FACILITY");
        const { id } = await params;
        const body = await request.json().catch(() => null) as { nhomTckt?: unknown } | null;
        const nhomTckt = normalizeNhomTckt(body?.nhomTckt);

        if (!nhomTckt) {
            return NextResponse.json({
                message: `Nhóm TCKT không hợp lệ. Chỉ được chọn: ${NHOM_TCKT_OPTIONS.join(", ")}`,
            }, { status: 400 });
        }

        const mapping = await prisma.facilityDrugMap.findFirst({
            where: {
                id,
                facilityId: sessionContext.user.id,
            },
            select: {
                id: true,
                nhomTckt: true,
            },
        });

        if (!mapping) {
            return NextResponse.json({ message: "Mapping not found" }, { status: 404 });
        }

        if (mapping.nhomTckt) {
            return NextResponse.json({
                message: "Nhóm TCKT đã được thiết lập và không thể thay đổi từ tài khoản cơ sở.",
            }, { status: 409 });
        }

        const updated = await prisma.facilityDrugMap.update({
            where: { id },
            data: { nhomTckt },
            include: {
                masterDrug: {
                    select: {
                        id: true,
                        maChung: true,
                        tenThuoc: true,
                        hoatChat: true,
                        soDangKy: true,
                        hamLuong: true,
                        dangBaoChe: true,
                        donViTinh: true,
                        quyCach: true,
                    },
                },
            },
        });

        return NextResponse.json(updated);
    } catch (error) {
        if (isRouteError(error)) {
            return NextResponse.json({ message: error.message }, { status: error.status });
        }

        console.error("Error updating mapping Nhóm TCKT:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}
