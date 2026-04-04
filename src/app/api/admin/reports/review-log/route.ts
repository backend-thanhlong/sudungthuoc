import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

/**
 * GET /api/admin/reports/review-log?facilityId=...&month=...
 * Returns review history for a specific facility+month combination.
 */
export async function GET(request: Request) {
    try {
        const session = await auth();
        if (!session || session.user.role !== "ADMIN") {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const facilityId = searchParams.get("facilityId");
        const month = searchParams.get("month");

        if (!facilityId || !month) {
            return NextResponse.json({ message: "Missing facilityId or month" }, { status: 400 });
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const logs = await (prisma as any).reportReviewLog.findMany({
            where: { facilityId, reportMonth: month },
            orderBy: { createdAt: "desc" },
        });

        // Enrich with admin names
        const adminIds = [...new Set(logs.map((l: { adminId: string }) => l.adminId))];
        const admins = await prisma.user.findMany({
            where: { id: { in: adminIds as string[] } },
            select: { id: true, username: true, facilityName: true },
        });
        const adminMap = new Map(admins.map(a => [a.id, a.facilityName || a.username]));

        const result = logs.map((log: {
            id: string;
            facilityId: string;
            reportMonth: string;
            status: string;
            adminNote?: string | null;
            adminId: string;
            createdAt: Date;
        }) => ({
            ...log,
            adminName: adminMap.get(log.adminId) || "Unknown",
        }));

        return NextResponse.json(result);
    } catch (error) {
        console.error("Error fetching review log:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}
