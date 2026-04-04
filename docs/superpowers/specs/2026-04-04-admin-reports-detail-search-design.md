# Admin Reports Detail Search Design

## Context

Trang `/dashboard/admin/reports` có modal `Xem` để hiển thị chi tiết dữ liệu báo cáo theo từng cơ sở và tháng. Modal này hiện đã hỗ trợ phân trang server-side 50 dòng mỗi trang thông qua API `/api/admin/reports/detail`.

Người dùng hiện chưa thể tìm kiếm trong modal. Khi dữ liệu lớn, việc phải lật nhiều trang để tìm một thuốc hoặc một mã cụ thể gây chậm và khó dùng.

## Goal

Thêm chức năng tìm kiếm trong modal `Xem`, cho phép người dùng:

- nhập từ khóa
- chọn tìm trên `Tất cả` trường hỗ trợ hoặc 1 trường cụ thể
- chỉ kích hoạt tìm khi bấm nút `Tìm kiếm` hoặc nhấn Enter
- tìm trên toàn bộ dữ liệu của báo cáo ở server, sau đó mới phân trang kết quả

## Scope

Bao gồm:

- mở rộng API `/api/admin/reports/detail` để hỗ trợ tìm kiếm server-side
- thêm UI tìm kiếm trong tab `Dữ liệu báo cáo`
- kết hợp tìm kiếm với phân trang hiện có

Không bao gồm:

- thay đổi tab `Lịch sử duyệt`
- thêm debounce hoặc tìm ngay khi nhập
- hỗ trợ tìm nhiều trường cùng lúc ngoài chế độ `all`
- thay đổi facility-side detail API

## Approach Options

### Option 1: Mở rộng API detail hiện tại

Thêm `searchField` và `searchTerm` vào chính API `/api/admin/reports/detail`, để route hiện tại xử lý cả tìm kiếm và phân trang.

Ưu điểm:

- thay đổi gọn
- không nhân đôi logic query, mapping, pagination
- đồng bộ với modal đang dùng cùng một nguồn dữ liệu

Nhược điểm:

- route detail sẽ gánh thêm logic tìm kiếm

### Option 2: Tạo route search riêng cho modal

Tạo endpoint mới chỉ để tìm kiếm chi tiết báo cáo.

Ưu điểm:

- tách route theo chức năng

Nhược điểm:

- trùng logic với route detail hiện tại
- tăng chi phí bảo trì

### Option 3: Tìm kiếm ở client

Tải toàn bộ dữ liệu rồi tìm trong browser.

Ưu điểm:

- trải nghiệm sau lần tải đầu có thể nhanh

Nhược điểm:

- trái với yêu cầu tìm trên dữ liệu lớn
- phá vỡ định hướng server-side pagination

### Recommendation

Chọn Option 1. Đây là cách phù hợp nhất với cấu trúc hiện có và giữ thay đổi trong đúng 2 file chính.

## API Design

File tác động: `src/app/api/admin/reports/detail/route.ts`

### Request params

API tiếp tục nhận:

- `facilityId`
- `month`
- `page`
- `limit`

Thêm mới:

- `searchField`
- `searchTerm`

Quy ước:

- `searchField=all` để tìm trên tất cả các trường hỗ trợ
- `searchField=<fieldName>` để tìm trên 1 trường cụ thể
- chỉ áp dụng filter khi `searchTerm.trim()` có giá trị

### Supported search fields

- `all`
- `maNoiBo`
- `tenThuocNoiBo`
- `hoatChatNoiBo`
- `soDangKyNoiBo`
- `maChung`
- `maBhyt`
- `tenThuoc`
- `hoatChat`
- `soDangKy`
- `soQdTrungThau`
- `tenCongTy`

### Query mapping

Các field được map theo nguồn dữ liệu:

- `inventoryReport`: `soQdTrungThau`, `tenCongTy`
- `drugMap`: `maNoiBo`, `tenThuocNoiBo`, `hoatChatNoiBo`, `soDangKyNoiBo`
- `drugMap.masterDrug`: `maChung`, `maBhyt`, `tenThuoc`, `hoatChat`, `soDangKy`

### Query behavior

Luôn filter cơ bản theo:

- `facilityId`
- `reportMonth`

Nếu có `searchTerm`:

- `searchField=all`: thêm mảng `OR` cho toàn bộ field hỗ trợ
- `searchField=<fieldName>`: thêm đúng điều kiện cho field được chọn

Tìm kiếm dùng `contains` với `mode: "insensitive"` để không phân biệt hoa thường.

### Response shape

Giữ nguyên contract hiện tại:

```json
{
  "items": [],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 0,
    "totalPages": 1
  }
}
```

`total` và `totalPages` sẽ phản ánh trên tập dữ liệu sau khi đã lọc tìm kiếm.

## UI Design

File tác động: `src/app/dashboard/admin/reports/page.tsx`

### New state

Thêm state cho modal detail:

- `detailSearchField`, mặc định `all`
- `detailSearchInput`, giá trị người dùng đang nhập
- `detailSearchTerm`, giá trị đã xác nhận để gửi API

### Search controls

Thêm khu vực tìm kiếm ở đầu tab `Dữ liệu báo cáo` gồm:

- một `Select` để chọn field
- một ô input nhập từ khóa
- nút `Tìm kiếm`
- nút `Đặt lại`

### Interaction behavior

- nhập text không tự gọi API
- bấm `Tìm kiếm` hoặc nhấn Enter:
  - copy `detailSearchInput.trim()` sang `detailSearchTerm`
  - reset `detailPage = 1`
  - gọi lại API
- bấm `Đặt lại`:
  - reset field về `all`
  - xóa input và searchTerm
  - reset trang về `1`
  - gọi lại API không có filter tìm kiếm

### Pagination integration

- phân trang tiếp tục hoạt động trên tập kết quả đã tìm
- đổi trang giữ nguyên `detailSearchField` và `detailSearchTerm`
- khi mở modal khác hoặc đóng modal:
  - reset tìm kiếm
  - reset trang

### Empty state

Nếu không có kết quả:

- vẫn giữ khu vực tìm kiếm hiển thị
- hiển thị thông báo không có dữ liệu phù hợp với từ khóa

## Error Handling

- nếu API detail lỗi trong lúc tìm kiếm, giữ toast lỗi hiện tại
- nếu người dùng bấm `Tìm kiếm` với ô rỗng, xem như bỏ lọc và tải lại dữ liệu mặc định
- nếu field gửi lên không hợp lệ, server fallback về `all`

## Testing Plan

Kiểm tra thủ công:

1. Mở modal và tìm với `Tất cả`, xác nhận kết quả đúng và phân trang đúng
2. Chọn 1 field cụ thể như `Mã nội bộ`, xác nhận chỉ lọc theo field đó
3. Nhấn Enter trong ô tìm kiếm, xác nhận chạy giống nút `Tìm kiếm`
4. Tìm với từ khóa không có kết quả, xác nhận empty state đúng
5. Tìm kiếm rồi chuyển trang, xác nhận filter vẫn giữ nguyên
6. Bấm `Đặt lại`, xác nhận dữ liệu quay lại toàn bộ và về trang 1
7. Mở một báo cáo khác, xác nhận search state được reset

## Risks

- Prisma `where` lồng nhau qua `drugMap` và `masterDrug` cần được xây đúng cấu trúc để tránh sai query
- nếu UI dùng `detailSearchInput` thay cho `detailSearchTerm` khi đổi trang, dữ liệu có thể lệch so với trạng thái đã xác nhận tìm

## Implementation Notes

- giữ thay đổi tập trung trong 2 file hiện có
- không đổi response schema để tránh ảnh hưởng phần render bảng hiện tại
