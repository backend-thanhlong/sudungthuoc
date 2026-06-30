# Facility Dashboard Overview Layout Design

## Context

Trang `/dashboard/facility` dùng `FacilityDashboardShell`, tab `Tong quan` render qua `Tab1Overview`.
Component này đang dùng chung với admin dashboard, nên nhiều biểu đồ vẫn mang tư duy so sánh nhiều cơ sở:

- `Top 10 CSYT ton kho lon nhat`
- `Top 10 co so gia tri Xuat lon nhat`
- `Top 10 co so gia tri Nhap lon nhat`
- `Phan bo ton kho theo dia ban`

Với facility dashboard, người dùng chỉ xem 01 đơn vị của chính tài khoản đang đăng nhập. Các biểu đồ xếp hạng theo cơ sở vì vậy trở thành biểu đồ một dòng hoặc một node, chiếm nhiều không gian nhưng không thêm nhiều giá trị phân tích.

## Goal

Sắp xếp lại tab `Tong quan` của `/dashboard/facility` để đọc như dashboard vận hành của một đơn vị:

- tổng hợp nhanh chỉ số chính
- nhấn mạnh dòng tiền hàng `Nhap - Xuat - Ton`
- thể hiện cơ cấu tồn kho, nhập, xuất theo nhóm thuốc
- dùng tiêu đề đúng ngữ cảnh 01 đơn vị
- giảm khoảng trống và scroll ngang không cần thiết
- không làm thay đổi trải nghiệm hiện có của admin dashboard

## Scope

Bao gồm:

- thêm layout riêng cho `Tab1Overview` khi `isFacilityDashboard = true`
- đổi thứ tự và tiêu đề các khối biểu đồ trong tab `Tong quan` facility
- tái sử dụng dữ liệu hiện có từ `GET /api/facility/dashboard/overview`
- điều chỉnh chiều cao, width, margin biểu đồ cho ngữ cảnh một đơn vị
- đổi bảng cuối trang từ nghĩa `dia ban` sang nghĩa `nhom thuoc`

Không bao gồm:

- thay đổi route hoặc auth của dashboard facility
- thay đổi dashboard admin
- đổi công thức KPI
- thêm API mới
- thêm filter mới ngoài `Ky bao cao`
- thay đổi dữ liệu nhập/xuất/tồn trong database

## Chosen Approach

Chọn phương án `Dashboard theo câu chuyện vận hành của 01 đơn vị`.

Luồng hiển thị:

1. KPI cards
2. Biểu đồ chính full-width: `Gia tri Nhap - Xuat - Ton`
3. Hàng 2 cột: `Co cau ton kho theo nhom thuoc` và `BHYT vs Dich vu`
4. Hàng 2 cột: `Co cau gia tri xuat theo nhom thuoc` và `Co cau gia tri nhap theo nhom thuoc`
5. Bảng/ranking cuối: `Chi tiet ton kho theo nhom thuoc`

Lý do:

- người dùng facility không cần so sánh với cơ sở khác trên trang này
- biểu đồ `Nhap - Xuat - Ton` là góc nhìn vận hành quan trọng nhất, nên đặt ngay dưới KPI
- nhóm thuốc là chiều phân tích chính còn lại trong payload facility hiện tại
- bố cục này tận dụng dữ liệu sẵn có, ít rủi ro backend

## UI Design

### 1. KPI Cards

Giữ khu vực KPI trên cùng:

- `Tong gia tri ton kho`
- `Ty le thuoc noi`
- `So mat hang quan ly`

Không đổi dữ liệu hoặc công thức. Chỉ giữ nhãn phụ theo ngữ cảnh `Don vi hien tai`.

### 2. Primary Chart: Nhap - Xuat - Ton

Đặt full-width ngay dưới KPI.

Tiêu đề:

- `Gia tri Nhap - Xuat - Ton`

Subtitle:

- `Tong gia tri nhap, xuat va ton kho cua don vi trong ky da chon`

Hiển thị:

- dùng bar chart 3 cột: `Gia tri nhap`, `Gia tri xuat`, `Gia tri ton`
- không dùng scroll ngang với facility
- không cần trục X hiển thị tên đơn vị dài
- chiều cao khoảng `300-340px`

### 3. Inventory Composition + Insurance Mix

Hàng 2 cột trên desktop, xếp dọc trên mobile.

Card trái:

- tiêu đề `Co cau ton kho theo nhom thuoc`
- dùng `heatmapData` vì facility API đang trả danh sách nhóm thuốc và giá trị tồn kho tại đây
- dùng horizontal bar/ranking theo nhóm thuốc, sắp xếp giảm dần theo giá trị
- không dùng chữ `Top 10 CSYT`
- ưu tiên nhãn nhóm thuốc và tooltip tiền

Card phải:

- giữ `BHYT vs Dich vu`
- subtitle `Ty le gia tri su dung`
- giữ donut chart hiện tại

### 4. Export + Import Composition

Hàng 2 cột trên desktop, xếp dọc trên mobile.

Card trái:

- tiêu đề `Co cau gia tri xuat theo nhom thuoc`
- dùng dữ liệu `topExportByFacility` nhưng đọc như dữ liệu của một đơn vị
- flatten object đầu tiên, bỏ các key `facility` và `total`, các key còn lại là nhóm thuốc
- không hiển thị tiêu đề `Top 10 co so`
- dùng horizontal bar/ranking theo nhóm thuốc, sắp xếp giảm dần theo giá trị

Card phải:

- tiêu đề `Co cau gia tri nhap theo nhom thuoc`
- dùng dữ liệu `topImportTreemap`
- flatten node con của `topImportTreemap` thành danh sách nhóm thuốc
- dùng horizontal bar/ranking theo nhóm thuốc, không dùng treemap trong facility layout

### 5. Detail Table

Đổi khối cuối từ:

- `Phan bo ton kho theo dia ban`

thành:

- `Chi tiet ton kho theo nhom thuoc`

Subtitle:

- `Sap xep theo gia tri ton kho giam dan`

Dữ liệu vẫn lấy từ `heatmapData`, vì facility API hiện đang trả `heatmapData` là danh sách nhóm thuốc và giá trị tồn kho.

Các nhãn cột đổi theo ngữ cảnh:

- `STT`
- `Nhom thuoc`
- `Gia tri ton kho`
- `Ty trong`

## Data Flow

1. User mở `/dashboard/facility`.
2. `FacilityDashboardShell` truyền `apiPrefix="/api/facility/dashboard"` vào `Tab1Overview`.
3. `Tab1Overview` xác định `isFacilityDashboard = true`.
4. Component gọi `GET /api/facility/dashboard/overview` như hiện tại.
5. Nếu là facility, component render nhánh layout facility riêng.
6. Nếu là admin/public, component giữ layout hiện có.

Thiết kế này không tăng số lượng request.

## Edge Cases

- Nếu không có dữ liệu nhập/xuất/tồn: card biểu đồ hiển thị `Khong co du lieu`.
- Nếu nhóm thuốc trống hoặc không map được: backend hiện gom về `Khac`; UI hiển thị `Khac`.
- Nếu chỉ có một nhóm thuốc: chart vẫn hiển thị được, không ép layout nhiều cột.
- Nếu tên nhóm thuốc dài: dùng tooltip và truncate nhẹ trên trục/label.
- Nếu `topImportTreemap` không có node con: card nhập hiển thị `Khong co du lieu`.
- Nếu `BHYT vs Dich vu` đều bằng 0: card hiển thị `Khong co du lieu`.

## Compatibility

- Admin dashboard không đổi bố cục.
- API response không cần đổi contract.
- Không đổi kiểu dữ liệu TypeScript công khai ngoài component nếu không cần.
- Không đổi chart color provider hoặc cấu hình màu.

## Testing

Kiểm tra tối thiểu:

- `npm run lint`
- mở `/dashboard/facility`, tab `Tong quan`, chọn `Tat ca cac ky`
- chọn một kỳ báo cáo cụ thể
- xác nhận không còn tiêu đề `Top 10 CSYT...` trong facility overview
- xác nhận admin overview vẫn giữ layout hiện tại
- kiểm tra responsive desktop và mobile để chart không scroll ngang vô lý hoặc chồng chữ
