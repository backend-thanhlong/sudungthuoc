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
        // Ensure only ADMIN can access this endpoint
        if (!session || session.user.role !== "ADMIN") {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const body = await request.json();
        const { password } = body;

        if (!password || password.length < 6) {
            return NextResponse.json(
                { message: "Mật khẩu mới phải có ít nhất 6 ký tự" },
                { status: 400 }
            );
        }

        const passwordHash = await bcrypt.hash(password, 10);

        await prisma.user.update({
            where: { id },
            data: { passwordHash },
        });

        return NextResponse.json({ message: "Đã đặt lại mật khẩu thành công" });
    } catch (error) {
        console.error("Error resetting password:", error);
        return NextResponse.json(
            { message: "Internal server error" },
            { status: 500 }
        );
    }
}
