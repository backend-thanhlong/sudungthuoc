# Facility Reports Previous-Month Reference Fields Design

## Context

Trang `/dashboard/facility/reports` hiện cho phép cơ sở tải file mẫu, xem trước dữ liệu và nộp báo cáo tháng.

Sáu cột nghiệp vụ sau đang được prefill từ báo cáo tháng trước nếu cùng `mapId` đã có dữ liệu:

- `Số QĐ trúng thầu`
- `Tên Công ty`
- `Ngày bắt đầu HĐ`
- `Ngày kết thúc HĐ`
- `BHYT`
- `Dịch vụ`

Luồng hiện tại chỉ dùng dữ liệu tháng trước để:

- prefill file mẫu
- kiểm tra `Tồn đầu` với `Tồn cuối` tháng trước

Hệ thống chưa kiểm tra xem sáu cột trên có bị sửa khác với kỳ báo cáo trước hay không. Kết quả là người dùng có thể thay đổi các giá trị tham chiếu này ở kỳ sau mà vẫn nộp thành công, làm dữ liệu hợp đồng/phân loại của cùng một thuốc thay đổi qua các tháng mà không có kiểm soát nghiệp vụ.

## Goal

Thêm rule validation cứng cho sáu cột tham chiếu ở facility reports theo nguyên tắc:

- nếu tháng trước chưa có dữ liệu cho cột đó thì người dùng được nhập mới
- nếu tháng trước đã có dữ liệu cho cột đó thì giá trị kỳ hiện tại phải giữ nguyên
- nếu người dùng nộp giá trị khác với tháng trước thì toàn bộ file bị từ chối

Rule này phải áp dụng nhất quán cho cả:

- `POST /api/facility/reports/validate`
- `POST /api/facility/reports`

## Non-Goal

Không thay đổi trong đợt này:

- cấu trúc file mẫu Excel
- trạng thái khóa/mở khóa của các ô trong Excel
- dữ liệu chi tiết hiển thị ở admin/facility reports
- rule `Bỏ qua`
- cách xác định nguồn so sánh khác ngoài báo cáo tháng liền trước

## Approaches

### Option 1: Chỉ cảnh báo ở client preview

Ưu điểm:

- ít thay đổi code
- người dùng thấy lỗi sớm trong UI

Nhược điểm:

- không chặn được submit trực tiếp qua API
- rule nghiệp vụ không nằm ở server
- dễ lệch giữa preview client và submit thật

### Option 2: Validation server ở bước submit thật, không đưa vào endpoint validate

Ưu điểm:

- chặn được dữ liệu sai khi lưu DB
- thay đổi server nhỏ hơn

Nhược điểm:

- trải nghiệm kém hơn vì người dùng chỉ biết lỗi ở bước nộp cuối
- endpoint `/validate` không còn phản ánh đúng kết quả submit

### Option 3: Validation server dùng chung cho `/validate` và `/reports`

Ưu điểm:

- chặn cứng ở server
- preview và submit dùng cùng một nguồn sự thật
- phù hợp với kiến trúc validation hiện tại của facility reports

Nhược điểm:

- cần mở rộng contract validation hiện có
- cần bổ sung logic compare theo từng field

## Recommendation

Chọn Option 3.

Facility reports đã có sẵn luồng validation server dùng chung giữa preview và submit. Rule mới là rule nghiệp vụ dữ liệu, nên cần nằm trong cùng pipeline đó để bảo đảm không thể bypass.

## Chosen Design

### Previous-month comparison scope

Nguồn dữ liệu so sánh tiếp tục là báo cáo của tháng liền trước cho cùng:

- `facilityId`
- `mapId`

Không scan lùi nhiều tháng để tìm "lần đầu tiên từng có dữ liệu". Thiết kế này bám sát context đang có sẵn trong `loadFacilityReportCanonicalContext` và giữ thay đổi ở mức nhỏ, rõ ràng, nhất quán với rule `Tồn đầu = Tồn cuối tháng trước`.

### Fields under protection

Sáu field được kiểm tra là:

- `soQdTrungThau`
- `tenCongTy`
- `ngayBatDauHd`
- `ngayKetThucHd`
- `bhyt`
- `dichVu`

Rule áp dụng theo từng field độc lập, không theo nhóm tất cả hoặc không có gì.

Ví dụ:

- tháng trước `Số QĐ trúng thầu` đã có dữ liệu, tháng này khác giá trị thì lỗi
- tháng trước `Tên Công ty` trống, tháng này được phép nhập
- tháng trước `BHYT = X`, tháng này bỏ trống thì lỗi

### Normalization rules

Trước khi so sánh, hệ thống chuẩn hóa dữ liệu theo đúng kiểu field:

- `Số QĐ trúng thầu`, `Tên Công ty`: dùng normalize text hiện có, bỏ khoảng trắng đầu/cuối và co cụm khoảng trắng giữa chuỗi
- `Ngày bắt đầu HĐ`, `Ngày kết thúc HĐ`: dùng giá trị đã parse/validate, so sánh trên chuỗi `YYYYMMDD`
- `BHYT`, `Dịch vụ`: chuẩn hóa về `"X"` hoặc `null`

Ý nghĩa:

- khác biệt do nhập thừa khoảng trắng không tạo lỗi giả
- khác biệt thật về giá trị vẫn bị phát hiện

### Comparison behavior

Với mỗi dòng hợp lệ, không `Bỏ qua`, hệ thống lấy canonical row từ tháng trước và áp dụng:

1. nếu field tháng trước đang rỗng, bỏ qua so sánh field đó
2. nếu field tháng trước có giá trị, field tháng hiện tại phải bằng đúng giá trị đã chuẩn hóa
3. nếu khác, thêm validation error cho đúng dòng và đúng cột
4. nếu có ít nhất một lỗi trong file, toàn bộ file bị từ chối như các rule validation khác

Rule này chạy sau khi:

- verify token
- đối chiếu các cột bất biến
- parse và validate kiểu dữ liệu cơ bản

Nhờ đó:

- lỗi format ngày vẫn được báo là lỗi format trước
- chỉ so sánh giá trị tham chiếu khi field hiện tại đã hợp lệ về mặt kiểu dữ liệu

### Error model

Thêm validation code mới cho loại lỗi lệch dữ liệu tham chiếu tháng trước.

Mỗi lỗi trả về:

- `rowNumber`
- `field`
- `code`
- `message`

Message nên rõ ràng theo field, ví dụ:

- `Dòng 12: Số QĐ trúng thầu không khớp với báo cáo tháng trước.`
- `Dòng 12: BHYT không khớp với báo cáo tháng trước.`

Không cần trả expected/actual trong response giai đoạn đầu. Mục tiêu là chặn chỉnh sửa và chỉ rõ dòng/cột sai.

### Impacted code paths

File tác động chính:

- `src/lib/facility-report-upload.ts`
- `src/lib/report-validation.ts`
- `src/app/api/facility/reports/validate/route.ts`
- `src/app/api/facility/reports/route.ts`

Thiết kế chi tiết:

- mở rộng `CanonicalFacilityReportRow` để lưu rõ six-field snapshot của tháng trước như hiện có
- thêm helper compare các field tham chiếu với dữ liệu tháng trước
- tích hợp helper này vào `validateFacilityReportRows`
- giữ nguyên contract success hiện tại
- khi fail, endpoint validate và submit cùng trả lỗi theo `buildFacilityReportValidationResponse`

`template/route.ts` không bắt buộc đổi logic vì prefill hiện tại vẫn hợp lệ với rule mới.

### UX and template behavior

Không khóa thêm ô trong Excel ở đợt này.

Lý do:

- rule người dùng vừa chốt là "nếu khác tháng trước thì báo lỗi"
- validation server đã đủ đảm bảo dữ liệu
- khóa ô động theo từng row/field sẽ làm thay đổi UX của template nhiều hơn cần thiết

Người dùng vẫn có thể sửa trong file Excel, nhưng nếu sửa khác dữ liệu tháng trước ở các field đã có giá trị thì preview server và submit thật đều bị chặn.

### Edge cases

#### Không có báo cáo tháng trước

Nếu cùng `mapId` không có dòng ở tháng trước, không phát sinh so sánh sáu field này.

#### Tháng trước có dòng nhưng field đang trống

Field hiện tại được phép nhập.

#### Dòng bị đánh dấu `Bỏ qua`

Dòng `Bỏ qua` tiếp tục thoát sớm khỏi các validation nghiệp vụ sau bước validate skip value, nên không cần so sánh sáu field tham chiếu.

#### Field hiện tại sai format

Ví dụ ngày không đúng `YYYYMMDD`, hệ thống trả lỗi format hiện có và không thêm lỗi "không khớp tháng trước" cho cùng field để tránh báo lỗi chồng lấn không cần thiết.

## Testing

### Manual testing

1. Tạo dữ liệu tháng trước có đủ sáu field.
2. Tải mẫu tháng hiện tại, giữ nguyên dữ liệu, validate và submit phải thành công.
3. Sửa `Số QĐ trúng thầu`, validate phải fail.
4. Sửa `Tên Công ty`, validate phải fail.
5. Sửa `Ngày bắt đầu HĐ` hoặc `Ngày kết thúc HĐ`, validate phải fail.
6. Đổi `BHYT` hoặc `Dịch vụ` từ `X` sang trống hoặc ngược lại, validate phải fail.
7. Trường hợp tháng trước field trống, tháng này nhập mới, validate phải pass nếu các rule khác hợp lệ.
8. Trường hợp đánh dấu `Bỏ qua`, không phát sinh lỗi compare six-field.

### Regression testing

Xác nhận các rule cũ vẫn giữ nguyên:

- token validation
- immutable field mismatch
- `Tồn đầu` so với `Tồn cuối` tháng trước
- công thức `Tồn cuối`
- công thức `Thành tiền tồn cuối`
- rule `BHYT/Dịch vụ`

## Risks

- Nếu nghiệp vụ thật sự muốn khóa theo "giá trị đầu tiên từng được báo" thay vì "giá trị của tháng liền trước", thiết kế này chưa bao phủ.
- Dữ liệu lịch sử cũ nếu đã bị nhập sai ở tháng trước sẽ trở thành mốc so sánh cho tháng hiện tại.

Hai điểm này chấp nhận được trong phạm vi yêu cầu hiện tại vì người dùng đã chốt rõ rule là đối chiếu với lần báo cáo trước.
