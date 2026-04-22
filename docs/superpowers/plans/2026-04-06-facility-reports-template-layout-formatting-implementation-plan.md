# Facility Reports Template Layout Formatting Implementation Plan

## Inputs

Plan này dựa trên:

- Spec đã chốt: [2026-04-06-facility-reports-template-layout-formatting-design.md](/opt/sudungthuoc/sudungthuoc/docs/superpowers/specs/2026-04-06-facility-reports-template-layout-formatting-design.md)
- Template route hiện tại: [route.ts](/opt/sudungthuoc/sudungthuoc/src/app/api/facility/reports/template/route.ts)
- Luồng validation upload hiện có:
  [facility-report-upload.ts](/opt/sudungthuoc/sudungthuoc/src/lib/facility-report-upload.ts)

## Goal

Giữ nguyên cơ chế khóa dữ liệu trong file mẫu Excel facility reports, nhưng cho phép người dùng ở sheet `BaoCao`:

- kéo giãn hoặc thu hẹp cột
- chỉnh chiều cao hàng

## Delivery Principles

- Không thay đổi schema Prisma
- Không thay đổi route upload hoặc route validate
- Không thay đổi danh sách cột locked/unlocked
- Không mở thêm các quyền mạnh hơn như `formatCells`, `sort`, `insertColumns`, `insertRows`, `deleteColumns`
- Chỉ thay đổi quyền layout ở sheet `BaoCao`

## Current Constraints

- Sheet `BaoCao` hiện đang protect với `formatColumns: false` và `formatRows: false`
- Người dùng vì vậy không thể chỉnh layout để đọc dữ liệu dài
- File hiện đã có các guardrail quan trọng:
  - cell-level locking
  - hidden `__ROW_TOKEN`
  - autoFilter ở hàng tiêu đề
  - upload validation chặn immutable fields và token mismatch

## Target File Structure

### Runtime files

- `src/app/api/facility/reports/template/route.ts`

### Docs

- `docs/superpowers/specs/2026-04-06-facility-reports-template-layout-formatting-design.md`
- `docs/superpowers/plans/2026-04-06-facility-reports-template-layout-formatting-implementation-plan.md`

## Phase Breakdown

## Phase 1: Update BaoCao Sheet Protection

### Objective

Cho phép chỉnh layout của sheet `BaoCao` mà không nới quyền sửa dữ liệu.

### Tasks

1. Giữ nguyên `worksheet.protect(...)` cho sheet `BaoCao`
2. Đổi `formatColumns` từ `false` sang `true`
3. Đổi `formatRows` từ `false` sang `true`
4. Giữ nguyên:
   - `selectLockedCells`
   - `selectUnlockedCells`
   - `autoFilter`
   - `deleteRows`
5. Không mở thêm:
   - `formatCells`
   - `sort`
   - `insertColumns`
   - `insertRows`
   - `deleteColumns`

### Acceptance Criteria

- Trong Excel thông thường, người dùng kéo giãn/thu hẹp cột được ở sheet `BaoCao`
- Người dùng chỉnh chiều cao hàng được ở sheet `BaoCao`
- Các ô locked vẫn không sửa được
- Các ô unlocked vẫn sửa được

## Phase 2: Clarify Guidance Copy

### Objective

Giảm hiểu nhầm cho người dùng về behavior mới của file mẫu.

### Tasks

1. Cập nhật hoặc bổ sung text trong sheet `Hướng dẫn`
2. Nêu rõ rằng:
   - sheet `BaoCao` cho phép kéo giãn cột
   - sheet `BaoCao` cho phép chỉnh chiều cao hàng
   - việc này chỉ nhằm hỗ trợ đọc dữ liệu, không thay đổi quy tắc nhập liệu

### Acceptance Criteria

- File hướng dẫn phản ánh đúng behavior mới
- Không đổi quyền thao tác của sheet `Hướng dẫn`

## Phase 3: Verification

### Objective

Đảm bảo thay đổi chỉ là nới quyền layout, không ảnh hưởng integrity của template.

### Tasks

1. Chạy kiểm tra tĩnh cho file route đã sửa
2. Rà lại code để xác nhận:
   - hidden token column còn nguyên
   - cell-level locking còn nguyên
   - `autoFilter` còn nguyên
3. Ghi rõ trong closeout rằng behavior thực tế vẫn nên kiểm tra lại trên Excel Desktop

### Manual Verification Checklist

1. Tải file mẫu mới từ `/dashboard/facility/reports`
2. Mở sheet `BaoCao`
3. Thử kéo rộng một cột
4. Thử tăng chiều cao một hàng
5. Thử sửa cột khóa như `Tên thuốc`
6. Thử nhập cột nghiệp vụ như `Nhập trong kỳ`
7. Thử dùng filter ở header
8. Upload file hợp lệ
9. Unprotect rồi sửa cột immutable, upload lại để xác nhận server vẫn reject

## Risks And Mitigations

- Risk: Một số phần mềm bảng tính không diễn giải protection giống Excel Desktop
  - Mitigation: giữ thay đổi ở mức tối thiểu và dựa vào server validation làm lớp bảo vệ cuối
- Risk: Mở nhầm quyền mạnh hơn dự kiến
  - Mitigation: chỉ sửa đúng `formatColumns` và `formatRows`, không đụng các quyền khác

## Success Criteria

- Sheet `BaoCao` cho phép đổi độ rộng cột
- Sheet `BaoCao` cho phép đổi chiều cao hàng
- Dữ liệu locked/unlocked giữ nguyên behavior hiện tại
- Upload validation không cần đổi nhưng vẫn chặn dữ liệu sai như trước
