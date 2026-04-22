# Admin Mua Sam LCNT Grouped Pagination Design

## Context

Trang `/dashboard/admin/mua-sam/lap-ke-hoach-lcnt` hiện tải toàn bộ `KHLCNT` của tất cả đơn vị rồi mới lọc, nhóm, và hiển thị ở client. Khi dữ liệu lớn, cách này làm request nặng và render chậm. Người dùng cần phân trang 10 dòng theo đúng hàng cấp ngoài đang hiển thị, tức là theo `đơn vị` đã được nhóm trong từng tab.

## Goal

Chuyển trang admin quản lý kế hoạch LCNT sang phân trang server-side với các yêu cầu:

- mỗi trang hiển thị `10` đơn vị
- phân trang áp dụng cho cả `quyTrinh1` và `quyTrinh2`
- mỗi dòng cấp ngoài tương ứng đúng một đơn vị đã được nhóm
- khi mở rộng một đơn vị, vẫn hiển thị đầy đủ các `KHLCNT` đang khớp bộ lọc của đơn vị đó
- giữ nguyên hành vi tìm kiếm và lọc hiện có

## Recommendation

Phân trang server-side theo `đơn vị đã được nhóm` sau bước lọc `KHLCNT`.

Lý do:

- đúng với UI hiện tại vì mỗi dòng ngoài là một đơn vị
- tránh tách một đơn vị sang nhiều trang
- giữ cho số dòng hiển thị luôn đúng `10`
- ít rủi ro hành vi hơn so với phân trang theo `KHLCNT` thô rồi nhóm ở client

## API Design

File tác động chính: `src/app/api/admin/ke-hoach-lcnt/route.ts`

- hỗ trợ query params:
  - `tab`: `quyTrinh1` hoặc `quyTrinh2`
  - `page`
  - `limit` mặc định `10`
  - `searchTerm`
  - `facilityId`
- backend lọc `KHLCNT` theo `tab`, `searchTerm`, và `facilityId`
- sau khi lọc, backend nhóm theo `facilityId`
- thứ tự nhóm dựa trên `createdAt` mới nhất trong nhóm, giảm dần
- backend chỉ trả về `10` nhóm của trang hiện tại
- mỗi nhóm trả về:
  - thông tin đơn vị
  - danh sách `KHLCNT` đã được lọc của đơn vị đó
  - các chỉ số tổng hợp đang cần cho bảng ngoài
- metadata trả về:
  - `page`
  - `limit`
  - `total`
  - `totalPages`
  - `summary` toàn cục cho các card đầu trang
  - `facilities` cho dropdown lọc đơn vị

## Client Design

File tác động chính: `src/app/dashboard/admin/mua-sam/lap-ke-hoach-lcnt/page.tsx`

- bỏ luồng tải toàn bộ dữ liệu rồi lọc ở client
- gọi API mới theo `tab` đang active
- giữ state phân trang riêng cho từng tab
- reset trang về `1` khi:
  - đổi từ khóa tìm kiếm
  - đổi đơn vị lọc
- giữ `pageSize` cố định là `10`
- thêm cụm điều khiển cuối bảng:
  - `Hiển thị x-y / total dòng`
  - `Trang a / b`
  - nút `Trước`
  - nút `Sau`
- STT bảng ngoài tính theo trang hiện tại

## Behavior Notes

- tìm kiếm tiếp tục áp dụng trên:
  - `maKHLCNT`
  - `tenKHLCNT`
  - `facilityName`
  - `facilityCode`
- khi tìm theo mã hoặc tên kế hoạch, nhóm đơn vị chỉ chứa các `KHLCNT` khớp từ khóa, giống hành vi hiện tại
- khi tìm theo tên hoặc mã đơn vị, toàn bộ `KHLCNT` của đơn vị đó trong tab sẽ khớp, giống hành vi hiện tại

## Testing Plan

Kiểm tra thủ công:

1. Vào tab `Quy trình 1`, xác nhận mỗi trang có tối đa `10` đơn vị.
2. Chuyển sang `Quy trình 2`, xác nhận tab này cũng phân trang độc lập `10` đơn vị.
3. Bấm `Mở` ở một đơn vị có nhiều `KHLCNT`, xác nhận danh sách chi tiết vẫn đầy đủ.
4. Tìm theo mã/tên `KHLCNT`, xác nhận nhóm đơn vị và số dòng thay đổi đúng.
5. Lọc theo đơn vị, xác nhận kết quả reset về trang `1` và chỉ còn dữ liệu của đơn vị đó.
6. Xóa một `KHLCNT`, xác nhận danh sách tải lại đúng với trang hiện tại.
