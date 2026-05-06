# Facility Approved Mapping Nhom TCKT Excel Import Design

## Context

Trang `/dashboard/facility/mappings` hien co 2 workflow lien quan Excel:

- `Upload Excel` tao mapping moi tu sheet `Mau nhap lieu`.
- `Xuat Excel da duyet` xuat danh sach mapping trong tab `Da duyet`, gom sheet `Danh sach thuoc noi bo da duyet` va `Danh muc dung chung`.

Cot `Nhom TCKT` hien da nam tren `FacilityDrugMap.nhomTckt`. Co so dang phai thiet lap gia tri nay theo tung dong, mat thoi gian khi danh sach da duyet co nhieu thuoc.

Nguoi dung muon sua cot `Nhom TCKT` ngay tren file Excel da duyet, upload lai he thong, va he thong cap nhat gia tri nay. Cac cot con lai khong duoc thay doi; neu Excel khac du lieu he thong thi phai bao loi theo dong.

## Goal

- Cho phep co so upload file Excel da duyet de cap nhat/ghi de `Nhom TCKT`.
- `Ma noi bo` la khoa tim mapping cua dung co so dang dang nhap.
- Chi `Nhom TCKT` duoc cap nhat.
- Cac cot doi chieu con lai phai khop voi du lieu he thong; neu khac thi dong do loi va khong cap nhat.
- Ket qua import phai co tong ket: cap nhat, khong doi, loi.
- Khong thay doi schema Prisma.

## Non-Goals

- Khong tao lai mapping moi tu file da duyet.
- Khong cap nhat ten thuoc, hoat chat, so dang ky, don vi tinh tu Excel.
- Khong doi trang thai duyet.
- Khong validate sheet `Danh muc dung chung`, vi sheet nay chi phuc vu tham khao trong file export hien co.
- Khong them luong phe duyet moi cho Admin.

## Approach Options

### Option 1: Tai su dung nut `Upload Excel` hien tai

Cho phep nut import hien tai tu nhan dien file moi hay file da duyet.

Uu diem:

- It nut hon tren UI.

Nhuoc diem:

- De nham lan giua import thuoc moi va cap nhat `Nhom TCKT`.
- Logic client/server phuc tap hon vi 2 loai file co cot khac nhau.
- Loi import kho giai thich cho nguoi dung.

### Option 2: Them upload rieng cho `Nhom TCKT` tu Excel da duyet

Them nut rieng, vi du `Cap nhat Nhom TCKT tu Excel`, doc sheet `Danh sach thuoc noi bo da duyet` va goi endpoint import rieng.

Uu diem:

- Tach bach workflow tao mapping moi va cap nhat `Nhom TCKT`.
- De validate, de bao loi theo dong.
- Giam rui ro ghi nham du lieu.

Nhuoc diem:

- Them mot control tren toolbar.

### Option 3: Preview roi moi xac nhan

Upload file, backend tra preview cac dong se cap nhat/loi, nguoi dung bam xac nhan moi ghi DB.

Uu diem:

- An toan nhat khi co nhieu dong thay doi.

Nhuoc diem:

- Them UI dialog va endpoint confirm.
- Lon hon nhu cau hien tai, vi yeu cau da cho phep ghi de `Nhom TCKT` va cac cot khac loi neu khac he thong.

## Recommendation

Chon Option 2.

Workflow rieng giup nguoi dung ro rang: file mau/Upload Excel tiep tuc dung de tao danh muc noi bo moi, con nut moi chi cap nhat `Nhom TCKT` cho danh sach da duyet.

## Excel Contract

Sheet nguon:

- Uu tien sheet `Danh sach thuoc noi bo da duyet`.
- Neu khong co sheet nay thi bao loi, khong fallback sang sheet dau tien de tranh doc nham file.

Cot bat buoc:

- `Ma noi bo`
- `Ten thuoc noi bo`
- `Hoat chat noi bo`
- `SDK noi bo`
- `DVT noi bo`
- `Nhom TCKT`

Ten cot hien thi trong Excel export hien tai co dau tieng Viet:

- `Mã nội bộ`
- `Tên thuốc nội bộ`
- `Hoạt chất nội bộ`
- `SĐK nội bộ`
- `ĐVT nội bộ`
- `Nhóm TCKT`

Implementation co the ho tro them alias khong dau de giam loi do Excel/nguoi dung, nhung UI export van giu ten cot hien co.

Gia tri `Nhom TCKT` hop le:

- `BĐG`
- `Nhóm 1`
- `Nhóm 2`
- `Nhóm 3`
- `Nhóm 4`
- `Nhóm 5`

Dung `normalizeNhomTckt` de chuan hoa dau, khoang trang va cach go.

## Matching And Validation Rules

Moi dong duoc xu ly doc lap.

### Key

- `Ma noi bo` la khoa lookup.
- Lookup theo `facilityId = session.user.id` va `maNoiBo = Ma noi bo`.
- Neu khong tim thay mapping: dong loi.
- Neu mapping khong co trang thai `APPROVED` hoac `AUTO_MAPPED`: dong loi, vi file nay chi cap nhat danh sach da duyet theo UI hien tai.

### Immutable Field Check

Sau khi tim thay mapping, backend doi chieu cac cot:

- `Ten thuoc noi bo` voi `mapping.tenThuocNoiBo`
- `Hoat chat noi bo` voi `mapping.hoatChatNoiBo`
- `SDK noi bo` voi `mapping.soDangKyNoiBo`
- `DVT noi bo` voi `mapping.donViTinhNoiBo`

Nguyen tac so sanh:

- Chuyen `null`/`undefined` thanh chuoi rong.
- Trim dau/cuoi.
- Gom nhieu khoang trang thanh 1 khoang trang.
- Neu gia tri sau chuan hoa khac nhau thi dong loi va khong update.

Khong so sanh cac cot trong sheet `Danh muc dung chung`.

### Nhom TCKT Update

- Neu `Nhom TCKT` rong hoac khong hop le: dong loi.
- Neu hop le va khac gia tri DB: update `mapping.nhomTckt`.
- Neu hop le va bang gia tri DB: dem la `unchanged`, khong update.
- Cho phep ghi de gia tri cu, theo yeu cau da duyet.

### Duplicate Rows

- Neu Excel co nhieu dong cung `Ma noi bo`, dong dau tien duoc xu ly, cac dong lap lai bao loi duplicate.
- Khong update nhieu lan mot mapping trong cung mot file.

## API Design

Them endpoint:

`POST /api/facility/mappings/nhom-tckt/import`

Body:

```json
{
  "rows": [
    {
      "_rowIndex": 2,
      "maNoiBo": "T001",
      "tenThuocNoiBo": "Paracetamol 500mg",
      "hoatChatNoiBo": "Paracetamol",
      "soDangKyNoiBo": "VD-12345-23",
      "donViTinhNoiBo": "Viên",
      "nhomTckt": "Nhóm 1"
    }
  ]
}
```

Response:

```json
{
  "total": 20,
  "updated": 12,
  "unchanged": 5,
  "errors": [
    {
      "row": 7,
      "maNoiBo": "T007",
      "message": "Tên thuốc nội bộ không khớp dữ liệu hệ thống"
    }
  ]
}
```

Backend rules:

- Dung `requireActiveSessionUser("FACILITY")`.
- Khong tin vao `facilityId` tu client.
- Chi update mapping thuoc co so hien tai.
- Dung `normalizeNhomTckt` cho validation.
- Update cac dong hop le trong mot transaction ngan hoac `updateMany`/`update` theo danh sach da validate.
- Neu file co mot so dong loi, cac dong hop le van duoc cap nhat.

## UI Design

Trong toolbar `/dashboard/facility/mappings`, them nut:

`Cap nhat Nhom TCKT tu Excel`

Vi tri de xuat:

- Gan nut `Xuat Excel da duyet`, hoac gan nhom voi thao tac Excel.
- Nut chi enable khi co `approvedMappings.length > 0`.

Flow client:

1. Nguoi dung chon file `.xlsx` hoac `.xls`.
2. Client doc sheet `Danh sach thuoc noi bo da duyet`.
3. Map cot Excel ve payload endpoint.
4. Goi `POST /api/facility/mappings/nhom-tckt/import`.
5. Hien toast tong ket.
6. Neu co loi, mo dialog ket qua chi tiet tuong tu dialog import hien co.
7. Goi `fetchMappings()` de refresh table.

UI copy:

- Toast thanh cong: `Da cap nhat X dong Nhom TCKT, Y dong khong doi.`
- Neu co loi: `Da cap nhat X dong, co Z dong can xem lai.`
- Dialog loi hien `Dong`, `Ma noi bo`, `Noi dung loi`.

## Error Handling

- Thieu sheet dung ten: bao loi `Khong tim thay sheet Danh sach thuoc noi bo da duyet`.
- File rong: bao loi va khong goi API.
- Thieu cot bat buoc: bao loi cap file, khong goi API.
- Dong thieu `Ma noi bo`: loi theo dong.
- Mapping khong ton tai hoac khong thuoc co so: loi theo dong.
- Mapping chua duyet: loi theo dong.
- Cot doi chieu khac DB: loi theo dong.
- `Nhom TCKT` khong hop le: loi theo dong.
- Loi server bat ngo: toast loi chung.

## Security And Data Integrity

- Client chi parse Excel de cai thien UX; backend validate lai toan bo.
- `facilityId` luon lay tu session.
- Chi field `nhomTckt` duoc update.
- Cac cot khac khong bao gio duoc ghi tu Excel trong endpoint nay.
- Cac dong loi khong chan cac dong hop le, nhung duoc bao cao ro de nguoi dung sua file.

## Testing Plan

Manual test:

1. Export Excel da duyet, sua `Nhom TCKT` cho mot vai dong, upload lai va xac nhan DB/table cap nhat.
2. Upload file co `Nhom TCKT` hop le bang cach go khong dau/khoang trang thua, xac nhan normalize dung.
3. Sua `Ten thuoc noi bo` trong Excel, upload va xac nhan dong do bao loi, khong update.
4. Sua `SDK noi bo` hoac `DVT noi bo`, xac nhan bao loi.
5. Xoa sheet `Danh sach thuoc noi bo da duyet`, xac nhan UI bao loi.
6. Tao 2 dong cung `Ma noi bo`, xac nhan dong lap bao loi.
7. Upload dong co `Ma noi bo` khong ton tai, xac nhan bao loi.
8. Upload dong mapping khong o tab da duyet, xac nhan bao loi.

Verification:

- `npm run lint`
- `npx tsc --noEmit`

## Implementation Scope

File du kien thay doi:

- `src/app/dashboard/facility/mappings/page.tsx`
- `src/app/api/facility/mappings/nhom-tckt/import/route.ts`
- co the them helper nho trong `src/lib/report-validation.ts` neu can chia se normalize text/field compare ro hon

Khong can migration Prisma.
