import { NextRequest, NextResponse } from "next/server";
import type { Prisma, Role } from "@/../prisma/generated/client";
import prisma from "@/lib/prisma";
import { isRouteError, requireActiveSessionUser } from "@/lib/server-authz";
import {
    getAIAdminSettings,
    getAIProviderStatus,
    getQuotaLimitForRoleMode,
    isValidDailyLimit,
} from "@/lib/ai/admin-config";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

interface ParsedAIDetails {
    mode?: string;
    status?: "success" | "error" | "quota_exceeded";
}

function startOfToday() {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function parsePositiveInt(value: string | null, fallback: number, max = Number.MAX_SAFE_INTEGER) {
    const parsed = Number.parseInt(value || "", 10);
    if (!Number.isFinite(parsed) || parsed < 1) {
        return fallback;
    }
    return Math.min(parsed, max);
}

function parseDetails(details: string | null): ParsedAIDetails {
    if (!details) {
        return {};
    }

    try {
        const parsed = JSON.parse(details) as Record<string, unknown>;
        return {
            mode: typeof parsed.mode === "string" ? parsed.mode : undefined,
            status: parsed.status === "error" || parsed.status === "quota_exceeded" || parsed.status === "success"
                ? parsed.status
                : "success",
        };
    } catch {
        return {};
    }
}

function usageEmpty() {
    return {
        requests: 0,
        chat: 0,
        review: 0,
        success: 0,
        errors: 0,
        quotaExceeded: 0,
    };
}

function userLabel(user: { username: string; facilityName: string | null }) {
    return user.facilityName || user.username;
}

function effectivePolicyForUser({
    role,
    policy,
    settings,
    fallbackConfigured,
}: {
    role: Role;
    policy: {
        enabled: boolean | null;
        chatDailyLimit: number | null;
        reviewDailyLimit: number | null;
        allowFallback: boolean | null;
    } | null;
    settings: Awaited<ReturnType<typeof getAIAdminSettings>>;
    fallbackConfigured: boolean;
}) {
    const baseChatLimit = getQuotaLimitForRoleMode(settings, role, "chat");
    const baseReviewLimit = getQuotaLimitForRoleMode(settings, role, "review");
    return {
        enabled: settings.globalEnabled && (policy?.enabled !== false),
        chatEnabled: settings.chatEnabled,
        reviewEnabled: settings.reviewEnabled,
        chatDailyLimit: isValidDailyLimit(policy?.chatDailyLimit) ? policy.chatDailyLimit : baseChatLimit,
        reviewDailyLimit: isValidDailyLimit(policy?.reviewDailyLimit) ? policy.reviewDailyLimit : baseReviewLimit,
        allowFallback: role === "ADMIN" && fallbackConfigured && (policy?.allowFallback ?? settings.fallbackEnabled),
    };
}

export async function GET(request: NextRequest) {
    try {
        await requireActiveSessionUser("ADMIN");
        const { searchParams } = new URL(request.url);
        const page = parsePositiveInt(searchParams.get("page"), DEFAULT_PAGE);
        const limit = parsePositiveInt(searchParams.get("limit"), DEFAULT_LIMIT, MAX_LIMIT);
        const search = searchParams.get("search")?.trim() || "";
        const role = searchParams.get("role") || "";
        const skip = (page - 1) * limit;

        const where: Prisma.UserWhereInput = {
            isActive: true,
            role: role === "ADMIN" || role === "FACILITY"
                ? role
                : { in: ["ADMIN", "FACILITY"] },
        };

        if (search) {
            where.OR = [
                { username: { contains: search, mode: "insensitive" } },
                { facilityName: { contains: search, mode: "insensitive" } },
                { facilityCode: { contains: search, mode: "insensitive" } },
            ];
        }

        const [settings, providerStatus, users, total] = await Promise.all([
            getAIAdminSettings(),
            Promise.resolve(getAIProviderStatus()),
            prisma.user.findMany({
                where,
                select: {
                    id: true,
                    username: true,
                    facilityName: true,
                    facilityCode: true,
                    role: true,
                    isActive: true,
                    aiUserPolicy: {
                        select: {
                            enabled: true,
                            chatDailyLimit: true,
                            reviewDailyLimit: true,
                            allowFallback: true,
                            note: true,
                            updatedAt: true,
                            updatedById: true,
                        },
                    },
                },
                orderBy: [
                    { role: "asc" },
                    { facilityName: "asc" },
                    { username: "asc" },
                ],
                skip,
                take: limit,
            }),
            prisma.user.count({ where }),
        ]);

        const userIds = users.map(user => user.id);
        const logs = userIds.length === 0
            ? []
            : await prisma.activityLog.findMany({
                where: {
                    userId: { in: userIds },
                    action: "AI_AGENT",
                    createdAt: { gte: startOfToday() },
                },
                select: {
                    userId: true,
                    details: true,
                },
                take: 10000,
            });

        const usageByUser = new Map<string, ReturnType<typeof usageEmpty>>();
        for (const user of users) {
            usageByUser.set(user.id, usageEmpty());
        }
        for (const log of logs) {
            const usage = usageByUser.get(log.userId);
            if (!usage) continue;
            const details = parseDetails(log.details);
            usage.requests += 1;
            usage.chat += details.mode === "chat" ? 1 : 0;
            usage.review += details.mode === "review" ? 1 : 0;
            usage.success += details.status === "success" ? 1 : 0;
            usage.errors += details.status === "error" ? 1 : 0;
            usage.quotaExceeded += details.status === "quota_exceeded" ? 1 : 0;
        }

        return NextResponse.json({
            users: users.map(user => ({
                ...user,
                label: userLabel(user),
                effectivePolicy: effectivePolicyForUser({
                    role: user.role,
                    policy: user.aiUserPolicy,
                    settings,
                    fallbackConfigured: providerStatus.fallback.configured,
                }),
                usageToday: usageByUser.get(user.id) || usageEmpty(),
            })),
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.max(1, Math.ceil(total / limit)),
            },
        });
    } catch (error) {
        if (isRouteError(error)) {
            return NextResponse.json({ message: error.message }, { status: error.status });
        }

        console.error("Error fetching AI policy users:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}
