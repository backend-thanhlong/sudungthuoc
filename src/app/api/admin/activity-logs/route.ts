import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";

// GET: Fetch activity logs (admin only)
export async function GET(req: NextRequest) {
    try {
        const session = await auth();
        if (!session || (session.user as any).role !== "ADMIN") {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "30");
        const userId = searchParams.get("userId");
        const action = searchParams.get("action");
        const entityType = searchParams.get("entityType");
        const startDate = searchParams.get("startDate");
        const endDate = searchParams.get("endDate");

        // Build where clause
        const where: any = {};
        if (userId) where.userId = userId;
        if (action) where.action = action;
        if (entityType) where.entityType = entityType;
        if (startDate || endDate) {
            where.createdAt = {};
            if (startDate) where.createdAt.gte = new Date(startDate);
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                where.createdAt.lte = end;
            }
        }

        const [logs, total] = await Promise.all([
            prisma.activityLog.findMany({
                where,
                include: {
                    user: {
                        select: {
                            id: true,
                            username: true,
                            facilityName: true,
                            role: true,
                        },
                    },
                },
                orderBy: { createdAt: "desc" },
                skip: (page - 1) * limit,
                take: limit,
            }),
            prisma.activityLog.count({ where }),
        ]);

        // Get distinct users for filter dropdown
        const users = await prisma.user.findMany({
            where: { isActive: true },
            select: { id: true, username: true, facilityName: true, role: true },
            orderBy: { facilityName: "asc" },
        });

        return NextResponse.json({
            logs,
            users,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error("Error fetching activity logs:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}
