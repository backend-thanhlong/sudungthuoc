# AI Business-Wide Safe Views Design

## Context

The AI Agent admin database tool currently reads only a subset of operational data through `ai_*` safe views. The user wants admin AI to read all application business tables except account/security tables.

## Decision

Expose all business-domain data through `ai_*` safe views and keep account/security surfaces excluded.

## Included Business Domains

- Drug catalog: `therapeutic_groups`, `master_drugs`, `company_drugs`
- Facility mappings and inventory reporting: `facility_drug_maps`, `inventory_reports`, `facility_report_submissions`, `report_review_logs`, `report_periods`
- Procurement/LCNT: `ke_hoach_lcnt`, `goi_thau`, `phan_lo_goi_thau`, `thong_bao_moi_thau`, `ket_qua_lcnt`, `ket_qua_phan_lo`
- Drug ordering: `drug_orders`, `drug_order_lines`, `drug_order_shipments`, `drug_order_shipment_lines`, `drug_order_receipts`, `drug_order_receipt_lines`
- Companies: `companies`

## Excluded Account/Security Domains

Do not expose direct safe views for:

- `users`
- `activity_logs`
- `notifications`
- `ai_settings`
- `ai_user_policies`
- `ai_tool_policies`

Business views may include sanitized facility/company identity fields needed for analysis, such as `facility_id`, `facility_name`, `facility_code`, `company_id`, and `company_name`. They must not expose `password_hash`, account usernames unless already necessary for a business record, raw activity details, notification contents, secrets, tokens, or AI policy/settings data.

## View Strategy

Prefer business-oriented views over raw one-table mirrors. This keeps common questions easy for the LLM and avoids unnecessary joins in generated SQL.

Keep and extend the current views:

- `ai_facilities`
- `ai_companies`
- `ai_master_drugs`
- `ai_mapping_status`
- `ai_inventory_reports`
- `ai_report_submissions`
- `ai_drug_orders`

Add or replace views for missing domains:

- `ai_therapeutic_groups`
- `ai_company_drugs`
- `ai_report_review_logs`
- `ai_report_periods`
- `ai_procurement_plans`
- `ai_procurement_packages`
- `ai_procurement_package_lots`
- `ai_procurement_notices`
- `ai_procurement_results`
- `ai_procurement_lot_results`
- `ai_drug_order_shipments`
- `ai_drug_order_receipts`

## Safety Rules

Keep the existing SQL guardrails:

- ADMIN chat only.
- Server-side only; Gemini never receives database credentials.
- Single `SELECT` statement only.
- Query only `ai_*` safe views.
- Block DDL, DML, transaction/control statements, SQL comments, and multi-statement SQL.
- Default `LIMIT 100`, cap at `LIMIT 300`.
- `statement_timeout` target: 5 seconds.
- Audit every attempt with `AI_AGENT_DB_QUERY`.

## Prompt Update

Update `SAFE_SCHEMA_DESCRIPTION` so Gemini knows the new procurement and business-wide views. The description should remain concise enough to fit normal prompts.

## Verification

Verify:

- all new views exist in PostgreSQL
- `SELECT` from procurement views works
- `users` access is still refused
- `activity_logs` access is refused
- Gemini can answer a procurement question using `querySafeDatabase`
- app builds and starts cleanly

## Rollout

1. Add a migration that creates/replaces the expanded safe views.
2. Update the safe database allowlist and schema description.
3. Build and deploy migrations through Docker.
4. Smoke test blocked and allowed queries.
