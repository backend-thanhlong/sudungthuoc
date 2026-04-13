# Admin Goi Thau Delete Design

## Context

Trang `/dashboard/admin/mua-sam/lap-ke-hoach-lcnt` đã có modal chi tiết `KHLCNT`, trong đó hiển thị bảng `Danh sách gói thầu`. Hiện admin chỉ có thể xem chi tiết gói thầu, chưa thể xóa trực tiếp từ danh sách này.

Người dùng cần cho phép admin xóa gói thầu ngay trong bảng `Danh sách gói thầu`, nhưng chỉ khi gói thầu chưa có `TBMT` liên kết.

## Goal

Cho phép admin xóa gói thầu từ danh sách trong modal chi tiết `KHLCNT` với các yêu cầu:

- nút `Xóa` xuất hiện ngay trong cột `Thao tác`
- có dialog xác nhận trước khi xóa
- backend chỉ cho xóa khi gói thầu chưa có `TBMT`
- sau khi xóa, giao diện reload đúng để cập nhật lại danh sách và số liệu liên quan

## Recommendation

Thêm route admin nested theo `KHLCNT` để xóa gói thầu:

- `DELETE /api/admin/ke-hoach-lcnt/:id/goi-thau/:goiThauId`

Và bổ sung nút `Xóa` ngay trong bảng `Danh sách gói thầu` của modal chi tiết kế hoạch.

Lý do:

- đúng với ngữ cảnh thao tác hiện tại vì admin đang xem một `KHLCNT` cụ thể
- dễ kiểm tra `goiThauId` có thực sự thuộc `KHLCNT` đang mở hay không
- ít thay đổi nhất so với code hiện tại
- không phải thêm logic phức tạp ở client

## Current State

File liên quan:

- `src/app/dashboard/admin/mua-sam/lap-ke-hoach-lcnt/page.tsx`
- `src/app/api/admin/ke-hoach-lcnt/[id]/route.ts`
- `src/app/api/facility/ke-hoach-lcnt/[id]/goi-thau/[goiThauId]/route.ts`

Hiện trạng:

- bảng `Danh sách gói thầu` trong modal admin chỉ có nút `Chi tiết`
- admin có route xóa `KHLCNT`, nhưng chưa có route xóa riêng `gói thầu`
- phía facility đã có route nested theo `goiThauId` để cập nhật gói thầu và chặn sửa nếu có dữ liệu liên kết

## Proposed API

File mới:

- `src/app/api/admin/ke-hoach-lcnt/[id]/goi-thau/[goiThauId]/route.ts`

### Route

- `DELETE /api/admin/ke-hoach-lcnt/:id/goi-thau/:goiThauId`

### Validation

Backend xử lý theo thứ tự:

1. xác thực session và bắt buộc `role = ADMIN`
2. tìm `goiThau` theo `goiThauId`, kèm:
   - `id`
   - `keHoachId`
   - `tenGoiThau`
   - `thongBaoMoiThaus`
3. nếu không tồn tại, trả `404`
4. nếu `goiThau.keHoachId !== id`, trả `400`
5. nếu đã có `thongBaoMoiThaus`, trả `409`

Message cho lỗi `409`:

- `Không thể xóa gói thầu đã có thông báo mời thầu`

### Delete behavior

Nếu hợp lệ:

- xóa `goiThau`
- phần lô liên quan bị xóa theo quan hệ cascade hiện có
- ghi `activityLog` cho admin để lưu vết thao tác

### Response

- thành công: `{ message: "Deleted successfully" }`
- lỗi nghiệp vụ: `404`, `400`, `409`
- lỗi hệ thống: `500`

## Proposed UI

File chính:

- `src/app/dashboard/admin/mua-sam/lap-ke-hoach-lcnt/page.tsx`

### Package table actions

Trong bảng `Danh sách gói thầu`:

- giữ nút `Chi tiết`
- thêm nút `Xóa`

### Delete confirmation dialog

Thêm dialog xác nhận riêng cho xóa gói thầu:

- tiêu đề: `Xác nhận xóa gói thầu`
- nội dung:
  - hỏi xác nhận xóa
  - hiển thị `tên gói thầu`
  - mô tả rõ ràng: `Chỉ có thể xóa gói thầu chưa có thông báo mời thầu liên kết.`
- nút:
  - `Hủy`
  - `Xóa`

### Client flow

1. admin mở modal chi tiết `KHLCNT`
2. bấm `Xóa` ở một dòng gói thầu
3. mở dialog xác nhận
4. xác nhận xóa thì gọi API `DELETE`
5. khi thành công:
   - đóng dialog
   - reload dữ liệu bằng `loadData()`
   - cập nhật lại modal chi tiết `KHLCNT`
6. khi bị `409`:
   - hiển thị đúng message backend
   - giữ nguyên modal chi tiết kế hoạch
7. khi lỗi khác:
   - hiển thị lỗi chung

### Client state

State cần bổ sung:

- `deleteGoiThauOpen`
- `goiThauToDelete`
- `deleteGoiThauLoading`

## Risks

### Wrong parent-child deletion

Nếu chỉ nhận `goiThauId` mà không kiểm tra `keHoachId`, admin có thể xóa nhầm gói thầu ngoài ngữ cảnh kế hoạch đang xem. Route nested tránh rủi ro này.

### Linked TBMT data

Nếu cho xóa khi đã có `TBMT`, dữ liệu mua sắm phía sau sẽ bị phá vỡ logic nghiệp vụ. Thiết kế này chặn cứng ở backend bằng `409`.

### UI stale data

Nếu chỉ xóa lạc quan ở client, danh sách trong modal và summary ngoài màn hình có thể lệch nhau. Thiết kế này dùng reload sau khi xóa thành công để đồng bộ lại toàn bộ.

## Testing Plan

1. Mở chi tiết một `KHLCNT` có gói thầu chưa có `TBMT`, xác nhận thấy nút `Xóa`.
2. Bấm `Xóa`, xác nhận dialog hiển thị đúng tên gói thầu.
3. Xác nhận xóa, kiểm tra gói thầu biến mất khỏi danh sách sau khi reload.
4. Kiểm tra số lượng gói thầu của `KHLCNT` cập nhật đúng sau khi xóa.
5. Thử xóa một gói thầu đã có `TBMT`, xác nhận backend trả `409` và UI hiển thị đúng thông báo lỗi.
6. Thử gọi route với `goiThauId` không thuộc `keHoachId`, xác nhận bị chặn với `400`.
