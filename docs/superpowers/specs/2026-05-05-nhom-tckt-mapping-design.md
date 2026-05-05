# Nhom TCKT Mapping Design

## Context

`Nhom TCKT` la gia tri co dinh theo thuoc noi bo cua tung co so: mot `facilityId + maNoiBo` chi duoc co mot nhom.
Viec nay phu hop voi `FacilityDrugMap`, khong phu hop luu rieng theo tung dong `InventoryReport`.

## Goal

Them `Nhom TCKT` vao danh muc thuoc noi bo va hien thi trong bao cao.

Thanh cong khi:

- mapping moi/import moi bat buoc co `Nhom TCKT`
- mapping cu da duyet nhung thieu `Nhom TCKT` co nut `Thiet lap`
- co so chi thiet lap duoc khi gia tri dang trong
- khi da co gia tri, UI co so khong cho sua nua va API cung chan sua
- file mau bao cao, modal chi tiet bao cao va export bao cao hien thi `Nhom TCKT` truoc `Ton dau`

## Values

Gia tri hop le va duoc luu/hien thi:

- `BĐG`
- `Nhóm 1`
- `Nhóm 2`
- `Nhóm 3`
- `Nhóm 4`
- `Nhóm 5`

## Data Model

Them field nullable vao `FacilityDrugMap`:

`nhomTckt String? @map("nhom_tckt")`

DB de nullable de khong pha du lieu cu. API/UI enforce bat buoc cho mapping moi va report template/upload.

## Mapping Flow

`/dashboard/facility/mappings`:

- bang them cot `Nhom TCKT`
- neu da co gia tri: hien badge, khong co nut sua
- neu chua co: hien `Chua thiet lap` va nut `Thiet lap`
- dialog `Thiet lap Nhom TCKT` hien ma noi bo, ten thuoc, dropdown 6 gia tri va nut luu

API rieng:

`PATCH /api/facility/mappings/[id]/nhom-tckt`

Rule:

- mapping phai thuoc co so dang dang nhap
- gia tri phai nam trong 6 lua chon
- neu mapping da co `nhomTckt` thi tra loi 409 va khong sua

## Report Flow

File mau bao cao them cot `Nhom TCKT` truoc `Ton dau`, khoa nhu cot danh muc.
Upload report validate file khop voi mapping. Neu mapping thieu `Nhom TCKT`, bao loi yeu cau cap nhat tai trang mapping.
Modal chi tiet va export bao cao chi hien thi, khong sua.
