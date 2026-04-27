import type { AIModelRequest, AIModelResponse } from "@/lib/ai/types";
import { AIProviderError } from "@/lib/ai/providers/google";

interface OpenAIResponsesResponse {
    output_text?: string;
    output?: Array<{
        type?: string;
        content?: Array<{
            type?: string;
            text?: string;
        }>;
    }>;
    usage?: {
        input_tokens?: number;
        output_tokens?: number;
        total_tokens?: number;
    };
    error?: {
        message?: string;
        code?: string;
    };
}

function extractOutputText(data: OpenAIResponsesResponse | null) {
    if (data?.output_text?.trim()) {
        return data.output_text.trim();
    }

    return data?.output
        ?.flatMap(item => item.content || [])
        .filter(content => content.type === "output_text" && content.text)
        .map(content => content.text)
        .join("")
        .trim() || "";
}

export async function generateOpenAIResponse(
    request: AIModelRequest,
    apiKey: string | undefined
): Promise<AIModelResponse> {
    if (!apiKey) {
        throw new AIProviderError("MISSING_OPENAI_API_KEY", "Chưa cấu hình OPENAI_API_KEY");
    }

    const response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            model: request.model,
            instructions: request.systemPrompt,
            input: request.prompt,
            max_output_tokens: request.maxOutputTokens,
            store: false,
        }),
        signal: request.signal,
    });

    const data = await response.json().catch(() => null) as OpenAIResponsesResponse | null;
    if (!response.ok) {
        throw new AIProviderError(
            data?.error?.code || "OPENAI_PROVIDER_ERROR",
            data?.error?.message || "OpenAI API trả về lỗi",
            response.status
        );
    }

    const text = extractOutputText(data);
    if (!text) {
        throw new AIProviderError("OPENAI_EMPTY_RESPONSE", "OpenAI không trả về nội dung", response.status);
    }

    return {
        text,
        model: request.model,
        provider: "openai",
        usage: {
            inputTokens: data?.usage?.input_tokens,
            outputTokens: data?.usage?.output_tokens,
            totalTokens: data?.usage?.total_tokens,
        },
    };
}
