# Inventory Search Inventory Table Width Design

## Context

Trang `/dashboard/inventory-search` có hai vấn đề hiển thị chính:

- Bảng cơ sở trong phần mở rộng của từng thuốc có các cột quá rộng
- Ở bảng danh sách thuốc chính, dữ liệu `Hoạt chất` và `Hàm lượng` dài bị giữ trên một dòng, làm hàng khó co giãn tự nhiên

## Goal

Thu gọn tối đa các cột ngắn trong bảng cơ sở, đồng thời:

- Dành phần lớn chiều rộng cho cột `Tên cơ sở` và cho phép tên cơ sở xuống dòng tự do
- Cho phép giá trị `Hoạt chất` và `Hàm lượng` ở bảng chính được xuống dòng khi dài, nhưng không đổi cách hiển thị header

## Scope

Bao gồm:

- Điều chỉnh layout bảng cơ sở trong phần mở rộng của từng thuốc
- Giảm độ rộng các cột `STT`, `Mã cơ sở`, `Tồn kho`, `Giá VAT`, `Kỳ báo cáo`
- Cho phép `Tên cơ sở` xuống dòng để hấp thụ phần chiều rộng còn lại
- Cho phép ô dữ liệu `Hoạt chất` và `Hàm lượng` ở bảng chính xuống dòng

Không bao gồm:

- Thay đổi layout bảng danh sách thuốc chính
- Thay đổi dữ liệu API hoặc cấu trúc response
- Thêm tooltip, sort hoặc filter mới trong dropdown

## Approach Options

### Option 1: Auto-layout với độ rộng hẹp cho cột ngắn

Giữ bảng hiện tại, chuyển bảng con sang `table-auto`, gán width hẹp cho các cột ngắn và override `whitespace` ở `Tên cơ sở`.

Ưu điểm:

- Thay đổi nhỏ, đúng phạm vi
- Dễ kiểm soát hồi quy
- Đáp ứng đúng nhu cầu hiển thị gọn tối đa

Nhược điểm:

- Vẫn phụ thuộc vào dữ liệu thực tế để phân bổ phần rộng còn lại

### Option 2: Colgroup cố định toàn bộ cột

Định nghĩa cứng độ rộng từng cột bằng `colgroup`.

Ưu điểm:

- Kiểm soát chiều rộng rất rõ ràng

Nhược điểm:

- Cứng tay, dễ phải tinh chỉnh lại khi dữ liệu thay đổi
- Không cần thiết cho bài toán hiện tại

### Option 3: Chuyển bảng con sang grid

Thay cấu trúc bảng bằng grid/flex để tự kiểm soát từng cột.

Ưu điểm:

- Linh hoạt cao

Nhược điểm:

- Tăng độ phức tạp và rủi ro không cần thiết

### Option 4: Chỉ mở wrap cho ô dữ liệu `Hoạt chất` và `Hàm lượng`

Giữ nguyên layout bảng chính, chỉ override `whitespace` cho hai ô dữ liệu dài nhất.

Ưu điểm:

- Thay đổi nhỏ nhất
- Không ảnh hưởng header hoặc các cột số liệu
- Đúng với yêu cầu hiển thị hiện tại

Nhược điểm:

- Hàng có dữ liệu dài sẽ cao hơn các hàng khác

### Recommendation

Chọn Option 1 cho bảng cơ sở và Option 4 cho bảng chính. Cả hai đều là thay đổi hẹp, trực tiếp giải quyết phần chiếm ngang không cần thiết mà không làm xáo trộn cấu trúc hiện có.

## UI Design

File tác động: `src/app/dashboard/inventory-search/page.tsx`

- Bảng cơ sở dùng `table-auto` để không chia cột quá rộng theo kiểu mặc định
- `STT`, `Mã cơ sở`, `Tồn kho`, `Giá VAT`, `Kỳ báo cáo` nhận độ rộng hẹp và giữ một dòng
- `Tên cơ sở` bỏ `whitespace-nowrap`, chuyển sang `whitespace-normal` và `break-words`
- Giảm nhẹ padding khu vực dropdown để tổng thể gọn hơn
- Ở bảng chính, chỉ các ô dữ liệu `Hoạt chất` và `Hàm lượng` bỏ `whitespace-nowrap`, chuyển sang `whitespace-normal` và `break-words`
- Header `Hoạt chất` và `Hàm lượng` vẫn giữ một dòng

## Testing Plan

1. Mở rộng một thuốc có nhiều cơ sở, xác nhận bảng con hẹp hơn trước
2. Kiểm tra `Tên cơ sở` dài được xuống dòng thay vì kéo rộng bảng
3. Kiểm tra `Hoạt chất` dài ở bảng chính được xuống dòng trong ô dữ liệu
4. Kiểm tra `Hàm lượng` dài ở bảng chính được xuống dòng trong ô dữ liệu
5. Kiểm tra các cột số liệu vẫn căn phải và không bị xuống dòng
6. Kiểm tra trên màn hình hẹp, bảng không bị nở rộng bất thường

## Risks

- Nếu tên cơ sở quá dài liên tục không có khoảng trắng, cần `break-words` để tránh tràn layout
- Nếu đặt width cứng quá nhỏ cho cột số liệu, dữ liệu lớn có thể gây nén thiếu tự nhiên
- Nếu quá nhiều hàng có `Hoạt chất` hoặc `Hàm lượng` dài, chiều cao danh sách chính sẽ tăng và cần theo dõi trải nghiệm quét bảng
