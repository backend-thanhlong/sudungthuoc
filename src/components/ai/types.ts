export type AIAgentMode = "chat" | "review";
export type AIAgentSurface = "dashboard" | "facility_reports" | "facility_mappings";

export interface AIClientUsage {
    inputTokens?: number;
    outputTokens?: number;
    estimatedCostUsd?: number;
}

export interface AIClientResponse {
    answer: string;
    mode: AIAgentMode;
    model: string;
    usedFallback: boolean;
    toolCalls: Array<{
        name: string;
        status: "success" | "skipped" | "error";
    }>;
    warnings: string[];
    usage?: AIClientUsage;
}

export interface AIReviewEvidence {
    summary?: Record<string, unknown>;
    rows?: unknown[];
}
