-- AlterTable
ALTER TABLE "facility_drug_maps"
ADD COLUMN "demand_rounding_enabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "demand_package_unit" TEXT,
ADD COLUMN "demand_package_size" DECIMAL(65,30);

-- AlterTable
ALTER TABLE "facility_demand_plan_lines"
ADD COLUMN "raw_suggested_qty" DECIMAL(65,30),
ADD COLUMN "rounded_suggested_qty" DECIMAL(65,30),
ADD COLUMN "package_unit_snapshot" TEXT,
ADD COLUMN "package_size_snapshot" DECIMAL(65,30),
ADD COLUMN "rounding_note" TEXT;
