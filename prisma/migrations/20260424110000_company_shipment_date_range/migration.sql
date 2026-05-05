ALTER TABLE "drug_order_shipments"
ADD COLUMN "shipped_from_date" TIMESTAMP(3),
ADD COLUMN "shipped_to_date" TIMESTAMP(3);

UPDATE "drug_order_shipments"
SET
    "shipped_from_date" = date_trunc('day', "shipped_at"),
    "shipped_to_date" = date_trunc('day', "shipped_at") + interval '1 day' - interval '1 millisecond'
WHERE "shipped_at" IS NOT NULL
  AND ("shipped_from_date" IS NULL OR "shipped_to_date" IS NULL);
