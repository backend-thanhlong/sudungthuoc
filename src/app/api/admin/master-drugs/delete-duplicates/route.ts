import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { isRouteError, requireActiveSessionUser } from "@/lib/server-authz";

const normalizeDuplicateValue = (value: string | null | undefined) =>
    (value || "").trim().replace(/\s+/g, " ").toUpperCase();

const buildDuplicateKey = (drug: {
    soDangKy: string | null;
    tenThuoc: string;
    hamLuong: string | null;
}) => {
    const soDangKy = normalizeDuplicateValue(drug.soDangKy);
    const tenThuoc = normalizeDuplicateValue(drug.tenThuoc);

    if (!soDangKy || !tenThuoc) {
        return "";
    }

    return [
        soDangKy,
        tenThuoc,
        normalizeDuplicateValue(drug.hamLuong),
    ].join("\u001F");
};

const getReferenceCount = (drug: {
    _count: {
        drugMaps: number;
        companyDrugs: number;
        drugOrderLines: number;
    };
}) => drug._count.drugMaps + drug._count.companyDrugs + drug._count.drugOrderLines;

export async function POST() {
    try {
        await requireActiveSessionUser("ADMIN");

        const drugs = await prisma.masterDrug.findMany({
            select: {
                id: true,
                maChung: true,
                tenThuoc: true,
                hamLuong: true,
                soDangKy: true,
                isActive: true,
                createdAt: true,
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
                { createdAt: "asc" },
                { id: "asc" },
            ],
        });

        const grouped = new Map<string, typeof drugs>();
        for (const drug of drugs) {
            const key = buildDuplicateKey(drug);
            if (!key) {
                continue;
            }

            grouped.set(key, [...(grouped.get(key) || []), drug]);
        }

        const idsToDelete: string[] = [];
        const affectedGroups: Array<{
            soDangKy: string;
            tenThuoc: string;
            hamLuong: string | null;
            keptDrugId: string;
            keptMaChung: string;
            deletedCount: number;
            skippedLinkedCount: number;
        }> = [];

        for (const items of grouped.values()) {
            if (items.length < 2) {
                continue;
            }

            const sortedItems = [...items].sort((left, right) => {
                const referenceDelta = getReferenceCount(right) - getReferenceCount(left);
                if (referenceDelta !== 0) return referenceDelta;

                if (left.isActive !== right.isActive) {
                    return left.isActive ? -1 : 1;
                }

                const createdAtDelta = left.createdAt.getTime() - right.createdAt.getTime();
                if (createdAtDelta !== 0) return createdAtDelta;

                return left.id.localeCompare(right.id);
            });

            const keeper = sortedItems[0];
            const duplicates = sortedItems.slice(1);
            const deletableDuplicates = duplicates.filter((drug) => getReferenceCount(drug) === 0);
            const skippedLinkedCount = duplicates.length - deletableDuplicates.length;

            if (deletableDuplicates.length === 0) {
                continue;
            }

            idsToDelete.push(...deletableDuplicates.map((drug) => drug.id));
            affectedGroups.push({
                soDangKy: keeper.soDangKy || "",
                tenThuoc: keeper.tenThuoc,
                hamLuong: keeper.hamLuong,
                keptDrugId: keeper.id,
                keptMaChung: keeper.maChung,
                deletedCount: deletableDuplicates.length,
                skippedLinkedCount,
            });
        }

        const result = idsToDelete.length > 0
            ? await prisma.masterDrug.deleteMany({
                where: {
                    id: {
                        in: idsToDelete,
                    },
                    drugMaps: { none: {} },
                    companyDrugs: { none: {} },
                    drugOrderLines: { none: {} },
                },
            })
            : { count: 0 };

        return NextResponse.json({
            message: "Đã xóa dòng trùng",
            deletedCount: result.count,
            affectedGroupCount: affectedGroups.length,
            skippedLinkedCount: affectedGroups.reduce((sum, group) => sum + group.skippedLinkedCount, 0),
            groups: affectedGroups.slice(0, 20),
        });
    } catch (error) {
        if (isRouteError(error)) {
            return NextResponse.json({ message: error.message }, { status: error.status });
        }

        console.error("Error deleting duplicate master drugs:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}
