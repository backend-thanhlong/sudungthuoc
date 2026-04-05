# Inventory Search View Modes Implementation Plan

## Inputs

Plan này dựa trên:

- Spec đã chốt: [2026-04-05-inventory-search-view-modes-design.md](/opt/sudungthuoc/sudungthuoc/docs/superpowers/specs/2026-04-05-inventory-search-view-modes-design.md)
- UI hiện tại: [page.tsx](/opt/sudungthuoc/sudungthuoc/src/app/dashboard/inventory-search/page.tsx)
- API hiện tại: [route.ts](/opt/sudungthuoc/sudungthuoc/src/app/api/inventory-search/route.ts)

## Goal

Triển khai 3 chế độ xem trên cùng route `/dashboard/inventory-search`:

- `Theo thuốc`
- `Theo cơ sở`
- `So sánh cơ sở`

Trong đó:

- `Theo thuốc` là mode mặc định
- `Theo cơ sở` ưu tiên luồng chọn `1 cơ sở` trước
- `So sánh cơ sở` ưu tiên luồng chọn `1 thuốc` rồi so sánh giữa nhiều cơ sở

## Delivery Principles

- Không thay đổi schema Prisma
- Không thay đổi quy tắc snapshot dữ liệu hiện tại
- Tách shared data layer trước khi mở rộng UI
- Giữ mode `Theo thuốc` chạy ổn trong suốt quá trình refactor
- Không gộp tất cả logic mới vào một page component hoặc một API route duy nhất
- Không thêm framework test mới trong scope này

## Current Constraints

- UI hiện tại đang là một client page lớn, tự giữ toàn bộ state, render và fetch
- API hiện tại chỉ có một route chung
- Repo hiện chưa có test runner ngoài `eslint`
- Thư viện UI hiện có `Input`, `Select`, `Table`, `Card`, `Button`, nhưng chưa có `Combobox` hoặc `MultiSelect` sẵn

## Target File Structure

### Frontend

- `src/app/dashboard/inventory-search/page.tsx`
- `src/components/inventory-search/InventorySearchPageShell.tsx`
- `src/components/inventory-search/InventorySearchToolbar.tsx`
- `src/components/inventory-search/DrugResultsView.tsx`
- `src/components/inventory-search/FacilityResultsView.tsx`
- `src/components/inventory-search/FacilityComparisonView.tsx`
- `src/components/inventory-search/types.ts`

### Backend

- `src/lib/inventory-search/server.ts`
- `src/lib/inventory-search/types.ts`
- `src/app/api/inventory-search/drug/route.ts`
- `src/app/api/inventory-search/facility/route.ts`
- `src/app/api/inventory-search/compare/route.ts`
- `src/app/api/inventory-search/facilities/route.ts`
- `src/app/api/inventory-search/drug-options/route.ts`

### Docs

- `docs/superpowers/plans/2026-04-05-inventory-search-view-modes-implementation-plan.md`

## Phase Breakdown

## Phase 1: Extract Shared Inventory Snapshot Logic

### Objective

Tách logic lấy snapshot tồn kho mới nhất ra khỏi API hiện tại để mọi mode dùng chung cùng một nguồn dữ liệu chuẩn.

### Tasks

1. Tạo module server-side mới tại `src/lib/inventory-search/server.ts`
2. Di chuyển vào module này các phần logic hiện có:
   - xác thực session
   - điều kiện chỉ lấy `APPROVED`
   - điều kiện `ton_cuoi > 0`
   - truy vấn bản ghi mới nhất theo `facility_id + map_id`
   - gom dữ liệu từ `facilityDrugMap`, `masterDrug`, `facility`
3. Chuẩn hóa output trung gian thành một kiểu snapshot dùng chung, ví dụ:
   - `InventorySnapshotRow`
   - `DrugSummaryRow`
   - `FacilityInventoryRow`
   - `FacilityComparisonRow`
4. Tạo helper tìm kiếm cho thuốc dùng chung:
   - search theo `tenThuoc`
   - `hoatChat`
   - `hamLuong`
   - `maChung`

### Output

- Shared server module tái sử dụng cho cả 3 mode
- Không còn phải copy/paste logic snapshot giữa nhiều route

### Acceptance Criteria

- Có một nguồn duy nhất định nghĩa snapshot tồn kho
- Có thể dùng lại cho route cũ hoặc route mới mà không đổi kết quả dữ liệu nền

## Phase 2: Split API By Mode

### Objective

Tách API theo mode để mỗi route có contract rõ ràng và dễ bảo trì.

### Tasks

1. Tạo `GET /api/inventory-search/drug`
2. Tạo `GET /api/inventory-search/facility`
3. Tạo `GET /api/inventory-search/compare`
4. Tạo `GET /api/inventory-search/facilities`
5. Tạo `GET /api/inventory-search/drug-options`
6. Mỗi route phải tự xử lý:
   - auth
   - validate query params
   - return `400` khi thiếu input bắt buộc
   - return `401` khi chưa đăng nhập
   - return `500` khi lỗi nội bộ

### API Contract

#### `/api/inventory-search/drug`

Input:

- `q`
- `page`
- `limit`
- `sort`

Output:

- `results`
- `total`
- `page`
- `limit`

Ghi chú:

- Giữ shape gần nhất với API hiện tại để refactor UI mode `Theo thuốc` ít rủi ro

#### `/api/inventory-search/facility`

Input:

- `facilityId` bắt buộc
- `q`
- `page`
- `limit`
- `sort`

Output:

- `facility`
- `summary`
- `results`
- `total`
- `page`
- `limit`

#### `/api/inventory-search/compare`

Input:

- `masterDrugId` hoặc `maChung`
- `facilityIds[]`

Validation:

- Phải có thuốc
- Phải có tối thiểu 2 cơ sở

Output:

- `drug`
- `facilities`
- `metrics`

#### `/api/inventory-search/facilities`

Mục đích:

- Cấp danh sách cơ sở cho dropdown hoặc checklist

Output:

- `id`
- `facilityCode`
- `facilityName`
- `facilityType`

#### `/api/inventory-search/drug-options`

Mục đích:

- Cấp danh sách thuốc gọn để chọn trong mode `So sánh cơ sở`

Input:

- `q`
- `limit`

Output:

- `masterDrugId`
- `maChung`
- `tenThuoc`
- `hoatChat`
- `hamLuong`

### Notes

- `drug-options` là endpoint phụ trợ cho control chọn thuốc, không thay thế route `drug`
- Trong rollout đầu, giữ `src/app/api/inventory-search/route.ts` tạm thời và cho nó gọi lại logic của route `drug` cho đến khi UI cắt xong

### Acceptance Criteria

- Mỗi mode có route riêng
- Tất cả route dùng chung một shared snapshot layer
- Route mới trả lỗi rõ ràng khi thiếu input

## Phase 3: Refactor Page Into Shell + Views

### Objective

Giảm độ phình của page hiện tại và chuẩn bị nền cho 3 mode.

### Tasks

1. Tạo `src/components/inventory-search/InventorySearchPageShell.tsx`
2. Chuyển phần điều phối state từ page hiện tại sang shell:
   - `viewMode`
   - query dùng chung
   - selected facility
   - selected drug for compare
   - selected facilities for compare
   - sorting
   - pagination
   - loading
   - error
3. Giữ `src/app/dashboard/inventory-search/page.tsx` ở vai trò rất mỏng:
   - import shell
   - render shell
4. Tạo `src/components/inventory-search/types.ts` cho các client-facing types

### State Rules

- `Theo thuốc` là mode mặc định
- Khi đổi mode:
  - giữ `query` nếu vẫn có nghĩa
  - reset `selectedFacility` khi sang mode không dùng facility đơn
  - reset `selectedComparisonDrug` khi sang mode không so sánh
  - reset `selectedFacilityIds` khi rời mode so sánh
  - reset `page` về `1`

### Acceptance Criteria

- Page chính không còn giữ toàn bộ render logic
- State được gom về một shell duy nhất, rõ vai trò điều phối

## Phase 4: Rebuild Drug Mode On New API

### Objective

Refactor mode hiện tại sang kiến trúc mới nhưng giữ nguyên hành vi cốt lõi để tránh regression.

### Tasks

1. Tạo `DrugResultsView.tsx`
2. Chuyển bảng thuốc hiện có sang component này
3. Đổi fetch từ route cũ sang `/api/inventory-search/drug`
4. Giữ các hành vi đang có:
   - debounce query
   - pagination
   - expand row
   - loading spinner
   - empty state
5. Thêm sort cơ bản:
   - tên thuốc
   - tổng tồn kho
   - số cơ sở

### Important Guardrail

- Không đổi cách nhóm dữ liệu của mode `Theo thuốc` trong pha này
- Mục tiêu là parity trước, tối ưu sau

### Acceptance Criteria

- `Theo thuốc` hoạt động tương đương hiện tại
- Dùng API mới
- Không làm xấu đi trải nghiệm bảng bung dòng đang có

## Phase 5: Implement Facility Mode

### Objective

Thêm mode `Theo cơ sở` với luồng chính là chọn một cơ sở rồi xem danh sách thuốc còn tồn tại cơ sở đó.

### Tasks

1. Tạo `FacilityResultsView.tsx`
2. Trong `InventorySearchToolbar`, thêm control chọn cơ sở khi `viewMode = facility`
3. Dùng endpoint `/api/inventory-search/facilities` để nạp danh sách cơ sở
4. Dùng endpoint `/api/inventory-search/facility` để nạp dữ liệu kết quả
5. Render summary cơ sở:
   - tên cơ sở
   - mã cơ sở
   - số thuốc có tồn
   - tổng lượng tồn
6. Render bảng thuốc của cơ sở
7. Cho phép lọc thuốc trong cơ sở qua `q`
8. Thêm sort:
   - tên thuốc
   - tồn kho
   - giá VAT

### UI Recommendation

- Dùng `Select` hiện có cho bước chọn `1 cơ sở`
- Chỉ bật ô lọc thuốc khi đã có `facilityId`

### Empty/Error States

- Chưa chọn cơ sở: hiện hướng dẫn chọn cơ sở trước
- Chọn cơ sở nhưng không có tồn: hiện thông điệp riêng theo cơ sở
- Có cơ sở nhưng không khớp từ khóa: hiện thông điệp lọc không khớp

### Acceptance Criteria

- Có thể xem thuốc của một cơ sở cụ thể
- Luồng chính là chọn cơ sở trước, lọc thuốc sau
- Kết quả không còn hiển thị danh sách cơ sở lồng bên trong

## Phase 6: Implement Compare Mode

### Objective

Thêm mode `So sánh cơ sở` để so sánh cùng một thuốc giữa nhiều cơ sở.

### Tasks

1. Tạo `FacilityComparisonView.tsx`
2. Thêm control chọn thuốc trong toolbar khi `viewMode = compare`
3. Dùng `/api/inventory-search/drug-options` để tìm thuốc
4. Thêm control chọn nhiều cơ sở
5. Dùng `/api/inventory-search/compare` để lấy ma trận so sánh
6. Render ma trận với:
   - cột là cơ sở
   - hàng là `Tồn kho`, `Giá VAT`, `Kỳ báo cáo`
7. Thêm highlight:
   - tồn kho cao nhất
   - giá VAT thấp nhất
   - kỳ báo cáo cũ hơn

### Control Strategy

Do repo chưa có `Combobox` hoặc `MultiSelect`, đợt đầu dùng cách thực dụng:

- Thuốc:
  - một `Input` để tìm
  - một danh sách kết quả ngắn bên dưới để chọn đúng thuốc
- Nhiều cơ sở:
  - một checklist hoặc danh sách selectable badges
  - không cần làm custom combobox phức tạp ở đợt đầu

### Validation Rules

- Chưa chọn thuốc: không gọi API compare
- Chưa đủ 2 cơ sở: không gọi API compare
- Nếu một cơ sở không có dữ liệu:
  - vẫn giữ cột
  - hiển thị `Không có dữ liệu`

### Acceptance Criteria

- Có thể chọn một thuốc và nhiều cơ sở
- Có thể nhìn thấy ma trận so sánh ổn định, không tự rơi cột
- UI cảnh báo rõ khi điều kiện đầu vào chưa đủ

## Phase 7: Toolbar Integration And Cross-Mode Polish

### Objective

Làm liền mạch trải nghiệm chuyển giữa ba mode.

### Tasks

1. Tạo `InventorySearchToolbar.tsx`
2. Render segmented control `Theo thuốc`, `Theo cơ sở`, `So sánh cơ sở`
3. Hiển thị đúng filter ngữ cảnh theo mode
4. Thêm dòng trạng thái ở hàng thứ ba:
   - `Đang xem theo thuốc`
   - `Đã chọn <tên cơ sở>`
   - `Đang so sánh <n> cơ sở`
5. Đồng bộ reset state khi đổi mode
6. Đồng bộ loading và empty state để không làm nhấp nháy UI quá mức

### Acceptance Criteria

- Toolbar là điểm điều hướng chung cho cả 3 mode
- Người dùng hiểu mình đang ở mode nào và còn thiếu điều kiện gì

## Phase 8: Cleanup, Verification, And Rollout

### Objective

Chốt logic, giảm nợ kỹ thuật còn lại và xác nhận các luồng chính chạy đúng.

### Tasks

1. Quyết định giữ hay bỏ route cũ `/api/inventory-search`
2. Xóa logic fetch hoặc type không còn dùng
3. Chạy `eslint`
4. Manual smoke test từng mode
5. Kiểm tra responsive tối thiểu trên desktop và màn hình hẹp

### Manual Verification Checklist

#### Theo thuốc

1. Mở trang mặc định vào `Theo thuốc`
2. Gõ từ khóa thuốc và nhận đúng kết quả
3. Đổi sort và xác nhận thứ tự thay đổi
4. Bung dòng để xem cơ sở
5. Chuyển trang và xác nhận pagination đúng

#### Theo cơ sở

1. Chuyển sang `Theo cơ sở`
2. Khi chưa chọn cơ sở, thấy empty state đúng
3. Chọn một cơ sở và thấy summary + bảng thuốc
4. Lọc thuốc trong cơ sở đã chọn
5. Đổi sort và xác nhận thứ tự đúng

#### So sánh cơ sở

1. Chuyển sang `So sánh cơ sở`
2. Khi chưa chọn thuốc, thấy hướng dẫn đúng
3. Chọn thuốc nhưng mới có 1 cơ sở, thấy nhắc cần tối thiểu 2 cơ sở
4. Chọn từ 2 cơ sở trở lên và thấy ma trận
5. Xác nhận cơ sở không có dữ liệu vẫn hiện cột
6. Xác nhận cảnh báo khi kỳ báo cáo không đồng nhất

### Acceptance Criteria

- `eslint` pass
- Cả 3 mode hoạt động đúng theo spec
- Không có regression rõ ràng ở mode `Theo thuốc`

## Recommended Execution Order

Nếu triển khai trong một nhánh liên tục, thứ tự là:

1. Phase 1
2. Phase 2
3. Phase 3
4. Phase 4
5. Phase 5
6. Phase 6
7. Phase 7
8. Phase 8

Để giảm rủi ro hơn, chia thành 3 PR logic:

### PR 1

- Shared data layer
- API split
- Refactor `Theo thuốc` sang shell mới

### PR 2

- `Theo cơ sở`
- Toolbar state transitions liên quan

### PR 3

- `So sánh cơ sở`
- Polish và cleanup cuối

## Risks And Mitigations

### Risk 1: Snapshot logic bị lệch giữa các mode

Mitigation:

- Bắt buộc dùng chung `src/lib/inventory-search/server.ts`

### Risk 2: Page state trở nên rối khi có nhiều filter

Mitigation:

- Gom điều phối vào `InventorySearchPageShell`
- Tách render theo mode thành component riêng

### Risk 3: Control chọn thuốc và chọn nhiều cơ sở bị làm quá nặng

Mitigation:

- Dùng control thực dụng ở đợt đầu
- Tránh tự xây combobox hoàn chỉnh nếu chưa cần

### Risk 4: Regression ở mode hiện tại

Mitigation:

- Refactor `Theo thuốc` trước theo hướng parity
- Chỉ thêm sort nhẹ, không đổi mô hình bảng chính

### Risk 5: Scope tăng do muốn thêm phân tích sâu

Mitigation:

- Giữ compare mode ở mức ma trận
- Không thêm chart hoặc historical trend trong đợt này

## Out Of Scope For This Plan

- Lịch sử tồn kho theo tháng
- Xuất Excel cho từng mode
- Bookmark URL state cho filter
- Phân tích phân bổ thuốc hoặc cảnh báo điều phối tự động
- Bổ sung test framework mới
