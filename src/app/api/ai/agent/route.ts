import { NextResponse } from "next/server";
import { requireActiveSessionUser, RouteError, isRouteError } from "@/lib/server-authz";
import { getAIConfig } from "@/lib/ai/config";
import { generateRoutedAIResponse, resolveAIModel } from "@/lib/ai/model-router";
import { buildSystemPrompt, buildUserPrompt, inferTaskType } from "@/lib/ai/prompts";
import { AIRateLimitError, assertWithinAIQuota } from "@/lib/ai/rate-limit";
import { normalizeAgentRequest } from "@/lib/ai/sanitize";
import { buildUsageEstimate, logAIActivity } from "@/lib/ai/usage";
import { runAITools } from "@/lib/ai/tools";
import { AIProviderError } from "@/lib/ai/providers/google";
import { buildDeterministicReviewResponse } from "@/lib/ai/fallback-answer";
import { buildAIResponseCacheKey, getCachedAIResponse, setCachedAIResponse } from "@/lib/ai/cache";
import {
    AIPolicyError,
    assertAIEnabledForRequest,
    getEffectiveAIPolicy,
    type AIEffectivePolicy,
} from "@/lib/ai/admin-config";
import type { AIAgentRequest, AIAgentResponse, AIResolvedModel, AIToolResult } from "@/lib/ai/types";

function makeTimeoutSignal(timeoutMs: number) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    return { signal: controller.signal, clear: () => clearTimeout(timeout) };
}

function jsonError(message: string, status: number, code: string) {
    return NextResponse.json({ message, code }, { status });
}

function ensureRoleAndSurface(request: NonNullable<ReturnType<typeof normalizeAgentRequest>>, role: string) {
    if (role === "COMPANY") {
        throw new RouteError(403, "COMPANY chưa được cấp quyền sử dụng AI Agent trong MVP");
    }
    if (request.mode === "review" && role !== "FACILITY") {
        throw new RouteError(403, "Chỉ FACILITY được dùng AI kiểm tra hồ sơ trong MVP");
    }
    if (request.mode === "review" && request.surface !== "facility_reports" && request.surface !== "facility_mappings") {
        throw new RouteError(400, "surface không hợp lệ cho chế độ review");
    }
}

export async function POST(rawRequest: Request) {
    let sessionUserId: string | undefined;
    let sessionRole: "ADMIN" | "FACILITY" | "COMPANY" | undefined;
    let requestMode: "chat" | "review" | undefined;
    let requestSurface: "dashboard" | "facility_reports" | "facility_mappings" | undefined;
    let currentRequest: AIAgentRequest | undefined;
    let currentToolResults: AIToolResult[] = [];
    let currentResolvedModel: AIResolvedModel | undefined;
    let currentPolicy: AIEffectivePolicy | undefined;
    try {
        const body = await rawRequest.json().catch(() => null);
        const request = normalizeAgentRequest(body);
        if (!request) {
            return jsonError("Request AI không hợp lệ", 400, "INVALID_AI_REQUEST");
        }
        currentRequest = request;
        requestMode = request.mode;
        requestSurface = request.surface;

        const sessionContext = await requireActiveSessionUser();
        sessionUserId = sessionContext.user.id;
        sessionRole = sessionContext.user.role;
        ensureRoleAndSurface(request, sessionContext.user.role);
        currentPolicy = await getEffectiveAIPolicy(sessionContext, request);
        assertAIEnabledForRequest(currentPolicy);
        await assertWithinAIQuota(sessionContext.user.id, sessionContext.user.role, request.mode, currentPolicy.quotaLimit);

        const cacheKey = buildAIResponseCacheKey(sessionContext, request, currentPolicy.policyVersion);
        const cached = getCachedAIResponse(cacheKey);
        if (cached) {
            await logAIActivity(sessionContext.user.id, {
                role: sessionContext.user.role,
                mode: request.mode,
                surface: request.surface,
                model: cached.model,
                usedFallback: cached.usedFallback,
                toolNames: cached.toolCalls.map(tool => tool.name),
                inputTokens: cached.usage?.inputTokens,
                outputTokens: cached.usage?.outputTokens,
                estimatedCostUsd: cached.usage?.estimatedCostUsd,
                cacheHit: true,
                warnings: cached.warnings,
                status: "success",
            });
            return NextResponse.json(cached);
        }

        const toolRun = await runAITools(sessionContext, request, currentPolicy.toolPolicyMap);
        currentToolResults = toolRun.results;
        const taskType = inferTaskType(request);
        const resolvedModel = resolveAIModel({
            taskType,
            role: sessionContext.user.role,
            useFallback: request.useFallback,
            fallbackAllowed: currentPolicy.fallbackAllowed,
        });
        currentResolvedModel = resolvedModel;
        const routingWarnings = [
            ...toolRun.warnings,
            ...(request.useFallback && sessionContext.user.role !== "ADMIN"
                ? ["FALLBACK_ADMIN_ONLY"]
                : []),
            ...(request.useFallback && sessionContext.user.role === "ADMIN" && !currentPolicy.fallbackAllowed
                ? ["FALLBACK_NOT_ALLOWED_BY_POLICY"]
                : []),
            ...(request.useFallback && currentPolicy.fallbackAllowed && !resolvedModel.usedFallback
                ? ["FALLBACK_TASK_NOT_ELIGIBLE"]
                : []),
        ];
        const systemPrompt = buildSystemPrompt();
        const userPrompt = buildUserPrompt({
            sessionContext,
            request,
            toolResults: toolRun.results,
        });

        const config = getAIConfig();
        const timeout = makeTimeoutSignal(config.providerTimeoutMs);
        try {
            const modelResponse = await generateRoutedAIResponse(resolvedModel, {
                systemPrompt,
                prompt: userPrompt,
                maxOutputTokens: config.maxOutputTokens,
                signal: timeout.signal,
            });
            const usage = buildUsageEstimate({
                model: resolvedModel.model,
                prompt: `${systemPrompt}\n${userPrompt}`,
                answer: modelResponse.text,
                inputTokens: modelResponse.usage?.inputTokens,
                outputTokens: modelResponse.usage?.outputTokens,
            });
            const response: AIAgentResponse = {
                answer: modelResponse.text,
                mode: request.mode,
                model: resolvedModel.model,
                usedFallback: resolvedModel.usedFallback,
                toolCalls: toolRun.results.map(result => ({
                    name: result.name,
                    status: result.status,
                })),
                warnings: routingWarnings,
                usage,
            };

            await logAIActivity(sessionContext.user.id, {
                role: sessionContext.user.role,
                mode: request.mode,
                surface: request.surface,
                model: resolvedModel.model,
                usedFallback: resolvedModel.usedFallback,
                toolNames: toolRun.results.map(result => result.name),
                inputTokens: usage.inputTokens,
                outputTokens: usage.outputTokens,
                estimatedCostUsd: usage.estimatedCostUsd,
                cacheHit: false,
                warnings: routingWarnings,
                status: "success",
            });
            setCachedAIResponse(cacheKey, response);
            return NextResponse.json(response);
        } finally {
            timeout.clear();
        }
    } catch (error) {
        if (error instanceof AIRateLimitError) {
            if (sessionUserId && sessionRole && requestMode) {
                await logAIActivity(sessionUserId, {
                    role: sessionRole,
                    mode: requestMode,
                    toolNames: [],
                    status: "quota_exceeded",
                    errorCode: "AI_QUOTA_EXCEEDED",
                });
            }
            return jsonError(`Đã vượt giới hạn ${error.limit} lượt AI hôm nay`, 429, "AI_QUOTA_EXCEEDED");
        }

        if (error instanceof AIPolicyError) {
            if (sessionUserId && sessionRole && requestMode) {
                await logAIActivity(sessionUserId, {
                    role: sessionRole,
                    mode: requestMode,
                    surface: requestSurface,
                    toolNames: [],
                    status: "error",
                    errorCode: error.code,
                });
            }
            return jsonError(error.message, error.status, error.code);
        }

        if (isRouteError(error)) {
            return jsonError(error.message, error.status, "AI_ROUTE_ERROR");
        }

        if (error instanceof AIProviderError) {
            if (sessionUserId && sessionRole && requestMode) {
                await logAIActivity(sessionUserId, {
                    role: sessionRole,
                    mode: requestMode,
                    surface: requestSurface,
                    model: currentResolvedModel?.model,
                    usedFallback: currentResolvedModel?.usedFallback,
                    toolNames: currentToolResults.map(result => result.name),
                    status: "error",
                    errorCode: error.code,
                });
            }
            if (currentRequest?.mode === "review" && currentToolResults.length > 0) {
                const fallbackResponse = buildDeterministicReviewResponse({
                    request: currentRequest,
                    toolResults: currentToolResults,
                    providerMessage: error.message,
                });
                if (sessionUserId && sessionRole) {
                    await logAIActivity(sessionUserId, {
                        role: sessionRole,
                        mode: currentRequest.mode,
                        surface: currentRequest.surface,
                        model: fallbackResponse.model,
                        usedFallback: false,
                        toolNames: currentToolResults.map(result => result.name),
                        inputTokens: 0,
                        outputTokens: 0,
                        estimatedCostUsd: 0,
                        status: "success",
                    });
                }
                return NextResponse.json(fallbackResponse);
            }
            return jsonError(error.message, error.status === 408 ? 504 : 502, error.code);
        }

        if (error instanceof DOMException && error.name === "AbortError") {
            if (sessionUserId && sessionRole && requestMode) {
                await logAIActivity(sessionUserId, {
                    role: sessionRole,
                    mode: requestMode,
                    surface: requestSurface,
                    model: currentResolvedModel?.model,
                    usedFallback: currentResolvedModel?.usedFallback,
                    toolNames: currentToolResults.map(result => result.name),
                    status: "error",
                    errorCode: "AI_PROVIDER_TIMEOUT",
                });
            }
            if (currentRequest?.mode === "review" && currentToolResults.length > 0) {
                const fallbackResponse = buildDeterministicReviewResponse({
                    request: currentRequest,
                    toolResults: currentToolResults,
                    providerMessage: "Provider AI phản hồi quá thời gian cho phép",
                });
                if (sessionUserId && sessionRole) {
                    await logAIActivity(sessionUserId, {
                        role: sessionRole,
                        mode: currentRequest.mode,
                        surface: currentRequest.surface,
                        model: fallbackResponse.model,
                        usedFallback: false,
                        toolNames: currentToolResults.map(result => result.name),
                        inputTokens: 0,
                        outputTokens: 0,
                        estimatedCostUsd: 0,
                        status: "success",
                    });
                }
                return NextResponse.json(fallbackResponse);
            }
            return jsonError("Provider AI phản hồi quá thời gian cho phép", 504, "AI_PROVIDER_TIMEOUT");
        }

        console.error("AI agent route error:", error);
        if (sessionUserId && sessionRole && requestMode) {
            await logAIActivity(sessionUserId, {
                role: sessionRole,
                mode: requestMode,
                surface: requestSurface,
                model: currentResolvedModel?.model,
                usedFallback: currentResolvedModel?.usedFallback,
                toolNames: currentToolResults.map(result => result.name),
                status: "error",
                errorCode: "AI_INTERNAL_ERROR",
            });
        }
        return jsonError("Internal server error", 500, "AI_INTERNAL_ERROR");
    }
}
