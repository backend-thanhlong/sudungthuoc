# Thiet ke: Them tab Thuoc hiem cho dashboard facility

## Boi canh

Trang `/dashboard/facility` hien co 4 tab: `Tong quan`, `Cung ung`, `Dau thau`, va `Phan tich`.
Dashboard admin da co tab `Thuoc hiem` dung component `Tab5RareDrugs` va API `/api/admin/dashboard/rare-drugs`.
Public dashboard cung da co API rare-drugs voi cung shape du lieu. Facility dashboard thieu ca tab UI va API facility-scoped tuong ung.

## Muc tieu

- Them tab `Thuoc hiem` vao `/dashboard/facility`.
- Tai su dung component `Tab5RareDrugs` de giu UI va du lieu dong nhat voi dashboard admin.
- Them API `/api/facility/dashboard/rare-drugs` chi tra du lieu cua co so dang dang nhap.
- Giu filter `Ky bao cao` hien co hoat dong voi tab moi.

## Khong lam

- Khong doi logic danh dau thuoc hiem trong danh muc dung chung.
- Khong them filter co so cho facility dashboard.
- Khong thay doi UI/admin public rare-drugs dang co.
- Khong thay doi schema database.

## Phuong an chon

Dung lai `Tab5RareDrugs` cho facility va them route API rieng cho facility.

Ly do:

- Component da nhan `apiPrefix`, nen co the tro toi `/api/facility/dashboard`.
- Shape response cua admin/public rare-drugs da phu hop UI.
- API rieng giup enforce phan quyen tai server, khong tin `facilityId` tu client.
- Giam duplicate UI va tranh lech hanh vi giua admin/facility.

## UI

File chinh: `src/components/dashboard/FacilityDashboardShell.tsx`.

Thay doi:

- Import `Tab5RareDrugs`.
- Them icon/key `rareDrugs`.
- Doi `TabsList` tu `sm:grid-cols-4` sang `sm:grid-cols-5`.
- Them `TabsTrigger` label `Thuoc hiem`, mau active rose nhu dashboard admin.
- Them `TabsContent value="rareDrugs"` render:

```tsx
<Tab5RareDrugs reportMonth={selectedMonth} facilityId="" apiPrefix={apiPrefix} />
```

`facilityId` de rong vi facility API tu lay co so tu session.

## API

Them file: `src/app/api/facility/dashboard/rare-drugs/route.ts`.

Hanh vi:

- Goi `auth()`.
- Chi chap nhan user role `FACILITY`.
- Lay `facilityId` tu `session.user.id`.
- Doc `reportMonth` tu query neu co.
- Bo qua moi `facilityId` query param neu client gui len.
- Query `inventoryReport` voi dieu kien:
  - `facilityId = session.user.id`
  - `drugMap.masterDrug.isThuocHiem = true`
  - `reportMonth` neu co
- Tinh va tra ve cung shape voi `Tab5RareDrugs`:
  - `kpis`
  - `facilityExportData`
  - `facilityHeatmapData`
  - `drugInventoryData`
  - `monthlyTrend`
  - `insuranceServiceData`
  - `facilityMapData`
  - `mapMissingCoordinateCount`

## Data Flow

1. User vao `/dashboard/facility`.
2. `FacilityDashboardShell` render tab `Thuoc hiem`.
3. Khi tab mount, `Tab5RareDrugs` fetch `${apiPrefix}/rare-drugs`.
4. API xac thuc session, lay `facilityId` server-side.
5. API tra du lieu thuoc hiem cua chinh co so theo ky bao cao da chon.
6. UI ve KPI, bieu do, bang, va ban do bang component hien co.

## Bao mat

- Client khong duoc dieu khien `facilityId`.
- Route tra `401` neu chua dang nhap hoac khong phai `FACILITY`.
- Admin route hien co giu nguyen cho admin.
- Public route hien co giu nguyen cho public dashboard.

## Loi va trang thai rong

- Neu API loi, component hien thong bao `Khong the tai du lieu thuoc hiem`.
- Neu co so khong co thuoc hiem trong ky chon, API tra mang rong va KPI bang 0 theo shape hien co.
- Neu co so thieu toa do, `facilityMapData` khong co marker va `mapMissingCoordinateCount` phan anh so co so thieu toa do.

## Kiem thu

Chay:

```bash
rtk npm run lint
rtk npm run build
```

Kiem tra thu cong:

- Dang nhap FACILITY, vao `/dashboard/facility`, thay tab `Thuoc hiem`.
- Chon tab `Thuoc hiem`, du lieu tai tu `/api/facility/dashboard/rare-drugs`.
- Doi `Ky bao cao`, du lieu rare-drugs fetch lai theo `reportMonth`.
- Thu gui `facilityId` query khac vao API facility, response van chi gom du lieu cua session facility.
- Dang nhap non-FACILITY goi API facility rare-drugs bi tu choi.

## Rui ro

- Duplicate logic tinh rare-drugs giua admin, public, facility tiep tuc ton tai. Viec trich xuat helper dung chung co the lam sau neu can.
- Component `Tab5RareDrugs` co bieu do theo co so; voi facility scope, mot so chart co the chi co mot dong/marker. Chap nhan de giu UI dong nhat.
