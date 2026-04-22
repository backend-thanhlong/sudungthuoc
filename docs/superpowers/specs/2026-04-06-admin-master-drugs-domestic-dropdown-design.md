# Thiết kế: Dropdown trường trong nước tại `/dashboard/admin/master-drugs`

## Bối cảnh

Trang `/dashboard/admin/master-drugs` đã có trường dữ liệu `isTrongNuoc` trong model `MasterDrug`, nhưng form Thêm/Sửa hiện đang dùng ô nhập tự do. Người dùng cần cố định trường này thành dropdown để tránh nhập tùy ý.

## Phạm vi

Chỉ thay đổi ô nhập `Trong nước` trong modal Thêm/Sửa của trang admin:

- giá trị hợp lệ gồm `Trong nước`
- và `Nước ngoài`

Ngoài phạm vi:

- không đổi schema Prisma
- không đổi API create/update
- không đổi import/export Excel
- không đổi file mẫu Excel
- không thêm cột mới ở bảng danh sách

## Thiết kế

Trường `isTrongNuoc` sẽ được render bằng `Select` của UI hiện có thay cho `Input`.

Hành vi:

- bản ghi mới mặc định chưa chọn
- người dùng chỉ có thể chọn một trong hai giá trị trên
- khi sửa bản ghi cũ, giá trị `Có` được chuẩn hóa sang `Trong nước`
- khi sửa bản ghi cũ, giá trị `Không` được chuẩn hóa sang `Nước ngoài`
- giá trị rỗng hoặc không khớp hai trường hợp trên sẽ giữ trạng thái chưa chọn

## Kiểm thử

1. Mở `/dashboard/admin/master-drugs`.
2. Chọn `Thêm thuốc`, xác nhận trường `Trong nước` là dropdown với đúng 2 lựa chọn.
3. Sửa một bản ghi có `isTrongNuoc = Có`, xác nhận form hiển thị `Trong nước`.
4. Sửa một bản ghi có `isTrongNuoc = Không`, xác nhận form hiển thị `Nước ngoài`.
5. Lưu thành công và mở lại bản ghi để xác nhận giá trị đã chọn vẫn được giữ.
