# Bài thuyết trình giới thiệu phần mềm quản lý dược và tra cứu tồn kho

## 1. Mở đầu

Kính thưa quý đại biểu, quý lãnh đạo và toàn thể các anh chị,

Hôm nay, tôi xin trình bày tổng quan về phần mềm quản lý dược, tập trung vào ba nhóm chức năng quan trọng: Dashboard Quản lý Dược, Dashboard Thống kê Mua sắm và màn hình Tra cứu tồn kho.

Phần mềm được xây dựng nhằm hỗ trợ công tác quản lý, giám sát và điều hành hoạt động dược trên nền dữ liệu báo cáo thực tế của các cơ sở y tế. Thay vì phải tổng hợp thủ công từ nhiều file riêng lẻ, hệ thống đưa dữ liệu báo cáo tồn kho, nhập kho, xuất kho, sử dụng thuốc, hợp đồng cung ứng, kế hoạch lựa chọn nhà thầu, thông báo mời thầu và kết quả lựa chọn nhà thầu về một nền tảng thống nhất.

Điểm quan trọng của phần mềm không chỉ là lưu trữ dữ liệu, mà là chuyển dữ liệu thành thông tin quản trị. Người quản lý có thể nhìn thấy bức tranh toàn ngành, nhận diện cơ sở có tồn kho lớn, phát hiện thuốc có nguy cơ thiếu, theo dõi hợp đồng sắp hết hạn, đánh giá hiệu quả mua sắm và tra cứu nhanh thuốc đang còn tại cơ sở nào.

Nói cách khác, phần mềm giúp chuyển từ cách quản lý bị động, phụ thuộc vào báo cáo rời rạc, sang cách quản lý chủ động dựa trên dữ liệu cập nhật, có cảnh báo và có khả năng phân tích.

## 2. Tổng quan phần mềm

Phần mềm phục vụ nhiều nhóm người dùng trong cùng một quy trình quản lý dược.

Đối với cơ sở y tế, hệ thống hỗ trợ cập nhật báo cáo tồn kho, nhập, xuất, sử dụng thuốc, thông tin ánh xạ danh mục thuốc, kế hoạch lựa chọn nhà thầu và kết quả mua sắm.

Đối với quản trị viên và đơn vị quản lý, hệ thống tổng hợp dữ liệu toàn ngành, cho phép lọc theo kỳ báo cáo, theo cơ sở, theo nhóm thuốc hoặc theo các chỉ số cảnh báo. Từ đó, người quản lý có thể theo dõi tình hình cung ứng thuốc, phân tích sử dụng thuốc, giám sát đấu thầu và tra cứu tồn kho trên phạm vi toàn hệ thống.

Trong bài trình bày này, tôi tập trung giới thiệu ba màn hình chính:

- Dashboard Quản lý Dược tại đường dẫn `/dashboard/admin`.
- Dashboard Thống kê Mua sắm tại đường dẫn `/dashboard/admin/mua-sam/thong-ke`.
- Tra cứu tồn kho tại đường dẫn `/dashboard/inventory-search`.

Đây là ba màn hình thể hiện rõ nhất giá trị của hệ thống trong công tác tổng hợp, phân tích, cảnh báo và hỗ trợ ra quyết định.

## 3. Dashboard Quản lý Dược

Dashboard Quản lý Dược là màn hình điều hành tổng hợp cho hoạt động dược toàn ngành. Màn hình này cho phép người dùng chọn kỳ báo cáo và chọn phạm vi đơn vị. Người dùng có thể xem dữ liệu của tất cả cơ sở hoặc lọc riêng một cơ sở y tế để phân tích chi tiết.

Dashboard được chia thành năm nhóm phân tích chính: Tổng quan, Cung ứng, Đấu thầu, Phân tích sử dụng thuốc và Thuốc hiếm.

### 3.1. Nhóm Tổng quan

Nhóm Tổng quan cung cấp bức tranh chung về tồn kho và sử dụng thuốc.

Các chỉ số nổi bật gồm tổng giá trị tồn kho, tỷ lệ thuốc nội theo giá trị xuất kho, tỷ lệ sử dụng thuốc trong nước theo số dòng sử dụng đã phân loại và số mặt hàng thuốc đang được quản lý. Đây là các chỉ số giúp lãnh đạo nắm nhanh quy mô nguồn lực thuốc đang có trong hệ thống, mức độ sử dụng thuốc trong nước và độ rộng của danh mục thuốc.

Phần biểu đồ của nhóm Tổng quan cho biết giá trị tồn kho theo từng cơ sở và theo nhóm thuốc. Hệ thống chia dữ liệu theo các nhóm như hóa dược, dược liệu, sinh phẩm, thuốc cổ truyền, vắc xin và nhóm khác. Người dùng có thể xem toàn bộ đơn vị đã báo cáo hoặc chọn các nhóm top giá trị lớn nhất, nhỏ nhất để tập trung phân tích.

Dashboard cũng hiển thị top cơ sở có tồn kho lớn nhất, cơ cấu sử dụng BHYT và dịch vụ, top cơ sở có giá trị xuất lớn nhất, top cơ sở có giá trị nhập lớn nhất, cùng bản đồ giá trị tồn kho theo địa chỉ. Riêng bản đồ cho phép lọc theo thuốc cụ thể, nhờ đó người quản lý có thể biết một thuốc đang tập trung tồn kho ở khu vực nào, cơ sở nào.

Ý nghĩa quản trị của nhóm Tổng quan là giúp lãnh đạo có cái nhìn nhanh về quy mô tồn kho, cơ cấu thuốc, cơ cấu thanh toán, phân bố theo cơ sở và phân bố theo địa bàn. Đây là phần phù hợp để mở đầu khi cần giới thiệu tình hình chung trước khi đi vào cảnh báo chi tiết.

### 3.2. Nhóm Cung ứng

Nhóm Cung ứng tập trung vào an toàn cung ứng thuốc, nguy cơ đứt gãy nguồn thuốc và hiệu quả sử dụng tồn kho.

Người dùng có thể lựa chọn chuẩn nhu cầu để tính toán cảnh báo, gồm một kỳ gần nhất, trung bình ba kỳ gần nhất hoặc trung bình sáu kỳ gần nhất. Việc lựa chọn chuẩn nhu cầu giúp phân tích linh hoạt hơn, phù hợp với thuốc có biến động sử dụng ngắn hạn hoặc cần nhìn xu hướng ổn định hơn.

Các chỉ số tổng hợp trong nhóm Cung ứng gồm giá trị tồn cuối, giá trị xuất, số thuốc hết hàng, số thuốc có độ phủ dưới một tháng, số thuốc tồn nhưng không phát sinh nhu cầu và số hợp đồng sắp hết hạn.

Hệ thống hiển thị danh sách thuốc đã hết hàng cuối kỳ. Đây là các thuốc có tồn cuối bằng 0 nhưng vẫn có nhu cầu sử dụng. Đây là nhóm cần được ưu tiên xử lý vì có khả năng ảnh hưởng trực tiếp đến khả năng đáp ứng điều trị.

Bên cạnh đó, hệ thống hiển thị nhóm thuốc còn tồn nhưng có độ phủ dưới ba tháng. Mức độ cảnh báo được chia thành đỏ khi dưới một tháng, cam khi từ một đến dưới hai tháng, và vàng khi từ hai đến dưới ba tháng. Cách phân loại này giúp người quản lý ưu tiên xử lý theo mức độ nghiêm trọng.

Dashboard còn có ma trận Nhu cầu và Độ phủ tồn kho. Trục ngang thể hiện nhu cầu bình quân, trục dọc thể hiện số tháng đủ dùng. Biểu đồ này giúp nhận diện những thuốc vừa có nhu cầu cao vừa có độ phủ thấp, tức là nhóm có rủi ro đứt gãy cao hơn.

Một điểm quan trọng khác là nhóm Tồn kho không có nhu cầu. Đây là các thuốc còn tồn nhưng không có lịch sử xuất trong cửa sổ nhu cầu đã chọn. Nhóm này không nên đọc như thuốc thiếu, mà nên đọc như tín hiệu về tồn kho chậm luân chuyển, nguy cơ giam vốn hoặc nguy cơ hết hạn.

Hệ thống cũng có phần gợi ý điều chuyển thuốc theo hoạt chất. Khi chọn một hoạt chất, phần mềm tách các cơ sở đang thừa, tức có độ phủ trên ba tháng, và các cơ sở đang thiếu, tức tồn cuối bằng 0 nhưng vẫn có nhu cầu. Đây là chức năng có ý nghĩa thực tiễn cao vì hỗ trợ điều phối nguồn thuốc giữa các đơn vị.

Ngoài cảnh báo tồn kho, nhóm Cung ứng còn theo dõi top thuốc tồn giá trị cao nhưng độ phủ lớn, top thuốc nguy cơ thiếu theo giá trị, rủi ro hợp đồng sắp hết, phụ thuộc nhà cung cấp và độ phủ dữ liệu báo cáo. Phần độ phủ dữ liệu cho biết có bao nhiêu cơ sở đang có dữ liệu, bao nhiêu dòng có giá VAT, bao nhiêu dòng có thông tin hợp đồng, bao nhiêu dòng đã map được master drug và bao nhiêu dòng có phân loại thuốc trong nước, nước ngoài.

Như vậy, nhóm Cung ứng không chỉ trả lời câu hỏi "đang còn bao nhiêu thuốc", mà còn trả lời câu hỏi quan trọng hơn: thuốc nào có nguy cơ thiếu, thuốc nào đang tồn quá mức, hợp đồng nào có thể làm gián đoạn nguồn cung và dữ liệu hiện tại có đủ tin cậy để phân tích hay chưa.

### 3.3. Nhóm Đấu thầu

Nhóm Đấu thầu tập trung vào hợp đồng cung ứng, nhà cung cấp và biến động giá.

Phần đầu tiên là biểu đồ tiến độ hợp đồng cung ứng. Biểu đồ này thể hiện trạng thái hợp đồng theo thời gian, gồm hợp đồng còn hiệu lực, sắp hết hạn và đã hết hạn. Người dùng có thể nhanh chóng nhìn thấy các quyết định hoặc hợp đồng đang ở giai đoạn rủi ro.

Tiếp theo là bảng hợp đồng sắp hết hạn trong 60 ngày. Bảng này hiển thị số quyết định, công ty, tên thuốc, cơ sở và ngày kết thúc. Đây là danh sách cần theo dõi để chuẩn bị kế hoạch đấu thầu hoặc mua sắm mới, tránh để hợp đồng hết hạn nhưng thuốc vẫn còn nhu cầu sử dụng.

Dashboard cũng có biểu đồ top 10 nhà cung ứng theo giá trị cung ứng, được tính từ số lượng nhập nhân với giá VAT. Chỉ số này giúp người quản lý biết hệ thống đang phụ thuộc nhiều vào nhà cung cấp nào và quy mô cung ứng của từng nhà cung cấp.

Một phần quan trọng khác là so sánh giá giữa các gói thầu. Hệ thống phát hiện các thuốc có cùng hoạt chất và hàm lượng nhưng có chênh lệch giá đáng chú ý giữa các gói, đặc biệt khi mức chênh lệch vượt ngưỡng 5%. Khi nhìn vào phần này, người quản lý có thể rà soát các điểm bất thường, đánh giá nguyên nhân chênh lệch và cải thiện chất lượng mua sắm.

Ý nghĩa của nhóm Đấu thầu là bảo đảm tính liên tục của nguồn cung, hỗ trợ kiểm soát hợp đồng, theo dõi nhà cung cấp và phát hiện bất thường về giá.

### 3.4. Nhóm Phân tích sử dụng thuốc

Nhóm Phân tích sử dụng thuốc tập trung vào phân tích ABC và cơ cấu sử dụng thuốc.

Các chỉ số đầu tiên gồm tổng giá trị tiêu thụ, tổng số lượng tiêu thụ, số mặt hàng được đưa vào phân tích ABC và số dòng dữ liệu cần kiểm tra. Giá trị tiêu thụ được tính theo số lượng xuất nhân với đơn giá VAT.

Phân tích ABC giúp phân loại thuốc theo mức độ đóng góp vào tổng giá trị tiêu thụ. Nhóm A là nhóm thuốc có giá trị tiêu thụ cao nhất và cần kiểm soát chặt. Nhóm B có mức độ ảnh hưởng trung bình. Nhóm C có giá trị thấp hơn nhưng vẫn cần theo dõi để bảo đảm đầy đủ danh mục.

Dashboard hiển thị biểu đồ Pareto ABC, trong đó cột thể hiện giá trị tiêu thụ và đường thể hiện phần trăm tích lũy. Các mốc tham chiếu giúp người dùng nhìn rõ nhóm thuốc nào tạo ra phần lớn giá trị tiêu thụ.

Bảng chi tiết ABC cho phép tìm kiếm theo thuốc, hoạt chất, nhóm thuốc và lọc theo hạng A, B, C. Người dùng cũng có thể lọc riêng thuốc kiểm soát đặc biệt, thuốc có nhiều mức giá hoặc thuốc chưa ánh xạ. Với phạm vi toàn ngành, bảng còn cho biết số cơ sở có phát sinh và cơ sở có giá trị lớn nhất.

Khi một thuốc có nhiều mức giá, người dùng có thể mở rộng để xem chi tiết theo kỳ báo cáo, cơ sở, số lượng, đơn giá và thành tiền. Điều này hỗ trợ rà soát giá, kiểm tra dữ liệu và phát hiện bất thường.

Phần Giám sát ABC tổng hợp các nhóm cần kiểm tra sau khi phân hạng, gồm hạng A kiểm soát đặc biệt, hạng A nhiều mức giá, dòng xuất nhưng giá bằng 0 và thuốc chưa ánh xạ nhưng có tiêu thụ. Đây là các nhóm có rủi ro cao hoặc có ảnh hưởng lớn đến độ chính xác phân tích.

Ý nghĩa quản trị của nhóm Phân tích là giúp tập trung nguồn lực kiểm soát vào đúng nhóm thuốc có tác động tài chính lớn, đặc biệt là thuốc hạng A, thuốc kiểm soát đặc biệt, thuốc nhiều mức giá và thuốc chưa được chuẩn hóa dữ liệu.

### 3.5. Nhóm Thuốc hiếm

Nhóm Thuốc hiếm theo dõi riêng các thuốc hiếm có phát sinh báo cáo trong hệ thống.

Các chỉ số chính gồm số thuốc hiếm, số đơn vị có báo cáo thuốc hiếm, giá trị xuất kho, giá trị tồn kho và tổng số lượng tồn. Đây là các chỉ số quan trọng vì thuốc hiếm thường có giá trị cao, nhu cầu đặc thù và rủi ro thiếu thuốc nghiêm trọng hơn so với thuốc thông thường.

Dashboard hiển thị tất cả đơn vị theo giá trị xuất thuốc hiếm, không giới hạn top. Nhờ vậy, người quản lý có thể nhìn đầy đủ cơ sở nào đang sử dụng thuốc hiếm nhiều.

Hệ thống cũng hiển thị tất cả thuốc hiếm theo giá trị tồn kho, giúp nhận diện thuốc hiếm nào đang còn tồn với giá trị lớn. Đây là thông tin cần thiết khi cần cân đối, điều phối hoặc theo dõi sử dụng thuốc hiếm.

Phần xu hướng theo tháng so sánh giá trị xuất và giá trị tồn kho thuốc hiếm theo kỳ báo cáo. Biểu đồ này giúp theo dõi biến động sử dụng theo thời gian, phát hiện giai đoạn tăng đột biến hoặc tồn kho tăng cao.

Dashboard còn có cơ cấu BHYT và dịch vụ của thuốc hiếm, bản đồ đơn vị có tồn kho thuốc hiếm và heatmap tỷ trọng tồn kho thuốc hiếm theo từng đơn vị.

Ý nghĩa của nhóm Thuốc hiếm là hỗ trợ quản lý riêng một nhóm thuốc đặc thù, cần ưu tiên theo dõi, điều phối và bảo đảm sẵn có.

## 4. Dashboard Thống kê Mua sắm

Dashboard Thống kê Mua sắm tại đường dẫn `/dashboard/admin/mua-sam/thong-ke` tổng hợp dữ liệu kế hoạch lựa chọn nhà thầu, gói thầu, thông báo mời thầu và kết quả lựa chọn nhà thầu trên toàn hệ thống.

Mục tiêu của màn hình này là giúp quản trị viên trả lời nhanh các câu hỏi: toàn hệ thống đã lập bao nhiêu kế hoạch lựa chọn nhà thầu, có bao nhiêu gói thầu đã tạo, tổng giá trị gói thầu là bao nhiêu, giá trị trúng thầu là bao nhiêu, gói thầu đang ở bước nào và cơ sở nào có quy mô mua sắm lớn.

Các KPI đầu tiên gồm tổng kế hoạch lựa chọn nhà thầu, tổng số gói thầu, tổng giá trị gói thầu và giá trị trúng thầu. Đây là các chỉ số phản ánh quy mô hoạt động mua sắm toàn hệ thống.

Nhóm KPI tiếp theo gồm số thông báo mời thầu, số kết quả lựa chọn nhà thầu và tỷ lệ trúng thầu. Tỷ lệ trúng thầu được tính dựa trên số mặt hàng trúng thầu so với số mặt hàng mời thầu. Chỉ số này giúp đánh giá hiệu quả của quá trình lựa chọn nhà thầu.

Dashboard có biểu đồ phân bổ hình thức lựa chọn nhà thầu theo số lượng gói thầu. Biểu đồ này giúp nhận diện hình thức mua sắm nào đang được sử dụng nhiều và hỗ trợ rà soát cơ cấu hình thức lựa chọn nhà thầu.

Biểu đồ phân bổ quy trình mua sắm chia dữ liệu thành hai nhóm: Luật Đấu thầu và Tự quyết định. Đây là thông tin quan trọng để đánh giá khối lượng hồ sơ, yêu cầu thủ tục và trách nhiệm xử lý.

Phần top 10 cơ sở y tế có giá trị gói thầu lớn nhất giúp nhận diện các đơn vị có quy mô mua sắm lớn, từ đó ưu tiên giám sát, hỗ trợ hoặc kiểm tra.

Một điểm rất quan trọng của Dashboard Thống kê Mua sắm là phần Trạng thái gói thầu. Hệ thống phân loại gói thầu thuộc quy trình 1 theo các trạng thái: chưa có thông báo mời thầu, đã có thông báo mời thầu nhưng chưa có kết quả lựa chọn nhà thầu, không yêu cầu thông báo mời thầu và đã có kết quả lựa chọn nhà thầu.

Người dùng có thể bấm vào từng trạng thái để xem danh sách gói thầu tương ứng. Danh sách hiển thị cơ sở, tên gói thầu, kế hoạch, tình trạng thông báo mời thầu và tình trạng kết quả lựa chọn nhà thầu. Đây là công cụ theo dõi tiến độ nghiệp vụ rất trực quan, giúp biết gói thầu nào đang dừng ở bước nào để có hướng đôn đốc xử lý.

Dashboard cũng có biểu đồ xu hướng đấu thầu theo thời gian, thể hiện số gói thầu được tạo theo từng tháng. Chỉ số này giúp nhận biết thời điểm cao điểm mua sắm và hỗ trợ lập kế hoạch nhân sự, kiểm tra, phê duyệt hồ sơ.

Cuối cùng là bảng tỷ lệ trúng thầu theo cơ sở. Bảng này so sánh số mặt hàng mời thầu, số mặt hàng trúng thầu và tỷ lệ trúng thầu của từng cơ sở. Qua đó, người quản lý có thể phát hiện cơ sở có tỷ lệ trúng thầu thấp để xem xét nguyên nhân, ví dụ chất lượng kế hoạch, danh mục thuốc, hồ sơ mời thầu hoặc khả năng tham gia của nhà cung cấp.

Nhìn tổng thể, Dashboard Thống kê Mua sắm giúp quản lý cả quy mô, tiến độ và hiệu quả của hoạt động mua sắm trên toàn hệ thống.

## 5. Tra cứu tồn kho

Màn hình Tra cứu tồn kho tại đường dẫn `/dashboard/inventory-search` được thiết kế để tìm kiếm thuốc, xem tồn kho theo cơ sở và so sánh cùng một thuốc giữa nhiều cơ sở.

Nguồn dữ liệu của màn hình này là các báo cáo tồn kho đã được duyệt. Hệ thống chỉ lấy các dòng có tồn cuối lớn hơn 0 và ưu tiên kỳ báo cáo mới nhất theo từng thuốc, từng cơ sở. Điều này giúp kết quả tra cứu phản ánh tồn kho hiện còn, thay vì trộn lẫn các dữ liệu cũ không còn ý nghĩa.

Màn hình có ba chế độ xem: Theo thuốc, Theo cơ sở và So sánh cơ sở.

### 5.1. Tra cứu theo thuốc

Ở chế độ Theo thuốc, người dùng có thể nhập tên thuốc, hoạt chất, hàm lượng hoặc mã thuốc. Hệ thống hỗ trợ tìm kiếm không phụ thuộc dấu tiếng Việt, giúp việc tra cứu nhanh và thuận tiện hơn.

Người dùng có thể sắp xếp theo tên thuốc A-Z, tổng tồn kho giảm dần hoặc số cơ sở giảm dần. Ngoài ra, có thể lọc riêng thuốc kiểm soát đặc biệt và thuốc hiếm.

Kết quả hiển thị theo từng thuốc, gồm mã thuốc, tên thuốc, hoạt chất, hàm lượng, nhóm tài chính kế toán, số đăng ký, đơn vị tính, số cơ sở còn tồn và tổng tồn kho. Với mỗi thuốc, người dùng có thể mở rộng để xem danh sách cơ sở đang còn tồn, kèm mã cơ sở, tên cơ sở, nhóm tài chính kế toán, tồn kho, giá VAT và kỳ báo cáo.

Các thuốc hiếm được làm nổi bật để người dùng dễ nhận biết. Điều này hỗ trợ công tác quản lý nhóm thuốc đặc thù ngay trong quá trình tra cứu.

Ý nghĩa của chế độ Theo thuốc là giúp trả lời nhanh câu hỏi: một thuốc cụ thể hiện còn ở những cơ sở nào, số lượng bao nhiêu, giá VAT là bao nhiêu và dữ liệu thuộc kỳ báo cáo nào.

### 5.2. Tra cứu theo cơ sở

Ở chế độ Theo cơ sở, người dùng chọn một cơ sở y tế để xem toàn bộ thuốc đang còn tồn tại cơ sở đó.

Màn hình hiển thị các thông tin tổng hợp của cơ sở, gồm tên cơ sở, mã cơ sở, số thuốc có tồn và tổng lượng tồn. Sau đó, bảng chi tiết liệt kê từng thuốc với mã thuốc, tên thuốc, hoạt chất, hàm lượng, nhóm tài chính kế toán, số đăng ký, đơn vị tính, tồn kho, giá VAT và kỳ báo cáo.

Người dùng có thể lọc thuốc trong cơ sở bằng từ khóa và sắp xếp theo tên thuốc A-Z, tồn kho giảm dần hoặc giá VAT tăng dần.

Ý nghĩa của chế độ Theo cơ sở là giúp người quản lý hoặc cơ sở y tế nhanh chóng kiểm tra danh mục thuốc còn tồn của một đơn vị cụ thể, phục vụ đối chiếu, điều phối hoặc kiểm tra báo cáo.

### 5.3. So sánh cơ sở

Ở chế độ So sánh cơ sở, người dùng chọn một thuốc từ danh sách gợi ý, sau đó chọn ít nhất hai cơ sở để tạo ma trận so sánh.

Ma trận so sánh hiển thị các chỉ số theo từng cơ sở, gồm tồn kho, giá VAT và kỳ báo cáo. Hệ thống làm nổi bật cơ sở có tồn kho cao nhất, giá VAT thấp nhất và cảnh báo khi kỳ báo cáo giữa các cơ sở không đồng nhất.

Điểm cảnh báo kỳ báo cáo rất quan trọng. Nếu các cơ sở đang được so sánh không cùng kỳ dữ liệu, người dùng cần đọc kết quả thận trọng trước khi kết luận về chênh lệch tồn kho hoặc giá.

Ý nghĩa của chế độ So sánh cơ sở là hỗ trợ điều phối thuốc, đối chiếu giá và kiểm tra sự khác biệt giữa các đơn vị. Đây là công cụ hữu ích khi cần biết cùng một thuốc đang phân bố như thế nào trên địa bàn.

## 6. Giá trị quản trị của phần mềm

Qua ba màn hình đã trình bày, có thể thấy phần mềm mang lại nhiều giá trị quản trị thiết thực.

Thứ nhất, phần mềm tập trung hóa dữ liệu. Dữ liệu từ nhiều cơ sở được đưa về cùng một hệ thống, giúp giảm phụ thuộc vào file rời rạc và giảm thời gian tổng hợp thủ công.

Thứ hai, phần mềm trực quan hóa dữ liệu. Các chỉ số, biểu đồ, bản đồ, bảng cảnh báo và ma trận so sánh giúp người dùng tiếp cận thông tin nhanh hơn, dễ hiểu hơn và dễ ra quyết định hơn.

Thứ ba, phần mềm hỗ trợ cảnh báo sớm. Hệ thống giúp phát hiện thuốc hết hàng, thuốc có nguy cơ thiếu, tồn kho không có nhu cầu, hợp đồng sắp hết hạn, chênh lệch giá và dữ liệu chưa đủ chất lượng.

Thứ tư, phần mềm hỗ trợ điều phối nguồn lực. Màn hình cung ứng và tra cứu tồn kho giúp biết cơ sở nào đang thiếu, cơ sở nào đang thừa, thuốc nào còn ở đâu và có thể ưu tiên điều chuyển như thế nào.

Thứ năm, phần mềm nâng cao chất lượng quản lý mua sắm. Dashboard mua sắm cho phép theo dõi kế hoạch, gói thầu, thông báo mời thầu, kết quả lựa chọn nhà thầu, tỷ lệ trúng thầu và tiến độ từng trạng thái nghiệp vụ.

Thứ sáu, phần mềm hỗ trợ kiểm soát dữ liệu. Các phần như độ phủ dữ liệu, thuốc chưa ánh xạ, dòng thiếu giá, dòng có nhiều mức giá giúp quản trị viên nhận diện vấn đề chất lượng dữ liệu để cải thiện báo cáo.

## 7. Kết luận

Kính thưa quý đại biểu, quý lãnh đạo và các anh chị,

Phần mềm quản lý dược được xây dựng với mục tiêu hỗ trợ quản lý dựa trên dữ liệu. Hệ thống không chỉ phục vụ việc nhập và lưu báo cáo, mà còn giúp biến báo cáo thành công cụ điều hành.

Dashboard Quản lý Dược giúp nhìn toàn cảnh tồn kho, cung ứng, đấu thầu, sử dụng thuốc và thuốc hiếm. Dashboard Thống kê Mua sắm giúp theo dõi quy mô, tiến độ và hiệu quả mua sắm. Màn hình Tra cứu tồn kho giúp tìm nhanh thuốc còn ở đâu, cơ sở nào còn tồn và có thể so sánh dữ liệu giữa nhiều đơn vị.

Khi được vận hành đầy đủ, phần mềm sẽ hỗ trợ lãnh đạo và các bộ phận chuyên môn quản lý thuốc chủ động hơn, phát hiện rủi ro sớm hơn, sử dụng nguồn lực hiệu quả hơn và nâng cao chất lượng điều hành hoạt động dược trên toàn hệ thống.

Xin trân trọng cảm ơn.
