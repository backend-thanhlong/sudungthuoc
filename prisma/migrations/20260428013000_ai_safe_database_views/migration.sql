CREATE OR REPLACE VIEW "ai_facilities" AS
SELECT
    "id" AS "facility_id",
    "username",
    "facility_name",
    "facility_code",
    "company_id",
    "autonomy_group",
    "facility_type",
    "contact_person",
    "phone_number",
    "address",
    "is_active",
    "created_at",
    "updated_at"
FROM "users"
WHERE "role" = 'FACILITY';

CREATE OR REPLACE VIEW "ai_companies" AS
SELECT
    "id" AS "company_id",
    "code" AS "company_code",
    "name" AS "company_name",
    "contact_person",
    "phone_number",
    "email",
    "address",
    "is_active",
    "created_at",
    "updated_at"
FROM "companies";

CREATE OR REPLACE VIEW "ai_master_drugs" AS
SELECT
    md."id" AS "master_drug_id",
    md."ma_chung",
    md."ma_bhyt",
    md."ten_thuoc",
    md."hoat_chat",
    md."ham_luong",
    md."dang_bao_che",
    md."so_dang_ky",
    md."quy_cach",
    md."don_vi_tinh",
    md."tieu_chuan",
    md."tuoi_tho",
    md."duong_dung",
    md."nguon_goc",
    md."cong_ty_san_xuat",
    md."nuoc_san_xuat",
    md."cong_ty_dang_ky",
    md."nuoc_dang_ky",
    md."nhom_thuoc",
    tg."name" AS "therapeutic_group_name",
    md."is_ke_don",
    md."kiem_soat_dac_biet",
    md."is_trong_nuoc",
    md."is_active",
    md."created_at",
    md."updated_at"
FROM "master_drugs" md
LEFT JOIN "therapeutic_groups" tg ON tg."id" = md."therapeutic_group_id";

CREATE OR REPLACE VIEW "ai_mapping_status" AS
SELECT
    fdm."id" AS "mapping_id",
    fdm."facility_id",
    u."facility_name",
    u."facility_code",
    fdm."ma_noi_bo",
    fdm."ten_thuoc_noi_bo",
    fdm."hoat_chat_noi_bo",
    fdm."so_dang_ky_noi_bo",
    fdm."don_vi_tinh_noi_bo",
    fdm."master_drug_id",
    md."ma_chung",
    md."ten_thuoc" AS "master_drug_name",
    md."hoat_chat" AS "master_active_ingredient",
    md."ham_luong" AS "master_strength",
    fdm."status",
    fdm."is_out_of_catalog",
    fdm."admin_note",
    fdm."created_at",
    fdm."updated_at"
FROM "facility_drug_maps" fdm
JOIN "users" u ON u."id" = fdm."facility_id"
LEFT JOIN "master_drugs" md ON md."id" = fdm."master_drug_id"
WHERE u."role" = 'FACILITY';

CREATE OR REPLACE VIEW "ai_inventory_reports" AS
SELECT
    ir."id" AS "inventory_report_id",
    ir."facility_id",
    u."facility_name",
    u."facility_code",
    ir."map_id",
    fdm."ma_noi_bo",
    fdm."ten_thuoc_noi_bo",
    fdm."hoat_chat_noi_bo",
    fdm."master_drug_id",
    md."ma_chung",
    md."ten_thuoc" AS "master_drug_name",
    md."hoat_chat" AS "master_active_ingredient",
    md."ham_luong" AS "master_strength",
    md."nhom_thuoc",
    ir."report_month",
    ir."ton_dau",
    ir."nhap",
    ir."xuat",
    ir."ton_cuoi",
    ir."gia_vat",
    ir."thanh_tien_ton_cuoi",
    ir."so_qd_trung_thau",
    ir."ten_cong_ty",
    ir."ngay_bat_dau_hd",
    ir."ngay_ket_thuc_hd",
    ir."bhyt",
    ir."dich_vu",
    ir."status",
    ir."admin_note",
    ir."created_at",
    ir."updated_at"
FROM "inventory_reports" ir
JOIN "users" u ON u."id" = ir."facility_id"
JOIN "facility_drug_maps" fdm ON fdm."id" = ir."map_id"
LEFT JOIN "master_drugs" md ON md."id" = fdm."master_drug_id"
WHERE u."role" = 'FACILITY';

CREATE OR REPLACE VIEW "ai_report_submissions" AS
SELECT
    frs."id" AS "submission_id",
    frs."facility_id",
    u."facility_name",
    u."facility_code",
    frs."report_month",
    frs."submitted_at",
    frs."reported_row_count",
    frs."skipped_row_count",
    frs."created_at",
    frs."updated_at"
FROM "facility_report_submissions" frs
JOIN "users" u ON u."id" = frs."facility_id"
WHERE u."role" = 'FACILITY';

CREATE OR REPLACE VIEW "ai_drug_orders" AS
SELECT
    o."id" AS "order_id",
    o."order_no",
    o."facility_id",
    facility."facility_name",
    facility."facility_code",
    o."company_id",
    c."code" AS "company_code",
    c."name" AS "company_name",
    o."status" AS "order_status",
    o."base_report_month",
    o."submitted_at",
    o."closed_at",
    o."created_at" AS "order_created_at",
    o."updated_at" AS "order_updated_at",
    l."id" AS "order_line_id",
    l."source_type",
    l."master_drug_id",
    md."ma_chung",
    md."ten_thuoc" AS "master_drug_name",
    l."company_drug_id",
    cd."company_drug_code",
    cd."company_drug_name",
    l."display_name",
    l."unit",
    l."requested_qty",
    l."accepted_qty",
    l."suggested_qty",
    l."line_status",
    l."company_response_reason",
    l."suggestion_report_month",
    COALESCE(shipment_totals."shipment_count", 0) AS "shipment_count",
    COALESCE(shipment_totals."total_shipped_qty", 0) AS "total_shipped_qty",
    COALESCE(receipt_totals."receipt_count", 0) AS "receipt_count",
    COALESCE(receipt_totals."total_received_qty", 0) AS "total_received_qty"
FROM "drug_orders" o
JOIN "users" facility ON facility."id" = o."facility_id"
JOIN "companies" c ON c."id" = o."company_id"
LEFT JOIN "drug_order_lines" l ON l."order_id" = o."id"
LEFT JOIN "master_drugs" md ON md."id" = l."master_drug_id"
LEFT JOIN "company_drugs" cd ON cd."id" = l."company_drug_id"
LEFT JOIN (
    SELECT
        dsl."order_line_id",
        COUNT(DISTINCT ds."id") AS "shipment_count",
        SUM(dsl."shipped_qty") AS "total_shipped_qty"
    FROM "drug_order_shipment_lines" dsl
    JOIN "drug_order_shipments" ds ON ds."id" = dsl."shipment_id"
    GROUP BY dsl."order_line_id"
) shipment_totals ON shipment_totals."order_line_id" = l."id"
LEFT JOIN (
    SELECT
        drl."order_line_id",
        COUNT(DISTINCT dr."id") AS "receipt_count",
        SUM(drl."received_qty") AS "total_received_qty"
    FROM "drug_order_receipt_lines" drl
    JOIN "drug_order_receipts" dr ON dr."id" = drl."receipt_id"
    GROUP BY drl."order_line_id"
) receipt_totals ON receipt_totals."order_line_id" = l."id"
WHERE facility."role" = 'FACILITY';
