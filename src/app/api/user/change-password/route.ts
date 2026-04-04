import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(request: NextRequest) {
    try {
        // Get current user from session
        const session = await auth();
        if (!session || !session.user) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        // Parse request body
        const body = await request.json();
        const { currentPassword, newPassword } = body;

        // Validate input
        if (!currentPassword || !newPassword) {
            return NextResponse.json(
                { error: "Vui lòng nhập đầy đủ thông tin" },
                { status: 400 }
            );
        }

        // Validate new password length
        if (newPassword.length < 6) {
            return NextResponse.json(
                { error: "Mật khẩu mới phải có ít nhất 6 ký tự" },
                { status: 400 }
            );
        }

        // Check if new password is same as current
        if (currentPassword === newPassword) {
            return NextResponse.json(
                { error: "Mật khẩu mới phải khác mật khẩu hiện tại" },
                { status: 400 }
            );
        }

        // Fetch user from database
        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
        });

        if (!user) {
            return NextResponse.json(
                { error: "Không tìm thấy người dùng" },
                { status: 404 }
            );
        }

        // Verify current password
        const isPasswordValid = await bcrypt.compare(
            currentPassword,
            user.passwordHash
        );

        if (!isPasswordValid) {
            return NextResponse.json(
                { error: "Mật khẩu hiện tại không đúng" },
                { status: 400 }
            );
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update password in database
        await prisma.user.update({
            where: { id: user.id },
            data: { passwordHash: hashedPassword },
        });

        return NextResponse.json(
            { message: "Đổi mật khẩu thành công" },
            { status: 200 }
        );
    } catch (error) {
        console.error("Error changing password:", error);
        return NextResponse.json(
            { error: "Đã xảy ra lỗi khi đổi mật khẩu" },
            { status: 500 }
        );
    }
}
