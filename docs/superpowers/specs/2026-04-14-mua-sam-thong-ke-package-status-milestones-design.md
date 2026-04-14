# Mua Sam Thong Ke Package Status Milestones Design

## Context

Hai trang:

- `/dashboard/admin/mua-sam/thong-ke`
- `/dashboard/facility/mua-sam/thong-ke`

đều đang hiển thị biểu đồ `Trạng thái gói thầu` dựa trực tiếp trên trường `goiThau.trangThai`.

Cách này không phản ánh đúng tiến độ nghiệp vụ thực tế. Người dùng cần biết:

- gói thầu đó thuộc `kế hoạch` nào
- gói thầu đó đã có `Thông báo mời thầu` hay chưa
- gói thầu đó đã có `KQLCNT` hay chưa

Ngoài ra, `quyTrinh = 2` không đi qua luồng `TBMT -> KQLCNT`, nên nếu đưa vào cùng biểu đồ sẽ làm sai nghĩa của trạng thái.

## Goal

Thiết kế lại riêng card `Trạng thái gói thầu` trên trang `Thống kê` để:

- chỉ tính `gói thầu` thuộc `quyTrinh = 1`
- phân loại trạng thái theo mốc nghiệp vụ thực tế, không dùng `goiThau.trangThai`
- chia trạng thái loại trừ nhau thành:
  - `Chưa có TBMT`
  - `Đã có TBMT chưa có KQLCNT`
  - `Đã có KQLCNT`
- cho phép người dùng truy vết từ biểu đồ xuống danh sách gói thầu tương ứng

Scope của thiết kế này chỉ áp dụng cho card `Trạng thái gói thầu`. Các KPI và chart khác trong trang `Thống kê` giữ nguyên.

## Recommendation

Áp dụng hướng `sửa đúng nghiệp vụ + có truy vết`:

- backend suy ra trạng thái thật của từng `gói thầu` dựa trên quan hệ `Kế hoạch -> Gói thầu -> TBMT -> KQLCNT`
- API trả đồng thời:
  - dữ liệu tổng hợp để vẽ chart
  - dữ liệu chi tiết để xem từng gói thầu nằm trong cột nào
- frontend giữ nguyên vị trí card hiện tại, nhưng cho phép chọn một trạng thái để xem danh sách gói thầu tương ứng

Lý do:

- sửa tận gốc sai lệch dữ liệu của biểu đồ
- đáp ứng nhu cầu kiểm tra từng gói thầu thay vì chỉ xem số đếm
- không mở rộng scope sang các chart khác
- áp dụng chung được cho cả `admin` và `facility`

## Current State

File hiện tại:

- `src/app/api/admin/mua-sam/thong-ke/route.ts`
- `src/app/api/facility/mua-sam/thong-ke/route.ts`
- `src/components/mua-sam/AdminMuaSamThongKe.tsx`
- `src/components/mua-sam/FacilityMuaSamThongKe.tsx`

Hiện trạng:

- API đếm `statusData` theo `goiThau.trangThai`
- frontend chỉ hiển thị bar chart tổng hợp
- không có khả năng xem các `gói thầu` nằm sau mỗi cột
- không thể trả lời trực tiếp câu hỏi:
  - gói thầu này thuộc kế hoạch nào
  - gói thầu này đã có `TBMT` chưa
  - gói thầu này đã có `KQLCNT` chưa

## Business Rules

### Included scope

Chỉ tính các `gói thầu` có:

- `goiThau.keHoach.quyTrinh = 1`

### Excluded scope

Không tính vào biểu đồ này:

- mọi `gói thầu` thuộc `quyTrinh = 2`

Lý do: `quyTrinh = 2` không đi qua luồng `TBMT` và `KQLCNT`, nên nếu ép vào một trạng thái của biểu đồ sẽ gây hiểu nhầm.

### Status classification

Mỗi `gói thầu` thuộc `quyTrinh = 1` được phân đúng một trạng thái duy nhất:

1. `Đã có KQLCNT`
   Điều kiện: có ít nhất một `KetQuaLCNT`
2. `Đã có TBMT chưa có KQLCNT`
   Điều kiện: chưa có `KetQuaLCNT`, nhưng có ít nhất một `ThongBaoMoiThau`
3. `Chưa có TBMT`
   Điều kiện: chưa có `ThongBaoMoiThau` và chưa có `KetQuaLCNT`

### Priority order

Nếu một `gói thầu` có cả `TBMT` và `KQLCNT`, trạng thái của nó phải là `Đã có KQLCNT`.

Thứ tự ưu tiên suy trạng thái:

1. `KQLCNT`
2. `TBMT`
3. `Chưa có TBMT`

## Proposed API

### Admin API

File chính: `src/app/api/admin/mua-sam/thong-ke/route.ts`

API admin sẽ tiếp tục trả toàn bộ dữ liệu thống kê đang dùng, nhưng thay phần `statusData` bằng dữ liệu suy ra từ mốc nghiệp vụ thực tế và bổ sung `statusBreakdown`.

### Facility API

File chính: `src/app/api/facility/mua-sam/thong-ke/route.ts`

API facility dùng cùng logic phân loại, nhưng chỉ chạy trên dữ liệu của `facility` hiện tại.

### Required query shape for package status

Để suy trạng thái đúng, truy vấn `gói thầu` cần lấy thêm:

- `id`
- `tenGoiThau`
- `keHoach.id`
- `keHoach.tenKHLCNT`
- `keHoach.maKHLCNT`
- `keHoach.quyTrinh`
- với admin: thêm `keHoach.facility.id`, `keHoach.facility.facilityName`
- `thongBaoMoiThaus`
- `ketQuaLCNTs`

Không cần dùng `goiThau.trangThai` cho card này.

### Derived status data

`statusData` sẽ có đúng 3 phần tử, theo đúng thứ tự hiển thị:

```ts
[
  { name: "Chưa có TBMT", value: number },
  { name: "Đã có TBMT chưa có KQLCNT", value: number },
  { name: "Đã có KQLCNT", value: number },
]
```

### Breakdown data

API trả thêm `statusBreakdown` để frontend render phần truy vết:

```ts
{
  chuaCoTbmt: PackageStatusItem[];
  daCoTbmtChuaCoKqlcnt: PackageStatusItem[];
  daCoKqlcnt: PackageStatusItem[];
}
```

Với:

```ts
type PackageStatusItem = {
  goiThauId: string;
  tenGoiThau: string;
  keHoachId: string;
  tenKHLCNT: string | null;
  maKHLCNT: string | null;
  hasTbmt: boolean;
  hasKqlcnt: boolean;
  tbmtCount: number;
  kqlcntCount: number;
  facilityId?: string;
  facilityName?: string | null;
};
```

### Response compatibility

Các field đang dùng bởi các chart khác vẫn giữ nguyên.

Thay đổi có chủ đích:

- `statusData` đổi nguồn tính toán
- thêm `statusBreakdown`

## Proposed UI

File chính:

- `src/components/mua-sam/AdminMuaSamThongKe.tsx`
- `src/components/mua-sam/FacilityMuaSamThongKe.tsx`

### Status card meaning

Giữ nguyên vị trí card `Trạng thái gói thầu`, nhưng đổi subtitle thành:

- `Phân loại theo tiến độ nghiệp vụ thực tế của gói thầu quy trình 1`

### Interaction

Card trạng thái sẽ có một trạng thái chọn ở client:

- mặc định chưa chọn cột nào
- khi người dùng bấm vào một cột, card chi tiết bên dưới hiển thị danh sách gói thầu thuộc cột đó
- bấm lại cột đang chọn thì bỏ chọn

Không cần modal riêng. Dùng chi tiết inline ngay trong trang để giữ luồng đọc nhanh.

### Breakdown panel

Ngay dưới chart `Trạng thái gói thầu`, hiển thị panel chi tiết:

- khi chưa chọn cột:
  - hiển thị tổng số `gói thầu` đang được tính
  - hiển thị ghi chú `Chỉ bao gồm gói thầu thuộc quy trình 1`
- khi đã chọn cột:
  - hiển thị tiêu đề trạng thái đang xem
  - hiển thị số lượng gói thầu tương ứng
  - hiển thị bảng chi tiết

### Breakdown table columns

Cho `facility`:

- `Tên gói thầu`
- `Kế hoạch`
- `TBMT`
- `KQLCNT`

Cho `admin`:

- `Cơ sở`
- `Tên gói thầu`
- `Kế hoạch`
- `TBMT`
- `KQLCNT`

Quy ước hiển thị:

- cột `Kế hoạch` ưu tiên `tenKHLCNT`, fallback sang `maKHLCNT`
- cột `TBMT` hiển thị `Chưa có` hoặc `Đã có (n)`
- cột `KQLCNT` hiển thị `Chưa có` hoặc `Đã có (n)`

### Empty states

Nếu không có `gói thầu` thuộc `quyTrinh = 1`:

- chart hiển thị trạng thái rỗng
- panel chi tiết hiển thị thông báo:
  - `Chưa có gói thầu quy trình 1 để thống kê`

Nếu một trạng thái không có dữ liệu:

- vẫn hiển thị cột với giá trị `0`
- nếu người dùng chọn vào, panel chi tiết hiển thị:
  - `Không có gói thầu ở trạng thái này`

## Data Flow

1. Trang `Thống kê` gọi API hiện tại như trước.
2. Backend lấy danh sách `gói thầu` kèm quan hệ `kế hoạch`, `TBMT`, `KQLCNT`.
3. Backend lọc ra `quyTrinh = 1`.
4. Backend suy trạng thái loại trừ nhau cho từng `gói thầu`.
5. Backend sinh:
   - `statusData` cho chart
   - `statusBreakdown` cho danh sách chi tiết
6. Frontend render chart.
7. Người dùng chọn một cột.
8. Frontend dùng `statusBreakdown` đã có sẵn để render bảng chi tiết, không cần gọi API bổ sung.

## Error Handling

### Backend

- Nếu truy vấn lỗi, API tiếp tục trả `500` như pattern hiện tại.
- Không phát sinh lỗi validation mới ở đầu vào vì endpoint này không nhận filter mới cho card trạng thái.

### Frontend

- Nếu toàn bộ API lỗi: giữ hành vi hiện tại của trang `Thống kê`
- Nếu `statusBreakdown` thiếu nhưng `statusData` có:
  - không crash
  - panel chi tiết hiển thị thông báo không thể tải danh sách chi tiết

## Risks

### Duplicate milestone records

Một `gói thầu` có thể có nhiều `TBMT` hoặc nhiều `KQLCNT`.

Thiết kế này không đếm theo số bản ghi mốc, mà đếm theo số `gói thầu`. Các trường `tbmtCount` và `kqlcntCount` chỉ dùng để hiển thị chi tiết.

### Meaning drift with existing labels

Tiêu đề `Trạng thái gói thầu` có thể bị hiểu theo `trangThai` nhập tay. Subtitle và panel chi tiết cần nói rõ đây là `trạng thái theo mốc nghiệp vụ`.

### Admin/facility divergence

Nếu `admin` và `facility` tự viết hai logic phân loại khác nhau, sau này rất dễ lệch số.

Thiết kế khuyến nghị dùng cùng một helper nội bộ hoặc cùng một quy tắc dựng dữ liệu ở cả hai route để tránh sai khác.

## Testing Plan

1. Tạo hoặc xác nhận một `gói thầu` `quyTrinh = 1` chưa có `TBMT`, chart phải tăng ở `Chưa có TBMT`.
2. Tạo hoặc xác nhận một `gói thầu` `quyTrinh = 1` có `TBMT` nhưng chưa có `KQLCNT`, chart phải tăng ở `Đã có TBMT chưa có KQLCNT`.
3. Tạo hoặc xác nhận một `gói thầu` `quyTrinh = 1` có `KQLCNT`, chart phải tăng ở `Đã có KQLCNT`.
4. Xác nhận một `gói thầu` `quyTrinh = 2` không làm thay đổi bất kỳ cột nào trong chart.
5. Trên trang `facility`, chọn từng cột và xác nhận bảng chi tiết hiển thị đúng:
   - tên gói thầu
   - kế hoạch tương ứng
   - trạng thái `TBMT`
   - trạng thái `KQLCNT`
6. Trên trang `admin`, xác nhận bảng chi tiết có thêm cột `Cơ sở` và cùng logic phân loại với `facility`.
7. Với một `gói thầu` có cả `TBMT` và `KQLCNT`, xác nhận nó chỉ xuất hiện trong nhóm `Đã có KQLCNT`.
8. Với dữ liệu rỗng cho `quyTrinh = 1`, xác nhận chart và panel hiển thị empty state rõ ràng, không crash.
