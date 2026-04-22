import { type Prisma } from "@/../prisma/generated/client";
import prisma from "@/lib/prisma";

export const DEFAULT_PROCUREMENT_LOOKUP_PAGE = 1;
export const DEFAULT_PROCUREMENT_LOOKUP_LIMIT = 20;

export const PROCUREMENT_STATUS_FILTERS = [
    "all",
    "no_tbmt",
    "has_tbmt_no_kqlcnt",
    "has_kqlcnt",
] as const;

export const PROCUREMENT_TYPE_FILTERS = [
    "all",
    "Thuốc",
    "Hóa chất, vật tư, thiết bị y tế",
] as const;

export type ProcurementStatusFilter = (typeof PROCUREMENT_STATUS_FILTERS)[number];
export type ProcurementTypeFilter = (typeof PROCUREMENT_TYPE_FILTERS)[number];

export type ProcurementStatusLabel =
    | "Chưa có TBMT"
    | "Đã có TBMT, chưa có KQLCNT"
    | "Đã có KQLCNT";

export interface ProcurementLookupQuery {
    page: number;
    limit: number;
    searchTerm: string;
    procurementStatus: ProcurementStatusFilter;
    procurementType: ProcurementTypeFilter;
    fromDate: string;
    toDate: string;
    facilityId: string;
}

export interface ProcurementLookupFacilityOption {
    id: string;
    facilityName: string;
    facilityCode: string | null;
}

export interface ProcurementLookupSummary {
    totalPackages: number;
    chuaCoTBMT: number;
    daCoTBMTChuaCoKQLCNT: number;
    daCoKQLCNT: number;
}

export interface ProcurementLookupPhanLoResult {
    phanLoGoiThauId: string;
    tenPhanLo: string;
    ketQua: string | null;
    donGiaTrungThau: number | null;
    nhaThauTrungThau: string | null;
}

export interface ProcurementLookupItem {
    facilityId: string;
    facilityName: string;
    facilityCode: string | null;
    keHoachId: string;
    maKHLCNT: string | null;
    tenKHLCNT: string | null;
    soQuyetDinh: string | null;
    ngayPheDuyet: string | null;
    goiThauId: string;
    tenGoiThau: string;
    giaGoiThau: number | null;
    hinhThucLCNT: string | null;
    phuongThucLCNT: string | null;
    loaiHopDong: string[];
    soLuongPhanLo: number | null;
    trangThaiGoiThau: string | null;
    maTBMT: string | null;
    ngayDangTaiTBMT: string | null;
    ngayDongThau: string | null;
    soQdPheDuyetKQLCNT: string | null;
    ngayPheDuyetKQLCNT: string | null;
    soMatHangMoiThau: number | null;
    soMatHangTrungThau: number | null;
    tongGiaTriTrungThau: number | null;
    soLuongNhaThauTrung: number;
    danhSachNhaThauTrung: string[];
    procurementStatus: ProcurementStatusLabel;
    phanLoResults: ProcurementLookupPhanLoResult[];
}

export interface ProcurementLookupResponse {
    data: ProcurementLookupItem[];
    metadata: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        facilities: ProcurementLookupFacilityOption[];
        summary: ProcurementLookupSummary;
    };
}

interface ProcurementLookupLoaderOptions {
    query: ProcurementLookupQuery;
    includeFacilities: boolean;
}

const GOI_THAU_LOOKUP_INCLUDE = {
    keHoach: {
        select: {
            id: true,
            facilityId: true,
            maKHLCNT: true,
            tenKHLCNT: true,
            soQuyetDinh: true,
            ngayPheDuyet: true,
            facility: {
                select: {
                    id: true,
                    facilityName: true,
                    facilityCode: true,
                },
            },
        },
    },
    thongBaoMoiThaus: {
        select: {
            id: true,
            maTBMT: true,
            ngayDangTai: true,
            ngayDongThau: true,
            createdAt: true,
        },
        orderBy: [
            {
                ngayDangTai: "desc",
            },
            {
                createdAt: "desc",
            },
        ],
    },
    ketQuaLCNTs: {
        select: {
            id: true,
            soQdPheDuyetKQLCNT: true,
            ngayPheDuyetKQLCNT: true,
            soMatHangMoiThau: true,
            soMatHangTrungThau: true,
            tongGiaTriTrungThau: true,
            createdAt: true,
            ketQuaPhanLos: {
                select: {
                    id: true,
                    ketQua: true,
                    donGiaTrungThau: true,
                    nhaThauTrungThau: true,
                    phanLoGoiThau: {
                        select: {
                            id: true,
                            stt: true,
                            tenPhanLo: true,
                        },
                    },
                },
            },
        },
        orderBy: [
            {
                ngayPheDuyetKQLCNT: "desc",
            },
            {
                createdAt: "desc",
            },
        ],
    },
} satisfies Prisma.GoiThauInclude;

type GoiThauLookupRecord = Prisma.GoiThauGetPayload<{
    include: typeof GOI_THAU_LOOKUP_INCLUDE;
}>;

const GOI_THAU_LOOKUP_ORDER_BY: Prisma.GoiThauOrderByWithRelationInput[] = [
    {
        keHoach: {
            ngayPheDuyet: "desc",
        },
    },
    {
        createdAt: "desc",
    },
    {
        tenGoiThau: "asc",
    },
];

function parsePositiveInteger(value: string | null, fallback: number) {
    const parsed = Number.parseInt(value || "", 10);

    if (!Number.isFinite(parsed) || parsed < 1) {
        return fallback;
    }

    return parsed;
}

function parseStatusFilter(value: string | null): ProcurementStatusFilter {
    if (value && PROCUREMENT_STATUS_FILTERS.includes(value as ProcurementStatusFilter)) {
        return value as ProcurementStatusFilter;
    }

    return "all";
}

function parseProcurementTypeFilter(value: string | null): ProcurementTypeFilter {
    if (value && PROCUREMENT_TYPE_FILTERS.includes(value as ProcurementTypeFilter)) {
        return value as ProcurementTypeFilter;
    }

    return "all";
}

function parseDateStart(value: string) {
    if (!value) {
        return null;
    }

    const date = new Date(`${value}T00:00:00.000Z`);
    return Number.isNaN(date.getTime()) ? null : date;
}

function parseDateEndExclusive(value: string) {
    if (!value) {
        return null;
    }

    const date = new Date(`${value}T00:00:00.000Z`);
    if (Number.isNaN(date.getTime())) {
        return null;
    }

    date.setUTCDate(date.getUTCDate() + 1);
    return date;
}

function buildContainsFilter(term: string) {
    return {
        contains: term,
        mode: "insensitive" as const,
    };
}

function isNonEmptyWhere(where: Prisma.GoiThauWhereInput) {
    return Object.keys(where).length > 0;
}

function combineWhere(...parts: Prisma.GoiThauWhereInput[]) {
    const nonEmptyParts = parts.filter(isNonEmptyWhere);

    if (nonEmptyParts.length === 0) {
        return {};
    }

    if (nonEmptyParts.length === 1) {
        return nonEmptyParts[0];
    }

    return {
        AND: nonEmptyParts,
    } satisfies Prisma.GoiThauWhereInput;
}

function buildActiveWhere(query: ProcurementLookupQuery) {
    return combineWhere(buildBaseWhere(query), buildStatusWhere(query.procurementStatus));
}

function buildBaseWhere(query: ProcurementLookupQuery): Prisma.GoiThauWhereInput {
    const searchTerm = query.searchTerm.trim();
    const approvedFrom = parseDateStart(query.fromDate);
    const approvedToExclusive = parseDateEndExclusive(query.toDate);

    const where: Prisma.GoiThauWhereInput = {
        keHoach: {
            quyTrinh: 1,
            ...(query.facilityId ? { facilityId: query.facilityId } : {}),
            ...(query.procurementType !== "all" ? { loaiMuaSam: query.procurementType } : {}),
            ...((approvedFrom || approvedToExclusive)
                ? {
                    ngayPheDuyet: {
                        ...(approvedFrom ? { gte: approvedFrom } : {}),
                        ...(approvedToExclusive ? { lt: approvedToExclusive } : {}),
                    },
                }
                : {}),
        },
    };

    if (!searchTerm) {
        return where;
    }

    where.OR = [
        {
            keHoach: {
                facility: {
                    facilityName: buildContainsFilter(searchTerm),
                },
            },
        },
        {
            keHoach: {
                facility: {
                    facilityCode: buildContainsFilter(searchTerm),
                },
            },
        },
        {
            keHoach: {
                maKHLCNT: buildContainsFilter(searchTerm),
            },
        },
        {
            keHoach: {
                tenKHLCNT: buildContainsFilter(searchTerm),
            },
        },
        {
            tenGoiThau: buildContainsFilter(searchTerm),
        },
        {
            thongBaoMoiThaus: {
                some: {
                    maTBMT: buildContainsFilter(searchTerm),
                },
            },
        },
        {
            ketQuaLCNTs: {
                some: {
                    soQdPheDuyetKQLCNT: buildContainsFilter(searchTerm),
                },
            },
        },
    ];

    return where;
}

function buildStatusWhere(status: ProcurementStatusFilter): Prisma.GoiThauWhereInput {
    if (status === "no_tbmt") {
        return {
            thongBaoMoiThaus: {
                none: {},
            },
        };
    }

    if (status === "has_tbmt_no_kqlcnt") {
        return {
            AND: [
                {
                    thongBaoMoiThaus: {
                        some: {},
                    },
                },
                {
                    ketQuaLCNTs: {
                        none: {},
                    },
                },
            ],
        };
    }

    if (status === "has_kqlcnt") {
        return {
            ketQuaLCNTs: {
                some: {},
            },
        };
    }

    return {};
}

function parseJsonArray(value: string | null | undefined) {
    if (!value) {
        return [];
    }

    try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed)
            ? parsed.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
            : [];
    } catch {
        return [];
    }
}

function serializeDate(value: Date | null | undefined) {
    return value ? value.toISOString() : null;
}

function serializeNumber(value: Prisma.Decimal | number | null | undefined) {
    if (value === null || value === undefined) {
        return null;
    }

    return Number(value);
}

function dedupeWinningContractors(
    ketQuaPhanLos: GoiThauLookupRecord["ketQuaLCNTs"][number]["ketQuaPhanLos"]
) {
    const uniqueNames = new Map<string, string>();

    ketQuaPhanLos.forEach((phanLo) => {
        const normalized = phanLo.nhaThauTrungThau?.trim() || "";
        if (!normalized) {
            return;
        }

        const key = normalized.toLocaleLowerCase("vi-VN");
        if (!uniqueNames.has(key)) {
            uniqueNames.set(key, normalized);
        }
    });

    return Array.from(uniqueNames.values()).sort((left, right) => left.localeCompare(right, "vi"));
}

function getRepresentativeTbmt(record: GoiThauLookupRecord) {
    return record.thongBaoMoiThaus[0] || null;
}

function getRepresentativeKqlcnt(record: GoiThauLookupRecord) {
    return record.ketQuaLCNTs[0] || null;
}

function getProcurementStatus(record: GoiThauLookupRecord): ProcurementStatusLabel {
    if (record.ketQuaLCNTs.length > 0) {
        return "Đã có KQLCNT";
    }

    if (record.thongBaoMoiThaus.length > 0) {
        return "Đã có TBMT, chưa có KQLCNT";
    }

    return "Chưa có TBMT";
}

function serializePhanLoResults(
    ketQuaPhanLos: GoiThauLookupRecord["ketQuaLCNTs"][number]["ketQuaPhanLos"]
) {
    return [...ketQuaPhanLos]
        .sort((left, right) => {
            const leftStt = left.phanLoGoiThau?.stt ?? Number.MAX_SAFE_INTEGER;
            const rightStt = right.phanLoGoiThau?.stt ?? Number.MAX_SAFE_INTEGER;
            if (leftStt !== rightStt) {
                return leftStt - rightStt;
            }

            return (left.phanLoGoiThau?.tenPhanLo || "").localeCompare(
                right.phanLoGoiThau?.tenPhanLo || "",
                "vi"
            );
        })
        .map((phanLo) => ({
            phanLoGoiThauId: phanLo.phanLoGoiThau?.id || phanLo.id,
            tenPhanLo: phanLo.phanLoGoiThau?.tenPhanLo || "—",
            ketQua: phanLo.ketQua || null,
            donGiaTrungThau: serializeNumber(phanLo.donGiaTrungThau),
            nhaThauTrungThau: phanLo.nhaThauTrungThau?.trim() || null,
        }));
}

function serializeLookupItem(record: GoiThauLookupRecord): ProcurementLookupItem {
    const representativeTbmt = getRepresentativeTbmt(record);
    const representativeKqlcnt = getRepresentativeKqlcnt(record);
    const phanLoResults = representativeKqlcnt
        ? serializePhanLoResults(representativeKqlcnt.ketQuaPhanLos)
        : [];
    const danhSachNhaThauTrung = representativeKqlcnt
        ? dedupeWinningContractors(representativeKqlcnt.ketQuaPhanLos)
        : [];

    return {
        facilityId: record.keHoach.facility.id,
        facilityName: record.keHoach.facility.facilityName || "—",
        facilityCode: record.keHoach.facility.facilityCode || null,
        keHoachId: record.keHoach.id,
        maKHLCNT: record.keHoach.maKHLCNT,
        tenKHLCNT: record.keHoach.tenKHLCNT,
        soQuyetDinh: record.keHoach.soQuyetDinh,
        ngayPheDuyet: serializeDate(record.keHoach.ngayPheDuyet),
        goiThauId: record.id,
        tenGoiThau: record.tenGoiThau,
        giaGoiThau: serializeNumber(record.giaGoiThau),
        hinhThucLCNT: record.hinhThucLCNT,
        phuongThucLCNT: record.phuongThucLCNT,
        loaiHopDong: parseJsonArray(record.loaiHopDong),
        soLuongPhanLo: record.soLuongPhanLo,
        trangThaiGoiThau: record.trangThai || null,
        maTBMT: representativeTbmt?.maTBMT || null,
        ngayDangTaiTBMT: serializeDate(representativeTbmt?.ngayDangTai),
        ngayDongThau: serializeDate(representativeTbmt?.ngayDongThau),
        soQdPheDuyetKQLCNT: representativeKqlcnt?.soQdPheDuyetKQLCNT || null,
        ngayPheDuyetKQLCNT: serializeDate(representativeKqlcnt?.ngayPheDuyetKQLCNT),
        soMatHangMoiThau: representativeKqlcnt?.soMatHangMoiThau ?? null,
        soMatHangTrungThau: representativeKqlcnt?.soMatHangTrungThau ?? null,
        tongGiaTriTrungThau: representativeKqlcnt
            ? serializeNumber(representativeKqlcnt.tongGiaTriTrungThau)
            : null,
        soLuongNhaThauTrung: danhSachNhaThauTrung.length,
        danhSachNhaThauTrung,
        procurementStatus: getProcurementStatus(record),
        phanLoResults,
    };
}

async function loadFacilityOptions() {
    const facilities = await prisma.user.findMany({
        where: {
            keHoachLCNTs: {
                some: {
                    quyTrinh: 1,
                    goiThaus: {
                        some: {},
                    },
                },
            },
        },
        select: {
            id: true,
            facilityName: true,
            facilityCode: true,
        },
        orderBy: [
            {
                facilityName: "asc",
            },
            {
                facilityCode: "asc",
            },
        ],
    });

    return facilities.map((facility) => ({
        id: facility.id,
        facilityName: facility.facilityName || facility.facilityCode || "—",
        facilityCode: facility.facilityCode || null,
    }));
}

export function parseProcurementLookupQuery(searchParams: URLSearchParams): ProcurementLookupQuery {
    return {
        page: parsePositiveInteger(searchParams.get("page"), DEFAULT_PROCUREMENT_LOOKUP_PAGE),
        limit: parsePositiveInteger(searchParams.get("limit"), DEFAULT_PROCUREMENT_LOOKUP_LIMIT),
        searchTerm: searchParams.get("searchTerm")?.trim() || "",
        procurementStatus: parseStatusFilter(searchParams.get("procurementStatus")),
        procurementType: parseProcurementTypeFilter(searchParams.get("procurementType")),
        fromDate: searchParams.get("fromDate") || "",
        toDate: searchParams.get("toDate") || "",
        facilityId: searchParams.get("facilityId") || "",
    };
}

export async function loadAllProcurementLookupItems(
    query: ProcurementLookupQuery
): Promise<ProcurementLookupItem[]> {
    const activeWhere = buildActiveWhere(query);
    const goiThaus = await prisma.goiThau.findMany({
        where: activeWhere,
        include: GOI_THAU_LOOKUP_INCLUDE,
        orderBy: GOI_THAU_LOOKUP_ORDER_BY,
    });

    return goiThaus.map(serializeLookupItem);
}

export async function loadProcurementLookupResponse({
    query,
    includeFacilities,
}: ProcurementLookupLoaderOptions): Promise<ProcurementLookupResponse> {
    const activeWhere = buildActiveWhere(query);

    const [
        total,
        chuaCoTBMT,
        daCoTBMTChuaCoKQLCNT,
        daCoKQLCNT,
        facilityOptions,
    ] = await Promise.all([
        prisma.goiThau.count({ where: activeWhere }),
        prisma.goiThau.count({
            where: combineWhere(activeWhere, buildStatusWhere("no_tbmt")),
        }),
        prisma.goiThau.count({
            where: combineWhere(activeWhere, buildStatusWhere("has_tbmt_no_kqlcnt")),
        }),
        prisma.goiThau.count({
            where: combineWhere(activeWhere, buildStatusWhere("has_kqlcnt")),
        }),
        includeFacilities ? loadFacilityOptions() : Promise.resolve([]),
    ]);

    const totalPages = total > 0 ? Math.ceil(total / query.limit) : 1;
    const safePage = Math.min(query.page, totalPages);
    const skip = (safePage - 1) * query.limit;

    const goiThaus = await prisma.goiThau.findMany({
        where: activeWhere,
        include: GOI_THAU_LOOKUP_INCLUDE,
        orderBy: GOI_THAU_LOOKUP_ORDER_BY,
        skip,
        take: query.limit,
    });

    return {
        data: goiThaus.map(serializeLookupItem),
        metadata: {
            page: safePage,
            limit: query.limit,
            total,
            totalPages,
            facilities: facilityOptions,
            summary: {
                totalPackages: total,
                chuaCoTBMT,
                daCoTBMTChuaCoKQLCNT,
                daCoKQLCNT,
            },
        },
    };
}
