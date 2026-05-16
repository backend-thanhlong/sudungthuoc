# Thiết kế: Modal rà soát thuốc trùng tại `/dashboard/admin/master-drugs`

## Bối cảnh

Trang `/dashboard/admin/master-drugs` hiện đã có:

- bảng danh mục dùng chung với phân trang server-side
- bộ lọc theo cột, trong đó có thể lọc theo `Số đăng ký`
- cảnh báo `Số đăng ký trùng` phía trên bảng
- nút `Xóa dòng trùng` để hệ thống tự động xóa các dòng trùng có thể xóa an toàn
- API phát hiện nhóm trùng theo `Số đăng ký`
- API xóa các dòng trùng tự động theo `Số đăng ký`, `Tên thuốc`, `Hàm lượng`
- API xóa nhiều thuốc đã chọn

Vấn đề hiện tại là admin thấy cảnh báo trùng nhưng muốn xử lý từng thuốc thì phải lấy `Số đăng ký`, lọc bảng, tìm dòng, xóa, rồi quay lại nhóm tiếp theo. Luồng này chậm khi có nhiều nhóm trùng.

## Mục tiêu

Cho phép admin rà soát và xóa từng thuốc trùng nhanh trong một modal riêng, không phải lọc bảng chính thủ công.

Admin cần:

- mở một modal riêng từ trang danh mục thuốc
- xem các nhóm `Số đăng ký` trùng
- mở từng nhóm để xem các dòng thuốc thuộc nhóm đó
- xóa từng dòng thuốc ngay trong modal
- vẫn giữ nguyên nút `Xóa dòng trùng` hiện tại để xử lý tự động khi cần

## Không thuộc phạm vi

- thay đổi logic tự động của nút `Xóa dòng trùng`
- tự chọn dòng nên giữ trong modal
- gộp dữ liệu từ thuốc bị xóa sang thuốc được giữ
- lọc client-side toàn bộ bảng chính
- thay đổi schema database
- xóa bắt buộc các thuốc đang có liên kết dữ liệu

## Phương án đã chọn

Thêm modal lớn tên `Rà soát thuốc trùng`.

Trang chính vẫn giữ cảnh báo và nút `Xóa dòng trùng`. Cảnh báo trùng bổ sung nút `Rà soát thuốc trùng`. Khi bấm, admin mở modal gần fullscreen để xử lý từng nhóm.

Lý do chọn phương án này:

- tách rõ luồng rà soát khỏi bảng chính
- không làm cảnh báo hiện tại quá dài
- giảm số click so với lọc bảng thủ công
- vẫn giữ thao tác xóa tự động hiện có cho admin muốn xử lý nhanh

## Thiết kế UX

### Entry point

Tại khối cảnh báo `Số đăng ký trùng`, thêm nút:

- `Rà soát thuốc trùng`

Nút này chỉ hiển thị khi:

- người dùng là admin
- có ít nhất một nhóm `Số đăng ký` trùng

Nút `Xóa dòng trùng` hiện tại được giữ nguyên.

### Modal

Modal dùng kích thước lớn, ưu tiên gần fullscreen trên desktop:

- chiều rộng tối đa khoảng `90vw`
- chiều cao tối đa khoảng `85vh`
- phần danh sách cuộn trong thân modal
- header và footer cố định để admin luôn thấy tiêu đề và nút đóng

Header hiển thị:

- tiêu đề `Rà soát thuốc trùng`
- tổng số `Số đăng ký trùng`
- tổng số dòng thuốc trong các nhóm trùng

Phần điều khiển trong modal:

- ô tìm nhanh theo `Số đăng ký`, `Mã chung`, `Tên thuốc`
- nút `Kiểm tra lại`
- nút `Đóng`

Tìm nhanh chỉ lọc danh sách nhóm đang tải trong modal, không ảnh hưởng bảng chính.

### Danh sách nhóm trùng

Mỗi nhóm hiển thị dạng accordion. Accordion đầu tiên mở mặc định, các nhóm còn lại đóng để modal dễ quét khi có nhiều nhóm trùng.

Thông tin nhóm:

- `Số đăng ký`
- tổng số dòng trong nhóm
- số dòng đang dùng

Mỗi dòng thuốc trong nhóm hiển thị:

- `Mã chung`
- `Tên thuốc`
- `Hoạt chất`
- `Hàm lượng`
- `Dạng bào chế`
- `Quy cách`
- `Đơn vị tính`
- trạng thái `Đang dùng` hoặc `Đã ẩn`
- trạng thái liên kết dữ liệu nếu có

Mỗi dòng có nút icon thùng rác:

- label/tooltip: `Xóa thuốc này`
- chỉ bật nếu dòng có thể xóa an toàn
- bị disable nếu thuốc đang có liên kết dữ liệu cần bảo vệ

### Sau khi xóa một dòng

Khi admin bấm xóa một dòng:

1. Hiển thị xác nhận ngắn: `Xóa thuốc này khỏi danh mục dùng chung?`
2. Gọi API xóa một thuốc an toàn.
3. Nếu xóa thành công:
   - xóa dòng khỏi modal
   - cập nhật số dòng trong nhóm
   - cập nhật tổng số nhóm và tổng số dòng
   - nếu nhóm chỉ còn một dòng, ẩn nhóm khỏi modal
   - refresh bảng chính hiện tại để dữ liệu đồng bộ
4. Nếu không xóa được:
   - hiển thị lỗi cụ thể từ API
   - giữ nguyên dòng trong modal

## Backend

### API danh sách thuốc trùng

Mở rộng response hiện tại của:

- `GET /api/admin/master-drugs/duplicate-registrations`

Response cần đủ dữ liệu cho modal:

- thông tin nhóm trùng
- danh sách thuốc trong từng nhóm
- trạng thái `isActive`
- số lượng liên kết bảo vệ dữ liệu

Các liên kết cần tính:

- `drugMaps`
- `companyDrugs`
- `drugOrderLines`

Mỗi item cần có:

- `referenceCount`
- `canDelete`
- `deleteBlockReason`

`canDelete = true` khi `referenceCount = 0`.

### API xóa một thuốc

Mở rộng endpoint xóa một thuốc hiện có:

- `DELETE /api/admin/master-drugs/[id]`

Quy tắc:

- chỉ admin được xóa
- không xóa nếu thuốc có `drugMaps`, `companyDrugs`, hoặc `drugOrderLines`
- trả về lỗi `409` với lý do rõ ràng nếu bị chặn
- chỉ xóa thuốc đúng `id` được yêu cầu

API không được tin vào `canDelete` từ client. Client chỉ dùng giá trị đó để disable nút sớm.

## Component đề xuất

Tách modal thành component riêng:

- `src/components/master-drugs/DuplicateDrugsReviewDialog.tsx`

Props chính:

- `open`
- `onOpenChange`
- `initialData`
- `onRefreshDuplicates`
- `onDeleted`

Trang `src/app/dashboard/admin/master-drugs/page.tsx` quản lý:

- state mở modal
- dữ liệu `duplicateRegistrations`
- refresh bảng chính sau khi xóa
- giữ nguyên logic `Xóa dòng trùng`

## Error handling

Các lỗi cần hiển thị bằng toast:

- không tải được danh sách thuốc trùng
- không xóa được thuốc vì có liên kết
- lỗi mạng hoặc lỗi server

Trong modal, khi xóa đang chạy:

- disable nút xóa của dòng đang xử lý
- không khóa toàn bộ modal
- disable các nút xóa khác cho tới khi request hiện tại kết thúc để tránh xóa song song

## Kiểm thử

Kiểm thử thủ công:

- có nhóm trùng thì thấy nút `Rà soát thuốc trùng`
- bấm `Rà soát thuốc trùng` mở modal lớn
- tìm nhanh trong modal lọc đúng nhóm/dòng
- xóa được một thuốc không có liên kết
- nhóm biến mất khi chỉ còn một dòng
- thuốc có liên kết bị disable nút xóa
- nút `Xóa dòng trùng` hiện tại vẫn hoạt động như trước
- đóng modal không làm mất bộ lọc bảng chính

Kiểm thử code/API:

- API danh sách trùng trả `canDelete=false` khi thuốc có liên kết
- API xóa một thuốc trả `409` khi thuốc có liên kết
- API xóa một thuốc trả thành công khi thuốc không có liên kết
- sau khi xóa, response danh sách trùng không còn nhóm đã hết trùng
