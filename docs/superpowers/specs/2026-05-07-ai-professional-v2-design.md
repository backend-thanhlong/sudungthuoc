# AI Professional v2 Design

## Context

AI DB Intelligence v1 added a safe read path for ADMIN chat: a dedicated `ai_readonly` PostgreSQL role, safe `ai_*` views, semantic hints, deterministic query templates, and evidence-first answer guidance. It improved safety and reduced some obvious routing mistakes, but it still has a structural weakness: business meaning is spread across keywords/templates, so ambiguous phrases can route to the wrong data domain.

The goal of AI Professional v2 is to make the AI assistant behave more like a reliable domain assistant: understand business concepts, choose the correct data domain, verify SQL before execution, explain evidence, and learn from wrong answers through evaluation and feedback.

## Goals

1. Reduce wrong-view answers such as treating `danh mục dùng chung` as mapping data.
2. Centralize business meaning in a glossary instead of scattering keyword checks.
3. Add scored domain routing before query planning.
4. Add a query verifier that rejects SQL inconsistent with the detected domain.
5. Add an evaluation set for repeated regression testing.
6. Add user/admin feedback capture for wrong answers.
7. Keep current safety boundaries: read-only DB user, safe views only, bounded SELECT, audit logs.

## Non-Goals

- v2 will not allow AI to modify business data.
- v2 will not allow FACILITY users to query toàn hệ thống.
- v2 will not replace formal approval/review workflows.
- v2 will not attempt full autonomous multi-agent analysis. The first implementation remains a bounded, auditable assistant.

## Design Principles

- Prefer deterministic domain knowledge over model guesses.
- Use LLMs for language understanding and reasoning, but validate all data access with code.
- Make every DB-backed answer traceable to a domain, view, SQL, row count, and evidence.
- Treat uncertain routing as a first-class state: ask a clarifying question or return a bounded answer with explicit uncertainty.
- Turn every observed wrong answer into an evaluation case.

## Architecture

The new AI query path should be:

1. Normalize question.
2. Match business glossary concepts.
3. Score candidate domains.
4. Pick domain or mark ambiguity.
5. Choose deterministic query template or allow model SQL generation.
6. Verify SQL against expected domain/view rules.
7. Execute read-only SQL through `AI_DATABASE_READ_URL`.
8. Verify result shape and row count.
9. Ask final model to answer evidence-first.
10. Log domain, glossary matches, template/model source, verifier result, SQL, row count, warnings, and feedback state.

## Core Modules

### 1. Business Glossary

Add `src/lib/ai/domain-glossary.ts`.

Each concept should define:

- canonical name
- Vietnamese aliases
- normalized aliases
- target domain
- preferred safe views
- preferred fields
- examples
- disambiguation notes

Initial concepts:

- `shared_drug_catalog`: `danh mục dùng chung`, `danh mục thuốc chung`, `thuốc trong danh mục dùng chung` -> `ai_master_drugs`
- `mapping_catalog`: `ánh xạ danh mục`, `thuốc chưa ánh xạ`, `ngoài danh mục`, `chờ duyệt ánh xạ` -> `ai_mapping_status`
- `inventory_report`: `tồn kho`, `nhập xuất tồn`, `báo cáo tồn kho`, `BHYT`, `dịch vụ` -> `ai_inventory_reports`
- `report_submission`: `nộp báo cáo`, `chưa nộp`, `chậm báo cáo` -> `ai_report_submissions`, `ai_report_periods`
- `procurement`: `mua sắm`, `LCNT`, `KHLĐT`, `gói thầu`, `TBMT`, `KQLCNT` -> `ai_procurement_*`
- `drug_order`: `dự trù`, `đặt hàng`, `giao hàng`, `nhận hàng` -> `ai_drug_orders`, `ai_drug_order_shipments`, `ai_drug_order_receipts`
- `facility`: `cơ sở`, `bệnh viện`, `trung tâm y tế` -> `ai_facilities`
- `company`: `công ty`, `nhà thầu`, `nhà cung cấp` -> `ai_companies`, `ai_company_drugs`

### 2. Domain Router

Add `src/lib/ai/domain-router.ts`.

The router should output:

```ts
interface AIDomainRoutingResult {
  primaryDomain: AIDomain | null;
  candidates: Array<{
    domain: AIDomain;
    score: number;
    matchedConcepts: string[];
    matchedAliases: string[];
    preferredViews: string[];
  }>;
  ambiguity: "none" | "low" | "high";
  reason: string;
}
```

Routing rules:

- Exact concept phrase beats generic keyword.
- `danh mục dùng chung` must route to catalog, not mapping.
- `ngoài danh mục` must route to mapping, not catalog.
- `BHYT` with no other context routes to inventory reports.
- Procurement acronyms route to procurement even if words like `gói` or `kế hoạch` appear generically.
- If top two domains are close and target views differ materially, mark ambiguity high.

### 3. Query Catalog

Refactor `safe-database-intelligence.ts` into a clearer query catalog:

- `src/lib/ai/query-catalog.ts`
- `src/lib/ai/query-templates/catalog.ts`
- `src/lib/ai/query-templates/inventory.ts`
- `src/lib/ai/query-templates/mapping.ts`
- `src/lib/ai/query-templates/procurement.ts`
- `src/lib/ai/query-templates/orders.ts`
- `src/lib/ai/query-templates/reporting.ts`

Each template should declare:

- template name
- domain
- supported concepts
- required slots
- optional slots
- safe views used
- SQL builder
- answer hints

The system should select templates by domain and concept, not by scanning all keywords globally.

### 4. Query Verifier

Add `src/lib/ai/query-verifier.ts`.

The verifier checks:

- all referenced views are allowed by SQL validator
- referenced views are compatible with routed domain
- required domain views are present when a concept mandates them
- SQL does not filter by a weakly matched entity unless entity score passes a stricter threshold
- broad count questions do not accidentally apply facility/drug filters from weak entity matches

Examples:

- Question: `có bao nhiêu thuốc trong danh mục dùng chung`
  - Expected domain: `catalog`
  - Allowed primary view: `ai_master_drugs`
  - Reject `ai_mapping_status`

- Question: `bao nhiêu thuốc ngoài danh mục`
  - Expected domain: `mapping`
  - Required view: `ai_mapping_status`
  - Require `is_out_of_catalog = true` or equivalent template logic

- Question: `tỷ lệ thuốc BHYT`
  - Expected domain: `inventory`
  - Required view: `ai_inventory_reports`
  - Require aggregation over `bhyt`

### 5. Weak Entity Filtering

Current entity resolution can match weak tokens such as `dùng`, `chung`, or `tỷ`. v2 should separate:

- domain words
- stop words
- entity words
- exact identifiers/codes

Entity filters should only be applied when:

- a code is explicitly present, or
- a sufficiently specific name phrase is matched, or
- the question asks for a named facility/drug/company.

Broad questions such as `có bao nhiêu thuốc trong danh mục dùng chung` must not inherit a random facility or drug candidate.

### 6. Evaluation Set

Add `src/lib/ai/eval/questions.ts` or a JSON fixture under `src/lib/ai/eval/`.

Each evaluation item should include:

```ts
interface AIEvalQuestion {
  id: string;
  question: string;
  expectedDomain: AIDomain;
  requiredViews: string[];
  forbiddenViews?: string[];
  expectedTemplate?: string;
  answerMustMention?: string[];
}
```

Initial target: 50 questions.

Coverage:

- catalog: 8
- mapping: 8
- inventory/BHYT: 10
- report submission: 6
- procurement: 8
- orders: 5
- ambiguous/clarification cases: 5

### 7. Evaluation Runner

Add a script command or local script:

- `npm run ai:eval`

The runner should:

1. route each question
2. build query plan
3. verify SQL
4. optionally execute against current DB for non-destructive checks
5. print pass/fail table

This should run without calling the external model for template-covered cases. Model-generated SQL can be tested in a separate optional mode.

### 8. Feedback Loop

Add API and UI support after the backend foundation is stable:

- feedback buttons on AI answers: `Đúng`, `Sai dữ liệu`, `Sai nguồn`, `Thiếu dữ liệu`, `Khó hiểu`
- store feedback in activity log or a dedicated table
- include question, domain, template/model source, SQL, row count, model, answer snippet, feedback type
- allow admin export/review of failed questions

v2 implementation can start with backend logging shape first, then add UI controls in a later slice.

## Data Flow

### Template-Covered Question

1. User asks: `có bao nhiêu thuốc trong danh mục dùng chung`
2. Glossary matches `shared_drug_catalog`.
3. Router selects `catalog`.
4. Query catalog selects `shared_master_drug_catalog_count`.
5. Verifier confirms SQL reads `ai_master_drugs`.
6. DB executes count through `ai_readonly`.
7. Final answer states count and source view.

### Ambiguous Question

1. User asks: `thuốc danh mục có vấn đề gì`
2. Router sees possible catalog and mapping domains.
3. If ambiguity is high, AI asks a clarification:
   - `Anh/chị muốn hỏi danh mục dùng chung hay tình trạng ánh xạ danh mục của cơ sở?`

### Model-Generated Question

1. No template matches.
2. Router still provides expected domain and allowed views.
3. Model generates SQL with domain context.
4. Verifier checks generated SQL before execution.
5. If verifier rejects SQL, retry once with verifier feedback; otherwise fail safely.

## Error Handling

- `DOMAIN_AMBIGUOUS`: ask a short clarification question.
- `NO_TEMPLATE`: fall back to model SQL only if domain confidence is sufficient.
- `QUERY_VERIFIER_REJECTED`: retry once with explicit verifier feedback, then return a safe failure.
- `WEAK_ENTITY_FILTER`: drop weak entity filters and warn the final answer if needed.
- `EMPTY_RESULT`: distinguish between no data and wrong-domain risk; retry only when verifier permits.
- `EVAL_REGRESSION`: block merge/deploy when core eval questions fail.

## Observability

Add these fields to `AI_AGENT_DB_QUERY` details:

- `domain`
- `domainScore`
- `matchedConcepts`
- `matchedAliases`
- `templateName`
- `querySource`
- `verifierStatus`
- `verifierWarnings`
- `droppedEntityFilters`
- `evalCaseId` when applicable

## Implementation Phases

### Phase 1: Backend Intelligence

- Add glossary.
- Add domain router.
- Add query verifier.
- Refactor existing templates into query catalog.
- Add 50 evaluation questions.
- Add `ai:eval` runner.
- Keep UI unchanged.

### Phase 2: Answer Quality and Feedback

- Improve answer prompt with domain-specific answer hints.
- Add feedback API.
- Log feedback for AI responses.
- Add basic admin feedback view or include feedback in existing activity logs.

### Phase 3: Advanced Analysis

- Add optional multi-query planner by domain.
- Add domain-specific analysis patterns: stockout, slow-moving inventory, submission compliance, procurement gaps.
- Use fallback model only for final deep analysis, not SQL generation.

## Acceptance Criteria

- The question `có bao nhiêu thuốc trong danh mục dùng chung` routes to catalog and reads `ai_master_drugs`.
- The question `bao nhiêu thuốc ngoài danh mục` routes to mapping and reads `ai_mapping_status`.
- The question `tỷ lệ thuốc BHYT là bao nhiêu` routes to inventory and reads `ai_inventory_reports`.
- Weak generic tokens do not apply random facility/drug filters to broad questions.
- At least 50 eval questions exist and pass in template/router/verifier mode.
- Every DB query log contains domain and verifier metadata.
- Existing safe SQL validation still blocks unsafe SQL.
- `npm run lint`, `npx tsc --noEmit`, and `npm run ai:eval` pass.
