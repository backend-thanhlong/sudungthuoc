# Admin Drug Orders Rebuild Design

## Context

Trang `/dashboard/admin/dutru-dat-hang` hien dung `AdminDrugOrdersPage` de
giam sat don du tru dat hang cua tat ca co so va cong ty. Trang da co danh sach
don, bo loc, chi tiet don, QR, timeline giao nhan va nut xoa co dieu kien.

Workflow hien tai cua co so chi tao dong don tu `Danh muc cong ty`, nen cot
`Nguon` va badge `Danh muc chung` / `Danh muc cong ty` tren UI admin khong con
gia tri nghiep vu. Admin can tap trung vao viec xem, giam sat tien do va xoa
don khi can.

## Goal

Xay dung lai trang admin theo huong ket hop:

- giam sat tong quan nhanh
- mo va doc chi tiet tung don nhanh
- xoa vinh vien bat ky don nao, khong phu thuoc trang thai hay lich su giao nhan
- bo hien thi `Nguon` trong bang dong thuoc va mobile card
- hien dong thuoc theo thong tin `Danh muc cong ty`, bo sung `So dang ky`,
  `Dang bao che` va `Don vi`

Khong them thao tac nghiep vu moi nhu ghi chu noi bo, danh dau uu tien, sua don,
duyet don hay export Excel trong pham vi nay.

## Recommended Approach

Chon huong rebuild master-detail co dashboard nho:

- phan dau trang la KPI va bo loc dieu hanh
- ben duoi la layout 2 cot tren desktop
- cot trai la danh sach don co trang thai va canh bao
- cot phai la chi tiet don dang chon, chia thanh cac khu vuc ro rang
- mobile giu luong list -> detail, nhung bo cac badge/cot thua va uu tien thong
  tin xu ly

Huong nay giu lai API va component nen tang dang co, nhung sap xep lai hierarchy
de admin xem tong quan va xu ly don nhanh hon.

## Page Structure

### Summary Band

Hien thi cac metric gon:

- Tong don
- Don dang mo
- Dang giao
- Da nhan du
- Cho cong ty phan hoi
- Co dong chua nhan du

Metric duoc tinh tu payload danh sach. Neu payload hien tai chua co du thong
tin de tinh mot metric, bo sung tinh toan trong `loadAdminDrugOrderListPayload`.

### Filters

Giu cac bo loc hien tai:

- tim kiem ma don, co so, cong ty
- trang thai
- co so
- cong ty
- khoang ngay

Khong bo sung quick filter moi trong pham vi dau tien. Ban dau uu tien sap xep
lai UI, bo cot thua va lam ro canh bao tren tung don.

### Order List

Moi item trong danh sach don hien:

- Ma don
- Co so
- Cong ty
- Trang thai
- So dong thuoc
- Tong yeu cau
- Tong chap nhan
- Tong da giao
- Tong da nhan
- Ngay tao hoac ngay gui

Canh bao nho:

- `Da giao < Chap nhan`
- `Da nhan < Da giao`
- co dong bi tu choi
- co dong cho xac nhan danh muc neu du lieu cu con ton tai

### Order Detail

Chi tiet don chia thanh cac khu vuc:

1. Tong quan
   - Ma don
   - Co so
   - Cong ty
   - Trang thai
   - Thang XNT
   - Ghi chu
   - Tao luc, gui luc, dong luc
   - QR / in
   - nut xoa don

2. Dong thuoc
   - Bo cot `Nguon`
   - Bo badge `Danh muc chung` / `Danh muc cong ty`
   - Hien theo thong tin danh muc cong ty

3. Giao nhan
   - Timeline theo dot giao
   - Dong thuoc trong tung dot
   - So luong giao / nhan
   - Ly do chenh lech neu co

4. QR / In
   - Desktop hien QR / In trong khu vuc tong quan hoac ngay sau tong quan
   - Mobile giu section/tab QR rieng de khong lam dai phan thong tin chinh

## Drug Line Display

Bang dong thuoc tren desktop:

- Ma thuoc cong ty
- Ten thuoc cong ty
- Hoat chat
- So dang ky
- Dang bao che
- Don vi
- Yeu cau
- Chap nhan
- Da giao
- Da nhan
- Con lai
- Trang thai
- Ly do cong ty neu co

Nguon du lieu:

- `Ma thuoc cong ty`: `line.companyDrug.companyDrugCode`
- `Ten thuoc cong ty`: `line.companyDrug.companyDrugName`, fallback
  `line.displayName`
- `Hoat chat`: `line.companyDrug.activeIngredient`, fallback
  `line.companyDrug.masterDrug.hoatChat`
- `So dang ky`: `line.companyDrug.masterDrug.soDangKy`
- `Dang bao che`: `line.companyDrug.masterDrug.dangBaoChe`
- `Don vi`: uu tien `line.companyDrug.unit`, fallback `line.unit`, fallback
  `line.companyDrug.masterDrug.donViTinh`

Neu thuoc cong ty chua lien ket thuoc chuan, cac truong tu `masterDrug` hien
`--`.

Mobile card dong thuoc hien:

- ten thuoc cong ty
- ma thuoc cong ty
- hoat chat
- so dang ky / dang bao che / don vi
- cac so luong yeu cau, chap nhan, da giao, da nhan, con lai
- trang thai va ly do cong ty

## Delete Behavior

Admin duoc xoa vinh vien moi don, khong ngoai tru:

- khong gioi han trang thai
- khong gioi han da co dot giao hay bien nhan hay chua
- khong can phan biet `DRAFT`, bi tu choi, dang giao hay hoan tat

Backend khong nen chi goi `drugOrder.delete()` vi schema co cac quan he
`Restrict` voi shipment va receipt. Service `deleteAdminDrugOrder()` nen xoa
thu cong trong transaction theo thu tu:

1. `drugOrderReceiptLine`
2. `drugOrderReceipt`
3. `drugOrderShipmentLine`
4. `drugOrderShipment`
5. `drugOrderLine`
6. `drugOrder`

Truoc khi xoa, service load snapshot toi thieu de ghi audit:

- id don
- ma don
- trang thai
- co so id, ten co so
- cong ty id, ten cong ty
- so dong thuoc
- so dot giao
- so bien nhan
- tong yeu cau, chap nhan, da giao, da nhan neu san co

Sau khi transaction thanh cong, route ghi `ActivityLog` voi snapshot nay.

## Delete UI

Nut `Xoa don` luon hien cho admin khi co don dang chon.

Xac nhan xoa dung dialog manh hon `window.confirm`:

- mo ta ro rang thao tac se xoa vinh vien don, dong thuoc, lich su giao
  hang va xac nhan thuc nhan
- hien ma don, co so, cong ty, trang thai
- admin phai nhap dung ma don de bat nut xoa
- sau khi xoa thanh cong, refresh danh sach va chon don tiep theo neu co

Neu xoa that bai vi loi server, giu nguoi dung o chi tiet don hien tai va hien
toast loi.

## Data And API Changes

`loadAdminDrugOrderDetailPayload` can bo sung field neu chua co:

- `companyDrug.masterDrug.soDangKy`
- `companyDrug.masterDrug.dangBaoChe`
- `companyDrug.masterDrug.donViTinh`

`sourceType` co the giu trong payload va type de tuong thich du lieu cu, nhung
UI admin khong hien no.

`deleteAdminDrugOrder` thay doi tu xoa co dieu kien sang hard delete moi don.
Route `/api/admin/dutru-dat-hang/[id]` tiep tuc yeu cau
`requireActiveSessionUser("ADMIN")`.

## Error Handling

- List/detail load loi: toast va empty/error state nhu pattern hien tai
- Delete loi: toast loi, khong clear selection
- Delete thanh cong: toast thanh cong, clear detail cu, refresh list
- Neu don da bi xoa boi request khac: hien thong bao khong tim thay va refresh
  danh sach

## Security And Audit

- Chi role `ADMIN` duoc goi API list/detail/delete
- Hard delete la thao tac pha huy du lieu, nen bat buoc ghi `ActivityLog`
- Dialog nhap lai ma don giup tranh click nham
- Khong them quyen xoa cho facility/company
- Khong mo API delete hang loat trong pham vi nay

## Testing

Kiem tra sau khi sua:

- TypeScript/lint pass
- Admin thay duoc danh sach va chi tiet don
- Bang dong thuoc khong con cot `Nguon`
- Mobile card khong con badge `Danh muc chung` / `Danh muc cong ty`
- Dong thuoc hien ma thuoc cong ty, ten thuoc, hoat chat, so dang ky, dang bao
  che, don vi
- Xoa duoc don `DRAFT`
- Xoa duoc don `SUBMITTED`
- Xoa duoc don `IN_DELIVERY` da co shipment
- Xoa duoc don `COMPLETED` da co receipt
- Sau xoa, cac bang con khong con ban ghi mo coi lien quan den don
- Activity log ghi du snapshot don bi xoa
