import { normalizeAIText, type AIDomain } from "@/lib/ai/domain-glossary";

export type AIMetricId =
    | "managed_inventory_items"
    | "inventory_value"
    | "submitted_facilities"
    | "mapping_backlog"
    | "awarded_item_count"
    | "unfulfilled_orders";

export interface AIMetricDefinition {
    id: AIMetricId;
    canonicalName: string;
    domain: AIDomain;
    aliases: string[];
    requiredViews: string[];
    preferredFields: string[];
    score: number;
}

export interface AIMetricMatch {
    metric: AIMetricDefinition;
    matchedAliases: string[];
    score: number;
}

export const AI_METRIC_REGISTRY: AIMetricDefinition[] = [
    {
        id: "managed_inventory_items",
        canonicalName: "Số mặt hàng quản lý",
        domain: "inventory",
        aliases: [
            "mat hang quan ly",
            "so mat hang quan ly",
            "bao nhieu mat hang quan ly",
            "co bao nhieu mat hang",
            "bao nhieu mat hang",
            "dang quan ly bao nhieu thuoc",
            "so ma thuoc quan ly",
            "so danh muc thuoc tai co so",
        ],
        requiredViews: ["ai_inventory_reports"],
        preferredFields: ["facility_id", "report_month", "map_id"],
        score: 210,
    },
    {
        id: "inventory_value",
        canonicalName: "Giá trị tồn kho",
        domain: "inventory",
        aliases: [
            "gia tri ton kho",
            "tong gia tri ton",
            "tien ton kho",
            "thanh tien ton cuoi",
            "gia tri ton",
        ],
        requiredViews: ["ai_inventory_reports"],
        preferredFields: ["facility_id", "report_month", "thanh_tien_ton_cuoi"],
        score: 180,
    },
    {
        id: "submitted_facilities",
        canonicalName: "Số cơ sở đã nộp báo cáo",
        domain: "report_submission",
        aliases: [
            "co so da nop bao cao",
            "so co so da nop",
            "bao nhieu co so da nop",
            "ty le nop bao cao",
            "tinh trang nop bao cao",
        ],
        requiredViews: ["ai_report_submissions", "ai_facilities"],
        preferredFields: ["facility_id", "report_month", "submitted_at"],
        score: 190,
    },
    {
        id: "mapping_backlog",
        canonicalName: "Thuốc chưa ánh xạ",
        domain: "mapping",
        aliases: [
            "thuoc chua anh xa",
            "chua anh xa",
            "cho duyet anh xa",
            "ngoai danh muc",
            "danh muc can duyet",
            "ton dong anh xa",
        ],
        requiredViews: ["ai_mapping_status"],
        preferredFields: ["facility_id", "status", "is_out_of_catalog", "mapping_id"],
        score: 200,
    },
    {
        id: "awarded_item_count",
        canonicalName: "Số mặt hàng trúng thầu",
        domain: "procurement",
        aliases: [
            "so mat hang trung thau",
            "mat hang trung thau",
            "bao nhieu mat hang trung thau",
            "ty le trung thau",
        ],
        requiredViews: ["ai_procurement_results"],
        preferredFields: ["facility_id", "so_mat_hang_trung_thau", "so_mat_hang_moi_thau"],
        score: 200,
    },
    {
        id: "unfulfilled_orders",
        canonicalName: "Đơn chưa giao hoặc nhận đủ",
        domain: "orders",
        aliases: [
            "don chua giao du",
            "chua giao du",
            "chua nhan du",
            "giao thieu",
            "nhan thieu",
            "don hang chua hoan tat",
        ],
        requiredViews: ["ai_drug_orders"],
        preferredFields: ["accepted_qty", "total_shipped_qty", "total_received_qty", "order_status"],
        score: 190,
    },
];

export function matchAIMetrics(question: string): AIMetricMatch[] {
    const normalizedQuestion = normalizeAIText(question);
    return AI_METRIC_REGISTRY
        .map(metric => {
            if (
                metric.id === "managed_inventory_items"
                && ["trung thau", "moi thau", "goi thau", "lcnt", "kqlcnt"].some(term => normalizedQuestion.includes(term))
            ) {
                return {
                    metric,
                    matchedAliases: [],
                    score: 0,
                };
            }

            const matchedAliases = metric.aliases.filter(alias => normalizedQuestion.includes(normalizeAIText(alias)));
            return {
                metric,
                matchedAliases,
                score: matchedAliases.length > 0 ? metric.score + matchedAliases.length * 10 : 0,
            };
        })
        .filter(match => match.score > 0)
        .sort((left, right) => right.score - left.score || left.metric.id.localeCompare(right.metric.id));
}

export function topAIMetric(question: string) {
    return matchAIMetrics(question)[0];
}

export function metricRequiredViews(question: string) {
    return topAIMetric(question)?.metric.requiredViews || [];
}
