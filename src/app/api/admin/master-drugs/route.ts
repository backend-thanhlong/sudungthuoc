import { NextResponse } from "next/server";
import { MappingStatus, type Prisma } from "@/../prisma/generated/client";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { RouteError } from "@/lib/server-authz";

const MASTER_DRUG_OPTIONAL_STRING_FIELDS = [
    "maBhyt",
    "hoatChat",
    "hamLuong",
    "dangBaoChe",
    "soDangKy",
    "quyCach",
    "donViTinh",
    "tieuChuan",
    "tuoiTho",
    "duongDung",
    "nguonGoc",
    "congTySanXuat",
    "nuocSanXuat",
    "diaChiSanXuat",
    "congTyDangKy",
    "nuocDangKy",
    "diaChiDangKy",
    "nhomThuoc",
    "isKeDon",
    "kiemSoatDacBiet",
    "isTrongNuoc",
] as const;

const MASTER_DRUG_SEARCHABLE_FIELDS = [
    "tenThuoc",
    "soDangKy",
    "hoatChat",
    "maChung",
    "maBhyt",
] as const;

const MASTER_DRUG_TEXT_FILTER_FIELDS = [
    "maBhyt",
    "tenThuoc",
    "hoatChat",
    "hamLuong",
    "soDangKy",
    "dangBaoChe",
    "quyCach",
    "duongDung",
    "donViTinh",
] as const;

function getTrimmedParam(searchParams: URLSearchParams, key: string) {
    return searchParams.get(key)?.trim() ?? "";
}

async function resolveTherapeuticGroupId(value: unknown) {
    if (typeof value !== "string" || !value.trim()) {
        return null;
    }

    const therapeuticGroup = await prisma.therapeuticGroup.findUnique({
        where: { id: value },
        select: { id: true },
    });

    if (!therapeuticGroup) {
        throw new RouteError(400, "Nhóm điều trị không hợp lệ");
    }

    return therapeuticGroup.id;
}

async function buildMasterDrugCreateData(body: Record<string, unknown>): Promise<Prisma.MasterDrugCreateInput> {
    const maChung = typeof body.maChung === "string" ? body.maChung.trim() : "";
    const tenThuoc = typeof body.tenThuoc === "string" ? body.tenThuoc.trim() : "";

    if (!maChung || !tenThuoc) {
        throw new RouteError(400, "Missing required fields");
    }

    const data: Prisma.MasterDrugCreateInput = {
        maChung,
        tenThuoc,
        isActive: true,
    };

    for (const field of MASTER_DRUG_OPTIONAL_STRING_FIELDS) {
        const rawValue = body[field];
        data[field] = typeof rawValue === "string" && rawValue.trim() ? rawValue.trim() : null;
    }

    const therapeuticGroupId = await resolveTherapeuticGroupId(body.therapeuticGroupId);
    if (therapeuticGroupId) {
        data.therapeuticGroup = {
            connect: { id: therapeuticGroupId },
        };
    }

    return data;
}

// GET all master drugs with pagination and search
export async function GET(request: Request) {
    try {
        const session = await auth();
        if (!session) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "20");
        const search = getTrimmedParam(searchParams, "search");
        const searchField = searchParams.get("searchField") || "ALL";
        const mappingStatus = searchParams.get("mappingStatus") || "all";

        const skip = (page - 1) * limit;
        const mappedStatuses: MappingStatus[] = [MappingStatus.APPROVED, MappingStatus.AUTO_MAPPED];

        const whereClauses: Prisma.MasterDrugWhereInput[] = [];

        if (search) {
            if (searchField === "ALL") {
                whereClauses.push({
                    OR: [
                    { tenThuoc: { contains: search, mode: "insensitive" } },
                    { maChung: { contains: search, mode: "insensitive" } },
                    { hoatChat: { contains: search, mode: "insensitive" } },
                    { soDangKy: { contains: search, mode: "insensitive" } },
                    { maBhyt: { contains: search, mode: "insensitive" } },
                    ],
                });
            } else if (MASTER_DRUG_SEARCHABLE_FIELDS.includes(searchField as (typeof MASTER_DRUG_SEARCHABLE_FIELDS)[number])) {
                const field = searchField as (typeof MASTER_DRUG_SEARCHABLE_FIELDS)[number];
                whereClauses.push({
                    [field]: { contains: search, mode: "insensitive" },
                });
            }
        }

        if (mappingStatus === "mapped") {
            whereClauses.push({
                drugMaps: {
                    some: {
                        status: {
                            in: mappedStatuses,
                        },
                    },
                },
            });
        } else if (mappingStatus === "unmapped") {
            whereClauses.push({
                drugMaps: {
                    none: {
                        status: {
                            in: mappedStatuses,
                        },
                    },
                },
            });
        }

        for (const field of MASTER_DRUG_TEXT_FILTER_FIELDS) {
            const value = getTrimmedParam(searchParams, field);
            if (!value) {
                continue;
            }

            whereClauses.push({
                [field]: {
                    contains: value,
                    mode: "insensitive",
                },
            });
        }

        const nhomThuoc = getTrimmedParam(searchParams, "nhomThuoc");
        if (nhomThuoc) {
            whereClauses.push({
                nhomThuoc,
            });
        }

        const therapeuticGroupId = getTrimmedParam(searchParams, "therapeuticGroupId");
        if (therapeuticGroupId) {
            whereClauses.push({
                therapeuticGroupId,
            });
        }

        const where: Prisma.MasterDrugWhereInput = whereClauses.length > 0
            ? { AND: whereClauses }
            : {};

        const [drugs, total] = await Promise.all([
            prisma.masterDrug.findMany({
                where,
                include: {
                    therapeuticGroup: {
                        select: {
                            id: true,
                            name: true,
                            isActive: true,
                        },
                    },
                },
                orderBy: { tenThuoc: "asc" },
                skip,
                take: limit,
            }),
            prisma.masterDrug.count({ where }),
        ]);

        return NextResponse.json({
            data: drugs,
            metadata: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error("Error fetching drugs:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}

// POST create new master drug
export async function POST(request: Request) {
    try {
        const session = await auth();
        if (!session || session.user.role !== "ADMIN") {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const data = await buildMasterDrugCreateData(body);

        // Check if maChung already exists
        const existingDrug = await prisma.masterDrug.findUnique({ where: { maChung: data.maChung } });
        if (existingDrug) {
            return NextResponse.json({ message: "Mã chung đã tồn tại" }, { status: 400 });
        }

        const drug = await prisma.masterDrug.create({
            data,
        });

        return NextResponse.json(drug, { status: 201 });
    } catch (error) {
        if (error instanceof RouteError) {
            return NextResponse.json({ message: error.message }, { status: error.status });
        }

        console.error("Error creating drug:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}

// DELETE all master drugs
export async function DELETE() {
    try {
        const session = await auth();
        if (!session || session.user.role !== "ADMIN") {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        // Optional: Add a query param or body to confirm strict intent if needed, 
        // but for now relying on the specific endpoint being called.
        // Actually this is the collection endpoint /api/admin/master-drugs

        await prisma.masterDrug.deleteMany({});

        return NextResponse.json({ message: "All master drugs deleted" });
    } catch (error) {
        console.error("Error deleting all drugs:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}
