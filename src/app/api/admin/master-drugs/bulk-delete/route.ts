import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";

function parseIds(value: unknown): string[] {
    if (!Array.isArray(value)) {
        return [];
    }

    const ids: string[] = [];
    for (const item of value) {
        if (typeof item !== "string") {
            continue;
        }

        const id = item.trim();
        if (id) {
            ids.push(id);
        }
    }

    return Array.from(new Set(ids));
}

export async function POST(request: Request) {
    try {
        const session = await auth();
        if (!session || session.user.role !== "ADMIN") {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const ids = parseIds(body.ids);

        if (ids.length === 0) {
            return NextResponse.json({ message: "Chưa chọn thuốc để xóa" }, { status: 400 });
        }

        const mappingCounts = await prisma.facilityDrugMap.groupBy({
            by: ["masterDrugId"],
            where: {
                masterDrugId: { in: ids },
            },
            _count: {
                _all: true,
            },
        });
        const mappedIds = mappingCounts
            .map((item) => item.masterDrugId)
            .filter((id): id is string => Boolean(id));
        const mappingCountByDrugId = new Map(
            mappingCounts
                .filter((item): item is typeof item & { masterDrugId: string } => Boolean(item.masterDrugId))
                .map((item) => [item.masterDrugId, item._count._all]),
        );

        const mappedDrugs = await prisma.masterDrug.findMany({
            where: {
                id: { in: mappedIds },
            },
            select: {
                id: true,
                maChung: true,
                tenThuoc: true,
            },
            orderBy: { tenThuoc: "asc" },
            take: 5,
        });

        if (mappedDrugs.length > 0) {
            const mappedDrugText = mappedDrugs
                .map((drug) => `${drug.maChung} - ${drug.tenThuoc} (${mappingCountByDrugId.get(drug.id) || 0} ánh xạ)`)
                .join("; ");

            return NextResponse.json(
                {
                    message: `Không thể xóa vì có thuốc đang được ánh xạ. Hãy gỡ ánh xạ trước: ${mappedDrugText}`,
                },
                { status: 409 },
            );
        }

        const result = await prisma.masterDrug.deleteMany({
            where: { id: { in: ids } },
        });

        return NextResponse.json({
            message: "Đã xóa thuốc đã chọn",
            deletedCount: result.count,
        });
    } catch (error) {
        console.error("Error bulk deleting master drugs:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}
