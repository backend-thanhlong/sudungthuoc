# AI Safe Database Views Design

## Context

Admin users need the AI Agent to answer flexible questions from system data without giving the model or request path unrestricted database access.

The current AI Agent is already admin-gated and uses fixed tools. It does not let Gemini connect to the database or run arbitrary SQL. This design extends admin capability with a controlled read-only database query tool backed by safe views.

## Goals

- Let ADMIN users ask broader data questions through AI.
- Keep AI database access read-only and bounded.
- Prevent exposure of sensitive fields such as password hashes, secrets, raw tokens, and unnecessary account internals.
- Audit every AI database query.
- Avoid direct LLM access to the database connection.

## Non-Goals

- No write access through AI.
- No unrestricted SQL over application tables.
- No schema browsing or dumping full database contents.
- No COMPANY access in this MVP.
- No change to FACILITY data boundaries.

## Recommended Approach

Create an admin-only AI tool named `querySafeDatabase`.

The tool runs only server-side. Gemini never receives database credentials and never executes SQL directly. The server accepts a constrained read query, validates it, runs it against safe `ai_*` database views, limits result size, logs the operation, and passes the bounded result back into the normal AI prompt.

## Safe Views

Add a Prisma migration that creates read-oriented views with names beginning with `ai_`.

Initial view set:

- `ai_facilities`: active facility identifiers, names, codes, autonomy group, facility type, contact metadata that is already operationally visible.
- `ai_inventory_reports`: report month, facility, mapped drug display fields, stock quantities, prices, contract fields needed for analytics.
- `ai_report_submissions`: facility, report month, submission timestamp, reported and skipped row counts.
- `ai_mapping_status`: facility mapping rows with status, mapped master drug name, internal drug fields, and out-of-catalog flag.
- `ai_master_drugs`: master drug catalog fields useful for analysis, excluding secrets because none should exist here.
- `ai_companies`: company code, name, active status, and non-secret contact metadata.
- `ai_drug_orders`: order, facility, company, status, line display fields, quantities, shipment and receipt summary fields.

Sensitive exclusions:

- `users.password_hash`
- auth/session/token/secrets
- raw environment values
- unrestricted activity log details
- any future credential-like fields

## Query Safety

The tool must enforce these rules before execution:

- ADMIN role only.
- SQL must be a single `SELECT` statement.
- SQL may reference only views whose names start with `ai_`.
- Block `INSERT`, `UPDATE`, `DELETE`, `UPSERT`, `ALTER`, `DROP`, `TRUNCATE`, `CREATE`, `GRANT`, `REVOKE`, `COPY`, `CALL`, `DO`, and transaction/control statements.
- Block multi-statement SQL and SQL comments.
- Require `LIMIT`; inject a default limit of `100` if absent.
- Cap `LIMIT` at `300`.
- Apply `statement_timeout` around query execution, target `5s`.
- Return column names and rows only, not database errors with connection details.

## Tool Behavior

`querySafeDatabase` receives:

- the admin question
- optional context such as `reportMonth`, `facilityId`, and filters
- a generated safe SQL query or an internal query plan

It returns:

- selected view names
- executed SQL after normalization
- row count
- capped result rows
- warning if results were capped or query was refused

If a question needs data outside the safe views, the AI response must say that the current AI database scope does not include that data.

## Prompt Integration

Register `querySafeDatabase` for ADMIN chat mode only.

The AI prompt continues to include tool results, not raw database access. The system prompt should state that database answers must be based only on `querySafeDatabase` results and existing tool results.

## Audit Logging

Log each attempt to `activity_logs` with action `AI_AGENT_DB_QUERY`.

Details should include:

- admin user id
- question
- normalized SQL
- referenced views
- row count
- duration
- status: success, refused, or error
- refusal/error code without leaking secrets

The existing `AI_AGENT` usage log remains in place for the overall AI request.

## Admin Controls

Add `querySafeDatabase` to the AI tool registry for `ADMIN`.

The existing tool policy table can enable or disable it per role. Since this tool is powerful, the implementation should make it visible in `/dashboard/admin/ai-agent` with a clear label.

## Testing

Add focused tests or verification scripts for:

- valid `SELECT` against `ai_` views passes
- non-ADMIN cannot use the tool
- direct table access is refused
- sensitive table/column access is refused
- write statements are refused
- multi-statement and comments are refused
- missing limit gets default `LIMIT 100`
- excessive limit is capped at `300`
- timeout path returns controlled failure

## Rollout

1. Create safe views migration.
2. Add SQL validation and execution helper.
3. Register the admin-only tool.
4. Wire the tool into admin chat.
5. Rebuild and run migrations.
6. Verify via admin AI chat and activity logs.

## Residual Risk

This still allows broad operational data analysis for ADMIN users. The key mitigation is that the data surface is intentionally limited to safe views, not raw application tables. Future schema changes must keep sensitive fields out of `ai_*` views unless explicitly reviewed.
