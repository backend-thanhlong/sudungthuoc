import { createHash } from "crypto";
import type { ActiveSessionContext } from "@/lib/server-authz";
import type { AIAgentRequest, AIAgentResponse } from "@/lib/ai/types";

const CACHE_TTL_MS = 5 * 60 * 1000;
const MAX_CACHE_ENTRIES = 200;
const CACHE_VERSION = "ai-agent-response-v2";

type CacheEntry = {
    expiresAt: number;
    response: AIAgentResponse;
};

const responseCache = new Map<string, CacheEntry>();

function stableValue(value: unknown): unknown {
    if (Array.isArray(value)) {
        return value.map(item => stableValue(item));
    }

    if (value && typeof value === "object") {
        return Object.fromEntries(
            Object.entries(value as Record<string, unknown>)
                .filter(([, entryValue]) => entryValue !== undefined)
                .sort(([left], [right]) => left.localeCompare(right))
                .map(([key, entryValue]) => [key, stableValue(entryValue)])
        );
    }

    return value;
}

function digest(value: unknown) {
    return createHash("sha256")
        .update(JSON.stringify(stableValue(value)))
        .digest("hex")
        .slice(0, 32);
}

function cloneResponse(response: AIAgentResponse): AIAgentResponse {
    return {
        ...response,
        toolCalls: response.toolCalls.map(toolCall => ({ ...toolCall })),
        warnings: [...response.warnings],
        usage: response.usage ? { ...response.usage } : undefined,
    };
}

function pruneExpiredEntries(now = Date.now()) {
    for (const [key, entry] of responseCache.entries()) {
        if (entry.expiresAt < now) {
            responseCache.delete(key);
        }
    }
}

function pruneOldestEntries() {
    while (responseCache.size > MAX_CACHE_ENTRIES) {
        const oldestKey = responseCache.keys().next().value as string | undefined;
        if (!oldestKey) {
            break;
        }
        responseCache.delete(oldestKey);
    }
}

export function buildAIResponseCacheKey(
    sessionContext: ActiveSessionContext,
    request: AIAgentRequest,
    policyVersion = "default"
) {
    const context = request.context || {};
    const facilityScope = sessionContext.user.role === "FACILITY"
        ? sessionContext.user.id
        : context.facilityId || "all";

    return digest({
        version: CACHE_VERSION,
        policyVersion,
        userId: sessionContext.user.id,
        role: sessionContext.user.role,
        facilityScope,
        mode: request.mode,
        surface: request.surface || "dashboard",
        message: request.message,
        useFallback: request.useFallback === true,
        modelChoice: request.modelChoice || "system-default",
        context: {
            entityId: context.entityId,
            filters: context.filters || {},
            pathname: context.pathname,
            reportMonth: context.reportMonth,
        },
        evidence: request.mode === "review" ? request.evidence || null : null,
    });
}

export function getCachedAIResponse(key: string): AIAgentResponse | null {
    const cached = responseCache.get(key);
    if (!cached) {
        return null;
    }

    if (cached.expiresAt < Date.now()) {
        responseCache.delete(key);
        return null;
    }

    const response = cloneResponse(cached.response);
    if (!response.warnings.includes("CACHE_HIT")) {
        response.warnings.push("CACHE_HIT");
    }
    return response;
}

export function setCachedAIResponse(key: string, response: AIAgentResponse) {
    pruneExpiredEntries();
    responseCache.set(key, {
        expiresAt: Date.now() + CACHE_TTL_MS,
        response: cloneResponse(response),
    });
    pruneOldestEntries();
}
