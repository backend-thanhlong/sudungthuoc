# Mua Sam Tra Cuu Goi Thau Design

## Context

Menu `Tổng hợp mua sắm` trên sidebar hiện có các màn riêng cho:

- `Quản lý KH LCNT`
- `Thông báo mời thầu`
- `Kết quả LCNT`
- `Thống kê`

Các màn này phục vụ tốt từng chặng nghiệp vụ riêng, nhưng chưa có màn tra cứu liên thông để trả lời nhanh các câu hỏi như:

- một `gói thầu` của đơn vị đang ở bước nào trong tiến trình mua sắm
- đã có `TBMT` hay chưa
- đã có `KQLCNT` hay chưa
- số mặt hàng trúng thầu và tổng giá trị trúng thầu của gói đó là bao nhiêu
- có bao nhiêu nhà thầu trúng thầu

Người dùng cần thêm item `Tra cứu` trong menu `Tổng hợp mua sắm`, áp dụng cho cả:

- `admin`: tra cứu toàn hệ thống
- `facility`: chỉ tra cứu dữ liệu của đơn vị đang đăng nhập

Phạm vi dữ liệu được chốt là chỉ lấy `quyTrinh = 1`, vì đây là luồng có đầy đủ chuỗi quan hệ:

- `KeHoachLCNT`
- `GoiThau`
- `ThongBaoMoiThau`
- `KetQuaLCNT`
- `KetQuaPhanLo`

## Goal

Thiết kế màn `Tra cứu` mới trong `Tổng hợp mua sắm` với các yêu cầu:

- một dòng đại diện cho một `gói thầu`
- thể hiện đầy đủ tiến trình `KHLCNT -> TBMT -> KQLCNT`
- hiển thị các chỉ số kết quả chính của gói thầu
- hỗ trợ tìm kiếm, lọc, phân trang server-side
- có popup chi tiết để xem đầy đủ thông tin và danh sách nhà thầu
- có phiên bản cho cả `admin` và `facility`

## Scope

Bao gồm:

- thêm item `Tra cứu` vào sidebar `mua-sam` cho `admin` và `facility`
- thêm trang:
  - `/dashboard/admin/mua-sam/tra-cuu`
  - `/dashboard/facility/mua-sam/tra-cuu`
- thêm API:
  - `GET /api/admin/mua-sam/tra-cuu`
  - `GET /api/facility/mua-sam/tra-cuu`
- chuẩn hóa dataset theo `gói thầu`
- summary cards cho tập kết quả đang lọc
- filter bar
- bảng danh sách
- popup chi tiết

Không bao gồm:

- hỗ trợ `quyTrinh = 2`
- hiển thị lịch sử đầy đủ khi một gói có nhiều phiên bản `TBMT` hoặc `KQLCNT`
- export Excel
- sort đa cột tùy ý ở pha đầu
- API detail riêng cho popup

## Current State

### Sidebar

File hiện tại: `src/components/DashboardLayout.tsx`

Menu `Tổng hợp mua sắm` đã có item con cho:

- `Quản lý KH LCNT`
- `Thông báo mời thầu`
- `Kết quả LCNT`
- `Thống kê`

Chưa có item `Tra cứu`.

### Các màn mua sắm hiện có

Admin:

- `src/app/dashboard/admin/mua-sam/lap-ke-hoach-lcnt/page.tsx`
- `src/app/dashboard/admin/mua-sam/thong-bao-moi-thau/page.tsx`
- `src/app/dashboard/admin/mua-sam/ket-qua-lcnt/page.tsx`

Facility:

- `src/app/dashboard/facility/mua-sam/lap-ke-hoach-lcnt/page.tsx`
- `src/app/dashboard/facility/mua-sam/thong-bao-moi-thau/page.tsx`
- `src/app/dashboard/facility/mua-sam/ket-qua-lcnt/page.tsx`

Các màn hiện tại đang tổ chức dữ liệu theo từng nghiệp vụ riêng:

- `KHLCNT`: nhóm theo đơn vị và hiển thị danh sách kế hoạch
- `TBMT`: nhóm theo đơn vị và hiển thị danh sách thông báo
- `KQLCNT`: nhóm theo đơn vị và hiển thị danh sách kết quả

Chưa có màn nào lấy `gói thầu` làm đơn vị tra cứu chính.

### Mô hình dữ liệu

Theo schema hiện tại:

- `KeHoachLCNT` có nhiều `GoiThau`
- `GoiThau` có nhiều `ThongBaoMoiThau`
- `GoiThau` có nhiều `KetQuaLCNT`
- `KetQuaLCNT` có nhiều `KetQuaPhanLo`

Do đó, nếu muốn trả về một dòng duy nhất cho mỗi `gói thầu`, backend cần có quy tắc tổng hợp rõ ràng để:

- chọn bản ghi `TBMT` đại diện
- chọn bản ghi `KQLCNT` đại diện
- dedupe danh sách nhà thầu

## Approach Options

### Option 1: Tạo màn `Tra cứu` mới với dataset liên thông theo gói thầu

Tạo page và API riêng, trong đó mỗi record được tổng hợp từ chuỗi:

- `KeHoachLCNT`
- `GoiThau`
- `ThongBaoMoiThau`
- `KetQuaLCNT`
- `KetQuaPhanLo`

Ưu điểm:

- đúng với yêu cầu nghiệp vụ
- đơn vị dữ liệu rõ ràng: một dòng một `gói thầu`
- dễ mở rộng thêm cột và filter trong tương lai
- không làm phình logic ở 3 màn hiện hữu

Nhược điểm:

- cần thêm page, API, mapping mới

### Option 2: Mở rộng một trong các màn hiện có

Ví dụ lấy màn `Kết quả LCNT` làm gốc rồi thêm cột `KHLCNT`, `TBMT`, trạng thái tiến trình và chỉ số tổng hợp.

Ưu điểm:

- ít file mới hơn

Nhược điểm:

- làm lệch mục đích màn hiện có
- page và API cũ sẽ gánh thêm logic không cùng mục tiêu
- khó bảo trì về sau

### Option 3: Tạo trang hub tra cứu rồi điều hướng sang các màn cũ

Trang mới chỉ hiển thị tóm tắt và dùng link sang `KHLCNT`, `TBMT`, `KQLCNT`.

Ưu điểm:

- triển khai nhanh
- rủi ro thấp

Nhược điểm:

- không đáp ứng yêu cầu "một dòng thể hiện đầy đủ tiến trình mua sắm"

## Recommendation

Chọn **Option 1**.

Lý do:

- khớp trực tiếp với nhu cầu người dùng
- giữ ranh giới rõ ràng giữa `tra cứu toàn diện theo gói thầu` và các màn `nghiệp vụ theo chặng`
- ít rủi ro hơn so với nhồi logic mới vào các page và route đang phục vụ use case khác

## Routes And Navigation

### Sidebar

Thêm item `Tra cứu` dưới nhóm `Tổng hợp mua sắm` cho cả:

- `admin`
- `facility`

Vị trí đề xuất:

- sau `Kết quả LCNT`
- trước `Thống kê`

Lý do:

- phản ánh trình tự nghiệp vụ tự nhiên
- `Tra cứu` là màn tổng hợp sau các chặng nghiệp vụ, nhưng vẫn gần với các màn nguồn dữ liệu

### New pages

- `/dashboard/admin/mua-sam/tra-cuu`
- `/dashboard/facility/mua-sam/tra-cuu`

### New APIs

- `GET /api/admin/mua-sam/tra-cuu`
- `GET /api/facility/mua-sam/tra-cuu`

## Data Model

### Unit of data

Một record `Tra cứu` tương ứng với **một `gói thầu` thuộc `quyTrinh = 1`**.

### Proposed response item

```ts
type ProcurementLookupItem = {
  facilityId: string;
  facilityName: string;
  facilityCode: string | null;

  keHoachId: string;
  maKHLCNT: string | null;
  tenKHLCNT: string | null;
  soQuyetDinh: string | null;
  ngayPheDuyet: string | null;

  goiThauId: string;
  tenGoiThau: string;
  giaGoiThau: number | null;
  hinhThucLCNT: string | null;
  phuongThucLCNT: string | null;
  loaiHopDong: string[];
  soLuongPhanLo: number | null;
  trangThaiGoiThau: string | null;

  maTBMT: string | null;
  ngayDangTaiTBMT: string | null;
  ngayDongThau: string | null;

  soQdPheDuyetKQLCNT: string | null;
  ngayPheDuyetKQLCNT: string | null;
  soMatHangMoiThau: number | null;
  soMatHangTrungThau: number | null;
  tongGiaTriTrungThau: number | null;

  soLuongNhaThauTrung: number;
  danhSachNhaThauTrung: string[];

  procurementStatus:
    | "Chưa có TBMT"
    | "Đã có TBMT, chưa có KQLCNT"
    | "Đã có KQLCNT";

  phanLoResults: {
    phanLoGoiThauId: string;
    tenPhanLo: string;
    ketQua: string | null;
    donGiaTrungThau: number | null;
    nhaThauTrungThau: string | null;
  }[];
};
```

### Aggregation rules

#### Base dataset

Chỉ lấy `gói thầu` thuộc:

- `keHoach.quyTrinh = 1`

#### Representative TBMT

Nếu một `gói thầu` có nhiều `TBMT`, record đại diện dùng:

1. `TBMT` mới nhất theo `ngayDangTai`
2. fallback theo `createdAt`

#### Representative KQLCNT

Nếu một `gói thầu` có nhiều `KQLCNT`, record đại diện dùng:

1. `KQLCNT` mới nhất theo `ngayPheDuyetKQLCNT`
2. fallback theo `createdAt`

#### Winning contractor count

`soLuongNhaThauTrung` được tính bằng số lượng **nhà thầu duy nhất** lấy từ:

- `KetQuaPhanLo.nhaThauTrungThau`

Quy tắc:

- trim chuỗi trước khi so sánh
- bỏ giá trị rỗng
- dedupe không phân biệt khác biệt do khoảng trắng đầu cuối

#### Detail popup data

Popup chi tiết dùng luôn dữ liệu đã có trong list response:

- `danhSachNhaThauTrung`
- `phanLoResults`

Pha đầu không tách API detail riêng.

## API Design

### Admin API

Route: `GET /api/admin/mua-sam/tra-cuu`

Quyền truy cập:

- chỉ `ADMIN`

### Facility API

Route: `GET /api/facility/mua-sam/tra-cuu`

Quyền truy cập:

- chỉ `FACILITY`
- backend khóa cứng `facilityId` theo session, không tin vào query param từ client

### Query params

- `page`
- `limit`
- `searchTerm`
- `procurementStatus`
- `fromDate`
- `toDate`
- `facilityId` chỉ áp dụng cho admin

### Search semantics

`searchTerm` tìm trên các trường chính:

- `facilityName`
- `facilityCode`
- `maKHLCNT`
- `tenKHLCNT`
- `tenGoiThau`
- `maTBMT`
- `soQdPheDuyetKQLCNT`

Với route facility, có thể vẫn giữ `facilityName/facilityCode` trong tập search để dùng chung helper, nhưng kết quả luôn chỉ nằm trong đơn vị hiện tại.

### Status filter semantics

`procurementStatus` hỗ trợ:

- `all`
- `no_tbmt`
- `has_tbmt_no_kqlcnt`
- `has_kqlcnt`

Mapping:

- `no_tbmt`: gói chưa có `TBMT`
- `has_tbmt_no_kqlcnt`: gói đã có `TBMT` nhưng chưa có `KQLCNT`
- `has_kqlcnt`: gói đã có `KQLCNT`

### Date filter semantics

Pha đầu dùng khoảng ngày theo `KeHoachLCNT.ngayPheDuyet`.

Lý do:

- ổn định hơn so với ngày của `TBMT` hoặc `KQLCNT`
- phù hợp để thu hẹp tập hồ sơ nghiệp vụ từ đầu chuỗi

### Response shape

```json
{
  "data": [],
  "metadata": {
    "page": 1,
    "limit": 20,
    "total": 0,
    "totalPages": 1,
    "facilities": [],
    "summary": {
      "totalPackages": 0,
      "chuaCoTBMT": 0,
      "daCoTBMTChuaCoKQLCNT": 0,
      "daCoKQLCNT": 0
    }
  }
}
```

### Summary semantics

`summary` phải phản ánh **toàn bộ tập dữ liệu sau filter nhưng trước pagination**.

Mục đích:

- làm summary cards đầu trang
- cho người dùng thấy ngay trạng thái của tập đang tra cứu

### Facilities metadata

`metadata.facilities` chỉ có ở admin hoặc có thể trả chung nhưng route facility chỉ chứa đúng đơn vị hiện tại.

Thực tế UI:

- admin: render dropdown `Đơn vị`
- facility: không render dropdown này

## Backend Data Flow

### Recommendation

Triển khai theo ba bước rõ ràng:

1. xây điều kiện filter trên tập `gói thầu`
2. lấy danh sách `goiThauId` của page hiện tại + `total`
3. lấy chi tiết bằng Prisma `findMany` rồi map sang response item

Lý do:

- dễ đọc hơn một Prisma query lồng sâu vừa lọc vừa aggregate vừa chọn record mới nhất
- dễ kiểm soát authz cho route `facility`
- dễ kiểm thử với từng bước riêng

### Proposed query strategy

#### Step 1: filter and page ids

Lấy `goiThauId` khớp điều kiện:

- `quyTrinh = 1`
- `facilityId` nếu có
- `searchTerm`
- `procurementStatus`
- `fromDate`
- `toDate`

Phân trang theo **số gói thầu**, không theo đơn vị.

#### Step 2: load current page details

`findMany` theo danh sách `goiThauId` hiện tại, include:

- `keHoach`
- `keHoach.facility`
- `thongBaoMoiThaus`
- `ketQuaLCNTs`
- `ketQuaLCNTs.thongBaoMoiThau`
- `ketQuaLCNTs.ketQuaPhanLos`
- `ketQuaLCNTs.ketQuaPhanLos.phanLoGoiThau`
- `phanLos`

#### Step 3: map and aggregate

Backend chọn:

- `TBMT` đại diện
- `KQLCNT` đại diện
- `danhSachNhaThauTrung`
- `soLuongNhaThauTrung`
- `phanLoResults`
- `procurementStatus`

### Ordering

Pha đầu sắp theo:

1. `KeHoachLCNT.ngayPheDuyet` giảm dần
2. fallback `GoiThau.createdAt` giảm dần
3. fallback `tenGoiThau` tăng dần

Mục tiêu:

- record mới được ưu tiên
- thứ tự vẫn ổn định nếu thiếu ngày phê duyệt

## UI Design

### Page structure

Trang `Tra cứu` gồm:

1. tiêu đề và mô tả ngắn
2. summary cards
3. filter bar
4. bảng danh sách
5. phân trang
6. popup chi tiết

### Summary cards

Đầu trang hiển thị tối thiểu 4 card:

- `Tổng gói thầu`
- `Chưa có TBMT`
- `Đã có TBMT, chưa có KQLCNT`
- `Đã có KQLCNT`

Admin và facility dùng cùng pattern, chỉ khác tập dữ liệu.

### Filter bar

Các control đề xuất:

- `Từ khóa`
- `Đơn vị` chỉ có ở admin
- `Trạng thái tiến trình`
- `Từ ngày`
- `Đến ngày`
- nút `Tìm kiếm`
- nút `Đặt lại`

Pha đầu **không** thêm các filter phụ như:

- `hình thức LCNT`
- `phương thức LCNT`
- `loại hợp đồng`

Những field này vẫn hiển thị trong popup chi tiết.

### Search interaction

Áp dụng pattern giống màn detail reports:

- thay đổi input không tự động gọi API
- chỉ gọi API khi:
  - bấm `Tìm kiếm`
  - hoặc nhấn `Enter`
- áp dụng filter mới sẽ reset `page = 1`
- đổi trang giữ nguyên filter đã áp dụng
- bấm `Đặt lại` xóa toàn bộ filter và quay về `page = 1`

### Table columns

#### Admin table

- `Đơn vị`
- `Mã KHLCNT`
- `Tên KHLCNT`
- `Tên gói thầu`
- `Giá gói thầu`
- `Mã TBMT`
- `Ngày đăng tải TBMT`
- `Số QĐ KQLCNT`
- `Ngày phê duyệt KQLCNT`
- `Số mặt hàng trúng thầu`
- `Tổng giá trị trúng thầu`
- `Số lượng nhà thầu`
- `Trạng thái tiến trình`
- `Thao tác`

#### Facility table

Ẩn cột `Đơn vị`, các cột còn lại giữ nguyên.

### Row behavior

Mỗi dòng là một `gói thầu`.

`Thao tác` chỉ cần:

- nút `Xem chi tiết`

### Empty state

Nếu không có dữ liệu:

- vẫn hiển thị filter bar
- hiển thị thông báo không có gói thầu phù hợp với điều kiện tra cứu

## Detail Popup Design

Popup chi tiết phục vụ nhu cầu xác minh nghiệp vụ, không làm bảng ngoài quá tải.

### Sections

#### 1. Thông tin đơn vị

- `facilityName`
- `facilityCode`

#### 2. Thông tin KHLCNT

- `maKHLCNT`
- `tenKHLCNT`
- `soQuyetDinh`
- `ngayPheDuyet`

#### 3. Thông tin gói thầu

- `tenGoiThau`
- `giaGoiThau`
- `hinhThucLCNT`
- `phuongThucLCNT`
- `loaiHopDong`
- `soLuongPhanLo`
- `trangThaiGoiThau`

#### 4. Tiến trình và kết quả

- `maTBMT`
- `ngayDangTaiTBMT`
- `ngayDongThau`
- `soQdPheDuyetKQLCNT`
- `ngayPheDuyetKQLCNT`
- `soMatHangMoiThau`
- `soMatHangTrungThau`
- `tongGiaTriTrungThau`
- danh sách `nhà thầu trúng thầu` duy nhất

#### 5. Bảng chi tiết phần lô

Nếu có dữ liệu `phanLoResults`, hiển thị bảng:

- `Tên phần lô`
- `Kết quả`
- `Đơn giá trúng thầu`
- `Nhà thầu trúng thầu`

### No extra detail API

Pha đầu popup dùng ngay dữ liệu từ list response.

Ưu điểm:

- giảm round-trip
- giữ implementation gọn
- đủ phù hợp với `pageSize = 20`

## Pagination

### Strategy

Phân trang server-side theo **danh sách gói thầu đã lọc**.

### Default page size

- `20`

### Behavior

- `page` phản ánh trang hiện tại sau filter
- nếu `page` vượt `totalPages`, backend trả về trang hợp lệ gần nhất
- UI giữ pattern:
  - `Hiển thị x-y / total dòng`
  - `Trang a / b`
  - nút `Trước`
  - nút `Sau`

## Edge Cases

### Package without TBMT

- `maTBMT = null`
- `ngayDangTaiTBMT = null`
- `ngayDongThau = null`
- toàn bộ field `KQLCNT = null`
- `procurementStatus = "Chưa có TBMT"`

### Package with TBMT but without KQLCNT

- hiển thị đầy đủ dữ liệu `TBMT`
- field `KQLCNT = null`
- `procurementStatus = "Đã có TBMT, chưa có KQLCNT"`

### Package with multiple TBMT or multiple KQLCNT

- bảng ngoài và popup đều dùng bản ghi mới nhất theo quy tắc đã chốt
- pha đầu không hiển thị lịch sử nhiều phiên bản

### KQLCNT without KetQuaPhanLo

- `soLuongNhaThauTrung = 0`
- `danhSachNhaThauTrung = []`
- popup vẫn hiển thị section kết quả, nhưng danh sách nhà thầu trống

### Duplicate contractor names

- trim trước khi dedupe
- bỏ chuỗi rỗng
- nếu một nhà thầu trúng nhiều phần lô, chỉ tính một lần ở `soLuongNhaThauTrung`

### Invalid date filter

Frontend:

- chặn submit khi `fromDate > toDate`

Backend:

- chỉ áp dụng mốc ngày parse hợp lệ
- nếu tham số ngày lỗi format, bỏ qua tham số đó thay vì crash

### Facility authz

Route facility không được trả dữ liệu đơn vị khác, kể cả khi client sửa query string thủ công.

## Testing Plan

Kiểm tra thủ công:

1. Admin mở `/dashboard/admin/mua-sam/tra-cuu`, xác nhận chỉ thấy `gói thầu` thuộc `quyTrinh = 1`.
2. Facility mở `/dashboard/facility/mua-sam/tra-cuu`, xác nhận chỉ thấy dữ liệu của đơn vị hiện tại.
3. Kiểm tra sidebar admin và facility đều có item `Tra cứu` trong nhóm `Tổng hợp mua sắm`.
4. Tìm theo `mã KHLCNT`, xác nhận đúng gói thầu liên quan được trả về.
5. Tìm theo `tên gói thầu`, xác nhận kết quả đúng.
6. Tìm theo `mã TBMT`, xác nhận gói đã có `TBMT` được tìm đúng.
7. Tìm theo `số QĐ KQLCNT`, xác nhận gói đã có `KQLCNT` được tìm đúng.
8. Lọc `Chưa có TBMT`, xác nhận không có dòng nào chứa dữ liệu `TBMT`.
9. Lọc `Đã có TBMT, chưa có KQLCNT`, xác nhận không có dòng nào chứa dữ liệu `KQLCNT`.
10. Lọc `Đã có KQLCNT`, xác nhận mọi dòng đều có dữ liệu kết quả.
11. Lọc theo khoảng `ngày phê duyệt KHLCNT`, xác nhận record vào và ra đúng.
12. Mở popup của một gói chưa có `TBMT`, xác nhận section tiến trình hiển thị giá trị trống đúng.
13. Mở popup của một gói đã có `KQLCNT`, xác nhận `số lượng nhà thầu` bằng số nhà thầu duy nhất trong danh sách chi tiết.
14. Kiểm tra gói có nhiều `KetQuaPhanLo` cùng một nhà thầu, xác nhận count không bị nhân đôi.
15. Kiểm tra gói có nhiều `TBMT` hoặc `KQLCNT`, xác nhận bảng dùng đúng bản ghi mới nhất.
16. Tìm kiếm rồi đổi trang, xác nhận filter được giữ nguyên.
17. Bấm `Đặt lại`, xác nhận filter bị xóa và quay về trang 1.
18. Sửa tay query `facilityId` trên route facility, xác nhận backend vẫn khóa đúng đơn vị.

## Risks

### Query complexity

Quan hệ 1-n từ `gói thầu` sang `TBMT`, `KQLCNT`, `KetQuaPhanLo` dễ làm query phức tạp nếu cố xử lý tất cả trong một bước. Thiết kế này giảm rủi ro bằng cách phân tách:

- lọc và phân trang theo `goiThauId`
- load chi tiết page hiện tại
- aggregate ở TypeScript

### Ambiguity when multiple versions exist

Nếu không chốt quy tắc chọn bản ghi đại diện, bảng có thể hiển thị không nhất quán giữa các lần tải. Thiết kế này chốt cứng:

- `TBMT` mới nhất theo `ngayDangTai`
- `KQLCNT` mới nhất theo `ngayPheDuyetKQLCNT`

### Payload size

Do popup dùng luôn dữ liệu trong list response, payload mỗi dòng sẽ lớn hơn so với bảng thông thường. Rủi ro này được kiểm soát bằng:

- `pageSize = 20`
- giới hạn phạm vi field detail ở mức cần thiết
- chưa hỗ trợ lịch sử nhiều phiên bản

## Implementation Notes

- ưu tiên tái sử dụng pattern UI từ các màn `mua-sam` admin/facility hiện có
- ưu tiên helper dùng chung cho:
  - parse query params
  - build `procurementStatus`
  - chọn `TBMT` đại diện
  - chọn `KQLCNT` đại diện
  - dedupe `nhà thầu`
- tránh chỉnh sửa contract của các route `KHLCNT`, `TBMT`, `KQLCNT` đang có
