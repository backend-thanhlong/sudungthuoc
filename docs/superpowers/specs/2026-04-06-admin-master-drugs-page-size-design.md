# Admin Master Drugs Page Size Design

## Context

Trang `/dashboard/admin/master-drugs` đang phân trang server-side và cố định `limit = 20` ở client. Người dùng cần một ô chọn ở góc trái cuối bảng để đổi số dòng hiển thị giữa `20`, `50`, và `100`.

## Goal

Cho phép người dùng đổi số dòng hiển thị của bảng tại `/dashboard/admin/master-drugs` với các yêu cầu:

- mặc định luôn là `20`
- ô chọn nằm ở góc trái cuối bảng, cạnh cụm thông tin trang
- hỗ trợ các giá trị `20`, `50`, `100`
- khi đổi số dòng thì tải lại dữ liệu theo limit mới

## Scope

Bao gồm:

- cập nhật UI cuối bảng để thêm ô chọn số dòng
- thay `limit` hard-code bằng state client
- truyền `limit` mới vào API list hiện có
- reset về trang `1` khi đổi số dòng

Không bao gồm:

- lưu lựa chọn vào URL
- lưu lựa chọn qua `localStorage`
- thay đổi API contract hoặc schema dữ liệu

## Approach Options

### Option 1: State client cho `limit`

Thêm state `limit` trong `page.tsx`, mặc định `20`, rồi dùng state đó trong `fetchDrugs`, STT, và phân trang.

Ưu điểm:

- sửa ít
- khớp với kiến trúc phân trang server-side hiện tại
- không cần đổi API vì backend đã hỗ trợ `limit`

Nhược điểm:

- lựa chọn không được giữ lại sau khi tải lại trang

### Option 2: Query string `limit`

Đồng bộ `limit` vào URL để chia sẻ hoặc reload vẫn giữ nguyên số dòng.

Ưu điểm:

- trạng thái rõ ràng hơn

Nhược điểm:

- phức tạp hơn nhu cầu hiện tại

### Recommendation

Chọn Option 1. Đây là thay đổi nhỏ, đúng yêu cầu, và ít rủi ro nhất.

## UI Design

File tác động chính: `src/app/dashboard/admin/master-drugs/page.tsx`

- thêm một `Select` với nhãn `Hiển thị`
- đặt ở góc trái cuối bảng, cùng hàng với cụm `Trang {page} / {totalPages}`
- mỗi lựa chọn hiển thị theo dạng `20 dòng`, `50 dòng`, `100 dòng`
- mặc định chọn `20 dòng`

## Data Flow

- thay hằng `limit = 20` bằng state `limit`
- `fetchDrugs` nhận thêm tham số `currentLimit`
- `useEffect` theo dõi thêm `limit`
- khi đổi `limit`, gọi `setPage(1)` trước và cập nhật state `limit`
- request list tiếp tục gửi `page`, `search`, `searchField`, `mappingStatus`, và `limit`

## Compatibility

- giữ nguyên logic tìm kiếm
- giữ nguyên logic lọc trạng thái ánh xạ
- giữ nguyên cách tính STT, nhưng dùng `limit` động
- không cần đổi `src/app/api/admin/master-drugs/route.ts` vì endpoint đã đọc `limit` từ query

## Error Handling

- nếu API lỗi, tiếp tục dùng luồng toast lỗi hiện có
- nếu người dùng đang ở trang lớn rồi đổi `limit`, UI sẽ reset về trang `1` để tránh trạng thái trang không hợp lệ

## Testing Plan

Kiểm tra thủ công:

1. Vào `/dashboard/admin/master-drugs`, xác nhận mặc định là `20 dòng`.
2. Đổi sang `50 dòng`, xác nhận danh sách tải lại và thanh phân trang cập nhật đúng.
3. Đổi sang `100 dòng`, xác nhận STT tiếp tục tính đúng theo trang.
4. Tìm kiếm sau khi đổi số dòng, xác nhận kết quả vẫn đúng và không lệch phân trang.
5. Đổi trạng thái ánh xạ sau khi đổi số dòng, xác nhận vẫn reset và tải dữ liệu đúng.
