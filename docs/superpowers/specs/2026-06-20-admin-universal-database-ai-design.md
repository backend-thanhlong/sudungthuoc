# Admin Universal Database AI Design

## Context

The AI assistant already has an ADMIN-only safe database path through
`querySafeDatabase`. The current implementation includes:

- safe `ai_*` read views for the main business domains
- entity resolution for facilities, companies, drugs, procurement plans, and packages
- domain glossary and domain routing
- deterministic query templates for some common questions
- model-generated safe SQL as a fallback path
- SQL validation, query verification, read-only execution, limits, timeouts, and audit logs
- Gemini 3.5 Flash as the primary runtime model

The remaining problem is quality and breadth. The AI can answer some database
questions, but it is not yet reliable enough for an admin to ask almost any
business question about the software. The fix should improve the database
intelligence layer, not grant the model direct database access.

## Goal

Make ADMIN chat able to answer broad Vietnamese questions from the whole
business database surface with traceable evidence.

The first release targets ADMIN toàn hệ thống only.

Supported question families:

- lookup: find facilities, companies, drugs, procurement records, orders
- summary: counts, totals, ratios, inventory value, awarded value
- ranking: top/bottom facilities, drugs, suppliers, packages, companies
- comparison: compare facilities, months, drugs, companies, procurement values
- trend: month-by-month inventory, submission, order, procurement movement
- anomaly: stock balance errors, stockout risk, dead stock, missing submissions, incomplete delivery
- explanation: explain why a result is high/risky/abnormal based on returned evidence

## Non-Goals

- No AI write, edit, approve, reject, import, delete, or workflow mutation.
- No raw application table access by the model or generated SQL.
- No exposure of account/security data such as password hashes, sessions,
  tokens, AI policy tables, raw activity logs, or notification content.
- No FACILITY or COMPANY flexible database access in this phase.
- No clinical treatment recommendation.

## Recommended Approach

Use a `Semantic DB Agent` for ADMIN chat.

Gemini may help understand language, generate SQL, and compose answers, but the
server owns all boundaries:

1. route the business domain
2. resolve named entities
3. build a bounded query plan
4. generate or select safe SQL
5. verify the SQL against domain and security rules
6. execute only read-only safe views
7. pass bounded rows to Gemini for evidence-first explanation
8. log every attempt for audit and evaluation

This keeps the assistant flexible without giving the model unrestricted
database power.

## Architecture

### 1. Business Data Coverage

Complete and maintain the safe view surface for all business domains:

- catalog: therapeutic groups, master drugs, company drugs
- facility mapping: internal drug maps, status, out-of-catalog state
- inventory reports: monthly XNT, price, BHYT/dịch vụ, contract fields
- report submission: report periods, submissions, review logs
- procurement: plans, packages, lots, notices, results, lot results
- drug orders: orders, lines, shipments, receipts
- organization: facilities and companies with sanitized operational fields

All views must be business-oriented. Prefer denormalized views that answer
real questions directly over raw table mirrors that force the model to invent
joins.

### 2. Schema Registry

Add a code-owned AI schema registry that describes:

- view purpose
- columns and business meanings
- dimensions: facility, company, drug, month, package, order status
- measures: quantity, value, count, ratio, remaining stock, shipped/received quantity
- join hints between safe views
- date/month semantics, including `report_month` as `MM/YYYY`
- safe examples for common aggregations

The SQL generator prompt should be built from this registry instead of a single
long hand-written schema string.

### 3. Business Glossary and Domain Router

Expand the glossary to cover real admin language and abbreviations:

- `danh mục dùng chung`, `Mã BHYT`, `Mã ATC`, `hoạt chất`
- `ánh xạ`, `ngoài danh mục`, `chờ duyệt`, `từ chối`
- `tồn kho`, `nhập xuất tồn`, `BHYT`, `dịch vụ`, `đứt hàng`, `tồn chết`
- `nộp báo cáo`, `chậm báo cáo`, `kỳ báo cáo`
- `LCNT`, `KHLCNT`, `TBMT`, `KQLCNT`, `trúng thầu`, `phân lô`
- `dự trù`, `đặt hàng`, `đã giao`, `đã nhận`, `giao thiếu`

Routing must produce one of:

- a clear primary domain
- a multi-domain plan
- an ambiguity response asking exactly one clarification question

The assistant must not answer with numbers when the domain is materially
ambiguous.

### 4. Query Planner

Add a bounded query planner before SQL execution.

Planner output:

- user intent
- primary and secondary domains
- required safe views
- entity filters
- period filters
- list of query steps
- reason for each step

Limits for v1:

- maximum 3 query steps per user message
- maximum 300 returned rows per query
- default 100 returned rows per query
- no recursive or autonomous follow-up loops

Examples:

- Find a drug by name, then compare recent inventory across facilities.
- Find facilities missing a report, then rank them by previous inventory value.
- Summarize orders not fully received, then group evidence by company.

### 5. Query Catalog

Move frequent questions to deterministic templates. The model should use
templates first, then generated SQL only when no template fits.

Initial target: at least 30 templates across:

- catalog counts and filters
- inventory value, BHYT/dịch vụ ratios, stockout/dead-stock risk
- report submission missing/late status
- mapping backlog and out-of-catalog summaries
- procurement package/result/lot summaries
- order requested/accepted/shipped/received gaps
- organization-level facility/company summaries
- monthly trends and comparisons

Each template declares domain, views, slots, SQL builder, and answer hints.

### 6. SQL Generator and Verifier

Generated SQL remains allowed only as a controlled fallback.

Verifier must reject:

- raw tables
- non-`SELECT` statements
- multi-statement SQL
- comments
- unsafe identifiers
- views outside the routed domain
- weak entity filters on broad questions
- missing required period filters when the question clearly asks for a period
- mismatched semantics, such as answering `danh mục dùng chung` from mapping views

Verifier warnings must be included in the tool result and audit log.

### 7. Answer Composer

Database-backed answers must use a fixed evidence-first structure:

- `Kết luận`
- `Dữ liệu sử dụng`
- `Bằng chứng`
- `Suy luận`
- `Giới hạn`
- `Kiểm tra tiếp`

The answer must mention:

- safe views used
- filters used, especially month/facility/drug/company
- row count used
- whether query was template-based or generated
- any ambiguity, missing data, or capped result

The model must not invent values outside tool results.

### 8. Evaluation and Feedback

Add an AI database evaluation set with at least 80 Vietnamese admin questions.

Coverage:

- catalog: 10
- inventory: 15
- report submission: 10
- mapping: 10
- procurement: 15
- orders: 10
- organization/company/facility: 5
- ambiguous or no-data cases: 5

Each case records expected domain, required views, forbidden views, template if
applicable, and required answer phrases.

Add an eval runner that can test:

- routing
- template selection
- SQL validation
- query verification
- answer evidence requirements

Add admin feedback capture for AI answers:

- helpful / not helpful
- optional note
- stored with question, domain, tool warnings, and model

## Data Flow

1. ADMIN sends chat request to `/api/ai/agent`.
2. Existing auth, AI policy, quota, and tool policy checks run.
3. `querySafeDatabase` normalizes the question.
4. Entity resolver finds candidate facilities, companies, drugs, and procurement/order records.
5. Domain router and planner build a bounded query plan.
6. Query catalog fills templates when possible.
7. Generated SQL is used only for uncovered cases.
8. SQL validator and semantic verifier approve or refuse each query.
9. Executor runs approved SQL through `AI_DATABASE_READ_URL` in read-only mode.
10. Tool returns rows, query metadata, warnings, and evidence.
11. Gemini composes the final Vietnamese answer from tool results only.
12. Activity logs record each DB query and the overall AI request.

## Safety

- ADMIN chat only.
- Server-side DB execution only.
- `AI_DATABASE_READ_URL` should use a dedicated PostgreSQL read-only role with
  `SELECT` grants only on `ai_*` views.
- App validation remains as defense in depth.
- Default `LIMIT 100`, maximum `LIMIT 300`.
- Query timeout remains 5 seconds per SQL step.
- Provider timeout remains separate from DB timeout.
- Every skipped, refused, failed, and successful query is audited.

## Error Handling

- Ambiguous domain: ask one short clarification question.
- Unknown entity: return candidates if available; otherwise say the entity was not found.
- No data: say the filters found no rows and list the filters used.
- Missing safe view coverage: say the current AI database scope does not include the needed data.
- SQL refused: answer with the refusal reason category, not raw database internals.
- Timeout: ask the admin to narrow period, facility, drug, or domain.
- Partial multi-step success: answer from successful evidence and list failed steps.

## Implementation Slices

1. Inventory current safe views and close business coverage gaps for ADMIN.
2. Introduce schema registry and generate prompt schema from it.
3. Expand glossary/domain routing for real admin vocabulary.
4. Add query planner and move existing templates into a query catalog.
5. Add more deterministic templates until the 30-template target is reached.
6. Harden verifier for domain/view/slot/weak-entity mistakes.
7. Strengthen answer composer prompt and returned tool metadata.
8. Add eval dataset, eval runner, and admin answer feedback.

Each slice is independently testable.

## Acceptance Criteria

- ADMIN can ask broad database questions across catalog, inventory, submission,
  mapping, procurement, orders, companies, and facilities.
- At least 30 deterministic templates exist for common admin questions.
- At least 80 eval questions exist and pass routing/verifier expectations.
- Generated SQL never touches raw application tables.
- All DB queries use safe `ai_*` views and read-only execution.
- Ambiguous questions produce a clarification question instead of a guessed answer.
- Every database-backed answer cites views, filters, row counts, and limits.
- Every DB query attempt is logged with domain, source, SQL, views, row count,
  duration, status, warnings, and user id.

## Spec Self-Review

No placeholders remain. Scope is limited to ADMIN toàn hệ thống database
question answering. The design preserves the existing safety model while adding
schema registry, planner, query catalog, verifier hardening, evidence-first
answers, evaluation, and feedback.
