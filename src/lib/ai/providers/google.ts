import { createGoogleGenerativeAI } from "@ai-sdk/google";
import type { AIModelRequest, AIModelResponse } from "@/lib/ai/types";
export { AIProviderError } from "@/lib/ai/providers/errors";
import { AIProviderError } from "@/lib/ai/providers/errors";
import { generateSDKProviderResponse } from "@/lib/ai/providers/sdk";

export async function generateGoogleResponse(
    request: AIModelRequest,
    apiKey: string | undefined
): Promise<AIModelResponse> {
    if (!apiKey) {
        throw new AIProviderError("MISSING_GOOGLE_API_KEY", "Chưa cấu hình GOOGLE_GENERATIVE_AI_API_KEY");
    }

    const google = createGoogleGenerativeAI({ apiKey });
    return generateSDKProviderResponse({
        request,
        model: google(request.model),
        provider: "google",
        providerErrorCode: "GOOGLE_PROVIDER_ERROR",
        providerErrorMessage: "Google Gemini API trả về lỗi",
        emptyResponseCode: "GOOGLE_EMPTY_RESPONSE",
        emptyResponseMessage: "Gemini không trả về nội dung",
        temperature: 0.2,
    });
}
