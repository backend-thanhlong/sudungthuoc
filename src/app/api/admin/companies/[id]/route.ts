import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";

const normalizeString = (value: unknown) =>
    typeof value === "string" ? value.trim() : "";

const normalizeOptionalString = (value: unknown) => {
    const normalized = normalizeString(value);
    return normalized.length > 0 ? normalized : null;
};

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (!session || session.user.role !== "ADMIN") {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const body = await request.json();
        const code = normalizeString(body.code);
        const name = normalizeString(body.name);
        const username = normalizeString(body.username);

        if (!code || !name || !username) {
            return NextResponse.json({ message: "Thiếu trường bắt buộc" }, { status: 400 });
        }

        const company = await prisma.company.findUnique({
            where: { id },
            include: {
                users: {
                    where: { role: "COMPANY" },
                    select: { id: true, username: true },
                    take: 1,
                },
            },
        });

        if (!company) {
            return NextResponse.json({ message: "Công ty không tồn tại" }, { status: 404 });
        }

        const companyUser = company.users[0];
        if (!companyUser) {
            return NextResponse.json({ message: "Không tìm thấy tài khoản công ty" }, { status: 404 });
        }

        const [codeConflict, usernameConflict] = await Promise.all([
            prisma.company.findFirst({
                where: {
                    code,
                    id: { not: id },
                },
                select: { id: true },
            }),
            prisma.user.findFirst({
                where: {
                    username,
                    id: { not: companyUser.id },
                },
                select: { id: true },
            }),
        ]);

        if (codeConflict) {
            return NextResponse.json({ message: "Mã công ty đã tồn tại" }, { status: 400 });
        }

        if (usernameConflict) {
            return NextResponse.json({ message: "Tên đăng nhập đã tồn tại" }, { status: 400 });
        }

        const isActive = typeof body.isActive === "boolean" ? body.isActive : company.isActive;

        const updatedCompany = await prisma.$transaction(async (tx) => {
            await tx.company.update({
                where: { id },
                data: {
                    code,
                    name,
                    contactPerson: normalizeOptionalString(body.contactPerson),
                    phoneNumber: normalizeOptionalString(body.phoneNumber),
                    email: normalizeOptionalString(body.email),
                    address: normalizeOptionalString(body.address),
                    isActive,
                },
            });

            await tx.user.update({
                where: { id: companyUser.id },
                data: {
                    username,
                    isActive,
                },
            });

            return tx.company.findUniqueOrThrow({
                where: { id },
                select: {
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
                        select: {
                            id: true,
                            username: true,
                            isActive: true,
                            createdAt: true,
                        },
                        take: 1,
                    },
                },
            });
        });

        return NextResponse.json({
            ...updatedCompany,
            companyUser: updatedCompany.users[0] || null,
        });
    } catch (error) {
        console.error("Error updating company:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}
