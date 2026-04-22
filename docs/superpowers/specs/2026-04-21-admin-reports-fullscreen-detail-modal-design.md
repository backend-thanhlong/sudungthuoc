# Admin Reports Fullscreen Detail Modal Design

## Context

Trang `/dashboard/admin/reports` hiện mở modal `Xem báo cáo` bằng dialog kích thước khoảng `90vw x 90vh`.

Yêu cầu là chuyển modal này sang full-screen thật, đồng nhất với pattern modal full-screen đang dùng ở các màn admin khác, nhưng vẫn giữ nguyên nội dung chi tiết báo cáo hiện tại.

## Goal

- modal `Xem báo cáo` hiển thị full-screen thật
- giữ nguyên toàn bộ nội dung và hành vi hiện có bên trong modal
- không đổi API, state, logic tìm kiếm, bảng dữ liệu, hoặc phân trang

## Scope

Bao gồm:

- đổi shell `DialogContent` sang full-screen
- cập nhật layout header/body để vùng nội dung cuộn ổn trong full-screen

Không bao gồm:

- thay đổi dữ liệu hiển thị trong modal
- thay đổi cấu trúc bảng chi tiết
- thêm route riêng thay cho modal

## Design

- dùng cùng pattern full-screen shell như modal admin LCNT:
  - `100dvh`
  - `100vw`
  - không bo góc
  - không shadow popup cũ
- `DialogHeader` trở thành phần cố định đầu modal
- phần nội dung bên dưới dùng `flex` + `min-h-0` để:
  - form tìm kiếm và badge vẫn hiển thị bình thường
  - bảng chi tiết tiếp tục cuộn nội bộ
  - phân trang vẫn nằm trong cùng flow hiện tại

## Expected Result

- thao tác `Xem` trong `/dashboard/admin/reports` mở modal full-screen
- nội dung chi tiết báo cáo không đổi
- trải nghiệm cuộn ổn trên viewport lớn và nhỏ
