# Du Tru Dat Hang Module Implementation Plan

## Inputs

Plan nay dua tren:

- Spec da duyet: [2026-04-23-du-tru-dat-hang-module-design.md](/opt/sudungthuoc/sudungthuoc/docs/superpowers/specs/2026-04-23-du-tru-dat-hang-module-design.md)
- Schema hien tai: [schema.prisma](/opt/sudungthuoc/sudungthuoc/prisma/schema.prisma)
- Auth va middleware hien tai: [auth.ts](/opt/sudungthuoc/sudungthuoc/src/auth.ts), [auth.config.ts](/opt/sudungthuoc/sudungthuoc/src/auth.config.ts), [middleware.ts](/opt/sudungthuoc/sudungthuoc/src/middleware.ts), [next-auth.d.ts](/opt/sudungthuoc/sudungthuoc/src/types/next-auth.d.ts)
- Authz helper hien tai: [server-authz.ts](/opt/sudungthuoc/sudungthuoc/src/lib/server-authz.ts)
- Sidebar hien tai: [DashboardLayout.tsx](/opt/sudungthuoc/sudungthuoc/src/components/DashboardLayout.tsx)
- Admin users surfaces hien tai: [page.tsx](/opt/sudungthuoc/sudungthuoc/src/app/dashboard/admin/users/page.tsx), [route.ts](/opt/sudungthuoc/sudungthuoc/src/app/api/admin/users/route.ts)
- Inventory va dashboard data hien tai: [schema.prisma](/opt/sudungthuoc/sudungthuoc/prisma/schema.prisma), [route.ts](/opt/sudungthuoc/sudungthuoc/src/app/api/facility/dashboard/overview/route.ts), [route.ts](/opt/sudungthuoc/sudungthuoc/src/app/api/admin/dashboard/overview/route.ts)
- Notification va audit hien tai: [notifications.ts](/opt/sudungthuoc/sudungthuoc/src/lib/notifications.ts), [activity-log.ts](/opt/sudungthuoc/sudungthuoc/src/lib/activity-log.ts)

## Goal

Trien khai module `Du tru dat hang` thanh mot domain doc lap trong app hien tai, dap ung cac diem da chot:

- `FACILITY` lap du tru va gui don dat hang
- `COMPANY` chi thay module `Du tru dat hang`
- `COMPANY` chi thay va xu ly don cua cong ty minh
- `ADMIN` chi giam sat, tra cuu, thong ke
- `1 don = 1 company`
- `1 facility` co the dat hang cua nhieu cong ty
- ho tro thuoc tu danh muc he thong va danh muc rieng cong ty
- co goi y so luong tu XNT trong giai doan `DRAFT`
- company chi duoc `xac nhan`, `tu choi`, `giao thieu` theo don goc va phai ghi ly do
- cho phep giao `1` hoac `nhieu` dot
- co so xac nhan thuc nhan theo tung dong cua tung dot giao

## Delivery Principles

- Khong tron bang nghiep vu moi vao cum `Mua sam`
- Khong hardcode pilot `1` cong ty vao schema hay auth
- Khong cho `COMPANY` truy cap cac module cu bang cach an menu don thuan; phai chot o middleware, redirect va API ownership
- Uu tien ten model ro nghia de tranh xung dot voi ten chung chung
- Tai su dung nen tang hien co cho auth, notification, activity log, UI primitives, pagination/filter patterns
- Giu tac dong len `ADMIN` va `FACILITY` hien co o muc toi thieu; khong refactor rong cac module khong thuoc scope
- Tach implementation thanh nhieu phase de co the rollout an toan

## Current Constraints

- He thong hien tai moi co `ADMIN` va `FACILITY`; redirect va middleware dang hardcode 2 role
- `DashboardLayout` moi co sidebar cho `admin` va `facility`
- Phan lon route hien tai check role truc tiep qua `session.user.role !== "ADMIN"` hoac `!== "FACILITY"`
- `admin/users` hien chi phuc vu `FACILITY`, chua co `Company` va `COMPANY` user
- Schema hien chua co mo hinh giao dich cho don, dong don, shipment, receipt, hay danh muc cong ty
- Du lieu XNT la theo thang, phu hop cho goi y nhu cau, nhung khong nen duoc xem la rule tu dong chot so dat hang

## Schema Naming Recommendation

De tranh ten qua chung chung trong Prisma va SQL, rollout nen dung ten model ro nghia:

- `Company`
- `CompanyDrug`
- `DrugOrder`
- `DrugOrderLine`
- `DrugOrderShipment`
- `DrugOrderShipmentLine`
- `DrugOrderReceipt`
- `DrugOrderReceiptLine`

Trang thai va enum cung nen dung prefix ro nghia:

- `Role.COMPANY`
- `DrugOrderStatus`
- `DrugOrderLineStatus`
- `DrugOrderLineSourceType`
- `DrugOrderShipmentStatus`

Plan nay se dung bo ten nay thay vi `Order`/`Receipt` chung chung trong spec.

## Target File Structure

### Auth And Routing

- `prisma/schema.prisma`
- `prisma/seed.ts`
- `src/auth.ts`
- `src/auth.config.ts`
- `src/middleware.ts`
- `src/types/next-auth.d.ts`
- `src/lib/server-authz.ts`
- `src/app/page.tsx`
- `src/app/dashboard/page.tsx`
- `src/components/DashboardLayout.tsx`

### Shared Module Runtime

- `src/lib/dutru-dat-hang/types.ts`
- `src/lib/dutru-dat-hang/orders.ts`
- `src/lib/dutru-dat-hang/suggestions.ts`
- `src/lib/dutru-dat-hang/serializers.ts`
- `src/lib/dutru-dat-hang/status.ts`

### Admin Runtime

- `src/app/dashboard/admin/dutru-dat-hang/page.tsx`
- `src/app/api/admin/dutru-dat-hang/route.ts`
- `src/app/api/admin/dutru-dat-hang/[id]/route.ts`
- `src/app/api/admin/companies/route.ts`
- `src/app/api/admin/companies/[id]/route.ts`
- `src/app/api/admin/companies/[id]/reset-password/route.ts`
- `src/app/dashboard/admin/companies/page.tsx`

### Facility Runtime

- `src/app/dashboard/facility/dutru-dat-hang/page.tsx`
- `src/app/api/facility/dutru-dat-hang/route.ts`
- `src/app/api/facility/dutru-dat-hang/[id]/route.ts`
- `src/app/api/facility/dutru-dat-hang/[id]/submit/route.ts`
- `src/app/api/facility/dutru-dat-hang/[id]/recall/route.ts`
- `src/app/api/facility/dutru-dat-hang/[id]/receipts/route.ts`

### Company Runtime

- `src/app/dashboard/company/page.tsx`
- `src/app/dashboard/company/dutru-dat-hang/page.tsx`
- `src/app/api/company/dutru-dat-hang/route.ts`
- `src/app/api/company/dutru-dat-hang/[id]/route.ts`
- `src/app/api/company/dutru-dat-hang/[id]/respond/route.ts`
- `src/app/api/company/dutru-dat-hang/[id]/shipments/route.ts`
- `src/app/api/company/company-drugs/route.ts`
- `src/app/api/company/company-drugs/[id]/route.ts`

### Shared UI

- `src/components/dutru-dat-hang/FacilityDrugOrderPage.tsx`
- `src/components/dutru-dat-hang/CompanyDrugOrderPage.tsx`
- `src/components/dutru-dat-hang/AdminDrugOrderPage.tsx`
- `src/components/dutru-dat-hang/DrugOrderDetailDialog.tsx`
- `src/components/dutru-dat-hang/DrugOrderEditor.tsx`
- `src/components/dutru-dat-hang/ShipmentDialog.tsx`
- `src/components/dutru-dat-hang/ReceiptDialog.tsx`
- `src/components/dutru-dat-hang/CompanyDrugCatalogPage.tsx`

### Docs

- [2026-04-23-du-tru-dat-hang-module-design.md](/opt/sudungthuoc/sudungthuoc/docs/superpowers/specs/2026-04-23-du-tru-dat-hang-module-design.md)
- [2026-04-23-du-tru-dat-hang-module-implementation-plan.md](/opt/sudungthuoc/sudungthuoc/docs/superpowers/plans/2026-04-23-du-tru-dat-hang-module-implementation-plan.md)

## Rollout Shape

Scope nay lon hon mot feature UI don le. De giam risk, rollout nen tach thanh 3 milestone lon:

1. `Foundation`
   - schema
   - auth
   - company route area
   - admin bootstrap cho company/company user
2. `Core workflow`
   - facility draft + submit
   - company respond + shipment
   - facility receipt + completion
3. `Monitoring and hardening`
   - admin monitoring
   - notification
   - activity log
   - regression test matrix

Phan breakdown ben duoi chi tiet hoa cac milestone nay thanh phase implement.

## Phase Breakdown

## Phase 1: Add Schema Foundation And Pilot Bootstrap

### Objective

Mo rong schema de ho tro cong ty, don hang, shipment, receipt va status enums, dong thoi tao duong bootstrap an toan cho pilot.

### Tasks

1. Cap nhat `Role` trong [schema.prisma](/opt/sudungthuoc/sudungthuoc/prisma/schema.prisma):
   - them `COMPANY`
2. Them model `Company`
3. Them `companyId` nullable vao `User`
4. Them quan he:
   - `User.company -> Company`
   - `Company.users`
5. Them model:
   - `CompanyDrug`
   - `DrugOrder`
   - `DrugOrderLine`
   - `DrugOrderShipment`
   - `DrugOrderShipmentLine`
   - `DrugOrderReceipt`
   - `DrugOrderReceiptLine`
6. Them enums:
   - `DrugOrderStatus`
   - `DrugOrderLineStatus`
   - `DrugOrderLineSourceType`
   - `DrugOrderShipmentStatus`
7. Dat unique/index cho:
   - unique: `Company.code`
   - index: `User.companyId`
   - `DrugOrder.orderNo`
   - `DrugOrder(facilityId, companyId, status, createdAt)`
   - `DrugOrderLine(orderId, lineStatus)`
   - `DrugOrderShipment(orderId, shippedAt)`
8. Dat foreign key va on-delete ro rang, uu tien `Cascade` cho bang con nghiep vu, `SetNull` neu hop voi `masterDrugId`
9. Cap nhat `prisma/seed.ts`:
   - giu seed hien co cho `ADMIN`/`FACILITY`
   - them opt-in seed cho `Company` va `COMPANY` user mau de phuc vu dev/test
10. Chay `prisma generate` va kiem tra schema compile duoc

### Implementation Notes

- `DrugOrder` nen co `baseReportMonth` de track ky XNT tham chieu khi tao draft
- `DrugOrderLine` nen luu snapshot `suggestedQty`, `suggestionBasis`, `suggestionReportMonth`, `suggestionRuleVersion`
- `CompanyDrug.masterDrugId` la nullable de ho tro thuoc rieng cong ty
- `DrugOrderShipmentLine` va `DrugOrderReceiptLine` phai track ro lien ket ve dong don goc
- `User.companyId` chi nen la index thuong, khong nen la unique constraint; quy uoc `V1 = 1 company = 1 user` se duoc enforce o admin company bootstrap layer de tranh khoa chet kha nang mo rong nhieu user/company sau nay

### Acceptance Criteria

- Schema tao duoc du lieu cho `1` hoac nhieu cong ty
- Khong co hardcode pilot `1` cong ty trong model
- `FACILITY` va `ADMIN` cu van hop le sau khi them `companyId`

## Phase 2: Extend Auth, Session, Redirects And Route Guards

### Objective

Day role `COMPANY` xuyen suot auth flow, redirect flow va route protection, nhung khong pha vo `ADMIN` va `FACILITY` hien co.

### Tasks

1. Cap nhat [auth.ts](/opt/sudungthuoc/sudungthuoc/src/auth.ts):
   - return them `companyId`
   - dat `name` hop ly cho `COMPANY` user tu `company.name` hoac `username`
2. Cap nhat [auth.config.ts](/opt/sudungthuoc/sudungthuoc/src/auth.config.ts):
   - dua `companyId` vao JWT va session
3. Cap nhat [next-auth.d.ts](/opt/sudungthuoc/sudungthuoc/src/types/next-auth.d.ts):
   - them `companyId`
4. Cap nhat [middleware.ts](/opt/sudungthuoc/sudungthuoc/src/middleware.ts):
   - redirect `COMPANY` vao `/dashboard/company`
   - chan `COMPANY` khoi `dashboard/admin` va `dashboard/facility`
   - chan `ADMIN`/`FACILITY` khoi `dashboard/company`
5. Cap nhat [page.tsx](/opt/sudungthuoc/sudungthuoc/src/app/page.tsx) va [dashboard/page.tsx](/opt/sudungthuoc/sudungthuoc/src/app/dashboard/page.tsx):
   - role-aware redirect cho `COMPANY`
6. Cap nhat [server-authz.ts](/opt/sudungthuoc/sudungthuoc/src/lib/server-authz.ts):
   - helper `requireActiveSessionUser("COMPANY")`
   - helper ownership cho company resources theo `companyId`
   - redirect helper cho `/dashboard/company`
7. Ra soat cac route protection chung de dam bao `COMPANY` khong lo vao route cu bang URL truc tiep

### Acceptance Criteria

- `COMPANY` dang nhap xong vao dung `/dashboard/company`
- `FACILITY` va `ADMIN` redirect giu nguyen hanh vi cu
- `COMPANY` khong vao duoc route cu bang URL truc tiep

## Phase 3: Add Company Bootstrap Surfaces For Admin

### Objective

Cho phep khoi tao company va tai khoan company mot cach van hanh duoc trong app, thay vi phai can thiep tay vao DB moi lan.

### Tasks

1. Tao admin APIs:
   - `GET /api/admin/companies`
   - `POST /api/admin/companies`
   - `PATCH /api/admin/companies/[id]`
2. Mo hinh tao company trong `POST`:
   - tao `Company`
   - tao `COMPANY` user duy nhat cho company o `V1`
   - validate uniqueness cho `company.code` va `username`
3. Tao trang admin:
   - `/dashboard/admin/companies`
4. UI can co:
   - list company
   - tao company
   - sua thong tin company
   - active/inactive company
   - reset password cho company user
5. Cap nhat menu admin them entry `Companies` trong khu cai dat hoac module moi
6. Giu page `admin/users` hien tai tap trung cho `FACILITY`, khong nhoi company vao cung bang neu khong can thiet

### Recommendation

Khong mo rong `admin/users` de xu ly ca `FACILITY` va `COMPANY` trong cung rollout dau tien. Mot `Companies` page nho, tach scope, se ro hon va giam regression cho trang users hien co.

### Acceptance Criteria

- `ADMIN` tao duoc company va company login trong app
- `COMPANY` user luon gan dung `companyId`
- Khong can thao tac tay DB cho pilot

## Phase 4: Build Company Route Area And Minimal Company Shell

### Objective

Tao vung lam viec rieng cho `COMPANY` chi gom module `Du tru dat hang`.

### Tasks

1. Tao `/dashboard/company/page.tsx`
2. Tao `/dashboard/company/dutru-dat-hang/page.tsx`
3. Mo rong [DashboardLayout.tsx](/opt/sudungthuoc/sudungthuoc/src/components/DashboardLayout.tsx):
   - them `companyNavItems`
   - `COMPANY` chi co module `Du tru dat hang`
4. Dam bao dropdown profile, doi mat khau, dang xuat van dung duoc cho company
5. Khong hien bat ky nav item nao thuoc:
   - `mua-sam`
   - `reports`
   - `inventory-search`
   - `master-drugs`
   - `mappings`
   - `users`

### Acceptance Criteria

- Company shell co menu duy nhat cho module moi
- Company khong nhin thay menu cua he thong cu
- Login UX cho company thong nhat voi app hien tai

## Phase 5: Build Shared Domain Helpers For Orders, Status And Suggestions

### Objective

Tao tang server-side dung chung de tranh lap logic giua `FACILITY`, `COMPANY`, `ADMIN`.

### Tasks

1. Tao `src/lib/dutru-dat-hang/status.ts`
   - helper tinh `DrugOrderStatus`
   - helper tinh remaining accepted qty
   - helper tinh completed/partial state cho line
2. Tao `src/lib/dutru-dat-hang/suggestions.ts`
   - resolve `MasterDrug` tu `masterDrugId` hoac `CompanyDrug.masterDrugId`
   - load `InventoryReport` 3 thang gan nhat
   - tinh `suggestedQty`
   - tra ve `suggestionBasis`
3. Tao `src/lib/dutru-dat-hang/orders.ts`
   - parse list filters
   - list serialization
   - detail loader
   - ownership-aware query helpers
4. Tao `src/lib/dutru-dat-hang/serializers.ts`
   - serialize list/detail payload cho 3 role
   - normalize decimal -> number
5. Them helper generate `orderNo`
6. Them validation helpers:
   - line source validation
   - company ownership validation
   - shipment quantity guard
   - receipt quantity guard

### Acceptance Criteria

- Logic tinh status va goi y khong bi duplicate o nhieu route
- `FACILITY`, `COMPANY`, `ADMIN` dung chung mot domain layer

## Phase 6: Build Company Drug Catalog Management

### Objective

Cho `COMPANY` tu quan ly danh muc thuoc cong ty trong chinh module cua minh.

### Tasks

1. Tao APIs:
   - `GET /api/company/company-drugs`
   - `POST /api/company/company-drugs`
   - `PATCH /api/company/company-drugs/[id]`
   - `DELETE` hoac soft deactivate neu can
2. Ho tro hai truong hop:
   - gan `CompanyDrug` voi `MasterDrug`
   - tao thuoc rieng cua company khong co `MasterDrug`
3. UI company catalog can co:
   - list
   - search
   - loc `da map master drug` / `thuoc rieng`
   - create/edit/deactivate
4. Tai route company, dua catalog vao cung module `Du tru dat hang` nhu mot tab/phu luc, khong tao them domain khac
5. Khi company xu ly line `PENDING_CATALOG_CONFIRMATION`, cho phep:
   - link sang `MasterDrug` neu company co cung ung
   - tao hoac lien ket `CompanyDrug`
   - hoac tu choi dong voi ly do

### Acceptance Criteria

- Company tu quan ly duoc danh muc cua minh
- Company catalog phuc vu duoc ca thuoc he thong va thuoc rieng
- Khong can mo quyen company sang module `Master drugs`

## Phase 7: Implement Facility Draft, Suggestion And Submit Flow

### Objective

Cho `FACILITY` tao draft, nhan goi y tu XNT, sua requested qty va gui don.

### Tasks

1. Tao APIs facility:
   - `GET /api/facility/dutru-dat-hang`
   - `POST /api/facility/dutru-dat-hang`
   - `GET /api/facility/dutru-dat-hang/[id]`
   - `PATCH /api/facility/dutru-dat-hang/[id]`
   - `POST /api/facility/dutru-dat-hang/[id]/submit`
   - `POST /api/facility/dutru-dat-hang/[id]/recall`
2. Xay page `/dashboard/facility/dutru-dat-hang`
3. UI list can co:
   - filter theo company
   - filter theo status
   - search theo ma don
4. UI draft editor can co:
   - chon company
   - them dong tu `MasterDrug`
   - them dong tu `CompanyDrug`
   - hien `suggestedQty`
   - cho sua `requestedQty`
   - hien ly do neu line dang `PENDING_CATALOG_CONFIRMATION`
5. Rule submit:
   - phai co it nhat mot line hop le
   - khong cho submit neu `companyId` trong
   - sau submit, khoa noi dung
6. Rule recall:
   - chi cho recall truoc khi company bat dau phan hoi
7. Notification:
   - gui thong bao den company khi co don moi
8. Activity log:
   - `CREATE`, `UPDATE`, `SUBMIT`, `RECALL`

### Acceptance Criteria

- Facility tao va gui duoc don cho bat ky company dang active
- Goi y tu XNT chi la tham khao, khong khoa `requestedQty`
- Don bi khoa sau khi submit

## Phase 8: Implement Company Response Flow On Submitted Orders

### Objective

Cho `COMPANY` phan hoi tung dong ma khong sua noi dung don goc.

### Tasks

1. Tao APIs company:
   - `GET /api/company/dutru-dat-hang`
   - `GET /api/company/dutru-dat-hang/[id]`
   - `POST /api/company/dutru-dat-hang/[id]/respond`
2. List page company can co:
   - filter theo status
   - filter theo facility
   - search theo ma don
3. Detail page/dialog company can co:
   - thong tin facility
   - thong tin tung line
   - `requestedQty`
   - line source
   - master/company drug context
4. Company response form cho tung line:
   - `CONFIRMED`
   - `PARTIAL`
   - `REJECTED`
   - nhap ly do bat buoc cho moi case
   - nhap accepted qty khi `PARTIAL`
5. Xu ly line `PENDING_CATALOG_CONFIRMATION`:
   - xac nhan company co cung ung va tao/lien ket `CompanyDrug`
   - hoac tu choi line
6. Tinh lai order status:
   - all rejected -> `REJECTED`
   - con accepted qty -> `READY_FOR_SHIPMENT`
7. Notification:
   - thong bao cho facility khi company phan hoi xong
8. Activity log:
   - `UPDATE` line response
   - `REJECT` don neu can

### Hard Constraints

- Company khong duoc sua `requestedQty`
- Company khong duoc sua company cua don
- Company khong duoc xu ly don khong thuoc `companyId` cua minh

### Acceptance Criteria

- Company chi phan hoi tren don goc
- Moi line response co ly do
- Don vao dung status sau khi company xu ly

## Phase 9: Implement Shipment Flow

### Objective

Cho `COMPANY` tao `1` hoac nhieu dot giao trong pham vi so luong da chap nhan.

### Tasks

1. Tao API:
   - `POST /api/company/dutru-dat-hang/[id]/shipments`
   - `GET` shipments trong detail order payload
2. Shipment dialog can cho:
   - chon cac line co accepted qty con lai
   - nhap `shippedQty` tung line
   - ghi `reason`
   - dat `shippedAt`
3. Validate:
   - `shippedQty > 0`
   - tong da ship cua mot line khong vuot accepted qty
4. Support nhieu dot giao:
   - shipment numbering
   - remaining quantity sau moi dot
5. Cap nhat order status sang `IN_DELIVERY` khi co shipment dau tien
6. Notification:
   - thong bao den facility khi co shipment moi
7. Activity log:
   - `CREATE shipment`

### Acceptance Criteria

- Company tao duoc nhieu dot giao
- Khong dot nao vuot so luong da chap nhan
- Facility nhin thay lich su giao tung dot

## Phase 10: Implement Facility Receipt Confirmation And Completion

### Objective

Cho `FACILITY` xac nhan thuc nhan theo tung dong va dong don khi da nhan du.

### Tasks

1. Tao API:
   - `POST /api/facility/dutru-dat-hang/[id]/receipts`
2. Receipt form can cho:
   - chon shipment can xac nhan
   - nhap `receivedQty` theo tung shipment line
   - nhap `differenceReason` neu co chenh lech
3. Validate:
   - shipment thuoc don cua facility
   - `receivedQty >= 0`
   - neu chenh lech voi `shippedQty` thi ly do bat buoc
4. Tinh remaining fulfilled qty sau moi receipt
5. Neu tat ca accepted qty da duoc receipt day du, cap nhat:
   - line status phu hop
   - order status `COMPLETED`
   - `closedAt`
6. Notification:
   - thong bao cho company ve receipt va completion
7. Activity log:
   - `CONFIRM receipt`

### Acceptance Criteria

- Facility xac nhan nhan hang duoc theo tung dong
- Chenh lech giua ship va receipt luon co ly do
- Don tu dong dong khi da receipt du so luong da chap nhan

## Phase 11: Build Admin Monitoring And Reporting Surfaces

### Objective

Cho `ADMIN` giam sat module ma khong tham gia xu ly nghiep vu.

### Tasks

1. Tao APIs admin:
   - `GET /api/admin/dutru-dat-hang`
   - `GET /api/admin/dutru-dat-hang/[id]`
2. Tao page `/dashboard/admin/dutru-dat-hang`
3. UI admin can co:
   - filter theo facility
   - filter theo company
   - filter theo status
   - filter theo khoang thoi gian
   - summary cards
   - list + detail timeline
4. Summary metric goi y:
   - tong so don
   - tong so line
   - tong so luong requested
   - tong so luong accepted
   - tong so luong shipped
   - tong so luong received
   - so don dang mo
   - so don completed
5. Khong render hanh dong xu ly don cho admin
6. Cap nhat menu admin them entry module moi

### Acceptance Criteria

- Admin xem duoc toan bo workflow
- Admin khong co hanh dong write tren don
- Monitoring khong duplicate logic xu ly tu company/facility

## Phase 12: Expand Notification, Audit Labels And Final Hardening

### Objective

Dong bo notification, activity log, empty states, error messages va test matrix de feature san sang rollout.

### Tasks

1. Cap nhat [notifications.ts](/opt/sudungthuoc/sudungthuoc/src/lib/notifications.ts) cho cac event moi
2. Cap nhat [activity-log.ts](/opt/sudungthuoc/sudungthuoc/src/lib/activity-log.ts):
   - them entity types:
     - `company`
     - `company_drug`
     - `drug_order`
     - `drug_order_shipment`
     - `drug_order_receipt`
3. Chuẩn hoá error message nghiep vu ro nghia
4. Them empty states cho:
   - company chua co don
   - facility chua co draft/don
   - company chua co catalog
5. Chay kiem tra:
   - `npx eslint` tren file thay doi
   - `npx tsc --noEmit --pretty false`
   - flow test role redirects
   - flow test ownership
   - flow test create/respond/ship/receipt/complete
6. Kiem tra manual regression cho:
   - login admin
   - login facility
   - inventory reports
   - mua-sam pages
   - admin users page

### Acceptance Criteria

- Notification va audit bao phu workflow moi
- Error messages du cu the de van hanh
- `ADMIN` va `FACILITY` cu khong bi regression ro rang

## Suggested Delivery Order

Neu can chia rollout thanh cac PR nho, thu tu nen la:

1. `schema + auth + company bootstrap`
2. `company shell + company catalog`
3. `facility draft + suggestions + submit`
4. `company response + shipments`
5. `facility receipts + completion`
6. `admin monitoring + notifications + audit + hardening`

Thu tu nay giu critical path ro rang:

- co company truoc
- co catalog truoc khi company xu ly line pending catalog
- co draft/submit truoc khi co shipment/receipt

## Success Criteria

- App ho tro them `COMPANY` ma khong pha vo login/redirect hien co
- Company chi thay module `Du tru dat hang`
- Company chi xu ly duoc don cua chinh company minh
- Facility tao duoc nhieu don cho nhieu company khac nhau
- Moi don chi thuoc dung `1` company
- Goi y so luong tu XNT hien thi dung va luu snapshot
- Company khong sua noi dung don goc
- Shipment ho tro `1` va `nhieu` dot
- Facility xac nhan receipt theo tung dong
- Admin chi giam sat

## Risks And Mitigations

- Risk: role `COMPANY` lam vo redirect cu
  - Mitigation: chot Phase 2 som, test login va route protection truoc khi vao workflow
- Risk: scope company bootstrap lam phinh qua muc
  - Mitigation: gioi han `V1` o `1 company = 1 user`, tach page `Companies` nho, khong generic hoa trang `Users`
- Risk: status logic order/line/shipment/receipt de roi vao state sai
  - Mitigation: gom toan bo transition vao shared domain helpers, tranh tinh tay o tung route
- Risk: shipment/receipt quantity sai do cong don khong dung
  - Mitigation: validate tren server dua vao aggregate remaining qty, khong tin payload client
- Risk: suggestion logic tu XNT gay ky vong qua muc
  - Mitigation: hien ro day la `goi y`, luu `suggestionBasis`, khong tu dong khoa `requestedQty`

## Out Of Scope After This Plan

Nhung muc sau khong nam trong rollout nay:

- bang gia va chinh sach thuong mai
- hop dong mua ban
- cong no va hoa don
- nhieu user moi company
- whitelist facility-company
- SLA giao hang
- doi soat tai chinh
