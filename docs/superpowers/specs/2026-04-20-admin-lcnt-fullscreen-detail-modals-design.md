# Admin LCNT fullscreen detail modals

## Boi canh

Trang `/dashboard/admin/mua-sam/lap-ke-hoach-lcnt` hien co 2 modal thao tac `Chi tiết`:

- `Chi tiết Kế hoạch LCNT`
- `Chi tiết gói thầu`

Hai modal nay dang dung khung dialog kich thuoc vua:

- modal ke hoach: `sm:max-w-4xl max-h-[85vh] overflow-y-auto`
- modal goi thau: `sm:max-w-3xl max-h-[80vh] overflow-y-auto`

Trong khi do noi dung hien thi kha dai:

- thong tin don vi
- thong tin ke hoach
- bang danh sach goi thau
- thong tin goi thau
- bang danh sach phan lo

Yeu cau la khi bam `Chi tiết`, ca hai modal can hien thi dang full-screen de doc va thao tac de hon.

## Muc tieu

- Chuyen ca hai modal `Chi tiết` sang dang full-screen thuc su.
- Tang khong gian hien thi cho bang va thong tin chi tiet.
- Giu nguyen luong mo dong modal, du lieu va hanh vi nghiep vu hien tai.

## Ngoai pham vi

- Khong thay doi API admin KHLCNT.
- Khong thay doi du lieu trong modal.
- Khong doi vi tri nut `Chi tiết` trong bang.
- Khong thay doi modal xoa ke hoach hay xoa goi thau.
- Khong chuyen modal thanh trang rieng.

## Lua chon da can nhac

### 1. Full-screen that su cho ca 2 modal

- Uu diem: dung yeu cau, toi da khong gian hien thi
- Nhuoc diem: can override class mac dinh cua `DialogContent` manh hon

### 2. Gan full-screen theo kieu `95vw/95vh`

- Uu diem: it rui ro hon, da co pattern trong repo
- Nhuoc diem: khong phai full-screen dung nghia

### 3. Chuyen sang trang rieng

- Uu diem: co URL rieng, nhieu khong gian
- Nhuoc diem: doi luong dieu huong qua lon so voi nhu cau

Huong duoc chon: `1. Full-screen that su cho ca 2 modal`.

## Cach tiep can

Chi sua frontend tai:

- `src/app/dashboard/admin/mua-sam/lap-ke-hoach-lcnt/page.tsx`

Hai `DialogContent` se duoc doi tu dialog centered kich thuoc vua sang shell full-screen:

- phu toan bo viewport
- bo `max-width` nho hien tai
- bo `rounded` de giao dien lien mach nhu man hinh chi tiet
- chuyen thanh layout `flex flex-col`
- tach header va body thanh 2 vung ro rang

Huong class du kien:

- `fixed inset-0`
- `h-screen w-screen max-w-none`
- `translate-x-0 translate-y-0 top-0 left-0`
- `rounded-none`
- `flex flex-col`
- `overflow-hidden`

## Hanh vi layout

### Modal `Chi tiết Kế hoạch LCNT`

- Header modal nam tren cung va luon hien thi.
- Noi dung modal la vung cuon doc rieng.
- Section `Thong tin don vi` va `Thong tin ke hoach` giu nguyen noi dung.
- Bang `Danh sách gói thầu` duoc huong khong gian ngang lon hon.

### Modal `Chi tiết gói thầu`

- Header modal nam tren cung va luon hien thi.
- Vung thong tin tong quan va bang `Danh sách phần lô` cuon doc trong than modal.
- Bang phan lo co them khong gian ngang, giam nguy co chat noi dung.

## Tinh nhat quan voi repo

Repo da co cac modal lon dung mau hinh:

- `90vw/90vh`
- `95vw/95vh`

Thay doi nay di xa hon mot buoc: su dung full-screen that su cho 2 modal chi tiet tren man admin LCNT, nhung van giu nguyen component `Dialog` va co che overlay/animation hien tai.

## Rui ro va giam thieu

- Rui ro:
  Class mac dinh cua `DialogContent` dang centered bang `top-[50%] left-[50%] translate-*`.
  Giam thieu:
  Override truc tiep bang class full-screen day du (`top-0 left-0 translate-x-0 translate-y-0 inset-0`).

- Rui ro:
  Noi dung dai lam mat header khi cuon.
  Giam thieu:
  Dat header o vung `shrink-0`, body `flex-1 overflow-y-auto`.

- Rui ro:
  Thay doi full-screen vo tinh anh huong cac modal khac.
  Giam thieu:
  Chi sua 2 `DialogContent` cu the trong file page admin LCNT.

## Kiem thu

- Bam `Chi tiết` tai tab `quyTrinh1`:
  modal `Chi tiết Kế hoạch LCNT` mo full-screen, header luon hien, noi dung cuon doc duoc

- Tu modal ke hoach, bam `Chi tiết` tren 1 goi thau:
  modal `Chi tiết gói thầu` mo full-screen, thong tin va bang phan lo hien day du

- Dong tung modal bang nut close cua dialog:
  hanh vi dong mo van dung nhu cu

- Thu tren viewport hep hon:
  modal van full-screen va noi dung cuon trong than modal, khong vuot viewport

## Ket qua mong doi

Tai trang `/dashboard/admin/mua-sam/lap-ke-hoach-lcnt`, ca hai modal thao tac `Chi tiết` se mo dang full-screen, giup nguoi dung doc thong tin va bang du lieu de hon ma khong can roi khoi luong modal hien tai.
