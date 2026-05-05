import { logActivity } from "@/lib/activity-log";
import { getAIConfig } from "@/lib/ai/config";
import {
    executeSafeDatabaseSql,
    generateSafeDatabaseSql,
    resolveSafeDatabaseEntities,
    SafeDatabaseQueryError,
    validateSafeDatabaseSql,
    type SafeDatabaseEntityCandidate,
    type SafeDatabaseEntityResolution,
    type SafeDatabaseQueryResult,
} from "@/lib/ai/safe-database";
import { cleanText } from "@/lib/ai/sanitize";
import type { ActiveSessionContext } from "@/lib/server-authz";
import type { AIAgentRequest, AIToolResult } from "@/lib/ai/types";

function makeTimeoutSignal(timeoutMs: number) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    return { signal: controller.signal, clear: () => clearTimeout(timeout) };
}

async function auditSafeDatabaseQuery({
    sessionContext,
    request,
    sql,
    referencedViews,
    rowCount,
    durationMs,
    initialSql,
    retryCount,
    entityCandidates,
    warnings,
    status,
    code,
}: {
    sessionContext: ActiveSessionContext;
    request: AIAgentRequest;
    sql?: string;
    referencedViews?: string[];
    rowCount?: number;
    durationMs?: number;
    initialSql?: string;
    retryCount?: number;
    entityCandidates?: SafeDatabaseEntityCandidate[];
    warnings?: string[];
    status: "success" | "skipped" | "refused" | "error";
    code?: string;
}) {
    await logActivity({
        userId: sessionContext.user.id,
        action: "AI_AGENT_DB_QUERY",
        entityType: "ai_agent_db_query",
        details: {
            question: cleanText(request.message, 500),
            sql,
            referencedViews,
            rowCount,
            durationMs,
            initialSql,
            retryCount,
            entityCandidates,
            warnings,
            status,
            code,
        },
    });
}

function summarizeEntityResolution(entityResolution: SafeDatabaseEntityResolution) {
    return {
        candidates: entityResolution.candidates.map(candidate => ({
            type: candidate.type,
            id: candidate.id,
            name: cleanText(candidate.name, 160),
            code: candidate.code,
            score: candidate.score,
            matchedTerms: candidate.matchedTerms,
            metadata: candidate.metadata,
        })),
        warnings: entityResolution.warnings,
    };
}

function shouldRetryEmptyResult(
    request: AIAgentRequest,
    result: SafeDatabaseQueryResult,
    entityResolution: SafeDatabaseEntityResolution
) {
    if (result.rowCount !== 0 || request.mode !== "chat") {
        return false;
    }

    if (entityResolution.candidates.length > 0) {
        return true;
    }

    return /[A-Za-zÀ-ỹ0-9]{3,}/u.test(request.message);
}

function buildToolWarning(warnings: string[]) {
    const uniqueWarnings = [...new Set(warnings.filter(Boolean))];
    return uniqueWarnings.length > 0 ? uniqueWarnings.join(",") : undefined;
}

export async function querySafeDatabase(
    sessionContext: ActiveSessionContext,
    request: AIAgentRequest
): Promise<AIToolResult> {
    if (sessionContext.user.role !== "ADMIN" || request.mode !== "chat") {
        return {
            name: "querySafeDatabase",
            status: "skipped",
            warning: "AI_SAFE_DB_ADMIN_CHAT_ONLY",
        };
    }

    const config = getAIConfig();
    const timeout = makeTimeoutSignal(Math.min(config.providerTimeoutMs, 10_000));
    let currentEntityResolution: SafeDatabaseEntityResolution | undefined;
    try {
        const entityResolution = await resolveSafeDatabaseEntities(request);
        currentEntityResolution = entityResolution;
        const entitySummary = summarizeEntityResolution(entityResolution);
        const generated = await generateSafeDatabaseSql(request, {
            signal: timeout.signal,
            entityResolution,
        });
        if (!generated.shouldQuery || !generated.sql) {
            await auditSafeDatabaseQuery({
                sessionContext,
                request,
                entityCandidates: entityResolution.candidates,
                warnings: entityResolution.warnings,
                status: "skipped",
                code: "AI_SAFE_DB_NO_QUERY",
            });
            return {
                name: "querySafeDatabase",
                status: "skipped",
                warning: generated.reason || "Câu hỏi không cần truy vấn safe database",
            };
        }

        const preview = validateSafeDatabaseSql(generated.sql);
        let result = await executeSafeDatabaseSql(preview.sql);
        let initialSql: string | undefined;
        let retryCount = 0;
        const warnings = [
            ...entityResolution.warnings,
            ...result.warnings,
        ];

        if (shouldRetryEmptyResult(request, result, entityResolution)) {
            try {
                const retryGenerated = await generateSafeDatabaseSql(request, {
                    signal: timeout.signal,
                    entityResolution,
                    retry: {
                        previousSql: result.sql,
                        previousReferencedViews: result.referencedViews,
                        previousRowCount: result.rowCount,
                        reason: "EMPTY_RESULT",
                    },
                });

                if (retryGenerated.shouldQuery && retryGenerated.sql) {
                    const retryPreview = validateSafeDatabaseSql(retryGenerated.sql);
                    if (retryPreview.sql !== result.sql) {
                        initialSql = result.sql;
                        result = await executeSafeDatabaseSql(retryPreview.sql);
                        retryCount = 1;
                        warnings.push("AI_SAFE_DB_EMPTY_RESULT_RETRIED", ...result.warnings);
                    }
                }
            } catch (retryError) {
                const retryCode = retryError instanceof SafeDatabaseQueryError
                    ? retryError.code
                    : retryError instanceof DOMException && retryError.name === "AbortError"
                        ? "AI_SAFE_DB_EMPTY_RETRY_TIMEOUT"
                        : "AI_SAFE_DB_EMPTY_RETRY_ERROR";
                warnings.push(retryCode);
            }
        }

        await auditSafeDatabaseQuery({
            sessionContext,
            request,
            sql: result.sql,
            referencedViews: result.referencedViews,
            rowCount: result.rowCount,
            durationMs: result.durationMs,
            initialSql,
            retryCount,
            entityCandidates: entityResolution.candidates,
            warnings,
            status: "success",
        });

        return {
            name: "querySafeDatabase",
            status: "success",
            warning: buildToolWarning(warnings),
            data: {
                sql: result.sql,
                initialSql,
                retryCount,
                referencedViews: result.referencedViews,
                columns: result.columns,
                rowCount: result.rowCount,
                durationMs: result.durationMs,
                rows: result.rows,
                entityResolution: entitySummary,
            },
        };
    } catch (error) {
        const code = error instanceof SafeDatabaseQueryError
            ? error.code
            : error instanceof DOMException && error.name === "AbortError"
                ? "AI_SAFE_DB_SQL_GENERATION_TIMEOUT"
                : "AI_SAFE_DB_QUERY_ERROR";
        await auditSafeDatabaseQuery({
            sessionContext,
            request,
            entityCandidates: currentEntityResolution?.candidates,
            warnings: currentEntityResolution?.warnings,
            status: error instanceof SafeDatabaseQueryError ? "refused" : "error",
            code,
        });
        return {
            name: "querySafeDatabase",
            status: "skipped",
            warning: code,
            data: {
                message: error instanceof Error ? error.message : "Không thể truy vấn AI safe database",
            },
        };
    } finally {
        timeout.clear();
    }
}
