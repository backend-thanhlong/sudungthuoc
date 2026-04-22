# Thiết kế: Tùy chỉnh hiển thị cột tại `/dashboard/admin/master-drugs`

## Bối cảnh

Trang `/dashboard/admin/master-drugs` hiện đã có nút `Hiển thị`, nhưng menu này mới chỉ dùng để điều khiển hành vi xuống dòng của một số cột trong bảng danh sách thuốc.

Người dùng cần mở rộng khu vực này để có thể chủ động chọn cột nào được hiển thị trong bảng, thay vì phải xem cố định toàn bộ cột mọi lúc.

## Mục tiêu

Cho phép người dùng tại trang `/dashboard/admin/master-drugs`:

- bật/tắt hiển thị các cột tùy chọn của bảng danh sách thuốc
- giữ một số cột nghiệp vụ cốt lõi luôn hiển thị
- thao tác ngay trong menu `Hiển thị` hiện có
- chỉ lưu cấu hình tạm thời trong state của trang hiện tại

## Phạm vi

Bao gồm:

- cập nhật menu `Hiển thị` trong trang `master-drugs`
- thêm state điều khiển cột đang hiển thị
- render có điều kiện cho header và body của bảng
- thêm cột `Mã BHYT` vào bảng, đặt sau cột `STT`

Không bao gồm:

- lưu cấu hình hiển thị vào database
- lưu cấu hình theo user hoặc qua lần mở trang sau
- kéo thả đổi vị trí cột
- thay đổi API `master-drugs`
- thay đổi tìm kiếm, phân trang, sort, import/export

## Phương án

### Phương án 1: Mở rộng menu `Hiển thị` hiện có

Giữ nguyên nút `Hiển thị`, nhưng bổ sung thêm nhóm checkbox để bật/tắt cột.

Ưu điểm:

- bám đúng vị trí người dùng đang quen thao tác
- ít thay đổi giao diện
- chi phí triển khai thấp
- không phát sinh modal hay panel mới

Nhược điểm:

- dropdown dài hơn trước

### Phương án 2: Thêm modal `Tùy chỉnh cột`

Ưu điểm:

- nhiều không gian hơn để trình bày tùy chọn

Nhược điểm:

- thêm một bước tương tác không cần thiết
- nặng hơn so với nhu cầu chỉ bật/tắt cột tạm thời

### Phương án 3: Dùng preset cột

Ưu điểm:

- gọn

Nhược điểm:

- không đáp ứng đúng yêu cầu “tùy ý”

### Khuyến nghị

Chọn Phương án 1.

Đây là hướng tự nhiên nhất với UI hiện có và đủ đáp ứng nhu cầu mà không mở rộng phạm vi không cần thiết.

## Hành vi dữ liệu và state

Trang sẽ có một cấu hình cột thống nhất, ví dụ `TABLE_COLUMNS`, trong đó mỗi cột có:

- `id`
- `label`
- `required`
- `defaultVisible`

Thêm một state mới kiểu `visibleColumns` để điều khiển cột nào đang hiển thị.

Nguyên tắc:

- state này chỉ tồn tại trong vòng đời của trang hiện tại
- khi reload hoặc mở lại trang, cấu hình quay về mặc định
- người dùng không cần bấm lưu

## Cột luôn hiển thị

Các cột sau là bắt buộc và không cho phép ẩn:

- `STT`
- `Tên thuốc`
- `Hoạt chất`
- `Hàm lượng`
- `Số đăng ký`
- `Dạng bào chế`
- `Đường dùng`
- `Thao tác`

Lý do:

- đây là tập cột cốt lõi để nhận diện, đối chiếu, và thao tác với bản ghi thuốc
- `Hoạt chất` hiện đang là cột sticky, nên việc giữ cột này luôn hiển thị giúp tránh tăng độ phức tạp render

## Cột tùy chọn

Các cột còn lại là cột tùy chọn và mặc định đều đang hiển thị khi vào trang.

Bao gồm:

- `Mã BHYT`
- `Quy cách`
- `Đơn vị tính`
- `Nhóm thuốc`
- `Nhóm điều trị`

Nếu sau này bảng có thêm cột không thuộc nhóm bắt buộc, các cột đó cũng sẽ đi theo cùng cơ chế này.

## Vị trí cột `Mã BHYT`

Thêm cột `Mã BHYT` vào bảng danh sách thuốc.

Quy ước vị trí:

- cột này xuất hiện ngay sau `STT`
- đây là cột tùy chọn
- mặc định đang bật

Hiển thị:

- nếu có dữ liệu thì hiển thị `maBhyt`
- nếu không có thì hiển thị `-`

Có thể render dạng gọn, ưu tiên không xuống dòng để tránh làm bảng bị cao bất thường.

## Thiết kế menu `Hiển thị`

Menu `Hiển thị` sẽ được chia thành hai nhóm rõ ràng:

- `Cột hiển thị`
- `Xuống dòng`

### Nhóm `Cột hiển thị`

Hiển thị toàn bộ danh sách cột trong bảng.

Hành vi:

- cột bắt buộc xuất hiện trong danh sách nhưng disabled
- cột tùy chọn dùng checkbox bật/tắt bình thường
- tất cả mặc định đều đang bật
- có thêm action `Hiện tất cả` để đưa state về mặc định ngay trong tab hiện tại

### Nhóm `Xuống dòng`

Giữ nguyên logic `wrappedColumns` hiện có.

Nhóm này chỉ điều khiển việc text trong cell có được xuống dòng hay không, không liên quan đến ẩn/hiện cột.

Việc tách hai nhóm giúp người dùng không nhầm giữa:

- “cột có xuất hiện hay không”
- và “nội dung trong cột có xuống dòng hay không”

## Thiết kế render bảng

Header và body của bảng phải cùng dùng một nguồn điều kiện hiển thị để tránh lệch cột.

Nguyên tắc:

- mỗi `TableHead` chỉ render nếu cột đang visible hoặc là cột bắt buộc
- mỗi `TableCell` tương ứng cũng dùng đúng điều kiện đó
- thứ tự cột vẫn cố định
- người dùng chỉ bật/tắt hiển thị, không đổi thứ tự cột

## Tương tác với cột sticky

`Hoạt chất` hiện đang là cột sticky bên trái.

Thiết kế này không đổi hành vi sticky vì:

- `Hoạt chất` là cột bắt buộc luôn hiển thị
- các cột trước nó có thể thay đổi số lượng, nhưng bản thân sticky column vẫn tồn tại ổn định

Do đó, không cần refactor cơ chế sticky trong thay đổi này.

## Tương tác với các chức năng khác

Không thay đổi:

- API lấy dữ liệu
- phân trang
- tìm kiếm
- export/import
- edit/delete/toggle status

Thay đổi này chỉ ảnh hưởng:

- state hiển thị cột trên client
- render phần bảng
- nội dung dropdown `Hiển thị`

## Xử lý lỗi và edge cases

- nếu người dùng tắt nhiều cột, bảng co lại là hành vi mong muốn
- người dùng không thể đưa bảng về trạng thái “trống cột” vì vẫn còn nhóm cột bắt buộc
- nếu có cột tùy chọn chưa có dữ liệu ở nhiều hàng, việc ẩn cột đó vẫn chỉ là thao tác hiển thị, không ảnh hưởng dữ liệu

## Kiểm thử thủ công

1. Mở `/dashboard/admin/master-drugs`.
2. Xác nhận mặc định tất cả cột đều đang hiển thị.
3. Mở menu `Hiển thị`, xác nhận có hai nhóm `Cột hiển thị` và `Xuống dòng`.
4. Xác nhận các cột bắt buộc xuất hiện nhưng không thể bỏ chọn.
5. Bỏ chọn `Mã BHYT`, xác nhận cột biến mất khỏi cả header và body.
6. Bật lại `Mã BHYT`, xác nhận cột xuất hiện lại ngay sau `STT`.
7. Bỏ chọn một số cột tùy chọn khác như `Nhóm thuốc`, `Nhóm điều trị`, xác nhận bảng vẫn render đúng.
8. Dùng action `Hiện tất cả`, xác nhận các cột tùy chọn đều hiện lại.
9. Reload trang, xác nhận cấu hình quay về mặc định.
10. Kiểm tra cột `Hoạt chất` vẫn sticky và không bị lệch với header.

## Rủi ro và lưu ý triển khai

- nếu render điều kiện không thống nhất giữa `TableHead` và `TableCell`, bảng sẽ lệch cột
- menu `Hiển thị` hiện đang phục vụ xuống dòng; khi mở rộng cần group label rõ để tránh rối
- không nên cố generic hóa thành table-column system toàn repo trong thay đổi này; nên giới hạn trong trang `master-drugs`

## Khuyến nghị triển khai

Triển khai gọn trong một đợt:

1. thêm cấu hình `TABLE_COLUMNS`
2. thêm state `visibleColumns`
3. thêm cột `Mã BHYT` vào bảng
4. refactor dropdown `Hiển thị` thành hai nhóm
5. cập nhật render header/body theo `visibleColumns`
6. kiểm tra thủ công các trường hợp bật/tắt cột
