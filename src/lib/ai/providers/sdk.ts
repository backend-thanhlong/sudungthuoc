import { generateText, type LanguageModel } from "ai";
import type { AIModelRequest, AIModelResponse, AIProviderName } from "@/lib/ai/types";
import { AIProviderError } from "@/lib/ai/providers/errors";

type GenerateTextOptions = Parameters<typeof generateText>[0];
type GenerateTextProviderOptions = GenerateTextOptions extends { providerOptions?: infer Options }
    ? Options
    : never;

interface GenerateSDKProviderResponseParams {
    request: AIModelRequest;
    model: LanguageModel;
    provider: AIProviderName;
    providerErrorCode: string;
    providerErrorMessage: string;
    emptyResponseCode: string;
    emptyResponseMessage: string;
    temperature?: number;
    providerOptions?: GenerateTextProviderOptions;
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function errorMessage(error: unknown, fallback: string) {
    return error instanceof Error && error.message ? error.message : fallback;
}

function errorStatus(error: unknown): number | undefined {
    if (!isRecord(error)) {
        return undefined;
    }

    if (typeof error.statusCode === "number") {
        return error.statusCode;
    }
    if (typeof error.status === "number") {
        return error.status;
    }
    if (isRecord(error.cause)) {
        return errorStatus(error.cause);
    }

    return undefined;
}

export async function generateSDKProviderResponse({
    request,
    model,
    provider,
    providerErrorCode,
    providerErrorMessage,
    emptyResponseCode,
    emptyResponseMessage,
    temperature,
    providerOptions,
}: GenerateSDKProviderResponseParams): Promise<AIModelResponse> {
    try {
        const result = await generateText({
            model,
            system: request.systemPrompt,
            prompt: request.prompt,
            maxOutputTokens: request.maxOutputTokens,
            maxRetries: 0,
            abortSignal: request.signal,
            ...(temperature === undefined ? {} : { temperature }),
            ...(providerOptions === undefined ? {} : { providerOptions }),
        });

        const text = result.text.trim();
        if (!text) {
            throw new AIProviderError(emptyResponseCode, emptyResponseMessage);
        }

        return {
            text,
            model: request.model,
            provider,
            usage: {
                inputTokens: result.usage.inputTokens,
                outputTokens: result.usage.outputTokens,
                totalTokens: result.usage.totalTokens,
            },
        };
    } catch (error) {
        if (error instanceof AIProviderError) {
            throw error;
        }
        if (request.signal?.aborted) {
            throw new DOMException("Provider AI phản hồi quá thời gian cho phép", "AbortError");
        }

        throw new AIProviderError(
            providerErrorCode,
            errorMessage(error, providerErrorMessage),
            errorStatus(error)
        );
    }
}
