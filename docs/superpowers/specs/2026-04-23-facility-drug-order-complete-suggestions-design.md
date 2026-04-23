# Facility Drug Order Complete Suggestions Design

## Context

Trang `/dashboard/facility/dutru-dat-hang` hien tai da co `Goi y XNT` cho tung dong thuoc trong draft, nhung logic nay con han che:

- chi goi y sau khi dong thuoc da nam trong draft
- chi dua tren `Xuat-Nhap-Ton`
- chi tra ve mot so `suggestedQty` va chuoi `suggestionBasis`
- chua tinh den luong hang da duoc cong ty chap nhan nhung co so chua nhan
- chua goi y danh sach thuoc nen them vao du tru tu catalog cong ty

Repo hien da co day du nen tang de nang cap:

- du lieu `InventoryReport` theo thang cua co so
- `CompanyDrug` da map `MasterDrug`
- vong doi `DrugOrder -> DrugOrderLine -> Shipment -> Receipt`
- UI draft va dialog chon thuoc cong ty
- logic demand / `monthsOfCover` trong dashboard supply

Yeu cau da chot:

- `Goi y` phai ap dung cho cac dong da chon trong draft
- he thong phai goi y them danh sach thuoc nen dua vao du tru
- rule nen giu `muc phu muc tieu = 2 thang`
- khong cho nguoi dung chinh target nay tren UI trong `V1`

## Goal

Nang cap tu `Goi y XNT` thanh `Goi y hoan chinh` de:

- de xuat `so luong nen dat` cho cac dong da co trong draft
- de xuat `thuoc nen them` vao draft tu catalog cong ty
- giam dat thieu khi ton kho sap can va giam dat du khi hang dang tren duong ve
- giu nguoi dung trong cung luong tao / sua draft, khong mo them route moi
- giu nghiep vu de hieu, co audit, va mo rong duoc trong cac phien ban sau

## Scope

Bao gom:

- doi ten va y nghia tu `Goi y XNT` thanh `Goi y`
- tach suggestion engine rieng cho module `dutru-dat-hang`
- tinh `goi y so luong` cho cac dong da co trong draft
- tinh `goi y thuoc nen them` tu `CompanyDrug` cua cong ty
- them API rieng de load du lieu goi y
- nang cap UI bang chi tiet draft
- nang cap dialog chon thuoc voi tab `Goi y nen them`
- bo sung state `loading / empty / error` cho khu vuc goi y
- bo sung unit / integration / manual test cases cho logic moi

Khong bao gom:

- cho phep nguoi dung tuy chinh `coverage target`
- thay doi nghiep vu cong ty phan hoi, giao hang, nhan hang
- them pagination / ranking nang cao cho tab goi y trong `V1`
- mo rong sang machine learning hoac scoring ngoai du lieu hien co
- migrate schema de luu JSON chi tiet cho goi y ngay trong pha dau

## Approach Options

### Option 1: Chi trinh bay lai `Goi y XNT`

Uu diem:

- nhanh nhat
- it doi backend

Nhuoc diem:

- khong giai quyet duoc bai toan `hang dang ve`
- khong goi y duoc danh sach thuoc nen them
- khong dat muc tieu `goi y hoan chinh`

### Option 2: Suggestion engine rieng cho `dutru-dat-hang`

Tach mot lop logic suggestion rieng, nhung van tai su dung du lieu va helper hien co.

Uu diem:

- ro boundary giua orchestration va business rule
- de test
- de mo rong them rule moi
- khop voi scope da chot

Nhuoc diem:

- can them API moi
- can chinh ca backend va frontend

### Option 3: Engine cau hinh dong ngay tu dau

Uu diem:

- linh hoat trong tuong lai

Nhuoc diem:

- tang scope som
- kho kiem soat nghiep vu
- thua nhu cau `V1`

### Recommendation

Chon Option 2.

Day la phuong an can bang nhat giua do sach kien truc, kha nang giao hang nhanh, va kha nang mo rong sau nay.

## Product Decisions

Quyet dinh da chot:

- `coverageTarget = 2 thang`
- khong cho chinh `coverageTarget` tren UI
- mac dinh danh sach `thuoc nen them` chi hien nhung thuoc co `recommendedQty > 0`
- van cho mo rong de xem them thuoc co du lieu XNT nhung nhu cau thap
- `Dùng gợi ý` luon ap vao `recommendedQty`
- neu goi y loi, nguoi dung van thao tac duoc bang `Danh mục công ty`

## Suggestion Rule Design

### 1. Nguon du lieu

Suggestion engine duoc phep dung:

- `InventoryReport` de lay `xuat`, `tonCuoi`, `status`, `reportMonth`
- `CompanyDrug` de xac dinh thuoc cong ty active va `masterDrugId`
- `DrugOrder`, `DrugOrderLine`, `DrugOrderShipment`, `DrugOrderReceipt` de tinh luong hang da duoc chap nhan va chua nhan

Khong dung:

- du lieu ngoai he thong
- scoring thu cong tu frontend

### 2. Dieu kien duoc tinh goi y

Mot thuoc chi duoc tinh goi y khi:

- la `MasterDrug`, hoac
- la `CompanyDrug` co `masterDrugId`

Neu `CompanyDrug` khong co `masterDrugId`:

- khong dua vao `catalogSuggestions`
- neu da nam trong draft thi dong do hien nhan `Chua lien ket`

### 3. Rule nen tu XNT

Rule nen giu tu logic hien tai:

- lay toi da `3` thang gan nhat cua cung co so va cung `masterDrug`
- uu tien `APPROVED`
- neu chua du thi bo sung bang `PENDING`
- lay `avgExport3Months = average(xuat cac thang duoc chon)`
- lay `latestEndingStock = tonCuoi` cua thang moi nhat trong tap duoc chon
- tinh:

`xntBaseQty = max(0, round(avgExport3Months * 2 - latestEndingStock))`

Trang thai du lieu:

- `Chinh thuc`: chi dung `APPROVED`
- `Tam`: co dung `PENDING`
- `Chua du du lieu`: khong co bucket hop le de tinh

### 4. Rule tru hang dang ve

De tranh dat du, he thong tinh them:

- `incomingAcceptedQty = sum(max(acceptedQty - receivedQty, 0))`

Tap tinh nay gom:

- cac `DrugOrderLine` cung `facility`
- cung `masterDrug`
- thuoc cac don dang mo va da co `acceptedQty > 0`
- khong tinh chinh draft dang sua

Muc tieu:

- tru di luong hang cong ty da chap nhan nhung co so chua nhan du

### 5. Rule goi y cuoi cung

Cho moi dong du dieu kien:

- `recommendedQty = max(0, xntBaseQty - incomingAcceptedQty)`

Du lieu tra ve can gom:

- `xntBaseQty`
- `incomingAcceptedQty`
- `recommendedQty`
- `avgMonthlyExport`
- `latestEndingStock`
- `latestReportMonth`
- `confidence`
- `monthsOfCover`
- `statusLabel`
- `basisLines`
- `ruleVersion`

### 6. Rule cho thuoc nen them vao du tru

He thong quet `CompanyDrug` cua cong ty hien tai va ap dung:

- chi lay `CompanyDrug` active
- chi lay dong co `masterDrugId`
- loai bo thuoc da co trong draft
- tinh `recommendedQty` theo cung rule voi dong trong draft
- mac dinh chi tra ve thuoc co `recommendedQty > 0`

Thu tu sap xep mac dinh:

- `recommendedQty` giam dan
- `monthsOfCover` tang dan
- `companyDrugName` tang dan

### 7. Rule versioning

`V1` giu rule version moi tach rieng khoi `Goi y XNT` cu:

- de nghi dat ten `complete-v1-coverage-2m-net-incoming`

Ly do:

- phan biet ro voi `xnt-v1-coverage-2m`
- de audit sau nay khi doi cong thuc

## Architecture Design

### 1. Module boundary

Tao module moi:

- `src/lib/drug-orders/suggestions.ts`

Trach nhiem:

- load du lieu nen
- tinh `lineSuggestions`
- tinh `catalogSuggestions`
- serialize suggestion output cho UI

`src/lib/drug-orders/facility.ts` chi con:

- tao / cap nhat draft
- goi suggestion engine khi can snapshot
- tra payload cho route

### 2. Reuse helper hien co

Nen tai su dung hoac trich chung:

- parse / sort `reportMonth`
- helper tinh `demandAvg` va `monthsOfCover`
- formatter quantity

Khong de 2 cong thuc demand song song trong:

- `src/lib/drug-orders/facility.ts`
- `src/lib/dashboard/supply-risk.ts`

### 3. Output shape

Suggestion engine nen tra ve cau truc du lieu ro rang, khong chi mot chuoi text:

- `lineSuggestions: Record<lineKey, SuggestionResult>`
- `catalogSuggestions: SuggestionCatalogItem[]`

`SuggestionResult` gom:

- `recommendedQty`
- `xntBaseQty`
- `incomingAcceptedQty`
- `avgMonthlyExport`
- `latestEndingStock`
- `monthsOfCover`
- `status`
- `suggestionReportMonth`
- `suggestionRuleVersion`
- `basisLines`

## API Design

### 1. New endpoint

Them endpoint rieng:

- `GET /api/facility/dutru-dat-hang/suggestions`

Query params:

- `companyId`
- `baseReportMonth`
- `orderId` optional

Y nghia:

- `companyId`: cong ty dang lap du tru
- `baseReportMonth`: thang goc XNT
- `orderId`: draft hien tai neu dang sua don

### 2. Response shape

Response gom:

- `lineSuggestions`
- `catalogSuggestions`
- `meta`

`lineSuggestions` dung de refresh cac dong da co trong draft.

`catalogSuggestions` dung cho tab `Goi y nen them`.

`meta` gom:

- `effectiveReportMonth`
- `coverageTargetMonths`
- `defaultCatalogMode`

### 3. Existing draft APIs

Khi `POST /api/facility/dutru-dat-hang` va `PATCH /api/facility/dutru-dat-hang/[id]`:

- backend van snapshot tren `DrugOrderLine`
- tiep tuc luu:
  - `suggestedQty`
  - `suggestionBasis`
  - `suggestionReportMonth`
  - `suggestionRuleVersion`

Trong `V1`:

- `suggestedQty` se la `recommendedQty`
- `suggestionBasis` se la chuoi tom tat tu `basisLines`

### 4. Khong nhung du lieu goi y vao list payload

Khong dua `catalogSuggestions` vao:

- `GET /api/facility/dutru-dat-hang`

Ly do:

- tranh phinh payload list
- chi tinh khi nguoi dung mo workflow can den goi y

## UI Design

### 1. Bang chi tiet draft

Tai bang dong thuoc:

- doi cot `Goi y XNT` thanh `Goi y`
- so chinh hien `recommendedQty`
- thong tin phu hien:
  - `Nen XNT`
  - `Dang ve`
  - `Thang tham chieu`
- hien badge:
  - `Chinh thuc`
  - `Tam`
  - `Chua lien ket`
  - `Chua du du lieu`

Button:

- giu `Dùng gợi ý` tren tung dong
- giu `Dùng tất cả gợi ý` tren bang
- ca hai deu dung `recommendedQty`

### 2. Draft summary

Bo sung them card hoac summary nho:

- `Dong co goi y`
- `Thuoc de xuat nen them`

Muc dich:

- cho nguoi dung biet draft hien tai da du phu het de xuat hay chua

### 3. Dialog chon thuoc

Tai dialog tao / them thuoc, bo sung 2 tab:

- `Danh mục công ty`
- `Gợi ý nên thêm`

`Danh mục công ty`:

- giu hanh vi chon thu cong hien tai

`Gợi ý nên thêm`:

- chi hien `CompanyDrug` active
- chi hien dong da map `masterDrugId`
- loai bo dong da co trong draft
- mac dinh chi hien thuoc co `recommendedQty > 0`
- co toggle `Hiện cả thuốc có dữ liệu XNT`

Cot goi y nen them:

- `Chọn`
- `Mã thuốc công ty`
- `Tên thuốc`
- `Thuốc chuẩn liên kết`
- `Gợi ý`
- `Độ phủ`
- `Lý do`

### 4. Default behavior

Khi tao draft moi:

- sau khi nguoi dung chon `companyId`, dialog mac dinh vao tab `Gợi ý nên thêm`

Khi mo them thuoc cho draft dang sua:

- mac dinh vao tab `Gợi ý nên thêm`
- nhung nguoi dung van chuyen tab de chon thu cong

### 5. Empty and warning states

Neu chua chon cong ty:

- hien `Chọn công ty để xem gợi ý`

Neu chua chon `baseReportMonth`:

- van tinh tren thang moi nhat kha dung
- hien ro `Đang dùng tháng gần nhất`

Neu khong co thuoc nao duoc de xuat:

- hien `Hiện chưa có thuốc nào được đề xuất thêm`

Neu API goi y loi:

- hien banner ngan:
  - `Không tải được gợi ý, bạn vẫn có thể chọn thuốc thủ công.`

## Error Handling

### Backend

- thieu `companyId`: tra `400`
- `baseReportMonth` sai format: tra `400`
- cong ty hop le nhung khong co thuoc active: tra danh sach rong
- thuoc khong co `masterDrugId`: khong dua vao `catalogSuggestions`
- khong du du lieu XNT: khong nem loi, tra `recommendedQty = null`
- loi he thong khi tinh goi y: tra `500`

### Frontend

Tab `Gợi ý nên thêm` phai co 3 state:

- `loading`
- `empty`
- `error`

Neu API loi:

- khong chan tab `Danh mục công ty`
- cho phep nguoi dung tiep tuc them thuoc thu cong

Neu dong co `recommendedQty = null`:

- khong hien `Dùng gợi ý`
- hien nhan trang thai tuong ung

Neu `baseReportMonth` thay doi:

- invalidate suggestion data cu
- refresh lai `lineSuggestions` va `catalogSuggestions`

## Testing

### Unit tests

Can cover:

- du `3` thang `APPROVED`
- thieu `APPROVED`, phai bu `PENDING`
- khong du du lieu thi tra `Chua du du lieu`
- co `incomingAcceptedQty`, phai tru dung
- `recommendedQty` khong am
- danh sach `catalogSuggestions` loai thuoc da co trong draft

### Integration tests

Can cover:

- `GET /suggestions` tra dung `lineSuggestions`
- `GET /suggestions` chi tra `CompanyDrug` active va co `masterDrugId`
- doi `baseReportMonth` thi ket qua thay doi dung
- `POST/PATCH draft` snapshot dung `recommendedQty`

### Manual verification

Can cover:

- doi thang goc XNT thi goi y doi theo
- `Dùng gợi ý` dien dung `recommendedQty`
- `Dùng tất cả gợi ý` chi ap vao dong hop le
- tab `Gợi ý nên thêm` cho chon nhieu thuoc va them vao draft dung
- API goi y loi nhung tab `Danh mục công ty` van su dung duoc

## Risks

- mapping `CompanyDrug -> MasterDrug` chua day du se lam tab goi y ngheo du lieu
- suggestion snapshot co the cu ngay sau khi ton kho hoac trang thai giao hang thay doi
- neu cong ty co catalog rat lon, `V1` chap nhan danh sach dai va chua lam pagination

## Mitigations

- hien ro nhan `Chua lien ket` va `Chua du du lieu`
- refresh suggestion khi:
  - mo draft
  - doi `baseReportMonth`
  - luu nhap
- giu tab `Danh mục công ty` la fallback thao tac thu cong

## Acceptance Checks

1. Nguoi dung co the xem `Gợi ý` tren tung dong draft thay vi chi `Gợi ý XNT`.
2. `Gợi ý` tren dong phan anh ca `nen XNT` va `hang dang ve`.
3. `Dùng gợi ý` dien `recommendedQty`, khong dien `xntBaseQty`.
4. Dialog chon thuoc co tab `Gợi ý nên thêm`.
5. Tab `Gợi ý nên thêm` loai bo thuoc da co trong draft.
6. Mac dinh chi hien thuoc co `recommendedQty > 0`.
7. Neu API goi y loi, nguoi dung van them thuoc thu cong duoc.
8. `coverageTarget` duoc co dinh la `2 thang` trong `V1`.
