import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function GET() {
    try {
        const session = await auth();
        if (!session || session.user.role !== "FACILITY") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Fetch only active periods, sorted by most recent
        const periods = await prisma.reportPeriod.findMany({
            where: {
                isActive: true
            },
            orderBy: {
                periodMonth: 'desc'
            }
        });

        // Map to format expected by frontend { value: "MM/YYYY", label: "Tháng MM/YYYY", deadline }
        const formattedPeriods = periods.map(p => ({
            value: p.month,
            label: `Tháng ${p.month}`,
            deadline: p.deadline ?? null,
        }));

        return NextResponse.json(formattedPeriods);
    } catch (error) {
        console.error("Error fetching report periods:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
