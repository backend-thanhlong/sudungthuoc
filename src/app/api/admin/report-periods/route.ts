import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { createNotificationForAllFacilities } from "@/lib/notifications";

export async function GET() {
    try {
        const session = await auth();
        if (!session || session.user.role !== "ADMIN") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const periods = await prisma.reportPeriod.findMany({
            orderBy: {
                periodMonth: 'desc'
            }
        });

        return NextResponse.json(periods);
    } catch (error) {
        console.error("Error fetching report periods:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const session = await auth();
        if (!session || session.user.role !== "ADMIN") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { month, deadline } = body; // Format: "MM/YYYY"; deadline: ISO string optional

        if (!month || !/^\d{2}\/\d{4}$/.test(month)) {
            return NextResponse.json({ error: "Invalid month format. Use MM/YYYY" }, { status: 400 });
        }

        const [m, y] = month.split('/');
        const monthInt = parseInt(m);
        const yearInt = parseInt(y);

        if (monthInt < 1 || monthInt > 12) {
            return NextResponse.json({ error: "Tháng không hợp lệ (phải từ 01 đến 12)" }, { status: 400 });
        }

        const periodMonth = yearInt * 100 + monthInt;

        // Check for duplicates
        const existing = await prisma.reportPeriod.findUnique({
            where: { month }
        });

        if (existing) {
            return NextResponse.json({ error: "Tháng báo cáo này đã tồn tại" }, { status: 400 });
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const newPeriod = await (prisma.reportPeriod as any).create({
            data: {
                month,
                year: yearInt,
                periodMonth,
                isActive: true,
                deadline: deadline ? new Date(deadline) : null,
            }
        });

        // Notify all facilities that a new reporting period has been opened
        const deadlineText = deadline
            ? ` Hạn nộp: ${new Date(deadline).toLocaleDateString("vi-VN")}.`
            : "";
        createNotificationForAllFacilities(
            "PERIOD_OPENED",
            `Mở kỳ báo cáo tháng ${month}`,
            `Kỳ báo cáo tháng ${month} đã được mở. Vui lòng tải mẫu và nộp báo cáo tồn kho.${deadlineText}`,
            "report",
            undefined,
            "/dashboard/facility/reports"
        );

        return NextResponse.json(newPeriod);
    } catch (error) {
        console.error("Error creating report period:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const session = await auth();
        if (!session || session.user.role !== "ADMIN") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");

        if (!id) {
            return NextResponse.json({ error: "Missing ID" }, { status: 400 });
        }

        await prisma.reportPeriod.delete({
            where: { id }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting report period:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
