# Admin Dashboard Overview Import Export Charts Design

## Context

Trang `/dashboard/admin` có tab `Tổng quan` với các KPI, biểu đồ `Top 10 CSYT tồn kho lớn nhất`, biểu đồ `BHYT vs. Dịch vụ`, và bảng `Phân bố tồn kho theo địa bàn`.

Người dùng cần bổ sung thêm 2 biểu đồ tổng hợp theo cơ sở để đọc nhanh dòng vận động hàng hóa:

- `Top 10 cơ sở giá trị Xuất lớn nhất`
- `Top 10 cơ sở giá trị Nhập lớn nhất`

Hai biểu đồ này cần được đặt phía trên phần `Phân bố tồn kho theo địa bàn`, đồng thời vẫn phản ánh cơ cấu theo `nhóm thuốc` giống tinh thần biểu đồ tồn kho hiện có.

## Goal

Bổ sung vào tab `Tổng quan`:

- một biểu đồ `stacked horizontal bar` cho `Top 10 cơ sở giá trị Xuất lớn nhất`
- một biểu đồ `treemap` cho `Top 10 cơ sở giá trị Nhập lớn nhất`
- cả hai đều chia theo `nhóm thuốc`
- cả hai đều dùng cùng bộ lọc hiện tại của tab:
  - `Kỳ báo cáo`
  - `Đơn vị`

## Scope

Bao gồm:

- mở rộng API `GET /api/admin/dashboard/overview` để trả thêm dữ liệu cho 2 biểu đồ mới
- cập nhật `src/components/dashboard/Tab1Overview.tsx` để render 2 card biểu đồ mới
- đặt 2 biểu đồ mới ngay phía trên bảng `Phân bố tồn kho theo địa bàn`
- hỗ trợ trạng thái rỗng khi không có dữ liệu sau khi lọc

Không bao gồm:

- thay đổi KPI hiện có
- thay đổi biểu đồ `Top 10 CSYT tồn kho lớn nhất`
- thay đổi bảng `Phân bố tồn kho theo địa bàn`
- tạo API mới cho tab `Tổng quan`
- thay đổi cách lọc `reportMonth` và `facilityId`

## Approach Options

### Option 1: 2 stacked bar charts

Dùng `stacked horizontal bar` cho cả `Xuất` và `Nhập`.

Ưu điểm:

- dễ so sánh thứ hạng và giá trị giữa các cơ sở
- thống nhất với biểu đồ tồn kho hiện có
- triển khai đơn giản

Nhược điểm:

- giao diện ít đa dạng hơn
- hai biểu đồ liền nhau có thể tạo cảm giác lặp lại

### Option 2: Stacked horizontal bar cho Xuất, treemap cho Nhập

Dùng `stacked horizontal bar` cho `Top 10 giá trị Xuất` và `treemap` cho `Top 10 giá trị Nhập`.

Ưu điểm:

- vẫn giữ được khả năng đọc top rõ ràng cho `Xuất`
- tạo thêm góc nhìn trực quan khác cho `Nhập`
- đa dạng hóa dashboard nhưng vẫn bám đúng dữ liệu theo `nhóm thuốc`

Nhược điểm:

- `treemap` kém chính xác hơn bar chart khi so sánh chênh lệch nhỏ
- cần xử lý label và tooltip cẩn thận để tránh rối

### Option 3: Stacked bar cho Xuất, 100% stacked bar cho Nhập

Dùng `stacked horizontal bar` cho `Xuất` và `100% stacked bar` cho `Nhập`.

Ưu điểm:

- cho thấy cơ cấu nhóm thuốc của `Nhập` rất rõ
- tạo khác biệt về hình thức

Nhược điểm:

- mất thông tin giá trị tuyệt đối của `Nhập`
- không còn phản ánh đúng tinh thần `Top 10 giá trị lớn nhất`

### Recommendation

Chọn Option 2.

Phương án này bám đúng lựa chọn đã duyệt:

- `Xuất`: `stacked horizontal bar`
- `Nhập`: `treemap`

Nó giữ được độ rõ ràng cho chỉ số cần xếp hạng mạnh là `Xuất`, đồng thời làm dashboard đa dạng hơn ở khối `Nhập` mà không cần mở thêm route hay thêm filter phụ.

## Data Design

File tác động chính: `src/app/api/admin/dashboard/overview/route.ts`

Giữ nguyên route `GET /api/admin/dashboard/overview` và mở rộng response payload với 2 trường mới:

- `topExportByFacility`
- `topImportTreemap`

Response shape dự kiến:

```ts
interface FacilityMetricDatum {
    facility: string;
    total: number;
    [drugGroup: string]: string | number;
}

interface TreemapDatum {
    name: string;
    value: number;
    children?: TreemapDatum[];
}

interface OverviewData {
    kpis: Kpis;
    stackedBarData: StackedBarDatum[];
    drugGroups: string[];
    donutData: DonutDatum[];
    topExportByFacility: FacilityMetricDatum[];
    topImportTreemap: TreemapDatum[];
    heatmapData: HeatmapDatum[];
}
```

Nguyên tắc tính:

- tiếp tục đọc từ `inventoryReport` theo `reportWhere` đang có
- với mỗi dòng:
  - `exportValue = Number(xuat) * Number(giaVat)`
  - `importValue = Number(nhap) * Number(giaVat)`
  - `facilityName = facility.facilityName || "Unknown"`
  - `drugGroup = masterDrug.nhomThuoc || "Khác"`
- cộng dồn theo `facilityName`, rồi tiếp tục cộng theo `drugGroup`
- lấy top 10 riêng cho từng chỉ số:
  - `Xuất` theo tổng `exportValue`
  - `Nhập` theo tổng `importValue`

`topExportByFacility` là mảng phẳng để feed trực tiếp vào `BarChart`.

`topImportTreemap` là dữ liệu cây:

- node cấp 1: cơ sở
- node cấp 2: nhóm thuốc của cơ sở
- `value` là tổng `importValue`

## UI Design

File tác động chính: `src/components/dashboard/Tab1Overview.tsx`

Chèn thêm một hàng mới phía trên khối `Phân bố tồn kho theo địa bàn`:

- desktop: grid `2` cột
- mobile: xếp dọc

Card 1: `Top 10 cơ sở giá trị Xuất lớn nhất`

- dùng `BarChart` với `layout="vertical"`
- mỗi hàng là một cơ sở
- mỗi thanh là stacked theo `nhóm thuốc`
- sắp xếp giảm dần theo `total`
- dùng lại bảng màu đang có để giữ tính nhất quán với biểu đồ tồn kho
- subtitle: `Tính theo xuat × giaVat, chia theo nhóm thuốc`

Card 2: `Top 10 cơ sở giá trị Nhập lớn nhất`

- dùng `Treemap`
- node cha là cơ sở
- node con là `nhóm thuốc`
- diện tích ô theo `nhap × giaVat`
- subtitle: `Tính theo nhap × giaVat, cơ cấu theo nhóm thuốc`

Quy ước hiển thị:

- tooltip tiền dùng `formatCurrency`
- trục giá trị của biểu đồ `Xuất` dùng `formatCompact`
- label trên treemap chỉ hiện khi đủ chỗ; thông tin đầy đủ hiển thị trong tooltip
- khi không có dữ liệu, card hiển thị `Không có dữ liệu`

## Data Flow

1. User đổi `Kỳ báo cáo` hoặc `Đơn vị` trên dashboard.
2. `Tab1Overview` tiếp tục gọi `GET /api/admin/dashboard/overview` với cùng query params như hiện tại.
3. Backend dùng cùng `reportWhere` cho toàn bộ KPI và biểu đồ.
4. Backend trả về thêm:
   - `topExportByFacility`
   - `topImportTreemap`
5. Frontend render thêm 2 card biểu đồ trước phần heatmap table.

Thiết kế này giữ nguyên số lượng request của tab `Tổng quan`.

## Edge Cases

- nếu không có dòng `inventoryReport` sau khi lọc:
  - 2 biểu đồ mới hiển thị trạng thái `Không có dữ liệu`
- nếu một cơ sở có `facilityName` rỗng:
  - hiển thị `Unknown`
- nếu một thuốc không có `nhomThuoc`:
  - gom vào `Khác`
- nếu `nhap`, `xuat`, hoặc `giaVat` là `null` hoặc rỗng:
  - ép kiểu số theo pattern hiện tại; giá trị không hợp lệ được xem như `0`
- nếu tổng `importValue` của một cơ sở bằng `0`:
  - cơ sở đó không nên lọt vào top khi vẫn còn cơ sở có giá trị dương
- nếu toàn bộ top nhập đều bằng `0`:
  - `topImportTreemap` trả mảng rỗng để frontend hiển thị trạng thái rỗng thay vì treemap trống

## Compatibility

- không đổi contract cũ của các trường hiện có trong response overview
- chỉ bổ sung trường mới vào payload
- không đổi filter hoặc route của admin dashboard
- không đổi layout của các card KPI và biểu đồ đang tồn tại

## Testing Plan

Kiểm tra thủ công:

1. Mở `/dashboard/admin`, tab `Tổng quan`, xác nhận xuất hiện 2 card mới phía trên phần `Phân bố tồn kho theo địa bàn`.
2. Xác nhận card `Top 10 cơ sở giá trị Xuất lớn nhất` hiển thị dạng stacked horizontal bar và thứ tự giảm dần theo tổng xuất.
3. Xác nhận card `Top 10 cơ sở giá trị Nhập lớn nhất` hiển thị dạng treemap và tooltip hiện đúng tên cơ sở, nhóm thuốc, giá trị nhập.
4. Đổi `Kỳ báo cáo`, xác nhận cả 2 biểu đồ cập nhật theo tháng đã chọn.
5. Chọn một `Đơn vị`, xác nhận dữ liệu bị giới hạn đúng theo cơ sở đó.
6. Kiểm tra trường hợp dữ liệu ít hoặc rỗng, xác nhận từng card hiển thị `Không có dữ liệu` và không vỡ layout.
7. Đối chiếu ngẫu nhiên một cơ sở để xác nhận tổng các segment nhóm thuốc bằng đúng tổng `xuat × giaVat` hoặc `nhap × giaVat`.

Kiểm tra kỹ thuật:

1. Chạy lint cho:
   - `src/components/dashboard/Tab1Overview.tsx`
   - `src/app/api/admin/dashboard/overview/route.ts`
