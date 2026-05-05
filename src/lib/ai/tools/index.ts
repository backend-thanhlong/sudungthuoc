import type { ActiveSessionContext } from "@/lib/server-authz";
import type { AIAgentRequest, AIToolResult, AIToolRunResult } from "@/lib/ai/types";
import type { AIToolPolicyMap } from "@/lib/ai/admin-config";
import type { AIToolName } from "@/lib/ai/tool-registry";
import {
    getDashboardOverview,
    getFacilityReportAnomalies,
    getMappingBacklog,
    getReportSubmissionStatus,
    getSupplyRisk,
} from "@/lib/ai/tools/admin";
import {
    getMyMappingIssues,
    getMyReportAnomalies,
    getMyReportSummary,
    getMySupplyRisks,
} from "@/lib/ai/tools/facility";
import {
    reviewFacilityMappings,
    reviewFacilityReportEvidence,
    reviewStoredFacilityReport,
} from "@/lib/ai/tools/review";
import { querySafeDatabase } from "@/lib/ai/tools/safe-database";

function hasAny(text: string, keywords: string[]) {
    const normalized = text.toLowerCase();
    return keywords.some(keyword => normalized.includes(keyword));
}

async function runTool(name: string, fn: () => Promise<AIToolResult>): Promise<AIToolResult> {
    try {
        return await fn();
    } catch (error) {
        console.error(`AI tool failed: ${name}`, error);
        return {
            name,
            status: "error",
            warning: error instanceof Error ? error.message : "Tool error",
        };
    }
}

async function runPolicyAwareTool(
    name: AIToolName,
    toolPolicyMap: AIToolPolicyMap | undefined,
    fn: () => Promise<AIToolResult>
): Promise<AIToolResult> {
    if (toolPolicyMap?.[name] === false) {
        return {
            name,
            status: "skipped",
            warning: `AI_TOOL_DISABLED:${name}`,
        };
    }

    return runTool(name, fn);
}

export async function runAITools(
    sessionContext: ActiveSessionContext,
    request: AIAgentRequest,
    toolPolicyMap?: AIToolPolicyMap
): Promise<AIToolRunResult> {
    if (sessionContext.user.role === "COMPANY") {
        return {
            results: [],
            warnings: ["COMPANY chưa được cấp quyền sử dụng AI Agent trong MVP"],
        };
    }

    if (request.mode === "review") {
        const reviewResults = [];
        if (request.surface === "facility_reports") {
            if (request.evidence?.rows?.length || request.evidence?.summary) {
                reviewResults.push(await runPolicyAwareTool("reviewFacilityReportEvidence", toolPolicyMap, () => reviewFacilityReportEvidence(request)));
            }
            reviewResults.push(await runPolicyAwareTool("reviewStoredFacilityReport", toolPolicyMap, () => reviewStoredFacilityReport(sessionContext, request)));
        }
        if (request.surface === "facility_mappings") {
            reviewResults.push(await runPolicyAwareTool("reviewFacilityMappings", toolPolicyMap, () => reviewFacilityMappings(sessionContext)));
        }

        return {
            results: reviewResults,
            warnings: reviewResults.flatMap(result => result.warning ? [result.warning] : []),
        };
    }

    const message = request.message;
    const results: AIToolResult[] = [];

    if (sessionContext.user.role === "ADMIN") {
        results.push(await runPolicyAwareTool("getDashboardOverview", toolPolicyMap, () => getDashboardOverview(request)));

        if (hasAny(message, ["thiếu", "thieu", "đứt", "dut", "tồn", "ton", "cung ứng", "cung ung"])) {
            results.push(await runPolicyAwareTool("getSupplyRisk", toolPolicyMap, () => getSupplyRisk(request)));
        }
        if (hasAny(message, ["nộp", "nop", "chậm", "cham", "báo cáo", "bao cao"])) {
            results.push(await runPolicyAwareTool("getReportSubmissionStatus", toolPolicyMap, () => getReportSubmissionStatus(request)));
        }
        if (hasAny(message, ["ánh xạ", "anh xa", "mapping", "danh mục", "danh muc"])) {
            results.push(await runPolicyAwareTool("getMappingBacklog", toolPolicyMap, () => getMappingBacklog(request)));
        }
        if (hasAny(message, ["bất thường", "bat thuong", "lỗi", "loi", "sai", "kiểm tra", "kiem tra"])) {
            results.push(await runPolicyAwareTool("getFacilityReportAnomalies", toolPolicyMap, () => getFacilityReportAnomalies(request)));
        }
        results.push(await runPolicyAwareTool("querySafeDatabase", toolPolicyMap, () => querySafeDatabase(sessionContext, request)));
    } else {
        results.push(await runPolicyAwareTool("getMyReportSummary", toolPolicyMap, () => getMyReportSummary(sessionContext, request)));

        if (hasAny(message, ["thiếu", "thieu", "đứt", "dut", "tồn", "ton", "cung ứng", "cung ung"])) {
            results.push(await runPolicyAwareTool("getMySupplyRisks", toolPolicyMap, () => getMySupplyRisks(sessionContext, request)));
        }
        if (hasAny(message, ["ánh xạ", "anh xa", "mapping", "danh mục", "danh muc"])) {
            results.push(await runPolicyAwareTool("getMyMappingIssues", toolPolicyMap, () => getMyMappingIssues(sessionContext)));
        }
        if (hasAny(message, ["bất thường", "bat thuong", "lỗi", "loi", "sai", "kiểm tra", "kiem tra", "báo cáo", "bao cao"])) {
            results.push(await runPolicyAwareTool("getMyReportAnomalies", toolPolicyMap, () => getMyReportAnomalies(sessionContext, request)));
        }
    }

    return {
        results,
        warnings: results.flatMap(result => result.warning ? [result.warning] : []),
    };
}
