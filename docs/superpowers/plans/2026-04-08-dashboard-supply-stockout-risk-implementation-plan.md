# Dashboard Supply Stockout Risk Implementation Plan

## Inputs

Plan này dựa trên:

- Spec đã chốt: [2026-04-08-dashboard-supply-stockout-risk-design.md](/opt/sudungthuoc/sudungthuoc/docs/superpowers/specs/2026-04-08-dashboard-supply-stockout-risk-design.md)
- UI tab `Cung ứng` hiện tại: [Tab2Supply.tsx](/opt/sudungthuoc/sudungthuoc/src/components/dashboard/Tab2Supply.tsx)
- API admin hiện tại: [route.ts](/opt/sudungthuoc/sudungthuoc/src/app/api/admin/dashboard/supply/route.ts)
- API facility hiện tại: [route.ts](/opt/sudungthuoc/sudungthuoc/src/app/api/facility/dashboard/supply/route.ts)

## Goal

Triển khai lại tab `Cung ứng` để:

- tách riêng `Đã hết hàng cuối kỳ` và `Nguy cơ đứt gãy`
- tính toàn tab theo một `effectiveReportMonth` duy nhất
- cho người dùng chọn tạm thời chuẩn nhu cầu `1 kỳ`, `TB 3 kỳ`, `TB 6 kỳ`
- đồng bộ logic giữa dashboard admin và facility

## Delivery Principles

- Không thay đổi schema Prisma
- Không thêm persisted preference cho người dùng
- Không để admin/facility copy-paste toàn bộ thuật toán cảnh báo
- Không trộn nhiều kỳ trong cùng một bảng cảnh báo
- Giữ route `supply` hiện có, chỉ mở rộng contract theo hướng tương thích
- Không sửa ngoài phạm vi tab `Cung ứng` trừ các helper dùng chung thật sự cần thiết

## Current Constraints

- Hai route `supply` đang có logic gần như giống nhau nhưng copy riêng
- Dữ liệu lịch sử nằm trong `inventory_reports` và được truy vấn trực tiếp trong route
- `reportMonth` đang là chuỗi `MM/YYYY`, nên cần sort/thao tác thời gian cẩn thận
- UI tab hiện chỉ có một bảng `Stockout Risk`, scatter plot, và gợi ý điều chuyển
- Repo hiện chưa có test runner ngoài `eslint`

## Target File Structure

### Runtime files

- `src/components/dashboard/Tab2Supply.tsx`
- `src/app/api/admin/dashboard/supply/route.ts`
- `src/app/api/facility/dashboard/supply/route.ts`
- `src/lib/dashboard/supply-risk.ts`

### Docs

- `docs/superpowers/specs/2026-04-08-dashboard-supply-stockout-risk-design.md`
- `docs/superpowers/plans/2026-04-08-dashboard-supply-stockout-risk-implementation-plan.md`

## Phase Breakdown

## Phase 1: Extract Shared Supply Risk Engine

### Objective

Tách phần chọn kỳ hiệu lực, gom lịch sử và tính cảnh báo khỏi route để admin và facility dùng chung đúng một engine.

### Tasks

1. Tạo module mới `src/lib/dashboard/supply-risk.ts`
2. Đưa vào module này các helper:
   - parse/sort `reportMonth`
   - chọn `effectiveReportMonth`
   - chuẩn hóa `demandWindow`
   - group dữ liệu theo `facilityId + mapId`
3. Định nghĩa kiểu dữ liệu trung gian:
   - report row tối thiểu cho supply dashboard
   - stockout actual row
   - stockout forecast row
   - transfer row
4. Tạo hàm dùng chung để:
   - lấy snapshot của `effectiveReportMonth`
   - lấy `N` kỳ gần nhất có bao gồm `effectiveReportMonth`
   - tính `demandAvg`
   - tính `monthsOfCover`

### Acceptance Criteria

- Có một nguồn logic duy nhất cho thuật toán cảnh báo
- Admin và facility chỉ khác phần auth/filter đầu vào, không khác công thức

## Phase 2: Redesign API Contract For Supply Tab

### Objective

Mở rộng hai route `supply` để trả đúng cấu trúc phục vụ hai bảng cảnh báo mới và bộ chọn chuẩn nhu cầu.

### Tasks

1. Thêm query param `demandWindow=1|3|6`, mặc định `3`
2. Ở cả hai route:
   - resolve `effectiveReportMonth`
   - nếu `reportMonth` cụ thể được truyền vào thì dùng kỳ đó
   - nếu `reportMonth` không có hoặc là trạng thái "tất cả", chọn kỳ mới nhất trong phạm vi lọc
3. Trả các field mới:
   - `effectiveReportMonth`
   - `demandWindow`
   - `stockoutActual`
   - `stockoutForecast`
4. Thay logic `stockoutRisk` cũ bằng:
   - `stockoutActual`: `currentTonCuoi = 0 && demandAvg > 0`
   - `stockoutForecast`: `currentTonCuoi > 0 && demandAvg > 0 && monthsOfCover < 3`
5. Gắn `severity` cho forecast:
   - `danger` `< 1`
   - `warning` `1 đến < 2`
   - `watch` `2 đến < 3`
6. Sắp xếp:
   - `stockoutActual`: giảm dần `demandAvg`, rồi `currentXuat`
   - `stockoutForecast`: `danger -> warning -> watch`, rồi tăng dần `monthsOfCover`

### Notes

- `stockoutRisk` có thể tạm thời giữ lại một release nếu muốn tránh gãy contract cũ, nhưng UI mới nên chuyển sang dùng `stockoutActual` và `stockoutForecast`
- Nếu giữ field cũ tạm thời, nó phải chỉ là alias rõ ràng chứ không giữ logic cũ

### Acceptance Criteria

- API admin và facility trả cùng shape dữ liệu mới
- `Tất cả các kỳ` luôn quy về một `effectiveReportMonth` xác định được
- Không còn bảng cảnh báo nào dựa trên dữ liệu trộn nhiều kỳ

## Phase 3: Align Scatter Plot And Transfer Analysis

### Objective

Đồng bộ toàn tab `Cung ứng` theo cùng kỳ dữ liệu và cùng chuẩn nhu cầu.

### Tasks

1. Buộc `scatterData` dùng snapshot của `effectiveReportMonth`
2. Điều chỉnh `transferData` để:
   - lấy `tonCuoi` từ `effectiveReportMonth`
   - lấy `demandAvg` từ cùng `demandWindow`
3. Thay logic thừa/thiếu hiện tại:
   - `surplus`: dựa trên `monthsOfCover > 3`
   - `shortage`: dựa trên `currentTonCuoi = 0 && demandAvg > 0`
4. Giữ `hoatChatList` như hiện tại, không mở rộng scope sang fuzzy search hoặc async suggestions

### Acceptance Criteria

- Toàn bộ tab `Cung ứng` dùng cùng một ngữ cảnh kỳ dữ liệu
- Gợi ý điều chuyển không còn dùng một công thức nhu cầu khác với cảnh báo đứt gãy

## Phase 4: Rebuild Tab2Supply UI

### Objective

Đổi UI từ một bảng cảnh báo duy nhất sang bộ điều khiển + hai bảng rõ nghĩa theo spec.

### Tasks

1. Thêm state `demandWindow` trong [Tab2Supply.tsx](/opt/sudungthuoc/sudungthuoc/src/components/dashboard/Tab2Supply.tsx)
2. Gửi `demandWindow` vào các request fetch của tab
3. Thêm khối điều khiển đầu tab:
   - select `1 kỳ gần nhất`
   - select `TB 3 kỳ gần nhất`
   - select `TB 6 kỳ gần nhất`
   - dòng mô tả `Đang tính theo kỳ ...`
4. Đổi bảng cũ `Cảnh báo đứt gãy` thành `Đã hết hàng cuối kỳ`
5. Thêm bảng mới `Nguy cơ đứt gãy`
6. Hiển thị các cột mới:
   - actual: `Xuất kỳ hiện tại`, `Nhu cầu bình quân`
   - forecast: `Tồn cuối`, `Nhu cầu bình quân`, `Số tháng đủ dùng`, `Mức độ`
7. Thêm badge/severity color cho `danger`, `warning`, `watch`
8. Cập nhật empty-state text cho từng bảng để phản ánh đúng nghiệp vụ

### Acceptance Criteria

- Người dùng nhìn UI là phân biệt được "đã hết hàng" và "nguy cơ thiếu"
- Bộ chọn chuẩn nhu cầu tác động trực tiếp lên cả hai bảng
- Khi đổi filter `Kỳ báo cáo`, UI hiển thị đúng `effectiveReportMonth`

## Phase 5: Verification And Rollout Safety

### Objective

Xác nhận logic mới đúng nghiệp vụ, không làm gãy dashboard hiện có, và dễ closeout.

### Tasks

1. Chạy `eslint` cho các file thay đổi
2. Kiểm tra bằng tay với các case tối thiểu:
   - `reportMonth` cụ thể
   - `Tất cả các kỳ`
   - `demandWindow = 1`
   - `demandWindow = 3`
   - `demandWindow = 6`
3. Kiểm tra 4 hành vi cốt lõi:
   - `currentTonCuoi = 0`, `demandAvg > 0` -> vào `stockoutActual`
   - `monthsOfCover < 1` -> forecast `danger`
   - `1 <= monthsOfCover < 2` -> forecast `warning`
   - `2 <= monthsOfCover < 3` -> forecast `watch`
4. Kiểm tra cả dashboard admin và facility để tránh lệch logic
5. Ghi rõ trong closeout nếu còn giới hạn dữ liệu lịch sử:
   - thiếu kỳ lịch sử
   - thiếu mapping `masterDrug`
   - `xuat = 0` liên tục làm `demandAvg = 0`

### Manual Verification Checklist

1. Mở `/dashboard/admin`
2. Vào tab `Cung ứng`
3. Để `Tất cả các kỳ`, xác nhận UI hiển thị đang tính theo kỳ mới nhất
4. Chuyển `demandWindow` giữa `1`, `3`, `6`, xác nhận số liệu thay đổi
5. Chọn một kỳ cụ thể, xác nhận `effectiveReportMonth` khớp kỳ đó
6. Kiểm tra một thuốc có `tonCuoi = 0` không xuất hiện ở bảng forecast
7. Kiểm tra một thuốc có `tonCuoi > 0` nhưng `monthsOfCover < 3` xuất hiện ở forecast với mức đúng
8. Lặp lại tối thiểu một lượt ở `/dashboard/facility`

## Risks And Mitigations

- Risk: Sort `MM/YYYY` sai nếu so chuỗi trực tiếp
  - Mitigation: dùng helper parse/sort tập trung trong module shared
- Risk: Thiếu lịch sử làm `demandAvg` thấp hoặc méo
  - Mitigation: tính trên số kỳ thực có và hiển thị rõ chuẩn nhu cầu đang dùng
- Risk: UI cũ và API mới lệch contract trong quá trình refactor
  - Mitigation: tách phase API trước, rồi đổi UI dùng field mới trong cùng rollout
- Risk: Admin và facility drift logic sau này
  - Mitigation: đưa phần tính toán vào shared lib thay vì giữ 2 route tự xử lý riêng

## Success Criteria

- Tab `Cung ứng` không còn dùng logic `tonCuoi = 0 && xuat > 0` như định nghĩa duy nhất của "đứt gãy"
- `Tất cả các kỳ` luôn quy về kỳ mới nhất để tính
- Người dùng chọn được chuẩn nhu cầu tạm thời ngay trên tab
- Có hai bảng rõ nghĩa:
  - `Đã hết hàng cuối kỳ`
  - `Nguy cơ đứt gãy`
- Admin và facility dùng cùng thuật toán và cùng cách hiển thị
