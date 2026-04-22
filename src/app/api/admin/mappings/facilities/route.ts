import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";

const LIST_TABS = ["pending", "summary"] as const;
type ListTab = (typeof LIST_TABS)[number];

const DEFAULT_LIMIT = 10;

function parseTab(value: string | null): ListTab {
    return LIST_TABS.includes(value as ListTab) ? (value as ListTab) : "pending";
}

function parsePositiveInt(value: string | null, fallback: number) {
    const parsed = Number.parseInt(value || "", 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function toAggregateMap<T extends { facilityId: string }>(rows: T[]) {
    return new Map(rows.map((row) => [row.facilityId, row]));
}

function getGroupedCount(
    row:
        | {
            _count?: true | { facilityId?: number | null };
        }
        | undefined,
) {
    if (!row || typeof row._count !== "object" || !row._count) {
        return 0;
    }

    return row._count.facilityId || 0;
}

export async function GET(request: Request) {
    try {
        const session = await auth();
        if (!session || session.user.role !== "ADMIN") {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const tab = parseTab(searchParams.get("tab"));
        const page = parsePositiveInt(searchParams.get("page"), 1);
        const limit = parsePositiveInt(searchParams.get("limit"), DEFAULT_LIMIT);

        const listWhere = tab === "pending"
            ? {
                status: "WAITING_APPROVAL" as const,
                facility: {
                    role: "FACILITY" as const,
                },
            }
            : {
                facility: {
                    role: "FACILITY" as const,
                },
            };

        const total = await prisma.user.count({
            where: tab === "pending"
                ? {
                    role: "FACILITY",
                    drugMaps: {
                        some: {
                            status: "WAITING_APPROVAL",
                        },
                    },
                }
                : {
                    role: "FACILITY",
                    drugMaps: {
                        some: {},
                    },
                },
        });

        const totalPages = Math.max(1, Math.ceil(total / limit));
        const safePage = Math.min(page, totalPages);

        const facilityGroups = total === 0
            ? []
            : await prisma.facilityDrugMap.groupBy({
                by: ["facilityId"],
                where: listWhere,
                _max: tab === "pending"
                    ? {
                        createdAt: true,
                    }
                    : {
                        updatedAt: true,
                    },
                orderBy: tab === "pending"
                    ? {
                        _max: {
                            createdAt: "desc",
                        },
                    }
                    : {
                        _max: {
                            updatedAt: "desc",
                        },
                    },
                skip: (safePage - 1) * limit,
                take: limit,
            });

        const pageFacilityIds = facilityGroups.map((group) => group.facilityId);

        if (pageFacilityIds.length === 0) {
            return NextResponse.json({
                items: [],
                pagination: {
                    page: safePage,
                    limit,
                    total,
                    totalPages,
                },
            });
        }

        const [
            facilities,
            totalCounts,
            pendingCounts,
            approvedCounts,
            rejectedCounts,
            successCounts,
            processedActivity,
        ] = await prisma.$transaction([
            prisma.user.findMany({
                where: {
                    id: {
                        in: pageFacilityIds,
                    },
                },
                select: {
                    id: true,
                    facilityCode: true,
                    facilityName: true,
                },
            }),
            prisma.facilityDrugMap.groupBy({
                by: ["facilityId"],
                where: {
                    facilityId: {
                        in: pageFacilityIds,
                    },
                },
                _count: {
                    facilityId: true,
                },
                _max: {
                    updatedAt: true,
                },
                orderBy: {
                    facilityId: "asc",
                },
            }),
            prisma.facilityDrugMap.groupBy({
                by: ["facilityId"],
                where: {
                    facilityId: {
                        in: pageFacilityIds,
                    },
                    status: "WAITING_APPROVAL",
                },
                _count: {
                    facilityId: true,
                },
                _max: {
                    createdAt: true,
                },
                orderBy: {
                    facilityId: "asc",
                },
            }),
            prisma.facilityDrugMap.groupBy({
                by: ["facilityId"],
                where: {
                    facilityId: {
                        in: pageFacilityIds,
                    },
                    status: "APPROVED",
                },
                _count: {
                    facilityId: true,
                },
                orderBy: {
                    facilityId: "asc",
                },
            }),
            prisma.facilityDrugMap.groupBy({
                by: ["facilityId"],
                where: {
                    facilityId: {
                        in: pageFacilityIds,
                    },
                    status: "REJECTED",
                },
                _count: {
                    facilityId: true,
                },
                orderBy: {
                    facilityId: "asc",
                },
            }),
            prisma.facilityDrugMap.groupBy({
                by: ["facilityId"],
                where: {
                    facilityId: {
                        in: pageFacilityIds,
                    },
                    status: {
                        in: ["APPROVED", "AUTO_MAPPED"],
                    },
                },
                _count: {
                    facilityId: true,
                },
                orderBy: {
                    facilityId: "asc",
                },
            }),
            prisma.facilityDrugMap.groupBy({
                by: ["facilityId"],
                where: {
                    facilityId: {
                        in: pageFacilityIds,
                    },
                    status: {
                        in: ["APPROVED", "REJECTED"],
                    },
                },
                _max: {
                    updatedAt: true,
                },
                orderBy: {
                    facilityId: "asc",
                },
            }),
        ]);

        const facilityMap = new Map(
            facilities.map((facility) => [
                facility.id,
                {
                    facilityCode: facility.facilityCode || "—",
                    facilityName: facility.facilityName || "—",
                },
            ]),
        );
        const totalMap = toAggregateMap(totalCounts);
        const pendingMap = toAggregateMap(pendingCounts);
        const approvedMap = toAggregateMap(approvedCounts);
        const rejectedMap = toAggregateMap(rejectedCounts);
        const successMap = toAggregateMap(successCounts);
        const processedMap = toAggregateMap(processedActivity);

        const items = pageFacilityIds.map((facilityId) => {
            const facility = facilityMap.get(facilityId);
            const totalInfo = totalMap.get(facilityId);
            const pendingInfo = pendingMap.get(facilityId);
            const approvedInfo = approvedMap.get(facilityId);
            const rejectedInfo = rejectedMap.get(facilityId);
            const successInfo = successMap.get(facilityId);
            const processedInfo = processedMap.get(facilityId);

            return {
                facilityCode: facility?.facilityCode || "—",
                facilityName: facility?.facilityName || "—",
                pendingCount: getGroupedCount(pendingInfo),
                approvedCount: getGroupedCount(approvedInfo),
                rejectedCount: getGroupedCount(rejectedInfo),
                totalUploaded: getGroupedCount(totalInfo),
                successCount: getGroupedCount(successInfo),
                lastRequestDate: pendingInfo?._max?.createdAt || null,
                lastApprovalDate: processedInfo?._max?.updatedAt || null,
                lastActivityDate: totalInfo?._max?.updatedAt || null,
            };
        });

        return NextResponse.json({
            items,
            pagination: {
                page: safePage,
                limit,
                total,
                totalPages,
            },
        });
    } catch (error) {
        console.error("Error fetching admin mapping facilities:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}
