import prisma from "@/lib/prisma";
import type { AILogDetails, AIUsageEstimate } from "@/lib/ai/types";

const MODEL_PRICES_PER_MILLION: Record<string, { input: number; output: number }> = {
    "gemma-4-26b-a4b-it": { input: 0, output: 0 },
    "gemma-4-31b-it": { input: 0, output: 0 },
    "gemini-2.5-flash-lite": { input: 0.10, output: 0.40 },
    "deepseek-v4-flash": { input: 0.14, output: 0.28 },
    "gpt-5.4-nano": { input: 0.20, output: 1.25 },
    "gpt-5.4-mini": { input: 0.75, output: 4.50 },
};

export function estimateTokenCount(text: string) {
    if (!text) {
        return 0;
    }

    return Math.ceil(text.length / 4);
}

export function buildUsageEstimate({
    model,
    prompt,
    answer,
    inputTokens,
    outputTokens,
}: {
    model: string;
    prompt: string;
    answer: string;
    inputTokens?: number;
    outputTokens?: number;
}): AIUsageEstimate {
    const estimatedInputTokens = inputTokens ?? estimateTokenCount(prompt);
    const estimatedOutputTokens = outputTokens ?? estimateTokenCount(answer);
    const price = MODEL_PRICES_PER_MILLION[model];
    const estimatedCostUsd = price
        ? (estimatedInputTokens / 1_000_000) * price.input + (estimatedOutputTokens / 1_000_000) * price.output
        : undefined;

    return {
        inputTokens: estimatedInputTokens,
        outputTokens: estimatedOutputTokens,
        estimatedCostUsd: estimatedCostUsd === undefined
            ? undefined
            : Math.round(estimatedCostUsd * 1_000_000) / 1_000_000,
    };
}

export async function logAIActivity(userId: string, details: AILogDetails) {
    try {
        await prisma.activityLog.create({
            data: {
                userId,
                action: "AI_AGENT",
                entityType: "ai_agent",
                details: JSON.stringify(details),
            },
        });
    } catch (error) {
        console.error("Failed to log AI activity:", error);
    }
}
