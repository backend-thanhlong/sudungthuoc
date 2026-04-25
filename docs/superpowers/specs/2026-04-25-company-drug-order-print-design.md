# Company Drug Order Print Design

## Context

Module `dutru-dat-hang` da co san trang in cho vai tro co so tai
`/dashboard/facility/dutru-dat-hang/[id]/print`. Trang nay dung
`DrugOrderPrintDocument` de hien phieu du tru dat hang, QR tra cuu, thong tin
co so, cong ty, ghi chu va danh sach dong thuoc.

Vai tro cong ty tai `/dashboard/company/dutru-dat-hang` hien da xem va xu ly
don, nhung chua co nut in va chua co route print rieng.

## Goal

Them chuc nang in don cho vai tro cong ty bang cach dung lai mau in hien co,
dam bao cong ty chi in duoc don thuoc cong ty cua minh.

## Approach

Chon huong nho gon:

- them loader server-side trong `src/lib/drug-orders/company.ts`
- them route `/dashboard/company/dutru-dat-hang/[id]/print`
- dung lai `DrugOrderPrintDocument`
- them nut `In don` tren desktop va mobile action bar cua
  `CompanyDrugOrdersPage`

Huong nay giu nguyen mau giay in, tranh tao bien the giao dien moi va khong
doi API nghiep vu hien co.

## Data And Authorization

Route print yeu cau session role `COMPANY`. Loader truy van `DrugOrder` voi ca
`id` va `companyId` cua user hien tai. Neu khong tim thay don thi tra ve 404;
neu session khong hop le thi redirect ve login theo pattern route print cua co
so.

Payload in can co:

- thong tin don va trang thai
- thong tin co so day du de hien header in
- thong tin cong ty
- danh sach dong thuoc, so luong yeu cau, so luong xac nhan va trang thai
- `lookupUrl` de tao QR va link tra cuu

## UI

Trang company co nut `In don` khi da chon don:

- desktop: nam cung nhom hanh dong `Lam moi`, `Phan hoi don`, `Tao dot giao`
- mobile: nam trong action bar cua chi tiet don

Nut mo route print trong tab moi, tuong tu vai tro co so.

## Testing

Kiem tra bang TypeScript/lint sau khi sua:

- route print build duoc
- payload company tuong thich voi `DrugOrderPrintDocument`
- trang company import icon va ham mo print khong gay loi lint
