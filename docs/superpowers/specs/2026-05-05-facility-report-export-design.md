# Facility Report Export Design

## Context

Trang `/dashboard/facility/reports` cho co so chon ky bao cao, tai file mau, nop file, xem lich su bao cao va xem chi tiet tung ky.
File mau bao cao duoc tao tai `/api/facility/reports/template` voi sheet `BaoCao` va danh sach cot co dinh trong `src/lib/report-validation.ts`.
Hien tai co so chua co thao tac xuat lai file Excel du lieu da nop theo tung ky bao cao.

## Goal

Them thao tac xuat Excel du lieu bao cao cua co so theo tung ky bao cao.

Thanh cong khi:

- moi dong trong bang lich su bao cao co nut `Xuat Excel`
- nut xuat dung ky bao cao cua dong do
- backend chi xuat du lieu cua co so dang dang nhap
- file Excel co cac cot dung nhu file mau co so tai ve de bao cao
- file tai ve khong phu thuoc vao search/filter trong modal chi tiet

## Decision

Dat nut `Xuat Excel` ngay trong cot `Thao tac` cua bang lich su bao cao, canh nut `Xem chi tiet`.

Tao API rieng `/api/facility/reports/export?month=MM/YYYY`.
API bat buoc role `FACILITY`, lay `facilityId` tu session, khong nhan `facilityId` tu client.

## Excel Format

Sheet chinh ten `BaoCao`.
Cot hien thi dung theo file mau:

- `STT`
- `Ma noi bo`
- `Ma thuoc`
- `Ten thuoc`
- `Hoat chat`
- `Don vi tinh`
- `Ton dau`
- `Nhap trong ky`
- `Xuat trong ky`
- `Ton cuoi`
- `Gia VAT`
- `Thanh tien ton cuoi`
- `So QD trung thau`
- `Ten Cong ty`
- `Ngay bat dau HD`
- `Ngay ket thuc HD`
- `BHYT`
- `Dich vu`
- `Bo qua`
- `Ghi chu`

Khong xuat cot ky thuat an `__ROW_TOKEN` vi file nay la ban xuat du lieu da nop, khong phai file mau de nop lai.

## Data Rules

Du lieu lay tu `inventoryReport` theo `facilityId=session.user.id` va `reportMonth=month`.
Moi dong da luu duoc map ve cot file mau:

- cot danh muc lay tu `drugMap` va `masterDrug` neu co
- cot so lieu lay tu `InventoryReport`
- `Bo qua` va `Ghi chu` de trong cho dong da luu

Neu ky da nop nhung khong co dong `inventoryReport`, API tra file `BaoCao` co header dung format va mot sheet `ThongTin` ghi ro tat ca dong da duoc danh dau bo qua.

## Error Handling

- Thieu session hoac khong phai `FACILITY`: 401/403 theo guard hien co
- Thieu `month`: 400
- Ky chua co bao cao da nop: 404
- Loi server: 500 va log console

## Testing

Kiem tra:

- TypeScript khong loi
- lint khong loi
- route export build duoc trong Next
- UI co nut `Xuat Excel` theo tung dong lich su
- filename va download blob hoat dong tu `Content-Disposition`

