import type { AIProviderName } from "@/lib/ai/types";

export interface AIQuotaConfig {
    adminChatPerDay: number;
    adminReviewPerDay: number;
    facilityChatPerDay: number;
    facilityReviewPerDay: number;
}

export interface AIConfig {
    primaryProvider: AIProviderName;
    primaryModel: string;
    fallbackProvider: AIProviderName;
    fallbackModel: string;
    fallbackEnabled: boolean;
    maxOutputTokens: number;
    providerTimeoutMs: number;
    googleApiKey?: string;
    openaiApiKey?: string;
    quota: AIQuotaConfig;
}

const parseIntEnv = (value: string | undefined, fallback: number) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const parseProvider = (value: string | undefined, fallback: AIProviderName): AIProviderName =>
    value === "openai" || value === "google" ? value : fallback;

export function getAIConfig(): AIConfig {
    return {
        primaryProvider: parseProvider(process.env.AI_PRIMARY_PROVIDER, "google"),
        primaryModel: process.env.AI_PRIMARY_MODEL || "gemini-2.5-flash-lite",
        fallbackProvider: parseProvider(process.env.AI_FALLBACK_PROVIDER, "openai"),
        fallbackModel: process.env.AI_FALLBACK_MODEL || "gpt-5.4-mini",
        fallbackEnabled: process.env.AI_ENABLE_FALLBACK === "true",
        maxOutputTokens: parseIntEnv(process.env.AI_MAX_OUTPUT_TOKENS, 1200),
        providerTimeoutMs: parseIntEnv(process.env.AI_PROVIDER_TIMEOUT_MS, 30000),
        googleApiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY,
        openaiApiKey: process.env.OPENAI_API_KEY,
        quota: {
            adminChatPerDay: parseIntEnv(process.env.AI_ADMIN_CHAT_DAILY_LIMIT, 80),
            adminReviewPerDay: parseIntEnv(process.env.AI_ADMIN_REVIEW_DAILY_LIMIT, 40),
            facilityChatPerDay: parseIntEnv(process.env.AI_FACILITY_CHAT_DAILY_LIMIT, 30),
            facilityReviewPerDay: parseIntEnv(process.env.AI_FACILITY_REVIEW_DAILY_LIMIT, 15),
        },
    };
}
