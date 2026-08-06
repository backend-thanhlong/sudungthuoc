import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { type Prisma } from "@/../prisma/generated/client";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";

const USER_SELECT = {
    id: true,
    username: true,
    facilityName: true,
    facilityCode: true,
    autonomyGroup: true,
    facilityType: true,
    contactPerson: true,
    phoneNumber: true,
    address: true,
    latitude: true,
    longitude: true,
    role: true,
    isActive: true,
    createdAt: true,
} satisfies Prisma.UserSelect;

const SEARCHABLE_FIELDS = [
    "username",
    "facilityName",
    "facilityCode",
    "facilityType",
    "autonomyGroup",
    "contactPerson",
    "phoneNumber",
    "address",
] as const;

const PAGE_SIZE_OPTIONS = [20, 50, 100] as const;
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const FACILITY_ROLE_FILTER: Prisma.UserWhereInput = { role: "FACILITY" };

type SearchableField = (typeof SEARCHABLE_FIELDS)[number];

function parsePage(value: string | null) {
    const parsed = Number.parseInt(value || "", 10);

    if (!Number.isFinite(parsed) || parsed < 1) {
        return DEFAULT_PAGE;
    }

    return parsed;
}

function parseLimit(value: string | null) {
    const parsed = Number.parseInt(value || "", 10);

    if (!PAGE_SIZE_OPTIONS.includes(parsed as (typeof PAGE_SIZE_OPTIONS)[number])) {
        return DEFAULT_LIMIT;
    }

    return parsed;
}

function parseCoordinate(value: unknown, min: number, max: number, label: string) {
    if (value === null || value === undefined || value === "") {
        return { value: null as number | null };
    }

    const parsed = typeof value === "number"
        ? value
        : Number(String(value).trim().replace(",", "."));

    if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
        return { value: null, error: `${label} không hợp lệ` };
    }

    return { value: parsed };
}

function buildSearchFilter(field: SearchableField, term: string): Prisma.UserWhereInput {
    return {
        [field]: {
            contains: term,
            mode: "insensitive",
        },
    } as Prisma.UserWhereInput;
}

// GET all facility users
export async function GET(request: Request) {
    try {
        const session = await auth();
        if (!session || session.user.role !== "ADMIN") {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const page = parsePage(searchParams.get("page"));
        const limit = parseLimit(searchParams.get("limit"));
        const searchTerm = searchParams.get("searchTerm")?.trim() || "";
        const rawSearchField = searchParams.get("searchField") || "all";
        const skip = (page - 1) * limit;

        const where: Prisma.UserWhereInput = {
            ...FACILITY_ROLE_FILTER,
        };

        if (searchTerm) {
            const isSpecificField = SEARCHABLE_FIELDS.includes(rawSearchField as SearchableField);

            if (rawSearchField === "all" || !isSpecificField) {
                where.OR = SEARCHABLE_FIELDS.map((field) => buildSearchFilter(field, searchTerm));
            } else {
                Object.assign(where, buildSearchFilter(rawSearchField as SearchableField, searchTerm));
            }
        }

        const [users, total, totalFacilities, facilityTypeGroups, autonomyGroups] = await Promise.all([
            prisma.user.findMany({
                where,
                select: USER_SELECT,
                orderBy: { createdAt: "desc" },
                skip,
                take: limit,
            }),
            prisma.user.count({ where }),
            prisma.user.count({ where: FACILITY_ROLE_FILTER }),
            prisma.user.groupBy({
                by: ["facilityType"],
                where: FACILITY_ROLE_FILTER,
                _count: { _all: true },
            }),
            prisma.user.groupBy({
                by: ["autonomyGroup"],
                where: FACILITY_ROLE_FILTER,
                _count: { _all: true },
            }),
        ]);

        const facilityTypeCounts = new Map(
            facilityTypeGroups.map((group) => [group.facilityType || "", group._count._all])
        );
        const autonomyGroupCounts = new Map(
            autonomyGroups.map((group) => [group.autonomyGroup || "", group._count._all])
        );

        return NextResponse.json({
            data: users,
            metadata: {
                total,
                page,
                limit,
                totalPages: Math.max(1, Math.ceil(total / limit)),
                summary: {
                    totalFacilities,
                    ministryHospitals: facilityTypeCounts.get("Bệnh viện trực thuộc Bộ/Ngành") || 0,
                    regionalMedicalCenters: facilityTypeCounts.get("Trung tâm y tế khu vực trực thuộc") || 0,
                    privateHospitals: facilityTypeCounts.get("Bệnh viện tư nhân") || 0,
                    autonomyGroup2: autonomyGroupCounts.get("Nhóm 2") || 0,
                    autonomyGroup3: autonomyGroupCounts.get("Nhóm 3") || 0,
                },
            },
        });
    } catch (error) {
        console.error("Error fetching users:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}

// POST create new facility user
export async function POST(request: Request) {
    try {
        const session = await auth();
        if (!session || session.user.role !== "ADMIN") {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const {
            username,
            password,
            facilityName,
            facilityCode,
            autonomyGroup,
            facilityType,
            contactPerson,
            phoneNumber,
            address,
            latitude,
            longitude
        } = body;

        if (!username || !password || !facilityName || !facilityCode) {
            return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
        }

        // Check if username already exists
        const existingUser = await prisma.user.findUnique({ where: { username } });
        if (existingUser) {
            return NextResponse.json({ message: "Tên đăng nhập đã tồn tại" }, { status: 400 });
        }

        // Check if facility code already exists
        const existingFacility = await prisma.user.findUnique({ where: { facilityCode } });
        if (existingFacility) {
            return NextResponse.json({ message: "Mã cơ sở đã tồn tại" }, { status: 400 });
        }

        const passwordHash = await bcrypt.hash(password, 10);
        const parsedLatitude = parseCoordinate(latitude, -90, 90, "Vĩ độ");
        const parsedLongitude = parseCoordinate(longitude, -180, 180, "Kinh độ");

        if (parsedLatitude.error || parsedLongitude.error) {
            return NextResponse.json(
                { message: parsedLatitude.error || parsedLongitude.error },
                { status: 400 }
            );
        }

        const user = await prisma.user.create({
            data: {
                username,
                passwordHash,
                facilityName,
                facilityCode,
                autonomyGroup,
                facilityType,
                contactPerson,
                phoneNumber,
                address,
                latitude: parsedLatitude.value,
                longitude: parsedLongitude.value,
                role: "FACILITY",
            },
            select: USER_SELECT,
        });

        return NextResponse.json(user, { status: 201 });
    } catch (error) {
        console.error("Error creating user:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}
