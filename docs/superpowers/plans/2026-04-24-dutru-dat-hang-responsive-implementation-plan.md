# Du Tru Dat Hang Responsive Implementation Plan

## Inputs

Plan nay dua tren:

- Spec da duyet: [2026-04-24-dutru-dat-hang-responsive-design.md](/opt/sudungthuoc/sudungthuoc/docs/superpowers/specs/2026-04-24-dutru-dat-hang-responsive-design.md)
- Dashboard shell hien tai: [DashboardLayout.tsx](/opt/sudungthuoc/sudungthuoc/src/components/DashboardLayout.tsx)
- Facility order page: [FacilityDrugOrdersPage.tsx](/opt/sudungthuoc/sudungthuoc/src/components/drug-orders/FacilityDrugOrdersPage.tsx)
- Facility catalog dialog: [FacilityDrugOrderCatalogDialog.tsx](/opt/sudungthuoc/sudungthuoc/src/components/drug-orders/FacilityDrugOrderCatalogDialog.tsx)
- Company order page: [CompanyDrugOrdersPage.tsx](/opt/sudungthuoc/sudungthuoc/src/components/drug-orders/CompanyDrugOrdersPage.tsx)
- Admin order page: [AdminDrugOrdersPage.tsx](/opt/sudungthuoc/sudungthuoc/src/components/drug-orders/AdminDrugOrdersPage.tsx)
- QR and lookup display components:
  - [DrugOrderQrCode.tsx](/opt/sudungthuoc/sudungthuoc/src/components/drug-orders/DrugOrderQrCode.tsx)
  - [DrugOrderLookupResult.tsx](/opt/sudungthuoc/sudungthuoc/src/components/drug-orders/DrugOrderLookupResult.tsx)
- Shared UI primitives:
  - [button.tsx](/opt/sudungthuoc/sudungthuoc/src/components/ui/button.tsx)
  - [card.tsx](/opt/sudungthuoc/sudungthuoc/src/components/ui/card.tsx)
  - [dialog.tsx](/opt/sudungthuoc/sudungthuoc/src/components/ui/dialog.tsx)
  - [table.tsx](/opt/sudungthuoc/sudungthuoc/src/components/ui/table.tsx)

## Goal

Trien khai responsive sau cho module `Du tru dat hang` theo huong:

- desktop giu trai nghiem hien tai o muc toi da
- phone va tablet co UI rieng de dung day du nghiep vu
- ca 3 vai tro `FACILITY`, `COMPANY`, `ADMIN` deu thao tac duoc tren mobile/tablet
- khong thay doi API, schema, status workflow, hay permission rules

## Delivery Principles

- Giu source of truth trong state/handlers hien co, khong copy business logic sang mobile
- Tach component mobile thanh presentation components nho khi markup qua dai
- Desktop UI duoc bao ve bang render branch rieng, khong "nhun" qua nhieu class responsive vao bang hien tai
- Dung breakpoint `xl` lam ranh gioi chinh giua desktop va mobile/tablet trong module:
  - `xl` tro len: desktop views hien tai
  - duoi `xl`: mobile/tablet views moi
- Dashboard shell cung can coi tablet landscape `1024px` la mobile/tablet shell, tranh sidebar fixed chiem ngang
- Tiep tuc ton trong worktree hien tai: nhieu file module `dutru-dat-hang` dang co thay doi chua commit, implementation phai merge can than va khong revert thay doi khac

## Current Constraints

- `DashboardLayout` hien dung sidebar fixed va `pl-64`/`pl-20` cho main content
- `FacilityDrugOrdersPage.tsx`, `CompanyDrugOrdersPage.tsx`, va `AdminDrugOrdersPage.tsx` deu la client components lon
- Bang va dialog desktop da duoc dung cho nghiep vu phuc tap; can giu lai de tranh regression
- `TableCell` mac dinh `whitespace-nowrap`, nen khong phu hop lam UI mobile chinh
- Facility catalog dialog da full-screen nhung noi dung ben trong van la bang rong `min-w`
- Company response va shipment dialogs co nhieu form rows; mobile can card flow rieng
- Repo chua co test e2e san; verification chinh la lint/build va manual viewport regression

## Target File Surface

### Shared layout and mobile primitives

- `src/components/DashboardLayout.tsx`
- `src/components/drug-orders/DrugOrderMobileActionBar.tsx`
- `src/components/drug-orders/DrugOrderSummaryCard.tsx`
- `src/components/drug-orders/DrugOrderLineMobileCard.tsx`
- `src/components/drug-orders/DrugOrderShipmentMobileCard.tsx`
- `src/components/drug-orders/DrugOrderMobileSectionTabs.tsx`
- `src/components/drug-orders/DrugOrderMobileFilterPanel.tsx`

File names co the dieu chinh khi implement neu pattern code thuc te yeu cau. Muc tieu la tach presentation, khong tach nghiep vu.

### Facility

- `src/components/drug-orders/FacilityDrugOrdersPage.tsx`
- `src/components/drug-orders/FacilityDrugOrderCatalogDialog.tsx`
- optional: `src/components/drug-orders/FacilityDrugOrderMobileView.tsx`
- optional: `src/components/drug-orders/FacilityDrugOrderCatalogMobileList.tsx`

### Company

- `src/components/drug-orders/CompanyDrugOrdersPage.tsx`
- optional: `src/components/drug-orders/CompanyDrugOrderMobileView.tsx`
- optional: `src/components/drug-orders/CompanyDrugOrderResponseMobileFlow.tsx`
- optional: `src/components/drug-orders/CompanyDrugOrderShipmentMobileFlow.tsx`
- optional: `src/components/drug-orders/CompanyDrugCatalogMobileView.tsx`

### Admin

- `src/components/drug-orders/AdminDrugOrdersPage.tsx`
- optional: `src/components/drug-orders/AdminDrugOrdersMobileView.tsx`

### Docs

- [2026-04-24-dutru-dat-hang-responsive-design.md](/opt/sudungthuoc/sudungthuoc/docs/superpowers/specs/2026-04-24-dutru-dat-hang-responsive-design.md)
- [2026-04-24-dutru-dat-hang-responsive-implementation-plan.md](/opt/sudungthuoc/sudungthuoc/docs/superpowers/plans/2026-04-24-dutru-dat-hang-responsive-implementation-plan.md)

## Rollout Shape

Scope nay nen trien khai qua 7 phase:

1. `Responsive dashboard shell`
2. `Shared mobile primitives`
3. `Facility mobile/tablet order flow`
4. `Facility mobile/tablet catalog and receipt flows`
5. `Company mobile/tablet order and action flows`
6. `Admin mobile/tablet monitoring flow`
7. `Verification, cleanup, and desktop regression`

Thu tu nay giu rui ro thap:

- shell responsive phai dung truoc vi moi page nam duoi layout nay
- shared primitives giam lap markup giua 3 vai tro
- facility lam truoc vi la workflow nhap lieu co nhieu diem mobile nhat
- company tiep theo vi co response/shipment/catalog flows
- admin sau cung vi chu yeu read/monitoring

## Phase 1: Responsive Dashboard Shell

### Objective

Chuyen dashboard shell sang dung duoc tren phone/tablet ma khong pha desktop sidebar hien tai.

### Tasks

1. Cap nhat [DashboardLayout.tsx](/opt/sudungthuoc/sudungthuoc/src/components/DashboardLayout.tsx) de co 2 navigation branches:
   - desktop sidebar: chi hien `xl:block`
   - mobile/tablet drawer: hien duoi `xl`
2. Them state rieng cho mobile drawer, vi du `mobileNavOpen`
3. Giu `sidebarOpen` cho desktop collapsed/expanded behavior hien co
4. Mobile/tablet header:
   - nut menu mo drawer
   - title ngan, wrap/truncate an toan
   - notification bell
   - account dropdown
5. Desktop header:
   - giu markup va behavior hien tai nhieu nhat co the
6. Main content:
   - duoi `xl`: khong co left padding sidebar
   - `xl` tro len: giu `pl-64` hoac `pl-20` theo `sidebarOpen`
7. Main padding:
   - duoi `md`: `p-3` hoac `p-4`
   - `md` den duoi `xl`: `p-4`
   - `xl` tro len: giu `p-6`
8. Mobile drawer nav:
   - reuse `navItems`
   - ho tro children dropdown nhu desktop
   - dong drawer khi click link
   - co overlay de close khi click ben ngoai
9. Dam bao print route van bypass layout nhu hien tai

### Acceptance Criteria

- Phone/tablet khong con bi sidebar fixed chiem ngang
- Desktop van co sidebar collapse/expand nhu truoc
- Nav children cua `Du tru dat hang` van truy cap duoc o ca desktop va mobile/tablet
- Print route khong bi anh huong

## Phase 2: Shared Mobile Primitives

### Objective

Tao cac component presentation nho de mobile views cua 3 vai tro dung chung pattern ma khong copy business logic.

### Tasks

1. Tao `DrugOrderMobileActionBar`:
   - sticky bottom
   - nhan list actions `{ label, icon, disabled, loading, variant, onClick }`
   - ho tro primary actions hien truc tiep va overflow actions trong menu neu qua nhieu
   - them bottom safe-area padding
2. Tao `DrugOrderSummaryCard`:
   - dung cho order list cards
   - nhan slots/props cho title, subtitle, status badge, metrics, warnings
3. Tao `DrugOrderLineMobileCard`:
   - dung cho facility/admin line display
   - support optional editable quantity, suggested quantity, action buttons, validation message
   - khong tu format domain-specific qua sau; page truyen label/value da resolve
4. Tao `DrugOrderShipmentMobileCard`:
   - dung cho shipment timeline va receipt display
   - co slot/list cho shipment lines
5. Tao `DrugOrderMobileSectionTabs`:
   - segmented tabs cho `Tong quan`, `Thuoc`, `Giao nhan`, `Ghi chu`, tuy page
   - optional sticky top trong detail view neu can
6. Tao `DrugOrderMobileFilterPanel`:
   - collapsible/filter sheet pattern don gian
   - nhan children form controls
   - hien active filter count neu page cung cap
7. Kiem tra cac component nay:
   - khong fetch data
   - khong import service/API
   - khong hard-code role permission
   - khong phu thuoc vao page-specific types neu tranh duoc

### Acceptance Criteria

- Co bo primitives du de xay mobile views ma khong lap markup qua nhieu
- Components chi la presentation va callbacks
- Desktop UI chua bi thay doi trong phase nay ngoai import khong su dung neu co

## Phase 3: Facility Mobile/Tablet Order Flow

### Objective

Them mobile/tablet view cho danh sach va chi tiet don facility, dung chung data/handlers hien co.

### Tasks

1. Trong [FacilityDrugOrdersPage.tsx](/opt/sudungthuoc/sudungthuoc/src/components/drug-orders/FacilityDrugOrdersPage.tsx), chia render thanh:
   - desktop branch: `hidden xl:block`, giu markup hien tai
   - mobile/tablet branch: `xl:hidden`
2. Neu file qua lon, tach mobile branch sang `FacilityDrugOrderMobileView.tsx`
3. Mobile/tablet list view:
   - render `orders` bang `DrugOrderSummaryCard`
   - card click goi `selectOrder(order.id)`
   - hien loading/empty states tu state hien co
   - header co `Lam moi` va CTA `Them du tru`
4. Mobile/tablet detail view:
   - neu chua co selected order, hien empty state va list cards
   - neu co selected order, hien header detail:
     - back to list neu phone
     - order no
     - company name/code
     - status badge
     - submitted/updated info
   - render `DrugOrderQrCode` trong section `Tong quan`
5. Them section tabs:
   - `Tong quan`
   - `Thuoc`
   - `Giao nhan`
   - `Ghi chu`
6. Section `Tong quan`:
   - summary metrics hien co
   - base report month select neu can edit
   - suggestion status message neu can edit
7. Section `Thuoc`:
   - render `editorLines` bang cards
   - editable quantity input dung `updateLineQty`
   - `Dung goi y` dung `applySuggestedQty`
   - `Xoa` dung `removeLine`
   - validation `requestedQty <= 0` hien trong card
   - duplicate suggestion warning hien trong card
8. Section `Ghi chu`:
   - textarea `editorNote`
   - disabled theo `canEdit`
9. Sticky action bar:
   - `Them thuoc` goi `openAppendCatalogDialog`
   - `Luu nhap` goi `saveDraft`
   - `Gui cong ty` goi `handleSubmit`
   - `Thu hoi` goi `handleRecall`
   - `Xac nhan thuc nhan` goi `openReceiptDialog`
   - action disabled/loading dung state hien co
10. Them padding bottom cho mobile content de sticky action bar khong che noi dung cuoi

### Acceptance Criteria

- Facility phone/tablet xem danh sach va chi tiet khong can keo ngang
- Facility phone/tablet nhap/xoa/dung goi y tung dong thuoc duoc
- Facility desktop van giu layout danh sach trai / chi tiet phai va bang hien tai
- Cac action facility van goi dung handler hien co

## Phase 4: Facility Mobile/Tablet Catalog And Receipt Flows

### Objective

Toi uu dialog chon thuoc va dialog xac nhan thuc nhan cho phone/tablet.

### Tasks

1. Trong [FacilityDrugOrderCatalogDialog.tsx](/opt/sudungthuoc/sudungthuoc/src/components/drug-orders/FacilityDrugOrderCatalogDialog.tsx), giu full-screen shell hien tai
2. Chia noi dung danh muc thanh:
   - desktop branch `hidden xl:block`: giu bang `min-w`, sticky columns
   - mobile/tablet branch `xl:hidden`: render selectable cards
3. Mobile/tablet toolbar:
   - company/base month/note form mot cot hoac grid tablet
   - search sticky
   - tabs `Goi y nen them` va `Danh muc cong ty`
   - selected count va `Bo chon tat ca`
4. Mobile/tablet suggested list:
   - card gom ten thuoc, ma thuoc cong ty, active ingredient, unit, recommended qty, status badge, reason ngan
   - checkbox lon
   - tap card toggle selection neu selectable
   - hien badge disabled reason: da co trong du tru, trung thuoc chuan, da chon thuoc cung thuoc chuan
5. Mobile/tablet catalog list:
   - card gom ma thuoc cong ty, ten thuoc, hoat chat, quy cach, thuoc chuan, don vi
   - same selection/disabled behavior
6. Footer sticky:
   - selected count
   - `Huy`
   - `Them vao du tru`
7. Receipt dialog trong [FacilityDrugOrdersPage.tsx](/opt/sudungthuoc/sudungthuoc/src/components/drug-orders/FacilityDrugOrdersPage.tsx):
   - desktop giu dialog hien tai
   - mobile/tablet render form cards cho `receiptLines`
   - moi card co shipped qty, input received qty, difference reason, inline validation
   - footer sticky co `Dong` va `Xac nhan thuc nhan`

### Acceptance Criteria

- Facility phone/tablet chon nhieu thuoc trong catalog bang card list, khong can keo bang ngang
- Selection rules khong doi so voi desktop
- Receipt flow tren phone/tablet thao tac duoc day du va validation ro trong card
- Desktop catalog table va receipt dialog khong regression

## Phase 5: Company Mobile/Tablet Order And Action Flows

### Objective

Them mobile/tablet views cho company: danh sach don, chi tiet, response flow, shipment flow, va catalog.

### Tasks

1. Trong [CompanyDrugOrdersPage.tsx](/opt/sudungthuoc/sudungthuoc/src/components/drug-orders/CompanyDrugOrdersPage.tsx), chia render thanh:
   - desktop branch `hidden xl:block`
   - mobile/tablet branch `xl:hidden`
2. Neu file qua lon, tach mobile branch sang `CompanyDrugOrderMobileView.tsx`
3. Mobile/tablet top tabs:
   - segmented control cho `Don hang` va `Danh muc thuoc`
   - dung `activeTab` hien co
4. Mobile/tablet order filters:
   - search
   - status
   - facility
   - filter panel co active count
   - filter van cap nhat state hien co
5. Mobile/tablet order list:
   - render `filteredOrders` bang cards
   - card click set `selectedOrderId`
   - hien pending catalog warning
6. Mobile/tablet order detail:
   - header gom order no, facility, status, submitted date, QR
   - sections `Tong quan`, `Dong thuoc`, `Giao hang`, `Lich su`
   - dong thuoc render cards, co expandable detail neu can hien du ho so thuoc
7. Sticky action bar:
   - `Phan hoi don` goi response dialog/flow
   - `Tao dot giao` goi shipment dialog/flow
   - action disabled theo permissions hien co
8. Response mobile flow:
   - desktop dialog giu hien tai
   - mobile/tablet full-screen flow hoac `DialogContent` full-screen
   - render `responseLines` bang cards
   - decision select, accepted qty input, reason input
   - catalog selection/create controls cho dong can danh muc
   - filter nhanh `Tat ca`, `Cho phan hoi`, `Can danh muc`, `Loi`
   - validation error hien trong card
   - submit goi `handleSubmitResponse`
9. Shipment mobile flow:
   - desktop dialog giu hien tai
   - mobile/tablet render date range/note tren dau va `shipmentLines` cards
   - input shipped qty va reason trong card
   - submit goi `handleCreateShipment`
10. Catalog mobile view:
   - desktop catalog table giu hien tai
   - mobile/tablet render `filteredCatalogItems` bang cards
   - search/filter sticky
   - actions edit/delete goi handlers hien co
11. Catalog add/edit mobile form:
   - desktop dialog giu hien tai
   - mobile/tablet full-screen mot cot
   - master drug search results render card list
   - save goi `handleSaveCatalog`

### Acceptance Criteria

- Company phone/tablet phan hoi duoc tat ca line cases
- Company phone/tablet tao dot giao duoc
- Company phone/tablet quan ly danh muc thuoc cong ty duoc
- Desktop company page van giu bang/dialog hien tai
- Khong co logic submit/validate bi copy lech giua desktop va mobile

## Phase 6: Admin Mobile/Tablet Monitoring Flow

### Objective

Them mobile/tablet views cho admin giam sat, loc, xem chi tiet, timeline va xoa don hop le.

### Tasks

1. Trong [AdminDrugOrdersPage.tsx](/opt/sudungthuoc/sudungthuoc/src/components/drug-orders/AdminDrugOrdersPage.tsx), chia render thanh:
   - desktop branch `hidden xl:block`
   - mobile/tablet branch `xl:hidden`
2. Neu file qua lon, tach mobile branch sang `AdminDrugOrdersMobileView.tsx`
3. Mobile/tablet summary:
   - render metrics cards responsive 1-2 cot phone, 2 cot tablet
4. Mobile/tablet filters:
   - search visible gan dau danh sach
   - advanced filters trong panel/sheet: facility, company, status, date from, date to
   - active filter count
5. Mobile/tablet order list:
   - cards tu `orders`
   - card gom order no, facility, company, status, line count, accepted/received, created date
   - click set `selectedOrderId`
6. Mobile/tablet detail:
   - phone co back to list
   - header gom order no, status, facility, company
   - sections `Thong tin`, `Dong thuoc`, `Timeline giao nhan`, `QR`
7. Dong thuoc section:
   - cards gom display name, source, requested, accepted, shipped, received, status, company reason
8. Timeline section:
   - shipment cards
   - shipment line list cards instead of tables
   - receipts summary
9. Admin actions:
   - `Xoa don` trong danger section/action menu
   - disabled/warning theo `canHardDeleteSelectedOrder`
   - click goi `handleDeleteOrder`

### Acceptance Criteria

- Admin phone/tablet loc va mo chi tiet don khong can keo ngang
- Admin phone/tablet xem dong thuoc va timeline day du
- Delete action van ton trong rule hien co
- Desktop admin page khong regression

## Phase 7: Verification, Cleanup, And Regression

### Objective

Dam bao mobile/tablet dung duoc day du, desktop van on dinh, va code khong qua trung lap.

### Tasks

1. Chay static checks:
   - `npm run lint`
   - `npm run build` neu moi truong cho phep
2. Neu build/lint fail do thay doi khac trong worktree, phan biet ro loi do patch responsive hay loi san co
3. Manual viewport checks:
   - phone `390x844`
   - tablet portrait `768x1024`
   - tablet landscape `1024x768`
   - desktop `1440x900`
4. Facility manual regression:
   - tao du tru
   - chon thuoc tu goi y va catalog
   - nhap so luong, dung goi y, xoa dong
   - luu nhap, gui cong ty, thu hoi neu co
   - xac nhan thuc nhan
5. Company manual regression:
   - loc/chon don
   - phan hoi du/mot phan/tu choi
   - xu ly dong can danh muc
   - tao/cap nhat thuoc cong ty
   - tao dot giao
6. Admin manual regression:
   - loc theo search/facility/company/status/date
   - mo chi tiet
   - xem timeline
   - xoa don du dieu kien
7. Desktop regression:
   - verify sidebar desktop
   - verify tables still visible and usable
   - verify dialogs desktop dimensions and actions
8. Cleanup:
   - xoa imports khong dung
   - gop component presentation bi duplicate qua nhieu
   - dam bao text dai wrap khong tran card/action bar
   - dam bao sticky action bars khong che content

### Acceptance Criteria

- Lint/build pass hoac loi con lai duoc ghi ro neu do moi truong/thay doi san co
- 4 viewport chinh khong co horizontal overflow o shell/module mobile views
- Cac workflow chinh cua 3 vai tro dung tren phone/tablet
- Desktop workflow cu van dung

## Risk Management

### Large client components

Risk:

- 3 page components lon, de gay conflict va kho review neu sua tat ca trong mot patch.

Mitigation:

- tach mobile presentation components theo phase
- commit nho theo tung layer
- khong refactor unrelated desktop logic

### Duplicate logic between desktop and mobile

Risk:

- render song song co the dan den handler/validation lech nhau.

Mitigation:

- mobile branch chi goi handlers hien co
- validation map va derived state giu trong page hoac helper chung
- component mobile nhan props da tinh san

### Sticky UI hiding content

Risk:

- bottom action bar va sticky footer co the che field cuoi tren phone.

Mitigation:

- them padding bottom theo chieu cao action bar
- test voi keyboard/input flows

### Existing dirty worktree

Risk:

- co nhieu thay doi san co trong dung file can sua.

Mitigation:

- doc lai diff truoc moi phase
- khong revert file
- neu gap conflict logical voi thay doi san co, stop va bao ro truoc khi tiep tuc

## Suggested Commit Sequence

1. `feat: make dashboard shell responsive`
2. `feat: add drug order mobile primitives`
3. `feat: add facility drug order mobile views`
4. `feat: add facility catalog mobile flow`
5. `feat: add company drug order mobile views`
6. `feat: add admin drug order mobile views`
7. `chore: verify responsive drug order workflows`

Commit names co the dieu chinh theo scope thuc te, nhung khong nen gom ca 3 vai tro vao mot commit lon.
