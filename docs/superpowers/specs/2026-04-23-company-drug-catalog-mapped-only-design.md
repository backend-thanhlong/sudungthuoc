# Company Drug Catalog Mapped-Only Design

## Context

Màn `/dashboard/company/dutru-dat-hang`, tab `Danh mục công ty`, hiện vẫn cho phép:

- tạo `CompanyDrug` không gắn `MasterDrug`
- nhập tay nhiều trường mô tả thuốc công ty
- tạo mới thuốc công ty từ dialog phản hồi đơn với dữ liệu không bị ràng buộc chặt vào danh mục dùng chung

Yêu cầu mới chốt lại:

- công ty không được thêm thuốc ngoài danh mục dùng chung
- công ty chỉ được lấy thuốc trong danh mục dùng chung đã được ánh xạ
- `Mã thuốc công ty` do công ty tự nhập
- `Tên thuốc công ty` lấy theo tên thuốc trong danh mục dùng chung
- chỉ `Quy cách` được phép sửa
- sau khi lưu, bảng danh sách thuốc công ty phải hiển thị thêm các trường `Hàm lượng`, `Số đăng ký`, `Dạng bào chế`, `Quy cách` ngay sau `Hoạt chất`

## Goal

Chuẩn hóa danh mục thuốc công ty để:

- mọi thuốc công ty mới đều xuất phát từ `MasterDrug`
- chỉ dùng được `MasterDrug` đã được ánh xạ trong hệ thống
- dữ liệu mô tả thuốc công ty bám theo danh mục dùng chung, tránh lệch chuẩn
- công ty chỉ được tùy biến `Mã thuốc công ty` và `Quy cách`
- rule được áp dụng nhất quán ở tab danh mục công ty và luồng phản hồi đơn

## Definition Of "Mapped"

Trong scope thay đổi này, một `MasterDrug` được xem là "đã được ánh xạ" khi có ít nhất một `FacilityDrugMap` với:

- `status = APPROVED`
- hoặc `status = AUTO_MAPPED`

Các `MasterDrug` không thỏa điều kiện trên không được phép xuất hiện trong nguồn chọn thuốc cho công ty.

## Scope

Bao gồm:

- cập nhật dialog thêm/sửa ở tab `Danh mục công ty`
- cập nhật bảng danh sách thuốc công ty
- cập nhật validation và contract tạo/cập nhật `CompanyDrug`
- cập nhật luồng tạo thuốc công ty trong dialog phản hồi đơn
- bổ sung lưu trữ `Quy cách` riêng trên `CompanyDrug`
- xử lý tương thích cho dữ liệu cũ không còn hợp lệ theo rule mới

Không bao gồm:

- thay đổi định nghĩa mapping của `FacilityDrugMap`
- thay đổi workflow admin/facility mappings
- xóa cứng dữ liệu cũ ngay trong pha này
- thêm tab migration riêng hay công cụ bulk-fix riêng

## Approach Options

### Option 1: Chỉ đổi UI tab `Danh mục công ty`

Ưu điểm:

- ít sửa nhất
- ra nhanh

Nhược điểm:

- backend vẫn cho tạo dữ liệu sai rule
- dialog phản hồi đơn vẫn có thể tạo thuốc công ty ngoài danh mục dùng chung
- dữ liệu dễ lệch chuẩn

### Option 2: Chặn ở tab danh mục và giữ luồng phản hồi đơn như cũ

Ưu điểm:

- cải thiện đúng màn người dùng vừa yêu cầu

Nhược điểm:

- rule nghiệp vụ không nhất quán
- vẫn còn đường tạo `CompanyDrug` không đúng chuẩn

### Option 3: Thực thi rule ở toàn bộ luồng tạo/cập nhật `CompanyDrug`

Ưu điểm:

- đúng với nghiệp vụ đã chốt
- giữ dữ liệu nhất quán
- giảm khả năng phát sinh thuốc công ty sai chuẩn trong tương lai

Nhược điểm:

- cần sửa cả UI, API, schema và một phần xử lý dữ liệu cũ

### Recommendation

Chọn Option 3.

Rule mới là rule dữ liệu, không chỉ là thay đổi trình bày UI. Nếu chỉ khóa ở một màn hình thì các luồng khác vẫn tiếp tục sinh dữ liệu sai chuẩn.

## Data Design

### CompanyDrug

`CompanyDrug` chuyển sang mô hình "bản ghi công ty tham chiếu thuốc chuẩn".

Rule dữ liệu mới:

- `masterDrugId` bắt buộc với mọi `CompanyDrug` mới
- `companyDrugCode` vẫn do công ty nhập và unique trong phạm vi công ty
- `companyDrugName` lấy từ `MasterDrug.tenThuoc`
- `activeIngredient` lấy từ `MasterDrug.hoatChat`
- `unit` lấy từ `MasterDrug.donViTinh`
- `quyCach` lấy mặc định từ `MasterDrug.quyCach` nhưng cho phép công ty sửa tay và lưu riêng

Để giới hạn phạm vi thay đổi:

- thêm cột `quyCach` vào `CompanyDrug`
- tiếp tục giữ `companyDrugName`, `activeIngredient`, `unit` trên `CompanyDrug` như dữ liệu đồng bộ từ `MasterDrug`
- không thêm cột riêng cho `hamLuong`, `soDangKy`, `dangBaoChe` vào `CompanyDrug`
- `hamLuong`, `soDangKy`, `dangBaoChe` khi render sẽ đọc từ relation `masterDrug`

Lý do:

- giảm chi phí migration
- không phải backfill nhiều cột mới không có nhu cầu chỉnh sửa
- vẫn đáp ứng đầy đủ UI cần hiển thị

### Legacy Data

Các `CompanyDrug` hiện có rơi vào một trong các trường hợp sau:

- không có `masterDrugId`
- có `masterDrugId` nhưng `masterDrug` không còn thuộc tập mapped

Các bản ghi này được xem là `legacy`.

Nguyên tắc xử lý:

- vẫn đọc được để không làm mất khả năng tra cứu lịch sử
- không được dùng để tạo mới ngoài rule mới
- khi người dùng sửa một bản ghi legacy, phải gắn lại vào một `MasterDrug` mapped hợp lệ trước khi lưu

## UI Design

### 1. Tab `Danh mục công ty`

Dialog thêm mới đổi sang luồng:

1. tìm `MasterDrug` trong tập mapped
2. chọn một thuốc chuẩn
3. nhập `Mã thuốc công ty`
4. điều chỉnh `Quy cách` nếu cần
5. lưu

Các trường hiển thị trong form:

- `Thuốc chuẩn đã được ánh xạ`: bắt buộc chọn
- `Mã thuốc công ty`: editable
- `Tên thuốc`: read-only
- `Hoạt chất`: read-only
- `Hàm lượng`: read-only
- `Số đăng ký`: read-only
- `Dạng bào chế`: read-only
- `Đơn vị`: read-only
- `Quy cách`: editable
- `Trạng thái sử dụng`: giữ nguyên

Thứ tự phần thông tin thuốc trong dialog:

- sau `Hoạt chất` hiển thị tiếp `Hàm lượng`, `Số đăng ký`, `Dạng bào chế`, `Quy cách`

### 2. Chỉnh sửa thuốc công ty

Khi mở dialog sửa:

- hiển thị lại `MasterDrug` đang liên kết
- các trường đồng bộ từ `MasterDrug` tiếp tục là read-only
- chỉ cho sửa `Mã thuốc công ty`, `Quy cách`, `Trạng thái sử dụng`

Khóa việc đổi `MasterDrug` với bản ghi đã tồn tại.

Lý do:

- tránh một `CompanyDrug` đã được dùng trong đơn bị đổi sang nghĩa thuốc khác
- đơn giản hóa validation và audit

Nếu người dùng gắn nhầm thuốc chuẩn, thao tác đúng là ngừng dùng hoặc xóa bản ghi cũ rồi tạo lại.

### 3. Bảng danh sách thuốc công ty

Bảng danh sách hiển thị thêm các cột sau ngay sau `Hoạt chất`:

- `Hàm lượng`
- `Số đăng ký`
- `Dạng bào chế`
- `Quy cách`

Nguồn dữ liệu cột:

- `Hoạt chất`: `CompanyDrug.activeIngredient`, fallback `CompanyDrug.masterDrug.hoatChat` cho dữ liệu cũ thiếu đồng bộ
- `Hàm lượng`: `CompanyDrug.masterDrug.hamLuong`
- `Số đăng ký`: `CompanyDrug.masterDrug.soDangKy`
- `Dạng bào chế`: `CompanyDrug.masterDrug.dangBaoChe`
- `Quy cách`: `CompanyDrug.quyCach`, fallback `CompanyDrug.masterDrug.quyCach`

Các bản ghi `legacy` hiển thị badge ngắn `Legacy` để người dùng phân biệt.

Không thêm tab riêng hay filter mới trong pha này.

### 4. Dialog phản hồi đơn

Với dòng `PENDING_CATALOG_CONFIRMATION`, công ty chỉ có hai lựa chọn:

- chọn `CompanyDrug` đã tồn tại và map đúng `masterDrugId`
- tạo mới `CompanyDrug` từ chính `masterDrug` của dòng

Luồng tạo mới trong dialog phản hồi đơn được rút gọn còn:

- `Mã thuốc công ty`: editable
- `Tên thuốc`: read-only theo `masterDrug`
- `Hoạt chất`: read-only theo `masterDrug`
- `Hàm lượng`: read-only theo `masterDrug`
- `Số đăng ký`: read-only theo `masterDrug`
- `Dạng bào chế`: read-only theo `masterDrug`
- `Đơn vị`: read-only theo `masterDrug`
- `Quy cách`: editable, default theo `masterDrug`

Không còn luồng nhập tay `Tên thuốc công ty` hay các trường mô tả khác.

## API And Validation Design

### 1. Nguồn chọn `MasterDrug`

API tìm `masterDrugOptions` cho công ty chỉ trả về `MasterDrug` thỏa:

- có ít nhất một `FacilityDrugMap` với status `APPROVED` hoặc `AUTO_MAPPED`
- match điều kiện search hiện tại

Search tiếp tục hỗ trợ các trường đang dùng:

- mã chung
- tên thuốc
- hoạt chất

### 2. POST/PATCH `CompanyDrug`

Client chỉ được phép gửi:

- `companyDrugCode`
- `masterDrugId`
- `quyCach`
- `isActive`

Backend là nguồn sự thật cho:

- `companyDrugName`
- `activeIngredient`
- `unit`
- `masterDrug` relation

Khi nhận request:

1. validate `masterDrugId` tồn tại
2. validate `MasterDrug` nằm trong tập mapped
3. validate `companyDrugCode` không trùng trong phạm vi công ty
4. đồng bộ các field phụ thuộc từ `MasterDrug`
5. lưu `quyCach` theo input người dùng hoặc fallback `MasterDrug.quyCach`

Nếu request cố gửi/ghi đè các field read-only, backend bỏ qua.

### 3. Validation phản hồi đơn

Trong luồng phản hồi đơn:

- chỉ cho tạo mới `CompanyDrug` khi dòng có `masterDrugId`
- `masterDrugId` của dòng phải nằm trong tập mapped mới cho tạo `CompanyDrug` mới
- nếu không thỏa, backend trả lỗi rõ ràng và không cho tạo thuốc công ty ngoài rule

Các validation cũ vẫn giữ:

- `Mã thuốc công ty` bắt buộc
- `Mã thuốc công ty` không được trùng trong cùng công ty
- nếu chọn `CompanyDrug` đã có sẵn, `masterDrugId` phải khớp với dòng

## Data Flow

### Add/Edit Catalog Item

1. Người dùng mở dialog.
2. Tìm `MasterDrug` trong tập mapped.
3. Chọn `MasterDrug`.
4. UI điền các field read-only từ `MasterDrug`.
5. Người dùng nhập `Mã thuốc công ty`, chỉnh `Quy cách` nếu cần.
6. Client gửi payload tối giản.
7. Backend xác thực lại `MasterDrug` mapped và đồng bộ dữ liệu.
8. Danh sách reload, hiển thị cột mới.

### Create From Pending Catalog Confirmation

1. Người dùng mở phản hồi đơn.
2. Dòng `PENDING_CATALOG_CONFIRMATION` hiển thị danh sách `CompanyDrug` đã map đúng `masterDrugId`.
3. Nếu tạo mới, form chỉ cho nhập `Mã thuốc công ty` và `Quy cách`.
4. Backend tạo `CompanyDrug` từ `masterDrug` của dòng.
5. `DrugOrderLine.companyDrugId` gắn với bản ghi vừa tạo.

## Error Handling

- chưa chọn `MasterDrug`: báo lỗi bắt buộc chọn thuốc chuẩn đã được ánh xạ
- `MasterDrug` không còn mapped tại thời điểm lưu: báo lỗi yêu cầu chọn lại
- trùng `Mã thuốc công ty`: giữ lỗi hiện tại
- dòng phản hồi đơn không có `masterDrugId`: không cho tạo mới `CompanyDrug`
- dòng phản hồi đơn có `masterDrugId` nhưng không còn thuộc tập mapped: không cho tạo mới, người dùng phải chọn thuốc công ty đã tồn tại hoặc từ chối dòng

## Migration Strategy

Migration dữ liệu tối thiểu:

- thêm cột nullable `quyCach` vào bảng `company_drugs`

Backfill:

- không backfill bắt buộc trong migration đầu tiên
- runtime dùng `CompanyDrug.quyCach ?? CompanyDrug.masterDrug.quyCach` để giữ tương thích dữ liệu cũ
- nếu cần dọn dữ liệu sau rollout, có thể chạy script backfill riêng ở pha sau

Không cưỡng bức convert toàn bộ legacy records trong migration vì:

- thiếu cơ sở xác định `MasterDrug` đúng cho các bản ghi không map
- dễ phát sinh gán nhầm dữ liệu

## Testing

### Happy Paths

- tạo mới `CompanyDrug` từ `MasterDrug` mapped thành công
- sửa `Quy cách` thành công
- sửa `Mã thuốc công ty` thành công
- tạo mới từ dialog phản hồi đơn thành công
- bảng danh sách hiển thị đủ `Hoạt chất`, `Hàm lượng`, `Số đăng ký`, `Dạng bào chế`, `Quy cách`

### Guard Rails

- không tạo được `CompanyDrug` nếu chưa chọn `MasterDrug`
- không tạo được từ `MasterDrug` unmapped
- không ghi đè được `Tên thuốc`, `Hoạt chất`, `Hàm lượng`, `Số đăng ký`, `Dạng bào chế`, `Đơn vị` từ client
- không đổi được `masterDrugId` của bản ghi đã tồn tại
- không tạo được `CompanyDrug` mới từ dòng phản hồi đơn nếu `masterDrug` của dòng không mapped

### Legacy Coverage

- bản ghi legacy vẫn hiển thị trong bảng
- bản ghi legacy khi sửa phải được gắn lại vào `MasterDrug` mapped hợp lệ mới lưu được

## Risks

- thay đổi rule dữ liệu có thể làm lộ các bản ghi cũ không còn hợp lệ
- nếu định nghĩa "mapped" thay đổi ở module mappings sau này, nguồn chọn cho công ty cũng sẽ đổi theo
- khóa đổi `MasterDrug` trên bản ghi đã tồn tại sẽ buộc người dùng xóa/tạo lại trong một số ca nhập sai trước đây

## Open Decisions Closed In This Spec

- công ty không được tạo thuốc ngoài danh mục dùng chung
- chỉ được dùng `MasterDrug` đã mapped
- `Mã thuốc công ty` editable
- `Tên thuốc công ty` lấy từ danh mục dùng chung
- chỉ `Quy cách` editable trong nhóm field mô tả thuốc
- 4 trường `Hàm lượng`, `Số đăng ký`, `Dạng bào chế`, `Quy cách` phải hiển thị ở bảng danh sách
