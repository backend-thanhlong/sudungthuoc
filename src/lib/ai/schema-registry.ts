export const SAFE_VIEW_NAMES = [
    "ai_facilities",
    "ai_companies",
    "ai_therapeutic_groups",
    "ai_master_drugs",
    "ai_company_drugs",
    "ai_mapping_status",
    "ai_inventory_reports",
    "ai_report_submissions",
    "ai_report_review_logs",
    "ai_report_periods",
    "ai_drug_orders",
    "ai_drug_order_shipments",
    "ai_drug_order_receipts",
    "ai_procurement_plans",
    "ai_procurement_packages",
    "ai_procurement_package_lots",
    "ai_procurement_notices",
    "ai_procurement_results",
    "ai_procurement_lot_results",
] as const;

export type AISafeViewName = (typeof SAFE_VIEW_NAMES)[number];

interface AISafeViewRegistryEntry {
    purpose: string;
    columns: string[];
    dimensions: string[];
    measures: string[];
    businessNotes: string[];
}

export const AI_SAFE_VIEW_REGISTRY: Record<AISafeViewName, AISafeViewRegistryEntry> = {
    ai_facilities: {
        purpose: "Sanitized facility identity and operational grouping.",
        columns: ["facility_id", "facility_name", "facility_code", "company_id", "autonomy_group", "facility_type", "is_active", "created_at", "updated_at"],
        dimensions: ["facility_id", "facility_code", "facility_name", "facility_type", "autonomy_group", "is_active"],
        measures: [],
        businessNotes: ["Use as the facility dimension and to find active facilities."],
    },
    ai_companies: {
        purpose: "Sanitized company/supplier identity.",
        columns: ["company_id", "company_code", "company_name", "contact_person", "phone_number", "email", "address", "is_active", "created_at", "updated_at"],
        dimensions: ["company_id", "company_code", "company_name", "is_active"],
        measures: [],
        businessNotes: ["Use as the company/supplier dimension."],
    },
    ai_therapeutic_groups: {
        purpose: "Therapeutic group catalog.",
        columns: ["therapeutic_group_id", "name", "normalized_name", "is_active", "created_at", "updated_at"],
        dimensions: ["therapeutic_group_id", "name", "normalized_name", "is_active"],
        measures: [],
        businessNotes: ["Use with ai_master_drugs for therapeutic grouping questions."],
    },
    ai_master_drugs: {
        purpose: "Shared master drug catalog/danh muc dung chung.",
        columns: ["master_drug_id", "ma_chung", "ma_bhyt", "ma_atc", "ten_thuoc", "hoat_chat", "ham_luong", "dang_bao_che", "so_dang_ky", "quy_cach", "don_vi_tinh", "tieu_chuan", "tuoi_tho", "duong_dung", "nguon_goc", "cong_ty_san_xuat", "nuoc_san_xuat", "cong_ty_dang_ky", "nuoc_dang_ky", "nhom_thuoc", "therapeutic_group_name", "is_ke_don", "kiem_soat_dac_biet", "is_trong_nuoc", "is_active", "created_at", "updated_at"],
        dimensions: ["master_drug_id", "ma_chung", "ma_bhyt", "ma_atc", "ten_thuoc", "hoat_chat", "nhom_thuoc", "therapeutic_group_name", "is_active"],
        measures: ["COUNT(master_drug_id)"],
        businessNotes: ["Use for shared catalog counts and drug attributes.", "Do not answer mapping status questions from this view."],
    },
    ai_company_drugs: {
        purpose: "Company drug catalog mapped to master drugs when available.",
        columns: ["company_drug_id", "company_id", "company_code", "company_name", "master_drug_id", "ma_chung", "master_drug_name", "company_drug_code", "company_drug_name", "active_ingredient", "quy_cach", "unit", "is_active", "created_at", "updated_at"],
        dimensions: ["company_drug_id", "company_id", "company_name", "master_drug_id", "ma_chung", "company_drug_code", "company_drug_name", "is_active"],
        measures: ["COUNT(company_drug_id)"],
        businessNotes: ["Use for supplier/company catalog questions."],
    },
    ai_mapping_status: {
        purpose: "Facility internal drug mapping status.",
        columns: ["mapping_id", "facility_id", "facility_name", "facility_code", "ma_noi_bo", "ten_thuoc_noi_bo", "hoat_chat_noi_bo", "so_dang_ky_noi_bo", "don_vi_tinh_noi_bo", "master_drug_id", "ma_chung", "master_drug_name", "master_active_ingredient", "master_strength", "status", "is_out_of_catalog", "admin_note", "created_at", "updated_at"],
        dimensions: ["facility_id", "facility_code", "mapping_id", "status", "is_out_of_catalog", "master_drug_id", "ma_chung"],
        measures: ["COUNT(mapping_id)"],
        businessNotes: ["Mapping backlog means PENDING_MAPPING, WAITING_APPROVAL, REJECTED, or is_out_of_catalog.", "Approved mapped drugs include APPROVED and AUTO_MAPPED."],
    },
    ai_inventory_reports: {
        purpose: "Monthly inventory fact view.",
        columns: ["inventory_report_id", "facility_id", "facility_name", "facility_code", "map_id", "ma_noi_bo", "ten_thuoc_noi_bo", "hoat_chat_noi_bo", "master_drug_id", "ma_chung", "master_drug_name", "master_active_ingredient", "master_strength", "nhom_thuoc", "report_month", "ton_dau", "nhap", "nhap_hoan_tra", "xuat", "ton_cuoi", "gia_vat", "thanh_tien_ton_cuoi", "so_qd_trung_thau", "ten_cong_ty", "ngay_bat_dau_hd", "ngay_ket_thuc_hd", "bhyt", "dich_vu", "status", "admin_note", "created_at", "updated_at"],
        dimensions: ["facility_id", "facility_code", "map_id", "master_drug_id", "ma_chung", "report_month", "nhom_thuoc", "bhyt", "dich_vu", "ten_cong_ty", "status"],
        measures: ["COUNT(DISTINCT map_id)", "SUM(ton_dau)", "SUM(nhap)", "SUM(nhap_hoan_tra)", "SUM(xuat)", "SUM(ton_cuoi)", "SUM(thanh_tien_ton_cuoi)", "AVG(gia_vat)"],
        businessNotes: ["report_month is MM/YYYY.", "Managed item count / số mặt hàng quản lý means COUNT(DISTINCT map_id).", "Inventory value means SUM(thanh_tien_ton_cuoi).", "Movement means SUM(nhap), SUM(nhap_hoan_tra), and SUM(xuat).", "Balance anomaly means ton_dau + nhap + nhap_hoan_tra - xuat differs from ton_cuoi."],
    },
    ai_report_submissions: {
        purpose: "Facility monthly report submission records.",
        columns: ["submission_id", "facility_id", "facility_name", "facility_code", "report_month", "submitted_at", "reported_row_count", "skipped_row_count", "created_at", "updated_at"],
        dimensions: ["submission_id", "facility_id", "facility_code", "report_month", "submitted_at"],
        measures: ["COUNT(submission_id)", "SUM(reported_row_count)", "SUM(skipped_row_count)"],
        businessNotes: ["Missing submission means an active facility has no row for a selected report_month."],
    },
    ai_report_review_logs: {
        purpose: "Admin review logs for facility reports.",
        columns: ["review_log_id", "facility_id", "facility_name", "facility_code", "report_month", "status", "admin_note", "admin_id", "created_at"],
        dimensions: ["review_log_id", "facility_id", "facility_code", "report_month", "status", "created_at"],
        measures: ["COUNT(review_log_id)"],
        businessNotes: ["Use for report approval/rejection history."],
    },
    ai_report_periods: {
        purpose: "Configured report periods and deadlines.",
        columns: ["report_period_id", "month", "is_active", "year", "period_month", "deadline", "reminder_sent", "created_at", "updated_at"],
        dimensions: ["report_period_id", "month", "is_active", "year", "period_month", "deadline"],
        measures: ["COUNT(report_period_id)"],
        businessNotes: ["Use for open periods and deadline questions."],
    },
    ai_drug_orders: {
        purpose: "Drug order/reservation lines with shipment and receipt summaries.",
        columns: ["order_id", "order_no", "facility_id", "facility_name", "facility_code", "company_id", "company_code", "company_name", "order_status", "base_report_month", "submitted_at", "closed_at", "order_created_at", "order_updated_at", "order_line_id", "source_type", "master_drug_id", "ma_chung", "master_drug_name", "company_drug_id", "company_drug_code", "company_drug_name", "display_name", "unit", "requested_qty", "accepted_qty", "suggested_qty", "line_status", "company_response_reason", "suggestion_report_month", "shipment_count", "total_shipped_qty", "receipt_count", "total_received_qty"],
        dimensions: ["order_id", "order_no", "facility_id", "company_id", "order_status", "base_report_month", "order_line_id", "master_drug_id", "ma_chung", "line_status"],
        measures: ["SUM(requested_qty)", "SUM(accepted_qty)", "SUM(suggested_qty)", "SUM(total_shipped_qty)", "SUM(total_received_qty)", "COUNT(order_line_id)"],
        businessNotes: ["Unfulfilled order risk means accepted_qty exceeds shipped or received quantities."],
    },
    ai_drug_order_shipments: {
        purpose: "Drug order shipment batches.",
        columns: ["shipment_id", "order_id", "order_no", "facility_id", "facility_name", "facility_code", "company_id", "company_code", "company_name", "shipment_no", "shipment_status", "shipped_at", "shipped_from_date", "shipped_to_date", "company_note", "created_at", "updated_at", "shipment_line_count", "total_shipped_qty", "receipt_count"],
        dimensions: ["shipment_id", "order_id", "order_no", "facility_id", "company_id", "shipment_status", "shipped_at"],
        measures: ["COUNT(shipment_id)", "SUM(shipment_line_count)", "SUM(total_shipped_qty)", "SUM(receipt_count)"],
        businessNotes: ["Use for shipment timing and shipped quantity questions."],
    },
    ai_drug_order_receipts: {
        purpose: "Facility receipt confirmations for order shipments.",
        columns: ["receipt_id", "order_id", "order_no", "shipment_id", "shipment_no", "facility_id", "facility_name", "facility_code", "company_id", "company_code", "company_name", "confirmed_at", "note", "created_at", "updated_at", "receipt_line_count", "total_received_qty"],
        dimensions: ["receipt_id", "order_id", "shipment_id", "facility_id", "company_id", "confirmed_at"],
        measures: ["COUNT(receipt_id)", "SUM(receipt_line_count)", "SUM(total_received_qty)"],
        businessNotes: ["Use for received quantity and confirmation timing questions."],
    },
    ai_procurement_plans: {
        purpose: "Procurement/KHLCNT plans.",
        columns: ["plan_id", "facility_id", "facility_name", "facility_code", "quy_trinh", "loai_mua_sam", "ma_khlcnt", "ten_khlcnt", "so_quyet_dinh", "ngay_phe_duyet", "so_luong_goi_thau", "trang_thai", "loai_mua_sam_tu_quyet", "thoi_gian_bat_dau_mua_sam", "thoi_gian_bat_dau_thuc_hien_hop_dong", "thoi_gian_thuc_hien_hop_dong", "thoi_gian_ket_thuc_hop_dong", "created_at", "updated_at", "package_count", "notice_count", "result_count", "total_package_value", "total_awarded_value"],
        dimensions: ["plan_id", "facility_id", "facility_code", "ma_khlcnt", "trang_thai", "loai_mua_sam"],
        measures: ["COUNT(plan_id)", "SUM(so_luong_goi_thau)", "SUM(package_count)", "SUM(notice_count)", "SUM(result_count)", "SUM(total_package_value)", "SUM(total_awarded_value)"],
        businessNotes: ["LCNT/KHLCNT questions usually start here or ai_procurement_packages."],
    },
    ai_procurement_packages: {
        purpose: "Procurement packages/goi thau.",
        columns: ["package_id", "plan_id", "facility_id", "facility_name", "facility_code", "ma_khlcnt", "ten_khlcnt", "ten_goi_thau", "gia_goi_thau", "linh_vuc", "hinh_thuc_lcnt", "phuong_thuc_lcnt", "loai_hop_dong", "phan_loai_goi_thau", "chi_tiet_nguon_von", "so_luong_phan_lo", "thoi_gian_to_chuc", "thoi_gian_bat_dau", "thoi_gian_thuc_hien", "trang_thai", "ma_thong_bao", "created_at", "updated_at", "lot_count", "notice_count", "result_count"],
        dimensions: ["package_id", "plan_id", "facility_id", "facility_code", "ma_khlcnt", "ma_thong_bao", "trang_thai", "linh_vuc"],
        measures: ["COUNT(package_id)", "SUM(gia_goi_thau)", "SUM(so_luong_phan_lo)", "SUM(lot_count)", "SUM(notice_count)", "SUM(result_count)"],
        businessNotes: ["Use for package status and package value questions."],
    },
    ai_procurement_package_lots: {
        purpose: "Procurement package lots/phan lo.",
        columns: ["lot_id", "package_id", "plan_id", "facility_id", "facility_name", "facility_code", "ma_khlcnt", "ten_khlcnt", "ten_goi_thau", "stt", "ten_phan_lo", "don_vi_tinh", "so_luong", "don_gia", "thanh_tien", "thoi_gian_thuc_hien", "don_vi_tinh_thoi_gian", "created_at", "updated_at"],
        dimensions: ["lot_id", "package_id", "plan_id", "facility_id", "facility_code", "ma_khlcnt", "stt", "ten_phan_lo"],
        measures: ["COUNT(lot_id)", "SUM(so_luong)", "SUM(don_gia)", "SUM(thanh_tien)"],
        businessNotes: ["Use with ai_procurement_lot_results to find lots without results."],
    },
    ai_procurement_notices: {
        purpose: "Procurement tender notices/TBMT.",
        columns: ["notice_id", "package_id", "plan_id", "facility_id", "facility_name", "facility_code", "ma_khlcnt", "ten_khlcnt", "ten_goi_thau", "ma_tbmt", "ngay_dang_tai", "so_qd_phe_duyet_hsmt", "ngay_phe_duyet_hsmt", "ngay_dong_thau", "created_at", "updated_at", "result_count"],
        dimensions: ["notice_id", "package_id", "plan_id", "facility_id", "facility_code", "ma_khlcnt", "ma_tbmt", "ngay_dang_tai"],
        measures: ["COUNT(notice_id)", "SUM(result_count)"],
        businessNotes: ["Use for TBMT and notice timing questions."],
    },
    ai_procurement_results: {
        purpose: "Procurement result/KQLCNT records.",
        columns: ["result_id", "package_id", "notice_id", "plan_id", "facility_id", "facility_name", "facility_code", "ma_khlcnt", "ten_khlcnt", "ten_goi_thau", "ma_tbmt", "so_qd_phe_duyet_kqlcnt", "ngay_phe_duyet_kqlcnt", "so_mat_hang_moi_thau", "so_mat_hang_trung_thau", "tong_gia_tri_trung_thau", "created_at", "updated_at", "lot_result_count"],
        dimensions: ["result_id", "package_id", "notice_id", "plan_id", "facility_id", "facility_code", "ma_khlcnt", "ma_tbmt", "ngay_phe_duyet_kqlcnt"],
        measures: ["COUNT(result_id)", "SUM(so_mat_hang_moi_thau)", "SUM(so_mat_hang_trung_thau)", "SUM(tong_gia_tri_trung_thau)", "SUM(lot_result_count)"],
        businessNotes: ["Use for awarded value and KQLCNT questions."],
    },
    ai_procurement_lot_results: {
        purpose: "Procurement lot award results.",
        columns: ["lot_result_id", "result_id", "package_id", "notice_id", "plan_id", "facility_id", "facility_name", "facility_code", "ma_khlcnt", "ten_khlcnt", "ten_goi_thau", "ten_phan_lo", "lot_stt", "ket_qua", "don_gia_trung_thau", "nha_thau_trung_thau", "created_at", "updated_at"],
        dimensions: ["lot_result_id", "result_id", "package_id", "notice_id", "plan_id", "facility_id", "facility_code", "ma_khlcnt", "lot_stt", "ket_qua", "nha_thau_trung_thau"],
        measures: ["COUNT(lot_result_id)", "SUM(don_gia_trung_thau)"],
        businessNotes: ["Use for lot-level award status and supplier questions."],
    },
};

function formatViewColumns(entry: AISafeViewRegistryEntry) {
    const wrapped = entry.columns.reduce<string[]>((lines, column, index) => {
        const current = lines[lines.length - 1] || "";
        const next = current ? `${current}, ${column}` : column;
        if (next.length > 78 && index > 0) {
            lines.push(column);
        } else {
            lines[lines.length - 1] = next;
        }
        return lines;
    }, [""]);

    return wrapped.map(line => `  ${line}`).join("\n");
}

export function buildSafeDatabaseSchemaDescription() {
    return [
        "Available read-only AI views:",
        ...SAFE_VIEW_NAMES.map(viewName => {
            const entry = AI_SAFE_VIEW_REGISTRY[viewName];
            return [
                "",
                `${viewName}(`,
                formatViewColumns(entry),
                ")",
            ].join("\n");
        }),
    ].join("\n").trim();
}

export function describeAISchemaRegistryForPrompt() {
    return SAFE_VIEW_NAMES
        .map(viewName => {
            const entry = AI_SAFE_VIEW_REGISTRY[viewName];
            return [
                `- ${viewName}: ${entry.purpose}`,
                `  dimensions=${entry.dimensions.join(", ") || "none"}`,
                `  measures=${entry.measures.join(", ") || "none"}`,
                `  notes=${entry.businessNotes.join(" ")}`,
            ].join("\n");
        })
        .join("\n");
}
