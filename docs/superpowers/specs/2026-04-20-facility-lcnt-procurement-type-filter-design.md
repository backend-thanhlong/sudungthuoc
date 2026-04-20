# Facility LCNT procurement type filter

## Boi canh

Trang `/dashboard/facility/mua-sam/lap-ke-hoach-lcnt` hien co 2 tab danh sach:

- `quyTrinh1`: Luat Dau thau
- `quyTrinh2`: Tu quyet dinh

Nguoi dung can loc nhanh danh sach theo loai mua sam:

- `Thuốc`
- `Hóa chất, vật tư, thiết bị y tế`

Du lieu can loc da co san tren client:

- tab `quyTrinh1` dung truong `loaiMuaSam`
- tab `quyTrinh2` dung truong `loaiMuaSamTuQuyet`

Trang hien chua co bo loc nao cho 2 truong nay.

## Muc tieu

- Them bo loc loai mua sam dung chung cho ca 2 tab danh sach.
- Khi dang o `quyTrinh1`, bo loc ap dung vao `loaiMuaSam`.
- Khi dang o `quyTrinh2`, bo loc ap dung vao `loaiMuaSamTuQuyet`.
- Khong thay doi API va khong them request moi.

## Ngoai pham vi

- Khong dua bo loc vao query string.
- Khong thay doi backend `GET /api/facility/ke-hoach-lcnt`.
- Khong thay doi form tao/sua KHLCNT.
- Khong dong bo bo loc sang cac man admin hoac cac man mua sam khac.

## Lua chon da can nhac

### 1. Loc tren client tai trang hien tai

- Uu diem: don gian, dung voi du lieu da nap san, khong sua API
- Nhuoc diem: trang thai filter khong luu trong URL

### 2. Dong bo filter vao URL

- Uu diem: reload trang van giu filter, co the chia se link
- Nhuoc diem: tang do phuc tap vuot nhu cau hien tai

### 3. Loc tu API

- Uu diem: phu hop khi du lieu rat lon
- Nhuoc diem: sua contract API va tang pham vi thay doi khong can thiet

Huong duoc chon: `1. Loc tren client tai trang hien tai`.

## Cach tiep can

Them 1 state filter tren frontend voi 3 gia tri:

- `all`
- `Thuốc`
- `Hóa chất, vật tư, thiết bị y tế`

Bo loc duoc dat trong khu vuc list view, ngay duoi `TabsList`, de dung chung cho ca 2 tab.

Logic loc se gom 2 buoc:

1. Loc theo `listTab` nhu hien tai:
   - `quyTrinh1` => `kh.quyTrinh === 1`
   - `quyTrinh2` => `kh.quyTrinh === 2`
2. Neu filter khac `all`, loc tiep theo truong ung voi tab dang mo:
   - `quyTrinh1` => `kh.loaiMuaSam === selectedFilter`
   - `quyTrinh2` => `kh.loaiMuaSamTuQuyet === selectedFilter`

## Hien thi UI

Bo loc hien thi 3 lua chon:

- `Tat ca`
- `Thuốc`
- `Hóa chất, vật tư, thiết bị y tế`

Empty state trong bang se duoc dieu chinh nhe de phan biet 2 truong hop:

- chua co du lieu
- co du lieu nhung khong khop bo loc

Neu chi phi sua doi empty state tang pham vi thay doi khong dang ke, co the giu nguyen cau truc hien tai va chi cap nhat noi dung thong diep.

## Nguon du lieu

Khong can query moi.

`loadKeHoachList()` da nap day du:

- `loaiMuaSam`
- `loaiMuaSamTuQuyet`

Do do filter co the thuc hien hoan toan tren client trong `viewMode === "list"`.

## Ly do chon huong nay

- Nho gon va phu hop voi cau truc trang hien co
- Khong anh huong API hay du lieu luu tru
- De mo rong them filter khac trong cung khu vuc list view sau nay
- Giu logic ro rang: cung 1 bo loc UI, nhung map dung truong theo tab dang xem

## Rui ro va giam thieu

- Rui ro:
  Nguoi dung co the khong nhan ra filter dang ap dung cho tab nao.
  Giam thieu:
  Dat filter trong cung khu vuc voi `Tabs`, label ro rang `Loai mua sam`.

- Rui ro:
  Empty state hien thong diep "chua co du lieu" trong khi thuc te la "khong khop bo loc".
  Giam thieu:
  Dieu chinh thong diep empty state theo filter dang chon.

## Kiem thu

- O tab `quyTrinh1`, chon `Tat ca`:
  hien tat ca KHLCNT co `quyTrinh === 1`

- O tab `quyTrinh1`, chon `Thuốc`:
  chi hien cac KHLCNT co `loaiMuaSam === "Thuốc"`

- O tab `quyTrinh1`, chon `Hóa chất, vật tư, thiết bị y tế`:
  chi hien cac KHLCNT co `loaiMuaSam === "Hóa chất, vật tư, thiết bị y tế"`

- O tab `quyTrinh2`, chon `Thuốc`:
  chi hien cac KHLCNT co `loaiMuaSamTuQuyet === "Thuốc"`

- O tab `quyTrinh2`, chon `Hóa chất, vật tư, thiết bị y tế`:
  chi hien cac KHLCNT co `loaiMuaSamTuQuyet === "Hóa chất, vật tư, thiết bị y tế"`

- Chuyen qua lai giua 2 tab khi dang giu 1 gia tri filter:
  filter van duoc giu, nhung ap vao truong du lieu dung theo tab hien tai

## Ket qua mong doi

Tai trang `/dashboard/facility/mua-sam/lap-ke-hoach-lcnt`, nguoi dung co them bo loc `Loai mua sam` de tach nhanh danh sach `Thuốc` va `Hóa chất, vật tư, thiết bị y tế` tren ca 2 tab danh sach, ma khong can tai lai API hay thay doi luong tao/sua du lieu.
