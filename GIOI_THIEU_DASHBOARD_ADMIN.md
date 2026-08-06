# Bài giới thiệu phần mềm và ý nghĩa các chỉ số Dashboard

## 1. Mở đầu thuyết trình

Kính thưa quý đại biểu, quý lãnh đạo và các anh chị,

Phần mềm được xây dựng nhằm hỗ trợ công tác quản lý dược trên nền dữ liệu báo cáo thực tế của các cơ sở y tế. Thay vì theo dõi thủ công bằng nhiều file rời rạc, hệ thống tập trung dữ liệu tồn kho, nhập - xuất, sử dụng thuốc, hợp đồng cung ứng, đấu thầu và mua sắm vào một nền tảng thống nhất.

Điểm trọng tâm của phần mềm là Dashboard quản lý. Dashboard không chỉ hiển thị số liệu tổng hợp, mà còn giúp người quản lý trả lời nhanh các câu hỏi nghiệp vụ:

- Toàn ngành đang có bao nhiêu giá trị tồn kho?
- Cơ sở nào tồn kho lớn, cơ sở nào có nguy cơ thiếu thuốc?
- Thuốc nào tiêu thụ nhiều, thuốc nào cần kiểm soát đặc biệt?
- Hợp đồng nào sắp hết hạn và cần chuẩn bị kế hoạch mua sắm mới?
- Quy trình mua sắm, gói thầu, thông báo mời thầu và kết quả lựa chọn nhà thầu đang ở trạng thái nào?

Vì vậy, phần mềm không chỉ là công cụ nhập liệu, mà là công cụ hỗ trợ điều hành, giám sát rủi ro và ra quyết định trong quản lý dược.

## 2. Tổng quan phần mềm

Phần mềm phục vụ nhiều nhóm người dùng trong cùng một quy trình quản lý:

- Cơ sở y tế cập nhật báo cáo sử dụng thuốc, tồn kho, kế hoạch lựa chọn nhà thầu và kết quả mua sắm.
- Quản trị viên tổng hợp dữ liệu toàn hệ thống, theo dõi chất lượng báo cáo và phân tích tình hình cung ứng.
- Đơn vị quản lý có thể lọc theo kỳ báo cáo, theo cơ sở, theo nhóm thuốc hoặc theo các chỉ số cảnh báo để nắm tình hình nhanh.

Dữ liệu sau khi được cập nhật sẽ đi vào các màn hình dashboard. Các dashboard này biến dữ liệu nghiệp vụ thành biểu đồ, bảng cảnh báo và chỉ số trực quan, giúp người quản lý chuyển từ "xem số liệu" sang "nhận diện vấn đề".

## 3. Dashboard Quản lý Dược

Đường dẫn: `/dashboard/admin`

Dashboard Quản lý Dược là màn hình điều hành tổng hợp cho toàn hệ thống. Người dùng có thể lọc theo:

- Đơn vị: xem toàn ngành hoặc từng cơ sở y tế.
- Kỳ báo cáo: xem toàn bộ dữ liệu hoặc một kỳ báo cáo cụ thể.

Dashboard gồm 5 nhóm phân tích chính: Tổng quan, Cung ứng, Đấu thầu, Phân tích và Thuốc hiếm.

### 3.1. Tab Tổng quan

Tab Tổng quan cung cấp bức tranh chung về tồn kho và sử dụng thuốc.

Các chỉ số chính:

- Tổng giá trị tồn kho: tổng giá trị thuốc còn tồn cuối kỳ, giúp đánh giá quy mô nguồn lực thuốc đang nằm tại kho.
- Tỷ lệ thuốc nội: tỷ trọng thuốc trong nước theo giá trị xuất kho, hỗ trợ theo dõi định hướng sử dụng thuốc sản xuất trong nước.
- Số mặt hàng quản lý: số mã thuốc phân biệt đang được hệ thống ghi nhận.

Các biểu đồ và ý nghĩa:

- Giá trị tồn kho theo nhóm thuốc: cho biết tồn kho đang tập trung ở nhóm Hóa dược, Dược liệu, Sinh phẩm, Thuốc cổ truyền, Vắc xin hay nhóm khác.
- Top 10 cơ sở tồn kho lớn nhất: giúp nhận diện các đơn vị đang nắm giữ lượng tồn kho cao.
- BHYT vs. Dịch vụ: cho biết cơ cấu giá trị sử dụng thuốc theo nguồn thanh toán.
- Top 10 cơ sở giá trị xuất lớn nhất: phản ánh mức độ sử dụng thuốc theo cơ sở.
- Top 10 cơ sở giá trị nhập lớn nhất: cho thấy nơi phát sinh giá trị nhập kho lớn.
- Giá trị tồn kho theo địa chỉ và phân bố theo địa bàn: hỗ trợ nhìn dữ liệu tồn kho trên không gian địa lý, giúp phát hiện khu vực tập trung tồn kho cao.

Ý nghĩa quản trị:

Tab này giúp lãnh đạo nhanh chóng nắm quy mô tồn kho, mức độ sử dụng, cơ cấu thuốc và phân bố theo cơ sở. Đây là phần nên trình bày đầu tiên vì tạo bức tranh tổng quan trước khi đi vào rủi ro chi tiết.

### 3.2. Tab Cung ứng

Tab Cung ứng tập trung vào an toàn cung ứng thuốc, nguy cơ thiếu thuốc và hiệu quả sử dụng tồn kho.

Các chỉ số chính:

- Giá trị tồn cuối: tổng giá trị tồn kho ở phạm vi đang chọn.
- Giá trị xuất: tổng giá trị thuốc đã sử dụng hoặc xuất kho.
- Số thuốc hết hàng: các thuốc có tồn cuối bằng 0 nhưng vẫn có nhu cầu sử dụng.
- Thuốc dưới 1 tháng: các thuốc có độ phủ tồn kho dưới 1 tháng, có nguy cơ thiếu sớm.
- Tồn không nhu cầu: thuốc còn tồn nhưng không phát sinh nhu cầu trong cửa sổ phân tích.
- Hợp đồng sắp hết: số thuốc hoặc hợp đồng có nguy cơ gián đoạn do sắp hết hiệu lực.

Các bảng cảnh báo:

- Thuốc hết hàng: cho biết thuốc nào đang không còn tồn kho trong khi có nhu cầu.
- Thuốc nguy cơ thiếu: tính số tháng đủ dùng dựa trên tồn cuối và nhu cầu bình quân.
- Tồn kho không phát sinh nhu cầu: giúp phát hiện hàng tồn chậm luân chuyển, có nguy cơ giam vốn hoặc hết hạn.
- Top tồn giá trị cao nhưng độ phủ lớn: chỉ ra thuốc đang chiếm vốn lớn nhưng chưa cần bổ sung ngay.
- Top thuốc nguy cơ thiếu theo giá trị: ưu tiên các thuốc có độ phủ thấp và giá trị rủi ro cao.

Độ phủ dữ liệu báo cáo:

Phần này cho biết dashboard đang phản ánh bao nhiêu cơ sở và bao nhiêu dòng dữ liệu đủ điều kiện phân tích, gồm:

- Cơ sở có dữ liệu.
- Dòng có giá VAT.
- Dòng có thông tin hợp đồng.
- Dòng map được master drug.
- Dòng có phân loại thuốc trong nước/nước ngoài.

Ý nghĩa quản trị:

Tab Cung ứng giúp chuyển dashboard từ báo cáo thụ động sang cảnh báo chủ động. Người quản lý có thể ưu tiên xử lý thuốc thiếu, thuốc sắp thiếu, hàng tồn không nhu cầu và các điểm yếu trong chất lượng dữ liệu.

### 3.3. Tab Đấu thầu

Tab Đấu thầu tập trung vào hợp đồng cung ứng, nhà cung cấp và biến động giá.

Các thành phần chính:

- Tiến độ hợp đồng cung ứng: biểu đồ thời gian thể hiện hợp đồng còn hiệu lực, sắp hết hạn hoặc đã hết hạn.
- Hợp đồng sắp hết hạn trong 60 ngày: danh sách các thuốc cần chuẩn bị kế hoạch đấu thầu hoặc mua sắm mới.
- Top 10 nhà cung ứng: xếp hạng theo giá trị cung ứng, tính từ nhập kho nhân với giá VAT.
- So sánh giá giữa các gói thầu: phát hiện chênh lệch giá đáng chú ý giữa các gói thầu, đặc biệt khi mức chênh lệch vượt 5%.

Ý nghĩa quản trị:

Tab này giúp theo dõi tính liên tục của nguồn cung. Nếu hợp đồng sắp hết hạn nhưng thuốc vẫn có nhu cầu, hệ thống giúp cảnh báo sớm để chuẩn bị kế hoạch lựa chọn nhà thầu, tránh gián đoạn cung ứng.

### 3.4. Tab Phân tích

Tab Phân tích tập trung vào phân tích ABC và cơ cấu sử dụng thuốc.

Các chỉ số chính:

- Tổng giá trị tiêu thụ: tính theo số lượng xuất nhân với đơn giá VAT.
- Tổng số lượng tiêu thụ: tổng số lượng thuốc đã xuất.
- Số mặt hàng ABC: số thuốc đủ điều kiện được đưa vào phân hạng ABC.
- Dòng cần kiểm tra: các dòng dữ liệu không được đưa vào xếp hạng ABC do thiếu hoặc bất thường.

Phân tích ABC:

- Hạng A: nhóm thuốc chiếm tỷ trọng giá trị tiêu thụ cao nhất, cần kiểm soát chặt.
- Hạng B: nhóm thuốc có mức tiêu thụ trung bình.
- Hạng C: nhóm thuốc có giá trị tiêu thụ thấp hơn nhưng vẫn cần theo dõi để đảm bảo đầy đủ danh mục.

Các thành phần phân tích:

- Biểu đồ Pareto ABC: cột thể hiện giá trị tiêu thụ, đường thể hiện phần trăm tích lũy.
- Bảng chi tiết ABC: hiển thị thuốc, hoạt chất, hàm lượng, đơn vị tính, số lượng, đơn giá bình quân, khoảng giá, giá trị, tỷ trọng và hạng ABC.
- Tổng quan sử dụng thuốc: phân tích theo nhóm thuốc, nhóm điều trị, thuốc kiểm soát đặc biệt, thuốc kê đơn và thuốc trong nước.
- Giám sát ABC: cảnh báo các nhóm cần kiểm tra như hạng A kiểm soát đặc biệt, hạng A nhiều mức giá, xuất nhưng giá bằng 0, chưa ánh xạ nhưng có tiêu thụ.

Ý nghĩa quản trị:

Tab Phân tích giúp tập trung nguồn lực quản lý vào đúng nhóm thuốc có tác động tài chính lớn. Đặc biệt, thuốc hạng A, thuốc kiểm soát đặc biệt, thuốc có nhiều mức giá hoặc thuốc chưa ánh xạ là các nhóm cần được rà soát thường xuyên.

### 3.5. Tab Thuốc hiếm

Tab Thuốc hiếm theo dõi riêng các thuốc hiếm có phát sinh báo cáo.

Các chỉ số chính:

- Số thuốc hiếm: số thuốc hiếm có phát sinh dữ liệu.
- Đơn vị báo cáo: số cơ sở có báo cáo thuốc hiếm.
- Giá trị xuất kho: giá trị sử dụng thuốc hiếm, tính theo xuất kho nhân với giá VAT.
- Giá trị tồn kho: giá trị tồn cuối của thuốc hiếm.
- Số lượng tồn: tổng số lượng tồn cuối.

Các biểu đồ và bảng:

- Tất cả đơn vị theo giá trị xuất thuốc hiếm: cho biết cơ sở nào sử dụng thuốc hiếm nhiều.
- Tất cả thuốc hiếm theo giá trị tồn kho: cho biết thuốc hiếm nào đang tồn giá trị cao.
- Xu hướng theo tháng: so sánh giá trị xuất và tồn kho thuốc hiếm theo kỳ báo cáo.
- Cơ cấu BHYT/Dịch vụ của thuốc hiếm: theo dõi nguồn sử dụng thuốc hiếm.
- Bản đồ đơn vị có tồn kho thuốc hiếm: thể hiện vị trí cơ sở có tồn thuốc hiếm.
- Heatmap đơn vị có tồn kho thuốc hiếm: cho biết tỷ trọng tồn kho thuốc hiếm của từng cơ sở.

Ý nghĩa quản trị:

Thuốc hiếm thường có giá trị cao, nhu cầu đặc thù và rủi ro thiếu thuốc nghiêm trọng hơn thuốc thông thường. Tab này giúp quản lý riêng nhóm thuốc cần ưu tiên theo dõi, điều phối và bảo đảm sẵn có.

## 4. Dashboard Thống kê Mua sắm

Đường dẫn: `/dashboard/admin/mua-sam/thong-ke`

Dashboard Thống kê Mua sắm tổng hợp dữ liệu kế hoạch lựa chọn nhà thầu, gói thầu, thông báo mời thầu và kết quả lựa chọn nhà thầu trên toàn hệ thống.

Mục tiêu của màn hình này là trả lời các câu hỏi:

- Toàn hệ thống đã lập bao nhiêu kế hoạch lựa chọn nhà thầu?
- Có bao nhiêu gói thầu đã tạo?
- Tổng giá trị gói thầu và giá trị trúng thầu là bao nhiêu?
- Các gói thầu đang ở bước nào: chưa có TBMT, đã có TBMT, chưa có KQLCNT hay đã có KQLCNT?
- Cơ sở nào có giá trị gói thầu lớn?
- Tỷ lệ trúng thầu của từng cơ sở ra sao?

### 4.1. Các chỉ số KPI mua sắm

- Tổng kế hoạch LCNT: số lượng kế hoạch lựa chọn nhà thầu đã được ghi nhận trên hệ thống.
- Tổng số gói thầu: số gói thầu đã tạo từ các kế hoạch.
- Tổng giá trị gói thầu: tổng giá trị ước tính của các gói thầu.
- Giá trị trúng thầu: tổng giá trị đã được phê duyệt trong kết quả lựa chọn nhà thầu.
- Thông báo mời thầu: số lượng TBMT đã phát hành hoặc ghi nhận.
- Kết quả LCNT: số lượng kết quả lựa chọn nhà thầu đã có trên hệ thống.
- Tỷ lệ trúng thầu: tỷ lệ số mặt hàng trúng thầu trên số mặt hàng mời thầu.

Ý nghĩa:

Nhóm KPI này cho thấy quy mô hoạt động mua sắm, mức độ hoàn thành quy trình và hiệu quả lựa chọn nhà thầu. Khi so sánh tổng giá trị gói thầu với giá trị trúng thầu và tỷ lệ trúng thầu, người quản lý có thể đánh giá mức độ thành công của quá trình mua sắm.

### 4.2. Phân bổ hình thức LCNT

Biểu đồ này thể hiện số lượng gói thầu theo từng hình thức lựa chọn nhà thầu.

Ý nghĩa:

- Giúp biết hình thức mua sắm nào đang được sử dụng nhiều.
- Hỗ trợ kiểm tra cơ cấu hình thức LCNT có phù hợp với quy định và thực tế triển khai hay không.
- Phát hiện các nhóm hình thức ít dùng hoặc bất thường để rà soát.

### 4.3. Phân bổ quy trình mua sắm

Biểu đồ thể hiện kế hoạch mua sắm theo hai nhóm quy trình:

- Luật Đấu thầu.
- Tự quyết định.

Ý nghĩa:

Chỉ số này giúp phân biệt nhóm mua sắm phải đi theo quy trình đấu thầu đầy đủ và nhóm thuộc thẩm quyền tự quyết định. Đây là thông tin quan trọng khi đánh giá khối lượng công việc, thời gian xử lý và yêu cầu hồ sơ.

### 4.4. Top 10 cơ sở có giá trị gói thầu lớn nhất

Biểu đồ xếp hạng các cơ sở y tế theo tổng giá trị gói thầu.

Ý nghĩa:

- Nhận diện đơn vị có quy mô mua sắm lớn.
- Ưu tiên giám sát các cơ sở có giá trị gói thầu cao.
- Hỗ trợ phân bổ nguồn lực kiểm tra, hướng dẫn hoặc phê duyệt.

### 4.5. Trạng thái gói thầu

Màn hình phân loại gói thầu thuộc quy trình 1 theo các trạng thái:

- Chưa có TBMT: gói thầu yêu cầu thông báo mời thầu nhưng chưa có TBMT.
- Đã có TBMT chưa có KQLCNT: đã phát hành hoặc ghi nhận thông báo mời thầu nhưng chưa có kết quả lựa chọn nhà thầu.
- Không yêu cầu TBMT: gói thầu thuộc trường hợp không cần thông báo mời thầu.
- Đã có KQLCNT: đã có kết quả lựa chọn nhà thầu.

Ý nghĩa:

Đây là nhóm chỉ số theo dõi tiến độ nghiệp vụ thực tế. Khi bấm vào từng trạng thái, người dùng xem được danh sách gói thầu tương ứng, gồm cơ sở, tên gói thầu, kế hoạch, tình trạng TBMT và tình trạng KQLCNT. Nhờ đó, quản trị viên có thể biết gói nào đang bị dừng ở bước nào để đôn đốc xử lý.

### 4.6. Xu hướng đấu thầu theo thời gian

Biểu đồ đường thể hiện số gói thầu được tạo theo từng tháng.

Ý nghĩa:

- Theo dõi khối lượng đấu thầu tăng hay giảm theo thời gian.
- Nhận biết thời điểm cao điểm mua sắm.
- Hỗ trợ lập kế hoạch nhân sự, kiểm tra và phê duyệt hồ sơ.

### 4.7. Tỷ lệ trúng thầu theo cơ sở

Bảng so sánh số mặt hàng mời thầu, số mặt hàng trúng thầu và tỷ lệ trúng thầu của từng cơ sở.

Ý nghĩa:

- Đánh giá hiệu quả đấu thầu theo từng cơ sở.
- Phát hiện cơ sở có tỷ lệ trúng thầu thấp để tìm nguyên nhân.
- Hỗ trợ cải thiện chất lượng kế hoạch, danh mục thuốc và hồ sơ mời thầu.

## 5. Cách tính các biểu đồ và chỉ số chính

Các công thức dưới đây được hiểu trong phạm vi bộ lọc đang chọn. Nếu người dùng chọn một kỳ báo cáo hoặc một cơ sở cụ thể, hệ thống chỉ tính trên dữ liệu thuộc kỳ/cơ sở đó. Nếu không chọn, hệ thống tính trên toàn bộ phạm vi có dữ liệu.

### 5.1. Cách tính trong Dashboard Quản lý Dược

#### Tab Tổng quan

- Tổng giá trị tồn kho = tổng `thanhTienTonCuoi` của các dòng báo cáo tồn kho.
- Số mặt hàng quản lý = số `mapId` khác nhau trong dữ liệu báo cáo.
- Giá trị xuất = `xuat × giaVat`.
- Giá trị nhập = `nhap × giaVat`.
- Tỷ lệ thuốc nội = tổng giá trị xuất của thuốc được đánh dấu trong nước / tổng giá trị xuất của tất cả thuốc × 100%.
- Biểu đồ giá trị tồn kho theo nhóm thuốc = cộng `thanhTienTonCuoi` theo từng cơ sở và từng nhóm thuốc. Nhóm thuốc được chuẩn hóa về các nhóm: Hóa dược, Dược liệu, Sinh phẩm, Thuốc cổ truyền, Vắc xin và Khác.
- Top 10 CSYT tồn kho lớn nhất = sắp xếp cơ sở theo tổng `thanhTienTonCuoi` giảm dần, lấy 10 cơ sở đầu tiên.
- Biểu đồ BHYT vs. Dịch vụ = cộng giá trị xuất của các dòng có cờ BHYT và cộng giá trị xuất của các dòng có cờ Dịch vụ.
- Top 10 cơ sở giá trị Xuất lớn nhất = cộng `xuat × giaVat` theo cơ sở, chia theo nhóm thuốc, sắp xếp giảm dần và lấy 10 cơ sở đầu tiên.
- Top 10 cơ sở giá trị Nhập lớn nhất = cộng `nhap × giaVat` theo cơ sở, chia theo nhóm thuốc, sắp xếp giảm dần và lấy 10 cơ sở đầu tiên.
- Bản đồ giá trị tồn kho theo địa chỉ = cộng `thanhTienTonCuoi` theo cơ sở có tọa độ hợp lệ; kích thước điểm trên bản đồ tỷ lệ với giá trị tồn kho.
- Phân bố tồn kho theo địa bàn = cộng `thanhTienTonCuoi` theo địa chỉ; tỷ trọng từng địa bàn = giá trị tồn kho địa bàn / tổng giá trị tồn kho × 100%.

#### Tab Cung ứng

- Nhu cầu bình quân = trung bình số lượng `xuat` của 1, 3 hoặc 6 kỳ gần nhất, tùy lựa chọn cửa sổ tính nhu cầu.
- Số tháng đủ dùng = `tonCuoi / nhu cầu bình quân`. Nếu nhu cầu bình quân bằng 0 thì không tính số tháng đủ dùng.
- Giá trị tồn cuối = tổng `thanhTienTonCuoi` của các dòng trong kỳ hiệu lực.
- Giá trị xuất = tổng `xuat × giaVat` của các dòng trong kỳ hiệu lực.
- Số thuốc hết hàng = số dòng có `tonCuoi = 0` và nhu cầu bình quân > 0.
- Thuốc dưới 1 tháng = số dòng có số tháng đủ dùng > 0 và < 1.
- Tồn không nhu cầu = số dòng có `tonCuoi > 0` và nhu cầu bình quân = 0.
- Thuốc nguy cơ thiếu = các dòng có `tonCuoi > 0`, nhu cầu bình quân > 0 và số tháng đủ dùng < 3. Mức độ cảnh báo: dưới 1 tháng là Đỏ, từ 1 đến dưới 2 tháng là Cam, từ 2 đến dưới 3 tháng là Vàng.
- Top tồn giá trị cao nhưng độ phủ lớn = các thuốc có giá trị tồn cuối > 0 và số tháng đủ dùng từ 3 tháng trở lên, sắp xếp theo giá trị tồn giảm dần.
- Top thuốc nguy cơ thiếu theo giá trị = các thuốc có nhu cầu bình quân > 0 và số tháng đủ dùng < 1; giá trị rủi ro = nhu cầu bình quân × giá VAT; sắp xếp theo giá trị rủi ro giảm dần.
- Rủi ro hợp đồng sắp hết = các thuốc còn nhu cầu sử dụng, có ngày kết thúc hợp đồng trong vòng 90 ngày hoặc đã hết hạn. Nhóm cảnh báo gồm: đã hết hạn, <= 30 ngày, 31-60 ngày và 61-90 ngày.
- Phụ thuộc nhà cung cấp = gom các thuốc còn nhu cầu theo nhà cung cấp; tính số cơ sở, số thuốc có nhu cầu, tổng giá trị tồn, tổng giá trị rủi ro, số hợp đồng sắp hết và số hợp đồng đã hết hạn.
- Độ phủ dữ liệu = số dòng đạt điều kiện / tổng số dòng snapshot. Ví dụ: dòng có giá = số dòng có `giaVat > 0` / tổng số dòng; dòng map được master drug = số dòng đã nối danh mục thuốc chuẩn / tổng số dòng.

#### Tab Đấu thầu

- Tiến độ hợp đồng cung ứng = gom dữ liệu theo `soQdTrungThau`. Mỗi quyết định trúng thầu tạo một thanh thời gian từ ngày bắt đầu hợp đồng đến ngày kết thúc hợp đồng.
- Trạng thái hợp đồng = đã hết hạn nếu ngày kết thúc < ngày hiện tại; sắp hết hạn nếu ngày kết thúc trong 30 ngày; còn hiệu lực nếu ngày kết thúc sau 30 ngày.
- Hợp đồng sắp hết hạn trong 60 ngày = các dòng có ngày kết thúc hợp đồng từ ngày hiện tại đến 60 ngày tới.
- Top 10 nhà cung ứng = cộng `nhap × giaVat` theo `tenCongTy`, sắp xếp giảm dần và lấy 10 nhà cung ứng đầu tiên.
- So sánh giá giữa các gói thầu = nhóm thuốc theo cùng hoạt chất và hàm lượng; trong mỗi nhóm lấy các mức `giaVat` theo quyết định/công ty khác nhau; chênh lệch giá = `(giá cao nhất - giá thấp nhất) / giá thấp nhất × 100%`. Hệ thống chỉ hiển thị nhóm có chênh lệch trên 5%.

#### Tab Phân tích

- Giá trị tiêu thụ của một dòng = `xuat × giaVat`.
- Tổng giá trị tiêu thụ = tổng giá trị tiêu thụ của các dòng có giá trị > 0.
- Tổng số lượng tiêu thụ = tổng `xuat` của các dòng có phát sinh sử dụng.
- Số mặt hàng ABC = số thuốc sau khi gom nhóm và có giá trị tiêu thụ hợp lệ.
- Đơn giá bình quân = tổng giá trị tiêu thụ / tổng số lượng tiêu thụ.
- Khoảng giá = giá VAT thấp nhất và cao nhất ghi nhận cho cùng một thuốc.
- Tỷ trọng giá trị của thuốc = giá trị tiêu thụ của thuốc / tổng giá trị tiêu thụ × 100%.
- Phần trăm tích lũy = tổng dồn tỷ trọng giá trị theo thứ tự thuốc có giá trị tiêu thụ giảm dần.
- Hạng ABC = sắp xếp thuốc theo giá trị tiêu thụ giảm dần; nhóm A là phần giá trị tích lũy đầu tiên đến khoảng 80%, nhóm B từ sau 80% đến khoảng 95%, nhóm C là phần còn lại.
- Biểu đồ Pareto ABC = cột là giá trị tiêu thụ từng thuốc, đường là phần trăm tích lũy.
- Cơ cấu theo nhóm thuốc, nhóm điều trị, thuốc kiểm soát đặc biệt, kê đơn và trong nước = cộng giá trị tiêu thụ hoặc số lượng tiêu thụ theo từng nhóm; tỷ trọng = giá trị hoặc số lượng của nhóm / tổng tương ứng × 100%.
- Dòng cần kiểm tra = các dòng có giá trị tiêu thụ không hợp lệ, ví dụ số lượng xuất có phát sinh nhưng giá bằng 0, hoặc dòng chưa ánh xạ master drug nhưng vẫn có tiêu thụ.

#### Tab Thuốc hiếm

- Dữ liệu thuốc hiếm = chỉ lấy các dòng báo cáo có thuốc trong danh mục master drug được đánh dấu là thuốc hiếm.
- Số thuốc hiếm = số thuốc hiếm khác nhau có phát sinh dữ liệu.
- Đơn vị báo cáo = số cơ sở có báo cáo thuốc hiếm.
- Giá trị xuất kho thuốc hiếm = tổng `xuat × giaVat` của các dòng thuốc hiếm.
- Giá trị tồn kho thuốc hiếm = tổng `thanhTienTonCuoi` của các dòng thuốc hiếm.
- Số lượng tồn thuốc hiếm = tổng `tonCuoi` của các dòng thuốc hiếm.
- Tất cả đơn vị theo giá trị xuất thuốc hiếm = cộng `xuat × giaVat` theo cơ sở, sắp xếp giảm dần.
- Tất cả thuốc hiếm theo giá trị tồn kho = cộng `thanhTienTonCuoi` theo từng thuốc hiếm, sắp xếp giảm dần.
- Xu hướng theo tháng = cộng giá trị xuất và giá trị tồn kho thuốc hiếm theo từng `reportMonth`, sau đó sắp xếp theo thời gian.
- Cơ cấu BHYT/Dịch vụ của thuốc hiếm = cộng giá trị xuất của dòng thuốc hiếm có cờ BHYT và cộng giá trị xuất của dòng thuốc hiếm có cờ Dịch vụ.
- Bản đồ thuốc hiếm = cộng giá trị tồn kho và giá trị xuất kho thuốc hiếm theo cơ sở có tọa độ hợp lệ; kích thước điểm thể hiện quy mô giá trị tồn kho.
- Heatmap thuốc hiếm = tỷ trọng tồn kho thuốc hiếm của cơ sở = giá trị tồn kho thuốc hiếm của cơ sở / tổng giá trị tồn kho thuốc hiếm × 100%.

### 5.2. Cách tính trong Dashboard Thống kê Mua sắm

- Tổng kế hoạch LCNT = đếm số bản ghi kế hoạch lựa chọn nhà thầu.
- Tổng số gói thầu = đếm số gói thầu đã tạo.
- Tổng giá trị gói thầu = tổng `giaGoiThau` của tất cả gói thầu.
- Thông báo mời thầu = đếm số bản ghi TBMT.
- Kết quả LCNT = đếm số bản ghi kết quả lựa chọn nhà thầu.
- Giá trị trúng thầu = tổng `tongGiaTriTrungThau` của các kết quả LCNT.
- Tỷ lệ trúng thầu = tổng số mặt hàng trúng thầu / tổng số mặt hàng mời thầu × 100%.
- Phân bổ hình thức LCNT = đếm số gói thầu theo `hinhThucLCNT`.
- Phân bổ quy trình mua sắm = đếm số kế hoạch theo `quyTrinh`; quy trình 1 là Luật Đấu thầu, các trường hợp còn lại là Tự quyết định.
- Top 10 cơ sở có giá trị gói thầu lớn nhất = cộng `giaGoiThau` theo cơ sở tạo kế hoạch, sắp xếp giảm dần và lấy 10 cơ sở đầu tiên.
- Trạng thái gói thầu = chỉ theo dõi gói thầu thuộc quy trình 1. Nếu đã có KQLCNT thì xếp vào "Đã có KQLCNT"; nếu chưa có KQLCNT nhưng đã có TBMT thì xếp vào "Đã có TBMT chưa có KQLCNT"; nếu không yêu cầu TBMT thì xếp vào "Không yêu cầu TBMT"; còn lại là "Chưa có TBMT".
- Xu hướng đấu thầu theo thời gian = đếm số gói thầu theo tháng tạo `createdAt`, hiển thị theo thứ tự thời gian.
- Tỷ lệ trúng thầu theo cơ sở = với từng cơ sở, cộng số mặt hàng mời thầu và số mặt hàng trúng thầu từ các kết quả LCNT; tỷ lệ = số mặt hàng trúng thầu / số mặt hàng mời thầu × 100%.

## 6. Ý nghĩa tổng thể của hệ thống dashboard

Các dashboard trong phần mềm có ba giá trị chính.

Thứ nhất, dashboard giúp minh bạch hóa dữ liệu. Các con số tồn kho, sử dụng thuốc, mua sắm, đấu thầu và hợp đồng được trình bày tập trung, có thể lọc theo kỳ và theo cơ sở.

Thứ hai, dashboard giúp phát hiện rủi ro sớm. Hệ thống không chỉ báo cáo số liệu đã xảy ra, mà còn chỉ ra thuốc hết hàng, thuốc có độ phủ dưới 1 tháng, hợp đồng sắp hết hạn, thuốc nhiều mức giá, dòng dữ liệu chưa đủ chất lượng và gói thầu chưa hoàn tất quy trình.

Thứ ba, dashboard hỗ trợ ra quyết định. Người quản lý có thể dùng các chỉ số để ưu tiên điều phối thuốc, chuẩn bị kế hoạch mua sắm, kiểm tra dữ liệu bất thường và tập trung vào nhóm thuốc có ảnh hưởng tài chính lớn.

## 7. Gợi ý kịch bản thuyết trình

### Phần 1: Giới thiệu vấn đề

Trong quản lý dược, dữ liệu thường phân tán ở nhiều cơ sở và nhiều biểu mẫu. Nếu chỉ tổng hợp thủ công, người quản lý khó nắm được tình hình theo thời gian thực, khó phát hiện nguy cơ thiếu thuốc, tồn kho cao hoặc hợp đồng sắp hết hạn.

Phần mềm này giải quyết vấn đề bằng cách đưa dữ liệu báo cáo, mua sắm và đấu thầu về cùng một hệ thống.

### Phần 2: Giới thiệu Dashboard Quản lý Dược

Dashboard Quản lý Dược là màn hình tổng hợp toàn ngành. Tại đây, chúng ta có thể lọc theo kỳ báo cáo hoặc theo từng cơ sở.

Trước tiên, tab Tổng quan cho biết giá trị tồn kho, tỷ lệ thuốc nội và số mặt hàng đang quản lý. Tiếp theo, tab Cung ứng giúp phát hiện thuốc hết hàng, thuốc sắp thiếu và hàng tồn không có nhu cầu. Tab Đấu thầu theo dõi hợp đồng, nhà cung cấp và chênh lệch giá. Tab Phân tích dùng ABC để xác định nhóm thuốc cần kiểm soát ưu tiên. Cuối cùng, tab Thuốc hiếm theo dõi riêng nhóm thuốc có tính đặc thù và rủi ro cao.

### Phần 3: Giới thiệu Dashboard Thống kê Mua sắm

Dashboard Thống kê Mua sắm tập trung vào toàn bộ quy trình mua sắm, từ kế hoạch LCNT, gói thầu, thông báo mời thầu đến kết quả lựa chọn nhà thầu.

Các KPI đầu trang cho biết quy mô mua sắm và mức độ hoàn thành. Các biểu đồ giúp nhìn cơ cấu hình thức LCNT, quy trình mua sắm, top cơ sở có giá trị gói thầu lớn, trạng thái gói thầu và xu hướng theo thời gian. Bảng tỷ lệ trúng thầu theo cơ sở giúp đánh giá hiệu quả triển khai của từng đơn vị.

### Phần 4: Kết luận

Tổng thể, phần mềm giúp chuyển dữ liệu báo cáo thành công cụ quản trị. Người dùng không chỉ biết "có bao nhiêu", mà còn biết "đang rủi ro ở đâu", "cần ưu tiên đơn vị nào", "cần xử lý thuốc nào" và "gói thầu nào đang chậm tiến độ".

Đây là nền tảng quan trọng để nâng cao chất lượng quản lý dược, bảo đảm cung ứng thuốc liên tục, tăng tính minh bạch trong mua sắm và hỗ trợ ra quyết định dựa trên dữ liệu.

## 8. Giải thích nhanh các thuật ngữ viết tắt

- CSYT: Cơ sở y tế.
- BHYT: Bảo hiểm y tế.
- LCNT: Lựa chọn nhà thầu.
- TBMT: Thông báo mời thầu.
- KQLCNT: Kết quả lựa chọn nhà thầu.
- VAT: Thuế giá trị gia tăng.
- ABC: Phương pháp phân hạng thuốc theo giá trị tiêu thụ, trong đó nhóm A có giá trị cao nhất và cần ưu tiên kiểm soát.
- Master drug: danh mục thuốc chuẩn dùng để ánh xạ và chuẩn hóa dữ liệu thuốc từ các cơ sở.
