# Du Tru Dat Hang Module Design

## Context

He thong hien tai da co:

- user role `ADMIN` va `FACILITY`
- danh muc thuoc dung chung `MasterDrug`
- anh xa thuoc co so `FacilityDrugMap`
- du lieu `Xuat-Nhap-Ton` theo thang
- notification va activity log
- cum module `Mua sam` phuc vu `KHLCNT / TBMT / KQLCNT`

Nguoi dung muon bo sung mot module `Du tru dat hang` de:

- co so lap du tru va tao don dat thuoc cho cong ty
- cong ty nhan, phan hoi va xu ly don tren chinh phan mem nay
- quy trinh di tu du tru den giao hang, nhan hang va dong don

Module nay duoc chot la **tach rieng khoi module `Mua sam`**, chi dung chung nen tang nguoi dung, danh muc, du lieu XNT, notification va audit.

## Goal

Bo sung module `Du tru dat hang` doc lap, ho tro:

- co so tao va gui don dat hang cho cong ty
- moi don chi thuoc ve dung `1` cong ty
- mot co so co the dat hang cua nhieu cong ty khac nhau
- cong ty chi thay module `Du tru dat hang`, khong xem duoc module khac trong phan mem
- cong ty chi thay va xu ly don cua chinh cong ty do
- cong ty chi duoc `xac nhan`, `tu choi`, hoac `giao thieu` theo don goc, tat ca truong hop deu phai ghi ly do
- don co the giao `1` dot hoac `nhieu` dot
- co so xac nhan thuc nhan theo tung dong thuoc va tung dot giao
- he thong goi y so luong dat dua tren du lieu `Xuat-Nhap-Ton`
- `ADMIN` chi giam sat, tra cuu va thong ke, khong tham gia duyet hay xu ly don

## Scope

Bao gom:

- them role `COMPANY`
- them du lieu cong ty va tai khoan cong ty
- them route, menu va API rieng cho `FACILITY`, `COMPANY`, `ADMIN`
- them danh muc thuoc cong ty
- them chung tu don hang, dong don, dot giao va xac nhan thuc nhan
- them goi y so luong tu XNT trong giai doan draft
- them notification va activity log cho nghiep vu moi
- them man hinh giam sat cho `ADMIN`

Khong bao gom:

- gop module moi vao `Mua sam`
- cho cong ty truy cap `XNT`, `Mappings`, `Master drugs`, `Reports`, `Inventory search`, hay cac module hien co khac
- cho cong ty sua noi dung don goc cua co so
- cho `ADMIN` duyet don truoc khi gui cong ty
- mo rong sang ERP day du nhu bang gia, cong no, hoa don, SLA, hop dong chi tiet, doi soat thuong mai

## Approach Options

### Option 1: Module doc lap dung chung nen tang hien co

Them module `Du tru dat hang` rieng, nhung tai su dung:

- auth
- user
- danh muc thuoc dung chung
- XNT
- notification
- audit log

Uu diem:

- phu hop nhat voi kien truc app hien tai
- khong lam roi domain `Mua sam`
- pilot `1` cong ty duoc ngay
- mo rong nhieu cong ty sau nay khong phai dap lai schema

Nhuoc diem:

- can them role moi
- can them mot so bang nghiep vu moi
- can sua middleware va redirect vi he thong hien tai dang gia dinh chi co `ADMIN` va `FACILITY`

### Option 2: Pilot nhe, gan nhu hardcode `1` cong ty

Khong tao thuc the `Company` day du, chi them tai khoan cong ty va viet logic thiet ke quanh `1` cong ty thi diem.

Uu diem:

- ra nhanh nhat

Nhuoc diem:

- gan nhu chac chan phai lam lai khi co cong ty thu `2`
- kho khoa du lieu dung cach theo tung cong ty
- de sinh no ky thuat

### Option 3: Nen tang B2B day du ngay tu dau

Lam them hop dong, bang gia, nhieu user moi cong ty, pham vi cung ung, doi soat va cac rule thuong mai phuc tap.

Uu diem:

- bai ban ve mat kien truc

Nhuoc diem:

- qua lon cho scope hien tai
- cham ra pilot
- vuot nhu cau da chot

### Recommendation

Chon Option 1.

Day la phuong an can bang nhat:

- tach biet ro voi `Mua sam`
- an toan cho pilot
- khong anh huong nghiep vu co so hien tai
- san sang cho truong hop nhieu cong ty trong tuong lai

## Architecture Design

Module `Du tru dat hang` la mot business area rieng, nam song song voi `Mua sam`.

Phan vai:

- `FACILITY`: lap du tru, tao draft, gui don, theo doi phan hoi cong ty, xac nhan thuc nhan tung dot giao
- `COMPANY`: chi thay module `Du tru dat hang`, quan ly danh muc thuoc cong ty, phan hoi don, tao dot giao, theo doi phan da giao va phan con thieu
- `ADMIN`: chi giam sat, tra cuu, thong ke

Shared foundation:

- auth va session hien co
- bang `User`
- `MasterDrug`
- du lieu `InventoryReport`
- notification
- activity log

Independent business core:

- `Company`
- `CompanyDrug`
- `Order`
- `OrderLine`
- `OrderShipment`
- `OrderShipmentLine`
- `OrderReceipt`
- `OrderReceiptLine`

Module `Mua sam` giu nguyen nghia hien tai:

- `KHLCNT`
- `TBMT`
- `KQLCNT`

Du lieu `Xuat-Nhap-Ton` chi dong vai tro tham chieu de goi y nhu cau dat hang.

## Data Design

### Company

Bang cong ty gom:

- `id`
- `code`
- `name`
- `isActive`
- thong tin lien he co ban

Bang nay duoc tao ngay tu dau du chi pilot `1` cong ty.

### User Extension

Them `companyId` nullable vao `User`.

Nguyen tac:

- `ADMIN`: `companyId = null`
- `FACILITY`: `companyId = null`
- `COMPANY`: bat buoc co `companyId`

Tai khoan cong ty o giai doan `V1` la `1 company = 1 user`, nhung schema cho phep mo rong sau nay.

### CompanyDrug

Danh muc thuoc cong ty.

Moi dong co the:

- gan voi `MasterDrug` neu la thuoc thuoc danh muc chung
- hoac doc lap neu la thuoc rieng cua cong ty

Truong chinh:

- `companyId`
- `masterDrugId` nullable
- `companyDrugCode`
- `companyDrugName`
- `activeIngredient`
- `unit`
- `isActive`

### Order

Bang chung tu chinh cua module.

Truong chinh:

- `id`
- `orderNo`
- `facilityId`
- `companyId`
- `status`
- `baseReportMonth`
- `note`
- `createdAt`
- `submittedAt`
- `closedAt`

V1 khong tach bang rieng cho `du tru` va `don dat hang`.

`Order.status = DRAFT` dong vai tro giai doan du tru.

### OrderLine

Moi dong thuoc trong don.

Truong chinh:

- `orderId`
- `sourceType` = `MASTER_DRUG` hoac `COMPANY_DRUG`
- `masterDrugId` nullable
- `companyDrugId` nullable
- `requestedQty`
- `suggestedQty`
- `lineStatus`
- `companyResponseReason`
- `suggestionBasis`
- `suggestionReportMonth`
- `suggestionRuleVersion`

Neu co so chon mot `MasterDrug` ma cong ty chua khai bao cung ung, dong do vao trang thai `PENDING_CATALOG_CONFIRMATION`.

### OrderShipment

Moi don co the co `1` hoac nhieu dot giao.

Truong chinh:

- `id`
- `orderId`
- `shipmentNo`
- `status`
- `shippedAt`
- `companyNote`

### OrderShipmentLine

Moi dong giao thuoc trong tung dot giao.

Truong chinh:

- `shipmentId`
- `orderLineId`
- `shippedQty`
- `reason`

Neu giao thieu thi `reason` la bat buoc.

### OrderReceipt

Xac nhan nhan hang cua co so theo tung dot giao.

Truong chinh:

- `id`
- `orderId`
- `shipmentId`
- `facilityId`
- `confirmedAt`
- `note`

### OrderReceiptLine

Xac nhan thuc nhan theo tung dong.

Truong chinh:

- `receiptId`
- `orderLineId`
- `shipmentLineId`
- `receivedQty`
- `differenceReason`

Thiet ke nay luon tach ro:

- cong ty khai bao giao bao nhieu
- co so xac nhan thuc nhan bao nhieu

## Ordering Rules

- mot co so duoc phep dat hang cua nhieu cong ty khac nhau
- moi don chi gui cho dung `1` cong ty
- mot don co the chua thuoc tu:
  - danh muc chung cua he thong
  - danh muc rieng cua cong ty
- voi thuoc tu danh muc chung:
  - neu cong ty da khai bao cung ung, dong duoc xu ly binh thuong
  - neu cong ty chua khai bao cung ung, dong vao `PENDING_CATALOG_CONFIRMATION`

V1 khong can bang whitelist rieng giua co so va cong ty.

Moi co so co the tao don cho bat ky cong ty dang active.

## Workflow Design

### Order Status

- `DRAFT`: co so dang lap du tru, duoc sua va xoa
- `SUBMITTED`: co so da gui don, noi dung bi khoa
- `REJECTED`: cong ty tu choi toan bo don
- `READY_FOR_SHIPMENT`: cong ty da phan hoi xong va con it nhat mot dong co the giao
- `IN_DELIVERY`: da co it nhat mot dot giao
- `COMPLETED`: toan bo so luong cong ty da chap nhan da duoc co so xac nhan nhan du

### Line Status

- `PENDING`
- `PENDING_CATALOG_CONFIRMATION`
- `CONFIRMED`
- `PARTIAL`
- `REJECTED`
- `COMPLETED`

### Order Flow

1. Co so tao `DRAFT`, chon cong ty, them dong thuoc.
2. He thong hien `suggestedQty` tu XNT, co so tu sua `requestedQty`.
3. Co so gui don, don thanh `SUBMITTED`.
4. Cong ty xu ly tung dong:
   - `CONFIRMED`
   - `PARTIAL`
   - `REJECTED`
   - neu la thuoc chung chua khai bao cung ung: xu ly `PENDING_CATALOG_CONFIRMATION`
5. Moi quyet dinh cua cong ty deu phai co ly do.
6. Neu tat ca dong bi tu choi, don thanh `REJECTED`.
7. Neu con it nhat mot dong duoc chap nhan mot phan hoac toan bo, don thanh `READY_FOR_SHIPMENT`.
8. Cong ty tao `1` hoac nhieu dot giao.
9. Co so xac nhan thuc nhan theo tung dong cua tung dot.
10. Khi da xac nhan nhan du tat ca so luong cong ty da chap nhan, don thanh `COMPLETED`.

### Shipment Rules

- cong ty khong duoc sua `requestedQty` cua don goc
- cong ty chi duoc phan bo so luong da `CONFIRMED` hoac `PARTIAL`
- don duoc phep giao nhieu dot
- neu co so thuc nhan it hon so cong ty khai bao giao, phan chenh lech khong tu dong xem la hoan tat

### Recall Rule

V1 chi cho phep co so thu hoi don truoc khi cong ty bat dau phan hoi.

Sau khi cong ty da phan hoi, co so khong sua noi dung don nua.

## Access Control And Routing

### Route Areas

- `FACILITY`: `/dashboard/facility/dutru-dat-hang`
- `COMPANY`: `/dashboard/company/dutru-dat-hang`
- `ADMIN`: `/dashboard/admin/dutru-dat-hang`

### API Areas

- `FACILITY`: `/api/facility/dutru-dat-hang/...`
- `COMPANY`: `/api/company/dutru-dat-hang/...`
- `ADMIN`: `/api/admin/dutru-dat-hang/...`

### Access Rules

- `FACILITY` chi thay don co `facilityId = session.user.id`
- `COMPANY` chi thay don co `companyId = session.user.companyId`
- `ADMIN` thay duoc toan bo de giam sat

`COMPANY` khong duoc:

- vao `/dashboard/admin/*`
- vao `/dashboard/facility/*`
- vao cac module khac ngoai `Du tru dat hang`
- xem du lieu XNT goc, mapping, master drugs, inventory search, mua sam

Vie c chan truy cap phai xay ra o ca:

- menu
- middleware
- page redirect
- API role check
- API ownership check

Khong duoc chi an menu ma bo qua bao ve URL va endpoint.

## Suggestion Logic From Inventory Reports

Goi y so luong chi dung trong `DRAFT`.

Nguyen tac:

- `suggestedQty` chi la tham khao
- co so luon duoc sua `requestedQty`
- rule chi ap dung cho:
  - `MasterDrug`
  - `CompanyDrug` co lien ket ve `MasterDrug`
- thuoc rieng cua cong ty khong map duoc sang `MasterDrug` thi khong co goi y

Cong thuc `V1`:

- lay `xuat` cua `3` thang gan nhat cua cung co so va cung thuoc
- uu tien du lieu `APPROVED`
- neu chua du thi duoc phep dung du lieu gan nhat khac va gan nhan `goi y tam`
- `avgMonthlyUsage = average(xuat 3 thang)`
- `latestEndingStock = tonCuoi` cua thang gan nhat
- `coverageTarget = 2 thang`
- `suggestedQty = max(0, round(avgMonthlyUsage * 2 - latestEndingStock))`

Thong tin nen hien cho co so:

- binh quan xuat
- ton cuoi gan nhat
- ky bao cao tham chieu
- nhan `chinh thuc` hoac `tam`

Moi `OrderLine` can snapshot:

- `suggestedQty`
- `suggestionBasis`
- `suggestionReportMonth`
- `suggestionRuleVersion`

## Notifications And Audit

Module moi dung chung infrastructure hien co cho:

- notification
- activity log

Su kien can co notification:

- co so gui don
- cong ty phan hoi don
- cong ty tao dot giao
- co so xac nhan thuc nhan
- don bi tu choi
- don hoan tat

Su kien can co activity log:

- tao draft
- cap nhat draft
- gui don
- thu hoi don
- xac nhan dong
- tu choi dong
- tao dot giao
- xac nhan thuc nhan
- dong don

## Admin Monitoring

`ADMIN` chi xem va thong ke.

Man hinh admin can co:

- loc theo co so
- loc theo cong ty
- loc theo trang thai don
- loc theo thoi gian
- timeline don
- tong hop so don, so dong, so luong da chap nhan, so luong da giao, so luong da nhan

`ADMIN` khong co hanh dong nghiep vu:

- khong duyet don
- khong sua phan hoi cong ty
- khong tao dot giao
- khong xac nhan nhan hang thay co so

## Error Handling

Can xu ly ro cac loi nghiep vu sau:

- tai khoan `COMPANY` khong co `companyId`
- company truy cap don cua company khac
- co so truy cap don cua co so khac
- cong ty tao shipment vuot qua so luong da chap nhan
- co so xac nhan nhan hang cho shipment khong thuoc don cua minh
- co so gui don khong co dong hop le
- dong thuoc khong map duoc va cong ty chua xac nhan catalog
- co so thu hoi don sau khi cong ty da phan hoi

Moi loi nghiep vu can tra message cu the, khong chi tra `Internal server error`.

## Testing Plan

1. `COMPANY` dang nhap phai duoc redirect vao `/dashboard/company`
2. `COMPANY` khong vao duoc route `admin` va `facility` bang URL truc tiep
3. `FACILITY` va `ADMIN` hien tai van vao duoc dashboard cu binh thuong
4. company A khong thay duoc don cua company B
5. mot co so tao duoc nhieu don cho nhieu cong ty khac nhau
6. moi don chi co `1 companyId`
7. goi y so luong duoc tinh dung tren du lieu XNT mau
8. thuoc rieng cong ty khong map sang `MasterDrug` thi khong hien goi y
9. company chi duoc `CONFIRMED`, `PARTIAL`, `REJECTED`, khong sua `requestedQty`
10. shipment khong duoc vuot tong so luong da chap nhan
11. don giao nhieu dot phai cong don dung
12. co so xac nhan thuc nhan theo tung dong va luu du ly do chenh lech
13. `ADMIN` xem duoc bao cao nhung khong xu ly nghiep vu

## Risks And Limits

- he thong hien tai dang gia dinh chi co `ADMIN` va `FACILITY`, nen can sua middleware, redirect va mot so logic auth nen tang
- neu khong tao `Company` ngay tu dau ma chi hardcode `1` cong ty, sau nay se phai migrate lai schema va auth
- cong thuc goi y `V1` co tinh tham khao, khong phai tu dong tao so dat hang toi uu cho moi tinh huong
- V1 chua xu ly bang gia, hop dong, han muc va doi soat thuong mai
- V1 chua can whitelist co so-cong ty; neu sau nay co yeu cau dia ban hoac hop dong doc quyen, co the them bang lien ket rieng

## Final Design Summary

Module `Du tru dat hang` duoc thiet ke la mot module doc lap, tach khoi `Mua sam`, nhung dung chung nen tang hien co cua he thong.

Truc chinh da duoc chot:

- `1 order = 1 company`
- `1 facility` co the dat hang cua nhieu cong ty
- ho tro ca danh muc he thong va danh muc rieng cong ty
- company chi thay module `Du tru dat hang`
- company chi xu ly don cua chinh cong ty minh
- company khong sua don goc, chi phan hoi va giao hang
- shipment co the `1` hoac `nhieu` dot
- facility xac nhan thuc nhan theo tung dong
- `ADMIN` chi giam sat

Day la mot pham vi hop ly cho pilot `1` cong ty va san sang mo rong nhieu cong ty sau nay ma khong phai thay doi kien truc cot loi.
