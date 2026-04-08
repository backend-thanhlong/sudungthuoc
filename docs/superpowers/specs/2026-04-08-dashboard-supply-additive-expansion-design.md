# Dashboard Supply Additive Expansion Design

## Summary

Spec này mô tả hướng mở rộng tab `Cung ứng` theo nguyên tắc additive:

- giữ nguyên các block `Cung ứng` hiện tại
- bổ sung lớp dashboard điều hành mới cho `admin`
- tái sử dụng lõi tính toán cho `facility`, nhưng chỉ hiện những block có ý nghĩa trong phạm vi một cơ sở

Spec này không thay thế thiết kế đã chốt cho:

- [2026-04-08-dashboard-supply-stockout-risk-design.md](/opt/sudungthuoc/sudungthuoc/docs/superpowers/specs/2026-04-08-dashboard-supply-stockout-risk-design.md)

Nó là lớp phát triển tiếp theo sau khi tab `Cung ứng` đã có:

- `Đã hết hàng cuối kỳ`
- `Nguy cơ đứt gãy`
- `Ma trận nhu cầu/độ phủ tồn kho`
- `Gợi ý điều chuyển`

## Goals

1. Giữ nguyên trải nghiệm hiện tại của tab `Cung ứng`, không thay block cũ.
2. Bổ sung khả năng điều hành cung ứng ở mức toàn hệ thống cho `admin`.
3. Bổ sung các khối phân tích có giá trị trực tiếp cho `facility` mà không tạo cảm giác dashboard quá nặng.
4. Tận dụng dữ liệu thật đang có trong `inventory_reports` trước, không phụ thuộc sớm vào các bảng có độ phủ thấp hơn.
5. Thiết kế phải bám độ phủ dữ liệu thật và degrade an toàn khi dữ liệu thiếu.

## Non-Goals

- Không thay thế hoặc loại bỏ các block hiện có trong tab `Cung ứng`.
- Không biến tab `Cung ứng` thành một màn mua sắm độc lập.
- Không lấy `ke_hoach_lcnt`, `thong_bao_moi_thau`, `ket_qua_lcnt` làm lõi chính của dashboard cung ứng trong giai đoạn đầu.
- Không xây các drilldown nặng theo `nhom_dieu_tri` hoặc `nhom_thuoc` khi độ phủ danh mục còn thấp.

## Current Data Reality

Thiết kế phải dựa trên dữ liệu thật hiện có trong hệ thống:

- `inventory_reports`: khoảng `2719` dòng.
- `report_month`: hiện có `3` kỳ dữ liệu là `01/2026`, `02/2026`, `03/2026`.
- `facility` có báo cáo tồn kho: hiện có `3` cơ sở phát sinh dữ liệu trong `inventory_reports`.
- `facility_drug_maps`: khoảng `7022` map, trong đó `7010` đã nối `master_drugs`.
- `inventory_reports` có độ phủ rất tốt cho các trường phục vụ cung ứng:
  - `gia_vat`: có dữ liệu gần như toàn bộ dòng.
  - `thanh_tien_ton_cuoi`: có dữ liệu ở phần lớn dòng.
  - `so_qd_trung_thau`, `ten_cong_ty`, `ngay_bat_dau_hd`, `ngay_ket_thuc_hd`: có dữ liệu ở gần như toàn bộ dòng báo cáo hiện có.
  - `bhyt`: độ phủ cao.
- `master_drugs` có độ phủ tốt cho `hoat_chat`, nhưng thấp hơn rõ rệt ở:
  - `nhom_thuoc`
  - `nhom_dieu_tri`
  - `is_trong_nuoc`
  - `kiem_soat_dac_biet`
- Dữ liệu mua sắm trong `ke_hoach_lcnt`, `goi_thau`, `thong_bao_moi_thau`, `ket_qua_lcnt` đã có nhưng mới phủ ở một số cơ sở.

Kết luận từ dữ liệu:

- lõi của dashboard `Cung ứng` nên tiếp tục đặt trên `inventory_reports`
- có thể khai thác sâu thêm `giá trị tồn`, `giá trị xuất`, `nhà cung cấp`, `hợp đồng`
- chưa nên lấy phân loại điều trị hoặc dữ liệu LCNT làm trung tâm của dashboard

## User Roles

### Admin

`Admin` là đối tượng ưu tiên chính của đợt mở rộng này.

Mục tiêu sử dụng:

- nhìn sức khỏe cung ứng toàn hệ thống
- phát hiện nơi dư, nơi thiếu, nơi bị giam vốn
- theo dõi rủi ro hợp đồng sắp hết
- nhìn mức độ phụ thuộc nhà cung cấp
- nhận diện cơ sở nào đang thiếu dữ liệu báo cáo

### Facility

`Facility` dùng lại cùng lõi tính toán, nhưng chỉ cần các phân tích trong phạm vi cơ sở của mình.

Mục tiêu sử dụng:

- biết thuốc nào sắp thiếu
- biết thuốc nào đang tồn bất hợp lý
- biết hợp đồng nào sắp hết
- biết nhóm thuốc nào cần mua bổ sung sớm

## Existing Supply Blocks To Preserve

Các block hiện có phải được giữ nguyên:

- `Đã hết hàng cuối kỳ`
- `Nguy cơ đứt gãy`
- `Ma trận nhu cầu/độ phủ tồn kho`
- `Gợi ý điều chuyển`

Các block này vẫn là trung tâm vận hành trực tiếp của tab `Cung ứng`.

Mọi phần mở rộng trong spec này đều additive.

## Additive Information Architecture

### Shared Top Section

Đầu tab `Cung ứng` sẽ bổ sung một dải KPI tổng quan dùng chung cho cả `admin` và `facility`.

KPI đề xuất:

- `Giá trị tồn cuối`
- `Giá trị xuất`
- `Số thuốc hết hàng`
- `Số thuốc dưới 1 tháng`
- `Số thuốc tồn không nhu cầu`
- `Số thuốc hợp đồng sắp hết`

### Core Supply Section

Giữ nguyên toàn bộ khối `Cung ứng` hiện tại:

- `Đã hết hàng cuối kỳ`
- `Nguy cơ đứt gãy`
- `Ma trận nhu cầu/độ phủ tồn kho`
- `Gợi ý điều chuyển`

### Admin Expansion Section

Block mới chỉ dành cho `admin`:

- `Top tồn giá trị cao nhưng độ phủ lớn`
- `Top thuốc nguy cơ thiếu theo giá trị`
- `Rủi ro hợp đồng sắp hết`
- `Phụ thuộc nhà cung cấp`
- `Điều phối liên cơ sở`
- `Độ phủ dữ liệu báo cáo`

### Facility Expansion Section

Block mới dành cho `facility`:

- `Top tồn giá trị cao`
- `Thuốc sắp hết hợp đồng`
- `Cơ cấu nhà cung cấp của cơ sở`
- `Danh sách thuốc cần ưu tiên mua bổ sung`

Các khối liên-cơ-sở không được hiện ở `facility`.

Quy ước:

- `Top tồn giá trị cao` ở facility tái dùng cùng logic với `Top tồn giá trị cao nhưng độ phủ lớn`, nhưng chỉ trong phạm vi cơ sở đang đăng nhập
- `Danh sách thuốc cần ưu tiên mua bổ sung` ở facility tái dùng cùng logic với `Top thuốc nguy cơ thiếu theo giá trị`, nhưng chỉ trong phạm vi cơ sở đang đăng nhập

## Calculation Design

### Time Context

Mọi block mới phải dùng chung logic thời gian với phần `Cung ứng` hiện tại:

- nếu người dùng chọn một `reportMonth` cụ thể thì dùng đúng kỳ đó
- nếu người dùng để `Tất cả các kỳ` thì quy về `effectiveReportMonth` là kỳ mới nhất trong phạm vi lọc

Khi block mới phụ thuộc nhu cầu sử dụng, phải tái dùng cùng `demandWindow` hiện có:

- `1 kỳ gần nhất`
- `TB 3 kỳ gần nhất`
- `TB 6 kỳ gần nhất`

### KPI Band

#### Giá trị tồn cuối

`endingInventoryValue = SUM(thanhTienTonCuoi)` trên snapshot của `effectiveReportMonth`

#### Giá trị xuất

`exportValue = SUM(xuat * giaVat)` trên snapshot của `effectiveReportMonth`

#### Số thuốc hết hàng

Số dòng có:

- `tonCuoi = 0`
- `demandAvg > 0`

#### Số thuốc dưới 1 tháng

Số dòng có:

- `0 < monthsOfCover < 1`

#### Số thuốc tồn không nhu cầu

Số dòng có:

- `tonCuoi > 0`
- `demandAvg = 0`

#### Số thuốc hợp đồng sắp hết

Số dòng có:

- `ngayKetThucHd` nằm trong một cửa sổ xác định
- `demandAvg > 0`

Khuyến nghị support ba bucket:

- `<= 30 ngày`
- `31-60 ngày`
- `61-90 ngày`

### Top Tồn Giá Trị Cao Nhưng Độ Phủ Lớn

Điều kiện:

- `thanhTienTonCuoi > 0`
- `monthsOfCover >= 3`

Sort:

- giảm dần theo `thanhTienTonCuoi`

Mục tiêu:

- phát hiện thuốc đang giam vốn lớn, không chỉ giam số lượng

### Top Thuốc Nguy Cơ Thiếu Theo Giá Trị

Điều kiện:

- `demandAvg > 0`
- `monthsOfCover < 1`

Chỉ số ưu tiên:

- `riskValue = demandAvg * giaVat`

Sort:

- giảm dần theo `riskValue`

Mục tiêu:

- admin nhìn được thiếu hàng nào đáng lo nhất về giá trị

### Rủi Ro Hợp Đồng Sắp Hết

Sử dụng:

- `ngayKetThucHd`
- `ngayBatDauHd`
- `tenCongTy`
- `soQdTrungThau`

Bucket:

- `Đã hết hạn`
- `<= 30 ngày`
- `31-60 ngày`
- `61-90 ngày`

Chỉ hiện các dòng còn nhu cầu:

- `demandAvg > 0`

Hiển thị:

- `admin`: có cột `cơ sở`
- `facility`: bỏ cột `cơ sở`, thêm note `cần theo dõi mua bổ sung`

### Phụ Thuộc Nhà Cung Cấp

Gom theo `tenCongTy`.

Mỗi nhà cung cấp nên có:

- số thuốc đang có nhu cầu
- tổng `thanhTienTonCuoi`
- tổng `riskValue`
- số thuốc có hợp đồng sắp hết

Mục tiêu:

- admin nhìn được nhà cung cấp nào đang chi phối rủi ro cung ứng

### Điều Phối Liên Cơ Sở

Khối này chỉ dành cho `admin`.

Phát triển tiếp từ `Gợi ý điều chuyển` hiện có:

- gom theo hoạt chất hoặc thuốc chuẩn hóa
- xác định `cơ sở dư` khi `monthsOfCover > 3`
- xác định `cơ sở thiếu` khi `tonCuoi = 0 && demandAvg > 0` hoặc `monthsOfCover < 1`
- hiển thị trạng thái trước và sau điều phối giả định

Mục tiêu:

- biến block điều chuyển từ bảng tra cứu thành công cụ điều hành

### Độ Phủ Dữ Liệu Báo Cáo

Khối này chỉ dành cho `admin`.

KPI:

- `Số cơ sở có dữ liệu kỳ này / tổng cơ sở active`
- `Số dòng có giá`
- `Số dòng có thông tin hợp đồng`
- `Số dòng map được master drug`
- `Số dòng có phân loại nội/ngoại`

Lý do:

- dữ liệu thật hiện chỉ phủ báo cáo ở một số cơ sở và ít kỳ
- admin cần nhìn rõ độ phủ để không diễn giải sai dashboard

## Role-Based Visibility

### Admin

`Admin` nhìn thấy:

- toàn bộ block cũ
- toàn bộ block mới

### Facility

`Facility` nhìn thấy:

- toàn bộ block cũ trong phạm vi cơ sở
- `Dải KPI tổng quan`
- `Top tồn giá trị cao`
- `Thuốc sắp hết hợp đồng`
- `Cơ cấu nhà cung cấp của cơ sở`
- `Danh sách thuốc cần ưu tiên mua bổ sung`

`Facility` không được thấy:

- `Điều phối liên cơ sở`
- `Phụ thuộc nhà cung cấp toàn hệ thống`
- `Độ phủ dữ liệu báo cáo toàn hệ thống`

Các block admin-only phải ẩn hoàn toàn ở facility, không render disabled state.

## Data Quality And Safety Rules

1. Không suy diễn khi dữ liệu thiếu.
2. Nếu block cần trường mà độ phủ không đủ, block phải:
   - ẩn hoàn toàn, hoặc
   - hiện badge `Độ phủ dữ liệu thấp`
3. `is_trong_nuoc`, `nhom_thuoc`, `nhom_dieu_tri` không được làm dimension chính ở giai đoạn đầu.
4. `inventory_reports` là nguồn sự thật chính cho đợt mở rộng này.
5. Tất cả khối mới phải dùng cùng `effectiveReportMonth` để tránh trộn nhiều kỳ trong một màn.

## Delivery Order

### Phase 1

- thêm `Dải KPI tổng quan`
- thêm `Top tồn giá trị cao nhưng độ phủ lớn`
- thêm `Top thuốc nguy cơ thiếu theo giá trị`

### Phase 2

- thêm `Rủi ro hợp đồng sắp hết`
- thêm `Phụ thuộc nhà cung cấp`

### Phase 3

- thêm `Điều phối liên cơ sở` nâng cao cho `admin`

### Phase 4

- thêm `Độ phủ dữ liệu báo cáo`
- thêm các badge chất lượng dữ liệu và guardrail hiển thị

## API Direction

Ưu tiên mở rộng trên route `supply` hiện có thay vì tạo route rời ngay từ đầu.

Nguyên tắc:

- dùng chung `effectiveReportMonth`
- dùng chung `demandWindow` ở các block cần nhu cầu
- mở rộng contract theo hướng additive
- block nào cần dữ liệu nặng hơn có thể tách route sau nếu payload lớn

## Success Criteria

Sau khi hoàn thành, `admin` mở tab `Cung ứng` phải biết ngay:

- nơi nào đang thiếu
- nơi nào đang dư
- vốn đang nằm ở đâu
- hợp đồng nào sắp gãy
- nhà cung cấp nào đang chi phối
- dữ liệu hệ thống đang phủ tới đâu

`Facility` mở tab `Cung ứng` phải biết ngay:

- thuốc nào sắp thiếu
- thuốc nào tồn bất hợp lý
- hợp đồng nào sắp hết
- cần ưu tiên mua bổ sung thuốc nào

Và quan trọng nhất:

- các dashboard `Cung ứng` hiện tại vẫn còn nguyên, không bị thay thế
