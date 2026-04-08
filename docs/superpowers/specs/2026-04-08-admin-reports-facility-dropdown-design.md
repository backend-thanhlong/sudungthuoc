# Admin Reports Facility Dropdown Design

## Context

Trang `/dashboard/admin/reports` hiện đang hiển thị bảng theo mô hình:

- `1 dòng = 1 báo cáo tháng của 1 cơ sở`

Điều này làm danh sách dài khi một cơ sở nộp nhiều tháng, và người dùng khó nhìn theo góc nhìn `đơn vị`.

Yêu cầu mới là chuyển bảng sang mô hình:

- `1 dòng = 1 đơn vị`
- click vào tên đơn vị để xổ ra danh sách các lần nộp
- các dòng con hiển thị:
  - `Tháng báo cáo`
  - `Số thuốc`
  - `Tiền nhập`
  - `Tiền xuất`
  - `Ngày nộp`
  - `Trạng thái`
- vẫn giữ thao tác `Xem` và `Xóa` trên từng dòng tháng

## Goal

Đổi bảng danh sách báo cáo thành dạng dropdown theo đơn vị, với các mục tiêu:

- giúp admin nhìn dữ liệu theo `đơn vị` trước, rồi mới drill down theo từng kỳ báo cáo
- giữ nguyên khả năng xem chi tiết và xóa từng báo cáo tháng
- giữ được bulk selection theo từng báo cáo tháng
- không làm thay đổi logic export, detail dialog, hoặc filter hiện có nếu không cần

## Scope

Bao gồm:

- đổi cấu trúc hiển thị bảng ở `src/app/dashboard/admin/reports/page.tsx`
- group dữ liệu `reports` theo `facilityId` ở client
- thêm trạng thái mở/đóng dropdown theo đơn vị
- giữ `Xem`, `Xóa`, checkbox chọn nhiều ở cấp báo cáo tháng trong bảng con
- thêm checkbox cấp đơn vị để chọn/bỏ chọn toàn bộ các dòng con của đơn vị đó

Không bao gồm:

- thay đổi contract của API `/api/admin/reports`
- thay đổi API `/api/admin/reports/detail`
- thay đổi logic export Excel
- thay đổi logic summary cards hoặc progress bar phía trên

## Approach Options

### Option 1: Expandable rows trong cùng bảng

Giữ layout bảng quản trị hiện tại, nhưng đổi:

- `1 dòng cha = 1 đơn vị`
- dòng mở rộng bên dưới chứa bảng con các lần nộp theo tháng

Ưu điểm:

- ít thay đổi workflow nhất
- vẫn hợp với pattern quản trị dạng bảng
- tận dụng lại gần như toàn bộ logic hiện có

Nhược điểm:

- có 2 tầng hiển thị trong cùng bảng nên cần spacing rõ ràng để tránh rối

### Option 2: Accordion cards

Mỗi đơn vị là một card riêng, mở card ra để thấy bảng con theo tháng.

Ưu điểm:

- trực quan
- dễ tách từng đơn vị

Nhược điểm:

- lệch pattern hiện tại của trang
- kém “tabular” hơn cho admin

### Option 3: Master-detail 2 cột

Cột trái là danh sách đơn vị, cột phải là bảng các lần nộp của đơn vị đang chọn.

Ưu điểm:

- sạch
- dễ mở rộng thêm thông tin đơn vị

Nhược điểm:

- thay đổi UI lớn hơn cần thiết
- mất thao tác nhanh ngay trong cùng bảng

## Recommendation

Chọn Option 1.

Đây là phương án cân bằng nhất: giữ đúng tinh thần bảng quản trị hiện có, giảm thay đổi workflow, và đáp ứng trực tiếp yêu cầu `click vào tên đơn vị để xổ ra danh sách các lần nộp`.

## Data Design

Không đổi backend.

Frontend sẽ tiếp tục lấy `reports` từ `/api/admin/reports`, sau đó group theo `facilityId`.

Mỗi group đơn vị sẽ có dạng logic:

- `facilityId`
- `facilityName`
- `submissions[]`
- `submissionCount`
- `totalImport`
- `totalExport`
- `latestSubmittedAt`

Trong đó:

- `submissions[]` là các báo cáo tháng của đơn vị sau khi đã qua filter hiện tại
- `submissionCount` là số lần nộp đang hiển thị
- `totalImport`, `totalExport` là tổng của các dòng con trong group
- `latestSubmittedAt` là ngày nộp gần nhất trong group

## UI Design

File tác động chính: `src/app/dashboard/admin/reports/page.tsx`

### Bảng chính

Đổi bảng chính sang các cột:

- checkbox đơn vị
- `Cơ sở Y tế`
- `Số lần nộp`
- `Tổng tiền nhập`
- `Tổng tiền xuất`
- `Lần nộp gần nhất`
- `Trạng thái`
- cột mở/đóng dropdown

Tên đơn vị sẽ là trigger chính để mở dropdown.

### Dòng mở rộng

Khi mở một đơn vị, render thêm một dòng full-width ngay dưới dòng cha.

Bên trong là một bảng con gồm:

- checkbox báo cáo tháng
- `Tháng báo cáo`
- `Số thuốc`
- `Tiền nhập`
- `Tiền xuất`
- `Ngày nộp`
- `Trạng thái`
- `Thao tác`

Trong cột `Thao tác` của dòng con:

- giữ nút `Xem`
- giữ nút `Xóa`

### Trạng thái trực quan

- mặc định tất cả đơn vị `thu gọn`
- click tên đơn vị hoặc icon chevron để mở/đóng
- nếu đang lọc đúng `1 cơ sở`, tự động mở đơn vị đó
- khi đổi bộ lọc, reset trạng thái expansion để tránh giữ trạng thái cũ sai ngữ cảnh

## Interaction Design

### Checkbox và bulk delete

`selectedIds` tiếp tục là tập các `report.id` ở cấp báo cáo tháng.

Hành vi:

- checkbox dòng con chọn đúng 1 báo cáo tháng
- checkbox dòng cha của đơn vị sẽ chọn hoặc bỏ chọn toàn bộ các dòng con của đơn vị đó
- nếu chỉ một phần dòng con được chọn, checkbox dòng cha hiển thị trạng thái bán chọn bằng logic client
- bulk action bar vẫn giữ nguyên, nhưng ý nghĩa là số `báo cáo tháng` đã chọn

### Xem chi tiết

Nút `Xem` ở dòng con tiếp tục gọi logic mở detail dialog hiện tại, truyền đúng:

- `facilityId`
- `facilityName`
- `month`
- `drugCount`

### Xóa

Nút `Xóa` ở dòng con tiếp tục xóa đúng tổ hợp:

- `facilityId`
- `month`

Bulk delete tiếp tục hoạt động trên danh sách các báo cáo tháng đã chọn.

### Export

Không đổi.

`Xuất tổng hợp` và `Xuất chi tiết` vẫn bám theo dữ liệu đã lọc, không phụ thuộc đơn vị nào đang mở hay đóng.

## Compatibility

- không đổi API `/api/admin/reports`
- không đổi API `/api/admin/reports/detail`
- không đổi summary cards
- không đổi progress bar
- không đổi detail dialog
- không đổi logic xóa từng báo cáo hoặc xóa nhiều báo cáo

## Edge Cases

- đơn vị chỉ có 1 lần nộp vẫn hiển thị như 1 dòng cha có thể mở ra
- đơn vị có nhiều tháng nộp sẽ hiển thị bảng con đã sort theo thứ tự hiện tại của `reports`
- khi filter theo `Kỳ báo cáo`, mỗi đơn vị có thể chỉ còn 1 hoặc 0 dòng con
- nếu không có dữ liệu sau filter, trang tiếp tục hiển thị empty state như hiện tại
- nếu một đơn vị có dòng con bị chọn rồi user đổi filter, selection sẽ reset như logic hiện tại để tránh mismatch

## Testing Plan

Kiểm tra thủ công:

1. vào `/dashboard/admin/reports`, xác nhận bảng chính đổi thành `1 dòng = 1 đơn vị`
2. click vào tên đơn vị, xác nhận xổ ra bảng con với các cột:
   - `Tháng báo cáo`
   - `Số thuốc`
   - `Tiền nhập`
   - `Tiền xuất`
   - `Ngày nộp`
   - `Trạng thái`
3. click `Xem` ở một dòng con, xác nhận detail dialog mở đúng báo cáo tháng tương ứng
4. click `Xóa` ở một dòng con, xác nhận chỉ xóa đúng báo cáo đó
5. chọn checkbox ở dòng cha đơn vị, xác nhận toàn bộ dòng con của đơn vị được chọn
6. chọn một phần dòng con, xác nhận dòng cha phản ánh trạng thái bán chọn
7. dùng bulk delete, xác nhận xóa đúng số báo cáo tháng đã chọn
8. lọc theo `Kỳ báo cáo`, xác nhận bảng cha vẫn group theo đơn vị nhưng chỉ còn các dòng con thuộc kỳ đã lọc
9. lọc theo `Cơ sở`, xác nhận đơn vị tương ứng tự mở dropdown

## Risks And Limits

- vì grouping được làm ở client, file `page.tsx` sẽ lớn hơn nếu không tách helper render/type ra hợp lý
- bảng có hai tầng nên cần khoảng cách và màu nền phân cấp rõ để tránh cảm giác “lồng bảng” rối mắt
- nếu muốn sort/paginate theo cấp đơn vị trong tương lai, khi đó có thể cần đẩy grouping xuống backend; đợt này chưa cần
