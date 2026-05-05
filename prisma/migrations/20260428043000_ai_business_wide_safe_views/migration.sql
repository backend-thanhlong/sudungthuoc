DROP VIEW IF EXISTS "ai_facilities";

CREATE VIEW "ai_facilities" AS
SELECT
    "id" AS "facility_id",
    "facility_name",
    "facility_code",
    "company_id",
    "autonomy_group",
    "facility_type",
    "is_active",
    "created_at",
    "updated_at"
FROM "users"
WHERE "role" = 'FACILITY';

CREATE OR REPLACE VIEW "ai_therapeutic_groups" AS
SELECT
    "id" AS "therapeutic_group_id",
    "name",
    "normalized_name",
    "is_active",
    "created_at",
    "updated_at"
FROM "therapeutic_groups";

CREATE OR REPLACE VIEW "ai_company_drugs" AS
SELECT
    cd."id" AS "company_drug_id",
    cd."company_id",
    c."code" AS "company_code",
    c."name" AS "company_name",
    cd."master_drug_id",
    md."ma_chung",
    md."ten_thuoc" AS "master_drug_name",
    cd."company_drug_code",
    cd."company_drug_name",
    cd."active_ingredient",
    cd."quy_cach",
    cd."unit",
    cd."is_active",
    cd."created_at",
    cd."updated_at"
FROM "company_drugs" cd
JOIN "companies" c ON c."id" = cd."company_id"
LEFT JOIN "master_drugs" md ON md."id" = cd."master_drug_id";

CREATE OR REPLACE VIEW "ai_report_review_logs" AS
SELECT
    rrl."id" AS "review_log_id",
    rrl."facility_id",
    facility."facility_name",
    facility."facility_code",
    rrl."report_month",
    rrl."status",
    rrl."admin_note",
    rrl."admin_id",
    rrl."created_at"
FROM "report_review_logs" rrl
JOIN "users" facility ON facility."id" = rrl."facility_id"
WHERE facility."role" = 'FACILITY';

CREATE OR REPLACE VIEW "ai_report_periods" AS
SELECT
    "id" AS "report_period_id",
    "month",
    "is_active",
    "year",
    "period_month",
    "deadline",
    "reminder_sent",
    "created_at",
    "updated_at"
FROM "report_periods";

CREATE OR REPLACE VIEW "ai_procurement_plans" AS
SELECT
    kh."id" AS "plan_id",
    kh."facility_id",
    facility."facility_name",
    facility."facility_code",
    kh."quy_trinh",
    kh."loai_mua_sam",
    kh."ma_khlcnt",
    kh."ten_khlcnt",
    kh."so_quyet_dinh",
    kh."ngay_phe_duyet",
    kh."so_luong_goi_thau",
    kh."trang_thai",
    kh."loai_mua_sam_tu_quyet",
    kh."thoi_gian_bat_dau_mua_sam",
    kh."thoi_gian_bat_dau_thuc_hien_hop_dong",
    kh."thoi_gian_thuc_hien_hop_dong",
    kh."thoi_gian_ket_thuc_hop_dong",
    kh."created_at",
    kh."updated_at",
    COUNT(DISTINCT gt."id") AS "package_count",
    COUNT(DISTINCT tbmt."id") AS "notice_count",
    COUNT(DISTINCT kq."id") AS "result_count",
    COALESCE(SUM(gt."gia_goi_thau"), 0) AS "total_package_value",
    COALESCE(SUM(kq."tong_gia_tri_trung_thau"), 0) AS "total_awarded_value"
FROM "ke_hoach_lcnt" kh
JOIN "users" facility ON facility."id" = kh."facility_id"
LEFT JOIN "goi_thau" gt ON gt."ke_hoach_id" = kh."id"
LEFT JOIN "thong_bao_moi_thau" tbmt ON tbmt."goi_thau_id" = gt."id"
LEFT JOIN "ket_qua_lcnt" kq ON kq."goi_thau_id" = gt."id"
WHERE facility."role" = 'FACILITY'
GROUP BY
    kh."id",
    facility."facility_name",
    facility."facility_code";

CREATE OR REPLACE VIEW "ai_procurement_packages" AS
SELECT
    gt."id" AS "package_id",
    gt."ke_hoach_id" AS "plan_id",
    kh."facility_id",
    facility."facility_name",
    facility."facility_code",
    kh."ma_khlcnt",
    kh."ten_khlcnt",
    gt."ten_goi_thau",
    gt."gia_goi_thau",
    gt."linh_vuc",
    gt."hinh_thuc_lcnt",
    gt."phuong_thuc_lcnt",
    gt."loai_hop_dong",
    gt."phan_loai_goi_thau",
    gt."chi_tiet_nguon_von",
    gt."so_luong_phan_lo",
    gt."thoi_gian_to_chuc",
    gt."thoi_gian_bat_dau",
    gt."thoi_gian_thuc_hien",
    gt."trang_thai",
    gt."ma_thong_bao",
    gt."created_at",
    gt."updated_at",
    COUNT(DISTINCT pl."id") AS "lot_count",
    COUNT(DISTINCT tbmt."id") AS "notice_count",
    COUNT(DISTINCT kq."id") AS "result_count"
FROM "goi_thau" gt
JOIN "ke_hoach_lcnt" kh ON kh."id" = gt."ke_hoach_id"
JOIN "users" facility ON facility."id" = kh."facility_id"
LEFT JOIN "phan_lo_goi_thau" pl ON pl."goi_thau_id" = gt."id"
LEFT JOIN "thong_bao_moi_thau" tbmt ON tbmt."goi_thau_id" = gt."id"
LEFT JOIN "ket_qua_lcnt" kq ON kq."goi_thau_id" = gt."id"
WHERE facility."role" = 'FACILITY'
GROUP BY
    gt."id",
    kh."facility_id",
    facility."facility_name",
    facility."facility_code",
    kh."ma_khlcnt",
    kh."ten_khlcnt";

CREATE OR REPLACE VIEW "ai_procurement_package_lots" AS
SELECT
    pl."id" AS "lot_id",
    pl."goi_thau_id" AS "package_id",
    gt."ke_hoach_id" AS "plan_id",
    kh."facility_id",
    facility."facility_name",
    facility."facility_code",
    kh."ma_khlcnt",
    kh."ten_khlcnt",
    gt."ten_goi_thau",
    pl."stt",
    pl."ten_phan_lo",
    pl."don_vi_tinh",
    pl."so_luong",
    pl."don_gia",
    pl."thanh_tien",
    pl."thoi_gian_thuc_hien",
    pl."don_vi_tinh_thoi_gian",
    pl."created_at",
    pl."updated_at"
FROM "phan_lo_goi_thau" pl
JOIN "goi_thau" gt ON gt."id" = pl."goi_thau_id"
JOIN "ke_hoach_lcnt" kh ON kh."id" = gt."ke_hoach_id"
JOIN "users" facility ON facility."id" = kh."facility_id"
WHERE facility."role" = 'FACILITY';

CREATE OR REPLACE VIEW "ai_procurement_notices" AS
SELECT
    tbmt."id" AS "notice_id",
    tbmt."goi_thau_id" AS "package_id",
    gt."ke_hoach_id" AS "plan_id",
    kh."facility_id",
    facility."facility_name",
    facility."facility_code",
    kh."ma_khlcnt",
    kh."ten_khlcnt",
    gt."ten_goi_thau",
    tbmt."ma_tbmt",
    tbmt."ngay_dang_tai",
    tbmt."so_qd_phe_duyet_hsmt",
    tbmt."ngay_phe_duyet_hsmt",
    tbmt."ngay_dong_thau",
    tbmt."created_at",
    tbmt."updated_at",
    COUNT(DISTINCT kq."id") AS "result_count"
FROM "thong_bao_moi_thau" tbmt
JOIN "goi_thau" gt ON gt."id" = tbmt."goi_thau_id"
JOIN "ke_hoach_lcnt" kh ON kh."id" = gt."ke_hoach_id"
JOIN "users" facility ON facility."id" = kh."facility_id"
LEFT JOIN "ket_qua_lcnt" kq ON kq."thong_bao_moi_thau_id" = tbmt."id"
WHERE facility."role" = 'FACILITY'
GROUP BY
    tbmt."id",
    gt."id",
    kh."id",
    facility."facility_name",
    facility."facility_code";

CREATE OR REPLACE VIEW "ai_procurement_results" AS
SELECT
    kq."id" AS "result_id",
    kq."goi_thau_id" AS "package_id",
    kq."thong_bao_moi_thau_id" AS "notice_id",
    gt."ke_hoach_id" AS "plan_id",
    kh."facility_id",
    facility."facility_name",
    facility."facility_code",
    kh."ma_khlcnt",
    kh."ten_khlcnt",
    gt."ten_goi_thau",
    tbmt."ma_tbmt",
    kq."so_qd_phe_duyet_kqlcnt",
    kq."ngay_phe_duyet_kqlcnt",
    kq."so_mat_hang_moi_thau",
    kq."so_mat_hang_trung_thau",
    kq."tong_gia_tri_trung_thau",
    kq."created_at",
    kq."updated_at",
    COUNT(DISTINCT kqpl."id") AS "lot_result_count"
FROM "ket_qua_lcnt" kq
JOIN "goi_thau" gt ON gt."id" = kq."goi_thau_id"
JOIN "ke_hoach_lcnt" kh ON kh."id" = gt."ke_hoach_id"
JOIN "users" facility ON facility."id" = kh."facility_id"
JOIN "thong_bao_moi_thau" tbmt ON tbmt."id" = kq."thong_bao_moi_thau_id"
LEFT JOIN "ket_qua_phan_lo" kqpl ON kqpl."ket_qua_lcnt_id" = kq."id"
WHERE facility."role" = 'FACILITY'
GROUP BY
    kq."id",
    gt."id",
    kh."id",
    facility."facility_name",
    facility."facility_code",
    tbmt."ma_tbmt";

CREATE OR REPLACE VIEW "ai_procurement_lot_results" AS
SELECT
    kqpl."id" AS "lot_result_id",
    kqpl."ket_qua_lcnt_id" AS "result_id",
    kq."goi_thau_id" AS "package_id",
    kq."thong_bao_moi_thau_id" AS "notice_id",
    gt."ke_hoach_id" AS "plan_id",
    kh."facility_id",
    facility."facility_name",
    facility."facility_code",
    kh."ma_khlcnt",
    kh."ten_khlcnt",
    gt."ten_goi_thau",
    pl."ten_phan_lo",
    pl."stt" AS "lot_stt",
    kqpl."ket_qua",
    kqpl."don_gia_trung_thau",
    kqpl."nha_thau_trung_thau",
    kqpl."created_at",
    kqpl."updated_at"
FROM "ket_qua_phan_lo" kqpl
JOIN "ket_qua_lcnt" kq ON kq."id" = kqpl."ket_qua_lcnt_id"
JOIN "goi_thau" gt ON gt."id" = kq."goi_thau_id"
JOIN "ke_hoach_lcnt" kh ON kh."id" = gt."ke_hoach_id"
JOIN "users" facility ON facility."id" = kh."facility_id"
JOIN "phan_lo_goi_thau" pl ON pl."id" = kqpl."phan_lo_goi_thau_id"
WHERE facility."role" = 'FACILITY';

CREATE OR REPLACE VIEW "ai_drug_order_shipments" AS
SELECT
    ds."id" AS "shipment_id",
    ds."order_id",
    o."order_no",
    o."facility_id",
    facility."facility_name",
    facility."facility_code",
    o."company_id",
    c."code" AS "company_code",
    c."name" AS "company_name",
    ds."shipment_no",
    ds."status" AS "shipment_status",
    ds."shipped_at",
    ds."shipped_from_date",
    ds."shipped_to_date",
    ds."company_note",
    ds."created_at",
    ds."updated_at",
    COUNT(DISTINCT dsl."id") AS "shipment_line_count",
    COALESCE(SUM(dsl."shipped_qty"), 0) AS "total_shipped_qty",
    COUNT(DISTINCT dr."id") AS "receipt_count"
FROM "drug_order_shipments" ds
JOIN "drug_orders" o ON o."id" = ds."order_id"
JOIN "users" facility ON facility."id" = o."facility_id"
JOIN "companies" c ON c."id" = o."company_id"
LEFT JOIN "drug_order_shipment_lines" dsl ON dsl."shipment_id" = ds."id"
LEFT JOIN "drug_order_receipts" dr ON dr."shipment_id" = ds."id"
WHERE facility."role" = 'FACILITY'
GROUP BY
    ds."id",
    o."id",
    facility."facility_name",
    facility."facility_code",
    c."code",
    c."name";

CREATE OR REPLACE VIEW "ai_drug_order_receipts" AS
SELECT
    dr."id" AS "receipt_id",
    dr."order_id",
    o."order_no",
    dr."shipment_id",
    ds."shipment_no",
    dr."facility_id",
    facility."facility_name",
    facility."facility_code",
    o."company_id",
    c."code" AS "company_code",
    c."name" AS "company_name",
    dr."confirmed_at",
    dr."note",
    dr."created_at",
    dr."updated_at",
    COUNT(DISTINCT drl."id") AS "receipt_line_count",
    COALESCE(SUM(drl."received_qty"), 0) AS "total_received_qty"
FROM "drug_order_receipts" dr
JOIN "drug_orders" o ON o."id" = dr."order_id"
JOIN "drug_order_shipments" ds ON ds."id" = dr."shipment_id"
JOIN "users" facility ON facility."id" = dr."facility_id"
JOIN "companies" c ON c."id" = o."company_id"
LEFT JOIN "drug_order_receipt_lines" drl ON drl."receipt_id" = dr."id"
WHERE facility."role" = 'FACILITY'
GROUP BY
    dr."id",
    o."id",
    ds."shipment_no",
    facility."facility_name",
    facility."facility_code",
    c."code",
    c."name";
