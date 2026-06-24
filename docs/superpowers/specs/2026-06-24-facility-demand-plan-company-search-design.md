# Facility Demand Plan Company Search Design

## Context

Trang `/dashboard/facility/lap-du-tru` co modal `Tao du tru` dung de chon thang goc XNT, loc theo ten cong ty, nhap ghi chu chung va chon thuoc tu danh muc anh xa.

Hien tai truong `Ten Cong ty` la select co dinh. Nguoi dung phai mo danh sach va cuon/chon, khong go truc tiep de tim cong ty. O `Ghi chu` chung dang nam cung hang va chiem chieu ngang tuong duong cac truong khac, trong khi day chi la thong tin phu.

## Goals

- Cho phep go ten cong ty de tim nhanh cong ty trong modal tao du tru.
- Lam truong `Ten Cong ty` rong hon de hien thi ten cong ty dai tot hon.
- Lam o `Ghi chu` chung cho ca phieu ngan lai theo chieu ngang.
- Giu nguyen API va cau truc du lieu hien co.

## Non-Goals

- Khong doi cach luu `facility_demand_plans.note`.
- Khong doi logic goi y so luong, lam tron, chot du tru.
- Khong them dependency UI moi.
- Khong thay doi ghi chu tung dong thuoc trong bang chi tiet.

## Recommended Approach

Thay `Select` cua truong `Ten Cong ty` bang input tim kiem kem danh sach goi y inline trong modal. Component se dung state hien co `catalogCompanyName`, `catalogCompanyOptions` va `loadCatalog`.

Ly do:

- Repo chua co combobox/popover command component san.
- Input + danh sach goi y dap ung dung nhu cau go tim ten cong ty.
- Pham vi thay doi nho, khong can doi backend hay dependency.

## UI Layout

Hang thong tin dau modal se dung grid moi:

- `Thang goc XNT`: giu kich thuoc gan hien tai, khoang `220px`.
- `Ten Cong ty`: mo rong thanh vung chinh, toi thieu khoang `360px` tren desktop.
- `Ghi chu`: chi hien trong che do tao moi, thu gon ngang khoang `180px`.

Tren man hinh nho, cac truong van xuong hang theo grid responsive de tranh tran noi dung.

## Company Search Behavior

- Mac dinh hien `Tat ca cong ty`.
- Khi nguoi dung focus vao o `Ten Cong ty`, hien danh sach goi y gom `Tat ca cong ty` va cac cong ty khop chuoi dang go.
- Khi nguoi dung go, danh sach goi y loc client-side theo `catalogCompanyOptions`.
- Khi chon mot cong ty, cap nhat `catalogCompanyName`, dong danh sach goi y va goi `loadCatalog(catalogMonth, companyName)`.
- Khi chon `Tat ca cong ty` hoac xoa noi dung roi roi khoi truong, dat lai `catalogCompanyName` ve `ALL_COMPANIES_VALUE` va goi lai catalog tat ca cong ty.
- Neu nguoi dung go chuoi khong khop cong ty nao va roi khoi truong, khong gui chuoi tu do len API; truong quay ve lua chon truoc do de tranh loc sai.

## Data Flow

Du lieu van di theo flow hien co:

1. `loadCatalog(month, companyName)` lay danh muc va `companyOptions`.
2. Input cong ty loc `companyOptions` tai client.
3. Chon cong ty goi lai `loadCatalog` voi ten cong ty da chon.
4. Tao du tru van gui `note: catalogNote.trim() || null`.

## Error Handling

- Neu tai catalog loi, giu toast loi hien co.
- Neu khong co cong ty khop chuoi tim, hien mot dong thong bao `Khong co cong ty phu hop`.
- Khong cho gia tri cong ty tu do anh huong request API.

## Testing

- Chay lint/build neu moi truong cho phep.
- Kiem tra bang code cac luong:
  - Mo modal tao du tru, thay `Ten Cong ty` rong hon va `Ghi chu` ngan hon.
  - Go mot phan ten cong ty, danh sach goi y duoc loc.
  - Chon cong ty, danh muc thuoc tai lai theo cong ty.
  - Chon/xoa ve `Tat ca cong ty`, danh muc tai lai tat ca cong ty.
  - Tao du tru van luu ghi chu chung nhu hien tai.
