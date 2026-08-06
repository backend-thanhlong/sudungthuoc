import type { Role } from "@/../prisma/generated/client";
import prisma from "@/lib/prisma";
import { RouteError, type ActiveSessionContext } from "@/lib/server-authz";
import { getAIConfig, type AIQuotaConfig } from "@/lib/ai/config";
import type { AIAgentMode, AIAgentRequest, AIProviderName } from "@/lib/ai/types";
import {
    AI_TOOL_REGISTRY,
    getAIToolDefinitionsForRole,
    isKnownAIToolName,
    type AIPolicyRole,
    type AIToolName,
} from "@/lib/ai/tool-registry";

export const AI_SETTING_KEYS = {
    globalEnabled: "globalEnabled",
    chatEnabled: "chatEnabled",
    reviewEnabled: "reviewEnabled",
    fallbackEnabled: "fallbackEnabled",
    quota: "quota",
} as const;

export const MAX_AI_DAILY_LIMIT = 1000;

export type AIToolPolicyMap = Partial<Record<AIToolName, boolean>>;

export type AIPolicyErrorCode = "AI_DISABLED" | "AI_MODE_DISABLED" | "AI_USER_DISABLED";

export interface AIAdminSettings {
    globalEnabled: boolean;
    chatEnabled: boolean;
    reviewEnabled: boolean;
    fallbackEnabled: boolean;
    quota: AIQuotaConfig;
}

export interface AIProviderRuntimeStatus {
    slot: "primary" | "fallback";
    provider: AIProviderName;
    model: string;
    configured: boolean;
}

export interface AIProviderStatus {
    hasGoogleApiKey: boolean;
    hasOpenAIApiKey: boolean;
    hasDeepSeekApiKey: boolean;
    primary: AIProviderRuntimeStatus;
    fallback: AIProviderRuntimeStatus;
}

export interface AIEffectivePolicy {
    userId: string;
    role: Role;
    mode: AIAgentMode;
    settings: AIAdminSettings;
    providerStatus: AIProviderStatus;
    globalEnabled: boolean;
    modeEnabled: boolean;
    userEnabled: boolean;
    enabled: boolean;
    quotaLimit: number;
    fallbackAllowed: boolean;
    toolPolicyMap: AIToolPolicyMap;
    policyVersion: string;
}

export class AIPolicyError extends RouteError {
    code: AIPolicyErrorCode;

    constructor(code: AIPolicyErrorCode, message: string) {
        super(403, message);
        this.name = "AIPolicyError";
        this.code = code;
    }
}

export function isAIPolicyRole(role: Role): role is AIPolicyRole {
    return role === "ADMIN" || role === "FACILITY";
}

export function buildDefaultAIAdminSettings(): AIAdminSettings {
    const config = getAIConfig();
    return {
        globalEnabled: true,
        chatEnabled: true,
        reviewEnabled: true,
        fallbackEnabled: config.fallbackEnabled,
        quota: { ...config.quota },
    };
}

export function isValidDailyLimit(value: unknown): value is number {
    return Number.isInteger(value) && Number(value) >= 0 && Number(value) <= MAX_AI_DAILY_LIMIT;
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function booleanSetting(value: unknown, fallback: boolean) {
    return typeof value === "boolean" ? value : fallback;
}

function quotaSetting(value: unknown, fallback: AIQuotaConfig): AIQuotaConfig {
    if (!isRecord(value)) {
        return fallback;
    }

    return {
        adminChatPerDay: isValidDailyLimit(value.adminChatPerDay) ? value.adminChatPerDay : fallback.adminChatPerDay,
        adminReviewPerDay: isValidDailyLimit(value.adminReviewPerDay) ? value.adminReviewPerDay : fallback.adminReviewPerDay,
        facilityChatPerDay: isValidDailyLimit(value.facilityChatPerDay) ? value.facilityChatPerDay : fallback.facilityChatPerDay,
        facilityReviewPerDay: isValidDailyLimit(value.facilityReviewPerDay) ? value.facilityReviewPerDay : fallback.facilityReviewPerDay,
    };
}

export async function getAIAdminSettings(): Promise<AIAdminSettings> {
    const defaults = buildDefaultAIAdminSettings();
    const rows = await prisma.aISetting.findMany({
        where: {
            key: {
                in: Object.values(AI_SETTING_KEYS),
            },
        },
        select: {
            key: true,
            value: true,
        },
    });
    const values = new Map(rows.map(row => [row.key, row.value as unknown]));

    return {
        globalEnabled: booleanSetting(values.get(AI_SETTING_KEYS.globalEnabled), defaults.globalEnabled),
        chatEnabled: booleanSetting(values.get(AI_SETTING_KEYS.chatEnabled), defaults.chatEnabled),
        reviewEnabled: booleanSetting(values.get(AI_SETTING_KEYS.reviewEnabled), defaults.reviewEnabled),
        fallbackEnabled: booleanSetting(values.get(AI_SETTING_KEYS.fallbackEnabled), defaults.fallbackEnabled),
        quota: quotaSetting(values.get(AI_SETTING_KEYS.quota), defaults.quota),
    };
}

function hasProviderApiKey(provider: AIProviderName, status: Pick<AIProviderStatus, "hasGoogleApiKey" | "hasOpenAIApiKey" | "hasDeepSeekApiKey">) {
    if (provider === "google") {
        return status.hasGoogleApiKey;
    }
    if (provider === "deepseek") {
        return status.hasDeepSeekApiKey;
    }
    return status.hasOpenAIApiKey;
}

export function getAIProviderStatus(): AIProviderStatus {
    const config = getAIConfig();
    const keyStatus = {
        hasGoogleApiKey: Boolean(config.googleApiKey),
        hasOpenAIApiKey: Boolean(config.openaiApiKey),
        hasDeepSeekApiKey: Boolean(config.deepseekApiKey),
    };

    return {
        ...keyStatus,
        primary: {
            slot: "primary",
            provider: config.primaryProvider,
            model: config.primaryModel,
            configured: hasProviderApiKey(config.primaryProvider, keyStatus),
        },
        fallback: {
            slot: "fallback",
            provider: config.fallbackProvider,
            model: config.fallbackModel,
            configured: hasProviderApiKey(config.fallbackProvider, keyStatus),
        },
    };
}

export function getQuotaLimitForRoleMode(settings: AIAdminSettings, role: Role, mode: AIAgentMode) {
    if (role === "ADMIN") {
        return mode === "review" ? settings.quota.adminReviewPerDay : settings.quota.adminChatPerDay;
    }

    return mode === "review" ? settings.quota.facilityReviewPerDay : settings.quota.facilityChatPerDay;
}

export async function getAIToolPolicyMap(role: Role): Promise<AIToolPolicyMap> {
    const supportedTools = getAIToolDefinitionsForRole(role);
    const policyMap: AIToolPolicyMap = {};
    for (const tool of supportedTools) {
        policyMap[tool.name] = true;
    }

    if (!isAIPolicyRole(role) || supportedTools.length === 0) {
        return policyMap;
    }

    const supportedToolNames = new Set(supportedTools.map(tool => tool.name));
    const storedPolicies = await prisma.aIToolPolicy.findMany({
        where: { role },
        select: {
            toolName: true,
            enabled: true,
        },
    });

    for (const storedPolicy of storedPolicies) {
        if (!isKnownAIToolName(storedPolicy.toolName) || !supportedToolNames.has(storedPolicy.toolName)) {
            continue;
        }
        policyMap[storedPolicy.toolName] = storedPolicy.enabled;
    }

    return policyMap;
}

export async function getAIPolicyVersion() {
    const [settings, users, tools] = await Promise.all([
        prisma.aISetting.aggregate({ _max: { updatedAt: true } }),
        prisma.aIUserPolicy.aggregate({ _max: { updatedAt: true } }),
        prisma.aIToolPolicy.aggregate({ _max: { updatedAt: true } }),
    ]);
    const latest = [
        settings._max.updatedAt,
        users._max.updatedAt,
        tools._max.updatedAt,
    ]
        .filter((date): date is Date => Boolean(date))
        .sort((left, right) => right.getTime() - left.getTime())[0];

    return latest ? latest.toISOString() : "default";
}

export async function getEffectiveAIPolicy(
    sessionContext: ActiveSessionContext,
    request: AIAgentRequest
): Promise<AIEffectivePolicy> {
    const [settings, providerStatus, userPolicy, toolPolicyMap, policyVersion] = await Promise.all([
        getAIAdminSettings(),
        Promise.resolve(getAIProviderStatus()),
        isAIPolicyRole(sessionContext.user.role)
            ? prisma.aIUserPolicy.findUnique({
                where: { userId: sessionContext.user.id },
                select: {
                    enabled: true,
                    chatDailyLimit: true,
                    reviewDailyLimit: true,
                    allowFallback: true,
                },
            })
            : Promise.resolve(null),
        getAIToolPolicyMap(sessionContext.user.role),
        getAIPolicyVersion(),
    ]);

    const role = sessionContext.user.role;
    const baseQuotaLimit = getQuotaLimitForRoleMode(settings, role, request.mode);
    const userQuotaLimit = request.mode === "review"
        ? userPolicy?.reviewDailyLimit
        : userPolicy?.chatDailyLimit;
    const quotaLimit = isValidDailyLimit(userQuotaLimit) ? userQuotaLimit : baseQuotaLimit;
    const globalEnabled = settings.globalEnabled && role !== "COMPANY";
    const modeEnabled = request.mode === "review" ? settings.reviewEnabled : settings.chatEnabled;
    const userEnabled = userPolicy?.enabled === false ? false : true;
    const fallbackPolicyEnabled = userPolicy?.allowFallback ?? settings.fallbackEnabled;
    const fallbackAllowed = Boolean(fallbackPolicyEnabled && providerStatus.fallback.configured && role === "ADMIN");

    return {
        userId: sessionContext.user.id,
        role,
        mode: request.mode,
        settings,
        providerStatus,
        globalEnabled,
        modeEnabled,
        userEnabled,
        enabled: globalEnabled && modeEnabled && userEnabled,
        quotaLimit,
        fallbackAllowed,
        toolPolicyMap,
        policyVersion,
    };
}

export function assertAIEnabledForRequest(policy: AIEffectivePolicy) {
    if (!policy.globalEnabled) {
        throw new AIPolicyError("AI_DISABLED", "AI Agent đang bị tắt cho hệ thống hoặc vai trò hiện tại");
    }

    if (!policy.modeEnabled) {
        throw new AIPolicyError("AI_MODE_DISABLED", "Chế độ AI này đang bị tắt");
    }

    if (!policy.userEnabled) {
        throw new AIPolicyError("AI_USER_DISABLED", "Tài khoản này đang bị tắt quyền dùng AI");
    }
}

export function getAllAIToolDefinitions() {
    return AI_TOOL_REGISTRY;
}
