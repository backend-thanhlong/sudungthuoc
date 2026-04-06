# Admin Users Search Design

## Context

Trang `/dashboard/admin/users` hiện dùng để quản lý tài khoản cơ sở y tế. Page gọi `GET /api/admin/users` để tải toàn bộ danh sách cơ sở về client rồi render bảng, đồng thời hỗ trợ các thao tác thêm, sửa, vô hiệu hóa, đặt lại mật khẩu và xóa.

Hiện trang chưa có chức năng tìm kiếm, nên khi danh sách cơ sở tăng lên người dùng phải dò thủ công trong bảng. Vì page đang tải toàn bộ dữ liệu sẵn và chưa có phân trang, nhu cầu phù hợp nhất lúc này là lọc ngay trên client trong lúc nhập.

## Goal

Thêm chức năng tìm kiếm cho trang `/dashboard/admin/users`, cho phép người dùng:

- chọn trường tìm kiếm từ dropdown
- nhập từ khóa và thấy kết quả lọc ngay khi gõ
- xóa bộ lọc để quay lại toàn bộ danh sách
- giữ nguyên các thao tác quản trị hiện có trên bảng

## Scope

Bao gồm:

- thêm UI tìm kiếm ở đầu bảng danh sách cơ sở
- lọc client-side trên danh sách `users` đã tải sẵn
- hiển thị số bản ghi đang hiển thị so với tổng số
- thêm empty state phù hợp khi không có kết quả

Không bao gồm:

- thay đổi API `/api/admin/users`
- thêm debounce
- thêm phân trang
- thêm bộ lọc trạng thái hoặc nhiều điều kiện nâng cao

## Approach Options

### Option 1: Lọc client-side ngay trên danh sách đã tải

Giữ nguyên API hiện tại, thêm state `searchField` và `searchTerm`, sau đó tạo `filteredUsers` từ `users` để render ra bảng.

Ưu điểm:

- thay đổi gọn, chỉ cần sửa page hiện có
- phản hồi tức thì, đúng yêu cầu lọc ngay
- không sinh thêm request khi người dùng gõ

Nhược điểm:

- nếu số lượng cơ sở tăng rất lớn thì hiệu năng sẽ kém hơn server-side

### Option 2: Mở rộng API để tìm kiếm server-side

Thêm query params tìm kiếm cho `GET /api/admin/users`, rồi gọi lại API mỗi khi người dùng thay đổi từ khóa hoặc trường tìm.

Ưu điểm:

- phù hợp hơn khi dữ liệu lớn

Nhược điểm:

- phức tạp hơn nhu cầu hiện tại
- sinh nhiều request
- chưa đồng bộ với việc page hiện không có phân trang

### Option 3: Hybrid, giữ UI hiện tại nhưng tạo contract sẵn cho server-side

Thiết kế state theo hướng dễ nâng cấp lên server-side sau, nhưng vẫn render từ dữ liệu client ở giai đoạn này.

Ưu điểm:

- tạo đường nâng cấp sau này

Nhược điểm:

- tăng độ phức tạp không cần thiết cho một thay đổi nhỏ

### Recommendation

Chọn Option 1. Đây là cách khớp nhất với kiến trúc hiện tại của page: dữ liệu đã có sẵn ở client, chưa có pagination, và yêu cầu là lọc ngay khi gõ.

## UI Design

File tác động: `src/app/dashboard/admin/users/page.tsx`

### Search controls

Thêm một hàng điều khiển ở đầu phần nội dung card, phía trên bảng danh sách, gồm:

- `Select` chọn trường tìm kiếm
- `Input` nhập từ khóa
- `Button` `Xóa lọc`

Không thêm nút `Tìm kiếm`, vì yêu cầu đã chốt là lọc ngay khi nhập.

### Search field options

Dropdown trường tìm kiếm dùng bộ trường theo bảng hiện tại:

- `all`: Tất cả
- `username`: Tên đăng nhập
- `facilityName`: Tên cơ sở
- `facilityCode`: Mã cơ sở
- `facilityType`: Loại cơ sở
- `autonomyGroup`: Nhóm tự chủ
- `contactPerson`: Người liên hệ
- `phoneNumber`: SĐT
- `address`: Địa chỉ

### Card description

Đổi dòng mô tả từ `Tổng cộng {users.length} cơ sở y tế` sang dạng:

- khi không lọc: `Tổng cộng {users.length} cơ sở y tế`
- khi đang lọc: `Hiển thị {filteredUsers.length} / {users.length} cơ sở y tế`

### Empty state

Giữ thanh tìm kiếm luôn hiển thị và phân biệt hai trường hợp:

- `users.length === 0`: hiển thị thông báo chưa có cơ sở nào
- `users.length > 0 && filteredUsers.length === 0`: hiển thị thông báo không tìm thấy cơ sở phù hợp

## State And Data Flow

### New state

Thêm hai state:

- `searchField`, mặc định `all`
- `searchTerm`, mặc định chuỗi rỗng

### Derived data

Tạo `filteredUsers` từ `users` theo các quy tắc:

- chuẩn hóa `searchTerm` bằng `trim()`
- nếu từ khóa rỗng thì trả về toàn bộ `users`
- nếu `searchField === "all"` thì so khớp trên toàn bộ field hỗ trợ
- nếu chọn field cụ thể thì chỉ so khớp field đó

So khớp dùng:

- `toLowerCase()`
- `includes(...)`

Mục tiêu là không phân biệt hoa thường và hỗ trợ tìm theo chuỗi con.

### Field normalization

Mọi field nullable đều phải fallback về chuỗi rỗng trước khi so khớp, ví dụ:

- `facilityName ?? ""`
- `contactPerson ?? ""`
- `phoneNumber ?? ""`
- `address ?? ""`

Điều này tránh lỗi runtime khi filter trên các cột có thể để trống.

### Interaction behavior

- nhập vào ô tìm kiếm: cập nhật `searchTerm` và lọc lại bảng ngay
- đổi `searchField`: giữ nguyên `searchTerm` hiện có và lọc lại ngay trên field mới
- bấm `Xóa lọc`: reset `searchField = "all"` và `searchTerm = ""`

## Integration With Existing Actions

Các thao tác hiện có tiếp tục giữ nguyên flow:

- thêm cơ sở
- sửa thông tin
- vô hiệu hóa hoặc kích hoạt
- đặt lại mật khẩu
- xóa tài khoản

Sau các thao tác có reload dữ liệu bằng `fetchUsers()`, page vẫn giữ nguyên `searchField` và `searchTerm`. Khi `users` được cập nhật, `filteredUsers` sẽ tự tính lại theo state đang có.

Điều này giúp người dùng không mất ngữ cảnh tìm kiếm sau khi thao tác trên một dòng trong bảng.

## Error Handling

- không thay đổi xử lý lỗi tải danh sách hiện tại
- không phát sinh request mới trong lúc gõ, nên không có trạng thái lỗi mới cho tìm kiếm
- từ khóa chỉ gồm khoảng trắng được coi như không lọc
- nếu người dùng tìm trên field có giá trị trống ở nhiều dòng, hệ thống chỉ trả kết quả rỗng chứ không lỗi

## Testing Plan

Kiểm tra thủ công:

1. Mở trang và xác nhận thanh tìm kiếm hiển thị phía trên bảng.
2. Chọn `Tất cả`, nhập một phần tên cơ sở và xác nhận bảng lọc ngay khi gõ.
3. Chọn `Mã cơ sở`, nhập mã và xác nhận chỉ các dòng khớp mã cơ sở được giữ lại.
4. Chọn `SĐT` hoặc `Người liên hệ`, nhập từ khóa trong khi một số dòng để trống field đó, xác nhận không lỗi runtime.
5. Bấm `Xóa lọc`, xác nhận dropdown về `Tất cả`, input rỗng và bảng hiện lại toàn bộ dữ liệu.
6. Đang lọc rồi sửa một cơ sở, xác nhận dữ liệu reload xong vẫn áp dụng filter hiện tại.
7. Đang lọc rồi vô hiệu hóa hoặc kích hoạt một cơ sở, xác nhận bảng không mất trạng thái lọc.
8. Tìm với từ khóa không có kết quả, xác nhận empty state hiển thị đúng thông điệp.

## Risks

- nếu logic filter viết trực tiếp nhiều điều kiện trong JSX, file page vốn đã dài sẽ khó bảo trì hơn
- nếu không chuẩn hóa `null` sang chuỗi rỗng, filter trên các cột tùy chọn có thể gây lỗi
- nếu sau này số lượng cơ sở tăng mạnh, client-side filtering có thể cần được thay bằng server-side search kết hợp pagination

## Implementation Notes

- giữ thay đổi tập trung trong một file page hiện có
- ưu tiên tạo helper nhỏ hoặc mapping field rõ ràng để tránh lặp lại logic chuẩn hóa chuỗi
- không đổi contract API để tránh ảnh hưởng phần tạo, sửa và các thao tác khác đang dùng cùng route
