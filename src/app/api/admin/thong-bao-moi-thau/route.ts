import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/../prisma/generated/client";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;

interface FacilitySummaryRow {
    facilityId: string;
    facilityName: string;
    facilityCode: string | null;
    tbmtCount: number | bigint | null;
    totalPackages: number | bigint | null;
    activeCount: number | bigint | null;
    latestPublishedAt: Date | string | null;
    latestCreatedAt: Date | string | null;
    latestClosingAt: Date | string | null;
}

interface SummaryRow {
    totalTBMT: number | bigint | null;
    totalFacilities: number | bigint | null;
    totalPackages: number | bigint | null;
    activeTBMTCount: number | bigint | null;
}

interface FacilityOptionRow {
    id: string;
    facilityName: string;
    facilityCode: string | null;
}

const BASE_FROM_SQL = Prisma.sql`
    FROM thong_bao_moi_thau tb
    INNER JOIN goi_thau gt ON gt.id = tb.goi_thau_id
    INNER JOIN ke_hoach_lcnt kh ON kh.id = gt.ke_hoach_id
    INNER JOIN users u ON u.id = kh.facility_id
`;

function parsePage(value: string | null) {
    const parsed = Number.parseInt(value || "", 10);

    if (!Number.isFinite(parsed) || parsed < 1) {
        return DEFAULT_PAGE;
    }

    return parsed;
}

function parseLimit(value: string | null) {
    const parsed = Number.parseInt(value || "", 10);

    if (!Number.isFinite(parsed) || parsed < 1) {
        return DEFAULT_LIMIT;
    }

    return parsed;
}

function parseNumber(value: unknown) {
    if (value === null || value === undefined) {
        return 0;
    }

    if (typeof value === "bigint") {
        return Number(value);
    }

    if (typeof value === "number") {
        return value;
    }

    const parsed = Number(value);
    return Number.isNaN(parsed) ? 0 : parsed;
}

function serializeDate(value: Date | string | null | undefined) {
    if (!value) {
        return null;
    }

    if (value instanceof Date) {
        return value.toISOString();
    }

    return new Date(value).toISOString();
}

function buildSearchWhereSql(searchTerm: string, facilityId: string) {
    const clauses: Prisma.Sql[] = [];

    if (facilityId && facilityId !== "all") {
        clauses.push(Prisma.sql`kh.facility_id = ${facilityId}`);
    }

    if (searchTerm) {
        const pattern = `%${searchTerm}%`;
        clauses.push(Prisma.sql`
            (
                COALESCE(tb.ma_tbmt, '') ILIKE ${pattern}
                OR COALESCE(gt.ten_goi_thau, '') ILIKE ${pattern}
                OR COALESCE(kh.ma_khlcnt, '') ILIKE ${pattern}
                OR COALESCE(kh.ten_khlcnt, '') ILIKE ${pattern}
                OR COALESCE(u.facility_name, '') ILIKE ${pattern}
                OR COALESCE(u.facility_code, '') ILIKE ${pattern}
                OR COALESCE(u.username, '') ILIKE ${pattern}
            )
        `);
    }

    if (clauses.length === 0) {
        return Prisma.empty;
    }

    return Prisma.sql`WHERE ${Prisma.join(clauses, " AND ")}`;
}

function buildRecordWhere(pageFacilityIds: string[], searchTerm: string): Prisma.ThongBaoMoiThauWhereInput {
    const where: Prisma.ThongBaoMoiThauWhereInput = {
        goiThau: {
            keHoach: {
                facilityId: {
                    in: pageFacilityIds,
                },
            },
        },
    };

    if (!searchTerm) {
        return where;
    }

    const containsFilter = {
        contains: searchTerm,
        mode: "insensitive" as const,
    };

    where.OR = [
        {
            maTBMT: containsFilter,
        },
        {
            goiThau: {
                tenGoiThau: containsFilter,
            },
        },
        {
            goiThau: {
                keHoach: {
                    maKHLCNT: containsFilter,
                },
            },
        },
        {
            goiThau: {
                keHoach: {
                    tenKHLCNT: containsFilter,
                },
            },
        },
        {
            goiThau: {
                keHoach: {
                    facility: {
                        facilityName: containsFilter,
                    },
                },
            },
        },
        {
            goiThau: {
                keHoach: {
                    facility: {
                        facilityCode: containsFilter,
                    },
                },
            },
        },
        {
            goiThau: {
                keHoach: {
                    facility: {
                        username: containsFilter,
                    },
                },
            },
        },
    ];

    return where;
}

export async function GET(req: NextRequest) {
    try {
        const session = await auth();
        if (!session || session.user.role !== "ADMIN") {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const page = parsePage(searchParams.get("page"));
        const limit = parseLimit(searchParams.get("limit"));
        const facilityId = searchParams.get("facilityId") || "all";
        const searchTerm = searchParams.get("searchTerm")?.trim() || "";
        const whereSql = buildSearchWhereSql(searchTerm, facilityId);

        const [summaryRows, facilityOptions] = await Promise.all([
            prisma.$queryRaw<SummaryRow[]>(Prisma.sql`
                SELECT
                    COUNT(tb.id) AS "totalTBMT",
                    COUNT(DISTINCT kh.facility_id) AS "totalFacilities",
                    COUNT(DISTINCT gt.id) AS "totalPackages",
                    COUNT(tb.id) FILTER (WHERE tb.ngay_dong_thau >= NOW()) AS "activeTBMTCount"
                ${BASE_FROM_SQL}
                ${whereSql}
            `),
            prisma.$queryRaw<FacilityOptionRow[]>(Prisma.sql`
                SELECT DISTINCT
                    u.id AS "id",
                    COALESCE(u.facility_name, u.facility_code, u.username) AS "facilityName",
                    u.facility_code AS "facilityCode"
                ${BASE_FROM_SQL}
                ORDER BY "facilityName" ASC
            `),
        ]);

        const summaryRow = summaryRows[0];
        const total = Math.max(0, parseNumber(summaryRow?.totalFacilities));
        const totalPages = Math.max(1, Math.ceil(total / limit));
        const safePage = Math.min(page, totalPages);
        const skip = (safePage - 1) * limit;

        const facilityGroups = total === 0
            ? []
            : await prisma.$queryRaw<FacilitySummaryRow[]>(Prisma.sql`
                SELECT
                    u.id AS "facilityId",
                    COALESCE(u.facility_name, u.facility_code, u.username) AS "facilityName",
                    u.facility_code AS "facilityCode",
                    COUNT(tb.id) AS "tbmtCount",
                    COUNT(DISTINCT gt.id) AS "totalPackages",
                    COUNT(tb.id) FILTER (WHERE tb.ngay_dong_thau >= NOW()) AS "activeCount",
                    MAX(tb.ngay_dang_tai) AS "latestPublishedAt",
                    MAX(tb.created_at) AS "latestCreatedAt",
                    MAX(tb.ngay_dong_thau) AS "latestClosingAt"
                ${BASE_FROM_SQL}
                ${whereSql}
                GROUP BY u.id, u.facility_name, u.facility_code, u.username
                ORDER BY
                    MAX(tb.ngay_dang_tai) DESC NULLS LAST,
                    MAX(tb.created_at) DESC,
                    COALESCE(u.facility_name, u.facility_code, u.username) ASC
                LIMIT ${limit}
                OFFSET ${skip}
            `);

        const pageFacilityIds = facilityGroups.map((group) => group.facilityId);
        const pageRecords = pageFacilityIds.length === 0
            ? []
            : await prisma.thongBaoMoiThau.findMany({
                where: buildRecordWhere(pageFacilityIds, searchTerm),
                select: {
                    id: true,
                    maTBMT: true,
                    ngayDangTai: true,
                    soQdPheDuyetHSMT: true,
                    ngayPheDuyetHSMT: true,
                    ngayDongThau: true,
                    createdAt: true,
                    goiThau: {
                        select: {
                            id: true,
                            tenGoiThau: true,
                            giaGoiThau: true,
                            soLuongPhanLo: true,
                            keHoach: {
                                select: {
                                    id: true,
                                    facilityId: true,
                                    maKHLCNT: true,
                                    tenKHLCNT: true,
                                    facility: {
                                        select: {
                                            id: true,
                                            facilityName: true,
                                            facilityCode: true,
                                            username: true,
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
                orderBy: [
                    {
                        ngayDangTai: "desc",
                    },
                    {
                        createdAt: "desc",
                    },
                ],
            });

        const facilityRecordsMap = new Map<
            string,
            Array<{
                id: string;
                maTBMT: string;
                ngayDangTai: string;
                soQdPheDuyetHSMT: string;
                ngayPheDuyetHSMT: string;
                ngayDongThau: string;
                createdAt: string;
                goiThau: {
                    id: string;
                    tenGoiThau: string;
                    giaGoiThau: number | null;
                    soLuongPhanLo: number | null;
                    keHoach: {
                        id: string;
                        maKHLCNT: string | null;
                        tenKHLCNT: string | null;
                        facility: {
                            id: string;
                            facilityName: string;
                            facilityCode: string;
                        };
                    };
                };
            }>
        >();

        pageRecords.forEach((record) => {
            const facilityKey = record.goiThau.keHoach.facilityId;
            const item = {
                id: record.id,
                maTBMT: record.maTBMT,
                ngayDangTai: record.ngayDangTai.toISOString(),
                soQdPheDuyetHSMT: record.soQdPheDuyetHSMT,
                ngayPheDuyetHSMT: record.ngayPheDuyetHSMT.toISOString(),
                ngayDongThau: record.ngayDongThau.toISOString(),
                createdAt: record.createdAt.toISOString(),
                goiThau: {
                    id: record.goiThau.id,
                    tenGoiThau: record.goiThau.tenGoiThau,
                    giaGoiThau: record.goiThau.giaGoiThau ? Number(record.goiThau.giaGoiThau) : null,
                    soLuongPhanLo: record.goiThau.soLuongPhanLo,
                    keHoach: {
                        id: record.goiThau.keHoach.id,
                        maKHLCNT: record.goiThau.keHoach.maKHLCNT,
                        tenKHLCNT: record.goiThau.keHoach.tenKHLCNT,
                        facility: {
                            id: record.goiThau.keHoach.facility.id,
                            facilityName: record.goiThau.keHoach.facility.facilityName
                                || record.goiThau.keHoach.facility.facilityCode
                                || record.goiThau.keHoach.facility.username,
                            facilityCode: record.goiThau.keHoach.facility.facilityCode || "—",
                        },
                    },
                },
            };

            const existing = facilityRecordsMap.get(facilityKey);
            if (existing) {
                existing.push(item);
                return;
            }

            facilityRecordsMap.set(facilityKey, [item]);
        });

        const data = facilityGroups.map((group) => ({
            facilityId: group.facilityId,
            facilityName: group.facilityName,
            facilityCode: group.facilityCode || "—",
            tbmtCount: parseNumber(group.tbmtCount),
            totalPackages: parseNumber(group.totalPackages),
            activeCount: parseNumber(group.activeCount),
            latestPublishedAt: serializeDate(group.latestPublishedAt),
            latestCreatedAt: serializeDate(group.latestCreatedAt),
            latestClosingAt: serializeDate(group.latestClosingAt),
            tbmts: facilityRecordsMap.get(group.facilityId) || [],
        }));

        return NextResponse.json({
            data,
            metadata: {
                page: safePage,
                limit,
                total,
                totalPages,
                summary: {
                    totalTBMT: parseNumber(summaryRow?.totalTBMT),
                    totalFacilities: total,
                    totalPackages: parseNumber(summaryRow?.totalPackages),
                    activeTBMTCount: parseNumber(summaryRow?.activeTBMTCount),
                },
                facilities: facilityOptions.map((facility) => ({
                    id: facility.id,
                    facilityName: facility.facilityName,
                    facilityCode: facility.facilityCode || "—",
                })),
            },
        });
    } catch (error) {
        console.error("Error fetching admin thong bao moi thau:", error);
        return NextResponse.json(
            { message: "Internal server error" },
            { status: 500 }
        );
    }
}
