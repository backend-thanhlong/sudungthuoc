ALTER TABLE "facility_drug_maps"
ADD COLUMN "demand_planning_locked" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "demand_planning_locked_at" TIMESTAMP(3),
ADD COLUMN "demand_planning_unlocked_at" TIMESTAMP(3),
ADD COLUMN "demand_planning_lock_reason" TEXT;

CREATE INDEX "facility_drug_maps_facility_id_demand_planning_locked_idx"
ON "facility_drug_maps"("facility_id", "demand_planning_locked");
