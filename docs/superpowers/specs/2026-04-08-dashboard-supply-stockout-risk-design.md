# Thiết kế: Chuẩn hóa cảnh báo đứt gãy tại tab `Cung ứng`

## Bối cảnh

Tab `Cung ứng` trên dashboard admin và facility hiện có khối `Cảnh báo đứt gãy (Stockout Risk)`, nhưng logic backend đang chỉ dựa trên điều kiện:

- `tonCuoi = 0`
- và `xuat > 0`

Điều này khiến tên gọi và mô tả UI không khớp với thực tế:

- UI mô tả là "Thuốc có nhu cầu cao nhưng tồn cuối = 0"
- nhưng code hiện tại chỉ phát hiện "đã hết hàng cuối kỳ có phát sinh xuất"
- không có ngưỡng "nhu cầu cao"
- không có khái niệm độ phủ tồn kho
- và khi để `Tất cả các kỳ`, dữ liệu nhiều kỳ có thể bị trộn trong cùng một bảng

Người dùng cần một cách tính phản ánh đúng hơn hai trạng thái nghiệp vụ khác nhau:

- đã hết hàng cuối kỳ
- nguy cơ đứt gãy trong thời gian tới

## Mục tiêu

- Tách riêng "đã hết hàng thực tế" và "nguy cơ đứt gãy"
- Chuẩn hóa toàn tab `Cung ứng` để luôn tính trên một kỳ dữ liệu hiện tại rõ ràng
- Cho người dùng chọn tạm thời cách tính nhu cầu (`1 kỳ`, `TB 3 kỳ`, `TB 6 kỳ`)
- Giữ cách giải thích đơn giản, dễ kiểm chứng từ dữ liệu báo cáo hiện có

## Phạm vi

Áp dụng cho cả:

- `/dashboard/admin`
- `/dashboard/facility`

Phạm vi thay đổi:

- route `supply` của dashboard admin
- route `supply` của dashboard facility
- UI tab `Cung ứng`
- cách đặt tên, mô tả, cột dữ liệu và sắp xếp hai bảng cảnh báo

Ngoài phạm vi:

- không đổi schema Prisma
- không thêm bảng cấu hình người dùng
- không lưu lựa chọn "chuẩn nhu cầu" cho các lần đăng nhập sau
- không thay đổi logic nhập báo cáo tồn kho

## Vấn đề hiện tại

Logic hiện tại:

- lấy toàn bộ `inventoryReport` theo bộ lọc tháng/cơ sở
- tạo `stockoutRisk` bằng điều kiện `tonCuoi = 0 && xuat > 0`
- sắp xếp giảm dần theo `xuat`

Hệ quả:

- một thuốc chỉ xuất 1 đơn vị vẫn bị coi là "đứt gãy" như thuốc có mức sử dụng rất cao
- không có mức độ cảnh báo
- không đánh giá được thuốc còn tồn nhưng sắp thiếu
- khi để `Tất cả các kỳ`, khái niệm "cuối kỳ" trở nên không rõ vì dữ liệu nhiều tháng bị gộp chung

## Thiết kế nghiệp vụ

### 1. Kỳ dữ liệu hiện tại

Tab `Cung ứng` luôn phải tính trên một `effectiveReportMonth`.

Quy tắc:

- nếu người dùng chọn một kỳ cụ thể, dùng đúng kỳ đó
- nếu người dùng để `Tất cả các kỳ`, tự động chọn kỳ mới nhất trong phạm vi bộ lọc hiện tại

`effectiveReportMonth` sẽ được trả về từ API để UI hiển thị rõ "đang tính theo kỳ nào".

### 2. Chuẩn nhu cầu

UI thêm bộ chọn tạm thời trong tab `Cung ứng`:

- `1 kỳ gần nhất`
- `TB 3 kỳ gần nhất`
- `TB 6 kỳ gần nhất`

Giá trị mặc định:

- `TB 3 kỳ gần nhất`

Lựa chọn này chỉ có hiệu lực trong phiên hiển thị hiện tại, không lưu xuống DB.

### 3. Cách tính nhu cầu

Với mỗi tổ hợp:

- `facilityId`
- `mapId`

Xác định các kỳ lịch sử không vượt quá `effectiveReportMonth`, sắp theo thời gian giảm dần, rồi lấy `N` kỳ gần nhất theo `demandWindow`.

`demandAvg` luôn tính trên tập kỳ lịch sử có bao gồm `effectiveReportMonth`.

Ví dụ:

- `demandWindow = 1`: lấy `xuat` của chính `effectiveReportMonth`
- `demandWindow = 3`: lấy trung bình `xuat` của `effectiveReportMonth` và 2 kỳ liền trước nếu có
- `demandWindow = 6`: lấy trung bình `xuat` của `effectiveReportMonth` và 5 kỳ liền trước nếu có

Định nghĩa:

- `currentTonCuoi`: `tonCuoi` của `effectiveReportMonth`
- `currentXuat`: `xuat` của `effectiveReportMonth`
- `demandAvg`: trung bình `xuat` trên `N` kỳ gần nhất thực có

Quy tắc bổ sung:

- nếu không đủ `N` kỳ, lấy trung bình trên số kỳ thực có
- nếu không có kỳ lịch sử nào hoặc `demandAvg = 0`, không tính `Nguy cơ đứt gãy`

### 4. Khối `Đã hết hàng cuối kỳ`

Đây là khối phản ánh tình trạng đã đứt hàng thực tế ở cuối `effectiveReportMonth`.

Điều kiện:

- `currentTonCuoi = 0`
- `demandAvg > 0`

Ý nghĩa:

- thuốc đã hết hàng ở cuối kỳ
- và có bằng chứng là thuốc có tiêu thụ thực tế trong giai đoạn dùng để tính nhu cầu

Khối này không cần phân mức đỏ/cam/vàng vì đây là trạng thái đã xảy ra.

### 5. Khối `Nguy cơ đứt gãy`

Khối này chỉ xét các thuốc chưa hết hẳn nhưng có độ phủ tồn kho thấp.

Điều kiện đầu vào:

- `currentTonCuoi > 0`
- `demandAvg > 0`

Chỉ số chính:

- `monthsOfCover = currentTonCuoi / demandAvg`

Ngưỡng cảnh báo:

- `Đỏ`: `< 1 tháng`
- `Cam`: `1 đến < 2 tháng`
- `Vàng`: `2 đến < 3 tháng`
- `>= 3 tháng`: không đưa vào danh sách cảnh báo

Quy tắc không lặp:

- một thuốc đã vào `Đã hết hàng cuối kỳ` thì không xuất hiện trong `Nguy cơ đứt gãy`

## Thiết kế API

### Request

Hai route:

- `src/app/api/admin/dashboard/supply/route.ts`
- `src/app/api/facility/dashboard/supply/route.ts`

Nhận thêm query param:

- `demandWindow=1|3|6`

Các filter hiện có vẫn giữ:

- `reportMonth`
- `facilityId` với admin
- `hoatChat` cho khối gợi ý điều chuyển

### Response

Response sẽ bổ sung:

- `effectiveReportMonth`
- `demandWindow`

Và thay `stockoutRisk` hiện tại bằng cấu trúc rõ nghĩa hơn:

- `stockoutActual`
- `stockoutForecast`

Đề xuất shape:

```ts
{
  effectiveReportMonth: "03/2026",
  demandWindow: 3,
  stockoutActual: Array<{
    facility: string;
    drugName: string;
    hoatChat: string;
    hamLuong: string;
    tonCuoi: number;
    currentXuat: number;
    demandAvg: number;
  }>;
  stockoutForecast: Array<{
    facility: string;
    drugName: string;
    hoatChat: string;
    hamLuong: string;
    tonCuoi: number;
    currentXuat: number;
    demandAvg: number;
    monthsOfCover: number;
    severity: "danger" | "warning" | "watch";
  }>;
  scatterData: ...;
  transferData: ...;
  hoatChatList: string[];
}
```

### Sắp xếp

`stockoutActual`:

- giảm dần theo `demandAvg`
- nếu bằng nhau thì giảm dần theo `currentXuat`

`stockoutForecast`:

- `danger` trước
- rồi `warning`
- rồi `watch`
- trong từng nhóm, tăng dần theo `monthsOfCover`

## Thiết kế UI

Tab `Cung ứng` sẽ gồm:

- bộ chọn `Chuẩn nhu cầu`
- nhãn ngữ cảnh: `Đang tính theo kỳ 03/2026, chuẩn nhu cầu: TB 3 kỳ gần nhất`
- khối `Đã hết hàng cuối kỳ`
- khối `Nguy cơ đứt gãy`
- các phần còn lại của tab (`Ma trận Tồn/Xuất`, `Gợi ý điều chuyển`) tiếp tục hiển thị bên dưới

### Khối `Đã hết hàng cuối kỳ`

Đổi tên từ `Cảnh báo đứt gãy (Stockout Risk)` sang:

- `Đã hết hàng cuối kỳ`

Đổi mô tả thành:

- `Thuốc có tồn cuối = 0 và vẫn có nhu cầu sử dụng`

Các cột đề xuất:

- `STT`
- `Cơ sở`
- `Tên thuốc`
- `Hoạt chất`
- `Xuất kỳ hiện tại`
- `Nhu cầu bình quân`

### Khối `Nguy cơ đứt gãy`

Thêm một bảng mới ngay dưới khối trên.

Mô tả:

- `Thuốc còn tồn nhưng độ phủ dưới 3 tháng`

Các cột đề xuất:

- `STT`
- `Cơ sở`
- `Tên thuốc`
- `Hoạt chất`
- `Tồn cuối`
- `Nhu cầu bình quân`
- `Số tháng đủ dùng`
- `Mức độ`

Mức độ hiển thị:

- `Đỏ` cho `< 1 tháng`
- `Cam` cho `1 đến < 2 tháng`
- `Vàng` cho `2 đến < 3 tháng`

## Tác động lên các phần khác trong tab

### Ma trận Tồn/Xuất

`scatterData` sẽ dùng cùng `effectiveReportMonth` để tránh trong một tab có nhiều khối nhưng mỗi khối tính trên một tập kỳ khác nhau.

### Gợi ý điều chuyển

`transferData` sẽ dùng cùng `effectiveReportMonth` khi lấy ảnh chụp tồn cuối hiện tại.

Phần "nhu cầu" cho điều chuyển sẽ tái sử dụng cùng `demandWindow` để đồng bộ khái niệm tiêu thụ trong toàn tab.

## Edge Cases

- nếu không có dữ liệu trong phạm vi lọc, API trả hai mảng cảnh báo rỗng
- nếu `effectiveReportMonth` không xác định được, toàn tab trả rỗng có kiểm soát
- nếu thuốc không có đủ 3 hoặc 6 kỳ lịch sử, lấy trung bình trên số kỳ thực có
- nếu `demandAvg = 0`, thuốc không vào `Nguy cơ đứt gãy`
- nếu `currentTonCuoi = 0` và `demandAvg > 0`, thuốc chỉ xuất hiện ở `Đã hết hàng cuối kỳ`
- nếu `Tất cả các kỳ`, tuyệt đối không trộn nhiều kỳ trong cùng một bảng cảnh báo

## Kiểm thử

1. Chọn một kỳ cụ thể, xác nhận `effectiveReportMonth` đúng bằng kỳ đã chọn.
2. Để `Tất cả các kỳ`, xác nhận API/UI tự rơi về kỳ mới nhất.
3. Một thuốc có `tonCuoi = 0`, `demandAvg > 0`:
   xuất hiện trong `Đã hết hàng cuối kỳ`, không xuất hiện ở bảng rủi ro.
4. Một thuốc có `tonCuoi > 0`, `monthsOfCover < 1`:
   xuất hiện ở `Nguy cơ đứt gãy` mức `Đỏ`.
5. Một thuốc có `1 <= monthsOfCover < 2`:
   xuất hiện mức `Cam`.
6. Một thuốc có `2 <= monthsOfCover < 3`:
   xuất hiện mức `Vàng`.
7. Một thuốc có `monthsOfCover >= 3`:
   không xuất hiện ở bảng rủi ro.
8. Đổi `demandWindow` giữa `1`, `3`, `6`:
   danh sách và mức độ cảnh báo thay đổi tương ứng.
9. Kiểm tra cả dashboard admin và facility cho cùng logic và cấu trúc hiển thị.

## Ngoài phạm vi triển khai đầu tiên

- không thêm biểu đồ xu hướng tiêu thụ riêng cho từng thuốc
- không lưu lựa chọn `demandWindow` theo người dùng
- không bổ sung seasonality hoặc weighted moving average
- không thay đổi logic dữ liệu nguồn của báo cáo tồn kho
