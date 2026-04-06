# Facility Reports Template Layout Formatting Design

## Context

File mẫu báo cáo tải từ `/api/facility/reports/template` hiện đã:

- khóa các cột chỉ đọc ở sheet `BaoCao`
- cho nhập ở các cột nghiệp vụ
- bật filter ở hàng tiêu đề
- ẩn cột `__ROW_TOKEN`

Tuy nhiên sheet `BaoCao` đang được protect với:

- `formatColumns: false`
- `formatRows: false`

Kết quả là người dùng không thể:

- kéo giãn hoặc thu hẹp cột
- chỉnh chiều cao hàng

Điều này không ảnh hưởng đến tính đúng dữ liệu, nhưng làm giảm khả năng đọc file khi tên thuốc, hoạt chất, hoặc ghi chú dài.

## Goal

Cho phép người dùng điều chỉnh layout của sheet `BaoCao` để dễ đọc dữ liệu hơn, cụ thể:

- được kéo giãn hoặc thu hẹp cột
- được chỉnh chiều cao hàng

Đồng thời vẫn giữ nguyên guardrail khóa dữ liệu hiện có.

## Non-Goal

Không thay đổi:

- danh sách cột bị khóa
- danh sách cột được nhập
- token validation
- immutable field validation
- upload contract
- quyền thao tác ở sheet `Hướng dẫn`
- các quyền mạnh hơn như sửa format cell, sort, insert/delete cột

## Approach Options

### Option 1: Giữ protect sheet, chỉ mở quyền format cột và hàng

Ưu điểm:

- đúng nhu cầu thực tế
- thay đổi nhỏ, ít rủi ro
- vẫn giữ khóa ô và filter

Nhược điểm:

- người dùng vẫn không làm được các thao tác format khác ngoài cột và hàng

### Option 2: Mở thêm quyền format cell

Ưu điểm:

- linh hoạt hơn cho người dùng

Nhược điểm:

- vượt quá nhu cầu hiện tại
- tăng khả năng làm file khó đọc hoặc gây hiểu nhầm về vùng dữ liệu cần nhập

### Option 3: Bỏ protect sheet `BaoCao`

Ưu điểm:

- người dùng thao tác tự do

Nhược điểm:

- mất lớp guardrail UX cho các cột chỉ đọc
- dễ sửa nhầm dữ liệu nhận diện
- đi ngược mục tiêu của thay đổi khóa cột đã triển khai

## Recommendation

Chọn Option 1.

Đây là thay đổi nhỏ nhất nhưng giải quyết đúng vấn đề. Người dùng có thêm quyền chỉnh layout để đọc file thuận tiện hơn, trong khi sheet vẫn tiếp tục bảo vệ các cột khóa và giữ nguyên hành vi upload hiện tại.

## Chosen Design

### Scope

Chỉ thay đổi quyền thao tác của sheet `BaoCao`.

Sheet `Hướng dẫn` không đổi quyền thao tác; chỉ có thể cập nhật câu mô tả để giải thích rõ hành vi mới của `BaoCao`.

### Protection model

Tiếp tục giữ:

- `selectLockedCells: true`
- `selectUnlockedCells: true`
- `autoFilter: true`
- `deleteRows: true`

Tiếp tục không mở:

- `formatCells`
- `sort`
- `insertColumns`
- `insertRows`
- `deleteColumns`

Thay đổi duy nhất trong sheet protection:

- đổi `formatColumns` từ `false` sang `true`
- đổi `formatRows` từ `false` sang `true`

### Data integrity model

Việc mở quyền format cột và hàng không được làm thay đổi mô hình bảo vệ dữ liệu:

- ô locked vẫn không sửa được
- ô unlocked vẫn nhập được
- `__ROW_TOKEN` vẫn hidden và locked
- nếu người dùng phá khóa rồi sửa cột immutable, upload vẫn bị từ chối bởi validation hiện có

### UX copy

Sheet `Hướng dẫn` nên bổ sung hoặc cập nhật câu mô tả rõ:

- “Trong sheet BaoCao, được phép kéo giãn cột và chỉnh chiều cao hàng để dễ đọc dữ liệu.”

Mục tiêu là tránh việc người dùng hiểu nhầm rằng file đang bị lỗi hoặc bị khóa quá mức.

## Error Handling

Không bổ sung error mới.

Nếu dữ liệu bị sửa sai sau khi unprotect hoặc chỉnh bằng công cụ khác, hệ thống tiếp tục dùng các lỗi upload hiện có như:

- `immutableFieldMismatch`
- `invalidRowToken`
- `missingRowToken`

## Testing

### Manual testing

1. Tải file mẫu mới từ trang facility reports.
2. Mở sheet `BaoCao` trong Excel.
3. Thử kéo giãn hoặc thu hẹp một cột, xác nhận thao tác thành công.
4. Thử chỉnh chiều cao một hàng, xác nhận thao tác thành công.
5. Thử sửa một ô thuộc cột khóa như `Mã thuốc` hoặc `Tên thuốc`, xác nhận không sửa được.
6. Thử nhập vào cột nghiệp vụ như `Nhập trong kỳ`, xác nhận sửa được.
7. Thử dùng filter ở hàng tiêu đề, xác nhận vẫn hoạt động.
8. Xác nhận `__ROW_TOKEN` vẫn hidden.
9. Upload file hợp lệ, xác nhận nộp thành công.
10. Unprotect sheet, sửa cột immutable rồi upload lại, xác nhận bị từ chối.

### Compatibility testing

Ưu tiên kiểm tra trên công cụ người dùng thực tế:

- Microsoft Excel Desktop
- Excel Web, WPS, hoặc LibreOffice nếu đây là client phổ biến

Nếu có chênh lệch hành vi giữa các phần mềm, server validation vẫn là lớp bảo vệ cuối cùng.

## Implementation Notes

File tác động chính:

- `src/app/api/facility/reports/template/route.ts`

Thay đổi code mong muốn:

- giữ nguyên cell-level locking
- giữ nguyên hidden token column
- chỉ sửa options của `worksheet.protect(...)` cho sheet `BaoCao`
- cập nhật text hướng dẫn nếu cần

## Success Criteria

- người dùng kéo giãn hoặc thu hẹp cột được trong sheet `BaoCao`
- người dùng chỉnh chiều cao hàng được trong sheet `BaoCao`
- các cột khóa vẫn không sửa được
- các cột nhập liệu vẫn sửa được
- filter vẫn hoạt động
- upload validation hiện tại không cần đổi nhưng vẫn chặn dữ liệu sai như trước
