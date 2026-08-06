export type AIDomain =
    | "catalog"
    | "mapping"
    | "inventory"
    | "report_submission"
    | "procurement"
    | "orders"
    | "facility"
    | "company";

export interface AIBusinessConcept {
    id: string;
    canonicalName: string;
    domain: AIDomain;
    aliases: string[];
    preferredViews: string[];
    preferredFields: string[];
    examples: string[];
    disambiguationNotes: string;
    weight: number;
}

export interface AIBusinessConceptMatch {
    concept: AIBusinessConcept;
    matchedAliases: string[];
    score: number;
}

export const AI_DOMAIN_VIEW_ALLOWLIST: Record<AIDomain, string[]> = {
    catalog: [
        "ai_master_drugs",
        "ai_therapeutic_groups",
        "ai_company_drugs",
    ],
    mapping: [
        "ai_mapping_status",
        "ai_facilities",
        "ai_master_drugs",
    ],
    inventory: [
        "ai_inventory_reports",
        "ai_facilities",
        "ai_companies",
        "ai_master_drugs",
        "ai_therapeutic_groups",
    ],
    report_submission: [
        "ai_report_submissions",
        "ai_report_periods",
        "ai_report_review_logs",
        "ai_facilities",
    ],
    procurement: [
        "ai_procurement_plans",
        "ai_procurement_packages",
        "ai_procurement_package_lots",
        "ai_procurement_notices",
        "ai_procurement_results",
        "ai_procurement_lot_results",
        "ai_facilities",
        "ai_companies",
    ],
    orders: [
        "ai_drug_orders",
        "ai_drug_order_shipments",
        "ai_drug_order_receipts",
        "ai_facilities",
        "ai_companies",
        "ai_company_drugs",
        "ai_master_drugs",
    ],
    facility: [
        "ai_facilities",
        "ai_inventory_reports",
        "ai_report_submissions",
        "ai_mapping_status",
        "ai_drug_orders",
        "ai_procurement_plans",
        "ai_procurement_packages",
    ],
    company: [
        "ai_companies",
        "ai_company_drugs",
        "ai_inventory_reports",
        "ai_drug_orders",
        "ai_procurement_results",
        "ai_procurement_lot_results",
    ],
};

export const AI_BUSINESS_GLOSSARY: AIBusinessConcept[] = [
    {
        id: "shared_drug_catalog",
        canonicalName: "Danh mục thuốc dùng chung",
        domain: "catalog",
        aliases: [
            "danh mục dùng chung",
            "danh mục thuốc dùng chung",
            "danh mục thuốc chung",
            "thuốc trong danh mục dùng chung",
            "thuốc danh mục dùng chung",
            "danh mục chung",
            "mã ATC",
            "ma ATC",
            "mã BHYT trong danh mục",
            "mã BHYT của thuốc",
            "thuốc theo mã ATC",
            "thuốc theo mã BHYT",
        ],
        preferredViews: ["ai_master_drugs"],
        preferredFields: ["master_drug_id", "ma_chung", "ma_bhyt", "ma_atc", "ten_thuoc", "is_active", "nhom_thuoc", "therapeutic_group_name"],
        examples: [
            "có bao nhiêu thuốc trong danh mục dùng chung",
            "đếm thuốc danh mục dùng chung",
            "thống kê thuốc theo mã ATC",
        ],
        disambiguationNotes: "Đây là danh mục master toàn hệ thống, không phải trạng thái ánh xạ danh mục của từng cơ sở.",
        weight: 130,
    },
    {
        id: "mapping_catalog",
        canonicalName: "Ánh xạ danh mục cơ sở",
        domain: "mapping",
        aliases: [
            "ánh xạ danh mục",
            "thuốc chưa ánh xạ",
            "chưa ánh xạ",
            "ngoài danh mục",
            "chờ duyệt ánh xạ",
            "chờ duyệt danh mục",
            "mapping danh mục",
            "trạng thái ánh xạ",
        ],
        preferredViews: ["ai_mapping_status"],
        preferredFields: ["mapping_id", "facility_id", "status", "is_out_of_catalog", "ma_noi_bo", "ma_chung"],
        examples: [
            "bao nhiêu thuốc ngoài danh mục",
            "cơ sở nào còn thuốc chờ duyệt ánh xạ",
        ],
        disambiguationNotes: "Dùng khi câu hỏi nói về map thuốc nội bộ của cơ sở sang danh mục dùng chung.",
        weight: 115,
    },
    {
        id: "inventory_report",
        canonicalName: "Báo cáo tồn kho",
        domain: "inventory",
        aliases: [
            "tồn kho",
            "nhập xuất tồn",
            "báo cáo tồn kho",
            "BHYT",
            "bảo hiểm y tế",
            "dịch vụ",
            "tồn cuối",
            "xuất kho",
            "lượng xuất",
            "tổng xuất",
            "đã xuất",
            "xuất nhiều",
            "giá trị tồn",
            "tồn chết",
            "đứt hàng",
            "sắp hết",
            "tồn thấp",
            "chậm luân chuyển",
            "lệch cân đối",
            "tỷ lệ thuốc",
        ],
        preferredViews: ["ai_inventory_reports"],
        preferredFields: ["report_month", "facility_id", "ma_chung", "ton_dau", "nhap", "nhap_hoan_tra", "xuat", "ton_cuoi", "bhyt", "dich_vu", "thanh_tien_ton_cuoi"],
        examples: [
            "tỷ lệ thuốc BHYT là bao nhiêu",
            "top cơ sở có giá trị tồn kho cao",
            "bệnh viện nào xuất kho nhiều nhất",
        ],
        disambiguationNotes: "Dùng cho số liệu theo kỳ báo cáo tồn kho, bao gồm BHYT/dịch vụ và giá trị tồn.",
        weight: 105,
    },
    {
        id: "report_submission",
        canonicalName: "Tình trạng nộp báo cáo",
        domain: "report_submission",
        aliases: [
            "nộp báo cáo",
            "chưa nộp",
            "không nộp",
            "đơn vị chưa nộp",
            "chậm báo cáo",
            "thiếu báo cáo",
            "kỳ báo cáo",
            "hạn nộp",
            "tỷ lệ nộp",
            "đã nộp báo cáo",
            "kỳ báo cáo đang mở",
            "mở báo cáo",
        ],
        preferredViews: ["ai_report_submissions", "ai_report_periods", "ai_facilities"],
        preferredFields: ["report_month", "facility_id", "submitted_at", "deadline", "reported_row_count"],
        examples: [
            "cơ sở nào chưa nộp báo cáo tháng 01/2026",
            "kỳ báo cáo nào đang mở",
        ],
        disambiguationNotes: "Dùng cho việc có nộp/chưa nộp báo cáo, không dùng để tính tồn kho.",
        weight: 105,
    },
    {
        id: "procurement",
        canonicalName: "Mua sắm/LCNT",
        domain: "procurement",
        aliases: [
            "mua sắm",
            "LCNT",
            "KHLĐT",
            "KHLCNT",
            "gói thầu",
            "TBMT",
            "thông báo mời thầu",
            "KQLCNT",
            "kết quả thầu",
            "trúng thầu",
            "phân lô",
            "thiếu kết quả thầu",
            "chưa có kết quả thầu",
            "kế hoạch lựa chọn nhà thầu",
        ],
        preferredViews: [
            "ai_procurement_plans",
            "ai_procurement_packages",
            "ai_procurement_package_lots",
            "ai_procurement_notices",
            "ai_procurement_results",
            "ai_procurement_lot_results",
        ],
        preferredFields: ["plan_id", "package_id", "ma_khlcnt", "ma_tbmt", "gia_goi_thau", "tong_gia_tri_trung_thau"],
        examples: [
            "tổng giá trị trúng thầu theo cơ sở",
            "gói thầu nào chưa có kết quả",
        ],
        disambiguationNotes: "Các từ viết tắt LCNT/KHLCNT/TBMT/KQLCNT ưu tiên miền mua sắm.",
        weight: 115,
    },
    {
        id: "drug_order",
        canonicalName: "Dự trù/đặt hàng thuốc",
        domain: "orders",
        aliases: [
            "dự trù",
            "đặt hàng",
            "đơn hàng",
            "giao hàng",
            "nhận hàng",
            "chưa giao",
            "chưa nhận",
            "giao thiếu",
            "nhận thiếu",
            "chưa giao đủ",
            "chưa nhận đủ",
        ],
        preferredViews: ["ai_drug_orders", "ai_drug_order_shipments", "ai_drug_order_receipts"],
        preferredFields: ["order_id", "order_no", "accepted_qty", "total_shipped_qty", "total_received_qty", "order_status"],
        examples: [
            "đơn hàng nào chưa giao đủ",
            "thuốc nào đã nhận thiếu so với số lượng chấp nhận",
        ],
        disambiguationNotes: "Dùng cho luồng dự trù, gửi đơn, giao hàng và xác nhận nhận hàng.",
        weight: 105,
    },
    {
        id: "facility",
        canonicalName: "Cơ sở y tế",
        domain: "facility",
        aliases: [
            "cơ sở",
            "bệnh viện",
            "trung tâm y tế",
            "TTYT",
            "phòng khám",
        ],
        preferredViews: ["ai_facilities"],
        preferredFields: ["facility_id", "facility_name", "facility_code", "facility_type", "is_active"],
        examples: [
            "danh sách cơ sở đang hoạt động",
        ],
        disambiguationNotes: "Thường là bộ lọc hoặc chiều phân tích cho các miền khác, không phải luôn là miền chính.",
        weight: 55,
    },
    {
        id: "company",
        canonicalName: "Công ty/nhà cung cấp",
        domain: "company",
        aliases: [
            "công ty",
            "nhà thầu",
            "nhà cung cấp",
            "công ty dược",
        ],
        preferredViews: ["ai_companies", "ai_company_drugs"],
        preferredFields: ["company_id", "company_name", "company_code"],
        examples: [
            "nhà cung cấp nào có giá trị tồn cao",
        ],
        disambiguationNotes: "Có thể là bộ lọc cho tồn kho/đơn hàng/mua sắm; miền khác được ưu tiên khi có ngữ cảnh nghiệp vụ rõ.",
        weight: 55,
    },
];

export function normalizeAIText(value: string) {
    return value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d")
        .replace(/Đ/g, "D")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

export function hasNormalizedPhrase(normalizedText: string, phrase: string) {
    const normalizedPhrase = normalizeAIText(phrase);
    return normalizedPhrase.length > 0 && normalizedText.includes(normalizedPhrase);
}

export function matchAIBusinessConcepts(question: string): AIBusinessConceptMatch[] {
    const normalizedQuestion = normalizeAIText(question);

    return AI_BUSINESS_GLOSSARY
        .map(concept => {
            const matchedAliases = concept.aliases.filter(alias => hasNormalizedPhrase(normalizedQuestion, alias));
            if (matchedAliases.length === 0) {
                return null;
            }

            const aliasScore = matchedAliases.reduce((total, alias) => {
                const normalizedAlias = normalizeAIText(alias);
                const tokenCount = normalizedAlias.split(" ").filter(Boolean).length;
                return total + Math.min(80, normalizedAlias.length * 1.4) + tokenCount * 6;
            }, 0);

            return {
                concept,
                matchedAliases,
                score: Math.round(concept.weight + aliasScore),
            };
        })
        .filter((match): match is AIBusinessConceptMatch => Boolean(match))
        .sort((left, right) => right.score - left.score || left.concept.canonicalName.localeCompare(right.concept.canonicalName, "vi"));
}

export function describeBusinessGlossaryForPrompt() {
    return AI_BUSINESS_GLOSSARY
        .map(concept => [
            `- ${concept.id} -> domain=${concept.domain}, views=${concept.preferredViews.join(", ")}`,
            `  aliases=${concept.aliases.join("; ")}`,
            `  note=${concept.disambiguationNotes}`,
        ].join("\n"))
        .join("\n");
}
