# Dashboard Supply Additive Expansion Implementation Plan

## Inputs

Plan này dựa trên:

- Spec additive đã chốt: [2026-04-08-dashboard-supply-additive-expansion-design.md](/opt/sudungthuoc/sudungthuoc/docs/superpowers/specs/2026-04-08-dashboard-supply-additive-expansion-design.md)
- Spec risk engine đã triển khai: [2026-04-08-dashboard-supply-stockout-risk-design.md](/opt/sudungthuoc/sudungthuoc/docs/superpowers/specs/2026-04-08-dashboard-supply-stockout-risk-design.md)
- UI tab `Cung ứng` hiện tại: [Tab2Supply.tsx](/opt/sudungthuoc/sudungthuoc/src/components/dashboard/Tab2Supply.tsx)
- Shared supply engine hiện tại: [supply-risk.ts](/opt/sudungthuoc/sudungthuoc/src/lib/dashboard/supply-risk.ts)
- API admin hiện tại: [route.ts](/opt/sudungthuoc/sudungthuoc/src/app/api/admin/dashboard/supply/route.ts)
- API facility hiện tại: [route.ts](/opt/sudungthuoc/sudungthuoc/src/app/api/facility/dashboard/supply/route.ts)

## Goal

Mở rộng tab `Cung ứng` theo hướng additive để:

- giữ nguyên các block cung ứng hiện có
- bổ sung dải KPI tổng quan dùng chung cho admin và facility
- bổ sung các phân tích theo giá trị tồn, giá trị rủi ro, hợp đồng, nhà cung cấp
- ưu tiên góc nhìn điều hành toàn hệ thống cho `admin`
- cung cấp góc nhìn tác nghiệp theo từng cơ sở cho `facility`

## Delivery Principles

- Không thay đổi schema Prisma
- Không bỏ hoặc thay thế bất kỳ block `Cung ứng` hiện tại nào
- Không thay đổi logic `effectiveReportMonth` và `demandWindow` đã chốt
- Không làm admin/facility copy-paste toàn bộ thuật toán phân tích
- Ưu tiên tái sử dụng route `supply` hiện có theo contract additive
- Tất cả block mới phải degrade an toàn khi dữ liệu thiếu
- Không lấy các bảng LCNT làm nguồn chính ở phase đầu

## Current Constraints

- `inventory_reports` mới có `3` kỳ dữ liệu và `3` cơ sở có báo cáo tồn kho
- Dữ liệu rất tốt cho:
  - `gia_vat`
  - `thanh_tien_ton_cuoi`
  - `so_qd_trung_thau`
  - `ten_cong_ty`
  - `ngay_bat_dau_hd`
  - `ngay_ket_thuc_hd`
- Dữ liệu `master_drugs` còn mỏng ở:
  - `is_trong_nuoc`
  - `nhom_thuoc`
  - `nhom_dieu_tri`
- `Tab2Supply.tsx` hiện đã là file lớn; nếu tiếp tục mở rộng trong cùng file sẽ khó bảo trì
- Facility route không có dữ liệu liên-cơ-sở, nên các block admin-only phải được tách rõ ở cả API lẫn UI

## Target File Structure

### Runtime files

- `src/components/dashboard/Tab2Supply.tsx`
- `src/components/dashboard/DashboardShell.tsx`
- `src/components/dashboard/FacilityDashboardShell.tsx`
- `src/components/dashboard/supply/SupplySummaryCards.tsx`
- `src/components/dashboard/supply/SupplyValueSections.tsx`
- `src/components/dashboard/supply/SupplyContractSections.tsx`
- `src/components/dashboard/supply/SupplyCoverageSection.tsx`
- `src/app/api/admin/dashboard/supply/route.ts`
- `src/app/api/facility/dashboard/supply/route.ts`
- `src/lib/dashboard/supply-risk.ts`
- `src/lib/dashboard/supply-insights.ts`

### Docs

- `docs/superpowers/specs/2026-04-08-dashboard-supply-additive-expansion-design.md`
- `docs/superpowers/plans/2026-04-08-dashboard-supply-additive-expansion-implementation-plan.md`

## Phase Breakdown

## Phase 1: Extend Shared Supply Domain Model

### Objective

Bổ sung lớp dữ liệu dùng chung để route `supply` có thể trả thêm các section additive mà không phá contract cũ.

### Tasks

1. Tạo module mới `src/lib/dashboard/supply-insights.ts`
2. Định nghĩa các kiểu dữ liệu dùng chung:
   - `SupplySummaryMetrics`
   - `SupplyValueRiskRow`
   - `SupplyContractRiskRow`
   - `SupplySupplierDependencyRow`
   - `SupplyDataCoverage`
3. Mở rộng normalized report row để mang thêm:
   - `giaVat`
   - `thanhTienTonCuoi`
   - `soQdTrungThau`
   - `tenCongTy`
   - `ngayBatDauHd`
   - `ngayKetThucHd`
   - `bhyt`
4. Thêm helper parse ngày hợp đồng theo format `YYYYMMDD`
5. Tạo các hàm dùng chung để tính:
   - `endingInventoryValue`
   - `exportValue`
   - `deadStockCount`
   - `contractExpiringCount`
   - `topOverstockByValue`
   - `topShortageByRiskValue`
   - `contractRiskRows`
   - `supplierDependencyRows`
6. Đảm bảo shared engine vẫn dùng chung `effectiveReportMonth` và `demandWindow`

### Acceptance Criteria

- Mọi công thức mới nằm ở shared lib, không nằm rải rác trong route hoặc component
- Shared model đủ để admin và facility cùng tái dùng, chỉ khác phạm vi dữ liệu

## Phase 2: Expand Supply API Contract Additively

### Objective

Mở rộng hai route `supply` để trả thêm các section mới mà không làm gãy UI hiện tại.

### Tasks

1. Mở rộng Prisma select ở cả hai route để lấy thêm các field giá trị và hợp đồng
2. Ở admin route:
   - query thêm tổng số cơ sở active để phục vụ `Độ phủ dữ liệu`
   - chuẩn bị data coverage cho `effectiveReportMonth`
3. Ở facility route:
   - chỉ trả các block có ý nghĩa trong phạm vi một cơ sở
   - trả `null` hoặc mảng rỗng cho block admin-only theo contract rõ ràng
4. Trả các field mới từ route `supply`:
   - `summaryMetrics`
   - `topOverstockByValue`
   - `topShortageByRiskValue`
   - `contractRisk`
   - `supplierDependency`
   - `dataCoverage`
5. Giữ nguyên các field cũ đang dùng:
   - `effectiveReportMonth`
   - `demandWindow`
   - `stockoutActual`
   - `stockoutForecast`
   - `scatterData`
   - `deadStockData`
   - `transferData`

### Notes

- Route admin và facility nên cùng shape ở mức cao nhất có thể
- Block admin-only có thể trả `null` ở facility nếu UI đã role-gated rõ ràng
- Không nên tạo route rời ở phase này trừ khi payload thực tế quá lớn

### Acceptance Criteria

- UI hiện tại vẫn render được ngay cả khi chưa dùng các field mới
- Route `supply` trở thành một nguồn dữ liệu duy nhất cho toàn tab `Cung ứng`

## Phase 3: Add Shared KPI Band And Value-Risk Sections

### Objective

Đưa vào các block additive có giá trị cao nhất trước, dựa trên dữ liệu `inventory_reports` đã có độ phủ tốt.

### Tasks

1. Tạo component `SupplySummaryCards.tsx`
2. Hiển thị các KPI:
   - `Giá trị tồn cuối`
   - `Giá trị xuất`
   - `Số thuốc hết hàng`
   - `Số thuốc dưới 1 tháng`
   - `Số thuốc tồn không nhu cầu`
   - `Số thuốc hợp đồng sắp hết`
3. Tạo component `SupplyValueSections.tsx`
4. Hiển thị:
   - `Top tồn giá trị cao nhưng độ phủ lớn`
   - `Top thuốc nguy cơ thiếu theo giá trị`
5. Với facility:
   - `Top tồn giá trị cao` dùng cùng công thức nhưng trong phạm vi cơ sở
   - `Danh sách thuốc cần ưu tiên mua bổ sung` dùng cùng công thức thiếu theo giá trị nhưng trong phạm vi cơ sở
6. Đặt dải KPI ở đầu tab, nhưng giữ nguyên thứ tự các block cung ứng cũ phía dưới

### Acceptance Criteria

- Người dùng vẫn nhìn thấy block cũ đúng vị trí quen thuộc
- Dải KPI và 2 section theo giá trị xuất hiện theo đúng role và đúng kỳ hiệu lực

## Phase 4: Add Contract And Supplier Insights

### Objective

Khai thác lớp dữ liệu hợp đồng và nhà cung cấp đã có độ phủ cao trong `inventory_reports`.

### Tasks

1. Tạo component `SupplyContractSections.tsx`
2. Hiển thị bảng `Rủi ro hợp đồng sắp hết` với bucket:
   - `Đã hết hạn`
   - `<= 30 ngày`
   - `31-60 ngày`
   - `61-90 ngày`
3. Chỉ đưa vào các dòng có `demandAvg > 0`
4. Hiển thị cột:
   - `cơ sở` cho admin
   - không hiện `cơ sở` cho facility
5. Thêm bảng hoặc card `Phụ thuộc nhà cung cấp`
6. Với facility:
   - đổi phần này thành `Cơ cấu nhà cung cấp của cơ sở`
   - không hiện so sánh toàn hệ thống

### Acceptance Criteria

- Admin nhìn được hợp đồng nào sắp gãy và nhà cung cấp nào đang chi phối rủi ro
- Facility nhìn được hợp đồng và nhà cung cấp trong phạm vi cơ sở của mình

## Phase 5: Add Admin-Only Coordination And Data Coverage Sections

### Objective

Bổ sung các khối chỉ dành cho admin để tab `Cung ứng` trở thành dashboard điều hành toàn hệ thống.

### Tasks

1. Mở rộng `Gợi ý điều chuyển` hiện tại thành khối admin-only nâng cao:
   - nhìn theo hoạt chất hoặc thuốc chuẩn hóa
   - thể hiện cơ sở dư và cơ sở thiếu
   - cho thấy `monthsOfCover` trước điều phối
2. Tạo component `SupplyCoverageSection.tsx`
3. Hiển thị `Độ phủ dữ liệu báo cáo`:
   - `Số cơ sở có dữ liệu kỳ này / tổng cơ sở active`
   - `Số dòng có giá`
   - `Số dòng có thông tin hợp đồng`
   - `Số dòng map được master drug`
   - `Số dòng có phân loại nội/ngoại`
4. Nếu coverage của dimension nào thấp, hiện badge `Độ phủ dữ liệu thấp`
5. Ẩn hoàn toàn các block này ở facility

### Acceptance Criteria

- Admin có thể đọc tab `Cung ứng` như một control tower toàn hệ thống
- Facility không nhìn thấy các block không liên quan đến phạm vi một cơ sở

## Phase 6: Refactor Tab2Supply Composition

### Objective

Giữ `Tab2Supply` ở mức có thể bảo trì khi số block tăng lên.

### Tasks

1. Tách các block mới ra component con trong `src/components/dashboard/supply/`
2. Giữ `Tab2Supply.tsx` vai trò:
   - fetch dữ liệu
   - giữ state chung
   - điều phối role-based rendering
3. Truyền role rõ ràng vào `Tab2Supply`:
   - khuyến nghị thêm prop `scope: "admin" | "facility"`
   - cập nhật [DashboardShell.tsx](/opt/sudungthuoc/sudungthuoc/src/components/dashboard/DashboardShell.tsx) và [FacilityDashboardShell.tsx](/opt/sudungthuoc/sudungthuoc/src/components/dashboard/FacilityDashboardShell.tsx)
4. Giữ nguyên thứ tự hiển thị khối cũ; chèn khối mới theo layout additive:
   - KPI band
   - block cũ
   - block mới theo role

### Acceptance Criteria

- `Tab2Supply` không phình thành file khó bảo trì
- Role gating không dựa vào suy luận mơ hồ từ `apiPrefix`

## Phase 7: Verification And Rollout Safety

### Objective

Đảm bảo rollout additive không làm gãy tab `Cung ứng` hiện có và không gây diễn giải sai vì dữ liệu mỏng.

### Tasks

1. Chạy `eslint` cho các file thay đổi
2. Chạy `npm run build`
3. Kiểm tra bằng tay ở `/dashboard/admin`:
   - dải KPI xuất hiện
   - block cũ vẫn còn nguyên
   - `Top tồn giá trị cao`
   - `Top thiếu theo giá trị`
   - `Rủi ro hợp đồng`
   - `Nhà cung cấp`
   - `Độ phủ dữ liệu`
4. Kiểm tra bằng tay ở `/dashboard/facility`:
   - block cũ vẫn còn nguyên
   - chỉ hiện các block facility-approved
   - không hiện block admin-only
5. Kiểm tra với:
   - `reportMonth` cụ thể
   - `Tất cả các kỳ`
   - `demandWindow = 1`
   - `demandWindow = 3`
   - `demandWindow = 6`
6. Kiểm tra các edge case:
   - `ngayKetThucHd` trống hoặc sai format
   - `giaVat = 0`
   - `thanhTienTonCuoi = 0`
   - `demandAvg = 0`
7. Ghi rõ trong closeout nếu có block đang ẩn vì coverage thấp

### Manual Verification Checklist

1. Mở `/dashboard/admin`
2. Vào tab `Cung ứng`
3. Xác nhận các block cũ vẫn còn nguyên
4. Xác nhận dải KPI nằm ở đầu tab và dùng cùng `effectiveReportMonth`
5. Chuyển `demandWindow`, xác nhận các block dùng nhu cầu thay đổi đồng bộ
6. Kiểm tra `Top tồn giá trị cao` và `Top thiếu theo giá trị` có số liệu hợp lý
7. Kiểm tra một dòng hợp đồng sắp hết hiển thị đúng bucket ngày
8. Kiểm tra `Độ phủ dữ liệu` khớp thực tế dữ liệu tháng đang xem
9. Mở `/dashboard/facility`
10. Xác nhận không có block admin-only

## Risks And Mitigations

- Risk: Payload route `supply` phình lớn khi nhét thêm nhiều block
  - Mitigation: phase đầu vẫn dùng một route; nếu payload lớn thực tế thì tách sau theo block nặng
- Risk: Dữ liệu chỉ có 3 kỳ và 3 cơ sở có báo cáo làm admin hiểu sai phạm vi dashboard
  - Mitigation: thêm `Độ phủ dữ liệu báo cáo` ở admin và hiển thị rõ `effectiveReportMonth`
- Risk: Date hợp đồng dùng string `YYYYMMDD` có thể lỗi format
  - Mitigation: parse tập trung trong shared helper và bỏ qua an toàn khi parse fail
- Risk: `Tab2Supply.tsx` trở nên quá lớn và khó sửa tiếp
  - Mitigation: tách component con ngay ở phase UI đầu tiên
- Risk: Facility thấy các block không phù hợp vai trò
  - Mitigation: role gating rõ bằng prop `scope`, không dựa vào text hoặc URL heuristic

## Success Criteria

- Các dashboard `Cung ứng` hiện tại vẫn còn nguyên
- Tab `Cung ứng` có thêm dải KPI tổng quan và các block additive theo spec
- Admin nhìn được:
  - thiếu ở đâu
  - dư ở đâu
  - vốn tồn nằm ở đâu
  - hợp đồng nào sắp gãy
  - nhà cung cấp nào đang chi phối
  - dữ liệu hệ thống đang phủ tới đâu
- Facility nhìn được:
  - thuốc nào sắp thiếu
  - thuốc nào tồn bất hợp lý
  - hợp đồng nào sắp hết
  - thuốc nào cần ưu tiên mua bổ sung
- Toàn bộ rollout build được và không làm regression các block cung ứng cũ
