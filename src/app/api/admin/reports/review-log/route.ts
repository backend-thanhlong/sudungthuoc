import { NextResponse } from "next/server";
import { auth } from "@/auth";

export async function GET() {
    const session = await auth();
    if (!session || session.user.role !== "ADMIN") {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json(
        { message: "Lịch sử duyệt báo cáo facility không còn được sử dụng trong luồng hiện tại." },
        { status: 410 }
    );
}
