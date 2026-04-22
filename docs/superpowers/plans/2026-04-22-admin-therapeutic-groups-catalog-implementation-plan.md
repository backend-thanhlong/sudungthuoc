# Admin Therapeutic Groups Catalog Implementation Plan

## Inputs

Plan này dựa trên:

- Spec đã duyệt: [2026-04-22-admin-therapeutic-groups-catalog-design.md](/opt/sudungthuoc/sudungthuoc/docs/superpowers/specs/2026-04-22-admin-therapeutic-groups-catalog-design.md)
- Schema hiện tại: [schema.prisma](/opt/sudungthuoc/sudungthuoc/prisma/schema.prisma)
- Admin master drugs page hiện tại: [page.tsx](/opt/sudungthuoc/sudungthuoc/src/app/dashboard/admin/master-drugs/page.tsx)
- Master drugs APIs hiện tại:
  [route.ts](/opt/sudungthuoc/sudungthuoc/src/app/api/admin/master-drugs/route.ts),
  [route.ts](/opt/sudungthuoc/sudungthuoc/src/app/api/admin/master-drugs/[id]/route.ts),
  [route.ts](/opt/sudungthuoc/sudungthuoc/src/app/api/admin/master-drugs/import/route.ts),
  và [route.ts](/opt/sudungthuoc/sudungthuoc/src/app/api/admin/master-drugs/export-mapped/route.ts)
- Điều hướng admin hiện tại: [DashboardLayout.tsx](/opt/sudungthuoc/sudungthuoc/src/components/DashboardLayout.tsx)

## Goal

Triển khai mô hình danh mục `Nhóm điều trị` chuẩn theo các nguyên tắc:

- bỏ hoàn toàn field/cột `nhomDieuTri` cũ khỏi `MasterDrug`
- `MasterDrug` lưu quan hệ tới danh mục `TherapeuticGroup`
- admin có trang quản trị riêng trong dropdown `Cài đặt`
- form `/dashboard/admin/master-drugs` chọn nhóm điều trị bằng control `tìm kiếm + chọn + tạo mới`
- import Excel tự tạo nhóm điều trị mới khi chưa tồn tại
- export và UI tiếp tục hiển thị tên nhóm điều trị thay vì ID

## Delivery Principles

- Không backfill dữ liệu `nhomDieuTri` cũ
- Không giữ song song hai nguồn dữ liệu `Nhóm điều trị`
- Tách logic chuẩn hóa/tạo lại nhóm điều trị vào helper backend dùng chung
- Không kéo theo một refactor UI generic lớn chỉ để phục vụ một field
- Siết payload update `master-drugs` thay vì tiếp tục `data: body` thô
- Ưu tiên rollout nhất quán schema -> API -> UI -> import/export trong cùng một đợt

## Current Constraints

- `MasterDrug` hiện vẫn lưu `nhomDieuTri String?` trực tiếp trong Prisma schema
- Master drugs update route hiện dùng `prisma.masterDrug.update({ data: body })`, dễ ghi nhầm field UI phụ
- Form thuốc hiện dùng `Input` text cho `Nhóm điều trị`
- Repo chỉ có các primitive `Input`, `Select`, `Dialog`, `DropdownMenu`; chưa có `Popover` hoặc `Command` để dựng combobox sẵn
- Import và export Excel hiện đang đọc/ghi `nhomDieuTri` dạng text thuần
- Facility user được xem `/dashboard/admin/master-drugs` ở chế độ read-only, nên thay đổi này phải không phá luồng đọc danh mục dùng chung

## Target File Structure

### Schema and migration

- `prisma/schema.prisma`
- migration Prisma mới cho `therapeutic_groups` và relation từ `master_drugs`

### Shared backend helpers

- `src/lib/therapeutic-groups.ts`

### Backend

- `src/app/api/admin/therapeutic-groups/route.ts`
- `src/app/api/admin/therapeutic-groups/[id]/route.ts`
- `src/app/api/admin/master-drugs/route.ts`
- `src/app/api/admin/master-drugs/[id]/route.ts`
- `src/app/api/admin/master-drugs/import/route.ts`
- `src/app/api/admin/master-drugs/export-mapped/route.ts`

### Frontend

- `src/components/DashboardLayout.tsx`
- `src/app/dashboard/admin/therapeutic-groups/page.tsx`
- `src/app/dashboard/admin/master-drugs/page.tsx`
- `src/components/master-drugs/TherapeuticGroupPicker.tsx`

### Docs

- [2026-04-22-admin-therapeutic-groups-catalog-design.md](/opt/sudungthuoc/sudungthuoc/docs/superpowers/specs/2026-04-22-admin-therapeutic-groups-catalog-design.md)
- [2026-04-22-admin-therapeutic-groups-catalog-implementation-plan.md](/opt/sudungthuoc/sudungthuoc/docs/superpowers/plans/2026-04-22-admin-therapeutic-groups-catalog-implementation-plan.md)

## Phase Breakdown

## Phase 1: Reshape Schema Around `TherapeuticGroup`

### Objective

Biến `Nhóm điều trị` từ string rời rạc thành quan hệ chuẩn giữa `MasterDrug` và `TherapeuticGroup`.

### Tasks

1. Thêm model `TherapeuticGroup` vào Prisma với các field:
   - `id`
   - `name`
   - `normalizedName`
   - `isActive`
   - `createdAt`
   - `updatedAt`
2. Thêm unique index cho `normalizedName`
3. Cập nhật `MasterDrug`:
   - bỏ `nhomDieuTri`
   - thêm `therapeuticGroupId String?`
   - thêm relation `therapeuticGroup`
4. Định nghĩa map DB name rõ ràng cho bảng/cột mới:
   - `therapeutic_groups`
   - `therapeutic_group_id`
5. Generate Prisma migration
6. Regenerate Prisma client

### Acceptance Criteria

- Prisma schema không còn `nhomDieuTri`
- `MasterDrug` có thể tham chiếu nullable tới `TherapeuticGroup`
- Prisma client sinh ra type relation mới cho `masterDrug`

## Phase 2: Ship Migration Without Backfill

### Objective

Áp dụng migration đúng theo quyết định nghiệp vụ: bỏ cột cũ, không chuyển dữ liệu cũ sang danh mục mới.

### Tasks

1. Tạo bảng `therapeutic_groups`
2. Thêm cột `master_drugs.therapeutic_group_id`
3. Thêm foreign key `ON DELETE SET NULL`
4. Drop cột `master_drugs.nhom_dieu_tri`
5. Xác nhận migration không có bước backfill hoặc insert từ dữ liệu legacy
6. Kiểm tra các nơi còn compile-time/runtime dependency vào `nhomDieuTri`

### Acceptance Criteria

- Sau migration, dữ liệu `Nhóm điều trị` cũ không còn tồn tại
- DB chỉ còn một nguồn dữ liệu chuẩn cho `Nhóm điều trị`
- Không có query nào còn truy cập cột `nhom_dieu_tri`

## Phase 3: Add Shared Therapeutic Group Backend Helpers

### Objective

Đưa logic normalize, find-or-create, re-activate vào một lớp dùng chung thay vì lặp lại ở nhiều route.

### Tasks

1. Tạo helper mới, ví dụ `src/lib/therapeutic-groups.ts`
2. Thêm hàm normalize tên:
   - trim khoảng trắng
   - gom khoảng trắng liên tiếp
   - lowercase để làm `normalizedName`
3. Thêm helper validate input name rỗng/trống
4. Thêm helper `findOrCreateTherapeuticGroup`
5. Thêm helper `renameTherapeuticGroup` với guard trùng `normalizedName`
6. Thêm helper tính `drugCount` để dùng ở trang quản trị

### Acceptance Criteria

- Route create từ form thuốc và route import dùng cùng một logic chuẩn hóa
- Không có nhánh nào tạo nhóm điều trị trùng chỉ khác format nhập liệu

## Phase 4: Build Admin Therapeutic Group APIs

### Objective

Tạo API CRUD cho danh mục `Nhóm điều trị` để phục vụ cả trang quản trị lẫn luồng tạo nhanh từ form thuốc.

### Tasks

1. Tạo `GET /api/admin/therapeutic-groups`
   - hỗ trợ search theo tên
   - hỗ trợ filter `active/all/inactive`
   - trả `drugCount`
   - trả đủ dữ liệu cho picker và trang quản trị
2. Tạo `POST /api/admin/therapeutic-groups`
   - nhận `name`
   - normalize
   - create nếu chưa có
   - re-activate nếu đang inactive
   - trả lại bản ghi hiện có nếu đã tồn tại active
3. Tạo `PATCH /api/admin/therapeutic-groups/[id]`
   - hỗ trợ đổi tên
   - hỗ trợ `isActive`
   - chặn rename thành tên đã tồn tại
4. Tạo `DELETE /api/admin/therapeutic-groups/[id]`
   - chỉ xóa khi `drugCount = 0`
   - trả lỗi nghiệp vụ rõ ràng nếu đang có thuốc tham chiếu
5. Áp dụng auth admin cho toàn bộ route

### Acceptance Criteria

- Admin có API riêng để quản trị danh mục
- Luồng tạo mới không tạo record trùng
- Luồng xóa không làm mất liên kết của thuốc hiện có

## Phase 5: Refactor Master Drugs APIs To Use Relation

### Objective

Đổi toàn bộ API `master-drugs` sang quan hệ `therapeuticGroupId` và loại bỏ phụ thuộc vào text legacy.

### Tasks

1. Trong `GET /api/admin/master-drugs`:
   - include `therapeuticGroup`
   - trả `therapeuticGroupId`
   - giữ tương thích các field khác
2. Trong `POST /api/admin/master-drugs`:
   - nhận `therapeuticGroupId`
   - validate ID nếu có
   - lưu `null` nếu không chọn
3. Trong `PATCH /api/admin/master-drugs/[id]`:
   - bỏ cập nhật `data: body` thô
   - map payload rõ ràng theo schema mới
   - validate `therapeuticGroupId`
4. Trong `DELETE` route:
   - không cần đổi nghiệp vụ, chỉ giữ compile compatibility nếu type schema đổi
5. Kiểm tra mọi response shape đang được frontend dùng trong `page.tsx`

### Acceptance Criteria

- API `master-drugs` không còn field `nhomDieuTri`
- Create/update chỉ lưu `therapeuticGroupId`
- Frontend nhận được `therapeuticGroup?.name` để hiển thị

## Phase 6: Rework Import And Export Around Catalog Names

### Objective

Giữ UX Excel theo tên tiếng Việt quen thuộc, nhưng persist qua `therapeuticGroupId`.

### Tasks

1. Cập nhật import route:
   - đọc cột `Nhóm điều trị`
   - nếu rỗng thì để `null`
   - nếu có giá trị thì normalize, find/create/re-activate danh mục
   - gán `therapeuticGroupId` cho `masterDrug`
2. Bổ sung thống kê import:
   - `createdTherapeuticGroups`
   - hoặc số lượng nhóm điều trị mới được tạo
3. Cập nhật export mapped route:
   - include `therapeuticGroup`
   - xuất `therapeuticGroup.name`
4. Cập nhật file mẫu ở frontend:
   - vẫn giữ cột `Nhóm điều trị`
   - đổi ví dụ từ text legacy sang tên nhóm chuẩn
5. Xác nhận import không tạo duplicate therapeutic groups trong một file có nhiều dòng cùng tên

### Acceptance Criteria

- Excel import/export vẫn dùng cột `Nhóm điều trị`
- Dữ liệu lưu vào DB theo relation thay vì text
- Kết quả import báo được số nhóm điều trị mới phát sinh

## Phase 7: Add Admin Catalog Page And Settings Navigation

### Objective

Đưa danh mục `Nhóm điều trị` vào luồng quản trị chính thức của admin.

### Tasks

1. Thêm mục `Danh mục nhóm điều trị` vào dropdown `Cài đặt` trong [DashboardLayout.tsx](/opt/sudungthuoc/sudungthuoc/src/components/DashboardLayout.tsx)
2. Tạo trang `/dashboard/admin/therapeutic-groups`
3. Dùng layout CRUD đang có trong repo:
   - form thêm/sửa nhanh
   - bảng danh sách
   - tìm kiếm
4. Thêm action:
   - thêm
   - sửa tên
   - ẩn
   - kích hoạt lại
5. Hiển thị:
   - tên nhóm điều trị
   - trạng thái
   - số thuốc đang dùng
   - cập nhật lần cuối
6. Không ưu tiên button xóa trên UI chính ở đợt đầu; nếu có thì chỉ hiện khi `drugCount = 0`

### Acceptance Criteria

- Admin có thể quản trị danh mục mà không phải đi qua form thuốc
- Navigation `Cài đặt` dẫn tới trang mới đúng như spec

## Phase 8: Replace `Nhóm điều trị` Input On Master Drugs Page

### Objective

Đổi ô nhập text hiện tại thành control tối ưu cho khoảng 80+ lựa chọn và vẫn tạo mới được tại chỗ.

### Tasks

1. Tạo component chuyên biệt `TherapeuticGroupPicker`
   - không mở rộng thành generic combobox framework-wide
   - chỉ phục vụ use case `Nhóm điều trị`
2. Component cần hỗ trợ:
   - input tìm kiếm
   - danh sách gợi ý cuộn được
   - chọn item
   - clear selection
   - action `Tạo nhóm điều trị mới`
3. Dữ liệu picker lấy từ API `therapeutic-groups`
4. Khi tạo mới thành công:
   - chọn ngay nhóm mới
   - cập nhật lại list local
5. Khi edit thuốc đang gắn nhóm inactive:
   - vẫn hiển thị tên hiện tại
   - không bắt load toàn bộ inactive list vào trải nghiệm chọn mới
6. Cập nhật table display ở `master-drugs` page sang `drug.therapeuticGroup?.name || "-"`
7. Cập nhật type `MasterDrug`, `INITIAL_FORM_DATA`, edit flow, submit flow, template examples

### Acceptance Criteria

- Người dùng không còn phải cuộn một dropdown dài để tìm `Nhóm điều trị`
- Tạo mới tại chỗ hoạt động trơn tru
- Form edit hiển thị đúng dữ liệu của bản ghi cũ

## Phase 9: Verification, Cleanup, And Rollout Safety

### Objective

Đảm bảo việc bỏ cột legacy và đổi sang relation mới không gây regression ở CRUD thuốc và Excel.

### Tasks

1. Chạy `prisma generate` và kiểm tra type errors ở các file bị tác động
2. Chạy lint hoặc kiểm tra TypeScript cho các file thay đổi nếu môi trường cho phép
3. Kiểm tra thủ công toàn luồng admin:
   - tạo nhóm điều trị
   - sửa tên
   - ẩn/kích hoạt lại
   - tạo thuốc mới
   - sửa thuốc cũ
   - import Excel
   - export mapped
4. Kiểm tra facility view `/dashboard/admin/master-drugs` ở chế độ read-only vẫn render được bảng
5. Kiểm tra không còn text `nhomDieuTri` trong runtime code
6. Ghi rõ trong closeout nếu có migration/manual step cần chạy riêng ở production

### Manual Verification Checklist

1. Chạy migration và xác nhận DB không còn cột `nhom_dieu_tri`
2. Mở `/dashboard/admin/therapeutic-groups`, tạo một nhóm mới
3. Sửa tên nhóm vừa tạo, xác nhận không sinh duplicate
4. Ẩn nhóm đó, xác nhận nhóm biến mất khỏi picker của form thuốc
5. Kích hoạt lại, xác nhận picker thấy lại nhóm
6. Mở `/dashboard/admin/master-drugs`, thêm một thuốc mới và chọn nhóm điều trị từ picker
7. Tạo một nhóm mới ngay trong form thuốc, xác nhận bản ghi được chọn ngay
8. Sửa một thuốc hiện có, đổi nhóm điều trị, xác nhận bảng hiển thị tên mới
9. Import file Excel có cột `Nhóm điều trị` với tên chưa tồn tại, xác nhận import thành công và danh mục tự được tạo
10. Xuất file mapped, xác nhận cột `Nhóm điều trị` xuất đúng tên danh mục

## Risks And Mitigations

- Risk: Drop cột `nhomDieuTri` quá sớm làm gãy code chưa refactor hết
  - Mitigation: search toàn repo theo `nhomDieuTri` trước merge và chỉ rollout khi compile sạch
- Risk: Không có combobox primitive sẵn khiến implementation UI phình scope
  - Mitigation: tạo component chuyên biệt `TherapeuticGroupPicker`, không generic hóa
- Risk: Tạo duplicate therapeutic groups từ import và form create
  - Mitigation: dồn logic normalize + upsert mềm vào helper backend dùng chung
- Risk: PATCH route tiếp tục ghi dư field UI phụ vào Prisma
  - Mitigation: thay bằng payload mapping tường minh

## Success Criteria

- Hệ thống không còn dùng `nhomDieuTri` ở schema, API, UI, import/export
- Admin có thể quản trị `Danh mục nhóm điều trị` từ dropdown `Cài đặt`
- Form `master-drugs` chọn được nhanh trong danh mục lớn và tạo mới ngay tại chỗ
- Import Excel tự tạo nhóm điều trị mới nhưng không tạo trùng
- Export và bảng danh sách thuốc tiếp tục hiển thị tên `Nhóm điều trị` đúng cho người dùng
