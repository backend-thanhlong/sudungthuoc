ALTER TABLE "goi_thau"
ADD COLUMN "yeu_cau_tbmt" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "ket_qua_lcnt"
ALTER COLUMN "thong_bao_moi_thau_id" DROP NOT NULL;
