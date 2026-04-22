# Login Page Introduction And Facility Code Guidance Implementation Plan

## Inputs

Plan này dựa trên:

- Spec đã chốt: [2026-04-10-login-page-introduction-facility-code-design.md](/opt/sudungthuoc/sudungthuoc/docs/superpowers/specs/2026-04-10-login-page-introduction-facility-code-design.md)
- Trang đăng nhập hiện tại: [page.tsx](/opt/sudungthuoc/sudungthuoc/src/app/login/page.tsx)
- Theme toàn cục hiện tại: [globals.css](/opt/sudungthuoc/sudungthuoc/src/app/globals.css)
- Luồng xác thực credentials hiện tại: [auth.ts](/opt/sudungthuoc/sudungthuoc/src/auth.ts)

## Goal

Triển khai lại trang `/login` theo bố cục `hero + form` để:

- giới thiệu ngắn gọn phần mềm với tiêu đề `Phần mềm quản lý Mua sắm và sử dụng thuốc`
- làm rõ rằng `Mã cơ sở` được dùng làm `Tên đăng nhập`
- giữ nguyên luồng xác thực `username + password`
- nâng chất lượng giao diện theo hướng hiện đại, tin cậy, dễ đọc trên desktop và mobile

## Delivery Principles

- không đổi API đăng nhập
- không đổi route `/login`
- không đổi contract `signIn("credentials")`
- ưu tiên thay đổi cục bộ trong [page.tsx](/opt/sudungthuoc/sudungthuoc/src/app/login/page.tsx)
- chỉ động đến [globals.css](/opt/sudungthuoc/sudungthuoc/src/app/globals.css) nếu thật sự cần thêm utility hoặc token dùng chung

## Current Constraints

- file [page.tsx](/opt/sudungthuoc/sudungthuoc/src/app/login/page.tsx) đã có thay đổi chưa commit trong workspace, hiện chủ yếu là chuyển từ thẻ `img` sang `next/image`
- backend vẫn xác thực theo `username`, nên mọi thay đổi copy phải làm rõ `Tên đăng nhập = Mã cơ sở` thay vì đổi logic form
- trang cần giữ tốc độ thao tác nhanh cho người dùng nội bộ, tránh biến thành landing page dài

## Target Files

### Runtime files

- `src/app/login/page.tsx`
- `src/app/globals.css` nếu cần

### Docs

- `docs/superpowers/specs/2026-04-10-login-page-introduction-facility-code-design.md`
- `docs/superpowers/plans/2026-04-10-login-page-introduction-facility-code-implementation-plan.md`

## Phase Breakdown

## Phase 1: Restructure Login Layout

### Objective

Chuyển layout từ `single centered card` sang `split hero + form`.

### Tasks

1. Tổ chức lại root container của trang login theo bố cục responsive:
   - desktop: 2 cột
   - mobile: 1 cột
2. Giữ card đăng nhập ở cột phải
3. Tạo khối hero ở cột trái với:
   - logo hoặc nhận diện
   - tiêu đề phần mềm
   - mô tả ngắn
   - 3 điểm giới thiệu
4. Tạo nền có chiều sâu bằng gradient và các shape mờ nhẹ

### Acceptance Criteria

- trang `/login` không còn chỉ là một card đơn ở giữa nền xanh
- hero và form phân tách rõ trên desktop
- mobile co gọn về một cột mà không đẩy form xuống quá sâu

## Phase 2: Update Form Content And Guidance

### Objective

Làm rõ cho người dùng cơ sở rằng `Mã cơ sở` là định danh đăng nhập thực tế.

### Tasks

1. Giữ nhãn trường đầu tiên là `Tên đăng nhập`
2. Thêm helper text:
   - `Sử dụng Mã cơ sở được cấp làm tên đăng nhập`
3. Đổi placeholder trường đầu tiên thành:
   - `Nhập Mã cơ sở`
4. Giữ placeholder trường mật khẩu:
   - `Nhập mật khẩu`
5. Thêm support note cuối form:
   - `Nếu không đăng nhập được hoặc quên mật khẩu, vui lòng liên hệ quản trị hệ thống`
6. Giữ thông báo lỗi ngắn gọn, rõ ràng như hiện có

### Acceptance Criteria

- người dùng có thể hiểu cách đăng nhập ngay khi nhìn form
- không có thay đổi nào tới dữ liệu submit lên `signIn`

## Phase 3: Refresh Visual Hierarchy And States

### Objective

Nâng chất lượng thị giác và giữ form dễ thao tác trong mọi trạng thái.

### Tasks

1. Áp dụng palette `xanh than + xanh ngọc nhạt + nền sáng`
2. Làm card form sáng, bo lớn, shadow mềm, viền mảnh
3. Tăng thứ bậc typography cho hero title, form title, helper text
4. Cải thiện trạng thái `focus` cho input
5. Giữ trạng thái `loading` hiện có nhưng cập nhật cho phù hợp layout mới
6. Đặt lỗi trong khối cảnh báo rõ ràng nhưng không quá gắt

### Acceptance Criteria

- trang có cảm giác hiện đại hơn nhưng vẫn nghiêm túc
- form dễ đọc và dễ thao tác trên nền mới
- loading và error không làm vỡ layout

## Phase 4: Verify Responsive Behavior

### Objective

Đảm bảo layout mới không bị regression trên các kích thước màn hình phổ biến.

### Tasks

1. Kiểm tra desktop:
   - hero và form cân đối
   - khoảng trắng không quá thưa
2. Kiểm tra mobile:
   - nội dung hero rút gọn đúng
   - form xuất hiện sớm
   - nút submit đủ lớn cho cảm ứng
3. Kiểm tra chiều dài copy để tránh tràn hoặc wrap xấu

### Acceptance Criteria

- không có vùng nội dung bị ép quá hẹp
- không cần cuộn dài mới thấy form trên mobile thông dụng

## Phase 5: Validation And Safety Checks

### Objective

Xác nhận thay đổi chỉ là UI/UX, không tác động logic đăng nhập.

### Tasks

1. Thử đăng nhập thành công bằng tài khoản hợp lệ
2. Thử đăng nhập sai mật khẩu để xác nhận error state
3. Chạy kiểm tra tĩnh tối thiểu cho file thay đổi nếu môi trường cho phép
4. Ghi rõ trong closeout nếu có bước chưa xác minh được

### Acceptance Criteria

- trang mới vẫn đăng nhập thành công như cũ
- không phát sinh lỗi type hoặc lint ở phần đã chỉnh

## Manual Verification Checklist

1. Mở `/login` trên desktop
2. Xác nhận có tiêu đề `Phần mềm quản lý Mua sắm và sử dụng thuốc`
3. Xác nhận hero hiển thị đủ 3 điểm giới thiệu
4. Xác nhận form có helper text `Sử dụng Mã cơ sở được cấp làm tên đăng nhập`
5. Xác nhận placeholder ô đầu tiên là `Nhập Mã cơ sở`
6. Đăng nhập bằng tài khoản hợp lệ
7. Đăng nhập sai một lần để kiểm tra thông báo lỗi
8. Mở trên mobile để xác nhận bố cục 1 cột và khoảng cách hợp lý

## Risks And Mitigations

- Risk: Nội dung hero quá dài trên mobile
  - Mitigation: giữ copy ngắn, line-height thoáng, spacing co giãn theo breakpoint
- Risk: Nền gradient hoặc blur làm giảm độ đọc của form
  - Mitigation: giữ card form nền sáng đặc và tương phản cao
- Risk: Người dùng hiểu nhầm là backend đổi sang field `facilityCode`
  - Mitigation: chỉ đổi copy hướng dẫn, không đổi tên field submit trong code

## Success Criteria

- Trang `/login` truyền tải được giá trị tổng quát của phần mềm
- Người dùng cơ sở hiểu ngay rằng `Mã cơ sở` là `Tên đăng nhập`
- Form đăng nhập vẫn hoạt động đúng logic hiện tại
- Giao diện mới rõ ràng hơn trên cả desktop và mobile
