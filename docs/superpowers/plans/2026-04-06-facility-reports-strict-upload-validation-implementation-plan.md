# Facility Reports Strict Upload Validation Implementation Plan

## Inputs

Plan này dựa trên:

- Spec đã chốt: [2026-04-06-facility-reports-strict-upload-validation-design.md](/opt/sudungthuoc/sudungthuoc/docs/superpowers/specs/2026-04-06-facility-reports-strict-upload-validation-design.md)
- UI hiện tại: [page.tsx](/opt/sudungthuoc/sudungthuoc/src/app/dashboard/facility/reports/page.tsx)
- Upload API hiện tại: [route.ts](/opt/sudungthuoc/sudungthuoc/src/app/api/facility/reports/route.ts)
- Template API hiện tại: [route.ts](/opt/sudungthuoc/sudungthuoc/src/app/api/facility/reports/template/route.ts)
- Shared validation hiện tại: [report-validation.ts](/opt/sudungthuoc/sudungthuoc/src/lib/report-validation.ts)

## Goal

Triển khai strict upload validation cho route `/dashboard/facility/reports` theo nguyên tắc:

- reject toàn bộ file nếu có bất kỳ dòng sai nào
- bỏ qua hoàn toàn các dòng đã bị xóa khỏi file
- khóa danh tính dòng bằng token do server ký
- coi các cột nhận diện thuốc là bất biến
- bật nút nộp chỉ khi cả local preview và server validation đều sạch lỗi

## Delivery Principles

- Không thay đổi schema Prisma
- Không thay đổi logic review/approve/reject của admin
- Không để upload route và validate route tự duy trì hai bộ rule khác nhau
- Không ghi DB khi chỉ đang validate preview
- Không dựa vào Excel protection như lớp bảo vệ chính
- Giữ rollout theo hướng fail-closed: nếu token hoặc secret không hợp lệ thì từ chối file

## Current Constraints

- `POST /api/facility/reports` hiện đang suy luận `mapId` từ dữ liệu người dùng sửa được
- Upload route vừa validate vừa `upsert`, chưa có transaction all-or-nothing
- File mẫu hiện chưa mang thông tin danh tính dòng ngoài các cột hiển thị cho người dùng
- `src/lib/report-validation.ts` mới xử lý được các rule thuần dữ liệu, chưa bao phủ token, immutable fields và canonical checks
- UI preview hiện không có bước validate phía server trước khi cho nộp thật
- Repo hiện không thể dựa vào test runner riêng ngoài lint nếu không mở rộng scope

## Target File Structure

### Frontend

- `src/app/dashboard/facility/reports/page.tsx`
- `src/lib/report-validation.ts`

### Backend

- `src/app/api/facility/reports/route.ts`
- `src/app/api/facility/reports/template/route.ts`
- `src/app/api/facility/reports/validate/route.ts`
- `src/lib/facility-report-upload.ts`
- `src/lib/facility-report-token.ts`

### Docs

- `docs/superpowers/specs/2026-04-06-facility-reports-strict-upload-validation-design.md`
- `docs/superpowers/plans/2026-04-06-facility-reports-strict-upload-validation-implementation-plan.md`

## Phase Breakdown

## Phase 1: Extract Shared Upload Primitives

### Objective

Tách các primitive dùng chung cho template, preview server validation và upload thật để toàn bộ feature chạy cùng một contract dữ liệu.

### Tasks

1. Tạo module mới [`facility-report-token.ts`](/opt/sudungthuoc/sudungthuoc/src/lib/facility-report-token.ts) để:
   - build token payload từ `facilityId`, `reportMonth`, `mapId`, `version`
   - ký HMAC bằng `REPORT_UPLOAD_SIGNING_SECRET`
   - verify token và trả ra payload chuẩn hóa
2. Chốt rule đọc secret:
   - ưu tiên `REPORT_UPLOAD_SIGNING_SECRET`
   - nếu thiếu secret, throw lỗi server-side rõ ràng để tránh chạy ở trạng thái nửa an toàn
3. Tạo module mới [`facility-report-upload.ts`](/opt/sudungthuoc/sudungthuoc/src/lib/facility-report-upload.ts) để gom:
   - constants tên cột, gồm `__ROW_TOKEN`
   - helper nhận diện dòng trống
   - parser giá trị số
   - parser ngày `YYYYMMDD`
   - normalizer cho immutable text fields
   - shape chuẩn cho `ValidationError`
   - flow validate một file với input là raw Excel rows + canonical rows từ DB
4. Giữ [`report-validation.ts`](/opt/sudungthuoc/sudungthuoc/src/lib/report-validation.ts) cho các rule client-safe, nhưng tách phần trùng lặp hợp lý để không có hai định nghĩa công thức khác nhau

### Acceptance Criteria

- Có một nơi duy nhất định nghĩa token sign/verify
- Có một nơi duy nhất định nghĩa error codes và validation result shape
- Upload route và validate route có thể gọi cùng một hàm validate file

## Phase 2: Upgrade Template Generation

### Objective

Làm cho file mẫu mang đủ metadata để server xác định chắc chắn danh tính từng dòng.

### Tasks

1. Cập nhật [`template/route.ts`](/opt/sudungthuoc/sudungthuoc/src/app/api/facility/reports/template/route.ts) để tạo token cho từng dòng mapping hợp lệ
2. Thêm cột `__ROW_TOKEN` vào sheet `BaoCao`
3. Ẩn cột `__ROW_TOKEN` trong workbook
4. Giữ nguyên danh sách dòng nguồn:
   - chỉ từ `facilityDrugMap` có `APPROVED` hoặc `AUTO_MAPPED`
5. Giữ prefill từ tháng trước cho:
   - `Tồn đầu`
   - `Giá VAT`
   - `Số QĐ trúng thầu`
   - `Tên Công ty`
   - `Ngày bắt đầu HĐ`
   - `Ngày kết thúc HĐ`
   - `BHYT`
   - `Dịch vụ`
6. Cập nhật sheet `Hướng dẫn` để nói rõ:
   - không sửa cột nhận diện
   - không copy dòng từ file khác
   - có thể xóa hẳn dòng khỏi file
   - file cũ không có token sẽ bị từ chối
7. Giữ validation cho `BHYT` và `Dịch vụ` như hiện tại
8. Không mở rộng scope sang thay đổi thư viện hoặc Excel protection phức tạp chỉ để khóa ô
9. Nếu workbook styling bằng thư viện hiện có không ổn định, ưu tiên:
   - giữ cột token ở trạng thái ẩn
   - cập nhật hướng dẫn rõ trong workbook
   - để server chịu trách nhiệm reject khi cột nhận diện bị sửa

### Acceptance Criteria

- File mẫu mới luôn có token cho từng dòng
- Token bị ràng buộc đúng facility và month
- Hướng dẫn trong workbook phản ánh đúng behavior mới

## Phase 3: Add Authoritative Validate Endpoint

### Objective

Cho UI có thể kiểm tra đầy đủ ở server trước khi cho phép submit thật.

### Tasks

1. Tạo route mới [`validate/route.ts`](/opt/sudungthuoc/sudungthuoc/src/app/api/facility/reports/validate/route.ts)
2. Route này phải:
   - chỉ cho `FACILITY`
   - nhận `month` và `data`
   - dựng canonical dataset từ `facilityDrugMap`, `masterDrug`, và báo cáo tháng trước
   - gọi shared validation helper
   - không ghi DB
3. Chuẩn hóa response:
   - `200` khi hợp lệ, kèm `summary`
   - `400` khi không hợp lệ, kèm `summary` và `errors[]`
4. Giữ response shape ổn định để UI có thể dùng lại cho upload thật

### Acceptance Criteria

- UI có thể gọi validate nhiều lần mà không thay đổi dữ liệu DB
- Validate route trả cùng bộ lỗi logic như upload route
- Không còn cần nhồi toàn bộ canonical logic vào client

## Phase 4: Refactor Upload Route To All-Or-Nothing

### Objective

Biến `POST /api/facility/reports` thành luồng submit cứng, chỉ ghi dữ liệu khi toàn bộ file đã vượt qua validation.

### Tasks

1. Refactor [`route.ts`](/opt/sudungthuoc/sudungthuoc/src/app/api/facility/reports/route.ts) để bỏ lookup `mapId` theo `Mã nội bộ` hoặc `Mã thuốc`
2. Thay vào đó:
   - load canonical dataset giống validate route
   - validate file bằng shared helper
   - nếu có lỗi, trả `400` với `errors[]`
3. Bỏ hành vi hiện tại:
   - skip quietly các dòng không match mapping
   - giữ `errorCount` kiểu best-effort
4. Chỉ khi không có lỗi:
   - mở `prisma.$transaction`
   - `upsert` từng dòng hợp lệ theo `(facilityId, mapId, reportMonth)`
   - reset `status = PENDING`
   - clear `adminNote`
5. Giữ log activity và notification cho admin chỉ sau khi transaction thành công
6. Trả lỗi rõ cho file cũ:
   - nếu thiếu `__ROW_TOKEN`, trả message yêu cầu tải lại mẫu mới

### Acceptance Criteria

- File sai một dòng thì không có bất kỳ bản ghi nào được ghi
- Upload route và validate route dùng cùng một kết quả validation
- Không còn khả năng đổi thuốc bằng cách sửa cột nhận diện mà vẫn submit thành công

## Phase 5: Tighten Client Preview And Submit Guardrails

### Objective

Chặn lỗi sớm ở UI, nhưng không làm client trở thành nguồn sự thật thay cho server.

### Tasks

1. Mở rộng [`report-validation.ts`](/opt/sudungthuoc/sudungthuoc/src/lib/report-validation.ts) hoặc các helper client-safe để preview local bắt được:
   - thiếu token
   - token trùng trong file
   - số không hợp lệ
   - giá trị âm
   - sai công thức `Tồn cuối`
   - sai công thức `Thành tiền tồn cuối`
   - `BHYT` hoặc `Dịch vụ` sai tập giá trị
   - ngày sai định dạng
2. Trong [`page.tsx`](/opt/sudungthuoc/sudungthuoc/src/app/dashboard/facility/reports/page.tsx), bổ sung state riêng cho:
   - lỗi local preview
   - lỗi server validation
   - trạng thái `isServerValidating`
   - cờ `canSubmit`
3. Khi người dùng chọn file:
   - parse local
   - nếu local có lỗi, không gọi validate endpoint
   - nếu local sạch, gọi `/api/facility/reports/validate`
4. Chỉ bật nút submit khi:
   - đã parse xong
   - local preview sạch lỗi
   - server validation sạch lỗi
5. Khi submit thật:
   - vẫn gọi `POST /api/facility/reports`
   - không giả định validate trước đó còn hiệu lực
6. Nâng bảng preview để:
   - hiển thị lỗi theo dòng
   - phân biệt nguồn lỗi local và server khi cần
   - highlight cột lỗi nếu response có `field`

### Acceptance Criteria

- Người dùng thấy phần lớn lỗi trước khi bấm submit
- Nút submit không thể bật khi còn lỗi server-side đã biết
- Server vẫn là lớp xác thực cuối cùng

## Phase 6: Compatibility, Messaging, And Verification

### Objective

Hoàn thiện rollout và giảm rủi ro từ file mẫu cũ hoặc trạng thái UI cũ.

### Tasks

1. Kiểm tra toàn bộ flow với file mẫu mới và file mẫu cũ
2. Thêm thông báo rõ trong UI khi file bị reject vì thiếu token hoặc sai token
3. Rà soát các chỗ reset state:
   - đổi `selectedMonth`
   - đổi file
   - upload thành công
   - upload thất bại
4. Chạy `eslint` cho các file thay đổi; nếu môi trường chặn thì ghi nhận rõ trong closeout
5. Manual test theo checklist bên dưới

### Manual Verification Checklist

1. Tải mẫu mới cho một tháng bất kỳ
2. Điền file đúng, xác nhận local preview sạch, server validate sạch, submit thành công
3. Sửa `Mã nội bộ`, xác nhận preview hoặc validate chặn submit
4. Sửa `Tên thuốc`, xác nhận validate chặn submit
5. Xóa hẳn một số dòng khỏi file, xác nhận file vẫn submit được nếu các dòng còn lại hợp lệ
6. Nhân đôi một dòng, xác nhận bị reject vì duplicate token hoặc duplicate `mapId`
7. Dùng file tháng khác, xác nhận token bị reject do sai `reportMonth`
8. Dùng file cũ không có token, xác nhận nhận thông báo phải tải lại mẫu mới
9. Làm sai `Tồn cuối`, xác nhận bị chặn
10. Làm sai `Thành tiền tồn cuối`, xác nhận bị chặn
11. Để trống cả `BHYT` và `Dịch vụ`, xác nhận bị chặn
12. Nhập ngày sai định dạng hoặc ngày bắt đầu lớn hơn ngày kết thúc, xác nhận bị chặn
13. Xác nhận khi upload thất bại thì DB không có thay đổi một phần

## Rollout Notes

- Feature này phụ thuộc vào env var `REPORT_UPLOAD_SIGNING_SECRET`; cần cấu hình trước khi deploy
- Các file mẫu đã tải trước đây sẽ không còn hợp lệ sau rollout
- Không cần migration database, nhưng cần phối hợp truyền thông ngắn cho người dùng facility về việc phải tải mẫu mới

## Suggested Execution Order

1. Phase 1 để chốt shared primitives và token contract
2. Phase 2 để template mới có thể được tạo ra
3. Phase 3 và Phase 4 để server-side validation/upload dùng chung logic
4. Phase 5 để UI chỉ mở submit khi validation đã sạch
5. Phase 6 để kiểm thử và dọn trải nghiệm rollout
