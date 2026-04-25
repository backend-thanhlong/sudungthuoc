# Modern Sidebar App Shell Implementation Plan

## Inputs

Plan nay dua tren:

- Spec da duyet: [2026-04-25-modern-sidebar-app-shell-design.md](/opt/sudungthuoc/sudungthuoc/docs/superpowers/specs/2026-04-25-modern-sidebar-app-shell-design.md)
- Dashboard shell hien tai: [DashboardLayout.tsx](/opt/sudungthuoc/sudungthuoc/src/components/DashboardLayout.tsx)
- Shared UI primitives:
  - [button.tsx](/opt/sudungthuoc/sudungthuoc/src/components/ui/button.tsx)
  - [tooltip.tsx](/opt/sudungthuoc/sudungthuoc/src/components/ui/tooltip.tsx)
  - [dropdown-menu.tsx](/opt/sudungthuoc/sudungthuoc/src/components/ui/dropdown-menu.tsx)
- Global theme tokens: [globals.css](/opt/sudungthuoc/sudungthuoc/src/app/globals.css)

## Goal

Trien khai sidebar theo huong `app shell sang, trung tinh` de:

- giao dien dashboard gon va hien dai hon
- active route ro hon
- icon navigation dong bo bang `lucide-react`
- desktop collapsed sidebar van dung duoc bang tooltip
- mobile drawer nhat quan voi desktop sidebar
- khong thay doi route, auth, session, API, permission, hay cac page con

## Delivery Principles

- Chi sua app shell trong pham vi can thiet, uu tien [DashboardLayout.tsx](/opt/sudungthuoc/sudungthuoc/src/components/DashboardLayout.tsx)
- Giu nguyen href, label, role menu, va logic session hien co
- Refactor navigation data de thay SVG inline bang lucide icons, nhung khong doi cau truc menu nghiep vu
- Dung style sang/trung tinh: nen trang, border slate, active blue nhe
- Dung tooltip chi khi desktop sidebar collapsed; mobile drawer va expanded desktop khong can tooltip cho tung item
- Khong sua cac thay doi dang co san trong worktree ngoai file sidebar neu khong can

## Current Constraints

- `DashboardLayout.tsx` dang gom ca menu data, state, render sidebar, mobile drawer, header, user block
- Admin/facility/company nav arrays hien dang chua JSX icon inline, lam file dai va kho bao tri
- `openDropdowns` dang dung label lam key; co the giu de tranh doi behavior
- Active logic cua item thuong hien chi so sanh `pathname === href`; nen route detail con co the khong active voi item khong co children
- Tooltip component da co trong repo nhung can kiem tra export/API truoc khi dung
- App dung Tailwind v4 va shadcn-style primitives, nen style nen tiep tuc bang utility classes

## Target File Surface

Bat buoc:

- `src/components/DashboardLayout.tsx`

Co the cham neu implementation yeu cau, nhung mac dinh tranh:

- `src/app/globals.css`
- `src/components/ui/tooltip.tsx`

Docs:

- [2026-04-25-modern-sidebar-app-shell-design.md](/opt/sudungthuoc/sudungthuoc/docs/superpowers/specs/2026-04-25-modern-sidebar-app-shell-design.md)
- [2026-04-25-modern-sidebar-app-shell-implementation-plan.md](/opt/sudungthuoc/sudungthuoc/docs/superpowers/plans/2026-04-25-modern-sidebar-app-shell-implementation-plan.md)

## Rollout Shape

Scope nay nen trien khai qua 5 phase:

1. `Navigation data cleanup`
2. `Shared nav render helpers`
3. `Desktop sidebar redesign`
4. `Mobile drawer and header alignment`
5. `Verification and polish`

Thu tu nay giu rui ro thap:

- doi data icon truoc de render helpers gon hon
- helper active/tooltip truoc khi sua visual states
- desktop sidebar la thay doi lon nhat nen lam rieng
- mobile drawer tai su dung style sau khi desktop da on
- verification cuoi de bat regression ve collapsed/group/mobile/print route

## Phase 1: Navigation Data Cleanup

### Objective

Chuan hoa nav item icon bang lucide components va giam JSX inline lap lai.

### Tasks

1. Cap nhat import lucide trong [DashboardLayout.tsx](/opt/sudungthuoc/sudungthuoc/src/components/DashboardLayout.tsx):
   - giu `Menu`, `X`
   - them cac icon tuong duong nhu `LayoutDashboard`, `ShoppingCart`, `ClipboardList`, `Megaphone`, `CircleCheck`, `Search`, `BarChart3`, `Pill`, `ClipboardCheck`, `FileBarChart`, `Settings`, `Users`, `Building2`, `CalendarDays`, `ListTree`, `History`, `PackageCheck`, `QrCode`, `PanelLeftClose`, `PanelLeftOpen`, `ChevronDown`, `LogOut`, `KeyRound`
2. Doi `NavItem.icon` tu `React.ReactNode` sang lucide icon component type, vi du `LucideIcon`
3. Thay cac JSX SVG inline trong `adminNavItems`, `facilityNavItems`, `companyNavItems` bang icon component
4. Giu nguyen:
   - `label`
   - `href`
   - menu hierarchy
   - role-specific nav selection
5. Neu icon nao khong map chinh xac, chon icon gan nghiep vu nhat va giu style dong nhat

### Acceptance Criteria

- Navigation data khong con chua SVG inline cho item/menu chinh
- TypeScript compile duoc voi icon component type
- Khong doi route hoac menu label

## Phase 2: Shared Nav Render Helpers

### Objective

Lam render nav item ro hon va ho tro active state dung cho route con, collapsed tooltip.

### Tasks

1. Them helper `isNavItemActive(item)`:
   - voi item co children: active neu bat ky child match exact hoac pathname startsWith child href
   - voi item thuong: active neu exact hoac pathname startsWith `${item.href}/`
   - bo qua href dang hash (`#...`) tru khi child active
2. Them helper render icon:
   - size parent: `size-5`
   - size child: `size-4`
   - icon color dua tren active/hover class cua wrapper
3. Them component/helper `NavTooltip`:
   - neu `expanded` thi render children truc tiep
   - neu collapsed desktop thi wrap bang TooltipProvider/Tooltip/TooltipTrigger/TooltipContent
4. Giu `toggleDropdown` va `openDropdowns` behavior hien tai
5. Khi collapsed va item co children:
   - click parent van toggle state neu can
   - tooltip hien label parent
   - active parent van co active state neu route con active

### Acceptance Criteria

- Active state dung cho detail route con nhu `/dashboard/company/dutru-dat-hang/[id]/print` khi khong phai print route
- Collapsed sidebar co tooltip cho parent va direct links
- Expanded sidebar va mobile drawer khong bi thua tooltip

## Phase 3: Desktop Sidebar Redesign

### Objective

Doi desktop sidebar sang visual sang/trung tinh theo spec.

### Tasks

1. Doi desktop sidebar:
   - expanded width tu `w-64` sang `w-72`
   - collapsed width tu `w-20` sang `w-[72px]`
   - background `bg-white`
   - border `border-r border-slate-200`
   - bo gradient va `shadow-xl`
2. Cap nhat main content padding desktop:
   - expanded: `xl:pl-72`
   - collapsed: `xl:pl-[72px]`
3. Redesign brand area:
   - icon square 40px
   - title `Su dung thuoc`
   - subtitle `Mua sam & kho duoc`
   - collapsed chi hien icon va nut collapse
4. Doi collapse button sang lucide:
   - expanded: `PanelLeftClose`
   - collapsed: `PanelLeftOpen`
   - giu `aria-label`
5. Doi nav item classes:
   - base item height 40-44px
   - radius `rounded-lg`
   - default text/icon slate
   - hover slate nhat
   - active blue nhat + left rail 3px
6. Doi group child style:
   - bo border-left xanh dam
   - child thut vao nhe
   - active child co blue nhe
   - chevron dung `ChevronDown`
7. Redesign user block:
   - nen trang/transparent
   - border top slate
   - avatar initials giu
   - collapsed co tooltip ten va role

### Acceptance Criteria

- Sidebar desktop expanded trong sang va it nang hon gradient cu
- Sidebar collapsed can doi, icon khong lech layout
- Active route co left rail va mau blue de nhan biet nhanh
- User block khong che nav khi danh sach dai; nav co scroll neu can

## Phase 4: Mobile Drawer And Header Alignment

### Objective

Dong bo mobile drawer voi desktop sidebar moi ma khong doi behavior.

### Tasks

1. Doi mobile drawer:
   - width `w-80 max-w-[calc(100vw-2rem)]`
   - background `bg-white`
   - border slate
   - bo gradient xanh
2. Doi mobile brand giong desktop:
   - title `Su dung thuoc`
   - subtitle `Mua sam & kho duoc`
   - close button style slate/blue nhe
3. Reuse nav render voi `expanded: true`
4. Giu behavior:
   - overlay click dong drawer
   - click link dong drawer
   - group menu van expand/collapse
5. Tinh chinh header:
   - border `border-slate-200`
   - title `text-slate-800`
   - menu button hover nhat quan voi sidebar
6. Giu print route bypass nhu hien tai

### Acceptance Criteria

- Mobile drawer nhat quan voi desktop expanded sidebar
- Drawer khong tran viewport nho
- Click navigation link dong drawer
- Header mobile khong bi chen boi title dai

## Phase 5: Verification And Polish

### Objective

Bat regression ve lint, accessibility, route active, collapsed/mobile behavior.

### Tasks

1. Chay `npm run lint`
2. Neu lint phat hien import/icon khong dung, sua ngay trong `DashboardLayout.tsx`
3. Kiem tra manual bang dev server neu kha thi:
   - role admin expanded/collapsed
   - role facility expanded/collapsed
   - role company expanded/collapsed
   - mobile drawer width phone
   - group menu active khi vao route con
   - print route khong co shell
4. Neu khong chay duoc dev server trong sandbox, ghi ro ly do va verification da chay
5. Ra soat long labels:
   - `Tổng hợp Xuất-Nhập-Tồn`
   - `Danh mục nhóm điều trị`
   - `Quản lý kỳ báo cáo`
   - `Thông báo mời thầu`
6. Ra soat accessibility:
   - `aria-label`
   - tooltip collapsed
   - focus ring khong bi mat

### Acceptance Criteria

- `npm run lint` pass hoac co ket qua loi khong lien quan duoc ghi ro
- Dashboard shell compile duoc
- Sidebar desktop expanded/collapsed hoat dong
- Mobile drawer hoat dong
- Route active/group active dung
- Khong co thay doi ngoai pham vi can thiet

## Implementation Checklist

- [ ] Refactor `NavItem.icon` sang lucide component type
- [ ] Replace inline SVG nav icons
- [ ] Add active-state helper
- [ ] Add collapsed tooltip wrapper
- [ ] Redesign desktop sidebar shell
- [ ] Redesign desktop nav item/group states
- [ ] Redesign user block
- [ ] Align mobile drawer style
- [ ] Align header border/title/menu button style
- [ ] Run lint
- [ ] Manual responsive smoke test if dev server is available

## Risks And Mitigations

- Risk: `DashboardLayout.tsx` file lon, de tao diff kho doc.
  Mitigation: refactor theo phase, giu logic state/auth nguyen ven.
- Risk: Tooltip wrapper lam nested interactive element sai.
  Mitigation: dung `asChild` cho `TooltipTrigger` neu primitive ho tro.
- Risk: Active route startsWith match nham route gan nhau.
  Mitigation: chi match `${href}/`, khong match prefix raw.
- Risk: Nav dai che user block.
  Mitigation: desktop sidebar dung flex column, nav `overflow-y-auto`, user block shrink-0 thay vi absolute.
- Risk: Collapsed group children khong hien.
  Mitigation: collapsed mode chi can parent active + tooltip; expanded/mobile van hien children.
