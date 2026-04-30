# Dashboard ABC Analysis Redesign Design

## Context

Dashboard hiện có 4 tab chính: `Tổng quan`, `Cung ứng`, `Đấu thầu`, và `Phân tích`.

Tab `Phân tích` hiện đã có phân tích ABC trong:

- `src/components/dashboard/Tab4Analysis.tsx`
- `src/app/api/admin/dashboard/analysis/route.ts`
- `src/app/api/facility/dashboard/analysis/route.ts`

Logic hiện tại tính giá trị sử dụng bằng `xuat * giaVat`, sắp xếp giảm dần, tính phần trăm tích lũy, và gán nhóm `A/B/C`. Tuy nhiên tab hiện tại còn thiếu một số phần của quy trình ABC chuẩn:

- chưa hiển thị rõ `số lượng tiêu thụ`
- chưa hiển thị `đơn giá` hoặc trường hợp có nhiều đơn giá theo thời gian
- chưa hiển thị `% giá trị` riêng của từng thuốc trong bảng
- chỉ trả top 200 dòng ABC, làm lệch tổng nhóm C khi có nhiều mặt hàng
- logic ABC bị lặp giữa Admin và CSYT
- giao diện CSYT vẫn có khối so sánh cơ sở không phù hợp với dữ liệu một đơn vị
- chưa có cảnh báo chất lượng dữ liệu như `xuat > 0` nhưng `giaVat = 0`

Người dùng đã cung cấp quy trình ABC cần hỗ trợ:

1. Liệt kê các sản phẩm thuốc.
2. Điền đơn giá và số lượng tiêu thụ.
3. Tính số tiền bằng đơn giá nhân số lượng, rồi tính tổng.
4. Tính phần trăm giá trị từng sản phẩm.
5. Sắp xếp giảm dần theo phần trăm giá trị.
6. Tính phần trăm tích lũy.
7. Phân hạng A/B/C theo tỷ trọng giá trị.

## Goal

Xây dựng lại tab `Phân tích` cho cả Admin và CSYT để phản ánh đầy đủ quy trình ABC, dùng cùng một công thức tính, và hiển thị rõ dữ liệu phục vụ quyết định quản lý thuốc.

Kết quả mong muốn:

- người dùng thấy ngay mặt hàng nào tạo phần lớn giá trị tiêu thụ
- bảng ABC giải thích được cách tính từng dòng
- thuốc có nhiều đơn giá theo kỳ được trình bày minh bạch
- Admin xem được toàn ngành hoặc một đơn vị
- CSYT xem được dữ liệu của đơn vị mình, không có các điều khiển so sánh không liên quan
- logic tính ABC được dùng chung để tránh lệch giữa hai route

## Scope

Bao gồm:

- tạo helper dùng chung cho phân tích ABC
- cập nhật API Admin và CSYT của tab `Phân tích`
- xây lại UI `Tab4Analysis`
- bổ sung bảng chi tiết ABC chuẩn quy trình
- bổ sung biểu đồ Pareto ABC
- bổ sung phân tích đơn giá khi một thuốc có nhiều giá theo kỳ
- bổ sung cảnh báo chất lượng dữ liệu liên quan đến ABC
- bỏ hoặc thay thế khối so sánh CSYT trong view CSYT

Không bao gồm:

- thay đổi cấu trúc upload báo cáo tồn kho
- thay đổi schema database
- thêm module VEN hoặc XYZ
- thay đổi tab `Tổng quan`, `Cung ứng`, hoặc `Đấu thầu`
- tự động sửa dữ liệu báo cáo sai
- thay đổi quyền truy cập hiện tại của Admin/CSYT

## Approach Options

### Option 1: Chỉnh nhẹ tab hiện tại

Thêm vài cột còn thiếu vào bảng hiện có: `xuat`, `giaVat`, `% giá trị`.

Ưu điểm:

- triển khai nhanh
- ít thay đổi giao diện
- rủi ro thấp

Nhược điểm:

- vẫn còn lặp logic giữa Admin và CSYT
- chưa xử lý tốt thuốc có nhiều giá theo kỳ
- chưa giải quyết top 200 làm thiếu dữ liệu nhóm C
- chưa tạo được trải nghiệm phân tích ABC đầy đủ

### Option 2: Xây lại tab Phân tích theo ABC chuẩn

Tách logic ABC dùng chung, mở rộng response API, xây lại UI với tổng hợp ABC, Pareto chart, bảng chi tiết, chi tiết giá theo kỳ, và cảnh báo dữ liệu.

Ưu điểm:

- bám sát quy trình ABC người dùng đưa ra
- dùng chung công thức cho Admin và CSYT
- đủ rõ để kiểm toán lại từng dòng
- cải thiện UX cho cả Admin và CSYT
- giữ phạm vi vừa đủ, không mở sang VEN/XYZ

Nhược điểm:

- cần thay đổi cả API và component
- cần kiểm thử kỹ các trường hợp dữ liệu rỗng, giá bằng 0, nhiều kỳ

### Option 3: Xây module phân tích nâng cao ABC/VEN/XYZ

Mở rộng tab `Phân tích` thành khu phân tích đa phương pháp: ABC, VEN, XYZ, cảnh báo mua sắm, và ưu tiên kiểm soát.

Ưu điểm:

- tạo nền tảng phân tích dược sâu hơn
- có thể hỗ trợ quyết định mua sắm và kiểm soát tồn kho tốt hơn

Nhược điểm:

- phạm vi quá rộng so với yêu cầu hiện tại
- cần thêm dữ liệu phân loại VEN/XYZ chưa chắc đã có
- dễ kéo dài triển khai và làm chậm việc chuẩn hóa ABC

## Recommendation

Chọn Option 2.

Phương án này giải quyết trực tiếp yêu cầu xây dựng lại tab `Phân tích` theo quy trình ABC, giữ phạm vi tập trung, và tạo nền tảng tốt để sau này mở rộng VEN/XYZ nếu cần.

## ABC Calculation Rules

### Input rows

Nguồn dữ liệu là `InventoryReport` sau khi áp dụng bộ lọc:

- Admin:
  - `reportMonth` nếu người dùng chọn kỳ báo cáo
  - `facilityId` nếu người dùng chọn một đơn vị
  - không có `facilityId` khi xem toàn ngành
- CSYT:
  - luôn giới hạn theo `facilityId` của session
  - `reportMonth` nếu người dùng chọn kỳ báo cáo

Mỗi dòng báo cáo đóng góp vào ABC bằng:

```ts
consumptionQuantity = Number(report.xuat || 0)
unitPrice = Number(report.giaVat || 0)
usageValue = consumptionQuantity * unitPrice
```

Chỉ những dòng có `usageValue > 0` được đưa vào xếp hạng ABC. Các dòng bị loại vẫn được đếm trong phần cảnh báo dữ liệu.

### Drug grouping key

Khi có ánh xạ danh mục chung:

- group theo `drugMap.masterDrugId`

Khi chưa có ánh xạ:

- group theo cặp `facilityId + drugMap.maNoiBo`
- hiển thị là thuốc chưa ánh xạ

Admin toàn ngành cần group theo `masterDrugId` để một thuốc dùng ở nhiều cơ sở được cộng chung. Với thuốc chưa ánh xạ, không gộp toàn ngành theo tên tự do để tránh cộng nhầm các sản phẩm khác nhau.

### Aggregated drug metrics

Mỗi thuốc sau khi gộp có các chỉ số:

- `totalQuantity`: tổng `xuat`
- `totalValue`: tổng `xuat * giaVat`
- `weightedAveragePrice`: `totalValue / totalQuantity` nếu `totalQuantity > 0`
- `minPrice`: đơn giá nhỏ nhất trong các dòng có `xuat > 0` và `giaVat > 0`
- `maxPrice`: đơn giá lớn nhất trong các dòng có `xuat > 0` và `giaVat > 0`
- `pricePointCount`: số mức giá phân biệt
- `periodCount`: số kỳ báo cáo có phát sinh tiêu thụ
- `facilityCount`: số CSYT có phát sinh tiêu thụ, chỉ cần cho Admin

Nếu một thuốc có nhiều đơn giá theo thời gian, bảng chính hiển thị `weightedAveragePrice` và badge `n mức giá`. Khi mở chi tiết, hiển thị breakdown theo kỳ và giá.

### Percent and ranking

Sau khi có danh sách thuốc:

1. Tính `grandTotalValue = sum(totalValue)`.
2. Tính `percent = totalValue / grandTotalValue * 100`.
3. Sắp xếp giảm dần theo `totalValue`.
4. Tính `cumulativePercent` theo thứ tự đã sắp xếp.

Nếu `grandTotalValue = 0`, API trả danh sách rỗng và summary bằng 0.

### ABC class boundaries

Mốc mặc định:

- A: đến khoảng 80% tổng giá trị
- B: từ sau A đến khoảng 95% tổng giá trị
- C: phần còn lại

Vì thuốc là đơn vị không chia nhỏ, sản phẩm ở điểm cắt được đưa vào nhóm đang được lấp đầy:

```ts
if (cumulativeBefore < 80) group = "A"
else if (cumulativeBefore < 95) group = "B"
else group = "C"
```

UI phải hiển thị tỷ lệ thực tế của từng nhóm, ví dụ `A: 81,2% giá trị`, thay vì nói cứng đúng 80%.

## Data Design

Tạo helper mới:

```txt
src/lib/dashboard/abc-analysis.ts
```

Helper này chịu trách nhiệm:

- nhận danh sách report rows đã query
- gộp theo thuốc
- tính số lượng, giá trị, đơn giá bình quân, min-max giá
- tính phần trăm và tích lũy
- gán hạng A/B/C
- tạo summary
- tạo danh sách cảnh báo dữ liệu
- tạo breakdown theo kỳ/giá cho từng thuốc

Không đưa logic phân quyền vào helper. Route Admin/CSYT chịu trách nhiệm auth và query đúng phạm vi.

### API response shape

Response của `GET /api/*/dashboard/analysis` có dạng:

```ts
interface AbcAnalysisResponse {
  summary: {
    totalValue: number;
    totalQuantity: number;
    totalDrugs: number;
    includedRows: number;
    excludedRows: number;
    groups: Array<{
      group: "A" | "B" | "C";
      drugCount: number;
      value: number;
      valuePercent: number;
      quantity: number;
      quantityPercent: number;
    }>;
  };
  abcItems: AbcItem[];
  paretoItems: Array<{
    rank: number;
    drugName: string;
    totalValue: number;
    percent: number;
    cumulativePercent: number;
    group: "A" | "B" | "C";
  }>;
  specialDrugItems: AbcItem[];
  dataQuality: {
    zeroPriceWithConsumption: number;
    unmappedWithConsumption: number;
    negativeOrZeroValueRows: number;
    multiPriceDrugs: number;
  };
  facilities?: Array<{ id: string; name: string; type: string }>;
}
```

`AbcItem`:

```ts
interface AbcItem {
  rank: number;
  drugKey: string;
  drugName: string;
  hoatChat: string;
  hamLuong: string;
  donViTinh: string;
  nhomThuoc: string;
  totalQuantity: number;
  weightedAveragePrice: number;
  minPrice: number;
  maxPrice: number;
  pricePointCount: number;
  totalValue: number;
  percent: number;
  cumulativePercent: number;
  group: "A" | "B" | "C";
  isMapped: boolean;
  isKeDon: string;
  kiemSoatDacBiet: string;
  facilityCount?: number;
  topFacilityName?: string;
  priceBreakdown: Array<{
    reportMonth: string;
    facilityName?: string;
    quantity: number;
    unitPrice: number;
    value: number;
  }>;
}
```

### Pagination and limits

API không cắt `abcItems` trước khi tính summary. Summary phải tính trên toàn bộ dữ liệu đủ điều kiện.

Để tránh response quá lớn:

- `abcItems` mặc định trả 500 dòng đầu sau xếp hạng
- nhận query `limit`, tối đa 2000
- `paretoItems` trả 50 dòng đầu để biểu đồ dễ đọc
- `priceBreakdown` chỉ trả cho các dòng nằm trong `abcItems`

Nếu sau này cần xem toàn bộ, có thể thêm export riêng. Không đưa export vào phạm vi lần này.

## UI Design

File chính:

```txt
src/components/dashboard/Tab4Analysis.tsx
```

Tab mới gồm 4 vùng.

### 1. Summary cards

Hiển thị:

- `Tổng giá trị tiêu thụ`
- `Tổng số lượng tiêu thụ`
- `Số mặt hàng ABC`
- `Dòng bị loại/cần kiểm tra`

Bên dưới hoặc cùng hàng có 3 thẻ nhóm:

- `Hạng A`: số thuốc, giá trị, `% giá trị`, `% số lượng`
- `Hạng B`: số thuốc, giá trị, `% giá trị`, `% số lượng`
- `Hạng C`: số thuốc, giá trị, `% giá trị`, `% số lượng`

Không dùng câu cố định như `80% tổng giá trị sử dụng`; dùng tỷ lệ thực tế từ API.

### 2. Pareto ABC chart

Biểu đồ kết hợp:

- bar: `totalValue`
- line: `cumulativePercent`
- màu bar theo nhóm A/B/C
- reference lines ở 80% và 95%
- tooltip hiển thị tên thuốc, giá trị, `%`, `% tích lũy`, hạng

Chỉ vẽ top 50 để tránh rối. Bảng bên dưới vẫn là nguồn đọc chi tiết.

### 3. ABC detail table

Cột chính:

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

Với Admin toàn ngành, thêm:

- `Số CSYT`
- `CSYT đóng góp lớn nhất`

Bộ lọc trong bảng:

- hạng `Tất cả/A/B/C`
- chỉ thuốc kiểm soát đặc biệt
- chỉ thuốc có nhiều mức giá
- chỉ thuốc chưa ánh xạ
- ô tìm kiếm theo tên thuốc, hoạt chất

Tương tác mở rộng dòng:

- nếu `pricePointCount > 1` hoặc nhiều kỳ, cho mở chi tiết
- chi tiết hiển thị `reportMonth`, `facilityName` với Admin, `quantity`, `unitPrice`, `value`

### 4. Monitoring and data quality

Khối phụ phía cuối hoặc cạnh bảng:

- `Thuốc hạng A kiểm soát đặc biệt`
- `Thuốc hạng A có nhiều mức giá`
- `Dòng có xuất nhưng giá bằng 0`
- `Thuốc chưa ánh xạ có phát sinh tiêu thụ`

CSYT view dùng khối này thay cho phần `So sánh cơ cấu sử dụng thuốc` hiện tại.

## Admin vs Facility Behavior

### Admin

Admin dùng bộ lọc sẵn có:

- `Đơn vị`: tất cả hoặc một CSYT
- `Kỳ báo cáo`: tất cả hoặc một kỳ

Khi chọn tất cả đơn vị:

- ABC gộp toàn ngành theo `masterDrugId`
- bảng có `facilityCount`
- breakdown có `facilityName`
- khối phân tích so sánh cơ cấu, nếu giữ cho Admin, nằm sau các phần ABC chính và bị ẩn hoàn toàn trong CSYT view

Khi chọn một đơn vị:

- kết quả giống logic CSYT nhưng vẫn gọi route Admin
- bảng không bắt buộc hiển thị `facilityCount`

### CSYT

CSYT chỉ xem dữ liệu của chính đơn vị:

- không hiển thị selector so sánh 2 CSYT
- không hiển thị danh sách facility
- ưu tiên các cảnh báo hành động được: hạng A, KSĐB, nhiều giá, chưa ánh xạ

## Error and Empty States

Loading:

- giữ spinner hiện tại nhưng đổi text theo ngữ cảnh: `Đang tính phân tích ABC...`

Empty:

- nếu không có report sau bộ lọc: `Không có dữ liệu báo cáo cho phạm vi đã chọn`
- nếu có report nhưng không có dòng `usageValue > 0`: `Không có phát sinh tiêu thụ có giá trị để phân tích ABC`

Error:

- nếu API lỗi: hiển thị message rõ ràng và nút tải lại
- route vẫn log lỗi server như hiện tại

Data quality:

- không chặn render ABC nếu có dòng lỗi
- các dòng lỗi được đếm và hiển thị trong khối kiểm soát

## Implementation Notes

Các file dự kiến tác động:

- `src/lib/dashboard/abc-analysis.ts`
- `src/app/api/admin/dashboard/analysis/route.ts`
- `src/app/api/facility/dashboard/analysis/route.ts`
- `src/components/dashboard/Tab4Analysis.tsx`

Có thể cân nhắc tách component nhỏ nếu `Tab4Analysis.tsx` quá lớn:

- `AbcSummaryCards`
- `AbcParetoChart`
- `AbcDetailTable`
- `AbcMonitoringPanel`

Tách component chỉ nên làm nếu giúp file chính dễ đọc hơn, không tạo abstraction quá sớm.

## Testing Plan

### Unit tests for helper

Nếu repo đang có test runner phù hợp, thêm test cho `src/lib/dashboard/abc-analysis.ts`:

- một thuốc một giá
- một thuốc nhiều kỳ nhiều giá
- phân nhóm A/B/C với boundary item
- dòng `xuat > 0` nhưng `giaVat = 0`
- thuốc chưa ánh xạ
- `grandTotalValue = 0`

Nếu repo chưa có test runner cho helper, tối thiểu cần kiểm tra bằng TypeScript/build và review case thủ công.

### API verification

Kiểm tra:

- Admin tất cả đơn vị
- Admin một đơn vị
- CSYT một kỳ
- CSYT tất cả kỳ
- response không cắt summary theo limit
- response không rò dữ liệu facility khác cho CSYT

### UI verification

Kiểm tra desktop và mobile:

- summary cards không tràn chữ
- Pareto chart có dữ liệu và tooltip đọc được
- bảng cuộn ngang ổn trên mobile
- filter A/B/C, KSĐB, nhiều giá, chưa ánh xạ hoạt động
- row expansion không làm layout nhảy bất thường
- empty/error states hiển thị đúng

## Acceptance Criteria

- Tab `Phân tích` Admin và CSYT dùng cùng logic ABC.
- Bảng ABC có đủ `số lượng tiêu thụ`, `đơn giá`, `giá trị`, `% giá trị`, `% tích lũy`, và `hạng`.
- Thuốc có nhiều giá theo thời gian hiển thị giá bình quân gia quyền và breakdown.
- Summary A/B/C tính trên toàn bộ dữ liệu đủ điều kiện, không chỉ top 200.
- CSYT không còn khối chọn 2 cơ sở để so sánh.
- Admin vẫn lọc được theo `Đơn vị` và `Kỳ báo cáo`.
- Có cảnh báo dữ liệu cho giá bằng 0, chưa ánh xạ, dòng bị loại khỏi ABC.
- Không thay đổi schema database.
