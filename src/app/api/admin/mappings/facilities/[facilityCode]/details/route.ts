import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";

const DETAIL_VIEW_MODES = ["pending", "all"] as const;
type DetailViewMode = (typeof DETAIL_VIEW_MODES)[number];

const DEFAULT_LIMIT = 50;

function parseViewMode(value: string | null): DetailViewMode {
    return DETAIL_VIEW_MODES.includes(value as DetailViewMode)
        ? (value as DetailViewMode)
        : "pending";
}

function parsePositiveInt(value: string | null, fallback: number) {
    const parsed = Number.parseInt(value || "", 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export async function GET(
    request: Request,
    { params }: { params: Promise<{ facilityCode: string }> },
) {
    try {
        const session = await auth();
        if (!session || session.user.role !== "ADMIN") {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const { facilityCode } = await params;
        const { searchParams } = new URL(request.url);
        const viewMode = parseViewMode(searchParams.get("viewMode"));
        const page = parsePositiveInt(searchParams.get("page"), 1);
        const limit = parsePositiveInt(searchParams.get("limit"), DEFAULT_LIMIT);

        const facility = await prisma.user.findFirst({
            where: {
                facilityCode,
                role: "FACILITY",
            },
            select: {
                id: true,
                facilityCode: true,
                facilityName: true,
            },
        });

        if (!facility) {
            return NextResponse.json({ message: "Facility not found" }, { status: 404 });
        }

        const detailWhere = {
            facilityId: facility.id,
            ...(viewMode === "pending" ? { status: "WAITING_APPROVAL" as const } : {}),
        };

        const [pendingCount, total] = await Promise.all([
            prisma.facilityDrugMap.count({
                where: {
                    facilityId: facility.id,
                    status: "WAITING_APPROVAL",
                },
            }),
            prisma.facilityDrugMap.count({
                where: detailWhere,
            }),
        ]);

        const totalPages = Math.max(1, Math.ceil(total / limit));
        const safePage = Math.min(page, totalPages);

        const mappings = total === 0
            ? []
            : await prisma.facilityDrugMap.findMany({
                where: detailWhere,
                include: {
                    masterDrug: {
                        select: {
                            id: true,
                            maChung: true,
                            tenThuoc: true,
                            hoatChat: true,
                            soDangKy: true,
                        },
                    },
                },
                orderBy: {
                    updatedAt: "desc",
                },
                skip: (safePage - 1) * limit,
                take: limit,
            });

        return NextResponse.json({
            facility: {
                facilityCode: facility.facilityCode || "—",
                facilityName: facility.facilityName || "—",
                pendingCount,
            },
            items: mappings,
            pagination: {
                page: safePage,
                limit,
                total,
                totalPages,
            },
        });
    } catch (error) {
        console.error("Error fetching admin mapping facility detail:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}
