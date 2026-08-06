import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { MappingStatus, type Prisma } from "@/../prisma/generated/client";

const DETAIL_VIEW_MODES = ["pending", "all"] as const;
type DetailViewMode = (typeof DETAIL_VIEW_MODES)[number];
const DETAIL_SEARCH_FIELDS = [
    "all",
    "maNoiBo",
    "tenThuocNoiBo",
    "hoatChatNoiBo",
    "soDangKyNoiBo",
    "nhomTckt",
    "maChung",
    "tenThuoc",
    "hoatChat",
    "soDangKy",
    "status",
] as const;
type DetailSearchField = (typeof DETAIL_SEARCH_FIELDS)[number];

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

function parseSearchField(value: string | null): DetailSearchField {
    return DETAIL_SEARCH_FIELDS.includes(value as DetailSearchField)
        ? (value as DetailSearchField)
        : "all";
}

function normalizeSearchValue(value: string) {
    return value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d")
        .replace(/Đ/g, "D")
        .toLowerCase();
}

function contains(value: string) {
    return { contains: value, mode: "insensitive" as const };
}

const STATUS_SEARCH_TERMS: Array<{ status: MappingStatus; labels: string[] }> = [
    { status: MappingStatus.WAITING_APPROVAL, labels: ["WAITING_APPROVAL", "Chờ duyệt", "Cho duyet"] },
    { status: MappingStatus.APPROVED, labels: ["APPROVED", "Đã duyệt", "Da duyet"] },
    { status: MappingStatus.REJECTED, labels: ["REJECTED", "Từ chối", "Tu choi"] },
    { status: MappingStatus.AUTO_MAPPED, labels: ["AUTO_MAPPED", "Tự động", "Tu dong"] },
    { status: MappingStatus.PENDING_MAPPING, labels: ["PENDING_MAPPING", "Chưa mapping", "Cho mapping"] },
];

function buildStatusSearchWhere(searchTerm: string): Prisma.FacilityDrugMapWhereInput {
    const normalizedTerm = normalizeSearchValue(searchTerm);
    const statuses = STATUS_SEARCH_TERMS
        .filter((item) => item.labels.some((label) => normalizeSearchValue(label).includes(normalizedTerm)))
        .map((item) => item.status);

    return statuses.length > 0
        ? { status: { in: statuses } }
        : { id: { equals: "__NO_STATUS_MATCH__" } };
}

function buildDetailSearchWhere(field: DetailSearchField, searchTerm: string): Prisma.FacilityDrugMapWhereInput | null {
    const term = searchTerm.trim();
    if (!term) return null;

    const directFieldWhere = (key: "maNoiBo" | "tenThuocNoiBo" | "hoatChatNoiBo" | "soDangKyNoiBo" | "nhomTckt") => ({
        [key]: contains(term),
    }) as Prisma.FacilityDrugMapWhereInput;

    const masterDrugWhere = (key: "maChung" | "tenThuoc" | "hoatChat" | "soDangKy") => ({
        masterDrug: {
            is: {
                [key]: contains(term),
            },
        },
    }) as Prisma.FacilityDrugMapWhereInput;

    switch (field) {
        case "maNoiBo":
        case "tenThuocNoiBo":
        case "hoatChatNoiBo":
        case "soDangKyNoiBo":
        case "nhomTckt":
            return directFieldWhere(field);
        case "maChung":
        case "tenThuoc":
        case "hoatChat":
        case "soDangKy":
            return masterDrugWhere(field);
        case "status":
            return buildStatusSearchWhere(term);
        case "all":
        default:
            return {
                OR: [
                    directFieldWhere("maNoiBo"),
                    directFieldWhere("tenThuocNoiBo"),
                    directFieldWhere("hoatChatNoiBo"),
                    directFieldWhere("soDangKyNoiBo"),
                    directFieldWhere("nhomTckt"),
                    masterDrugWhere("maChung"),
                    masterDrugWhere("tenThuoc"),
                    masterDrugWhere("hoatChat"),
                    masterDrugWhere("soDangKy"),
                    buildStatusSearchWhere(term),
                ],
            };
    }
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
        const searchField = parseSearchField(searchParams.get("searchField"));
        const searchTerm = searchParams.get("searchTerm")?.trim() || "";

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

        const baseWhere: Prisma.FacilityDrugMapWhereInput = {
            facilityId: facility.id,
            ...(viewMode === "pending" ? { status: MappingStatus.WAITING_APPROVAL } : {}),
        };
        const searchWhere = buildDetailSearchWhere(searchField, searchTerm);
        const detailWhere: Prisma.FacilityDrugMapWhereInput = searchWhere
            ? { AND: [baseWhere, searchWhere] }
            : baseWhere;

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
                            hamLuong: true,
                            dangBaoChe: true,
                            donViTinh: true,
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
