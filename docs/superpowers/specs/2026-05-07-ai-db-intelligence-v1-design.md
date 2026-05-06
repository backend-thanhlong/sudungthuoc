# AI DB Intelligence v1 Design

## Context

The AI assistant already has a safe database path for ADMIN chat through `querySafeDatabase`. It resolves likely entities, asks the primary model to generate a JSON-wrapped PostgreSQL `SELECT`, validates the SQL, executes it against `ai_*` safe views, audits the query, then sends the returned rows to the final answer model.

The current configuration uses:

- Primary model: `gemini-2.5-flash` for fast, structured SQL generation and normal answers.
- Fallback model: `gemma-4-31b-it` for deeper analysis when the ADMIN enables fallback.
- Safe DB connection: `AI_DATABASE_READ_URL`, currently available in the app container.

The next step is to make DB-backed answers more accurate and more useful for business reasoning, without giving the model unsafe direct database access.

## Goals

1. Let AI answer operational questions from real system data with clearer evidence.
2. Improve SQL correctness by adding a business semantic layer and query templates.
3. Support multi-step analysis where one question needs several safe reads.
4. Preserve strict safety: read-only access, safe views only, limits, timeouts, validation, and audit logs.
5. Make answer quality measurable through a regression set of known questions.

## Non-Goals

- AI will not write, approve, reject, import, delete, or mutate business data.
- AI will not query raw application tables directly.
- AI will not expose credentials, sessions, password hashes, tokens, or internal auth data.
- v1 will focus on ADMIN chat. FACILITY-scoped flexible DB queries can be designed separately after ADMIN quality is stable.

## Current Query Flow

1. User asks a question in the AI assistant.
2. `/api/ai/agent` normalizes the request, checks session, role, policy, and quota.
3. `runAITools` invokes `querySafeDatabase` for ADMIN chat.
4. `resolveSafeDatabaseEntities` searches for candidate facilities, companies, drugs, procurement plans, and packages.
5. `generateSafeDatabaseSql` prompts the primary model to return JSON with `shouldQuery`, `sql`, and `reason`.
6. `validateSafeDatabaseSql` allows only a single `SELECT` against known `ai_*` views, blocks unsafe keywords and sensitive identifiers, and enforces a bounded `LIMIT`.
7. `executeSafeDatabaseSql` runs the query in a read-only transaction with a statement timeout.
8. If rows are empty, the tool can retry once with broader SQL.
9. Tool results are included in the final prompt. The answer model must only use supplied tool/context data.
10. Query metadata is logged as `AI_AGENT_DB_QUERY`.

## Proposed Architecture

### 1. AI Read-Only Database Role

Create a dedicated PostgreSQL role for AI reads:

- Grant only `CONNECT` and `USAGE` on the relevant schema.
- Grant only `SELECT` on `ai_*` views.
- Do not grant access to raw tables.
- Set `AI_DATABASE_READ_URL` to this restricted role.

This turns app-level validation into a second safety layer, not the only safety layer.

### 2. Semantic Layer

Add a code-owned semantic layer under `src/lib/ai/` that describes business meaning, not just columns:

- View purpose.
- Important dimensions: facility, month, drug, company, package, status.
- Important measures: inventory value, stock movement, row counts, awarded value, ordered/shipped/received quantities.
- Common filters and date fields.
- Glossary terms: `đứt hàng`, `tồn chết`, `chưa ánh xạ`, `ngoài danh mục`, `chậm báo cáo`, `Nhóm TCKT`, `KHLĐT`, `TBMT`, `KQLCNT`.
- Join hints between safe views where appropriate.

The SQL generator prompt should consume this semantic layer instead of relying only on a long raw schema string.

### 3. Query Intent Router

Before generating SQL, classify the question into one or more intents:

- `lookup`: find an entity or record.
- `summary`: aggregate counts/values.
- `ranking`: top/bottom facilities, drugs, companies, packages.
- `trend`: month-by-month comparison.
- `anomaly`: suspicious values or operational risks.
- `comparison`: compare facilities, periods, drugs, or companies.
- `procurement`: procurement plan/package/notice/result questions.
- `mapping`: drug mapping and catalog coverage.

Intent should guide which templates, views, filters, and answer format are used.

### 4. Query Templates

Add deterministic templates for frequent business questions. The model should choose/fill templates when possible, and only generate free-form SQL when no template fits.

Initial templates:

- Facilities that have not submitted a report for a month.
- Top inventory value by facility/month.
- Drugs with high remaining inventory value.
- Potential stockout risk from low stock and high issue quantity.
- Negative or inconsistent stock balance.
- Unmapped or rejected internal drugs by facility.
- Out-of-catalog drug mappings.
- Procurement packages by facility/status.
- Awarded value by facility/month/package.
- Orders accepted but not fully shipped/received.
- Compare inventory trend for a drug across months.
- Compare a facility against system average for selected measures.
- Report submission trend by month and facility group.
- Distribution of inventory value by `Nhóm TCKT` or therapeutic group.
- Catalog mapping coverage by facility: approved, pending, rejected, and out-of-catalog counts.
- Companies supplying drugs with high inventory or procurement value.
- Procurement lots with invited quantity/value but missing awarded result.

Templates reduce hallucinated SQL and make answers reproducible.

### 5. Multi-Step Query Planner

Some questions cannot be answered well by one SQL query. Add a bounded planner:

- Maximum 3 safe queries per user question in v1.
- Each query still goes through validation and read-only execution.
- Planner records why each query is needed.
- Later queries can use IDs/codes discovered by earlier queries.

Examples:

- Find a facility by partial name, then summarize its report status and inventory anomalies.
- Find a drug by active ingredient, then compare inventory by facility and recent procurement result.
- Identify top risk facilities, then fetch the evidence rows behind the top 5.

### 6. Evidence-First Answers

The final answer should separate facts from interpretation:

- `Kết luận`: concise answer.
- `Dữ liệu sử dụng`: views, filters, period, row count.
- `Bằng chứng`: key rows or aggregate values.
- `Suy luận`: risks, causes, or implications.
- `Giới hạn`: missing data, ambiguous names, or incomplete periods.
- `Kiểm tra tiếp`: next operational checks.

If data is insufficient, AI must say exactly what is missing rather than guessing.

### 7. Observability and Evaluation

Extend logs and admin review tools:

- Log intent, template name, generated SQL, referenced views, row counts, duration, and warnings.
- Add a small evaluation dataset of 30-50 standard Vietnamese questions with expected query behavior and answer requirements.
- Add tests for SQL validation, template selection, entity resolution, and no-mutation guarantees.
- Track user feedback per AI answer: helpful/not helpful and optional note.

## Components

- `src/lib/ai/safe-database.ts`: keep validation/execution, split large responsibilities into schema/semantic, planner, and validator modules as needed.
- `src/lib/ai/tools/safe-database.ts`: orchestrate entity resolution, intent routing, query execution, retry, audit, and returned tool payload.
- `src/lib/ai/prompts.ts`: strengthen final answer requirements around evidence, source, and uncertainty.
- `src/lib/ai/tool-registry.ts`: keep `querySafeDatabase` ADMIN-only in v1.
- `prisma/migrations/*`: add restricted AI DB role grants if managed through migration/bootstrap.
- `scripts/docker/*`: optionally create/update AI read-only role during Docker bootstrap.
- Admin AI pages: optionally display query logs and feedback in a later slice.

## Safety Rules

- Use `AI_DATABASE_READ_URL` with a read-only DB role.
- Continue requiring `ADMIN` and `chat` for flexible DB queries.
- Continue blocking DDL, DML, multiple statements, comments, subquery relations in `FROM/JOIN`, unsafe identifiers, and non-safe relations.
- Keep default `LIMIT 100`, maximum `LIMIT 300`.
- Keep DB statement timeout at 5 seconds for v1.
- Keep provider timeout independent from DB timeout.
- Audit every skipped, refused, failed, and successful DB query.

## Error Handling

- If entity matching is ambiguous, return candidates and ask the user to clarify or show a cautious answer with explicit ambiguity.
- If SQL generation returns invalid JSON, retry once with a stricter repair prompt before failing.
- If SQL validation refuses a query, log the refusal and answer that the requested data is outside the safe DB scope.
- If DB query times out, answer with the timeout and suggest narrowing the scope.
- If multi-step planning partially succeeds, answer from available evidence and mark missing steps.

## Testing Plan

1. Unit tests for SQL validation:
   - accepts safe `SELECT` on `ai_*` views.
   - blocks DDL/DML and raw application tables.
   - caps or injects `LIMIT`.
   - blocks sensitive identifiers.

2. Unit tests for intent and templates:
   - maps common Vietnamese questions to expected intent.
   - fills template parameters from resolved entities.
   - falls back to generated SQL when no template fits.

3. Integration tests with test DB:
   - runs templates against safe views.
   - verifies read-only role cannot access raw tables.
   - verifies audit logs are written.

4. AI evaluation set:
   - 30-50 curated ADMIN questions.
   - Expected view/template/intent and answer checks.
   - Includes misspellings, abbreviations, ambiguous names, and empty-result cases.

## Rollout

1. Ship read-only DB role and semantic layer.
2. Add intent router and first query templates.
3. Add bounded multi-step planner.
4. Add answer evidence formatting.
5. Add evaluation and admin feedback loop.

Each step should be independently testable and reversible.

## Acceptance Criteria

- ADMIN can ask common database-backed questions and receive answers tied to safe-view evidence.
- AI query execution uses `AI_DATABASE_READ_URL` with a read-only user.
- Generated or templated SQL never touches raw tables.
- At least 15 templates exist for common operational questions.
- At least 30 evaluation questions pass with acceptable query and answer behavior.
- Every DB-backed answer records audit details.
- Deep analysis can use fallback model, but SQL generation remains on the primary structured model.
