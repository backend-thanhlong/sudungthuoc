import type { AIAgentRequest } from "@/lib/ai/types";
import type { SafeDatabaseEntityCandidate, SafeDatabaseEntityResolution } from "@/lib/ai/safe-database";
import {
    describeBusinessGlossaryForPrompt,
    normalizeAIText,
    type AIDomain,
} from "@/lib/ai/domain-glossary";
import {
    routeAIDomain,
    type AIDomainRoutingResult,
} from "@/lib/ai/domain-router";
import { topAIMetric } from "@/lib/ai/metric-registry";
import { describeAISchemaRegistryForPrompt } from "@/lib/ai/schema-registry";

export type SafeDatabaseIntent =
    | "lookup"
    | "summary"
    | "ranking"
    | "trend"
    | "anomaly"
    | "comparison"
    | "procurement"
    | "mapping"
    | "order"
    | "unknown";

export interface SafeDatabasePlannedQuery {
    source: "template";
    domain: AIDomain;
    intent: SafeDatabaseIntent;
    templateName: string;
    reason: string;
    sql: string;
    routing: AIDomainRoutingResult;
}

export const SAFE_DATABASE_SEMANTIC_DESCRIPTION = `
Business semantics for the safe AI views and domain glossary:

- report_month is stored as MM/YYYY.
- ai_inventory_reports is the monthly inventory fact view. Use ton_dau, nhap, nhap_hoan_tra, xuat, ton_cuoi, gia_vat, thanh_tien_ton_cuoi, report_month, facility_id, ma_chung, master_drug_name, hoat_chat_noi_bo, nhom_thuoc, ten_cong_ty.
- Inventory value means SUM(thanh_tien_ton_cuoi). Remaining quantity means SUM(ton_cuoi). Movement means SUM(nhap) and SUM(xuat).
- Managed item count / số mặt hàng quản lý means COUNT(DISTINCT map_id) from ai_inventory_reports, filtered by facility and report_month when provided.
- Stockout risk means ton_cuoi is zero/negative, or ton_cuoi is low relative to recent xuat.
- Balance anomaly means ton_dau + nhap + nhap_hoan_tra - xuat differs from ton_cuoi.
- ai_report_submissions records facility report submissions by report_month. Missing submission means an active facility has no row for a selected report_month.
- ai_mapping_status records internal drug catalog mapping. Mapping backlog means PENDING_MAPPING, WAITING_APPROVAL, REJECTED, or is_out_of_catalog rows.
- ai_master_drugs is the shared drug catalog/danh mục dùng chung. Count rows here for questions about how many shared catalog drugs exist.
- Approved mapped drugs include APPROVED and AUTO_MAPPED when checking usable mappings.
- ai_procurement_* views cover LCNT/procurement plans, packages, lots, notices, results, and lot results.
- ai_drug_orders covers reservation/order lines. Unfulfilled order risk means accepted_qty exceeds shipped or received quantities.
- Nhóm TCKT can refer to nhom_thuoc or therapeutic_group_name depending on the view. Prefer nhom_thuoc for inventory reports and therapeutic_group_name for master catalog questions.
- Always explain the period, facility/drug/company filters, row count, and safe view names used.

Schema registry:
${describeAISchemaRegistryForPrompt()}

Domain glossary:
${describeBusinessGlossaryForPrompt()}
`.trim();

function normalizeVietnameseText(value: string) {
    return normalizeAIText(value);
}

function hasAny(normalized: string, terms: string[]) {
    return terms.some(term => normalized.includes(term));
}

function isSharedCatalogQuestion(normalized: string) {
    return hasAny(normalized, [
        "danh muc dung chung",
        "danh muc chung",
        "dung chung",
        "danh muc thuoc",
        "thuoc trong danh muc",
        "thuoc danh muc",
    ]);
}

function sqlLiteral(value: string) {
    return `'${value.replace(/'/g, "''")}'`;
}

const STRICT_ENTITY_FILTER_SCORE = 28;

function monthFromContextOrQuestion(request: AIAgentRequest) {
    if (request.context?.reportMonth && /^\d{2}\/\d{4}$/.test(request.context.reportMonth)) {
        return request.context.reportMonth;
    }

    const direct = request.message.match(/\b(0?[1-9]|1[0-2])\s*[\/.-]\s*(20\d{2})\b/u);
    if (direct) {
        return `${direct[1].padStart(2, "0")}/${direct[2]}`;
    }

    const monthWord = request.message.match(/th[aá]ng\s+(0?[1-9]|1[0-2])(?:\s+n[aă]m)?\s+(20\d{2})/iu);
    if (monthWord) {
        return `${monthWord[1].padStart(2, "0")}/${monthWord[2]}`;
    }

    return undefined;
}

function topCandidate(
    entityResolution: SafeDatabaseEntityResolution | undefined,
    type: SafeDatabaseEntityCandidate["type"],
    minScore = STRICT_ENTITY_FILTER_SCORE
) {
    return entityResolution?.candidates.find(candidate => candidate.type === type && candidate.score >= minScore);
}

function facilityFilter(entityResolution: SafeDatabaseEntityResolution | undefined, alias: string) {
    const facility = topCandidate(entityResolution, "facility");
    if (!facility) {
        return undefined;
    }
    return `${alias}.facility_id = ${sqlLiteral(facility.id)}`;
}

function drugFilter(entityResolution: SafeDatabaseEntityResolution | undefined, alias: string) {
    const masterDrug = topCandidate(entityResolution, "master_drug");
    if (masterDrug) {
        return `${alias}.master_drug_id = ${sqlLiteral(masterDrug.id)}`;
    }

    const companyDrug = topCandidate(entityResolution, "company_drug");
    const maChung = typeof companyDrug?.metadata?.ma_chung === "string" ? companyDrug.metadata.ma_chung : companyDrug?.code;
    if (maChung) {
        return `${alias}.ma_chung = ${sqlLiteral(maChung)}`;
    }

    return undefined;
}

function companyFilter(entityResolution: SafeDatabaseEntityResolution | undefined, alias: string) {
    const company = topCandidate(entityResolution, "company");
    if (!company) {
        return undefined;
    }
    return `${alias}.company_id = ${sqlLiteral(company.id)}`;
}

function procurementPlanFilter(entityResolution: SafeDatabaseEntityResolution | undefined, alias: string) {
    const plan = topCandidate(entityResolution, "procurement_plan");
    if (!plan) {
        return undefined;
    }
    return `${alias}.plan_id = ${sqlLiteral(plan.id)}`;
}

function procurementPackageFilter(entityResolution: SafeDatabaseEntityResolution | undefined, alias: string) {
    const pkg = topCandidate(entityResolution, "procurement_package");
    if (!pkg) {
        return undefined;
    }
    return `${alias}.package_id = ${sqlLiteral(pkg.id)}`;
}

function whereClause(conditions: Array<string | undefined>) {
    const compact = conditions.filter((condition): condition is string => Boolean(condition));
    return compact.length > 0 ? ` WHERE ${compact.join(" AND ")}` : "";
}

function monthCondition(request: AIAgentRequest, alias: string) {
    const month = monthFromContextOrQuestion(request);
    return month ? `${alias}.report_month = ${sqlLiteral(month)}` : undefined;
}

function inferSafeDatabaseIntentsFromText(normalized: string): SafeDatabaseIntent[] {
    const intents = new Set<SafeDatabaseIntent>();

    if (hasAny(normalized, ["top", "cao nhat", "lon nhat", "nhieu nhat", "thap nhat", "it nhat", "xep hang"])) {
        intents.add("ranking");
    }
    if (hasAny(normalized, ["xu huong", "theo thang", "qua cac thang", "bien dong", "tang giam"])) {
        intents.add("trend");
    }
    if (hasAny(normalized, ["bat thuong", "rui ro", "dut hang", "ton chet", "sai", "lech", "am", "canh bao"])) {
        intents.add("anomaly");
    }
    if (hasAny(normalized, ["so sanh", "doi chieu", "trung binh", "cao hon", "thap hon"])) {
        intents.add("comparison");
    }
    if (hasAny(normalized, ["lcnt", "mua sam", "goi thau", "tbmt", "khlcnt", "ket qua thau", "phan lo"])) {
        intents.add("procurement");
    }
    if (isSharedCatalogQuestion(normalized) || hasAny(normalized, ["ma atc", "atc", "ma bhyt", "hoat chat", "duong dung", "ham luong"])) {
        intents.add("summary");
    } else if (hasAny(normalized, ["anh xa", "mapping", "danh muc", "ngoai danh muc", "chua duyet", "nhom tckt"])) {
        intents.add("mapping");
    }
    if (hasAny(normalized, ["du tru", "dat hang", "giao hang", "nhan hang", "don hang"])) {
        intents.add("order");
    }
    if (hasAny(normalized, ["bao nhieu", "tong", "thong ke", "dem", "so luong", "gia tri"])) {
        intents.add("summary");
    }
    if (hasAny(normalized, ["xuat kho", "luong xuat", "tong xuat", "da xuat", "xuat nhieu", "xuat it"])) {
        intents.add(hasAny(normalized, ["top", "cao nhat", "lon nhat", "nhieu nhat", "xep hang"]) ? "ranking" : "summary");
    }
    if (hasAny(normalized, ["tim", "tra cuu", "liet ke", "danh sach"])) {
        intents.add("lookup");
    }

    return intents.size > 0 ? [...intents] : ["unknown"];
}

export function inferSafeDatabaseIntents(question: string): SafeDatabaseIntent[] {
    const inferred = inferSafeDatabaseIntentsFromText(normalizeVietnameseText(question));
    const routing = routeAIDomain(question);
    const routedIntent: SafeDatabaseIntent | undefined = routing.primaryDomain === "mapping"
        ? "mapping"
        : routing.primaryDomain === "procurement"
            ? "procurement"
            : routing.primaryDomain === "orders"
                ? "order"
                : undefined;

    return routedIntent && !inferred.includes(routedIntent)
        ? [routedIntent, ...inferred]
        : inferred;
}

function inferTemplateDomain(templateName: string, intent: SafeDatabaseIntent): AIDomain {
    if (templateName.includes("shared_master") || templateName.includes("catalog_count")) {
        return "catalog";
    }
    if (templateName.includes("mapping") || templateName.includes("out_of_catalog")) {
        return "mapping";
    }
    if (templateName.includes("report_submission") || templateName.includes("report_period")) {
        return "report_submission";
    }
    if (templateName.includes("procurement") || templateName.includes("awarded")) {
        return "procurement";
    }
    if (templateName.includes("order")) {
        return "orders";
    }
    if (intent === "procurement") {
        return "procurement";
    }
    if (intent === "mapping") {
        return "mapping";
    }
    if (intent === "order") {
        return "orders";
    }
    return "inventory";
}

function templateQuery(
    routing: AIDomainRoutingResult,
    params: Omit<SafeDatabasePlannedQuery, "source" | "routing" | "domain"> & { domain?: AIDomain }
): SafeDatabasePlannedQuery {
    const domain = params.domain || inferTemplateDomain(params.templateName, params.intent);
    return {
        source: "template",
        ...params,
        domain,
        routing,
    };
}

export function buildSafeDatabaseTemplatePlan(
    request: AIAgentRequest,
    entityResolution?: SafeDatabaseEntityResolution,
    routing: AIDomainRoutingResult = routeAIDomain(request.message)
): SafeDatabasePlannedQuery[] {
    const normalized = normalizeVietnameseText(request.message);
    const plan: SafeDatabasePlannedQuery[] = [];

    if (routing.ambiguity === "high") {
        return [];
    }
    const facilityInventoryFilter = facilityFilter(entityResolution, "r");
    const facilityMappingFilter = facilityFilter(entityResolution, "m");
    const facilitySubmissionFilter = facilityFilter(entityResolution, "f");
    const facilityProcurementFilter = facilityFilter(entityResolution, "p");
    const facilityOrderFilter = facilityFilter(entityResolution, "o");
    const inventoryMonth = monthCondition(request, "r");
    const submissionMonth = monthFromContextOrQuestion(request);
    const drugInventoryFilter = drugFilter(entityResolution, "r");
    const metric = topAIMetric(request.message)?.metric;

    if (metric?.id === "managed_inventory_items") {
        plan.push(templateQuery(routing, {
            domain: "inventory",
            intent: "summary",
            templateName: "managed_inventory_item_count",
            reason: "Đếm số mặt hàng quản lý theo map_id trong dữ liệu XNT",
            sql: [
                "SELECT r.facility_name, r.facility_code,",
                "COUNT(DISTINCT r.map_id) AS managed_item_count,",
                "COUNT(*) AS report_line_count,",
                "COUNT(DISTINCT r.report_month) AS report_month_count",
                "FROM ai_inventory_reports r",
                whereClause([inventoryMonth, facilityInventoryFilter]),
                "GROUP BY r.facility_name, r.facility_code",
                "ORDER BY managed_item_count DESC LIMIT 100",
            ].join(" "),
        }));

        plan.push(templateQuery(routing, {
            domain: "inventory",
            intent: "summary",
            templateName: "managed_inventory_item_count_by_month",
            reason: "Đếm số mặt hàng quản lý theo từng kỳ báo cáo",
            sql: [
                "SELECT r.facility_name, r.facility_code, r.report_month,",
                "COUNT(DISTINCT r.map_id) AS managed_item_count,",
                "COUNT(*) AS report_line_count",
                "FROM ai_inventory_reports r",
                whereClause([inventoryMonth, facilityInventoryFilter]),
                "GROUP BY r.facility_name, r.facility_code, r.report_month",
                "ORDER BY SUBSTRING(r.report_month FROM 4 FOR 4) DESC, SUBSTRING(r.report_month FROM 1 FOR 2) DESC, managed_item_count DESC LIMIT 100",
            ].join(" "),
        }));
    }

    if (metric?.id === "inventory_value") {
        plan.push(templateQuery(routing, {
            domain: "inventory",
            intent: "summary",
            templateName: "inventory_value_summary",
            reason: "Tổng hợp giá trị tồn kho theo cơ sở và kỳ báo cáo",
            sql: [
                "SELECT r.facility_name, r.facility_code, r.report_month,",
                "SUM(r.thanh_tien_ton_cuoi) AS inventory_value,",
                "SUM(r.ton_cuoi) AS remaining_qty,",
                "COUNT(DISTINCT r.map_id) AS managed_item_count",
                "FROM ai_inventory_reports r",
                whereClause([inventoryMonth, facilityInventoryFilter]),
                "GROUP BY r.facility_name, r.facility_code, r.report_month",
                "ORDER BY SUBSTRING(r.report_month FROM 4 FOR 4) DESC, SUBSTRING(r.report_month FROM 1 FOR 2) DESC, inventory_value DESC LIMIT 100",
            ].join(" "),
        }));
    }

    if (metric?.id === "submitted_facilities") {
        if (submissionMonth) {
            plan.push(templateQuery(routing, {
                domain: "report_submission",
                intent: "summary",
                templateName: "submitted_facility_count_by_month",
                reason: `Đếm số cơ sở đã nộp báo cáo kỳ ${submissionMonth}`,
                sql: [
                    `SELECT ${sqlLiteral(submissionMonth)} AS report_month,`,
                    "COUNT(DISTINCT f.facility_id) AS active_facility_count,",
                    "COUNT(DISTINCT s.facility_id) AS submitted_facility_count,",
                    "COUNT(DISTINCT f.facility_id) - COUNT(DISTINCT s.facility_id) AS missing_facility_count,",
                    "ROUND(COUNT(DISTINCT s.facility_id) * 100.0 / NULLIF(COUNT(DISTINCT f.facility_id), 0), 2) AS submission_ratio_percent",
                    "FROM ai_facilities f",
                    `LEFT JOIN ai_report_submissions s ON s.facility_id = f.facility_id AND s.report_month = ${sqlLiteral(submissionMonth)}`,
                    whereClause(["f.is_active = true", facilitySubmissionFilter]),
                    "LIMIT 100",
                ].join(" "),
            }));
        } else {
            plan.push(templateQuery(routing, {
                domain: "report_submission",
                intent: "summary",
                templateName: "submitted_facility_count_recent_months",
                reason: "Đếm số cơ sở đã nộp báo cáo theo các kỳ gần đây",
                sql: [
                    "SELECT s.report_month,",
                    "COUNT(DISTINCT f.facility_id) AS active_facility_count,",
                    "COUNT(DISTINCT s.facility_id) AS submitted_facility_count,",
                    "COUNT(DISTINCT f.facility_id) - COUNT(DISTINCT s.facility_id) AS missing_facility_count,",
                    "SUM(s.reported_row_count) AS reported_row_count",
                    "FROM ai_facilities f",
                    "LEFT JOIN ai_report_submissions s ON s.facility_id = f.facility_id",
                    whereClause(["f.is_active = true", "s.report_month IS NOT NULL", facilitySubmissionFilter]),
                    "GROUP BY s.report_month",
                    "ORDER BY SUBSTRING(s.report_month FROM 4 FOR 4) DESC, SUBSTRING(s.report_month FROM 1 FOR 2) DESC LIMIT 100",
                ].join(" "),
            }));
        }
    }

    if (metric?.id === "awarded_item_count") {
        plan.push(templateQuery(routing, {
            domain: "procurement",
            intent: "summary",
            templateName: "awarded_item_count_by_facility",
            reason: "Tổng hợp số mặt hàng mời thầu và trúng thầu theo cơ sở",
            sql: [
                "SELECT r.facility_name, r.facility_code,",
                "SUM(r.so_mat_hang_moi_thau) AS invited_item_count,",
                "SUM(r.so_mat_hang_trung_thau) AS awarded_item_count,",
                "ROUND(SUM(r.so_mat_hang_trung_thau) * 100.0 / NULLIF(SUM(r.so_mat_hang_moi_thau), 0), 2) AS awarded_ratio_percent",
                "FROM ai_procurement_results r",
                whereClause([facilityFilter(entityResolution, "r"), procurementPlanFilter(entityResolution, "r"), procurementPackageFilter(entityResolution, "r")]),
                "GROUP BY r.facility_name, r.facility_code",
                "ORDER BY awarded_item_count DESC NULLS LAST LIMIT 100",
            ].join(" "),
        }));
    }

    if (isSharedCatalogQuestion(normalized) && hasAny(normalized, ["bao nhieu", "tong", "dem", "so luong", "co may"])) {
        plan.push(templateQuery(routing, {
            intent: "summary",
            templateName: "shared_master_drug_catalog_count",
            reason: "Đếm số thuốc trong danh mục dùng chung",
            sql: [
                "SELECT COUNT(*) AS total_master_drugs,",
                "SUM(CASE WHEN is_active = true THEN 1 ELSE 0 END) AS active_master_drugs,",
                "SUM(CASE WHEN is_active = false THEN 1 ELSE 0 END) AS inactive_master_drugs",
                "FROM ai_master_drugs LIMIT 100",
            ].join(" "),
        }));
    }

    if (routing.primaryDomain === "catalog" && hasAny(normalized, ["ma atc", "atc"])) {
        plan.push(templateQuery(routing, {
            domain: "catalog",
            intent: hasAny(normalized, ["bao nhieu", "tong", "dem", "thong ke", "so luong"]) ? "summary" : "lookup",
            templateName: "master_drugs_by_atc_code",
            reason: "Tra cứu hoặc thống kê thuốc trong danh mục dùng chung theo Mã ATC",
            sql: [
                "SELECT ma_atc, COUNT(*) AS drug_count,",
                "SUM(CASE WHEN is_active = true THEN 1 ELSE 0 END) AS active_drug_count",
                "FROM ai_master_drugs",
                "WHERE ma_atc IS NOT NULL AND TRIM(ma_atc) <> ''",
                "GROUP BY ma_atc",
                "ORDER BY drug_count DESC, ma_atc LIMIT 100",
            ].join(" "),
        }));
    }

    if (routing.primaryDomain === "catalog" && hasAny(normalized, ["ma bhyt", "bhyt"])) {
        plan.push(templateQuery(routing, {
            domain: "catalog",
            intent: hasAny(normalized, ["bao nhieu", "tong", "dem", "thong ke", "so luong"]) ? "summary" : "lookup",
            templateName: "master_drugs_by_bhyt_code",
            reason: "Tra cứu hoặc thống kê thuốc trong danh mục dùng chung theo Mã BHYT",
            sql: [
                "SELECT ma_bhyt, COUNT(*) AS drug_count,",
                "SUM(CASE WHEN is_active = true THEN 1 ELSE 0 END) AS active_drug_count",
                "FROM ai_master_drugs",
                "WHERE ma_bhyt IS NOT NULL AND TRIM(ma_bhyt) <> ''",
                "GROUP BY ma_bhyt",
                "ORDER BY drug_count DESC, ma_bhyt LIMIT 100",
            ].join(" "),
        }));
    }

    if (routing.primaryDomain === "catalog" && hasAny(normalized, ["hoat chat", "nhom thuoc", "nhom tckt", "duong dung"])) {
        plan.push(templateQuery(routing, {
            domain: "catalog",
            intent: "summary",
            templateName: "master_drug_catalog_distribution",
            reason: "Phân bố danh mục dùng chung theo hoạt chất/nhóm/đường dùng",
            sql: [
                "SELECT COALESCE(hoat_chat, 'Chưa có hoạt chất') AS hoat_chat,",
                "COALESCE(nhom_thuoc, therapeutic_group_name, 'Chưa có nhóm') AS drug_group,",
                "COALESCE(duong_dung, 'Chưa có đường dùng') AS duong_dung,",
                "COUNT(*) AS drug_count",
                "FROM ai_master_drugs",
                "GROUP BY COALESCE(hoat_chat, 'Chưa có hoạt chất'), COALESCE(nhom_thuoc, therapeutic_group_name, 'Chưa có nhóm'), COALESCE(duong_dung, 'Chưa có đường dùng')",
                "ORDER BY drug_count DESC LIMIT 100",
            ].join(" "),
        }));
    }

    if (routing.primaryDomain === "facility" && hasAny(normalized, ["danh sach", "liet ke", "bao nhieu", "tong", "dem", "dang hoat dong", "active"])) {
        plan.push(templateQuery(routing, {
            domain: "facility",
            intent: hasAny(normalized, ["bao nhieu", "tong", "dem"]) ? "summary" : "lookup",
            templateName: "active_facilities_summary",
            reason: "Danh sách hoặc số lượng cơ sở đang hoạt động",
            sql: [
                "SELECT facility_type, autonomy_group, COUNT(*) AS facility_count",
                "FROM ai_facilities",
                "WHERE is_active = true",
                "GROUP BY facility_type, autonomy_group",
                "ORDER BY facility_count DESC LIMIT 100",
            ].join(" "),
        }));
    }

    if (routing.primaryDomain === "company" && hasAny(normalized, ["danh sach", "liet ke", "bao nhieu", "tong", "dem", "dang hoat dong", "active"])) {
        plan.push(templateQuery(routing, {
            domain: "company",
            intent: hasAny(normalized, ["bao nhieu", "tong", "dem"]) ? "summary" : "lookup",
            templateName: "active_companies_summary",
            reason: "Danh sách hoặc số lượng công ty đang hoạt động",
            sql: [
                "SELECT is_active, COUNT(*) AS company_count",
                "FROM ai_companies",
                "GROUP BY is_active",
                "ORDER BY company_count DESC LIMIT 100",
            ].join(" "),
        }));
    }

    if (hasAny(normalized, ["chua nop", "khong nop", "thieu bao cao", "cham bao cao"]) && submissionMonth) {
        plan.push(templateQuery(routing, {
            intent: "summary",
            templateName: "missing_report_submissions_by_month",
            reason: `Cơ sở chưa nộp báo cáo kỳ ${submissionMonth}`,
            sql: [
                "SELECT f.facility_name, f.facility_code",
                "FROM ai_facilities f",
                `LEFT JOIN ai_report_submissions s ON s.facility_id = f.facility_id AND s.report_month = ${sqlLiteral(submissionMonth)}`,
                whereClause(["f.is_active = true", "s.submission_id IS NULL", facilitySubmissionFilter]),
                "ORDER BY f.facility_name LIMIT 100",
            ].join(" "),
        }));
    }

    if (hasAny(normalized, ["ky bao cao", "han nop", "dang mo", "mo bao cao", "dot bao cao"])) {
        plan.push(templateQuery(routing, {
            intent: "lookup",
            templateName: "report_period_status_and_deadline",
            reason: "Tra cứu kỳ báo cáo, trạng thái mở và hạn nộp",
            sql: [
                "SELECT p.month AS report_month, p.is_active, p.deadline, p.reminder_sent",
                "FROM ai_report_periods p",
                whereClause([submissionMonth ? `p.month = ${sqlLiteral(submissionMonth)}` : undefined]),
                "ORDER BY p.year DESC, p.period_month DESC LIMIT 100",
            ].join(" "),
        }));
    }

    if (hasAny(normalized, ["thong ke nop", "tinh trang nop", "ty le nop", "da nop", "so dong bao cao", "dong bao cao"])) {
        if (submissionMonth) {
            plan.push(templateQuery(routing, {
                intent: "summary",
                templateName: "report_submission_completion_by_month",
                reason: `Tỷ lệ và số lượng cơ sở đã nộp báo cáo kỳ ${submissionMonth}`,
                sql: [
                    `SELECT ${sqlLiteral(submissionMonth)} AS report_month,`,
                    "COUNT(DISTINCT f.facility_id) AS active_facility_count,",
                    "COUNT(DISTINCT s.facility_id) AS submitted_facility_count,",
                    "COUNT(DISTINCT f.facility_id) - COUNT(DISTINCT s.facility_id) AS missing_facility_count,",
                    "SUM(COALESCE(s.reported_row_count, 0)) AS reported_row_count,",
                    "SUM(COALESCE(s.skipped_row_count, 0)) AS skipped_row_count,",
                    "ROUND(COUNT(DISTINCT s.facility_id) * 100.0 / NULLIF(COUNT(DISTINCT f.facility_id), 0), 2) AS submission_ratio_percent",
                    "FROM ai_facilities f",
                    `LEFT JOIN ai_report_submissions s ON s.facility_id = f.facility_id AND s.report_month = ${sqlLiteral(submissionMonth)}`,
                    whereClause(["f.is_active = true", facilitySubmissionFilter]),
                    "LIMIT 100",
                ].join(" "),
            }));
        } else {
            plan.push(templateQuery(routing, {
                intent: "trend",
                templateName: "report_submission_trend_by_month",
                reason: "Xu hướng số cơ sở đã nộp và số dòng báo cáo theo kỳ",
                sql: [
                    "SELECT s.report_month,",
                    "COUNT(DISTINCT f.facility_id) AS active_facility_count,",
                    "COUNT(DISTINCT s.facility_id) AS submitted_facility_count,",
                    "COUNT(DISTINCT f.facility_id) - COUNT(DISTINCT s.facility_id) AS missing_facility_count,",
                    "SUM(s.reported_row_count) AS reported_row_count,",
                    "SUM(s.skipped_row_count) AS skipped_row_count",
                    "FROM ai_facilities f",
                    "LEFT JOIN ai_report_submissions s ON s.facility_id = f.facility_id",
                    whereClause(["f.is_active = true", "s.report_month IS NOT NULL", facilitySubmissionFilter]),
                    "GROUP BY s.report_month",
                    "ORDER BY SUBSTRING(s.report_month FROM 4 FOR 4) DESC, SUBSTRING(s.report_month FROM 1 FOR 2) DESC LIMIT 100",
                ].join(" "),
            }));
        }
    }

    if (hasAny(normalized, ["ton kho", "gia tri ton", "ton cuoi", "tien ton"])) {
        if (hasAny(normalized, ["top", "cao nhat", "lon nhat", "nhieu nhat", "xep hang"])) {
            plan.push(templateQuery(routing, {
                intent: "ranking",
                templateName: "top_inventory_value_by_facility",
                reason: "Xếp hạng giá trị tồn kho theo cơ sở",
                sql: [
                    "SELECT r.facility_name, r.facility_code, r.report_month, SUM(r.thanh_tien_ton_cuoi) AS inventory_value",
                    "FROM ai_inventory_reports r",
                    whereClause([inventoryMonth, facilityInventoryFilter]),
                    "GROUP BY r.facility_name, r.facility_code, r.report_month",
                    "ORDER BY inventory_value DESC LIMIT 100",
                ].join(" "),
            }));
        }

        if (hasAny(normalized, ["thuoc", "ma chung", "hoat chat", "nhom"])) {
            plan.push(templateQuery(routing, {
                intent: "ranking",
                templateName: "high_inventory_value_by_drug",
                reason: "Thuốc có giá trị tồn kho cao",
                sql: [
                    "SELECT r.master_drug_name, r.ma_chung, r.master_active_ingredient, r.nhom_thuoc, r.report_month, SUM(r.ton_cuoi) AS remaining_qty, SUM(r.thanh_tien_ton_cuoi) AS inventory_value",
                    "FROM ai_inventory_reports r",
                    whereClause([inventoryMonth, facilityInventoryFilter, drugInventoryFilter]),
                    "GROUP BY r.master_drug_name, r.ma_chung, r.master_active_ingredient, r.nhom_thuoc, r.report_month",
                    "ORDER BY inventory_value DESC LIMIT 100",
                ].join(" "),
            }));
        }
    }

    if (hasAny(normalized, ["xuat kho", "luong xuat", "tong xuat", "da xuat", "xuat nhieu", "xuat it"])) {
        if (hasAny(normalized, ["thuoc", "ma chung", "hoat chat", "nhom"])) {
            plan.push(templateQuery(routing, {
                intent: hasAny(normalized, ["top", "cao nhat", "lon nhat", "nhieu nhat", "xep hang"]) ? "ranking" : "summary",
                templateName: "inventory_export_quantity_by_drug",
                reason: "Tổng lượng xuất kho theo thuốc trong dữ liệu XNT",
                sql: [
                    "SELECT r.master_drug_name, r.ma_chung, r.master_active_ingredient, r.nhom_thuoc, r.report_month, SUM(r.xuat) AS total_export_qty, SUM(r.thanh_tien_ton_cuoi) AS inventory_value",
                    "FROM ai_inventory_reports r",
                    whereClause([inventoryMonth, facilityInventoryFilter, drugInventoryFilter]),
                    "GROUP BY r.master_drug_name, r.ma_chung, r.master_active_ingredient, r.nhom_thuoc, r.report_month",
                    "ORDER BY total_export_qty DESC LIMIT 100",
                ].join(" "),
            }));
        } else {
            plan.push(templateQuery(routing, {
                intent: hasAny(normalized, ["top", "cao nhat", "lon nhat", "nhieu nhat", "xep hang"]) ? "ranking" : "summary",
                templateName: "inventory_export_quantity_by_facility",
                reason: "Tổng lượng xuất kho theo cơ sở/bệnh viện trong dữ liệu XNT",
                sql: [
                    "SELECT r.facility_name, r.facility_code, r.report_month, SUM(r.xuat) AS total_export_qty, SUM(r.thanh_tien_ton_cuoi) AS inventory_value",
                    "FROM ai_inventory_reports r",
                    whereClause([inventoryMonth, facilityInventoryFilter]),
                    "GROUP BY r.facility_name, r.facility_code, r.report_month",
                    "ORDER BY total_export_qty DESC LIMIT 100",
                ].join(" "),
            }));
        }
    }

    if (hasAny(normalized, ["bhyt", "bao hiem y te", "dich vu", "ty le thuoc"])) {
        plan.push(templateQuery(routing, {
            intent: "summary",
            templateName: "inventory_distribution_by_bhyt_service",
            reason: "Phân bố dòng báo cáo tồn kho theo thuốc BHYT và dịch vụ",
            sql: [
                "SELECT COALESCE(r.bhyt, 'Chưa phân loại') AS bhyt_group, COALESCE(r.dich_vu, 'Chưa phân loại') AS service_group, r.report_month, COUNT(*) AS line_count, SUM(r.ton_cuoi) AS remaining_qty, SUM(r.thanh_tien_ton_cuoi) AS inventory_value, ROUND(COUNT(*) * 100.0 / NULLIF(SUM(COUNT(*)) OVER (PARTITION BY r.report_month), 0), 2) AS line_ratio_percent",
                "FROM ai_inventory_reports r",
                whereClause([inventoryMonth, facilityInventoryFilter]),
                "GROUP BY COALESCE(r.bhyt, 'Chưa phân loại'), COALESCE(r.dich_vu, 'Chưa phân loại'), r.report_month",
                "ORDER BY r.report_month DESC, line_count DESC LIMIT 100",
            ].join(" "),
        }));
    }

    if (hasAny(normalized, ["dut hang", "thieu hang", "rui ro cung ung", "sap het", "ton thap"])) {
        plan.push(templateQuery(routing, {
            intent: "anomaly",
            templateName: "potential_stockout_risk",
            reason: "Dòng báo cáo có tồn cuối thấp so với xuất hoặc không còn tồn",
            sql: [
                "SELECT r.facility_name, r.facility_code, r.report_month, r.master_drug_name, r.ma_chung, r.ton_cuoi, r.xuat, r.thanh_tien_ton_cuoi",
                "FROM ai_inventory_reports r",
                whereClause([
                    inventoryMonth,
                    facilityInventoryFilter,
                    drugInventoryFilter,
                    "(r.ton_cuoi <= 0 OR (r.xuat > 0 AND r.ton_cuoi <= r.xuat * 0.25))",
                ]),
                "ORDER BY r.report_month DESC, r.xuat DESC LIMIT 100",
            ].join(" "),
        }));
    }

    if (hasAny(normalized, ["ton chet", "ton cao", "cham luan chuyen", "khong xuat"])) {
        plan.push(templateQuery(routing, {
            intent: "anomaly",
            templateName: "slow_moving_high_inventory",
            reason: "Tồn kho giá trị cao nhưng xuất thấp hoặc bằng 0",
            sql: [
                "SELECT r.facility_name, r.facility_code, r.report_month, r.master_drug_name, r.ma_chung, r.ton_cuoi, r.xuat, r.thanh_tien_ton_cuoi",
                "FROM ai_inventory_reports r",
                whereClause([
                    inventoryMonth,
                    facilityInventoryFilter,
                    drugInventoryFilter,
                    "r.ton_cuoi > 0",
                    "r.thanh_tien_ton_cuoi > 0",
                    "(r.xuat = 0 OR r.ton_cuoi >= r.xuat * 6)",
                ]),
                "ORDER BY r.thanh_tien_ton_cuoi DESC LIMIT 100",
            ].join(" "),
        }));
    }

    if (hasAny(normalized, ["sai so", "lech", "can doi", "bat thuong", "loi so lieu"])) {
        plan.push(templateQuery(routing, {
            intent: "anomaly",
            templateName: "inventory_balance_anomalies",
            reason: "Dòng tồn kho có cân đối nhập xuất tồn không khớp",
            sql: [
                "SELECT r.facility_name, r.facility_code, r.report_month, r.master_drug_name, r.ma_chung, r.ton_dau, r.nhap, r.nhap_hoan_tra, r.xuat, r.ton_cuoi, (r.ton_dau + r.nhap + r.nhap_hoan_tra - r.xuat) AS expected_ton_cuoi",
                "FROM ai_inventory_reports r",
                whereClause([
                    inventoryMonth,
                    facilityInventoryFilter,
                    drugInventoryFilter,
                    "ABS((r.ton_dau + r.nhap + r.nhap_hoan_tra - r.xuat) - r.ton_cuoi) > 0.001",
                ]),
                "ORDER BY r.report_month DESC, r.facility_name LIMIT 100",
            ].join(" "),
        }));
    }

    if (!isSharedCatalogQuestion(normalized) && hasAny(normalized, ["anh xa", "mapping", "danh muc", "ngoai danh muc", "chua duyet", "cho duyet", "bi tu choi", "nhom tckt"])) {
        plan.push(templateQuery(routing, {
            intent: "mapping",
            templateName: "mapping_coverage_by_facility",
            reason: "Tổng hợp trạng thái ánh xạ danh mục theo cơ sở",
            sql: [
                "SELECT m.facility_name, m.facility_code, COUNT(*) AS total_mappings,",
                "SUM(CASE WHEN m.status IN ('APPROVED', 'AUTO_MAPPED') THEN 1 ELSE 0 END) AS approved_count,",
                "SUM(CASE WHEN m.status = 'PENDING_MAPPING' THEN 1 ELSE 0 END) AS pending_mapping_count,",
                "SUM(CASE WHEN m.status = 'WAITING_APPROVAL' THEN 1 ELSE 0 END) AS waiting_approval_count,",
                "SUM(CASE WHEN m.status = 'REJECTED' THEN 1 ELSE 0 END) AS rejected_count,",
                "SUM(CASE WHEN m.is_out_of_catalog THEN 1 ELSE 0 END) AS out_of_catalog_count",
                "FROM ai_mapping_status m",
                whereClause([facilityMappingFilter]),
                "GROUP BY m.facility_name, m.facility_code",
                "ORDER BY waiting_approval_count DESC, pending_mapping_count DESC, rejected_count DESC LIMIT 100",
            ].join(" "),
        }));
    }

    if (hasAny(normalized, ["ngoai danh muc"])) {
        plan.push(templateQuery(routing, {
            intent: "mapping",
            templateName: "out_of_catalog_mapping_rows",
            reason: "Dòng thuốc nội bộ được đánh dấu ngoài danh mục",
            sql: [
                "SELECT m.facility_name, m.facility_code, m.ma_noi_bo, m.ten_thuoc_noi_bo, m.hoat_chat_noi_bo, m.status, m.admin_note",
                "FROM ai_mapping_status m",
                whereClause([facilityMappingFilter, "m.is_out_of_catalog = true"]),
                "ORDER BY m.updated_at DESC NULLS LAST LIMIT 100",
            ].join(" "),
        }));
    }

    if (hasAny(normalized, ["mua sam", "lcnt", "goi thau", "khlcnt", "khldt", "tbmt", "ket qua thau"])) {
        plan.push(templateQuery(routing, {
            intent: "procurement",
            templateName: "procurement_packages_by_facility_status",
            reason: "Tổng hợp gói thầu theo cơ sở và trạng thái",
            sql: [
                "SELECT p.facility_name, p.facility_code, p.trang_thai, COUNT(*) AS package_count, SUM(p.gia_goi_thau) AS total_package_value, SUM(p.result_count) AS result_count",
                "FROM ai_procurement_packages p",
                whereClause([facilityProcurementFilter, procurementPlanFilter(entityResolution, "p"), procurementPackageFilter(entityResolution, "p")]),
                "GROUP BY p.facility_name, p.facility_code, p.trang_thai",
                "ORDER BY total_package_value DESC NULLS LAST LIMIT 100",
            ].join(" "),
        }));
    }

    if (hasAny(normalized, ["trung thau", "gia tri trung", "ket qua thau", "kqlcnt"])) {
        plan.push(templateQuery(routing, {
            intent: "procurement",
            templateName: "awarded_value_by_facility",
            reason: "Giá trị trúng thầu theo cơ sở",
            sql: [
                "SELECT r.facility_name, r.facility_code, COUNT(*) AS result_count,",
                "SUM(r.so_mat_hang_moi_thau) AS invited_item_count,",
                "SUM(r.so_mat_hang_trung_thau) AS awarded_item_count,",
                "SUM(r.tong_gia_tri_trung_thau) AS total_awarded_value",
                "FROM ai_procurement_results r",
                whereClause([facilityFilter(entityResolution, "r"), procurementPlanFilter(entityResolution, "r"), procurementPackageFilter(entityResolution, "r")]),
                "GROUP BY r.facility_name, r.facility_code",
                "ORDER BY total_awarded_value DESC NULLS LAST LIMIT 100",
            ].join(" "),
        }));
    }

    if (hasAny(normalized, ["tbmt", "thong bao moi thau"]) && hasAny(normalized, ["ket qua", "chua co ket qua", "da co ket qua"])) {
        plan.push(templateQuery(routing, {
            intent: "procurement",
            templateName: "procurement_notice_result_coverage",
            reason: "Thống kê TBMT đã có hoặc chưa có kết quả thầu",
            sql: [
                "SELECT n.facility_name, n.facility_code, n.ma_tbmt, n.ten_goi_thau, n.ngay_dang_tai, n.result_count, CASE WHEN n.result_count > 0 THEN 'Đã có kết quả' ELSE 'Chưa có kết quả' END AS result_status",
                "FROM ai_procurement_notices n",
                whereClause([facilityFilter(entityResolution, "n"), procurementPlanFilter(entityResolution, "n"), procurementPackageFilter(entityResolution, "n")]),
                "ORDER BY n.ngay_dang_tai DESC NULLS LAST LIMIT 100",
            ].join(" "),
        }));
    }

    if (hasAny(normalized, ["phan lo", "chua co ket qua", "thieu ket qua"])) {
        plan.push(templateQuery(routing, {
            intent: "procurement",
            templateName: "procurement_lots_missing_award_result",
            reason: "Phân lô gói thầu chưa có kết quả trúng thầu tương ứng",
            sql: [
                "SELECT l.facility_name, l.facility_code, l.ma_khlcnt, l.ten_goi_thau, l.stt, l.ten_phan_lo, l.so_luong, l.don_gia, l.thanh_tien",
                "FROM ai_procurement_package_lots l",
                "LEFT JOIN ai_procurement_lot_results lr ON lr.package_id = l.package_id AND lr.lot_stt = l.stt",
                whereClause([facilityFilter(entityResolution, "l"), procurementPlanFilter(entityResolution, "l"), procurementPackageFilter(entityResolution, "l"), "lr.lot_result_id IS NULL"]),
                "ORDER BY l.thanh_tien DESC NULLS LAST LIMIT 100",
            ].join(" "),
        }));
    }

    if (hasAny(normalized, ["du tru", "dat hang", "don hang", "giao hang", "nhan hang", "chua giao", "chua nhan", "giao thieu", "nhan thieu", "chua giao du", "chua nhan du"])) {
        if (hasAny(normalized, ["thong ke", "tong hop", "tinh trang", "trang thai", "bao nhieu"])) {
            plan.push(templateQuery(routing, {
                intent: "summary",
                templateName: "order_status_fulfillment_summary",
                reason: "Tổng hợp trạng thái đơn hàng và mức độ giao/nhận",
                sql: [
                    "SELECT o.order_status, o.line_status, COUNT(DISTINCT o.order_id) AS order_count, COUNT(o.order_line_id) AS line_count, SUM(o.requested_qty) AS requested_qty, SUM(o.accepted_qty) AS accepted_qty, SUM(o.total_shipped_qty) AS shipped_qty, SUM(o.total_received_qty) AS received_qty",
                    "FROM ai_drug_orders o",
                    whereClause([facilityOrderFilter, companyFilter(entityResolution, "o")]),
                    "GROUP BY o.order_status, o.line_status",
                    "ORDER BY order_count DESC, line_count DESC LIMIT 100",
                ].join(" "),
            }));
        }

        plan.push(templateQuery(routing, {
            intent: "order",
            templateName: "orders_not_fully_shipped_or_received",
            reason: "Dòng đặt hàng đã chấp nhận nhưng chưa giao/nhận đủ",
            sql: [
                "SELECT o.order_no, o.facility_name, o.facility_code, o.company_name, o.display_name, o.unit, o.accepted_qty, o.total_shipped_qty, o.total_received_qty, o.order_status, o.line_status",
                "FROM ai_drug_orders o",
                whereClause([facilityOrderFilter, companyFilter(entityResolution, "o"), "o.accepted_qty > 0", "(o.total_shipped_qty < o.accepted_qty OR o.total_received_qty < o.accepted_qty)"]),
                "ORDER BY o.submitted_at DESC NULLS LAST LIMIT 100",
            ].join(" "),
        }));
    }

    if (hasAny(normalized, ["xu huong", "theo thang", "qua cac thang", "bien dong", "tang giam"])) {
        plan.push(templateQuery(routing, {
            intent: "trend",
            templateName: "inventory_value_trend_by_month",
            reason: "Xu hướng tồn kho theo tháng",
            sql: [
                "SELECT r.report_month, r.facility_name, r.facility_code, SUM(r.ton_cuoi) AS remaining_qty, SUM(r.thanh_tien_ton_cuoi) AS inventory_value",
                "FROM ai_inventory_reports r",
                whereClause([facilityInventoryFilter, drugInventoryFilter]),
                "GROUP BY r.report_month, r.facility_name, r.facility_code",
                "ORDER BY r.report_month DESC, inventory_value DESC LIMIT 100",
            ].join(" "),
        }));
    }

    if (hasAny(normalized, ["nhom tckt", "nhom thuoc", "phan bo", "co cau"])) {
        plan.push(templateQuery(routing, {
            intent: "summary",
            templateName: "inventory_distribution_by_drug_group",
            reason: "Phân bố tồn kho theo nhóm thuốc/Nhóm TCKT",
            sql: [
                "SELECT COALESCE(r.nhom_thuoc, 'Chưa có nhóm') AS nhom_thuoc, r.report_month, SUM(r.ton_cuoi) AS remaining_qty, SUM(r.thanh_tien_ton_cuoi) AS inventory_value",
                "FROM ai_inventory_reports r",
                whereClause([inventoryMonth, facilityInventoryFilter]),
                "GROUP BY COALESCE(r.nhom_thuoc, 'Chưa có nhóm'), r.report_month",
                "ORDER BY inventory_value DESC LIMIT 100",
            ].join(" "),
        }));
    }

    if (hasAny(normalized, ["cong ty", "nha thau", "nha cung cap"])) {
        plan.push(templateQuery(routing, {
            intent: "summary",
            templateName: "inventory_value_by_supplier",
            reason: "Giá trị tồn kho theo công ty trúng thầu/nhà cung cấp",
            sql: [
                "SELECT COALESCE(r.ten_cong_ty, 'Chưa có công ty') AS ten_cong_ty, r.report_month, SUM(r.ton_cuoi) AS remaining_qty, SUM(r.thanh_tien_ton_cuoi) AS inventory_value",
                "FROM ai_inventory_reports r",
                whereClause([inventoryMonth, facilityInventoryFilter, drugInventoryFilter, "r.ten_cong_ty IS NOT NULL"]),
                "GROUP BY COALESCE(r.ten_cong_ty, 'Chưa có công ty'), r.report_month",
                "ORDER BY inventory_value DESC LIMIT 100",
            ].join(" "),
        }));
    }

    if (hasAny(normalized, ["so sanh", "trung binh", "cao hon", "thap hon"])) {
        plan.push(templateQuery(routing, {
            intent: "comparison",
            templateName: "facility_inventory_value_vs_system_average",
            reason: "So sánh giá trị tồn kho cơ sở với mức trung bình toàn hệ thống theo kỳ",
            sql: [
                "SELECT r.facility_name, r.facility_code, r.report_month, SUM(r.thanh_tien_ton_cuoi) AS facility_inventory_value, AVG(SUM(r.thanh_tien_ton_cuoi)) OVER (PARTITION BY r.report_month) AS system_average_inventory_value",
                "FROM ai_inventory_reports r",
                whereClause([inventoryMonth, facilityInventoryFilter]),
                "GROUP BY r.facility_name, r.facility_code, r.report_month",
                "ORDER BY facility_inventory_value DESC LIMIT 100",
            ].join(" "),
        }));
    }

    if (hasAny(normalized, ["rui ro", "phan tich sau", "nguyen nhan", "canh bao"])) {
        const riskPlan = plan.filter(query => query.intent === "anomaly");
        if (riskPlan.length < 3) {
            const fallbackRiskQueries = buildFallbackRiskPlan(request, entityResolution, routing);
            for (const query of fallbackRiskQueries) {
                if (!plan.some(existing => existing.templateName === query.templateName)) {
                    plan.push(query);
                }
                if (plan.filter(item => item.intent === "anomaly").length >= 3) {
                    break;
                }
            }
        }
    }

    const routedPlan = routing.primaryDomain
        ? plan.filter(query => query.domain === routing.primaryDomain)
        : plan;

    return routedPlan.slice(0, 3);
}

function buildFallbackRiskPlan(
    request: AIAgentRequest,
    entityResolution: SafeDatabaseEntityResolution | undefined,
    routing: AIDomainRoutingResult
): SafeDatabasePlannedQuery[] {
    const facilityInventoryFilter = facilityFilter(entityResolution, "r");
    const inventoryMonth = monthCondition(request, "r");
    const drugInventoryFilter = drugFilter(entityResolution, "r");

    return [
        templateQuery(routing, {
            intent: "anomaly",
            templateName: "potential_stockout_risk",
            reason: "Dòng báo cáo có tồn cuối thấp so với xuất hoặc không còn tồn",
            sql: [
                "SELECT r.facility_name, r.facility_code, r.report_month, r.master_drug_name, r.ma_chung, r.ton_cuoi, r.xuat, r.thanh_tien_ton_cuoi",
                "FROM ai_inventory_reports r",
                whereClause([
                    inventoryMonth,
                    facilityInventoryFilter,
                    drugInventoryFilter,
                    "(r.ton_cuoi <= 0 OR (r.xuat > 0 AND r.ton_cuoi <= r.xuat * 0.25))",
                ]),
                "ORDER BY r.report_month DESC, r.xuat DESC LIMIT 100",
            ].join(" "),
        }),
        templateQuery(routing, {
            intent: "anomaly",
            templateName: "slow_moving_high_inventory",
            reason: "Tồn kho giá trị cao nhưng xuất thấp hoặc bằng 0",
            sql: [
                "SELECT r.facility_name, r.facility_code, r.report_month, r.master_drug_name, r.ma_chung, r.ton_cuoi, r.xuat, r.thanh_tien_ton_cuoi",
                "FROM ai_inventory_reports r",
                whereClause([
                    inventoryMonth,
                    facilityInventoryFilter,
                    drugInventoryFilter,
                    "r.ton_cuoi > 0",
                    "r.thanh_tien_ton_cuoi > 0",
                    "(r.xuat = 0 OR r.ton_cuoi >= r.xuat * 6)",
                ]),
                "ORDER BY r.thanh_tien_ton_cuoi DESC LIMIT 100",
            ].join(" "),
        }),
        templateQuery(routing, {
            intent: "anomaly",
            templateName: "inventory_balance_anomalies",
            reason: "Dòng tồn kho có cân đối nhập xuất tồn không khớp",
            sql: [
                "SELECT r.facility_name, r.facility_code, r.report_month, r.master_drug_name, r.ma_chung, r.ton_dau, r.nhap, r.nhap_hoan_tra, r.xuat, r.ton_cuoi, (r.ton_dau + r.nhap + r.nhap_hoan_tra - r.xuat) AS expected_ton_cuoi",
                "FROM ai_inventory_reports r",
                whereClause([
                    inventoryMonth,
                    facilityInventoryFilter,
                    drugInventoryFilter,
                    "ABS((r.ton_dau + r.nhap + r.nhap_hoan_tra - r.xuat) - r.ton_cuoi) > 0.001",
                ]),
                "ORDER BY r.report_month DESC, r.facility_name LIMIT 100",
            ].join(" "),
        }),
    ];
}
