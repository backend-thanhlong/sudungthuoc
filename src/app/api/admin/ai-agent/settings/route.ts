import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { logActivity } from "@/lib/activity-log";
import { isRouteError, requireActiveSessionUser } from "@/lib/server-authz";
import {
    AI_SETTING_KEYS,
    buildDefaultAIAdminSettings,
    getAIAdminSettings,
    getAIPolicyVersion,
    getAIProviderStatus,
    isValidDailyLimit,
    type AIAdminSettings,
} from "@/lib/ai/admin-config";

const BOOLEAN_FIELDS = ["globalEnabled", "chatEnabled", "reviewEnabled", "fallbackEnabled"] as const;
const QUOTA_FIELDS = ["adminChatPerDay", "adminReviewPerDay", "facilityChatPerDay", "facilityReviewPerDay"] as const;
const ALLOWED_FIELDS = new Set<string>([...BOOLEAN_FIELDS, "quota"]);

function isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function badRequest(message: string) {
    return NextResponse.json({ message }, { status: 400 });
}

function validateSettingsPayload(payload: unknown, current: AIAdminSettings): AIAdminSettings | string {
    if (!isRecord(payload)) {
        return "Payload không hợp lệ";
    }

    const unknownFields = Object.keys(payload).filter(key => !ALLOWED_FIELDS.has(key));
    if (unknownFields.length > 0) {
        return `Trường không được hỗ trợ: ${unknownFields.join(", ")}`;
    }

    const next: AIAdminSettings = {
        ...current,
        quota: { ...current.quota },
    };

    for (const field of BOOLEAN_FIELDS) {
        if (field in payload) {
            if (typeof payload[field] !== "boolean") {
                return `${field} phải là boolean`;
            }
            next[field] = payload[field];
        }
    }

    if ("quota" in payload) {
        if (!isRecord(payload.quota)) {
            return "quota không hợp lệ";
        }

        const unknownQuotaFields = Object.keys(payload.quota).filter(key => !QUOTA_FIELDS.includes(key as (typeof QUOTA_FIELDS)[number]));
        if (unknownQuotaFields.length > 0) {
            return `Trường quota không được hỗ trợ: ${unknownQuotaFields.join(", ")}`;
        }

        for (const field of QUOTA_FIELDS) {
            if (field in payload.quota) {
                const value = payload.quota[field];
                if (!isValidDailyLimit(value)) {
                    return `${field} phải là số nguyên từ 0 đến 1000`;
                }
                next.quota[field] = value;
            }
        }
    }

    return next;
}

export async function GET() {
    try {
        await requireActiveSessionUser("ADMIN");
        const [settings, rawSettings, policyVersion] = await Promise.all([
            getAIAdminSettings(),
            prisma.aISetting.findMany({
                select: {
                    key: true,
                    value: true,
                    updatedAt: true,
                    updatedById: true,
                },
                orderBy: { key: "asc" },
            }),
            getAIPolicyVersion(),
        ]);

        return NextResponse.json({
            settings,
            defaults: buildDefaultAIAdminSettings(),
            providerStatus: getAIProviderStatus(),
            rawSettings,
            policyVersion,
        });
    } catch (error) {
        if (isRouteError(error)) {
            return NextResponse.json({ message: error.message }, { status: error.status });
        }

        console.error("Error fetching AI settings:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    try {
        const sessionContext = await requireActiveSessionUser("ADMIN");
        const body = await request.json().catch(() => null);
        const current = await getAIAdminSettings();
        const validated = validateSettingsPayload(body, current);
        if (typeof validated === "string") {
            return badRequest(validated);
        }

        const quotaValue = {
            adminChatPerDay: validated.quota.adminChatPerDay,
            adminReviewPerDay: validated.quota.adminReviewPerDay,
            facilityChatPerDay: validated.quota.facilityChatPerDay,
            facilityReviewPerDay: validated.quota.facilityReviewPerDay,
        };

        await prisma.$transaction([
            prisma.aISetting.upsert({
                where: { key: AI_SETTING_KEYS.globalEnabled },
                create: { key: AI_SETTING_KEYS.globalEnabled, value: validated.globalEnabled, updatedById: sessionContext.user.id },
                update: { value: validated.globalEnabled, updatedById: sessionContext.user.id },
            }),
            prisma.aISetting.upsert({
                where: { key: AI_SETTING_KEYS.chatEnabled },
                create: { key: AI_SETTING_KEYS.chatEnabled, value: validated.chatEnabled, updatedById: sessionContext.user.id },
                update: { value: validated.chatEnabled, updatedById: sessionContext.user.id },
            }),
            prisma.aISetting.upsert({
                where: { key: AI_SETTING_KEYS.reviewEnabled },
                create: { key: AI_SETTING_KEYS.reviewEnabled, value: validated.reviewEnabled, updatedById: sessionContext.user.id },
                update: { value: validated.reviewEnabled, updatedById: sessionContext.user.id },
            }),
            prisma.aISetting.upsert({
                where: { key: AI_SETTING_KEYS.fallbackEnabled },
                create: { key: AI_SETTING_KEYS.fallbackEnabled, value: validated.fallbackEnabled, updatedById: sessionContext.user.id },
                update: { value: validated.fallbackEnabled, updatedById: sessionContext.user.id },
            }),
            prisma.aISetting.upsert({
                where: { key: AI_SETTING_KEYS.quota },
                create: { key: AI_SETTING_KEYS.quota, value: quotaValue, updatedById: sessionContext.user.id },
                update: { value: quotaValue, updatedById: sessionContext.user.id },
            }),
        ]);

        await logActivity({
            userId: sessionContext.user.id,
            action: "AI_AGENT_SETTINGS_UPDATED",
            entityType: "ai_agent_settings",
            details: {
                settings: validated,
            },
        });

        return NextResponse.json({
            settings: validated,
            providerStatus: getAIProviderStatus(),
            policyVersion: await getAIPolicyVersion(),
        });
    } catch (error) {
        if (isRouteError(error)) {
            return NextResponse.json({ message: error.message }, { status: error.status });
        }

        console.error("Error updating AI settings:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}
