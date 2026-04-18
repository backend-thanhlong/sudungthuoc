# Mua Sam Tra Cuu Procurement Type Filter Implementation Plan

## Inputs

Plan này dựa trên:

- Spec đã chốt: [2026-04-18-mua-sam-tra-cuu-procurement-type-filter-design.md](/opt/sudungthuoc/sudungthuoc/docs/superpowers/specs/2026-04-18-mua-sam-tra-cuu-procurement-type-filter-design.md)
- Spec nền của màn tra cứu: [2026-04-18-mua-sam-tra-cuu-goi-thau-design.md](/opt/sudungthuoc/sudungthuoc/docs/superpowers/specs/2026-04-18-mua-sam-tra-cuu-goi-thau-design.md)
- Shared lookup data layer: [mua-sam-procurement-lookup.ts](/opt/sudungthuoc/sudungthuoc/src/lib/mua-sam-procurement-lookup.ts)
- Shared UI page: [ProcurementLookupPage.tsx](/opt/sudungthuoc/sudungthuoc/src/components/mua-sam/ProcurementLookupPage.tsx)
- Admin list route: [route.ts](/opt/sudungthuoc/sudungthuoc/src/app/api/admin/mua-sam/tra-cuu/route.ts)
- Facility list route: [route.ts](/opt/sudungthuoc/sudungthuoc/src/app/api/facility/mua-sam/tra-cuu/route.ts)
- Admin export route: [route.ts](/opt/sudungthuoc/sudungthuoc/src/app/api/admin/mua-sam/tra-cuu/export/route.ts)
- Prisma schema reference: [schema.prisma](/opt/sudungthuoc/sudungthuoc/prisma/schema.prisma)

## Goal

Triển khai filter `Loại mua sắm` cho màn `tra-cuu` của cả `admin` và `facility`, với các yêu cầu:

- dùng field `KeHoachLCNT.loaiMuaSam`
- giá trị hợp lệ gồm:
  - `all`
  - `Thuốc`
  - `Hóa chất, vật tư, thiết bị y tế`
- filter áp dụng đồng thời cho:
  - summary cards
  - bảng danh sách
  - phân trang
  - export Excel của admin

## Delivery Principles

- Không thay đổi schema Prisma
- Không thêm route mới cho procurement type filter
- Không tạo filter client-only
- Tái sử dụng cùng shared lookup layer cho admin, facility và export
- Không đổi cấu trúc workbook Excel đã chốt trước đó
- Giữ write set tập trung, không lan sang các màn `mua-sam` khác ngoài `tra-cuu`

## Current Constraints

- Shared lookup page đang dùng chung cho `admin` và `facility`, nên UI filter mới phải đồng nhất giữa hai role, chỉ khác phần `Đơn vị`
- Shared lookup lib hiện đã phục vụ cả list có phân trang và export toàn bộ dữ liệu; procurement type filter phải đi vào cùng data path này
- Dataset màn `tra-cuu` chỉ lấy `quyTrinh = 1`, nên filter phải dựa trên `keHoach.loaiMuaSam` thay vì thêm suy luận từ `GoiThau`
- Dữ liệu lịch sử có thể có `loaiMuaSam = null`; plan cần giữ hành vi rõ ràng để tránh summary/list/export lệch nhau

## Target File Structure

### Runtime files

- `src/lib/mua-sam-procurement-lookup.ts`
- `src/components/mua-sam/ProcurementLookupPage.tsx`
- `src/app/api/admin/mua-sam/tra-cuu/export/route.ts`

### Docs

- `docs/superpowers/specs/2026-04-18-mua-sam-tra-cuu-procurement-type-filter-design.md`
- `docs/superpowers/plans/2026-04-18-mua-sam-tra-cuu-procurement-type-filter-implementation-plan.md`

## Phase Breakdown

## Phase 1: Extend Shared Query Contract

### Objective

Mở rộng shared lookup data layer để hiểu thêm filter `procurementType` và áp dụng vào `KeHoachLCNT.loaiMuaSam`.

### Tasks

1. Bổ sung type cho procurement type filter trong `mua-sam-procurement-lookup.ts`
2. Mở rộng `ProcurementLookupQuery` với field:
   - `procurementType`
3. Tạo parser/normalizer cho giá trị:
   - `all`
   - `Thuốc`
   - `Hóa chất, vật tư, thiết bị y tế`
4. Cập nhật `parseProcurementLookupQuery(searchParams)` để đọc `procurementType`
5. Cập nhật `buildBaseWhere(query)` để thêm điều kiện `keHoach.loaiMuaSam` khi filter khác `all`
6. Giữ nguyên rule:
   - luôn có `keHoach.quyTrinh = 1`
7. Giữ hành vi với dữ liệu thiếu chuẩn:
   - khi `procurementType = all`, record có `loaiMuaSam = null` vẫn xuất hiện
   - khi chọn một loại cụ thể, record `null` không match

### Acceptance Criteria

- Shared query contract hiểu `procurementType`
- Filter được áp ngay từ backend, không cần lọc lại ở client
- Summary/list/export đều có thể dùng cùng query object mới

## Phase 2: Propagate Filter Through Shared Loaders

### Objective

Đảm bảo toàn bộ luồng load dữ liệu `tra-cuu` dùng cùng procurement type filter.

### Tasks

1. Giữ `loadProcurementLookupResponse()` dùng `buildActiveWhere(query)` đã mở rộng
2. Giữ `loadAllProcurementLookupItems(query)` dùng cùng logic filter
3. Không cần đổi response item nếu chưa hiển thị cột `Loại mua sắm`
4. Xác nhận facility route tiếp tục override `facilityId` từ session, nhưng vẫn tôn trọng `procurementType`
5. Xác nhận admin route list không cần đổi contract response, chỉ đổi query input

### Acceptance Criteria

- List route admin nhận `procurementType` và trả đúng summary/data sau filter
- List route facility nhận `procurementType` và chỉ lọc trong phạm vi đơn vị hiện tại
- Export loader nhận cùng filter và không lệch với list

## Phase 3: Add Procurement Type Filter To Shared UI

### Objective

Thêm ô chọn `Loại mua sắm` vào filter bar của `ProcurementLookupPage.tsx` cho cả admin và facility.

### Tasks

1. Bổ sung type client-side cho procurement type filter nếu chưa import trực tiếp từ shared lib
2. Mở rộng `AppliedFilters` với:
   - `procurementType`
3. Cập nhật `DEFAULT_FILTERS`
4. Thêm state input:
   - `selectedProcurementType`
5. Thêm options UI:
   - `Tất cả loại mua sắm`
   - `Thuốc`
   - `Hóa chất, vật tư, thiết bị y tế`
6. Render thêm `Select` với label `Loại mua sắm`
7. Đặt filter này cho cả `admin` và `facility`
8. Cập nhật `handleSearchSubmit` để đưa `selectedProcurementType` vào `appliedFilters`
9. Cập nhật `handleReset` để đưa filter này về `all`
10. Cập nhật helper build query params ở client để truyền `procurementType` lên server khi khác `all`

### Placement Rules

- Filter mới đứng cùng khu vực với `Trạng thái tiến trình`
- Không làm thay đổi khác biệt role ngoài filter `Đơn vị`

### Acceptance Criteria

- Cả admin và facility đều thấy filter `Loại mua sắm`
- `Đặt lại` đưa filter này về `Tất cả loại mua sắm`
- Request list truyền đúng `procurementType` khi user đã áp filter

## Phase 4: Wire Filter Into Admin Export

### Objective

Đảm bảo export Excel admin dùng cùng procurement type filter với màn hình hiện tại.

### Tasks

1. Cập nhật logic build query params ở client để `handleExportExcel` gửi thêm `procurementType`
2. Không đổi route export, chỉ dùng query param mới
3. Đảm bảo route export parse được `procurementType` nhờ shared parser đã mở rộng
4. Không đổi mapping workbook hoặc tên sheet trong pha này
5. Chỉ đổi tập dữ liệu đưa vào workbook theo filter

### Acceptance Criteria

- Export `Thuốc` chỉ ra file chứa dữ liệu `Thuốc`
- Export `Hóa chất, vật tư, thiết bị y tế` chỉ ra file đúng loại đó
- Export `all` giữ hành vi hiện tại

## Phase 5: Verification

### Objective

Xác nhận filter mới hoạt động đồng nhất ở admin, facility, summary, list và export.

### Tasks

1. Kiểm tra admin với `procurementType = all`
2. Kiểm tra admin với `procurementType = Thuốc`
3. Kiểm tra admin với `procurementType = Hóa chất, vật tư, thiết bị y tế`
4. Kiểm tra facility với hai lựa chọn cụ thể
5. Kiểm tra `Đặt lại` đưa filter về `all`
6. Kiểm tra export admin ở từng loại
7. Chạy `eslint` hoặc `tsc --noEmit` cho các file thay đổi nếu môi trường cho phép

### Manual Verification Checklist

1. Mở `/dashboard/admin/mua-sam/tra-cuu`
2. Chọn `Loại mua sắm = Thuốc`, bấm `Tìm kiếm`, xác nhận summary cards và bảng chỉ còn record `Thuốc`
3. Chọn `Loại mua sắm = Hóa chất, vật tư, thiết bị y tế`, xác nhận summary cards và bảng chỉ còn đúng loại đó
4. Export Excel ở từng trường hợp trên, mở file và xác nhận dữ liệu trong file khớp với loại đã chọn
5. Mở `/dashboard/facility/mua-sam/tra-cuu`, xác nhận có cùng filter `Loại mua sắm`
6. Chọn một loại cụ thể và xác nhận chỉ thấy dữ liệu đơn vị hiện tại trong loại đó
7. Dùng `Đặt lại`, xác nhận quay về `Tất cả loại mua sắm`

## Risks And Mitigations

- Risk: Filter được áp ở list nhưng quên áp ở export
  - Mitigation: dùng chung `parseProcurementLookupQuery` và shared loaders
- Risk: Admin và facility dùng hai bộ option khác nhau
  - Mitigation: gom giá trị procurement type vào constant/type dùng chung
- Risk: Dữ liệu `loaiMuaSam` cũ bị null làm user khó hiểu
  - Mitigation: quy ước rõ: chỉ xuất hiện khi `all`, không match khi chọn loại cụ thể

## Success Criteria

- Màn `tra-cuu` của cả admin và facility có filter `Loại mua sắm`
- Summary cards, list và pagination phản ánh đúng tập dữ liệu sau filter
- Export Excel admin phản ánh đúng `procurementType` đang áp dụng
- Không cần thay đổi schema hoặc route mới cho tính năng này
