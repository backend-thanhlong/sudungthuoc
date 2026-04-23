import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";

export async function POST(
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
        const password = typeof body.password === "string" ? body.password.trim() : "";

        if (password.length < 6) {
            return NextResponse.json(
                { message: "Mật khẩu mới phải có ít nhất 6 ký tự" },
                { status: 400 }
            );
        }

        const companyUser = await prisma.user.findFirst({
            where: {
                role: "COMPANY",
                companyId: id,
            },
            select: { id: true },
        });

        if (!companyUser) {
            return NextResponse.json({ message: "Không tìm thấy tài khoản công ty" }, { status: 404 });
        }

        const passwordHash = await bcrypt.hash(password, 10);

        await prisma.user.update({
            where: { id: companyUser.id },
            data: { passwordHash },
        });

        return NextResponse.json({ message: "Đã đặt lại mật khẩu thành công" });
    } catch (error) {
        console.error("Error resetting company password:", error);
        return NextResponse.json(
            { message: "Internal server error" },
            { status: 500 }
        );
    }
}
