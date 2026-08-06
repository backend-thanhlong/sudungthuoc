import {
    matchAIBusinessConcepts,
    normalizeAIText,
    type AIBusinessConceptMatch,
    type AIDomain,
} from "@/lib/ai/domain-glossary";
import { matchAIMetrics } from "@/lib/ai/metric-registry";

export interface AIDomainRoutingCandidate {
    domain: AIDomain;
    score: number;
    matchedConcepts: string[];
    matchedAliases: string[];
    preferredViews: string[];
}

export interface AIDomainRoutingResult {
    primaryDomain: AIDomain | null;
    candidates: AIDomainRoutingCandidate[];
    ambiguity: "none" | "low" | "high";
    reason: string;
    matchedConcepts: AIBusinessConceptMatch[];
}

const DOMAIN_HINTS: Record<AIDomain, Array<{ phrase: string; score: number; views: string[] }>> = {
    catalog: [
        { phrase: "danh muc dung chung", score: 120, views: ["ai_master_drugs"] },
        { phrase: "danh muc chung", score: 90, views: ["ai_master_drugs"] },
        { phrase: "danh muc thuoc", score: 35, views: ["ai_master_drugs"] },
        { phrase: "thuoc danh muc", score: 35, views: ["ai_master_drugs"] },
        { phrase: "ma atc", score: 130, views: ["ai_master_drugs"] },
        { phrase: "thuoc theo ma atc", score: 145, views: ["ai_master_drugs"] },
        { phrase: "ma bhyt cua thuoc", score: 130, views: ["ai_master_drugs"] },
        { phrase: "thuoc theo ma bhyt", score: 130, views: ["ai_master_drugs"] },
    ],
    mapping: [
        { phrase: "ngoai danh muc", score: 130, views: ["ai_mapping_status"] },
        { phrase: "anh xa", score: 95, views: ["ai_mapping_status"] },
        { phrase: "chua anh xa", score: 105, views: ["ai_mapping_status"] },
        { phrase: "cho duyet", score: 80, views: ["ai_mapping_status"] },
        { phrase: "tu choi", score: 70, views: ["ai_mapping_status"] },
        { phrase: "danh muc co van de", score: 45, views: ["ai_mapping_status"] },
        { phrase: "danh muc thuoc co van de", score: 55, views: ["ai_mapping_status"] },
        { phrase: "danh muc can kiem tra", score: 55, views: ["ai_mapping_status"] },
    ],
    inventory: [
        { phrase: "ton kho", score: 110, views: ["ai_inventory_reports"] },
        { phrase: "nhap xuat ton", score: 115, views: ["ai_inventory_reports"] },
        { phrase: "bhyt", score: 120, views: ["ai_inventory_reports"] },
        { phrase: "bao hiem y te", score: 120, views: ["ai_inventory_reports"] },
        { phrase: "dich vu", score: 85, views: ["ai_inventory_reports"] },
        { phrase: "dut hang", score: 95, views: ["ai_inventory_reports"] },
        { phrase: "ton chet", score: 95, views: ["ai_inventory_reports"] },
        { phrase: "sap het", score: 85, views: ["ai_inventory_reports"] },
        { phrase: "ton thap", score: 85, views: ["ai_inventory_reports"] },
        { phrase: "cham luan chuyen", score: 85, views: ["ai_inventory_reports"] },
        { phrase: "lech can doi", score: 95, views: ["ai_inventory_reports"] },
        { phrase: "gia tri ton", score: 90, views: ["ai_inventory_reports"] },
        { phrase: "xuat kho", score: 125, views: ["ai_inventory_reports"] },
        { phrase: "luong xuat", score: 120, views: ["ai_inventory_reports"] },
        { phrase: "tong xuat", score: 120, views: ["ai_inventory_reports"] },
        { phrase: "da xuat", score: 100, views: ["ai_inventory_reports"] },
        { phrase: "xuat nhieu", score: 120, views: ["ai_inventory_reports"] },
    ],
    report_submission: [
        { phrase: "chua nop", score: 120, views: ["ai_report_submissions", "ai_facilities"] },
        { phrase: "khong nop", score: 110, views: ["ai_report_submissions", "ai_facilities"] },
        { phrase: "cham bao cao", score: 115, views: ["ai_report_submissions", "ai_facilities"] },
        { phrase: "nop bao cao", score: 100, views: ["ai_report_submissions"] },
        { phrase: "ty le nop", score: 120, views: ["ai_report_submissions", "ai_facilities"] },
        { phrase: "da nop", score: 95, views: ["ai_report_submissions"] },
        { phrase: "ky bao cao", score: 70, views: ["ai_report_periods"] },
        { phrase: "han nop", score: 95, views: ["ai_report_periods"] },
        { phrase: "dang mo", score: 80, views: ["ai_report_periods"] },
    ],
    procurement: [
        { phrase: "lcnt", score: 130, views: ["ai_procurement_packages"] },
        { phrase: "khlcnt", score: 130, views: ["ai_procurement_plans"] },
        { phrase: "khldt", score: 120, views: ["ai_procurement_plans"] },
        { phrase: "tbmt", score: 130, views: ["ai_procurement_notices"] },
        { phrase: "thong bao moi thau", score: 130, views: ["ai_procurement_notices"] },
        { phrase: "kqlcnt", score: 130, views: ["ai_procurement_results"] },
        { phrase: "mua sam", score: 110, views: ["ai_procurement_plans"] },
        { phrase: "goi thau", score: 105, views: ["ai_procurement_packages"] },
        { phrase: "trung thau", score: 110, views: ["ai_procurement_results"] },
        { phrase: "phan lo", score: 95, views: ["ai_procurement_package_lots"] },
    ],
    orders: [
        { phrase: "du tru", score: 110, views: ["ai_drug_orders"] },
        { phrase: "dat hang", score: 110, views: ["ai_drug_orders"] },
        { phrase: "don hang", score: 95, views: ["ai_drug_orders"] },
        { phrase: "giao hang", score: 100, views: ["ai_drug_order_shipments"] },
        { phrase: "nhan hang", score: 100, views: ["ai_drug_order_receipts"] },
        { phrase: "chua giao", score: 110, views: ["ai_drug_orders"] },
        { phrase: "chua nhan", score: 110, views: ["ai_drug_orders"] },
        { phrase: "giao thieu", score: 110, views: ["ai_drug_orders"] },
        { phrase: "nhan thieu", score: 110, views: ["ai_drug_orders"] },
        { phrase: "chua giao du", score: 120, views: ["ai_drug_orders"] },
        { phrase: "chua nhan du", score: 120, views: ["ai_drug_orders"] },
    ],
    facility: [
        { phrase: "co so", score: 45, views: ["ai_facilities"] },
        { phrase: "benh vien", score: 45, views: ["ai_facilities"] },
        { phrase: "trung tam y te", score: 50, views: ["ai_facilities"] },
        { phrase: "ttyt", score: 50, views: ["ai_facilities"] },
    ],
    company: [
        { phrase: "cong ty", score: 45, views: ["ai_companies"] },
        { phrase: "nha thau", score: 50, views: ["ai_companies"] },
        { phrase: "nha cung cap", score: 50, views: ["ai_companies"] },
    ],
};

const FILTER_DIMENSION_DOMAINS = new Set<AIDomain>(["facility", "company"]);

function addDomainScore(
    scores: Map<AIDomain, AIDomainRoutingCandidate>,
    domain: AIDomain,
    score: number,
    matchedConcept: string | undefined,
    matchedAliases: string[],
    preferredViews: string[]
) {
    const existing = scores.get(domain);
    if (!existing) {
        scores.set(domain, {
            domain,
            score,
            matchedConcepts: matchedConcept ? [matchedConcept] : [],
            matchedAliases,
            preferredViews,
        });
        return;
    }

    existing.score += score;
    if (matchedConcept) {
        existing.matchedConcepts = [...new Set([...existing.matchedConcepts, matchedConcept])];
    }
    existing.matchedAliases = [...new Set([...existing.matchedAliases, ...matchedAliases])];
    existing.preferredViews = [...new Set([...existing.preferredViews, ...preferredViews])];
}

function applyConceptMatches(scores: Map<AIDomain, AIDomainRoutingCandidate>, matches: AIBusinessConceptMatch[]) {
    for (const match of matches) {
        addDomainScore(
            scores,
            match.concept.domain,
            match.score,
            match.concept.id,
            match.matchedAliases,
            match.concept.preferredViews
        );
    }
}

function applyMetricMatches(scores: Map<AIDomain, AIDomainRoutingCandidate>, question: string) {
    for (const match of matchAIMetrics(question)) {
        addDomainScore(
            scores,
            match.metric.domain,
            match.score,
            match.metric.id,
            match.matchedAliases,
            match.metric.requiredViews
        );
    }
}

function applyPhraseHints(scores: Map<AIDomain, AIDomainRoutingCandidate>, normalizedQuestion: string) {
    for (const [domain, hints] of Object.entries(DOMAIN_HINTS) as Array<[AIDomain, typeof DOMAIN_HINTS[AIDomain]]>) {
        for (const hint of hints) {
            if (normalizedQuestion.includes(hint.phrase)) {
                addDomainScore(scores, domain, hint.score, undefined, [hint.phrase], hint.views);
            }
        }
    }
}

function strengthenKnownDisambiguations(scores: Map<AIDomain, AIDomainRoutingCandidate>, normalizedQuestion: string) {
    if (normalizedQuestion.includes("danh muc dung chung") || normalizedQuestion.includes("danh muc chung")) {
        addDomainScore(scores, "catalog", 160, "shared_drug_catalog", ["danh mục dùng chung"], ["ai_master_drugs"]);
        const mapping = scores.get("mapping");
        if (mapping) {
            mapping.score = Math.max(0, mapping.score - 80);
        }
    }

    if (normalizedQuestion.includes("ngoai danh muc")) {
        addDomainScore(scores, "mapping", 170, "mapping_catalog", ["ngoài danh mục"], ["ai_mapping_status"]);
        const catalog = scores.get("catalog");
        if (catalog) {
            catalog.score = Math.max(0, catalog.score - 60);
        }
    }

    if (normalizedQuestion.includes("bhyt") || normalizedQuestion.includes("bao hiem y te")) {
        addDomainScore(scores, "inventory", 140, "inventory_report", ["BHYT"], ["ai_inventory_reports"]);
    }

    if (normalizedQuestion.includes("ma atc")) {
        addDomainScore(scores, "catalog", 170, "shared_drug_catalog", ["Mã ATC"], ["ai_master_drugs"]);
    }

    if (normalizedQuestion.includes("ma bhyt")) {
        addDomainScore(scores, "catalog", 130, "shared_drug_catalog", ["Mã BHYT"], ["ai_master_drugs"]);
        const inventory = scores.get("inventory");
        if (inventory && !normalizedQuestion.includes("ty le") && !normalizedQuestion.includes("ton kho")) {
            inventory.score = Math.max(0, inventory.score - 80);
        }
    }

    if (
        normalizedQuestion.includes("xuat kho")
        || normalizedQuestion.includes("luong xuat")
        || normalizedQuestion.includes("tong xuat")
        || normalizedQuestion.includes("da xuat")
        || normalizedQuestion.includes("xuat nhieu")
    ) {
        addDomainScore(scores, "inventory", 150, "inventory_report", ["xuất kho"], ["ai_inventory_reports"]);
    }
}

function rankCandidates(scores: Map<AIDomain, AIDomainRoutingCandidate>) {
    return [...scores.values()]
        .filter(candidate => candidate.score > 0)
        .sort((left, right) => right.score - left.score || left.domain.localeCompare(right.domain));
}

function choosePrimaryDomain(candidates: AIDomainRoutingCandidate[]) {
    const primary = candidates.find(candidate => !FILTER_DIMENSION_DOMAINS.has(candidate.domain));
    return primary || candidates[0] || null;
}

function inferAmbiguity(candidates: AIDomainRoutingCandidate[], primary: AIDomainRoutingCandidate | null, normalizedQuestion: string) {
    if (
        normalizedQuestion.includes("danh muc co van de")
        || normalizedQuestion.includes("danh muc thuoc co van de")
        || normalizedQuestion.includes("thuoc danh muc co van de")
        || normalizedQuestion.includes("thuoc danh muc can kiem tra")
        || normalizedQuestion.includes("danh muc can kiem tra")
    ) {
        return "high" as const;
    }

    if (!primary) {
        return "none" as const;
    }

    const competing = candidates.find(candidate => candidate.domain !== primary.domain && !FILTER_DIMENSION_DOMAINS.has(candidate.domain));
    if (!competing) {
        return "none" as const;
    }

    const gap = primary.score - competing.score;
    if (gap <= 30) {
        return "high" as const;
    }
    if (gap <= 70) {
        return "low" as const;
    }
    return "none" as const;
}

export function routeAIDomain(question: string): AIDomainRoutingResult {
    const normalizedQuestion = normalizeAIText(question);
    const matches = matchAIBusinessConcepts(question);
    const scores = new Map<AIDomain, AIDomainRoutingCandidate>();

    applyConceptMatches(scores, matches);
    applyMetricMatches(scores, question);
    applyPhraseHints(scores, normalizedQuestion);
    strengthenKnownDisambiguations(scores, normalizedQuestion);

    const candidates = rankCandidates(scores);
    const primary = choosePrimaryDomain(candidates);
    const ambiguity = inferAmbiguity(candidates, primary, normalizedQuestion);
    const primaryDomain = primary?.domain || null;

    return {
        primaryDomain,
        candidates,
        ambiguity,
        reason: primary
            ? `Miền ${primary.domain} đạt điểm cao nhất (${primary.score}) từ ${primary.matchedAliases.join(", ") || "từ khóa nghiệp vụ"}.`
            : "Không phát hiện miền nghiệp vụ đủ rõ.",
        matchedConcepts: matches,
    };
}

export function describeDomainRoutingForPrompt(routing: AIDomainRoutingResult) {
    return {
        primaryDomain: routing.primaryDomain,
        ambiguity: routing.ambiguity,
        reason: routing.reason,
        candidates: routing.candidates.map(candidate => ({
            domain: candidate.domain,
            score: candidate.score,
            matchedConcepts: candidate.matchedConcepts,
            matchedAliases: candidate.matchedAliases,
            preferredViews: candidate.preferredViews,
        })),
    };
}
