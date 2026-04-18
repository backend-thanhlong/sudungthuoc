# Admin Mua Sam Tra Cuu Export Excel Implementation Plan

## Inputs

Plan này dựa trên:

- Spec đã chốt: [2026-04-18-admin-mua-sam-tra-cuu-export-excel-design.md](/opt/sudungthuoc/sudungthuoc/docs/superpowers/specs/2026-04-18-admin-mua-sam-tra-cuu-export-excel-design.md)
- Spec nền của màn tra cứu: [2026-04-18-mua-sam-tra-cuu-goi-thau-design.md](/opt/sudungthuoc/sudungthuoc/docs/superpowers/specs/2026-04-18-mua-sam-tra-cuu-goi-thau-design.md)
- Component màn tra cứu: [ProcurementLookupPage.tsx](/opt/sudungthuoc/sudungthuoc/src/components/mua-sam/ProcurementLookupPage.tsx)
- Shared lookup data layer: [mua-sam-procurement-lookup.ts](/opt/sudungthuoc/sudungthuoc/src/lib/mua-sam-procurement-lookup.ts)
- Admin list route hiện tại: [route.ts](/opt/sudungthuoc/sudungthuoc/src/app/api/admin/mua-sam/tra-cuu/route.ts)
- Browser download helpers: [browser-download.ts](/opt/sudungthuoc/sudungthuoc/src/lib/browser-download.ts)
- Pattern export Excel hiện có: [route.ts](/opt/sudungthuoc/sudungthuoc/src/app/api/admin/reports/export/route.ts)

## Goal

Triển khai chức năng `Xuất Excel` cho màn `/dashboard/admin/mua-sam/tra-cuu` với đặc điểm:

- chỉ áp dụng cho `admin`
- xuất toàn bộ dữ liệu khớp `appliedFilters`
- không phụ thuộc `page` và `limit`
- file gồm `2 sheet`
- `TongHopGoiThau`: `1 dòng = 1 gói thầu`
- `ChiTietPhanLo`: `1 dòng = 1 phần lô`, lặp lại đủ cột khóa để biết phần lô thuộc đơn vị và gói nào

## Delivery Principles

- Không thay đổi schema Prisma
- Không thay đổi contract của route list `/api/admin/mua-sam/tra-cuu`
- Không thêm export cho `facility` trong pha này
- Tái sử dụng tối đa logic lọc/query/serialize từ `mua-sam-procurement-lookup.ts`
- Không copy lại filter logic ở route export
- Giữ pattern export giống các route Excel admin khác: server trả `xlsx`, client tải `blob`
- Giữ write set tập trung, tránh lan sang các màn `mua-sam` khác

## Current Constraints

- Repo đang có nhiều thay đổi chưa commit ở các file khác; rollout cần giới hạn file chỉnh sửa rõ ràng
- `ProcurementLookupPage.tsx` hiện là shared component cho cả `admin` và `facility`, nên UI export phải được khóa bởi `role`
- Route list hiện parse `page` và `limit`; route export phải bỏ qua hai param này để tránh hiểu nhầm là export theo trang
- Dữ liệu phần lô đang nằm trong `phanLoResults` bên trong mỗi `ProcurementLookupItem`; export sheet 2 cần bước flatten riêng
- Workbook dùng `xlsx`, phù hợp với bài toán hiện tại nhưng styling nên giữ tối giản, ưu tiên dữ liệu đúng và dễ lọc

## Target File Structure

### Runtime files

- `src/components/mua-sam/ProcurementLookupPage.tsx`
- `src/lib/mua-sam-procurement-lookup.ts`
- `src/app/api/admin/mua-sam/tra-cuu/export/route.ts`

### Docs

- `docs/superpowers/specs/2026-04-18-admin-mua-sam-tra-cuu-export-excel-design.md`
- `docs/superpowers/plans/2026-04-18-admin-mua-sam-tra-cuu-export-excel-implementation-plan.md`

## Phase Breakdown

## Phase 1: Extend Shared Lookup Data Layer For Export

### Objective

Mở rộng `mua-sam-procurement-lookup.ts` để route export có thể load toàn bộ dataset bằng cùng logic với route list hiện tại.

### Tasks

1. Giữ nguyên `parseProcurementLookupQuery(searchParams)` để tái sử dụng cho cả list và export
2. Tách hoặc export các helper nền nếu đang là private nhưng cần dùng lại:
   - `buildBaseWhere`
   - `buildStatusWhere`
   - `combineWhere`
   - `serializeLookupItem`
   - `GOI_THAU_LOOKUP_INCLUDE`
   - `GOI_THAU_LOOKUP_ORDER_BY`
3. Bổ sung helper server-side mới, ví dụ:
   - `loadAllProcurementLookupItems(query)`
4. Helper mới phải:
   - dùng cùng `baseWhere`
   - dùng cùng `statusWhere`
   - dùng cùng `include`
   - dùng cùng `orderBy`
   - không dùng `skip/take`
   - trả về `ProcurementLookupItem[]`
5. Giữ nguyên `loadProcurementLookupResponse()` cho route list để không làm lệch hành vi hiện tại

### Acceptance Criteria

- Có một helper rõ ràng để load toàn bộ dataset export
- Route list và route export dùng cùng logic lọc/serialize
- Không có logic filter duplicate ở route export

## Phase 2: Implement Admin Export Route

### Objective

Thêm route `GET /api/admin/mua-sam/tra-cuu/export` để sinh file `xlsx` từ toàn bộ dataset khớp filter.

### Tasks

1. Tạo file mới `src/app/api/admin/mua-sam/tra-cuu/export/route.ts`
2. Áp dụng auth giống route list:
   - chỉ cho `ADMIN`
3. Parse filter từ query string bằng `parseProcurementLookupQuery`
4. Gọi `loadAllProcurementLookupItems(query)`
5. Nếu không có dữ liệu:
   - trả `404`
   - body `{ message: "Không có dữ liệu để xuất" }`
6. Nếu có dữ liệu:
   - build workbook bằng `xlsx`
   - append `TongHopGoiThau`
   - append `ChiTietPhanLo`
   - ghi file buffer
   - trả `NextResponse` với `Content-Type` và `Content-Disposition` phù hợp
7. Xử lý lỗi theo cùng pattern với route list:
   - preserve route errors nếu có
   - log lỗi server-side
   - trả `500` nếu lỗi ngoài dự kiến

### Workbook mapping

#### Sheet `TongHopGoiThau`

Map từng `ProcurementLookupItem` thành row gồm:

1. `STT`
2. `Đơn vị`
3. `Mã đơn vị`
4. `Mã KHLCNT`
5. `Tên KHLCNT`
6. `Số quyết định KHLCNT`
7. `Ngày phê duyệt KHLCNT`
8. `Tên gói thầu`
9. `Giá gói thầu`
10. `Hình thức LCNT`
11. `Phương thức LCNT`
12. `Loại hợp đồng`
13. `Số lượng phần lô`
14. `Trạng thái gói thầu`
15. `Mã TBMT`
16. `Ngày đăng tải TBMT`
17. `Ngày đóng thầu`
18. `Số QĐ KQLCNT`
19. `Ngày phê duyệt KQLCNT`
20. `Số mặt hàng mời thầu`
21. `Số mặt hàng trúng thầu`
22. `Tổng giá trị trúng thầu`
23. `Số nhà thầu trúng`
24. `Danh sách nhà thầu trúng`
25. `Trạng thái tiến trình`

#### Sheet `ChiTietPhanLo`

Flatten toàn bộ `row.phanLoResults` thành các row:

1. `STT`
2. `Đơn vị`
3. `Mã đơn vị`
4. `Mã KHLCNT`
5. `Tên KHLCNT`
6. `Tên gói thầu`
7. `Mã TBMT`
8. `Số QĐ KQLCNT`
9. `Trạng thái tiến trình`
10. `Tên phần lô`
11. `Kết quả phần lô`
12. `Đơn giá trúng thầu`
13. `Nhà thầu trúng thầu`

### Serialization rules

1. Các field ngày:
   - format thành chuỗi `dd/mm/yyyy`
   - nếu thiếu dữ liệu thì để chuỗi rỗng
2. `loaiHopDong`:
   - join bằng `, `
3. `danhSachNhaThauTrung`:
   - join bằng `; `
4. Các field tiền và số lượng:
   - giữ kiểu số nếu có dữ liệu
   - nếu thiếu dữ liệu thì để `null` hoặc chuỗi rỗng theo mapping thống nhất của sheet
5. Các field `TBMT/KQLCNT` chưa có:
   - xuất chuỗi rỗng
   - không dùng `—`

### Formatting scope

1. Giữ formatting ở mức tối thiểu:
   - header bold
   - độ rộng cột cơ bản
2. Không đầu tư style phức tạp trong pha này
3. Ưu tiên file dễ lọc, dễ mở, dễ bảo trì

### Acceptance Criteria

- Route export trả file `xlsx` hợp lệ
- Không có dữ liệu thì trả lỗi rõ ràng, không sinh file rỗng
- Workbook có đúng `2 sheet` theo tên đã chốt
- Sheet 2 nhìn vào một dòng là biết phần lô thuộc đơn vị/gói nào

## Phase 3: Add Admin Export UI

### Objective

Thêm nút `Xuất Excel` ở shared lookup page nhưng chỉ hiển thị cho `admin`.

### Tasks

1. Mở rộng `ProcurementLookupPage.tsx` với state export:
   - `isExporting`
2. Import helpers:
   - `getDownloadFileName`
   - `triggerBlobDownload`
3. Thêm handler `handleExportExcel`
4. Handler phải:
   - build query string từ `appliedFilters`
   - không gửi `page`
   - không gửi `limit`
   - gọi `/api/admin/mua-sam/tra-cuu/export`
   - parse lỗi JSON nếu request fail
   - tải file nếu thành công
   - hiển thị toast success/error
5. Render nút `Xuất Excel` chỉ khi `role === "admin"`
6. Disable nút khi `isExporting = true`
7. Hiển thị text `Đang xuất...` trong lúc chờ

### Placement recommendation

Đặt nút tại vùng đầu card bộ lọc hoặc đầu card danh sách, miễn là:

- người dùng hiểu file sẽ bám theo bộ lọc hiện tại
- không lẫn với nút `Tìm kiếm` và `Đặt lại`

### Acceptance Criteria

- Admin thấy nút export
- Facility không thấy nút export
- Export dùng đúng `appliedFilters`, không bị ảnh hưởng bởi input chưa submit
- Nút có loading state rõ ràng

## Phase 4: Verification

### Objective

Xác nhận file export khớp dataset trên màn và đúng scope admin-only.

### Tasks

1. Mở `/dashboard/admin/mua-sam/tra-cuu`
2. Thử export khi không có filter
3. Thử export với filter:
   - `đơn vị`
   - `trạng thái tiến trình`
   - `từ ngày`
   - `đến ngày`
4. Xác nhận `TongHopGoiThau`:
   - số dòng khớp tổng record theo filter
   - không khớp số dòng của riêng page hiện tại nếu tổng > `20`
5. Xác nhận `ChiTietPhanLo`:
   - có cột lặp đúng như spec
   - dòng phần lô đủ thông tin để biết thuộc đơn vị/gói nào
6. Xác nhận các gói chưa có `TBMT` hoặc `KQLCNT` vẫn có ở sheet tổng hợp
7. Xác nhận khi không có dữ liệu thì UI báo lỗi rõ ràng
8. Xác nhận `facility` không có nút export
9. Chạy `eslint` hoặc `tsc --noEmit` cho file thay đổi nếu môi trường cho phép

### Manual Verification Checklist

1. Ở `/dashboard/admin/mua-sam/tra-cuu`, tìm một filter có tổng kết quả > `20`
2. Export file và mở `TongHopGoiThau`
3. Đếm hoặc đối chiếu số dòng, xác nhận lớn hơn số dòng của một page và khớp tổng số record
4. Mở `ChiTietPhanLo`, lọc theo `Đơn vị` hoặc `Tên gói thầu`, xác nhận có thể truy ngược được phần lô tương ứng
5. Chọn một gói chưa có `KQLCNT`, xác nhận các cột `KQLCNT` để trống
6. Chọn một gói có `KQLCNT`, xác nhận phần lô và nhà thầu trúng thầu được export đúng

## Risks And Mitigations

- Risk: Route export copy lại logic lọc riêng dẫn tới lệch kết quả với bảng
  - Mitigation: bắt buộc dùng `loadAllProcurementLookupItems(query)` từ shared data layer
- Risk: Shared page vô tình lộ nút export cho `facility`
  - Mitigation: guard rõ bằng `role === "admin"` trong UI
- Risk: Dữ liệu nhiều làm workbook nặng
  - Mitigation: giữ workbook chỉ `2 sheet`, style tối thiểu, không tách nhiều sheet theo đơn vị
- Risk: Dữ liệu ngày hiển thị khác nhau giữa sheet 1 và sheet 2
  - Mitigation: dùng một formatter ngày thống nhất `dd/mm/yyyy` cho toàn bộ export route

## Success Criteria

- Admin export được file Excel từ màn `tra-cuu`
- File phản ánh toàn bộ dataset khớp `appliedFilters`
- Workbook đúng `2 sheet` như spec
- Sheet chi tiết phần lô đủ thông tin để xác định đơn vị và gói thầu
- Facility không bị ảnh hưởng trong pha này
