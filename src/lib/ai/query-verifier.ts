import {
    AI_DOMAIN_VIEW_ALLOWLIST,
    normalizeAIText,
    type AIDomain,
} from "@/lib/ai/domain-glossary";
import { routeAIDomain, type AIDomainRoutingResult } from "@/lib/ai/domain-router";
import { topAIMetric } from "@/lib/ai/metric-registry";

export interface AIValidatedSqlPreview {
    sql: string;
    referencedViews: string[];
    warnings: string[];
}

export interface AIPlannedQueryForVerification {
    domain?: AIDomain;
    templateName?: string;
    intent?: string;
}

export interface AIQueryVerificationContext {
    question: string;
    routing?: AIDomainRoutingResult;
    source: "template" | "model";
    plannedQuery?: AIPlannedQueryForVerification;
    allowAmbiguous?: boolean;
}

export interface AIQueryVerificationResult {
    status: "passed" | "rejected";
    code?: string;
    reason?: string;
    domain: AIDomain | null;
    domainScore?: number;
    matchedConcepts: string[];
    matchedAliases: string[];
    requiredViews: string[];
    verifierWarnings: string[];
}

function pass(result: Omit<AIQueryVerificationResult, "status">): AIQueryVerificationResult {
    return {
        status: "passed",
        ...result,
    };
}

function reject(result: Omit<AIQueryVerificationResult, "status">): AIQueryVerificationResult {
    return {
        status: "rejected",
        ...result,
    };
}

function includesAny(normalized: string, phrases: string[]) {
    return phrases.some(phrase => normalized.includes(normalizeAIText(phrase)));
}

function isBroadSharedCatalogCount(normalizedQuestion: string) {
    return includesAny(normalizedQuestion, ["danh mục dùng chung", "danh mục chung"])
        && includesAny(normalizedQuestion, ["bao nhiêu", "có mấy", "đếm", "tổng", "số lượng"]);
}

function hasWeakEntityFilter(sql: string) {
    return /\bwhere\b[\s\S]*\b(facility_id|facility_code|company_id|company_code|master_drug_id|company_drug_id|ma_chung)\b/i.test(sql);
}

function domainRequiredViews(domain: AIDomain | null, normalizedQuestion: string, plannedQuery?: AIPlannedQueryForVerification) {
    if (!domain) {
        return [];
    }

    const metricViews = topAIMetric(normalizedQuestion)?.metric.requiredViews || [];
    if (metricViews.length > 0) {
        return metricViews;
    }

    if (plannedQuery?.templateName === "report_period_status_and_deadline") {
        return ["ai_report_periods"];
    }
    if (
        plannedQuery?.templateName === "missing_report_submissions_by_month"
        || plannedQuery?.templateName === "report_submission_completion_by_month"
    ) {
        return ["ai_report_submissions", "ai_facilities"];
    }
    if (plannedQuery?.templateName === "report_submission_trend_by_month") {
        return ["ai_report_submissions"];
    }
    if (plannedQuery?.templateName === "procurement_notice_result_coverage") {
        return ["ai_procurement_notices"];
    }
    if (
        plannedQuery?.templateName === "orders_not_fully_shipped_or_received"
        || plannedQuery?.templateName === "order_status_fulfillment_summary"
    ) {
        return ["ai_drug_orders"];
    }
    if (plannedQuery?.templateName === "shared_master_drug_catalog_count" || isBroadSharedCatalogCount(normalizedQuestion)) {
        return ["ai_master_drugs"];
    }
    if (includesAny(normalizedQuestion, ["mã atc", "ma atc", "mã bhyt của thuốc", "thuốc theo mã bhyt", "thuốc theo mã atc"])) {
        return ["ai_master_drugs"];
    }
    if (includesAny(normalizedQuestion, ["ngoài danh mục"])) {
        return ["ai_mapping_status"];
    }
    if (includesAny(normalizedQuestion, ["BHYT", "bảo hiểm y tế", "dịch vụ", "tồn kho", "nhập xuất tồn"])) {
        return ["ai_inventory_reports"];
    }
    if (includesAny(normalizedQuestion, ["kỳ báo cáo", "han nop", "hạn nộp", "đang mở", "mo bao cao", "mở báo cáo"])) {
        return ["ai_report_periods"];
    }
    if (includesAny(normalizedQuestion, ["chưa nộp", "không nộp", "chậm báo cáo", "nộp báo cáo", "tỷ lệ nộp", "ty le nop", "đã nộp", "da nop"])) {
        return ["ai_report_submissions", "ai_facilities"];
    }
    if (includesAny(normalizedQuestion, ["tbmt", "thông báo mời thầu", "thong bao moi thau"]) && includesAny(normalizedQuestion, ["kết quả", "ket qua"])) {
        return ["ai_procurement_notices"];
    }
    if (includesAny(normalizedQuestion, ["đơn hàng", "don hang", "đặt hàng", "dat hang", "dự trù", "du tru"])) {
        return ["ai_drug_orders"];
    }

    return [];
}

function summarizeRouting(routing: AIDomainRoutingResult, domain: AIDomain | null) {
    const primary = domain
        ? routing.candidates.find(candidate => candidate.domain === domain)
        : undefined;
    return {
        domainScore: primary?.score,
        matchedConcepts: primary?.matchedConcepts || routing.matchedConcepts.map(match => match.concept.id),
        matchedAliases: primary?.matchedAliases || routing.matchedConcepts.flatMap(match => match.matchedAliases),
    };
}

export function verifySafeDatabaseQuery(
    preview: AIValidatedSqlPreview,
    context: AIQueryVerificationContext
): AIQueryVerificationResult {
    const routing = context.routing || routeAIDomain(context.question);
    const normalizedQuestion = normalizeAIText(context.question);
    const domain = context.plannedQuery?.domain || routing.primaryDomain;
    const metric = topAIMetric(normalizedQuestion)?.metric;
    const routingSummary = summarizeRouting(routing, domain);
    const requiredViews = domainRequiredViews(domain, normalizedQuestion, context.plannedQuery);
    const verifierWarnings = [...preview.warnings];

    if (routing.ambiguity === "high" && !context.allowAmbiguous) {
        return reject({
            code: "AI_DOMAIN_AMBIGUOUS",
            reason: "Câu hỏi có thể thuộc nhiều miền dữ liệu; cần hỏi lại người dùng trước khi truy vấn.",
            domain,
            requiredViews,
            verifierWarnings,
            ...routingSummary,
        });
    }

    if (!domain) {
        verifierWarnings.push("AI_DOMAIN_UNKNOWN");
        return pass({
            domain,
            requiredViews,
            verifierWarnings,
            ...routingSummary,
        });
    }

    const allowedViews = AI_DOMAIN_VIEW_ALLOWLIST[domain] || [];
    const incompatibleViews = preview.referencedViews.filter(view => !allowedViews.includes(view));
    if (incompatibleViews.length > 0) {
        return reject({
            code: "AI_DOMAIN_VIEW_MISMATCH",
            reason: `SQL đọc view không thuộc miền ${domain}: ${incompatibleViews.join(", ")}`,
            domain,
            requiredViews,
            verifierWarnings,
            ...routingSummary,
        });
    }

    const missingViews = requiredViews.filter(view => !preview.referencedViews.includes(view));
    if (missingViews.length > 0) {
        return reject({
            code: "AI_DOMAIN_REQUIRED_VIEW_MISSING",
            reason: `SQL thiếu view bắt buộc cho miền ${domain}: ${missingViews.join(", ")}`,
            domain,
            requiredViews,
            verifierWarnings,
            ...routingSummary,
        });
    }

    if (
        metric?.id === "managed_inventory_items"
        && !/\bcount\s*\(\s*distinct\s+(?:"?[a-zA-Z_][a-zA-Z0-9_]*"?\.)?"?map_id"?\s*\)/i.test(preview.sql)
    ) {
        return reject({
            code: "AI_MANAGED_ITEMS_COUNT_FORMULA_MISSING",
            reason: "Câu hỏi số mặt hàng quản lý phải dùng COUNT(DISTINCT map_id) trên ai_inventory_reports.",
            domain,
            requiredViews,
            verifierWarnings,
            ...routingSummary,
        });
    }

    if (metric?.id === "inventory_value" && !/\bthanh_tien_ton_cuoi\b/i.test(preview.sql)) {
        return reject({
            code: "AI_INVENTORY_VALUE_FORMULA_MISSING",
            reason: "Câu hỏi giá trị tồn kho phải dùng thanh_tien_ton_cuoi.",
            domain,
            requiredViews,
            verifierWarnings,
            ...routingSummary,
        });
    }

    if (metric?.id === "awarded_item_count" && !/\bso_mat_hang_trung_thau\b/i.test(preview.sql)) {
        return reject({
            code: "AI_AWARDED_ITEMS_FORMULA_MISSING",
            reason: "Câu hỏi số mặt hàng trúng thầu phải dùng so_mat_hang_trung_thau.",
            domain,
            requiredViews,
            verifierWarnings,
            ...routingSummary,
        });
    }

    if (metric?.id === "submitted_facilities" && !/\bfacility_id\b/i.test(preview.sql)) {
        return reject({
            code: "AI_SUBMITTED_FACILITY_COUNT_FORMULA_MISSING",
            reason: "Câu hỏi số cơ sở nộp báo cáo phải đếm theo facility_id.",
            domain,
            requiredViews,
            verifierWarnings,
            ...routingSummary,
        });
    }

    if (isBroadSharedCatalogCount(normalizedQuestion)) {
        if (preview.referencedViews.includes("ai_mapping_status")) {
            return reject({
                code: "AI_CATALOG_QUESTION_USED_MAPPING_VIEW",
                reason: "Câu hỏi danh mục dùng chung phải đọc ai_master_drugs, không đọc ai_mapping_status.",
                domain,
                requiredViews,
                verifierWarnings,
                ...routingSummary,
            });
        }
        if (hasWeakEntityFilter(preview.sql)) {
            return reject({
                code: "AI_BROAD_CATALOG_ENTITY_FILTER_BLOCKED",
                reason: "Câu hỏi đếm danh mục dùng chung không được tự thêm bộ lọc cơ sở/thuốc/công ty từ match yếu.",
                domain,
                requiredViews,
                verifierWarnings,
                ...routingSummary,
            });
        }
    }

    if (includesAny(normalizedQuestion, ["ngoài danh mục"]) && !/\bis_out_of_catalog\b/i.test(preview.sql)) {
        return reject({
            code: "AI_MAPPING_OUT_OF_CATALOG_FILTER_MISSING",
            reason: "Câu hỏi ngoài danh mục phải dùng điều kiện hoặc phép tổng hợp dựa trên is_out_of_catalog.",
            domain,
            requiredViews,
            verifierWarnings,
            ...routingSummary,
        });
    }

    return pass({
        domain,
        requiredViews,
        verifierWarnings,
        ...routingSummary,
    });
}
