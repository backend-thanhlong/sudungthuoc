import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { logActivity } from "@/lib/activity-log";
import { isRouteError, requireActiveSessionUser } from "@/lib/server-authz";
import { isValidDailyLimit } from "@/lib/ai/admin-config";

const ALLOWED_FIELDS = new Set(["enabled", "chatDailyLimit", "reviewDailyLimit", "allowFallback", "note"]);

interface PolicyData {
    enabled?: boolean | null;
    chatDailyLimit?: number | null;
    reviewDailyLimit?: number | null;
    allowFallback?: boolean | null;
    note?: string | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function badRequest(message: string) {
    return NextResponse.json({ message }, { status: 400 });
}

function validatePolicyPayload(payload: unknown): PolicyData | string {
    if (!isRecord(payload)) {
        return "Payload không hợp lệ";
    }

    const unknownFields = Object.keys(payload).filter(key => !ALLOWED_FIELDS.has(key));
    if (unknownFields.length > 0) {
        return `Trường không được hỗ trợ: ${unknownFields.join(", ")}`;
    }

    const data: PolicyData = {};

    if ("enabled" in payload) {
        if (typeof payload.enabled !== "boolean" && payload.enabled !== null) {
            return "enabled phải là boolean hoặc null";
        }
        data.enabled = payload.enabled;
    }

    if ("chatDailyLimit" in payload) {
        if (payload.chatDailyLimit !== null && !isValidDailyLimit(payload.chatDailyLimit)) {
            return "chatDailyLimit phải là số nguyên từ 0 đến 1000 hoặc null";
        }
        data.chatDailyLimit = payload.chatDailyLimit;
    }

    if ("reviewDailyLimit" in payload) {
        if (payload.reviewDailyLimit !== null && !isValidDailyLimit(payload.reviewDailyLimit)) {
            return "reviewDailyLimit phải là số nguyên từ 0 đến 1000 hoặc null";
        }
        data.reviewDailyLimit = payload.reviewDailyLimit;
    }

    if ("allowFallback" in payload) {
        if (typeof payload.allowFallback !== "boolean" && payload.allowFallback !== null) {
            return "allowFallback phải là boolean hoặc null";
        }
        data.allowFallback = payload.allowFallback;
    }

    if ("note" in payload) {
        if (payload.note !== null && typeof payload.note !== "string") {
            return "note phải là chuỗi hoặc null";
        }
        const note = typeof payload.note === "string" ? payload.note.trim() : null;
        if (note && note.length > 500) {
            return "note tối đa 500 ký tự";
        }
        data.note = note || null;
    }

    if (Object.keys(data).length === 0) {
        return "Không có trường nào để cập nhật";
    }

    return data;
}

async function assertPolicyUser(userId: string) {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            username: true,
            facilityName: true,
            role: true,
            isActive: true,
        },
    });

    if (!user || !user.isActive || (user.role !== "ADMIN" && user.role !== "FACILITY")) {
        return null;
    }

    return user;
}

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ userId: string }> }
) {
    try {
        const sessionContext = await requireActiveSessionUser("ADMIN");
        const { userId } = await params;
        const user = await assertPolicyUser(userId);
        if (!user) {
            return NextResponse.json({ message: "Người dùng không hợp lệ cho policy AI" }, { status: 404 });
        }

        const body = await request.json().catch(() => null);
        const data = validatePolicyPayload(body);
        if (typeof data === "string") {
            return badRequest(data);
        }

        const policy = await prisma.aIUserPolicy.upsert({
            where: { userId },
            create: {
                userId,
                ...data,
                updatedById: sessionContext.user.id,
            },
            update: {
                ...data,
                updatedById: sessionContext.user.id,
            },
        });

        await logActivity({
            userId: sessionContext.user.id,
            action: "AI_AGENT_USER_POLICY_UPDATED",
            entityType: "ai_agent_user_policy",
            entityId: userId,
            details: {
                targetUser: {
                    id: user.id,
                    username: user.username,
                    facilityName: user.facilityName,
                    role: user.role,
                },
                policy: data,
            },
        });

        return NextResponse.json({ policy });
    } catch (error) {
        if (isRouteError(error)) {
            return NextResponse.json({ message: error.message }, { status: error.status });
        }

        console.error("Error updating AI user policy:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}

export async function DELETE(
    _request: Request,
    { params }: { params: Promise<{ userId: string }> }
) {
    try {
        const sessionContext = await requireActiveSessionUser("ADMIN");
        const { userId } = await params;
        const user = await assertPolicyUser(userId);
        if (!user) {
            return NextResponse.json({ message: "Người dùng không hợp lệ cho policy AI" }, { status: 404 });
        }

        await prisma.aIUserPolicy.deleteMany({ where: { userId } });
        await logActivity({
            userId: sessionContext.user.id,
            action: "AI_AGENT_USER_POLICY_RESET",
            entityType: "ai_agent_user_policy",
            entityId: userId,
            details: {
                targetUser: {
                    id: user.id,
                    username: user.username,
                    facilityName: user.facilityName,
                    role: user.role,
                },
            },
        });

        return NextResponse.json({ message: "Policy AI đã được reset" });
    } catch (error) {
        if (isRouteError(error)) {
            return NextResponse.json({ message: error.message }, { status: error.status });
        }

        console.error("Error resetting AI user policy:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}
