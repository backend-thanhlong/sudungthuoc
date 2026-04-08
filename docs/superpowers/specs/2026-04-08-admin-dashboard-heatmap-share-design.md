# Admin Dashboard Heatmap Share Design

## Context

Trang `/dashboard/admin` có bảng `Phân bố tồn kho theo địa bàn` trong tab `Tổng quan`.

Hiện tại cột `Mức độ` không biểu diễn tỷ trọng trên tổng tồn kho toàn hệ thống. Thay vào đó, UI đang chuẩn hóa từng dòng theo địa bàn có giá trị tồn kho lớn nhất trong tập dữ liệu đang lọc, nên địa bàn đứng đầu luôn hiển thị `100%`.

Điều này dễ gây hiểu nhầm cho người dùng khi họ đọc `100%` như là `100% tổng tồn kho`, trong khi thực tế chỉ là `100% so với địa bàn lớn nhất`.

## Goal

Đổi cột `Mức độ` thành biểu diễn đúng tỷ trọng tồn kho của từng địa bàn trên tổng tồn kho của toàn bộ dữ liệu đang lọc, với các yêu cầu:

- số `%` là `% trên tổng tồn kho`
- độ dài thanh là `% trên tổng tồn kho`
- màu thanh cũng phản ánh cùng tỷ trọng đó
- không thay đổi dữ liệu backend hoặc cách gom nhóm theo địa chỉ

## Scope

Bao gồm:

- cập nhật cách tính trong UI cho cột cuối của bảng `Phân bố tồn kho theo địa bàn`
- đổi nhãn cột từ `Mức độ` sang `Tỷ trọng`
- giữ nguyên bộ lọc `Đơn vị` và `Kỳ báo cáo`

Không bao gồm:

- thay đổi API `/api/admin/dashboard/overview`
- thay đổi cách backend cộng dồn `thanhTienTonCuoi` theo `address`
- thêm cột mới hoặc thay đổi bố cục bảng

## Approach Options

### Option 1: Exact % mode

Tính `share = item.value / totalInventoryValueOfFilteredHeatmap`, rồi dùng `share` cho cả số `%`, chiều dài thanh, và màu.

Ưu điểm:

- đúng ngữ nghĩa người dùng yêu cầu
- thay đổi nhỏ, chỉ cần sửa client
- loại bỏ nhầm lẫn giữa `tỷ trọng tổng` và `so với địa bàn lớn nhất`

Nhược điểm:

- nếu dữ liệu phân tán trên nhiều địa bàn thì nhiều thanh sẽ ngắn hơn trước

### Option 2: Exact % + color bands

Vẫn dùng `% tổng` cho số và chiều dài thanh, nhưng màu chia theo ngưỡng cố định.

Ưu điểm:

- nhìn nhanh mức quan trọng dễ hơn

Nhược điểm:

- màu không còn tỷ lệ liên tục theo dữ liệu thật

### Option 3: Giữ heat scale cũ, thêm % tổng

Thêm thông tin `% tổng` nhưng giữ thanh theo địa bàn lớn nhất.

Ưu điểm:

- vẫn giữ độ nổi bật thị giác như hiện tại

Nhược điểm:

- tiếp tục gây mơ hồ vì cùng một cột có hai ngữ nghĩa khác nhau

### Recommendation

Chọn Option 1.

Đây là phương án khớp trực tiếp với yêu cầu đổi cột này thành `% trên tổng tồn kho toàn hệ thống`, đồng thời giữ thay đổi nhỏ và ít rủi ro.

## UI Design

File tác động chính: `src/components/dashboard/Tab1Overview.tsx`

- đổi tiêu đề cột từ `Mức độ` thành `Tỷ trọng`
- giữ nguyên cấu trúc bảng, chỉ đổi cách tính và hiển thị
- thanh tiếp tục dùng màu chuyển từ xanh sang đỏ, nhưng intensity dựa trên `share`
- phần trăm hiển thị dùng tối đa `2` chữ số thập phân khi cần

## Data Flow

- tiếp tục dùng `heatmapData` từ API hiện có
- tính `totalHeatmapValue = sum(heatmapData.value)`
- với mỗi dòng:
  - `share = totalHeatmapValue > 0 ? item.value / totalHeatmapValue : 0`
  - chiều rộng thanh = `share * 100`
  - text phần trăm = `share * 100`
  - màu thanh = scale theo `share`

## Compatibility

- không đổi API contract
- không đổi cách lọc theo `reportMonth` và `facilityId`
- không đổi cách sắp xếp bảng theo giá trị tồn kho giảm dần
- không đổi giá trị tiền tệ hiển thị trong cột `Giá trị tồn kho`

## Edge Cases

- nếu không có dữ liệu, tiếp tục hiển thị trạng thái `Không có dữ liệu`
- nếu tổng tồn kho bằng `0`, tất cả tỷ trọng hiển thị `0%` và thanh có độ rộng `0%`
- nếu tỷ trọng rất nhỏ, vẫn hiển thị đúng số phần trăm thay vì ép tối thiểu như logic cũ
- tổng các `%` hiển thị có thể không ra đúng `100%` tuyệt đối vì làm tròn phần hiển thị, nhưng giá trị tính toán nội bộ vẫn dùng số thực

## Testing Plan

Kiểm tra thủ công:

1. Vào `/dashboard/admin`, tab `Tổng quan`, xác nhận cột cuối đổi thành `Tỷ trọng`.
2. Lấy 2-3 dòng đầu bảng, cộng thử tỷ trọng hiển thị và đối chiếu với giá trị tiền để xác nhận chúng là `% trên tổng tồn kho`, không phải `% theo dòng lớn nhất`.
3. Đổi `Kỳ báo cáo`, xác nhận tỷ trọng thay đổi theo dữ liệu mới.
4. Chọn một `Đơn vị`, xác nhận tỷ trọng được tính lại trên tập dữ liệu đã lọc.
5. Kiểm tra trường hợp dữ liệu ít hoặc rỗng, xác nhận UI không lỗi và vẫn hiển thị hợp lý.
