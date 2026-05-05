# AI Agent Cost-Optimized Implementation Plan

## Inputs

Plan nay dua tren:

- Spec da duyet: [2026-04-27-ai-agent-cost-optimized-design.md](/opt/sudungthuoc/sudungthuoc/docs/superpowers/specs/2026-04-27-ai-agent-cost-optimized-design.md)
- Auth va server authorization hien co: [server-authz.ts](/opt/sudungthuoc/sudungthuoc/src/lib/server-authz.ts)
- Activity logging hien co: [activity-log.ts](/opt/sudungthuoc/sudungthuoc/src/lib/activity-log.ts)
- Dashboard shell hien tai: [DashboardLayout.tsx](/opt/sudungthuoc/sudungthuoc/src/components/DashboardLayout.tsx)
- Facility reports page: [page.tsx](/opt/sudungthuoc/sudungthuoc/src/app/dashboard/facility/reports/page.tsx)
- Facility mappings page: [page.tsx](/opt/sudungthuoc/sudungthuoc/src/app/dashboard/facility/mappings/page.tsx)
- Facility reports API:
  - [reports/route.ts](/opt/sudungthuoc/sudungthuoc/src/app/api/facility/reports/route.ts)
  - [reports/validate/route.ts](/opt/sudungthuoc/sudungthuoc/src/app/api/facility/reports/validate/route.ts)
  - [reports/detail/route.ts](/opt/sudungthuoc/sudungthuoc/src/app/api/facility/reports/detail/route.ts)
- Facility mappings API:
  - [mappings/route.ts](/opt/sudungthuoc/sudungthuoc/src/app/api/facility/mappings/route.ts)
  - [mappings/[id]/route.ts](/opt/sudungthuoc/sudungthuoc/src/app/api/facility/mappings/[id]/route.ts)
- Shared report validation: [report-validation.ts](/opt/sudungthuoc/sudungthuoc/src/lib/report-validation.ts)
- Dashboard supply/risk helpers: [supply-risk.ts](/opt/sudungthuoc/sudungthuoc/src/lib/dashboard/supply-risk.ts)

## Goal

Trien khai MVP AI Agent tiet kiem chi phi de:

- cho `ADMIN` va `FACILITY` hoi dap / phan tich du lieu noi bo theo quyen
- them `AI kiem tra` cho bao cao Xuat-Nhap-Ton va anh xa danh muc thuoc cua `FACILITY`
- mac dinh dung `Gemma 4 26B A4B IT` qua Gemini API
- chi dung fallback model o Phase 2 khi user chu dong bam `Phan tich sau`
- khong cho AI ghi DB nghiep vu
- log usage va audit moi request AI bang `ActivityLog`

## Delivery Principles

- Backend la boundary bat buoc: frontend khong tu quyet dinh role, facility scope, tool, hay model
- Khong gui nguyen bang lon sang AI; moi tool phai aggregate va cat top records
- Khong cai SDK moi trong MVP; provider adapters goi API bang `fetch` de giam dependency va network install risk
- Khong thay doi Prisma schema trong Phase 1; usage log ghi vao `ActivityLog`
- UI AI la progressive enhancement: neu provider loi, cac luong bao cao/anh xa van dung binh thuong
- Khong sua hoac revert cac thay doi dang co san trong worktree ngoai pham vi AI Agent
- Khong mo AI cho `COMPANY` trong MVP

## Current Constraints

- Worktree hien co dang co nhieu thay doi chua commit o app/API va [DashboardLayout.tsx](/opt/sudungthuoc/sudungthuoc/src/components/DashboardLayout.tsx); implementation phai doc lai file truoc khi sua va chi stage file minh cham
- App dung Next.js route handlers, React client components, Prisma generated client trong `prisma/generated/client`
- `ActivityLog.action` va `ActivityLog.entityType` la string; ghi `AI_AGENT` / `ai_agent` ma khong can migration
- Repo hien chua co validation schema library rieng nhu Zod; request validation MVP nen dung type guards thu cong
- Facility reports page dang quan ly preview upload, server validation, va detail modal trong mot file lon
- Facility mappings page dang quan ly import, tabs theo status, edit mapping, submit/recall trong mot file lon
- Provider API keys phu thuoc env runtime; khi chua co key, verification local chi kiem tra compile/lint/error handling

## Target File Structure

### Backend AI core

- `src/lib/ai/types.ts`
- `src/lib/ai/config.ts`
- `src/lib/ai/model-router.ts`
- `src/lib/ai/providers/google.ts`
- `src/lib/ai/providers/openai.ts`
- `src/lib/ai/prompts.ts`
- `src/lib/ai/usage.ts`
- `src/lib/ai/rate-limit.ts`
- `src/lib/ai/sanitize.ts`

### Backend tools

- `src/lib/ai/tools/index.ts`
- `src/lib/ai/tools/admin.ts`
- `src/lib/ai/tools/facility.ts`
- `src/lib/ai/tools/review.ts`

### API

- `src/app/api/ai/agent/route.ts`

### Frontend

- `src/components/ai/AIAssistantPanel.tsx`
- `src/components/ai/AIReviewButton.tsx`
- `src/components/ai/types.ts`
- `src/components/DashboardLayout.tsx`
- `src/app/dashboard/facility/reports/page.tsx`
- `src/app/dashboard/facility/mappings/page.tsx`
- `src/app/api/admin/ai-usage/route.ts`
- `src/app/dashboard/admin/ai-usage/page.tsx`

### Docs

- [2026-04-27-ai-agent-cost-optimized-design.md](/opt/sudungthuoc/sudungthuoc/docs/superpowers/specs/2026-04-27-ai-agent-cost-optimized-design.md)
- [2026-04-27-ai-agent-cost-optimized-implementation-plan.md](/opt/sudungthuoc/sudungthuoc/docs/superpowers/plans/2026-04-27-ai-agent-cost-optimized-implementation-plan.md)

## Rollout Shape

Trien khai qua 7 phase:

1. `AI types, config, and provider adapters`
2. `Read-only tool registry`
3. `Agent route orchestration`
4. `Cost, quota, and audit controls`
5. `Dashboard assistant UI`
6. `Contextual AI review for facility reports and mappings`
7. `Verification and rollout safety`

Thu tu nay giu rui ro thap:

- core backend va tool contract on dinh truoc
- API hoat dong voi response mock/provider truoc khi lap UI
- usage/quota dat vao API truoc khi mo nut UI cho nguoi dung
- UI chat chung xong truoc, sau do moi gan review vao cac page lon

## Phase 1: AI Types, Config, And Provider Adapters

### Objective

Tao nen tang AI co typed contract, doc env ro rang, va co provider adapter dung `fetch`.

### Tasks

1. Tao [types.ts](/opt/sudungthuoc/sudungthuoc/src/lib/ai/types.ts) voi:
   - `AIAgentMode = "chat" | "review"`
   - `AIAgentSurface = "dashboard" | "facility_reports" | "facility_mappings"`
   - `AIAgentRequest`
   - `AIAgentResponse`
   - `AIAgentToolCall`
   - `AIModelRequest`
   - `AIModelResponse`
   - `AIUsageEstimate`
2. Them request field co gioi han cho du lieu review tu client:
   - `evidence?: { summary?: Record<string, unknown>; rows?: unknown[] }`
   - chi dung cho `mode="review"`
   - backend validate shape, cat toi da 30 rows, va chi giu fields allowlist
3. Tao [config.ts](/opt/sudungthuoc/sudungthuoc/src/lib/ai/config.ts):
   - doc `AI_PRIMARY_PROVIDER`
   - doc `AI_PRIMARY_MODEL`
   - doc `GOOGLE_GENERATIVE_AI_API_KEY`
   - doc `AI_FALLBACK_PROVIDER`
   - doc `AI_FALLBACK_MODEL`
   - doc `OPENAI_API_KEY`
   - doc `AI_ENABLE_FALLBACK`
   - doc `AI_MAX_OUTPUT_TOKENS`
   - doc quota env; neu env khong co thi dung default trong spec
4. Tao provider interface:
   - `generateAIResponse(request: AIModelRequest): Promise<AIModelResponse>`
5. Implement [providers/google.ts](/opt/sudungthuoc/sudungthuoc/src/lib/ai/providers/google.ts):
   - goi Gemini REST API bang `fetch`
   - support text prompt only trong MVP
   - parse `text`, usage metadata neu provider tra ve
   - map loi provider thanh error co code
6. Implement [providers/openai.ts](/opt/sudungthuoc/sudungthuoc/src/lib/ai/providers/openai.ts):
   - chi duoc goi khi `AI_ENABLE_FALLBACK=true`
   - goi OpenAI API bang `fetch`
   - parse output text va usage neu co
7. Implement [model-router.ts](/opt/sudungthuoc/sudungthuoc/src/lib/ai/model-router.ts):
   - `simple_qa`, `record_review`, `summary` -> primary
   - `deep_analysis`, `executive_report` -> fallback chi khi request co flag `useFallback=true`, user role `ADMIN`, va env bat fallback
8. Them timeout cho provider call:
   - default 30 giay
   - dung `AbortController`
9. Them fallback dev behavior:
   - neu khong co API key va `NODE_ENV !== "production"`, tra controlled error message thay vi crash

### Acceptance Criteria

- Core AI compile duoc ma khong can cai package moi
- Provider adapter khong doc secret o client
- Fallback khong bao gio duoc goi neu `AI_ENABLE_FALLBACK=false`
- Missing API key tra error co kiem soat, khong lam server crash

## Phase 2: Read-Only Tool Registry

### Objective

Tao tool server-side chi doc du lieu, ap dung role/facility scope bat buoc.

### Tasks

1. Tao [tools/index.ts](/opt/sudungthuoc/sudungthuoc/src/lib/ai/tools/index.ts):
   - registry tool theo role
   - function `resolveAllowedTools(context, request)`
   - function `runAITools(context, request)`
2. Tao [tools/admin.ts](/opt/sudungthuoc/sudungthuoc/src/lib/ai/tools/admin.ts) voi cac tool:
   - `getDashboardOverview`
   - `getSupplyRisk`
   - `getReportSubmissionStatus`
   - `getMappingBacklog`
   - `getFacilityReportAnomalies`
3. Tao [tools/facility.ts](/opt/sudungthuoc/sudungthuoc/src/lib/ai/tools/facility.ts) voi cac tool:
   - `getMyReportSummary`
   - `getMyReportAnomalies`
   - `getMyMappingIssues`
   - `getMySupplyRisks`
4. Tao [tools/review.ts](/opt/sudungthuoc/sudungthuoc/src/lib/ai/tools/review.ts):
   - `reviewFacilityReportEvidence`
   - `reviewStoredFacilityReport`
   - `reviewFacilityMappings`
5. Moi tool phai nhan `ActiveSessionContext` tu [server-authz.ts](/opt/sudungthuoc/sudungthuoc/src/lib/server-authz.ts)
6. Moi tool phai return payload da rut gon:
   - records toi da 80 cho chat
   - anomaly/review rows toi da 30 trong prompt
   - chi fields can de giai thich loi
7. `FACILITY` tool phai luon dung `context.user.id` lam `facilityId`
8. `ADMIN` tool duoc loc `facilityId` tu request context, nhung phai validate facility ton tai neu co
9. `COMPANY` khong co tool allowlist
10. Review report evidence:
   - nhan rows da sanitize tu client preview
   - khong tin row raw day du
   - chi giu `stt`, `maNoiBo`, `drugName`, `tonDau`, `nhap`, `xuat`, `tonCuoi`, `giaVat`, `thanhTienTonCuoi`, `warnings`
11. Review stored report:
   - query `InventoryReport` theo `facilityId` va `reportMonth`
   - phat hien `xuat > tonDau + nhap`, `tonCuoi < 0`, `giaVat = 0` voi dong co ton/gia tri, dong chua mapping
12. Review mappings:
   - group theo status
   - phat hien thieu `hoatChatNoiBo`, `soDangKyNoiBo`, `donViTinhNoiBo`
   - phat hien ten/ma noi bo gan trung bang rule deterministic don gian

### Acceptance Criteria

- Tool registry chan `COMPANY`
- `FACILITY` khong the doc facility khac ke ca khi client gui `facilityId`
- Tool output khong chua password/session/token/raw large table
- Review tools co deterministic findings de UI van hien duoc canh bao khi provider AI loi

## Phase 3: Agent Route Orchestration

### Objective

Them `/api/ai/agent` lam entrypoint duy nhat cho chat va review.

### Tasks

1. Tao [route.ts](/opt/sudungthuoc/sudungthuoc/src/app/api/ai/agent/route.ts)
2. Trong `POST`:
   - parse JSON an toan
   - validate `mode`, `message`, `surface`, `context`, `evidence`, `useFallback`
   - gioi han `message` toi da 2000 ky tu
   - goi `requireActiveSessionUser()`
   - chan `COMPANY` voi 403
3. Validate role/context:
   - `mode="review"` bat buoc co `surface`
   - `FACILITY` chi duoc review `facility_reports` va `facility_mappings`
   - `ADMIN` chat dashboard duoc loc facility
   - `FACILITY` chat dashboard chi dung scope cua minh
4. Kiem tra quota truoc khi goi tool/model
5. Chay tool registry de lay `toolResults`
6. Build prompt tu [prompts.ts](/opt/sudungthuoc/sudungthuoc/src/lib/ai/prompts.ts):
   - system rules
   - user role/scope
   - cau hoi
   - tool data da rut gon
   - review evidence neu co
   - response format bang tieng Viet
7. Goi model router:
   - primary default
   - fallback chi theo rule Phase 1
8. Return `AIAgentResponse`:
   - `answer`
   - `mode`
   - `model`
   - `usedFallback`
   - `toolCalls`
   - `warnings`
   - `usage`
9. Map loi:
   - 400 invalid request
   - 401 unauthenticated
   - 403 forbidden role/scope
   - 429 quota exceeded
   - 502 provider error
   - 504 provider timeout
10. Khong render HTML tu model; response chi la plain text/markdown an toan cho React text render

### Acceptance Criteria

- API route compile duoc
- Unauthorized/forbidden/quota/provider loi deu co response JSON on dinh
- Moi response success co `model`, `usedFallback`, `toolCalls`, `warnings`
- AI route khong ghi DB nghiep vu

## Phase 4: Cost, Quota, And Audit Controls

### Objective

Giam chi phi va tao audit trail cho moi request AI ngay tu MVP.

### Tasks

1. Tao [usage.ts](/opt/sudungthuoc/sudungthuoc/src/lib/ai/usage.ts):
   - estimate input/output tokens neu provider khong tra usage
   - estimate cost theo model config local
   - normalize usage metadata cua Google/OpenAI
2. Tao [rate-limit.ts](/opt/sudungthuoc/sudungthuoc/src/lib/ai/rate-limit.ts):
   - dem request trong ngay dua tren `ActivityLog`
   - `FACILITY`: 30 chat/ngay, 15 review/ngay
   - `ADMIN`: 80 chat/ngay, 40 review/ngay
   - rate limit tinh theo `action = "AI_AGENT"` va `createdAt` trong ngay
3. Them helper `logAIActivity`:
   - userId
   - role
   - mode
   - surface
   - model
   - usedFallback
   - tool names
   - estimated tokens
   - estimated cost
   - status
4. Ghi log ca success va provider error
5. Khong log full prompt hoac full answer trong MVP
6. Cache insight:
   - Phase 1 implement cache in-memory per process voi TTL ngan 5 phut cho tool results/prompt response read-only
   - key gom role, user scope, surface, reportMonth, filters hash, message hash
   - neu runtime/serverless khong giu cache thi he thong van dung dung
7. Neu cache hit:
   - van ghi ActivityLog
   - response warnings them `CACHE_HIT` de phan biet cache path khi debug noi bo

### Acceptance Criteria

- Vuot quota tra 429 truoc khi goi provider
- Moi AI request co ActivityLog
- Log khong chua du lieu nhay cam day du
- Chi phi uoc tinh duoc tra ve response khi co metadata hoac estimate

## Phase 5: Dashboard Assistant UI

### Objective

Them `Tro ly AI` tren dashboard header cho `ADMIN` va `FACILITY`.

### Tasks

1. Tao [AIAssistantPanel.tsx](/opt/sudungthuoc/sudungthuoc/src/components/ai/AIAssistantPanel.tsx)
2. Panel UI:
   - side panel/dialog ben phai
   - lich su chat trong phien hien tai
   - input message
   - nut gui
   - loading state
   - error state
   - warnings area
   - usage/model small metadata neu co
3. Tao [components/ai/types.ts](/opt/sudungthuoc/sudungthuoc/src/components/ai/types.ts) cho client types va tranh import server-only module vao client component
4. Trong [DashboardLayout.tsx](/opt/sudungthuoc/sudungthuoc/src/components/DashboardLayout.tsx):
   - doc session role hien co
   - hien nut `Tro ly AI` cho `ADMIN` va `FACILITY`
   - khong hien cho `COMPANY`
   - dat canh notification/account theo spec
5. Message request:
   - `mode="chat"`
   - `surface="dashboard"`
   - gui `context` gom pathname hien tai; filters theo tung page se bo sung o cac phase sau
6. Goi `/api/ai/agent` bang fetch
7. Khong dung `dangerouslySetInnerHTML`
8. Them disclaimer ngan trong panel:
   - AI ho tro tong hop/kiem tra, nguoi dung can xac nhan truoc khi thao tac nghiep vu
9. Neu API tra 429:
   - hien thong bao het luot hom nay
10. Neu provider loi:
   - hien loi than thien va giu input de user thu lai

### Acceptance Criteria

- `ADMIN` va `FACILITY` thay nut `Tro ly AI`
- `COMPANY` khong thay nut
- Panel chat goi API thanh cong khi co provider configured
- Panel khong lam thay doi route/page hien tai
- UI van dung duoc khi API loi

## Phase 6: Contextual AI Review For Facility Reports And Mappings

### Objective

Them nut `AI kiem tra` vao hai workflow dau tien cua `FACILITY`.

### Tasks

1. Tao [AIReviewButton.tsx](/opt/sudungthuoc/sudungthuoc/src/components/ai/AIReviewButton.tsx):
   - props `surface`
   - props `message`
   - props `context`
   - props `evidence`
   - render button + result dialog/panel
   - loading/error/success states
2. Facility reports integration trong [page.tsx](/opt/sudungthuoc/sudungthuoc/src/app/dashboard/facility/reports/page.tsx):
   - them nut `AI kiem tra` trong toolbar sau khi chon `selectedMonth`
   - neu dang co `previewRows`, build evidence tu preview:
     - summary count
     - server validation errors count/top errors
     - top warning rows toi da 30
     - top formula/anomaly rows toi da 30
   - neu khong co preview nhung da co report thang do, goi review stored report bang `context.reportMonth`
   - neu chua co preview va chua co report, disable nut voi tooltip/message chon file hoac ky bao cao truoc
3. Facility mappings integration trong [page.tsx](/opt/sudungthuoc/sudungthuoc/src/app/dashboard/facility/mappings/page.tsx):
   - them nut `AI kiem tra` gan khu vuc actions/import/submit
   - build evidence summary tu mappings state:
     - total
     - counts by status
     - rows thieu thong tin toi da 30
     - rows rejected toi da 30
   - backend tool van query DB lai theo session de tranh tin client hoan toan
4. Request review:
   - `mode="review"`
   - `surface="facility_reports"` hoac `surface="facility_mappings"`
   - message mac dinh ngan gon theo workflow
5. Result dialog:
   - sections `Loi can xu ly`, `Canh bao nen kiem tra`, `Goi y tiep theo`
   - neu model tra plain markdown, render an toan trong text blocks
6. Khong them nut auto-fix
7. Review result khong chan submit neu user bo qua, vi AI chi la ho tro

### Acceptance Criteria

- Facility reports co nut `AI kiem tra` dung cho preview hoac report da nop
- Facility mappings co nut `AI kiem tra`
- AI review khong gui toan bo file/mapping list neu qua lon
- Loi AI khong lam mat preview/import/edit state

## Phase 7: Verification And Rollout Safety

### Objective

Dam bao phan quyen, cost control, UI va provider errors duoc kiem tra truoc closeout.

### Tasks

1. Chay `npm run lint`
2. Neu co TypeScript/lint loi do file vua sua, fix trong scope AI
3. Kiem tra route bang manual/API:
   - unauthenticated -> 401
   - `COMPANY` -> 403
   - `FACILITY` gui `facilityId` khac -> bi bo qua/403
   - invalid mode/surface -> 400
   - vuot quota -> 429
4. Kiem tra chat dashboard:
   - admin hoi tong quan
   - facility hoi bao cao cua minh
   - provider missing key -> error than thien
5. Kiem tra review:
   - report preview co warning
   - report da nop theo month
   - mappings thieu hoat chat/so dang ky/don vi tinh
6. Kiem tra log:
   - `ActivityLog` co action `AI_AGENT`
   - details khong chua full prompt/answer
7. Kiem tra UI:
   - desktop header
   - mobile header neu nut AI hien thi
   - panel khong overlap menu/account
   - text dai khong tran button/dialog
8. Neu khong co API key trong env:
   - ghi ro verification chi gom compile/lint/error handling
   - khong fabricate provider success

### Acceptance Criteria

- `npm run lint` pass hoac loi con lai duoc ghi ro la khong lien quan
- `ADMIN` va `FACILITY` co luong AI hoat dong theo scope
- `COMPANY` bi chan
- AI khong ghi DB nghiep vu
- Quota, logging, provider error handling hoat dong
- Review button khong pha workflow reports/mappings

## Risks And Mitigations

- Risk: Provider API thay doi response shape
  - Mitigation: provider adapters parse phong thu, tra controlled error neu thieu output text
- Risk: Prompt qua dai khi report/mapping nhieu dong
  - Mitigation: sanitize evidence va top-N anomalies truoc khi build prompt
- Risk: Facility doc du lieu cua co so khac qua request context
  - Mitigation: moi tool dung `ActiveSessionContext.user.id` cho facility, khong dung client facilityId
- Risk: ActivityLog bi phinh to do luu prompt/answer
  - Mitigation: chi log metadata/usage/tool names/status
- Risk: UI page reports/mappings da lon, de tao regression
  - Mitigation: dung component `AIReviewButton` doc lap, chi chen vao toolbar/action area
- Risk: Fallback model tang chi phi
  - Mitigation: Phase 1 tat fallback, Phase 2 chi `ADMIN` va chi khi user bam `Phan tich sau`

## Success Criteria

- Co `/api/ai/agent` dung chung cho chat va review
- Model mac dinh la `Gemma 4 26B A4B IT`
- Fallback khong bat trong pilot
- `ADMIN` hoi duoc du lieu tong hop theo tool chi doc
- `FACILITY` hoi va review duoc du lieu cua minh
- `AI kiem tra` xuat hien tren facility reports va facility mappings
- Moi request AI duoc log va quota check
- Khong co thay doi schema Prisma trong MVP
- Khong co thao tac AI ghi DB nghiep vu

## Phase 2 Follow-up Completed

Sau MVP dau tien, cac phan con lai trong Phase 2 da duoc bo sung:

- tach cache AI thanh module rieng `src/lib/ai/cache.ts`
- cache key gom role, user scope, surface, reportMonth, filters, message, fallback flag va evidence review
- ActivityLog ghi them `cacheHit` va `warnings` de debug cost-control
- them API admin-only `/api/admin/ai-usage` de tong hop usage AI tu ActivityLog
- them trang `/dashboard/admin/ai-usage` de xem request, token, chi phi uoc tinh, cache hit, fallback, loi/quota theo ngay, role, mode, model va user
- them menu `Theo doi AI` trong khu vuc Cai dat cua admin

## Implementation Checklist

- [x] Tao `src/lib/ai` core types/config/router/providers
- [x] Tao AI provider adapter Google bang `fetch`
- [x] Tao fallback OpenAI adapter bang `fetch`
- [x] Tao prompt builder va sanitizer
- [x] Tao tool registry theo role
- [x] Implement admin read-only tools
- [x] Implement facility read-only tools
- [x] Implement review tools cho reports/mappings
- [x] Tao `/api/ai/agent`
- [x] Implement usage estimate va ActivityLog audit
- [x] Implement quota check bang ActivityLog
- [x] Implement in-memory cache va `CACHE_HIT` logging
- [x] Tao admin AI usage dashboard
- [x] Tao `AIAssistantPanel`
- [x] Chen nut `Tro ly AI` vao `DashboardLayout`
- [x] Tao `AIReviewButton`
- [x] Chen review vao facility reports page
- [x] Chen review vao facility mappings page
- [x] Chay lint
- [x] Automated verify bang lint, typecheck va production build
- [ ] Manual runtime verify authz/quota/provider success/UI flows khi co session va API key runtime
