import type { Role } from "@/../prisma/generated/client";
import { getAIConfig } from "@/lib/ai/config";
import type { AIModelRequest, AIModelResponse, AIResolvedModel, AITaskType } from "@/lib/ai/types";
import type { AIChatModelChoice } from "@/lib/ai/model-options";
import { resolveExplicitChatModel } from "@/lib/ai/model-options";
import { generateDeepSeekResponse } from "@/lib/ai/providers/deepseek";
import { generateGoogleResponse } from "@/lib/ai/providers/google";
import { generateOpenAIResponse } from "@/lib/ai/providers/openai";

interface ResolveModelParams {
    taskType: AITaskType;
    role: Role;
    useFallback?: boolean;
    fallbackAllowed?: boolean;
    modelChoice?: AIChatModelChoice;
}

function canUseFallback({ taskType, role, useFallback }: ResolveModelParams) {
    if (!useFallback || role !== "ADMIN") {
        return false;
    }

    return taskType === "deep_analysis" || taskType === "executive_report";
}

export function resolveAIModel(params: ResolveModelParams): AIResolvedModel {
    const config = getAIConfig();
    const explicitModel = resolveExplicitChatModel(params.modelChoice);
    if (explicitModel) {
        return {
            provider: explicitModel.provider,
            model: explicitModel.provider === "deepseek"
                ? config.deepseekModel
                : explicitModel.model,
            usedFallback: false,
        };
    }

    if (params.fallbackAllowed === true && canUseFallback(params)) {
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
    if (model.provider === "deepseek") {
        return generateDeepSeekResponse(modelRequest, config.deepseekApiKey);
    }

    return generateGoogleResponse(modelRequest, config.googleApiKey);
}
