import type { AIModelRequest, AIModelResponse } from "@/lib/ai/types";

export class AIProviderError extends Error {
    code: string;
    status?: number;

    constructor(code: string, message: string, status?: number) {
        super(message);
        this.name = "AIProviderError";
        this.code = code;
        this.status = status;
    }
}

interface GoogleGenerateContentResponse {
    candidates?: Array<{
        content?: {
            parts?: Array<{
                text?: string;
            }>;
        };
        finishReason?: string;
        finishMessage?: string;
    }>;
    promptFeedback?: {
        blockReason?: string;
    };
    usageMetadata?: {
        promptTokenCount?: number;
        candidatesTokenCount?: number;
        totalTokenCount?: number;
    };
    error?: {
        message?: string;
        status?: string;
    };
}

export async function generateGoogleResponse(
    request: AIModelRequest,
    apiKey: string | undefined
): Promise<AIModelResponse> {
    if (!apiKey) {
        throw new AIProviderError("MISSING_GOOGLE_API_KEY", "Chưa cấu hình GOOGLE_GENERATIVE_AI_API_KEY");
    }

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(request.model)}:generateContent`;
    const response = await fetch(endpoint, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
            system_instruction: {
                parts: [{ text: request.systemPrompt }],
            },
            contents: [
                {
                    role: "user",
                    parts: [{ text: request.prompt }],
                },
            ],
            generationConfig: {
                maxOutputTokens: request.maxOutputTokens,
                temperature: 0.2,
            },
        }),
        signal: request.signal,
    });

    const data = await response.json().catch(() => null) as GoogleGenerateContentResponse | null;
    if (!response.ok) {
        throw new AIProviderError(
            data?.error?.status || "GOOGLE_PROVIDER_ERROR",
            data?.error?.message || "Google Gemini API trả về lỗi",
            response.status
        );
    }

    if (data?.promptFeedback?.blockReason) {
        throw new AIProviderError(
            "GOOGLE_PROMPT_BLOCKED",
            `Gemini chặn prompt: ${data.promptFeedback.blockReason}`,
            response.status
        );
    }

    const firstCandidate = data?.candidates?.[0];
    const text = firstCandidate?.content?.parts
        ?.map(part => part.text || "")
        .join("")
        .trim();

    if (!text) {
        throw new AIProviderError(
            firstCandidate?.finishReason || "GOOGLE_EMPTY_RESPONSE",
            firstCandidate?.finishMessage || "Gemini không trả về nội dung",
            response.status
        );
    }

    return {
        text,
        model: request.model,
        provider: "google",
        usage: {
            inputTokens: data?.usageMetadata?.promptTokenCount,
            outputTokens: data?.usageMetadata?.candidatesTokenCount,
            totalTokens: data?.usageMetadata?.totalTokenCount,
        },
    };
}
