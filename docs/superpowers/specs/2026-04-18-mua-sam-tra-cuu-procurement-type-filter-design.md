# Mua Sam Tra Cuu Procurement Type Filter Design

## Context

Màn `Tra cứu` mua sắm đã có cho cả:

- `/dashboard/admin/mua-sam/tra-cuu`
- `/dashboard/facility/mua-sam/tra-cuu`

Dataset hiện tại của màn `tra-cuu`:

- chỉ lấy `quyTrinh = 1`
- biểu diễn `1 dòng = 1 gói thầu`
- đã có filter server-side theo:
  - từ khóa
  - đơn vị
  - trạng thái tiến trình
  - khoảng ngày phê duyệt `KHLCNT`

Ngoài ra, model `KeHoachLCNT` hiện đã có field:

- `loaiMuaSam`

Field này được dùng cho `quyTrinh = 1` và đang lưu trực tiếp các giá trị nghiệp vụ:

- `Thuốc`
- `Hóa chất, vật tư, thiết bị y tế`

Người dùng cần bổ sung thêm filter `Loại mua sắm` trên màn `tra-cuu`, đồng thời muốn filter này tác động đồng nhất đến:

- summary cards
- bảng danh sách
- export Excel của admin

## Goal

Thêm filter `Loại mua sắm` cho màn `tra-cuu` với yêu cầu:

- áp dụng cho cả `admin` và `facility`
- dùng đúng giá trị dữ liệu hiện có:
  - `Thuốc`
  - `Hóa chất, vật tư, thiết bị y tế`
- filter chạy server-side
- summary cards, bảng, phân trang và export Excel phản ánh cùng một tập dữ liệu sau filter

## Scope

Bao gồm:

- thêm filter `Loại mua sắm` vào UI của `tra-cuu`
- mở rộng contract query cho:
  - `GET /api/admin/mua-sam/tra-cuu`
  - `GET /api/facility/mua-sam/tra-cuu`
  - `GET /api/admin/mua-sam/tra-cuu/export`
- áp dụng filter trong shared lookup data layer
- đồng bộ filter cho cả summary cards, list và export

Không bao gồm:

- thêm cột `Loại mua sắm` vào bảng tra cứu
- thêm cột `Loại mua sắm` vào popup chi tiết
- đổi tên route
- thay đổi schema Prisma hoặc dữ liệu DB
- thay đổi logic của các màn `mua-sam` khác ngoài `tra-cuu`

## Current State

### Data model

Theo schema hiện tại:

- `KeHoachLCNT.quyTrinh`
- `KeHoachLCNT.loaiMuaSam`

Với `quyTrinh = 1`, `loaiMuaSam` đã phản ánh đúng phân loại cần dùng cho filter:

- `Thuốc`
- `Hóa chất, vật tư, thiết bị y tế`

Do đó, không cần migration hay field mới.

### Shared lookup layer

File chính: `src/lib/mua-sam-procurement-lookup.ts`

Hiện đã có:

- parse query filter
- build Prisma `where`
- load list có phân trang
- load toàn bộ dataset cho export

Chưa có:

- filter `procurementType`

### UI

File chính: `src/components/mua-sam/ProcurementLookupPage.tsx`

Hiện đã có các filter:

- `Từ khóa`
- `Đơn vị` cho admin
- `Trạng thái tiến trình`
- `Từ ngày phê duyệt KHLCNT`
- `Đến ngày phê duyệt KHLCNT`

Chưa có:

- `Loại mua sắm`

## Approach Options

### Option 1: Lọc ở client sau khi API trả dữ liệu

Ưu điểm:

- sửa nhanh

Nhược điểm:

- sai với phân trang server-side
- summary cards không đồng bộ
- export Excel dễ lệch so với màn hình

### Option 2: Mở rộng filter server-side trong shared lookup layer

Thêm `procurementType` vào query contract và áp dụng ngay trong `buildBaseWhere`.

Ưu điểm:

- summary cards, bảng, phân trang và export cùng một nguồn dữ liệu
- phù hợp kiến trúc hiện tại
- không cần API mới

Nhược điểm:

- phải sửa shared lib, UI, và export route

### Option 3: Chỉ thêm filter cho export hoặc chỉ cho admin

Ưu điểm:

- ít chỉnh sửa hơn

Nhược điểm:

- không đồng nhất giữa các màn
- không đúng yêu cầu đã chốt là áp dụng đồng thời cho `admin` và `facility`

## Recommendation

Chọn **Option 2**.

Lý do:

- đúng với cách màn `tra-cuu` đang tổ chức dữ liệu server-side
- giữ số liệu nhất quán giữa summary, list và export
- tận dụng field `KeHoachLCNT.loaiMuaSam` hiện có

## Data Design

### Query contract

Thêm một query param mới:

- `procurementType`

Giá trị hợp lệ:

- `all`
- `Thuốc`
- `Hóa chất, vật tư, thiết bị y tế`

Nếu giá trị không hợp lệ:

- fallback về `all`

### Where clause

Filter này được áp vào `KeHoachLCNT.loaiMuaSam` trong khi vẫn giữ:

- `keHoach.quyTrinh = 1`

Quy tắc:

- nếu `procurementType = all`: không thêm điều kiện `loaiMuaSam`
- nếu `procurementType = Thuốc`: chỉ lấy `keHoach.loaiMuaSam = "Thuốc"`
- nếu `procurementType = Hóa chất, vật tư, thiết bị y tế`: chỉ lấy đúng giá trị này

### Null or empty data

Nếu `keHoach.loaiMuaSam` là `null` hoặc rỗng:

- khi `procurementType = all`: record vẫn xuất hiện
- khi user chọn một loại cụ thể: record không match

Lý do:

- đây là dữ liệu thiếu chuẩn trong scope `quyTrinh = 1`
- hành vi này đơn giản, dễ hiểu và không tạo nhóm filter thứ ba ngoài yêu cầu

## API Design

### Admin list route

`GET /api/admin/mua-sam/tra-cuu`

Nhận thêm:

- `procurementType`

### Facility list route

`GET /api/facility/mua-sam/tra-cuu`

Nhận thêm:

- `procurementType`

Vẫn giữ nguyên rule:

- `facilityId` bị khóa theo session hiện tại

### Admin export route

`GET /api/admin/mua-sam/tra-cuu/export`

Nhận thêm:

- `procurementType`

Route export phải dùng cùng shared query layer, nên file Excel chỉ chứa tập dữ liệu đúng với loại mua sắm đang chọn.

## UI Design

### Filter control

Thêm một ô chọn mới trong filter bar:

- label: `Loại mua sắm`

Options:

- `Tất cả loại mua sắm`
- `Thuốc`
- `Hóa chất, vật tư, thiết bị y tế`

### Visibility

Filter này hiển thị cho cả:

- `admin`
- `facility`

Khác biệt còn lại:

- `admin` vẫn có thêm filter `Đơn vị`
- `facility` không có filter `Đơn vị`

### State model

UI có thêm:

- `selectedProcurementType`
- `appliedFilters.procurementType`

### Interaction rules

- Chỉ khi bấm `Tìm kiếm` thì `selectedProcurementType` mới được đưa vào request
- `Đặt lại` đưa filter này về `all`
- Filter này tác động đồng thời đến:
  - summary cards
  - bảng danh sách
  - phân trang
  - export Excel admin

## Export Behavior

Filter `procurementType` phải được truyền cùng `appliedFilters` khi export từ admin.

Kết quả:

- nếu chọn `Thuốc`: file Excel chỉ có dữ liệu `Thuốc`
- nếu chọn `Hóa chất, vật tư, thiết bị y tế`: file Excel chỉ có dữ liệu loại đó
- nếu chọn `all`: file có cả hai loại

Không đổi cấu trúc workbook hay cột export trong pha này. Chỉ thay đổi tập dữ liệu được đưa vào file.

## Testing

1. Admin mở `/dashboard/admin/mua-sam/tra-cuu`, chọn `Loại mua sắm = Thuốc`, xác nhận summary cards và bảng chỉ còn record có `keHoach.loaiMuaSam = "Thuốc"`.
2. Admin chọn `Loại mua sắm = Hóa chất, vật tư, thiết bị y tế`, xác nhận summary cards và bảng chỉ còn đúng loại đó.
3. Admin export Excel ở từng loại, xác nhận file chỉ chứa đúng tập dữ liệu đã chọn.
4. Facility mở `/dashboard/facility/mua-sam/tra-cuu`, xác nhận có filter `Loại mua sắm` và chỉ thấy dữ liệu của chính đơn vị hiện tại.
5. Với filter `all`, xác nhận summary cards và bảng quay về tập dữ liệu không lọc theo loại mua sắm.
6. `Đặt lại` đưa `Loại mua sắm` về `Tất cả loại mua sắm`.
7. Record có `loaiMuaSam = null` chỉ xuất hiện khi filter là `all`, không xuất hiện khi chọn một loại cụ thể.

## Risks And Mitigations

### Risk: Filter chạy ở list nhưng quên áp vào export

Mitigation:

- export route bắt buộc dùng cùng shared query layer với list route

### Risk: Admin và facility lệch nhau về options filter

Mitigation:

- dùng cùng constant/type cho `procurementType` ở shared layer hoặc shared UI config

### Risk: Dữ liệu cũ có `loaiMuaSam` không chuẩn

Mitigation:

- giá trị không hợp lệ hoặc thiếu chỉ match khi `all`
- không thêm chuẩn hóa DB trong scope này

## Out Of Scope Follow-ups

- hiển thị thêm cột `Loại mua sắm` trong bảng `tra-cuu`
- thêm filter `Loại mua sắm` ở các màn `mua-sam` khác
- chuẩn hóa dữ liệu lịch sử có `loaiMuaSam` thiếu hoặc sai chính tả
