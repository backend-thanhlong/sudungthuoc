# Admin Thong Bao Moi Thau Delete Design

## Context

Trang `/dashboard/admin/mua-sam/thong-bao-moi-thau` đã cho admin xem danh sách `TBMT` theo nhóm đơn vị và mở dialog chi tiết, nhưng chưa có thao tác xóa trực tiếp ở màn này.

Người dùng cần cho phép admin xóa `Thông báo mời thầu` từ bảng con của từng đơn vị.

## Goal

Cho phép admin xóa `TBMT` tại màn `/dashboard/admin/mua-sam/thong-bao-moi-thau` với các yêu cầu:

- có nút `Xóa` ngay trong cột `Thao tác`
- có dialog xác nhận trước khi xóa
- backend chặn xóa nếu `TBMT` đã có `Kết quả LCNT`
- sau khi xóa thành công, giao diện reload lại dữ liệu để cập nhật nhóm, summary và pagination

## Recommendation

Thêm route:

- `DELETE /api/admin/thong-bao-moi-thau/:id`

Và bổ sung nút `Xóa` trong bảng con của từng nhóm đơn vị ở màn admin TBMT.

Lý do:

- thao tác xuất phát trực tiếp từ một bản ghi `TBMT`, không cần lồng thêm `keHoachId` hoặc `goiThauId`
- phù hợp với ngữ cảnh dữ liệu đang render ở client
- backend vẫn đủ ngữ cảnh để kiểm tra ràng buộc nghiệp vụ và ghi `activityLog`
- phạm vi thay đổi nhỏ nhất so với yêu cầu

## Current State

File liên quan:

- `src/app/dashboard/admin/mua-sam/thong-bao-moi-thau/page.tsx`
- `src/app/api/admin/thong-bao-moi-thau/route.ts`

Hiện trạng:

- bảng con chỉ có nút `Chi tiết`
- chưa có route xóa riêng cho `TBMT` ở phía admin
- schema cho phép quan hệ xuống `KetQuaLCNT`, nên nếu không chặn ở backend có thể xóa dây chuyền dữ liệu downstream

## Proposed API

File mới:

- `src/app/api/admin/thong-bao-moi-thau/[id]/route.ts`

### Route

- `DELETE /api/admin/thong-bao-moi-thau/:id`

### Validation

Backend xử lý theo thứ tự:

1. xác thực session và bắt buộc `role = ADMIN`
2. tìm `TBMT` theo `id`, kèm:
   - `maTBMT`
   - `goiThau`
   - `keHoach`
   - `facility`
   - `ketQuaLCNTs`
3. nếu không tồn tại, trả `404`
4. nếu đã có ít nhất một `ketQuaLCNT`, trả `409`

Message cho lỗi `409`:

- `Không thể xóa thông báo mời thầu đã có kết quả LCNT`

### Delete behavior

Nếu hợp lệ:

- xóa `TBMT`
- không đụng client-side optimistic delete
- ghi `activityLog` với `entityType = tbmt`

### Response

- thành công: `{ message: "Deleted successfully" }`
- lỗi nghiệp vụ: `404`, `409`
- lỗi hệ thống: `500`

## Proposed UI

File chính:

- `src/app/dashboard/admin/mua-sam/thong-bao-moi-thau/page.tsx`

### Table actions

Trong bảng con của từng đơn vị:

- giữ nút `Chi tiết`
- thêm nút `Xóa`

### Delete confirmation dialog

Dialog xác nhận hiển thị:

- tiêu đề `Xác nhận xóa Thông báo mời thầu`
- tên gói thầu
- mã TBMT
- tên đơn vị
- cảnh báo chỉ được xóa khi chưa có `Kết quả LCNT`

### Client flow

1. admin bấm `Xóa` ở một dòng `TBMT`
2. mở dialog xác nhận
3. khi xác nhận, client gọi `DELETE`
4. nếu thành công:
   - đóng dialog xác nhận
   - đóng dialog chi tiết nếu đang mở đúng `TBMT` vừa xóa
   - reload dữ liệu bằng `loadData()`
5. nếu bị `409`:
   - hiển thị đúng message backend
   - giữ nguyên trạng thái dữ liệu đang hiển thị
6. lỗi khác:
   - hiển thị thông báo lỗi chung

## Risks

### Downstream data loss

Nếu không chặn xóa khi `TBMT` đã có `Kết quả LCNT`, dữ liệu downstream có thể bị xóa cascade theo quan hệ schema. Thiết kế này chặn cứng ở backend bằng `409`.

### Stale detail dialog

Nếu xóa một `TBMT` đang mở trong dialog chi tiết mà không reset state, UI có thể giữ dữ liệu stale. Thiết kế này đóng dialog chi tiết khi bản ghi đang mở bị xóa thành công.

### Summary drift

Nếu chỉ xóa lạc quan ở client, summary và số liệu nhóm có thể lệch với backend. Thiết kế này reload lại toàn bộ dữ liệu sau khi xóa để đồng bộ.

## Testing Plan

1. Mở `/dashboard/admin/mua-sam/thong-bao-moi-thau`, bung một đơn vị và xác nhận thấy nút `Xóa`.
2. Bấm `Xóa`, xác nhận dialog hiển thị đúng tên gói thầu, mã TBMT và đơn vị.
3. Xác nhận xóa một `TBMT` chưa có `Kết quả LCNT`, kiểm tra record biến mất sau khi reload.
4. Kiểm tra summary và số lượng `TBMT` của đơn vị cập nhật đúng sau khi xóa.
5. Thử xóa một `TBMT` đã có `Kết quả LCNT`, xác nhận backend trả `409` và UI hiển thị đúng message.
6. Nếu đang mở dialog chi tiết của đúng `TBMT` vừa xóa, xác nhận dialog đó được đóng lại.
