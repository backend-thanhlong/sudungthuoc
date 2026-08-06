# Giới thiệu và hướng dẫn sử dụng hệ thống Quản lý Dược

## 1. Giới thiệu chung

Hệ thống Quản lý Dược là nền tảng web hỗ trợ Sở Y tế, các cơ sở y tế và công ty cung ứng thuốc quản lý tập trung dữ liệu mua sắm, sử dụng thuốc, báo cáo xuất - nhập - tồn, ánh xạ danh mục thuốc và dự trù đặt hàng.

Mục tiêu chính của hệ thống:

- Chuẩn hóa dữ liệu thuốc, cơ sở, công ty và kỳ báo cáo.
- Hỗ trợ cơ sở y tế nộp báo cáo, cập nhật thông tin mua sắm và theo dõi đơn đặt hàng.
- Giúp Sở Y tế tổng hợp, tra cứu, phân tích và giám sát dữ liệu toàn ngành.
- Tạo luồng phối hợp giữa cơ sở y tế và công ty cung ứng trong quá trình dự trù, phản hồi, giao hàng và xác nhận nhận hàng.
- Cung cấp trợ lý AI để hỗ trợ tổng hợp dữ liệu, kiểm tra bất thường và trả lời câu hỏi nghiệp vụ trong phạm vi được cấp quyền.

## 2. Nhóm người dùng

### Admin

Admin là tài khoản quản trị của Sở Y tế. Nhóm này có quyền xem dữ liệu toàn hệ thống, quản lý danh mục chuẩn, quản lý cơ sở, công ty, kỳ báo cáo, theo dõi báo cáo và cấu hình AI.

Các chức năng chính:

- Xem dashboard tổng quan toàn ngành.
- Quản lý kế hoạch lựa chọn nhà thầu, thông báo mời thầu, kết quả lựa chọn nhà thầu.
- Quản lý danh mục thuốc dùng chung.
- Duyệt ánh xạ danh mục thuốc do cơ sở gửi lên.
- Tổng hợp báo cáo xuất - nhập - tồn.
- Tra cứu tồn kho theo thuốc, cơ sở hoặc so sánh giữa nhiều cơ sở.
- Quản lý người dùng cơ sở, tài khoản công ty, kỳ báo cáo và nhật ký hoạt động.
- Quản trị AI, quota AI, health check provider và theo dõi usage AI.

### Cơ sở y tế

Cơ sở y tế là tài khoản của bệnh viện, trung tâm y tế hoặc đơn vị báo cáo. Nhóm này cập nhật dữ liệu mua sắm, ánh xạ danh mục thuốc nội bộ, nộp báo cáo và tạo đơn dự trù đặt hàng.

Các chức năng chính:

- Xem dashboard của đơn vị.
- Cập nhật báo cáo mua sắm.
- Ánh xạ thuốc nội bộ với danh mục thuốc dùng chung.
- Nộp báo cáo xuất - nhập - tồn theo kỳ.
- Tạo, lưu nháp, gửi và theo dõi đơn dự trù đặt hàng.
- Xác nhận số lượng nhận hàng.
- Tra cứu tồn kho.
- Sử dụng trợ lý AI và nút `AI kiểm tra` nếu được bật.

### Công ty

Công ty là tài khoản của đơn vị cung ứng thuốc. Nhóm này tiếp nhận đơn đặt hàng từ cơ sở, phản hồi số lượng có thể cung ứng và tạo các đợt giao hàng.

Các chức năng chính:

- Xem danh sách đơn đặt hàng được gửi tới công ty.
- Phản hồi từng dòng thuốc: duyệt, duyệt một phần hoặc từ chối.
- Quản lý danh mục thuốc công ty.
- Tạo đợt giao hàng, nhập số lượng giao và khoảng thời gian giao.
- In đơn và tra cứu đơn qua mã QR.

## 3. Đăng nhập và giao diện chung

1. Truy cập trang đăng nhập của hệ thống.
2. Nhập tên đăng nhập và mật khẩu được cấp.
3. Với tài khoản cơ sở, tên đăng nhập thường là mã cơ sở.
4. Sau khi đăng nhập, hệ thống tự chuyển đến dashboard phù hợp với vai trò.

Trên giao diện chính có các khu vực quan trọng:

- Sidebar bên trái: menu chức năng theo vai trò.
- Header trên cùng: thông tin tài khoản, thông báo, đổi mật khẩu, hồ sơ cơ sở, chuyển giao diện sáng/tối và mở trợ lý AI.
- Khu vực nội dung: danh sách, biểu đồ, form nhập liệu, bảng dữ liệu và các hộp thoại thao tác.

Người dùng nên đổi mật khẩu sau lần đăng nhập đầu tiên bằng menu tài khoản ở góc trên bên phải.

## 4. Dashboard và phân tích dữ liệu

Dashboard cung cấp cái nhìn tổng quan về hoạt động dược. Admin có thể xem toàn ngành hoặc lọc theo từng đơn vị. Cơ sở y tế chỉ xem dữ liệu của chính đơn vị mình.

Các tab chính:

- `Tổng quan`: chỉ số tổng hợp, giá trị tồn kho, số lượng thuốc, cơ cấu thuốc và tình hình báo cáo.
- `Cung ứng`: theo dõi tồn kho, nguy cơ thiếu thuốc, tồn kho không có nhu cầu và các cảnh báo cung ứng.
- `Đấu thầu`: tổng hợp thông tin mua sắm, gói thầu, thông báo mời thầu và kết quả lựa chọn nhà thầu.
- `Phân tích`: phân tích sử dụng thuốc, nhóm ABC, thuốc cần kiểm soát, dòng dữ liệu bất thường hoặc chưa ánh xạ.

Admin có thêm bộ lọc đơn vị và kỳ báo cáo. Cơ sở có bộ lọc kỳ báo cáo.

## 5. Quản lý mua sắm

Module mua sắm hỗ trợ theo dõi quy trình từ kế hoạch lựa chọn nhà thầu đến thông báo mời thầu, kết quả lựa chọn nhà thầu, tra cứu và thống kê.

Các màn hình chính:

- `Quản lý KH LCNT` hoặc `Lập Kế hoạch LCNT`: quản lý kế hoạch lựa chọn nhà thầu.
- `Thông báo mời thầu`: cập nhật và theo dõi thông báo mời thầu.
- `Kết quả LCNT`: cập nhật kết quả lựa chọn nhà thầu.
- `Tra cứu`: tìm kiếm gói thầu, đơn vị, trạng thái và thông tin liên quan.
- `Thống kê`: xem KPI, giá trị gói thầu, giá trị trúng thầu, số thông báo và tỷ lệ trúng thầu.

Luồng sử dụng cơ bản:

1. Cơ sở nhập hoặc cập nhật kế hoạch lựa chọn nhà thầu.
2. Khi có thông báo mời thầu, cập nhật thông tin tương ứng.
3. Khi có kết quả, cập nhật kết quả lựa chọn nhà thầu.
4. Dùng trang tra cứu và thống kê để kiểm tra tiến độ, trạng thái và giá trị.
5. Admin theo dõi dữ liệu của tất cả cơ sở để tổng hợp và giám sát.

## 6. Danh mục thuốc dùng chung

Danh mục thuốc dùng chung là dữ liệu chuẩn để các cơ sở ánh xạ thuốc nội bộ, phục vụ báo cáo và phân tích thống nhất.

Chức năng chính:

- Thêm, sửa, xóa hoặc ẩn/hiện thuốc trong danh mục.
- Import danh mục thuốc từ Excel.
- Xuất Excel danh mục.
- Tìm kiếm theo tên thuốc, số giấy phép lưu hành, hoạt chất, mã chung và nhiều trường khác.
- Lọc theo từng cột, tùy chỉnh cột hiển thị và bật/tắt cách xuống dòng trong bảng.
- Gán nhóm thuốc, nhóm điều trị, thông tin kê đơn, kiểm soát đặc biệt, nguồn gốc trong nước hoặc nhập khẩu.

Lưu ý:

- Chỉ Admin nên cập nhật danh mục chuẩn.
- Khi danh mục chuẩn thay đổi, dữ liệu ánh xạ và báo cáo của cơ sở có thể bị ảnh hưởng.
- Không nên xóa hàng loạt nếu chưa sao lưu hoặc chưa kiểm tra tác động.

## 7. Ánh xạ danh mục thuốc

Ánh xạ danh mục thuốc giúp cơ sở nối thuốc nội bộ với thuốc chuẩn trong danh mục dùng chung. Đây là bước quan trọng trước khi nộp báo cáo chính xác.

Luồng cơ sở y tế:

1. Vào `Ánh xạ danh mục thuốc`.
2. Tải mẫu Excel nếu cần nhập danh sách thuốc nội bộ.
3. Upload file Excel hoặc nhập/chỉnh sửa trực tiếp trên giao diện.
4. Với từng thuốc nội bộ, chọn thuốc tương ứng trong danh mục dùng chung hoặc đánh dấu ngoài danh mục.
5. Bổ sung thông tin nội bộ còn thiếu như mã nội bộ, tên thuốc, hoạt chất, số đăng ký, đơn vị tính và nhóm TCKT.
6. Khi hoàn tất, bấm `Gửi duyệt lên Sở`.

Luồng Admin:

1. Vào `Duyệt ánh xạ`.
2. Xem danh sách cơ sở có ánh xạ chờ duyệt.
3. Kiểm tra từng thuốc nội bộ và thuốc chuẩn được chọn.
4. Duyệt nếu đúng hoặc từ chối kèm ghi chú.

Khi bị từ chối, cơ sở cần vào tab `Từ chối`, xem lý do, chỉnh lại ánh xạ rồi gửi duyệt lại.

Cơ sở có thể xuất danh sách thuốc đã duyệt ra Excel để kiểm tra hoặc bổ sung nhóm TCKT.

## 8. Báo cáo xuất - nhập - tồn

Module báo cáo xuất - nhập - tồn cho phép cơ sở nộp dữ liệu sử dụng thuốc theo kỳ báo cáo.

Luồng cơ sở y tế:

1. Vào `Báo cáo Xuất-Nhập-Tồn`.
2. Chọn kỳ báo cáo.
3. Tải mẫu báo cáo Excel của kỳ đó.
4. Nhập số liệu theo mẫu, không tự ý đổi cấu trúc cột quan trọng.
5. Upload file lên hệ thống.
6. Kiểm tra phần preview và lỗi cảnh báo nếu có.
7. Khi dữ liệu hợp lệ, nộp báo cáo.

Sau khi nộp, báo cáo được chốt tự động và không thể nộp lại cho cùng kỳ nếu hệ thống đã khóa báo cáo đó.

Chức năng hỗ trợ:

- Xem lại danh sách báo cáo đã nộp.
- Xuất báo cáo đã nộp.
- Xem chi tiết dòng dữ liệu, tìm kiếm theo mã nội bộ, tên thuốc, hoạt chất, số đăng ký, mã chung, mã BHYT, nhóm TCKT, công ty và các trường liên quan.
- Dùng `AI kiểm tra` để phát hiện dữ liệu bất thường hoặc điểm cần rà soát.

Admin có thể vào `Tổng hợp Xuất-Nhập-Tồn` để xem, lọc và xuất dữ liệu tổng hợp của các cơ sở.

## 9. Dự trù đặt hàng

Module dự trù đặt hàng kết nối cơ sở y tế với công ty cung ứng.

### Cơ sở y tế tạo đơn

1. Vào `Dự trù đặt hàng` > `Quản lý đơn`.
2. Tạo đơn mới hoặc mở đơn nháp.
3. Chọn công ty cung ứng.
4. Thêm thuốc từ danh mục dùng chung hoặc danh mục thuốc công ty.
5. Nhập số lượng cần đặt.
6. Dùng gợi ý của hệ thống nếu có dữ liệu phù hợp.
7. Bấm `Lưu nháp` để lưu tạm.
8. Khi đã kiểm tra xong, bấm `Gửi công ty`.

Các trạng thái thường gặp:

- `Nháp`: cơ sở còn chỉnh sửa được.
- `Đã gửi`: đơn đã gửi sang công ty.
- `Từ chối`: công ty từ chối một phần hoặc toàn bộ.
- `Sẵn sàng giao`: công ty đã phản hồi và có thể tạo đợt giao.
- `Đang giao`: đã có đợt giao hàng.
- `Hoàn tất`: đơn đã được xử lý xong.

### Công ty phản hồi đơn

1. Đăng nhập bằng tài khoản công ty.
2. Vào `Dự trù đặt hàng` > `Quản lý đơn`.
3. Mở đơn được cơ sở gửi.
4. Với từng dòng thuốc, nhập số lượng duyệt hoặc lý do từ chối.
5. Có thể tạo mới hoặc chỉnh danh mục thuốc công ty nếu cần liên kết thuốc.
6. Bấm `Lưu phản hồi`.
7. Khi có hàng, tạo đợt giao và nhập số lượng giao theo từng dòng.

### Cơ sở xác nhận nhận hàng

1. Mở đơn đang giao.
2. Kiểm tra từng đợt giao.
3. Nhập số lượng thực nhận.
4. Lưu xác nhận nhận hàng.
5. In đơn hoặc dùng mã QR để tra cứu nhanh khi cần.

## 10. Tra cứu tồn kho

Trang `Tra cứu tồn kho` hỗ trợ tìm kiếm dữ liệu tồn kho theo nhiều góc nhìn:

- Tra cứu theo thuốc: nhập tên thuốc, hoạt chất, số đăng ký hoặc mã liên quan để xem tồn kho và thông tin sử dụng.
- Tra cứu theo cơ sở: chọn cơ sở để xem danh sách thuốc và tồn kho tại cơ sở đó.
- So sánh cơ sở: chọn một thuốc và nhiều cơ sở để so sánh số lượng, giá trị hoặc tình trạng tồn kho.

Tính năng này phù hợp khi cần kiểm tra nhanh nơi còn thuốc, so sánh dữ liệu giữa các đơn vị hoặc hỗ trợ điều phối cung ứng.

## 11. Quản trị hệ thống

Các chức năng quản trị nằm trong nhóm `Cài đặt` của Admin.

### Quản lý cơ sở

- Thêm tài khoản cơ sở mới.
- Cập nhật tên cơ sở, mã cơ sở, loại hình, nhóm tự chủ, người liên hệ, số điện thoại, địa chỉ và tọa độ.
- Kích hoạt hoặc vô hiệu hóa tài khoản.
- Đặt lại mật khẩu.
- Tìm kiếm và phân trang danh sách cơ sở.

### Quản lý công ty

- Thêm công ty và tài khoản đăng nhập tương ứng.
- Cập nhật thông tin liên hệ, email, số điện thoại và địa chỉ.
- Kích hoạt hoặc vô hiệu hóa công ty.
- Đặt lại mật khẩu tài khoản công ty.

### Quản lý kỳ báo cáo

- Tạo kỳ báo cáo mới theo tháng/năm.
- Cấu hình hạn nộp nếu có.
- Gửi nhắc nhở tới các cơ sở.
- Xóa kỳ báo cáo khi chưa còn phù hợp.

### Danh mục nhóm điều trị

- Thêm, sửa, ẩn/hiện hoặc xóa nhóm điều trị.
- Dùng để chuẩn hóa trường nhóm điều trị trong danh mục thuốc dùng chung.

### Bảng màu biểu đồ

- Cấu hình màu hiển thị cho biểu đồ dashboard.
- Giúp chuẩn hóa màu sắc giữa các báo cáo và màn hình phân tích.

### Nhật ký hoạt động

- Theo dõi thao tác thêm, sửa, xóa, import, export, đăng nhập, AI và các hành động nghiệp vụ.
- Lọc theo người dùng, hành động, loại đối tượng và khoảng thời gian.

## 12. Trợ lý AI

Hệ thống có trợ lý AI cho Admin và cơ sở y tế nếu được bật trong cấu hình.

Chức năng chính:

- Hỏi đáp về dữ liệu tồn kho, báo cáo, ánh xạ, mua sắm và cảnh báo bất thường.
- Tóm tắt dữ liệu theo quyền truy cập của người dùng.
- Hỗ trợ `AI kiểm tra` trên một số màn hình như báo cáo xuất - nhập - tồn và ánh xạ danh mục thuốc.
- Cho phép Admin cấu hình provider, quota, fallback, tool policy và health check.
- Theo dõi usage AI, trạng thái thành công/lỗi, token và chi phí ước tính.

Lưu ý khi sử dụng AI:

- AI chỉ có vai trò hỗ trợ tổng hợp và kiểm tra, không thay thế trách nhiệm xác nhận nghiệp vụ.
- AI không tự sửa, xóa, phê duyệt hoặc ghi dữ liệu nghiệp vụ.
- Nếu provider AI báo lỗi thiếu API key, timeout hoặc hết số dư, Admin cần kiểm tra cấu hình môi trường và tài khoản provider.
- Với DeepSeek, lỗi `Insufficient Balance` nghĩa là tài khoản API chưa có số dư khả dụng.

## 13. Thông báo, hồ sơ và bảo mật tài khoản

Hệ thống có chuông thông báo ở thanh trên cùng để nhắc các sự kiện liên quan như kỳ báo cáo, báo cáo mới, đơn đặt hàng hoặc thao tác cần chú ý.

Người dùng có thể:

- Xem thông báo mới.
- Đổi mật khẩu.
- Cập nhật hồ sơ cơ sở nếu tài khoản là cơ sở y tế.
- Đăng xuất sau khi sử dụng.

Khuyến nghị bảo mật:

- Không chia sẻ mật khẩu.
- Đổi mật khẩu định kỳ.
- Đăng xuất khi dùng máy tính chung.
- Báo Admin nếu phát hiện tài khoản bị truy cập bất thường.

## 14. Hướng dẫn chạy hệ thống cho quản trị kỹ thuật

### Chạy môi trường phát triển

```bash
npm install
npm run dev
```

Sau đó mở:

```text
http://localhost:3000
```

### Chạy bằng Docker Compose

Chuẩn bị file `.env` với các biến cần thiết, sau đó chạy:

```bash
docker compose --env-file .env up -d
```

Một số biến môi trường quan trọng:

- `APP_DATABASE_URL`: chuỗi kết nối database của ứng dụng.
- `DATABASE_ADMIN_URL`: chuỗi kết nối database cho tác vụ admin/migration nếu dùng.
- `AUTH_SECRET`: khóa bảo mật phiên đăng nhập.
- `AUTH_URL`: URL public của hệ thống.
- `REPORT_UPLOAD_SIGNING_SECRET`: khóa ký cho upload báo cáo.
- `DRUG_ORDER_QR_SIGNING_SECRET`: khóa ký cho QR đơn đặt hàng.
- `GOOGLE_GENERATIVE_AI_API_KEY`: API key cho Google AI/Gemini.
- `DEEPSEEK_API_KEY`: API key cho DeepSeek.
- `AI_DEEPSEEK_MODEL`: model DeepSeek, mặc định `deepseek-v4-flash`.
- `AI_DATABASE_READ_URL`: kết nối đọc an toàn cho AI đọc dữ liệu.

Sau khi thay đổi biến môi trường, cần restart container app:

```bash
docker compose --env-file .env up -d --force-recreate app
```

## 15. Lỗi thường gặp và cách xử lý

### Không đăng nhập được

- Kiểm tra đúng tên đăng nhập và mật khẩu.
- Với cơ sở y tế, tên đăng nhập thường là mã cơ sở.
- Nếu quên mật khẩu, liên hệ Admin để đặt lại.
- Nếu tài khoản bị vô hiệu hóa, Admin cần kích hoạt lại.

### Không thấy menu mong muốn

- Menu phụ thuộc vào vai trò tài khoản.
- Tài khoản công ty chỉ thấy chức năng dự trù đặt hàng.
- Tài khoản cơ sở không có quyền truy cập các màn hình quản trị toàn hệ thống.

### Không upload được báo cáo Excel

- Kiểm tra đã chọn đúng kỳ báo cáo.
- Tải lại mẫu mới nhất từ hệ thống.
- Không đổi tên sheet hoặc cấu trúc cột quan trọng.
- Kiểm tra lỗi preview và sửa lại file trước khi nộp.
- Nếu báo cáo đã nộp và chốt, không thể nộp lại cùng kỳ.

### Ánh xạ bị từ chối

- Vào tab `Từ chối`.
- Đọc ghi chú của Admin.
- Chọn lại thuốc chuẩn hoặc bổ sung thông tin nội bộ.
- Gửi duyệt lại.

### Đơn đặt hàng không sửa được

- Chỉ đơn `Nháp` mới chỉnh sửa đầy đủ.
- Nếu đã gửi công ty, cần dùng chức năng `Thu hồi` nếu còn được phép.
- Nếu đơn đã có giao nhận hoặc hoàn tất, hệ thống có thể khóa một số thao tác để giữ lịch sử.

### AI không hoạt động

- Kiểm tra AI có được bật trong `Quản trị AI`.
- Kiểm tra quota người dùng và policy tool.
- Kiểm tra provider đã có API key.
- Chạy health check provider trong trang `Quản trị AI`.
- Nếu DeepSeek trả `Insufficient Balance`, cần nạp thêm số dư cho tài khoản DeepSeek API.

## 16. Thực hành dữ liệu tốt

- Luôn tải mẫu Excel mới nhất trước khi nhập liệu.
- Không tự ý sửa cấu trúc cột, tên sheet hoặc mã định danh trong mẫu.
- Kiểm tra preview và cảnh báo trước khi nộp.
- Hoàn tất ánh xạ danh mục thuốc trước khi nộp báo cáo.
- Dùng ghi chú rõ ràng khi từ chối, phản hồi hoặc điều chỉnh dữ liệu.
- Xuất Excel định kỳ nếu cần lưu trữ, đối chiếu hoặc báo cáo ngoài hệ thống.
- Sử dụng AI như công cụ hỗ trợ rà soát, không dùng AI làm căn cứ duy nhất cho quyết định nghiệp vụ.

