# Modern Sidebar App Shell Design

## Context

Dashboard hien tai dung chung [DashboardLayout.tsx](/opt/sudungthuoc/sudungthuoc/src/components/DashboardLayout.tsx) cho 3 vai tro:

- admin
- co so
- cong ty

Layout hien co da co cac nen tang dung:

- sidebar desktop co the thu gon/mo rong
- drawer mobile voi overlay
- menu theo vai tro
- group menu co children
- header co notification, account menu, doi mat khau, dang xuat
- route `/print` bo qua app shell de in tai lieu

Van de UI chinh:

- sidebar dang dung gradient xanh day, lam man hinh van hanh trong nang va hoi cu
- icon dang la SVG inline lap lai nhieu, kho dong bo style
- active state dang dua vao nen trang va border xanh, nhin nhu card nho hon la navigation item
- title app qua dai, de chat tren sidebar va mobile drawer
- collapsed sidebar chua co tooltip nen kho dung khi chi con icon
- group children dung border-left xanh dam, tao cam giac nang va kem tinh te

## Goal

Lam sidebar hien dai hon theo huong `app navigation` sang, trung tinh, ro rang va hop voi phan mem van hanh y te.

Thanh cong khi:

- dashboard trong gon va chuyen nghiep hon ngay ca khi co nhieu menu
- nguoi dung nhan ra route active nhanh hon
- collapsed desktop sidebar van dung duoc nho tooltip
- mobile drawer nhat quan voi desktop sidebar
- khong anh huong nghiep vu, API, auth, route, hoac cac trang con

## Scope

Bao gom:

- redesign visual style cua sidebar desktop va mobile drawer trong `DashboardLayout.tsx`
- chuan hoa icon navigation bang `lucide-react`
- tinh chinh active, hover, focus, collapsed, group expanded states
- rut gon brand text trong sidebar
- them tooltip cho collapsed navigation item
- giu lai user block, role label, notification, account menu, change password, logout

Khong bao gom:

- doi route hoac permission
- doi noi dung cac page dashboard con
- them design system moi
- them dark mode
- thay doi database, API, auth, hoac session
- viet lai toan bo navigation thanh component tree moi neu khong can thiet

## Approach Options

### Option 1: Refine sidebar hien tai

Lam:

- giu gradient xanh
- sua spacing, active state, collapsed tooltip
- thay icon SVG inline bang lucide

Uu diem:

- nhanh
- rui ro thap

Nhuoc diem:

- cam giac hien dai hon khong manh
- van giu visual weight xanh dam cua sidebar hien tai

### Option 2: App shell sang, trung tinh

Lam:

- doi sidebar sang nen trang hoac slate rat nhat
- active state bang nen xanh nhat, text xanh, va left rail nho
- group menu gon hon
- brand ngan hon
- icon lucide dong bo
- collapsed mode co tooltip

Uu diem:

- hien dai ro ret
- hop dashboard nghiep vu
- khong tao tuong phan qua manh voi noi dung hien tai
- co the trien khai trong `DashboardLayout.tsx` ma khong doi page con

Nhuoc diem:

- can cham nhieu class UI trong layout
- can dam bao long label tieng Viet khong tran khi sidebar hep

### Option 3: Dark sidebar

Lam:

- sidebar nen slate/navy dam
- active state sang hon
- content van giu nen sang

Uu diem:

- nhin khac biet manh
- de tao cam giac san pham moi

Nhuoc diem:

- de nang mat voi dashboard nhieu bang/form
- lech tone voi app y te hanh chinh
- can test contrast ky hon

## Decision

Chon Option 2: app shell sang, trung tinh.

Ly do:

- phu hop tinh chat phan mem quan ly mua sam va kho duoc
- cai thien cam giac hien dai ma khong hy sinh kha nang scan thong tin
- giam rui ro UI so voi dark sidebar
- giu duoc cau truc code hien tai, chi can refactor vung navigation/render style co kiem soat

## Proposed Design

### Desktop sidebar

Sidebar khi mo:

- width: `w-72`
- background: `bg-white`
- border: `border-r border-slate-200`
- shadow: bo `shadow-xl`, chi dung border va background sach
- header height giu `h-16`
- brand:
  - icon square 40px, nen xanh
  - ten chinh: `Su dung thuoc`
  - dong phu: `Mua sam & kho duoc`

Sidebar khi thu gon:

- width: `w-[72px]`
- chi hien logo, collapse button, nav icons, avatar
- moi nav item co tooltip
- active parent/group van hien bang nen xanh nhat hoac left rail

### Navigation item

Item mac dinh:

- height: 40-44px
- padding ngang gon
- radius: 8px
- text: `text-slate-700`
- icon: `text-slate-500`
- hover: `bg-slate-100 text-slate-950`

Item active:

- background: `bg-blue-50`
- text: `text-blue-700`
- icon: `text-blue-600`
- left rail 3px mau `bg-blue-600`
- font weight `font-semibold`

Group item:

- parent active khi route con active
- chevron lucide xoay khi mo
- children thut vao nhe
- khong dung border-left day
- child active dung text xanh va nen xanh rat nhat

### Mobile drawer

Mobile drawer dung cung visual language:

- width: `w-80`, max theo viewport
- background: `bg-white`
- border right slate
- overlay giu `bg-slate-950/40`
- brand ngan nhu desktop
- nav spacing giong desktop expanded
- user section day du ten va role

### Header and main content

Header hien tai giu cau truc:

- mobile menu button
- title theo role
- notification
- account dropdown

Chi tinh chinh nhe neu can de hop sidebar:

- header border: `border-slate-200`
- title `text-slate-800`
- main background giu `bg-slate-50` hoac `bg-gray-50`

## Component Design

Nen giu trong `DashboardLayout.tsx` de tranh lan scope, nhung tach nho trong cung file:

- `NavIcon` data dung lucide components thay cho JSX SVG inline
- `renderNavItems` tiep tuc render theo role va state hien co
- helper `isItemActive(item)` de ho tro route con cho ca item thuong va group
- helper style function nho cho active/collapsed states neu can

Khong nen tao abstraction lon neu chi co mot layout dung no.

## Data Flow

Data flow khong doi:

- session lay tu `useSession`
- role quyet dinh `adminNavItems`, `facilityNavItems`, `companyNavItems`
- pathname tu `usePathname`
- `sidebarOpen`, `mobileNavOpen`, `changePasswordOpen`, `openDropdowns` van la local state
- sign out van dung `signOut({ callbackUrl: "/login" })`

## Error Handling

Khong them luong error moi.

Can dam bao:

- neu session user name rong, avatar fallback van la `U`
- neu role khong phai `ADMIN` hoac `COMPANY`, van fallback ve facility menu nhu hien tai
- print route van render children thuong, khong render sidebar

## Accessibility

Can giu hoac cai thien:

- `aria-label` cho nut mobile menu, close drawer, collapse sidebar
- tooltip cho collapsed nav item va collapsed user avatar
- focus visible qua Tailwind/ring cua button/link
- color contrast cua active va hover dat muc de doc
- mobile overlay co nut button de dong drawer nhu hien tai

## Testing

Can kiem tra:

- `npm run lint`
- desktop expanded sidebar o role admin/facility/company
- desktop collapsed sidebar co tooltip va route active dung
- group menu active khi vao route con
- mobile drawer mo/dong va dong sau khi navigate
- print route khong co app shell
- long Vietnamese labels khong tran text khi expanded va khong lam vo layout khi collapsed

## Implementation Notes

Rui ro chinh nam o `DashboardLayout.tsx` vi file nay vua chua menu data vua chua render shell.

De giam rui ro:

- giu href va label hien tai
- thay icon theo mapping lucide tuong duong
- khong doi logic auth/session
- khong doi logic role redirect
- khong sua cac page con trong cung thay doi
- sau khi build UI, chay lint va xem nhanh bang browser neu dev server san sang
