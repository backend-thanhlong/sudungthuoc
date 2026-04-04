import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";

// GET: Fetch notifications for current user
export async function GET(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "20");
        const unreadOnly = searchParams.get("unreadOnly") === "true";

        const where: any = { userId: session.user.id };
        if (unreadOnly) {
            where.isRead = false;
        }

        const [notifications, total, unreadCount] = await Promise.all([
            prisma.notification.findMany({
                where,
                orderBy: { createdAt: "desc" },
                skip: (page - 1) * limit,
                take: limit,
            }),
            prisma.notification.count({ where }),
            prisma.notification.count({
                where: { userId: session.user.id, isRead: false },
            }),
        ]);

        return NextResponse.json({
            notifications,
            unreadCount,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error("Error fetching notifications:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}

// PATCH: Mark notifications as read
export async function PATCH(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { notificationId, markAll } = body;

        if (markAll) {
            // Mark all notifications as read
            await prisma.notification.updateMany({
                where: { userId: session.user.id, isRead: false },
                data: { isRead: true },
            });
        } else if (notificationId) {
            // Mark specific notification as read
            await prisma.notification.updateMany({
                where: {
                    id: notificationId,
                    userId: session.user.id,
                },
                data: { isRead: true },
            });
        } else {
            return NextResponse.json(
                { message: "notificationId or markAll required" },
                { status: 400 }
            );
        }

        // Return updated unread count
        const unreadCount = await prisma.notification.count({
            where: { userId: session.user.id, isRead: false },
        });

        return NextResponse.json({ success: true, unreadCount });
    } catch (error) {
        console.error("Error updating notifications:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}
