# Facility Reports Skip Rows And Single Submit Design

## Context

Trang `/dashboard/facility/reports` hiện đang có 2 điểm không khớp với nhu cầu vận hành mới:

- người dùng muốn bỏ qua một dòng thuốc không phát sinh dữ liệu trong tháng, nhưng luồng hiện tại dựa vào việc xóa dòng khỏi file Excel
- báo cáo hiện vẫn đi theo vòng đời `PENDING -> APPROVED/REJECTED`, trong khi yêu cầu mới là cơ sở chỉ được nộp đúng 1 lần cho mỗi tháng và sau khi nộp thì chốt luôn, không còn duyệt

Ngoài ra, rule hiện tại còn bắt buộc `BHYT` hoặc `Dịch vụ` phải có ít nhất một cột được đánh dấu `X`, nhưng yêu cầu mới là được phép để trống cả hai cột.

Luồng hiện tại đang dùng `inventory_reports` như vừa là dữ liệu chi tiết theo thuốc, vừa là dấu hiệu cho biết một cơ sở đã nộp báo cáo tháng đó hay chưa. Mô hình này không đủ khi thêm trạng thái `Bỏ qua` theo dòng, vì một cơ sở có thể hợp lệ ngay cả khi bỏ qua toàn bộ các dòng trong file và kết quả là không có bản ghi thuốc nào được lưu.

## Goal

Đổi luồng facility reports theo nguyên tắc:

- mỗi cơ sở chỉ được nộp đúng 1 lần cho mỗi tháng báo cáo
- sau khi nộp thành công thì báo cáo được chốt luôn, không còn thao tác duyệt hoặc từ chối
- mỗi dòng trong file có thể được đánh dấu `Bỏ qua` thay vì buộc người dùng xóa dòng
- `BHYT` và `Dịch vụ` đều là optional độc lập
- hệ thống vẫn giữ chặt validation nhận diện dòng, token dòng, và các cột khóa

## Scope

Bao gồm:

- thay đổi file mẫu Excel của `/api/facility/reports/template`
- thay đổi local preview và server validation cho dòng `Bỏ qua`
- thay đổi API nộp báo cáo facility để khóa nộp 1 lần
- bổ sung bản ghi cấp tháng để lưu việc đã nộp báo cáo
- thay đổi màn facility reports và admin reports để bỏ luồng duyệt
- cập nhật các chỗ đang xác định `đã nộp/chưa nộp` từ `inventory_reports`

Không bao gồm:

- thay đổi luồng duyệt của facility mappings
- refactor toàn bộ schema `ReportStatus` ra khỏi hệ thống
- đổi logic nghiệp vụ của mapping `APPROVED` / `AUTO_MAPPED`
- thay đổi các module mua sắm không liên quan

## Approach Options

### Option 1: Thêm cột `Bỏ qua`, giữ luồng duyệt hiện tại

Ưu điểm:

- thay đổi nhỏ hơn ở màn admin
- không cần bỏ các API review hiện tại

Nhược điểm:

- mâu thuẫn với yêu cầu `nộp xong là chốt`
- trạng thái `REJECTED` vẫn kéo theo nhu cầu nộp lại
- tiếp tục giữ vòng đời phức tạp không còn giá trị vận hành

### Option 2: Thêm cột `Bỏ qua`, bỏ duyệt, và dùng bản ghi cấp tháng để khóa nộp

Ưu điểm:

- khớp trực tiếp với yêu cầu nghiệp vụ đã chốt
- giải quyết sạch trường hợp bỏ qua toàn bộ dòng
- không phụ thuộc thao tác xóa dòng trong Excel
- đơn giản hóa rõ rệt UX của facility và admin

Nhược điểm:

- phải thêm model dữ liệu cấp tháng
- cần cập nhật một số API/list hiện đang suy luận `đã nộp` từ `inventory_reports`

### Option 3: Suy luận `bỏ qua` từ việc để trống dữ liệu dòng

Ưu điểm:

- không cần thêm cột mới trong template

Nhược điểm:

- mơ hồ vì file có nhiều giá trị prefill từ tháng trước
- khó phân biệt giữa `không phát sinh`, `quên nhập`, và `dòng hợp lệ với giá trị 0`
- tăng rủi ro lưu sai hoặc bỏ sót dữ liệu

### Recommendation

Chọn Option 2.

Đây là phương án duy nhất đồng thời thỏa mãn cả ba yêu cầu đã chốt:

- bỏ qua dòng bằng một cờ rõ ràng
- `BHYT` và `Dịch vụ` cùng để trống được
- nộp xong là chốt, không duyệt, không nộp lại

## Chosen Design

## Business Rules

### Submission rules

- mỗi `facilityId + reportMonth` chỉ được nộp đúng 1 lần
- sau khi nộp thành công, facility không được nộp lại tháng đó
- admin không còn thao tác `duyệt` hoặc `từ chối` cho facility reports
- trạng thái hiển thị cho người dùng chỉ còn:
  - `Chưa nộp`
  - `Đã nộp`

### Row rules

- file mẫu thêm cột `Bỏ qua`
- cột `Bỏ qua` chỉ nhận `X` hoặc để trống
- nếu `Bỏ qua = X`, dòng được hiểu là `không có dữ liệu báo cáo trong tháng này`
- nếu `Bỏ qua` để trống, dòng được hiểu là `có báo cáo` và sẽ được validate/lưu như bình thường
- không còn rule `phải nhập ít nhất 01 trường nghiệp vụ của dòng`

### BHYT and Dịch vụ rules

- `BHYT` vẫn chỉ nhận `X` hoặc để trống
- `Dịch vụ` vẫn chỉ nhận `X` hoặc để trống
- được phép để trống đồng thời cả `BHYT` và `Dịch vụ`
- rule `MISSING_CATEGORY_MARK` sẽ bị loại bỏ khỏi luồng facility reports

## Data Model

### New month-level submission model

Thêm model mới, ví dụ `FacilityReportSubmission`, để đại diện cho một lần nộp báo cáo cấp tháng.

Các field đề xuất:

- `id`
- `facilityId`
- `reportMonth`
- `submittedAt`
- `reportedRowCount`
- `skippedRowCount`
- `createdAt`
- `updatedAt`

Ràng buộc:

- unique `(facilityId, reportMonth)`

Mục đích:

- khóa rule `mỗi tháng chỉ nộp 1 lần`
- ghi nhận tháng đã nộp ngay cả khi toàn bộ các dòng đều `Bỏ qua`
- làm nguồn dữ liệu chính cho lịch sử báo cáo, not-submitted list, và reminder

### InventoryReport compatibility

Trong iteration này, không refactor hoặc xóa ngay cột `status` và bảng `report_review_logs`.

Để giữ tương thích với các module hiện có đang filter `inventory_reports.status = 'APPROVED'`, tất cả các dòng `InventoryReport` mới được lưu từ facility reports sẽ được ghi với `status = APPROVED` như một marker kỹ thuật nội bộ của dữ liệu đã chốt.

Điểm quan trọng:

- đây không còn mang nghĩa nghiệp vụ `được admin duyệt`
- UI và copy không được hiển thị `Đã duyệt`
- không có thao tác review nào tạo ra trạng thái này nữa

Không tạo thêm `ReportReviewLog` mới cho facility reports sau thay đổi này.

## Template Design

File tác động chính: `src/app/api/facility/reports/template/route.ts`

### Columns

Giữ nguyên:

- `__ROW_TOKEN`
- các cột khóa nhận diện:
  - `STT`
  - `Mã nội bộ`
  - `Mã thuốc`
  - `Tên thuốc`
  - `Hoạt chất`
  - `Đơn vị tính`

Thêm mới:

- cột `Bỏ qua`

Danh sách cột cho nhập/chỉnh sửa sau thay đổi:

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
- `Bỏ qua`

### Excel validation

- `Bỏ qua` dùng data validation kiểu list, chỉ cho `X` hoặc để trống
- `BHYT` và `Dịch vụ` tiếp tục chỉ cho `X` hoặc để trống

### Instruction copy

Sheet `Hướng dẫn` cần ghi rõ:

- không cần xóa dòng nếu không có dữ liệu báo cáo
- hãy nhập `X` vào cột `Bỏ qua` để bỏ qua dòng đó
- dòng `Bỏ qua` sẽ không được lưu vào báo cáo tháng
- được phép để trống cả `BHYT` và `Dịch vụ`
- sau khi nộp thành công thì tháng đó bị khóa, không thể nộp lại

## Validation Flow

## Local preview

File tác động chính: `src/app/dashboard/facility/reports/page.tsx`

Local preview sau khi đọc Excel sẽ chia dòng thành 2 loại:

- dòng báo cáo bình thường
- dòng `Bỏ qua`

### Với dòng báo cáo bình thường

Giữ các rule hiện có:

- token có tồn tại
- token không trùng
- số hợp lệ
- số không âm
- ngày đúng định dạng `YYYYMMDD`
- `Tồn cuối = Tồn đầu + Nhập - Xuất`
- `Thành tiền tồn cuối = Tồn cuối * Giá VAT`
- `BHYT` và `Dịch vụ` nếu có nhập thì phải là `X`

Loại bỏ:

- rule bắt buộc ít nhất một trong `BHYT` hoặc `Dịch vụ` phải có `X`

### Với dòng `Bỏ qua = X`

Client chỉ kiểm tra:

- giá trị cột `Bỏ qua` hợp lệ
- token có tồn tại
- token không trùng trong file

Client không hiển thị lỗi nghiệp vụ cho các cột editable khác của dòng `Bỏ qua`, kể cả khi các cột này còn giá trị prefill hoặc để trống.

## Server validation

File tác động chính:

- `src/app/api/facility/reports/validate/route.ts`
- `src/app/api/facility/reports/route.ts`
- `src/lib/facility-report-upload.ts`
- `src/lib/report-validation.ts`

### Với dòng `Bỏ qua = X`

Server vẫn bắt buộc kiểm tra:

- `__ROW_TOKEN` tồn tại
- token giải mã hợp lệ
- token thuộc đúng facility hiện tại
- token thuộc đúng tháng báo cáo
- token resolve được `mapId`
- token và `mapId` không trùng trong cùng file
- các cột nhận diện immutable vẫn khớp canonical data

Sau khi qua lớp nhận diện, server dừng validation cho dòng đó:

- không kiểm tra số
- không kiểm tra công thức tồn
- không kiểm tra công thức thành tiền
- không kiểm tra `Tồn đầu` với `Tồn cuối` tháng trước
- không kiểm tra ngày
- không kiểm tra `BHYT` / `Dịch vụ`
- không lưu dòng này vào `inventory_reports`

### Với dòng báo cáo bình thường

Giữ toàn bộ validation hiện có, ngoại trừ:

- bỏ rule `missingCategoryMark`

### Invalid skip values

Nếu cột `Bỏ qua` có giá trị khác `X` hoặc rỗng:

- coi là lỗi validation
- reject toàn bộ file

## Persistence Behavior

Chỉ khi toàn bộ file vượt qua validation:

1. bắt đầu transaction
2. tạo một bản ghi `FacilityReportSubmission`
3. ghi các dòng không `Bỏ qua` vào `inventory_reports`
4. mọi dòng được lưu sẽ dùng `status = APPROVED` như marker kỹ thuật finalized
5. không ghi `adminNote`
6. không tạo `report_review_logs`

Nếu file có lỗi:

- không tạo `FacilityReportSubmission`
- không ghi bất kỳ dòng `inventory_reports` nào
- không log submit thành công
- không gửi notification thành công cho admin

### Duplicate submit guard

API submit sẽ chặn cứng nếu đã tồn tại `FacilityReportSubmission` cùng `(facilityId, reportMonth)`.

Thông báo lỗi nên theo nghĩa nghiệp vụ:

- `Báo cáo tháng MM/YYYY đã được nộp và đã chốt. Không thể nộp lại.`

### Zero-row submission

Nếu tất cả các dòng đều `Bỏ qua`:

- vẫn tạo `FacilityReportSubmission`
- không tạo dòng `InventoryReport`
- lịch sử vẫn hiển thị tháng đó là `Đã nộp`
- `drugCount`, `totalImport`, `totalExport` của tháng đó bằng `0`
- modal detail hiển thị trạng thái rỗng

## Facility UI Design

File tác động chính: `src/app/dashboard/facility/reports/page.tsx`

### Before submit

- người dùng vẫn chọn tháng, tải mẫu, chọn file, xem preview, và nộp
- preview cần hiển thị rõ dòng nào ở trạng thái `Bỏ qua`
- dòng `Bỏ qua` không bị tô lỗi chỉ vì để trống dữ liệu nghiệp vụ

### After submit

Khi tháng đã có `FacilityReportSubmission`:

- màn hình hiển thị trạng thái `Đã nộp`
- khóa toàn bộ thao tác upload và submit cho tháng đó
- không hiển thị trạng thái `Chờ xử lý`, `Đã duyệt`, hoặc `Bị từ chối`
- có thể giữ thao tác `Xem chi tiết` để xem dữ liệu đã nộp

Nút tải mẫu cho tháng đã nộp nên bị disable để tránh hiểu nhầm rằng tháng đó còn có thể thao tác nộp tiếp.

### History list

`Lịch sử báo cáo` phải chuyển sang lấy dữ liệu từ `FacilityReportSubmission` làm gốc.

Với mỗi tháng:

- `month` lấy từ submission header
- `drugCount` ưu tiên từ `reportedRowCount`, hoặc derive từ số dòng đã lưu
- `lastUpdated` lấy từ `submittedAt` hoặc `updatedAt` của submission header
- `status` hiển thị duy nhất là `Đã nộp`

## Admin Experience

## Admin reports list

File tác động chính:

- `src/app/api/admin/reports/route.ts`
- `src/app/dashboard/admin/reports/page.tsx`

Thay đổi:

- danh sách báo cáo admin lấy từ `FacilityReportSubmission` làm gốc
- không còn nút `Duyệt`
- không còn nút `Từ chối`
- không còn bulk approve / bulk reject
- không còn yêu cầu nhập `adminNote` cho báo cáo
- badge trạng thái đổi thành `Đã nộp`

### Detail and export

- admin vẫn xem chi tiết báo cáo như hiện tại
- admin vẫn xuất Excel như hiện tại
- nếu tháng chỉ có submission header mà không có dòng chi tiết, trang detail/export phải xử lý được trạng thái rỗng

### Delete behavior

Nếu admin xóa một báo cáo theo `facilityId + month`:

- phải xóa cả `FacilityReportSubmission`
- và xóa toàn bộ `InventoryReport` của tháng đó
- thao tác này phải chạy trong transaction
- việc xóa này đồng nghĩa với reset trạng thái tháng đó về `Chưa nộp`, nên facility có thể nộp lại sau khi admin xóa

### Review endpoints

Các endpoint review cũ của facility reports không còn hợp lệ trong luồng mới.

Hành vi mong muốn:

- `/api/admin/reports/review` không còn được gọi từ UI
- route này nên bị vô hiệu hóa rõ ràng, ví dụ trả `410 Gone` hoặc `404`
- mọi màn hoặc panel hiển thị review log của facility reports nên được ẩn khỏi UI admin

## Submission Detection And Reminders

Các chỗ đang xác định `đã nộp/chưa nộp` từ `inventory_reports` cần chuyển sang dùng `FacilityReportSubmission`, bao gồm tối thiểu:

- `/api/admin/reports`
- `/api/admin/report-periods/remind`
- mọi danh sách `notSubmitted`

Lý do:

- nếu một cơ sở bỏ qua toàn bộ dòng thì vẫn là đã nộp hợp lệ
- `inventory_reports` lúc đó có thể không có bản ghi nào

## Compatibility And Migration

## Backfill existing months

Cần có migration hoặc script backfill tạo `FacilityReportSubmission` cho dữ liệu lịch sử hiện có bằng cách group theo:

- `facilityId`
- `reportMonth`

Giá trị đề xuất:

- `submittedAt`: dùng `MIN(createdAt)` của nhóm
- `updatedAt`: dùng `MAX(updatedAt)` của nhóm
- `reportedRowCount`: dùng số dòng thực tế trong nhóm
- `skippedRowCount`: đặt `0` cho dữ liệu cũ

### Existing statuses

Các bản ghi cũ có `PENDING`, `APPROVED`, hoặc `REJECTED` sẽ được hiển thị thống nhất là `Đã nộp` trong UI mới nếu tháng đó đã có submission header.

Không còn tạo mới:

- `REPORT_APPROVED`
- `REPORT_REJECTED`
- `ReportReviewLog`

Vẫn tiếp tục tạo:

- `REPORT_SUBMITTED`

### Legacy schema

Không bắt buộc xóa ngay:

- enum `ReportStatus`
- cột `inventory_reports.status`
- cột `inventory_reports.admin_note`
- bảng `report_review_logs`

Chúng được xem là legacy compatibility trong iteration này.

## Downstream Consumers

Một số consumer hiện đang dựa vào `inventory_reports.status = 'APPROVED'`, ví dụ inventory snapshot.

Thiết kế này giữ các consumer đó hoạt động bằng cách:

- tiếp tục ghi `InventoryReport.status = APPROVED` cho mọi dòng đã nộp thành công

Điều này tránh mở rộng phạm vi sang refactor toàn bộ analytics/query trong cùng một thay đổi.

## Testing

## Manual testing

1. Tải mẫu mới, xác nhận có cột `Bỏ qua`.
2. Để `BHYT` và `Dịch vụ` cùng trống trên một dòng báo cáo bình thường, xác nhận file vẫn hợp lệ nếu các rule khác đúng.
3. Đánh dấu `Bỏ qua = X` trên một dòng, để trống hoặc giữ nguyên các cột editable khác, xác nhận dòng không báo lỗi nghiệp vụ và không được lưu.
4. Đánh dấu `Bỏ qua = X` nhưng sửa sai `Tên thuốc` hoặc `Mã nội bộ`, xác nhận file bị reject.
5. Đánh dấu `Bỏ qua = X` cho toàn bộ file, xác nhận nộp thành công, tháng hiển thị `Đã nộp`, detail rỗng.
6. Nộp thành công một tháng rồi thử nộp lại đúng tháng đó, xác nhận bị chặn.
7. Vào màn admin reports, xác nhận không còn nút duyệt/từ chối và báo cáo hiển thị `Đã nộp`.
8. Gửi reminder cho một tháng đã có zero-row submission, xác nhận cơ sở đó không còn bị xem là `chưa nộp`.
9. Kiểm tra inventory search hoặc consumer đang dùng `status = APPROVED`, xác nhận dữ liệu mới vẫn xuất hiện bình thường.

## Success Criteria

- người dùng không cần xóa dòng Excel để bỏ qua thuốc không phát sinh
- `BHYT` và `Dịch vụ` được phép cùng để trống
- cơ sở chỉ nộp đúng 1 lần cho mỗi tháng
- không còn luồng duyệt/từ chối cho facility reports
- hệ thống vẫn ghi nhận được tháng đã nộp ngay cả khi không có dòng thuốc nào được lưu
