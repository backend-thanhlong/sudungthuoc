# Drug Order QR Lookup Design

## Context

Module `Dutru dat hang` hien da co:

- `Ma don` (`orderNo`) duy nhat cho moi `DrugOrder`
- man hinh chi tiet don rieng theo tung role:
  - `/dashboard/admin/dutru-dat-hang`
  - `/dashboard/facility/dutru-dat-hang`
  - `/dashboard/company/dutru-dat-hang`
- du lieu chi tiet don da bao gom:
  - thoi gian tao / gui
  - danh sach thuoc
  - so luong yeu cau / chap nhan / giao / nhan
  - lich su shipment va receipt

Nguoi dung muon moi `Ma don` co them QR de:

- tra cuu nhanh don sau khi quet
- xem don duoc tao luc nao
- xem don gom thuoc gi
- xem so luong yeu cau
- xem don da duoc giao hay nhan chua

Rang buoc da chot:

- QR van yeu cau dang nhap
- quyen xem QR lookup chi gom:
  - `ADMIN`
  - `FACILITY` so huu don
  - `COMPANY` cua don
- QR se duoc hien tren man chi tiet don truoc
- sau nay se tai su dung cho phieu in
- huong chon la tao mot man tra cuu dung chung thay vi nhay truc tiep vao cac man role-specific hien co
- man tra cuu se duoc dua vao dropdown `Du tru dat hang`

Codebase hien tai cung da co mot pattern token ky HMAC o [facility-report-token.ts](/opt/sudungthuoc/sudungthuoc/src/lib/facility-report-token.ts:1), nhung chua co QR library san va chua co man tra cuu QR cho `DrugOrder`.

## Goal

Them mot lop `QR lookup` cho `DrugOrder` de:

- mo nhanh mot man tra cuu don chi-doc sau khi quet QR
- thong nhat trai nghiem xem don cho `admin`, `facility`, va `company`
- khong tron QR lookup voi man nghiep vu van hanh hien tai
- tai su dung cung mot URL QR cho man chi tiet va phieu in trong tuong lai
- khong mo cong khai du lieu don cho nguoi chua dang nhap

## Scope

Bao gom:

- doi `Du tru dat hang` thanh dropdown nav o ca `admin`, `facility`, `company`
- them muc `Tra cuu QR don`
- tao route dung chung:
  - `/dashboard/dutru-dat-hang/tra-cuu`
- tao payload tra cuu chi-doc cho `DrugOrder`
- tao token helper rieng cho QR lookup
- hien QR tren man chi tiet don hien co
- cho phep tra cuu bang:
  - query token tu QR
  - nhap `Ma don` thu cong tu man tra cuu
- chot contract de phieu in tai su dung cung mot QR URL trong pha sau

Khong bao gom:

- mo cong khai man tra cuu cho nguoi chua dang nhap
- them thao tac van hanh tren man QR lookup
- doi rule nghiep vu phan hoi / giao / nhan
- them bang DB rieng de quan ly QR trong `V1`
- implement phieu in moi trong cung pha nay
- bat camera scan trong browser trong `V1`

## Approach Options

### Option 1: QR nhay thang vao man chi tiet theo role hien co

Lam:

- `facility` QR mo `/dashboard/facility/dutru-dat-hang`
- `company` QR mo `/dashboard/company/dutru-dat-hang`
- `admin` QR mo `/dashboard/admin/dutru-dat-hang`

Uu diem:

- nhanh
- tan dung UI san co

Nhuoc diem:

- cung mot QR nhung hanh vi khac nhau theo role
- man hien co mang ca thao tac nghiep vu, khong phai man tra cuu tinh gon
- kho tai su dung on dinh cho phieu in

### Option 2: Tao man tra cuu dung chung, chi-doc

Lam:

- QR luon mo cung mot route dung chung
- route nay tu verify token, check quyen, load don, va hien payload tra cuu read-only
- man nghiep vu hien tai van giu nguyen vai tro xu ly don

Uu diem:

- trai nghiem nhat quan
- phu hop nhu cau tra cuu hon la van hanh
- de tai su dung cho phieu in
- de test authz matrix

Nhuoc diem:

- can them route va payload moi

### Option 3: Tao bang DB rieng de quan ly moi QR link

Lam:

- moi QR co ban ghi rieng, co revoke, audit scan, rotation

Uu diem:

- mo rong manh ve sau

Nhuoc diem:

- qua nang cho `V1`
- them schema va operational complexity som

## Recommendation

Chon Option 2.

Day la phuong an can bang nhat giua:

- muc tieu nghiep vu "tra cuu don sau quet QR"
- authz da chot theo 3 nhom quyen
- kha nang giu on dinh cac man van hanh dang co
- kha nang tai su dung cho phieu in ma khong doi QR contract

## Product Decisions

Quyet dinh da chot:

- `Du tru dat hang` se thanh dropdown o nav
- moi dropdown co 2 muc:
  - `Quan ly don`
  - `Tra cuu QR don`
- route tra cuu dung chung la:
  - `/dashboard/dutru-dat-hang/tra-cuu`
- QR se chua URL truc tiep toi route tra cuu
- QR van yeu cau dang nhap
- nguoi duoc xem:
  - `ADMIN`
  - `FACILITY` so huu don
  - `COMPANY` cua don
- man tra cuu la `read-only`
- `V1` khong them expiry cho QR token
- `V1` khong tao QR rieng cho phieu in; phieu in sau nay tai su dung cung URL/token
- QR nen render duoi dang `SVG` de sac net tren UI va khi in

## Information Architecture

### 1. Navigation

Cap nav se doi nhu sau:

- `Admin`
  - `Du tru dat hang`
    - `Quan ly don` -> `/dashboard/admin/dutru-dat-hang`
    - `Tra cuu QR don` -> `/dashboard/dutru-dat-hang/tra-cuu`
- `Facility`
  - `Du tru dat hang`
    - `Quan ly don` -> `/dashboard/facility/dutru-dat-hang`
    - `Tra cuu QR don` -> `/dashboard/dutru-dat-hang/tra-cuu`
- `Company`
  - `Du tru dat hang`
    - `Quan ly don` -> `/dashboard/company/dutru-dat-hang`
    - `Tra cuu QR don` -> `/dashboard/dutru-dat-hang/tra-cuu`

Ly do:

- man tra cuu la tai nguyen dung chung cua 3 role
- route trung lap duoi `/dashboard` tranh bi rang buoc vao prefix role-specific
- middleware hien tai cho phep cach to chuc nay, vi no chi chan cac prefix `/dashboard/admin`, `/dashboard/facility`, `/dashboard/company`

### 2. Entry Modes Cua Man Tra Cuu

Man `/dashboard/dutru-dat-hang/tra-cuu` co 2 cach vao:

- `Mode 1: QR`
  - URL co query `?t=<token>`
  - he thong verify token va mo don ngay neu hop le
- `Mode 2: Manual lookup`
  - nguoi dung vao tu dropdown nav
  - man hien form nhap `Ma don`
  - submit xong he thong tim don theo `orderNo`, check quyen, roi hien ket qua

Muc tieu cua mode manual:

- man nav khong bi "chet" khi chua co token
- cung cap fallback neu nguoi dung co `Ma don` ma khong can quet QR

### 3. Noi Dung Man Tra Cuu

Man tra cuu chi-doc se gom 4 khoi:

#### a. Thong tin tong quan don

- `Ma don`
- co so
- cong ty
- trang thai don
- thoi gian tao
- thoi gian gui
- thoi gian dong / hoan tat neu co

#### b. Tong hop giao nhan

- tong so dong
- tong so luong yeu cau
- tong so luong da chap nhan
- tong so luong da giao
- tong so luong da thuc nhan
- nhan tong quan:
  - `Chua giao`
  - `Dang giao`
  - `Da nhan mot phan`
  - `Hoan tat`

#### c. Bang chi tiet thuoc

Moi dong hien:

- ten thuoc
- ma thuoc cong ty neu co
- thuoc chuan lien ket neu co
- don vi
- so luong yeu cau
- so luong chap nhan
- tong da giao
- tong da thuc nhan
- trang thai dong

#### d. Lich su shipment / receipt

Moi shipment hien:

- dot giao so may
- ngay giao / khoang ngay giao neu co
- ghi chu cong ty neu co
- cac dong trong shipment:
  - thuoc
  - so luong giao
  - so luong da nhan
  - ly do giao thieu neu co
- neu da co receipt:
  - thoi gian xac nhan
  - ghi chu
  - ly do chenh lech neu co

Man nay khong hien:

- nut sua nhap
- nut phan hoi
- nut tao shipment
- nut xac nhan receipt

## Technical Design

### 1. Route Design

Them route page moi:

- `/dashboard/dutru-dat-hang/tra-cuu/page.tsx`

Route nay nen la server-first route:

- doc `searchParams`
- neu co `t`, resolve token va load don
- neu co `orderNo`, resolve theo `Ma don`
- neu chua co du lieu tra cuu, render form + empty guidance

Khong can route API rieng trong `V1` neu page server component co the goi truc tiep service tra cuu.

### 2. Shared Lookup Service

Them mot module chung, vi du:

- `src/lib/drug-orders/lookup.ts`

Module nay chiu trach nhiem:

- resolve theo `token`
- resolve theo `orderNo`
- load `DrugOrder` theo read-only select
- check authz theo session user
- serialize thanh payload lookup dung chung

Khong nen tai su dung truc tiep cac loader `admin/company/facility` hien co, vi:

- cac loader hien co kem `permissions` va shape phuc vu man van hanh
- lookup can mot payload read-only on dinh, khong le thuoc vao role

### 3. QR Token Design

Them helper rieng, vi du:

- `src/lib/drug-orders/qr-token.ts`

Payload token `V1`:

- `orderId`
- `version`

Format:

- `base64url(payload).signature`

Signature:

- HMAC SHA-256

Secret:

- dung env rieng, vi du `DRUG_ORDER_QR_SIGNING_SECRET`

Khong nen dung chung secret cua module upload report de tranh coupling khong can thiet.

`V1` khong can:

- `expiresAt`
- revoke list
- token rotation
- bang DB rieng

Ly do:

- route da yeu cau dang nhap
- authz van duoc check lai tren ban ghi order thuc te
- QR trong `V1` chi dong vai tro deep-link da ky

### 4. QR URL Contract

QR se ma hoa URL co dang:

- `/dashboard/dutru-dat-hang/tra-cuu?t=<token>`

Man chi tiet don hien co se nhan them mot truong:

- `lookupUrl`

truong nay duoc tao tren server khi serialize payload don chi tiet.

Khong can expose `orderId` thang ra UI neu da co `lookupUrl`.

### 5. Hien QR Tren Man Chi Tiet Don

Them mot khoi `QR tra cuu don` tren man chi tiet cua:

- `AdminDrugOrdersPage`
- `FacilityDrugOrdersPage`
- `CompanyDrugOrdersPage`

Khoi nay gom:

- QR SVG
- `Ma don`
- mo ta ngan:
  - quet QR de tra cuu tinh trang don sau khi dang nhap

`V1` khong can them thao tac in ngay trong khoi nay, nhung layout nen du khoang trong de sau nay them `In phieu`.

### 6. Render QR

Nen dung mot library nhe co the xuat `SVG`, vi du `qrcode`.

Ly do chon `SVG`:

- sac net hon tren man hinh
- de dua vao phieu in sau nay
- khong phu thuoc vao canvas

Nen dong goi thanh mot component chung, vi du:

- `DrugOrderQrCode`

input:

- `lookupUrl`
- `orderNo`
- `size`

## Authz Rules

### 1. Login

Tat ca QR lookup deu yeu cau dang nhap.

Neu quet QR khi chua dang nhap:

- middleware / dashboard layout dua ve login
- sau login quay lai URL tra cuu goc

### 2. Role Matrix

Sau khi dang nhap va resolve duoc order:

- `ADMIN`: duoc xem
- `FACILITY`: chi duoc xem neu `order.facilityId === user.id`
- `COMPANY`: chi duoc xem neu `order.companyId === user.companyId`

Neu sai quyen:

- tra `403`
- hien thong diep ro rang:
  - `Ban khong co quyen xem don nay`

Neu token sai hoac don khong ton tai:

- tra `404`

### 3. Manual Lookup Theo Ma Don

Lookup theo `orderNo` cung dung chung authz rule nhu lookup theo token.

Nghia la:

- biet `Ma don` khong du de xem don
- session user van phai hop le voi order do

## Error Handling

Man tra cuu can phan biet ro:

- `Empty state`
  - vao tu menu, chua nhap `Ma don`, khong co token
- `Invalid QR`
  - token sai format / sai signature / sai version
- `Not found`
  - order da bi xoa hoac khong ton tai
- `Forbidden`
  - session dang nhap khong co quyen

UI khong nen dump stack hay technical detail.

## Reuse For Print

`V1` chua them phieu in moi, nhung phai chot contract de tai su dung:

- phieu in se nhung lai dung `lookupUrl`
- phieu in se tai su dung cung component `DrugOrderQrCode` hoac cung generator `SVG`
- khong tao token rieng cho phieu in

He qua mong muon:

- mot `Ma don` chi co mot QR lookup contract
- UI va phieu in khong bi lech y nghia

## Testing

### Unit

- tao token hop le
- reject token sai signature
- reject token sai version
- serialize lookup payload dung cac tong so giao / nhan
- authz matrix theo 3 role

### Integration

- `admin` mo duoc QR lookup cua moi order
- `facility` chi mo duoc order cua minh
- `company` chi mo duoc order cua cong ty minh
- lookup theo `orderNo` va theo `token` cho cung mot ket qua

### Manual

- vao tu nav dropdown khi chua co token
- quet QR khi chua dang nhap -> login -> quay lai dung man tra cuu
- QR hien dung tren 3 man chi tiet
- order dang `DRAFT`, `SUBMITTED`, `IN_DELIVERY`, `COMPLETED` deu hien dung thong tin
- QR SVG van sac net khi dua len phieu in mock sau nay

## Rollout Notes

`V1` nen trien khai theo thu tu:

1. token helper + lookup service
2. route tra cuu dung chung
3. dropdown nav
4. QR block tren 3 man chi tiet
5. manual test authz + redirect sau login

Khong can thay doi schema DB trong pha nay.
