# Admin Users Search Design

## Context

Trang `/dashboard/admin/users` dùng để quản lý tài khoản cơ sở y tế và hiện đã có các thao tác thêm, sửa, vô hiệu hóa, đặt lại mật khẩu và xóa. Route `GET /api/admin/users` hiện trả toàn bộ danh sách cơ sở, còn page render bảng hoàn toàn ở client.

Nhu cầu mới đã được chốt là:

- tìm kiếm theo trường chọn trước
- tìm ngay khi gõ
- xử lý ở server
- có phân trang
- có dropdown đổi số dòng mỗi trang

Thiết kế này thay thế phương án client-side trước đó.

## Goal

Thêm chức năng tìm kiếm server-side cho trang `/dashboard/admin/users`, đồng thời bổ sung pagination và page size selector, để người dùng:

- chọn trường tìm kiếm từ dropdown
- nhập từ khóa và thấy kết quả cập nhật ngay khi gõ
- đổi số dòng mỗi trang
- chuyển qua lại giữa các trang kết quả
- tiếp tục dùng các thao tác quản trị hiện có mà không mất ngữ cảnh tìm kiếm

## Scope

Bao gồm:

- mở rộng `GET /api/admin/users` để hỗ trợ tìm kiếm và phân trang
- cập nhật page `/dashboard/admin/users` sang fetch dữ liệu có query params
- thêm UI pagination và dropdown page size
- xử lý race condition khi người dùng gõ nhanh

Không bao gồm:

- thay đổi `POST /api/admin/users`
- thay đổi các route `PATCH`, `DELETE`, `reset-password`
- thêm debounce
- chuyển page sang server component
- thêm bộ lọc trạng thái ngoài tìm kiếm theo trường

## Approach Options

### Option 1: Mở rộng route collection hiện tại

Mở rộng `GET /api/admin/users` để nhận `page`, `limit`, `searchField`, `searchTerm`, và trả về cả dữ liệu lẫn metadata phân trang.

Ưu điểm:

- ít thay đổi cấu trúc nhất
- bám pattern hiện có của `master-drugs`
- không nhân đôi logic select và where

Nhược điểm:

- route collection phải trả response dạng metadata thay vì mảng thuần

### Option 2: Tạo route search riêng

Tạo route mới chỉ phục vụ tìm kiếm và phân trang, ví dụ `/api/admin/users/search`.

Ưu điểm:

- tách CRUD khỏi search

Nhược điểm:

- lặp logic query
- tăng số endpoint phải bảo trì

### Option 3: Chuyển page sang URL-driven SSR

Dùng search params trên page và để server component xử lý việc đọc query.

Ưu điểm:

- URL chia sẻ được
- SSR tự nhiên hơn

Nhược điểm:

- thay đổi kiến trúc lớn hơn nhu cầu hiện tại
- đụng rộng vào page đang là client component

### Recommendation

Chọn Option 1. Đây là cách phù hợp nhất với cấu trúc hiện có và giữ thay đổi tập trung vào đúng route collection cùng page admin users.

## API Design

File tác động: `src/app/api/admin/users/route.ts`

### Request params

`GET /api/admin/users` nhận các query params:

- `page`
- `limit`
- `searchField`
- `searchTerm`

Giá trị mặc định:

- `page = 1`
- `limit = 20`
- `searchField = all`
- `searchTerm = ""`

### Supported search fields

- `all`
- `username`
- `facilityName`
- `facilityCode`
- `facilityType`
- `autonomyGroup`
- `contactPerson`
- `phoneNumber`
- `address`

### Search behavior

Route luôn giữ filter cơ bản:

- `role = FACILITY`

Nếu `searchTerm.trim()` có giá trị:

- `searchField = all`: tạo `OR` với `contains` + `mode: "insensitive"` trên tất cả field hỗ trợ
- `searchField` hợp lệ: chỉ áp dụng `contains` cho field đó
- `searchField` không hợp lệ: fallback về `all`

Nếu `searchTerm.trim()` rỗng:

- không thêm điều kiện tìm kiếm

### Pagination behavior

- `skip = (page - 1) * limit`
- `take = limit`
- `orderBy = { createdAt: "desc" }`

Validation:

- `page` không hợp lệ hoặc nhỏ hơn `1`: fallback về `1`
- `limit` không hợp lệ hoặc không thuộc bộ cho phép: fallback về `20`

### Response shape

Response `GET` đổi sang:

```json
{
  "data": [],
  "metadata": {
    "total": 0,
    "page": 1,
    "limit": 20,
    "totalPages": 1
  }
}
```

Trong đó:

- `data`: danh sách user của trang hiện tại
- `total`: tổng số bản ghi sau khi đã áp dụng tìm kiếm
- `totalPages`: số trang sau khi áp dụng `limit`

`POST /api/admin/users` giữ nguyên contract hiện tại.

## UI Design

File tác động: `src/app/dashboard/admin/users/page.tsx`

### Search controls

Giữ hàng điều khiển ở đầu card danh sách, gồm:

- `Select` chọn trường tìm kiếm
- `Input` nhập từ khóa
- `Button` `Xóa lọc`

Tìm kiếm chạy ngay khi gõ. Không có nút `Tìm kiếm`.

### Search field options

Dropdown dùng đúng bộ trường:

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

Đổi mô tả card thành:

- `Hiển thị {users.length} / {totalRecords} cơ sở y tế`

Cách hiển thị này đúng cho cả trạng thái có tìm kiếm và không tìm kiếm.

### Pagination controls

Thêm cụm phân trang dưới bảng, bám pattern của `master-drugs`, gồm:

- dropdown page size
- hiển thị `Trang X / Y`
- nút `Trang đầu`
- nút `Trước`
- dãy nút số trang
- nút `Sau`
- nút `Trang cuối`

Page size options:

- `20`
- `50`
- `100`

### Table behavior

- bảng render dữ liệu của trang hiện tại từ server
- cột STT tính theo `(page - 1) * limit + index + 1`
- nếu không có kết quả:
  - khi `totalRecords = 0` và đang có từ khóa: hiển thị `Không tìm thấy cơ sở phù hợp`
  - khi `totalRecords = 0` và không có từ khóa: hiển thị `Chưa có cơ sở nào được đăng ký`

## State And Data Flow

### Page state

Page dùng các state:

- `users`
- `isLoading`
- `searchField`
- `searchTerm`
- `page`
- `limit`
- `totalPages`
- `totalRecords`

### Fetch behavior

Mỗi khi một trong các state sau thay đổi, page gọi lại `GET /api/admin/users`:

- `searchField`
- `searchTerm`
- `page`
- `limit`

Query gửi lên gồm:

- `page`
- `limit`
- `searchField`
- `searchTerm`

### Reset rules

- đổi `searchField`: reset `page = 1`
- gõ vào `searchTerm`: reset `page = 1`
- đổi `limit`: reset `page = 1`
- bấm `Xóa lọc`: reset `searchField = all`, `searchTerm = ""`, `page = 1`

### Request race handling

Vì tìm kiếm chạy ngay khi gõ, page cần tránh việc response cũ ghi đè response mới. Cách xử lý:

- dùng `AbortController` trong `useEffect`
- mỗi lần effect chạy lại, hủy request trước đó
- nếu request bị abort, không hiện toast lỗi

## Integration With Existing Actions

Các action hiện có vẫn giữ nguyên:

- thêm cơ sở
- sửa thông tin
- vô hiệu hóa hoặc kích hoạt
- đặt lại mật khẩu
- xóa tài khoản

Sau mỗi action có thay đổi dữ liệu, page gọi lại `fetchUsers()` với đúng `page`, `limit`, `searchField`, `searchTerm` hiện tại.

Nếu thao tác làm tổng số trang giảm và `page` hiện tại không còn hợp lệ:

- page tự điều chỉnh về trang hợp lệ cuối cùng
- sau đó gọi lại dữ liệu cho trang đó

## Error Handling

- nếu API trả lỗi khi tải danh sách, giữ toast lỗi hiện tại
- request bị hủy do gõ nhanh không hiện toast
- `searchField` không hợp lệ ở server sẽ fallback về `all`
- `page` hoặc `limit` không hợp lệ sẽ fallback về giá trị mặc định
- từ khóa chỉ gồm khoảng trắng được coi là không lọc

## Testing Plan

Kiểm tra thủ công:

1. Mở trang mặc định, xác nhận tải trang `1` với page size mặc định và hiển thị đúng tổng số bản ghi.
2. Gõ vào ô tìm kiếm, xác nhận request chạy ngay và bảng cập nhật theo dữ liệu từ server.
3. Đổi `searchField`, xác nhận page reset về `1` và kết quả lọc đúng.
4. Đổi page size từ `20` sang `50` hoặc `100`, xác nhận page reset về `1` và STT tính lại đúng.
5. Chuyển qua lại giữa các trang, xác nhận `Trang X / Y` và dữ liệu khớp.
6. Tìm với từ khóa không có kết quả, xác nhận hiển thị `Không tìm thấy cơ sở phù hợp`.
7. Đang ở trang lớn hơn `1`, đổi từ khóa, xác nhận tự về trang `1`.
8. Đang có filter, thực hiện `Sửa`, `Vô hiệu hóa`, hoặc `Xóa`, xác nhận bảng reload đúng theo filter và trang hiện tại hoặc tự điều chỉnh về trang hợp lệ.
9. Gõ nhanh liên tục, xác nhận UI không bị trả về dữ liệu cũ sau khi request mới hơn đã hoàn tất.

## Risks

- nếu không xử lý request race, UI có thể nháy về dữ liệu cũ khi người dùng gõ nhanh
- nếu không đồng bộ `page` với `totalPages` sau khi xóa hoặc thay đổi filter, người dùng có thể rơi vào trang rỗng
- vì contract `GET /api/admin/users` đổi từ mảng thuần sang object có metadata, page phải được cập nhật đồng thời với route

## Implementation Notes

- giữ thay đổi tập trung chủ yếu trong 2 file hiện có
- dùng một hằng số chung cho page size options ở page để tránh magic numbers
- logic tạo `where` cho Prisma nên tách rõ danh sách field hợp lệ để tránh nhận tùy ý từ query string
- sau khi chuyển sang server-side, logic lọc client-side trước đó cần được loại bỏ hoàn toàn để tránh hai tầng filter chồng nhau
