import { logActivity } from "@/lib/activity-log";
import { getAIConfig } from "@/lib/ai/config";
import {
    buildSafeDatabaseTemplatePlan,
    type SafeDatabaseIntent,
} from "@/lib/ai/safe-database-intelligence";
import {
    describeDomainRoutingForPrompt,
    routeAIDomain,
    type AIDomainRoutingResult,
} from "@/lib/ai/domain-router";
import {
    verifySafeDatabaseQuery,
    type AIQueryVerificationResult,
} from "@/lib/ai/query-verifier";
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
    source,
    intent,
    templateName,
    queryIndex,
    queryCount,
    entityCandidates,
    domainRouting,
    verification,
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
    source?: "template" | "model";
    intent?: SafeDatabaseIntent;
    templateName?: string;
    queryIndex?: number;
    queryCount?: number;
    entityCandidates?: SafeDatabaseEntityCandidate[];
    domainRouting?: AIDomainRoutingResult;
    verification?: AIQueryVerificationResult;
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
            source,
            intent,
            templateName,
            queryIndex,
            queryCount,
            entityCandidates,
            domain: verification?.domain || domainRouting?.primaryDomain,
            domainScore: verification?.domainScore,
            matchedConcepts: verification?.matchedConcepts || domainRouting?.matchedConcepts.map(match => match.concept.id),
            matchedAliases: verification?.matchedAliases,
            domainRouting: domainRouting ? describeDomainRoutingForPrompt(domainRouting) : undefined,
            verifierStatus: verification?.status,
            verifierWarnings: verification?.verifierWarnings,
            requiredViews: verification?.requiredViews,
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

function uniqueValues<T>(values: T[]) {
    return [...new Set(values.filter(Boolean))] as T[];
}

function assertVerified(verification: AIQueryVerificationResult) {
    if (verification.status === "rejected") {
        throw new SafeDatabaseQueryError(
            verification.code || "AI_QUERY_VERIFIER_REJECTED",
            verification.reason || "AI query verifier rejected the safe database query"
        );
    }
}

function buildClarificationMessage(routing: AIDomainRoutingResult) {
    const domains = routing.candidates
        .filter(candidate => candidate.score > 0)
        .slice(0, 3)
        .map(candidate => candidate.domain)
        .join(", ");
    return domains
        ? `Câu hỏi có thể thuộc nhiều miền dữ liệu (${domains}). Vui lòng nói rõ muốn hỏi danh mục dùng chung, ánh xạ danh mục, tồn kho, nộp báo cáo, mua sắm hay đơn hàng.`
        : "Câu hỏi chưa đủ rõ miền dữ liệu cần truy vấn. Vui lòng nói rõ nội dung nghiệp vụ cần xem.";
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
    let currentDomainRouting: AIDomainRoutingResult | undefined;
    try {
        const entityResolution = await resolveSafeDatabaseEntities(request);
        currentEntityResolution = entityResolution;
        const domainRouting = routeAIDomain(request.message);
        currentDomainRouting = domainRouting;
        const entitySummary = summarizeEntityResolution(entityResolution);

        if (domainRouting.ambiguity === "high") {
            const clarification = buildClarificationMessage(domainRouting);
            await auditSafeDatabaseQuery({
                sessionContext,
                request,
                entityCandidates: entityResolution.candidates,
                domainRouting,
                warnings: [...entityResolution.warnings, "AI_DOMAIN_AMBIGUOUS"],
                status: "skipped",
                code: "AI_DOMAIN_AMBIGUOUS",
            });
            return {
                name: "querySafeDatabase",
                status: "skipped",
                warning: "AI_DOMAIN_AMBIGUOUS",
                data: {
                    message: clarification,
                    domainRouting: describeDomainRoutingForPrompt(domainRouting),
                    entityResolution: entitySummary,
                },
            };
        }

        const templatePlan = buildSafeDatabaseTemplatePlan(request, entityResolution, domainRouting);
        if (templatePlan.length > 0) {
            const results = [];
            const warnings: string[] = [...entityResolution.warnings];
            for (const [index, plannedQuery] of templatePlan.entries()) {
                const preview = validateSafeDatabaseSql(plannedQuery.sql);
                const verification = verifySafeDatabaseQuery(preview, {
                    question: request.message,
                    routing: domainRouting,
                    source: "template",
                    plannedQuery,
                });
                assertVerified(verification);
                const result = await executeSafeDatabaseSql(preview.sql);
                warnings.push(...result.warnings, ...verification.verifierWarnings);
                await auditSafeDatabaseQuery({
                    sessionContext,
                    request,
                    sql: result.sql,
                    referencedViews: result.referencedViews,
                    rowCount: result.rowCount,
                    durationMs: result.durationMs,
                    retryCount: 0,
                    source: "template",
                    intent: plannedQuery.intent,
                    templateName: plannedQuery.templateName,
                    queryIndex: index + 1,
                    queryCount: templatePlan.length,
                    entityCandidates: entityResolution.candidates,
                    domainRouting,
                    verification,
                    warnings,
                    status: "success",
                });
                results.push({
                    source: "template" as const,
                    domain: verification.domain,
                    domainScore: verification.domainScore,
                    intent: plannedQuery.intent,
                    templateName: plannedQuery.templateName,
                    reason: plannedQuery.reason,
                    verifierStatus: verification.status,
                    verifierWarnings: verification.verifierWarnings,
                    sql: result.sql,
                    referencedViews: result.referencedViews,
                    columns: result.columns,
                    rowCount: result.rowCount,
                    durationMs: result.durationMs,
                    rows: result.rows,
                });
            }

            const first = results[0];
            return {
                name: "querySafeDatabase",
                status: "success",
                warning: buildToolWarning(warnings),
                data: {
                    source: "template",
                    queryPlan: {
                        queryCount: results.length,
                        domain: domainRouting.primaryDomain,
                        domainScore: domainRouting.candidates[0]?.score,
                        intents: uniqueValues(results.map(result => result.intent)),
                        templateNames: results.map(result => result.templateName),
                    },
                    sql: first.sql,
                    referencedViews: uniqueValues(results.flatMap(result => result.referencedViews)),
                    columns: first.columns,
                    rowCount: first.rowCount,
                    durationMs: results.reduce((total, result) => total + result.durationMs, 0),
                    rows: first.rows,
                    queries: results,
                    domainRouting: describeDomainRoutingForPrompt(domainRouting),
                    entityResolution: entitySummary,
                },
            };
        }

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
                source: "model",
                intent: generated.intent,
            });
            return {
                name: "querySafeDatabase",
                status: "skipped",
                warning: generated.reason || "Câu hỏi không cần truy vấn safe database",
            };
        }

        let preview = validateSafeDatabaseSql(generated.sql);
        let verification = verifySafeDatabaseQuery(preview, {
            question: request.message,
            routing: domainRouting,
            source: "model",
            plannedQuery: {
                domain: domainRouting.primaryDomain || undefined,
                intent: generated.intent,
            },
        });
        let initialSql: string | undefined;
        let retryCount = 0;
        if (verification.status === "rejected") {
            const retryGenerated = await generateSafeDatabaseSql(request, {
                signal: timeout.signal,
                entityResolution,
                verifierRetry: {
                    previousSql: generated.sql,
                    code: verification.code || "AI_QUERY_VERIFIER_REJECTED",
                    reason: verification.reason || "Verifier rejected generated SQL",
                    expectedDomain: verification.domain,
                    requiredViews: verification.requiredViews,
                },
            });

            if (!retryGenerated.shouldQuery || !retryGenerated.sql) {
                await auditSafeDatabaseQuery({
                    sessionContext,
                    request,
                    initialSql: generated.sql,
                    retryCount: 1,
                    source: "model",
                    intent: generated.intent,
                    entityCandidates: entityResolution.candidates,
                    domainRouting,
                    verification,
                    warnings: [...entityResolution.warnings, verification.code || "AI_QUERY_VERIFIER_REJECTED"],
                    status: "skipped",
                    code: verification.code || "AI_QUERY_VERIFIER_REJECTED",
                });
                return {
                    name: "querySafeDatabase",
                    status: "skipped",
                    warning: retryGenerated.reason || verification.reason || "AI query verifier rejected generated SQL",
                    data: {
                        domainRouting: describeDomainRoutingForPrompt(domainRouting),
                        verifier: verification,
                        entityResolution: entitySummary,
                    },
                };
            }

            initialSql = generated.sql;
            retryCount = 1;
            preview = validateSafeDatabaseSql(retryGenerated.sql);
            verification = verifySafeDatabaseQuery(preview, {
                question: request.message,
                routing: domainRouting,
                source: "model",
                plannedQuery: {
                    domain: domainRouting.primaryDomain || undefined,
                    intent: retryGenerated.intent,
                },
            });
            assertVerified(verification);
        }

        let result = await executeSafeDatabaseSql(preview.sql);
        const warnings = [
            ...entityResolution.warnings,
            ...result.warnings,
            ...verification.verifierWarnings,
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
                    const retryVerification = verifySafeDatabaseQuery(retryPreview, {
                        question: request.message,
                        routing: domainRouting,
                        source: "model",
                        plannedQuery: {
                            domain: domainRouting.primaryDomain || undefined,
                            intent: retryGenerated.intent,
                        },
                    });
                    assertVerified(retryVerification);
                    if (retryPreview.sql !== result.sql) {
                        initialSql = initialSql || result.sql;
                        result = await executeSafeDatabaseSql(retryPreview.sql);
                        retryCount += 1;
                        verification = retryVerification;
                        warnings.push("AI_SAFE_DB_EMPTY_RESULT_RETRIED", ...result.warnings, ...retryVerification.verifierWarnings);
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
            source: "model",
            intent: generated.intent,
            entityCandidates: entityResolution.candidates,
            domainRouting,
            verification,
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
                source: "model",
                intent: generated.intent,
                domain: verification.domain,
                domainScore: verification.domainScore,
                verifierStatus: verification.status,
                verifierWarnings: verification.verifierWarnings,
                referencedViews: result.referencedViews,
                columns: result.columns,
                rowCount: result.rowCount,
                durationMs: result.durationMs,
                rows: result.rows,
                domainRouting: describeDomainRoutingForPrompt(domainRouting),
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
            domainRouting: currentDomainRouting,
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
