# Facility LCNT Thoi Gian Bat Dau Text Design

## Bối cảnh

Trang `/dashboard/facility/mua-sam/lap-ke-hoach-lcnt` hiện cho nhập trường `Thời gian bắt đầu tổ chức LCNT` bằng `input type="date"` và backend lưu vào `GoiThau.thoiGianBatDau` kiểu `DateTime`.

Yêu cầu mới là cho phép người dùng nhập text tự do hoàn toàn cho trường này, ví dụ có thể nhập mô tả mốc thời gian thay vì một ngày cụ thể. Dữ liệu cũ đang lưu theo ngày cần được giữ lại khi chuyển sang kiểu text.

## Mục tiêu

- đổi `GoiThau.thoiGianBatDau` từ `DateTime?` sang `String?`
- cho phép người dùng nhập text tự do hoàn toàn ở form facility
- migrate dữ liệu hiện có sang chuỗi theo format `YYYY-MM-DD`
- giữ hiển thị nhất quán ở cả màn facility và admin

## Ngoài phạm vi

- không bổ sung validate format cho nội dung text mới
- không thêm field song song để giữ cả `DateTime` và `String`
- không thêm sort/filter theo ngữ nghĩa ngày cho trường này sau khi chuyển đổi

## Hiện trạng liên quan

- Prisma schema hiện khai báo `GoiThau.thoiGianBatDau` là `DateTime?`
- form facility đang render field bằng `input type="date"`
- API facility create/update đang parse `body.thoiGianBatDau` thành `Date`
- dữ liệu read path hiện đang coi field này là ngày và chuyển về chuỗi `YYYY-MM-DD` để hiển thị ở client/admin

## Phương án được chọn

Đổi hẳn `GoiThau.thoiGianBatDau` sang text end-to-end.

Lý do chọn:

- khớp trực tiếp với yêu cầu cho nhập text tự do hoàn toàn
- tránh duy trì hai nguồn sự thật cho cùng một field
- đơn giản hóa read/write path vì không còn phải parse ngày rồi format ngược lại

## Thiết kế chi tiết

### 1. Mô hình dữ liệu

`prisma/schema.prisma`:

- đổi `GoiThau.thoiGianBatDau` từ `DateTime?` sang `String?`

Migration DB:

- đổi cột `goi_thau.thoi_gian_bat_dau` từ `timestamp without time zone` sang `text`
- chuyển dữ liệu cũ bằng format `YYYY-MM-DD`
- các bản ghi `null` giữ nguyên `null`

Kỳ vọng sau migrate:

- bản ghi cũ `2026-04-01 00:00:00` trở thành `"2026-04-01"`
- bản ghi cũ `null` vẫn là `null`

### 2. Ghi dữ liệu từ facility

Form gói thầu tại `/dashboard/facility/mua-sam/lap-ke-hoach-lcnt`:

- đổi field `Thời gian bắt đầu tổ chức LCNT` từ `input type="date"` sang `input type="text"`
- placeholder nên gợi ý đây là ô text tự do, ví dụ `VD: Quý III/2026 hoặc sau khi phê duyệt`

Payload gửi từ client:

- giữ field `thoiGianBatDau` là string
- không parse sang `Date` ở client

API facility create/update gói thầu:

- bỏ `safeParseDate` cho `thoiGianBatDau`
- lưu giá trị sau khi `trim()`
- nếu chuỗi rỗng sau khi trim thì lưu `null`

### 3. Đọc và hiển thị dữ liệu

Facility page:

- bỏ logic `new Date(...).toISOString().split("T")[0]` khi map `goiThau.thoiGianBatDau`
- dùng trực tiếp string từ API/DB

Admin page/API:

- bỏ logic serialize date-only cho `goiThau.thoiGianBatDau`
- trả ra trực tiếp string đang lưu
- các dialog/bảng chi tiết tiếp tục hiển thị nguyên giá trị string

### 4. Tương thích ngược

Dữ liệu cũ đã được migrate sang `YYYY-MM-DD`, nên sau thay đổi:

- các bản ghi cũ vẫn hiển thị được như trước về mặt nội dung ngày
- các bản ghi mới có thể là chuỗi bất kỳ như `Quý III/2026`, `sau khi phê duyệt`, `khi có nguồn vốn`

Không có cơ chế ép nội dung mới về định dạng chuẩn ngày.

### 5. Xử lý lỗi và tính nhất quán

- không validate format ngày cho field này
- chỉ chuẩn hóa tối thiểu bằng `trim()`
- empty string được coi là không có dữ liệu và lưu `null`
- các route không được throw lỗi parse date cho field này sau thay đổi

## Ảnh hưởng mã nguồn

Các khu vực cần cập nhật:

- `prisma/schema.prisma`
- Prisma migration cho cột `goi_thau.thoi_gian_bat_dau`
- facility API create gói thầu
- facility API update gói thầu
- facility page nhập và map dữ liệu gói thầu
- admin API serialize danh sách kế hoạch/gói thầu
- các type/interface phụ thuộc đang giả định field này là ngày

## Rủi ro

### Mất ngữ nghĩa ngày ở tầng DB

Sau khi đổi sang text, không thể tin cậy dùng field này để sort/filter theo thời gian thực.

Giảm thiểu:

- phạm vi hiện tại chỉ dùng field này để nhập và hiển thị
- không giữ hoặc thêm logic sắp xếp theo field này

### Dữ liệu text không đồng nhất

Người dùng có thể nhập nhiều kiểu nội dung khác nhau.

Giảm thiểu:

- đây là hành vi mong muốn của yêu cầu hiện tại
- chỉ chuẩn hóa dữ liệu cũ về `YYYY-MM-DD`, không áp đặt chuẩn cho dữ liệu mới

## Kiểm thử

### Kiểm thử chức năng

1. Tạo mới gói thầu với `thoiGianBatDau = "Quý III/2026"` và xác nhận lưu thành công.
2. Tạo mới gói thầu với `thoiGianBatDau = "sau khi phê duyệt"` và xác nhận hiển thị đúng ở danh sách và dialog chi tiết.
3. Sửa một gói thầu hiện có từ giá trị ngày cũ sang text tự do và xác nhận dữ liệu cập nhật đúng.
4. Sửa một gói thầu để xóa giá trị field này và xác nhận DB lưu `null`.

### Kiểm thử tương thích dữ liệu cũ

1. Sau migrate, mở một gói thầu cũ đang có ngày và xác nhận field hiển thị thành `YYYY-MM-DD`.
2. Kiểm tra màn admin và facility cùng hiển thị nhất quán với cùng một bản ghi cũ.

### Kiểm thử hồi quy

1. Tạo/sửa gói thầu vẫn không ảnh hưởng các field khác như `thoiGianToChuc`, `thoiGianThucHien`, `phanLos`.
2. Các route admin/facility liên quan KHLCNT không bị lỗi serialization vì field không còn là `Date`.
3. Các dialog xem chi tiết gói thầu vẫn mở và hiển thị bình thường.

## Tiêu chí hoàn thành

- người dùng có thể nhập text tự do hoàn toàn cho `Thời gian bắt đầu tổ chức LCNT`
- dữ liệu mới được lưu nguyên văn sau `trim()`
- dữ liệu cũ được migrate sang `YYYY-MM-DD`
- facility và admin đều hiển thị đúng chuỗi đã lưu
- không còn logic parse/format ngày cho `GoiThau.thoiGianBatDau`
