import { createDeepSeek } from "@ai-sdk/deepseek";
import type { AIModelRequest, AIModelResponse } from "@/lib/ai/types";
import { AIProviderError } from "@/lib/ai/providers/errors";
import { generateSDKProviderResponse } from "@/lib/ai/providers/sdk";

export async function generateDeepSeekResponse(
    request: AIModelRequest,
    apiKey: string | undefined
): Promise<AIModelResponse> {
    if (!apiKey) {
        throw new AIProviderError("MISSING_DEEPSEEK_API_KEY", "Chưa cấu hình DEEPSEEK_API_KEY");
    }

    const deepseek = createDeepSeek({ apiKey });
    return generateSDKProviderResponse({
        request,
        model: deepseek(request.model),
        provider: "deepseek",
        providerErrorCode: "DEEPSEEK_PROVIDER_ERROR",
        providerErrorMessage: "DeepSeek API trả về lỗi",
        emptyResponseCode: "DEEPSEEK_EMPTY_RESPONSE",
        emptyResponseMessage: "DeepSeek không trả về nội dung",
        temperature: 0.2,
    });
}
