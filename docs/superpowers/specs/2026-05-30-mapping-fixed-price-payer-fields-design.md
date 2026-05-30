# Mapping Fixed Price and Payer Fields Design

## Context

Trang `/dashboard/facility/mappings` hien co `Nhom TCKT` tren `FacilityDrugMap`.
Ba cot `Gia VAT`, `BHYT`, `Dich vu` hien dang nam tren `InventoryReport` va duoc nhap trong file bao cao Xuat-Nhap-Ton.

Nghiep vu moi xac dinh ba cot nay la thong tin co dinh cua mot thuoc noi bo trong suot qua trinh bao cao.
Mot `facilityId + maNoiBo` chi co mot bo gia tri `Gia VAT`, `BHYT`, `Dich vu`.

Nguoi dung se reset du lieu de anh xa va bao cao lai tu dau, nen khong can backfill tu bao cao cu.

## Goal

Them `Gia VAT`, `BHYT`, `Dich vu` vao Danh muc Anh xa, dat sau cot `Nhom TCKT`.

Thanh cong khi:

- mapping moi/import moi co du thong tin `Gia VAT`, `BHYT`, `Dich vu`
- bang Danh muc Anh xa hien 3 cot nay sau `Nhom TCKT`
- file mau bao cao XNT lay 3 cot nay tu mapping
- 3 cot tren `InventoryReport` duoc giu lai nhu snapshot cua ky bao cao
- khi nguoi dung nop bao cao XNT va gia tri trong file khac mapping, server bao loi va khong luu
- dashboard/export/report detail tiep tuc doc tu `InventoryReport` nhu hien tai

## Non-Goals

Khong lam trong dot nay:

- backfill du lieu cu tu `InventoryReport`
- xoa 3 cot khoi `InventoryReport`
- cho phep sua 3 cot trong man bao cao XNT
- thay doi cong thuc ton kho ngoai viec su dung `Gia VAT` tu mapping de kiem tra thanh tien

## Chosen Approach

Dung `FacilityDrugMap` lam nguon su that cho `Gia VAT`, `BHYT`, `Dich vu`.
Giu nguyen 3 cot tren `InventoryReport` de luu snapshot ky bao cao va tranh sua rong cac dashboard/export/AI hien dang doc report.

Bao cao XNT van co 3 cot trong Excel de nguoi dung nhin thay, nhung gia tri phai khop mapping.
Neu Excel bi sua khac mapping, endpoint validate va submit deu tra loi theo dong/cot.

## Data Model

Them field vao `FacilityDrugMap`:

```prisma
giaVat Decimal @default(0) @map("gia_vat")
bhyt String? @map("bhyt")
dichVu String? @map("dich_vu")
```

Giu nguyen field hien co tren `InventoryReport`:

```prisma
giaVat Decimal @default(0) @map("gia_vat")
bhyt String? @map("bhyt")
dichVu String? @map("dich_vu")
```

Y nghia:

- `FacilityDrugMap`: gia tri chuan/cau hinh cua thuoc noi bo
- `InventoryReport`: snapshot gia tri tai thoi diem bao cao

Vi du lieu se reset, migration khong can script backfill.

## Mapping Flow

Trang `/dashboard/facility/mappings`:

- bang them cot theo thu tu: `Nhom TCKT`, `Gia VAT`, `BHYT`, `Dich vu`
- `Gia VAT` hien dang so tien, canh phai
- `BHYT`, `Dich vu` hien badge `X` hoac `-`
- file mau Danh muc Anh xa them 3 cot sau `Nhom TCKT`
- export Excel da duyet them 3 cot sau `Nhom TCKT`

Import mapping moi validate:

- `Gia VAT` bat buoc, phai la so, khong am
- `BHYT` chi duoc `X` hoac trong
- `Dich vu` chi duoc `X` hoac trong
- neu ca `BHYT` va `Dich vu` deu trong thi loi
- co the danh dau ca `BHYT` va `Dich vu`, giu dung rule bao cao hien tai

Dialog sua thong tin thuoc them 3 truong:

- `Gia VAT`: input number/text numeric
- `BHYT`: checkbox hoac select `X/trong`
- `Dich vu`: checkbox hoac select `X/trong`

Rule khoa:

- mapping `PENDING_MAPPING` va `REJECTED` duoc sua theo luong hien co
- mapping `WAITING_APPROVAL`, `APPROVED` bi khoa theo luong hien co
- neu can chinh sua mapping da duyet trong tuong lai, can workflow rieng ngoai pham vi spec nay

## Report Template Flow

`loadFacilityReportCanonicalContext` lay them 3 field tu `FacilityDrugMap`.

`buildFacilityReportTemplateRows` dien:

- `Gia VAT` = `mapping.giaVat`
- `BHYT` = `mapping.bhyt`
- `Dich vu` = `mapping.dichVu`

Trong file Excel bao cao, 3 cot nay van duoc hien thi.
Khuyen nghi khoa 3 cot nay giong `Nhom TCKT` de giam loi nhap lieu.

Huong dan Excel cap nhat:

- `Gia VAT`, `BHYT`, `Dich vu` duoc lay tu Danh muc Anh xa
- muon sua thi quay ve Danh muc Anh xa, khong sua trong file bao cao

## Report Validation Flow

Validation server la nguon chan loi chinh cho ca:

- `POST /api/facility/reports/validate`
- `POST /api/facility/reports`

Them vao canonical row:

- `mapGiaVat`
- `mapBhyt`
- `mapDichVu`

Khi doc row Excel:

1. parse `Gia VAT`, `BHYT`, `Dich vu` theo rule hien co
2. neu format sai thi tra loi format nhu hien co
3. neu format hop le, so sanh gia tri da normalize voi mapping
4. neu khac mapping, them loi `immutableFieldMismatch` hoac code moi `mappingReferenceMismatch`
5. neu co loi, khong luu bat ky dong nao cua file

Normalization:

- `Gia VAT`: so sanh theo number/decimal sau parse, chap nhan khac biet dinh dang nhu `25000` va `25,000` neu parser hien co cho phep
- `BHYT`, `Dich vu`: normalize ve `"X"` hoac `null`

Message goi y:

- `Dong 12: Gia VAT khong khop voi Danh muc Anh xa.`
- `Dong 12: BHYT khong khop voi Danh muc Anh xa.`
- `Dong 12: Dich vu khong khop voi Danh muc Anh xa.`

## Report Submit Flow

Khi tao `InventoryReport`, luu snapshot tu mapping, khong tin gia tri Excel:

- `giaVat: canonicalRow.mapGiaVat`
- `bhyt: canonicalRow.mapBhyt`
- `dichVu: canonicalRow.mapDichVu`

Neu Excel khac mapping, validation da fail truoc khi submit.
Viec luu tu canonical mapping giup API khong bi bypass neu client tu sua payload.

`Thanh tien ton cuoi` van duoc validate theo:

`Ton cuoi * Gia VAT tu mapping`

Neu Excel co `Thanh tien ton cuoi` tinh theo gia khac mapping, validation se loi cong thuc hoac loi mismatch `Gia VAT`.

## Previous-Month Rules

Bo rule so sanh `BHYT`, `Dich vu` voi bao cao thang truoc.

Ly do:

- nguon chuan moi la `FacilityDrugMap`
- so sanh voi thang truoc khong con can thiet va co the bao loi sai neu mapping duoc cau hinh lai truoc khi reset/report lai

Rule `Ton dau = Ton cuoi thang truoc` giu nguyen.
`Gia VAT` khong lay tu thang truoc nua, chi lay tu mapping.

## Impacted Files

Du kien tac dong:

- `prisma/schema.prisma`
- migration Prisma moi
- `src/app/dashboard/facility/mappings/page.tsx`
- `src/app/api/facility/mappings/route.ts`
- `src/app/api/facility/mappings/[id]/route.ts`
- `src/app/api/facility/mappings/nhom-tckt/import/route.ts` hoac import rieng neu doi ten workflow
- `src/lib/facility-report-upload.ts`
- `src/lib/report-validation.ts`
- `src/app/api/facility/reports/template/route.ts`
- cac export Excel mapping/report neu hien cot

## Testing

Manual test:

1. Reset data, tai mau Danh muc Anh xa, nhap `Gia VAT`, `BHYT`, `Dich vu`, upload thanh cong.
2. Mapping thieu `Gia VAT` bi tu choi.
3. Mapping co ca `BHYT` va `Dich vu` trong bi tu choi.
4. Mapping co `BHYT = X`, `Dich vu` trong duoc chap nhan.
5. Mapping co ca `BHYT = X`, `Dich vu = X` duoc chap nhan.
6. Tai mau bao cao XNT, xac nhan 3 cot duoc dien tu mapping.
7. Nop bao cao giu nguyen 3 cot, submit thanh cong va `InventoryReport` luu snapshot dung.
8. Sua `Gia VAT` trong Excel khac mapping, validate/submit phai fail.
9. Sua `BHYT` hoac `Dich vu` trong Excel khac mapping, validate/submit phai fail.
10. Sua `Thanh tien ton cuoi` khong bang `Ton cuoi * Gia VAT mapping`, validate phai fail.

Regression test:

- mapping status lock van hoat dong
- token row report van hoat dong
- immutable fields `Ma noi bo`, `Ma thuoc`, `Ten thuoc`, `Nhom TCKT` van bi chan neu sua
- dashboard/export report van hien `Gia VAT`, `BHYT`, `Dich vu` tu report snapshot

## Risks

- Neu sau nay co quy trinh thay doi gia VAT theo thoi gian, schema hien tai chi co gia tri hien hanh tren mapping va snapshot tren report; can them lich su hieu luc neu can truy van theo moc thoi gian.
- Khoa cot trong Excel chi la UX, khong thay the validation server.
- Worktree hien dang co nhieu thay doi khac, nen khi trien khai can tach commit code ro rang.

## Self Review

- Khong co placeholder hoac muc mo.
- Pham vi tap trung vao 3 field co dinh theo mapping.
- Thiet ke nhat quan: mapping la source of truth, report la snapshot.
- Khong mau thuan voi yeu cau giu nguyen 3 cot tren report va bao loi khi file bao cao khac map.
