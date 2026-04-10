# Login Page Introduction And Facility Code Guidance Design

## Context

Trang đăng nhập hiện tại tại `src/app/login/page.tsx` đã hoạt động đúng luồng xác thực, nhưng còn một số hạn chế về trải nghiệm:

- bố cục chỉ là một card đơn ở giữa màn hình, chưa truyền tải được giá trị tổng quát của phần mềm
- nhãn trường đầu vào là `Tên đăng nhập`, trong khi người dùng cơ sở thực tế đăng nhập bằng `Mã cơ sở`, dễ gây nhầm lẫn
- phần hỗ trợ sử dụng lần đầu còn ít, chưa hướng dẫn rõ trường hợp quên mật khẩu hoặc không đăng nhập được
- giao diện đang dùng tông gradient cơ bản, chưa tạo được cảm giác hiện đại, tin cậy, và phù hợp với phần mềm quản lý nội bộ ngành y tế

Luồng backend hiện tại trong `src/auth.ts` vẫn xác thực theo cặp `username + password`. Đợt thay đổi này chỉ cải thiện giao diện và cách truyền đạt, không đổi contract xác thực.

## Goal

Thiết kế lại trang đăng nhập để đạt các mục tiêu sau:

- tạo cảm giác hiện đại, rõ ràng, phù hợp với phần mềm quản lý hành chính ngành y tế
- bổ sung phần giới thiệu ngắn gọn về phần mềm với tiêu đề chính thức:
  - `Phần mềm quản lý Mua sắm và sử dụng thuốc`
- hướng dẫn rõ cho người dùng cơ sở rằng `Mã cơ sở` được dùng làm `Tên đăng nhập`
- giữ thao tác đăng nhập nhanh, không làm trang dài hoặc rối
- không thay đổi API hoặc luồng đăng nhập hiện có

## Scope

Bao gồm:

- cập nhật thiết kế UI cho `src/app/login/page.tsx`
- điều chỉnh copywriting trên trang đăng nhập
- bổ sung helper text và ghi chú hỗ trợ ở gần form
- tinh chỉnh trạng thái hiển thị `focus`, `loading`, `error`
- tối ưu bố cục cho desktop và mobile

Không bao gồm:

- thay đổi logic `signIn("credentials")`
- đổi schema dữ liệu user
- thêm luồng `quên mật khẩu` tự phục vụ
- thêm xác thực đa yếu tố hoặc SSO

## Clarified Product Decisions

Các quyết định đã chốt trong quá trình brainstorming:

- giữ luồng đăng nhập `Tên đăng nhập + Mật khẩu`
- không đổi backend sang đăng nhập bằng field riêng tên `facilityCode`
- phần hướng dẫn phải nói rõ `Tên đăng nhập chính là Mã cơ sở được cấp`
- phần giới thiệu tổng quát ưu tiên nêu mục tiêu phần mềm thay vì phân loại người dùng
- phần hỗ trợ dưới form chỉ dùng ghi chú ngắn:
  - `Nếu không đăng nhập được hoặc quên mật khẩu, vui lòng liên hệ quản trị hệ thống`

## Approach Options

### Option 1: Split hero + form

Trang được chia thành 2 cột trên desktop:

- cột trái là khối giới thiệu phần mềm
- cột phải là khối đăng nhập

Ưu điểm:

- cân bằng tốt giữa giới thiệu và thao tác
- dễ làm nổi bật hướng dẫn `Mã cơ sở`
- hiện đại hơn rõ rệt nhưng vẫn nghiêm túc
- dễ co về một cột trên mobile

Nhược điểm:

- cần xử lý spacing và responsive cẩn thận để không quá thoáng trên màn hình nhỏ

### Option 2: Single upgraded card

Giữ card đăng nhập ở trung tâm nhưng tăng mức độ phân lớp nội dung trong cùng một card.

Ưu điểm:

- thay đổi ít
- an toàn, triển khai nhanh

Nhược điểm:

- khó chứa đủ phần giới thiệu tổng quát
- độ cải thiện cảm nhận hiện đại thấp hơn

### Option 3: Landing-first login

Tạo một landing page ngắn rồi đặt form đăng nhập ở phần sau.

Ưu điểm:

- truyền tải được nhiều nội dung về phần mềm

Nhược điểm:

- làm chậm thao tác đăng nhập
- không phù hợp với nhu cầu vào hệ thống nhanh của người dùng nội bộ

## Recommendation

Chọn Option 1.

Đây là phương án cân bằng nhất cho bài toán hiện tại: nâng cấp hình ảnh sản phẩm, giữ luồng thao tác ngắn, và làm rõ cách đăng nhập bằng `Mã cơ sở` mà không đòi hỏi thay đổi backend.

## Information Architecture

### Desktop layout

Trang dùng grid 2 cột với khoảng trắng rộng và chiều cao tối thiểu bằng viewport:

- cột trái: khối hero giới thiệu phần mềm
- cột phải: card đăng nhập

Tỷ lệ ưu tiên:

- hero đủ rộng để chứa tiêu đề lớn, mô tả ngắn, và 3 điểm giá trị
- form đủ hẹp để tập trung thao tác và giảm tải thị giác

### Mobile layout

Trang tự co về 1 cột:

- hero rút gọn còn tiêu đề, mô tả, 3 điểm giới thiệu
- form đặt ngay phía dưới
- giảm kích thước khoảng trắng và typography để người dùng vào form nhanh hơn

Nguyên tắc trên mobile:

- không tạo hero quá cao
- không để phần giới thiệu đẩy form xuống quá sâu
- vẫn giữ được thông điệp `Tên đăng nhập là Mã cơ sở`

## Content Design

### Hero copy

Tiêu đề chính:

- `Phần mềm quản lý Mua sắm và sử dụng thuốc`

Mô tả phụ:

- hỗ trợ cơ sở y tế cập nhật dữ liệu mua sắm, sử dụng thuốc và tổng hợp báo cáo phục vụ quản lý, điều hành

Ba điểm giới thiệu ngắn:

- `Cập nhật số liệu mua sắm và sử dụng thuốc`
- `Theo dõi báo cáo và tiến độ thực hiện`
- `Chuẩn hóa dữ liệu phục vụ tổng hợp, điều hành`

### Form copy

Tiêu đề form:

- `Đăng nhập hệ thống`

Mô tả ngắn:

- nhập thông tin tài khoản để truy cập phần mềm

Nhãn trường đầu tiên:

- giữ là `Tên đăng nhập`

Helper text dưới nhãn:

- `Sử dụng Mã cơ sở được cấp làm tên đăng nhập`

Placeholder trường đầu tiên:

- `Nhập Mã cơ sở`

Nhãn trường mật khẩu:

- `Mật khẩu`

Placeholder mật khẩu:

- `Nhập mật khẩu`

Ghi chú hỗ trợ cuối form:

- `Nếu không đăng nhập được hoặc quên mật khẩu, vui lòng liên hệ quản trị hệ thống`

## Visual Direction

Định hướng thị giác là `hành chính hiện đại, tin cậy, sạch và rõ`.

### Color system

- dùng nhóm màu `xanh than`, `xanh ngọc nhạt`, `trắng`, và `xám lạnh`
- tránh màu quá rực hoặc phong cách marketing
- nền trang có gradient mềm để tạo chiều sâu, nhưng card form vẫn phải đủ sáng để đảm bảo độ đọc

### Background treatment

- sử dụng gradient sáng tối nhẹ theo đường chéo
- thêm 1-2 mảng sáng mờ hoặc shape blur ở góc để tránh nền phẳng
- không dùng texture nặng hoặc hình minh họa phức tạp

### Typography and hierarchy

- tiêu đề hero lớn và chắc
- phần mô tả phụ có line-length vừa phải để dễ đọc
- form ưu tiên độ rõ và khả năng quét nhanh
- helper text và support note nhỏ hơn nhưng vẫn đủ tương phản

### Card design

- card form nền sáng
- bo góc lớn hơn hiện tại
- viền mảnh và shadow mềm
- khoảng cách giữa các trường đủ rộng để tạo cảm giác thoáng và cao cấp hơn

## Interaction Design

### Form behavior

Luồng submit giữ nguyên:

- nhập `username` và `password`
- gọi `signIn("credentials")`
- nếu thành công thì chuyển về `/dashboard`
- nếu thất bại thì hiển thị lỗi ngắn gọn, dễ hiểu

### States

`default`

- form sạch, tập trung vào thao tác

`focus`

- ô nhập có viền hoặc ring rõ hơn nền thường
- helper text vẫn hiển thị để giảm nhầm lẫn với `Mã cơ sở`

`loading`

- nút chuyển sang trạng thái đang xử lý
- giữ spinner và text rõ, tránh thay đổi layout đột ngột

`error`

- thông báo lỗi hiển thị trong khối riêng, gọn, dễ đọc
- không dùng copy quá kỹ thuật

## Content And UX Constraints

- không đổi đường dẫn đăng nhập
- không đổi tên route `/login`
- không thêm lựa chọn đăng nhập bằng nhiều định danh khác nhau trong đợt này
- không hiển thị thông tin hướng dẫn quá dài trong vùng form
- không đưa số điện thoại, email, hoặc thông tin liên hệ cụ thể nếu hệ thống chưa thống nhất đầu mối hỗ trợ

## Accessibility And Responsiveness

- bảo đảm tương phản đủ tốt giữa chữ và nền
- label, helper text, error text phải đọc được rõ trên mobile
- thứ tự đọc trên mobile phải là:
  - logo hoặc nhận diện
  - tiêu đề phần mềm
  - mô tả ngắn
  - 3 điểm giới thiệu ngắn
  - form đăng nhập
- nút submit có chiều cao đủ lớn cho thao tác cảm ứng

## Implementation Notes

Triển khai dự kiến chủ yếu trong:

- `src/app/login/page.tsx`

Có thể cần tinh chỉnh nhẹ utility classes hoặc theme tokens hiện có trong:

- `src/app/globals.css`

Nhưng nguyên tắc là ưu tiên thay đổi cục bộ trong trang login trước, tránh mở rộng phạm vi không cần thiết.

## Acceptance Criteria

Một bản triển khai đạt yêu cầu khi:

1. trang `/login` hiển thị bố cục 2 cột trên desktop và 1 cột trên mobile
2. trang có tiêu đề lớn `Phần mềm quản lý Mua sắm và sử dụng thuốc`
3. phần giới thiệu thể hiện rõ 3 giá trị cốt lõi đã chốt
4. form vẫn dùng `Tên đăng nhập + Mật khẩu`
5. người dùng nhìn thấy rõ hướng dẫn `Sử dụng Mã cơ sở được cấp làm tên đăng nhập`
6. placeholder trường đầu tiên gợi ý nhập `Mã cơ sở`
7. có ghi chú ngắn hướng dẫn liên hệ quản trị nếu không đăng nhập được hoặc quên mật khẩu
8. không có thay đổi logic xác thực hoặc contract API

## Testing Plan

Kiểm tra thủ công tối thiểu:

1. mở `/login` trên desktop, xác nhận hero và form hiển thị cân đối
2. mở `/login` trên mobile, xác nhận nội dung co về 1 cột và form xuất hiện sớm, không bị đẩy xuống quá sâu
3. thử đăng nhập thành công bằng tài khoản cơ sở đang dùng `Mã cơ sở` làm `username`
4. thử đăng nhập sai mật khẩu, xác nhận lỗi vẫn hiển thị đúng
5. kiểm tra helper text và placeholder, xác nhận người dùng hiểu `Tên đăng nhập = Mã cơ sở`
6. kiểm tra trạng thái loading của nút submit, xác nhận không bị giật layout

## Risks And Limits

- nếu dữ liệu tài khoản thực tế trong một số cơ sở không đồng nhất với `Mã cơ sở`, copy hướng dẫn cần được rà lại trước khi phát hành rộng
- vì đợt này không thêm luồng `quên mật khẩu`, support note chỉ dừng ở mức hướng dẫn liên hệ quản trị
- nếu muốn nâng tiếp cảm nhận thương hiệu, có thể bổ sung hình minh họa hoặc motion nhẹ ở đợt sau, nhưng không cần cho phạm vi hiện tại
