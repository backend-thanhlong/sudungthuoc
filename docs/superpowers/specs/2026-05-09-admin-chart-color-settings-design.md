# Admin Chart Color Settings Design

## Context

Ung dung hien tai la Next.js dashboard dung Recharts cho nhieu man hinh:

- dashboard chinh cua admin va facility
- tab tong quan, cung ung, dau thau, phan tich ABC
- bao cao nang cao
- thong ke mua sam cua admin va facility
- mot so bieu do ton kho rieng

Mau bieu do dang duoc quan ly chu yeu trong `src/components/dashboard/chart-theme.ts` qua:

- `DASHBOARD_CHART_COLORS`
- `DASHBOARD_CHART_GRADIENTS`
- `DASHBOARD_SEMANTIC_COLORS`
- `useDashboardChartTheme`

Cach nay giup co fallback tap trung, nhung admin chua co cong cu de tu quan tri mau. Yeu cau moi la cho admin chu dong quan tri bang mau cho cot/series bieu do tren toan he thong, gom ca cau hinh tong quat va override rieng cho tung bieu do.

## Goals

- Admin quan tri duoc mau bieu do tren toan he thong.
- Ho tro 3 tang cau hinh:
  - palette chung cho du lieu dong
  - mau nghiep vu theo y nghia co dinh
  - override rieng theo tung bieu do
- Admin co trang quan tri tong trong nhom `Cai dat`.
- Admin co loi tat cau hinh ngay tren tung bieu do khi dang xem.
- Dashboard admin, facility va company doc duoc cau hinh public de render nhat quan.
- Neu cau hinh loi, thieu, hoac API loi, bieu do van dung mau fallback hien tai va khong crash.
- Ghi nhat ky khi admin thay doi cau hinh mau.

## Non-Goals

- Khong thay doi cong thuc tinh toan du lieu dashboard.
- Khong thay doi layout lon cua cac dashboard hien co.
- Khong cho facility/company sua bang mau.
- Khong can ho tro import/export cau hinh mau o phien ban dau.
- Khong can ho tro theme rieng theo tung user o phien ban dau.

## Chosen Approach

Chon phuong an 3: ket hop 3 tang mau.

Thu tu uu tien khi lay mau:

1. `chartOverrides`
2. `semantic`
3. `palette`
4. default theme trong code

Cach nay giu duoc trai nghiem mac dinh an toan, nhung admin van co quyen chu dong:

- doi tong the he mau qua palette chung
- giu mau nghiep vu on dinh cho cac y nghia quan trong
- tuy bien rieng mot bieu do khi can

## Data Model

Them model cau hinh he thong dung chung trong Prisma:

```prisma
model SystemSetting {
  id          String   @id @default(cuid())
  key         String   @unique
  value       Json
  updatedById String?  @map("updated_by_id")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  @@map("system_settings")
}
```

Khong nen tai su dung `AISetting` vi ten bang do da gan voi mien AI. `SystemSetting` tao nen noi luu cau hinh he thong rong hon, co the tai su dung sau nay.

Key ban dau:

```ts
"chartColorSettings"
```

Payload version 1:

```ts
type ChartColorSettings = {
  version: 1;
  palette: string[];
  semantic: Record<ChartSemanticKey, string>;
  chartOverrides: Record<ChartId, Record<string, string>>;
};
```

Vi du:

```json
{
  "version": 1,
  "palette": ["#1974D3", "#53CCEC", "#FFCC98", "#FFE6B6", "#00001B", "#FFF7D9"],
  "semantic": {
    "inventory": "#1974D3",
    "import": "#53CCEC",
    "export": "#FFCC98",
    "value": "#1974D3",
    "bid": "#1974D3",
    "insurance": "#1974D3",
    "service": "#FFE6B6",
    "success": "#53CCEC",
    "warning": "#FFCC98",
    "danger": "#00001B",
    "neutral": "#00001B",
    "muted": "#FFF7D9",
    "line": "#00001B",
    "abcA": "#DC2626",
    "abcB": "#F59E0B",
    "abcC": "#10B981"
  },
  "chartOverrides": {
    "dashboard.analysis.pareto": {
      "abcA": "#B91C1C",
      "abcB": "#D97706",
      "abcC": "#059669"
    },
    "muaSam.packageStatus": {
      "chuaCoTbmt": "#64748B",
      "daCoTbmtChuaCoKqlcnt": "#F59E0B",
      "daCoKqlcnt": "#10B981"
    }
  }
}
```

## Chart Registry

Them registry o frontend/shared lib de admin co danh sach bieu do va series co the cau hinh:

```ts
type ChartColorRegistryItem = {
  id: string;
  label: string;
  area: "dashboard" | "mua_sam" | "reports" | "inventory";
  description?: string;
  fixedKeys: Array<{
    key: string;
    label: string;
    semanticKey?: ChartSemanticKey;
  }>;
  supportsDynamicLabels: boolean;
};
```

Vi du chart ids:

- `dashboard.overview.inventoryValue`
- `dashboard.overview.insuranceService`
- `dashboard.supply.coverageRisk`
- `dashboard.tender.timeline`
- `dashboard.analysis.usageDrugGroup`
- `dashboard.analysis.pareto`
- `dashboard.analysis.facilityComparison`
- `reportsAdvanced.importExport`
- `muaSam.packageStatus`
- `muaSam.topFacilities`
- `inventory.drugQuantity`
- `inventory.inventoryValue`

Registry nay giup:

- UI quan tri biet chart nao co the chinh.
- API validate override chi nhan key hop le cho fixed series.
- Component chart dung cung `chartId`, tranh dat string lung tung.

Voi nhan du lieu dong, phien ban dau chi luu override khi component gui len mot key on dinh. Key dong duoc tao bang helper normalize label, vi du:

```ts
dynamic:nhom-thuoc-khang-sinh
```

Neu label khong con xuat hien trong du lieu, override van duoc giu nhung UI hien la "chua xuat hien trong du lieu hien tai".

## Color Resolution

Them cac helper trong `src/components/dashboard/chart-theme.ts` hoac tach thanh `src/lib/chart-colors.ts`.

API client-facing:

```ts
function resolveChartColor(input: {
  settings: ChartColorSettings | null;
  chartId?: ChartId;
  key?: string;
  semanticKey?: ChartSemanticKey;
  index?: number;
  fallback?: string;
}): string;
```

Logic:

1. Neu co `chartId` va `key`, tim `settings.chartOverrides[chartId][key]`.
2. Neu co `semanticKey`, tim `settings.semantic[semanticKey]`.
3. Neu co `index`, lay `settings.palette[index % settings.palette.length]`.
4. Neu co `fallback`, dung fallback.
5. Dung default color tu code.

Voi gradient:

- Ban dau khong cho admin cau hinh gradient truc tiep.
- Helper tao gradient tu palette bang cach ghep mau `index` va `index + 1`.
- Neu chart dang dung `DASHBOARD_CHART_GRADIENTS`, refactor sang helper `getGradientStops(index)`.

## API Design

Admin API:

- `GET /api/admin/chart-colors`
- `PUT /api/admin/chart-colors`

Public read API:

- `GET /api/chart-colors`

`GET /api/admin/chart-colors` tra ve:

```ts
{
  settings: ChartColorSettings;
  defaults: ChartColorSettings;
  registry: ChartColorRegistryItem[];
  updatedAt: string | null;
  updatedById: string | null;
}
```

`PUT /api/admin/chart-colors`:

- chi cho role `ADMIN`
- validate payload
- upsert `SystemSetting`
- log activity voi:
  - action: `CHART_COLOR_SETTINGS_UPDATED`
  - entityType: `chart_color_settings`
  - details gom so luong palette, semantic keys doi, chart override keys doi

`GET /api/chart-colors`:

- yeu cau user dang dang nhap va active
- tra ve `settings` da validate va fallback defaults
- khong tra ve metadata noi bo neu khong can

## Validation

Rule validate:

- `version` phai la `1`.
- `palette` toi thieu 3 mau, toi da 12 mau.
- Moi mau phai la hex `#RGB` hoac `#RRGGBB`; API normalize thanh uppercase `#RRGGBB`.
- `semantic` chi nhan key trong danh sach hop le.
- `chartOverrides` chi nhan `chartId` co trong registry.
- Fixed override key phai co trong `fixedKeys` cua chart.
- Dynamic override key phai bat dau bang `dynamic:` va chi duoc luu neu chart `supportsDynamicLabels = true`.
- Gioi han tong so dynamic override, mac dinh toi da 200 key, de tranh payload phinh qua lon.

Khi payload thieu mot semantic key:

- API merge voi defaults thay vi reject, de nang cap ve sau khong lam vo cau hinh cu.

Khi payload co key la:

- reject voi message ro rang neu den tu admin form
- khi doc tu database thi bo qua key la va dung fallback, de tranh dashboard crash

## Admin UI

Them nav item trong `Cai dat`:

- label: `Bảng màu biểu đồ`
- path: `/dashboard/admin/chart-colors`
- icon: co the dung `Palette` tu `lucide-react`

Trang gom 3 tab:

1. `Palette chung`
   - Danh sach swatch mau.
   - Cho them/xoa/sap xep mau.
   - Toi thieu 3, toi da 12.
   - Moi dong co color input va text input hex.
   - Nut `Khoi phuc mac dinh`.

2. `Mau nghiep vu`
   - Grid cac key nghiep vu co label tieng Viet.
   - Nhom theo mien:
     - ton kho va bao cao
     - dau thau/mua sam
     - trang thai/rui ro
     - ABC
   - Moi item co swatch, color input, text input hex.

3. `Theo bieu do`
   - Danh sach chart theo khu vuc.
   - Chon mot chart de xem fixed series.
   - Moi fixed series co mau hien tai va nguon mau:
     - override rieng
     - semantic
     - palette
     - default
   - Cho dat/xoa override rieng.
   - Neu chart ho tro dynamic label, hien danh sach label thu thap tu du lieu hien tai khi vao tu loi tat tren bieu do.

Trang co action:

- `Luu thay doi`
- `Huy thay doi`
- `Khoi phuc mac dinh`
- `Xoa override bieu do nay`

Nen hien preview nho bang Recharts voi 5-6 cot mau de admin thay ngay tac dong.

## Chart Shortcut

Tren moi chart, admin thay mot nut icon nho, vi du `Palette`.

Behavior:

- Nut chi hien voi role `ADMIN`.
- Click mo trang `/dashboard/admin/chart-colors?chartId=<id>`.
- Co the mo trong cung tab. Khong can modal phuc tap o phien ban dau.
- Neu chart co nhan dong dang hien thi, phien ban dau chi can dan den chart config; dynamic label co the bo sung sau khi co API metadata.

Voi facility dashboard:

- user facility khong thay nut cau hinh
- bieu do van ap dung mau admin da cau hinh

## Data Flow

1. Admin vao trang cau hinh.
2. UI goi `GET /api/admin/chart-colors`.
3. Admin sua palette, semantic, override.
4. UI validate co ban tren client.
5. UI goi `PUT /api/admin/chart-colors`.
6. API validate server-side, upsert `SystemSetting`, log activity.
7. Dashboard goi `GET /api/chart-colors` thong qua hook/provider.
8. Chart component dung helper `resolveChartColor` de render.

Nen them provider client:

```tsx
<ChartColorProvider>
  {children}
</ChartColorProvider>
```

Provider co the dat trong `DashboardLayout` de cac dashboard va trang thong ke dung chung. Neu API loi, provider tra `settings = null` va helper dung default.

## Component Migration

Uu tien migrate theo nhom:

1. `chart-theme.ts`
   - bo sung defaults, type, helper resolve.
   - giu export cu trong giai do chuyen doi de tranh sua qua rong mot luc.

2. Dashboard chinh:
   - `Tab1Overview`
   - `Tab2Supply`
   - `Tab3Tender`
   - `Tab4Analysis`
   - `UsageOverviewSection`

3. Mua sam:
   - `AdminMuaSamThongKe`
   - `FacilityMuaSamThongKe`
   - `PackageStatusChartCard`

4. Bao cao/ton kho:
   - `reports-advanced/page.tsx`
   - `DrugInventoryChart`
   - `InventoryValueBarChart`

Moi chart can co `chartId` ro rang. Bieu do nao chua migrate van tiep tuc dung mau default, khong bi vo.

## Error Handling

Admin page:

- API 401/403: hien thong bao khong co quyen.
- API 400: hien message validate tu server.
- API 500: hien thong bao khong luu duoc, giu draft tren client.
- Hex sai: bao loi ngay tai input va disable save.
- Palette qua it/qua nhieu: bao loi o tab palette.

Dashboard:

- Neu `/api/chart-colors` loi, render bieu do bang default colors.
- Neu setting trong DB bi loi mot phan, helper bo qua phan loi va fallback.
- Neu palette rong sau normalize, dung default palette.

## Accessibility And UX

- Color input luon di kem text input hex de admin copy/paste duoc.
- Moi mau co label ro rang, khong chi dua vao mau.
- Preview can co label/legend.
- Nen canh bao nhe neu mau qua gan nhau hoac contrast thap voi nen sang/toi, nhung khong block save o phien ban dau.
- Nut cau hinh tren chart co tooltip `Cấu hình màu biểu đồ`.

## Security

- Chi role `ADMIN` duoc goi API ghi va vao trang admin.
- Public read API yeu cau session active de khong mo cau hinh noi bo ra ngoai.
- Validate hex nghiem ngat, khong chap nhan CSS string tuy y.
- Khong render mau tu DB vao class Tailwind dong; chi dung inline SVG/Recharts color value da validate.

## Testing

Manual verification:

1. Admin doi palette chung, cac chart danh muc dong doi mau theo.
2. Admin doi mau semantic `import/export/inventory`, bieu do bao cao nang cao doi dung series.
3. Admin override `dashboard.analysis.pareto` cho `abcA/B/C`, Pareto doi theo override ma chart khac van dung semantic.
4. Admin xoa override chart, chart quay ve semantic/palette.
5. Facility login thay mau moi nhung khong thay nut cau hinh.
6. API mau loi hoac bi tat tam thoi, dashboard van render voi default.
7. Dark mode van doc duoc axis/grid/tooltip hien co.

Automated checks:

- Unit test cho normalize hex.
- Unit test cho merge defaults.
- Unit test cho `resolveChartColor` voi du 4 tang uu tien.
- API route tests neu test harness hien co ho tro Next route.
- `npm run lint`.

## Rollout Plan

Lam theo 3 buoc de giam rui ro:

1. Nen tang cau hinh:
   - Prisma model `SystemSetting`
   - defaults/types/helpers
   - admin/public APIs
   - provider doc settings

2. UI quan tri:
   - nav item
   - trang `/dashboard/admin/chart-colors`
   - 3 tab cau hinh
   - save/reset/log activity

3. Migrate chart:
   - bat dau voi dashboard chinh va mua sam
   - sau do reports advanced va inventory charts
   - them shortcut admin tren cac chart da migrate

## Open Decisions Resolved

- Pham vi: tat ca bieu do trong he thong.
- Kieu quan tri: ket hop palette chung, semantic colors va chart override.
- Vi tri UI: co trang quan tri tong va loi tat tren chart.
- Quyen sua: chi admin.
- Fallback: giu mau hien tai trong code.

## Spec Review

- Khong co muc trong hoac noi dung cho bo sung.
- Scope tap trung vao cau hinh mau bieu do, khong lan sang logic du lieu.
- Kien truc, API, UI va rollout thong nhat voi cach uu tien mau da chon.
- Cac yeu cau co kha nang gay mo ho da duoc chot thanh quy tac validate va fallback cu the.
