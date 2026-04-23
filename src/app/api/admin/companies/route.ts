import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { type Prisma } from "@/../prisma/generated/client";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";

const COMPANY_USER_SELECT = {
    id: true,
    username: true,
    isActive: true,
    createdAt: true,
} satisfies Prisma.UserSelect;

const COMPANY_SELECT = {
    id: true,
    code: true,
    name: true,
    contactPerson: true,
    phoneNumber: true,
    email: true,
    address: true,
    isActive: true,
    createdAt: true,
    updatedAt: true,
    users: {
        where: { role: "COMPANY" },
        select: COMPANY_USER_SELECT,
        take: 1,
        orderBy: { createdAt: "asc" },
    },
} satisfies Prisma.CompanySelect;

const normalizeString = (value: unknown) =>
    typeof value === "string" ? value.trim() : "";

const normalizeOptionalString = (value: unknown) => {
    const normalized = normalizeString(value);
    return normalized.length > 0 ? normalized : null;
};

function buildSearchFilter(searchTerm: string): Prisma.CompanyWhereInput {
    if (!searchTerm) {
        return {};
    }

    const containsFilter = {
        contains: searchTerm,
        mode: "insensitive" as const,
    };

    return {
        OR: [
            { code: containsFilter },
            { name: containsFilter },
            { contactPerson: containsFilter },
            { phoneNumber: containsFilter },
            { email: containsFilter },
            { address: containsFilter },
            {
                users: {
                    some: {
                        role: "COMPANY",
                        username: containsFilter,
                    },
                },
            },
        ],
    };
}

export async function GET(request: Request) {
    try {
        const session = await auth();
        if (!session || session.user.role !== "ADMIN") {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const searchTerm = searchParams.get("searchTerm")?.trim() || "";

        const companies = await prisma.company.findMany({
            where: buildSearchFilter(searchTerm),
            select: COMPANY_SELECT,
            orderBy: { createdAt: "desc" },
        });

        return NextResponse.json({
            data: companies.map((company) => ({
                ...company,
                companyUser: company.users[0] || null,
            })),
        });
    } catch (error) {
        console.error("Error fetching companies:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const session = await auth();
        if (!session || session.user.role !== "ADMIN") {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const code = normalizeString(body.code);
        const name = normalizeString(body.name);
        const username = normalizeString(body.username);
        const password = normalizeString(body.password);

        if (!code || !name || !username || !password) {
            return NextResponse.json({ message: "Thiếu trường bắt buộc" }, { status: 400 });
        }

        if (password.length < 6) {
            return NextResponse.json(
                { message: "Mật khẩu phải có ít nhất 6 ký tự" },
                { status: 400 }
            );
        }

        const [existingCompany, existingUser] = await Promise.all([
            prisma.company.findUnique({ where: { code } }),
            prisma.user.findUnique({ where: { username } }),
        ]);

        if (existingCompany) {
            return NextResponse.json({ message: "Mã công ty đã tồn tại" }, { status: 400 });
        }

        if (existingUser) {
            return NextResponse.json({ message: "Tên đăng nhập đã tồn tại" }, { status: 400 });
        }

        const passwordHash = await bcrypt.hash(password, 10);

        const company = await prisma.$transaction(async (tx) => {
            const createdCompany = await tx.company.create({
                data: {
                    code,
                    name,
                    contactPerson: normalizeOptionalString(body.contactPerson),
                    phoneNumber: normalizeOptionalString(body.phoneNumber),
                    email: normalizeOptionalString(body.email),
                    address: normalizeOptionalString(body.address),
                    isActive: true,
                },
            });

            await tx.user.create({
                data: {
                    username,
                    passwordHash,
                    role: "COMPANY",
                    companyId: createdCompany.id,
                    isActive: true,
                },
            });

            return tx.company.findUniqueOrThrow({
                where: { id: createdCompany.id },
                select: COMPANY_SELECT,
            });
        });

        return NextResponse.json(
            {
                ...company,
                companyUser: company.users[0] || null,
            },
            { status: 201 }
        );
    } catch (error) {
        console.error("Error creating company:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}
