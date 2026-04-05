# Inventory Search View Modes Design

## Context

Trang [`/dashboard/inventory-search`](/opt/sudungthuoc/sudungthuoc/src/app/dashboard/inventory-search/page.tsx) hiện chỉ hỗ trợ một cách xem chính:

- Tra cứu theo thuốc
- Bung từng dòng thuốc để xem các cơ sở đang còn tồn

Cấu trúc này đủ cho nhu cầu tra cứu cơ bản, nhưng chưa bao phủ hai nhu cầu đã được xác nhận:

- Xem tồn kho theo từng cơ sở
- So sánh một thuốc giữa nhiều cơ sở

Ngoài ra, UI hiện tại đang gắn chặt phần render, state và dữ liệu vào một page component và một API route duy nhất, nên nếu tiếp tục mở rộng trực tiếp sẽ nhanh chóng khó bảo trì.

## User-Validated Goals

Các quyết định đã được chốt với người dùng:

- Giữ nguyên một route duy nhất: `/dashboard/inventory-search`
- Thêm `Chế độ xem` trên cùng trang thay vì tách sang các route riêng
- `Theo thuốc` là mode mặc định và là ưu tiên chính
- Cần thêm mode `Theo cơ sở`
- Cần thêm mode `So sánh cơ sở`
- Mode `Theo cơ sở` phải hỗ trợ cả hai cách dùng:
  - Chọn `1 cơ sở` rồi xem các thuốc đang có tại cơ sở đó
  - Gõ từ khóa thuốc để lọc trong cơ sở đã chọn
- Mode `Theo cơ sở` ưu tiên luồng `chọn 1 cơ sở trước`
- Mode `So sánh cơ sở` ưu tiên luồng:
  - Chọn `1 thuốc`
  - So sánh thuốc đó giữa nhiều cơ sở

## Non-Goals

Không bao gồm trong thiết kế này:

- Tách trang thành nhiều route độc lập
- Bổ sung biểu đồ phân tích nâng cao ngoài ma trận so sánh cơ sở
- Thay đổi logic phê duyệt báo cáo hoặc nguồn dữ liệu gốc
- Thay đổi schema Prisma
- Thêm lịch sử tồn kho theo thời gian cho từng thuốc hoặc từng cơ sở

## Current Data Constraints

Theo [`prisma/schema.prisma`](/opt/sudungthuoc/sudungthuoc/prisma/schema.prisma), hệ thống đã có đủ nền dữ liệu cần thiết:

- `User`: lưu thông tin cơ sở, `facilityName`, `facilityCode`, `facilityType`
- `MasterDrug`: danh mục thuốc dùng chung
- `FacilityDrugMap`: ánh xạ thuốc cơ sở sang danh mục chung
- `InventoryReport`: báo cáo tồn kho theo tháng, gồm `tonCuoi`, `giaVat`, `reportMonth`, `status`

API hiện tại tại [`/api/inventory-search`](/opt/sudungthuoc/sudungthuoc/src/app/api/inventory-search/route.ts) đã áp dụng quy tắc dữ liệu cốt lõi:

- Chỉ lấy báo cáo `APPROVED`
- Chỉ lấy dòng có `ton_cuoi > 0`
- Chỉ dùng báo cáo mới nhất cho từng cặp `facility_id + map_id`

Thiết kế mới phải giữ nhất quán quy tắc này trong mọi mode để tránh cùng một dữ liệu nhưng cho ra kết quả khác nhau giữa các cách xem.

## Approach Options

### Option 1: Một toolbar chung, filter ngữ cảnh thay theo mode

- Giữ một khung trang thống nhất
- Thêm segmented control `Theo thuốc`, `Theo cơ sở`, `So sánh cơ sở`
- Giữ bộ lọc chung ở cùng vị trí
- Chỉ thay bộ lọc phụ và phần kết quả theo mode

Ưu điểm:

- Ít phá vỡ trải nghiệm hiện tại nhất
- Người dùng hiểu đây là cùng một công cụ tra cứu
- Dễ thêm mode mới về sau

Nhược điểm:

- Client state có nhiều nhánh điều kiện hơn

### Option 2: Theo thuốc là màn hình chính, hai mode còn lại là drill-down

- Trang mặc định chỉ thiên về tra cứu theo thuốc
- `Theo cơ sở` và `So sánh cơ sở` xuất hiện như hành động phụ từ kết quả

Ưu điểm:

- Thay đổi UI ít nhất

Nhược điểm:

- Không phù hợp với yêu cầu đã xác nhận rằng mode `Theo cơ sở` và `So sánh cơ sở` cũng là nhu cầu trực tiếp

### Option 3: Một route nhưng mỗi mode là một mini-app riêng

- Giữ chung route
- Khi đổi mode thì thay toàn bộ search card và logic điều hướng trong trang

Ưu điểm:

- Mỗi mode có thể được tối ưu sâu

Nhược điểm:

- Dễ làm trang trở nên rời rạc
- Cảm giác như ba màn hình ghép lại hơn là một công cụ thống nhất

## Recommendation

Chọn Option 1.

Lý do:

- Bám sát nhất với thói quen hiện tại của người dùng
- Giữ `Theo thuốc` là trung tâm mà không hạ `Theo cơ sở` và `So sánh cơ sở` xuống thành tính năng phụ
- Cho phép reuse cấu trúc trang hiện tại nhưng vẫn mở rộng được kiến trúc bên dưới

## UX Structure

Trang tiếp tục dùng một route duy nhất với ba vùng chính:

1. Header trang
2. Search card chứa `Chế độ xem` và filter
3. Results card hiển thị kết quả tương ứng với mode đang chọn

### Search Card Layout

Search card nên được tổ chức thành ba hàng:

- Hàng 1: segmented control `Theo thuốc`, `Theo cơ sở`, `So sánh cơ sở`
- Hàng 2: bộ lọc chung và bộ lọc ngữ cảnh của mode hiện tại
- Hàng 3: dòng tóm tắt trạng thái hiện tại, ví dụ:
  - `Đang xem theo thuốc`
  - `Đã chọn Bệnh viện A`
  - `Đang so sánh 3 cơ sở`

### Shared Interaction Rule

Khi đổi mode:

- Giữ lại các filter còn hợp lệ giữa hai mode
- Reset các filter không còn ý nghĩa ở mode mới

Quy tắc này giúp tránh trường hợp người dùng đổi mode nhưng nhận kết quả rỗng do state cũ còn tồn tại mà không nhìn thấy rõ nguyên nhân.

## Detailed Mode Design

### Mode 1: Theo thuốc

Mục tiêu:

- Giữ vai trò là luồng chính của trang

Control chính:

- Ô tìm kiếm với placeholder: `Nhập tên thuốc, hoạt chất, hàm lượng hoặc mã thuốc`

Control phụ:

- Sort theo `Tên thuốc`
- Sort theo `Tổng tồn kho`
- Sort theo `Số cơ sở`

Kết quả:

- Bảng thuốc như hiện tại
- Mỗi dòng là một thuốc
- Có thể bung dòng để xem danh sách cơ sở đang còn tồn

Trường hiển thị chính:

- Mã thuốc
- Tên thuốc
- Hoạt chất
- Hàm lượng
- Đơn vị tính
- Số cơ sở
- Tổng tồn kho

Expanded content:

- Danh sách cơ sở
- Tồn kho
- Giá VAT
- Kỳ báo cáo

### Mode 2: Theo cơ sở

Mục tiêu:

- Trả lời câu hỏi: `Cơ sở này hiện đang có những thuốc nào?`

Control chính:

- Dropdown hoặc combobox chọn `1 cơ sở`

Control phụ:

- Ô lọc thuốc trong cơ sở đã chọn
- Sort theo `Tên thuốc`
- Sort theo `Tồn kho`
- Sort theo `Giá VAT`

Hành vi:

- Khi chưa chọn cơ sở: chỉ hiển thị empty state hướng dẫn chọn cơ sở
- Khi đã chọn cơ sở: hiển thị summary của cơ sở và danh sách thuốc đang còn tồn tại cơ sở đó

Summary khuyến nghị:

- Tên cơ sở
- Mã cơ sở
- Số thuốc đang có tồn
- Tổng lượng tồn

Kết quả:

- Mỗi dòng là một thuốc thuộc cơ sở đã chọn
- Không cần bung danh sách cơ sở vì mode này đã neo vào một cơ sở cụ thể

### Mode 3: So sánh cơ sở

Mục tiêu:

- Trả lời câu hỏi: `Thuốc này đang được giữ và báo cáo như thế nào ở nhiều cơ sở?`

Control chính:

- Chọn `1 thuốc`

Control phụ:

- Chọn nhiều cơ sở

Điều kiện hiển thị:

- Chưa chọn thuốc: hiển thị hướng dẫn chọn thuốc
- Mới chọn dưới 2 cơ sở: hiển thị hướng dẫn chọn ít nhất 2 cơ sở

Kết quả:

- Ma trận so sánh
- Mỗi cột là một cơ sở
- Mỗi hàng là một chỉ số

Chỉ số tối thiểu:

- Tồn kho
- Giá VAT
- Kỳ báo cáo

Highlight khuyến nghị:

- Tồn kho cao nhất
- Giá VAT thấp nhất
- Kỳ báo cáo cũ hơn các cơ sở còn lại

Nếu một cơ sở không có dữ liệu cho thuốc đã chọn:

- Vẫn giữ cột cơ sở đó trong bảng
- Hiển thị `Không có dữ liệu`, thay vì tự loại bỏ hoặc tự quy về `0`

## Data And API Design

Không nên tiếp tục mở rộng theo hướng một page component lớn + một endpoint duy nhất trả nhiều kiểu dữ liệu lẫn lộn.

### API Recommendation

Tách endpoint theo mode:

- `/api/inventory-search/drug`
- `/api/inventory-search/facility`
- `/api/inventory-search/compare`

Ghi chú:

- Các path trên là endpoint mục tiêu của thiết kế
- Endpoint hiện tại đang nằm tại một file chung và cần được tách trong bước triển khai

### Shared Data Rule

Ba endpoint phải dùng chung một lớp logic hoặc service nội bộ để chuẩn hóa bước:

- Lấy báo cáo `APPROVED`
- Giữ dòng có `ton_cuoi > 0`
- Chọn bản ghi mới nhất cho từng cặp `facility_id + map_id`

Phần dùng chung này nên là nền duy nhất cho mọi mode để tránh lệch snapshot dữ liệu.

### Request/Response Shape

#### Drug Mode

Input:

- `query`
- `page`
- `limit`
- `sort`

Output:

- Danh sách thuốc
- Tổng số kết quả
- Phân trang
- Danh sách cơ sở lồng trong từng thuốc

#### Facility Mode

Input:

- `facilityId`
- `query`
- `page`
- `limit`
- `sort`

Output:

- Thông tin cơ sở
- Summary cơ sở
- Danh sách thuốc của cơ sở
- Tổng số kết quả
- Phân trang

#### Compare Mode

Input:

- `masterDrugId` hoặc `maChung`
- `facilityIds[]`

Output:

- Thông tin thuốc
- Danh sách cơ sở được yêu cầu
- Dữ liệu so sánh theo chỉ số

### Key Matching Rule For Comparison

Mode `So sánh cơ sở` phải so khớp theo khóa chuẩn của danh mục chung:

- Ưu tiên `masterDrugId`
- Nếu UI giai đoạn đầu chưa truyền `masterDrugId`, cho phép fallback bằng `maChung`

Không dùng text search thuần làm khóa so sánh cuối cùng, vì tên nội bộ giữa các cơ sở có thể khác nhau và dẫn đến so sánh sai đối tượng.

## Frontend Architecture

Page chính tại [`src/app/dashboard/inventory-search/page.tsx`](/opt/sudungthuoc/sudungthuoc/src/app/dashboard/inventory-search/page.tsx) nên được rút gọn vai trò thành controller của trang.

Đề xuất tách thành các phần:

- `InventorySearchToolbar`
- `DrugResultsView`
- `FacilityResultsView`
- `FacilityComparisonView`

Page chính chỉ giữ:

- `viewMode`
- shared filters
- mode-specific filters
- pagination
- loading state
- error state

Lợi ích:

- Tránh để file page tiếp tục phình to
- Mỗi mode có thể test độc lập
- Dễ thay đổi UI của từng mode mà không ảnh hưởng toàn bộ trang

## Loading, Empty, And Error States

### Theo thuốc

- Nếu không nhập từ khóa, vẫn trả danh sách thuốc theo phân trang như hành vi hiện tại
- Khi không có kết quả: báo không tìm thấy thuốc phù hợp
- Nếu dữ liệu bị loại bởi filter phụ: thông điệp phải nói rõ là do filter

### Theo cơ sở

- Chưa chọn cơ sở: hiện hướng dẫn chọn cơ sở trước
- Chọn cơ sở nhưng không có thuốc tồn: thông điệp theo ngữ cảnh cơ sở
- Có cơ sở nhưng từ khóa lọc không khớp: báo rõ là không có thuốc phù hợp trong cơ sở đã chọn

### So sánh cơ sở

- Chưa chọn thuốc: hướng dẫn chọn thuốc
- Chưa đủ 2 cơ sở: hướng dẫn chọn tối thiểu 2 cơ sở
- Có cơ sở không có dữ liệu: hiển thị rõ trạng thái thiếu dữ liệu
- Kỳ báo cáo lệch nhau: hiển thị rõ để tránh hiểu sai là cùng một thời điểm

## Testing Plan

1. Test contract API cho từng mode với input hợp lệ
2. Test contract API khi thiếu input bắt buộc, nhất là mode `Theo cơ sở` và `So sánh cơ sở`
3. Test UI chuyển mode và reset filter không hợp lệ
4. Test loading, empty state và error state riêng cho từng mode
5. Test pagination và sorting ở mode `Theo thuốc`
6. Test pagination và sorting ở mode `Theo cơ sở`
7. Test mode `So sánh cơ sở` với ít hơn 2 cơ sở
8. Test mode `So sánh cơ sở` khi một cơ sở không có dữ liệu cho thuốc được chọn
9. Test hiển thị cảnh báo khi kỳ báo cáo giữa các cơ sở không đồng nhất

## Risks

- Nếu mỗi mode tự viết lại logic lấy snapshot tồn kho, kết quả sẽ nhanh chóng lệch nhau
- Người dùng có thể hiểu nhầm rằng đang xem lịch sử, trong khi thực tế chỉ là snapshot mới nhất
- Giá VAT có thể bị so sánh sai ngữ cảnh nếu kỳ báo cáo khác nhau mà UI không cảnh báo
- Nếu không tách component sớm, file page hiện tại sẽ trở nên khó bảo trì và khó test

## Implementation Direction

Trong bước triển khai sau này:

- Ưu tiên tách data layer trước khi mở rộng UI
- Chuẩn hóa contract dữ liệu cho từng mode
- Giữ `Theo thuốc` ổn định trong khi thêm hai mode còn lại
- Chỉ bổ sung sort/filter ở mức cần thiết, tránh biến đợt đầu thành một màn hình phân tích quá nặng
