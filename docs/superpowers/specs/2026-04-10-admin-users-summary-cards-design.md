# Thiết kế thẻ thống kê trên trang Quản lý Users

## Bối cảnh

Trang `/dashboard/admin/users` hiện hiển thị phần tiêu đề, nút `Thêm cơ sở`, bộ lọc tìm kiếm và bảng danh sách cơ sở phân trang. Người dùng cần thêm một dãy thẻ thống kê để thể hiện nhanh số lượng cơ sở theo toàn bộ dữ liệu hệ thống, không phụ thuộc bộ lọc hay phân trang hiện tại.

## Phạm vi

Chỉ thay đổi trang admin `Quản lý Users` và API danh sách users hiện có:

- Mở rộng `GET /api/admin/users` để trả thêm số liệu tổng hợp trong `metadata.summary`.
- Hiển thị 6 thẻ thống kê ngay dưới phần tiêu đề của trang `Quản lý Users`.
- Giữ nguyên bảng danh sách, bộ lọc, phân trang và các thao tác hiện có.

Không tạo endpoint mới. Không thay đổi logic tìm kiếm hoặc phân trang hiện tại.

## Dữ liệu thống kê cần hiển thị

Tất cả số liệu đều tính trên toàn bộ bản ghi `User` có `role = FACILITY` trong hệ thống:

1. `Số lượng cơ sở`
2. `Số lượng Bệnh viện trực thuộc Bộ/Ngành`
3. `Số lượng Trung tâm y tế khu vực trực thuộc`
4. `Số lượng Bệnh viện tư nhân`
5. `Số lượng cơ sở tự chủ Nhóm 2`
6. `Số lượng cơ sở tự chủ Nhóm 3`

Quy tắc đếm:

- `Số lượng cơ sở`: tổng số user FACILITY.
- 3 thẻ loại cơ sở: đếm theo `facilityType`.
- 2 thẻ tự chủ: đếm theo `autonomyGroup`.

## Thiết kế API

Giữ nguyên response hiện tại của `GET /api/admin/users` và bổ sung:

```ts
metadata: {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  summary: {
    totalFacilities: number;
    ministryHospitals: number;
    regionalMedicalCenters: number;
    privateHospitals: number;
    autonomyGroup2: number;
    autonomyGroup3: number;
  };
}
```

Yêu cầu xử lý:

- Phần `data` vẫn trả theo filter, paging như hiện tại.
- Phần `summary` luôn tính theo toàn bộ FACILITY, không bị ảnh hưởng bởi `searchField`, `searchTerm`, `page`, `limit`.
- Có thể gom bằng `groupBy` hoặc `count`, miễn đảm bảo dễ đọc và ít truy vấn dư thừa.

## Thiết kế giao diện

Vị trí:

- Dãy thẻ đặt ngay dưới khối tiêu đề trang `Quản lý Cơ sở`.
- Nằm trước card `Danh sách cơ sở`.

Bố cục:

- Hiển thị 6 thẻ trên một hàng.
- Để giữ đúng yêu cầu “trên 1 dòng”, dãy thẻ được bọc trong vùng `overflow-x-auto`.
- Mỗi thẻ có chiều rộng tối thiểu cố định để không vỡ bố cục trên màn hình hẹp.

Nội dung mỗi thẻ:

- Dòng nhãn mô tả ngắn.
- Dòng số liệu nổi bật với cỡ chữ lớn hơn.

Phong cách:

- Bám theo thẻ/card hiện có của trang.
- Dùng nền sáng, border nhẹ, đổ bóng vừa phải.
- Không thêm animation hoặc tương tác phức tạp.

## Trạng thái tải và lỗi

- Khi trang đang tải users lần đầu, khu vực thẻ dùng cùng trạng thái loading hiện có và hiển thị skeleton hoặc placeholder đơn giản.
- Nếu request lỗi, giữ hành vi toast lỗi hiện có; khu vực thẻ không tự thêm luồng lỗi riêng.

## Kiểm thử

1. Mở trang `/dashboard/admin/users`, xác nhận xuất hiện 6 thẻ dưới tiêu đề.
2. Đối chiếu số trên thẻ `Số lượng cơ sở` với tổng số FACILITY trong hệ thống.
3. Tạo hoặc sửa một user có `facilityType = Bệnh viện trực thuộc Bộ/Ngành`, reload trang, xác nhận thẻ tương ứng tăng đúng.
4. Tạo hoặc sửa một user có `facilityType = Trung tâm y tế khu vực trực thuộc`, reload trang, xác nhận thẻ tương ứng tăng đúng.
5. Tạo hoặc sửa một user có `facilityType = Bệnh viện tư nhân`, reload trang, xác nhận thẻ tương ứng tăng đúng.
6. Tạo hoặc sửa một user có `autonomyGroup = Nhóm 2` hoặc `Nhóm 3`, reload trang, xác nhận thẻ tương ứng tăng đúng.
7. Áp dụng tìm kiếm hoặc đổi trang, xác nhận số trên các thẻ không thay đổi theo bộ lọc.
