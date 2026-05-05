# AI Agent Cost-Optimized Design

## Context

Ung dung hien tai la Next.js dashboard cho quan ly su dung thuoc, voi cac vai tro chinh:

- `ADMIN`: So Y te / don vi quan ly, xem va tong hop du lieu toan he thong
- `FACILITY`: co so y te, nhap va theo doi du lieu cua co so minh
- `COMPANY`: cong ty cung ung, nam ngoai pham vi MVP nay

He thong da co cac nen tang can thiet:

- xac thuc va session qua NextAuth
- phan quyen server-side trong `src/lib/server-authz.ts`
- Prisma/Postgres voi du lieu bao cao Xuat-Nhap-Ton, danh muc thuoc, anh xa, LCNT, du tru dat hang
- dashboard va API tong hop theo role
- `ActivityLog` de ghi nhan hanh dong nguoi dung

Muc tieu lan nay la tich hop AI Agent theo huong tiet kiem chi phi nhung van tao gia tri thuc te cho `ADMIN` va `FACILITY`.

## Goal

Xay dung MVP AI Agent de:

- tra loi cau hoi va phan tich du lieu noi bo theo quyen nguoi dung
- kiem tra ho so / du lieu truoc khi nguoi dung gui hoac duyet
- giam thoi gian tra cuu, tong hop, va phat hien bat thuong
- kiem soat chi phi token va han che goi model dat tien
- khong cho AI tu ghi DB trong giai doan dau

Thanh cong khi:

- `ADMIN` hoi duoc cac cau tong hop nhu ton kho, rui ro thieu thuoc, bao cao cham, du lieu bat thuong
- `FACILITY` hoi duoc du lieu cua co so minh va nhan goi y sua loi tren bao cao / anh xa
- moi request AI deu duoc kiem soat quyen, gioi han du lieu, log duoc, va co fallback loi ro rang
- chi phi moi lan hoi nam trong nguong thap nho dung model re mac dinh va rut gon du lieu truoc khi gui sang AI

## Scope

Bao gom:

- them API AI Agent dung chung: `/api/ai/agent`
- them lop model provider gom primary va fallback model
- them tool chi doc du lieu theo role
- them chat/panel AI trong dashboard cho `ADMIN` va `FACILITY`
- them nut `AI kiem tra` trong hai luong dau tien:
  - bao cao Xuat-Nhap-Ton cua co so
  - anh xa danh muc thuoc cua co so
- ghi activity va thong ke su dung AI
- cache cac insight co the tai su dung
- them error handling va guardrails cho cau tra loi

Khong bao gom:

- AI tu tao, sua, xoa, phe duyet du lieu
- AI tu gui bao cao hoac thuc hien thao tac thay nguoi dung
- ho tro `COMPANY` trong MVP
- fine-tune model rieng
- self-host Gemma trong giai doan dau
- RAG tren file tai lieu ngoai he thong
- voice, image, hoac OCR

## Approach Options

### Option 1: AI chat chi doc du lieu

Agent tra loi cau hoi dua tren cac tool doc du lieu da duoc backend gioi han theo role.

Uu diem:

- nhanh
- rui ro thap
- phu hop giai doan dau

Nhuoc diem:

- chua ho tro tot cac thao tac kiem tra theo tung man hinh

### Option 2: AI copilot theo tung man hinh

Them nut AI trong tung module nghiep vu de kiem tra du lieu hien tai.

Uu diem:

- sat workflow
- gia tri ro voi nguoi dung van hanh

Nhuoc diem:

- can tich hop nhieu diem UI/API
- neu lam rieng le de bi trung lap logic AI

### Option 3: Agent trung tam + copilot theo ngu canh

Co mot Agent dung chung trong dashboard, dong thoi cac man hinh quan trong co nut kiem tra AI dung chung cung backend tool va policy.

Uu diem:

- can bang giua toc do MVP va kha nang mo rong
- mot noi kiem soat model, quyen, token, cache, log
- phu hop voi ca hoi dap va kiem tra ho so

Nhuoc diem:

- can thiet ke boundary backend ro ngay tu dau

## Decision

Chon Option 3.

MVP se gom:

- AI chat chi doc cho `ADMIN` va `FACILITY`
- AI kiem tra ho so cho bao cao Xuat-Nhap-Ton va anh xa danh muc thuoc
- model mac dinh re tien
- fallback sang model manh hon khi can
- khong co thao tac ghi DB boi AI

## Model Strategy

### Primary model

Dung `Gemma 4 26B A4B IT` lam model mac dinh qua Gemini API.

Ly do:

- chi phi thap theo free-tier hien hanh cua Gemini API
- toc do tot
- du dung cho tieng Viet, tom tat, phan loai loi, va phan tich du lieu da duoc backend tong hop
- phu hop cho chat va kiem tra ho so o MVP

### Fallback model

Dung model manh hon, cau hinh qua env, vi du `gpt-5.4-mini`, cho cac truong hop:

- nguoi dung yeu cau phan tich nhieu buoc
- can viet bao cao dieu hanh dai hon
- primary model tra loi loi hoac khong du tin cay
- prompt bi danh dau la can reasoning cao

Fallback khong duoc goi mac dinh. Backend phai co rule ro rang de tranh tang chi phi am tham.

### Model routing

De xuat routing:

- `simple_qa`: primary
- `record_review`: primary
- `summary`: primary
- `deep_analysis`: fallback chi khi Phase 2 da bat fallback va user bam `Phan tich sau`
- `executive_report`: fallback chi ap dung cho `ADMIN` trong Phase 2

Tat ca model id va provider key phai cau hinh qua env:

- `AI_PRIMARY_PROVIDER=google`
- `AI_PRIMARY_MODEL=gemma-4-26b-a4b-it`
- `AI_FALLBACK_PROVIDER=openai`
- `AI_FALLBACK_MODEL=gpt-5.4-mini`
- `AI_MAX_OUTPUT_TOKENS=1200`
- `AI_ENABLE_FALLBACK=false` trong giai doan pilot, bat len sau khi da co log chi phi

## Architecture

### High-level flow

1. User mo chat AI hoac bam `AI kiem tra`.
2. Frontend gui request den `/api/ai/agent`.
3. API goi `requireActiveSessionUser()` de lay user that tu DB.
4. Backend xac dinh role, facility, context man hinh, va mode.
5. Agent chi duoc goi cac tool nam trong allowlist cua role.
6. Tool query DB bang Prisma va tra ve du lieu da rut gon.
7. Backend tao prompt ngan gon gom policy, cau hoi, context, va du lieu tool.
8. Model tra loi bang tieng Viet.
9. Backend ghi activity, usage, cache neu phu hop.
10. Frontend hien thi cau tra loi kem canh bao neu la nhan xet tham khao.

### Proposed files

Co the tach theo boundary sau khi implement:

- `src/app/api/ai/agent/route.ts`: API entrypoint
- `src/lib/ai/types.ts`: request/response, tool types, model types
- `src/lib/ai/model-router.ts`: chon primary/fallback model
- `src/lib/ai/providers/google.ts`: Google Gemini adapter
- `src/lib/ai/providers/openai.ts`: OpenAI adapter neu bat fallback
- `src/lib/ai/tools/index.ts`: registry tool theo role
- `src/lib/ai/tools/admin.ts`: tool doc du lieu cho admin
- `src/lib/ai/tools/facility.ts`: tool doc du lieu cho facility
- `src/lib/ai/prompts.ts`: system prompt va response rules
- `src/lib/ai/usage.ts`: tinh va ghi usage/cost estimate
- `src/components/ai/AIAssistantPanel.tsx`: chat/panel dung chung
- `src/components/ai/AIReviewButton.tsx`: nut kiem tra theo man hinh

## API Design

### Request

`POST /api/ai/agent`

```ts
type AIAgentRequest = {
  mode: "chat" | "review";
  message: string;
  surface?: "dashboard" | "facility_reports" | "facility_mappings";
  context?: {
    reportMonth?: string;
    facilityId?: string;
    entityId?: string;
    filters?: Record<string, string | number | boolean | null>;
  };
};
```

Quy tac:

- `FACILITY` khong duoc tu truyen `facilityId` khac co so dang dang nhap
- `ADMIN` duoc truyen `facilityId` de loc, neu khong truyen thi tong hop toan he thong
- `mode=review` bat buoc co `surface`
- `message` gioi han do dai de tranh prompt injection va spam

### Response

```ts
type AIAgentResponse = {
  answer: string;
  mode: "chat" | "review";
  model: string;
  usedFallback: boolean;
  toolCalls: Array<{
    name: string;
    status: "success" | "skipped" | "error";
  }>;
  warnings: string[];
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    estimatedCostUsd?: number;
  };
};
```

## Tool Design

AI khong duoc query DB truc tiep. Model chi duoc nhan ket qua cua tool server-side.

### ADMIN tools

MVP tool de xuat:

- `getDashboardOverview(filters)`: tong quan ky bao cao, so co so, so dong bao cao, tong gia tri ton
- `getSupplyRisk(filters)`: thuoc het hang, nguy co dut gay, ton kho thap
- `getReportSubmissionStatus(reportMonth)`: co so da nop/chua nop
- `getMappingBacklog(filters)`: anh xa dang cho xu ly, bi tu choi, ngoai danh muc
- `getFacilityReportAnomalies(facilityId?, reportMonth?)`: bat thuong tren bao cao

### FACILITY tools

MVP tool de xuat:

- `getMyReportSummary(reportMonth)`: tong quan bao cao cua co so dang dang nhap
- `getMyReportAnomalies(reportMonth)`: dong co ton/xuat/nhap bat thuong
- `getMyMappingIssues()`: anh xa chua duyet, bi tu choi, thieu master drug
- `getMySupplyRisks(reportMonth?)`: thuoc sap thieu hoac het ton

### Review tools

Cho `facility_reports`:

- phat hien ton cuoi am hoac bat thuong
- phat hien `xuat > tonDau + nhap`
- phat hien gia VAT bang 0 voi dong co ton
- phat hien thieu thong tin hop dong neu dong co gia tri lon
- phat hien dong chua anh xa voi master drug

Cho `facility_mappings`:

- phat hien ten thuoc trung/gan trung
- phat hien thieu hoat chat, so dang ky, don vi tinh
- goi y nhom dong can uu tien xu ly
- khong tu dong gan master drug neu chua co logic matching du tin cay

## Permission Model

Tat ca request AI phai dung user dang nhap tu DB, khong tin du lieu role/facility tu client.

Quy tac:

- `ADMIN` co the xem tong hop toan he thong va loc theo co so
- `FACILITY` chi xem du lieu `facilityId` cua chinh user
- `COMPANY` bi tu choi trong MVP voi HTTP 403
- neu user inactive hoac company/facility khong hop le, tu choi theo logic hien co
- moi tool phai nhan `ActiveSessionContext` va tu ap filter role

## Prompt And Response Rules

System prompt can bat buoc:

- tra loi bang tieng Viet
- chi dua ra ket luan dua tren du lieu tool
- neu thieu du lieu thi noi ro thieu du lieu nao
- khong dua tu van y khoa ca nhan hoa
- khong khuyen nghi thay the quy trinh phe duyet chinh thuc
- khong tu nhan da ghi, sua, gui, phe duyet du lieu
- voi review ho so, phai tach:
  - loi can xu ly
  - canh bao nen kiem tra
  - goi y thao tac tiep theo

Response UI nen hien dong nho:

`Noi dung AI chi mang tinh ho tro kiem tra va tong hop. Nguoi dung chiu trach nhiem xac nhan truoc khi thao tac nghiep vu.`

## Data Minimization

Khong gui nguyen bang lon sang model.

Backend phai:

- query co dieu kien theo role va filter
- aggregate truoc bang SQL/Prisma
- cat top N dong bat thuong thay vi gui tat ca dong
- loai bo password hash, token, thong tin dang nhap, va truong khong can thiet
- chi gui ma co so/ten co so khi can cho cau tra loi
- gioi han prompt input theo token budget

De xuat gioi han MVP:

- chat data context toi da 80 records da rut gon
- review report toi da 100 dong bat thuong uu tien cao
- output toi da 1200 tokens
- timeout model 30 giay

## Cost Control

Co che kiem soat chi phi:

- primary model re lam mac dinh
- fallback tat trong pilot; Phase 2 chi goi fallback khi user bam `Phan tich sau`
- cache insight theo key:
  - role
  - user/facility scope
  - surface
  - reportMonth
  - filters hash
  - tool version
- gioi han so request theo user moi ngay
- gioi han output token
- log estimated token va estimated cost
- defer dashboard theo doi chi phi sang Phase 2

Rate limit de xuat:

- `FACILITY`: 30 request/ngay trong pilot
- `ADMIN`: 80 request/ngay trong pilot
- `FACILITY` review: 15 request/ngay trong pilot
- `ADMIN` review: 40 request/ngay trong pilot

## Logging And Audit

MVP can ghi:

- userId
- role
- mode
- surface
- model
- usedFallback
- tool names
- estimated input/output tokens
- estimated cost
- status success/error

MVP khong them bang moi. Ghi usage toi `ActivityLog` voi:

- `action = "AI_AGENT"`
- `entityType = "ai_agent"`
- `details` la JSON string rut gon

Bang rieng `AIUsageLog` chi duoc xem xet trong Phase 3 khi can bao cao chi phi chi tiet hon.

## UI Design

### Dashboard assistant

Them nut `Tro ly AI` tren header dashboard, canh khu vuc notification/account.

Panel can co:

- lich su chat trong phien hien tai
- input cau hoi
- trang thai dang phan tich
- hien warning khi cau tra loi co gioi han du lieu hoac provider loi mot phan
- loi than thien khi het quota hoac model loi

### Contextual review

Trong `FACILITY`:

- trang bao cao Xuat-Nhap-Ton co nut `AI kiem tra`
- trang anh xa danh muc thuoc co nut `AI kiem tra`

Ket qua review nen hien trong panel/dialog:

- loi can xu ly
- canh bao nen kiem tra
- dong du lieu lien quan
- goi y thao tac tiep theo

Khong tao nut `Tu dong sua` trong MVP.

## Error Handling

Backend tra loi on dinh cho cac loi:

- 401: chua dang nhap
- 403: role khong duoc dung AI hoac truy cap sai facility
- 400: request sai mode/surface/context
- 429: vuot quota
- 502: provider AI loi
- 504: provider timeout

Neu provider loi:

- khong retry qua nhieu lan
- khong goi fallback neu fallback dang tat
- tra ve thong bao de nguoi dung thu lai sau
- ghi log loi nhung khong lam hong luong nghiep vu chinh

## Security And Safety

Guardrails can co:

- tool allowlist theo role
- validate input bang schema
- khong cho prompt yeu cau bo qua phan quyen
- khong dua secrets/env/session token vao prompt
- sanitize noi dung user input truoc khi dua vao prompt
- output khong duoc render HTML raw
- audit moi lan AI truy cap du lieu
- khong dung AI de dua khuyen nghi dieu tri cho benh nhan

## Testing

Can test:

- `ADMIN` truy cap duoc tong hop toan he thong
- `FACILITY` khong truy cap duoc facility khac
- `COMPANY` bi chan
- tool review bao cao phat hien dung cac case bat thuong
- tool mapping phat hien dong thieu thong tin
- model router chi dung fallback khi du dieu kien
- provider loi thi API tra error co kiem soat
- quota/rate limit hoat dong
- UI hien loading, empty, error, success
- khong co HTML injection trong cau tra loi

Manual test:

- hoi `Thang 03/2026 co co so nao chua nop bao cao?`
- hoi `Co thuoc nao nguy co thieu trong ky moi nhat?`
- FACILITY hoi `Bao cao cua toi co dong nao bat thuong?`
- bam `AI kiem tra` tren bao cao co dong loi
- bam `AI kiem tra` tren anh xa co dong thieu hoat chat

## Rollout Plan

### Phase 1: Internal pilot

- bat AI cho admin noi bo va mot vai facility
- primary model only
- fallback tat
- quota dung gioi han pilot trong muc Cost Control
- log usage va loi

### Phase 2: Broader MVP

- mo cho tat ca `ADMIN` va `FACILITY`
- bat cache insight
- bat fallback co dieu kien cho `ADMIN`
- bo sung dashboard admin-only de xem usage theo user, role, model, va ngay

### Phase 3: Expansion

- them review cho LCNT va du tru dat hang
- them insight dashboard nang cao
- xem xet `AIUsageLog` rieng
- xem xet self-host Gemma neu co yeu cau du lieu on-prem hoac luong request lon

## Implementation Defaults

Mac dinh cho implementation plan:

- quota pilot dung cac so trong muc Cost Control
- MVP chi ghi `ActivityLog`, khong them `AIUsageLog`
- Phase 1 tat fallback bang `AI_ENABLE_FALLBACK=false`
- Phase 2 chi bat fallback cho `ADMIN`; UI phai co nut `Phan tich sau` de user chu dong goi model manh hon
- `Tro ly AI` dat o header dashboard, canh khu vuc notification/account, mo ra side panel ben phai
- `AI kiem tra` dat trong toolbar cua trang bao cao va trang anh xa facility

## Acceptance Criteria

- co API `/api/ai/agent` chan dung role va context
- `ADMIN` va `FACILITY` dung duoc AI chat theo quyen
- `FACILITY` dung duoc `AI kiem tra` tren bao cao va anh xa
- `COMPANY` khong dung duoc AI trong MVP
- khong co thao tac AI ghi DB nghiep vu
- moi response co model, fallback flag, va mang warnings
- moi request duoc log
- du lieu gui sang model da duoc aggregate/rut gon
- test cover cac rule phan quyen va review chinh
