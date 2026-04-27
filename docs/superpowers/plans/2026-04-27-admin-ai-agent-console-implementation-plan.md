# Admin AI Agent Console Implementation Plan

## Inputs

Plan nay dua tren:

- Spec da duyet: [2026-04-27-admin-ai-agent-console-design.md](/opt/sudungthuoc/sudungthuoc/docs/superpowers/specs/2026-04-27-admin-ai-agent-console-design.md)
- AI Agent MVP plan: [2026-04-27-ai-agent-cost-optimized-implementation-plan.md](/opt/sudungthuoc/sudungthuoc/docs/superpowers/plans/2026-04-27-ai-agent-cost-optimized-implementation-plan.md)
- AI route hien co: [route.ts](/opt/sudungthuoc/sudungthuoc/src/app/api/ai/agent/route.ts)
- AI config/quota/cache:
  - [config.ts](/opt/sudungthuoc/sudungthuoc/src/lib/ai/config.ts)
  - [rate-limit.ts](/opt/sudungthuoc/sudungthuoc/src/lib/ai/rate-limit.ts)
  - [cache.ts](/opt/sudungthuoc/sudungthuoc/src/lib/ai/cache.ts)
- AI tools registry: [tools/index.ts](/opt/sudungthuoc/sudungthuoc/src/lib/ai/tools/index.ts)
- Admin AI usage API/UI:
  - [route.ts](/opt/sudungthuoc/sudungthuoc/src/app/api/admin/ai-usage/route.ts)
  - [page.tsx](/opt/sudungthuoc/sudungthuoc/src/app/dashboard/admin/ai-usage/page.tsx)
- Admin app shell: [DashboardLayout.tsx](/opt/sudungthuoc/sudungthuoc/src/components/DashboardLayout.tsx)
- Prisma schema: [schema.prisma](/opt/sudungthuoc/sudungthuoc/prisma/schema.prisma)
- Authz helper: [server-authz.ts](/opt/sudungthuoc/sudungthuoc/src/lib/server-authz.ts)
- Activity logging pattern: [activity-log.ts](/opt/sudungthuoc/sudungthuoc/src/lib/activity-log.ts)

## Goal

Trien khai Admin AI Agent Console theo huong DB-backed policy, secrets van doc tu env:

- global AI settings
- quota default theo role/mode
- user override
- tool policy theo role
- provider health check
- UI `/dashboard/admin/ai-agent`
- enforcement trong `/api/ai/agent`
- mo rong usage/audit filter

## Delivery Principles

- Backend la boundary bat buoc; UI chi hien va gui policy, khong quyet dinh enforcement.
- DB chi luu policy khong nhay cam; khong luu API key, prompt day du, answer day du.
- Neu bang policy rong, runtime fallback ve env/default hien tai de khong gay deploy.
- `COMPANY` luon bi chan bang hard guard trong API, bat chap DB policy.
- Tool policy chi bat/tat tool co san trong registry code, khong cho tao tool/script/SQL tu UI.
- Thay doi policy phai ghi `ActivityLog`.
- Khong revert cac thay doi AI Agent dang co san trong worktree.

## Current Constraints

- Worktree hien co dang co thay doi chua commit lien quan AI usage/cache/agent route; can doc lai file truoc khi sua.
- Prisma generated client nam trong `prisma/generated/client`; sau khi sua schema can chay generate/build theo workflow repo.
- Repo chua co validation schema library rieng; API validation dung type guards thu cong.
- Admin UI hien co dung client components, shadcn-like local UI components va Tailwind.
- Network/API key runtime co the khong san sang trong local verification; provider success can verify khi co env runtime.

## Target File Structure

### Prisma

- `prisma/schema.prisma`

### AI policy core

- `src/lib/ai/admin-config.ts`
- `src/lib/ai/tool-registry.ts`
- `src/lib/ai/rate-limit.ts`
- `src/lib/ai/model-router.ts`
- `src/lib/ai/cache.ts`
- `src/lib/ai/types.ts`
- `src/lib/ai/tools/index.ts`

### Admin APIs

- `src/app/api/admin/ai-agent/settings/route.ts`
- `src/app/api/admin/ai-agent/users/route.ts`
- `src/app/api/admin/ai-agent/users/[userId]/policy/route.ts`
- `src/app/api/admin/ai-agent/tools/route.ts`
- `src/app/api/admin/ai-agent/health-check/route.ts`
- `src/app/api/admin/ai-usage/route.ts`

### AI API

- `src/app/api/ai/agent/route.ts`

### Frontend

- `src/app/dashboard/admin/ai-agent/page.tsx`
- `src/app/dashboard/admin/ai-usage/page.tsx`
- `src/components/DashboardLayout.tsx`

### Docs

- [2026-04-27-admin-ai-agent-console-design.md](/opt/sudungthuoc/sudungthuoc/docs/superpowers/specs/2026-04-27-admin-ai-agent-console-design.md)
- [2026-04-27-admin-ai-agent-console-implementation-plan.md](/opt/sudungthuoc/sudungthuoc/docs/superpowers/plans/2026-04-27-admin-ai-agent-console-implementation-plan.md)

## Rollout Shape

Trien khai trong 8 phase:

1. `Prisma policy models`
2. `Tool registry metadata`
3. `Effective policy resolver`
4. `Agent route enforcement`
5. `Admin console APIs`
6. `Admin console UI`
7. `Usage/audit expansion`
8. `Verification and rollout safety`

Thu tu nay giu backend policy on dinh truoc khi mo UI:

- co schema va resolver truoc
- route AI enforced truoc
- API admin ghi policy sau
- UI chi tich hop khi backend da co contract

## Phase 1: Prisma Policy Models

### Objective

Them DB model de luu global settings, user override va tool policy, khong thay doi bang nghiep vu.

### Tasks

1. Sua [schema.prisma](/opt/sudungthuoc/sudungthuoc/prisma/schema.prisma):
   - them `AISetting`
   - them `AIUserPolicy`
   - them `AIToolPolicy`
   - them relation `User.aiUserPolicy`
2. Model `AISetting`:
   - `key String @unique`
   - `value Json`
   - `updatedById String?`
   - timestamps
3. Model `AIUserPolicy`:
   - `userId String @unique`
   - `enabled Boolean?`
   - `chatDailyLimit Int?`
   - `reviewDailyLimit Int?`
   - `allowFallback Boolean?`
   - `note String?`
   - `updatedById String?`
4. Model `AIToolPolicy`:
   - `toolName String`
   - `role Role`
   - `enabled Boolean @default(true)`
   - unique `[toolName, role]`
5. Chay Prisma generate sau khi schema hop le.
6. Neu repo yeu cau DB sync local, dung `npm run db:push` trong verification co approval neu can.

### Acceptance Criteria

- Prisma schema valid.
- Generated client co type cho 3 model moi.
- Khong them relation phuc tap cho `updatedById`.
- Bang moi khong chua secret.

## Phase 2: Tool Registry Metadata

### Objective

Tach danh sach tool thanh registry co metadata de UI va backend enforcement dung chung source of truth.

### Tasks

1. Tao [tool-registry.ts](/opt/sudungthuoc/sudungthuoc/src/lib/ai/tool-registry.ts):
   - `AIToolName`
   - `AIToolDefinition`
   - `AI_TOOL_REGISTRY`
   - `getAIToolDefinitionsForRole(role)`
   - `isKnownAIToolName(name)`
2. Moi definition gom:
   - `name`
   - `label`
   - `description`
   - `roles: ("ADMIN" | "FACILITY")[]`
   - `modes: ("chat" | "review")[]`
   - `surfaces?: AIAgentSurface[]`
3. Registry include dung cac tool hien co:
   - `getDashboardOverview`
   - `getSupplyRisk`
   - `getReportSubmissionStatus`
   - `getMappingBacklog`
   - `getFacilityReportAnomalies`
   - `getMyReportSummary`
   - `getMyReportAnomalies`
   - `getMyMappingIssues`
   - `getMySupplyRisks`
   - `reviewFacilityReportEvidence`
   - `reviewStoredFacilityReport`
   - `reviewFacilityMappings`
4. Sua [tools/index.ts](/opt/sudungthuoc/sudungthuoc/src/lib/ai/tools/index.ts) de tham chieu registry thay vi tool name hard-code o nhieu noi khi co the.
5. Giu execution function hien co, chi them metadata/filtering.

### Acceptance Criteria

- Admin API co the list tool tu registry ma khong query code rieng.
- Unknown tool policy tu DB bi ignore hoac flag warning, khong duoc execute.
- `COMPANY` khong co role support trong registry.

## Phase 3: Effective Policy Resolver

### Objective

Tao lop doc env + DB policy va tra ve policy da resolve cho AI route, quota, fallback, cache va tools.

### Tasks

1. Tao [admin-config.ts](/opt/sudungthuoc/sudungthuoc/src/lib/ai/admin-config.ts).
2. Define types:
   - `AIAdminSettings`
   - `AIEffectivePolicy`
   - `AIToolPolicyMap`
   - `AIProviderStatus`
3. Implement default settings tu [config.ts](/opt/sudungthuoc/sudungthuoc/src/lib/ai/config.ts):
   - `globalEnabled=true`
   - `chatEnabled=true`
   - `reviewEnabled=true`
   - `fallbackEnabled=config.fallbackEnabled`
   - quota tu config hien co
4. Implement `getAIAdminSettings()`:
   - doc `AISetting`
   - validate shape tung key
   - fallback default neu missing/invalid
5. Implement `getEffectiveAIPolicy(sessionContext, request)`:
   - load global settings
   - load user override neu role `ADMIN`/`FACILITY`
   - resolve enabled/mode/fallback/quota
   - hard block `COMPANY`
6. Implement `assertAIEnabledForRequest(policy)`:
   - throw `RouteError(403, "AI_DISABLED")` style code/message wrapper hoac custom error co code
   - phan biet `AI_DISABLED`, `AI_MODE_DISABLED`, `AI_USER_DISABLED`
7. Implement `getAIToolPolicyMap(role)`:
   - default enabled cho tool supported by role
   - overlay DB `AIToolPolicy`
8. Implement `getAIPolicyVersion()`:
   - max `updatedAt` cua 3 bang policy
   - fallback `"default"` neu chua co row
9. Implement provider status helper:
   - primary provider/model tu env
   - fallback provider/model tu env
   - booleans `hasGoogleApiKey`, `hasOpenAIApiKey`
   - khong tra secret value

### Acceptance Criteria

- Policy resolver hoat dong khi DB rong.
- User override duoc uu tien hon global quota.
- Fallback effective khong true neu thieu key provider fallback.
- Policy version thay doi khi setting/user/tool policy thay doi.

## Phase 4: Agent Route Enforcement

### Objective

Gan policy resolver vao `/api/ai/agent` de enforcement thuc su nam tren backend.

### Tasks

1. Sua [route.ts](/opt/sudungthuoc/sudungthuoc/src/app/api/ai/agent/route.ts):
   - sau `requireActiveSessionUser`, load effective policy
   - call `assertAIEnabledForRequest`
   - truyen effective quota vao rate-limit
   - truyen fallback policy vao model router
   - truyen tool policy vao `runAITools`
   - them policy version vao cache key
2. Sua [rate-limit.ts](/opt/sudungthuoc/sudungthuoc/src/lib/ai/rate-limit.ts):
   - `assertWithinAIQuota(userId, role, mode, limitOverride?)`
   - neu co effective limit thi dung limit do
   - giu fallback env/default cho call sites cu neu co
3. Sua [model-router.ts](/opt/sudungthuoc/sudungthuoc/src/lib/ai/model-router.ts):
   - them param `fallbackAllowed?: boolean`
   - fallback chi khi:
     - `useFallback=true`
     - role `ADMIN`
     - task `deep_analysis` hoac `executive_report`
     - `fallbackAllowed=true`
4. Sua [cache.ts](/opt/sudungthuoc/sudungthuoc/src/lib/ai/cache.ts):
   - build key nhan optional `policyVersion`
   - include `policyVersion` trong digest
5. Sua [tools/index.ts](/opt/sudungthuoc/sudungthuoc/src/lib/ai/tools/index.ts):
   - nhan `toolPolicyMap`
   - truoc khi run tool, neu disabled thi return `{ name, status: "skipped", warning: "AI_TOOL_DISABLED:<toolName>" }`
   - khong query DB khi tool disabled
6. Logging:
   - disabled global/mode/user: log `status="error"`, `errorCode`
   - disabled tool: warnings/toolCalls trong success log
7. Error response:
   - `AI_DISABLED` -> 403
   - `AI_MODE_DISABLED` -> 403
   - `AI_USER_DISABLED` -> 403

### Acceptance Criteria

- Global disabled chan truoc tool/model.
- Mode disabled chi chan mode tuong ung.
- User disabled chan dung user.
- Tool disabled khong query DB.
- Cache invalidates khi policy version doi.
- Existing AI behavior van giu khi DB policy rong.

## Phase 5: Admin Console APIs

### Objective

Them API admin-only de doc/ghi settings, user override, tool policy va health check.

### Tasks

1. Tao `src/app/api/admin/ai-agent/settings/route.ts`:
   - `GET`: return effective defaults, raw settings, provider status
   - `PUT`: validate payload, upsert `AISetting`, log `AI_AGENT_SETTINGS_UPDATED`
2. Tao `src/app/api/admin/ai-agent/users/route.ts`:
   - list active `ADMIN`/`FACILITY`
   - include `AIUserPolicy`
   - include usage hom nay theo `ActivityLog`
   - support search/role pagination neu can
3. Tao `src/app/api/admin/ai-agent/users/[userId]/policy/route.ts`:
   - `PUT`: validate user exists active role `ADMIN`/`FACILITY`, upsert policy
   - `DELETE`: delete override
   - log `AI_AGENT_USER_POLICY_UPDATED` / `AI_AGENT_USER_POLICY_RESET`
4. Tao `src/app/api/admin/ai-agent/tools/route.ts`:
   - `GET`: return registry + DB policy overlay
   - `PUT`: bulk upsert known tool + role only
   - log `AI_AGENT_TOOL_POLICY_UPDATED`
5. Tao `src/app/api/admin/ai-agent/health-check/route.ts`:
   - body `{ provider: "primary" | "fallback" }`
   - resolve provider/model/key tu env
   - prompt ngan, max output thap
   - timeout ngan hon normal neu hop ly
   - log `ActivityLog.action="AI_AGENT_HEALTH_CHECK"`, `entityType="ai_agent_health_check"`
6. Validation:
   - numeric limits phai int >= 0 va <= max guardrail, de xuat 1000/ngay
   - `note` trim max 500 chars
   - unknown fields ignored hoac 400, chon 400 de ro rang
7. Responses khong tra secret value.

### Acceptance Criteria

- Tat ca admin APIs chan non-admin.
- PUT/DELETE policy ghi ActivityLog.
- Health check thanh cong/lỗi deu tra JSON on dinh.
- API khong expose API key.

## Phase 6: Admin Console UI

### Objective

Tao `/dashboard/admin/ai-agent` de admin quan tri AI bang UI.

### Tasks

1. Tao [page.tsx](/opt/sudungthuoc/sudungthuoc/src/app/dashboard/admin/ai-agent/page.tsx).
2. Them menu `Quan tri AI` vao [DashboardLayout.tsx](/opt/sudungthuoc/sudungthuoc/src/components/DashboardLayout.tsx), gan khu vuc Cai dat hoac ngay canh `Theo doi AI`.
3. UI tabs:
   - `Tong quan`
   - `Cau hinh`
   - `Nguoi dung`
   - `Tools`
   - `Audit`
   - `Health`
4. `Tong quan`:
   - reuse summary tu `/api/admin/ai-usage`
   - cards request/success/error/cost/cache/fallback/provider status
5. `Cau hinh`:
   - switches global/chat/review/fallback
   - quota inputs role/mode
   - save button
   - provider/model read-only status
6. `Nguoi dung`:
   - table users
   - search/filter role
   - effective enabled/quota/fallback
   - usage hom nay
   - edit override dialog
   - reset override action
7. `Tools`:
   - matrix tool x role
   - switches enabled
   - description labels
   - save bulk changes
8. `Audit`:
   - reuse existing [ai-usage page](/opt/sudungthuoc/sudungthuoc/src/app/dashboard/admin/ai-usage/page.tsx) logic where practical
   - avoid duplicating too much code if extraction is small; otherwise keep first pass contained
9. `Health`:
   - primary/fallback provider cards
   - configured/not configured
   - test buttons
   - latest result display
10. UI state:
   - loading/error/success toast or inline messages
   - disable save while pending
   - confirm destructive reset override
11. Keep layout dense and operational, not marketing-style.

### Acceptance Criteria

- Admin can change global settings.
- Admin can edit/reset user override.
- Admin can enable/disable tools by role.
- Admin can run provider health check.
- UI never shows API key value.
- COMPANY users not shown for policy management.

## Phase 7: Usage/Audit Expansion

### Objective

Mo rong dashboard usage hien co de phuc vu console ma khong tao bang log moi.

### Tasks

1. Sua [ai-usage route](/opt/sudungthuoc/sudungthuoc/src/app/api/admin/ai-usage/route.ts):
   - filter `toolName`
   - filter `cacheHit`
   - filter `usedFallback`
   - filter `errorCode`
   - include health check logs neu query param yeu cau, default co the tach rieng
2. Sua [ai-usage page](/opt/sudungthuoc/sudungthuoc/src/app/dashboard/admin/ai-usage/page.tsx) neu van giu page rieng:
   - them filters moi
   - link sang `/dashboard/admin/ai-agent`
3. Trong `/dashboard/admin/ai-agent` Audit tab:
   - co the call chung API
   - hien recent logs co tool/warning/error code
4. Dam bao ActivityLog details khong luu prompt/answer day du.

### Acceptance Criteria

- Admin loc duoc log theo tool/cache/fallback/error.
- Existing ai usage page khong mat chuc nang.
- Health check log khong lam meo usage cost cua user AI request neu default khong include.

## Phase 8: Verification And Rollout Safety

### Objective

Dam bao policy enforcement, UI va migration an toan truoc khi closeout.

### Tasks

1. Chay Prisma generate.
2. Chay `npm run lint`.
3. Chay production build neu feasible.
4. Manual/API verify:
   - unauthenticated admin APIs -> 401
   - non-admin admin APIs -> 403
   - global disabled -> `/api/ai/agent` 403
   - chat disabled -> chat 403, review van theo review setting
   - review disabled -> review 403, chat van theo chat setting
   - user disabled -> 403
   - user quota override -> 429 sau khi vuot limit
   - tool disabled -> skipped warning, khong query DB
   - fallback disabled by policy -> primary used + warning neu user request fallback
   - health check missing key -> controlled error
5. Manual UI verify:
   - desktop admin console
   - mobile/tablet header khong overlap
   - settings save/reload
   - user override edit/reset
   - tool matrix save
   - health test result
6. Data audit:
   - policy update co ActivityLog
   - log details khong co API key, prompt full, answer full
7. Rollback note:
   - neu DB policy co loi, xoa/empty rows van fallback default
   - global settings co the bat lai tu DB/API

### Acceptance Criteria

- Lint pass.
- Build pass hoac loi moi duoc ghi ro va fix trong scope.
- Existing AI chat/review van hoat dong voi default policy.
- Admin console enforce duoc global/user/tool policy.
- Secrets khong lo qua DB/API/UI/log.

## Implementation Checklist

- [ ] Them Prisma models `AISetting`, `AIUserPolicy`, `AIToolPolicy`
- [ ] Generate Prisma client
- [ ] Tao AI tool registry metadata
- [ ] Tao `admin-config.ts` effective policy resolver
- [ ] Them policy version vao cache key
- [ ] Doi quota check sang effective limit
- [ ] Doi model router sang effective fallback policy
- [ ] Doi tool runner sang tool policy filter
- [ ] Enforce policy trong `/api/ai/agent`
- [ ] Tao settings API
- [ ] Tao users policy API
- [ ] Tao tools policy API
- [ ] Tao health-check API
- [ ] Mo rong ai usage API filters
- [ ] Tao `/dashboard/admin/ai-agent`
- [ ] Them menu `Quan tri AI`
- [ ] Tich hop settings tab
- [ ] Tich hop users override tab
- [ ] Tich hop tools policy tab
- [ ] Tich hop audit/health tabs
- [ ] Chay lint
- [ ] Chay build
- [ ] Manual verify policy/security/provider flows

## Risks And Mitigations

- Risk: DB policy lockout tat AI ngoai y muon
  - Mitigation: defaults safe, admin UI ro trang thai, route error code ro, DB rong fallback default
- Risk: Tool policy bi lech voi code tool
  - Mitigation: registry code la source of truth, DB unknown tool ignored
- Risk: Cache dung response cu sau khi policy doi
  - Mitigation: policy version trong cache key
- Risk: ActivityLog query cham khi tinh usage hom nay/top users
  - Mitigation: gioi han window hom nay, select fields toi thieu, xem xet index/bang rieng sau
- Risk: Secret leak
  - Mitigation: provider status chi boolean configured, khong serialize env value
- Risk: UI console qua lon
  - Mitigation: tab-based page, backend APIs tach nho, implement theo phase

## Success Criteria

- Admin quan tri AI tu `/dashboard/admin/ai-agent`
- Global/mode/user policy duoc enforced o backend
- Quota override dung tren request thuc
- Tool policy theo role duoc enforced truoc khi query DB
- Health check provider co ket qua ro rang va khong lo secret
- Audit/usage loc duoc theo tool/cache/fallback/error
- Khong mo AI cho `COMPANY`
- Khong co AI ghi DB nghiep vu
