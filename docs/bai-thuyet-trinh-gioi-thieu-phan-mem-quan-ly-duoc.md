# Bài thuyết trình giới thiệu phần mềm quản lý dược, cung ứng và mua sắm thuốc

## 1. Trang bìa

**Tên bài thuyết trình:**  
Giới thiệu phần mềm quản lý dược, giám sát cung ứng, mua sắm thuốc và trợ lý AI hỗ trợ điều hành

**Đối tượng trình bày:**  
Lãnh đạo, cán bộ quản lý ngành y tế, phòng nghiệp vụ dược, phòng kế hoạch - tài chính, bộ phận đấu thầu, cơ sở y tế và các đơn vị liên quan.

**Thông điệp mở đầu:**  
Phần mềm được xây dựng nhằm chuyển dữ liệu báo cáo dược từ trạng thái phân tán, khó tổng hợp sang một hệ thống quản lý tập trung, có chỉ số, biểu đồ, cảnh báo, truy vết mua sắm, theo dõi đặt hàng - giao nhận và trợ lý AI hỗ trợ phân tích.

---

## 2. Mục tiêu của phần mềm

Phần mềm hướng đến 5 mục tiêu chính:

1. **Tập trung hóa dữ liệu quản lý dược**  
   Gom dữ liệu tồn - nhập - xuất, danh mục thuốc, cơ sở y tế, công ty cung ứng, hợp đồng, mua sắm và đơn dự trù vào một hệ thống thống nhất.

2. **Cung cấp công cụ điều hành cho lãnh đạo**  
   Lãnh đạo có thể xem nhanh toàn cảnh: tồn kho, sử dụng thuốc, nguy cơ thiếu thuốc, thuốc hiếm, hợp đồng sắp hết hạn, tiến độ mua sắm và tình hình đặt hàng.

3. **Hỗ trợ nghiệp vụ dược ra quyết định dựa trên số liệu**  
   Cán bộ nghiệp vụ có thể tra cứu chi tiết theo thuốc, cơ sở, nhóm thuốc, nhà cung ứng, gói thầu, đơn đặt hàng và dòng giao nhận.

4. **Phát hiện sớm rủi ro**  
   Hệ thống tự động chỉ ra thuốc đã hết, thuốc có nguy cơ đứt gãy cung ứng, thuốc tồn không có nhu cầu, chênh lệch giá, hợp đồng sắp hết hạn và dữ liệu bất thường.

5. **Ứng dụng AI có kiểm soát**  
   Trợ lý AI hỗ trợ hỏi đáp, tổng hợp và kiểm tra dữ liệu nhưng vẫn tuân thủ phân quyền, quota, log sử dụng, công cụ dữ liệu an toàn và quy trình phê duyệt chính thức.

**Lời dẫn gợi ý:**  
“Mục tiêu của hệ thống không chỉ là tin học hóa biểu mẫu, mà là tạo ra một nền tảng điều hành dược dựa trên dữ liệu. Mỗi con số trong dashboard đều được tính từ dữ liệu báo cáo, danh mục và quy trình nghiệp vụ thật.”

---

## 3. Bối cảnh và vấn đề cần giải quyết

Trong công tác quản lý dược, các đơn vị thường gặp các khó khăn sau:

- Báo cáo tồn - nhập - xuất được gửi theo kỳ nhưng khó nhìn nhanh toàn cảnh toàn ngành.
- Dữ liệu thuốc, mã nội bộ, danh mục chuẩn và nhóm thuốc có thể chưa đồng nhất.
- Cơ quan quản lý khó phát hiện sớm thuốc nào sắp thiếu, cơ sở nào tồn nhiều, thuốc nào không có nhu cầu.
- Thông tin mua sắm, thông báo mời thầu và kết quả lựa chọn nhà thầu nằm rời rạc.
- Hợp đồng cung ứng sắp hết hạn nhưng khó tổng hợp kịp thời.
- Cơ sở y tế cần công cụ dự trù số lượng đặt hàng dựa trên nhu cầu và tồn kho thực tế.
- Lãnh đạo cần báo cáo nhanh, súc tích, có bằng chứng số liệu.

**Thông điệp cần nhấn mạnh:**  
Phần mềm giải quyết vấn đề “có dữ liệu nhưng khó dùng dữ liệu để điều hành”.

---

## 4. Giải pháp tổng thể

Phần mềm cung cấp một hệ thống gồm 5 nhóm phân hệ chính:

1. **Dashboard quản lý dược toàn ngành**  
   Theo dõi tổng quan tồn kho, sử dụng thuốc, cung ứng, đấu thầu, ABC và thuốc hiếm.

2. **Tra cứu mua sắm**  
   Truy vết tiến trình từ kế hoạch lựa chọn nhà thầu đến thông báo mời thầu và kết quả lựa chọn nhà thầu.

3. **Tra cứu tồn kho**  
   Tìm thuốc đang còn ở đâu, cơ sở còn những thuốc nào, so sánh cùng một thuốc giữa nhiều cơ sở.

4. **Dự trù - đặt hàng**  
   Quản lý quy trình từ cơ sở lập nhu cầu, gửi đơn, công ty xác nhận, giao hàng, đến khi cơ sở xác nhận thực nhận.

5. **Trợ lý AI và quản trị AI**  
   Hỗ trợ tổng hợp, kiểm tra dữ liệu, hỏi đáp nghiệp vụ và giám sát việc sử dụng AI.

**Lời dẫn gợi ý:**  
“Hệ thống được thiết kế theo chuỗi quản lý khép kín: báo cáo số liệu, phân tích rủi ro, kiểm soát mua sắm, tra cứu tồn kho, đặt hàng và theo dõi giao nhận.”

---

## 5. Luồng dữ liệu tổng thể

Dữ liệu đầu vào của hệ thống gồm:

- Báo cáo tồn - nhập - xuất của cơ sở y tế.
- Danh mục thuốc chuẩn.
- Danh mục thuốc nội bộ của cơ sở.
- Thông tin cơ sở y tế.
- Thông tin công ty cung ứng.
- Hợp đồng và quyết định trúng thầu.
- Kế hoạch lựa chọn nhà thầu.
- Thông báo mời thầu.
- Kết quả lựa chọn nhà thầu.
- Đơn dự trù đặt hàng và lịch sử giao nhận.
- Log sử dụng AI.

Từ các nguồn dữ liệu này, phần mềm tạo ra:

- KPI tổng quan.
- Biểu đồ phân tích.
- Bản đồ tồn kho.
- Cảnh báo cung ứng.
- Phân tích ABC.
- Theo dõi thuốc hiếm.
- Tra cứu gói thầu.
- Tra cứu tồn kho.
- Theo dõi đặt hàng và giao nhận.
- Báo cáo AI usage và chi phí ước tính.

**Thông điệp cần nhấn mạnh:**  
Dữ liệu không dừng lại ở lưu trữ. Dữ liệu được chuyển hóa thành công cụ điều hành.

---

## 6. Phân hệ Dashboard quản lý dược

**Đường dẫn:** `/dashboard/admin`

Dashboard admin là màn hình điều hành trung tâm. Tại đây, lãnh đạo và cán bộ quản lý có thể xem toàn ngành hoặc lọc theo từng cơ sở y tế, từng kỳ báo cáo.

Dashboard gồm 5 tab:

- Tổng quan.
- Cung ứng.
- Đấu thầu.
- Phân tích sử dụng thuốc.
- Thuốc hiếm.

### 6.1. Tab Tổng quan

Tab Tổng quan trả lời các câu hỏi:

- Toàn ngành đang tồn kho bao nhiêu?
- Tỷ lệ sử dụng thuốc trong nước thế nào?
- Cơ sở nào có giá trị tồn kho lớn?
- Cơ sở nào xuất/nhập nhiều?
- Tồn kho tập trung ở địa bàn nào?
- Cơ cấu sử dụng BHYT và dịch vụ ra sao?

Các chỉ số chính:

```text
Tổng giá trị tồn kho = tổng thanhTienTonCuoi
Giá trị xuất = xuat * giaVat
Tỷ lệ thuốc nội = giá trị xuất thuốc trong nước / tổng giá trị xuất * 100
Số mặt hàng quản lý = số mapId khác nhau trong báo cáo
```

Ý nghĩa lãnh đạo:

- Nhìn nhanh quy mô tiền hàng đang nằm trong kho.
- Nhận diện đơn vị tồn kho lớn.
- Theo dõi định hướng sử dụng thuốc trong nước.
- Phân tích cơ cấu sử dụng theo BHYT/dịch vụ.

**Lời dẫn gợi ý:**  
“Ở tab Tổng quan, lãnh đạo có thể nắm bức tranh toàn ngành chỉ trong một màn hình: tổng giá trị tồn kho, cơ cấu nhóm thuốc, cơ sở tồn nhiều nhất, giá trị nhập - xuất và phân bố theo địa bàn.”

### 6.2. Tab Cung ứng

Tab Cung ứng tập trung vào rủi ro thiếu thuốc và điều phối nguồn hàng.

Hệ thống tính nhu cầu theo 1, 3 hoặc 6 kỳ gần nhất. Công thức nền tảng:

```text
Nhu cầu bình quân = trung bình xuat của các kỳ gần nhất
Số tháng đủ dùng = tonCuoi / nhu cầu bình quân
```

Các nhóm cảnh báo:

- Đã hết hàng cuối kỳ: `tonCuoi = 0` và vẫn có nhu cầu.
- Nguy cơ đứt gãy: còn tồn nhưng số tháng đủ dùng dưới 3 tháng.
- Mức đỏ: dưới 1 tháng.
- Mức cam: từ 1 đến dưới 2 tháng.
- Mức vàng: từ 2 đến dưới 3 tháng.
- Tồn kho không có nhu cầu: `tonCuoi > 0` nhưng nhu cầu bình quân bằng 0.

Ý nghĩa lãnh đạo:

- Không chỉ biết còn bao nhiêu thuốc, mà biết còn đủ dùng bao lâu.
- Ưu tiên xử lý thuốc thiếu trước khi đứt gãy thật sự.
- Có căn cứ điều chuyển giữa cơ sở thừa và cơ sở thiếu.

**Lời dẫn gợi ý:**  
“Điểm mạnh của tab Cung ứng là chuyển số lượng tồn kho thành số tháng đủ dùng. Đây là chỉ số rất trực quan cho điều hành: dưới 1 tháng là nguy cơ cao, dưới 3 tháng cần theo dõi và chuẩn bị phương án.”

### 6.3. Tab Đấu thầu

Tab Đấu thầu giúp quản lý hợp đồng, nhà cung ứng và chênh lệch giá.

Các nội dung chính:

- Biểu đồ Gantt tiến độ hợp đồng cung ứng.
- Danh sách hợp đồng sắp hết hạn trong 60 ngày.
- Top 10 nhà cung ứng theo giá trị cung ứng.
- So sánh giá giữa các gói thầu.

Công thức chính:

```text
Giá trị cung ứng = nhap * giaVat
Tỷ lệ chênh lệch giá = (giá cao nhất - giá thấp nhất) / giá thấp nhất * 100
```

Ý nghĩa lãnh đạo:

- Chủ động trước hợp đồng sắp hết hạn.
- Nhận diện mức độ phụ thuộc vào nhà cung ứng.
- Phát hiện chênh lệch giá bất thường giữa các gói thầu.

**Lời dẫn gợi ý:**  
“Phân hệ đấu thầu giúp chuyển thông tin hợp đồng thành cảnh báo điều hành: hợp đồng nào sắp hết hạn, nhà cung ứng nào chiếm tỷ trọng lớn, hoạt chất nào có chênh lệch giá đáng chú ý.”

### 6.4. Tab Phân tích sử dụng thuốc

Tab này gồm phân tích cơ cấu sử dụng và phân tích ABC.

Công thức nền tảng:

```text
Số lượng tiêu thụ = xuat
Giá trị tiêu thụ = xuat * giaVat
```

Phân tích ABC:

```text
Xếp thuốc theo giá trị tiêu thụ giảm dần
Tính phần trăm tích lũy
Nhóm A: phần tạo nên khoảng 80% giá trị đầu tiên
Nhóm B: từ 80% đến 95%
Nhóm C: phần còn lại
```

Ý nghĩa lãnh đạo:

- Xác định nhóm thuốc tạo ra phần lớn chi phí.
- Ưu tiên quản lý nhóm A.
- Theo dõi thuốc kiểm soát đặc biệt, thuốc nhiều mức giá, thuốc chưa ánh xạ.

**Lời dẫn gợi ý:**  
“Phân tích ABC giúp chúng ta tập trung nguồn lực quản lý vào đúng nhóm thuốc có tác động tài chính lớn nhất, thay vì dàn trải trên toàn bộ danh mục.”

### 6.5. Tab Thuốc hiếm

Tab Thuốc hiếm chỉ tính các thuốc được đánh dấu là thuốc hiếm trong danh mục chuẩn.

Các chỉ số chính:

```text
Số thuốc hiếm = số thuốc hiếm khác nhau có báo cáo
Giá trị xuất thuốc hiếm = tổng (xuat * giaVat)
Giá trị tồn thuốc hiếm = tổng thanhTienTonCuoi
Số lượng tồn thuốc hiếm = tổng tonCuoi
```

Ý nghĩa lãnh đạo:

- Biết thuốc hiếm đang tồn ở đâu.
- Theo dõi cơ sở nào có giá trị sử dụng thuốc hiếm cao.
- Phục vụ điều phối khi có tình huống khan hiếm.

**Lời dẫn gợi ý:**  
“Với thuốc hiếm, giá trị quản lý không chỉ nằm ở tiền hàng, mà còn ở khả năng điều phối kịp thời giữa các cơ sở khi phát sinh nhu cầu đặc biệt.”

---

## 7. Phân hệ tra cứu mua sắm

**Đường dẫn:** `/dashboard/admin/mua-sam/tra-cuu`

Phân hệ này giúp theo dõi tiến trình mua sắm của từng gói thầu quy trình 1, từ kế hoạch lựa chọn nhà thầu đến thông báo mời thầu và kết quả lựa chọn nhà thầu.

Luồng nghiệp vụ:

```text
KHLCNT -> Gói thầu -> TBMT -> KQLCNT -> Kết quả phân lô/nhà thầu trúng
```

Các trạng thái tổng hợp:

```text
Tổng gói thầu = số gói thầu thỏa mãn bộ lọc
Chưa có TBMT = gói thầu chưa có thông báo mời thầu
Đã có TBMT, chưa có KQLCNT = đã mời thầu nhưng chưa có kết quả
Đã có KQLCNT = đã có kết quả lựa chọn nhà thầu
```

Giá trị quản lý:

- Truy vết nhanh tiến độ mua sắm.
- Biết gói thầu đang mắc ở bước nào.
- Hạn chế tra cứu rời rạc trên nhiều bảng.
- Xuất Excel phục vụ báo cáo và kiểm tra.

**Lời dẫn gợi ý:**  
“Trang tra cứu mua sắm giúp lãnh đạo và cán bộ nghiệp vụ nhìn được toàn bộ vòng đời của một gói thầu. Mỗi dòng là một gói thầu, đi từ kế hoạch đến kết quả, có trạng thái rõ ràng.”

---

## 8. Phân hệ tra cứu tồn kho

**Đường dẫn:** `/dashboard/inventory-search`

Phân hệ tra cứu tồn kho phục vụ điều hành hằng ngày. Dữ liệu được lấy từ snapshot mới nhất đã duyệt của từng cặp cơ sở - thuốc.

Nguyên tắc dữ liệu:

```text
Chỉ lấy báo cáo APPROVED
Chỉ lấy dòng có ton_cuoi > 0
Với mỗi cặp cơ sở - thuốc, lấy kỳ báo cáo mới nhất
```

### 8.1. Tra cứu theo thuốc

Trả lời câu hỏi: “Một thuốc đang còn ở những cơ sở nào?”

```text
Tổng tồn kho của thuốc = tổng tonCuoi mới nhất của thuốc đó tại tất cả cơ sở
Số cơ sở = số cơ sở có tonCuoi > 0 của thuốc đó
```

### 8.2. Tra cứu theo cơ sở

Trả lời câu hỏi: “Một cơ sở đang còn những thuốc nào?”

```text
Số thuốc có tồn = số thuốc khác nhau có tonCuoi > 0 tại cơ sở
Tổng lượng tồn = tổng tonCuoi mới nhất của tất cả thuốc tại cơ sở
```

### 8.3. So sánh cơ sở

Trả lời câu hỏi: “Cùng một thuốc, cơ sở nào còn nhiều hơn, giá VAT nào thấp hơn?”

Hệ thống đánh dấu:

- Tồn kho cao nhất.
- Giá VAT thấp nhất.
- Kỳ báo cáo cũ hơn nếu các cơ sở không cùng kỳ.

**Lời dẫn gợi ý:**  
“Tra cứu tồn kho là công cụ thực chiến. Khi cần tìm thuốc, điều chuyển thuốc hoặc so sánh giữa các cơ sở, người dùng không phải chờ tổng hợp thủ công.”

---

## 9. Phân hệ dự trù - đặt hàng

Các đường dẫn chính:

- `/dashboard/facility/dutru-dat-hang`
- `/dashboard/admin/dutru-dat-hang`
- `/dashboard/dutru-dat-hang/tra-cuu`

Phân hệ này khép kín quy trình từ nhu cầu của cơ sở đến giao nhận thực tế.

Luồng nghiệp vụ:

```text
Cơ sở tạo đơn nháp
-> Thêm thuốc và số lượng yêu cầu
-> Xem gợi ý đặt hàng
-> Gửi đơn cho công ty
-> Công ty phản hồi/xác nhận
-> Công ty tạo đợt giao
-> Cơ sở xác nhận thực nhận
-> Đơn hoàn tất
```

Các trạng thái đơn:

- Nháp.
- Đã gửi.
- Bị từ chối.
- Sẵn sàng giao.
- Đang giao.
- Hoàn tất.

Các công thức tổng hợp:

```text
Tổng yêu cầu = tổng requestedQty
Tổng chấp nhận = tổng acceptedQty
Tổng đã giao = tổng shippedQty
Tổng đã nhận = tổng receivedQty
Còn lại cần nhận = max(acceptedQty - tổng receivedQty, 0)
```

Gợi ý đặt hàng:

```text
Xuất bình quân = trung bình xuất của tối đa 3 tháng gần nhất
Nhu cầu mục tiêu = xuất bình quân * 2
Số lượng cần bổ sung = max(0, round(nhu cầu mục tiêu - tồn cuối))
Gợi ý đặt = max(0, số lượng cần bổ sung - số lượng đang về)
```

Ý nghĩa lãnh đạo:

- Theo dõi nhu cầu đặt hàng từ cơ sở.
- Biết công ty đã xác nhận bao nhiêu.
- Biết đã giao bao nhiêu và cơ sở đã nhận bao nhiêu.
- Truy vết bằng QR khi giao nhận.
- Giảm tình trạng đặt hàng thiếu căn cứ hoặc trùng lặp.

**Lời dẫn gợi ý:**  
“Dự trù - đặt hàng là bước nối giữa phân tích tồn kho và hành động cung ứng. Cơ sở không chỉ đặt hàng thủ công, mà có gợi ý từ dữ liệu XNT, có theo dõi công ty xác nhận, giao hàng và nhận hàng.”

---

## 10. Phân hệ Trợ lý AI và Quản trị AI

Các đường dẫn chính:

- Trợ lý AI trong giao diện dashboard.
- `/dashboard/admin/ai-agent`
- `/dashboard/admin/ai-usage`

AI trong hệ thống được thiết kế là công cụ hỗ trợ có kiểm soát.

AI có thể hỗ trợ:

- Hỏi đáp về tồn kho, báo cáo, ánh xạ, cung ứng.
- Tóm tắt tình hình cho lãnh đạo.
- Kiểm tra dữ liệu bất thường.
- Hỗ trợ cơ sở rà soát báo cáo và ánh xạ danh mục.
- Gợi ý bước kiểm tra tiếp theo.

AI không được:

- Tự ghi, sửa, gửi, duyệt dữ liệu.
- Thay thế quy trình phê duyệt chính thức.
- Đưa tư vấn điều trị cá nhân hóa.
- Suy đoán số liệu khi thiếu dữ liệu.

Quy trình xử lý AI:

```text
Người dùng hỏi
-> Kiểm tra quyền và quota
-> Chạy tool dữ liệu được phép
-> Chọn model
-> Sinh câu trả lời dựa trên bằng chứng
-> Ghi log request, token, chi phí, tool, lỗi nếu có
```

Các chỉ số AI usage:

```text
Tổng request = số log AI_AGENT
Thành công = status = success
Lỗi = status = error
Hết quota = status = quota_exceeded
Cache hit = cacheHit = true
Fallback = usedFallback = true
Chi phí ước tính = inputTokens/1.000.000 * đơn giá input + outputTokens/1.000.000 * đơn giá output
```

Ý nghĩa lãnh đạo:

- AI giúp rút ngắn thời gian tổng hợp và kiểm tra.
- AI có phân quyền, quota và nhật ký sử dụng.
- AI chỉ dùng công cụ dữ liệu được cấp phép.
- Quản trị có thể bật/tắt theo hệ thống, vai trò, người dùng và công cụ.

**Lời dẫn gợi ý:**  
“AI trong phần mềm không phải là một công cụ tự do không kiểm soát. Đây là trợ lý được giới hạn bởi quyền, công cụ dữ liệu, quota, log và chính sách quản trị.”

---

## 11. Các công thức trọng tâm cần nhớ

Đây là các công thức nên nhấn mạnh khi trình bày:

```text
Giá trị xuất = xuat * giaVat
Giá trị nhập = nhap * giaVat
Giá trị tồn kho = thanhTienTonCuoi
Nhu cầu bình quân = trung bình xuat của các kỳ gần nhất
Số tháng đủ dùng = tonCuoi / nhu cầu bình quân
ABC = xếp hạng theo giá trị tiêu thụ, ngưỡng 80% - 95% - 100%
Gợi ý đặt hàng = max(0, round(xuất bình quân * 2 - tồn cuối) - số lượng đang về)
Tổng đã nhận = tổng receivedQty
Chi phí AI = input cost + output cost
```

**Thông điệp cần nhấn mạnh:**  
Các chỉ số trong hệ thống không phải là số liệu cảm tính. Mỗi biểu đồ và KPI đều có công thức rõ ràng, truy về dữ liệu gốc.

---

## 12. Giá trị mang lại cho lãnh đạo

Phần mềm mang lại các giá trị quản lý sau:

1. **Nắm toàn cảnh nhanh**  
   Lãnh đạo có thể biết toàn ngành đang tồn kho bao nhiêu, thuốc nào có nguy cơ thiếu, cơ sở nào cần chú ý.

2. **Điều hành dựa trên cảnh báo sớm**  
   Hệ thống chỉ ra thuốc hết hàng, sắp hết hàng, tồn không có nhu cầu và hợp đồng sắp hết hạn.

3. **Minh bạch mua sắm và cung ứng**  
   Tiến trình mua sắm, hợp đồng, nhà cung ứng và chênh lệch giá được tổng hợp tập trung.

4. **Theo dõi đến giao nhận thực tế**  
   Đơn đặt hàng không dừng ở bước gửi đơn, mà theo dõi đến lúc cơ sở xác nhận thực nhận.

5. **Tăng chất lượng dữ liệu**  
   Cảnh báo dữ liệu bất thường, dòng chưa ánh xạ và AI kiểm tra giúp giảm sai sót.

6. **Hỗ trợ báo cáo nhanh**  
   Dashboard và AI giúp rút ngắn thời gian chuẩn bị báo cáo phục vụ họp, kiểm tra và chỉ đạo.

---

## 13. Giá trị mang lại cho cán bộ nghiệp vụ

Đối với phòng nghiệp vụ dược và cơ sở y tế, phần mềm giúp:

- Tra cứu nhanh thuốc, tồn kho, giá VAT, kỳ báo cáo.
- Biết thuốc nào cần mua, thuốc nào có thể điều chuyển.
- Rà soát báo cáo trước khi gửi.
- Theo dõi tiến độ mua sắm và đặt hàng.
- Xác nhận giao nhận minh bạch theo từng đợt.
- Giảm thao tác tổng hợp Excel thủ công.
- Có bằng chứng dữ liệu khi giải trình hoặc báo cáo.

**Lời dẫn gợi ý:**  
“Với cán bộ nghiệp vụ, hệ thống giúp giảm thời gian tìm kiếm, tăng khả năng phát hiện lỗi và tạo ra một quy trình làm việc thống nhất hơn giữa các bên.”

---

## 14. Đề xuất cách triển khai vận hành

Để phần mềm phát huy hiệu quả, nên triển khai theo các bước:

1. **Chuẩn hóa danh mục**
   - Hoàn thiện danh mục thuốc chuẩn.
   - Rà soát ánh xạ thuốc nội bộ của cơ sở.
   - Chuẩn hóa thông tin thuốc hiếm, thuốc trong nước, thuốc kiểm soát đặc biệt.

2. **Chuẩn hóa kỳ báo cáo**
   - Đảm bảo cơ sở nộp báo cáo đúng kỳ.
   - Kiểm tra dòng tồn - nhập - xuất bất thường.
   - Theo dõi tỷ lệ nộp báo cáo.

3. **Đào tạo người dùng theo vai trò**
   - Lãnh đạo: đọc dashboard và cảnh báo.
   - Nghiệp vụ dược: tra cứu, phân tích, xử lý dữ liệu.
   - Cơ sở: báo cáo, ánh xạ, đặt hàng, xác nhận nhận hàng.
   - Quản trị: cấu hình hệ thống, AI, người dùng và công cụ.

4. **Thiết lập quy trình xử lý cảnh báo**
   - Ai xử lý thuốc hết hàng?
   - Ai xử lý hợp đồng sắp hết hạn?
   - Ai xử lý dữ liệu chưa ánh xạ?
   - Ai phê duyệt hoặc điều phối đặt hàng?

5. **Theo dõi định kỳ**
   - Họp dashboard theo tuần/tháng.
   - Rà soát ABC theo kỳ.
   - Rà soát thuốc hiếm và rủi ro cung ứng.
   - Theo dõi AI usage và chi phí.

---

## 15. Kịch bản thuyết trình hoàn chỉnh

### Mở đầu

Kính thưa quý lãnh đạo,

Hôm nay tôi xin giới thiệu phần mềm quản lý dược, giám sát cung ứng, mua sắm thuốc, dự trù đặt hàng và trợ lý AI hỗ trợ điều hành. Mục tiêu của phần mềm là giúp chúng ta chuyển từ quản lý bằng các báo cáo rời rạc sang quản lý tập trung dựa trên dữ liệu.

Trong công tác dược, chúng ta không chỉ cần biết từng cơ sở báo cáo gì, mà cần biết toàn ngành đang tồn kho bao nhiêu, thuốc nào có nguy cơ thiếu, hợp đồng nào sắp hết hạn, gói thầu nào đang chậm, thuốc hiếm đang nằm ở đâu và đơn đặt hàng đã giao nhận đến bước nào.

### Giới thiệu tổng quan hệ thống

Phần mềm gồm 5 nhóm chức năng chính.

Thứ nhất là dashboard quản lý dược, giúp lãnh đạo nhìn toàn cảnh về tồn kho, sử dụng thuốc, cung ứng, đấu thầu, ABC và thuốc hiếm.

Thứ hai là tra cứu mua sắm, giúp theo dõi tiến trình từ kế hoạch lựa chọn nhà thầu đến thông báo mời thầu và kết quả lựa chọn nhà thầu.

Thứ ba là tra cứu tồn kho, giúp trả lời nhanh một thuốc còn ở đâu, một cơ sở còn những thuốc nào và cùng một thuốc thì cơ sở nào còn nhiều hơn.

Thứ tư là dự trù - đặt hàng, giúp khép kín quy trình từ cơ sở lập nhu cầu đến công ty xác nhận, giao hàng và cơ sở xác nhận thực nhận.

Thứ năm là trợ lý AI, giúp hỗ trợ hỏi đáp, tổng hợp và kiểm tra dữ liệu nhưng vẫn có kiểm soát bằng phân quyền, quota, log và công cụ dữ liệu an toàn.

### Trình bày Dashboard admin

Trước hết, dashboard admin là màn hình điều hành trung tâm.

Ở tab Tổng quan, hệ thống cho biết tổng giá trị tồn kho, tỷ lệ thuốc trong nước, số mặt hàng quản lý, cơ cấu BHYT - dịch vụ, top cơ sở tồn kho lớn, top cơ sở nhập - xuất lớn và phân bố tồn kho theo địa bàn.

Các số liệu này được tính trực tiếp từ báo cáo tồn - nhập - xuất. Ví dụ, giá trị xuất bằng số lượng xuất nhân giá VAT; giá trị tồn kho lấy từ thành tiền tồn cuối.

Ở tab Cung ứng, hệ thống đi sâu vào rủi ro thiếu thuốc. Điểm quan trọng là hệ thống không chỉ hiển thị tồn kho, mà còn tính số tháng đủ dùng. Công thức là tồn cuối chia cho nhu cầu bình quân. Nhu cầu bình quân có thể tính theo 1, 3 hoặc 6 kỳ gần nhất. Từ đó hệ thống phân loại thuốc đã hết hàng, thuốc còn dưới 3 tháng, thuốc tồn nhưng không có nhu cầu và gợi ý điều chuyển.

Ở tab Đấu thầu, hệ thống giúp theo dõi tiến độ hợp đồng, hợp đồng sắp hết hạn, nhà cung ứng có giá trị lớn và các trường hợp chênh lệch giá giữa các gói thầu. Đây là công cụ hỗ trợ chuẩn bị kế hoạch mua sắm kịp thời.

Ở tab Phân tích sử dụng thuốc, hệ thống thực hiện phân tích ABC. Thuốc được xếp theo giá trị tiêu thụ, tính bằng xuất nhân giá VAT. Nhóm A là nhóm tạo ra khoảng 80% giá trị đầu tiên, nhóm B đến 95%, nhóm C là phần còn lại. Điều này giúp tập trung quản lý vào nhóm thuốc có tác động tài chính lớn nhất.

Ở tab Thuốc hiếm, hệ thống theo dõi riêng các thuốc được đánh dấu là thuốc hiếm, gồm số thuốc hiếm, đơn vị có báo cáo, giá trị xuất, giá trị tồn, xu hướng theo tháng, cơ cấu BHYT - dịch vụ và bản đồ cơ sở có tồn.

### Trình bày tra cứu mua sắm

Tiếp theo là trang tra cứu mua sắm.

Trang này cho phép theo dõi toàn bộ tiến trình của một gói thầu quy trình 1. Mỗi gói thầu được truy vết từ kế hoạch lựa chọn nhà thầu, đến thông báo mời thầu, kết quả lựa chọn nhà thầu và kết quả phân lô.

Hệ thống tổng hợp số gói thầu theo ba trạng thái: chưa có thông báo mời thầu, đã có thông báo mời thầu nhưng chưa có kết quả, và đã có kết quả lựa chọn nhà thầu.

Giá trị của phân hệ này là giúp lãnh đạo và cán bộ nghiệp vụ không phải tra cứu rời rạc trên nhiều bảng, mà có thể nhìn tiến trình mua sắm trên một màn hình.

### Trình bày tra cứu tồn kho

Trang tra cứu tồn kho phục vụ điều hành hằng ngày.

Nếu chọn theo thuốc, hệ thống cho biết thuốc đó đang còn ở cơ sở nào, tổng tồn bao nhiêu và có bao nhiêu cơ sở còn tồn.

Nếu chọn theo cơ sở, hệ thống cho biết cơ sở đó đang còn những thuốc nào, số lượng tồn, giá VAT và kỳ báo cáo.

Nếu chọn so sánh cơ sở, hệ thống so sánh cùng một thuốc giữa nhiều cơ sở, đánh dấu nơi tồn nhiều nhất, nơi có giá VAT thấp nhất và cảnh báo nếu kỳ báo cáo không đồng nhất.

Điểm cần nhấn mạnh là dữ liệu ở đây là snapshot mới nhất đã duyệt và còn tồn kho, nên phù hợp cho các tình huống cần tra cứu nhanh.

### Trình bày dự trù - đặt hàng

Phân hệ dự trù - đặt hàng kết nối trực tiếp từ phân tích tồn kho đến hành động cung ứng.

Cơ sở tạo đơn nháp, thêm thuốc và số lượng yêu cầu. Hệ thống có thể gợi ý số lượng đặt dựa trên xuất bình quân, tồn cuối và số lượng đang về. Mục tiêu mặc định là đảm bảo mức phủ 2 tháng.

Sau khi cơ sở gửi đơn, công ty phản hồi số lượng chấp nhận. Công ty có thể tạo các đợt giao. Cơ sở xác nhận thực nhận từng đợt. Hệ thống theo dõi tổng yêu cầu, tổng chấp nhận, tổng đã giao, tổng đã nhận và số còn lại cần nhận.

Trang quản trị cho phép theo dõi toàn bộ đơn theo cơ sở, công ty, trạng thái và thời gian. Trang tra cứu QR giúp đối chiếu nhanh đơn khi giao nhận.

Giá trị của phân hệ này là khép kín quy trình từ nhu cầu đến giao nhận thực tế, không dừng lại ở bước lập đơn.

### Trình bày AI

Cuối cùng là phần trợ lý AI.

AI trong hệ thống được thiết kế có kiểm soát. Người dùng có thể hỏi về tồn kho, báo cáo, ánh xạ, rủi ro cung ứng hoặc yêu cầu tóm tắt cho lãnh đạo. Cơ sở có thể dùng AI kiểm tra báo cáo và ánh xạ danh mục.

Tuy nhiên, AI không được tự ghi, sửa, gửi hay phê duyệt dữ liệu. AI chỉ trả lời dựa trên công cụ dữ liệu được cấp quyền. Admin có thể bật/tắt AI, cấu hình quota, kiểm tra provider, bật/tắt từng tool và xem thống kê sử dụng.

Trang AI usage cho biết số lượt dùng, số lượt thành công, lỗi, hết quota, cache, fallback, token và chi phí ước tính.

Như vậy, AI là công cụ hỗ trợ phân tích và kiểm tra, không thay thế trách nhiệm nghiệp vụ của con người.

### Kết luận

Tóm lại, phần mềm mang lại một nền tảng quản lý dược tập trung, có khả năng nhìn toàn cảnh, đi sâu chi tiết và hỗ trợ ra quyết định.

Với lãnh đạo, hệ thống giúp nắm tình hình nhanh, phát hiện rủi ro sớm và chỉ đạo dựa trên số liệu.

Với cán bộ nghiệp vụ, hệ thống giúp giảm tổng hợp thủ công, tăng khả năng tra cứu, kiểm tra và xử lý dữ liệu.

Với cơ sở y tế, hệ thống hỗ trợ báo cáo, tra cứu tồn kho, lập đơn dự trù và xác nhận giao nhận minh bạch.

Với toàn hệ thống, đây là bước chuyển từ quản lý báo cáo sang quản lý điều hành dựa trên dữ liệu.

---

## 16. Kết luận ngắn để kết thúc buổi trình bày

Phần mềm không chỉ là công cụ nhập liệu hay xem báo cáo. Đây là hệ thống hỗ trợ điều hành dược toàn diện, từ báo cáo tồn - nhập - xuất, cảnh báo cung ứng, mua sắm, tồn kho, dự trù đặt hàng đến AI hỗ trợ phân tích.

Điểm mạnh lớn nhất của hệ thống là mọi chỉ số đều có công thức rõ ràng, có thể truy về dữ liệu gốc, đồng thời được trình bày thành dashboard, bảng tra cứu và cảnh báo dễ hiểu cho cả lãnh đạo và cán bộ nghiệp vụ.

Kính mong lãnh đạo xem xét định hướng triển khai, chuẩn hóa dữ liệu và đưa hệ thống vào vận hành định kỳ để nâng cao hiệu quả quản lý dược, đảm bảo cung ứng thuốc và tăng tính minh bạch trong mua sắm, sử dụng thuốc.
