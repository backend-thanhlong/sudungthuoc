# Facility Du Tru Order UX Company Catalog Multi-Select Design

## Context

Trang `/dashboard/facility/dutru-dat-hang` hien tai da co du lieu va nghiep vu co ban cho `Du tru dat hang`, nhung UX tao du tru van chua chuyen nghiep:

- nut thao tac hien la `Tạo nháp mới`
- dialog tao nhap chi thu thong tin don (`Cong ty`, `Thang goc XNT`, `Ghi chu`)
- sau khi tao xong, nguoi dung moi quay lai man chi tiet de them thuoc
- khu vuc `Thêm từ danh mục công ty` hien dang dung danh sach card rut gon, khong phai bang `Danh mục công ty` day du cot
- nguoi dung phai them tung thuoc mot, khong co luong chon nhieu dong trong mot lan

Yeu cau da chot:

- nut thao tac chinh se la `Thêm dự trù`
- khi click, nguoi dung phai thay va chon duoc bang `Danh mục công ty` day du cot
- nguoi dung co the chon mot hoac nhieu thuoc trong mot lan
- popup chon thuoc chi phuc vu chon danh muc, khong nhap so luong tai day
- sau khi them xong, nguoi dung se nhap `Số lượng yêu cầu` tai bang chi tiet don

## Goal

Nang cap UX tao du tru tren trang facility de:

- gom thao tac `tao nhap + chon thuoc` vao cung mot luong
- bien khu vuc chon thuoc thanh mot `data table` chuyen nghiep, doc nhanh va chon nhieu dong
- giu man hinh nguoi dung trong cung route hien tai, khong bat buoc dieu huong sang trang moi
- giup nguoi dung tap trung vao hai buoc ro rang:
  - buoc 1: chon thuoc
  - buoc 2: nhap va chinh so luong o bang chi tiet don
- giam cam giac "tao nhap rong roi thao tac tiep o cho khac"

## Scope

Bao gom:

- doi ten CTA tu `Tạo nháp mới` thanh `Thêm dự trù`
- thay dialog tao nhap nho bang `modal lon 2 buoc trong mot shell`
- bo sung bang `Danh mục công ty` day du cot trong modal
- bo sung chon mot nhieu dong trong bang danh muc
- cho phep tao draft kem danh sach thuoc da chon trong cung mot luong nguoi dung
- nang cap khu `Chi tiết đơn` de tiep tuc nhap so luong sau khi them thuoc
- bo sung trang thai rong, canh bao, toast, va dieu kien bat/tat CTA ro rang hon

Khong bao gom:

- doi route thanh trang tao moi rieng
- nhap so luong ngay trong popup chon thuoc
- them bo loc nang cao theo tung cot trong pha nay
- thay doi nghiep vu cong ty phan hoi don, giao hang, nhan hang
- thay doi logic goi y XNT ngoai viec trinh bay lai tot hon

## Approach Options

### Option 1: Modal lon 2 buoc tren cung trang

Mo mot dialog rong tren chinh trang `/dashboard/facility/dutru-dat-hang`, gom:

- vung thong tin don
- bang `Danh mục công ty` de tim, loc co ban, va chon nhieu thuoc

Uu diem:

- toi uu cho mot luong tao du tru ngan
- giu nguoi dung trong cung boi canh
- du khong gian de hien thi bang nhieu cot
- it anh huong den dieu huong hien tai

Nhuoc diem:

- can to chuc shell modal ky de khong bi chat

### Option 2: Drawer hoac side panel

Uu diem:

- cam giac hien dai
- it pha vo bo cuc trang

Nhuoc diem:

- khong du chieu ngang cho bang nhieu cot
- trai nghiem chon nhieu thuoc bi bi

### Option 3: Trang tao moi rieng

Uu diem:

- khong gian lon nhat
- phu hop neu quy trinh sau nay mo rong thanh wizard lon

Nhuoc diem:

- tang dieu huong
- nang hon nhu cau hien tai
- phai duy tri them route va bo cuc rieng

### Recommendation

Chon Option 1.

Day la phuong an can bang nhat giua chat luong UX, do rong khong gian lam viec, va chi phi thay doi. Luong moi van tap trung tren mot trang, nhung du chuyen nghiep de nguoi dung cam thay `Thêm dự trù` la mot tac vu tron ven thay vi hai thao tac roi rac.

## UX Principles

Thiet ke moi theo 4 nguyen tac:

- `tach ro chon danh muc va nhap so luong`
- `uu tien quet mat va chon nhieu dong nhanh`
- `giam so lan doi ngu canh`
- `hien ro trang thai va dieu kien hanh dong`

Quyet dinh quan trong da chot:

- popup chi de chon thuoc
- `Số lượng yêu cầu` duoc nhap o bang chi tiet don
- bang `Danh mục công ty` phai day du cot, khong dung card list rut gon

## UI Design

### 1. CTA va entry point

Tai header trang:

- doi nut `Tạo nháp mới` thanh `Thêm dự trù`
- giu nut nay la CTA chinh
- khi click:
  - neu dang co thay doi chua luu tren don hien tai, van dung rule confirm discard hien co
  - neu dong y, mo modal tao du tru moi

### 2. Modal shell

Modal moi la `fullscreen-lite dialog` thay vi dialog nho hien tai.

Muc tieu layout:

- rong toi thieu muc `sm:max-w-7xl`
- than modal chia 2 tang:
  - tang tren: thong tin du tru
  - tang duoi: bang `Danh mục công ty`
- footer modal luon hien de chua bo dem chon va CTA

Thong tin header:

- title: `Tạo dự trù đặt hàng`
- description:
  - `Chọn công ty, tháng gốc XNT và một hoặc nhiều thuốc từ danh mục công ty để thêm vào dự trù nháp.`

Footer:

- ben trai:
  - `Đã chọn n thuốc`
- ben phai:
  - `Hủy`
  - `Thêm vào dự trù`

Rule CTA:

- `Thêm vào dự trù` chi bat khi da chon it nhat 1 thuoc
- neu chua chon, khong toast loi, chi de nut disabled

### 3. Vung thong tin du tru trong modal

Vung nay dat phia tren bang, theo dang form ngan:

- `Công ty cung ứng`
- `Tháng gốc XNT`
- `Ghi chú ban đầu`

Hanh vi:

- khi doi `Cong ty`, bang `Danh mục công ty` reset bo chon va tai lai tap thuoc phu hop voi cong ty do
- `Tháng gốc XNT` chi dong vai tro tham so cho goi y sau khi tao draft
- `Ghi chú ban đầu` la thong tin tu do, khong bat buoc

Khong them truong nao khac trong pha nay.

### 4. Bang `Danh mục công ty`

Bang trong modal la mot `data table` dung nghia.

Toolbar tren bang gom:

- o tim kiem tong quat
- bo dem `Đã chọn: n thuốc`
- nut `Bỏ chọn tất cả`
- tuy chon loc nhe `Chỉ hiện thuốc đã liên kết thuốc chuẩn`

Cot duoc chot:

- `Chọn`
- `Mã thuốc công ty`
- `Tên thuốc`
- `Hoạt chất`
- `Hàm lượng`
- `Số đăng ký`
- `Dạng bào chế`
- `Quy cách`
- `Thuốc chuẩn liên kết`
- `Đơn vị`

Rule trinh bay:

- `Tên thuốc` va `Thuốc chuẩn liên kết` la cot rong hon cac cot con lai
- `Thuốc chuẩn liên kết` hien thi 2 dong:
  - dong 1: `maChung`
  - dong 2: `tenThuoc`
- cac cot mo ta ngan co the hien `—` neu khong co du lieu
- sticky header khi cuon doc
- sticky cot `Chọn` va `Mã thuốc công ty` ben trai neu kha thi voi component hien co
- hover row nhe, row da chon doi nen ro nhung khong gat

### 5. Hanh vi chon nhieu dong

Nguoi dung co the chon thuoc theo cac cach sau:

- click checkbox tren dong
- click vao ca dong de toggle chon bo chon
- click checkbox tren header de `chon tat ca ket qua dang hien thi`

Rule tim kiem:

- tim theo `companyDrugCode`
- tim theo `companyDrugName`
- tim theo `activeIngredient`
- tim theo `masterDrug.maChung`
- tim theo `masterDrug.tenThuoc`

Rule canh bao:

- dong chua lien ket `MasterDrug` van cho chon
- hien badge nhe `Chưa liên kết thuốc chuẩn`
- y nghia canh bao:
  - dong nay se khong co goi y XNT sau khi vao bang chi tiet

### 6. Empty states trong modal

Neu cong ty khong co thuoc:

- hien empty state trong than bang:
  - `Công ty này chưa có thuốc trong danh mục.`

Neu search khong ra ket qua:

- hien:
  - `Không tìm thấy thuốc phù hợp với từ khóa.`

Khong them CTA phu nghiep vu moi trong pha nay.

## Interaction Flow

Luong nguoi dung muc tieu:

1. Nguoi dung bam `Thêm dự trù`
2. Modal mo ra
3. Nguoi dung chon `Cong ty`, `Thang goc XNT`, nhap `Ghi chu` neu can
4. He thong hien bang `Danh mục công ty` day du cot
5. Nguoi dung tim va chon mot hoac nhieu thuoc
6. Nguoi dung bam `Thêm vào dự trù`
7. He thong tao draft moi kem cac dong thuoc da chon
8. Modal dong
9. Khung `Chi tiết đơn` mo ngay draft vua tao
10. Bang dong thuoc focus ve cac dong moi de nguoi dung nhap `Số lượng yêu cầu`

Quyet dinh da chot:

- khong nhap so luong trong popup
- viec nhap so luong thuoc ve bang chi tiet don

## Detail Workspace Design

### 1. Tang thong tin don

Phan `Chi tiết đơn` giu bo khung hien tai nhung bo sung tom tat ngan ngay duoi cac card:

- `Tổng số dòng`
- `Đã nhập số lượng`
- `Chưa có gợi ý XNT`
- `Chờ xác nhận danh mục`

Muc dich:

- cho nguoi dung biet don con thieu du lieu gi truoc khi luu va gui
- `Đã nhập số lượng` duoc tinh theo so dong co `requestedQty > 0`

### 2. Tang chinh sua don

Giu:

- `Tháng gốc XNT`
- `Ghi chú cơ sở`

Bo sung info strip gon:

- `Gợi ý số lượng sẽ được cập nhật khi lưu nháp.`
- `Các thuốc chưa liên kết thuốc chuẩn sẽ không có gợi ý XNT.`

Neu vua them thuoc tu modal:

- tu dong cuon den bang dong thuoc
- highlight nhe cac dong moi them
- focus vao o `Số lượng yêu cầu` dau tien co the sua

### 3. Bang dong thuoc

Bang dong thuoc duoc sap xep lai cot de nhin nghiep vu ro hon:

- `Thuốc`
- `Mã thuốc công ty`
- `Thuốc chuẩn liên kết`
- `Đơn vị`
- `Số lượng yêu cầu`
- `Gợi ý XNT`
- `Trạng thái`
- `Thao tác`

Rule UI:

- `Số lượng yêu cầu` la o nhap chinh, canh phai, du rong de nhap nhanh
- `Gợi ý XNT` hien so luong noi bat va thang tham chieu ben duoi
- neu khong co goi y, hien `Chưa có gợi ý` thay vi `0`
- dong `PENDING_CATALOG_CONFIRMATION` hien badge amber ro o cot `Trạng thái`

Tien ich nho duoc khuyen nghi:

- nut `Dùng gợi ý` tren tung dong neu co `suggestedQty`
- nut `Dùng tất cả gợi ý XNT` o muc bang neu nhieu dong co goi y

Khong dua chon `bulk quantity editing` hay `paste spreadsheet` vao pha nay.

### 4. Dieu kien CTA luu va gui

`Lưu nháp`:

- cho phep luu khi co thay doi hop le

`Gửi công ty`:

- chi bat khi co it nhat 1 dong thuoc
- tat ca dong phai co `Số lượng yêu cầu > 0`
- cac dong moi tao tu modal voi `requestedQty = 0` duoc xem la chua hoan tat va buoc nguoi dung phai ra soat lai

Neu chua du dieu kien:

- khong chi disable mo ho
- hien ly do ngan gan khu CTA hoac tren bang:
  - `Còn n dòng chưa nhập số lượng hợp lệ.`

## Data And API Design

### 1. Hop dong tao draft

UX mong muon la mot thao tac `Thêm vào dự trù` duy nhat.

Vi vay backend nen ho tro tao draft kem danh sach dong thuoc ngay tu request tao moi.

Hop dong muc tieu cho `POST /api/facility/dutru-dat-hang`:

- `companyId`
- `baseReportMonth`
- `note`
- `lines`

Trong do `lines` gom:

- `sourceType = COMPANY_DRUG`
- `sourceId`

Khong can mo o nhap `requestedQty` trong modal.

Rule du lieu duoc chot:

- backend tao `DrugOrderLine` o trang thai draft voi `requestedQty = 0`
- frontend sau khi dong modal se focus vao bang chi tiet de nguoi dung nhap lai so luong thuc te
- `Gửi công ty` bi chan cho den khi tat ca dong duoc cap nhat thanh `> 0`

Dieu nay giu dung quyet dinh UX:

- modal la noi chon thuoc
- bang chi tiet la noi nhap so luong
- draft co the ton tai o trang thai chua hoan tat

### 2. Nguon du lieu bang danh muc

Frontend can co du lieu day du cot cho `CompanyDrugOption`.

Neu payload hien tai chua day du:

- bo sung cac truong can render:
  - `quyCach`
  - `masterDrug.hamLuong`
  - `masterDrug.soDangKy`
  - `masterDrug.dangBaoChe`

Frontend khong tu suy dien bang cach ghep chuoi tu cac truong hien co neu backend co the tra ve truc tiep.

### 3. Xu ly dong trung lap

Neu mot hoac nhieu thuoc da ton tai trong draft:

- khong fail toan bo thao tac
- bo qua cac dong trung
- phan hoi lai thong tin tong hop cho frontend

Toast muc tieu:

- `Đã thêm 8 thuốc vào dự trù.`
- hoac `Đã thêm 8 thuốc, bỏ qua 2 thuốc đã có trong dự trù.`

## Error Handling

Modal:

- neu chua chon dong nao, CTA disabled, khong toast loi
- neu tao draft that bai, hien toast ngan:
  - `Không thể thêm thuốc vào dự trù. Vui lòng thử lại.`

Bang chi tiet:

- o nhap `Số lượng yêu cầu` invalid hien loi inline tai chinh o nhap
- khong doi den luc submit moi bao loi
- dong co `requestedQty = 0` sau khi vua tao tu modal duoc hien ro la chua nhap
- `Gửi công ty` bi chan neu con dong invalid, kem thong diep ly do

Canh bao nghiep vu:

- dong chua linked `MasterDrug` khong bi chan chon
- nhung phai hien canh bao nhe rang dong nay khong co goi y XNT

## Accessibility And Responsiveness

Trong desktop:

- day la viewport uu tien toi uu
- modal rong va bang nhieu cot phai de quet mat

Trong viewport hep:

- modal van mo duoc
- bang cho phep cuon ngang
- footer CTA van luon hien

Khong toi uu mobile-first cho tac vu nay, nhung khong de layout vo.

## Implementation Notes

Frontend du kien tap trung o:

- `src/components/drug-orders/FacilityDrugOrdersPage.tsx`

Backend du kien lien quan toi:

- `src/app/api/facility/dutru-dat-hang/route.ts`
- `src/lib/drug-orders/facility.ts`

Huong sua:

- thay dialog tao nhap nho bang modal lon va bang multi-select
- chuyen khu `Thêm từ danh mục công ty` tu card list sang bang day du cot, tai dung tinh than UI cua tab `Danh mục công ty` ben company
- bo sung state cho row selection, search, va thong bao them dong
- cap nhat payload tao draft de ho tro them dong ngay trong luc tao

## Testing

Can kiem thu toi thieu cac tinh huong sau:

1. Mo modal `Thêm dự trù`, chon cong ty, thay bang danh muc day du cot.
2. Tim kiem theo ma thuoc cong ty, ten thuoc, hoat chat, ma thuoc chuan, ten thuoc chuan.
3. Chon mot dong va them thanh cong vao draft moi.
4. Chon nhieu dong va them thanh cong vao draft moi.
5. Chon mot so dong da ton tai, he thong bo qua dong trung va bao dung so luong them.
6. Cong ty khong co danh muc, empty state hien dung.
7. Dong chua lien ket thuoc chuan hien canh bao nhung van cho chon.
8. Sau khi them xong, bang chi tiet mo dung draft, focus vao khu nhap so luong.
9. `Gửi công ty` bi chan neu con dong co so luong khong hop le.
10. `Dùng gợi ý` va `Dùng tất cả gợi ý XNT` neu duoc implement hoat dong dung voi cac dong co `suggestedQty`.

## Expected Outcome

Tai `/dashboard/facility/dutru-dat-hang`, thao tac `Thêm dự trù` se tro thanh mot luong ro rang va chuyen nghiep:

- mo modal lon de chon thong tin don va chon nhieu thuoc
- hien bang `Danh mục công ty` day du cot thay vi danh sach card rut gon
- tao draft kem cac thuoc da chon trong cung mot luong
- dua nguoi dung tro lai bang chi tiet don de nhap so luong va hoan tat du lieu

Ket qua la UX tao du tru ngan hon, de quet mat hon, dung nghiep vu hon, va giam manh cam giac thao tac roi rac nhu hien tai.
