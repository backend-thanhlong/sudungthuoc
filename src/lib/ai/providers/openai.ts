import { createOpenAI, type OpenAILanguageModelResponsesOptions } from "@ai-sdk/openai";
import type { AIModelRequest, AIModelResponse } from "@/lib/ai/types";
import { AIProviderError } from "@/lib/ai/providers/errors";
import { generateSDKProviderResponse } from "@/lib/ai/providers/sdk";

export async function generateOpenAIResponse(
    request: AIModelRequest,
    apiKey: string | undefined
): Promise<AIModelResponse> {
    if (!apiKey) {
        throw new AIProviderError("MISSING_OPENAI_API_KEY", "Chưa cấu hình OPENAI_API_KEY");
    }

    const openai = createOpenAI({ apiKey });
    return generateSDKProviderResponse({
        request,
        model: openai.responses(request.model),
        provider: "openai",
        providerErrorCode: "OPENAI_PROVIDER_ERROR",
        providerErrorMessage: "OpenAI API trả về lỗi",
        emptyResponseCode: "OPENAI_EMPTY_RESPONSE",
        emptyResponseMessage: "OpenAI không trả về nội dung",
        providerOptions: {
            openai: {
                store: false,
            } satisfies OpenAILanguageModelResponsesOptions,
        },
    });
}
