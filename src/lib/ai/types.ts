import type { Role } from "@/../prisma/generated/client";

export type AIAgentMode = "chat" | "review";
export type AIAgentSurface = "dashboard" | "facility_reports" | "facility_mappings";
export type AITaskType = "simple_qa" | "record_review" | "summary" | "deep_analysis" | "executive_report";
export type AIProviderName = "google" | "openai";
export type AIToolStatus = "success" | "skipped" | "error";

export interface AIReviewEvidence {
    summary?: Record<string, unknown>;
    rows?: unknown[];
}

export interface AIAgentContext {
    reportMonth?: string;
    facilityId?: string;
    entityId?: string;
    pathname?: string;
    filters?: Record<string, string | number | boolean | null>;
}

export interface AIAgentRequest {
    mode: AIAgentMode;
    message: string;
    surface?: AIAgentSurface;
    context?: AIAgentContext;
    evidence?: AIReviewEvidence;
    useFallback?: boolean;
}

export interface AIAgentToolCall {
    name: string;
    status: AIToolStatus;
}

export interface AIUsageEstimate {
    inputTokens?: number;
    outputTokens?: number;
    estimatedCostUsd?: number;
}

export interface AIAgentResponse {
    answer: string;
    mode: AIAgentMode;
    model: string;
    usedFallback: boolean;
    toolCalls: AIAgentToolCall[];
    warnings: string[];
    usage?: AIUsageEstimate;
}

export interface AIModelRequest {
    model: string;
    systemPrompt: string;
    prompt: string;
    maxOutputTokens: number;
    signal?: AbortSignal;
}

export interface AIModelResponse {
    text: string;
    model: string;
    provider: AIProviderName;
    usage?: {
        inputTokens?: number;
        outputTokens?: number;
        totalTokens?: number;
    };
}

export interface AIResolvedModel {
    provider: AIProviderName;
    model: string;
    usedFallback: boolean;
}

export interface AIToolResult {
    name: string;
    status: AIToolStatus;
    data?: unknown;
    warning?: string;
}

export interface AIToolRunResult {
    results: AIToolResult[];
    warnings: string[];
}

export interface AILogDetails {
    role: Role;
    mode: AIAgentMode;
    surface?: AIAgentSurface;
    model?: string;
    usedFallback?: boolean;
    toolNames: string[];
    inputTokens?: number;
    outputTokens?: number;
    estimatedCostUsd?: number;
    cacheHit?: boolean;
    warnings?: string[];
    status: "success" | "error" | "quota_exceeded";
    errorCode?: string;
}
