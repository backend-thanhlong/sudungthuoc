# Admin Reports Detail Pagination Design

## Context

Trang `/dashboard/admin/reports` có modal `Xem` để hiển thị chi tiết dữ liệu báo cáo của một cơ sở theo tháng. Hiện tại modal gọi API `/api/admin/reports/detail` và tải toàn bộ dữ liệu trong một lần, sau đó render tất cả dòng vào bảng.

Với các báo cáo có số lượng dòng lớn, cách làm này gây tăng thời gian phản hồi, tiêu tốn bộ nhớ không cần thiết và làm modal nặng khi render.

## Goal

Chuyển modal `Xem` sang phân trang server-side với kích thước mặc định 50 dòng mỗi trang, giữ nguyên cấu trúc bảng và hành vi nghiệp vụ hiện có.

## Scope

Bao gồm:

- Cập nhật API `/api/admin/reports/detail` để hỗ trợ `page` và `limit`
- Cập nhật UI modal `Xem` ở trang admin reports để tải dữ liệu theo trang
- Hiển thị điều hướng phân trang trong tab `Dữ liệu báo cáo`

Không bao gồm:

- Thay đổi tab `Lịch sử duyệt`
- Thay đổi layout cột của bảng chi tiết
- Thêm lọc, tìm kiếm, sắp xếp mới trong modal
- Cập nhật màn hình facility reports

## Approach Options

### Option 1: Client-side pagination after full fetch

Giữ API hiện tại, tải toàn bộ dữ liệu rồi cắt 50 dòng mỗi trang ở client.

Ưu điểm:

- Ít sửa code
- Không cần thay đổi API

Nhược điểm:

- Không giải quyết vấn đề tải dữ liệu lớn
- Vẫn render và giữ toàn bộ dataset trên client

### Option 2: Server-side pagination on detail API

API chỉ trả về 50 dòng của trang hiện tại cùng metadata phân trang. UI modal gọi lại API khi đổi trang.

Ưu điểm:

- Giảm dữ liệu tải mỗi lần
- Giảm chi phí render trong modal
- Phù hợp với dữ liệu lớn

Nhược điểm:

- Cần sửa cả API và UI

### Option 3: Virtualized table

Giữ tải dữ liệu lớn nhưng dùng virtualization để giới hạn số dòng render cùng lúc.

Ưu điểm:

- Cải thiện render

Nhược điểm:

- Không giảm dữ liệu tải từ server
- Tăng độ phức tạp không cần thiết cho bài toán hiện tại

### Recommendation

Chọn Option 2. Đây là cách duy nhất xử lý đúng yêu cầu dữ liệu lớn mà vẫn giữ thay đổi gọn, dễ kiểm soát và đồng nhất với pattern phân trang hiện có trong codebase admin.

## API Design

File tác động: `src/app/api/admin/reports/detail/route.ts`

### Request

API tiếp tục nhận:

- `facilityId`
- `month`

Thêm mới:

- `page`: số trang hiện tại, mặc định `1`
- `limit`: số dòng mỗi trang, mặc định `50`

### Validation

- Nếu thiếu `facilityId` hoặc `month` thì trả `400`
- Nếu `page` hoặc `limit` không hợp lệ thì fallback về `1` và `50`
- Không cho giá trị nhỏ hơn `1`

### Query strategy

Thay vì `findMany` toàn bộ:

1. `count()` tổng số bản ghi theo `facilityId` và `reportMonth`
2. `findMany()` với:
   - `skip = (page - 1) * limit`
   - `take = limit`
   - `include.drugMap.include.masterDrug = true`
   - `orderBy.drugMap.tenThuocNoiBo = asc`

### Response shape

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

`items` giữ nguyên schema từng dòng hiện có để tránh phải sửa bảng ngoài phần đọc response.

## UI Design

File tác động: `src/app/dashboard/admin/reports/page.tsx`

### State changes

Thêm state riêng cho phân trang của detail modal:

- `detailPage`
- `detailTotal`
- `detailTotalPages`
- hằng số `DETAIL_PAGE_SIZE = 50`

`detailData` tiếp tục chứa dữ liệu của trang hiện tại.

### Fetch behavior

Khi mở modal `Xem`:

1. set báo cáo được chọn
2. reset `detailPage = 1`
3. fetch detail page 1 với `limit=50`
4. fetch review log như hiện tại

Khi người dùng chuyển trang:

- chỉ gọi lại API detail với `page` mới
- không gọi lại review log

### Rendering behavior

Tab `Dữ liệu báo cáo` vẫn dùng bảng hiện tại. Thay đổi duy nhất là:

- render `detailData` từ `items`
- STT tính theo offset toàn cục:
  - công thức: `(detailPage - 1) * DETAIL_PAGE_SIZE + index + 1`

### Pagination controls

Hiển thị điều hướng phân trang trong tab `Dữ liệu báo cáo`:

- nút `Trước`
- nút `Sau`
- thông tin `Trang X / Y`
- thông tin `Hiển thị A-B / total dòng`

Hành vi:

- disable `Trước` ở trang đầu
- disable `Sau` ở trang cuối
- disable cả hai khi đang loading
- có thể ẩn cụm phân trang nếu `detailTotalPages <= 1`

## Error Handling

- Nếu fetch detail lỗi, giữ toast lỗi hiện tại
- Nếu API trả thành công nhưng không có dữ liệu, bảng hiển thị trạng thái rỗng như trang đầu tiên
- Nếu người dùng đổi sang trang vượt quá tổng trang do dữ liệu thay đổi giữa chừng, UI sẽ dùng metadata mới từ server để hiển thị đúng trang hợp lệ

## Testing Plan

Kiểm tra thủ công:

1. Mở modal của báo cáo có dưới 50 dòng, xác nhận không hiện lỗi và dữ liệu đúng
2. Mở modal của báo cáo có trên 50 dòng, xác nhận trang 1 chỉ có 50 dòng
3. Bấm `Sau`, xác nhận API gọi trang mới và STT tiếp tục đúng từ 51
4. Bấm `Trước`, xác nhận quay lại dữ liệu cũ
5. Xác nhận tab `Lịch sử duyệt` vẫn hoạt động như trước
6. Xác nhận đổi sang báo cáo khác sẽ reset modal về trang 1

## Risks

- Prisma `orderBy` trên quan hệ lồng nhau cần giữ đúng cú pháp hiện tại để tránh thay đổi thứ tự dữ liệu
- Nếu UI không tách fetch detail và fetch review log rõ ràng, chuyển trang có thể vô tình tải lại review log gây chậm không cần thiết

## Implementation Notes

- Giữ thay đổi hẹp trong đúng 2 file để giảm rủi ro hồi quy
- Không đổi contract của API facility detail trong đợt này
