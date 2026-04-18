# Mua Sam Tra Cuu Goi Thau Implementation Plan

## Inputs

Plan này dựa trên:

- Spec đã chốt: [2026-04-18-mua-sam-tra-cuu-goi-thau-design.md](/opt/sudungthuoc/sudungthuoc/docs/superpowers/specs/2026-04-18-mua-sam-tra-cuu-goi-thau-design.md)
- Sidebar hiện tại: [DashboardLayout.tsx](/opt/sudungthuoc/sudungthuoc/src/components/DashboardLayout.tsx)
- Admin KHLCNT API: [route.ts](/opt/sudungthuoc/sudungthuoc/src/app/api/admin/ke-hoach-lcnt/route.ts)
- Admin TBMT API: [route.ts](/opt/sudungthuoc/sudungthuoc/src/app/api/admin/thong-bao-moi-thau/route.ts)
- Admin KQLCNT API: [route.ts](/opt/sudungthuoc/sudungthuoc/src/app/api/admin/ket-qua-lcnt/route.ts)
- Admin KHLCNT page: [page.tsx](/opt/sudungthuoc/sudungthuoc/src/app/dashboard/admin/mua-sam/lap-ke-hoach-lcnt/page.tsx)
- Admin TBMT page: [page.tsx](/opt/sudungthuoc/sudungthuoc/src/app/dashboard/admin/mua-sam/thong-bao-moi-thau/page.tsx)
- Admin KQLCNT page: [page.tsx](/opt/sudungthuoc/sudungthuoc/src/app/dashboard/admin/mua-sam/ket-qua-lcnt/page.tsx)
- Facility KHLCNT page: [page.tsx](/opt/sudungthuoc/sudungthuoc/src/app/dashboard/facility/mua-sam/lap-ke-hoach-lcnt/page.tsx)
- Facility TBMT page: [page.tsx](/opt/sudungthuoc/sudungthuoc/src/app/dashboard/facility/mua-sam/thong-bao-moi-thau/page.tsx)
- Facility KQLCNT page: [page.tsx](/opt/sudungthuoc/sudungthuoc/src/app/dashboard/facility/mua-sam/ket-qua-lcnt/page.tsx)

## Goal

Triển khai item `Tra cứu` trong menu `Tổng hợp mua sắm` cho cả `admin` và `facility`, với đặc điểm:

- một dòng đại diện cho một `gói thầu`
- chỉ lấy dữ liệu `quyTrinh = 1`
- thể hiện tiến trình `KHLCNT -> TBMT -> KQLCNT`
- hỗ trợ tìm kiếm, lọc, phân trang server-side
- có popup chi tiết với danh sách nhà thầu và chi tiết phần lô

## Delivery Principles

- Không thay đổi schema Prisma
- Không chỉnh sửa contract của các API `KHLCNT`, `TBMT`, `KQLCNT` hiện có
- Dùng chung một data layer và một aggregation layer cho admin và facility để tránh lệch logic
- Phân trang theo `gói thầu`, không theo `đơn vị`
- Chỉ hỗ trợ `quyTrinh = 1`
- Popup chi tiết dùng luôn payload từ list response, không tạo detail API ở lượt này
- Giữ rollout tập trung, tránh refactor lan sang các màn `mua-sam` không thuộc scope

## Current Constraints

- Repo đang có nhiều thay đổi chưa commit ở các file không liên quan; rollout cần giới hạn write set rõ ràng
- Các page `mua-sam` hiện tại chủ yếu là client pages lớn, tự fetch và tự render; nếu copy nguyên cấu trúc sang `Tra cứu` cho cả admin và facility sẽ dễ nhân đôi logic
- Dữ liệu quan hệ 1-n từ `GoiThau -> ThongBaoMoiThau -> KetQuaLCNT -> KetQuaPhanLo` cần quy tắc aggregate ổn định để không tạo kết quả khác nhau giữa các lần load
- Route facility phải khóa cứng `facilityId` từ session, không được tin query string

## Target File Structure

### Runtime files

- `src/components/DashboardLayout.tsx`
- `src/lib/mua-sam-procurement-lookup.ts`
- `src/components/mua-sam/ProcurementLookupPage.tsx`
- `src/app/api/admin/mua-sam/tra-cuu/route.ts`
- `src/app/api/facility/mua-sam/tra-cuu/route.ts`
- `src/app/dashboard/admin/mua-sam/tra-cuu/page.tsx`
- `src/app/dashboard/facility/mua-sam/tra-cuu/page.tsx`

### Docs

- `docs/superpowers/specs/2026-04-18-mua-sam-tra-cuu-goi-thau-design.md`
- `docs/superpowers/plans/2026-04-18-mua-sam-tra-cuu-goi-thau-implementation-plan.md`

## Phase Breakdown

## Phase 1: Extract Shared Procurement Lookup Data Layer

### Objective

Tạo một module server-side dùng chung để:

- parse query params
- build filter logic
- load page `goiThauId`
- aggregate dữ liệu `TBMT`, `KQLCNT`, `KetQuaPhanLo`
- serialize thành response item cho UI

### Tasks

1. Tạo file mới `src/lib/mua-sam-procurement-lookup.ts`
2. Định nghĩa các type shared:
   - `ProcurementLookupStatus`
   - `ProcurementLookupQuery`
   - `ProcurementLookupItem`
   - `ProcurementLookupSummary`
   - `ProcurementLookupFacilityOption`
3. Tạo helper parse query params:
   - `page`
   - `limit`
   - `searchTerm`
   - `procurementStatus`
   - `fromDate`
   - `toDate`
   - `facilityId`
4. Tạo helper normalize status filter:
   - `all`
   - `no_tbmt`
   - `has_tbmt_no_kqlcnt`
   - `has_kqlcnt`
5. Tạo helper chọn `TBMT` đại diện:
   - sort theo `ngayDangTai` giảm dần
   - fallback `createdAt` giảm dần
6. Tạo helper chọn `KQLCNT` đại diện:
   - sort theo `ngayPheDuyetKQLCNT` giảm dần
   - fallback `createdAt` giảm dần
7. Tạo helper dedupe danh sách nhà thầu:
   - trim
   - bỏ chuỗi rỗng
   - trả `string[]` duy nhất
8. Tạo helper build `procurementStatus`:
   - không có `TBMT` -> `Chưa có TBMT`
   - có `TBMT` nhưng chưa có `KQLCNT` -> `Đã có TBMT, chưa có KQLCNT`
   - có `KQLCNT` -> `Đã có KQLCNT`
9. Tạo helper serialize `loaiHopDong` từ JSON string sang `string[]`
10. Tạo helper aggregate cho một `gói thầu` thành `ProcurementLookupItem`

### Query Strategy

1. Query danh sách `goiThauId` khớp filter
2. Tính `total` và `totalPages`
3. Lấy chi tiết page hiện tại theo `goiThauId`
4. Map sang response items
5. Tính `summary` trên tập dữ liệu sau filter nhưng trước pagination

### Acceptance Criteria

- Có một module shared duy nhất định nghĩa logic aggregate cho `Tra cứu`
- Admin và facility có thể dùng cùng logic nhưng khác auth scope
- Quy tắc chọn `TBMT/KQLCNT` đại diện được cố định ở một nơi

## Phase 2: Implement Admin And Facility APIs

### Objective

Tạo hai route `Tra cứu` dùng chung shared data layer, khác nhau chủ yếu ở authz và phạm vi dữ liệu.

### Tasks

1. Tạo `src/app/api/admin/mua-sam/tra-cuu/route.ts`
2. Xác thực:
   - chỉ cho `ADMIN`
3. Parse query params:
   - `page`
   - `limit`
   - `searchTerm`
   - `procurementStatus`
   - `fromDate`
   - `toDate`
   - `facilityId`
4. Gọi shared loader với scope `admin`
5. Trả response:
   - `data`
   - `metadata.page`
   - `metadata.limit`
   - `metadata.total`
   - `metadata.totalPages`
   - `metadata.facilities`
   - `metadata.summary`
6. Tạo `src/app/api/facility/mua-sam/tra-cuu/route.ts`
7. Xác thực:
   - chỉ cho `FACILITY`
8. Lấy `facilityId` từ session
9. Bỏ qua hoặc overwrite mọi `facilityId` từ query string
10. Gọi shared loader với scope `facility`
11. Trả response cùng contract với admin

### Filtering Rules To Implement

- luôn chỉ lấy `keHoach.quyTrinh = 1`
- `searchTerm` tìm trên:
  - `facilityName`
  - `facilityCode`
  - `maKHLCNT`
  - `tenKHLCNT`
  - `tenGoiThau`
  - `maTBMT`
  - `soQdPheDuyetKQLCNT`
- `fromDate/toDate` lọc theo `keHoach.ngayPheDuyet`
- `procurementStatus` lọc theo trạng thái aggregate của `gói thầu`

### Implementation Notes

- Ưu tiên load `goiThau` làm root dataset thay vì join từ `TBMT` hay `KQLCNT`
- Nếu lọc status ở tầng SQL/Prisma quá rối, chấp nhận hai bước:
  - lọc coarse ở query
  - lọc status chính xác sau aggregate trước khi phân trang IDs
- `metadata.facilities` của route admin nên chỉ chứa đơn vị có dữ liệu trong tập `Tra cứu`

### Acceptance Criteria

- Hai route trả cùng response shape
- Route facility không thể lộ dữ liệu đơn vị khác
- `summary` luôn phản ánh tập sau filter, trước pagination

## Phase 3: Build Shared Lookup Page Component

### Objective

Tạo một component UI dùng chung cho admin và facility để tránh nhân đôi logic fetch, filter state, bảng và popup chi tiết.

### Tasks

1. Tạo `src/components/mua-sam/ProcurementLookupPage.tsx`
2. Thiết kế props tối thiểu:
   - `role: "admin" | "facility"`
   - `apiUrl`
   - `pageTitle`
   - `pageDescription`
3. Định nghĩa client types cho response item và metadata trong component hoặc cùng file shared lib nếu import được an toàn
4. Thêm state:
   - `rows`
   - `summary`
   - `facilities`
   - `loading`
   - `searchInput`
   - `appliedSearchTerm`
   - `selectedFacility`
   - `selectedStatus`
   - `fromDateInput`
   - `toDateInput`
   - `appliedFromDate`
   - `appliedToDate`
   - `page`
   - `totalPages`
   - `totalRows`
   - `selectedItem`
   - `detailOpen`
5. Implement `loadData` theo pattern các page admin `mua-sam` hiện tại:
   - request ID guard
   - build query string từ applied filters
   - update pagination metadata
6. Filter bar:
   - input `Từ khóa`
   - select `Đơn vị` chỉ khi `role = admin`
   - select `Trạng thái tiến trình`
   - input date `Từ ngày`
   - input date `Đến ngày`
   - nút `Tìm kiếm`
   - nút `Đặt lại`
7. Summary cards:
   - `Tổng gói thầu`
   - `Chưa có TBMT`
   - `Đã có TBMT, chưa có KQLCNT`
   - `Đã có KQLCNT`
8. Bảng danh sách:
   - admin có cột `Đơn vị`
   - facility ẩn cột `Đơn vị`
   - render badge cho `Trạng thái tiến trình`
   - `Thao tác` có nút `Xem chi tiết`
9. Popup chi tiết:
   - section `Thông tin đơn vị`
   - section `Thông tin KHLCNT`
   - section `Thông tin gói thầu`
   - section `Tiến trình và kết quả`
   - bảng chi tiết `phần lô`
10. Phân trang cuối bảng:
   - `Hiển thị x-y / total dòng`
   - `Trang a / b`
   - nút `Trước`
   - nút `Sau`

### UI Behavior Rules

- nhập filter không tự fetch
- chỉ fetch khi bấm `Tìm kiếm` hoặc nhấn `Enter`
- submit filter mới reset `page = 1`
- đổi trang giữ applied filters
- `Đặt lại` xóa filter và về `page = 1`
- nếu `fromDate > toDate`, chặn submit và hiển thị message lỗi nhẹ ở client
- popup detail không fetch thêm API

### Acceptance Criteria

- Có một component dùng chung cho admin và facility
- UX nhất quán giữa hai vai trò
- Không có nhân đôi logic bảng/popup thành hai file lớn độc lập

## Phase 4: Wire Admin And Facility Pages + Sidebar

### Objective

Kết nối component dùng chung vào route pages mới và cập nhật navigation.

### Tasks

1. Tạo `src/app/dashboard/admin/mua-sam/tra-cuu/page.tsx`
2. Render `ProcurementLookupPage` với:
   - `role = "admin"`
   - `apiUrl = "/api/admin/mua-sam/tra-cuu"`
   - tiêu đề và mô tả phù hợp
3. Tạo `src/app/dashboard/facility/mua-sam/tra-cuu/page.tsx`
4. Render `ProcurementLookupPage` với:
   - `role = "facility"`
   - `apiUrl = "/api/facility/mua-sam/tra-cuu"`
5. Cập nhật `src/components/DashboardLayout.tsx`
6. Thêm item `Tra cứu` vào menu `Tổng hợp mua sắm`:
   - admin: sau `Kết quả LCNT`, trước `Thống kê`
   - facility: sau `Kết quả LCNT`, trước `Thống kê`
7. Dùng icon cùng ngôn ngữ visual của các item `mua-sam` hiện có

### Acceptance Criteria

- Sidebar admin và facility đều có item `Tra cứu`
- Route mới mở được và render đúng component
- Role admin/facility dùng đúng API tương ứng

## Phase 5: Verification And Regression Checks

### Objective

Xác nhận nghiệp vụ `Tra cứu` đúng và không làm ảnh hưởng navigation hay các màn `mua-sam` khác.

### Tasks

1. Chạy `eslint` cho các file thay đổi nếu cấu hình repo cho phép
2. Kiểm tra admin:
   - mở trang `Tra cứu`
   - thấy dropdown `Đơn vị`
   - tìm kiếm theo `mã KHLCNT`
   - lọc theo `Trạng thái tiến trình`
   - lọc theo `Từ ngày/Đến ngày`
3. Kiểm tra facility:
   - mở trang `Tra cứu`
   - không thấy dropdown `Đơn vị`
   - chỉ thấy dữ liệu của chính mình
4. Kiểm tra popup:
   - gói chưa có `TBMT`
   - gói có `TBMT` nhưng chưa có `KQLCNT`
   - gói đã có `KQLCNT`
5. Kiểm tra dedupe nhà thầu:
   - một nhà thầu trúng nhiều phần lô chỉ được tính một lần
6. Kiểm tra dữ liệu nhiều phiên bản:
   - `TBMT` mới nhất được chọn đúng
   - `KQLCNT` mới nhất được chọn đúng
7. Kiểm tra pagination:
   - tìm kiếm rồi đổi trang
   - reset filter
   - `page` vượt giới hạn được backend sửa về giá trị hợp lệ
8. Kiểm tra sidebar:
   - item mới active đúng theo pathname
   - menu `Tổng hợp mua sắm` mở đúng khi đang ở route `Tra cứu`

### Manual Verification Checklist

1. Mở `/dashboard/admin/mua-sam/tra-cuu`, xác nhận chỉ thấy `gói thầu` thuộc `quyTrinh = 1`.
2. Mở `/dashboard/facility/mua-sam/tra-cuu`, xác nhận chỉ thấy dữ liệu đơn vị hiện tại.
3. Kiểm tra item `Tra cứu` xuất hiện ở sidebar admin và facility.
4. Tìm theo `mã KHLCNT`, xác nhận kết quả đúng.
5. Tìm theo `tên gói thầu`, xác nhận kết quả đúng.
6. Tìm theo `mã TBMT`, xác nhận kết quả đúng.
7. Tìm theo `số QĐ KQLCNT`, xác nhận kết quả đúng.
8. Lọc `Chưa có TBMT`, xác nhận mọi dòng đều không có dữ liệu `TBMT`.
9. Lọc `Đã có TBMT, chưa có KQLCNT`, xác nhận mọi dòng không có dữ liệu `KQLCNT`.
10. Lọc `Đã có KQLCNT`, xác nhận mọi dòng có dữ liệu kết quả.
11. Lọc theo khoảng `ngày phê duyệt KHLCNT`, xác nhận record vào/ra đúng.
12. Mở popup chi tiết của một gói chưa có `TBMT`, xác nhận section tiến trình hiển thị hợp lý.
13. Mở popup chi tiết của một gói đã có `KQLCNT`, xác nhận `Số lượng nhà thầu` bằng số nhà thầu duy nhất.
14. Kiểm tra một gói có nhiều `KetQuaPhanLo` cùng tên nhà thầu, xác nhận count không bị nhân đôi.
15. Kiểm tra một gói có nhiều `TBMT` hoặc nhiều `KQLCNT`, xác nhận UI đang dùng bản ghi mới nhất.
16. Sửa tay query `facilityId` ở route facility, xác nhận backend vẫn khóa đúng đơn vị.

## Risks And Mitigations

- Risk: Logic aggregate giữa admin và facility bị lệch
  - Mitigation: đặt toàn bộ parse/filter/aggregate trong `src/lib/mua-sam-procurement-lookup.ts`
- Risk: Query status filter khó biểu diễn hoàn toàn ở tầng database
  - Mitigation: chấp nhận hybrid flow, nhưng giữ pagination dựa trên tập `goiThauId` sau khi status được xác định chính xác
- Risk: Payload list quá lớn vì popup dùng luôn dữ liệu chi tiết
  - Mitigation: giới hạn `pageSize = 20`, chỉ trả field chi tiết thực sự cần cho popup
- Risk: Copy UI giữa admin và facility làm tăng chi phí bảo trì
  - Mitigation: tạo một component `ProcurementLookupPage` dùng chung, chỉ khác props role/API
- Risk: Date filter gây ambiguity timezone khi dùng `Date`
  - Mitigation: thống nhất so sánh theo ngày ở backend và serialize rõ theo ISO/date-only cho UI

## Success Criteria

- Có item `Tra cứu` trong menu `Tổng hợp mua sắm` cho cả admin và facility
- Admin và facility cùng dùng một logic aggregate theo `gói thầu`
- Chỉ dữ liệu `quyTrinh = 1` xuất hiện trong màn `Tra cứu`
- Bảng một dòng cho một `gói thầu` thể hiện đủ:
  - `KHLCNT`
  - `TBMT`
  - `KQLCNT`
  - `Số mặt hàng trúng thầu`
  - `Tổng giá trị trúng thầu`
  - `Số lượng nhà thầu`
  - `Trạng thái tiến trình`
- Popup chi tiết hiển thị đúng danh sách nhà thầu và chi tiết phần lô
- Route facility không lộ dữ liệu đơn vị khác dù sửa query thủ công
