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
    deepseekApiKey?: string;
    deepseekModel: string;
    quota: AIQuotaConfig;
}

const parseIntEnv = (value: string | undefined, fallback: number) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const parseProvider = (value: string | undefined, fallback: AIProviderName): AIProviderName =>
    value === "openai" || value === "google" || value === "deepseek" ? value : fallback;

export function getAIConfig(): AIConfig {
    return {
        primaryProvider: parseProvider(process.env.AI_PRIMARY_PROVIDER, "google"),
        primaryModel: process.env.AI_PRIMARY_MODEL || "gemini-3.1-flash-lite-preview",
        fallbackProvider: parseProvider(process.env.AI_FALLBACK_PROVIDER, "google"),
        fallbackModel: process.env.AI_FALLBACK_MODEL || "gemma-4-31b-it",
        fallbackEnabled: process.env.AI_ENABLE_FALLBACK === "true",
        maxOutputTokens: parseIntEnv(process.env.AI_MAX_OUTPUT_TOKENS, 3000),
        providerTimeoutMs: parseIntEnv(process.env.AI_PROVIDER_TIMEOUT_MS, 60000),
        googleApiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY,
        openaiApiKey: process.env.OPENAI_API_KEY,
        deepseekApiKey: process.env.DEEPSEEK_API_KEY,
        deepseekModel: process.env.AI_DEEPSEEK_MODEL || "deepseek-v4-flash",
        quota: {
            adminChatPerDay: parseIntEnv(process.env.AI_ADMIN_CHAT_DAILY_LIMIT, 80),
            adminReviewPerDay: parseIntEnv(process.env.AI_ADMIN_REVIEW_DAILY_LIMIT, 40),
            facilityChatPerDay: parseIntEnv(process.env.AI_FACILITY_CHAT_DAILY_LIMIT, 30),
            facilityReviewPerDay: parseIntEnv(process.env.AI_FACILITY_REVIEW_DAILY_LIMIT, 15),
        },
    };
}
