# Dashboard Dark Mode Design

## Context

App hiện đã có nền tảng một phần cho dark mode:

- `next-themes` đã có trong `package.json`.
- `src/app/globals.css` đã khai báo CSS variables cho `:root` và `.dark`.
- Tailwind v4 đang dùng `@custom-variant dark (&:is(.dark *))`.
- Một số UI primitives trong `src/components/ui/` đã có class `dark:*`.

Phần còn thiếu:

- `ThemeProvider` chưa được gắn ở root layout.
- Chưa có control đổi theme cho người dùng.
- Nhiều dashboard component đang hard-code màu sáng như `bg-white`, `text-slate-*`, `border-slate-*`, `bg-slate-50`.
- Recharts tooltip, axis, grid, card wrapper đang dùng màu cố định nên sẽ không tự thích nghi dark mode.

Người dùng đã duyệt phạm vi `Dashboard trước`: triển khai dark mode cho dashboard layout và 4 tab chính trước, chưa mở rộng sang toàn bộ admin CRUD pages.

## Goal

Triển khai dark mode hiện đại, ổn định và dễ mở rộng cho dashboard:

- Người dùng đổi được `Sáng`, `Tối`, hoặc `Hệ thống`.
- Lựa chọn theme được ghi nhớ.
- Dashboard chính đọc tốt, ít chói, phù hợp công cụ quản lý vận hành.
- Light mode hiện tại không bị regression.
- Các chart, table, cards, filters trong dashboard hoạt động tốt ở cả hai mode.

## Scope

Bao gồm:

- Thêm theme infrastructure bằng `next-themes`.
- Thêm `ThemeProvider` ở root.
- Thêm `ThemeToggle` trong dashboard header hoặc layout dùng chung.
- Dark-mode polish cho:
  - `DashboardLayout`
  - `DashboardShell`
  - `FacilityDashboardShell`
  - `Tab1Overview`
  - `Tab2Supply`
  - `Tab3Tender`
  - `Tab4Analysis`
  - component chart mới của tab `Phân tích`
- Chuẩn hóa chart colors/tooltip/grid/axis cho Recharts.
- Chuyển dashboard từ hard-coded light colors sang semantic tokens khi hợp lý.

Không bao gồm:

- Không refactor toàn bộ admin CRUD pages như users, master-drugs, reports advanced.
- Không đổi design system hoặc brand palette lớn.
- Không thay đổi business logic hoặc API.
- Không thêm nhiều theme màu tùy biến.
- Không thay đổi schema database.

## Design Direction

Dark mode dùng hướng `operational dark`:

- Không dùng nền đen tuyệt đối.
- Ưu tiên nền tối trung tính, chữ rõ, viền nhẹ.
- Dashboard phải phù hợp tác vụ đọc bảng, so sánh số liệu, xem chart lâu.
- Tránh gradient sáng gắt ở dark mode.
- Giữ màu semantic cho trạng thái nghiệp vụ như success/warning/danger, nhưng giảm độ chói bằng `dark:*` variants.

## Theme Architecture

### Provider

Tạo client component:

```txt
src/components/theme/ThemeProvider.tsx
```

Sử dụng:

```tsx
import { ThemeProvider as NextThemesProvider } from "next-themes";

<NextThemesProvider
  attribute="class"
  defaultTheme="system"
  enableSystem
  disableTransitionOnChange
>
  {children}
</NextThemesProvider>
```

Root layout cập nhật:

- thêm `suppressHydrationWarning` vào `<html>`
- wrap body content bằng `ThemeProvider`
- giữ `Toaster`

### Theme Toggle

Tạo:

```txt
src/components/theme/ThemeToggle.tsx
```

Yêu cầu:

- Client component.
- Dùng `useTheme` từ `next-themes`.
- Cho phép chọn:
  - `light`
  - `dark`
  - `system`
- Dùng icon từ `lucide-react`:
  - `Sun`
  - `Moon`
  - `Monitor`
- Có tooltip/label rõ.
- Tránh hydration mismatch bằng `mounted` state trước khi render trạng thái theme thật.

Vị trí:

- Đặt trong dashboard header/user area dùng chung.
- Nếu `DashboardLayout` là nơi phù hợp nhất, đặt toggle ở góc phải cạnh user/actions.
- Admin và CSYT đều dùng cùng toggle.

## Styling Strategy

### Preferred Token Replacements

Trong dashboard, ưu tiên chuyển:

```txt
bg-white          -> bg-card
text-slate-900    -> text-foreground
text-slate-800    -> text-foreground
text-slate-700    -> text-foreground hoặc text-muted-foreground tùy mức nhấn
text-slate-500    -> text-muted-foreground
text-gray-500     -> text-muted-foreground
border-slate-200  -> border-border
border-gray-100   -> border-border
bg-slate-50       -> bg-muted/40
bg-gray-50        -> bg-muted/40
```

Không cần thay mọi class một cách máy móc. Các màu semantic như `rose`, `amber`, `emerald`, `sky` được giữ nếu phục vụ trạng thái, nhưng cần thêm dark variants khi nền/chữ chưa đủ tương phản.

### Cards

Card dashboard nên dùng:

```txt
rounded-xl border border-border bg-card text-card-foreground shadow-sm
```

Trong dark mode:

- giảm shadow nếu gây bẩn nền
- dùng border nhẹ để phân tách vùng
- tránh card trắng nằm trên nền tối

### Tables

Table cần đảm bảo:

- header đủ tương phản
- sticky header không trong suốt khó đọc
- row hover có `dark:hover:bg-muted/30`
- cell text dùng `text-foreground` hoặc `text-muted-foreground`
- badge semantic có dark variants

### Forms And Filters

Input/select/filter controls:

- với control mới, dùng primitives trong `src/components/ui/`
- với native control hiện có, chuyển sang token classes thay vì đổi component hàng loạt
- nền `bg-background` hoặc `bg-card`
- border `border-border`
- focus ring theo token `ring`

### Gradients

KPI cards hiện có gradient sáng ở một số dashboard tab. Với dark mode:

- hoặc dùng `dark:from-* dark:to-*` dịu hơn
- hoặc chuyển sang card token + accent stripe/icon

Phase này ưu tiên dashboard đọc tốt hơn là giữ gradient bằng mọi giá.

## Chart Strategy

Recharts cần style theo theme thay vì hard-code màu sáng.

Tạo client helper/hook nhỏ:

```txt
src/components/dashboard/chart-theme.ts
```

Đề xuất contract:

```ts
interface DashboardChartTheme {
  axis: string;
  grid: string;
  tooltipBackground: string;
  tooltipBorder: string;
  tooltipText: string;
  mutedText: string;
}
```

Triển khai bằng `useTheme().resolvedTheme` từ `next-themes`, trả về palette cố định cho light/dark để Recharts nhận được màu dạng string.

Chart requirements:

- Axis/tick màu rõ trong dark mode.
- Grid dịu, không quá sáng.
- Tooltip dùng `bg-popover`, `text-popover-foreground`, `border-border`.
- Legend text đọc được.
- Bar/pie colors giữ đủ phân biệt ở cả light/dark.

## Files To Update

Theme infrastructure:

- `src/app/layout.tsx`
- `src/components/theme/ThemeProvider.tsx`
- `src/components/theme/ThemeToggle.tsx`

Dashboard shell:

- `src/components/DashboardLayout.tsx`
- `src/components/dashboard/DashboardShell.tsx`
- `src/components/dashboard/FacilityDashboardShell.tsx`

Dashboard tabs:

- `src/components/dashboard/Tab1Overview.tsx`
- `src/components/dashboard/Tab2Supply.tsx`
- `src/components/dashboard/Tab3Tender.tsx`
- `src/components/dashboard/Tab4Analysis.tsx`
- `src/components/dashboard/analysis/UsageOverviewSection.tsx`

Chart helper:

- `src/components/dashboard/chart-theme.ts`

## Rollout Phases

### Phase 1: Theme Foundation

- Add `ThemeProvider`.
- Add `ThemeToggle`.
- Place toggle in dashboard layout.
- Verify `light`, `dark`, `system` work and persist.

### Phase 2: Dashboard Shell

- Convert page background, header, sidebar, tabs, filters.
- Ensure both Admin and CSYT dashboard shells look coherent.
- Keep navigation states readable.

### Phase 3: Dashboard Tabs

- Convert cards, tables, alerts, badges, empty/loading/error states in 4 tabs.
- Prioritize `Tab4Analysis` because it has the newest chart/table work.
- Keep light mode visually close to current behavior.

### Phase 4: Charts

- Normalize Recharts axis/grid/tooltip/legend.
- Verify all charts in overview/supply/tender/analysis read well in dark mode.

### Phase 5: Verification

- Run lint and type-check.
- Manual verify dashboard Admin and CSYT in:
  - light
  - dark
  - system
- Check chart tooltip contrast.
- Check table scroll/sticky headers.
- Check mobile-ish narrow layout if feasible.

## Accessibility

Requirements:

- Theme toggle is keyboard accessible.
- Icon-only controls have `aria-label` or visible text.
- Text contrast remains acceptable in dark mode.
- Focus rings remain visible.
- Theme change does not cause major layout shift.

## Risks

- Hard-coded dashboard colors may require broad but mechanical edits.
- Chart tooltip/content can look disconnected if Recharts still uses inline light styles.
- Some admin pages outside dashboard will remain partially light; this is acceptable for phase 1 and should be documented.
- Existing generated/client files and unrelated dirty worktree changes must not be touched.

## Acceptance Criteria

- User can choose `Sáng`, `Tối`, or `Hệ thống`.
- Choice persists across refresh.
- Dashboard shell, Admin dashboard, and Facility dashboard support dark mode.
- Tabs `Tổng quan`, `Cung ứng`, `Đấu thầu`, `Phân tích` are readable in dark mode.
- Recharts axis/grid/tooltip/legend are readable.
- Tables and filters do not show white blocks in dark mode.
- Light mode remains usable and visually close to current app.
- ESLint and TypeScript pass for changed files.

## Future Work

Sau phase dashboard-first, mở rộng dark mode cho:

- admin CRUD pages
- report import/review pages
- master drug management
- procurement pages
- AI agent/admin usage pages
