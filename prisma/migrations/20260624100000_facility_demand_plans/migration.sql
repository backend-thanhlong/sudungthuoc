-- CreateEnum
CREATE TYPE "FacilityDemandPlanStatus" AS ENUM ('DRAFT', 'FINALIZED');

-- CreateTable
CREATE TABLE "facility_demand_plans" (
    "id" TEXT NOT NULL,
    "plan_no" TEXT NOT NULL,
    "facility_id" TEXT NOT NULL,
    "status" "FacilityDemandPlanStatus" NOT NULL DEFAULT 'DRAFT',
    "base_report_month" TEXT,
    "note" TEXT,
    "finalized_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "facility_demand_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "facility_demand_plan_lines" (
    "id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "map_id" TEXT NOT NULL,
    "master_drug_id" TEXT NOT NULL,
    "ma_noi_bo_snapshot" TEXT NOT NULL,
    "ten_thuoc_snapshot" TEXT NOT NULL,
    "hoat_chat_snapshot" TEXT,
    "don_vi_tinh_snapshot" TEXT,
    "nhom_tckt_snapshot" TEXT,
    "ma_chung_snapshot" TEXT,
    "suggested_qty" DECIMAL(65,30),
    "final_qty" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "suggestion_basis" TEXT,
    "suggestion_report_month" TEXT,
    "suggestion_rule_version" TEXT,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "facility_demand_plan_lines_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "facility_demand_plans_plan_no_key" ON "facility_demand_plans"("plan_no");

-- CreateIndex
CREATE INDEX "facility_demand_plans_facility_id_status_created_at_idx" ON "facility_demand_plans"("facility_id", "status", "created_at");

-- CreateIndex
CREATE INDEX "facility_demand_plans_base_report_month_status_idx" ON "facility_demand_plans"("base_report_month", "status");

-- CreateIndex
CREATE UNIQUE INDEX "facility_demand_plan_lines_plan_id_map_id_key" ON "facility_demand_plan_lines"("plan_id", "map_id");

-- CreateIndex
CREATE INDEX "facility_demand_plan_lines_map_id_idx" ON "facility_demand_plan_lines"("map_id");

-- CreateIndex
CREATE INDEX "facility_demand_plan_lines_master_drug_id_idx" ON "facility_demand_plan_lines"("master_drug_id");

-- AddForeignKey
ALTER TABLE "facility_demand_plans" ADD CONSTRAINT "facility_demand_plans_facility_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facility_demand_plan_lines" ADD CONSTRAINT "facility_demand_plan_lines_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "facility_demand_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facility_demand_plan_lines" ADD CONSTRAINT "facility_demand_plan_lines_map_id_fkey" FOREIGN KEY ("map_id") REFERENCES "facility_drug_maps"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facility_demand_plan_lines" ADD CONSTRAINT "facility_demand_plan_lines_master_drug_id_fkey" FOREIGN KEY ("master_drug_id") REFERENCES "master_drugs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
