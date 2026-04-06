# Facility Reports Template Locked Columns Design

## Context

Trang `/dashboard/facility/reports` hiện đã có lớp bảo vệ chính ở server:

- file mẫu sinh `__ROW_TOKEN` cho từng dòng
- upload validate lại token, đối chiếu các cột bất biến và reject toàn bộ file nếu sai

Điểm còn thiếu là UX trong file Excel. Người dùng vẫn có thể vô tình sửa các cột nhận diện rồi chỉ phát hiện lỗi sau khi upload.

Các cột cần ngăn sửa trực tiếp trong file mẫu:

- `STT`
- `Mã nội bộ`
- `Mã thuốc`  
  Ghi chú: phía nghiệp vụ có thể gọi là `Mã dược`, nhưng cột hiện tại trong file đang là `Mã thuốc`
- `Tên thuốc`
- `Hoạt chất`
- `Đơn vị tính`

## Goal

Giảm lỗi thao tác trong file Excel bằng cách khóa các cột chỉ để đối chiếu, đồng thời giữ nguyên lớp kiểm tra cứng ở server.

Kết quả mong muốn:

- người dùng chỉ nhập được vào các cột nghiệp vụ
- các cột nhận diện và cột token bị khóa
- nếu người dùng vẫn phá khóa hoặc chỉnh sửa file bằng công cụ khác, server vẫn từ chối khi upload

## Non-Goal

Không thay đổi:

- contract upload validation hiện tại
- business rules báo cáo
- cách admin duyệt báo cáo
- cấu trúc token hoặc logic all-or-nothing đã triển khai

## Approach Options

### Option 1: Chỉ giữ validation server, không khóa file Excel

Ưu điểm:

- không cần đổi thư viện sinh file
- ít thay đổi code nhất

Nhược điểm:

- người dùng vẫn sửa nhầm được rồi mới biết khi upload
- trải nghiệm kém, nhất là với file nhiều dòng

### Option 2: Dùng `xlsx` hiện tại để cố gắng protect sheet

Ưu điểm:

- không thêm dependency mới

Nhược điểm:

- thư viện hiện tại (`xlsx 0.18.5`) có `sheet protection`, nhưng hỗ trợ ghi style/cell unlock không sạch cho bài toán khóa chọn lọc từng cột
- dễ rơi vào trạng thái khóa toàn sheet hoặc behavior không ổn định giữa các trình mở file
- khó bảo trì

### Option 3: Chuyển riêng luồng sinh template sang `ExcelJS`

Ưu điểm:

- hỗ trợ rõ ràng cho cell-level protection và sheet protection
- khóa chính xác các cột chỉ đọc, mở đúng các cột nhập liệu
- dễ đọc, dễ bảo trì hơn cho bài toán Excel có cấu trúc

Nhược điểm:

- thêm một dependency mới
- cần viết lại riêng route sinh template

## Recommendation

Chọn Option 3.

Đây là phương án tối ưu nhất cho bài toán hiện tại. Lớp bảo vệ dữ liệu tiếp tục nằm ở server, còn Excel protection chỉ làm nhiệm vụ chống sửa nhầm ở phía người dùng. `ExcelJS` phù hợp hơn `xlsx` cho việc khóa chọn lọc từng cột.

## Chosen Design

### Template generation

File tác động chính:

- `src/app/api/facility/reports/template/route.ts`

Thiết kế mới:

- tiếp tục dùng `loadFacilityReportCanonicalContext` và `buildFacilityReportTemplateRows` để lấy dữ liệu nguồn
- thay phần ghi workbook từ `xlsx` sang `ExcelJS`
- giữ nguyên 2 sheet:
  - `BaoCao`
  - `Hướng dẫn`

### Column protection model

Trong sheet `BaoCao`:

- khóa các cột:
  - `STT`
  - `Mã nội bộ`
  - `Mã thuốc`
  - `Tên thuốc`
  - `Hoạt chất`
  - `Đơn vị tính`
  - `__ROW_TOKEN`
- mở khóa các cột người dùng được phép nhập:
  - `Tồn đầu`
  - `Nhập trong kỳ`
  - `Xuất trong kỳ`
  - `Tồn cuối`
  - `Giá VAT`
  - `Thành tiền tồn cuối`
  - `Số QĐ trúng thầu`
  - `Tên Công ty`
  - `Ngày bắt đầu HĐ`
  - `Ngày kết thúc HĐ`
  - `BHYT`
  - `Dịch vụ`
  - `Ghi chú`

`STT` là cột trình bày, không phải dữ liệu nghiệp vụ để upload, nhưng vẫn nên khóa để tránh người dùng hiểu nhầm rằng có thể sắp xếp hay sửa số thứ tự.

### Sheet protection

Sheet `BaoCao` sẽ được protect sau khi gán trạng thái locked/unlocked cho từng ô.

Nguyên tắc:

- chỉ cho chọn các ô được phép nhập
- không cho format cell, insert/delete row, sort, filter nếu không cần thiết
- cột `__ROW_TOKEN` tiếp tục hidden và locked

Password protect sheet chỉ là lớp UX, không phải lớp bảo mật. Không dùng lại `REPORT_UPLOAD_SIGNING_SECRET` cho mục đích này.

### Visual cues

Để tránh người dùng nghĩ file bị lỗi:

- các cột khóa dùng nền xám nhạt hoặc xanh nhạt để thể hiện chỉ đọc
- các cột nhập liệu giữ nền trắng hoặc vàng nhạt
- hàng tiêu đề nên nhấn mạnh nhóm “chỉ đọc” và “được nhập”
- sheet `Hướng dẫn` bổ sung câu rõ ràng:
  - “Các cột STT, Mã nội bộ, Mã thuốc, Tên thuốc, Hoạt chất, Đơn vị tính đã bị khóa. Không cần và không được chỉnh sửa.”

### Data integrity model

Thiết kế này không thay thế validation hiện tại.

Lớp bảo vệ cuối cùng vẫn là:

- token validation
- immutable field comparison
- numeric and formula validation
- transaction all-or-nothing

Nếu người dùng:

- copy dữ liệu sang file khác
- dùng phần mềm không tôn trọng protection
- cố tình unprotect sheet

thì upload vẫn bị chặn như hiện tại nếu làm sai dữ liệu.

## Error Handling

Không bổ sung lỗi server mới chỉ vì sheet bị protect hay unprotect.

Nếu file bị chỉnh sai sau khi phá khóa, hệ thống tiếp tục dùng các lỗi hiện có:

- `immutableFieldMismatch`
- `invalidRowToken`
- `missingRowToken`
- các lỗi số liệu/công thức hiện có

Điều này giữ cho upload contract không đổi.

## Testing

### Manual testing

1. Tải mẫu mới và mở bằng Excel.
2. Xác nhận không sửa được các cột khóa.
3. Xác nhận sửa được các cột nhập liệu.
4. Xác nhận cột `__ROW_TOKEN` vẫn hidden.
5. Upload file hợp lệ và nộp thành công.
6. Cố tình unprotect rồi sửa `Tên thuốc` hoặc `Mã thuốc`, upload phải bị từ chối.
7. Xóa hẳn một dòng rồi upload, hệ thống vẫn chấp nhận nếu các dòng còn lại hợp lệ.

### Compatibility testing

Ưu tiên kiểm tra trên công cụ người dùng thực tế sử dụng:

- Microsoft Excel Desktop
- Excel web hoặc WPS/LibreOffice nếu đây là client phổ biến của đơn vị

Nếu có chênh lệch behavior giữa các công cụ đọc file, server validation vẫn là lớp bảo vệ cuối cùng nên rủi ro dữ liệu sai được giữ thấp.

## Implementation Notes

- thêm dependency `exceljs`
- chỉ chuyển route sinh template sang `ExcelJS`
- không cần đổi route `validate` hoặc route upload
- nếu cần giữ data validation cho `BHYT` và `Dịch vụ`, triển khai lại bằng API của `ExcelJS`

## Success Criteria

- người dùng không thể sửa nhầm các cột nhận diện ngay trong file mẫu thông thường
- các cột nhập liệu vẫn thao tác bình thường
- upload validation hiện tại tiếp tục hoạt động nguyên vẹn
- không phát sinh đường đi nào cho phép lưu dữ liệu sai chỉ vì thay đổi thư viện sinh file
