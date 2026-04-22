# Admin Master Drugs Column Visibility Implementation Plan

## Inputs

Plan này dựa trên:

- Spec đã duyệt: [2026-04-22-admin-master-drugs-column-visibility-design.md](/opt/sudungthuoc/sudungthuoc/docs/superpowers/specs/2026-04-22-admin-master-drugs-column-visibility-design.md)
- Admin master drugs page hiện tại: [page.tsx](/opt/sudungthuoc/sudungthuoc/src/app/dashboard/admin/master-drugs/page.tsx)
- Dropdown menu primitives hiện tại: [dropdown-menu.tsx](/opt/sudungthuoc/sudungthuoc/src/components/ui/dropdown-menu.tsx)

## Goal

Triển khai khả năng cho người dùng bật/tắt các cột tùy chọn trên bảng `/dashboard/admin/master-drugs`, với các nguyên tắc:

- dùng ngay nút `Hiển thị` hiện có
- giữ một số cột cốt lõi luôn hiển thị
- mặc định tất cả cột đều đang hiện
- không lưu cấu hình qua reload
- thêm cột `Mã BHYT` ngay sau `STT`

## Delivery Principles

- Chỉ thay đổi ở tầng client của trang `master-drugs`
- Không đụng API, schema, import/export, phân trang, tìm kiếm
- Không generic hóa thành hệ thống quản lý cột cho toàn repo
- Giữ nguyên logic `wrappedColumns`, chỉ tách UI khỏi phần hiển thị cột

## Current Constraints

- Trang hiện đã có menu `Hiển thị`, nhưng menu này mới chỉ điều khiển xuống dòng
- Bảng đang render cứng từng cột trong header và body
- `Hoạt chất` là cột sticky và phải luôn hiển thị
- `Mã BHYT` có sẵn trong payload nhưng chưa được render ở bảng danh sách

## Target File Structure

### Frontend

- `src/app/dashboard/admin/master-drugs/page.tsx`

### Docs

- [2026-04-22-admin-master-drugs-column-visibility-design.md](/opt/sudungthuoc/sudungthuoc/docs/superpowers/specs/2026-04-22-admin-master-drugs-column-visibility-design.md)
- [2026-04-22-admin-master-drugs-column-visibility-implementation-plan.md](/opt/sudungthuoc/sudungthuoc/docs/superpowers/plans/2026-04-22-admin-master-drugs-column-visibility-implementation-plan.md)

## Phase Breakdown

## Phase 1: Define Column Visibility Model

### Objective

Tạo một nguồn cấu hình duy nhất cho thứ tự cột, nhãn cột, trạng thái bắt buộc và trạng thái hiển thị mặc định.

### Tasks

1. Thêm cấu hình `TABLE_COLUMNS`
2. Với mỗi cột, khai báo:
   - `id`
   - `label`
   - `required`
   - `defaultVisible`
3. Khai báo rõ nhóm cột bắt buộc:
   - `STT`
   - `Tên thuốc`
   - `Hoạt chất`
   - `Hàm lượng`
   - `Số đăng ký`
   - `Dạng bào chế`
   - `Đường dùng`
   - `Thao tác`
4. Đưa `Mã BHYT` vào danh sách cột với vị trí sau `STT`
5. Tạo state `visibleColumns` từ cấu hình mặc định

### Acceptance Criteria

- Có một cấu hình cột rõ ràng, không phải hard-code phân tán
- `visibleColumns` khởi tạo đúng theo mặc định tất cả cột đang hiện

## Phase 2: Split `Hiển thị` Dropdown Into Two Groups

### Objective

Mở rộng menu `Hiển thị` để điều khiển cả ẩn/hiện cột và xuống dòng mà không làm rối UX.

### Tasks

1. Giữ nguyên nút `Hiển thị`
2. Trong dropdown, tách thành:
   - `Cột hiển thị`
   - `Xuống dòng`
3. Trong nhóm `Cột hiển thị`:
   - render toàn bộ cột
   - cột bắt buộc hiển thị ở trạng thái checked + disabled
   - cột tùy chọn dùng checkbox bật/tắt
4. Thêm action `Hiện tất cả`
5. Giữ nhóm `Xuống dòng` dùng state `wrappedColumns` hiện tại

### Acceptance Criteria

- Menu `Hiển thị` hiển thị được hai nhóm rõ ràng
- Người dùng hiểu được đâu là ẩn/hiện cột, đâu là xuống dòng

## Phase 3: Rework Table Rendering Around `visibleColumns`

### Objective

Đảm bảo header và body luôn đồng bộ khi người dùng bật/tắt cột.

### Tasks

1. Thêm helper `isColumnVisible`
2. Render có điều kiện cho từng `TableHead`
3. Render có điều kiện cho từng `TableCell`
4. Thêm cột `Mã BHYT` ngay sau `STT`
5. Cập nhật `colSpan` của empty state theo số cột đang hiển thị
6. Giữ nguyên sticky behavior của cột `Hoạt chất`

### Acceptance Criteria

- Không bị lệch cột giữa header và body
- Empty state dùng đúng `colSpan`
- `Hoạt chất` vẫn sticky ổn định

## Phase 4: Verification

### Objective

Kiểm tra nhanh để tránh regression ở bảng và dropdown.

### Tasks

1. Chạy lint cho file thay đổi
2. Chạy type-check nếu cần
3. Kiểm tra thủ công:
   - tắt/bật `Mã BHYT`
   - tắt/bật các cột tùy chọn khác
   - dùng `Hiện tất cả`
   - reload trang
   - xác nhận sticky `Hoạt chất` không lệch

### Success Criteria

- Tất cả cột tùy chọn có thể bật/tắt đúng
- Các cột bắt buộc không thể bị ẩn
- `Mã BHYT` xuất hiện đúng sau `STT`
- Không phát sinh warning/lỗi lint ở file thay đổi
