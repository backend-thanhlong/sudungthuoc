# Admin Master Drugs Column Filters Implementation Plan

## Inputs

Plan này dựa trên:

- Spec đã duyệt: [2026-04-22-admin-master-drugs-column-filters-design.md](/opt/sudungthuoc/sudungthuoc/docs/superpowers/specs/2026-04-22-admin-master-drugs-column-filters-design.md)
- Admin master drugs page hiện tại: [page.tsx](/opt/sudungthuoc/sudungthuoc/src/app/dashboard/admin/master-drugs/page.tsx)
- Master drugs GET API hiện tại: [route.ts](/opt/sudungthuoc/sudungthuoc/src/app/api/admin/master-drugs/route.ts)
- Therapeutic group picker hiện tại: [TherapeuticGroupPicker.tsx](/opt/sudungthuoc/sudungthuoc/src/components/master-drugs/TherapeuticGroupPicker.tsx)

## Goal

Triển khai bộ lọc theo từng cột cho bảng `/dashboard/admin/master-drugs`, với các nguyên tắc:

- hiển thị một hàng filter ngay dưới hàng tiêu đề
- lọc toàn bộ dữ liệu theo server-side filtering
- chỉ áp dụng khi người dùng bấm `Lọc`
- `Xóa lọc` chỉ xóa filter theo cột, không đổi `mappingStatus`
- tự động xóa filter của cột khi người dùng ẩn cột đó
- giữ đồng bộ với cơ chế ẩn/hiện cột và sticky column hiện có

## Delivery Principles

- Không thay đổi schema, import/export, create/update/delete thuốc
- Không thay thế ô tìm kiếm tổng quát hiện có
- Không thêm sort theo cột trong cùng đợt
- Không generic hóa thành một hệ filter dùng chung cho toàn repo
- Ưu tiên mở rộng có mục tiêu trên `page.tsx` và `GET /api/admin/master-drugs`
- Tái sử dụng `TherapeuticGroupPicker` theo mode gọn thay vì dựng thêm một picker song song

## Current Constraints

- Trang hiện chỉ có `searchTerm + searchField + mappingStatus`, chưa có contract filter theo cột
- `fetchDrugs` hiện mới serialize các query param cơ bản
- Cơ chế hiển thị cột đã tồn tại và dùng `TABLE_COLUMNS` + `isColumnVisible`
- `Hoạt chất` là cột sticky và phải giữ đồng bộ giữa header, filter row, và body
- `TherapeuticGroupPicker` hiện phục vụ form thêm/sửa thuốc, có logic tạo mới; filter row cần cùng trải nghiệm tìm kiếm nhưng không có tạo mới
- Empty state hiện đang dựa vào `searchTerm`, chưa phản ánh trường hợp đang có active column filters

## Target File Structure

### Frontend

- `src/app/dashboard/admin/master-drugs/page.tsx`
- `src/components/master-drugs/TherapeuticGroupPicker.tsx`

### Backend

- `src/app/api/admin/master-drugs/route.ts`

### Docs

- [2026-04-22-admin-master-drugs-column-filters-design.md](/opt/sudungthuoc/sudungthuoc/docs/superpowers/specs/2026-04-22-admin-master-drugs-column-filters-design.md)
- [2026-04-22-admin-master-drugs-column-filters-implementation-plan.md](/opt/sudungthuoc/sudungthuoc/docs/superpowers/plans/2026-04-22-admin-master-drugs-column-filters-implementation-plan.md)

## Phase Breakdown

## Phase 1: Define Column Filter Model On The Page

### Objective

Tạo mô hình state rõ ràng cho filter đang nhập và filter đang được áp dụng.

### Tasks

1. Thêm kiểu dữ liệu cho column filters trong `page.tsx`
2. Tách state:
   - `columnFiltersDraft`
   - `columnFiltersApplied`
3. Bao phủ các field:
   - `maBhyt`
   - `tenThuoc`
   - `hoatChat`
   - `hamLuong`
   - `soDangKy`
   - `dangBaoChe`
   - `quyCach`
   - `duongDung`
   - `donViTinh`
   - `nhomThuoc`
   - `therapeuticGroupId`
4. Thêm helper để:
   - reset toàn bộ column filters
   - kiểm tra có active column filter hay không
   - xóa filter của một cột cụ thể khi cột bị ẩn
5. Giữ `searchTerm`, `activeSearchTerm`, `searchField`, `mappingStatus` như luồng độc lập hiện có

### Acceptance Criteria

- Có hai lớp state tách bạch giữa draft và applied
- Không cần debounce hay auto-apply
- Code đọc được rõ cột nào đang lọc và cột nào chưa áp dụng

## Phase 2: Extend Fetch Pipeline And Query Serialization

### Objective

Đưa `columnFiltersApplied` vào cùng pipeline fetch với phân trang, search và mapping status.

### Tasks

1. Mở rộng chữ ký `fetchDrugs` để nhận thêm `appliedColumnFilters`
2. Khi build `URLSearchParams`, chỉ serialize các filter có giá trị thực
3. Giữ nguyên `search`, `searchField`, `mappingStatus`, `page`, `limit`
4. Thêm handler:
   - `handleApplyColumnFilters`
   - `handleClearColumnFilters`
5. Quy ước:
   - bấm `Lọc` thì copy `draft -> applied`, reset `page = 1`
   - bấm `Xóa lọc` thì xóa cả `draft` và `applied`, reset `page = 1`
6. Cập nhật các chỗ đang gọi `fetchDrugs` sau edit/delete/import/toggle để tiếp tục dùng bộ filter đang được áp dụng thay vì vô tình làm rơi trạng thái lọc

### Acceptance Criteria

- Query gửi lên API phản ánh đúng bộ filter đang active
- Edit/delete/import/toggle không làm mất context lọc hiện tại
- Không có call site nào còn dùng chữ ký `fetchDrugs` cũ sai tham số

## Phase 3: Add Server-Side Column Filter Support

### Objective

Mở rộng `GET /api/admin/master-drugs` để lọc theo cột trước khi phân trang.

### Tasks

1. Parse thêm các query param filter theo cột trong [route.ts](/opt/sudungthuoc/sudungthuoc/src/app/api/admin/master-drugs/route.ts)
2. Tách logic build điều kiện thành các khối dễ đọc:
   - global search hiện có
   - `mappingStatus`
   - column filters
3. Với các cột text, dùng `contains` + `mode: "insensitive"`
4. Với `nhomThuoc`, dùng exact match
5. Với `therapeuticGroupId`, dùng exact match trên khóa ngoại
6. Bỏ qua filter rỗng hoặc chỉ có khoảng trắng
7. Giữ `count` và `findMany` dùng chung một `where`

### Acceptance Criteria

- API trả dữ liệu đúng khi lọc từng cột riêng lẻ hoặc nhiều cột đồng thời
- Điều kiện được kết hợp theo `AND`
- Search tổng quát và column filters hoạt động song song

## Phase 4: Render The Filter Row Under The Header

### Objective

Thêm hàng filter thứ hai trong `TableHeader` mà không làm lệch bảng.

### Tasks

1. Thêm một `TableRow` mới ngay dưới hàng tiêu đề cột
2. Dùng đúng `isColumnVisible(...)` cho cả:
   - `TableHead` của header
   - `TableCell` hoặc `TableHead` của hàng filter
   - `TableCell` của body
3. Render control tương ứng theo loại cột:
   - ô trống cho `STT`
   - `Input` nhỏ cho các cột text
   - `Select` cho `Nhóm thuốc`
   - `TherapeuticGroupPicker` ở mode compact, `allowCreate = false`, cho `Nhóm điều trị`
   - cụm nút `Lọc` và `Xóa lọc` cho `Thao tác`
4. Thêm props mục tiêu vào `TherapeuticGroupPicker`:
   - tắt tạo mới
   - placeholder ngắn cho ngữ cảnh filter
   - class/size gọn để nằm ổn trong hàng bảng
5. Giữ sticky behavior cho ô filter dưới `Hoạt chất`
6. Đảm bảo ô filter không phá layout khi cuộn ngang

### Acceptance Criteria

- Bảng không lệch cột giữa header, filter row và body
- Ô filter của `Hoạt chất` vẫn sticky đúng lớp
- `Nhóm điều trị` có thể tìm và chọn nhanh mà không có hành vi tạo mới

## Phase 5: Sync Column Visibility With Filter State

### Objective

Đảm bảo không tồn tại “lọc ngầm” khi người dùng ẩn một cột.

### Tasks

1. Mở rộng `handleColumnVisibilityChange`
2. Khi cột bị ẩn:
   - xóa filter draft của cột đó
   - xóa filter applied của cột đó
3. Nếu filter vừa bị xóa đang ảnh hưởng kết quả hiện tại:
   - reset `page = 1`
   - fetch lại dữ liệu
4. Giữ nguyên hành vi `Hiện tất cả`:
   - chỉ hiện lại cột
   - không khôi phục các filter đã bị xóa trước đó

### Acceptance Criteria

- Ẩn cột đang có filter sẽ bỏ hiệu lực lọc ngay
- Hiện lại cột không làm filter cũ quay lại

## Phase 6: Update Empty State And Manual Verification

### Objective

Hoàn thiện tín hiệu UI và kiểm tra regression chính.

### Tasks

1. Thêm helper để xác định bảng hiện đang bị thu hẹp bởi:
   - `activeSearchTerm`
   - `mappingStatus` khác mặc định
   - `columnFiltersApplied`
2. Dùng helper này để đổi message empty state cho đúng ngữ cảnh
3. Chạy:
   - `npx eslint src/app/dashboard/admin/master-drugs/page.tsx src/components/master-drugs/TherapeuticGroupPicker.tsx src/app/api/admin/master-drugs/route.ts`
   - `npx tsc --noEmit --pretty false`
4. Kiểm tra thủ công:
   - lọc 1 cột text
   - lọc nhiều cột text cùng lúc
   - lọc `Nhóm thuốc`
   - lọc `Nhóm điều trị`
   - bấm `Lọc`
   - bấm `Xóa lọc`
   - ẩn một cột đang có filter
   - cuộn ngang để kiểm tra sticky `Hoạt chất`

### Success Criteria

- Bộ lọc theo cột chạy đúng trên server
- Không có filter ngầm sau khi ẩn cột
- Empty state phản ánh đúng là bảng đang bị lọc
- Không phát sinh lỗi lint hoặc type-check ở file thay đổi
