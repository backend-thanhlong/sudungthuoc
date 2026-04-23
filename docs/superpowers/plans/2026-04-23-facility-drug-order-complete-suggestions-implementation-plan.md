# Facility Drug Order Complete Suggestions Implementation Plan

## Inputs

Plan nay dua tren:

- Spec da duyet: [2026-04-23-facility-drug-order-complete-suggestions-design.md](/opt/sudungthuoc/sudungthuoc/docs/superpowers/specs/2026-04-23-facility-drug-order-complete-suggestions-design.md)
- Flow facility hien tai: [FacilityDrugOrdersPage.tsx](/opt/sudungthuoc/sudungthuoc/src/components/drug-orders/FacilityDrugOrdersPage.tsx)
- Dialog catalog hien tai: [FacilityDrugOrderCatalogDialog.tsx](/opt/sudungthuoc/sudungthuoc/src/components/drug-orders/FacilityDrugOrderCatalogDialog.tsx)
- Backend facility drug orders: [facility.ts](/opt/sudungthuoc/sudungthuoc/src/lib/drug-orders/facility.ts)
- Route facility draft list/create: [route.ts](/opt/sudungthuoc/sudungthuoc/src/app/api/facility/dutru-dat-hang/route.ts)
- Route facility draft detail/update: [[id]/route.ts](/opt/sudungthuoc/sudungthuoc/src/app/api/facility/dutru-dat-hang/[id]/route.ts)
- Route company catalog theo company: [company-drugs/route.ts](/opt/sudungthuoc/sudungthuoc/src/app/api/facility/dutru-dat-hang/company-drugs/route.ts)
- Shared drug-order helpers: [utils.ts](/opt/sudungthuoc/sudungthuoc/src/lib/drug-orders/utils.ts)
- Dashboard supply demand logic tham chieu: [supply-risk.ts](/opt/sudungthuoc/sudungthuoc/src/lib/dashboard/supply-risk.ts)
- Schema hien tai: [schema.prisma](/opt/sudungthuoc/sudungthuoc/prisma/schema.prisma)

## Goal

Trien khai `Goi y hoan chinh` tren `/dashboard/facility/dutru-dat-hang` de:

- tinh `recommendedQty` cho cac dong da co trong draft
- tinh danh sach `CompanyDrug` nen them vao draft
- giu `coverageTarget = 2 thang`
- tru di luong hang da duoc chap nhan nhung chua nhan du
- giu fallback thao tac thu cong qua `Danh mục công ty`
- khong pha vo cac luong `Lưu nháp`, `Gửi công ty`, `Thu hồi`, `Xác nhận thực nhận`

## Delivery Principles

- Khong thay doi schema Prisma trong `V1`
- Khong nhung `catalogSuggestions` vao payload list tong `/api/facility/dutru-dat-hang`
- Khong tiep tuc de logic suggestion nam lon trong [facility.ts](/opt/sudungthuoc/sudungthuoc/src/lib/drug-orders/facility.ts)
- Giu `suggestedQty` snapshot tren `DrugOrderLine` de tuong thich voi schema hien tai
- `suggestedQty` trong `V1` phai la `recommendedQty`, khong phai `xntBaseQty`
- Neu API goi y loi, tab `Danh mục công ty` van hoat dong day du
- Tôn trọng worktree hien tai: [FacilityDrugOrdersPage.tsx](/opt/sudungthuoc/sudungthuoc/src/components/drug-orders/FacilityDrugOrdersPage.tsx), [FacilityDrugOrderCatalogDialog.tsx](/opt/sudungthuoc/sudungthuoc/src/components/drug-orders/FacilityDrugOrderCatalogDialog.tsx), [facility.ts](/opt/sudungthuoc/sudungthuoc/src/lib/drug-orders/facility.ts), cac route facility dang co thay doi chua commit; implementation phai merge can than, khong ghi de

## Current Constraints

- Logic `Goi y XNT` hien tai nam trong [loadSuggestionSnapshots](/opt/sudungthuoc/sudungthuoc/src/lib/drug-orders/facility.ts:482), chi tra `suggestedQty`, `suggestionBasis`, `suggestionReportMonth`, `suggestionRuleVersion`
- UI bang draft hien chi hien mot cot `Gợi ý XNT` va button `Dùng gợi ý`, chua co concept `Nền XNT` hay `Đang về`
- Dialog catalog hien chi co mot bang `Danh mục công ty`, chua co tab `Gợi ý nên thêm`
- Schema `DrugOrderLine` chua co `suggestionMeta`, nen `V1` khong luu duoc chi tiet JSON
- Repo da co logic demand / `monthsOfCover` trong dashboard supply, nhung chua duoc dong goi thanh helper chung cho module drug orders
- Route facility company catalog hien moi tra danh muc cong ty, chua tra du lieu goi y

## Target File Structure

### Backend

- `src/lib/drug-orders/suggestions.ts`
- `src/lib/drug-orders/facility.ts`
- `src/lib/drug-orders/utils.ts`
- `src/app/api/facility/dutru-dat-hang/suggestions/route.ts`
- `src/app/api/facility/dutru-dat-hang/route.ts`
- `src/app/api/facility/dutru-dat-hang/[id]/route.ts`

### Frontend

- `src/components/drug-orders/FacilityDrugOrdersPage.tsx`
- `src/components/drug-orders/FacilityDrugOrderCatalogDialog.tsx`

### Docs

- [2026-04-23-facility-drug-order-complete-suggestions-design.md](/opt/sudungthuoc/sudungthuoc/docs/superpowers/specs/2026-04-23-facility-drug-order-complete-suggestions-design.md)
- [2026-04-23-facility-drug-order-complete-suggestions-implementation-plan.md](/opt/sudungthuoc/sudungthuoc/docs/superpowers/plans/2026-04-23-facility-drug-order-complete-suggestions-implementation-plan.md)

## Rollout Shape

Scope nay nen tach thanh 5 phase:

1. `Suggestion engine foundation`
2. `Suggestion API and draft snapshot integration`
3. `Draft detail UI rework`
4. `Catalog dialog suggestions tab`
5. `Resilience, tests, and manual verification`

Thứ tự nay giu critical path ro:

- backend rule phai on dinh truoc
- API phai co truoc khi UI tiep vao
- UI draft phai xong truoc khi mo rong dialog

## Phase Breakdown

## Phase 1: Extract Complete Suggestion Engine

### Objective

Tach logic suggestion khoi [facility.ts](/opt/sudungthuoc/sudungthuoc/src/lib/drug-orders/facility.ts) thanh mot module ro rang, test duoc, va ho tro ca:

- suggestion cho dong trong draft
- suggestion cho thuoc nen them tu catalog cong ty

### Tasks

1. Tao file moi [suggestions.ts](/opt/sudungthuoc/sudungthuoc/src/lib/drug-orders/suggestions.ts)
2. Dinh nghia cac type noi bo:
   - `SuggestionStatus`
   - `SuggestionResult`
   - `SuggestionCatalogItem`
   - `SuggestionRequestContext`
3. Chuyen logic bucket `InventoryReport` theo `masterDrugId + reportMonth` tu [facility.ts](/opt/sudungthuoc/sudungthuoc/src/lib/drug-orders/facility.ts) sang module moi
4. Trich helper tinh nhu cau de tai su dung trong module drug orders:
   - `avgMonthlyExport`
   - `monthsOfCover`
   - `xntBaseQty`
5. Giữ report month helpers trong [utils.ts](/opt/sudungthuoc/sudungthuoc/src/lib/drug-orders/utils.ts) va bo sung helper chung cho `avgMonthlyExport` / `monthsOfCover` tai day hoac trong [suggestions.ts](/opt/sudungthuoc/sudungthuoc/src/lib/drug-orders/suggestions.ts), thay vi import nguoc tu dashboard supply
6. Implement loader `incomingAcceptedQty`:
   - query cac `DrugOrderLine` cung `facilityId`
   - map theo `masterDrugId`
   - tinh `acceptedQty - receivedQty`
   - chi lay dong cua cac don dang mo
   - bo qua draft dang tinh neu co `orderId`
7. Implement ham tinh `recommendedQty = max(0, xntBaseQty - incomingAcceptedQty)`
8. Implement status output:
   - `OFFICIAL`
   - `PROVISIONAL`
   - `UNLINKED`
   - `INSUFFICIENT_DATA`
9. Dong bo `ruleVersion` moi, vi du:
   - `complete-v1-coverage-2m-net-incoming`
10. Bao dam output co day du:
   - `recommendedQty`
   - `xntBaseQty`
   - `incomingAcceptedQty`
   - `avgMonthlyExport`
   - `latestEndingStock`
   - `monthsOfCover`
   - `suggestionReportMonth`
   - `suggestionRuleVersion`
   - `basisLines`
   - `status`

### Implementation Notes

- Khong import UI formatter vao module moi
- Co the giu `formatQuantityLabel` de build `suggestionBasis`
- `monthsOfCover` nen tinh tu `latestEndingStock / avgMonthlyExport`, tra `null` neu `avgMonthlyExport <= 0`
- Tap `don dang mo` nen gom:
  - `SUBMITTED`
  - `READY_FOR_SHIPMENT`
  - `IN_DELIVERY`
- `REJECTED` va `COMPLETED` khong duoc tinh vao `incomingAcceptedQty`

### Acceptance Criteria

- Logic suggestion khong con nam lon trong `facility.ts`
- Co mot API noi bo / function duy nhat de tinh `recommendedQty`
- `recommendedQty` khong bao gio am
- `incomingAcceptedQty` khong tinh trung chinh draft dang sua

## Phase 2: Integrate Engine Into Facility Runtime And Add Suggestions API

### Objective

Nối suggestion engine moi vao runtime facility va mo route rieng cho UI load du lieu goi y song song voi payload draft.

### Tasks

1. Trong [facility.ts](/opt/sudungthuoc/sudungthuoc/src/lib/drug-orders/facility.ts), thay `loadSuggestionSnapshots` bang wrapper goi [suggestions.ts](/opt/sudungthuoc/sudungthuoc/src/lib/drug-orders/suggestions.ts)
2. Cap nhat `buildDraftLineCreateInputs`:
   - snapshot `suggestedQty = recommendedQty`
   - rebuild `suggestionBasis` tu `basisLines`
   - luu `suggestionReportMonth`
   - luu `suggestionRuleVersion`
3. Bao dam create draft va update draft deu dung cung engine moi
4. Tao route moi:
   - `src/app/api/facility/dutru-dat-hang/suggestions/route.ts`
5. Route moi phai:
   - chi cho `FACILITY`
   - nhan `companyId`
   - nhan `baseReportMonth`
   - nhan `orderId` optional
6. Implement service loader trong [facility.ts](/opt/sudungthuoc/sudungthuoc/src/lib/drug-orders/facility.ts) hoac [suggestions.ts](/opt/sudungthuoc/sudungthuoc/src/lib/drug-orders/suggestions.ts):
   - load `lineSuggestions` cho cac dong trong draft neu co `orderId`
   - load `catalogSuggestions` cho `CompanyDrug` active cua cong ty
7. `catalogSuggestions` phai:
   - chi lay `CompanyDrug` active
   - chi lay dong co `masterDrugId`
   - loai bo `sourceId` da co trong draft neu co `orderId`
   - mac dinh chi tra ve thuoc co `recommendedQty > 0`
8. Response shape route:
   - `lineSuggestions`
   - `catalogSuggestions`
   - `meta.effectiveReportMonth`
   - `meta.coverageTargetMonths`
9. Khong modify `GET /api/facility/dutru-dat-hang` de preload suggestions catalog
10. Giữ loi route nhat quan voi `RouteError` va `handleRouteError` pattern hien co

### Implementation Notes

- `lineSuggestions` nen key theo `orderLineId` de frontend map de
- `catalogSuggestions` nen tra du lieu du de render row ma khong can fetch route khac
- `baseReportMonth = null` nen tu dong resolve thang moi nhat kha dung va tra trong `meta.effectiveReportMonth`

### Acceptance Criteria

- Co route `/api/facility/dutru-dat-hang/suggestions`
- Draft create/update snapshot `recommendedQty` dung rule moi
- API moi khong lam phinh payload list tong
- API moi tra ve du lieu de render ca bang draft va tab `Gợi ý nên thêm`

## Phase 3: Rework Draft Detail UI To Use Complete Suggestions

### Objective

Bien bang draft tu `Gợi ý XNT` thanh `Gợi ý` day du context, nhung khong lam vo workflow editor hien co.

### Tasks

1. Trong [FacilityDrugOrdersPage.tsx](/opt/sudungthuoc/sudungthuoc/src/components/drug-orders/FacilityDrugOrdersPage.tsx), them state moi:
   - `suggestionsLoading`
   - `suggestionsError`
   - `lineSuggestionMap`
   - `catalogSuggestions`
   - `suggestionEffectiveMonth`
2. Tao ham fetch suggestions:
   - goi route moi theo `selectedOrder.companyId`, `editorBaseReportMonth`, `selectedOrder.id`
3. Trigger refetch khi:
   - mo draft
   - doi `editorBaseReportMonth`
   - save draft thanh cong
4. Doi cot `Gợi ý XNT` thanh `Gợi ý`
5. Tren tung dong, render:
   - `recommendedQty`
   - `Nền XNT`
   - `Đang về`
   - `Tháng tham chiếu`
   - badge `Chính thức / Tạm / Chưa liên kết / Chưa đủ dữ liệu`
6. Sua `applySuggestedQty` va `applyAllSuggestedQty` de dung `recommendedQty`
7. Giữ fallback:
   - neu chua co live suggestion hoac route suggestions loi, van render snapshot cu tren line
8. Bo sung summary metrics tren draft:
   - `Dòng có gợi ý`
   - `Thuốc đề xuất nên thêm`
9. Hien banner loi ngan neu route suggestions loi:
   - khong chet editor
   - khong vo hieu hoa nut `Thêm thuốc`
10. Khong hien `Dùng gợi ý` cho dong co `recommendedQty = null`

### Implementation Notes

- Khong trộn chi tiet suggestion vao `editorLines` local state neu khong can; uu tien de `editorLines` tiep tuc chi quan ly payload edit
- `lineSuggestionMap` nen la source of truth cho UI `Gợi ý`
- Khi user chua luu nhap va them dong local mode `append`, UI se:
  - hien snapshot tam neu co
  - refetch sau `saveDraft`

### Acceptance Criteria

- Draft table hien `Gợi ý` thay cho `Gợi ý XNT`
- `Dùng gợi ý` dien `recommendedQty`
- Doi `baseReportMonth` thi suggestions refresh
- Neu route suggestions loi, editor van su dung duoc

## Phase 4: Add Suggested Catalog Tab To Company Drug Dialog

### Objective

Mo rong dialog catalog de nguoi dung co 2 cach them thuoc:

- chon thu cong tu `Danh mục công ty`
- chon nhanh tu `Gợi ý nên thêm`

### Tasks

1. Trong [FacilityDrugOrderCatalogDialog.tsx](/opt/sudungthuoc/sudungthuoc/src/components/drug-orders/FacilityDrugOrderCatalogDialog.tsx), them tab shell:
   - `Danh mục công ty`
   - `Gợi ý nên thêm`
2. Truyen them props tu page:
   - `catalogSuggestions`
   - `suggestionsLoading`
   - `suggestionsError`
   - `effectiveReportMonth`
3. Mặc định active tab:
   - mode `create`: vao `Gợi ý nên thêm` sau khi co `companyId`
   - mode `append`: vao `Gợi ý nên thêm`
4. Render bang cho tab `Gợi ý nên thêm` voi cot:
   - `Chọn`
   - `Mã thuốc công ty`
   - `Tên thuốc`
   - `Thuốc chuẩn liên kết`
   - `Gợi ý`
   - `Độ phủ`
   - `Lý do`
5. Them toggle:
   - `Hiện cả thuốc có dữ liệu XNT`
6. Selection model phai dung chung giua 2 tab:
   - chon o tab nao cung cap nhat bo dem `Đã chọn`
   - `Thêm vào dự trù` su dung mot source `selectedIds`
7. Loai bo thuoc da ton tai trong draft khoi tab suggestions
8. Empty state cho tab `Gợi ý nên thêm`:
   - chua chon cong ty
   - khong co de xuat
   - API loi
9. Error state:
   - hien message ngan
   - tab `Danh mục công ty` van dung binh thuong
10. Khong dat logic tinh suggestion trong dialog component; dialog chi render prop da duoc page tinh / fetch

### Implementation Notes

- Khong nhan doi selection state cho tung tab
- `catalogSuggestions` nen bao gom du lieu row co san de tranh join them o frontend
- Neu `baseReportMonth` thay doi khi dialog dang mo, page phai refetch suggestions va dialog render lai theo ket qua moi

### Acceptance Criteria

- Dialog co 2 tab ro rang
- Nguoi dung chon duoc thuoc tu tab `Gợi ý nên thêm`
- Bo dem selection va CTA cuoi dialog hoat dong dung bat ke tab nao dang mo
- API suggestions loi nhung tab `Danh mục công ty` van them thuoc duoc

## Phase 5: Tests, Hardening, And Verification Matrix

### Objective

Dong goi implementation de de rollout, giam regression, va de nguoi lam code co checklist ro rang.

### Tasks

1. Them pure-function test cho [suggestions.ts](/opt/sudungthuoc/sudungthuoc/src/lib/drug-orders/suggestions.ts) bang harness test hien co cua repo; khong tao framework test moi trong pha nay
2. Cover cac case unit:
   - du `3` thang `APPROVED`
   - bu `PENDING` khi thieu `APPROVED`
   - `INSUFFICIENT_DATA`
   - `incomingAcceptedQty` > 0
   - `recommendedQty` khong am
3. Cover integration cho route suggestions:
   - route tra dung `lineSuggestions`
   - route tra dung `catalogSuggestions`
   - loai thuoc da co trong draft
   - bo qua `CompanyDrug` khong co `masterDrugId`
   - doi `baseReportMonth` thi ket qua thay doi
4. Cover interaction UI:
   - doi `baseReportMonth` khi dang o draft
   - `Dùng gợi ý`
   - `Dùng tất cả gợi ý`
   - chon nhieu thuoc o tab `Gợi ý nên thêm`
5. Manual verification matrix:
   - draft moi chua co dong
   - draft dang sua co dong mapped va unmapped
   - co hang dang ve
   - API suggestions fail
   - company catalog rong
6. Them note rollout:
   - monitor bang cach quan sat `suggestedQty` moi tren draft
   - neu can rollback UI, van giu snapshot schema cu

### Acceptance Criteria

- Co checklist unit / integration / manual ro rang
- Khong co regression ro rang o flow draft hien tai
- Team co the trien khai theo phase ma khong phai suy dien lai rule tu spec

## Suggested Implementation Order

Lam theo thu tu nay de giam xung dot:

1. Tao [suggestions.ts](/opt/sudungthuoc/sudungthuoc/src/lib/drug-orders/suggestions.ts) va helper lien quan
2. Noi [facility.ts](/opt/sudungthuoc/sudungthuoc/src/lib/drug-orders/facility.ts) vao engine moi
3. Tao route suggestions
4. Day state fetch suggestions vao [FacilityDrugOrdersPage.tsx](/opt/sudungthuoc/sudungthuoc/src/components/drug-orders/FacilityDrugOrdersPage.tsx)
5. Doi bang draft sang `Gợi ý`
6. Mo rong [FacilityDrugOrderCatalogDialog.tsx](/opt/sudungthuoc/sudungthuoc/src/components/drug-orders/FacilityDrugOrderCatalogDialog.tsx) voi tab `Gợi ý nên thêm`
7. Chay verification matrix

## Out Of Scope Follow-Ups

Khong lam trong plan nay, nhung nen ghi lai cho phase sau:

- them `suggestionMeta Json?` vao `DrugOrderLine`
- pagination / ranking nang cao cho tab `Gợi ý nên thêm`
- admin config cho `coverageTarget`
- sync hoac cache suggestion de giam tan suat query

## Definition Of Done

1. Facility draft table hien `Gợi ý` thay cho `Gợi ý XNT`.
2. `Gợi ý` tren tung dong phan anh ca `xntBaseQty` va `incomingAcceptedQty`.
3. `Dùng gợi ý` va `Dùng tất cả gợi ý` dien `recommendedQty`.
4. Dialog them thuoc co tab `Gợi ý nên thêm`.
5. Tab nay chi hien thuoc active, da map `masterDrugId`, va chua co trong draft.
6. Mac dinh chi hien thuoc co `recommendedQty > 0`.
7. Doi `baseReportMonth` se refresh du lieu suggestion.
8. Route suggestions loi nhung luong them thuoc thu cong van hoat dong.
9. Snapshot `suggestedQty` tren `DrugOrderLine` dung theo rule moi `coverageTarget = 2 thang`.
