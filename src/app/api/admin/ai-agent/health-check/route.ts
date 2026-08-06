import { NextResponse } from "next/server";
import { logActivity } from "@/lib/activity-log";
import { getAIConfig } from "@/lib/ai/config";
import { getAIProviderStatus } from "@/lib/ai/admin-config";
import { generateDeepSeekResponse } from "@/lib/ai/providers/deepseek";
import { AIProviderError, generateGoogleResponse } from "@/lib/ai/providers/google";
import { generateOpenAIResponse } from "@/lib/ai/providers/openai";
import type { AIModelRequest, AIProviderName } from "@/lib/ai/types";
import { isRouteError, requireActiveSessionUser } from "@/lib/server-authz";

type ProviderSlot = "primary" | "fallback";

function isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function makeTimeoutSignal(timeoutMs: number) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    return { signal: controller.signal, clear: () => clearTimeout(timeout) };
}

function getApiKey(provider: AIProviderName) {
    const config = getAIConfig();
    if (provider === "google") {
        return config.googleApiKey;
    }
    if (provider === "deepseek") {
        return config.deepseekApiKey;
    }
    return config.openaiApiKey;
}

function missingKeyCode(provider: AIProviderName) {
    if (provider === "google") {
        return "MISSING_GOOGLE_API_KEY";
    }
    if (provider === "deepseek") {
        return "MISSING_DEEPSEEK_API_KEY";
    }
    return "MISSING_OPENAI_API_KEY";
}

function generateHealthResponse(provider: AIProviderName, modelRequest: AIModelRequest) {
    if (provider === "google") {
        return generateGoogleResponse(modelRequest, getApiKey(provider));
    }
    if (provider === "deepseek") {
        return generateDeepSeekResponse(modelRequest, getApiKey(provider));
    }
    return generateOpenAIResponse(modelRequest, getApiKey(provider));
}

export async function POST(request: Request) {
    let slot: ProviderSlot = "primary";
    const startedAt = Date.now();

    try {
        const sessionContext = await requireActiveSessionUser("ADMIN");
        const body = await request.json().catch(() => null);
        if (!isRecord(body) || (body.provider !== "primary" && body.provider !== "fallback")) {
            return NextResponse.json({ message: "provider phải là primary hoặc fallback" }, { status: 400 });
        }
        slot = body.provider;

        const config = getAIConfig();
        const providerStatus = getAIProviderStatus();
        const runtime = providerStatus[slot];
        if (!runtime.configured) {
            const payload = {
                ok: false,
                provider: runtime.provider,
                model: runtime.model,
                configured: false,
                latencyMs: Date.now() - startedAt,
                errorCode: missingKeyCode(runtime.provider),
                message: "Provider chưa có API key runtime",
            };
            await logActivity({
                userId: sessionContext.user.id,
                action: "AI_AGENT_HEALTH_CHECK",
                entityType: "ai_agent_health_check",
                details: {
                    slot,
                    ...payload,
                },
            });
            return NextResponse.json(payload, { status: 400 });
        }

        const timeout = makeTimeoutSignal(Math.min(config.providerTimeoutMs, 10000));
        try {
            const modelRequest = {
                model: runtime.model,
                systemPrompt: "Bạn là health check kỹ thuật. Trả lời ngắn gọn.",
                prompt: "Trả lời đúng một từ: OK",
                maxOutputTokens: 16,
                signal: timeout.signal,
            };
            const result = await generateHealthResponse(runtime.provider, modelRequest);
            const payload = {
                ok: true,
                provider: runtime.provider,
                model: runtime.model,
                configured: true,
                latencyMs: Date.now() - startedAt,
                message: result.text.slice(0, 80),
            };
            await logActivity({
                userId: sessionContext.user.id,
                action: "AI_AGENT_HEALTH_CHECK",
                entityType: "ai_agent_health_check",
                details: {
                    slot,
                    ...payload,
                },
            });
            return NextResponse.json(payload);
        } finally {
            timeout.clear();
        }
    } catch (error) {
        if (isRouteError(error)) {
            return NextResponse.json({ message: error.message }, { status: error.status });
        }

        const latencyMs = Date.now() - startedAt;
        const status = getAIProviderStatus()[slot];
        const errorCode = error instanceof AIProviderError
            ? error.code
            : error instanceof DOMException && error.name === "AbortError"
                ? "AI_PROVIDER_TIMEOUT"
                : "AI_HEALTH_CHECK_ERROR";
        const message = error instanceof Error ? error.message : "Health check thất bại";
        const providerStatus = error instanceof AIProviderError ? error.status : undefined;
        const sessionContext = await requireActiveSessionUser("ADMIN").catch(() => null);
        if (sessionContext) {
            await logActivity({
                userId: sessionContext.user.id,
                action: "AI_AGENT_HEALTH_CHECK",
                entityType: "ai_agent_health_check",
                details: {
                    slot,
                    ok: false,
                    provider: status.provider,
                    model: status.model,
                    configured: status.configured,
                    latencyMs,
                    errorCode,
                    message,
                    providerStatus,
                    providerMessage: message,
                },
            });
        }

        return NextResponse.json({
            ok: false,
            provider: status.provider,
            model: status.model,
            configured: status.configured,
            latencyMs,
            errorCode,
            message,
        }, { status: providerStatus || 502 });
    }
}
