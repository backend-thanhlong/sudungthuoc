export const DEFAULT_AI_MODEL_CHOICE = "system-default";
export const GEMINI_31_FLASH_LITE_MODEL = "gemini-3.1-flash-lite-preview";
export const DEEPSEEK_V4_FLASH_MODEL = "deepseek-v4-flash";

export const AI_CHAT_MODEL_OPTIONS = [
    {
        value: DEFAULT_AI_MODEL_CHOICE,
        label: "Mặc định hệ thống",
        description: "Dùng primary/fallback theo cấu hình server",
    },
    {
        value: GEMINI_31_FLASH_LITE_MODEL,
        label: "Gemini 3.1 Flash Lite",
        description: "Model Google Gemini tốc độ cao",
    },
    {
        value: DEEPSEEK_V4_FLASH_MODEL,
        label: "DeepSeek V4 Flash",
        description: "Model DeepSeek tốc độ cao",
    },
] as const;

export type AIChatModelChoice = (typeof AI_CHAT_MODEL_OPTIONS)[number]["value"];

export interface AIExplicitModelSelection {
    provider: "google" | "deepseek";
    model: string;
}

export function normalizeAIChatModelChoice(value: unknown): AIChatModelChoice {
    if (value === GEMINI_31_FLASH_LITE_MODEL || value === DEEPSEEK_V4_FLASH_MODEL) {
        return value;
    }

    return DEFAULT_AI_MODEL_CHOICE;
}

export function resolveExplicitChatModel(choice?: AIChatModelChoice): AIExplicitModelSelection | null {
    if (choice === GEMINI_31_FLASH_LITE_MODEL) {
        return {
            provider: "google",
            model: GEMINI_31_FLASH_LITE_MODEL,
        };
    }

    if (choice === DEEPSEEK_V4_FLASH_MODEL) {
        return {
            provider: "deepseek",
            model: DEEPSEEK_V4_FLASH_MODEL,
        };
    }

    return null;
}
