# Drug Order QR Lookup Implementation Plan

## Inputs

Plan nay dua tren:

- Spec da duyet: [2026-04-24-drug-order-qr-lookup-design.md](/opt/sudungthuoc/sudungthuoc/docs/superpowers/specs/2026-04-24-drug-order-qr-lookup-design.md)
- Dashboard nav hien tai: [DashboardLayout.tsx](/opt/sudungthuoc/sudungthuoc/src/components/DashboardLayout.tsx)
- Dashboard route guard: [layout.tsx](/opt/sudungthuoc/sudungthuoc/src/app/dashboard/layout.tsx)
- Middleware role guard: [middleware.ts](/opt/sudungthuoc/sudungthuoc/src/middleware.ts)
- HMAC token pattern tham chieu: [facility-report-token.ts](/opt/sudungthuoc/sudungthuoc/src/lib/facility-report-token.ts)
- Shared authz helper: [server-authz.ts](/opt/sudungthuoc/sudungthuoc/src/lib/server-authz.ts)
- Drug order services:
  - [admin.ts](/opt/sudungthuoc/sudungthuoc/src/lib/drug-orders/admin.ts)
  - [facility.ts](/opt/sudungthuoc/sudungthuoc/src/lib/drug-orders/facility.ts)
  - [company.ts](/opt/sudungthuoc/sudungthuoc/src/lib/drug-orders/company.ts)
  - [utils.ts](/opt/sudungthuoc/sudungthuoc/src/lib/drug-orders/utils.ts)
- Drug order pages:
  - [AdminDrugOrdersPage.tsx](/opt/sudungthuoc/sudungthuoc/src/components/drug-orders/AdminDrugOrdersPage.tsx)
  - [FacilityDrugOrdersPage.tsx](/opt/sudungthuoc/sudungthuoc/src/components/drug-orders/FacilityDrugOrdersPage.tsx)
  - [CompanyDrugOrdersPage.tsx](/opt/sudungthuoc/sudungthuoc/src/components/drug-orders/CompanyDrugOrdersPage.tsx)
- Env template: [.env.docker.example](/opt/sudungthuoc/sudungthuoc/.env.docker.example)

## Goal

Trien khai QR lookup read-only cho `DrugOrder` de:

- moi don co mot QR/deep link tra cuu on dinh
- nguoi dung quet QR vao mot man tra cuu dung chung
- man tra cuu van yeu cau dang nhap va check quyen theo order thuc te
- `ADMIN`, `FACILITY` so huu don, va `COMPANY` cua don xem duoc cung mot payload read-only
- tra cuu duoc bang QR token hoac nhap `Ma don`
- QR tren man chi tiet don san sang tai su dung cho phieu in ve sau

## Delivery Principles

- Khong thay doi schema DB trong `V1`
- Khong dung lai secret cua upload report; QR order co secret rieng
- Khong tai su dung truc tiep loader role-specific cho man lookup, vi cac loader do phuc vu man van hanh va co permissions rieng
- Lookup service la source of truth cho token lookup, manual lookup, authz, va read-only serializer
- QR phai render dang SVG, khong dung canvas-only
- UI lookup khong co thao tac nghiep vu: khong sua, khong phan hoi, khong giao, khong xac nhan nhan
- Tiep tuc ton trong worktree hien tai: module `dutru-dat-hang` dang co nhieu thay doi chua commit, implementation phai merge can than va khong ghi de thay doi khac

## Current Constraints

- `/dashboard/dutru-dat-hang/tra-cuu` khong nam duoi prefix role-specific, nen middleware hien tai khong redirect sai role
- `DashboardLayout` hien co ho tro nav item co `children`, nhung `Dự trù đặt hàng` dang la link phang o ca 3 role
- `package.json` chua co QR rendering dependency
- Cac detail API hien chua tra `lookupUrl`
- Cac detail page la client component va lay detail qua API, nen QR block can nhan URL tu payload detail
- `facility-report-token.ts` da co pattern `base64url(payload).signature` va `timingSafeEqual`, co the lam mau nhung khong nen import dung chung
- Repo khong co test script rieng trong `package.json`; verification tu dong toi thieu la `npm run lint` va `npx tsc --noEmit`

## Target File Surface

### Backend and shared code

- `src/lib/drug-orders/qr-token.ts`
- `src/lib/drug-orders/lookup.ts`
- `src/lib/drug-orders/admin.ts`
- `src/lib/drug-orders/facility.ts`
- `src/lib/drug-orders/company.ts`
- `src/lib/drug-orders/utils.ts` neu can helper format/status dung chung

### Routes and components

- `src/app/dashboard/dutru-dat-hang/tra-cuu/page.tsx`
- `src/components/drug-orders/DrugOrderLookupResult.tsx`
- `src/components/drug-orders/DrugOrderQrCode.tsx`
- `src/components/DashboardLayout.tsx`
- `src/components/drug-orders/AdminDrugOrdersPage.tsx`
- `src/components/drug-orders/FacilityDrugOrdersPage.tsx`
- `src/components/drug-orders/CompanyDrugOrdersPage.tsx`

### Package and environment

- `package.json`
- `package-lock.json`
- `.env.docker.example`

### Docs

- [2026-04-24-drug-order-qr-lookup-design.md](/opt/sudungthuoc/sudungthuoc/docs/superpowers/specs/2026-04-24-drug-order-qr-lookup-design.md)
- [2026-04-24-drug-order-qr-lookup-implementation-plan.md](/opt/sudungthuoc/sudungthuoc/docs/superpowers/plans/2026-04-24-drug-order-qr-lookup-implementation-plan.md)

## Rollout Shape

Scope nay nen trien khai qua 6 phase:

1. `Token and URL foundation`
2. `Lookup service and read-only payload`
3. `Shared QR lookup route`
4. `Dashboard navigation dropdown`
5. `QR block on role-specific detail pages`
6. `Verification and rollout hardening`

Thu tu nay giu critical path ro:

- co token helper truoc khi expose URL
- co lookup service truoc khi render page
- co page lookup truoc khi them nav va QR entry point
- co payload `lookupUrl` truoc khi them QR block vao detail UI

## Phase Breakdown

## Phase 1: Build Token And URL Foundation

### Objective

Them helper tao/verify token QR rieng cho `DrugOrder`, dong thoi chot cach build lookup URL de UI va phieu in sau nay dung cung contract.

### Tasks

1. Tao [qr-token.ts](/opt/sudungthuoc/sudungthuoc/src/lib/drug-orders/qr-token.ts)
2. Dinh nghia constant:
   - `DRUG_ORDER_QR_TOKEN_VERSION = 1`
   - env secret `DRUG_ORDER_QR_SIGNING_SECRET`
   - lookup path base `/dashboard/dutru-dat-hang/tra-cuu`
3. Dinh nghia payload:
   - `orderId: string`
   - `version: number`
4. Implement `createDrugOrderQrToken(orderId: string)`:
   - trim va validate `orderId`
   - encode payload bang `Buffer.from(JSON.stringify(...)).toString("base64url")`
   - ky HMAC SHA-256 bang secret rieng
   - tra `${encodedPayload}.${signature}`
5. Implement `verifyDrugOrderQrToken(token: string)`:
   - reject format sai
   - verify signature bang `timingSafeEqual`
   - parse JSON payload
   - reject version khong ho tro
   - tra payload typed
6. Implement helper URL:
   - `buildDrugOrderLookupPathFromToken(token)`
   - `buildDrugOrderLookupPath(orderId)`
   - optional `buildDrugOrderLookupUrl(orderId, origin)` neu can absolute URL server-side
7. Them `DRUG_ORDER_QR_SIGNING_SECRET=replace-with-another-long-random-string` vao [.env.docker.example](/opt/sudungthuoc/sudungthuoc/.env.docker.example)
8. Khong them fallback insecure khi secret thieu; missing secret phai fail ro o server

### Implementation Notes

- Co the copy pattern tu [facility-report-token.ts](/opt/sudungthuoc/sudungthuoc/src/lib/facility-report-token.ts), nhung tao file rieng de tranh coupling giua report upload va drug order QR
- Token khong can expiry trong `V1`; authz luon check lai tren `DrugOrder`
- Helper URL nen tao path truoc; component QR client co the bien path thanh absolute URL bang `window.location.origin` truoc khi encode vao QR

### Acceptance Criteria

- Token hop le verify duoc thanh `orderId`
- Token sai signature, sai format, sai version bi reject
- QR lookup path co dang `/dashboard/dutru-dat-hang/tra-cuu?t=<token>`
- Secret QR order duoc document trong env template

## Phase 2: Build Lookup Service And Read-Only Payload

### Objective

Tao service dung chung de resolve token/orderNo, check authz, va serialize payload lookup read-only on dinh.

### Tasks

1. Tao [lookup.ts](/opt/sudungthuoc/sudungthuoc/src/lib/drug-orders/lookup.ts)
2. Dinh nghia select Prisma rieng cho lookup:
   - order fields: `id`, `orderNo`, `facilityId`, `companyId`, `status`, `baseReportMonth`, `note`, `submittedAt`, `closedAt`, `createdAt`, `updatedAt`
   - facility summary: `id`, `facilityName`, `facilityCode`
   - company summary: `id`, `name`, `code`
   - lines: drug display fields, requested/accepted qty, status, master/company drug info, shipment/receipt totals
   - shipments: shipment no, status, shipped dates, company note, lines, receipts
3. Implement input modes:
   - `resolveDrugOrderLookupByToken({ token, user })`
   - `resolveDrugOrderLookupByOrderNo({ orderNo, user })`
4. Token mode:
   - verify token
   - load order by `id`
   - token invalid -> throw/return classified `INVALID_TOKEN`
5. Manual mode:
   - trim `orderNo`
   - empty `orderNo` -> return empty state caller can render
   - load order by exact `orderNo`
6. Implement `assertCanViewDrugOrderLookup(order, user)`:
   - `ADMIN`: allow
   - `FACILITY`: allow only when `order.facilityId === user.id`
   - `COMPANY`: allow only when `order.companyId === user.companyId`
   - otherwise throw `RouteError(403, "Bạn không có quyền xem đơn này")`
7. Implement not-found behavior:
   - token points to deleted/missing order -> `RouteError(404, "Không tìm thấy đơn dự trù")`
   - orderNo missing -> same 404 message
8. Serialize lookup payload:
   - overview: order no, facility, company, status, created/submitted/closed times
   - totals: line count, requested, accepted, shipped, received
   - delivery summary label: `Chua giao`, `Dang giao`, `Da nhan mot phan`, `Hoan tat`
   - line rows: display name, company code/name, master drug, unit, requested, accepted, shipped, received, line status
   - shipment history: shipment no, date/range, company note, lines, receipts, reasons
9. Reuse `toNumber` tu [utils.ts](/opt/sudungthuoc/sudungthuoc/src/lib/drug-orders/utils.ts)
10. Neu can format date label, tai su dung helper shipment range hien co hoac tao helper shared nho, khong copy logic khac nhau giua page lookup va detail pages

### Implementation Notes

- Khong import `admin.ts`, `facility.ts`, hoac `company.ts` vao `lookup.ts`
- Khong tra permissions van hanh nhu `canRespond`, `canCreateShipment`, `canEdit`
- Payload lookup nen la object plain JSON-friendly, khong tra Prisma Decimal/Date raw neu component client can dung; server page co the dung Date truc tiep nhung serializer nen ro rang
- Neu page lookup la server component, co the render Date bang helper server-side va giu payload noi bo

### Acceptance Criteria

- Lookup token va lookup orderNo cho cung mot order tra cung payload read-only
- Authz matrix dung cho ca 3 role
- Payload co du tong so va lich su giao/nhan can hien thi
- Khong phu thuoc vao shape payload cua cac man van hanh

## Phase 3: Build Shared QR Lookup Route

### Objective

Them route `/dashboard/dutru-dat-hang/tra-cuu` server-first, ho tro ca QR token va manual lookup theo `Ma don`.

### Tasks

1. Tao route page moi:
   - [page.tsx](/opt/sudungthuoc/sudungthuoc/src/app/dashboard/dutru-dat-hang/tra-cuu/page.tsx)
2. Page server component:
   - goi `requireActiveSessionUser()`
   - doc `searchParams.t`
   - doc `searchParams.orderNo`
   - neu co ca hai, uu tien `t` vi QR deep link phai deterministic
3. Render empty/manual state khi khong co `t` va khong co `orderNo`:
   - heading `Tra cứu QR đơn dự trù`
   - form GET nhap `Ma don`
   - huong dan ngan ve QR lookup
4. Render invalid token state:
   - message `QR không hợp lệ hoặc đã bị thay đổi`
   - khong dump technical error
   - van hien form nhap `Ma don`
5. Render 404 state:
   - message `Không tìm thấy đơn dự trù`
   - van hien form nhap `Ma don`
6. Render 403 state:
   - message `Bạn không có quyền xem đơn này`
   - van hien form nhap `Ma don`
7. Tao component read-only neu page qua lon:
   - [DrugOrderLookupResult.tsx](/opt/sudungthuoc/sudungthuoc/src/components/drug-orders/DrugOrderLookupResult.tsx)
8. UI result gom 4 khoi:
   - thong tin tong quan
   - tong hop giao nhan
   - bang chi tiet thuoc
   - lich su shipment/receipt
9. Dung component UI co san:
   - `Card`
   - `Badge`
   - `Table`
   - `Input`
   - `Button`
   - `Separator` neu can
10. Dam bao page khong co CTA van hanh nao:
   - khong link toi respond/shipment/receipt action
   - neu co link "Ve quan ly don", link theo role hien tai va chi la navigation phu

### Implementation Notes

- Form manual co the la `<form method="GET">` de tranh API/client state rieng
- Page nen bat loi quanh service lookup va map loi thanh UI state thay vi de dashboard error boundary hien stack/dev error
- Route nam duoi `/dashboard`, nen layout hien tai da yeu cau login truoc khi render

### Acceptance Criteria

- Vao route tu menu khi chua co query hien form tra cuu
- URL `?t=<valid-token>` hien order dung neu user co quyen
- URL `?orderNo=<ma-don>` hien order dung neu user co quyen
- Invalid/forbidden/not-found state ro rang va khong lo technical detail

## Phase 4: Convert Drug Order Navigation To Dropdown

### Objective

Doi `Dự trù đặt hàng` thanh dropdown nav o `ADMIN`, `FACILITY`, va `COMPANY` de them entry `Tra cứu QR đơn`.

### Tasks

1. Trong [DashboardLayout.tsx](/opt/sudungthuoc/sudungthuoc/src/components/DashboardLayout.tsx), doi nav item `Dự trù đặt hàng` cua `adminNavItems` thanh parent co children:
   - `Quản lý đơn` -> `/dashboard/admin/dutru-dat-hang`
   - `Tra cứu QR đơn` -> `/dashboard/dutru-dat-hang/tra-cuu`
2. Doi nav item `Dự trù đặt hàng` cua `facilityNavItems` thanh parent:
   - `Quản lý đơn` -> `/dashboard/facility/dutru-dat-hang`
   - `Tra cứu QR đơn` -> `/dashboard/dutru-dat-hang/tra-cuu`
3. Doi nav item `Dự trù đặt hàng` cua `companyNavItems` thanh parent:
   - `Quản lý đơn` -> `/dashboard/company/dutru-dat-hang`
   - `Tra cứu QR đơn` -> `/dashboard/dutru-dat-hang/tra-cuu`
4. Ra soat active state:
   - child active khi `pathname === child.href`
   - neu sau nay co sub-route, co the dung `pathname.startsWith(child.href + "/")`
5. Dam bao icon parent va icon child nhat quan voi cac dropdown san co
6. Manual verify collapsed sidebar khong bi crash khi item co children

### Implementation Notes

- Khong can doi route home `/dashboard/company` dang redirect ve `/dashboard/company/dutru-dat-hang`
- Common lookup route khong co prefix role-specific, nen moi role dung cung href
- Neu can auto-open dropdown khi active child, giu pattern `isChildActive` hien co

### Acceptance Criteria

- Ca 3 role deu thay dropdown `Dự trù đặt hàng`
- `Quản lý đơn` van vao dung man cu
- `Tra cứu QR đơn` vao route lookup dung chung
- Role guard khong redirect sai khi vao `/dashboard/dutru-dat-hang/tra-cuu`

## Phase 5: Add QR Blocks To Role-Specific Detail Pages

### Objective

Hien QR lookup tren man chi tiet don hien co cua admin, facility, va company.

### Tasks

1. Them QR rendering dependency:
   - uu tien `qrcode.react` de render SVG React component trong client pages
   - cap nhat `package.json` va `package-lock.json`
2. Tao component chung:
   - [DrugOrderQrCode.tsx](/opt/sudungthuoc/sudungthuoc/src/components/drug-orders/DrugOrderQrCode.tsx)
3. Component input:
   - `lookupUrl`
   - `orderNo`
   - `size`
4. Component behavior:
   - neu `lookupUrl` la path relative, chuyen thanh absolute URL bang `window.location.origin` truoc khi encode QR
   - render SVG QR
   - hien `Ma don`
   - hien copy ngan `Quét QR để tra cứu tình trạng đơn sau khi đăng nhập`
   - optional hien link text `Mở tra cứu`
5. Cap nhat serializer detail trong [admin.ts](/opt/sudungthuoc/sudungthuoc/src/lib/drug-orders/admin.ts):
   - them `lookupUrl` vao detail payload
   - khong can them vao list summary tru khi UI can
6. Cap nhat serializer detail trong [facility.ts](/opt/sudungthuoc/sudungthuoc/src/lib/drug-orders/facility.ts)
7. Cap nhat serializer detail trong [company.ts](/opt/sudungthuoc/sudungthuoc/src/lib/drug-orders/company.ts)
8. Cap nhat TS interfaces trong:
   - [AdminDrugOrdersPage.tsx](/opt/sudungthuoc/sudungthuoc/src/components/drug-orders/AdminDrugOrdersPage.tsx)
   - [FacilityDrugOrdersPage.tsx](/opt/sudungthuoc/sudungthuoc/src/components/drug-orders/FacilityDrugOrdersPage.tsx)
   - [CompanyDrugOrdersPage.tsx](/opt/sudungthuoc/sudungthuoc/src/components/drug-orders/CompanyDrugOrdersPage.tsx)
9. Chen `DrugOrderQrCode` vao khu chi tiet order:
   - gan thong tin tong quan, khong chen vao bang dong thuoc
   - layout responsive, khong day cac CTA nghiep vu quan trong ra khoi viewport
10. Neu secret QR thieu, detail API se fail khi tao `lookupUrl`; rollout phai dam bao env duoc set truoc khi deploy code nay

### Implementation Notes

- QR block chi can trong detail order, khong can trong list order
- QR value phai la absolute URL khi render SVG de scan tu dien thoai van mo dung site
- Khong expose raw `orderId` rieng trong UI; `lookupUrl` da du de mo lookup
- QR component nen giu visual nhe, khong tao popup/print flow trong `V1`

### Acceptance Criteria

- Admin detail hien QR cho moi don
- Facility detail hien QR cho don cua minh
- Company detail hien QR cho don cua cong ty
- Quet/click QR lookup mo dung common route
- QR SVG sac net va khong phu thuoc canvas

## Phase 6: Verification And Rollout Hardening

### Objective

Dam bao QR lookup dung authz matrix, khong lam vo cac flow van hanh hien co, va co checklist rollout ro rang.

### Tasks

1. Chay dependency install/update lockfile neu can:
   - `npm install qrcode.react`
2. Chay lint:
   - `npm run lint`
3. Chay type-check:
   - `npx tsc --noEmit`
4. Neu repo da co harness test phu hop, them test pure-function cho:
   - token hop le
   - token sai signature
   - token sai version
   - authz matrix `ADMIN` / owned `FACILITY` / wrong `FACILITY` / owned `COMPANY` / wrong `COMPANY`
   - serialize totals shipped/received
5. Neu chua co test harness, khong tao framework moi rieng cho phase nay; bo sung checklist manual va dam bao type/lint clean
6. Manual verification:
   - admin mo QR lookup cua order bat ky
   - facility mo QR lookup cua order minh
   - facility bi chan khi dung token/orderNo cua facility khac
   - company mo QR lookup cua order cong ty minh
   - company bi chan khi dung token/orderNo cua cong ty khac
   - manual lookup theo `Ma don` va QR token tra cung thong tin
   - token bi sua 1 ky tu hien invalid QR
   - order khong ton tai hien not found
   - vao nav lookup khong query hien form empty
   - order o cac status `DRAFT`, `SUBMITTED`, `IN_DELIVERY`, `COMPLETED` hien dung tong hop
   - quet QR khi chua dang nhap -> login -> quay lai lookup URL goc
7. Rollout checklist:
   - set `DRUG_ORDER_QR_SIGNING_SECRET` tren moi truong deploy
   - deploy dependency moi cung code
   - smoke test 3 role sau deploy
   - khong can migration DB

### Acceptance Criteria

- `npm run lint` pass
- `npx tsc --noEmit` pass
- QR lookup khong mo du lieu cho user sai quyen
- Man lookup read-only khong co thao tac nghiep vu
- 3 man detail hien QR va click/scan duoc
- Nav dropdown khong lam mat route quan ly don cu

## Suggested Implementation Order

Lam theo thu tu nay de giam xung dot:

1. Them [qr-token.ts](/opt/sudungthuoc/sudungthuoc/src/lib/drug-orders/qr-token.ts) va env template
2. Them [lookup.ts](/opt/sudungthuoc/sudungthuoc/src/lib/drug-orders/lookup.ts)
3. Tao page `/dashboard/dutru-dat-hang/tra-cuu`
4. Doi `DashboardLayout` sang dropdown `Dự trù đặt hàng`
5. Them dependency QR SVG va component `DrugOrderQrCode`
6. Them `lookupUrl` vao 3 serializer detail
7. Chen QR block vao 3 detail pages
8. Chay lint/type-check va manual authz matrix

## Risks And Mitigations

### 1. QR token secret thieu tren production

Giam thieu bang cach:

- them `DRUG_ORDER_QR_SIGNING_SECRET` vao `.env.docker.example`
- ghi ro rollout checklist phai set secret truoc deploy
- khong fallback insecure khi secret thieu

### 2. QR encode relative URL lam scan ngoai browser khong mo dung

Giam thieu bang cach:

- payload API co the tra path, nhung component QR phai encode absolute URL
- manual test QR bang dien thoai hoac QR scanner that

### 3. Authz lookup bi lech voi man role-specific

Giam thieu bang cach:

- authz lookup chi dua vao `DrugOrder.facilityId` va `DrugOrder.companyId`
- khong dung param role-prefix
- manual test ca token mode va orderNo mode cho wrong role

### 4. Lookup payload copy qua nhieu logic tinh tong

Giam thieu bang cach:

- dong goi tinh total trong `lookup.ts`
- dung `toNumber`
- neu co helper shipment range/status chung, reuse thay vi copy

### 5. Worktree drug-order dang co thay doi lon

Giam thieu bang cach:

- doc diff truoc khi implement tung file
- edit tung khu nho bang patch
- khong format lai toan file lon
- stage/commit rieng phan QR lookup neu can

## Out Of Scope Follow-Ups

Khong lam trong plan nay:

- browser camera scan
- public lookup khong can login
- bang DB quan ly token/revoke/audit scan
- token expiry/rotation
- phieu in moi cho don du tru
- analytics dem luot scan QR
- QR rieng cho tung shipment/receipt

## Definition Of Done

Tinh nang duoc coi la xong khi:

1. `DRUG_ORDER_QR_SIGNING_SECRET` duoc document va code dung secret rieng.
2. `/dashboard/dutru-dat-hang/tra-cuu` tra cuu duoc bang token va `Ma don`.
3. Lookup route yeu cau login va check dung `ADMIN` / owner `FACILITY` / owner `COMPANY`.
4. Sai token, khong tim thay, va sai quyen hien message ro rang.
5. Man lookup hien overview, tong hop giao nhan, bang thuoc, va lich su shipment/receipt.
6. `Dự trù đặt hàng` la dropdown o admin/facility/company voi `Quản lý đơn` va `Tra cứu QR đơn`.
7. 3 man detail order hien QR SVG va link lookup.
8. QR scan/click mo dung common lookup route.
9. Lint va TypeScript pass.
