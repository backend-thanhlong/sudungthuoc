# Facility Reports Detail Table Design

## Context

Trang `/dashboard/facility/reports` hiện có bảng `Lịch sử báo cáo` với thao tác `Xem chi tiết`.

Modal chi tiết hiện chỉ hiển thị một bảng rút gọn, trong khi dữ liệu thực tế của báo cáo đã có thêm nhiều trường liên quan đến:

- thuốc nội bộ của cơ sở
- danh mục thuốc chung
- số liệu báo cáo tồn kho
- thông tin hợp đồng
- cờ `BHYT` và `Dịch vụ`

Điều này làm người dùng phải đối chiếu thiếu thông tin khi kiểm tra lại báo cáo đã nộp. Trong khi đó, màn `/dashboard/admin/reports` đã có modal chi tiết đầy đủ hơn và phù hợp để dùng làm pattern tham chiếu.

## Goal

Nâng cấp modal `Xem chi tiết` ở trang facility để:

- hiển thị đầy đủ dữ liệu báo cáo theo dạng bảng rộng
- hỗ trợ tìm kiếm trong modal
- hỗ trợ phân trang server-side để vẫn dùng tốt khi số dòng lớn
- giữ trải nghiệm gần nhất với modal detail ở màn admin

## Scope

Bao gồm:

- mở rộng API `/api/facility/reports/detail`
- nâng cấp modal detail trong `src/app/dashboard/facility/reports/page.tsx`
- thêm tìm kiếm theo trường và phân trang trong modal
- hiển thị đầy đủ nhóm cột dữ liệu báo cáo

Không bao gồm:

- thay đổi luồng tải mẫu báo cáo
- thay đổi luồng preview file Excel
- thay đổi luồng nộp báo cáo
- thay đổi danh sách `Lịch sử báo cáo`
- refactor dùng chung component detail giữa `admin` và `facility`

## Approach Options

### Option 1: Mở rộng modal facility theo pattern admin

Mở rộng API detail của facility để trả về dữ liệu gần giống admin, sau đó nâng cấp modal hiện tại với bảng đầy đủ cột, tìm kiếm và phân trang server-side.

Ưu điểm:

- bám sát pattern đã có trong hệ thống
- rủi ro thấp nhất
- phù hợp với dữ liệu lớn
- người dùng facility và admin có trải nghiệm gần nhau

Nhược điểm:

- sẽ lặp lại một phần cấu trúc UI và mapping dữ liệu

### Option 2: Tách bảng detail thành component dùng chung

Tạo shared component để cả `admin` và `facility` dùng chung.

Ưu điểm:

- giảm lặp code về lâu dài
- chuẩn hóa hiển thị detail giữa hai màn

Nhược điểm:

- mở rộng phạm vi thay đổi
- tăng rủi ro ảnh hưởng tới màn admin
- không cần thiết cho nhu cầu hiện tại

### Option 3: Tải toàn bộ dữ liệu và xử lý ở client

Giữ API đơn giản, client tải toàn bộ dữ liệu rồi tự tìm kiếm và phân trang.

Ưu điểm:

- có thể làm nhanh trong ngắn hạn

Nhược điểm:

- không phù hợp khi báo cáo có nhiều dòng
- modal dễ nặng và chậm
- lệch pattern với màn admin

### Recommendation

Chọn Option 1.

Đây là cách giữ phạm vi thay đổi gọn, tận dụng pattern đã chứng minh được ở màn admin, đồng thời đáp ứng đúng yêu cầu hiển thị đầy đủ dữ liệu khi người dùng bấm `Xem`.

## API Design

File tác động: `src/app/api/facility/reports/detail/route.ts`

### Request params

API tiếp tục nhận:

- `month`

Thêm mới:

- `page`
- `limit`
- `searchField`
- `searchTerm`

Quy ước:

- `page` mặc định là `1`
- `limit` mặc định là `50`
- `searchField=all` để tìm trên toàn bộ trường hỗ trợ
- chỉ áp dụng filter tìm kiếm khi `searchTerm.trim()` có giá trị

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

### Query behavior

Luôn filter theo:

- `facilityId` từ session
- `reportMonth` từ query param `month`

Nếu có `searchTerm`:

- `searchField=all`: thêm mảng `OR` cho toàn bộ field được hỗ trợ
- `searchField=<field>`: thêm filter đúng field tương ứng

Search dùng `contains` với `mode: "insensitive"` để không phân biệt hoa thường.

### Response shape

Route sẽ đổi từ trả về mảng thuần sang object có phân trang:

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

### Detail row fields

`items` sẽ trả về gần đầy đủ các trường đang dùng ở modal admin:

- thuốc nội bộ:
  - `maNoiBo`
  - `tenThuocNoiBo`
  - `hoatChatNoiBo`
  - `soDangKyNoiBo`
  - `donViTinhNoiBo`
- danh mục chung:
  - `maChung`
  - `maBhyt`
  - `tenThuoc`
  - `hoatChat`
  - `hamLuong`
  - `dangBaoChe`
  - `soDangKy`
  - `donViTinh`
  - `quyCach`
  - `duongDung`
  - `congTySanXuat`
  - `nuocSanXuat`
  - `congTyDangKy`
  - `nhomThuoc`
- số liệu báo cáo:
  - `tonDau`
  - `nhap`
  - `xuat`
  - `tonCuoi`
  - `giaVat`
  - `thanhTienTonCuoi`
- thông tin hợp đồng:
  - `soQdTrungThau`
  - `tenCongTy`
  - `ngayBatDauHd`
  - `ngayKetThucHd`
  - `bhyt`
  - `dichVu`

## UI Design

File tác động: `src/app/dashboard/facility/reports/page.tsx`

### Modal layout

Modal `Xem chi tiết` sẽ được nâng cấp theo bố cục rộng, gần giống modal detail ở màn admin:

- chiều rộng khoảng `95vw`
- chiều cao khoảng `90vh`
- header hiển thị tháng báo cáo và tổng số dòng
- vùng nội dung có thanh tìm kiếm, bảng dữ liệu, và footer phân trang

### Table structure

Bảng detail hiển thị đầy đủ dữ liệu, chia nhóm cột bằng nền màu nhạt để tăng khả năng đọc:

- nhóm thuốc nội bộ
- nhóm danh mục chung
- nhóm số liệu báo cáo
- nhóm thông tin hợp đồng

Header bảng là `sticky`, thân bảng cho phép cuộn dọc và ngang trong vùng modal.

### Search controls

Thanh tìm kiếm gồm:

- `Select` chọn trường tìm kiếm
- ô nhập từ khóa
- nút `Tìm kiếm`
- nút `Đặt lại`

Danh sách trường tìm kiếm khớp với danh sách field mà API hỗ trợ.

### New state

Client cần thêm state riêng cho modal detail:

- `detailData`
- `isDetailLoading`
- `detailPage`
- `detailTotal`
- `detailTotalPages`
- `detailSearchField`
- `detailAppliedSearchField`
- `detailSearchInput`
- `detailSearchTerm`

## Interaction Behavior

### Open modal

Khi người dùng bấm `Xem chi tiết`:

- mở modal
- reset state tìm kiếm
- reset state phân trang về trang 1
- gọi API detail mặc định cho tháng được chọn

### Search

- người dùng nhập từ khóa nhưng chưa tự động gọi API
- chỉ gọi API khi bấm `Tìm kiếm` hoặc nhấn Enter
- trước khi gọi API, client dùng `trim()` cho từ khóa
- nếu từ khóa rỗng, xử lý như bỏ lọc và tải lại dữ liệu mặc định
- sau mỗi lần áp dụng tìm kiếm, luôn quay về trang 1

### Pagination

- phân trang áp dụng trên tập dữ liệu sau khi đã tìm kiếm
- khi chuyển trang, giữ nguyên `detailAppliedSearchField` và `detailSearchTerm`
- phần đầu hoặc cuối modal hiển thị:
  - `Hiển thị X-Y / Z dòng`
  - `Trang A / B`

### Empty states

Nếu không có dữ liệu:

- chưa tìm kiếm: hiển thị `Không có dữ liệu chi tiết`
- đang có bộ lọc tìm kiếm: hiển thị `Không tìm thấy dữ liệu phù hợp`

## Error Handling

- nếu thiếu `month`, API trả `400`
- nếu session không hợp lệ hoặc không phải `FACILITY`, API trả `401`
- nếu `searchField` không hợp lệ, server fallback về `all`
- nếu `page` hoặc `limit` không hợp lệ, server chuẩn hóa về giá trị an toàn
- nếu người dùng đang ở trang lớn hơn tổng số trang sau khi lọc, server trả về trang cuối hợp lệ
- nếu fetch detail lỗi, client hiển thị toast lỗi và giữ modal mở

## Testing Plan

Kiểm tra thủ công:

1. Mở modal detail từ `Lịch sử báo cáo`, xác nhận thấy đủ nhóm cột theo thiết kế
2. Tải dữ liệu mặc định của tháng, xác nhận phân trang đúng `50` dòng mỗi trang
3. Tìm kiếm với `all`, xác nhận kết quả đúng và tổng số dòng đúng
4. Tìm kiếm theo field cụ thể như `Mã nội bộ`, `Tên thuốc`, `Tên công ty`
5. Tìm kiếm rồi chuyển trang, xác nhận bộ lọc vẫn giữ nguyên
6. Bấm `Đặt lại`, xác nhận quay về dữ liệu mặc định và về trang 1
7. Tìm với từ khóa không có kết quả, xác nhận empty state đúng
8. Đóng modal rồi mở lại, xác nhận state tìm kiếm và phân trang được reset
9. Xác nhận các phần `Tải mẫu báo cáo`, `Preview dữ liệu`, `Nộp báo cáo`, và `Lịch sử báo cáo` không bị ảnh hưởng

## Risks

- Route facility detail hiện đang có contract đơn giản; khi đổi sang `{ items, pagination }`, client phải cập nhật đồng bộ ngay trong cùng thay đổi
- Query Prisma lồng qua `drugMap` và `masterDrug` cần bám đúng pattern đã dùng ở route admin để tránh sai filter
- Nếu UI dùng nhầm `detailSearchInput` thay vì `detailSearchTerm` khi đổi trang, dữ liệu có thể lệch với bộ lọc đã áp dụng

## Implementation Notes

- ưu tiên bám sát logic của `src/app/api/admin/reports/detail/route.ts`
- ưu tiên bám sát cấu trúc render của modal detail ở `src/app/dashboard/admin/reports/page.tsx`
- chỉ giữ phần `Dữ liệu báo cáo`, không cần thêm tab `Lịch sử duyệt` cho facility
- không thực hiện refactor shared component trong thay đổi này
