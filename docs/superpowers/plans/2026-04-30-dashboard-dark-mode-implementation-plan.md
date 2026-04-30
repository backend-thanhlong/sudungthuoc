# Dashboard Dark Mode Implementation Plan

## Inputs

Plan này dựa trên:

- Spec đã duyệt: [2026-04-30-dashboard-dark-mode-design.md](/opt/sudungthuoc/sudungthuoc/docs/superpowers/specs/2026-04-30-dashboard-dark-mode-design.md)
- Root layout: [layout.tsx](/opt/sudungthuoc/sudungthuoc/src/app/layout.tsx)
- Global theme tokens: [globals.css](/opt/sudungthuoc/sudungthuoc/src/app/globals.css)
- Dashboard layout: [DashboardLayout.tsx](/opt/sudungthuoc/sudungthuoc/src/components/DashboardLayout.tsx)
- Dashboard shells:
  - [DashboardShell.tsx](/opt/sudungthuoc/sudungthuoc/src/components/dashboard/DashboardShell.tsx)
  - [FacilityDashboardShell.tsx](/opt/sudungthuoc/sudungthuoc/src/components/dashboard/FacilityDashboardShell.tsx)
- Dashboard tabs:
  - [Tab1Overview.tsx](/opt/sudungthuoc/sudungthuoc/src/components/dashboard/Tab1Overview.tsx)
  - [Tab2Supply.tsx](/opt/sudungthuoc/sudungthuoc/src/components/dashboard/Tab2Supply.tsx)
  - [Tab3Tender.tsx](/opt/sudungthuoc/sudungthuoc/src/components/dashboard/Tab3Tender.tsx)
  - [Tab4Analysis.tsx](/opt/sudungthuoc/sudungthuoc/src/components/dashboard/Tab4Analysis.tsx)
  - [UsageOverviewSection.tsx](/opt/sudungthuoc/sudungthuoc/src/components/dashboard/analysis/UsageOverviewSection.tsx)

## Goal

Triển khai dark mode hiện đại cho dashboard-first scope:

- `Sáng`, `Tối`, `Hệ thống`
- lựa chọn theme persist qua refresh
- dashboard Admin và CSYT đọc tốt ở dark mode
- 4 tab chính không còn mảng trắng gắt hoặc chart khó đọc
- light mode vẫn gần với giao diện hiện tại

## Delivery Principles

- Không thay đổi business logic, API hoặc schema.
- Không mở rộng sang toàn bộ admin CRUD pages trong phase này.
- Không đụng file generated/unrelated dirty worktree.
- Ưu tiên semantic tokens thay vì hard-code màu mới.
- Chart Recharts dùng helper theme chung để tránh copy-paste inline style.
- Chia thay đổi theo cụm nhỏ và chạy lint/type-check sau khi hoàn tất.

## Target Files

Theme foundation:

- `src/app/layout.tsx`
- `src/components/theme/ThemeProvider.tsx`
- `src/components/theme/ThemeToggle.tsx`

Dashboard shell:

- `src/components/DashboardLayout.tsx`
- `src/components/dashboard/DashboardShell.tsx`
- `src/components/dashboard/FacilityDashboardShell.tsx`

Chart helper:

- `src/components/dashboard/chart-theme.ts`

Dashboard tabs:

- `src/components/dashboard/Tab1Overview.tsx`
- `src/components/dashboard/Tab2Supply.tsx`
- `src/components/dashboard/Tab3Tender.tsx`
- `src/components/dashboard/Tab4Analysis.tsx`
- `src/components/dashboard/analysis/UsageOverviewSection.tsx`

Docs:

- [2026-04-30-dashboard-dark-mode-design.md](/opt/sudungthuoc/sudungthuoc/docs/superpowers/specs/2026-04-30-dashboard-dark-mode-design.md)
- [2026-04-30-dashboard-dark-mode-implementation-plan.md](/opt/sudungthuoc/sudungthuoc/docs/superpowers/plans/2026-04-30-dashboard-dark-mode-implementation-plan.md)

## Phase 1: Add Theme Foundation

### Objective

Bật cơ chế theme class ở root và thêm control đổi theme.

### Tasks

1. Tạo `src/components/theme/ThemeProvider.tsx`.
2. Tạo `src/components/theme/ThemeToggle.tsx`.
3. Cập nhật `src/app/layout.tsx`:
   - `<html lang="vi" suppressHydrationWarning>`
   - wrap `{children}` và `Toaster` bằng `ThemeProvider`
4. ThemeToggle:
   - dùng `useTheme`
   - có mounted guard
   - dùng icon `Sun`, `Moon`, `Monitor`
   - hỗ trợ `light`, `dark`, `system`
   - có `aria-label`
5. Chọn UI toggle gọn:
   - dropdown hoặc segmented menu nhỏ
   - không tạo floating control riêng trên page

### Acceptance Criteria

- `dark` class được gắn lên `<html>` khi chọn dark.
- Theme persist sau refresh.
- System mode theo OS/browser.
- Không có hydration warning do theme toggle.

## Phase 2: Place Toggle In Dashboard Layout

### Objective

Đặt control theme ở vị trí dùng chung cho Admin/CSYT dashboard.

### Tasks

1. Đọc cấu trúc `DashboardLayout`.
2. Đặt `ThemeToggle` ở khu vực header/user actions.
3. Đảm bảo layout mobile/narrow không vỡ.
4. Nếu header có action/logout/user menu, đặt theme toggle cạnh cụm đó.
5. Không đặt toggle riêng trong từng tab.

### Acceptance Criteria

- Admin và CSYT đều thấy theme toggle.
- Toggle không che hoặc đẩy lệch các filter/dashboard controls.
- Keyboard focus rõ.

## Phase 3: Dashboard Shell Tokenization

### Objective

Chuyển nền, header, sidebar/tabs/filter shells sang dark-aware tokens.

### Tasks

1. Cập nhật `DashboardLayout`:
   - background page
   - header background/border
   - nav text states
   - user/action area
2. Cập nhật `DashboardShell`:
   - tabs list
   - month/facility filters
   - page title/subtitle
   - loading/error wrapper nếu có
3. Cập nhật `FacilityDashboardShell` tương tự.
4. Thay hard-coded light colors bằng:
   - `bg-background`, `bg-card`, `bg-muted/40`
   - `text-foreground`, `text-muted-foreground`
   - `border-border`
5. Giữ semantic active states nhưng thêm `dark:` khi cần.

### Acceptance Criteria

- Dashboard shell không còn nền trắng gắt khi dark mode.
- Tabs/filter controls đọc tốt trong cả light/dark.
- Light mode vẫn gần giao diện hiện tại.

## Phase 4: Add Shared Chart Theme Helper

### Objective

Chuẩn hóa màu chart theo theme cho Recharts.

### Tasks

1. Tạo `src/components/dashboard/chart-theme.ts`.
2. Export `useDashboardChartTheme`.
3. Hook dùng `useTheme().resolvedTheme`.
4. Trả về:
   - `axis`
   - `grid`
   - `tooltipBackground`
   - `tooltipBorder`
   - `tooltipText`
   - `mutedText`
   - `cardBackground`
5. Tránh đọc trực tiếp `window` trong render đầu.
6. Cập nhật chart tooltip helper dùng theme object.

### Acceptance Criteria

- Axis/grid/tooltip trong dashboard chart có màu phù hợp dark mode.
- Không lặp object màu thủ công quá nhiều trong từng component.
- Hook chỉ dùng trong client components.

## Phase 5: Dark Mode For Tab4 Analysis

### Objective

Ưu tiên tab mới nhất và nhiều chart/table nhất.

### Tasks

1. Cập nhật `Tab4Analysis.tsx`:
   - Metric cards
   - ABC group cards
   - Pareto chart wrapper
   - table wrapper/header/rows
   - filter buttons/input
   - monitoring cards
   - empty/error/loading states
2. Cập nhật `UsageOverviewSection.tsx`:
   - section header
   - chart cards
   - segmented metric switch
   - donut/chart tooltip
   - Admin facility comparison
3. Dùng `useDashboardChartTheme` cho Recharts:
   - CartesianGrid
   - XAxis/YAxis tick
   - Tooltip content wrapper
   - Legend wrapper nếu cần
4. Giữ badge semantic `rose/amber/emerald/sky`, thêm dark variants.

### Acceptance Criteria

- Tab `Phân tích` không có card/table trắng gắt trong dark mode.
- Pareto, usage overview, donut, stacked bar đều đọc được.
- Bảng ABC sticky header và row hover rõ.
- Light mode không bị mất màu nhóm A/B/C.

## Phase 6: Dark Mode For Tab1 Overview

### Objective

Chuyển tab `Tổng quan` sang dark-aware layout/charts.

### Tasks

1. Cập nhật KPI cards:
   - gradient có dark variants hoặc chuyển sang card token.
2. Cập nhật chart cards:
   - background/border/text
   - stacked bar
   - donut
   - treemap tooltip
   - heatmap table
3. Dùng chart theme helper cho Recharts.
4. Cập nhật table/heatmap rows và progress bars để đủ tương phản.

### Acceptance Criteria

- KPI cards không chói ở dark mode.
- Chart tooltip không còn nền trắng không kiểm soát.
- Heatmap table đọc tốt.

## Phase 7: Dark Mode For Tab2 Supply

### Objective

Chuyển tab `Cung ứng` sang dark-aware layout/charts/tables.

### Tasks

1. Audit `Tab2Supply.tsx` và child components trong `src/components/dashboard/supply/`.
2. Tokenize cards, section wrappers, text, borders.
3. Update any Recharts chart with chart theme helper.
4. Update status badges/alerts with dark variants.
5. Keep dense operational layout.

### Acceptance Criteria

- Supply cards/sections readable in dark mode.
- Charts and status components maintain contrast.
- No obvious white-only panels remain in supply tab.

## Phase 8: Dark Mode For Tab3 Tender

### Objective

Chuyển tab `Đấu thầu` sang dark-aware layout/charts/tables.

### Tasks

1. Tokenize cards, tables, filters, text, borders.
2. Update tender status colors with dark variants.
3. Update charts with chart theme helper.
4. Verify empty/loading/error states.

### Acceptance Criteria

- Tender dashboard readable in dark mode.
- Tables/status badges retain meaning.
- Light mode remains usable.

## Phase 9: Verification And Rebuild

### Objective

Kiểm tra automated và manual cho dashboard-first dark mode.

### Tasks

1. Run ESLint on changed files:

```bash
npx eslint src/app/layout.tsx src/components/theme/ThemeProvider.tsx src/components/theme/ThemeToggle.tsx src/components/DashboardLayout.tsx src/components/dashboard/DashboardShell.tsx src/components/dashboard/FacilityDashboardShell.tsx src/components/dashboard/chart-theme.ts src/components/dashboard/Tab1Overview.tsx src/components/dashboard/Tab2Supply.tsx src/components/dashboard/Tab3Tender.tsx src/components/dashboard/Tab4Analysis.tsx src/components/dashboard/analysis/UsageOverviewSection.tsx
```

Add child supply files if changed.

2. Run type-check:

```bash
npx tsc --noEmit --pretty false
```

3. Run production build via Docker:

```bash
docker compose up -d --build
```

4. Manual verification:
   - Admin dashboard light
   - Admin dashboard dark
   - Admin dashboard system
   - Facility dashboard light
   - Facility dashboard dark
   - Tab switching across 4 tabs
   - Chart tooltip contrast
   - Table sticky headers
   - Narrow viewport sanity check

### Acceptance Criteria

- ESLint pass.
- Type-check pass.
- Docker build/start pass.
- Dashboard is usable in light/dark/system.
- Known out-of-scope admin pages may remain partially light and are documented.

## Rollout Notes

- This is a UI-only change.
- No database migration.
- No API changes.
- If a dashboard child component has heavy hard-coded colors, tokenization can happen in the same phase as its parent tab.
- Avoid broad formatting churn; keep diffs focused.

## Success Criteria

- Users can switch dashboard theme between `Sáng`, `Tối`, `Hệ thống`.
- Choice persists after refresh.
- Admin and CSYT dashboards support dark mode.
- Four main dashboard tabs are readable and visually coherent in dark mode.
- Recharts components have dark-aware axis/grid/tooltip.
- Light mode still works.
