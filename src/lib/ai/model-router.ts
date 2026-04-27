import type { Role } from "@/../prisma/generated/client";
import { getAIConfig } from "@/lib/ai/config";
import type { AIModelRequest, AIModelResponse, AIResolvedModel, AITaskType } from "@/lib/ai/types";
import { generateGoogleResponse } from "@/lib/ai/providers/google";
import { generateOpenAIResponse } from "@/lib/ai/providers/openai";

interface ResolveModelParams {
    taskType: AITaskType;
    role: Role;
    useFallback?: boolean;
}

function canUseFallback({ taskType, role, useFallback }: ResolveModelParams) {
    if (!useFallback || role !== "ADMIN") {
        return false;
    }

    return taskType === "deep_analysis" || taskType === "executive_report";
}

export function resolveAIModel(params: ResolveModelParams): AIResolvedModel {
    const config = getAIConfig();
    if (config.fallbackEnabled && canUseFallback(params)) {
        return {
            provider: config.fallbackProvider,
            model: config.fallbackModel,
            usedFallback: true,
        };
    }

    return {
        provider: config.primaryProvider,
        model: config.primaryModel,
        usedFallback: false,
    };
}

export async function generateRoutedAIResponse(
    model: AIResolvedModel,
    request: Omit<AIModelRequest, "model">
): Promise<AIModelResponse> {
    const config = getAIConfig();
    const modelRequest = {
        ...request,
        model: model.model,
    };

    if (model.provider === "openai") {
        return generateOpenAIResponse(modelRequest, config.openaiApiKey);
    }

    return generateGoogleResponse(modelRequest, config.googleApiKey);
}
