# Admin Mua Sam Tra Cuu Export Excel Design

## Context

Màn `Tra cứu` mua sắm cho admin tại `/dashboard/admin/mua-sam/tra-cuu` đã có:

- summary cards
- bộ lọc server-side
- bảng danh sách `gói thầu`
- popup chi tiết `gói thầu`

Dataset hiện tại đã tổng hợp theo `gói thầu` và nối đủ chuỗi nghiệp vụ:

- `KHLCNT`
- `TBMT`
- `KQLCNT`
- `Kết quả phần lô`

Thiết kế gốc của tính năng `Tra cứu` tại `2026-04-18-mua-sam-tra-cuu-goi-thau-design.md` chủ động loại `export Excel` ra khỏi scope ban đầu để rollout nhanh. Sau khi màn hình đã có cấu trúc dữ liệu phù hợp, người dùng cần bổ sung khả năng xuất Excel để lấy toàn bộ dữ liệu đang tra cứu theo bộ lọc hiện tại.

## Goal

Bổ sung chức năng `Xuất Excel` cho màn `/dashboard/admin/mua-sam/tra-cuu` với các yêu cầu:

- chỉ áp dụng cho `admin`
- xuất `toàn bộ` dữ liệu khớp bộ lọc đang áp dụng, không phụ thuộc phân trang
- file gồm `2 sheet`
- sheet tổng hợp thể hiện `1 dòng = 1 gói thầu`
- sheet chi tiết thể hiện `1 dòng = 1 phần lô`
- sheet chi tiết phải cho phép nhìn vào là biết phần lô thuộc `đơn vị` nào và `gói thầu` nào
- dữ liệu trong file phải khớp với logic lọc đang dùng trên màn hình

## Scope

Bao gồm:

- thêm nút `Xuất Excel` tại màn `/dashboard/admin/mua-sam/tra-cuu`
- thêm route `GET /api/admin/mua-sam/tra-cuu/export`
- tái sử dụng logic filter/query hiện có của `tra-cuu`
- sinh file Excel `2 sheet`
- tải file trực tiếp trên trình duyệt

Không bao gồm:

- export Excel cho `/dashboard/facility/mua-sam/tra-cuu`
- export theo `trang hiện tại`
- nhiều sheet theo từng đơn vị
- tạo job nền hoặc hàng đợi xử lý export
- thay đổi dataset nền của màn `tra-cuu`

## Current State

### UI

File chính: `src/components/mua-sam/ProcurementLookupPage.tsx`

Màn hiện tại đã có:

- `appliedFilters` là nguồn sự thật của bộ lọc đang dùng để tải bảng
- request list gọi API với:
  - `searchTerm`
  - `facilityId`
  - `procurementStatus`
  - `fromDate`
  - `toDate`
  - `page`
  - `limit`

Chưa có:

- nút `Xuất Excel`
- trạng thái export
- luồng tải file

### API và query

Các file liên quan:

- `src/app/api/admin/mua-sam/tra-cuu/route.ts`
- `src/lib/mua-sam-procurement-lookup.ts`

Logic hiện tại đã có:

- parse filter từ query string
- dựng `where` theo đúng dataset `quyTrinh = 1`
- lọc theo:
  - từ khóa
  - đơn vị
  - trạng thái tiến trình
  - khoảng ngày phê duyệt `KHLCNT`
- chuẩn hóa một record `ProcurementLookupItem` để trả về cho UI

Chưa có:

- API export riêng
- helper lấy toàn bộ dữ liệu không phân trang
- mapping workbook Excel

### Excel pattern hiện có

File tham chiếu: `src/app/api/admin/reports/export/route.ts`

Codebase hiện đã có pattern:

- route server-side trả file `xlsx`
- dùng thư viện `xlsx`
- đặt `Content-Disposition` để browser tải file
- client dùng `triggerBlobDownload` và `getDownloadFileName`

Do đó, bài toán `tra-cuu export` nên bám cùng pattern này thay vì tạo cách export mới.

## Approach Options

### Option 1: Export ngay trên client từ dữ liệu bảng hiện có

UI lấy `rows` hiện tại trên trang và ghi file trực tiếp ở client.

Ưu điểm:

- ít code backend hơn
- triển khai nhanh

Nhược điểm:

- mặc định chỉ có `20` dòng của trang hiện tại
- muốn xuất toàn bộ phải tự gọi nhiều request hoặc thay đổi lớn ở client
- dễ lệch logic giữa dữ liệu đang hiển thị và dữ liệu export
- khó kiểm soát định dạng file lớn

### Option 2: API export riêng, sinh file server-side từ cùng logic lọc

Thêm route `GET /api/admin/mua-sam/tra-cuu/export`, nhận các filter hiện có, tải toàn bộ dataset khớp điều kiện rồi sinh file `xlsx` `2 sheet`.

Ưu điểm:

- đáp ứng đúng yêu cầu xuất `toàn bộ` dữ liệu
- giữ `1 nguồn sự thật` cho logic lọc
- bám pattern export hiện có của codebase
- dễ kiểm soát tên file, response header, format dữ liệu

Nhược điểm:

- cần thêm API export và mapping workbook

### Option 3: API export nhiều sheet theo từng đơn vị

Mỗi đơn vị một sheet riêng.

Ưu điểm:

- tiện khi tách file để gửi từng cơ sở

Nhược điểm:

- file nặng hơn
- số lượng sheet tăng nhanh
- không phù hợp với nhu cầu tra cứu chéo toàn hệ thống
- không cần thiết khi người dùng đã chốt mô hình `2 sheet`

## Recommendation

Chọn **Option 2**.

Lý do:

- phù hợp trực tiếp với yêu cầu xuất `toàn bộ`
- giảm rủi ro lệch dữ liệu giữa bảng và file
- dễ tái sử dụng logic query hiện có
- ít phức tạp hơn mô hình nhiều sheet theo đơn vị

## Architecture

### UI flow

Tại `src/components/mua-sam/ProcurementLookupPage.tsx`:

- chỉ role `admin` thấy nút `Xuất Excel`
- nút export sử dụng đúng `appliedFilters`
- không dùng `searchInput`, `selectedFacility`, `selectedStatus`, `fromDateInput`, `toDateInput` nếu các giá trị đó chưa được áp dụng
- khi bấm export:
  - gửi request đến `GET /api/admin/mua-sam/tra-cuu/export`
  - truyền các filter đã áp dụng
  - không truyền `page`
  - không truyền `limit`
- client nhận `blob`, đọc `Content-Disposition`, rồi tải file bằng helper download hiện có

### Server flow

Thêm file mới:

- `src/app/api/admin/mua-sam/tra-cuu/export/route.ts`

Route export:

- xác thực `ADMIN`
- parse filter bằng cùng logic parse đang dùng cho route list
- load toàn bộ `gói thầu` khớp filter
- sinh workbook `xlsx`
- trả file qua `NextResponse`

### Shared lookup helpers

Để tránh lệch logic giữa route list và route export, `src/lib/mua-sam-procurement-lookup.ts` cần trở thành nguồn dùng chung cho:

- query parsing
- xây `where`
- `include`
- `orderBy`
- serialize `ProcurementLookupItem`

Thiết kế đề xuất:

- giữ nguyên `parseProcurementLookupQuery(searchParams)`
- giữ route list dùng helper phân trang
- bổ sung helper load tất cả dữ liệu export, ví dụ:
  - `loadAllProcurementLookupItems(query)`

Helper mới này sẽ:

- dùng cùng `baseWhere`
- dùng cùng `statusWhere`
- dùng cùng `include`
- dùng cùng `orderBy`
- không `skip/take`
- serialize về cùng kiểu `ProcurementLookupItem`

Điểm chính là route export không được copy lại logic lọc bằng tay ở file khác.

## Workbook Design

Workbook gồm `2 sheet` cố định:

- `TongHopGoiThau`
- `ChiTietPhanLo`

### Sheet 1: TongHopGoiThau

Mục tiêu:

- tra cứu tổng hợp
- lọc nhanh theo gói thầu
- đối chiếu trạng thái tiến trình

Quy tắc dữ liệu:

- mỗi dòng đại diện cho `1 gói thầu`
- lấy trực tiếp từ `ProcurementLookupItem`

Các cột:

1. `STT`
2. `Đơn vị`
3. `Mã đơn vị`
4. `Mã KHLCNT`
5. `Tên KHLCNT`
6. `Số quyết định KHLCNT`
7. `Ngày phê duyệt KHLCNT`
8. `Tên gói thầu`
9. `Giá gói thầu`
10. `Hình thức LCNT`
11. `Phương thức LCNT`
12. `Loại hợp đồng`
13. `Số lượng phần lô`
14. `Trạng thái gói thầu`
15. `Mã TBMT`
16. `Ngày đăng tải TBMT`
17. `Ngày đóng thầu`
18. `Số QĐ KQLCNT`
19. `Ngày phê duyệt KQLCNT`
20. `Số mặt hàng mời thầu`
21. `Số mặt hàng trúng thầu`
22. `Tổng giá trị trúng thầu`
23. `Số nhà thầu trúng`
24. `Danh sách nhà thầu trúng`
25. `Trạng thái tiến trình`

Mapping đặc biệt:

- `Loại hợp đồng`: join từ mảng bằng `, `
- `Danh sách nhà thầu trúng`: join từ mảng bằng `; `
- các cột ngày: ghi dạng chuỗi `dd/mm/yyyy`, nếu thiếu dữ liệu thì để chuỗi rỗng
- các cột tiền/số lượng: giữ kiểu số để sort/filter/tính toán được trong Excel

### Sheet 2: ChiTietPhanLo

Mục tiêu:

- xem chi tiết từng phần lô
- vẫn nhìn ngay được phần lô thuộc đơn vị nào, gói nào

Quy tắc dữ liệu:

- mỗi dòng đại diện cho `1 phần lô`
- được flatten từ `row.phanLoResults` của từng `ProcurementLookupItem`
- nếu một gói không có `phanLoResults`, gói đó vẫn xuất ở `TongHopGoiThau` nhưng không có dòng ở `ChiTietPhanLo`

Các cột:

1. `STT`
2. `Đơn vị`
3. `Mã đơn vị`
4. `Mã KHLCNT`
5. `Tên KHLCNT`
6. `Tên gói thầu`
7. `Mã TBMT`
8. `Số QĐ KQLCNT`
9. `Trạng thái tiến trình`
10. `Tên phần lô`
11. `Kết quả phần lô`
12. `Đơn giá trúng thầu`
13. `Nhà thầu trúng thầu`

Lý do lặp lại các cột khóa ở sheet 2:

- người dùng có thể lọc trực tiếp trong Excel mà không cần quay lại sheet 1
- nhìn vào một dòng phần lô là biết ngay thuộc `đơn vị` và `gói thầu` nào
- giảm phụ thuộc vào mã nội bộ hoặc id kỹ thuật

## API Contract

### Route

`GET /api/admin/mua-sam/tra-cuu/export`

### Query params

Nhận cùng nhóm filter với route list:

- `searchTerm`
- `facilityId`
- `procurementStatus`
- `fromDate`
- `toDate`

Không nhận:

- `page`
- `limit`

Nếu client có gửi `page/limit`, route export cũng sẽ bỏ qua.

### Response success

- `200 OK`
- `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- `Content-Disposition: attachment; filename="Tra_Cuu_Mua_Sam_YYYY-MM-DD_HH-mm.xlsx"`

### Response error

- `401/403` nếu không phải `ADMIN`
- `404` nếu không có dữ liệu khớp bộ lọc để xuất
- `500` cho lỗi hệ thống

Body lỗi JSON:

```ts
{ message: string }
```

Message khi không có dữ liệu:

```ts
{ message: "Không có dữ liệu để xuất" }
```

## UI Behavior

### Button placement

Nút `Xuất Excel` nên đặt trong cùng vùng với bộ lọc hoặc đầu card danh sách, để người dùng hiểu đây là export của tập dữ liệu đang tra cứu.

### Loading behavior

Khi export:

- disable nút
- hiển thị text `Đang xuất...`
- không ảnh hưởng tới bảng đang xem

### Success behavior

Khi export thành công:

- tải file ngay
- toast báo thành công

### Error behavior

Khi export lỗi:

- UI hiển thị đúng `message` từ server nếu có
- không tải file rỗng

## Data Handling Rules

### Missing procurement stages

Nếu `TBMT` hoặc `KQLCNT` chưa có:

- các cột tương ứng trong Excel để trống
- không ghi `—` vào cell export

Lý do:

- để Excel sort/filter tự nhiên hơn
- tránh trộn giá trị hiển thị UI với dữ liệu xuất

### String array fields

- `loaiHopDong`: join bằng `, `
- `danhSachNhaThauTrung`: join bằng `; `

### Date fields

Tất cả field ngày trong file sẽ được export thành chuỗi `dd/mm/yyyy`.

Nếu không có dữ liệu ngày:

- ghi chuỗi rỗng
- không ghi `—`

Lý do:

- tránh lệch timezone khi serialize từ `ISOString`
- thống nhất cách hiển thị giữa mọi sheet
- đủ rõ cho bài toán tra cứu và đối chiếu

### Large datasets

Scope này vẫn sinh file đồng bộ trên request hiện tại.

Chưa làm trong pha này:

- background job
- email/link tải file
- progress bar nhiều bước

## Testing

1. Mở `/dashboard/admin/mua-sam/tra-cuu`, áp filter theo `đơn vị`, `trạng thái`, `từ ngày`, `đến ngày`, xuất file và xác nhận số dòng ở `TongHopGoiThau` khớp tổng record theo filter, không khớp số dòng của riêng trang hiện tại.
2. Kiểm tra `ChiTietPhanLo` có đủ các cột lặp `Đơn vị`, `Mã đơn vị`, `Mã KHLCNT`, `Tên KHLCNT`, `Tên gói thầu`, `Mã TBMT`, `Số QĐ KQLCNT` để nhìn vào là biết phần lô thuộc đâu.
3. Kiểm tra gói chưa có `TBMT` vẫn xuất đúng ở `TongHopGoiThau`, các cột `TBMT` để trống.
4. Kiểm tra gói đã có `TBMT` nhưng chưa có `KQLCNT` vẫn xuất đúng ở `TongHopGoiThau`, các cột `KQLCNT` để trống.
5. Kiểm tra gói có `KQLCNT` và `phanLoResults` thì `ChiTietPhanLo` có số dòng tương ứng với số phần lô đã serialize.
6. Kiểm tra khi không có dữ liệu, API trả lỗi rõ ràng và UI không tải file rỗng.
7. Kiểm tra role `facility` không thấy nút `Xuất Excel` và không có scope export trong pha này.

## Risks And Mitigations

### Risk: lệch logic giữa bảng và file export

Mitigation:

- tái sử dụng cùng helper query/serialize từ `mua-sam-procurement-lookup.ts`
- không copy logic lọc sang route export

### Risk: dữ liệu lớn làm file nặng

Mitigation:

- chỉ làm `2 sheet`, không tách nhiều sheet theo đơn vị
- chỉ xuất đúng các cột đã chốt

### Risk: người dùng khó hiểu sheet 2 thuộc đơn vị nào

Mitigation:

- lặp lại đầy đủ cột khóa của `đơn vị` và `gói thầu` ngay trên mỗi dòng phần lô

## Out Of Scope Follow-ups

Các hướng có thể làm sau nếu có nhu cầu:

- export Excel cho `facility tra-cuu`
- thêm sheet thống kê tóm tắt theo trạng thái tiến trình
- export nhiều sheet theo đơn vị
- background export cho dataset rất lớn
