# Admin Master Drugs Therapeutic Group Design

## Context

Trang `/dashboard/admin/master-drugs` hiện quản lý danh mục dùng chung của Sở Y tế. Dữ liệu `MasterDrug` đã có trường `Nhóm thuốc`, nhưng chưa có trường riêng cho `Nhóm điều trị`.

Người dùng cần bổ sung một trường mới độc lập với `Nhóm thuốc`, xuất hiện xuyên suốt trong:

- form thêm và sửa thuốc
- bảng danh sách thuốc
- import Excel
- export Excel

## Goal

Thêm trường mới `Nhóm điều trị` để:

- lưu độc lập trên từng bản ghi `MasterDrug`
- cho phép admin nhập và cập nhật trong form
- hiển thị trực tiếp trong bảng danh sách `/dashboard/admin/master-drugs`
- nhận dữ liệu từ file Excel import
- xuất ra file mẫu và file Excel export

## Scope

Bao gồm:

- mở rộng model `MasterDrug` với trường mới nullable
- cập nhật admin page `/dashboard/admin/master-drugs`
- cập nhật API create, update, list import, export
- cập nhật file mẫu Excel và mapping import/export

Không bao gồm:

- thay đổi logic ánh xạ ở facility
- thêm bộ lọc tìm kiếm riêng theo `Nhóm điều trị`
- backfill dữ liệu cũ
- thay đổi ý nghĩa hoặc nhãn của trường `Nhóm thuốc`

## Approach Options

### Option 1: Thêm trường DB riêng `nhomDieuTri`

Thêm `nhomDieuTri String?` vào `MasterDrug` và đi xuyên suốt qua schema, API, UI, import/export.

Ưu điểm:

- đúng yêu cầu trường riêng
- dữ liệu rõ ràng, dễ bảo trì
- tương thích tốt với import/export và các luồng đọc dữ liệu sau này

Nhược điểm:

- cần cập nhật schema và Prisma client

### Option 2: Chỉ thêm ở tầng UI hoặc payload tạm

Ưu điểm:

- sửa nhanh ngắn hạn

Nhược điểm:

- lệch với schema thật
- dễ lỗi khi import/export hoặc khi code khác đọc `MasterDrug`

### Option 3: Dùng lại `Nhóm thuốc`

Ưu điểm:

- ít thay đổi

Nhược điểm:

- không đáp ứng yêu cầu vì không phải trường riêng

### Recommendation

Chọn Option 1. Đây là cách đúng với yêu cầu nghiệp vụ và phù hợp nhất với cấu trúc hiện tại.

## Data Model

File tác động chính: `prisma/schema.prisma`

Thêm trường mới vào model `MasterDrug`:

```prisma
nhomDieuTri String? @map("nhom_dieu_tri")
```

Quy ước:

- kiểu `String?`
- cho phép `null` để không làm hỏng dữ liệu cũ
- tách biệt hoàn toàn với `nhomThuoc`

Sau khi cập nhật schema, Prisma client cần được regenerate để TypeScript và runtime nhận trường mới.

## API Design

Files tác động:

- `src/app/api/admin/master-drugs/route.ts`
- `src/app/api/admin/master-drugs/[id]/route.ts`
- `src/app/api/admin/master-drugs/import/route.ts`
- `src/app/api/admin/master-drugs/export-mapped/route.ts`

### List API

`GET /api/admin/master-drugs` tiếp tục trả về bản ghi `MasterDrug` mặc định từ Prisma. Sau khi schema được cập nhật, response tự động có thêm `nhomDieuTri`.

Không thêm tìm kiếm riêng cho field này trong thay đổi hiện tại.

### Create API

`POST /api/admin/master-drugs` nhận thêm `body.nhomDieuTri` và lưu:

- chuỗi có giá trị thì lưu string
- rỗng thì lưu `null`

### Update API

`PATCH /api/admin/master-drugs/[id]` tiếp tục dùng `data: body`, nên chỉ cần đảm bảo UI gửi đúng key `nhomDieuTri`.

Với dữ liệu rỗng từ form, UI sẽ gửi chuỗi rỗng giống các field string khác hiện có. Hệ thống hiện đã chấp nhận cách này cho update của các field tùy chọn và thay đổi này sẽ giữ nguyên hành vi đang có để tránh mở rộng phạm vi.

### Import API

`POST /api/admin/master-drugs/import` nhận thêm field `nhomDieuTri` trong từng item và lưu nullable.

### Export API

`GET /api/admin/master-drugs/export-mapped` thêm cột tiếng Việt:

- `Nhóm điều trị`

## UI Design

File tác động chính: `src/app/dashboard/admin/master-drugs/page.tsx`

### Type and form state

Thêm `nhomDieuTri` vào:

- interface `MasterDrug`
- `formData`
- dữ liệu reset form
- dữ liệu nạp khi edit

### Form layout

Thêm ô nhập `Nhóm điều trị` trong nhóm `Phân loại thuốc`, đặt gần `Nhóm thuốc` để người dùng dễ phân biệt.

Hành vi:

- không bắt buộc
- nhập text tự do
- submit cùng form hiện tại

### List table

Thêm một cột `Nhóm điều trị` vào bảng danh sách thuốc.

Nguyên tắc hiển thị:

- nếu có dữ liệu thì hiển thị text
- nếu không có thì hiển thị `-`

Không mở rộng menu `Hiển thị` xuống dòng cho cột mới trong thay đổi này vì cột đó hiện chỉ quản lý một nhóm cột chính; thay đổi này ưu tiên tối thiểu hóa tác động UI.

### Edit flow

Khi bấm sửa:

- dữ liệu `nhomDieuTri` của bản ghi được đổ vào form
- khi lưu thành công hoặc reset form, field này trở về trạng thái mặc định như các field khác

## Excel Design

### Import mapping

Thêm mapping header:

- `Nhóm điều trị`
- `nhomDieuTri`

Nếu file có cột `Nhóm điều trị`, giá trị sẽ được đưa vào payload import.

### Template export

File mẫu tải xuống từ `/dashboard/admin/master-drugs` thêm cột:

- `Nhóm điều trị`

Mục tiêu là để người dùng có thể chuẩn bị dữ liệu import đúng định dạng ngay từ file mẫu.

### Mapped export

File export danh mục dùng chung đã ánh xạ thành công thêm cột:

- `Nhóm điều trị`

Tên cột dùng đúng tiếng Việt để thống nhất với template import.

## Error Handling

- dữ liệu cũ không có `nhomDieuTri` vẫn hoạt động bình thường vì field nullable
- import không có cột `Nhóm điều trị` vẫn hợp lệ, field này sẽ để trống
- nếu form để trống `Nhóm điều trị`, bản ghi vẫn được lưu bình thường

## Testing Plan

Kiểm tra thủ công:

1. Thêm mới một thuốc có `Nhóm điều trị`, xác nhận lưu thành công và hiển thị đúng trên bảng.
2. Sửa một thuốc hiện có, cập nhật `Nhóm điều trị`, xác nhận dữ liệu mới hiển thị đúng.
3. Import Excel có cột `Nhóm điều trị`, xác nhận dữ liệu được lưu đúng.
4. Tải file mẫu, xác nhận xuất hiện cột `Nhóm điều trị`.
5. Xuất Excel mapped, xác nhận có cột `Nhóm điều trị`.
6. Kiểm tra một bản ghi cũ không có dữ liệu trường mới, xác nhận bảng và form vẫn hoạt động bình thường.
