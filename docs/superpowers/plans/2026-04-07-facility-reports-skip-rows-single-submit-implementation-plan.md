# Facility Reports Skip Rows And Single Submit Implementation Plan

## Inputs

Plan này dựa trên:

- Spec đã chốt: [2026-04-07-facility-reports-skip-rows-single-submit-design.md](/opt/sudungthuoc/sudungthuoc/docs/superpowers/specs/2026-04-07-facility-reports-skip-rows-single-submit-design.md)
- Facility reports UI hiện tại: [page.tsx](/opt/sudungthuoc/sudungthuoc/src/app/dashboard/facility/reports/page.tsx)
- Upload route hiện tại: [route.ts](/opt/sudungthuoc/sudungthuoc/src/app/api/facility/reports/route.ts)
- Validate route hiện tại: [route.ts](/opt/sudungthuoc/sudungthuoc/src/app/api/facility/reports/validate/route.ts)
- Template route hiện tại: [route.ts](/opt/sudungthuoc/sudungthuoc/src/app/api/facility/reports/template/route.ts)
- Upload/validation helpers hiện tại:
  [facility-report-upload.ts](/opt/sudungthuoc/sudungthuoc/src/lib/facility-report-upload.ts)
  và [report-validation.ts](/opt/sudungthuoc/sudungthuoc/src/lib/report-validation.ts)

## Goal

Triển khai luồng facility reports mới theo các nguyên tắc:

- mỗi cơ sở chỉ nộp đúng 1 lần cho mỗi tháng
- sau khi nộp thành công thì tháng đó được chốt, không còn duyệt/từ chối
- mỗi dòng có thể được đánh dấu `Bỏ qua` thay vì buộc người dùng xóa dòng Excel
- `BHYT` và `Dịch vụ` đều optional
- hệ thống vẫn ghi nhận `đã nộp` ngay cả khi toàn bộ các dòng đều `Bỏ qua`

## Delivery Principles

- Triển khai theo từng phase để giữ scope kiểm soát được
- Tách rõ lớp dữ liệu cấp tháng và dữ liệu chi tiết theo thuốc
- Không mở rộng refactor sang các module mapping hoặc mua sắm
- Giữ compatibility tạm thời cho downstream đang dựa vào `inventory_reports.status = APPROVED`
- Ưu tiên migration an toàn và backfill rõ ràng cho dữ liệu cũ
- Không trộn implementation với cleanup schema legacy trong cùng rollout

## Current Constraints

- Facility reports hiện suy luận `đã nộp` từ bảng `inventory_reports`
- UI facility hiện cho phép nộp lại khi tháng ở trạng thái `PENDING` hoặc `REJECTED`
- Admin reports hiện có đầy đủ luồng review và review log
- `inventory search` và một số query admin đang lọc `inventory_reports.status = 'APPROVED'`
- Template và validation hiện chưa có khái niệm `Bỏ qua`
- Nếu toàn bộ dòng bị bỏ qua, mô hình hiện tại không có nơi lưu “tháng này đã nộp”

## Target File Structure

### Schema and migration

- `prisma/schema.prisma`
- migration Prisma mới cho model cấp tháng
- script backfill nếu cần tách khỏi migration SQL

### Backend

- `src/app/api/facility/reports/route.ts`
- `src/app/api/facility/reports/validate/route.ts`
- `src/app/api/facility/reports/template/route.ts`
- `src/app/api/facility/report-periods/route.ts`
- `src/app/api/facility/reports/detail/route.ts`
- `src/app/api/admin/reports/route.ts`
- `src/app/api/admin/reports/detail/route.ts`
- `src/app/api/admin/reports/export/route.ts`
- `src/app/api/admin/reports/review/route.ts`
- `src/app/api/admin/report-periods/remind/route.ts`
- `src/app/api/admin/reports/review-log/route.ts`
- `src/lib/facility-report-upload.ts`
- `src/lib/report-validation.ts`
- `src/lib/inventory-search/server.ts`

### Frontend

- `src/app/dashboard/facility/reports/page.tsx`
- `src/app/dashboard/admin/reports/page.tsx`

### Docs

- [2026-04-07-facility-reports-skip-rows-single-submit-design.md](/opt/sudungthuoc/sudungthuoc/docs/superpowers/specs/2026-04-07-facility-reports-skip-rows-single-submit-design.md)
- [2026-04-07-facility-reports-skip-rows-single-submit-implementation-plan.md](/opt/sudungthuoc/sudungthuoc/docs/superpowers/plans/2026-04-07-facility-reports-skip-rows-single-submit-implementation-plan.md)

## Phase Breakdown

## Phase 1: Add Month-Level Submission Model

### Objective

Tạo lớp dữ liệu cấp tháng để biểu diễn việc một facility đã nộp báo cáo hay chưa, độc lập với số dòng thuốc thực tế được lưu.

### Tasks

1. Thêm model mới vào Prisma, ví dụ `FacilityReportSubmission`
2. Thêm các field tối thiểu:
   - `id`
   - `facilityId`
   - `reportMonth`
   - `submittedAt`
   - `reportedRowCount`
   - `skippedRowCount`
   - `createdAt`
   - `updatedAt`
3. Thêm unique index cho `(facilityId, reportMonth)`
4. Sinh migration Prisma
5. Thiết kế backfill cho dữ liệu lịch sử hiện có bằng cách group từ `inventory_reports`
6. Nếu migration SQL không phù hợp để backfill phức tạp, tạo script backfill riêng có thể chạy một lần

### Acceptance Criteria

- Có bảng mới đại diện cho submission cấp tháng
- Một facility có thể được đánh dấu `đã nộp` ngay cả khi không có dòng `inventory_reports`
- Dữ liệu cũ có thể backfill mà không mất quan hệ với lịch sử hiện có

## Phase 2: Extend Shared Report Parsing And Validation For `Bỏ qua`

### Objective

Bổ sung khái niệm `Bỏ qua` vào toàn bộ pipeline parse/validate mà không phá vỡ token validation và immutable field validation.

### Tasks

1. Thêm constant field mới trong [`report-validation.ts`](/opt/sudungthuoc/sudungthuoc/src/lib/report-validation.ts):
   - `REPORT_FIELD_BO_QUA`
2. Mở rộng parsing để đọc giá trị `Bỏ qua`
3. Thêm helper xác định dòng có đang ở trạng thái skip hay không
4. Thêm validation cho cột `Bỏ qua`:
   - chỉ nhận `X` hoặc rỗng
5. Loại bỏ rule `missingCategoryMark`
6. Giữ validation `BHYT` và `Dịch vụ` ở mức:
   - nếu có nhập thì phải là `X`
   - được phép cùng để trống
7. Trong [`facility-report-upload.ts`](/opt/sudungthuoc/sudungthuoc/src/lib/facility-report-upload.ts), cập nhật flow để:
   - với dòng skip, vẫn validate token + immutable fields
   - bỏ qua toàn bộ validation nghiệp vụ còn lại
   - không đưa dòng skip vào danh sách rows để persist
8. Chuẩn hóa summary/result để vẫn đếm được:
   - tổng số dòng có dữ liệu
   - số dòng báo cáo
   - số dòng skip

### Acceptance Criteria

- Dòng `Bỏ qua = X` không bị chặn bởi các rule nghiệp vụ không còn liên quan
- Dòng skip vẫn không thể giả mạo danh tính
- `BHYT` và `Dịch vụ` cùng trống không còn bị reject

## Phase 3: Update Excel Template And Guidance

### Objective

Phản ánh nghiệp vụ mới trực tiếp trong file mẫu Excel để người dùng có thao tác rõ ràng và ổn định.

### Tasks

1. Thêm cột `Bỏ qua` vào template column list
2. Đặt cột này là editable
3. Bổ sung data validation cho cột `Bỏ qua` giống pattern `X` hoặc để trống
4. Cập nhật sheet `Hướng dẫn` để nêu rõ:
   - không cần xóa dòng nếu không phát sinh
   - dùng cột `Bỏ qua`
   - `BHYT` và `Dịch vụ` có thể cùng trống
   - sau khi nộp thành công thì tháng bị khóa
5. Giữ nguyên:
   - hidden `__ROW_TOKEN`
   - locked immutable columns
   - style phân biệt locked/unlocked

### Acceptance Criteria

- File mẫu có cột `Bỏ qua`
- Người dùng hiểu được cách bỏ qua dòng mà không cần xóa row
- Guardrails của template cũ vẫn còn nguyên

## Phase 4: Rework Facility Submit Flow To Single-Submit

### Objective

Đổi API submit facility từ mô hình có thể nộp đè sang mô hình nộp một lần và chốt.

### Tasks

1. Trong [`/api/facility/reports`](/opt/sudungthuoc/sudungthuoc/src/app/api/facility/reports/route.ts), thay guard cũ:
   - từ “chỉ chặn khi có dòng `APPROVED`”
   - sang “chặn nếu đã có `FacilityReportSubmission` cùng `(facilityId, reportMonth)`”
2. Trong transaction submit:
   - tạo `FacilityReportSubmission`
   - ghi các dòng không skip vào `inventory_reports`
   - set `inventory_reports.status = APPROVED` như marker kỹ thuật finalized
   - không ghi `adminNote`
3. Nếu toàn bộ file là skip:
   - vẫn tạo `FacilityReportSubmission`
   - không tạo `inventory_reports`
4. Cập nhật payload response để trả thêm thống kê hữu ích:
   - `reported`
   - `skipped`
5. Giữ log activity `SUBMIT`
6. Giữ notification `REPORT_SUBMITTED`, nhưng copy nên theo nghĩa `đã nộp` thay vì `chờ duyệt`

### Acceptance Criteria

- Một tháng chỉ submit thành công đúng một lần
- Zero-row submission vẫn được ghi nhận là đã nộp
- Dữ liệu chi tiết chỉ chứa các dòng thực sự báo cáo

## Phase 5: Refactor Facility Page For Skip Preview And Locked Months

### Objective

Cập nhật UI facility reports để phản ánh đúng luồng mới: preview có skip, submit một lần, không còn trạng thái duyệt.

### Tasks

1. Cập nhật state/page logic để đọc và hiển thị cột `Bỏ qua`
2. Trong preview:
   - hiển thị rõ dòng nào là `Bỏ qua`
   - không tô lỗi nghiệp vụ cho dòng skip
   - tách số lượng `reported rows` và `skipped rows`
3. Cập nhật `canSubmit` theo logic mới
4. Sau submit thành công:
   - hiển thị tháng là `Đã nộp`
   - disable upload
   - disable submit
   - disable download template cho tháng đã nộp
5. Thay mọi badge/status copy cũ:
   - bỏ `Chờ xử lý`
   - bỏ `Đã duyệt`
   - bỏ `Bị từ chối`
   - chỉ còn `Đã nộp`
6. Giữ `Xem chi tiết` cho tháng đã nộp
7. Đảm bảo lịch sử báo cáo lấy từ submission header thay vì chỉ nhóm từ `inventory_reports`

### Acceptance Criteria

- Facility page không còn cho nộp lại tháng đã nộp
- Preview xử lý đúng dòng skip
- UI không còn gợi ý rằng admin sẽ duyệt/từ chối

## Phase 6: Refactor Admin Reports To Read-Only Submitted Reports

### Objective

Loại bỏ luồng review ở admin reports nhưng vẫn giữ khả năng xem, tìm, xuất, xóa báo cáo.

### Tasks

1. Cập nhật [`/api/admin/reports`](/opt/sudungthuoc/sudungthuoc/src/app/api/admin/reports/route.ts) để dùng `FacilityReportSubmission` làm gốc
2. Cập nhật `notSubmitted` logic sang query submission header
3. Trong [`admin/reports/page.tsx`](/opt/sudungthuoc/sudungthuoc/src/app/dashboard/admin/reports/page.tsx):
   - bỏ nút `Duyệt`
   - bỏ nút `Từ chối`
   - bỏ bulk review
   - bỏ dialog nhập lý do từ chối
   - bỏ panel review log nếu chỉ dành cho facility reports
4. Đổi badge/status admin sang `Đã nộp`
5. Giữ:
   - xem chi tiết
   - so sánh
   - export
   - xóa báo cáo
6. Khi admin xóa báo cáo:
   - xóa cả submission header và rows trong transaction
   - tháng đó trở lại trạng thái `Chưa nộp`

### Acceptance Criteria

- Admin reports hoạt động ở chế độ read-only cho dữ liệu đã nộp
- Không còn hành vi review trong UI
- Xóa báo cáo thực sự mở lại quyền nộp cho facility nếu cần

## Phase 7: Disable Legacy Review Endpoints And Review Artifacts

### Objective

Ngăn hệ thống tiếp tục dùng các route và dữ liệu review cũ cho facility reports sau khi đã chốt luồng mới.

### Tasks

1. Vô hiệu hóa `/api/admin/reports/review`
2. Vô hiệu hóa hoặc ẩn `/api/admin/reports/review-log` khỏi UI admin reports
3. Rà lại mọi call site frontend để chắc chắn không còn gọi review APIs
4. Chuẩn hóa error response của route review cũ, ví dụ:
   - `410 Gone`
   - message nêu rõ luồng review đã bị loại bỏ

### Acceptance Criteria

- Không còn con đường hợp lệ nào để duyệt hoặc từ chối facility reports
- UI không còn phụ thuộc vào review log

## Phase 8: Update Downstream Submission Detection And Compatibility Queries

### Objective

Chuyển các nơi đang dùng `inventory_reports` như dấu hiệu submit sang dùng submission header, đồng thời giữ compatibility cho analytics/query cũ.

### Tasks

1. Cập nhật `/api/admin/report-periods/remind` để detect submitted từ `FacilityReportSubmission`
2. Rà soát các chỗ build danh sách tháng đã có báo cáo
3. Giữ compatibility cho inventory snapshot bằng cách tiếp tục ghi `status = APPROVED` cho rows finalized
4. Kiểm tra các route detail/export xử lý được tháng chỉ có submission header nhưng không có rows
5. Nếu có chỗ nào vẫn group theo `inventory_reports` để hiện lịch sử submit, đổi sang submission header

### Acceptance Criteria

- Zero-row submission không bị xem nhầm là `chưa nộp`
- Consumer cũ dựa vào `APPROVED` không bị gãy ngay trong rollout này

## Phase 9: Verification And Cleanup

### Objective

Xác nhận rollout không làm vỡ các luồng liên quan và dọn các assumptions cũ trong code.

### Tasks

1. Chạy Prisma generate/migration flow cần thiết
2. Chạy lint cho các file đã thay đổi
3. Chạy manual verification theo checklist
4. Rà lại copy UI để loại hết từ ngữ:
   - `duyệt`
   - `từ chối`
   - `chờ xử lý`
5. Rà lại notifications để không còn tạo types review mới cho facility reports
6. Kiểm tra backfill trên dữ liệu dev/staging trước khi áp production

### Manual Verification Checklist

1. Tải file mẫu mới, xác nhận có cột `Bỏ qua`.
2. Đánh dấu `Bỏ qua = X` cho một dòng, xác nhận preview hiện trạng thái skip và không báo lỗi nghiệp vụ.
3. Sửa sai cột immutable trên một dòng skip, xác nhận file bị reject.
4. Để `BHYT` và `Dịch vụ` cùng trống trên dòng báo cáo bình thường, xác nhận file hợp lệ.
5. Nộp thành công với cả dòng báo cáo và dòng skip, xác nhận chỉ dòng báo cáo được lưu.
6. Nộp file có toàn bộ dòng skip, xác nhận tháng vẫn hiển thị `Đã nộp`.
7. Thử nộp lại cùng tháng, xác nhận bị chặn.
8. Vào màn admin reports, xác nhận không còn nút duyệt/từ chối.
9. Xóa một báo cáo ở admin, xác nhận facility có thể nộp lại tháng đó.
10. Gửi reminder cho tháng có zero-row submission, xác nhận facility đó không bị nhắc là chưa nộp.
11. Kiểm tra inventory search hoặc consumer đang dựa vào `status = APPROVED`, xác nhận dữ liệu mới vẫn xuất hiện.

### Acceptance Criteria

- Luồng mới hoạt động đúng với mọi case chính đã chốt
- Không còn hành vi review trong facility reports
- Zero-row submission được support end-to-end

## Recommended Execution Order

Thứ tự triển khai nên là:

1. Phase 1
2. Phase 2
3. Phase 3
4. Phase 4
5. Phase 5
6. Phase 6
7. Phase 7
8. Phase 8
9. Phase 9

Nếu muốn giảm rủi ro rollout, nên chia thành 3 commit logic:

### Commit 1

- schema + migration + backfill hooks
- shared validation helpers
- template `Bỏ qua`

### Commit 2

- facility submit flow
- facility UI
- detail/history read từ submission header

### Commit 3

- admin reports read-only refactor
- disable review APIs
- reminder/not-submitted compatibility updates

## Risks And Mitigations

### Risk 1: Zero-row submission bị xem là chưa nộp ở một số màn

Mitigation:

- chuyển mọi detection `đã nộp/chưa nộp` sang `FacilityReportSubmission`
- kiểm tra kỹ reminder và admin report list

### Risk 2: Downstream analytics bị mất dữ liệu vì không còn review

Mitigation:

- tiếp tục set `inventory_reports.status = APPROVED` như marker kỹ thuật finalized
- defer cleanup schema legacy sang iteration sau

### Risk 3: UI facility và admin bị lệch logic trạng thái

Mitigation:

- định nghĩa duy nhất 2 trạng thái hiển thị ở layer UI: `Chưa nộp`, `Đã nộp`
- không render status trực tiếp từ legacy `ReportStatus`

### Risk 4: Backfill sai làm lịch sử cũ hiển thị thiếu

Mitigation:

- backfill bằng script idempotent
- kiểm tra count facility-month trước và sau backfill
- thử trên staging hoặc snapshot dev trước khi chạy production

## Success Criteria

- Người dùng bỏ qua dòng bằng cột `Bỏ qua`, không cần xóa row Excel
- `BHYT` và `Dịch vụ` có thể cùng trống
- Mỗi facility chỉ submit đúng 1 lần cho mỗi tháng
- Admin reports không còn duyệt/từ chối nhưng vẫn xem/xuất/xóa được
- Hệ thống ghi nhận được tháng đã nộp kể cả khi không có dòng thuốc nào được lưu
