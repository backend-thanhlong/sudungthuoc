# Facility Reports Detail Table Implementation Plan

## Inputs

Plan này dựa trên:

- Spec đã chốt: [2026-04-06-facility-reports-detail-table-design.md](/opt/sudungthuoc/sudungthuoc/docs/superpowers/specs/2026-04-06-facility-reports-detail-table-design.md)
- UI hiện tại: [page.tsx](/opt/sudungthuoc/sudungthuoc/src/app/dashboard/facility/reports/page.tsx)
- API detail hiện tại: [route.ts](/opt/sudungthuoc/sudungthuoc/src/app/api/facility/reports/detail/route.ts)
- Pattern tham chiếu: [page.tsx](/opt/sudungthuoc/sudungthuoc/src/app/dashboard/admin/reports/page.tsx)
- Pattern tham chiếu API: [route.ts](/opt/sudungthuoc/sudungthuoc/src/app/api/admin/reports/detail/route.ts)

## Goal

Triển khai modal `Xem chi tiết` đầy đủ dữ liệu cho route `/dashboard/facility/reports`:

- hiển thị bảng detail rộng, gần giống màn admin
- hỗ trợ tìm kiếm theo trường
- hỗ trợ phân trang server-side
- không làm ảnh hưởng các luồng `Tải mẫu`, `Preview dữ liệu`, `Nộp báo cáo`, và `Lịch sử báo cáo`

## Delivery Principles

- Không thay đổi schema Prisma
- Không thay đổi logic upload hoặc validation báo cáo
- Bám sát pattern detail của màn admin để giảm rủi ro
- Giữ thay đổi tập trung trong route detail facility và modal detail facility
- Không mở rộng scope sang shared component hoặc refactor màn admin
- Không đổi contract của các API facility khác ngoài `/api/facility/reports/detail`

## Current Constraints

- Modal detail facility hiện chỉ tải một mảng dữ liệu đơn giản và render bảng rút gọn
- Route detail facility chưa hỗ trợ `page`, `limit`, `searchField`, `searchTerm`
- Client page facility hiện chưa có state riêng cho tìm kiếm và phân trang detail
- Repo hiện có sẵn pattern tìm kiếm và phân trang ở màn admin, có thể tái dùng về mặt logic nhưng không nên kéo theo refactor lớn

## Target File Structure

### Frontend

- `src/app/dashboard/facility/reports/page.tsx`

### Backend

- `src/app/api/facility/reports/detail/route.ts`

### Docs

- `docs/superpowers/specs/2026-04-06-facility-reports-detail-table-design.md`
- `docs/superpowers/plans/2026-04-06-facility-reports-detail-table-implementation-plan.md`

## Phase Breakdown

## Phase 1: Align Facility Detail API Contract

### Objective

Nâng cấp route detail facility để trả về contract có phân trang và đủ dữ liệu cho bảng full-detail.

### Tasks

1. Mở rộng route [`route.ts`](/opt/sudungthuoc/sudungthuoc/src/app/api/facility/reports/detail/route.ts) để nhận:
   - `month`
   - `page`
   - `limit`
   - `searchField`
   - `searchTerm`
2. Thêm danh sách field tìm kiếm được hỗ trợ, bám sát màn admin:
   - `all`
   - `maNoiBo`
   - `tenThuocNoiBo`
   - `hoatChatNoiBo`
   - `soDangKyNoiBo`
   - `maChung`
   - `maBhyt`
   - `tenThuoc`
   - `hoatChat`
   - `soDangKy`
   - `soQdTrungThau`
   - `tenCongTy`
3. Thêm helper build search clause theo `searchField` và `searchTerm`
4. Giữ điều kiện bảo mật:
   - chỉ cho `FACILITY`
   - luôn filter theo `session.user.id`
   - luôn filter theo `reportMonth`
5. Đổi query sang flow:
   - `count` tổng số dòng sau khi lọc
   - tính `totalPages`
   - chuẩn hóa `safePage`
   - `findMany` với `skip/take`
6. Mở rộng mapping dữ liệu output để trả đủ các trường cần render trong modal
7. Đổi response shape từ mảng sang:

```json
{
  "items": [],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 0,
    "totalPages": 1
  }
}
```

### Acceptance Criteria

- Route detail facility nhận và xử lý được query tìm kiếm/phân trang
- Route chỉ trả dữ liệu của facility hiện tại
- Output có đầy đủ dữ liệu cần cho bảng full-detail
- Output pagination ổn định khi không có dữ liệu hoặc khi page vượt tổng số trang

## Phase 2: Refactor Detail State In Facility Page

### Objective

Chuẩn hóa state detail trong client page để modal có thể quản lý độc lập việc mở, tìm kiếm, phân trang và loading.

### Tasks

1. Trong [`page.tsx`](/opt/sudungthuoc/sudungthuoc/src/app/dashboard/facility/reports/page.tsx), bổ sung state:
   - `detailData`
   - `detailPage`
   - `detailTotal`
   - `detailTotalPages`
   - `detailSearchField`
   - `detailAppliedSearchField`
   - `detailSearchInput`
   - `detailSearchTerm`
   - `isDetailLoading`
2. Tạo hằng số `DETAIL_PAGE_SIZE = 50`
3. Tạo hàm fetch detail chung, ví dụ `fetchDetailPage(month, page, search)`
4. Khi mở modal:
   - reset search state
   - reset page về `1`
   - xóa dữ liệu cũ
   - gọi API cho trang đầu tiên
5. Khi đóng modal:
   - reset toàn bộ state detail để lần mở sau sạch trạng thái

### Acceptance Criteria

- Detail state tách biệt khỏi các state upload/preview hiện có
- Mở modal mới luôn bắt đầu từ trạng thái mặc định
- Không còn phụ thuộc vào contract cũ trả về mảng thuần

## Phase 3: Add Search And Pagination Controls

### Objective

Bổ sung hành vi tìm kiếm và phân trang trong modal detail theo đúng spec đã chốt.

### Tasks

1. Thêm form tìm kiếm phía trên bảng:
   - `Select` chọn field
   - `Input` nhập từ khóa
   - nút `Tìm kiếm`
   - nút `Đặt lại`
2. Thêm danh sách field tìm kiếm hiển thị cho người dùng
3. Cài hành vi submit:
   - lấy `detailSearchInput.trim()`
   - gán sang `detailSearchTerm`
   - gán `detailAppliedSearchField`
   - reset `detailPage = 1`
   - gọi API
4. Cài hành vi reset:
   - đưa field về `all`
   - xóa input và term
   - reset page về `1`
   - gọi API mặc định
5. Cài hành vi đổi trang:
   - giữ nguyên bộ lọc đang áp dụng
   - gọi API với page mới
6. Render text trạng thái:
   - `Hiển thị X-Y / Z dòng`
   - `Trang A / B`

### Acceptance Criteria

- Người dùng có thể tìm và đổi trang ngay trong modal
- Sau khi tìm kiếm, phân trang vẫn giữ đúng bộ lọc
- `Đặt lại` đưa modal về trạng thái mặc định

## Phase 4: Replace Compact Table With Full Detail Table

### Objective

Thay bảng rút gọn hiện tại bằng bảng đầy đủ dữ liệu, bám sát pattern của admin nhưng chỉ giữ tab `Dữ liệu báo cáo`.

### Tasks

1. Nâng kích thước `DialogContent` lên layout rộng, ví dụ `95vw x 90vh`
2. Thay bảng hiện tại bằng bảng full-detail có các nhóm cột:
   - thuốc nội bộ
   - danh mục chung
   - số liệu báo cáo
   - thông tin hợp đồng
3. Dùng nền màu nhạt theo nhóm cột để tăng khả năng đọc
4. Dùng `overflow-auto` cho vùng bảng để hỗ trợ cuộn ngang
5. Dùng `sticky header` cho phần đầu bảng
6. Render đầy đủ các field:
   - nội bộ: `maNoiBo`, `tenThuocNoiBo`, `hoatChatNoiBo`, `soDangKyNoiBo`, `donViTinhNoiBo`
   - danh mục chung: `maChung`, `maBhyt`, `tenThuoc`, `hoatChat`, `hamLuong`, `dangBaoChe`, `soDangKy`, `donViTinh`, `quyCach`, `duongDung`, `congTySanXuat`, `nuocSanXuat`, `congTyDangKy`, `nhomThuoc`
   - số liệu báo cáo: `tonDau`, `nhap`, `xuat`, `tonCuoi`, `giaVat`, `thanhTienTonCuoi`
   - hợp đồng: `soQdTrungThau`, `tenCongTy`, `ngayBatDauHd`, `ngayKetThucHd`, `bhyt`, `dichVu`
7. Chuẩn hóa cách render giá trị rỗng bằng dấu `—`
8. Giữ format số bằng `Intl.NumberFormat("vi-VN")`

### Acceptance Criteria

- Modal hiển thị gần đầy đủ dữ liệu như màn admin
- Bảng vẫn đọc được khi số cột nhiều
- Không còn thiếu dữ liệu quan trọng khi người dùng kiểm tra báo cáo

## Phase 5: Empty, Loading, Error, And Regression Guardrails

### Objective

Hoàn thiện các trạng thái UI và giảm rủi ro regression lên các luồng đang chạy ổn.

### Tasks

1. Giữ spinner khi đang tải detail
2. Thêm empty state riêng cho:
   - không có dữ liệu detail
   - không có kết quả sau tìm kiếm
3. Giữ toast lỗi khi fetch thất bại và không tự đóng modal
4. Rà soát để không làm ảnh hưởng:
   - `handleDownloadTemplate`
   - `handleFileSelect`
   - `handleUploadReport`
   - bảng `Preview dữ liệu`
   - bảng `Lịch sử báo cáo`
5. Kiểm tra các lần chuyển `selectedMonth` không làm kẹt state detail cũ

### Acceptance Criteria

- Loading / empty / error state đều rõ ràng
- Các tính năng ngoài modal detail không bị đổi hành vi

## Phase 6: Verification And Cleanup

### Objective

Xác nhận feature chạy đúng theo spec và dọn logic thừa của contract cũ.

### Tasks

1. Kiểm tra lại mọi chỗ trong client đang giả định API detail trả về mảng
2. Xóa logic hoặc comment không còn phù hợp với contract cũ
3. Chạy `eslint` nếu phạm vi thay đổi chạm vào rule formatting/lint
4. Manual test theo checklist bên dưới

### Manual Verification Checklist

1. Mở `/dashboard/facility/reports`
2. Trong `Lịch sử báo cáo`, bấm `Xem chi tiết`
3. Xác nhận modal mở rộng và hiển thị bảng đầy đủ nhóm cột
4. Xác nhận tháng báo cáo và tổng số dòng hiển thị đúng
5. Tìm kiếm với `Tất cả trường`, xác nhận kết quả đúng
6. Tìm kiếm theo `Mã nội bộ`, xác nhận chỉ lọc theo field đó
7. Tìm kiếm theo `Tên công ty`, xác nhận field hợp đồng hoạt động
8. Chuyển trang sau khi tìm kiếm, xác nhận bộ lọc giữ nguyên
9. Bấm `Đặt lại`, xác nhận về trang 1 và hiện dữ liệu mặc định
10. Tìm với từ khóa không khớp, xác nhận empty state đúng
11. Đóng modal rồi mở lại, xác nhận state detail được reset
12. Nộp thử báo cáo hoặc mở preview cũ, xác nhận các luồng khác không bị ảnh hưởng

### Acceptance Criteria

- Modal detail facility đạt đúng spec
- Không có regression rõ ràng ở luồng báo cáo hiện có
- `eslint` pass nếu được chạy

## Recommended Execution Order

Thứ tự triển khai nên là:

1. Phase 1
2. Phase 2
3. Phase 3
4. Phase 4
5. Phase 5
6. Phase 6

Nếu muốn giảm rủi ro hơn, chia làm 2 commit logic:

### Commit 1

- nâng cấp route `/api/facility/reports/detail`
- refactor state detail trong page facility
- thêm search + pagination controls

### Commit 2

- thay bảng rút gọn bằng full-detail table
- hoàn thiện empty/loading/error states
- verification và cleanup

## Risks And Mitigations

### Risk 1: Lệch logic giữa facility detail và admin detail

Mitigation:

- tái dùng pattern field list, search mapping và pagination từ route admin
- chỉ khác phần auth và filter `facilityId` lấy từ session

### Risk 2: Contract API mới làm vỡ client cũ

Mitigation:

- đổi client facility và route facility trong cùng rollout
- rà soát toàn bộ chỗ gọi `/api/facility/reports/detail`

### Risk 3: Modal quá nặng hoặc khó đọc vì nhiều cột

Mitigation:

- dùng `sticky header`
- dùng cuộn ngang trong vùng bảng
- chia nhóm cột bằng màu nền
- giữ page size ở `50`

### Risk 4: Search state bị lệch khi đổi trang

Mitigation:

- tách `detailSearchInput` và `detailSearchTerm`
- khi đổi trang chỉ dùng `detailAppliedSearchField` và `detailSearchTerm`

### Risk 5: Regression lên luồng upload/preview

Mitigation:

- giữ thay đổi trong phần detail modal và route detail
- manual test lại toàn bộ luồng báo cáo sau khi hoàn tất
