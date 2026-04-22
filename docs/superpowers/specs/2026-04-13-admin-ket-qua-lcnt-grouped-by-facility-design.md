# Admin Ket Qua LCNT Grouped By Facility Design

## Context

Trang `/dashboard/admin/mua-sam/ket-qua-lcnt` hiện hiển thị danh sách phẳng các kết quả LCNT và lọc cơ sở ở client. Khi dữ liệu tăng, cách này khó theo dõi theo từng cơ sở và không phù hợp với nhu cầu xem tổng hợp như trang `Quản lý KH LCNT`.

## Goal

Thiết kế lại trang admin `Kết quả LCNT` theo mô hình:

- nhóm theo `tên cơ sở`
- có thể bung ra xem từng `KQLCNT` của cơ sở
- phân trang server-side theo số cơ sở
- sắp cơ sở theo `ngày phê duyệt KQLCNT gần nhất` giảm dần

## Recommendation

Áp dụng cùng pattern với `/dashboard/admin/mua-sam/lap-ke-hoach-lcnt`, nhưng đổi logic tổng hợp cho phù hợp dữ liệu `Kết quả LCNT`.

Lý do:

- người dùng xem theo đơn vị sẽ dễ đọc hơn nhiều so với bảng phẳng
- giảm số dòng ngoài bảng, phù hợp với dữ liệu lớn
- nhất quán UX với màn hình admin mua sắm đã có
- server-side pagination giải quyết luôn vấn đề hiệu năng và khả năng mở rộng

## Current State

File hiện tại:

- `src/app/dashboard/admin/mua-sam/ket-qua-lcnt/page.tsx`
- `src/app/api/admin/ket-qua-lcnt/route.ts`
- `src/app/api/admin/ket-qua-lcnt/[id]/route.ts`

Hiện trạng:

- API trả danh sách phẳng tất cả `KetQuaLCNT`
- client mới lọc theo `facilityId`
- không có tìm kiếm
- không có grouping
- không có pagination

## Proposed API

File chính: `src/app/api/admin/ket-qua-lcnt/route.ts`

Hỗ trợ query params:

- `page`
- `limit` mặc định `10`
- `searchTerm`
- `facilityId`

### Filtering

Backend lọc trước trên các trường:

- `facilityName`
- `maKHLCNT`
- `tenGoiThau`
- `maTBMT`
- `soQdPheDuyetKQLCNT`

### Grouping

Sau bước lọc, backend nhóm theo `facilityId`.

Mỗi nhóm trả về:

- `facilityId`
- `facilityName`
- `results`
- `resultCount`
- `totalMatHangTrungThau`
- `tongGiaTriTrungThau`
- `latestApprovedAt`
- `latestCreatedAt`

### Sorting

Nhóm cơ sở được sắp theo:

1. `latestApprovedAt` giảm dần
2. nếu thiếu hoặc bằng nhau, fallback theo `latestCreatedAt` giảm dần

Danh sách `results` bên trong mỗi cơ sở cũng sắp giảm dần theo:

1. `ngayPheDuyetKQLCNT`
2. fallback `createdAt`

### Pagination

Phân trang server-side theo số nhóm cơ sở, không theo số dòng kết quả thô.

Metadata trả về:

- `page`
- `limit`
- `total`
- `totalPages`
- `summary`
- `facilities`

`summary` gồm:

- `totalResults`
- `totalFacilities`
- `totalMatHangTrungThau`
- `tongGiaTriTrungThau`

## Proposed UI

File chính: `src/app/dashboard/admin/mua-sam/ket-qua-lcnt/page.tsx`

### Filter bar

Giữ dropdown cơ sở và bổ sung:

- ô tìm kiếm tổng quát
- nút `Xóa bộ lọc`
- nút `Làm mới`

### Summary cards

Tiếp tục giữ 4 card hiện tại, nhưng dùng dữ liệu từ backend thay vì tự tính ở client.

### Outer table

Đổi từ bảng phẳng sang bảng nhóm theo cơ sở, mỗi dòng ngoài hiển thị:

- `STT`
- `Cơ sở`
- `Số KQLCNT`
- `Tổng MH trúng thầu`
- `Tổng giá trị trúng thầu`
- `Ngày phê duyệt gần nhất`
- `Thao tác`

`Thao tác` dùng nút `Mở/Thu gọn`.

### Inner table

Khi bung một cơ sở, bảng con hiển thị từng `KQLCNT` của cơ sở đó:

- `Mã KHLCNT`
- `Tên gói thầu`
- `Mã TBMT`
- `Số QĐ phê duyệt`
- `Ngày phê duyệt`
- `MH mời thầu`
- `MH trúng thầu`
- `Giá trị trúng thầu`
- `Thao tác`

Trong `Thao tác` giữ nguyên:

- `Chi tiết`
- `Xóa`

### Expansion behavior

- nếu `facilityId = all`, mặc định tất cả nhóm đang thu gọn
- nếu lọc đúng một cơ sở, tự động bung cơ sở đó

### Pagination controls

Đặt cuối bảng, cùng pattern với trang `KH LCNT`:

- `Hiển thị x-y / total dòng`
- `Trang a / b`
- nút `Trước`
- nút `Sau`

## Compatibility

- API detail `/api/admin/ket-qua-lcnt/[id]` giữ nguyên
- API delete `/api/admin/ket-qua-lcnt/[id]` giữ nguyên
- modal chi tiết hiện tại giữ nguyên
- chỉ thay đổi nguồn dữ liệu bảng danh sách

## Risks

### Group-level pagination

Nếu phân trang theo kết quả thô rồi mới nhóm ở client, một cơ sở có thể bị tách qua nhiều trang. Thiết kế này tránh rủi ro đó bằng cách phân trang theo cơ sở ngay từ backend.

### Sorting ambiguity

Một số bản ghi có thể thiếu `ngayPheDuyetKQLCNT`. Thiết kế đã quy định fallback sang `createdAt` để thứ tự luôn ổn định.

### Summary semantics

Summary cần phản ánh tập dữ liệu sau bộ lọc nhưng trước phân trang, để người dùng thấy tổng thể đúng với điều kiện đang xem.

## Testing Plan

1. Mở `/dashboard/admin/mua-sam/ket-qua-lcnt`, xác nhận mỗi trang tối đa `10` cơ sở.
2. Kiểm tra cơ sở có `ngày phê duyệt gần nhất` mới hơn nằm trên trước.
3. Bung một cơ sở, xác nhận thấy đầy đủ các `KQLCNT` của cơ sở đó.
4. Tìm theo `mã TBMT`, xác nhận cơ sở liên quan vẫn được nhóm đúng.
5. Lọc theo một cơ sở, xác nhận cơ sở đó tự bung ra.
6. Xóa một `KQLCNT`, xác nhận dữ liệu reload đúng và summary cập nhật đúng.
