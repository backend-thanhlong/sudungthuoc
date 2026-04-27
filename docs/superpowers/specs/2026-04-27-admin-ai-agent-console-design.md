# Admin AI Agent Console Design

## Context

AI Agent MVP da co cac thanh phan chinh:

- `/api/ai/agent` cho chat va review
- provider adapters Google/OpenAI bang `fetch`
- quota theo `ActivityLog`
- usage/cost estimate logging
- in-memory cache
- dashboard admin `/dashboard/admin/ai-usage`
- `Tro ly AI` trong dashboard
- `AI kiem tra` cho facility reports va facility mappings

Nhu cau tiep theo la cho `ADMIN` quan tri AI Agent tu UI thay vi phu thuoc hoan toan vao env va code hard-code. Huong da chot la DB-backed admin config, nhung secrets van nam trong env.

## Goal

Xay dung `Admin AI Agent Console` de admin co the:

- bat/tat AI toan he thong
- bat/tat chat va review
- cau hinh quota mac dinh theo role va mode
- cau hinh override theo user/co so
- bat/tat tool AI theo role
- xem usage, cost, audit va loi
- kiem tra health cua provider runtime
- van dam bao AI khong ghi DB nghiep vu va khong lo secret

## Non-Goals

Khong lam trong vong dau:

- nhap hoac luu API key trong UI/DB
- tao tool moi tu UI
- custom SQL/script cho tool
- prompt versioning
- workflow phe duyet thay doi policy
- per-user tool policy
- mo AI cho `COMPANY`
- bang `AIUsageLog` rieng neu `ActivityLog` van dap ung duoc dashboard
- AI tu tao/sua/xoa/phe duyet du lieu nghiep vu

## Scope

### Global Settings

Admin cau hinh cac gia tri khong nhay cam:

- `globalEnabled`: bat/tat AI Agent toan he thong
- `chatEnabled`: bat/tat mode chat
- `reviewEnabled`: bat/tat mode review
- `fallbackEnabled`: cho phep fallback ve model manh hon neu provider env da san sang
- quota mac dinh:
  - `ADMIN` chat/ngay
  - `ADMIN` review/ngay
  - `FACILITY` chat/ngay
  - `FACILITY` review/ngay

Provider/model id va API key van doc tu env. DB setting chi dieu khien policy van hanh, khong chua secret.

### User Override

Admin co the cau hinh rieng cho tung user `ADMIN` hoac `FACILITY`:

- `enabled`: `true`, `false`, hoac `null` de inherit global/role policy
- `chatDailyLimit`: quota chat rieng, nullable de inherit default
- `reviewDailyLimit`: quota review rieng, nullable de inherit default
- `allowFallback`: cho phep/chua cho phep fallback rieng, nullable de inherit global
- `note`: ghi chu noi bo

User override duoc uu tien hon default quota. Neu user bi disabled thi `/api/ai/agent` tra 403 truoc khi goi tool/model.

### Tool Policy

Admin bat/tat tool theo role, khong theo user trong vong dau.

Tool policy ap dung cho:

- `ADMIN`
- `FACILITY`

`COMPANY` van bi chan o API route, ke ca khi co row policy.

Danh sach tool lay tu registry code hien co:

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

Neu tool bi tat:

- agent bo qua tool
- response `toolCalls` co status `skipped`
- `warnings` them ma `AI_TOOL_DISABLED:<toolName>`
- ghi metadata vao `ActivityLog`

## Data Model

Them 3 model Prisma nho, khong thay doi bang nghiep vu hien co.

```prisma
model AISetting {
  id          String   @id @default(cuid())
  key         String   @unique
  value       Json
  updatedById String?  @map("updated_by_id")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  @@map("ai_settings")
}

model AIUserPolicy {
  id              String   @id @default(cuid())
  userId          String   @unique @map("user_id")
  enabled         Boolean?
  chatDailyLimit  Int?     @map("chat_daily_limit")
  reviewDailyLimit Int?    @map("review_daily_limit")
  allowFallback   Boolean? @map("allow_fallback")
  note            String?
  updatedById     String?  @map("updated_by_id")
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("ai_user_policies")
}

model AIToolPolicy {
  id          String   @id @default(cuid())
  toolName    String   @map("tool_name")
  role        Role
  enabled     Boolean  @default(true)
  updatedById String?  @map("updated_by_id")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  @@unique([toolName, role])
  @@index([role, enabled])
  @@map("ai_tool_policies")
}
```

Can them relation vao `User`:

```prisma
aiUserPolicy AIUserPolicy?
```

`updatedById` giu dang string de tranh tao them relation admin phuc tap. Audit chi tiet van ghi qua `ActivityLog`.

## Effective Policy Resolution

Tao module moi:

- `src/lib/ai/admin-config.ts`

Module nay cung cap:

- `getAIAdminSettings()`
- `getEffectiveAIPolicy(sessionContext, request)`
- `assertAIEnabledForRequest(policy)`
- `getAIToolPolicyMap(role)`
- `getAIPolicyVersion()`

Thu tu uu tien:

1. Secrets/provider IDs doc tu env.
2. Global DB settings neu co; neu chua co thi dung env/default hien tai.
3. User override neu co.
4. Hard guard trong code:
   - `COMPANY` luon bi chan
   - fallback chi hop le khi request `useFallback=true`
   - fallback chi cho `ADMIN`
   - fallback chi dung neu provider key tu env da san sang

Policy version duoc tinh tu `updatedAt` lon nhat cua `AISetting`, `AIUserPolicy`, `AIToolPolicy`. Cache key cua AI response phai them policy version de khi admin doi policy thi cache cu khong bi dung nham.

## API Design

### Admin Console APIs

Tat ca route dung `requireActiveSessionUser("ADMIN")`.

- `GET /api/admin/ai-agent/settings`
  - tra global settings, provider env status, quota defaults
- `PUT /api/admin/ai-agent/settings`
  - cap nhat global settings va ghi `ActivityLog`
- `GET /api/admin/ai-agent/users`
  - list `ADMIN`/`FACILITY`, policy override, usage hom nay
- `PUT /api/admin/ai-agent/users/[userId]/policy`
  - upsert user override va ghi `ActivityLog`
- `DELETE /api/admin/ai-agent/users/[userId]/policy`
  - xoa override de user inherit default
- `GET /api/admin/ai-agent/tools`
  - list tool registry, role support, current enabled state
- `PUT /api/admin/ai-agent/tools`
  - bulk update enabled theo `toolName + role`
- `POST /api/admin/ai-agent/health-check`
  - test provider bang prompt ngan, max output thap, ghi log health check

### Existing API Changes

`POST /api/ai/agent` can them:

1. Load effective policy sau khi co session va request da normalize.
2. Chan neu global/mode/user disabled.
3. Dung quota effective thay vi chi env.
4. Dung fallback policy effective trong `resolveAIModel`.
5. Truyen tool policy vao `runAITools`.
6. Them policy version vao cache key.

`GET /api/admin/ai-usage` duoc giu lai va mo rong loc theo:

- tool name
- cache hit
- fallback
- error code

## UI Design

Tao trang moi:

- `/dashboard/admin/ai-agent`

Them menu admin:

- `Quan tri AI`

Trang gom cac tab:

### Tong Quan

- tong request 7/14 ngay
- success/error/quota exceeded
- cost estimate
- cache hit
- fallback usage
- top user/co so dung nhieu
- provider status tom tat

### Cau Hinh

- switches: global AI, chat, review, fallback
- quota inputs theo role/mode
- hien provider/model tu env dang active
- canh bao neu fallback bat nhung thieu `OPENAI_API_KEY`

### Nguoi Dung

- bang user `ADMIN`/`FACILITY`
- trang thai AI effective
- quota effective
- usage hom nay
- nut edit override
- nut reset override

### Tools

- matrix tool x role
- switch enabled/disabled
- mo ta ngan tool
- lan chay gan nhat va loi gan nhat neu co trong `ActivityLog`

### Audit

- reuse/move noi dung `/dashboard/admin/ai-usage`
- bo sung filter theo tool, cache, fallback, error code

### Health

- card primary provider
- card fallback provider
- key status: configured/not configured, khong hien gia tri secret
- nut test provider
- ket qua test: latency, status, error code, model

## Runtime Behavior

### Disabled AI

Neu AI bi tat toan he thong:

- route tra 403 `AI_DISABLED`
- UI assistant/review button co the hien disabled state sau khi fetch settings summary
- request bi chan truoc tool/model
- ghi `ActivityLog` status `error`, errorCode `AI_DISABLED`

### Disabled Mode

Neu chat hoac review bi tat:

- route tra 403 `AI_MODE_DISABLED`
- message ro theo mode

### Quota Override

`assertWithinAIQuota` doi sang nhan effective limit:

- user override limit neu co
- default DB setting neu co
- env/default hien tai neu DB chua co

Quota van dem bang `ActivityLog` trong ngay theo `userId + mode`.

### Tool Disabled

Tool registry van la source of truth cho tool name va role. DB policy chi quyet dinh enabled.

Tool bi disabled khong duoc query DB, tranh rui ro quyen va chi phi.

### Health Check

Health check chi gui prompt ngan:

`Tra loi mot cau ngan: OK`

Ket qua khong dua vao cache AI chat. Log health check bang `ActivityLog.action = "AI_AGENT_HEALTH_CHECK"` va `entityType = "ai_agent_health_check"` de tach rieng voi usage AI cua nguoi dung.

## Security

- Chi `ADMIN` duoc truy cap console va APIs.
- Khong luu API key trong DB.
- Khong tra API key ve client.
- Khong cho UI tao tool, prompt system, SQL, hay script.
- User override khong the mo AI cho user inactive.
- Tool policy khong the cap quyen cho `COMPANY`.
- Moi thay doi settings/user policy/tool policy ghi `ActivityLog`.
- AI response van render text/markdown an toan, khong HTML raw.

## Migration And Defaults

Sau migration:

- Seed/default settings tu env/default hien tai:
  - global enabled: true
  - chat enabled: true
  - review enabled: true
  - fallback enabled: theo `AI_ENABLE_FALLBACK`
  - quota theo config hien co
- Tool policies mac dinh enabled cho cac role hien dang duoc code cho phep.
- Khong tao policy cho `COMPANY`.

Neu bang config rong, runtime van fallback ve config env/default de deploy khong bi gay.

## Testing

Can test tu dong:

- `COMPANY` bi chan ke ca DB co policy
- global disabled tra 403 truoc khi goi tool/model
- chat disabled chi chan chat
- review disabled chi chan review
- user override disabled tra 403
- user override quota duoc dung thay default
- disabled tool khong query DB va response co warning
- fallback chi chay khi env key san sang, global/user policy cho phep, role la `ADMIN`, request co `useFallback=true`
- health check khong log secret

Manual test:

- Admin mo `/dashboard/admin/ai-agent`
- Tat global AI, verify assistant/review bi chan
- Bat lai AI, giam quota cua mot facility xuong 1, verify request thu 2 bi 429
- Tat `getSupplyRisk` cho `ADMIN`, hoi cau ve nguy co thieu thuoc, verify tool skipped
- Test provider khi co va khong co API key

## Rollout Plan

### Phase 1

- Prisma models
- effective policy resolver
- settings API
- route integration cho global/mode/quota/fallback
- console tabs `Tong Quan`, `Cau Hinh`, `Audit`, `Health`

### Phase 2

- user override API/UI
- usage hom nay theo user
- reset override

### Phase 3

- tool policy API/UI
- runAITools filter theo role/tool policy
- warnings va audit cho skipped tools

Vong dau cua project gom ca 3 phase tren. Tach phase de implementation de review va rollback de hon, nhung khong day sang milestone sau.

## Acceptance Criteria

- Admin quan tri duoc AI tu `/dashboard/admin/ai-agent`
- Global/mode/user disabled duoc enforced o backend
- Quota effective dung DB override khi co
- Tool policy bat/tat theo role va duoc enforced truoc query DB
- Secrets khong xuat hien trong DB, API response, log, UI
- Existing AI chat/review van hoat dong khi settings default
- Existing `/dashboard/admin/ai-usage` khong mat chuc nang
- `npm run lint` va production build pass sau implementation
