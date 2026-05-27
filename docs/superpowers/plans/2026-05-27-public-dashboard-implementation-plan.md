# Public Dashboard Homepage Implementation Plan

## Inputs

Plan này dựa trên:

- Spec đã duyệt: [2026-05-27-public-dashboard-design.md](/opt/sudungthuoc/sudungthuoc/docs/superpowers/specs/2026-05-27-public-dashboard-design.md)
- Trang chủ hiện tại: [page.tsx](/opt/sudungthuoc/sudungthuoc/src/app/page.tsx)
- Middleware bảo vệ route: [middleware.ts](/opt/sudungthuoc/sudungthuoc/src/middleware.ts)
- Dashboard layout nội bộ: [layout.tsx](/opt/sudungthuoc/sudungthuoc/src/app/dashboard/layout.tsx)
- Schema báo cáo và cơ sở: [schema.prisma](/opt/sudungthuoc/sudungthuoc/prisma/schema.prisma)
- Component UI hiện có trong `src/components/ui`
- Chart stack hiện có dùng `recharts`

## Goal

Xây dựng trang `/` thành public dashboard tổng hợp toàn ngành:

- người xem không cần đăng nhập
- có bộ chọn kỳ báo cáo
- chỉ hiển thị dữ liệu aggregate
- không public dashboard nội bộ trong `/dashboard/*`
- có nút đăng nhập hoặc vào hệ thống theo trạng thái session

## Delivery Principles

- Không thay đổi schema Prisma.
- Không mở public bất kỳ route `/dashboard/*` nào.
- Không tái dùng trực tiếp các tab dashboard admin/facility hiện có.
- Không trả dữ liệu định danh cơ sở, địa chỉ, tọa độ, công ty, hợp đồng, hoặc row-level inventory trong API public.
- Tách tính toán aggregate vào server helper để dễ test và audit.
- UI public phải độc lập với `DashboardLayout`, notification, AI assistant, sidebar, và auth-only session wrapper.
- Dashboard phải degrade an toàn khi chưa có dữ liệu.

## Target File Structure

Runtime files:

- `src/lib/public-dashboard.ts`
- `src/app/api/public/dashboard/route.ts`
- `src/components/public-dashboard/PublicDashboardShell.tsx`
- `src/components/public-dashboard/PublicDashboardCharts.tsx`
- `src/components/public-dashboard/PublicDashboardKpiCards.tsx`
- `src/app/page.tsx`

Optional if component grows:

- `src/components/public-dashboard/public-dashboard-formatters.ts`
- `src/components/public-dashboard/public-dashboard-types.ts`

Docs:

- [2026-05-27-public-dashboard-design.md](/opt/sudungthuoc/sudungthuoc/docs/superpowers/specs/2026-05-27-public-dashboard-design.md)
- [2026-05-27-public-dashboard-implementation-plan.md](/opt/sudungthuoc/sudungthuoc/docs/superpowers/plans/2026-05-27-public-dashboard-implementation-plan.md)

## Phase 1: Build Public Aggregate Helper

### Objective

Tạo lớp server-side duy nhất chịu trách nhiệm lấy dữ liệu và tính aggregate public.

### Tasks

1. Tạo `src/lib/public-dashboard.ts`.
2. Định nghĩa type:
   - `PublicDashboardResponse`
   - `PublicDashboardKpis`
   - `PublicDashboardGroupBreakdown`
   - `PublicDashboardTrendPoint`
3. Thêm helper normalize boolean-like flags:
   - `isPositiveFlag(value)`
   - `isDomesticDrug(value)`
4. Thêm helper chọn kỳ:
   - lấy `reportPeriods` từ `ReportPeriod`
   - nếu không có `reportMonth`, dùng kỳ mới nhất
   - nếu `reportMonth` không tồn tại, trả lỗi rõ cho route xử lý
5. Query dữ liệu cho kỳ đang chọn:
   - active facility count
   - submitted facility count
   - inventory reports kèm các field aggregate cần thiết
6. Query dữ liệu trend cho tối đa 12 kỳ gần nhất.
7. Tính KPI:
   - `activeFacilityCount`
   - `submittedFacilityCount`
   - `submissionRate`
   - `totalInventoryValue`
   - `totalExportValue`
   - `distinctMappedDrugCount`
   - `domesticExportRatio`
8. Tính breakdown:
   - `groupValueBreakdown`
   - `payerBreakdown`
   - `domesticBreakdown`
   - `trend`
9. Gộp nhóm thuốc ngoài top 10 vào `Khác`.

### Acceptance Criteria

- Helper không phụ thuộc session.
- Helper không trả field định danh cơ sở hoặc row-level data.
- Tất cả phép chia bảo vệ trường hợp mẫu số bằng 0.
- Response trả số thay vì `Decimal` object.
- Dữ liệu thiếu nhóm thuốc có label fallback ổn định.

## Phase 2: Add Public Dashboard API Route

### Objective

Expose endpoint public an toàn cho trang chủ đọc dữ liệu.

### Tasks

1. Tạo `src/app/api/public/dashboard/route.ts`.
2. Export `revalidate = 300`.
3. Parse `reportMonth` từ query string.
4. Gọi helper `getPublicDashboardData`.
5. Trả JSON theo `PublicDashboardResponse`.
6. Với kỳ không hợp lệ, trả status `400` và message rõ.
7. Với lỗi server, log lỗi và trả status `500` generic.

### Acceptance Criteria

- `GET /api/public/dashboard` hoạt động không cần đăng nhập.
- `GET /api/public/dashboard?reportMonth=MM/YYYY` trả đúng kỳ.
- Response không chứa các key nhạy cảm:
  - `facilityId`
  - `facilityName`
  - `address`
  - `latitude`
  - `longitude`
  - `tenCongTy`
  - `soQdTrungThau`
  - `ngayBatDauHd`
  - `ngayKetThucHd`
- Route không import `auth()`.

## Phase 3: Build Public Dashboard UI Components

### Objective

Tạo giao diện dashboard public độc lập với dashboard nội bộ.

### Tasks

1. Tạo `src/components/public-dashboard/PublicDashboardShell.tsx`.
2. Tạo `PublicDashboardKpiCards.tsx` cho KPI band.
3. Tạo `PublicDashboardCharts.tsx` cho chart sections.
4. Shell nhận initial data từ server hoặc fetch client sau mount.
5. Thêm state `selectedReportMonth`.
6. Khi đổi kỳ:
   - gọi `/api/public/dashboard?reportMonth=...`
   - hiển thị loading state gọn
   - giữ dữ liệu cũ đến khi dữ liệu mới về hoặc hiển thị skeleton nhẹ
7. Render header:
   - tên hệ thống
   - mô tả số liệu tổng hợp toàn ngành
   - button `Đăng nhập` hoặc `Vào hệ thống`
8. Render toolbar chọn kỳ báo cáo.
9. Render notice:
   - `Số liệu được tổng hợp toàn ngành và không hiển thị dữ liệu từng cơ sở.`

### Acceptance Criteria

- UI không cần session provider riêng.
- Không có sidebar nội bộ.
- Không có AI assistant, notification bell, hoặc profile menu.
- Chọn kỳ không reload toàn trang.
- Empty state rõ khi chưa có dữ liệu.
- Text không tràn trên mobile.

## Phase 4: Wire Homepage Route

### Objective

Đổi `/` từ redirect sang public dashboard.

### Tasks

1. Cập nhật `src/app/page.tsx`.
2. Dùng `auth()` để xác định trạng thái session cho button header.
3. Không redirect người đã đăng nhập khỏi `/`.
4. Tính `systemHref` theo role:
   - `ADMIN`: `/dashboard/admin`
   - `COMPANY`: `/dashboard/company`
   - `FACILITY`: `/dashboard/facility`
5. Fetch initial public dashboard data server-side.
6. Render `PublicDashboardShell`.
7. Nếu helper lỗi do chưa có kỳ báo cáo, render shell với empty data hợp lệ.

### Acceptance Criteria

- `/` mở được khi chưa đăng nhập.
- `/` mở được khi đã đăng nhập.
- Button header đúng trạng thái đăng nhập.
- `/login` vẫn hoạt động bình thường.
- `/dashboard/*` vẫn được bảo vệ bởi middleware và dashboard layout.

## Phase 5: Visual Polish And Responsiveness

### Objective

Đảm bảo trang chủ public nhìn như dashboard thật, không giống landing page marketing.

### Tasks

1. Dùng layout full-width có inner max-width ổn định.
2. KPI cards dùng grid responsive:
   - 1 cột trên mobile nhỏ
   - 2 cột trên tablet
   - 3-6 cột trên desktop tùy chiều rộng
3. Chart cards có chiều cao ổn định để tránh layout shift.
4. Dùng palette đa sắc vừa phải, tránh một màu chủ đạo quá mạnh.
5. Tooltip chart hiển thị full VND.
6. KPI tiền dùng compact VND.
7. Tránh card lồng card.
8. Đảm bảo chart empty state không làm container collapse.

### Acceptance Criteria

- Mobile không có text overlap.
- Desktop dashboard scan được KPI và chart chính trong first viewport.
- Chart có chiều cao ổn định khi loading, empty, và có data.
- Không có in-app text hướng dẫn cách sử dụng dài dòng.

## Phase 6: Security And Regression Checks

### Objective

Xác nhận feature public không làm suy yếu auth hiện có.

### Tasks

1. Kiểm tra middleware không cần mở thêm route dashboard.
2. Gọi `/api/public/dashboard` khi chưa đăng nhập.
3. Gọi `/dashboard/admin` khi chưa đăng nhập.
4. Gọi `/api/admin/dashboard/overview` khi chưa đăng nhập.
5. Inspect JSON API public để đảm bảo không có field nhạy cảm.
6. Kiểm tra button `Vào hệ thống` với session admin/facility/company nếu test account sẵn có.

### Acceptance Criteria

- API public chỉ trả aggregate.
- API admin vẫn trả unauthorized khi chưa đăng nhập.
- Dashboard nội bộ vẫn redirect login khi chưa đăng nhập.
- Không có field nhạy cảm trong response public.

## Phase 7: Verification

### Objective

Chạy các kiểm tra phù hợp với repo và xác nhận trang render được.

### Tasks

1. Chạy typecheck/build theo script repo có sẵn.
2. Chạy lint nếu script ổn định.
3. Start dev server.
4. Mở `/` trên desktop và mobile viewport bằng browser automation nếu khả dụng.
5. Chụp kiểm tra visual:
   - header
   - KPI band
   - chart sections
   - select kỳ báo cáo
6. Kiểm tra đổi kỳ bằng interaction thật.

### Acceptance Criteria

- Build hoặc typecheck pass.
- Không có runtime error ở `/`.
- Chọn kỳ cập nhật dashboard.
- Không còn session redirect khỏi `/`.
- Nếu không chạy được lệnh nào do môi trường, ghi rõ trong kết quả cuối.

## Rollback Plan

Nếu phát hiện rủi ro public data sau khi triển khai:

1. Đổi `src/app/page.tsx` tạm thời về redirect `/login`.
2. Giữ code API/UI nhưng không route từ trang chủ.
3. Sau đó thêm cơ chế snapshot duyệt bởi admin trước khi bật lại public dashboard.

## Done Definition

Feature hoàn thành khi:

- `/` là public dashboard tổng hợp toàn ngành.
- Người xem chọn được kỳ báo cáo.
- API public không yêu cầu đăng nhập và chỉ trả aggregate.
- Dashboard nội bộ và API nội bộ vẫn được bảo vệ.
- UI responsive và không vỡ layout.
- Verification command chính đã chạy hoặc có lý do cụ thể nếu không chạy được.
