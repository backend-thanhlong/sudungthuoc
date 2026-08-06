import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { isRouteError, requireActiveSessionUser } from "@/lib/server-authz";

const normalizeRegistration = (value: string | null) =>
    (value || "").trim().replace(/\s+/g, " ").toUpperCase();

const getReferenceCount = (drug: {
    _count: {
        drugMaps: number;
        companyDrugs: number;
        drugOrderLines: number;
    };
}) => drug._count.drugMaps + drug._count.companyDrugs + drug._count.drugOrderLines;

const getDeleteBlockReason = (drug: {
    _count: {
        drugMaps: number;
        companyDrugs: number;
        drugOrderLines: number;
    };
}) => {
    const reasons: string[] = [];

    if (drug._count.drugMaps > 0) {
        reasons.push(`${drug._count.drugMaps} ánh xạ cơ sở`);
    }

    if (drug._count.companyDrugs > 0) {
        reasons.push(`${drug._count.companyDrugs} thuốc công ty`);
    }

    if (drug._count.drugOrderLines > 0) {
        reasons.push(`${drug._count.drugOrderLines} dòng đặt hàng`);
    }

    return reasons.length > 0
        ? `Đang có ${reasons.join(", ")}`
        : null;
};

export async function GET() {
    try {
        await requireActiveSessionUser("ADMIN");

        const drugs = await prisma.masterDrug.findMany({
            where: {
                soDangKy: {
                    not: null,
                },
            },
            select: {
                id: true,
                maChung: true,
                tenThuoc: true,
                hoatChat: true,
                hamLuong: true,
                dangBaoChe: true,
                soDangKy: true,
                quyCach: true,
                donViTinh: true,
                isActive: true,
                _count: {
                    select: {
                        drugMaps: true,
                        companyDrugs: true,
                        drugOrderLines: true,
                    },
                },
            },
            orderBy: [
                { soDangKy: "asc" },
                { tenThuoc: "asc" },
            ],
        });

        const grouped = new Map<string, typeof drugs>();
        for (const drug of drugs) {
            const key = normalizeRegistration(drug.soDangKy);
            if (!key) continue;
            grouped.set(key, [...(grouped.get(key) || []), drug]);
        }

        const groups = Array.from(grouped.entries())
            .filter(([, items]) => items.length > 1)
            .map(([soDangKy, items]) => ({
                soDangKy,
                count: items.length,
                activeCount: items.filter((item) => item.isActive).length,
                items: items.map((item) => {
                    const referenceCount = getReferenceCount(item);

                    return {
                        id: item.id,
                        maChung: item.maChung,
                        tenThuoc: item.tenThuoc,
                        hoatChat: item.hoatChat,
                        hamLuong: item.hamLuong,
                        dangBaoChe: item.dangBaoChe,
                        soDangKy: item.soDangKy,
                        quyCach: item.quyCach,
                        donViTinh: item.donViTinh,
                        isActive: item.isActive,
                        referenceCount,
                        canDelete: referenceCount === 0,
                        deleteBlockReason: getDeleteBlockReason(item),
                    };
                }),
            }))
            .sort((left, right) => right.count - left.count || left.soDangKy.localeCompare(right.soDangKy));

        return NextResponse.json({
            summary: {
                duplicateRegistrationCount: groups.length,
                duplicateDrugCount: groups.reduce((sum, group) => sum + group.count, 0),
            },
            groups,
        });
    } catch (error) {
        if (isRouteError(error)) {
            return NextResponse.json({ message: error.message }, { status: error.status });
        }

        console.error("Error fetching duplicate registrations:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}
