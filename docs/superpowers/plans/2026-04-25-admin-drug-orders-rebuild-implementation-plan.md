# Admin Drug Orders Rebuild Implementation Plan

## Inputs

Plan nay dua tren:

- Spec da duyet: [2026-04-25-admin-drug-orders-rebuild-design.md](/opt/sudungthuoc/sudungthuoc/docs/superpowers/specs/2026-04-25-admin-drug-orders-rebuild-design.md)
- Admin route: [page.tsx](/opt/sudungthuoc/sudungthuoc/src/app/dashboard/admin/dutru-dat-hang/page.tsx)
- Admin page component: [AdminDrugOrdersPage.tsx](/opt/sudungthuoc/sudungthuoc/src/components/drug-orders/AdminDrugOrdersPage.tsx)
- Admin API list/detail/delete:
  - [route.ts](/opt/sudungthuoc/sudungthuoc/src/app/api/admin/dutru-dat-hang/route.ts)
  - [route.ts](/opt/sudungthuoc/sudungthuoc/src/app/api/admin/dutru-dat-hang/[id]/route.ts)
- Admin service: [admin.ts](/opt/sudungthuoc/sudungthuoc/src/lib/drug-orders/admin.ts)
- Shared mobile components already used by admin page:
  - [DrugOrderSummaryCard.tsx](/opt/sudungthuoc/sudungthuoc/src/components/drug-orders/DrugOrderSummaryCard.tsx)
  - [DrugOrderLineMobileCard.tsx](/opt/sudungthuoc/sudungthuoc/src/components/drug-orders/DrugOrderLineMobileCard.tsx)
  - [DrugOrderShipmentMobileCard.tsx](/opt/sudungthuoc/sudungthuoc/src/components/drug-orders/DrugOrderShipmentMobileCard.tsx)
  - [DrugOrderMobileFilterPanel.tsx](/opt/sudungthuoc/sudungthuoc/src/components/drug-orders/DrugOrderMobileFilterPanel.tsx)
  - [DrugOrderMobileSectionTabs.tsx](/opt/sudungthuoc/sudungthuoc/src/components/drug-orders/DrugOrderMobileSectionTabs.tsx)
- UI primitives:
  - [alert-dialog.tsx](/opt/sudungthuoc/sudungthuoc/src/components/ui/alert-dialog.tsx)
  - [button.tsx](/opt/sudungthuoc/sudungthuoc/src/components/ui/button.tsx)
  - [input.tsx](/opt/sudungthuoc/sudungthuoc/src/components/ui/input.tsx)
  - [table.tsx](/opt/sudungthuoc/sudungthuoc/src/components/ui/table.tsx)

## Goal

Trien khai rebuild cho trang `/dashboard/admin/dutru-dat-hang` theo scope da
duyet:

- admin xem va giam sat don du tru dat hang
- admin xoa vinh vien moi don, khong ngoai tru trang thai hay lich su giao nhan
- bo cot/badge `Nguon`
- dong thuoc hien theo `Danh muc cong ty`, bo sung `So dang ky`, `Dang bao che`
  va `Don vi`
- khong them sua don, duyet don, ghi chu noi bo, export Excel hay bulk delete

## Delivery Principles

- Giu permission route bang `requireActiveSessionUser("ADMIN")`
- Hard delete phai nam trong transaction ro rang, khong dua vao cascade ngam
- UI xoa phai co xac nhan nhap lai ma don
- Khong revert cac thay doi khac dang co trong worktree
- Tach thay doi service/API va UI theo phase de de review
- Giu desktop/mobile behavior hien co neu khong nam trong scope

## Target File Surface

Bat buoc sua:

- `src/lib/drug-orders/admin.ts`
- `src/app/api/admin/dutru-dat-hang/[id]/route.ts`
- `src/components/drug-orders/AdminDrugOrdersPage.tsx`

Co the sua neu can:

- `src/components/drug-orders/DrugOrderLineMobileCard.tsx`
- `src/components/drug-orders/DrugOrderSummaryCard.tsx`
- `src/components/ui/alert-dialog.tsx`

Khong can sua:

- Prisma schema
- Facility/company order pages
- Public QR lookup route
- Print documents

## Phase 1: Admin Service Data Shape

### Objective

Dam bao payload chi tiet co du thong tin de hien dong thuoc theo danh muc cong
ty.

### Tasks

1. Mo rong `MASTER_DRUG_SELECT` trong `src/lib/drug-orders/admin.ts` de bao gom:
   - `soDangKy`
   - `dangBaoChe`
   - `donViTinh`
2. Giu `sourceType`, `masterDrugId`, `companyDrugId` trong payload de tuong thich
   type va du lieu cu, nhung UI khong dung de hien `Nguon`.
3. Kiem tra `serializeCompanyDrugOption` da tra ve `masterDrug` day du theo
   select moi.
4. Neu can, them helper format line display trong component thay vi thay doi
   schema payload qua lon:
   - `getCompanyDrugCode(line)`
   - `getCompanyDrugName(line)`
   - `getLineRegistration(line)`
   - `getLineDosageForm(line)`
   - `getLineUnit(line)`

### Acceptance Criteria

- Detail payload co `companyDrug.masterDrug.soDangKy`
- Detail payload co `companyDrug.masterDrug.dangBaoChe`
- Detail payload co fallback `companyDrug.masterDrug.donViTinh`
- API list khong bi thay doi ngoai cac field can thiet

## Phase 2: Hard Delete Every Order

### Objective

Thay doi `deleteAdminDrugOrder` tu xoa co dieu kien sang xoa vinh vien moi don.

### Tasks

1. Trong `deleteAdminDrugOrder(orderId)`, load order snapshot truoc khi xoa:
   - id, orderNo, status
   - facilityId, companyId
   - facility select hien co
   - company select hien co
   - lines requested/accepted qty va shipment/receipt quantity neu can tinh tong
   - `_count` cho lines, shipments, receipts
2. Neu khong tim thay order, throw `RouteError(404, ...)`.
3. Bo cac dieu kien cu:
   - chi xoa `DRAFT` hoac `REJECTED`
   - chan xoa khi da co shipment/receipt
4. Dung `prisma.$transaction` de xoa theo thu tu:
   - `drugOrderReceiptLine.deleteMany({ where: { receipt: { orderId } } })`
   - `drugOrderReceipt.deleteMany({ where: { orderId } })`
   - `drugOrderShipmentLine.deleteMany({ where: { shipment: { orderId } } })`
   - `drugOrderShipment.deleteMany({ where: { orderId } })`
   - `drugOrderLine.deleteMany({ where: { orderId } })`
   - `drugOrder.delete({ where: { id: orderId } })`
5. Tra ve `deletedOrder` snapshot co:
   - id, orderNo, status
   - facility/company
   - lineCount, shipmentCount, receiptCount
   - optional totals requested/accepted/shipped/received
6. Giu route DELETE trong `[id]/route.ts` ghi `ActivityLog` tu snapshot tra ve.
7. Cap nhat log message de khong noi "chi don nhap/tu choi".

### Acceptance Criteria

- Xoa duoc don o moi status.
- Xoa duoc don da co shipment.
- Xoa duoc don da co receipt.
- Khong con ban ghi con lien quan den orderId sau khi xoa.
- Activity log co snapshot du de truy vet.

## Phase 3: Delete Confirmation UI

### Objective

Thay `window.confirm` bang dialog xac nhan manh co nhap lai ma don.

### Tasks

1. Them state trong `AdminDrugOrdersPage`:
   - `deleteDialogOpen`
   - `deleteConfirmationText`
2. Thay `canHardDeleteSelectedOrder` bang `canDeleteSelectedOrder = Boolean(selectedOrder)`.
3. Nut `Xoa don` luon hien khi co selected order.
4. Nut xoa mo `AlertDialog`, khong goi delete ngay.
5. Dialog hien:
   - ma don
   - co so
   - cong ty
   - trang thai
   - line/shipment/receipt count neu da co trong selected detail
   - mo ta thao tac xoa vinh vien toan bo dong thuoc, giao hang, xac nhan thuc
     nhan
6. Them input yeu cau nhap dung `selectedOrder.orderNo`.
7. Nut confirm disabled neu text nhap khong khop orderNo hoac dang delete.
8. `handleDeleteOrder` chi chay khi text khop.
9. Sau xoa thanh cong:
   - dong dialog
   - reset confirmation text
   - clear selected detail
   - refresh list
   - neu list con don, chon don tiep theo theo logic hien co
10. Neu xoa fail:
   - giu dialog mo hoac dong theo UX hien tai; uu tien giu mo
   - toast loi
   - khong clear selected order

### Acceptance Criteria

- Khong con `window.confirm` cho xoa admin order.
- Admin phai nhap dung ma don moi xoa duoc.
- Nut xoa khong bi disable theo status/shipment/receipt.
- Loading state ro rang khi dang xoa.

## Phase 4: Desktop Detail Line Table

### Objective

Bo cot `Nguon` va hien bang dong thuoc theo danh muc cong ty.

### Tasks

1. Trong table detail desktop, bo `<TableHead>Nguon</TableHead>`.
2. Bo `<TableCell>` badge `Danh muc chung` / `Danh muc cong ty`.
3. Doi cot `Thuoc` thanh nhom thong tin:
   - ten thuoc cong ty
   - ma thuoc cong ty
   - hoat chat
4. Them cot hoac sub-columns cho:
   - `So dang ky`
   - `Dang bao che`
   - `Don vi`
5. Giu cac cot so luong:
   - Yeu cau
   - Chap nhan
   - Da giao
   - Da nhan
   - Con lai
6. Giu cot `Trang thai`.
7. Hien `Ly do cong ty` trong dong thuoc neu co, uu tien text nho duoi ten
   thuoc hoac cot rieng neu table con du rong.
8. Dam bao table khong qua rong hon hien tai qua nhieu:
   - co the gom `So dang ky`, `Dang bao che`, `Don vi` vao mot cot `Thong tin`
     neu can
   - desktop van cho scroll ngang neu du lieu dai

### Acceptance Criteria

- Desktop khong con cot `Nguon`.
- Moi dong co ma thuoc cong ty, ten thuoc, hoat chat, so dang ky, dang bao che,
  don vi.
- So luong va trang thai van hien day du.
- Gia tri thieu hien `--` hoac ky hieu empty hien co.

## Phase 5: Mobile Line Cards

### Objective

Bo badge nguon tren mobile va hien them thong tin danh muc cong ty.

### Tasks

1. Trong `renderMobileLinesSection`, bo badge source type.
2. Title card dung ten thuoc cong ty/fallback displayName.
3. Subtitle hoac suggestion block hien:
   - ma thuoc cong ty
   - hoat chat
   - so dang ky
   - dang bao che
   - don vi
4. Giu `LineStatusBadge`.
5. Giu fields so luong hien co, them `Con lai` neu chua ro.
6. Giu ly do cong ty neu co.
7. Neu component `DrugOrderLineMobileCard` bi gioi han layout, uu tien truyen
   suggestion/custom content thay vi sua component qua lon.

### Acceptance Criteria

- Mobile card khong con badge `Danh muc chung` / `Danh muc cong ty`.
- Mobile card hien du so dang ky, dang bao che, don vi.
- Layout khong bi tran text tren viewport nho.

## Phase 6: Summary And Detail Polish

### Objective

Lam ro tong quan giam sat ma khong them workflow moi.

### Tasks

1. Cap nhat summary metrics neu payload co du du lieu:
   - total orders
   - open orders
   - in delivery
   - completed / received enough
   - pending response
   - lines not fully received
2. Neu khong the tinh mot metric chinh xac tu summary payload hien co, tinh tu
   `orders` da serialize trong client va document limitation trong code comment
   ngan neu can.
3. Order list card/row hien canh bao:
   - accepted > shipped
   - shipped > received
   - pendingCatalogCount > 0
4. Giu bo loc hien tai, khong them quick filter.

### Acceptance Criteria

- Admin nhin duoc trang thai tong quan nhanh hon.
- Canh bao tren tung don ro nhung khong them action moi.
- Khong doi API contract khong can thiet.

## Phase 7: Verification

### Commands

Chay toi thieu:

```bash
rtk npm run lint
```

Neu co thoi gian hoac thay doi type lon:

```bash
rtk npm run build
```

### Manual Checks

1. Mo `/dashboard/admin/dutru-dat-hang`.
2. Kiem tra list/filter van load.
3. Mo mot don co dong thuoc lien ket company drug va master drug.
4. Xac nhan desktop table khong co cot `Nguon`.
5. Xac nhan dong thuoc co:
   - ma thuoc cong ty
   - ten thuoc cong ty
   - hoat chat
   - so dang ky
   - dang bao che
   - don vi
6. Kiem tra mobile viewport:
   - list card dung
   - detail line card khong con badge nguon
   - thong tin thuoc khong tran layout
7. Xoa thu mot don test o status khac nhau neu co data:
   - `DRAFT`
   - `SUBMITTED`
   - `IN_DELIVERY` co shipment
   - `COMPLETED` co receipt
8. Sau xoa, kiem tra Activity Log co ban ghi delete.
9. Neu co DB test, kiem tra cac bang con khong con row lien quan den orderId.

## Rollback Notes

Neu hard delete gap loi trong production-like data:

- revert phase 2 service delete logic ve check cu
- giu UI dialog neu can, nhung disable xoa theo dieu kien cu
- khong can revert cac thay doi bo cot `Nguon`

Neu UI table qua rong:

- gom `So dang ky`, `Dang bao che`, `Don vi` vao mot cot `Thong tin thuoc`
- giu mobile card chi tiet day du
