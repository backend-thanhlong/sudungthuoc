import type { ActiveSessionContext } from "@/lib/server-authz";
import type { AIAgentRequest, AIToolResult, AIToolRunResult } from "@/lib/ai/types";
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

export async function runAITools(
    sessionContext: ActiveSessionContext,
    request: AIAgentRequest
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
                reviewResults.push(await runTool("reviewFacilityReportEvidence", () => reviewFacilityReportEvidence(request)));
            }
            reviewResults.push(await runTool("reviewStoredFacilityReport", () => reviewStoredFacilityReport(sessionContext, request)));
        }
        if (request.surface === "facility_mappings") {
            reviewResults.push(await runTool("reviewFacilityMappings", () => reviewFacilityMappings(sessionContext)));
        }

        return {
            results: reviewResults,
            warnings: reviewResults.flatMap(result => result.warning ? [result.warning] : []),
        };
    }

    const message = request.message;
    const results: AIToolResult[] = [];

    if (sessionContext.user.role === "ADMIN") {
        results.push(await runTool("getDashboardOverview", () => getDashboardOverview(request)));

        if (hasAny(message, ["thiếu", "thieu", "đứt", "dut", "tồn", "ton", "cung ứng", "cung ung"])) {
            results.push(await runTool("getSupplyRisk", () => getSupplyRisk(request)));
        }
        if (hasAny(message, ["nộp", "nop", "chậm", "cham", "báo cáo", "bao cao"])) {
            results.push(await runTool("getReportSubmissionStatus", () => getReportSubmissionStatus(request)));
        }
        if (hasAny(message, ["ánh xạ", "anh xa", "mapping", "danh mục", "danh muc"])) {
            results.push(await runTool("getMappingBacklog", () => getMappingBacklog(request)));
        }
        if (hasAny(message, ["bất thường", "bat thuong", "lỗi", "loi", "sai", "kiểm tra", "kiem tra"])) {
            results.push(await runTool("getFacilityReportAnomalies", () => getFacilityReportAnomalies(request)));
        }
    } else {
        results.push(await runTool("getMyReportSummary", () => getMyReportSummary(sessionContext, request)));

        if (hasAny(message, ["thiếu", "thieu", "đứt", "dut", "tồn", "ton", "cung ứng", "cung ung"])) {
            results.push(await runTool("getMySupplyRisks", () => getMySupplyRisks(sessionContext, request)));
        }
        if (hasAny(message, ["ánh xạ", "anh xa", "mapping", "danh mục", "danh muc"])) {
            results.push(await runTool("getMyMappingIssues", () => getMyMappingIssues(sessionContext)));
        }
        if (hasAny(message, ["bất thường", "bat thuong", "lỗi", "loi", "sai", "kiểm tra", "kiem tra", "báo cáo", "bao cao"])) {
            results.push(await runTool("getMyReportAnomalies", () => getMyReportAnomalies(sessionContext, request)));
        }
    }

    return {
        results,
        warnings: results.flatMap(result => result.warning ? [result.warning] : []),
    };
}
