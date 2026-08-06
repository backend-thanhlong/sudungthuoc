ALTER TABLE "facility_drug_maps"
ADD COLUMN "is_active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "inactive_from_month" TEXT,
ADD COLUMN "inactive_reason" TEXT,
ADD COLUMN "inactive_at" TIMESTAMP(3),
ADD COLUMN "reactivated_from_month" TEXT,
ADD COLUMN "reactivated_at" TIMESTAMP(3);

CREATE INDEX "facility_drug_maps_facility_id_is_active_inactive_from_month_idx"
ON "facility_drug_maps"("facility_id", "is_active", "inactive_from_month");
