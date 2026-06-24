# Facility Demand Drug Lock Design

## Context

Trang `/dashboard/facility/lap-du-tru` lay danh sach thuoc tu `FacilityDrugMap` thong qua API catalog lap du tru. Hien tai catalog chi lay thuoc dang hoat dong, da du dieu kien anh xa va co `masterDrugId`.

`FacilityDrugMap` da co lifecycle chung bang `isActive`, `inactiveFromMonth`, `inactiveReason`. Lifecycle nay dai dien cho viec ngung su dung thuoc trong danh muc co so va co rang buoc voi bao cao XNT. Yeu cau moi khac voi lifecycle chung: facility can khoa/mo rieng mot thuoc khoi luong lap du tru, trong khi thuoc van tiep tuc ton tai va van co the phuc vu bao cao XNT/anh xa.

## Goal

- Cho facility khoa hoac mo khoa du tru cho tung thuoc tai trang `Anh xa danh muc thuoc`.
- Thuoc bi khoa du tru khong hien thi trong modal tao/them thuoc tai trang `Lap du tru`.
- Khong anh huong bao cao XNT, trang thai anh xa, lifecycle ngung su dung, hay du lieu du tru da tao.

## Non-Goals

- Khong dung `isActive` de khoa du tru.
- Khong xoa dong thuoc da co trong du tru nhap khi thuoc bi khoa sau do.
- Khong doi trang thai `FacilityDemandPlan`.
- Khong them workflow duyet admin/company cho thao tac khoa/mo du tru.

## Recommended Approach

Them trang thai khoa du tru rieng vao `FacilityDrugMap`:

- `demandPlanningLocked Boolean @default(false) @map("demand_planning_locked")`
- `demandPlanningLockedAt DateTime? @map("demand_planning_locked_at")`
- `demandPlanningUnlockedAt DateTime? @map("demand_planning_unlocked_at")`
- `demandPlanningLockReason String? @map("demand_planning_lock_reason")`

Ly do:

- Trang thai nay gan truc tiep voi thuoc cua co so, dung voi nguon catalog hien tai.
- Khong lam lan voi `isActive`, von dang dai dien cho ngung su dung va co logic theo thang XNT.
- Don gian hon tao bang rieng khi yeu cau hien tai chi can trang thai hien hanh.

## User Experience

Tai trang `Anh xa danh muc thuoc`:

- Thuoc chua khoa hien action `Khoa du tru`.
- Thuoc da khoa hien action `Mo du tru`.
- Thuoc da khoa hien badge `Khoa du tru` trong danh sach/detail.
- Dialog khoa co truong ly do tuy chon.
- Dialog mo khoa xac nhan thao tac, khong can ly do.

Ket qua tai trang `Lap du tru`:

- Modal `Tao du tru` va `Them thuoc vao du tru` khong hien thuoc co `demandPlanningLocked = true`.
- Neu thuoc da nam trong mot du tru nhap truoc khi bi khoa, dong do van giu nguyen de tranh mat du lieu.
- Khi mo khoa, thuoc xuat hien lai trong catalog lap du tru neu van thoa cac dieu kien hien co: active, mapping du dieu kien, co master drug.

## API Design

Them route:

`PATCH /api/facility/mappings/[id]/demand-lock`

Request:

```json
{
  "locked": true,
  "reason": "Khong lap du tru trong dot nay"
}
```

Behavior:

- Chi role `FACILITY` duoc goi.
- Chi duoc cap nhat mapping thuoc ve facility dang dang nhap.
- `locked: true` set:
  - `demandPlanningLocked = true`
  - `demandPlanningLockedAt = now`
  - `demandPlanningLockReason = reason || null`
- `locked: false` set:
  - `demandPlanningLocked = false`
  - `demandPlanningUnlockedAt = now`
  - giu hoac xoa `demandPlanningLockReason`: chon xoa ve `null` de trang thai hien hanh ro rang.
- Ghi activity log voi action update va details `LOCK_DEMAND_PLANNING`/`UNLOCK_DEMAND_PLANNING`.

## Catalog Filtering

Trong `loadFacilityDemandPlanCatalogPayload`, bo sung dieu kien:

```ts
demandPlanningLocked: false
```

Dieu kien nay nam cung `facilityId`, `isActive: true`, mapping status du dieu kien va `masterDrugId: { not: null }`.

## UI Data Flow

- API `/api/facility/mappings` tra them cac field khoa du tru.
- Mapping page dua field vao type hien co.
- Khi user khoa/mo, UI goi route demand-lock.
- Sau khi thanh cong, refresh danh sach mapping hoac update item local.
- `Lap du tru` khong can thay doi UI de xu ly thuoc bi khoa vi backend catalog da loc.

## Validation And Edge Cases

- Khoa mot thuoc da khoa tra ve thanh cong idempotent hoac cap nhat lai ly do. De don gian va than thien UI, route cho phep va cap nhat lai timestamp/ly do.
- Mo mot thuoc chua khoa tra ve thanh cong va giu trang thai mo.
- Thuoc bi ngung su dung (`isActive = false`) van khong xuat hien trong lap du tru theo logic hien co, bat ke khoa du tru.
- Thuoc dang trong du tru da chot/nhap khong bi anh huong.

## Testing

- Migration Prisma tao duoc cac cot moi.
- API demand-lock:
  - unauthorized bi chan.
  - facility khong so huu mapping bi chan.
  - khoa thanh cong cap nhat field va activity log.
  - mo khoa thanh cong cap nhat field va activity log.
- UI mapping:
  - hien badge `Khoa du tru`.
  - nut doi giua `Khoa du tru` va `Mo du tru`.
- Lap du tru:
  - thuoc bi khoa khong co trong catalog tao/them du tru.
  - mo khoa xong thuoc hien lai neu thoa dieu kien catalog.
- Regression:
  - bao cao XNT va ngung su dung thuoc khong doi hanh vi.
