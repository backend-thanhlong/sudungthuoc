# Thiết kế: Dropdown trường nhóm thuốc tại `/dashboard/admin/master-drugs`

## Bối cảnh

Trang `/dashboard/admin/master-drugs` đã có trường dữ liệu `nhomThuoc` trong model `MasterDrug`, nhưng form Thêm/Sửa hiện đang dùng ô nhập tự do. Người dùng cần cố định trường này thành dropdown để tránh nhập tùy ý.

## Phạm vi

Chỉ thay đổi ô nhập `Nhóm thuốc` trong modal Thêm/Sửa của trang admin:

- giá trị hợp lệ gồm `Hóa dược`
- `Dược liệu`
- `Vắc xin`
- `Sinh phẩm`
- và `Nguyên liệu làm thuốc`

Ngoài phạm vi:

- không đổi schema Prisma
- không đổi API create/update
- không đổi import/export Excel
- không đổi file mẫu Excel
- không thêm cột mới ở bảng danh sách

## Thiết kế

Trường `nhomThuoc` sẽ được render bằng `Select` của UI hiện có thay cho `Input`.

Hành vi:

- bản ghi mới mặc định chưa chọn
- người dùng chỉ có thể chọn một trong năm giá trị trên
- khi sửa bản ghi cũ, nếu giá trị hiện tại khớp đúng một trong năm lựa chọn thì form hiển thị sẵn giá trị đó
- khi sửa bản ghi cũ, nếu giá trị hiện tại rỗng hoặc không khớp danh sách trên thì form giữ trạng thái chưa chọn để người dùng chọn lại

## Kiểm thử

1. Mở `/dashboard/admin/master-drugs`.
2. Chọn `Thêm thuốc`, xác nhận trường `Nhóm thuốc` là dropdown với đúng 5 lựa chọn đã chốt.
3. Sửa một bản ghi có `nhomThuoc = Hóa dược`, xác nhận form hiển thị sẵn `Hóa dược`.
4. Sửa một bản ghi có `nhomThuoc = Nhóm 1` hoặc giá trị ngoài danh sách, xác nhận form hiển thị trạng thái chưa chọn.
5. Lưu thành công và mở lại bản ghi để xác nhận giá trị đã chọn vẫn được giữ.
