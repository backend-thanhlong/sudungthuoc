import { NextResponse } from "next/server";
import { auth } from "@/auth";

export async function POST() {
    const session = await auth();
    if (!session || session.user.role !== "ADMIN") {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json(
        { message: "Luồng duyệt báo cáo facility đã bị loại bỏ. Báo cáo được chốt ngay sau khi nộp." },
        { status: 410 }
    );
}
