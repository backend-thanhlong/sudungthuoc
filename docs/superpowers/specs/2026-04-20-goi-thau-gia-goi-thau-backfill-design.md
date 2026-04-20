# Backfill giaGoiThau tu thanhTien phanLo

## Boi canh

Trang `/dashboard/facility/mua-sam/lap-ke-hoach-lcnt` da duoc doi logic de `GoiThau.giaGoiThau` duoc tinh tu dong tu tong `PhanLoGoiThau.thanhTien`.

Du lieu cu trong bang `goi_thau` van co the dang luu:

- gia tri nhap tay cu
- gia tri khong dong bo voi tong `thanhTien`
- gia tri khac `null` du khong co `thanhTien` hop le nao

Can mot script mot lan de dong bo du lieu cu theo logic moi.

## Muc tieu

- Tao script backfill co the chay thu cong.
- Tinh lai `giaGoiThau` cho tat ca `GoiThau` tu tong `PhanLoGoiThau.thanhTien`.
- Neu khong co `thanhTien` hop le nao trong cac phan lo cua mot goi thau, set `giaGoiThau = null`.
- Chi ghi DB khi gia tri moi khac gia tri dang luu.
- Co che do `--dry-run` de xem truoc thay doi ma khong ghi DB.

## Ngoai pham vi

- Khong doi schema Prisma.
- Khong doi them UI hay API runtime.
- Khong sua logic thong ke hay tra cuu ngoai viec doc du lieu da duoc backfill.

## Cach tiep can

Them file `scripts/backfill-goi-thau-gia-goi-thau.ts`.

Script se:

1. Nap tat ca `GoiThau` kem `phanLos`.
2. Duyet tung `GoiThau` va tinh:
   - Lay tat ca `phanLo.thanhTien` parse duoc thanh so.
   - Neu co it nhat mot gia tri hop le, `giaGoiThauMoi = tong(thanhTien)`.
   - Neu khong co gia tri hop le, `giaGoiThauMoi = null`.
3. So sanh `giaGoiThauMoi` voi `giaGoiThau` hien tai.
4. Neu khac nhau:
   - `dry-run`: chi log.
   - chay that: `update` ban ghi `GoiThau`.
5. In tong ket cuoi script.

## Quy tac tinh gia

- `thanhTien = null | undefined | "" | NaN` duoc xem la khong hop le va bi bo qua.
- Co it nhat mot `thanhTien` hop le moi duoc tinh tong.
- Tong hop le co the bang `0`.
- Neu tat ca `thanhTien` deu khong hop le thi `giaGoiThau = null`.

## Giao dien dong lenh

Script ho tro:

- `npx tsx scripts/backfill-goi-thau-gia-goi-thau.ts`
- `npx tsx scripts/backfill-goi-thau-gia-goi-thau.ts --dry-run`

## Log va thong ke

Script in:

- che do dang chay: `dry-run` hoac `write`
- so goi thau da kiem tra
- so goi thau duoc cap nhat
- so goi thau giu nguyen
- so goi thau bi set ve `null`

Voi moi ban ghi thay doi trong `dry-run`, log:

- `goiThauId`
- `tenGoiThau`
- `giaGoiThauCu`
- `giaGoiThauMoi`

## An toan van hanh

- Script co the chay lai nhieu lan, ket qua idempotent.
- Khong xoa du lieu.
- Khong can khoa he thong hay downtime.
- Dry run duoc dung de xac nhan pham vi thay doi truoc khi ghi DB.

## Kiem thu

- Chay `--dry-run` de kiem tra so lieu du kien.
- Chay that tren cung tap du lieu.
- Chay lai `--dry-run` sau khi backfill; ky vong khong con ban ghi can cap nhat.

## Rui ro va giam thieu

- Rui ro chenh lech so thap phan:
  Giam thieu bang cach dung gia tri `Decimal` tu Prisma va so sanh tren gia tri da chuan hoa sang `number` khi tinh tong.

- Rui ro du lieu phan lo thieu `thanhTien`:
  Day la hanh vi mong muon; script se set `giaGoiThau = null` theo quy tac da chot.

## Ket qua mong doi

Sau khi chay script, tat ca ban ghi `GoiThau.giaGoiThau` se dong bo voi tong `PhanLoGoiThau.thanhTien` theo dung logic runtime hien tai.
