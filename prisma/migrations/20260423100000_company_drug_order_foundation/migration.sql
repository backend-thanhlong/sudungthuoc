ALTER TYPE "Role" ADD VALUE 'COMPANY';

CREATE TYPE "DrugOrderStatus" AS ENUM (
    'DRAFT',
    'SUBMITTED',
    'REJECTED',
    'READY_FOR_SHIPMENT',
    'IN_DELIVERY',
    'COMPLETED'
);

CREATE TYPE "DrugOrderLineStatus" AS ENUM (
    'PENDING',
    'PENDING_CATALOG_CONFIRMATION',
    'CONFIRMED',
    'PARTIAL',
    'REJECTED',
    'COMPLETED'
);

CREATE TYPE "DrugOrderLineSourceType" AS ENUM (
    'MASTER_DRUG',
    'COMPANY_DRUG'
);

CREATE TYPE "DrugOrderShipmentStatus" AS ENUM (
    'CREATED',
    'PARTIALLY_RECEIVED',
    'RECEIVED'
);

CREATE TABLE "companies" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contact_person" TEXT,
    "phone_number" TEXT,
    "email" TEXT,
    "address" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "users"
ADD COLUMN "company_id" TEXT;

CREATE TABLE "company_drugs" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "master_drug_id" TEXT,
    "company_drug_code" TEXT NOT NULL,
    "company_drug_name" TEXT NOT NULL,
    "active_ingredient" TEXT,
    "unit" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_drugs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "drug_orders" (
    "id" TEXT NOT NULL,
    "order_no" TEXT NOT NULL,
    "facility_id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "status" "DrugOrderStatus" NOT NULL DEFAULT 'DRAFT',
    "base_report_month" TEXT,
    "note" TEXT,
    "submitted_at" TIMESTAMP(3),
    "closed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "drug_orders_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "drug_order_lines" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "source_type" "DrugOrderLineSourceType" NOT NULL,
    "master_drug_id" TEXT,
    "company_drug_id" TEXT,
    "display_name" TEXT NOT NULL,
    "unit" TEXT,
    "requested_qty" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "accepted_qty" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "suggested_qty" DECIMAL(65,30),
    "line_status" "DrugOrderLineStatus" NOT NULL DEFAULT 'PENDING',
    "company_response_reason" TEXT,
    "suggestion_basis" TEXT,
    "suggestion_report_month" TEXT,
    "suggestion_rule_version" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "drug_order_lines_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "drug_order_shipments" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "shipment_no" INTEGER NOT NULL,
    "status" "DrugOrderShipmentStatus" NOT NULL DEFAULT 'CREATED',
    "shipped_at" TIMESTAMP(3),
    "company_note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "drug_order_shipments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "drug_order_shipment_lines" (
    "id" TEXT NOT NULL,
    "shipment_id" TEXT NOT NULL,
    "order_line_id" TEXT NOT NULL,
    "shipped_qty" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "drug_order_shipment_lines_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "drug_order_receipts" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "shipment_id" TEXT NOT NULL,
    "facility_id" TEXT NOT NULL,
    "confirmed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "drug_order_receipts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "drug_order_receipt_lines" (
    "id" TEXT NOT NULL,
    "receipt_id" TEXT NOT NULL,
    "shipment_line_id" TEXT NOT NULL,
    "order_line_id" TEXT NOT NULL,
    "received_qty" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "difference_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "drug_order_receipt_lines_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "companies_code_key" ON "companies"("code");
CREATE INDEX "users_company_id_idx" ON "users"("company_id");
CREATE UNIQUE INDEX "company_drugs_company_id_company_drug_code_key" ON "company_drugs"("company_id", "company_drug_code");
CREATE INDEX "company_drugs_company_id_is_active_idx" ON "company_drugs"("company_id", "is_active");
CREATE INDEX "company_drugs_master_drug_id_idx" ON "company_drugs"("master_drug_id");
CREATE UNIQUE INDEX "drug_orders_order_no_key" ON "drug_orders"("order_no");
CREATE INDEX "drug_orders_facility_id_company_id_status_created_at_idx" ON "drug_orders"("facility_id", "company_id", "status", "created_at");
CREATE INDEX "drug_orders_company_id_status_created_at_idx" ON "drug_orders"("company_id", "status", "created_at");
CREATE INDEX "drug_orders_facility_id_status_created_at_idx" ON "drug_orders"("facility_id", "status", "created_at");
CREATE INDEX "drug_order_lines_order_id_line_status_idx" ON "drug_order_lines"("order_id", "line_status");
CREATE INDEX "drug_order_lines_master_drug_id_idx" ON "drug_order_lines"("master_drug_id");
CREATE INDEX "drug_order_lines_company_drug_id_idx" ON "drug_order_lines"("company_drug_id");
CREATE UNIQUE INDEX "drug_order_shipments_order_id_shipment_no_key" ON "drug_order_shipments"("order_id", "shipment_no");
CREATE INDEX "drug_order_shipments_order_id_shipped_at_idx" ON "drug_order_shipments"("order_id", "shipped_at");
CREATE UNIQUE INDEX "drug_order_shipment_lines_shipment_id_order_line_id_key" ON "drug_order_shipment_lines"("shipment_id", "order_line_id");
CREATE INDEX "drug_order_shipment_lines_order_line_id_idx" ON "drug_order_shipment_lines"("order_line_id");
CREATE UNIQUE INDEX "drug_order_receipts_shipment_id_key" ON "drug_order_receipts"("shipment_id");
CREATE INDEX "drug_order_receipts_order_id_confirmed_at_idx" ON "drug_order_receipts"("order_id", "confirmed_at");
CREATE INDEX "drug_order_receipts_facility_id_confirmed_at_idx" ON "drug_order_receipts"("facility_id", "confirmed_at");
CREATE UNIQUE INDEX "drug_order_receipt_lines_receipt_id_shipment_line_id_key" ON "drug_order_receipt_lines"("receipt_id", "shipment_line_id");
CREATE INDEX "drug_order_receipt_lines_order_line_id_idx" ON "drug_order_receipt_lines"("order_line_id");

ALTER TABLE "users"
ADD CONSTRAINT "users_company_id_fkey"
FOREIGN KEY ("company_id")
REFERENCES "companies"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

ALTER TABLE "company_drugs"
ADD CONSTRAINT "company_drugs_company_id_fkey"
FOREIGN KEY ("company_id")
REFERENCES "companies"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

ALTER TABLE "company_drugs"
ADD CONSTRAINT "company_drugs_master_drug_id_fkey"
FOREIGN KEY ("master_drug_id")
REFERENCES "master_drugs"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

ALTER TABLE "drug_orders"
ADD CONSTRAINT "drug_orders_facility_id_fkey"
FOREIGN KEY ("facility_id")
REFERENCES "users"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

ALTER TABLE "drug_orders"
ADD CONSTRAINT "drug_orders_company_id_fkey"
FOREIGN KEY ("company_id")
REFERENCES "companies"("id")
ON DELETE RESTRICT
ON UPDATE CASCADE;

ALTER TABLE "drug_order_lines"
ADD CONSTRAINT "drug_order_lines_order_id_fkey"
FOREIGN KEY ("order_id")
REFERENCES "drug_orders"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

ALTER TABLE "drug_order_lines"
ADD CONSTRAINT "drug_order_lines_master_drug_id_fkey"
FOREIGN KEY ("master_drug_id")
REFERENCES "master_drugs"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

ALTER TABLE "drug_order_lines"
ADD CONSTRAINT "drug_order_lines_company_drug_id_fkey"
FOREIGN KEY ("company_drug_id")
REFERENCES "company_drugs"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

ALTER TABLE "drug_order_shipments"
ADD CONSTRAINT "drug_order_shipments_order_id_fkey"
FOREIGN KEY ("order_id")
REFERENCES "drug_orders"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

ALTER TABLE "drug_order_shipment_lines"
ADD CONSTRAINT "drug_order_shipment_lines_shipment_id_fkey"
FOREIGN KEY ("shipment_id")
REFERENCES "drug_order_shipments"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

ALTER TABLE "drug_order_shipment_lines"
ADD CONSTRAINT "drug_order_shipment_lines_order_line_id_fkey"
FOREIGN KEY ("order_line_id")
REFERENCES "drug_order_lines"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

ALTER TABLE "drug_order_receipts"
ADD CONSTRAINT "drug_order_receipts_order_id_fkey"
FOREIGN KEY ("order_id")
REFERENCES "drug_orders"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

ALTER TABLE "drug_order_receipts"
ADD CONSTRAINT "drug_order_receipts_shipment_id_fkey"
FOREIGN KEY ("shipment_id")
REFERENCES "drug_order_shipments"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

ALTER TABLE "drug_order_receipts"
ADD CONSTRAINT "drug_order_receipts_facility_id_fkey"
FOREIGN KEY ("facility_id")
REFERENCES "users"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

ALTER TABLE "drug_order_receipt_lines"
ADD CONSTRAINT "drug_order_receipt_lines_receipt_id_fkey"
FOREIGN KEY ("receipt_id")
REFERENCES "drug_order_receipts"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

ALTER TABLE "drug_order_receipt_lines"
ADD CONSTRAINT "drug_order_receipt_lines_shipment_line_id_fkey"
FOREIGN KEY ("shipment_line_id")
REFERENCES "drug_order_shipment_lines"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

ALTER TABLE "drug_order_receipt_lines"
ADD CONSTRAINT "drug_order_receipt_lines_order_line_id_fkey"
FOREIGN KEY ("order_line_id")
REFERENCES "drug_order_lines"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;
