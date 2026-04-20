# Facility LCNT goi thau status from KQLCNT

## Boi canh

Trang `/dashboard/facility/mua-sam/lap-ke-hoach-lcnt`, tab `Thong tin goi thau`, hien dang hien thi cot `Trang thai` dua tren truong `goiThau.trangThai`.

Trong he thong hien tai:

- `goiThau` da duoc tai kem `ketQuaLCNTs`
- cot `Trang thai` trong bang danh sach goi thau chi doi mau xanh khi `gt.trangThai === "Hoàn thành"`
- `1 goi thau` duoc xem la chi co `01 TBMT`
- neu goi thau da luu `Ket qua LCNT` thi co the xem goi thau da hoan thanh

Van de la cach hien thi hien tai phu thuoc vao chuoi `trangThai` luu san, trong khi quy tac nghiep vu mong muon la:

- co `Ket qua LCNT` => `Hoàn thành`
- chua co `Ket qua LCNT` => `Chưa hoàn thành`

## Muc tieu

- Cot `Trang thai` trong tab `Thong tin goi thau` phan anh dung theo du lieu `Ket qua LCNT`.
- Dialog xem chi tiet goi thau hien thi cung quy tac trang thai.
- Khong can dong bo nguoc ve DB cho thay doi nay.

## Ngoai pham vi

- Khong thay doi schema Prisma.
- Khong backfill du lieu `goi_thau.trang_thai`.
- Khong thay doi logic trang thai cho cac man khac ngoai trang facility LCNT page.
- Khong thay doi luong tao, sua, xoa `Ket qua LCNT`.

## Cach tiep can

Ap dung tinh dong tren frontend tai `src/app/dashboard/facility/mua-sam/lap-ke-hoach-lcnt/page.tsx`.

Them helper de suy ra trang thai hien thi cua `goi thau`:

- neu `goiThau.ketQuaLCNTs?.length > 0` => `"Hoàn thành"`
- nguoc lai => `"Chưa hoàn thành"`

Them helper class badge:

- `"Hoàn thành"` => `bg-green-100 text-green-700`
- `"Chưa hoàn thành"` => `bg-amber-100 text-amber-700`

## Pham vi ap dung

Quy tac tren duoc ap dung tai:

1. Cot `Trang thai` trong bang danh sach goi thau o tab `Thong tin goi thau`
2. Truong `Trang thai` trong dialog xem chi tiet goi thau

## Nguon du lieu

Trang da nap san `ketQuaLCNTs` trong API `GET /api/facility/ke-hoach-lcnt`, nen khong can bo sung query moi.

Frontend da map `ketQuaLCNTs` vao `GoiThau`, do do co the tinh trang thai ngay tren UI ma khong doi contract API.

## Ly do chon huong nay

Tinh dong tren UI duoc uu tien vi:

- don gian va it pham vi thay doi
- tranh lech du lieu giua `goi_thau.trang_thai` va `ketQua_lcnt`
- neu sau nay `Ket qua LCNT` bi sua hoac xoa, trang thai hien thi se tu dong dung theo du lieu hien co sau khi reload

## Rui ro va giam thieu

- Rui ro:
  `goiThau.trangThai` trong DB co the khac voi gia tri hien thi tren UI.
  Giam thieu:
  Day la chu dich cua thay doi; UI se uu tien su that nghiep vu tu `ketQuaLCNTs`.

- Rui ro:
  Cac man khac van co the dang doc `goiThau.trangThai`.
  Giam thieu:
  Thay doi nay chi gioi han o facility LCNT page. Neu can dong bo toan he thong, se lam spec rieng.

## Kiem thu

- Tao goi thau chua co `Ket qua LCNT`:
  cot `Trang thai` hien `Chưa hoàn thành` va mau vang

- Goi thau da co it nhat 1 `Ket qua LCNT`:
  cot `Trang thai` hien `Hoàn thành` va mau xanh

- Dialog xem chi tiet cua hai truong hop tren:
  hien dung chuoi trang thai theo cung quy tac

## Ket qua mong doi

Tai trang `/dashboard/facility/mua-sam/lap-ke-hoach-lcnt`, tab `Thong tin goi thau`, nguoi dung se thay `Trang thai` cua goi thau dua tren viec goi thau da luu `Ket qua LCNT` hay chua, thay vi phu thuoc vao chuoi `trangThai` luu san.
