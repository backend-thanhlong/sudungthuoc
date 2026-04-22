# Thiết kế: Bộ lọc theo cột tại `/dashboard/admin/master-drugs`

## Bối cảnh

Trang `/dashboard/admin/master-drugs` hiện đã có:

- phân trang server-side
- tìm kiếm tổng quát theo `searchTerm + searchField`
- bộ lọc `mappingStatus`
- tùy chỉnh ẩn/hiện cột qua menu `Hiển thị`

Người dùng cần bổ sung khả năng lọc trực tiếp theo từng cột ngay trên bảng danh sách thuốc.

Do tập dữ liệu lớn, khoảng `50.000` dòng, việc lọc theo cột không thể làm theo kiểu chỉ lọc trên page hiện tại ở client mà phải lọc toàn bộ dataset tại server trước khi phân trang.

## Mục tiêu

Cho phép người dùng tại `/dashboard/admin/master-drugs`:

- lọc theo từng cột đang hiển thị ngay trên tiêu đề bảng
- áp dụng lọc trên toàn bộ dữ liệu bằng server-side filtering
- chỉ chạy lọc khi người dùng bấm nút `Lọc`
- xóa toàn bộ bộ lọc theo cột bằng nút `Xóa lọc`
- tự động xóa filter của cột khi người dùng ẩn cột đó

## Phạm vi

Bao gồm:

- thêm một hàng filter ngay dưới hàng tiêu đề cột
- thêm state draft/applied cho filter theo cột ở client
- mở rộng API `GET /api/admin/master-drugs` để nhận filter theo từng cột
- kết hợp `mappingStatus`, tìm kiếm tổng quát hiện có, và filter theo cột trong cùng truy vấn
- cập nhật empty state để phản ánh đúng khi đang có active column filters

Không bao gồm:

- lọc client-side trên toàn bộ 50.000 dòng
- debounce auto-apply khi gõ
- lưu bộ lọc qua lần mở trang sau
- sort theo cột
- filter cho các cột không có dữ liệu thực như `STT` và `Thao tác`

## Phương án

### Phương án 1: Hàng filter luôn hiển thị ngay dưới header

Ưu điểm:

- thao tác nhanh nhất
- nhìn cột nào lọc cột đó
- phù hợp với bảng admin có nhiều cột
- không tăng số click để mở filter

Nhược điểm:

- phần header cao hơn hiện tại

### Phương án 2: Mỗi cột có icon filter mở popover

Ưu điểm:

- tiết kiệm chiều cao header

Nhược điểm:

- chậm hơn khi lọc nhiều cột
- tăng số click
- khó nhìn tổng thể các điều kiện đang nhập

### Phương án 3: Một panel lọc riêng phía trên bảng

Ưu điểm:

- bố cục dễ dựng hơn

Nhược điểm:

- không còn đúng yêu cầu “lọc trên tiêu đề từng cột”
- khoảng cách nhận thức giữa cột và điều kiện lọc lớn hơn

### Khuyến nghị

Chọn Phương án 1.

Đây là hướng phù hợp nhất với khối lượng dữ liệu lớn, mô hình bảng hiện có, và yêu cầu thao tác trực tiếp trên từng cột.

## Thiết kế UX

`TableHeader` sẽ có hai hàng:

- hàng 1: tiêu đề cột như hiện tại
- hàng 2: hàng filter tương ứng với từng cột đang hiển thị

Nguyên tắc:

- chỉ render filter cho các cột đang visible
- cùng một điều kiện hiển thị phải được dùng cho header, hàng filter, và body để không lệch cột
- thay đổi filter chỉ có hiệu lực sau khi người dùng bấm `Lọc`
- bấm `Xóa lọc` chỉ xóa column filters, không làm thay đổi `mappingStatus`

### Cột không lọc

- `STT`: hiển thị ô trống để giữ layout
- `Thao tác`: hiển thị nút `Lọc` và `Xóa lọc`

### Cột text

Các cột sau dùng ô nhập nhỏ một dòng, match theo kiểu `contains`:

- `Mã BHYT`
- `Tên thuốc`
- `Hoạt chất`
- `Hàm lượng`
- `Số đăng ký`
- `Dạng bào chế`
- `Quy cách`
- `Đường dùng`
- `Đơn vị tính`

Không có chế độ khớp chính xác trong scope thay đổi này.

### Cột danh mục

- `Nhóm thuốc`: dùng `Select` với danh sách cố định hiện có trong file
- `Nhóm điều trị`: dùng search-select nhẹ lấy từ danh mục chuẩn `TherapeuticGroup`

Trong hàng filter, `Nhóm điều trị` chỉ phục vụ lọc nên không có hành vi tạo mới tại chỗ.

## Tương tác với cột sticky

`Hoạt chất` hiện đang là cột sticky bên trái trong bảng dữ liệu.

Hàng filter phải giữ cùng hành vi sticky cho ô `Hoạt chất`:

- cùng `left`
- cùng `z-index` hợp lý
- có nền riêng để không lộ lớp phía dưới khi cuộn ngang

Nếu không giữ đồng bộ sticky giữa header, filter row và body, bảng sẽ bị lệch khi cuộn ngang.

## Hành vi state phía client

Tại `src/app/dashboard/admin/master-drugs/page.tsx`, thêm hai lớp state:

- `columnFiltersDraft`
- `columnFiltersApplied`

### `columnFiltersDraft`

Lưu các giá trị người dùng đang nhập/chọn trong hàng filter nhưng chưa áp dụng.

### `columnFiltersApplied`

Lưu bộ filter thực tế đang được gửi lên API.

### Hành vi

- bấm `Lọc`:
  - copy `draft -> applied`
  - reset `page = 1`
  - gọi lại API
- bấm `Xóa lọc`:
  - xóa cả `draft` và `applied`
  - reset `page = 1`
  - gọi lại API
- ẩn một cột:
  - xóa filter `draft` và `applied` của cột đó ngay lập tức
  - nếu filter vừa bị xóa đang ảnh hưởng kết quả, reset `page = 1` và fetch lại

Filter đã bị xóa do ẩn cột sẽ không tự quay lại khi người dùng bấm `Hiện tất cả` để hiện lại cột.

## Contract filter với API

Các query param filter theo cột được đề xuất:

- `maBhyt`
- `tenThuoc`
- `hoatChat`
- `hamLuong`
- `soDangKy`
- `dangBaoChe`
- `quyCach`
- `duongDung`
- `donViTinh`
- `nhomThuoc`
- `therapeuticGroupId`

Semantics:

- tất cả cột text dùng `contains` không phân biệt hoa thường
- `nhomThuoc` match đúng theo option được chọn
- `therapeuticGroupId` match đúng theo id danh mục

## Thiết kế backend

File tác động chính:

- `src/app/api/admin/master-drugs/route.ts`

API `GET` sẽ tiếp tục nhận:

- `page`
- `limit`
- `search`
- `searchField`
- `mappingStatus`

Và nhận thêm các query param filter theo cột.

### Nguyên tắc build truy vấn

`where` cuối cùng của Prisma là phép `AND` giữa:

- filter `mappingStatus`
- tìm kiếm tổng quát hiện có
- các filter theo cột đang active

Quy tắc áp dụng:

- filter rỗng bị bỏ qua
- cột text dùng `contains` + `mode: "insensitive"`
- `nhomThuoc` dùng exact match
- `therapeuticGroupId` dùng exact match trên khóa ngoại

Sau khi build `where`, backend mới thực hiện:

- `count`
- `findMany`
- `orderBy`
- `skip/take`

## Tương tác với các chức năng hiện có

### Tìm kiếm tổng quát

Giữ nguyên ô tìm kiếm tổng quát hiện có.

Tìm kiếm tổng quát và filter theo cột hoạt động đồng thời. Đây là hành vi chủ động, không loại trừ lẫn nhau.

### Phân trang

Mỗi lần áp dụng hoặc xóa filter theo cột đều reset về trang `1`.

### Hiển thị cột

Filter chỉ tồn tại cho các cột đang hiển thị. Khi cột bị ẩn, filter của cột đó bị xóa ngay để tránh “lọc ngầm”.

### Empty state

Thông báo rỗng không nên chỉ dựa vào `searchTerm` như hiện tại, mà cần dựa trên việc có bất kỳ active filter nào từ:

- tìm kiếm tổng quát
- `mappingStatus` khác mặc định
- column filters

Điều này giúp thông điệp phản ánh đúng rằng dữ liệu đang bị thu hẹp bởi bộ lọc.

## Xử lý lỗi và edge cases

- query filter rỗng hoặc chỉ có khoảng trắng bị bỏ qua
- `therapeuticGroupId` không hợp lệ không nên làm hỏng request; backend chỉ áp exact match khi giá trị hợp lệ
- ẩn một cột đang có filter phải xóa cả draft lẫn applied để tránh chênh lệch state
- các cột bắt buộc luôn hiển thị vẫn có thể có filter nếu đó là cột dữ liệu thật
- `STT` và `Thao tác` không có filter và không phát sinh query param tương ứng

## Kiểm thử thủ công

1. Lọc theo một cột text và xác nhận dữ liệu toàn bảng được thu hẹp đúng trên server.
2. Lọc đồng thời nhiều cột text và xác nhận điều kiện được kết hợp theo `AND`.
3. Lọc theo `Nhóm thuốc`.
4. Lọc theo `Nhóm điều trị`.
5. Bấm `Lọc` nhiều lần sau khi chỉnh `draft` và xác nhận chỉ `applied` mới ảnh hưởng dữ liệu.
6. Bấm `Xóa lọc` và xác nhận `mappingStatus` vẫn giữ nguyên.
7. Ẩn một cột đang có filter và xác nhận filter của cột đó bị xóa, dữ liệu tự refresh.
8. Đổi page size hoặc phân trang sau khi lọc và xác nhận tổng số bản ghi đúng.
9. Cuộn ngang bảng và xác nhận ô filter dưới `Hoạt chất` vẫn sticky, không lệch lớp.

## File dự kiến tác động

- `src/app/dashboard/admin/master-drugs/page.tsx`
- `src/app/api/admin/master-drugs/route.ts`
