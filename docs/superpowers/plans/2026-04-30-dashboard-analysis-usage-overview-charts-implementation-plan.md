# Dashboard Analysis Usage Overview Charts Implementation Plan

## Inputs

Plan này dựa trên:

- Spec đã duyệt: [2026-04-30-dashboard-analysis-usage-overview-charts-design.md](/opt/sudungthuoc/sudungthuoc/docs/superpowers/specs/2026-04-30-dashboard-analysis-usage-overview-charts-design.md)
- Shared ABC engine hiện tại: [abc-analysis.ts](/opt/sudungthuoc/sudungthuoc/src/lib/dashboard/abc-analysis.ts)
- UI tab `Phân tích`: [Tab4Analysis.tsx](/opt/sudungthuoc/sudungthuoc/src/components/dashboard/Tab4Analysis.tsx)
- API Admin analysis: [route.ts](/opt/sudungthuoc/sudungthuoc/src/app/api/admin/dashboard/analysis/route.ts)
- API Facility analysis: [route.ts](/opt/sudungthuoc/sudungthuoc/src/app/api/facility/dashboard/analysis/route.ts)
- Schema danh mục thuốc và báo cáo tồn kho: [schema.prisma](/opt/sudungthuoc/sudungthuoc/prisma/schema.prisma)

## Goal

Thêm phần `Tổng quan về Phân tích sử dụng thuốc` vào tab `Phân tích`, sử dụng cùng dữ liệu báo cáo với ABC analysis:

- hỗ trợ metric `Giá trị sử dụng` và `Số lượng sử dụng`
- chỉ tính thuốc đã ánh xạ danh mục chung
- hiển thị cơ cấu theo `Nhóm thuốc`, `Nhóm điều trị`, `KSĐB`, `Kê đơn`, `Trong nước`
- Admin có thêm biểu đồ so sánh top CSYT theo chiều phân tích
- CSYT chỉ thấy cơ cấu nội bộ trong phạm vi đơn vị

## Delivery Principles

- Không thay đổi Prisma schema.
- Không thêm route mới nếu route analysis hiện có đủ dữ liệu.
- Không để Admin và CSYT copy-paste logic overview.
- Overview tính trên toàn bộ report theo scope, không chịu ảnh hưởng bởi `limit` của bảng ABC.
- UI đổi metric/dimension client-side, không fetch lại.
- Thuốc chưa ánh xạ không vào chart overview nhưng phải được đếm trong ghi chú dữ liệu.
- Không làm regression phần ABC summary, Pareto, bảng chi tiết, monitoring hiện có.

## Target Files

Runtime files:

- `src/lib/dashboard/abc-analysis.ts`
- `src/app/api/admin/dashboard/analysis/route.ts`
- `src/app/api/facility/dashboard/analysis/route.ts`
- `src/components/dashboard/Tab4Analysis.tsx`

Candidate component split nếu `Tab4Analysis.tsx` quá lớn:

- `src/components/dashboard/analysis/UsageOverviewSection.tsx`
- `src/components/dashboard/analysis/UsageBreakdownBarChart.tsx`
- `src/components/dashboard/analysis/UsageDonutChart.tsx`
- `src/components/dashboard/analysis/AdminFacilityUsageChart.tsx`

Docs:

- [2026-04-30-dashboard-analysis-usage-overview-charts-design.md](/opt/sudungthuoc/sudungthuoc/docs/superpowers/specs/2026-04-30-dashboard-analysis-usage-overview-charts-design.md)
- [2026-04-30-dashboard-analysis-usage-overview-charts-implementation-plan.md](/opt/sudungthuoc/sudungthuoc/docs/superpowers/plans/2026-04-30-dashboard-analysis-usage-overview-charts-implementation-plan.md)

## Phase 1: Extend Shared Types And Raw Report Shape

### Objective

Chuẩn hóa contract usage overview trong shared helper trước khi cập nhật API/UI.

### Tasks

1. Thêm type:
   - `UsageMetricKey = "value" | "quantity"`
   - `UsageDimensionKey`
   - `UsageSlice`
   - `FacilityUsageComparison`
   - `UsageOverview`
2. Mở rộng `AbcAnalysisResponse` thêm `usageOverview`.
3. Mở rộng `RawAbcReport.drugMap.masterDrug` thêm:
   - `isTrongNuoc`
   - `therapeuticGroup.name`
4. Thêm helper phân loại:
   - nhóm thuốc
   - nhóm điều trị
   - KSĐB
   - kê đơn
   - trong nước
5. Tái sử dụng numeric conversion và flag normalization hiện có.

### Acceptance Criteria

- TypeScript contract rõ ràng, không dùng `any` cho dữ liệu usage overview.
- Contract mới tương thích Admin và CSYT.
- Field thiếu/null luôn có label fallback.

## Phase 2: Build Usage Overview Engine

### Objective

Tính toàn bộ dữ liệu overview trong `buildAbcAnalysis`, cùng pass với dữ liệu ABC.

### Tasks

1. Chỉ đưa dòng có `masterDrugId` vào overview.
2. Tính `usageValue = xuat * giaVat`.
3. Tính `usageQuantity = xuat`.
4. Đếm `excludedUnmapped`:
   - `rowCount`
   - `value`
   - `quantity`
5. Aggregate theo các dimensions:
   - `byDrugGroup`
   - `byTherapeuticGroup`
   - `bySpecialControl`
   - `byPrescription`
   - `byDomestic`
6. Mỗi slice có:
   - `key`
   - `label`
   - `value`
   - `quantity`
   - `drugCount`
   - `percentValue`
   - `percentQuantity`
7. Tạo `topGroups` top 10 từ union `Nhóm thuốc` và `Nhóm điều trị`, label có prefix.
8. Với scope `admin`, tạo `facilityComparison` top 10 CSYT:
   - sort theo `totalValue` mặc định
   - mỗi facility có `dimensions` cho đủ 5 chiều
9. Không áp dụng `limit` của `abcItems` vào overview.

### Acceptance Criteria

- Overview tính trên toàn bộ report theo scope.
- Thuốc chưa ánh xạ không vào chart nhưng có số liệu loại trừ.
- Admin có `facilityComparison`; CSYT không cần field này hoặc trả `undefined`.
- Các phần trăm không chia cho 0.

## Phase 3: Update Analysis API Selects

### Objective

Đảm bảo hai route analysis query đủ field cho overview nhưng vẫn giữ auth/scope hiện có.

### Tasks

1. Admin route select thêm:
   - `masterDrug.isTrongNuoc`
   - `masterDrug.therapeuticGroup.name`
2. Facility route select thêm các field tương tự.
3. Không thêm query param mới.
4. Giữ parse `reportMonth`, `facilityId`, `limit` như hiện tại.
5. Giữ status `401` và error handling hiện có.

### Acceptance Criteria

- Admin tất cả CSYT trả overview toàn ngành.
- Admin một CSYT trả overview của CSYT đó.
- CSYT không thể truyền `facilityId` để xem đơn vị khác.
- Response Admin/CSYT cùng contract ở phần common overview.

## Phase 4: Add Usage Overview UI State And Helpers

### Objective

Chuẩn bị UI render chart từ contract mới, không làm fetch lại khi đổi metric/dimension.

### Tasks

1. Import/khai báo type client cho:
   - `UsageMetricKey`
   - `UsageDimensionKey`
   - `UsageSlice`
2. Thêm state:
   - `usageMetric`, mặc định `value`
   - `adminComparisonDimension`, mặc định `drugGroup`
3. Thêm helper chọn metric:
   - value label
   - percent field
   - formatter currency/number
4. Thêm helper gộp top 10 + `Khác` cho chart dài.
5. Thêm palette chart ổn định cho các slices.

### Acceptance Criteria

- Đổi `Giá trị`/`Số lượng` không gọi API lại.
- Chart dùng đúng formatter theo metric đang chọn.
- Dữ liệu nhiều nhóm không làm chart vỡ layout.

## Phase 5: Render Overview Section

### Objective

Thêm khối `Tổng quan về Phân tích sử dụng thuốc` vào đầu tab.

### Tasks

1. Render section sau KPI/summary A-B-C và trước Pareto.
2. Render segmented control `Giá trị` / `Số lượng`.
3. Render ghi chú mapped-only nếu có dòng chưa ánh xạ bị loại.
4. Render chart:
   - `Cơ cấu theo nhóm thuốc`
   - `Cơ cấu theo nhóm điều trị`
   - `Top nhóm sử dụng cao nhất`
   - donut `Thuốc kiểm soát đặc biệt`
   - donut `Kê đơn`
   - donut `Trong nước`
5. Tooltip hiển thị:
   - label
   - giá trị sử dụng
   - số lượng sử dụng
   - số mặt hàng
   - tỷ trọng theo metric đang chọn
6. Empty state riêng cho section khi không có thuốc đã ánh xạ có phát sinh sử dụng.

### Acceptance Criteria

- Người dùng thấy đủ 5 chiều phân tích trong section mới.
- Metric switch cập nhật tất cả chart trong section.
- Empty state không làm tab trắng.
- Phần ABC bên dưới vẫn render như cũ.

## Phase 6: Render Admin Facility Comparison

### Objective

Thêm biểu đồ so sánh top CSYT chỉ cho Admin.

### Tasks

1. Xác định Admin bằng `apiPrefix.includes("/api/admin")`.
2. Render chart `Top CSYT theo sử dụng`.
3. Thêm selector chiều phân tích:
   - `Nhóm thuốc`
   - `Nhóm điều trị`
   - `KSĐB`
   - `Kê đơn`
   - `Trong nước`
4. Chart là stacked horizontal bar.
5. Sort top 10 theo metric đang chọn:
   - `value`: `totalValue`
   - `quantity`: `totalQuantity`
6. Khi Admin đang lọc một CSYT, vẫn render một dòng và đổi subtitle thành `Cơ sở đang chọn`.
7. Không render chart này cho CSYT.

### Acceptance Criteria

- Admin xem toàn ngành có chart top CSYT.
- Admin lọc một CSYT không rò dữ liệu đơn vị khác.
- CSYT không thấy chart so sánh liên cơ sở.
- Selector dimension không fetch lại.

## Phase 7: Component Split If Needed

### Objective

Giữ `Tab4Analysis.tsx` dễ bảo trì nếu phần chart làm file quá lớn.

### Tasks

1. Kiểm tra kích thước `Tab4Analysis.tsx` sau phase 5-6.
2. Nếu file vượt khoảng 800 dòng hoặc component quá khó đọc, tách chart section vào thư mục:
   - `src/components/dashboard/analysis/`
3. Đảm bảo write scope rõ:
   - `UsageOverviewSection` nhận data + state + handlers.
   - Chart con chỉ nhận data đã chuẩn hóa.
4. Không tách quá mức nếu chỉ tạo thêm indirection.

### Acceptance Criteria

- Code UI dễ đọc, không trộn quá nhiều chart helper vào body chính.
- Không tạo abstraction không cần thiết.

## Phase 8: Verification

### Objective

Kiểm tra type, lint, build behavior chính và các case dữ liệu.

### Tasks

1. Chạy lint file thay đổi:

```bash
npx eslint src/lib/dashboard/abc-analysis.ts src/app/api/admin/dashboard/analysis/route.ts src/app/api/facility/dashboard/analysis/route.ts src/components/dashboard/Tab4Analysis.tsx
```

Nếu có tách component, thêm các file mới vào lệnh.

2. Chạy type-check:

```bash
npx tsc --noEmit --pretty false
```

3. Manual verification Admin:
   - `/dashboard/admin`
   - Đơn vị `Tất cả`
   - Kỳ báo cáo `Tất cả`
   - vào tab `Phân tích`
   - kiểm tra đủ chart overview, đổi metric, đổi dimension so sánh CSYT
4. Manual verification Admin một đơn vị:
   - chọn một CSYT
   - xác nhận chart so sánh chỉ còn phạm vi CSYT đó
5. Manual verification CSYT:
   - `/dashboard/facility`
   - tab `Phân tích`
   - xác nhận không có chart so sánh CSYT
6. Manual data cases:
   - thuốc chưa ánh xạ bị loại khỏi overview
   - thuốc có nhóm thuốc
   - thuốc có nhóm điều trị
   - thuốc KSĐB
   - thuốc kê đơn
   - thuốc trong nước
   - `xuat = 0`
   - `giaVat = 0`

### Acceptance Criteria

- ESLint không lỗi ở file thay đổi.
- Type-check pass hoặc ghi rõ lỗi ngoài phạm vi nếu repo đang có lỗi sẵn.
- Overview không làm sai ABC summary/Pareto/bảng chi tiết.
- Admin/CSYT đúng phạm vi dữ liệu.

## Rollout Notes

- Không cần migration database.
- Không cần backfill dữ liệu.
- Có thể triển khai trong một PR vì API contract và UI phụ thuộc trực tiếp nhau.
- Sau deploy, nếu có nhiều nhóm điều trị dài, cần theo dõi UI chart để tinh chỉnh top N hoặc label truncation.

## Success Criteria

- Tab `Phân tích` có section `Tổng quan về Phân tích sử dụng thuốc`.
- Tất cả chart overview chỉ tính thuốc đã ánh xạ.
- Người dùng chuyển được giữa giá trị và số lượng.
- Hiển thị đủ `Nhóm thuốc`, `Nhóm điều trị`, `KSĐB`, `Kê đơn`, `Trong nước`.
- Admin có chart so sánh top CSYT theo dimension.
- CSYT không có chart so sánh liên cơ sở.
- Lint và type-check pass.
