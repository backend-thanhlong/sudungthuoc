# Dashboard Analysis Usage Overview Charts Design

## Context

Tab `Phân tích` hiện đã có ABC analysis dùng chung cho Admin và CSYT:

- `src/lib/dashboard/abc-analysis.ts`
- `src/app/api/admin/dashboard/analysis/route.ts`
- `src/app/api/facility/dashboard/analysis/route.ts`
- `src/components/dashboard/Tab4Analysis.tsx`

Người dùng cần thêm phần `Tổng quan về Phân tích sử dụng thuốc` dựa vào báo cáo của các cơ sở và các trường danh mục thuốc:

- `Nhóm thuốc`
- `Nhóm điều trị`
- `Thuốc kiểm soát đặc biệt`
- `Kê đơn`
- `Trong nước`

Dữ liệu hiện có đáp ứng được yêu cầu mà không cần đổi schema:

- `MasterDrug.nhomThuoc`
- `MasterDrug.therapeuticGroup.name`
- `MasterDrug.kiemSoatDacBiet`
- `MasterDrug.isKeDon`
- `MasterDrug.isTrongNuoc`
- `InventoryReport.xuat`
- `InventoryReport.giaVat`

## Goal

Thêm một dashboard tổng quan vào đầu tab `Phân tích` để người dùng nhìn nhanh cơ cấu sử dụng thuốc trước khi đi vào Pareto ABC và bảng chi tiết.

Kết quả mong muốn:

- Người dùng chuyển được metric giữa `Giá trị sử dụng` và `Số lượng sử dụng`.
- Mặc định dùng `Giá trị sử dụng`, tính bằng `xuat * giaVat`.
- Tất cả biểu đồ cơ cấu chỉ tính thuốc đã ánh xạ danh mục chung.
- Admin xem được cả cơ cấu toàn ngành/một cơ sở và biểu đồ so sánh top CSYT.
- CSYT xem được cơ cấu trong phạm vi đơn vị mình, không có so sánh liên cơ sở.

## Scope

Bao gồm:

- Mở rộng shared analysis engine để tạo dữ liệu usage overview.
- Cập nhật Prisma select ở hai route analysis để lấy thêm các field cần thiết.
- Cập nhật response contract của `/api/*/dashboard/analysis`.
- Thêm UI khối `Tổng quan về Phân tích sử dụng thuốc` trong `Tab4Analysis`.
- Thêm chart cho `Nhóm thuốc`, `Nhóm điều trị`, `KSĐB`, `Kê đơn`, `Trong nước`.
- Thêm chart so sánh top CSYT riêng cho Admin.

Không bao gồm:

- Thay đổi schema database.
- Thay đổi upload/import báo cáo.
- Thay thế phân tích ABC hiện có.
- Thêm VEN/XYZ hoặc khuyến nghị mua sắm tự động.
- Tính biểu đồ từ thuốc chưa ánh xạ.

## Approved Approach

Chọn phương án A: dashboard đầy đủ nhưng có kiểm soát.

Phần mới nằm ở đầu tab `Phân tích`, sau KPI ABC hiện có và trước Pareto chart. Khối này hiển thị nhiều góc nhìn cùng lúc nhưng vẫn tránh kéo dài quá mức bằng cách chỉ dùng một biểu đồ so sánh CSYT cho Admin, có bộ chọn chiều phân tích.

## Calculation Rules

### Input rows

Nguồn dữ liệu là cùng danh sách `InventoryReport` mà route analysis đã query theo scope:

- Admin:
  - `reportMonth` nếu có.
  - `facilityId` nếu có.
  - không có `facilityId` là toàn ngành.
- CSYT:
  - luôn theo `facilityId` của session.
  - `reportMonth` nếu có.

### Mapped-only rule

Các biểu đồ usage overview chỉ tính dòng có:

```ts
report.drugMap?.masterDrugId
```

Dòng chưa ánh xạ không được đưa vào biểu đồ. Response vẫn trả số dòng, giá trị và số lượng chưa ánh xạ để UI có thể hiển thị ghi chú dữ liệu.

### Metrics

Mỗi dòng đã ánh xạ đóng góp:

```ts
usageQuantity = Number(report.xuat || 0)
usageValue = Number(report.xuat || 0) * Number(report.giaVat || 0)
```

Biểu đồ hỗ trợ hai metric:

- `value`: dùng `usageValue`
- `quantity`: dùng `usageQuantity`

UI mặc định hiển thị `value`. Người dùng có thể chuyển sang `quantity` mà không cần fetch lại nếu API trả cả hai chỉ số.

Chỉ các đóng góp `> 0` theo metric tương ứng mới xuất hiện trong chart.

### Dimension labels

Các chiều phân tích:

- `drugGroup`: `masterDrug.nhomThuoc || "Chưa phân nhóm"`
- `therapeuticGroup`: `masterDrug.therapeuticGroup?.name || "Chưa phân nhóm điều trị"`
- `specialControl`: `Có KSĐB` / `Không KSĐB`
- `prescription`: `Kê đơn` / `Không kê đơn`
- `domestic`: `Trong nước` / `Nước ngoài hoặc chưa rõ`

Các flag text dùng cùng normalization với helper hiện có:

- truthy: `có`, `co`, `true`, `1`, `x`
- domestic truthy: `trong nước`, `trong nuoc`, `có`, `co`, `true`, `1`

## Data Contract

Mở rộng `AbcAnalysisResponse`:

```ts
interface AbcAnalysisResponse {
  summary: AbcSummary;
  abcItems: AbcItem[];
  paretoItems: AbcParetoItem[];
  specialDrugItems: AbcItem[];
  dataQuality: AbcDataQuality;
  usageOverview: UsageOverview;
}
```

Thêm các type mới trong `src/lib/dashboard/abc-analysis.ts`:

```ts
type UsageMetricKey = "value" | "quantity";
type UsageDimensionKey =
  | "drugGroup"
  | "therapeuticGroup"
  | "specialControl"
  | "prescription"
  | "domestic";

interface UsageSlice {
  key: string;
  label: string;
  value: number;
  quantity: number;
  drugCount: number;
  percentValue: number;
  percentQuantity: number;
}

interface FacilityUsageComparison {
  facilityId: string;
  facilityName: string;
  totalValue: number;
  totalQuantity: number;
  dimensions: Record<UsageDimensionKey, UsageSlice[]>;
}

interface UsageOverview {
  mappedOnly: true;
  totalValue: number;
  totalQuantity: number;
  mappedDrugCount: number;
  excludedUnmapped: {
    rowCount: number;
    value: number;
    quantity: number;
  };
  byDrugGroup: UsageSlice[];
  byTherapeuticGroup: UsageSlice[];
  bySpecialControl: UsageSlice[];
  byPrescription: UsageSlice[];
  byDomestic: UsageSlice[];
  topGroups: UsageSlice[];
  facilityComparison?: FacilityUsageComparison[];
}
```

`topGroups` là danh sách top 10 nhóm có đóng góp lớn nhất theo `totalValue`, lấy từ union giữa `Nhóm thuốc` và `Nhóm điều trị` với prefix label rõ ràng, ví dụ `Nhóm thuốc: Kháng sinh`.

## API Changes

Hai route analysis cần select thêm:

```ts
drugMap: {
  select: {
    masterDrugId: true,
    masterDrug: {
      select: {
        nhomThuoc: true,
        isKeDon: true,
        kiemSoatDacBiet: true,
        isTrongNuoc: true,
        therapeuticGroup: {
          select: {
            name: true,
          },
        },
      },
    },
  },
}
```

Route vẫn chịu trách nhiệm auth và data scope. Shared helper vẫn chịu trách nhiệm tính toán.

## UI Design

### Placement

Trong `Tab4Analysis.tsx`, phần mới nằm sau các KPI/summary A-B-C và trước `Biểu đồ Pareto ABC`.

Tên section:

```txt
Tổng quan về Phân tích sử dụng thuốc
```

### Controls

Thêm segmented control trong section:

- `Giá trị`
- `Số lượng`

State cục bộ:

```ts
const [usageMetric, setUsageMetric] = useState<UsageMetricKey>("value");
const [adminComparisonDimension, setAdminComparisonDimension] =
  useState<UsageDimensionKey>("drugGroup");
```

Không fetch lại khi đổi metric hoặc dimension; chỉ đổi cách chọn field render.

### Charts

Render các chart sau:

1. `Cơ cấu theo nhóm thuốc`
   - Horizontal bar chart.
   - Top 10 slice, phần còn lại gộp `Khác`.
   - Tooltip hiển thị giá trị, số lượng, số mặt hàng, tỷ trọng.

2. `Cơ cấu theo nhóm điều trị`
   - Horizontal bar chart.
   - Top 10 slice, phần còn lại gộp `Khác`.
   - Dùng cùng component với nhóm thuốc.

3. `Top nhóm sử dụng cao nhất`
   - Bar chart hoặc treemap.
   - Dùng `topGroups`.
   - Label phân biệt nguồn nhóm thuốc/nhóm điều trị.

4. `Thuốc kiểm soát đặc biệt`
   - Donut chart nhị phân: `Có KSĐB` / `Không KSĐB`.

5. `Kê đơn`
   - Donut chart nhị phân: `Kê đơn` / `Không kê đơn`.

6. `Trong nước`
   - Donut chart nhị phân: `Trong nước` / `Nước ngoài hoặc chưa rõ`.

7. Admin-only: `Top CSYT theo sử dụng`
   - Stacked horizontal bar chart.
   - Top 10 CSYT theo metric đang chọn.
   - Có selector chiều phân tích:
     - `Nhóm thuốc`
     - `Nhóm điều trị`
     - `KSĐB`
     - `Kê đơn`
     - `Trong nước`
   - Khi Admin đang lọc một CSYT, vẫn hiển thị chart với một cơ sở và đổi subtitle thành `Cơ sở đang chọn`.

### Empty states

Nếu không có report:

```txt
Không có dữ liệu báo cáo cho phạm vi đã chọn.
```

Nếu có report nhưng không có thuốc đã ánh xạ có phát sinh sử dụng:

```txt
Không có thuốc đã ánh xạ có phát sinh sử dụng để vẽ biểu đồ.
```

Nếu một chart riêng không có dữ liệu:

```txt
Không có dữ liệu cho chiều phân tích này.
```

Nếu có dòng chưa ánh xạ bị loại khỏi chart, hiển thị ghi chú nhỏ:

```txt
Biểu đồ chỉ tính thuốc đã ánh xạ. Đã loại N dòng chưa ánh xạ.
```

## Component Structure

Giữ scope gọn trong `Tab4Analysis.tsx` nếu file chưa vượt quá mức khó bảo trì. Nếu phần chart làm file quá lớn, tách thành:

- `src/components/dashboard/analysis/UsageOverviewSection.tsx`
- `src/components/dashboard/analysis/UsageBreakdownBarChart.tsx`
- `src/components/dashboard/analysis/UsageDonutChart.tsx`
- `src/components/dashboard/analysis/AdminFacilityUsageChart.tsx`

Ưu tiên tách nếu `Tab4Analysis.tsx` vượt khoảng 800 dòng sau thay đổi.

## Error Handling

Không thêm route mới nên error handling vẫn theo route analysis hiện có.

Trong shared helper:

- Numeric conversion dùng helper an toàn hiện có.
- Flag normalization không throw khi null/undefined.
- Dữ liệu thiếu nhóm được gom vào label fallback.
- Division by zero trả tỷ trọng `0`.

## Performance

API hiện đã query toàn bộ report theo phạm vi để tính ABC, nên overview dùng cùng pass xử lý để tránh query mới.

Giới hạn render:

- Cơ cấu nhóm thuốc: top 10 + `Khác`.
- Cơ cấu nhóm điều trị: top 10 + `Khác`.
- Top groups: top 10.
- Facility comparison: top 10 CSYT.

Không áp dụng `limit` của `abcItems` vào usage overview. Overview phải tính trên toàn bộ dòng đã lọc theo scope.

## Testing And Verification

Automated verification:

```bash
npx eslint src/lib/dashboard/abc-analysis.ts src/app/api/admin/dashboard/analysis/route.ts src/app/api/facility/dashboard/analysis/route.ts src/components/dashboard/Tab4Analysis.tsx
npx tsc --noEmit --pretty false
```

Manual verification:

- Admin, tất cả CSYT, tất cả kỳ:
  - section overview render đủ chart.
  - chuyển metric `Giá trị`/`Số lượng` không fetch lại.
  - chart so sánh CSYT đổi được dimension.
- Admin, một CSYT:
  - dữ liệu chỉ trong CSYT đã chọn.
  - chart Admin không hiển thị sai phạm vi.
- CSYT:
  - không có chart so sánh liên cơ sở.
  - cơ cấu chỉ trong đơn vị của session.
- Data cases:
  - thuốc có nhóm thuốc.
  - thuốc có nhóm điều trị.
  - thuốc KSĐB.
  - thuốc kê đơn.
  - thuốc trong nước.
  - thuốc chưa ánh xạ bị loại khỏi overview.
  - report có `xuat = 0` hoặc `giaVat = 0`.

## Success Criteria

- Tab `Phân tích` có section `Tổng quan về Phân tích sử dụng thuốc`.
- Người dùng xem được tất cả chiều: nhóm thuốc, nhóm điều trị, KSĐB, kê đơn, trong nước.
- Người dùng chuyển được metric giữa giá trị và số lượng.
- Overview chỉ tính thuốc đã ánh xạ.
- Admin có biểu đồ so sánh top CSYT theo chiều phân tích.
- CSYT không có so sánh liên cơ sở.
- ABC hiện tại, Pareto và bảng chi tiết không bị regression.
