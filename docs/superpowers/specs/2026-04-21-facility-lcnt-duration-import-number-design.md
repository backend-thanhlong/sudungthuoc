# Facility LCNT Duration Import Number Design

## Context

Tab `Thông tin gói thầu` tại màn hình `/dashboard/facility/mua-sam/lap-ke-hoach-lcnt` có file mẫu Excel để nhập danh sách phần lô.

Hiện tại cột `Thời gian thực hiện gói thầu` chỉ được đọc bằng helper text chung. Vì vậy:

- nếu người dùng nhập ô Excel dạng text như `12`, hệ thống nhận đúng
- nếu người dùng nhập ô Excel dạng số như `12`, hệ thống bỏ trống giá trị này khi import

## Goal

Cho phép cột `Thời gian thực hiện gói thầu` nhận cả:

- text Excel như `12`
- số Excel như `12`

Giá trị sau import vẫn phải được chuẩn hóa về `string`, ví dụ `12`.

## Scope

Bao gồm:

- thêm helper riêng cho field duration import
- chỉ đổi mapping import của cột `Thời gian thực hiện gói thầu`

Không bao gồm:

- thay đổi cách import các cột text khác
- thay đổi cách import các cột số như `Số lượng`, `Đơn giá`, `Thành tiền`
- thay đổi schema hoặc API

## Design

- giữ nguyên `normalizeImportText()` cho các cột text hiện có
- thêm helper chuyên biệt, ví dụ `normalizeDurationImportValue()`
- helper mới xử lý:
  - `string` -> `trim()`
  - `number` hữu hạn -> đổi sang `string`
  - giá trị khác -> `""`
- đổi đúng một dòng mapping Excel của trường `thoiGianThucHien` sang helper mới

## Expected Result

- ô text `12` import thành `"12"`
- ô số `12` import thành `"12"`
- ô trống vẫn import thành `""`
- các cột khác giữ nguyên hành vi hiện tại
