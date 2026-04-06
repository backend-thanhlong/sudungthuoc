# Facility Reports Strict Upload Validation Design

## Context

Trang `/dashboard/facility/reports` hiện cho phép cơ sở tải file mẫu Excel, điền số liệu, xem preview và nộp báo cáo tháng.

Luồng hiện tại có 3 điểm làm giảm độ chính xác dữ liệu:

- server suy luận dòng báo cáo từ `Mã nội bộ` hoặc `Mã thuốc`, nên người dùng có thể sửa cột nhận diện mà hệ thống vẫn map được sang một thuốc hợp lệ khác
- các dòng không match được mapping hiện chỉ bị bỏ qua thay vì chặn nộp
- preview phía client mới kiểm tra công thức cơ bản, chưa kiểm soát chặt danh tính dòng báo cáo và các lỗi cấu trúc của file

Kết quả là file có thể được nộp với dữ liệu sai danh tính thuốc hoặc bỏ sót lỗi quan trọng trước khi lưu vào `inventory_reports`.

## Goal

Tăng độ chính xác dữ liệu của luồng nộp báo cáo facility theo nguyên tắc:

- chặn cứng toàn bộ file nếu có bất kỳ dòng sai nào
- chỉ yêu cầu các dòng thực sự có trong file phải hợp lệ
- cho phép người dùng xóa dòng khỏi file, các dòng bị xóa sẽ được bỏ qua hoàn toàn
- coi các cột nhận diện thuốc là bất biến, không cho phép sửa mà vẫn nộp thành công
- không cho phép lưu một phần dữ liệu khi file có lỗi

## Scope

Bao gồm:

- thay đổi file mẫu Excel của `/api/facility/reports/template`
- bổ sung cơ chế khóa danh tính từng dòng bằng token ký bởi server
- thay đổi upload validation ở `/api/facility/reports`
- thêm endpoint validate không ghi DB để preview có thể kiểm tra phía server
- chuẩn hóa contract lỗi trả về cho UI
- nâng cấp preview ở `src/app/dashboard/facility/reports/page.tsx` để chặn nộp sớm hơn

Không bao gồm:

- bắt buộc file phải đầy đủ mọi dòng như mẫu gốc
- thay đổi trang admin reports
- thay đổi lịch sử báo cáo hoặc modal xem chi tiết
- thay đổi business rule duyệt báo cáo của admin

## Approach Options

### Option 1: Token hóa từng dòng mẫu và kiểm tra cứng khi upload

Mỗi dòng trong file mẫu có một token kỹ thuật do server ký, đại diện cho đúng `facilityId + month + mapId`. Khi upload, server giải token để xác định danh tính dòng, sau đó đối chiếu lại các cột nhận diện với dữ liệu chuẩn và reject toàn bộ file nếu có bất kỳ sai lệch nào.

Ưu điểm:

- chặn được sửa cột nhận diện
- chặn được copy dòng giữa các file, tháng hoặc cơ sở khác nhau
- không cần bắt buộc file phải đầy đủ như mẫu
- thay đổi dữ liệu tập trung vào đúng luồng facility reports

Nhược điểm:

- cần thay đổi cả template, preview và upload validation
- tăng số rule cần kiểm thử

### Option 2: Dùng `Mã nội bộ` làm khóa duy nhất khi upload

Bỏ fallback theo `Mã thuốc`, chỉ cho phép map dòng bằng `Mã nội bộ`, rồi kiểm tra thêm các cột nhận diện khác.

Ưu điểm:

- thay đổi nhỏ hơn
- dễ triển khai hơn token hóa

Nhược điểm:

- không chặn được việc người dùng đổi cả dòng sang một `Mã nội bộ` hợp lệ khác
- không ràng buộc được dòng đó có thực sự đến từ mẫu của đúng tháng hay không

### Option 3: Lưu snapshot mẫu trên server theo từng facility và tháng

Mỗi lần tải mẫu, server lưu snapshot đầy đủ danh sách dòng hợp lệ. Khi upload, file được so với snapshot để phát hiện sửa nhận diện hoặc dòng lạ.

Ưu điểm:

- kiểm soát rất chặt
- thuận lợi cho audit lịch sử mẫu đã phát hành

Nhược điểm:

- tăng độ phức tạp lưu trữ và vòng đời dữ liệu
- vượt quá nhu cầu hiện tại

### Recommendation

Chọn Option 1.

Đây là cách cân bằng tốt nhất giữa độ chính xác dữ liệu, phạm vi thay đổi và khả năng triển khai trong codebase hiện tại. Nó giải quyết trực tiếp điểm yếu lớn nhất của luồng hiện nay: server đang suy luận danh tính dòng từ dữ liệu người dùng có thể sửa.

## Chosen Design

### Row identity model

Mỗi dòng hợp lệ trong file mẫu sẽ có một cột kỹ thuật ẩn tên `__ROW_TOKEN`.

Token chứa tối thiểu:

- `facilityId`
- `reportMonth`
- `mapId`
- `version`
- `signature`

Token được ký HMAC bằng một secret chỉ có ở server, ví dụ `REPORT_UPLOAD_SIGNING_SECRET`.

Yêu cầu của token:

- chỉ hợp lệ cho đúng một facility
- chỉ hợp lệ cho đúng một tháng báo cáo
- chỉ hợp lệ cho đúng một dòng mapping
- không thể tự sửa nội dung mà vẫn qua kiểm tra chữ ký

Server sẽ không còn xác định dòng bằng cách lookup từ `Mã nội bộ` hoặc `Mã thuốc` như luồng hiện tại. `mapId` phải luôn được lấy từ token đã xác thực.

### Template design

File tác động: `src/app/api/facility/reports/template/route.ts`

Sheet `BaoCao` tiếp tục chỉ chứa các dòng xuất phát từ `facilityDrugMap` có `status in ["APPROVED", "AUTO_MAPPED"]`.

Mỗi dòng sẽ được bổ sung:

- cột ẩn `__ROW_TOKEN`

Các cột nhận diện được coi là bất biến về mặt nghiệp vụ:

- `Mã nội bộ`
- `Mã thuốc`
- `Tên thuốc`
- `Hoạt chất`
- `Đơn vị tính`

Các cột này vẫn hiển thị trong file để người dùng đối chiếu, nhưng hệ thống sẽ không chấp nhận bất kỳ thay đổi nào khi upload.

Các cột cho phép người dùng nhập/chỉnh:

- `Tồn đầu`
- `Nhập trong kỳ`
- `Xuất trong kỳ`
- `Tồn cuối`
- `Giá VAT`
- `Thành tiền tồn cuối`
- `Số QĐ trúng thầu`
- `Tên Công ty`
- `Ngày bắt đầu HĐ`
- `Ngày kết thúc HĐ`
- `BHYT`
- `Dịch vụ`

Tiếp tục prefill từ tháng trước khi có dữ liệu:

- `Tồn đầu`
- `Giá VAT`
- `Số QĐ trúng thầu`
- `Tên Công ty`
- `Ngày bắt đầu HĐ`
- `Ngày kết thúc HĐ`
- `BHYT`
- `Dịch vụ`

Yêu cầu UX của template:

- cột `__ROW_TOKEN` phải bị ẩn
- các cột nhận diện phải được tô nền hoặc chú thích rõ là không được chỉnh sửa
- sheet `Hướng dẫn` phải ghi rõ:
  - không sửa cột nhận diện
  - không copy dòng từ file khác
  - có thể xóa hẳn dòng không muốn báo cáo
  - file sẽ bị từ chối nếu bất kỳ dòng nào sai

Thiết kế này không phụ thuộc vào cơ chế khóa ô của Excel để đảm bảo an toàn. Excel protection chỉ là lớp hỗ trợ UX nếu triển khai được sạch bằng thư viện hiện có. Kiểm tra ở server mới là nguồn sự thật cuối cùng.

### Validation flow

File tác động chính: `src/app/api/facility/reports/route.ts`

Upload sẽ chạy theo 2 pha:

1. Parse và validate toàn bộ file
2. Chỉ khi không còn lỗi nào thì mới ghi dữ liệu trong một transaction

Không được phép upsert từng dòng trong lúc đang validate.

Rule xử lý dòng:

- dòng trống hoàn toàn được bỏ qua
- dòng có bất kỳ dữ liệu nghiệp vụ nào hoặc có token được xem là một dòng cần validate
- dòng bị xóa khỏi file được bỏ qua hoàn toàn, không sinh lỗi và không tự tạo bản ghi 0

### Hard validation rules

Mỗi file sẽ bị reject toàn bộ nếu vi phạm bất kỳ rule nào sau đây:

#### Token and identity rules

- thiếu `__ROW_TOKEN`
- `__ROW_TOKEN` không giải mã được hoặc sai chữ ký
- token không thuộc đúng `facilityId` hiện tại
- token không thuộc đúng `reportMonth` đang nộp
- token không giải ra được `mapId` hợp lệ trong DB
- hai dòng trong cùng file dùng cùng một token hoặc cùng một `mapId`

#### Immutable column rules

Sau khi xác thực token và lấy được `mapId`, server nạp dữ liệu chuẩn từ `facilityDrugMap` và `masterDrug`, rồi so khớp lại các cột nhận diện:

- `Mã nội bộ`
- `Mã thuốc`
- `Tên thuốc`
- `Hoạt chất`
- `Đơn vị tính`

So khớp dùng chuẩn hóa tối thiểu:

- `trim()`
- co gọn nhiều khoảng trắng liên tiếp thành một khoảng trắng

Nếu bất kỳ cột nào khác canonical value, file bị reject.

#### Numeric rules

Các cột số:

- `Tồn đầu`
- `Nhập trong kỳ`
- `Xuất trong kỳ`
- `Tồn cuối`
- `Giá VAT`
- `Thành tiền tồn cuối`

Rule:

- phải parse được thành số hợp lệ
- không được âm
- `Tồn cuối = Tồn đầu + Nhập trong kỳ - Xuất trong kỳ`
- `Thành tiền tồn cuối = Tồn cuối * Giá VAT`
- nếu có dữ liệu tháng trước cho cùng `mapId`, `Tồn đầu` phải bằng `Tồn cuối` tháng trước

Tolerance số học tiếp tục là `0.01`.

#### Categorical rules

- `BHYT` chỉ được là `X`, `x`, hoặc rỗng
- `Dịch vụ` chỉ được là `X`, `x`, hoặc rỗng
- không được để đồng thời cả `BHYT` và `Dịch vụ` cùng rỗng

#### Date rules

Nếu có dữ liệu, `Ngày bắt đầu HĐ` và `Ngày kết thúc HĐ` phải:

- đúng định dạng `YYYYMMDD`
- là ngày hợp lệ
- `Ngày bắt đầu HĐ <= Ngày kết thúc HĐ` khi cả hai cùng có dữ liệu

### Persistence behavior

Chỉ khi toàn bộ file vượt qua validation:

- bắt đầu transaction
- `upsert` từng dòng hợp lệ vào `inventory_reports` theo khóa `(facilityId, mapId, reportMonth)`
- reset `status` về `PENDING`
- xóa `adminNote`

Nếu có bất kỳ lỗi validation nào:

- không ghi bất kỳ dòng nào
- không log submit thành công
- không gửi notification cho admin

### Error contract

API upload sẽ trả `400` với payload chuẩn hóa:

```json
{
  "message": "Báo cáo không hợp lệ",
  "summary": {
    "totalRows": 0,
    "errorCount": 0
  },
  "errors": [
    {
      "rowNumber": 2,
      "field": "Mã nội bộ",
      "code": "IMMUTABLE_FIELD_MISMATCH",
      "message": "Dòng 2: Mã nội bộ không khớp với dữ liệu mẫu."
    }
  ]
}
```

Quy ước:

- `rowNumber` là số dòng theo Excel, tính cả header
- `field` là tên cột hiển thị cho người dùng
- `code` là mã ổn định để UI gom nhóm hoặc highlight
- `message` là câu tiếng Việt có thể hiển thị trực tiếp

Danh sách `errors` phải được sắp theo `rowNumber`, rồi theo `field` để UI hiển thị ổn định.

## UI And Preview Design

File tác động: `src/app/dashboard/facility/reports/page.tsx`

Preview phía client có 2 lớp:

### Local structural preview

Ngay khi đọc Excel ở client, preview kiểm tra các lỗi không cần gọi server:

- thiếu token
- token trùng trong cùng file
- số không hợp lệ
- giá trị âm
- giá trị `BHYT` hoặc `Dịch vụ` sai tập giá trị
- định dạng ngày không đúng
- sai công thức `Tồn cuối`
- sai công thức `Thành tiền tồn cuối`

### Authoritative server validation

Để bắt sớm các lỗi cần dữ liệu chuẩn trong DB, client sẽ gọi một lượt validate ở server trước khi cho phép nộp thông qua endpoint:

- thêm endpoint `POST /api/facility/reports/validate`

Endpoint validate dùng đúng logic với upload thật nhưng không ghi DB.

Nó kiểm tra thêm các lỗi mà client không thể tự xác nhận an toàn:

- token không đúng facility hoặc month
- token không resolve được `mapId`
- mismatch ở các cột nhận diện
- `Tồn đầu` lệch `Tồn cuối` tháng trước

UI behavior:

- sau khi người dùng chọn file, preview local chạy trước
- nếu local preview không có lỗi cấu trúc, client gọi validate endpoint
- chỉ khi cả local preview và server validation đều sạch lỗi thì nút `Xác nhận nộp báo cáo` mới được bật
- nếu server validation có lỗi, UI hiển thị lỗi theo từng dòng và không cho submit thật

### Preview presentation

Bảng preview nên hiển thị lỗi theo nhóm:

- `Lỗi khóa dòng`
- `Lỗi nhận diện thuốc`
- `Lỗi công thức`
- `Lỗi định dạng`

Mỗi lỗi cần map lại vào dòng tương ứng để:

- highlight dòng lỗi
- highlight cột lỗi nếu xác định được `field`
- hiển thị danh sách lỗi ngắn, dễ sửa

## Compatibility And Migration

Thiết kế này làm cho các file mẫu cũ không còn hợp lệ vì không có `__ROW_TOKEN`.

Hệ thống cần phản hồi rõ với file cũ:

- nếu thiếu token trên bất kỳ dòng nào, trả lỗi yêu cầu người dùng tải lại mẫu mới cho đúng tháng rồi điền lại dữ liệu

Không cần migration DB cho `inventory_reports` hoặc `facility_drug_maps`.

## Testing Plan

Kiểm thử thủ công tối thiểu:

1. Tải mẫu mới, điền đúng dữ liệu, xác nhận preview sạch lỗi và nộp thành công
2. Sửa `Mã nội bộ`, xác nhận validate reject
3. Sửa `Tên thuốc`, xác nhận validate reject
4. Copy một dòng từ file tháng khác, xác nhận validate reject vì token sai month
5. Xóa một vài dòng khỏi file, xác nhận file vẫn nộp được nếu các dòng còn lại hợp lệ
6. Nhân đôi một dòng, xác nhận reject vì duplicate token hoặc mapId
7. Đổi `BHYT` thành giá trị khác `X`, xác nhận reject
8. Để trống cả `BHYT` và `Dịch vụ`, xác nhận reject
9. Nhập ngày sai định dạng, xác nhận reject
10. Làm sai công thức `Tồn cuối` hoặc `Thành tiền`, xác nhận reject
11. Dùng file mẫu cũ không có token, xác nhận reject với thông báo rõ ràng
12. Đảm bảo khi reject thì DB không có bất kỳ thay đổi nào

Kiểm thử kỹ thuật:

- unit test cho hàm tạo và xác thực token
- unit test cho chuẩn hóa và so khớp immutable fields
- unit test cho parser ngày `YYYYMMDD`
- integration test cho validate endpoint
- integration test cho upload transaction theo hướng all-or-nothing

## Open Decisions Resolved

Các quyết định đã chốt trong phiên brainstorming này:

- dùng hướng token hóa từng dòng mẫu
- chặn cứng toàn bộ file nếu có một dòng sai
- không bắt buộc file phải đầy đủ toàn bộ dòng như mẫu
- các dòng bị xóa khỏi file được bỏ qua hoàn toàn
- các cột nhận diện thuốc được coi là bất biến
