# Supply Stockout Extra Columns Design

## Context

Tab `Cung ung` dung component `Tab2Supply`. Bang `Da het hang cuoi ky` hien danh sach `stockoutActual` tu `buildSupplyDashboardDataFromMetrics`.

Hien tai bang chi hien co so, ten thuoc, hoat chat, xuat ky nay va nhu cau BQ. Nguoi dung can them thong tin dinh danh va phan loai thuoc de doi chieu nhanh: so dang ky, nhom TCKT va don vi tinh.

## Goal

- Hien them cot `So dang ky`, `Nhom TCKT`, `Don vi tinh` trong bang `Da het hang cuoi ky`.
- Uu tien du lieu thuoc chuan da mapping, fallback ve du lieu noi bo cua co so:
  - `soDangKy = masterDrug.soDangKy || drugMap.soDangKyNoiBo || ""`
  - `donViTinh = masterDrug.donViTinh || drugMap.donViTinhNoiBo || ""`
  - `nhomTckt = drugMap.nhomTckt || ""`
- Ap dung cho cac API supply dung chung: admin, facility va public.

## Non-Goals

- Khong doi logic xac dinh thuoc het hang.
- Khong doi cong thuc nhu cau BQ.
- Khong doi bang `Du bao thieu hang` trong dot nay.
- Khong them filter moi.

## Data Flow

1. API supply select them field tu `InventoryReport.drugMap`:
   - `soDangKyNoiBo`
   - `donViTinhNoiBo`
   - `nhomTckt`
   - `masterDrug.soDangKy`
   - `masterDrug.donViTinh`
2. `normalizeSupplyReportRow` chuan hoa thanh `SupplyReportRow`.
3. `buildSnapshotMetrics` giu cac field nay trong `SnapshotMetric`.
4. `buildSupplyDashboardDataFromMetrics` dua field sang `StockoutActualRow`.
5. `StockoutActualTable` hien thi tren desktop va mobile.

## UI

Desktop table `Da het hang cuoi ky` them 3 cot sau thong tin thuoc:

- `So dang ky`
- `Nhom TCKT`
- `Don vi tinh`

Mobile card them 3 dong nho duoi ten/hoat chat. Neu khong co du lieu, hien `-`.

## Error Handling

- Field thieu hoac null se normalize thanh chuoi rong va UI hien `-`.
- API cu khong bi thay doi contract bat buoc; day la bo sung field optional trong response.

## Testing

- Chay lint/build.
- Kiem tra type compile cho `RawSupplyReport`, `SupplyReportRow`, `SnapshotMetric`, `StockoutActualRow`.
- Kiem tra bang `Da het hang cuoi ky` hien 3 cot moi tren desktop.
- Kiem tra mobile card hien 3 thong tin moi.
- Kiem tra admin/facility/public supply API build thanh cong.
