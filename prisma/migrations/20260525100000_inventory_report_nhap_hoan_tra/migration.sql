ALTER TABLE "inventory_reports"
ADD COLUMN "nhap_hoan_tra" DECIMAL NOT NULL DEFAULT 0;

DROP VIEW IF EXISTS "ai_inventory_reports";

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
    ir."nhap_hoan_tra",
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
