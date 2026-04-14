# Mua Sam Thong Ke Package Status Milestones Implementation Plan

## Inputs

Plan này dựa trên:

- Spec đã chốt: [2026-04-14-mua-sam-thong-ke-package-status-milestones-design.md](/opt/sudungthuoc/sudungthuoc/docs/superpowers/specs/2026-04-14-mua-sam-thong-ke-package-status-milestones-design.md)
- API admin hiện tại: [route.ts](/opt/sudungthuoc/sudungthuoc/src/app/api/admin/mua-sam/thong-ke/route.ts)
- API facility hiện tại: [route.ts](/opt/sudungthuoc/sudungthuoc/src/app/api/facility/mua-sam/thong-ke/route.ts)
- UI admin hiện tại: [AdminMuaSamThongKe.tsx](/opt/sudungthuoc/sudungthuoc/src/components/mua-sam/AdminMuaSamThongKe.tsx)
- UI facility hiện tại: [FacilityMuaSamThongKe.tsx](/opt/sudungthuoc/sudungthuoc/src/components/mua-sam/FacilityMuaSamThongKe.tsx)

## Goal

Triển khai lại card `Trạng thái gói thầu` trên trang `Thống kê` để:

- chỉ tính `gói thầu` thuộc `quyTrinh = 1`
- suy trạng thái theo mốc nghiệp vụ thực tế thay vì `goiThau.trangThai`
- chia trạng thái loại trừ nhau thành:
  - `Chưa có TBMT`
  - `Đã có TBMT chưa có KQLCNT`
  - `Đã có KQLCNT`
- cho phép người dùng xem danh sách gói thầu phía sau từng cột, kèm `kế hoạch`, `TBMT`, `KQLCNT`

## Delivery Principles

- Không thay đổi schema Prisma
- Không đổi logic của các KPI và chart khác ngoài card `Trạng thái gói thầu`
- Không tính `quyTrinh = 2` vào chart này
- Không dùng `goiThau.trangThai` cho chart trạng thái mới
- Dùng chung một logic phân loại cho admin và facility để tránh lệch số
- Giữ contract API hiện có tương thích tối đa, chỉ thay `statusData` và bổ sung `statusBreakdown`

## Current Constraints

- Hai route `thong-ke` hiện đang tự đếm `statusData` theo `goiThau.trangThai`
- Hai component `AdminMuaSamThongKe` và `FacilityMuaSamThongKe` đang render chart tổng hợp đơn thuần, chưa có drill-down
- Admin và facility có shape dữ liệu thống kê khác nhau ở các chart khác, nên không nên mở rộng refactor sang shared page/component toàn bộ trong lượt này
- Worktree hiện đang có nhiều thay đổi không liên quan, nên rollout nên giữ thay đổi thật tập trung

## Target File Structure

### Runtime files

- `src/app/api/admin/mua-sam/thong-ke/route.ts`
- `src/app/api/facility/mua-sam/thong-ke/route.ts`
- `src/components/mua-sam/AdminMuaSamThongKe.tsx`
- `src/components/mua-sam/FacilityMuaSamThongKe.tsx`
- `src/lib/mua-sam-package-status.ts`

### Docs

- `docs/superpowers/specs/2026-04-14-mua-sam-thong-ke-package-status-milestones-design.md`
- `docs/superpowers/plans/2026-04-14-mua-sam-thong-ke-package-status-milestones-implementation-plan.md`

## Phase Breakdown

## Phase 1: Extract Shared Package Status Classifier

### Objective

Tạo một nguồn logic duy nhất để phân loại trạng thái gói thầu theo mốc nghiệp vụ thực tế.

### Tasks

1. Tạo module mới `src/lib/mua-sam-package-status.ts`
2. Định nghĩa type đầu vào tối thiểu cho một `gói thầu` dùng cho thống kê trạng thái:
   - `goiThauId`
   - `tenGoiThau`
   - `keHoachId`
   - `tenKHLCNT`
   - `maKHLCNT`
   - `quyTrinh`
   - optional `facilityId`
   - optional `facilityName`
   - `tbmtCount`
   - `kqlcntCount`
3. Định nghĩa enum hoặc literal union cho 3 trạng thái:
   - `chuaCoTbmt`
   - `daCoTbmtChuaCoKqlcnt`
   - `daCoKqlcnt`
4. Tạo helper classify:
   - loại bỏ `quyTrinh !== 1`
   - nếu `kqlcntCount > 0` -> `daCoKqlcnt`
   - else nếu `tbmtCount > 0` -> `daCoTbmtChuaCoKqlcnt`
   - else -> `chuaCoTbmt`
5. Tạo helper aggregate:
   - build `statusData` theo đúng thứ tự hiển thị
   - build `statusBreakdown`
   - build tổng số `gói thầu` quy trình 1 đang được thống kê nếu UI cần hiển thị phụ trợ

### Acceptance Criteria

- Admin và facility có thể dùng cùng một helper để sinh `statusData`
- `quyTrinh = 2` bị loại bỏ tại cùng một điểm logic
- Một `gói thầu` chỉ rơi vào đúng một bucket trạng thái

## Phase 2: Update Statistics APIs

### Objective

Đổi nguồn dữ liệu của card trạng thái trong hai route `thong-ke`, nhưng không làm ảnh hưởng contract của các chart khác.

### Tasks

1. Trong route admin:
   - mở rộng query `goiThau.findMany` để lấy thêm:
     - `keHoach.id`
     - `keHoach.tenKHLCNT`
     - `keHoach.maKHLCNT`
     - `keHoach.quyTrinh`
     - `keHoach.facility.id`
     - `keHoach.facility.facilityName`
     - `thongBaoMoiThaus`
     - `ketQuaLCNTs`
2. Trong route facility:
   - mở rộng query `goiThau.findMany` để lấy thêm:
     - `keHoach.id`
     - `keHoach.tenKHLCNT`
     - `keHoach.maKHLCNT`
     - `keHoach.quyTrinh`
     - `thongBaoMoiThaus`
     - `ketQuaLCNTs`
3. Chuẩn hóa dữ liệu query sang input của shared helper
4. Thay logic `statusMap` cũ bằng shared helper
5. Trả ra:
   - `statusData`
   - `statusBreakdown`
   - `statusSummary.totalTrackedPackages`
6. Giữ nguyên các field khác:
   - admin: `kpis`, `pieHinhThuc`, `topFacilities`, `bidRateByFacility`, `trendData`, `pieQuyTrinh`
   - facility: `kpis`, `pieHinhThuc`, `valueByKeHoach`, `bidData`, `pieQuyTrinh`, `timeline`

### Notes

- `statusData` phải luôn có đủ 3 phần tử kể cả khi toàn bộ giá trị bằng `0`
- `statusBreakdown` nên luôn trả đủ 3 key để frontend không cần defensive branching phức tạp
- `tbmtCount` và `kqlcntCount` được dùng để hiển thị chi tiết, nhưng số cột chart vẫn đếm theo số `gói thầu`

### Acceptance Criteria

- Hai route trả `statusData` mới theo mốc nghiệp vụ thật
- Hai route trả thêm `statusBreakdown` cùng semantics
- Không chart nào khác bị đổi dữ liệu hoặc đổi tên field

## Phase 3: Rebuild Status Chart Card UI

### Objective

Giữ nguyên layout tổng thể của trang `Thống kê`, nhưng biến card `Trạng thái gói thầu` thành chart có drill-down.

### Tasks

1. Trong `AdminMuaSamThongKe.tsx` và `FacilityMuaSamThongKe.tsx`:
   - đọc thêm `statusBreakdown`
   - thêm state `selectedStatusKey`
2. Đổi subtitle card thành:
   - `Phân loại theo tiến độ nghiệp vụ thực tế của gói thầu quy trình 1`
3. Giữ bar chart hiện tại, nhưng thêm tương tác click trên từng bar:
   - click chọn trạng thái
   - click lại bỏ chọn
4. Thêm panel chi tiết ngay dưới chart:
   - khi chưa chọn: hiển thị tổng số gói đang được tính và ghi chú chỉ gồm `quyTrinh = 1`
   - khi đã chọn: hiển thị bảng chi tiết theo bucket tương ứng
5. Bảng chi tiết facility có các cột:
   - `Tên gói thầu`
   - `Kế hoạch`
   - `TBMT`
   - `KQLCNT`
6. Bảng chi tiết admin có các cột:
   - `Cơ sở`
   - `Tên gói thầu`
   - `Kế hoạch`
   - `TBMT`
   - `KQLCNT`
7. Chuẩn hóa hiển thị:
   - `Kế hoạch`: `tenKHLCNT` fallback `maKHLCNT`, fallback `—`
   - `TBMT`: `Chưa có` hoặc `Đã có (n)`
   - `KQLCNT`: `Chưa có` hoặc `Đã có (n)`
8. Thêm empty states:
   - không có `quyTrinh = 1`
   - bucket được chọn nhưng rỗng

### Acceptance Criteria

- Người dùng nhìn chart hiểu được đây là trạng thái theo mốc nghiệp vụ, không phải `trangThai` lưu tay
- Người dùng có thể truy ra từng `gói thầu` phía sau mỗi cột
- Card vẫn hoạt động ổn ở cả admin và facility

## Phase 4: Verification And Regression Guardrails

### Objective

Xác nhận số liệu mới đúng nghiệp vụ và không làm gãy các phần còn lại của trang `Thống kê`.

### Tasks

1. Chạy `eslint` cho các file thay đổi nếu cấu hình repo cho phép
2. Kiểm tra tay cho route facility:
   - có gói `quyTrinh = 1` chưa có `TBMT`
   - có gói `quyTrinh = 1` có `TBMT` nhưng chưa có `KQLCNT`
   - có gói `quyTrinh = 1` đã có `KQLCNT`
3. Kiểm tra tay cho route admin:
   - cùng bộ case trên nhưng ở phạm vi toàn hệ thống
   - xác nhận có cột `Cơ sở` trong breakdown
4. Kiểm tra `quyTrinh = 2`:
   - không xuất hiện trong bất kỳ bucket nào
   - không làm tăng tổng số gói theo dõi
5. Kiểm tra click interaction:
   - chọn từng cột
   - đổi qua cột khác
   - click lại để clear selection
6. Kiểm tra các chart khác trên trang vẫn render bình thường

### Manual Verification Checklist

1. Mở `/dashboard/facility/mua-sam/thong-ke`
2. Xác nhận card `Trạng thái gói thầu` có subtitle mới
3. Chọn cột `Chưa có TBMT`, xác nhận danh sách chỉ gồm gói quy trình 1 chưa có `TBMT`
4. Chọn cột `Đã có TBMT chưa có KQLCNT`, xác nhận mỗi dòng có `TBMT > 0` và `KQLCNT = 0`
5. Chọn cột `Đã có KQLCNT`, xác nhận mỗi dòng có `KQLCNT > 0`
6. Mở `/dashboard/admin/mua-sam/thong-ke`
7. Lặp lại 3 trạng thái trên và xác nhận có thêm thông tin `Cơ sở`
8. Kiểm tra một gói thuộc `quyTrinh = 2` không xuất hiện trong bảng chi tiết nào

## Risks And Mitigations

- Risk: Admin và facility lệch logic phân loại
  - Mitigation: đưa toàn bộ classify/aggregate vào shared helper `src/lib/mua-sam-package-status.ts`
- Risk: Một `gói thầu` có nhiều `TBMT` hoặc nhiều `KQLCNT` làm đếm sai
  - Mitigation: chart đếm theo số `gói thầu`, chỉ hiển thị `tbmtCount`/`kqlcntCount` ở bảng chi tiết
- Risk: UI chart click khó thực hiện trực tiếp với Recharts hiện tại
  - Mitigation: gắn `onClick` ở bar hoặc fallback sang legend/list button ngay trong card nếu interaction của bar không ổn định
- Risk: Không có dữ liệu `quyTrinh = 1` làm card trống gây hiểu nhầm
  - Mitigation: thêm empty state rõ ràng `Chưa có gói thầu quy trình 1 để thống kê`

## Success Criteria

- `statusData` không còn phụ thuộc vào `goiThau.trangThai`
- `quyTrinh = 2` bị loại khỏi card trạng thái
- 3 bucket trạng thái phản ánh đúng mốc nghiệp vụ:
  - `Chưa có TBMT`
  - `Đã có TBMT chưa có KQLCNT`
  - `Đã có KQLCNT`
- Người dùng có thể biết mỗi gói thầu:
  - thuộc kế hoạch nào
  - đã có `TBMT` chưa
  - đã có `KQLCNT` chưa
- Các chart còn lại của trang `Thống kê` không bị ảnh hưởng
