# Admin Master Drugs ATC Code Implementation Plan

## Inputs

Plan này dựa trên:

- Spec đã duyệt: [2026-06-19-admin-master-drugs-atc-code-design.md](/opt/sudungthuoc/sudungthuoc/docs/superpowers/specs/2026-06-19-admin-master-drugs-atc-code-design.md)
- Prisma schema hiện tại: [schema.prisma](/opt/sudungthuoc/sudungthuoc/prisma/schema.prisma)
- Admin master drugs page hiện tại: [page.tsx](/opt/sudungthuoc/sudungthuoc/src/app/dashboard/admin/master-drugs/page.tsx)
- Master drugs table config hiện tại: [master-drugs-config.ts](/opt/sudungthuoc/sudungthuoc/src/components/master-drugs/master-drugs-config.ts)
- Master drugs table hiện tại: [MasterDrugsTable.tsx](/opt/sudungthuoc/sudungthuoc/src/components/master-drugs/MasterDrugsTable.tsx)
- Master drugs APIs hiện tại:
  - [route.ts](/opt/sudungthuoc/sudungthuoc/src/app/api/admin/master-drugs/route.ts)
  - [[id]/route.ts](/opt/sudungthuoc/sudungthuoc/src/app/api/admin/master-drugs/[id]/route.ts)
  - [import/route.ts](/opt/sudungthuoc/sudungthuoc/src/app/api/admin/master-drugs/import/route.ts)
  - [export-mapped/route.ts](/opt/sudungthuoc/sudungthuoc/src/app/api/admin/master-drugs/export-mapped/route.ts)

## Goal

Triển khai `Mã ATC` như một field chuẩn mới của `MasterDrug`, tương đương phạm vi vận hành của `Mã BHYT`:

- lưu DB bằng `maAtc` / `ma_atc`
- nhập và sửa trong form admin
- hiển thị thành cột trước `Mã BHYT`
- lọc theo cột
- tìm kiếm tổng và tìm kiếm theo field
- import từ Excel
- export ra Excel trước `Mã BHYT`

## Delivery Principles

- Bám pattern hiện có của `maBhyt`; không tạo abstraction mới cho một field đơn lẻ.
- Không validate ATC theo từ điển ngoài.
- Không đặt unique constraint cho `maAtc`.
- Không backfill dữ liệu cũ.
- Không refactor lớn `page.tsx`; chỉ thêm các đoạn cần thiết.
- Không tự ý sửa các thay đổi unrelated đang có trong worktree.

## Current Constraints

- `MasterDrug` hiện chưa có `maAtc`, nên cần migration và regenerate Prisma client.
- Trang admin master-drugs map nhiều field thủ công trong state, form edit, import, table, filter và dropdown search.
- Bảng dùng render explicit từng cột trong `MasterDrugsTable.tsx`; cần thêm đủ header, filter row và body cell để tránh lệch cột.
- `COLUMN_FILTER_FIELDS` là nguồn query serialization cho filter theo cột; bỏ sót `maAtc` sẽ làm UI lọc nhưng API không nhận.
- Search dropdown trong `page.tsx` dùng hard-code `SelectItem`, không tự sinh từ config.
- Export mapped hiện map object Excel thủ công; vị trí cột phụ thuộc thứ tự key.

## Target File Structure

### Database

- `prisma/schema.prisma`
- `prisma/migrations/<timestamp>_add_master_drug_atc_code/migration.sql`
- generated Prisma client files if the repo workflow updates them

### Frontend

- `src/components/master-drugs/master-drugs-config.ts`
- `src/components/master-drugs/MasterDrugsTable.tsx`
- `src/app/dashboard/admin/master-drugs/page.tsx`

### Backend

- `src/app/api/admin/master-drugs/route.ts`
- `src/app/api/admin/master-drugs/[id]/route.ts`
- `src/app/api/admin/master-drugs/import/route.ts`
- `src/app/api/admin/master-drugs/export-mapped/route.ts`

### Docs

- [2026-06-19-admin-master-drugs-atc-code-design.md](/opt/sudungthuoc/sudungthuoc/docs/superpowers/specs/2026-06-19-admin-master-drugs-atc-code-design.md)
- [2026-06-19-admin-master-drugs-atc-code-implementation-plan.md](/opt/sudungthuoc/sudungthuoc/docs/superpowers/plans/2026-06-19-admin-master-drugs-atc-code-implementation-plan.md)

## Phase Breakdown

## Phase 1: Add Database Field And Prisma Types

### Objective

Thêm `maAtc` vào data model một cách nullable, không ảnh hưởng dữ liệu hiện có.

### Tasks

1. Thêm field vào `model MasterDrug`:
   - `maAtc String? @map("ma_atc")`
   - đặt ngay sau `maBhyt` để cùng nhóm mã định danh.
2. Tạo migration `add_master_drug_atc_code`.
3. Migration SQL thêm cột nullable:
   - `ALTER TABLE "master_drugs" ADD COLUMN "ma_atc" TEXT;`
4. Regenerate Prisma client theo workflow repo.
5. Kiểm tra generated type có `maAtc`.

### Acceptance Criteria

- `prisma/schema.prisma` có `maAtc`.
- Migration không yêu cầu backfill và không lock logic ngoài cần thiết.
- Prisma client compile được với các references `maAtc`.

## Phase 2: Extend Master Drug API Contract

### Objective

Đảm bảo API tạo/sửa/lấy danh sách hiểu `maAtc` giống `maBhyt`.

### Tasks

1. Trong collection route:
   - thêm `maAtc` vào `MASTER_DRUG_OPTIONAL_STRING_FIELDS`
   - thêm `maAtc` vào `MASTER_DRUG_SEARCHABLE_FIELDS`
   - thêm `maAtc` vào `MASTER_DRUG_TEXT_FILTER_FIELDS`
   - thêm `{ maAtc: { contains: search, mode: "insensitive" } }` vào search `ALL`
2. Trong update route:
   - thêm `maAtc` vào `MASTER_DRUG_OPTIONAL_STRING_FIELDS`
3. Giữ nguyên normalization:
   - string trim có nội dung thì lưu
   - rỗng hoặc không phải string thì `null`
4. Không thêm validation, không đổi lỗi hiện có.

### Acceptance Criteria

- POST tạo thuốc có `maAtc`.
- PATCH cập nhật hoặc clear `maAtc`.
- GET trả `maAtc`.
- `searchField=maAtc` hoạt động.
- `searchField=ALL` tìm được theo ATC.
- Query param `maAtc=<text>` lọc theo contains insensitive.

## Phase 3: Update Central Table Config And Filter State

### Objective

Đưa `maAtc` vào các nguồn cấu hình chung để table, visibility và filter hoạt động đồng bộ.

### Tasks

1. Thêm `maAtc: string | null` vào interface `MasterDrug`.
2. Thêm cột:
   - id `maAtc`
   - label `Mã ATC`
   - `required: false`
   - `defaultVisible: true`
   - đặt trước `maBhyt`
3. Thêm `maAtc` vào `COLUMN_FILTER_FIELDS`, trước `maBhyt`.
4. Thêm mapping `maAtc: "maAtc"` vào `COLUMN_FILTER_KEY_BY_COLUMN_ID`.
5. Thêm `maAtc: ""` vào `createEmptyColumnFilters`.
6. Không thêm vào `WRAPPABLE_COLUMN_CONFIG` vì mã ngắn và dùng code style.

### Acceptance Criteria

- `Mã ATC` xuất hiện trong menu `Hiển thị`.
- Filter state có key `maAtc`.
- Ẩn cột `Mã ATC` xóa filter của cột theo logic hiện có.

## Phase 4: Render ATC Column In Table

### Objective

Hiển thị `Mã ATC` trước `Mã BHYT` ở cả header, filter row và body.

### Tasks

1. Trong `MasterDrugsTable.tsx`, thêm header `Mã ATC` trước header `Mã BHYT`.
2. Thêm filter input:
   - value `columnFiltersDraft.maAtc`
   - onChange `onColumnFilterChange("maAtc", ...)`
   - placeholder `Lọc...`
3. Thêm body cell:
   - value `drug.maAtc`
   - `codeStyle`
   - content width tương tự `Mã BHYT`
4. Giữ `isColumnVisible("maAtc")` ở cả ba vị trí.
5. Không thay đổi sticky column `Hoạt chất`.

### Acceptance Criteria

- Header, filter row và body không lệch cột.
- `Mã ATC` đứng ngay trước `Mã BHYT`.
- Empty state `colSpan` vẫn đúng nhờ `TABLE_COLUMNS`.

## Phase 5: Update Admin Page Form, Search, And Import Mapping

### Objective

Cho admin nhập, sửa, tìm và import `Mã ATC` từ UI chính.

### Tasks

1. Thêm `maAtc: ""` vào `INITIAL_FORM_DATA`, đặt trước `maBhyt`.
2. Trong `handleEdit`, set `maAtc: drug.maAtc || ""`.
3. Thêm input `Mã ATC` trong nhóm `Thông tin cơ bản`, trước input `Mã BHYT`.
4. Điều chỉnh grid cơ bản nếu cần để hai mã không làm layout chật:
   - ưu tiên giữ `Mã chung`, `Mã ATC`, `Mã BHYT` trong cùng khu vực
   - không tăng độ phức tạp modal
5. Trong import client mapping, thêm:
   - `maAtc: row["Mã ATC"] || row["maAtc"] || row["MaATC"]`
6. Trong search field dropdown, thêm:
   - `<SelectItem value="maAtc">Mã ATC</SelectItem>`
   - đặt trước `Mã BHYT`
7. Không đổi payload submit riêng nếu form đang gửi toàn bộ `formData`.

### Acceptance Criteria

- Tạo mới thuốc nhập được `Mã ATC`.
- Sửa thuốc load lại đúng `Mã ATC`.
- Search dropdown có `Mã ATC`.
- Import client gửi `maAtc` lên API.

## Phase 6: Update Import And Export APIs

### Objective

Đảm bảo Excel import/export bảo toàn `Mã ATC`.

### Tasks

1. Trong import API, thêm `maAtc: drug.maAtc ? String(drug.maAtc) : null` khi create.
2. Trong export mapped API, thêm key `"Mã ATC": drug.maAtc || ""`.
3. Đặt `"Mã ATC"` ngay trước `"Mã BHYT"` trong object export.
4. Đảm bảo query export select/findMany trả được `maAtc` nếu route dùng `select`.

### Acceptance Criteria

- File Excel import có `Mã ATC` tạo record đúng.
- File export có cột `Mã ATC` trước `Mã BHYT`.
- Blank ATC export thành chuỗi rỗng.

## Phase 7: Verification

### Objective

Kiểm tra compile, lint và các workflow chính của field mới.

### Tasks

1. Chạy migration/generate theo môi trường local:
   - `npx prisma migrate dev`
   - `npx prisma generate`
2. Chạy type-check:
   - `npx tsc --noEmit`
3. Chạy lint:
   - `npm run lint`
4. Manual verification trên `/dashboard/admin/master-drugs`:
   - thấy `Mã ATC` trước `Mã BHYT`
   - ẩn/hiện được `Mã ATC`
   - lọc cột `Mã ATC`
   - search tổng theo ATC
   - search field `Mã ATC`
   - tạo mới có `Mã ATC`
   - sửa `Mã ATC`
   - clear `Mã ATC`
   - import Excel có `Mã ATC`
   - export mapped có `Mã ATC` trước `Mã BHYT`

### Acceptance Criteria

- Type-check pass.
- Lint pass hoặc mọi lỗi còn lại được xác định là unrelated, có ghi chú rõ.
- Các workflow manual chính pass.

## Risk Notes

- Worktree hiện có nhiều thay đổi unrelated. Trước khi implement cần kiểm tra kỹ `git status` và chỉ chạm các file trong scope.
- Generated Prisma client có thể đã bị modified sẵn. Khi regenerate, cần phân biệt thay đổi do task này với thay đổi tồn tại trước đó.
- Nếu môi trường không kết nối được DB, migration dev có thể không chạy được; khi đó tạo migration SQL thủ công và ghi rõ bước chưa verify DB.
- Nếu import/export có thêm route khác ngoài `export-mapped`, chỉ mở rộng route liên quan đến master-drugs hiện đang xuất `Mã BHYT`.

## Implementation Checklist

- [ ] Add `maAtc` to Prisma schema and migration.
- [ ] Regenerate Prisma client.
- [ ] Extend collection API search/filter/create.
- [ ] Extend item API update.
- [ ] Extend import API.
- [ ] Extend export mapped API.
- [ ] Extend master-drugs config.
- [ ] Extend table render.
- [ ] Extend admin page form/search/import mapping.
- [ ] Run automated checks.
- [ ] Perform manual checks.

## Self Review

Plan này không có placeholder. Tên field thống nhất là `maAtc`, database column là `ma_atc`, label UI/Excel là `Mã ATC`. Thứ tự cột và export đều đặt `Mã ATC` trước `Mã BHYT`, đúng với spec đã duyệt.
