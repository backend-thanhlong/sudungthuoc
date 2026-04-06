# Facility Reports Template Locked Columns Implementation Plan

## Inputs

Plan này dựa trên:

- Spec đã chốt: [2026-04-06-facility-reports-template-locked-columns-design.md](/opt/sudungthuoc/sudungthuoc/docs/superpowers/specs/2026-04-06-facility-reports-template-locked-columns-design.md)
- Template route hiện tại: [route.ts](/opt/sudungthuoc/sudungthuoc/src/app/api/facility/reports/template/route.ts)
- Shared template data builder hiện tại: [facility-report-upload.ts](/opt/sudungthuoc/sudungthuoc/src/lib/facility-report-upload.ts)
- Upload validation đã có: [facility-report-upload.ts](/opt/sudungthuoc/sudungthuoc/src/lib/facility-report-upload.ts)

## Goal

Khóa các cột chỉ đọc trong file mẫu Excel của facility reports để người dùng không sửa nhầm:

- `STT`
- `Mã nội bộ`
- `Mã thuốc`
- `Tên thuốc`
- `Hoạt chất`
- `Đơn vị tính`
- `__ROW_TOKEN`

Đồng thời vẫn cho phép nhập bình thường ở các cột nghiệp vụ và giữ nguyên lớp validation/token ở server.

## Delivery Principles

- Không thay đổi schema Prisma
- Không thay đổi contract của route upload hoặc route validate
- Không bỏ hoặc nới lỏng bất kỳ rule strict validation nào hiện có
- Chỉ thay đổi luồng sinh file mẫu
- Excel protection chỉ là UX guardrail, không phải security boundary

## Current Constraints

- Route template hiện dùng `xlsx`, phù hợp cho dữ liệu đơn giản nhưng không phù hợp để khóa chọn lọc từng cột một cách sạch và ổn định
- File mẫu hiện đã có `__ROW_TOKEN` ẩn, data validation cho `BHYT` và `Dịch vụ`, cùng sheet `Hướng dẫn`
- Upload route đã reject nếu cột nhận diện hoặc token bị sửa, nên implementation mới không được làm lệch cấu trúc cột hiện có

## Target File Structure

### Runtime files

- `package.json`
- `package-lock.json`
- `src/app/api/facility/reports/template/route.ts`

### Docs

- `docs/superpowers/specs/2026-04-06-facility-reports-template-locked-columns-design.md`
- `docs/superpowers/plans/2026-04-06-facility-reports-template-locked-columns-implementation-plan.md`

## Phase Breakdown

## Phase 1: Add ExcelJS For Template Generation

### Objective

Đưa vào thư viện phù hợp cho cell-level protection và sheet protection.

### Tasks

1. Thêm dependency `exceljs`
2. Giữ `xlsx` nếu vẫn còn được dùng ở nơi khác; không thay đổi ngoài phạm vi template route
3. Xác nhận runtime của Next route vẫn có thể xuất `Buffer` từ workbook `exceljs`

### Acceptance Criteria

- Repo cài được `exceljs`
- Không làm gãy các route khác đang dùng `xlsx`

## Phase 2: Rewrite Template Workbook Generation

### Objective

Chuyển route `/api/facility/reports/template` sang sinh workbook bằng `ExcelJS` nhưng giữ nguyên shape dữ liệu nghiệp vụ.

### Tasks

1. Giữ nguyên bước load dữ liệu:
   - `loadFacilityReportCanonicalContext`
   - `buildFacilityReportTemplateRows`
   - `createFacilityReportRowToken`
2. Tạo workbook mới bằng `ExcelJS`
3. Tạo sheet `BaoCao` với đúng thứ tự cột hiện tại để upload parser không bị ảnh hưởng
4. Giữ cột `__ROW_TOKEN` ở cuối sheet và tiếp tục hidden
5. Giữ kích thước cột tương đương workbook hiện tại
6. Giữ sheet `Hướng dẫn` với nội dung hướng dẫn đã có, đồng thời cập nhật dòng mô tả cột bị khóa

### Acceptance Criteria

- File mẫu mới vẫn có cùng cấu trúc cột như trước
- UI upload hiện tại vẫn parse được file mẫu mới
- Token vẫn được phát sinh đúng cho từng dòng

## Phase 3: Apply Locked/Unlocked Cell Model

### Objective

Khóa đúng các cột chỉ đọc và mở đúng các cột nhập liệu.

### Tasks

1. Xác định danh sách cột locked:
   - `STT`
   - `Mã nội bộ`
   - `Mã thuốc`
   - `Tên thuốc`
   - `Hoạt chất`
   - `Đơn vị tính`
   - `__ROW_TOKEN`
2. Xác định danh sách cột unlocked:
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
3. Gán `protection.locked = true/false` cho từng ô dữ liệu theo cột
4. Protect sheet `BaoCao` sau khi đã gán trạng thái lock
5. Thiết lập sheet protection theo hướng:
   - cho chọn ô unlocked
   - không cho format cell
   - không cho insert/delete row
   - không cho sort/filter nếu không cần
6. Không reuse `REPORT_UPLOAD_SIGNING_SECRET` làm password protect sheet

### Acceptance Criteria

- Mở file bằng Excel thông thường không sửa được các cột locked
- Vẫn nhập bình thường được các cột unlocked
- Hidden token vẫn không lộ ra trong thao tác thường

## Phase 4: Restore Data Validation And Visual Cues

### Objective

Giữ mức dễ dùng của file mẫu sau khi đổi thư viện.

### Tasks

1. Recreate data validation cho:
   - `BHYT`
   - `Dịch vụ`
2. Tô màu hoặc format nhẹ để phân biệt:
   - cột chỉ đọc
   - cột được phép nhập
3. Giữ row header rõ ràng, tránh người dùng nghĩ sheet bị lỗi do protect
4. Cập nhật sheet `Hướng dẫn` để nói rõ:
   - các cột chỉ đọc đã bị khóa
   - không cần chỉnh sửa các cột này
   - nếu phá khóa và sửa dữ liệu sai thì upload vẫn bị từ chối

### Acceptance Criteria

- UX file mẫu không tệ hơn bản hiện tại
- Dropdown `X` cho `BHYT` và `Dịch vụ` vẫn hoạt động
- Người dùng có thể nhận biết đâu là cột để nhập

## Phase 5: Verification And Rollout Safety

### Objective

Đảm bảo thay đổi chỉ ảnh hưởng đến template, không làm lệch strict upload flow.

### Tasks

1. Tải mẫu mới và kiểm tra bằng tay:
   - cột locked không sửa được
   - cột unlocked sửa được
   - `__ROW_TOKEN` hidden
2. Upload một file mẫu mới hợp lệ để xác nhận route upload vẫn nhận đúng
3. Cố tình phá khóa rồi sửa `Mã thuốc` hoặc `Tên thuốc`, xác nhận upload bị reject
4. Chạy `eslint` hoặc `tsc --noEmit` cho các file thay đổi nếu môi trường cho phép
5. Ghi rõ trong closeout nếu có behavior cần chú ý trên Excel web, WPS hoặc LibreOffice

### Manual Verification Checklist

1. Chọn tháng và tải mẫu mới từ `/dashboard/facility/reports`
2. Mở file trong Excel Desktop
3. Thử sửa `Tên thuốc`, xác nhận không sửa được khi sheet đang protect
4. Thử nhập `Nhập trong kỳ`, `Xuất trong kỳ`, xác nhận sửa được
5. Thử chọn `BHYT` hoặc `Dịch vụ`, xác nhận dropdown vẫn có `X`
6. Upload file hợp lệ, xác nhận nộp thành công
7. Unprotect file, sửa `Mã nội bộ`, upload lại, xác nhận bị từ chối bởi server

## Risks And Mitigations

- Risk: ExcelJS tạo file hơi khác `xlsx` khiến parser phía client đọc khác
  - Mitigation: giữ nguyên tên cột, thứ tự cột và giá trị ô
- Risk: Một số phần mềm bảng tính xử lý sheet protection khác nhau
  - Mitigation: coi protection là UX layer, còn server validation vẫn giữ chặn cứng
- Risk: Mất data validation `BHYT/Dịch vụ` khi đổi thư viện
  - Mitigation: kiểm tra thủ công ngay trong phase workbook generation

## Success Criteria

- File mẫu mới khóa được các cột nhận diện và `STT`
- Người dùng vẫn nhập liệu bình thường ở các cột nghiệp vụ
- Strict validation hiện tại không cần thay đổi nhưng vẫn hoạt động với file mẫu mới
- Không phát sinh regression ở route upload hoặc preview hiện có
