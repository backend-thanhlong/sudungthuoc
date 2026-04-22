# Thiết kế: Danh mục nhóm điều trị chuẩn cho `/dashboard/admin/master-drugs`

## Bối cảnh

Trang `/dashboard/admin/master-drugs` hiện đang lưu `Nhóm điều trị` trực tiếp bằng string trong `MasterDrug` qua field `nhomDieuTri`.

Mô hình này không còn phù hợp vì:

- người dùng cần chọn 1 giá trị trong khoảng 80 nhóm điều trị
- danh sách này còn phát sinh thêm theo thời gian
- dữ liệu text tự do dễ bị trùng nghĩa, sai chính tả, lệch chuẩn
- hệ thống chưa có nơi riêng để admin quản trị danh mục `Nhóm điều trị`

Người dùng đã chốt các yêu cầu nghiệp vụ sau:

- không backfill dữ liệu `Nhóm điều trị` hiện có
- xóa bỏ field/cột `nhomDieuTri` cũ
- `Nhóm điều trị` phải trở thành một danh mục riêng có trang quản trị cho admin
- trên form thuốc, người dùng phải chọn nhanh được từ danh mục chuẩn
- khi phát sinh nhóm mới, admin có thể tạo mới và giá trị đó trở thành lựa chọn cho các lần nhập sau

## Mục tiêu

Thiết kế lại `Nhóm điều trị` theo mô hình danh mục chuẩn, gồm:

- `MasterDrug` tham chiếu tới một danh mục `Nhóm điều trị` riêng
- admin có trang quản trị danh mục trong dropdown `Cài đặt`
- form thêm/sửa thuốc dùng control `tìm kiếm + chọn + tạo mới`
- import/export Excel tiếp tục làm việc theo tên nhóm điều trị
- loại bỏ hoàn toàn cột string `nhomDieuTri` cũ khỏi schema

## Phạm vi

Bao gồm:

- thay đổi schema Prisma để tách danh mục `Nhóm điều trị`
- migration xóa dữ liệu `Nhóm điều trị` cũ và bỏ cột cũ
- cập nhật API `master-drugs` sang dùng `therapeuticGroupId`
- thêm API CRUD cho danh mục `Nhóm điều trị`
- thêm trang admin quản trị danh mục `Nhóm điều trị`
- thêm mục điều hướng trong dropdown `Cài đặt`
- thay control nhập `Nhóm điều trị` trên form thuốc
- cập nhật import/export/template Excel theo mô hình mới

Không bao gồm:

- backfill dữ liệu `nhomDieuTri` cũ sang danh mục mới
- thay đổi logic ánh xạ thuốc của cơ sở
- thay đổi các field phân loại khác như `nhomThuoc`, `isKeDon`, `isTrongNuoc`
- thêm phân quyền mới ngoài phạm vi admin hiện có

## Phương án

### Phương án 1: Danh mục riêng, `MasterDrug` lưu khóa ngoại

Tạo bảng danh mục `TherapeuticGroup`, cho `MasterDrug` lưu `therapeuticGroupId`, và hiển thị tên nhóm điều trị thông qua relation.

Ưu điểm:

- dữ liệu chuẩn hóa và nhất quán
- tránh trùng/lệch tên giữa các bản ghi thuốc
- đổi tên nhóm điều trị ở một nơi và áp dụng toàn hệ thống
- mở rộng tốt cho tìm kiếm, lọc, thống kê sau này
- đáp ứng đúng yêu cầu cần có trang quản trị danh mục riêng

Nhược điểm:

- cần migration schema và cập nhật API/UI/import/export

### Phương án 2: Danh mục riêng nhưng `MasterDrug` vẫn lưu text

Ưu điểm:

- thay đổi nhanh hơn trong ngắn hạn

Nhược điểm:

- không ép chuẩn dữ liệu thật sự
- danh mục chỉ mang tính gợi ý
- dễ phát sinh chênh lệch giữa danh mục và dữ liệu thuốc

### Phương án 3: Chỉ auto-suggest từ dữ liệu đã nhập

Ưu điểm:

- nhanh nhất để triển khai

Nhược điểm:

- không có quản trị tập trung
- dữ liệu sẽ nhanh chóng bẩn và trùng lặp
- không đáp ứng yêu cầu quản trị danh mục riêng

### Khuyến nghị

Chọn Phương án 1.

Đây là hướng duy nhất đáp ứng đầy đủ cả yêu cầu UX lẫn yêu cầu quản trị dữ liệu dài hạn.

## Thiết kế dữ liệu

### Schema mới

Thêm model `TherapeuticGroup` trong Prisma với các field:

- `id`
- `name`
- `normalizedName`
- `isActive`
- `createdAt`
- `updatedAt`

Quy ước:

- `name` là tên hiển thị chính thức
- `normalizedName` là khóa chuẩn hóa để chống trùng
- `isActive` dùng để ẩn/kích hoạt lại mà không làm mất liên kết dữ liệu cũ

`MasterDrug` sẽ:

- bỏ field `nhomDieuTri`
- thêm `therapeuticGroupId String?`
- thêm relation `therapeuticGroup`

### Chuẩn hóa tên

`normalizedName` dùng để phát hiện các trường hợp trùng logic như:

- khác hoa thường
- thừa khoảng trắng đầu/cuối hoặc nhiều khoảng trắng liên tiếp
- khác biệt không đáng kể do nhập liệu thủ công

Thiết kế này yêu cầu backend chuẩn hóa tên trước khi create/update danh mục để tránh tạo nhóm điều trị trùng.

## Migration

Migration được chốt theo đúng yêu cầu nghiệp vụ:

1. Tạo bảng `therapeutic_groups`.
2. Thêm cột `therapeutic_group_id` nullable vào `master_drugs`.
3. Tạo khóa ngoại từ `master_drugs.therapeutic_group_id` sang `therapeutic_groups.id` với hành vi `ON DELETE SET NULL`.
4. Xóa toàn bộ dữ liệu hiện có của `Nhóm điều trị` bằng cách không backfill.
5. Bỏ hẳn cột `master_drugs.nhom_dieu_tri`.

Hệ quả:

- mọi thuốc hiện tại sẽ không còn giá trị `Nhóm điều trị` sau migration
- admin sẽ chọn lại từ danh mục mới khi cần
- sau cutover, toàn hệ thống chỉ đọc từ relation mới

## Điều hướng admin

File tác động chính: `src/components/DashboardLayout.tsx`

Trong dropdown `Cài đặt`, thêm mục mới:

- `Danh mục nhóm điều trị`

Route trang quản trị:

- `/dashboard/admin/therapeutic-groups`

Mục này chỉ hiển thị cho admin, bám đúng nhóm điều hướng `Cài đặt` hiện tại.

## Trang quản trị danh mục nhóm điều trị

File tác động chính:

- `src/app/dashboard/admin/therapeutic-groups/page.tsx`

Trang quản trị dùng pattern CRUD admin đang có trong hệ thống, tập trung vào các thao tác:

- tìm kiếm
- thêm mới
- sửa tên
- ẩn
- kích hoạt lại

### Bố cục

Trang gồm hai phần chính:

- khối form thêm/sửa nhanh
- bảng danh sách nhóm điều trị

### Dữ liệu hiển thị trong bảng

Các cột nên có:

- `Tên nhóm điều trị`
- `Trạng thái`
- `Số thuốc đang dùng`
- `Cập nhật lần cuối`
- `Thao tác`

### Thao tác quản trị

- `Thêm`: tạo nhóm mới
- `Sửa`: đổi tên hiển thị
- `Ẩn`: chuyển `isActive = false`
- `Kích hoạt lại`: chuyển `isActive = true`

Không triển khai xóa cứng ở đợt đầu cho luồng thao tác chính.

Nếu cần endpoint xóa, backend chỉ được cho xóa khi `drugCount = 0`. Trên UI quản trị chính vẫn ưu tiên `Ẩn` để giảm rủi ro làm rỗng dữ liệu đang tham chiếu.

## Form `/dashboard/admin/master-drugs`

File tác động chính:

- `src/app/dashboard/admin/master-drugs/page.tsx`

### Thay đổi dữ liệu form

Bỏ `formData.nhomDieuTri`, thay bằng:

- `therapeuticGroupId`
- trường text tạm cho phần tìm kiếm UI nếu cần

Khi edit một thuốc:

- form nạp `therapeuticGroupId` hiện có
- UI hiển thị `therapeuticGroup.name`

### Control chọn nhóm điều trị

Không dùng `Select` thường vì danh sách khoảng 80 giá trị và còn tăng thêm.

Control phù hợp là `tìm kiếm + chọn + tạo mới`, với hành vi:

- người dùng gõ để lọc danh sách nhóm điều trị
- danh sách gợi ý chỉ hiện các nhóm đang active
- khi chọn một item, form lưu `therapeuticGroupId`
- nếu không có kết quả phù hợp, hiển thị action `Tạo nhóm điều trị mới`
- tạo xong, nhóm mới được chọn ngay cho thuốc đang thao tác

### Trường hợp sửa thuốc đang gắn nhóm đã bị ẩn

Khi mở bản ghi cũ:

- nếu thuốc đang gắn một nhóm inactive, UI vẫn phải hiển thị giá trị hiện tại
- danh sách tìm kiếm mặc định không cần hiển thị toàn bộ nhóm inactive
- nếu người dùng đổi sang nhóm khác thì có thể không quay lại chọn nhóm inactive từ danh sách mặc định

Thiết kế này giữ khả năng xem/sửa dữ liệu cũ mà không làm rối luồng chọn mới.

## Tạo mới nhóm điều trị từ form thuốc

Khi người dùng không tìm thấy kết quả phù hợp, form thuốc cho phép tạo nhóm mới ngay tại chỗ.

Hành vi backend:

- nếu tên sau normalize chưa tồn tại, tạo mới và trả bản ghi vừa tạo
- nếu tên sau normalize đã tồn tại nhưng đang inactive, kích hoạt lại rồi trả bản ghi đó
- nếu tên sau normalize đã tồn tại và đang active, không tạo trùng; trả lại bản ghi hiện có để UI chọn ngay

Thiết kế này loại bỏ việc tạo trùng và giảm friction khi vận hành.

## API danh mục nhóm điều trị

Thêm các endpoint mới:

- `GET /api/admin/therapeutic-groups`
- `POST /api/admin/therapeutic-groups`
- `PATCH /api/admin/therapeutic-groups/[id]`
- `DELETE /api/admin/therapeutic-groups/[id]`

### `GET /api/admin/therapeutic-groups`

Trả danh sách nhóm điều trị cho:

- trang quản trị danh mục
- control tìm kiếm/chọn ở form thuốc

Payload nên hỗ trợ:

- `id`
- `name`
- `isActive`
- `drugCount`
- `updatedAt`

Có thể nhận query cho:

- search theo tên
- filter trạng thái active/inactive
- giới hạn số kết quả khi dùng trong ô tìm kiếm

### `POST /api/admin/therapeutic-groups`

Nhận `name`, chuẩn hóa, rồi:

- tạo mới nếu chưa tồn tại
- kích hoạt lại nếu đang inactive
- trả lại bản ghi cũ nếu đã tồn tại active

### `PATCH /api/admin/therapeutic-groups/[id]`

Hỗ trợ:

- đổi `name`
- đổi `isActive`

Khi đổi tên:

- phải kiểm tra trùng `normalizedName`
- không cho đổi thành tên trùng với một nhóm khác

### `DELETE /api/admin/therapeutic-groups/[id]`

Chỉ cho phép xóa khi không có `MasterDrug` nào đang tham chiếu.

Nếu đang có thuốc dùng:

- trả lỗi nghiệp vụ rõ ràng
- UI khuyến nghị dùng `Ẩn` thay vì xóa

## API `master-drugs`

Files tác động chính:

- `src/app/api/admin/master-drugs/route.ts`
- `src/app/api/admin/master-drugs/[id]/route.ts`
- `src/app/api/admin/master-drugs/import/route.ts`
- `src/app/api/admin/master-drugs/export-mapped/route.ts`

### List API

`GET /api/admin/master-drugs` cần `include` relation `therapeuticGroup` để frontend hiển thị:

- `therapeuticGroupId`
- `therapeuticGroup.name`

Các API list không còn đọc field string `nhomDieuTri`.

### Create/Update API

`POST` và `PATCH` nhận `therapeuticGroupId` thay cho `nhomDieuTri`.

Quy ước:

- nếu không chọn thì lưu `null`
- nếu có chọn thì lưu khóa ngoại hợp lệ

`PATCH` không nên tiếp tục `data: body` hoàn toàn thô nếu body chứa field UI phụ; cần lọc payload theo schema mới để tránh ghi nhầm.

## Hiển thị danh sách thuốc

Trong bảng `/dashboard/admin/master-drugs`, cột `Nhóm điều trị` tiếp tục tồn tại nhưng giá trị hiển thị sẽ lấy từ:

- `drug.therapeuticGroup?.name`

Nếu không có nhóm điều trị:

- hiển thị `-`

## Import Excel

File tác động chính:

- `src/app/api/admin/master-drugs/import/route.ts`
- `src/app/dashboard/admin/master-drugs/page.tsx`

### Mapping nhập liệu

Excel vẫn dùng cột tên người dùng quen thuộc:

- `Nhóm điều trị`

Backend import sẽ:

- đọc text tên nhóm điều trị từ file
- chuẩn hóa tên
- tìm trong danh mục hiện có
- nếu chưa tồn tại thì tự tạo nhóm điều trị mới
- lấy `id` tương ứng để gắn vào `MasterDrug`

### Thống kê import

Kết quả import nên trả thêm thông tin:

- số thuốc import thành công
- số bản ghi bị bỏ qua/lỗi
- số nhóm điều trị mới được tạo trong quá trình import

Điều này giúp admin kiểm soát việc danh mục bị mở rộng từ file Excel.

## Export Excel và file mẫu

### File mẫu

File mẫu tải từ `/dashboard/admin/master-drugs` tiếp tục có cột:

- `Nhóm điều trị`

Giá trị ví dụ nên dùng một tên thuộc danh mục chuẩn mới.

### Export mapped

`GET /api/admin/master-drugs/export-mapped` tiếp tục xuất cột:

- `Nhóm điều trị`

Giá trị xuất ra là:

- `therapeuticGroup.name`

Không xuất `therapeuticGroupId`.

## Phân quyền

- chỉ admin được CRUD danh mục `Nhóm điều trị`
- facility user không có route quản trị danh mục này
- nếu facility user được xem `master-drugs` ở chế độ read-only như hiện tại, họ chỉ thấy tên `Nhóm điều trị`, không có quyền tạo/sửa danh mục

## Xử lý lỗi

- tạo/sửa tên trùng: trả lỗi rõ ràng hoặc trả bản ghi hiện có theo đúng luồng create đã chốt
- xóa nhóm đang có thuốc dùng: trả lỗi nghiệp vụ, không xóa
- submit thuốc với `therapeuticGroupId` không hợp lệ: trả `400`
- import gặp tên rỗng ở cột `Nhóm điều trị`: coi là không chọn nhóm điều trị
- nhóm inactive vẫn gắn ở thuốc cũ: cho phép hiển thị bình thường

## Kiểm thử thủ công

1. Mở `/dashboard/admin/master-drugs`, xác nhận trường `Nhóm điều trị` không còn là ô nhập text.
2. Gõ từ khóa vào trường `Nhóm điều trị`, xác nhận danh sách được lọc để chọn nhanh.
3. Tạo một nhóm điều trị mới ngay từ form thuốc, xác nhận nhóm được chọn ngay và xuất hiện cho các lần nhập sau.
4. Mở `/dashboard/admin/therapeutic-groups`, xác nhận nhóm vừa tạo xuất hiện trong danh mục.
5. Sửa tên một nhóm điều trị trong trang quản trị, xác nhận bảng danh sách thuốc hiển thị tên mới.
6. Ẩn một nhóm điều trị, xác nhận nhóm đó không còn xuất hiện trong danh sách chọn mới.
7. Mở một thuốc đang gắn nhóm đã bị ẩn, xác nhận form vẫn hiển thị đúng giá trị hiện tại.
8. Import Excel với cột `Nhóm điều trị` chứa giá trị chưa có trong danh mục, xác nhận hệ thống tự tạo nhóm mới và import thành công.
9. Xuất file mapped, xác nhận cột `Nhóm điều trị` chứa tên nhóm từ danh mục mới.
10. Kiểm tra DB sau migration, xác nhận cột `nhom_dieu_tri` cũ không còn tồn tại.

## Rủi ro và lưu ý triển khai

- việc bỏ cột `nhomDieuTri` ngay trong cùng đợt triển khai yêu cầu toàn bộ code đọc/ghi field cũ phải được cập nhật đồng thời
- vì repo hiện chưa có sẵn component `combobox/autocomplete`, cần bổ sung control UI mới hoặc tự xây một control phù hợp thay vì cố ép dùng `Select`
- route update thuốc hiện tại đang nhận body khá thô; khi đổi sang relation mới nên siết lại payload để giảm lỗi ghi sai field

## Khuyến nghị triển khai

Triển khai theo một đợt thống nhất:

1. thêm schema mới và migration bỏ cột cũ
2. thêm API danh mục `Nhóm điều trị`
3. cập nhật UI quản trị danh mục
4. cập nhật form và list `master-drugs`
5. cập nhật import/export/template Excel
6. chạy kiểm thử thủ công toàn luồng trước khi phát hành
