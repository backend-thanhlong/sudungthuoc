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
    resultCount: number | bigint;
    totalMatHangTrungThau: number | bigint | null;
    tongGiaTriTrungThau: number | string | null;
    latestApprovedAt: Date | string | null;
    latestCreatedAt: Date | string | null;
}

interface SummaryRow {
    totalResults: number | bigint | null;
    totalFacilities: number | bigint | null;
    totalMatHangTrungThau: number | bigint | null;
    tongGiaTriTrungThau: number | string | null;
}

interface FacilityOptionRow {
    id: string;
    facilityName: string;
    facilityCode: string | null;
}

const BASE_FROM_SQL = Prisma.sql`
    FROM ket_qua_lcnt kq
    INNER JOIN goi_thau gt ON gt.id = kq.goi_thau_id
    INNER JOIN ke_hoach_lcnt kh ON kh.id = gt.ke_hoach_id
    INNER JOIN users u ON u.id = kh.facility_id
    INNER JOIN thong_bao_moi_thau tb ON tb.id = kq.thong_bao_moi_thau_id
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
                COALESCE(u.facility_name, u.username, '') ILIKE ${pattern}
                OR COALESCE(kh.ma_khlcnt, '') ILIKE ${pattern}
                OR COALESCE(gt.ten_goi_thau, '') ILIKE ${pattern}
                OR COALESCE(tb.ma_tbmt, '') ILIKE ${pattern}
                OR COALESCE(kq.so_qd_phe_duyet_kqlcnt, '') ILIKE ${pattern}
            )
        `);
    }

    if (clauses.length === 0) {
        return Prisma.empty;
    }

    return Prisma.sql`WHERE ${Prisma.join(clauses, " AND ")}`;
}

function buildResultWhere(pageFacilityIds: string[], searchTerm: string): Prisma.KetQuaLCNTWhereInput {
    const where: Prisma.KetQuaLCNTWhereInput = {
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
                        username: containsFilter,
                    },
                },
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
                tenGoiThau: containsFilter,
            },
        },
        {
            thongBaoMoiThau: {
                maTBMT: containsFilter,
            },
        },
        {
            soQdPheDuyetKQLCNT: containsFilter,
        },
    ];

    return where;
}

// GET /api/admin/ket-qua-lcnt
// List LCNT results grouped by facility with server-side pagination
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
                    COUNT(kq.id) AS "totalResults",
                    COUNT(DISTINCT kh.facility_id) AS "totalFacilities",
                    COALESCE(SUM(kq.so_mat_hang_trung_thau), 0) AS "totalMatHangTrungThau",
                    COALESCE(SUM(kq.tong_gia_tri_trung_thau), 0) AS "tongGiaTriTrungThau"
                ${BASE_FROM_SQL}
                ${whereSql}
            `),
            prisma.$queryRaw<FacilityOptionRow[]>(Prisma.sql`
                SELECT DISTINCT
                    u.id AS "id",
                    COALESCE(u.facility_name, u.username) AS "facilityName",
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
                    COALESCE(u.facility_name, u.username) AS "facilityName",
                    u.facility_code AS "facilityCode",
                    COUNT(kq.id) AS "resultCount",
                    COALESCE(SUM(kq.so_mat_hang_trung_thau), 0) AS "totalMatHangTrungThau",
                    COALESCE(SUM(kq.tong_gia_tri_trung_thau), 0) AS "tongGiaTriTrungThau",
                    MAX(kq.ngay_phe_duyet_kqlcnt) AS "latestApprovedAt",
                    MAX(kq.created_at) AS "latestCreatedAt"
                ${BASE_FROM_SQL}
                ${whereSql}
                GROUP BY u.id, u.facility_name, u.username, u.facility_code
                ORDER BY
                    MAX(kq.ngay_phe_duyet_kqlcnt) DESC NULLS LAST,
                    MAX(kq.created_at) DESC,
                    COALESCE(u.facility_name, u.username) ASC
                LIMIT ${limit}
                OFFSET ${skip}
            `);

        const pageFacilityIds = facilityGroups.map((group) => group.facilityId);
        const pageResults = pageFacilityIds.length === 0
            ? []
            : await prisma.ketQuaLCNT.findMany({
                where: buildResultWhere(pageFacilityIds, searchTerm),
                include: {
                    goiThau: {
                        include: {
                            keHoach: {
                                include: {
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
                    thongBaoMoiThau: true,
                },
                orderBy: [
                    {
                        ngayPheDuyetKQLCNT: "desc",
                    },
                    {
                        createdAt: "desc",
                    },
                ],
            });

        const facilityResultsMap = new Map<
            string,
            Array<{
                id: string;
                facilityId: string;
                facilityName: string;
                facilityCode: string;
                maKHLCNT: string | null;
                tenKHLCNT: string | null;
                tenGoiThau: string;
                giaGoiThau: number | null;
                maTBMT: string;
                ngayDangTaiTBMT: string;
                soQdPheDuyetKQLCNT: string;
                ngayPheDuyetKQLCNT: string;
                soMatHangMoiThau: number;
                soMatHangTrungThau: number;
                tongGiaTriTrungThau: number;
                createdAt: string;
            }>
        >();

        pageResults.forEach((ketQua) => {
            const item = {
                id: ketQua.id,
                facilityId: ketQua.goiThau.keHoach.facilityId,
                facilityName: ketQua.goiThau.keHoach.facility.facilityName || ketQua.goiThau.keHoach.facility.username,
                facilityCode: ketQua.goiThau.keHoach.facility.facilityCode || "—",
                maKHLCNT: ketQua.goiThau.keHoach.maKHLCNT,
                tenKHLCNT: ketQua.goiThau.keHoach.tenKHLCNT,
                tenGoiThau: ketQua.goiThau.tenGoiThau,
                giaGoiThau: ketQua.goiThau.giaGoiThau ? Number(ketQua.goiThau.giaGoiThau) : null,
                maTBMT: ketQua.thongBaoMoiThau.maTBMT,
                ngayDangTaiTBMT: ketQua.thongBaoMoiThau.ngayDangTai.toISOString(),
                soQdPheDuyetKQLCNT: ketQua.soQdPheDuyetKQLCNT,
                ngayPheDuyetKQLCNT: ketQua.ngayPheDuyetKQLCNT.toISOString(),
                soMatHangMoiThau: ketQua.soMatHangMoiThau,
                soMatHangTrungThau: ketQua.soMatHangTrungThau,
                tongGiaTriTrungThau: Number(ketQua.tongGiaTriTrungThau),
                createdAt: ketQua.createdAt.toISOString(),
            };

            const existing = facilityResultsMap.get(item.facilityId);
            if (existing) {
                existing.push(item);
                return;
            }

            facilityResultsMap.set(item.facilityId, [item]);
        });

        const data = facilityGroups.map((group) => ({
            facilityId: group.facilityId,
            facilityName: group.facilityName,
            facilityCode: group.facilityCode || "—",
            resultCount: parseNumber(group.resultCount),
            totalMatHangTrungThau: parseNumber(group.totalMatHangTrungThau),
            tongGiaTriTrungThau: parseNumber(group.tongGiaTriTrungThau),
            latestApprovedAt: serializeDate(group.latestApprovedAt),
            latestCreatedAt: serializeDate(group.latestCreatedAt),
            results: facilityResultsMap.get(group.facilityId) || [],
        }));

        return NextResponse.json({
            data,
            metadata: {
                page: safePage,
                limit,
                total,
                totalPages,
                summary: {
                    totalResults: parseNumber(summaryRow?.totalResults),
                    totalFacilities: total,
                    totalMatHangTrungThau: parseNumber(summaryRow?.totalMatHangTrungThau),
                    tongGiaTriTrungThau: parseNumber(summaryRow?.tongGiaTriTrungThau),
                },
                facilities: facilityOptions.map((facility) => ({
                    id: facility.id,
                    facilityName: facility.facilityName,
                    facilityCode: facility.facilityCode || "—",
                })),
            },
        });
    } catch (error) {
        console.error("Error fetching admin ket qua LCNT:", error);
        return NextResponse.json(
            { message: "Internal server error" },
            { status: 500 }
        );
    }
}
