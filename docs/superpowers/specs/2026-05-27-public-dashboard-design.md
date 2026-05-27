# Public Dashboard Homepage Design

## Context

Trang chủ hiện tại `src/app/page.tsx` chỉ kiểm tra session rồi redirect người dùng chưa đăng nhập sang `/login`. Dashboard vận hành hiện nằm dưới `/dashboard/*`, được bảo vệ bởi cả `src/middleware.ts` và `src/app/dashboard/layout.tsx`. Các API dashboard hiện tại cũng yêu cầu session và role `ADMIN` hoặc `FACILITY`.

Yêu cầu mới là xây dựng thêm một trang dashboard public làm trang chủ để mọi người có thể xem số liệu minh bạch mà không cần đăng nhập. Trang này không public hóa dashboard hiện tại, không dùng layout nội bộ, và không mở quyền truy cập cho `/dashboard/admin`.

## Goals

1. Biến `/` thành dashboard public tổng hợp toàn ngành.
2. Cho người xem chọn kỳ báo cáo.
3. Hiển thị số liệu minh bạch ở mức aggregate, không có dữ liệu từng cơ sở.
4. Giữ nguyên cơ chế đăng nhập và bảo vệ `/dashboard/*`.
5. Tạo API public riêng chỉ trả payload đã tổng hợp.
6. Tái sử dụng thư viện UI/chart hiện có nhưng không kéo logic admin dashboard ra public.

## Non-Goals

- Không mở public route `/dashboard/admin`, `/dashboard/facility`, hoặc `/dashboard/company`.
- Không trả `facilityId`, `facilityName`, địa chỉ, tọa độ, tên công ty, số quyết định thầu, hay row-level inventory.
- Không làm dashboard điều hành nội bộ cho lãnh đạo trong scope này.
- Không thêm workflow duyệt/chốt số liệu trước khi public.
- Không thay đổi schema database nếu các aggregate có thể tính từ dữ liệu hiện có.

## Chosen Approach

Chọn phương án public dashboard tổng hợp đầy đủ:

- `/` là trang public.
- Trang đọc dữ liệu từ `GET /api/public/dashboard`.
- API chỉ trả dữ liệu tổng hợp toàn ngành theo kỳ báo cáo.
- Người dùng chọn `reportMonth`, không chọn cơ sở.
- Dashboard hiện tại trong `/dashboard/*` vẫn được bảo vệ như cũ.

Phương án này cân bằng giữa tính minh bạch và rủi ro dữ liệu. Nó đủ hữu ích hơn một landing page tĩnh, nhưng không công khai các màn phân tích nội bộ hiện có.

## Public Route Behavior

`src/app/page.tsx` sẽ đổi từ redirect sang render public dashboard.

Hành vi mong muốn:

- Người chưa đăng nhập truy cập `/` thấy public dashboard.
- Người đã đăng nhập truy cập `/` cũng thấy public dashboard.
- Header có nút `Đăng nhập` khi chưa đăng nhập.
- Header có nút `Vào hệ thống` khi đã đăng nhập, trỏ về dashboard theo role:
  - `ADMIN`: `/dashboard/admin`
  - `COMPANY`: `/dashboard/company`
  - `FACILITY`: `/dashboard/facility`

`src/middleware.ts` hiện đã coi `/` là public route, nên không cần mở thêm `/dashboard/*`.

## Data API Design

Thêm route:

```txt
src/app/api/public/dashboard/route.ts
```

Request:

```txt
GET /api/public/dashboard
GET /api/public/dashboard?reportMonth=03/2026
```

Response shape:

```ts
interface PublicDashboardResponse {
  reportPeriods: string[];
  selectedReportMonth: string | null;
  updatedAt: string | null;
  kpis: {
    activeFacilityCount: number;
    submittedFacilityCount: number;
    submissionRate: number;
    totalInventoryValue: number;
    totalExportValue: number;
    distinctMappedDrugCount: number;
    domesticExportRatio: number;
  };
  groupValueBreakdown: Array<{
    name: string;
    inventoryValue: number;
    exportValue: number;
  }>;
  payerBreakdown: Array<{
    name: "BHYT" | "Dịch vụ" | "Khác";
    value: number;
  }>;
  domesticBreakdown: Array<{
    name: "Trong nước" | "Khác/Chưa rõ";
    value: number;
  }>;
  trend: Array<{
    reportMonth: string;
    inventoryValue: number;
    exportValue: number;
    submittedFacilityCount: number;
    submissionRate: number;
  }>;
}
```

API không dùng `auth()`. Mọi query và transform nằm trong helper server-side.

## Calculation Rules

### Report Period

- Nếu request có `reportMonth`, chỉ tính kỳ đó.
- Nếu request không có `reportMonth`, mặc định dùng kỳ mới nhất trong `reportPeriod`.
- `reportPeriods` trả về danh sách kỳ theo thứ tự mới nhất trước.

### KPI

`activeFacilityCount`:

- đếm `User` có `role = FACILITY` và `isActive = true`.

`submittedFacilityCount`:

- đếm số `FacilityReportSubmission` distinct theo `facilityId` trong kỳ đang chọn.

`submissionRate`:

- `submittedFacilityCount / activeFacilityCount * 100`, làm tròn 2 chữ số.

`totalInventoryValue`:

- `SUM(inventoryReport.thanhTienTonCuoi)` trong kỳ đang chọn.

`totalExportValue`:

- `SUM(inventoryReport.xuat * inventoryReport.giaVat)` trong kỳ đang chọn.

`distinctMappedDrugCount`:

- số `mapId` distinct trong kỳ đang chọn.

`domesticExportRatio`:

- giá trị xuất của thuốc `isTrongNuoc` trên tổng giá trị xuất.
- dùng cùng normalize logic như dashboard hiện tại: chấp nhận các giá trị kiểu `trong nuoc`, `co`, `true`, `1`.

### Breakdowns

`groupValueBreakdown`:

- group theo `drugMap.masterDrug.nhomThuoc`.
- nhãn rỗng hoặc thiếu dữ liệu là `Khác/Chưa phân nhóm`.
- giới hạn top 10 theo `inventoryValue`, phần còn lại gộp vào `Khác`.

`payerBreakdown`:

- tính theo giá trị xuất.
- `BHYT` khi field `bhyt` biểu thị có.
- `Dịch vụ` khi field `dichVu` biểu thị có.
- phần còn lại là `Khác`.

`domesticBreakdown`:

- tính theo giá trị xuất.
- tách `Trong nước` và `Khác/Chưa rõ`.

`trend`:

- lấy tối đa 12 kỳ gần nhất.
- mỗi kỳ tính `inventoryValue`, `exportValue`, `submittedFacilityCount`, `submissionRate`.
- không trả dữ liệu cơ sở.

## UI Design

Tạo component public riêng, ví dụ:

```txt
src/components/public-dashboard/PublicDashboardShell.tsx
```

Bố cục:

1. Header
   - tên hệ thống
   - mô tả ngắn: số liệu tổng hợp toàn ngành
   - nút `Đăng nhập` hoặc `Vào hệ thống`

2. Toolbar
   - select kỳ báo cáo
   - text trạng thái: `Cập nhật đến kỳ ...`

3. KPI band
   - số cơ sở đã nộp/tổng cơ sở
   - tỷ lệ nộp báo cáo
   - tổng giá trị tồn cuối
   - tổng giá trị xuất
   - số thuốc phát sinh báo cáo
   - tỷ lệ giá trị xuất thuốc trong nước

4. Chart sections
   - giá trị tồn/xuất theo nhóm thuốc
   - cơ cấu nguồn chi trả
   - cơ cấu thuốc trong nước
   - xu hướng tổng hợp theo kỳ

5. Data notice
   - ghi rõ: `Số liệu được tổng hợp toàn ngành và không hiển thị dữ liệu từng cơ sở.`

Không dùng `DashboardLayout` vì layout đó phụ thuộc session, sidebar, notification, AI assistant, và các hành vi nội bộ.

## Component Reuse

Nên dùng lại:

- `src/components/ui/card.tsx`
- `src/components/ui/button.tsx`
- `src/components/ui/select.tsx`
- `recharts`
- formatter nội bộ nếu đã có helper phù hợp

Không nên dùng lại trực tiếp:

- `src/components/dashboard/DashboardShell.tsx`
- `Tab1Overview`, `Tab2Supply`, `Tab3Tender`, `Tab4Analysis`

Lý do: các component dashboard hiện tại gắn với API admin/facility, filter cơ sở, map, drug search, và các chi tiết không phù hợp public.

## Security Requirements

1. API public chỉ trả aggregate.
2. Không expose ID định danh cơ sở hoặc thuốc nội bộ.
3. Không expose danh sách top cơ sở, bản đồ cơ sở, địa chỉ, tọa độ.
4. Không expose tên công ty, số QĐ trúng thầu, ngày hợp đồng.
5. `/dashboard/*` vẫn yêu cầu đăng nhập.
6. Nếu sau này cần dữ liệu nhạy cảm hơn, phải chuyển sang cơ chế snapshot được admin duyệt trước khi public.

## Performance

Dữ liệu báo cáo theo kỳ không cần realtime. Khuyến nghị:

- API public dùng `export const revalidate = 300`.
- Trang chủ có thể client-fetch API để đổi kỳ mượt hơn.
- Payload giới hạn top/group aggregate, tránh trả mảng lớn.
- Nếu query trở nên nặng, tách helper để dễ bổ sung cache hoặc snapshot sau.

## Error And Empty States

Trang public cần xử lý:

- chưa có kỳ báo cáo: hiển thị trạng thái trống, vẫn có nút đăng nhập.
- kỳ được chọn không tồn tại: API trả kỳ mới nhất hoặc lỗi 400 có message rõ.
- không có dữ liệu inventory trong kỳ: KPI bằng 0, chart hiển thị empty state.
- API lỗi: UI hiển thị thông báo không tải được dữ liệu, không crash trang chủ.

## Testing Plan

Manual checks:

1. Truy cập `/` khi chưa đăng nhập thấy public dashboard.
2. Truy cập `/login` vẫn thấy trang đăng nhập.
3. Truy cập `/dashboard/admin` khi chưa đăng nhập vẫn redirect `/login`.
4. Đổi kỳ báo cáo làm dữ liệu dashboard đổi theo.
5. Inspect response `/api/public/dashboard` không có field nhạy cảm.
6. Người đã đăng nhập bấm `Vào hệ thống` đi đúng dashboard theo role.

Automated checks nếu phù hợp với setup repo:

- unit test cho helper aggregate nếu test framework sẵn có.
- build TypeScript.
- lint nếu repo đang dùng lint ổn định.

## Implementation Notes

Đề xuất thứ tự triển khai:

1. Tạo helper aggregate trong `src/lib/public-dashboard.ts`.
2. Tạo `GET /api/public/dashboard`.
3. Tạo `PublicDashboardShell`.
4. Cập nhật `src/app/page.tsx` render dashboard public.
5. Kiểm tra middleware không làm thay đổi bảo vệ `/dashboard/*`.
6. Chạy build/lint và kiểm tra thủ công các route chính.

## Resolved Decisions

- Biểu đồ xu hướng dùng tối đa 12 kỳ gần nhất. Nếu hệ thống có ít hơn 12 kỳ, hiển thị toàn bộ số kỳ hiện có.
- KPI tiền dùng định dạng compact VND để dễ quét. Tooltip và chi tiết chart dùng full VND.
- Public page không thêm dark mode toggle trong scope đầu tiên. Trang vẫn chạy trong `ThemeProvider` hiện có và theo theme mặc định của app.
