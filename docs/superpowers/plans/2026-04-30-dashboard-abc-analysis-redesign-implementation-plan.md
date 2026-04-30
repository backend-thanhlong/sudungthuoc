# Dashboard ABC Analysis Redesign Implementation Plan

## Inputs

Plan này dựa trên:

- Spec đã duyệt: [2026-04-30-dashboard-abc-analysis-redesign-design.md](/opt/sudungthuoc/sudungthuoc/docs/superpowers/specs/2026-04-30-dashboard-abc-analysis-redesign-design.md)
- UI tab `Phân tích` hiện tại: [Tab4Analysis.tsx](/opt/sudungthuoc/sudungthuoc/src/components/dashboard/Tab4Analysis.tsx)
- API admin hiện tại: [route.ts](/opt/sudungthuoc/sudungthuoc/src/app/api/admin/dashboard/analysis/route.ts)
- API facility hiện tại: [route.ts](/opt/sudungthuoc/sudungthuoc/src/app/api/facility/dashboard/analysis/route.ts)
- Schema báo cáo tồn kho: [schema.prisma](/opt/sudungthuoc/sudungthuoc/prisma/schema.prisma)

## Goal

Triển khai lại tab `Phân tích` để Admin và CSYT cùng dùng một logic ABC chuẩn:

- tính giá trị tiêu thụ bằng `xuat * giaVat`
- cộng gộp thuốc đúng theo danh mục chung hoặc mã nội bộ khi chưa ánh xạ
- hiển thị số lượng tiêu thụ, đơn giá bình quân, giá trị, `% giá trị`, `% tích lũy`
- xử lý minh bạch thuốc có nhiều đơn giá theo kỳ
- tính summary A/B/C trên toàn bộ dữ liệu đủ điều kiện, không chỉ top 200
- loại bỏ trải nghiệm so sánh CSYT khỏi view CSYT

## Delivery Principles

- Không thay đổi schema Prisma
- Không thay đổi upload/import báo cáo tồn kho
- Không thêm ABC/VEN/XYZ ngoài phạm vi ABC đã duyệt
- Không để route Admin và CSYT copy-paste thuật toán ABC
- Route chịu trách nhiệm auth và phạm vi dữ liệu; shared helper chịu trách nhiệm công thức
- Summary phải luôn tính trên toàn bộ dữ liệu sau lọc, trước khi áp dụng `limit`
- UI phải giải thích được cách tính từng dòng ABC mà không cần mở code
- Các cảnh báo dữ liệu không được chặn render ABC khi vẫn còn dòng hợp lệ

## Current Constraints

- `Tab4Analysis.tsx` hiện dùng kiểu `any`, render cả ABC, thuốc kiểm soát đặc biệt và so sánh cơ sở trong một file
- Admin và facility route đang lặp phần tính ABC
- `InventoryReport.reportMonth` là chuỗi `MM/YYYY`, cần sort kỳ bằng helper thay vì so chuỗi tự do
- Dữ liệu đơn giá nằm theo từng dòng báo cáo qua `giaVat`; không có bảng lịch sử giá riêng
- Thuốc chưa ánh xạ có thể trùng tên giữa các cơ sở, nên Admin toàn ngành không được gộp theo tên tự do
- Repo có `eslint` và TypeScript; chưa thấy test runner riêng trong `package.json`

## Target File Structure

### Runtime files

- `src/lib/dashboard/abc-analysis.ts`
- `src/app/api/admin/dashboard/analysis/route.ts`
- `src/app/api/facility/dashboard/analysis/route.ts`
- `src/components/dashboard/Tab4Analysis.tsx`

### Candidate component split

Chỉ tách nếu `Tab4Analysis.tsx` quá lớn sau khi rebuild:

- `src/components/dashboard/analysis/AbcSummaryCards.tsx`
- `src/components/dashboard/analysis/AbcParetoChart.tsx`
- `src/components/dashboard/analysis/AbcDetailTable.tsx`
- `src/components/dashboard/analysis/AbcMonitoringPanel.tsx`

### Docs

- [2026-04-30-dashboard-abc-analysis-redesign-design.md](/opt/sudungthuoc/sudungthuoc/docs/superpowers/specs/2026-04-30-dashboard-abc-analysis-redesign-design.md)
- [2026-04-30-dashboard-abc-analysis-redesign-implementation-plan.md](/opt/sudungthuoc/sudungthuoc/docs/superpowers/plans/2026-04-30-dashboard-abc-analysis-redesign-implementation-plan.md)

## Phase Breakdown

## Phase 1: Build Shared ABC Analysis Engine

### Objective

Tạo một module dùng chung để mọi công thức ABC nằm ở một nơi.

### Tasks

1. Tạo `src/lib/dashboard/abc-analysis.ts`
2. Định nghĩa các type dùng chung:
   - `AbcGroup = "A" | "B" | "C"`
   - `RawAbcReport`
   - `AbcItem`
   - `AbcSummary`
   - `AbcAnalysisResponse`
   - `AbcDataQuality`
3. Thêm helper chuyển số an toàn cho các field Decimal/string/number:
   - `xuat`
   - `giaVat`
4. Thêm helper nhận diện flag text:
   - `kiemSoatDacBiet`
   - `isKeDon`
5. Thêm helper parse/sort `reportMonth` theo format `MM/YYYY`
6. Implement grouping key:
   - mapped: `masterDrugId`
   - unmapped: `facilityId + maNoiBo`
7. Với mỗi nhóm thuốc, cộng:
   - `totalQuantity`
   - `totalValue`
   - `facilityValueMap`
   - `periodPriceBreakdown`
   - `priceSet`
8. Tính:
   - `weightedAveragePrice`
   - `minPrice`
   - `maxPrice`
   - `pricePointCount`
   - `periodCount`
   - `facilityCount`
   - `topFacilityName`
9. Lọc `usageValue > 0` để xếp hạng ABC
10. Tính `percent`, `cumulativePercent`, `group` bằng `cumulativeBefore`
11. Tạo summary A/B/C trên toàn bộ danh sách hợp lệ
12. Tạo `paretoItems` top 50 sau khi xếp hạng
13. Tạo `specialDrugItems` từ các thuốc có `kiemSoatDacBiet`
14. Tạo `dataQuality`:
    - `zeroPriceWithConsumption`
    - `unmappedWithConsumption`
    - `negativeOrZeroValueRows`
    - `multiPriceDrugs`
15. Thêm option `limit`, mặc định 500, tối đa 2000, chỉ áp dụng sau khi summary đã tính xong

### Acceptance Criteria

- Route Admin và CSYT gọi cùng một hàm build ABC
- Summary không bị ảnh hưởng bởi `limit`
- Thuốc chưa ánh xạ không bị gộp nhầm giữa các CSYT
- Boundary A/B/C dùng `cumulativeBefore < 80`, `< 95`, còn lại C
- Không có logic auth hoặc Prisma trong helper

## Phase 2: Replace Analysis API Contract

### Objective

Cập nhật hai route `analysis` để query dữ liệu đúng scope rồi gọi shared engine.

### Tasks

1. Cập nhật Prisma select ở route Admin để lấy:
   - `facilityId`
   - `reportMonth`
   - `xuat`
   - `giaVat`
   - `drugMap.maNoiBo`
   - `drugMap.tenThuocNoiBo`
   - `drugMap.hoatChatNoiBo`
   - `drugMap.donViTinhNoiBo`
   - `drugMap.masterDrugId`
   - `drugMap.masterDrug.tenThuoc`
   - `drugMap.masterDrug.hoatChat`
   - `drugMap.masterDrug.hamLuong`
   - `drugMap.masterDrug.donViTinh`
   - `drugMap.masterDrug.nhomThuoc`
   - `drugMap.masterDrug.isKeDon`
   - `drugMap.masterDrug.kiemSoatDacBiet`
   - `facility.facilityName`
   - `facility.facilityType`
2. Cập nhật Prisma select tương tự cho route CSYT, giữ scope theo session facility
3. Parse query params:
   - `reportMonth`
   - `facilityId` chỉ ở Admin
   - `limit`
4. Gọi shared helper với scope:
   - `admin` cho route Admin
   - `facility` cho route CSYT
5. Bỏ `facilities` khỏi response `analysis` vì parent shell Admin đã có danh sách đơn vị cho bộ lọc chính
6. Bỏ `comparisonData` khỏi response mới
7. Trước khi xóa branch so sánh, chạy `rg "compareId|comparisonData"` để xác nhận không còn consumer ngoài `Tab4Analysis`
8. Xóa query param `compareId1/compareId2` và toàn bộ logic so sánh 2 cơ sở khỏi cả hai route
9. Đảm bảo status `401` và error handling hiện có được giữ nguyên

### Acceptance Criteria

- Admin tất cả đơn vị trả ABC toàn ngành
- Admin một đơn vị trả ABC của đơn vị đó
- CSYT không thể truyền `facilityId` để xem đơn vị khác
- Response route Admin và CSYT cùng shape ở các field ABC chính
- Không còn copy-paste thuật toán ABC trong hai route

## Phase 3: Define Typed UI Contract And Fetch State

### Objective

Chuẩn hóa dữ liệu trên `Tab4Analysis.tsx` trước khi rebuild giao diện.

### Tasks

1. Thay `any` bằng các interface cục bộ hoặc import type từ shared helper nếu phù hợp client-side
2. Đổi state data từ contract cũ:
   - `abcData`
   - `abcSummary`
   - `comparisonData`
   sang contract mới:
   - `summary`
   - `abcItems`
   - `paretoItems`
   - `specialDrugItems`
   - `dataQuality`
3. Thêm state UI:
   - `abcFilter`
   - `searchTerm`
   - `showSpecialOnly`
   - `showMultiPriceOnly`
   - `showUnmappedOnly`
   - `expandedDrugKey`
4. Thêm `retry` handler để gọi lại fetch khi API lỗi
5. Giữ dependency fetch theo:
   - `reportMonth`
   - `facilityId`
   - `apiPrefix`
6. Xóa toàn bộ state và handler so sánh cơ sở khỏi component:
   - `compareId1`
   - `compareId2`
   - `comparisonData`
   - `compareLoading`
   - `fetchComparison`
7. Xóa UI chọn 2 CSYT vì không thuộc phạm vi ABC redesign

### Acceptance Criteria

- Component không phụ thuộc vào field cũ `abcData`/`abcSummary`
- Loading, error, empty state dựa trên contract mới
- Filter bảng chạy client-side trên `abcItems` đã nhận

## Phase 4: Rebuild ABC Summary And Pareto Chart

### Objective

Đưa thông tin quan trọng nhất lên đầu tab theo đúng quy trình ABC.

### Tasks

1. Render 4 KPI tổng:
   - `Tổng giá trị tiêu thụ`
   - `Tổng số lượng tiêu thụ`
   - `Số mặt hàng ABC`
   - `Dòng bị loại/cần kiểm tra`
2. Render 3 thẻ nhóm A/B/C:
   - số thuốc
   - giá trị
   - `% giá trị`
   - `% số lượng`
3. Không dùng text cố định như `80% tổng giá trị sử dụng`
4. Thêm Pareto chart bằng Recharts:
   - `ComposedChart`
   - bar cho `totalValue`
   - line cho `cumulativePercent`
   - Y axis trái cho giá trị
   - Y axis phải cho phần trăm
   - reference line 80 và 95
5. Màu bar theo nhóm:
   - A: đỏ/rose
   - B: amber
   - C: emerald
6. Tooltip hiển thị:
   - tên thuốc
   - giá trị tiêu thụ
   - `% giá trị`
   - `% tích lũy`
   - hạng
7. Thêm empty state riêng khi `paretoItems` rỗng

### Acceptance Criteria

- Người dùng nhìn đầu tab là hiểu tổng giá trị, số lượng và tỷ trọng A/B/C thực tế
- Pareto chart không vẽ quá nhiều nhãn gây rối
- Chart render ổn khi chỉ có 1-2 thuốc hoặc không có dữ liệu

## Phase 5: Rebuild ABC Detail Table

### Objective

Tạo bảng chi tiết đủ các bước tính ABC và có filter tác nghiệp.

### Tasks

1. Render toolbar bảng:
   - segmented filter `Tất cả/A/B/C`
   - input tìm kiếm thuốc/hoạt chất
   - toggle `KSĐB`
   - toggle `Nhiều giá`
   - toggle `Chưa ánh xạ`
2. Render các cột:
   - `Xếp hạng`
   - `Tên thuốc`
   - `Hoạt chất`
   - `Hàm lượng`
   - `ĐVT`
   - `Số lượng tiêu thụ`
   - `Đơn giá bình quân`
   - `Khoảng giá`
   - `Giá trị tiêu thụ`
   - `% giá trị`
   - `% tích lũy`
   - `Hạng`
   - `Ghi chú`
3. Khi Admin đang xem toàn ngành, render thêm:
   - `Số CSYT`
   - `CSYT đóng góp lớn nhất`
4. Hiển thị badge:
   - `A/B/C`
   - `KSĐB`
   - `Kê đơn`
   - `Chưa ánh xạ`
   - `n mức giá`
5. Với dòng có `pricePointCount > 1` hoặc `priceBreakdown.length > 1`, thêm nút mở rộng
6. Row expansion hiển thị bảng nhỏ:
   - `Kỳ báo cáo`
   - `CSYT` chỉ khi Admin toàn ngành
   - `Số lượng`
   - `Đơn giá`
   - `Thành tiền`
7. Sắp xếp breakdown theo kỳ mới nhất trước, sau đó theo giá trị giảm dần
8. Giữ max-height và overflow để bảng lớn không làm trang quá dài
9. Cập nhật empty state theo filter đang active

### Acceptance Criteria

- Bảng có đủ số lượng, đơn giá, giá trị, `%`, tích lũy và hạng
- Thuốc nhiều giá có thể kiểm tra được giá theo từng kỳ
- Filter không làm mất thứ tự rank gốc
- Bảng vẫn dùng được trên mobile nhờ cuộn ngang

## Phase 6: Replace Special Monitoring And Role-Specific Sections

### Objective

Đổi phần cuối tab thành khu kiểm soát dữ liệu và hành động phù hợp từng role.

### Tasks

1. Tạo khối `Giám sát ABC`
2. Hiển thị các nhóm:
   - `Thuốc hạng A kiểm soát đặc biệt`
   - `Thuốc hạng A có nhiều mức giá`
   - `Dòng có xuất nhưng giá bằng 0`
   - `Thuốc chưa ánh xạ có phát sinh tiêu thụ`
3. Mỗi nhóm có count rõ ràng và danh sách rút gọn top items nếu có
4. CSYT:
   - bỏ hoàn toàn UI chọn 2 CSYT
   - chỉ hiển thị các cảnh báo trong phạm vi đơn vị
5. Admin:
   - ưu tiên cảnh báo toàn ngành
   - không hiển thị khối so sánh cơ cấu trong đợt ABC redesign
6. Xóa UI và route branch so sánh cơ sở liên quan để giảm nhiễu

### Acceptance Criteria

- CSYT không còn thấy form chọn 2 cơ sở
- Phần cuối tab giúp phát hiện dữ liệu cần xử lý, không chỉ liệt kê thuốc KSĐB
- Admin và CSYT khác nhau ở phạm vi và cột hiển thị, không khác công thức ABC

## Phase 7: Error, Empty, And Data Quality States

### Objective

Hoàn thiện các trạng thái biên để tab không gây hiểu nhầm khi dữ liệu thiếu.

### Tasks

1. Loading text: `Đang tính phân tích ABC...`
2. API error:
   - hiển thị message rõ
   - thêm nút `Tải lại`
3. Empty do không có report:
   - `Không có dữ liệu báo cáo cho phạm vi đã chọn`
4. Empty do có report nhưng không có `usageValue > 0`:
   - `Không có phát sinh tiêu thụ có giá trị để phân tích ABC`
5. Empty do filter client-side:
   - `Không có thuốc phù hợp với bộ lọc hiện tại`
6. Data quality counts vẫn hiển thị ngay cả khi `abcItems` rỗng

### Acceptance Criteria

- Người dùng phân biệt được thiếu báo cáo, thiếu phát sinh tiêu thụ, và filter không khớp
- Lỗi API không làm tab trắng
- Cảnh báo dữ liệu không bị ẩn khi không có ABC item hợp lệ

## Phase 8: Verification

### Objective

Kiểm tra công thức, phân quyền, UI và regression chính trước closeout.

### Tasks

1. Chạy lint cho các file thay đổi:
   - `npx eslint src/lib/dashboard/abc-analysis.ts src/app/api/admin/dashboard/analysis/route.ts src/app/api/facility/dashboard/analysis/route.ts src/components/dashboard/Tab4Analysis.tsx`
   - nếu tách component, thêm các file component mới vào lệnh
2. Chạy type-check:
   - `npx tsc --noEmit --pretty false`
3. Nếu repo sau này có test runner, thêm unit tests cho helper; trong đợt này tối thiểu kiểm bằng TypeScript và manual cases
4. Manual verification Admin:
   - `/dashboard/admin`
   - `Đơn vị = Tất cả`
   - `Kỳ báo cáo = Tất cả`
   - vào tab `Phân tích`
   - xác nhận summary A/B/C, Pareto, bảng và monitoring render
5. Manual verification Admin một đơn vị:
   - chọn một CSYT
   - xác nhận bảng không hiển thị sai `facilityCount` nếu không cần
   - xác nhận dữ liệu chỉ trong đơn vị đã chọn
6. Manual verification CSYT:
   - `/dashboard/facility`
   - tab `Phân tích`
   - xác nhận không có selector so sánh 2 CSYT
   - xác nhận cảnh báo ABC trong phạm vi đơn vị
7. Manual data cases:
   - thuốc một giá
   - thuốc nhiều giá
   - thuốc KSĐB hạng A
   - dòng `xuat > 0`, `giaVat = 0`
   - thuốc chưa ánh xạ
   - bộ lọc trả rỗng

### Acceptance Criteria

- Lint không báo lỗi ở file thay đổi
- Type-check pass hoặc ghi rõ lỗi tồn tại ngoài phạm vi nếu repo đang có lỗi sẵn
- Admin không xem sai dữ liệu khi đổi facility/month
- CSYT không rò dữ liệu facility khác
- Công thức ABC khớp spec đã duyệt

## Rollout Notes

- Thay đổi có thể triển khai trong một PR vì API và UI tab `Phân tích` phụ thuộc trực tiếp nhau.
- Nếu muốn giảm rủi ro, triển khai Phase 1 và Phase 2 trước, kiểm API payload thủ công, rồi mới rebuild UI.
- Không cần migration database.
- Không cần backfill dữ liệu.

## Success Criteria

- Tab `Phân tích` Admin và CSYT dùng shared engine `abc-analysis.ts`.
- Summary A/B/C tính trên toàn bộ dữ liệu đủ điều kiện.
- Bảng chi tiết có đủ các cột của quy trình ABC.
- Thuốc nhiều giá hiển thị giá bình quân gia quyền và breakdown.
- CSYT không còn khối so sánh 2 cơ sở.
- Có cảnh báo dữ liệu cho giá bằng 0, chưa ánh xạ, và dòng bị loại.
- Dashboard vẫn dùng được với `Tất cả các kỳ`, một kỳ cụ thể, tất cả đơn vị, và một đơn vị.
