# Admin Thong Bao Moi Thau Grouped By Facility Design

## Context

Trang `/dashboard/admin/mua-sam/thong-bao-moi-thau` hiện hiển thị danh sách phẳng tất cả `TBMT`, sau đó mới lọc và tìm kiếm ở client. Cách này không đồng nhất với các màn admin mua sắm đã chuyển sang mô hình nhóm theo đơn vị như `Quản lý KHLCNT` và `Kết quả LCNT`, đồng thời sẽ nặng dần khi dữ liệu tăng.

## Goal

Thiết kế lại màn admin `Thông báo mời thầu` theo mô hình:

- nhóm theo `đơn vị`
- có thể bung ra xem từng `TBMT` của đơn vị
- phân trang server-side theo số `đơn vị`
- API trả dữ liệu đã group sẵn cùng `summary` và `facilities`
- giữ dialog chi tiết hiện tại

## Recommendation

Áp dụng cùng pattern với `/dashboard/admin/mua-sam/lap-ke-hoach-lcnt` và `/dashboard/admin/mua-sam/ket-qua-lcnt`:

- backend lọc trước, rồi nhóm theo `facilityId`
- summary phản ánh tập dữ liệu sau filter nhưng trước pagination
- frontend chỉ render grouped table, filter bar, pagination, và dialog chi tiết

Lý do:

- đồng nhất UX với các màn admin mua sắm đã có
- tránh tách một đơn vị sang nhiều trang
- giảm khối lượng dữ liệu và xử lý ở client
- giữ semantics filter, summary, và bảng nhất quán

## Current State

File hiện tại:

- `src/app/api/admin/thong-bao-moi-thau/route.ts`
- `src/app/dashboard/admin/mua-sam/thong-bao-moi-thau/page.tsx`

Hiện trạng:

- API trả toàn bộ danh sách `TBMT` phẳng
- client tự sinh dropdown đơn vị từ dữ liệu tải về
- filter, search, và tổng số kết quả đều chạy ở client
- chưa có grouping
- chưa có pagination
- dialog chi tiết đã có sẵn và đang dùng dữ liệu từ danh sách phẳng

## Proposed API

File chính: `src/app/api/admin/thong-bao-moi-thau/route.ts`

Hỗ trợ query params:

- `page`
- `limit` mặc định `10`
- `searchTerm`
- `facilityId`

### Filtering

Backend lọc trước trên các trường:

- `maTBMT`
- `tenGoiThau`
- `maKHLCNT`
- `tenKHLCNT`
- `facilityName`
- `facilityCode`

Quy ước tìm kiếm:

- khi tìm theo mã hoặc tên `TBMT`, chỉ các `TBMT` khớp mới được giữ trong group
- khi tìm theo tên hoặc mã đơn vị, toàn bộ `TBMT` của đơn vị đó trong tập lọc được trả về, giống semantics hiện có ở màn `KHLCNT`

### Grouping

Sau bước lọc, backend nhóm theo `facilityId`.

Mỗi nhóm trả về:

- `facilityId`
- `facilityName`
- `facilityCode`
- `tbmtCount`
- `totalPackages`
- `activeCount`
- `latestPublishedAt`
- `latestCreatedAt`
- `latestClosingAt`
- `tbmts`

### Sorting

Nhóm đơn vị được sắp theo:

1. `latestPublishedAt` giảm dần
2. fallback `latestCreatedAt` giảm dần
3. fallback `facilityName` tăng dần

Danh sách `tbmts` trong từng nhóm cũng sắp theo:

1. `ngayDangTai` giảm dần
2. fallback `createdAt` giảm dần

### Pagination

Phân trang server-side theo số `nhóm đơn vị`, không theo số dòng `TBMT` thô.

Metadata trả về:

- `page`
- `limit`
- `total`
- `totalPages`
- `summary`
- `facilities`

`total` là số `đơn vị` khớp bộ lọc.

### Summary

`summary` gồm:

- `totalTBMT`
- `totalFacilities`
- `totalPackages`
- `activeTBMTCount`

Quy ước:

- `totalTBMT`: tổng số `TBMT` khớp bộ lọc
- `totalFacilities`: tổng số đơn vị có `TBMT` khớp bộ lọc
- `totalPackages`: tổng số gói thầu tương ứng với tập `TBMT` khớp bộ lọc
- `activeTBMTCount`: số `TBMT` có `ngayDongThau >= now`

### Response shape

```ts
{
  data: [
    {
      facilityId: string;
      facilityName: string;
      facilityCode: string;
      tbmtCount: number;
      totalPackages: number;
      activeCount: number;
      latestPublishedAt: string | null;
      latestCreatedAt: string | null;
      latestClosingAt: string | null;
      tbmts: [
        {
          id: string;
          maTBMT: string;
          ngayDangTai: string | null;
          soQdPheDuyetHSMT: string | null;
          ngayPheDuyetHSMT: string | null;
          ngayDongThau: string | null;
          createdAt: string;
          goiThau: {
            id: string;
            tenGoiThau: string;
            giaGoiThau: number | null;
            soLuongPhanLo: number | null;
          };
          keHoach: {
            id: string;
            maKHLCNT: string | null;
            tenKHLCNT: string | null;
          };
        }
      ];
    }
  ],
  metadata: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    summary: {
      totalTBMT: number;
      totalFacilities: number;
      totalPackages: number;
      activeTBMTCount: number;
    },
    facilities: FacilityOption[];
  }
}
```

## Proposed UI

File chính: `src/app/dashboard/admin/mua-sam/thong-bao-moi-thau/page.tsx`

### Summary cards

Hiển thị 4 card lấy từ backend:

- `Tổng TBMT`
- `Đơn vị có TBMT`
- `Tổng gói thầu`
- `TBMT còn hiệu lực`

### Filter bar

Giữ dropdown đơn vị và bổ sung cụm điều khiển đồng nhất với các màn admin mới:

- ô tìm kiếm tổng quát
- dropdown `Tất cả đơn vị`
- nút `Xóa bộ lọc`
- nút `Làm mới`

### Outer table

Đổi từ bảng phẳng sang bảng nhóm theo đơn vị, mỗi dòng ngoài hiển thị:

- `STT`
- `Đơn vị`
- `Số TBMT`
- `Số gói thầu`
- `Ngày đăng tải gần nhất`
- `Trạng thái`
- `Thao tác`

`Trạng thái` nhóm:

- `Đang mở` nếu `activeCount === tbmtCount`
- `Mở một phần` nếu `0 < activeCount < tbmtCount`
- `Đã đóng thầu` nếu `activeCount === 0`

Có thể hiển thị thêm dòng mô tả phụ như `x/y TBMT còn hiệu lực`.

### Inner table

Khi bung một đơn vị, bảng con hiển thị từng `TBMT`:

- `STT`
- `Mã KHLCNT`
- `Tên KHLCNT`
- `Tên gói thầu`
- `Mã TBMT`
- `Ngày đăng tải`
- `Ngày đóng thầu`
- `Thao tác`

Trong `Thao tác` giữ:

- `Chi tiết`

### Expansion behavior

- nếu `facilityId = all`, mặc định tất cả nhóm đang thu gọn
- nếu lọc đúng một đơn vị, tự động bung đơn vị đó
- khi chuyển trang, danh sách chỉ giữ trạng thái expand phù hợp với các nhóm của trang hiện tại

### Pagination controls

Đặt cuối bảng theo cùng pattern với `KHLCNT`:

- `Hiển thị x-y / total dòng`
- `Trang a / b`
- nút `Trước`
- nút `Sau`

## Compatibility

- không thay đổi dialog chi tiết hiện tại
- không thêm nghiệp vụ xóa ở màn admin `TBMT`
- chỉ đổi nguồn dữ liệu danh sách từ phẳng sang grouped payload

## Risks

### Group-level pagination

Nếu phân trang theo `TBMT` thô rồi mới nhóm ở client, một đơn vị có thể bị tách qua nhiều trang. Thiết kế này tránh rủi ro đó bằng cách phân trang theo `facilityId` ngay từ backend.

### Summary semantics

Summary phải phản ánh tập dữ liệu sau bộ lọc nhưng trước phân trang, nếu không người dùng sẽ hiểu sai tổng thể đang xem.

### Sorting ambiguity

Một số `TBMT` có thể thiếu `ngayDangTai`. Thiết kế quy định fallback sang `createdAt` để thứ tự luôn ổn định.

### Search semantics

Khi tìm theo tên hoặc mã đơn vị, group của đơn vị đó phải trả về đầy đủ `TBMT` thuộc đơn vị trong tập lọc, không chỉ những dòng khớp chuỗi tìm kiếm cục bộ.

## Testing Plan

1. Mở `/dashboard/admin/mua-sam/thong-bao-moi-thau`, xác nhận mỗi trang tối đa `10` đơn vị.
2. Kiểm tra thứ tự đơn vị theo `ngày đăng tải gần nhất` giảm dần.
3. Bung một đơn vị có nhiều `TBMT`, xác nhận danh sách chi tiết đầy đủ.
4. Tìm theo `mã TBMT`, xác nhận nhóm đơn vị và danh sách con thay đổi đúng.
5. Tìm theo `tên/mã đơn vị`, xác nhận group của đơn vị đó vẫn chứa đầy đủ `TBMT` của đơn vị.
6. Lọc theo một đơn vị, xác nhận dữ liệu reset về trang `1` và đơn vị đó tự bung ra.
7. Nhấn `Làm mới`, xác nhận summary, filter options, và bảng cùng tải lại đúng.
8. Mở dialog chi tiết từ bảng con, xác nhận đủ thông tin đơn vị, KHLCNT, gói thầu, và TBMT.
