# Admin Mappings Server Pagination Design

## Context

Trang `/dashboard/admin/mappings` hiện gọi `GET /api/admin/mappings` để tải toàn bộ `facilityDrugMap`, sau đó mới gom nhóm theo cơ sở ở frontend cho hai tab `Chờ duyệt` và `Tổng hợp`.

Khi số cơ sở và số thuốc tăng lớn, cách này làm request nặng, render chậm, và modal chi tiết của từng cơ sở cũng phải giữ toàn bộ dữ liệu trong client memory.

## Goal

Chuyển màn `Duyệt ánh xạ thuốc` sang phân trang server-side với các yêu cầu:

- tab `Chờ duyệt` phân trang theo cơ sở, `10` cơ sở mỗi trang
- tab `Tổng hợp` phân trang theo cơ sở, `10` cơ sở mỗi trang
- modal `Xem cụ thể danh mục` và `Xem chi tiết` tải dữ liệu theo từng trang từ server
- giữ nguyên các thao tác duyệt, từ chối, duyệt tất cả, từ chối tất cả, và xóa lịch sử
- tránh tải toàn bộ mapping của tất cả cơ sở về frontend

## Recommendation

Tách riêng 2 endpoint đọc dữ liệu:

- `GET /api/admin/mappings/facilities`
- `GET /api/admin/mappings/facilities/[facilityCode]/details`

Lý do:

- tách rõ danh sách cơ sở và chi tiết của một cơ sở
- giữ nguyên `PATCH` và `DELETE` hiện có trong `src/app/api/admin/mappings/route.ts`
- frontend dễ quản lý state phân trang theo tab và theo modal
- phù hợp với hướng mở rộng sau này nếu cần thêm lọc hoặc tìm kiếm ở từng endpoint

## API Design

### 1. Danh sách cơ sở

File mới: `src/app/api/admin/mappings/facilities/route.ts`

Hỗ trợ query params:

- `tab`: `pending` hoặc `summary`
- `page`
- `limit`, mặc định `10`

Behavior:

- `pending` chỉ lấy các cơ sở có ít nhất một mapping `WAITING_APPROVAL`
- `summary` lấy tất cả cơ sở có mapping
- backend phân trang theo `cơ sở`, không phân trang theo từng mapping
- backend trả các chỉ số tổng hợp cần cho bảng:
  - `facilityCode`
  - `facilityName`
  - `pendingCount`
  - `approvedCount`
  - `rejectedCount`
  - `totalUploaded`
  - `successCount`
  - `lastRequestDate`
  - `lastApprovalDate`
  - `lastActivityDate`
- sort:
  - tab `pending`: theo `lastRequestDate` giảm dần
  - tab `summary`: theo `lastActivityDate` giảm dần

Response shape:

```json
{
  "items": [],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 0,
    "totalPages": 1
  }
}
```

Implementation note:

- ưu tiên query ở mức DB thay vì tải toàn bộ rồi `slice` trong memory
- backend sẽ dùng `groupBy` để xác định facility ids của trang hiện tại, sau đó dùng `transaction` lấy summary fields cho đúng page facility ids đó
- không dùng cách tải toàn bộ cơ sở khớp điều kiện rồi mới cắt trang ở server memory

### 2. Chi tiết mapping của một cơ sở

File mới: `src/app/api/admin/mappings/facilities/[facilityCode]/details/route.ts`

Hỗ trợ query params:

- `viewMode`: `pending` hoặc `all`
- `page`
- `limit`, mặc định `50`

Behavior:

- chỉ trả mappings của đúng một cơ sở
- `pending` chỉ trả mappings `WAITING_APPROVAL`
- `all` trả toàn bộ mappings của cơ sở
- include dữ liệu `masterDrug` như màn hiện tại cần
- sort theo `updatedAt` giảm dần
- trả metadata cơ sở để modal hiển thị tiêu đề và nút thao tác

Response shape:

```json
{
  "facility": {
    "facilityCode": "ABC",
    "facilityName": "Cơ sở A",
    "pendingCount": 0
  },
  "items": [],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 0,
    "totalPages": 1
  }
}
```

## Client Design

File tác động chính: `src/app/dashboard/admin/mappings/page.tsx`

- bỏ state `mappings` tải toàn bộ dữ liệu
- thêm state phân trang riêng cho:
  - tab `pending`
  - tab `summary`
- thêm state cho modal detail:
  - `detailItems`
  - `detailPage`
  - `detailTotal`
  - `detailTotalPages`
  - `detailFacility`
  - `isDetailLoading`
- khi đổi tab hoặc đổi trang, frontend gọi lại `GET /api/admin/mappings/facilities`
- khi mở modal, frontend gọi `GET /api/admin/mappings/facilities/[facilityCode]/details` với `page=1`
- khi đổi trang trong modal, frontend fetch lại dữ liệu detail từ server
- bảng ngoài giữ STT liên tục theo trang hiện tại:
  - trang 1 bắt đầu từ `1`
  - trang 2 bắt đầu từ `11`
- detail table cũng tính STT theo trang detail hiện tại

## Mutation Behavior

Giữ nguyên các endpoint hiện có:

- `PATCH /api/admin/mappings/[id]`
- `PATCH /api/admin/mappings`
- `DELETE /api/admin/mappings`

Sau các thao tác:

- duyệt một mapping
- từ chối một mapping
- duyệt tất cả
- từ chối tất cả
- xóa lịch sử

frontend cần:

- refetch lại tab đang mở
- nếu modal đang mở, refetch lại trang detail hiện tại
- nếu số trang giảm sau mutation, tự clamp về trang hợp lệ cuối cùng

## Database Notes

Để giảm chi phí query khi dữ liệu tăng lớn, bổ sung index cho `FacilityDrugMap`:

- `@@index([facilityId, updatedAt])`
- `@@index([status, facilityId, createdAt])`
- `@@index([facilityId, status, updatedAt])`

Mục tiêu là tối ưu cho:

- thống kê theo cơ sở
- lọc `WAITING_APPROVAL`
- lấy detail theo cơ sở và trạng thái

## Error Handling

- endpoint mới vẫn kiểm tra `ADMIN` như route hiện tại
- query params không hợp lệ sẽ fallback về:
  - `page = 1`
  - `limit = 10` cho danh sách cơ sở
  - `limit = 50` cho detail
- nếu `facilityCode` không tồn tại, detail endpoint trả `404`
- khi fetch lỗi, frontend giữ toast lỗi ngắn gọn và không làm hỏng state tab còn lại

## Testing Plan

Kiểm tra thủ công:

1. Tab `Chờ duyệt` có trên `10` cơ sở thì phân trang đúng, mỗi trang tối đa `10` cơ sở.
2. Tab `Tổng hợp` có trên `10` cơ sở thì phân trang đúng, mỗi trang tối đa `10` cơ sở.
3. STT ở hai tab chạy liên tục theo trang.
4. Mở `Xem cụ thể danh mục`, modal tải trang đầu từ server và chuyển trang được.
5. Mở `Xem chi tiết`, modal tải trang đầu từ server và chuyển trang được.
6. Duyệt hoặc từ chối một dòng trong modal, dữ liệu tab và modal cập nhật lại đúng.
7. Duyệt tất cả hoặc từ chối tất cả, số cơ sở trong tab `Chờ duyệt` giảm đúng và page được clamp đúng nếu cần.
8. Xóa lịch sử ở tab `Tổng hợp`, số lượng dòng và số trang cập nhật đúng.
