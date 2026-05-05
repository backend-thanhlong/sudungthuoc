CREATE TABLE "therapeutic_groups" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "normalized_name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "therapeutic_groups_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "therapeutic_groups_normalized_name_key" ON "therapeutic_groups"("normalized_name");

ALTER TABLE "master_drugs"
ADD COLUMN "therapeutic_group_id" TEXT;

ALTER TABLE "master_drugs"
DROP COLUMN "nhom_dieu_tri";

ALTER TABLE "master_drugs"
ADD CONSTRAINT "master_drugs_therapeutic_group_id_fkey"
FOREIGN KEY ("therapeutic_group_id")
REFERENCES "therapeutic_groups"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;
