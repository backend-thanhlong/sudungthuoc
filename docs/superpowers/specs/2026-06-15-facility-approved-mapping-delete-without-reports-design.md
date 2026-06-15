# Thiet ke: Cho phep xoa thuoc da duyet chua co bao cao XNT

## Boi canh

Trang `/dashboard/facility/mappings` dang chia danh muc thuoc noi bo theo cac tab, trong do tab `Da duyet` gom mapping co status `APPROVED` hoac `AUTO_MAPPED`.
Hien tai backend `DELETE /api/facility/mappings/[id]` chan xoa cac status bi khoa, gom `WAITING_APPROVAL` va `APPROVED`.
UI cung khong hien nut xoa trong tab `Da duyet`; voi thuoc da duyet, nguoi dung chi co thao tac ngung su dung.

Nguoi dung can xoa thuoc da duyet neu thuoc do chua tung phat sinh bao cao xuat-nhap-ton.

## Rule nghiep vu

Mot mapping da duyet chi duoc xoa khi khong ton tai bat ky dong `InventoryReport` nao co:

- `facilityId = session.user.id`
- `mapId = mapping.id`

Neu ton tai bat ky dong XNT nao, ke ca dong co so lieu ton/nhap/xuat bang 0, mapping khong duoc xoa.

## Muc tieu

- Tab `Da duyet` hien thao tac `Xoa` cho thuoc `APPROVED` hoac `AUTO_MAPPED` chua co report XNT.
- Backend enforce cung rule, khong phu thuoc vao UI.
- Neu thuoc da co report XNT, giu hanh vi hien tai: khong xoa, chi cho `Ngung su dung`.
- Thong bao loi/confirm phai noi ro ly do lien quan bao cao XNT.

## Khong lam

- Khong cho xoa thuoc dang `WAITING_APPROVAL`.
- Khong cho xoa thuoc da co bat ky dong `InventoryReport`.
- Khong xoa hoac sua du lieu `InventoryReport`.
- Khong thay doi workflow duyet mapping cua admin.
- Khong thay doi logic upload bao cao XNT.

## Phuong an chon

Backend tra them so dong bao cao theo mapping, UI dung so nay de hien nut xoa, va API delete kiem tra lai truoc khi xoa.

Ly do:

- UI co the hien dung thao tac cho tung dong trong tab `Da duyet`.
- Server van la nguon quyet dinh cuoi cung, tranh user goi API truc tiep de xoa sai.
- Khong can them endpoint moi; reuse route delete hien co.

## API danh sach mapping

File: `src/app/api/facility/mappings/route.ts`.

`GET /api/facility/mappings` bo sung `_count.reports` khi query `facilityDrugMap`.
Response map moi row thanh object hien co cong them:

```ts
reportCount: mapping._count.reports
```

Neu code giu response Prisma truc tiep, can loai `_count` ra khoi payload public va tra field phang `reportCount`.

## API xoa mapping

File: `src/app/api/facility/mappings/[id]/route.ts`.

Rule moi:

- Verify session role `FACILITY`.
- Tim mapping theo `id` va `facilityId = session.user.id`.
- Neu status `WAITING_APPROVAL`: tra `403`, yeu cau thu hoi truoc.
- Neu status `APPROVED` hoac `AUTO_MAPPED`:
  - dem `InventoryReport` theo `facilityId` va `mapId`.
  - neu count > 0: tra `403` voi message `Khong the xoa thuoc da co bao cao xuat-nhap-ton. Vui long ngung su dung neu khong tiep tuc bao cao.`
  - neu count = 0: cho phep xoa.
- Voi cac status khac, giu hanh vi xoa hien co.

`AUTO_MAPPED` can duoc xu ly nhu thuoc da duyet vi no nam trong tab `Da duyet`.

## UI

File: `src/app/dashboard/facility/mappings/page.tsx`.

Type `DrugMapping` them:

```ts
reportCount?: number;
```

`MappingTable` them prop:

```ts
allowDeleteApprovedWithoutReports?: boolean;
```

Tab `Da duyet` goi:

```tsx
<MappingTable
  items={approvedMappings}
  showLifecycleActions={true}
  allowDeleteApprovedWithoutReports={true}
/>
```

Trong cot thao tac:

- Neu mapping inactive: giu nut `Kich hoat lai`.
- Neu mapping active va status `APPROVED`/`AUTO_MAPPED`:
  - neu `allowDeleteApprovedWithoutReports` va `reportCount === 0`: hien nut `Xoa`.
  - neu `reportCount > 0`: giu nut `Ngung su dung`.
- Cac tab/status khac giu logic hien co.

Confirm xoa can ro hon voi thuoc da duyet:

```text
Thuoc da duyet nay chua co bao cao XNT. Ban co chac muon xoa khoi danh muc?
```

Neu API tra loi loi, UI doc `message` tu response va toast message do thay vi message chung chung.

## Data Flow

1. Facility mo `/dashboard/facility/mappings`.
2. UI fetch `/api/facility/mappings`.
3. API tra danh sach mapping kem `reportCount`.
4. Tab `Da duyet` hien nut xoa chi voi dong co `reportCount === 0`.
5. User bam xoa, UI confirm.
6. UI goi `DELETE /api/facility/mappings/[id]`.
7. Backend dem lai `InventoryReport`.
8. Neu van chua co report, backend xoa mapping; neu da co report, backend tu choi.
9. UI refresh danh sach hoac rollback optimistic delete.

## Bao mat va toan ven du lieu

- Khong tin `reportCount` tu client.
- Moi truy van delete phai include `facilityId = session.user.id`.
- Backend count report ngay truoc delete de tranh race voi du lieu moi.
- Quan he `InventoryReport.drugMap` dang `onDelete: Cascade`, nen rule count = 0 bat buoc de tranh cascade xoa report ngoai y muon.

## Loi va trang thai bien

- Mapping khong ton tai hoac khong thuoc facility: `404`.
- User khong phai facility: `401`.
- Mapping dang cho duyet: `403`.
- Mapping da duyet va da co report XNT: `403`.
- Neu report moi xuat hien giua luc UI fetch va luc delete, backend tu choi va UI hien message tu server.

## Kiem thu

Chay:

```bash
rtk npm run lint
rtk npm run build
```

Kiem tra thu cong:

- Mapping `APPROVED`/`AUTO_MAPPED` khong co `InventoryReport`: tab `Da duyet` hien nut `Xoa`, xoa thanh cong.
- Mapping `APPROVED`/`AUTO_MAPPED` co it nhat mot `InventoryReport`: khong hien nut xoa; goi API delete truc tiep bi `403`.
- Mapping `WAITING_APPROVAL`: van khong xoa duoc.
- Mapping `PENDING_MAPPING`/`REJECTED`: hanh vi xoa cu khong bi anh huong.
- Toast loi hien message server khi delete bi tu choi.

## Rui ro

- Neu response mapping dang duoc client khac dung nguyen shape Prisma, viec them field `reportCount` phang can giu cac field cu khong doi.
- Tab `Da duyet` co the co hai thao tac thay the nhau: `Xoa` cho thuoc chua bao cao, `Ngung su dung` cho thuoc da co bao cao. Can text confirm va tooltip/title du ro de user khong nham.
