import type { Role } from "@/../prisma/generated/client";
import prisma from "@/lib/prisma";
import { getAIConfig } from "@/lib/ai/config";
import type { AIAgentMode } from "@/lib/ai/types";

export class AIRateLimitError extends Error {
    limit: number;

    constructor(limit: number) {
        super("AI request quota exceeded");
        this.name = "AIRateLimitError";
        this.limit = limit;
    }
}

function getStartOfToday() {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function getLimit(role: Role, mode: AIAgentMode, limitOverride?: number) {
    if (typeof limitOverride === "number" && Number.isInteger(limitOverride) && limitOverride >= 0) {
        return limitOverride;
    }

    const config = getAIConfig();
    if (role === "ADMIN") {
        return mode === "review" ? config.quota.adminReviewPerDay : config.quota.adminChatPerDay;
    }

    return mode === "review" ? config.quota.facilityReviewPerDay : config.quota.facilityChatPerDay;
}

function detailsContainsMode(details: string | null, mode: AIAgentMode) {
    return Boolean(details?.includes(`"mode":"${mode}"`));
}

export async function assertWithinAIQuota(userId: string, role: Role, mode: AIAgentMode, limitOverride?: number) {
    const limit = getLimit(role, mode, limitOverride);
    const logs = await prisma.activityLog.findMany({
        where: {
            userId,
            action: "AI_AGENT",
            createdAt: {
                gte: getStartOfToday(),
            },
        },
        select: {
            details: true,
        },
        take: Math.max(limit * 2, 100),
        orderBy: {
            createdAt: "desc",
        },
    });

    const used = logs.filter(log => detailsContainsMode(log.details, mode)).length;
    if (used >= limit) {
        throw new AIRateLimitError(limit);
    }
}
