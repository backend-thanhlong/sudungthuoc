# Facility LCNT Hinh Thuc Options Design

## Context

Trang `/dashboard/facility/mua-sam/lap-ke-hoach-lcnt` đang dùng danh sách chọn cố định cho trường `Hình thức lựa chọn nhà thầu`. Người dùng cần bổ sung thêm hai giá trị mới để nhập liệu trực tiếp trên form gói thầu.

## Goal

Thêm hai lựa chọn mới cho trường `Hình thức lựa chọn nhà thầu`:

- `Chỉ định thầu`
- `Chào giá trực tuyến`

## Recommendation

Sửa trực tiếp constant `HINH_THUC_OPTIONS` trong page facility hiện tại.

Lý do:

- đúng phạm vi yêu cầu
- không cần đổi API hay schema vì backend đang lưu chuỗi tự do
- ít rủi ro nhất vì chỉ mở rộng danh sách option của `Select`

## Scope

Bao gồm:

- thêm 2 option mới vào `HINH_THUC_OPTIONS`
- giữ nguyên UI và cách lưu dữ liệu hiện có

Không bao gồm:

- đổi logic validate backend
- refactor constant dùng chung cho các màn hình khác

## Testing Plan

1. Mở form thêm hoặc sửa gói thầu tại `/dashboard/facility/mua-sam/lap-ke-hoach-lcnt`.
2. Kiểm tra dropdown `Hình thức LCNT` hiển thị thêm `Chỉ định thầu` và `Chào giá trực tuyến`.
3. Chọn từng giá trị mới và lưu, xác nhận dữ liệu hiển thị lại đúng ở màn chi tiết.
