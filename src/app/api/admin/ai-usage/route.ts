import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@/../prisma/generated/client";
import prisma from "@/lib/prisma";
import { isRouteError, requireActiveSessionUser } from "@/lib/server-authz";

type AIUsageStatus = "success" | "error" | "quota_exceeded";

interface ParsedAIDetails {
    role?: string;
    mode?: string;
    surface?: string;
    model?: string;
    usedFallback?: boolean;
    toolNames?: string[];
    inputTokens?: number;
    outputTokens?: number;
    estimatedCostUsd?: number;
    cacheHit?: boolean;
    warnings?: string[];
    status?: AIUsageStatus;
    errorCode?: string;
}

interface AggregateRow {
    key: string;
    label: string;
    requests: number;
    success: number;
    errors: number;
    quotaExceeded: number;
    cacheHits: number;
    fallbackRequests: number;
    inputTokens: number;
    outputTokens: number;
    estimatedCostUsd: number;
}

const DEFAULT_DAYS = 14;
const MAX_LOGS_TO_SCAN = 5000;

function toStartOfDay(value: Date) {
    const date = new Date(value);
    date.setHours(0, 0, 0, 0);
    return date;
}

function toEndOfDay(value: Date) {
    const date = new Date(value);
    date.setHours(23, 59, 59, 999);
    return date;
}

function parseDate(value: string | null) {
    if (!value) {
        return null;
    }

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
}

function getDefaultStartDate() {
    const date = new Date();
    date.setDate(date.getDate() - (DEFAULT_DAYS - 1));
    return toStartOfDay(date);
}

function parseDetails(details: string | null): ParsedAIDetails {
    if (!details) {
        return {};
    }

    try {
        const parsed = JSON.parse(details) as Record<string, unknown>;
        return {
            role: typeof parsed.role === "string" ? parsed.role : undefined,
            mode: typeof parsed.mode === "string" ? parsed.mode : undefined,
            surface: typeof parsed.surface === "string" ? parsed.surface : undefined,
            model: typeof parsed.model === "string" ? parsed.model : undefined,
            usedFallback: parsed.usedFallback === true,
            toolNames: Array.isArray(parsed.toolNames)
                ? parsed.toolNames.filter((tool): tool is string => typeof tool === "string")
                : [],
            inputTokens: typeof parsed.inputTokens === "number" ? parsed.inputTokens : 0,
            outputTokens: typeof parsed.outputTokens === "number" ? parsed.outputTokens : 0,
            estimatedCostUsd: typeof parsed.estimatedCostUsd === "number" ? parsed.estimatedCostUsd : 0,
            cacheHit: parsed.cacheHit === true,
            warnings: Array.isArray(parsed.warnings)
                ? parsed.warnings.filter((warning): warning is string => typeof warning === "string")
                : [],
            status: parsed.status === "error" || parsed.status === "quota_exceeded" || parsed.status === "success"
                ? parsed.status
                : "success",
            errorCode: typeof parsed.errorCode === "string" ? parsed.errorCode : undefined,
        };
    } catch {
        return {};
    }
}

function emptyAggregateRow(key: string, label = key): AggregateRow {
    return {
        key,
        label,
        requests: 0,
        success: 0,
        errors: 0,
        quotaExceeded: 0,
        cacheHits: 0,
        fallbackRequests: 0,
        inputTokens: 0,
        outputTokens: 0,
        estimatedCostUsd: 0,
    };
}

function applyToAggregate(row: AggregateRow, details: ParsedAIDetails) {
    const status = details.status || "success";
    row.requests += 1;
    row.success += status === "success" ? 1 : 0;
    row.errors += status === "error" ? 1 : 0;
    row.quotaExceeded += status === "quota_exceeded" ? 1 : 0;
    row.cacheHits += details.cacheHit ? 1 : 0;
    row.fallbackRequests += details.usedFallback ? 1 : 0;
    row.inputTokens += details.inputTokens || 0;
    row.outputTokens += details.outputTokens || 0;
    row.estimatedCostUsd += details.estimatedCostUsd || 0;
}

function aggregateBy<T>(
    records: T[],
    getKey: (record: T) => { key: string; label?: string },
    apply: (row: AggregateRow, record: T) => void
) {
    const map = new Map<string, AggregateRow>();
    for (const record of records) {
        const { key, label } = getKey(record);
        if (!map.has(key)) {
            map.set(key, emptyAggregateRow(key, label || key));
        }
        apply(map.get(key)!, record);
    }
    return Array.from(map.values()).sort((left, right) => right.requests - left.requests);
}

function roundCost(value: number) {
    return Math.round(value * 1_000_000) / 1_000_000;
}

export async function GET(request: NextRequest) {
    try {
        await requireActiveSessionUser("ADMIN");

        const { searchParams } = new URL(request.url);
        const startDate = toStartOfDay(parseDate(searchParams.get("startDate")) || getDefaultStartDate());
        const endDate = toEndOfDay(parseDate(searchParams.get("endDate")) || new Date());
        const userId = searchParams.get("userId") || "";
        const roleFilter = searchParams.get("role") || "";
        const modeFilter = searchParams.get("mode") || "";
        const modelFilter = searchParams.get("model") || "";
        const statusFilter = searchParams.get("status") || "";
        const toolNameFilter = searchParams.get("toolName") || "";
        const cacheHitFilter = searchParams.get("cacheHit") || "";
        const usedFallbackFilter = searchParams.get("usedFallback") || "";
        const errorCodeFilter = searchParams.get("errorCode") || "";
        const includeHealth = searchParams.get("includeHealth") === "true";

        const where: Prisma.ActivityLogWhereInput = {
            action: includeHealth ? { in: ["AI_AGENT", "AI_AGENT_HEALTH_CHECK"] } : "AI_AGENT",
            createdAt: {
                gte: startDate,
                lte: endDate,
            },
        };
        if (userId) {
            where.userId = userId;
        }

        const [logs, users] = await Promise.all([
            prisma.activityLog.findMany({
                where,
                include: {
                    user: {
                        select: {
                            id: true,
                            username: true,
                            facilityName: true,
                            role: true,
                        },
                    },
                },
                orderBy: {
                    createdAt: "desc",
                },
                take: MAX_LOGS_TO_SCAN,
            }),
            prisma.user.findMany({
                where: {
                    isActive: true,
                    role: {
                        in: ["ADMIN", "FACILITY"],
                    },
                },
                select: {
                    id: true,
                    username: true,
                    facilityName: true,
                    role: true,
                },
                orderBy: [
                    { role: "asc" },
                    { facilityName: "asc" },
                    { username: "asc" },
                ],
            }),
        ]);

        const parsedLogs = logs
            .map(log => ({
                id: log.id,
                action: log.action,
                entityType: log.entityType,
                userId: log.userId,
                createdAt: log.createdAt,
                user: log.user,
                details: parseDetails(log.details),
            }))
            .filter(log => !roleFilter || log.details.role === roleFilter)
            .filter(log => !modeFilter || log.details.mode === modeFilter)
            .filter(log => !modelFilter || log.details.model === modelFilter)
            .filter(log => !statusFilter || log.details.status === statusFilter)
            .filter(log => !toolNameFilter || log.details.toolNames?.includes(toolNameFilter))
            .filter(log => cacheHitFilter !== "true" || log.details.cacheHit === true)
            .filter(log => cacheHitFilter !== "false" || log.details.cacheHit !== true)
            .filter(log => usedFallbackFilter !== "true" || log.details.usedFallback === true)
            .filter(log => usedFallbackFilter !== "false" || log.details.usedFallback !== true)
            .filter(log => !errorCodeFilter || log.details.errorCode === errorCodeFilter);

        const summary = emptyAggregateRow("summary", "Tổng");
        const uniqueUsers = new Set<string>();
        for (const log of parsedLogs) {
            applyToAggregate(summary, log.details);
            uniqueUsers.add(log.userId);
        }

        const byDate = aggregateBy(
            parsedLogs,
            log => {
                const key = log.createdAt.toISOString().slice(0, 10);
                return { key, label: key };
            },
            (row, log) => applyToAggregate(row, log.details)
        ).sort((left, right) => left.key.localeCompare(right.key));

        const byRole = aggregateBy(
            parsedLogs,
            log => ({ key: log.details.role || "UNKNOWN" }),
            (row, log) => applyToAggregate(row, log.details)
        );

        const byMode = aggregateBy(
            parsedLogs,
            log => ({ key: log.details.mode || "unknown" }),
            (row, log) => applyToAggregate(row, log.details)
        );

        const byModel = aggregateBy(
            parsedLogs,
            log => ({ key: log.details.model || "local-or-unset" }),
            (row, log) => applyToAggregate(row, log.details)
        );

        const byUser = aggregateBy(
            parsedLogs,
            log => ({
                key: log.userId,
                label: log.user.facilityName || log.user.username,
            }),
            (row, log) => applyToAggregate(row, log.details)
        ).slice(0, 10);

        return NextResponse.json({
            filters: {
                startDate: startDate.toISOString().slice(0, 10),
                endDate: endDate.toISOString().slice(0, 10),
                userId,
                role: roleFilter,
                mode: modeFilter,
                model: modelFilter,
                status: statusFilter,
                toolName: toolNameFilter,
                cacheHit: cacheHitFilter,
                usedFallback: usedFallbackFilter,
                errorCode: errorCodeFilter,
                includeHealth,
            },
            users,
            summary: {
                ...summary,
                uniqueUsers: uniqueUsers.size,
                estimatedCostUsd: roundCost(summary.estimatedCostUsd),
            },
            byDate: byDate.map(row => ({ ...row, estimatedCostUsd: roundCost(row.estimatedCostUsd) })),
            byRole: byRole.map(row => ({ ...row, estimatedCostUsd: roundCost(row.estimatedCostUsd) })),
            byMode: byMode.map(row => ({ ...row, estimatedCostUsd: roundCost(row.estimatedCostUsd) })),
            byModel: byModel.map(row => ({ ...row, estimatedCostUsd: roundCost(row.estimatedCostUsd) })),
            byUser: byUser.map(row => ({ ...row, estimatedCostUsd: roundCost(row.estimatedCostUsd) })),
            recent: parsedLogs.slice(0, 50).map(log => ({
                id: log.id,
                action: log.action,
                entityType: log.entityType,
                createdAt: log.createdAt,
                user: log.user,
                role: log.details.role,
                mode: log.details.mode,
                surface: log.details.surface,
                model: log.details.model,
                status: log.details.status || "success",
                usedFallback: log.details.usedFallback === true,
                cacheHit: log.details.cacheHit === true,
                inputTokens: log.details.inputTokens || 0,
                outputTokens: log.details.outputTokens || 0,
                estimatedCostUsd: roundCost(log.details.estimatedCostUsd || 0),
                errorCode: log.details.errorCode,
                warnings: log.details.warnings || [],
                toolNames: log.details.toolNames || [],
            })),
            scanned: logs.length,
            maxScan: MAX_LOGS_TO_SCAN,
        });
    } catch (error) {
        if (isRouteError(error)) {
            return NextResponse.json({ message: error.message }, { status: error.status });
        }

        console.error("Error fetching AI usage:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}
