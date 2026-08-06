import { NextResponse } from "next/server";
import { MappingStatus, type Prisma } from "@/../prisma/generated/client";
import prisma from "@/lib/prisma";

const MASTER_DRUG_SEARCHABLE_FIELDS = [
    "tenThuoc",
    "soDangKy",
    "hoatChat",
    "maChung",
    "maBhyt",
] as const;

function getTrimmedParam(searchParams: URLSearchParams, key: string) {
    return searchParams.get(key)?.trim() ?? "";
}

export async function GET(request: Request) {
    try {
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
                        status: { in: mappedStatuses },
                    },
                },
            });
        } else if (mappingStatus === "unmapped") {
            whereClauses.push({
                drugMaps: {
                    none: {
                        status: { in: mappedStatuses },
                    },
                },
            });
        }

        const where: Prisma.MasterDrugWhereInput = whereClauses.length > 0
            ? { AND: whereClauses }
            : {};

        const [drugs, total] = await Promise.all([
            prisma.masterDrug.findMany({
                where,
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
        console.error("Error fetching public master drugs:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}
