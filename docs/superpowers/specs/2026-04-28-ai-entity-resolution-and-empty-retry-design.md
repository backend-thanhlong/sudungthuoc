# AI Entity Resolution And Empty Retry Design

## Context

The admin AI database tool can read business data through `ai_*` safe views, but it currently asks the model to generate one SQL query directly from the user's question. This makes entity-specific questions fragile. For example, "Bệnh viện phụ sản có kế hoạch LCNT không" generated a case-sensitive `LIKE` filter and returned zero rows even though `Bệnh viện Phụ sản thành phố Cần Thơ` exists and has procurement plans.

## Decision

Add deterministic entity resolution before SQL generation and add a single empty-result retry pass. Keep the security model unchanged: admin chat only, safe views only, read-only SQL only, no raw account/security tables.

## Entity Resolution

Before asking the provider to generate SQL, `querySafeDatabase` will search safe views for likely entities mentioned in the question:

- facilities from `ai_facilities`
- companies from `ai_companies`
- drugs from `ai_master_drugs` and `ai_company_drugs` when the question appears drug-related
- procurement plans and packages from `ai_procurement_plans` and `ai_procurement_packages` when the question appears procurement-related

The resolver normalizes Vietnamese text, removes generic stop words, scores candidates by token overlap, and passes only a small candidate list to the model. Candidates include safe business identifiers such as `facility_id`, `facility_code`, `company_id`, `ma_chung`, `plan_id`, and display names.

## SQL Generation Rules

The SQL generator will receive the entity candidates and must:

- use resolved IDs/codes when available
- use `ILIKE` for human-entered names
- avoid exact equality for names unless the name came from a resolved candidate
- choose domain-specific views for domain-specific terms, such as `ai_procurement_*` for LCNT/Mua sắm
- avoid claiming that data does not exist when a narrow query simply returned no rows

## Empty-Result Retry

If the first validated query returns zero rows and the question contains entity-like terms or resolved candidates, the tool will ask the provider for one retry query with the previous SQL and candidate list. The retry prompt will explicitly request a broader safe query, such as using resolved `facility_id`, `facility_code`, or `ILIKE` over the canonical name.

The tool will not retry indefinitely. It will audit the final SQL, the original zero-row SQL, referenced views, entity candidates, and retry count.

## Response Semantics

The final answer should distinguish between:

- entity not found in safe views
- entity found but no records in the requested business domain
- query returned rows and can be summarized

## Verification

Verify with:

- "Bệnh viện phụ sản có kế hoạch lcnt không" resolves to `Bệnh viện Phụ sản thành phố Cần Thơ`
- first-query zero-row scenarios retry once
- the final query reads only `ai_*` views
- blocked account/security tables remain blocked
- build or typecheck passes
