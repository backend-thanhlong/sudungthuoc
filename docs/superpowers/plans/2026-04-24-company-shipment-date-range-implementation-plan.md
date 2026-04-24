# Company Shipment Date Range Implementation Plan

## Inputs

Plan nay dua tren:

- Spec da duyet: [2026-04-24-company-shipment-date-range-design.md](/opt/sudungthuoc/sudungthuoc/docs/superpowers/specs/2026-04-24-company-shipment-date-range-design.md)
- Company order page hien tai: [CompanyDrugOrdersPage.tsx](/opt/sudungthuoc/sudungthuoc/src/components/drug-orders/CompanyDrugOrdersPage.tsx)
- Company shipment route: [route.ts](/opt/sudungthuoc/sudungthuoc/src/app/api/company/dutru-dat-hang/[id]/shipments/route.ts)
- Company drug-order services: [company.ts](/opt/sudungthuoc/sudungthuoc/src/lib/drug-orders/company.ts)
- Facility drug-order serializers: [facility.ts](/opt/sudungthuoc/sudungthuoc/src/lib/drug-orders/facility.ts)
- Schema hien tai: [schema.prisma](/opt/sudungthuoc/sudungthuoc/prisma/schema.prisma)

## Goal

Trien khai `khoang ngay giao hang` cho luong `Tao dot giao` tren `/dashboard/company/dutru-dat-hang` de:

- company nhap `Tu ngay` va `Den ngay` thay cho mot `Thoi diem giao`
- backend luu day du `shippedFromDate` va `shippedToDate`
- shipment moi va shipment cu deu hien thi dung o ca man company va facility
- giu `shippedAt` de tuong thich nguoc trong pha nay
- khong pha vo nghiep vu shipment line, receipt, hay status workflow hien co

## Delivery Principles

- Migrate theo huong tuong thich nguoc, khong thay the dot ngot `shippedAt`
- Backfill shipment cu ngay trong migration de tranh song song hai cach hien thi qua lau
- Dung mot presentation rule chung cho company va facility, khong de moi man format mot kieu
- Validation phai chan ca frontend va backend
- Tôn trọng worktree hien tai: [CompanyDrugOrdersPage.tsx](/opt/sudungthuoc/sudungthuoc/src/components/drug-orders/CompanyDrugOrdersPage.tsx), [company.ts](/opt/sudungthuoc/sudungthuoc/src/lib/drug-orders/company.ts), [facility.ts](/opt/sudungthuoc/sudungthuoc/src/lib/drug-orders/facility.ts) dang co thay doi chua commit; khi implement phai merge can than, khong ghi de thay doi khac

## Current Constraints

- `DrugOrderShipment` hien chi co `shippedAt`, chua co cap field range date
- Route company shipment hien parse duy nhat `body.shippedAt`
- Dialog `Tao dot giao` dang dung `type="datetime-local"`
- Company page va facility page deu render shipment dua tren `shippedAt`
- Activity log shipment moi hien chi luu `shippedAt`
- Repo da co pattern validation `Tu ngay` / `Den ngay` o cac man khac; nen tai su dung pattern UX thay vi sang tao form moi

## Target File Surface

### Schema and migration

- `prisma/schema.prisma`
- `prisma/migrations/<timestamp>_company_shipment_date_range/*`

### Backend

- `src/lib/drug-orders/company.ts`
- `src/lib/drug-orders/facility.ts`
- `src/app/api/company/dutru-dat-hang/[id]/shipments/route.ts`

### Frontend

- `src/components/drug-orders/CompanyDrugOrdersPage.tsx`
- `src/components/drug-orders/FacilityDrugOrdersPage.tsx`

### Docs

- [2026-04-24-company-shipment-date-range-design.md](/opt/sudungthuoc/sudungthuoc/docs/superpowers/specs/2026-04-24-company-shipment-date-range-design.md)
- [2026-04-24-company-shipment-date-range-implementation-plan.md](/opt/sudungthuoc/sudungthuoc/docs/superpowers/plans/2026-04-24-company-shipment-date-range-implementation-plan.md)

## Rollout Shape

Scope nay nen trien khai qua 5 phase:

1. `Schema and backfill foundation`
2. `Backend parsing and persistence`
3. `Shared serialization and presentation`
4. `Company shipment dialog rework`
5. `Verification and hardening`

Thu tu nay giu rui ro thap:

- co schema truoc moi sua logic create shipment
- co response shape moi truoc moi sua UI display
- company va facility duoc dong bo presentation sau khi backend san sang

## Phase Breakdown

## Phase 1: Add Shipment Range Fields And Backfill Existing Data

### Objective

Mo rong model `DrugOrderShipment` de luu duoc khoang ngay giao hang va dong bo shipment cu ngay trong migration.

### Tasks

1. Cap nhat [schema.prisma](/opt/sudungthuoc/sudungthuoc/prisma/schema.prisma):
   - them `shippedFromDate DateTime? @map("shipped_from_date")`
   - them `shippedToDate DateTime? @map("shipped_to_date")`
2. Tao migration Prisma moi cho 2 cot tren
3. Trong SQL migration, backfill shipment cu:
   - neu `shipped_at` co gia tri
   - set `shipped_from_date` bang dau ngay cua `shipped_at`
   - set `shipped_to_date` bang cuoi ngay cua `shipped_at`
4. Giu nguyen:
   - `shipped_at`
   - unique/index hien co
5. Ra soat neu can them index phu cho `shipped_from_date` / `shipped_to_date`; neu chua co use case query, khong them trong V1

### Implementation Notes

- Backfill phai deterministic va idempotent tren du lieu san co
- Neu migration dung SQL theo dialect hien tai, uu tien convert ngay ngay trong DB thay vi dung script rieng
- Khong xoa hay rename `shipped_at` trong pha nay

### Acceptance Criteria

- Schema compile duoc sau migration
- Shipment cu co day du `shipped_from_date` va `shipped_to_date`
- Khong can chinh tay du lieu lich su

## Phase 2: Update Company Shipment API To Accept Date Range

### Objective

Thay doi luong tao shipment de nhan `Tu ngay` / `Den ngay`, validate dung, va persist range moi trong khi van giu `shippedAt`.

### Tasks

1. Trong [company.ts](/opt/sudungthuoc/sudungthuoc/src/lib/drug-orders/company.ts), bo sung parser moi cho range date, vi du:
   - `parseShipmentDateRange`
2. Parser moi phai:
   - bat buoc co ca `shippedFromDate` va `shippedToDate`
   - reject neu mot trong hai truong thieu
   - reject neu parse fail
   - reject neu `from > to`
   - tra ve:
     - `shippedFromDate` o dau ngay
     - `shippedToDate` o cuoi ngay
3. Giu `parseCompanyShipmentLines` va `parseCompanyShipmentNote` nhu hien tai
4. Cap nhat [route.ts](/opt/sudungthuoc/sudungthuoc/src/app/api/company/dutru-dat-hang/[id]/shipments/route.ts):
   - nhan payload moi
   - goi parser range date moi
5. Cap nhat `createCompanyDrugOrderShipment` trong [company.ts](/opt/sudungthuoc/sudungthuoc/src/lib/drug-orders/company.ts):
   - nhan `shippedFromDate`
   - nhan `shippedToDate`
   - luu `shippedAt = shippedFromDate`
   - luu day du 2 field moi
6. Giu nguyen toan bo rule hien co cho shipment lines:
   - it nhat 1 dong giao > 0
   - khong giao vuot `remainingQty`
   - giao thieu phai co ly do
7. Cap nhat activity log details:
   - them `shippedFromDate`
   - them `shippedToDate`
   - van luu `shippedAt`

### Implementation Notes

- Co the giu `parseShipmentTimestamp` tam thoi neu cac luong khac con dung, nhung route company shipment phai chuyen sang parser moi
- Message validation can ngan, ro, va theo dung pattern tieng Viet hien co

### Acceptance Criteria

- Route tao shipment nhan payload range date moi
- Shipment moi luu du 3 field:
   - `shippedFromDate`
   - `shippedToDate`
   - `shippedAt = shippedFromDate`
- Error 400 tra ro rang khi `Tu ngay > Den ngay` hoac payload thieu

## Phase 3: Extend Serializers And Unify Shipment Date Presentation

### Objective

Dam bao ca company va facility deu nhan du lieu range moi va render thong nhat.

### Tasks

1. Trong [company.ts](/opt/sudungthuoc/sudungthuoc/src/lib/drug-orders/company.ts), cap nhat serializer shipment de tra them:
   - `shippedFromDate`
   - `shippedToDate`
2. Trong [facility.ts](/opt/sudungthuoc/sudungthuoc/src/lib/drug-orders/facility.ts), cap nhat serializer shipment va shipment history tuong tu
3. Tao helper format chung cho shipment date range o layer frontend hoac shared util da ton tai:
   - uu tien `shippedFromDate` + `shippedToDate`
   - neu cung ngay thi hien 1 ngay
   - neu khac ngay thi hien `dd/MM/yyyy - dd/MM/yyyy`
   - fallback ve `shippedAt` neu shipment cu thieu range
4. Doi label user-facing tu `Thoi diem giao` thanh `Thoi gian giao` o cac diem hien thi shipment
5. Ap dung cung helper cho:
   - shipment cards trong company detail
   - latest shipment summary trong bang dong thuoc company
   - shipment cards / history tren facility page

### Implementation Notes

- Muc tieu la co mot presentation rule, khong can nhat thiet mot file util rieng neu repo da co helper cung file; nhung logic phai reuse, khong copy-paste sai khac nhau
- Khong can render gio phut nua vi nghiep vu da chot theo ngay

### Acceptance Criteria

- Company va facility cung nhan field range moi
- Shipment cu van hien thi dung sau backfill va fallback
- Khong con diem user-facing quan trong nao tiep tuc hien `formatDateTime(shippedAt)` cho shipment

## Phase 4: Rework Company Shipment Dialog To Use `Tu ngay` / `Den ngay`

### Objective

Chuyen dialog `Tao dot giao` sang UI range date ma van giu luong tao shipment gon, ro, va on dinh.

### Tasks

1. Trong [CompanyDrugOrdersPage.tsx](/opt/sudungthuoc/sudungthuoc/src/components/drug-orders/CompanyDrugOrdersPage.tsx), doi state:
   - bo `shipmentAt`
   - them `shipmentFromDate`
   - them `shipmentToDate`
2. Gia tri mac dinh:
   - `shipmentFromDate = hom nay`
   - `shipmentToDate = hom nay`
3. Doi payload trong `handleCreateShipment`:
   - gui `shippedFromDate`
   - gui `shippedToDate`
   - bo `shippedAt`
4. Doi layout form trong dialog:
   - label `Thoi gian giao`
   - 2 input `type="date"`:
     - `Tu ngay`
     - `Den ngay`
5. Chen validation frontend truoc submit:
   - neu thieu 1 trong 2 truong -> toast loi
   - neu `Tu ngay > Den ngay` -> toast `Tu ngay khong duoc lon hon Den ngay`
6. Giu nguyen summary va bang shipment lines cua dialog da duoc redesign truoc do
7. Dam bao reset state dialog sau khi tao shipment thanh cong hoac mo dot giao moi

### Implementation Notes

- Co the tai su dung helper lay ngay hom nay theo format `YYYY-MM-DD` thay vi helper `datetime-local` cu
- Khong doi luong chon dong giao, ly do giao thieu, hay note chung

### Acceptance Criteria

- Dialog company dung 2 input ngay thay cho 1 input `datetime-local`
- UI chan submit khi range khong hop le
- Submit thanh cong tao shipment moi voi range date

## Phase 5: Verification And Regression Hardening

### Objective

Xac nhan thay doi range date khong lam hong shipment workflow hien co tren company va facility.

### Tasks

1. Chay lint cho cac file sua
2. Chay `npx tsc --noEmit`
3. Neu repo da co test phu hop cho `company.ts` hoac route shipment, bo sung unit/integration test cho parser range date
4. Manual verification toi thieu:
   - tao shipment 1 ngay
   - tao shipment nhieu ngay
   - xem shipment moi o company detail
   - xem latest shipment summary o dong thuoc company
   - xem shipment moi o facility detail
   - mo shipment cu da co truoc migration va xac nhan hien thi dung
5. Ra soat search toan repo theo `shippedAt` de bat diem user-facing bo sot

### Acceptance Criteria

- Lint va TypeScript clean
- Khong co regression ro rang o create shipment workflow
- Company va facility hien thi shipment thong nhat

## Suggested Execution Order

1. Sua schema va tao migration backfill
2. Cap nhat parser + service tao shipment
3. Cap nhat route company shipment
4. Cap nhat serializers company/facility
5. Cap nhat helpers hien thi shipment range
6. Sua dialog company shipment
7. Chay verification tu dong
8. Manual verify tren company va facility

## Risks And Mitigations

### 1. Bo sot diem hien thi `shippedAt`

Giam thieu bang cach:

- `rg shippedAt` truoc va sau khi sua
- uu tien sua cac diem user-facing trong company va facility

### 2. Migration backfill khong dong nhat timezone

Giam thieu bang cach:

- quy dinh ro trong code va migration: `Tu ngay` la dau ngay, `Den ngay` la cuoi ngay theo quy uoc server hien tai
- verify shipment cu va moi tren cung mot moi truong

### 3. Payload moi lam vo client code cu

Giam thieu bang cach:

- route company shipment va dialog company duoc sua trong cung mot rollout
- response van giu `shippedAt` de tuong thich phan doc du lieu

## Definition Of Done

Tinh nang duoc coi la xong khi:

- company tao duoc shipment voi `Tu ngay` va `Den ngay`
- shipment moi luu day du range date trong DB
- shipment cu duoc backfill va hien thi dung
- company va facility deu hien `Thoi gian giao` thay vi moc le
- lint va `npx tsc --noEmit` deu dat
- khong co loi hoi quy ro rang trong luong tao shipment va xem shipment

