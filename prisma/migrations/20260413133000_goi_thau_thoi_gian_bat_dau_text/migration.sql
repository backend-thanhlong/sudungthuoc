ALTER TABLE "goi_thau"
ALTER COLUMN "thoi_gian_bat_dau" TYPE TEXT
USING CASE
    WHEN "thoi_gian_bat_dau" IS NULL THEN NULL
    ELSE to_char("thoi_gian_bat_dau", 'YYYY-MM-DD')
END;
