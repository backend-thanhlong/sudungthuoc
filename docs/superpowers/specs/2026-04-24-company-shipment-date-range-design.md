# Company Shipment Date Range Design

## Context

Trang `/dashboard/company/dutru-dat-hang` hien tai da co luong `Tao dot giao` hoat dong on dinh:

- company chon cac dong can giao
- nhap `Thoi diem giao`
- nhap ghi chu chung cho dot giao
- gui payload len route `POST /api/company/dutru-dat-hang/[id]/shipments`
- backend tao `DrugOrderShipment` va cac `DrugOrderShipmentLine`

Tuy nhien mo hinh hien tai chi luu duy nhat mot moc `shippedAt`:

- schema `DrugOrderShipment` chi co `shippedAt DateTime?`
- route company parse duy nhat `body.shippedAt`
- dialog UI chi co mot input `datetime-local`
- man company va facility deu hien `Thoi diem giao` nhu mot moc don

Yeu cau nghiep vu moi da duoc chot:

- `Thoi diem giao` phai tro thanh mot khoang ngay
- nguoi dung company nhap theo `Tu ngay` va `Den ngay`
- day phai la du lieu that cua dot giao, khong phai meo UI hay ghi chu
- hien thi lich su dot giao phai dung cung quy tac moi
- doi tuong shipment cu van phai doc duoc binh thuong

## Goal

Mo rong luong `Tao dot giao` de ho tro `khoang ngay giao hang` ma khong pha vo du lieu va man hinh hien co:

- company tao shipment voi `Tu ngay` va `Den ngay`
- backend luu day du range date tren `DrugOrderShipment`
- shipment moi va shipment cu deu hien thi dung o company va facility
- du lieu cu duoc backfill de dong bo cach hien thi
- `shippedAt` duoc giu lai tam thoi de tuong thich nguoc

## Scope

Bao gom:

- them field moi vao `DrugOrderShipment`
- migration va backfill du lieu shipment cu
- doi payload route tao shipment company
- doi UI dialog `Tao dot giao` tren company
- doi serializer va UI hien thi shipment tren company va facility
- doi activity log details lien quan den shipment moi
- bo sung validation frontend va backend cho `Tu ngay` / `Den ngay`

Khong bao gom:

- doi nghiep vu so luong giao
- doi nghiep vu receipt cua facility
- doi status workflow shipment
- them bo loc shipment theo khoang ngay
- doi tab/route khac ngoai nhung cho hien thi shipment da ton tai

## Current Constraints

### 1. Data model hien tai chi co mot moc giao

`DrugOrderShipment` hien chi luu:

- `shippedAt`
- `companyNote`
- `status`

Tat ca serializer, activity log, va UI hien tai deu su dung moc nay.

### 2. UI hien tai la `datetime-local`

Dialog company dang nhap:

- `Thoi diem giao` bang `type="datetime-local"`
- `Ghi chu dot giao`

Dieu nay khong phu hop voi nghiep vu "dot giao dien ra trong mot khoang ngay".

### 3. Can tranh pha vo shipment cu

Repo da co du lieu shipment lich su. Thay doi moi phai:

- khong lam hong man company
- khong lam hong man facility
- khong bat shipment cu phai chinh sua tay

## Approach Options

### Option 1: Luu range day du va giu `shippedAt` de tuong thich nguoc

Lam:

- them `shippedFromDate`
- them `shippedToDate`
- van giu `shippedAt`
- shipment moi set `shippedAt = shippedFromDate`
- UI va serializer uu tien range moi, fallback ve `shippedAt` cho du lieu cu

Uu diem:

- dap ung nghiep vu moi nhu du lieu that
- it rui ro nhat
- de backfill shipment cu

Nhuoc diem:

- model tam thoi co 3 field lien quan ngay giao

### Option 2: Thay hoan toan `shippedAt` bang `shippedFromDate` / `shippedToDate`

Lam:

- bo vai tro `shippedAt`
- chuyen toan bo code sang range date

Uu diem:

- model sach hon ve ly thuyet

Nhuoc diem:

- rui ro cao
- can sua dong loat company, facility, log, va du lieu lich su

### Option 3: Luu range vao metadata hoac note

Lam:

- khong doi schema chinh
- nhet thong tin range vao field phu

Uu diem:

- migration nhe

Nhuoc diem:

- du lieu khong chat
- kho query, kho report, kho mo rong

## Recommendation

Chon Option 1.

Day la phuong an can bang nhat giua:

- yeu cau nghiep vu luu `Tu ngay ... Den ngay` thanh du lieu that
- kha nang giu on dinh cac man dang dung `shippedAt`
- kha nang chuyen doi du lieu cu an toan

## Product Decisions

Da chot:

- range giao hang la theo `ngay`, khong phai `ngay gio`
- UI dung 2 input `Tu ngay` va `Den ngay`
- backend luu:
  - `shippedFromDate = dau ngay`
  - `shippedToDate = cuoi ngay`
- `shippedAt` van duoc set bang `shippedFromDate`
- shipment moi va shipment cu deu dung cung mot quy tac hien thi:
  - co range day du -> hien range
  - khong co range -> fallback ve `shippedAt`

## Data Model Design

### Schema changes

Model `DrugOrderShipment` duoc bo sung:

- `shippedFromDate DateTime? @map("shipped_from_date")`
- `shippedToDate DateTime? @map("shipped_to_date")`

`shippedAt` duoc giu nguyen trong pha nay.

### Semantics

- `shippedFromDate`: thoi diem dau ngay cua `Tu ngay`
- `shippedToDate`: thoi diem cuoi ngay cua `Den ngay`
- `shippedAt`: gia tri tuong thich nguoc, luon bang `shippedFromDate` voi shipment moi

### Backfill

Migration du lieu cu:

- neu shipment co `shippedAt`
- set `shippedFromDate = dau ngay cua shippedAt`
- set `shippedToDate = cuoi ngay cua shippedAt`

Ket qua:

- shipment cu co the hien thi theo cung rule moi
- khong can giu hai loai cach render khac nhau qua lau

## API Design

### Request payload

Route `POST /api/company/dutru-dat-hang/[id]/shipments` doi request body tu:

- `shippedAt`

thanh:

- `shippedFromDate`
- `shippedToDate`
- `companyNote`
- `lines`

Dang gia tri tu frontend:

- `shippedFromDate`: chuoi `YYYY-MM-DD`
- `shippedToDate`: chuoi `YYYY-MM-DD`

### Parsing and validation

Backend them parser theo cap:

- bat buoc co ca `shippedFromDate` va `shippedToDate`
- reject neu mot trong hai truong thieu
- reject neu parse date khong hop le
- reject neu `shippedFromDate > shippedToDate`

Quy uoc parse:

- `shippedFromDate` -> `00:00:00.000`
- `shippedToDate` -> `23:59:59.999`

Validation message can ro rang:

- `Vui long chon Tu ngay va Den ngay giao hang`
- `Tu ngay khong duoc lon hon Den ngay`
- `Khoang ngay giao hang khong hop le`

### Persistence

Khi tao shipment moi:

- `shippedFromDate` luu gia tri dau ngay
- `shippedToDate` luu gia tri cuoi ngay
- `shippedAt` luu cung gia tri voi `shippedFromDate`
- cac rule cu cho `lines` giu nguyen

### Response payload

Serializer company va facility bo sung cac field:

- `shippedFromDate`
- `shippedToDate`

`shippedAt` van co mat trong response de tranh pha vo cac cho chua doi ngay.

## UI Design

### 1. Company shipment dialog

Dialog `Tao dot giao` tren [CompanyDrugOrdersPage.tsx](/opt/sudungthuoc/sudungthuoc/src/components/drug-orders/CompanyDrugOrdersPage.tsx) doi khung input chung:

- bo label `Thoi diem giao`
- dung label `Thoi gian giao`
- thay input `datetime-local` bang 2 input `date`:
  - `Tu ngay`
  - `Den ngay`

Layout:

- desktop: 2 cot canh nhau
- mobile: xep doc

Gia tri mac dinh:

- `Tu ngay = hom nay`
- `Den ngay = hom nay`

Validation UI:

- neu `Tu ngay > Den ngay` thi chan submit
- hien toast `Tu ngay khong duoc lon hon Den ngay`

### 2. Shipment list in company detail

Cho dang hien:

- `Thoi diem giao: ...`

doi thanh:

- `Thoi gian giao: ...`

Rule hien thi:

- co `shippedFromDate` va `shippedToDate`, neu cung ngay -> hien 1 ngay
- co `shippedFromDate` va `shippedToDate`, neu khac ngay -> hien `dd/MM/yyyy - dd/MM/yyyy`
- neu khong co range -> fallback ve `shippedAt`

### 3. Shipment history on order lines

Moi cho tom tat shipment gan nhat tren dong thuoc cung dung cung helper hien thi range, khong tiep tuc hien `formatDateTime(shippedAt)`.

### 4. Facility display

Man facility dang doc shipment history va danh sach shipment tu serializer cung phai doi sang cung helper hien thi range date, de:

- company va facility nhin cung mot nghia du lieu
- tranh tinh trang company thay range nhung facility van thay moc le

## Shared Presentation Rule

Can co mot helper format chung cho shipment range:

- nhan `shippedFromDate`, `shippedToDate`, `shippedAt`
- uu tien range moi
- fallback ve `shippedAt`
- neu ca 3 deu rong -> hien placeholder phu hop

Muc tieu:

- tranh lap logic format o nhieu vi tri
- dam bao company va facility render thong nhat

## Activity Log and Notifications

Notifications co the giu gon:

- tieu de va noi dung khong can chen full range date

Activity log details cua shipment moi nen luu them:

- `shippedFromDate`
- `shippedToDate`
- `shippedAt`

Muc dich:

- de audit
- de debug neu can so sanh du lieu cu va moi

## Error Handling

### Frontend

- chan submit neu khong co `Tu ngay` hoac `Den ngay`
- chan submit neu `Tu ngay > Den ngay`
- neu API tra loi validate error thi hien toast nhu flow hien tai

### Backend

- thieu 1 trong 2 truong -> `400`
- parse date loi -> `400`
- `Tu ngay > Den ngay` -> `400`
- cac rule validate line shipment hien co giu nguyen:
  - phai co it nhat 1 dong giao
  - khong giao vuot so luong con lai
  - giao thieu phai co ly do

## Testing

### Unit tests

- parser nhan dung `shippedFromDate` / `shippedToDate`
- reject khi thieu mot dau range
- reject khi `Tu ngay > Den ngay`
- parser luu dau ngay / cuoi ngay dung quy uoc

### Integration tests

- route tao shipment luu dung:
  - `shippedFromDate`
  - `shippedToDate`
  - `shippedAt = shippedFromDate`
- shipment moi van tao line va cap nhat status nhu cu
- serializer company tra range moi
- serializer facility tra range moi

### Manual verification

- tao shipment 1 ngay
- tao shipment nhieu ngay
- xem lai shipment o company detail
- xem shipment history tren tung dong company
- xem lai shipment o facility detail
- xac nhan shipment cu van hien thi dung sau backfill

## Rollout Notes

Thu tu trien khai an toan:

1. them schema va migration backfill
2. cap nhat parser va service tao shipment
3. cap nhat serializer company va facility
4. doi UI company shipment dialog
5. doi cac cho hien thi shipment range
6. chay kiem tra tu dong va manual verification

## Risks

### 1. Lech nghia giua `shippedAt` va range moi

Giam thieu bang cach:

- quy dinh ro `shippedAt = shippedFromDate`
- helper format luon uu tien range moi

### 2. Bo sot mot cho dang render `shippedAt`

Giam thieu bang cach:

- search toan repo theo `shippedAt`
- doi cac diem hien thi user-facing trong company va facility

### 3. Migration backfill lam du lieu cu hien sai

Giam thieu bang cach:

- backfill theo dau ngay / cuoi ngay cung ngay cua `shippedAt`
- manual verify mot shipment cu tren ca hai man

