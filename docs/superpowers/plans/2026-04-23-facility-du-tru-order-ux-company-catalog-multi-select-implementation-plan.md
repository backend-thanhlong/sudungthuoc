# Facility Du Tru Order UX Company Catalog Multi-Select Implementation Plan

## Inputs

Plan này dựa trên:

- Spec đã duyệt: [2026-04-23-facility-du-tru-order-ux-company-catalog-multi-select-design.md](/opt/sudungthuoc/sudungthuoc/docs/superpowers/specs/2026-04-23-facility-du-tru-order-ux-company-catalog-multi-select-design.md)
- UI facility hiện tại: [FacilityDrugOrdersPage.tsx](/opt/sudungthuoc/sudungthuoc/src/components/drug-orders/FacilityDrugOrdersPage.tsx)
- API tạo và cập nhật draft hiện tại: [create route](/opt/sudungthuoc/sudungthuoc/src/app/api/facility/dutru-dat-hang/route.ts), [draft route](/opt/sudungthuoc/sudungthuoc/src/app/api/facility/dutru-dat-hang/[id]/route.ts)
- Submit flow hiện tại: [submit route](/opt/sudungthuoc/sudungthuoc/src/app/api/facility/dutru-dat-hang/[id]/submit/route.ts), [facility.ts](/opt/sudungthuoc/sudungthuoc/src/lib/drug-orders/facility.ts)
- Company catalog table pattern tham chiếu: [CompanyDrugOrdersPage.tsx](/opt/sudungthuoc/sudungthuoc/src/components/drug-orders/CompanyDrugOrdersPage.tsx)
- Schema liên quan: [schema.prisma](/opt/sudungthuoc/sudungthuoc/prisma/schema.prisma)

## Goal

Triển khai lại UX trên `/dashboard/facility/dutru-dat-hang` để:

- đổi CTA `Tạo nháp mới` thành `Thêm dự trù`
- mở modal lớn có bảng `Danh mục công ty` đầy đủ cột
- cho phép chọn một hoặc nhiều thuốc trong một lần
- tạo draft mới kèm các dòng thuốc đã chọn ngay trong thao tác đầu tiên
- chuyển phần nhập `Số lượng yêu cầu` về bảng chi tiết đơn
- loại bỏ card list rút gọn hiện tại và thay bằng flow nhất quán, chuyên nghiệp hơn
- không làm regression các luồng `Lưu nháp`, `Gửi công ty`, `Thu hồi`, `Xác nhận thực nhận`

## Delivery Principles

- Không thay đổi schema Prisma trong scope này
- Không đổi route page hiện tại
- Không preload toàn bộ danh mục của mọi công ty vào payload list ban đầu
- Giữ thay đổi backend tập trung trong module `facility drug orders`
- Không nới lỏng validation submit; chỉ tách rõ rule `lưu nháp` và `gửi công ty`
- Tôn trọng worktree hiện tại: [FacilityDrugOrdersPage.tsx](/opt/sudungthuoc/sudungthuoc/src/components/drug-orders/FacilityDrugOrdersPage.tsx) và [facility.ts](/opt/sudungthuoc/sudungthuoc/src/lib/drug-orders/facility.ts) đang có thay đổi chưa commit, implementation phải merge cẩn thận thay vì ghi đè
- Không generic hóa thành hệ thống table-selection dùng chung cho toàn repo trong pha này

## Current Constraints

- Dialog tạo draft hiện tại chỉ nhận `companyId`, `baseReportMonth`, `note`, chưa nhận danh sách thuốc
- `selectedOrder.options.companyDrugs` chỉ có sau khi đã mở chi tiết một draft, nên không dùng được cho màn `Thêm dự trù` trước khi tạo draft
- `parseDraftLineInputs` hiện buộc `requestedQty > 0`, không phù hợp với draft mới có dòng `requestedQty = 0`
- `submitFacilityDrugOrder` hiện chỉ kiểm tra `có dòng thuốc`, chưa chặn trường hợp dòng còn `requestedQty = 0`
- Khu `Thêm từ danh mục công ty` hiện là card list rút gọn và chỉ thêm từng dòng một
- [FacilityDrugOrdersPage.tsx](/opt/sudungthuoc/sudungthuoc/src/components/drug-orders/FacilityDrugOrdersPage.tsx) đã khá lớn, nên mọi thay đổi mới phải ưu tiên giữ state và markup có tổ chức

## Target File Structure

### Frontend

- `src/components/drug-orders/FacilityDrugOrdersPage.tsx`
- `src/components/drug-orders/FacilityDrugOrderCatalogDialog.tsx` nếu cần tách modal lớn ra khỏi page để giữ file chính dễ kiểm soát

### Backend

- `src/app/api/facility/dutru-dat-hang/route.ts`
- `src/app/api/facility/dutru-dat-hang/[id]/route.ts`
- `src/app/api/facility/dutru-dat-hang/[id]/submit/route.ts`
- `src/app/api/facility/dutru-dat-hang/company-drugs/route.ts`
- `src/lib/drug-orders/facility.ts`

### Docs

- [2026-04-23-facility-du-tru-order-ux-company-catalog-multi-select-design.md](/opt/sudungthuoc/sudungthuoc/docs/superpowers/specs/2026-04-23-facility-du-tru-order-ux-company-catalog-multi-select-design.md)
- [2026-04-23-facility-du-tru-order-ux-company-catalog-multi-select-implementation-plan.md](/opt/sudungthuoc/sudungthuoc/docs/superpowers/plans/2026-04-23-facility-du-tru-order-ux-company-catalog-multi-select-implementation-plan.md)

## Phase Breakdown

## Phase 1: Align Backend Contract For Draft Creation And Validation

### Objective

Chuẩn hóa contract backend để modal mới có thể:

- tải danh mục công ty theo `companyId`
- tạo draft kèm danh sách thuốc đã chọn
- lưu draft với dòng `requestedQty = 0`
- chỉ chặn ở bước submit, không chặn ở bước save draft

### Tasks

1. Mở rộng `COMPANY_DRUG_OPTION_SELECT` trong [facility.ts](/opt/sudungthuoc/sudungthuoc/src/lib/drug-orders/facility.ts) để trả đủ dữ liệu bảng:
   - `quyCach`
   - `masterDrug.hamLuong`
   - `masterDrug.soDangKy`
   - `masterDrug.dangBaoChe`
2. Mở rộng `serializeCompanyDrugOption` để map đủ các field trên
3. Thêm loader riêng cho catalog theo công ty, ví dụ:
   - `loadFacilityCompanyDrugCatalogPayload(companyId)`
4. Thêm route mới [company-drugs/route.ts](/opt/sudungthuoc/sudungthuoc/src/app/api/facility/dutru-dat-hang/company-drugs/route.ts):
   - chỉ cho `FACILITY`
   - nhận `companyId`
   - trả về danh sách active `CompanyDrug` của công ty đó
   - không nhồi dữ liệu catalog của mọi công ty vào `GET /api/facility/dutru-dat-hang`
5. Tạo parser riêng cho payload chọn thuốc khi tạo draft, ví dụ:
   - `parseCreateDraftSelectedLines`
   - chỉ nhận `sourceType`, `sourceId`
   - không tái dùng `parseDraftLineInputs` đang buộc `requestedQty > 0`
6. Mở rộng `createFacilityDrugOrderDraft` để nhận `lines` và tạo `DrugOrderLine` với:
   - `sourceType = COMPANY_DRUG`
   - `requestedQty = 0`
   - `acceptedQty = 0`
   - suggestion snapshot vẫn được tính nếu có `masterDrugId`
7. Cập nhật `POST /api/facility/dutru-dat-hang` để nhận `lines`
8. Tách rule validate update draft:
   - `PATCH` draft cho phép `requestedQty >= 0`
   - giữ invalid state phía UI cho dòng `0`
9. Tăng validate `submitFacilityDrugOrder`:
   - chặn submit nếu có dòng `requestedQty <= 0`
10. Cập nhật `permissions.canSubmit` và các metadata liên quan trong serializer detail để frontend đọc đúng trạng thái mới

### Acceptance Criteria

- Có route catalog riêng theo `companyId`
- `POST /api/facility/dutru-dat-hang` tạo được draft kèm nhiều `CompanyDrug`
- Draft mới có thể tồn tại với `requestedQty = 0`
- `PATCH` không fail chỉ vì draft còn dòng `0`
- `POST /submit` chặn đúng nếu còn dòng chưa nhập số lượng hợp lệ

## Phase 2: Rework Create Flow State In Facility Page

### Objective

Thay flow `Tạo nháp mới` cũ bằng state model mới cho modal lớn và giữ khả năng thêm thuốc vào draft đang mở mà không dùng card list rút gọn.

### Tasks

1. Đổi toàn bộ text và intent từ `Tạo nháp mới` sang `Thêm dự trù`
2. Trong [FacilityDrugOrdersPage.tsx](/opt/sudungthuoc/sudungthuoc/src/components/drug-orders/FacilityDrugOrdersPage.tsx), thêm state cho modal catalog:
   - open/close
   - mode: `create` hoặc `append`
   - `companyId`
   - `baseReportMonth`
   - `note`
   - `catalogItems`
   - `catalogLoading`
   - `catalogSearch`
   - `linkedOnly`
   - `selectedIds`
3. Khi mở modal ở mode `create`:
   - reset sạch selection
   - đặt company mặc định
   - fetch catalog theo `companyId` đã chọn
4. Khi đổi `companyId` trong modal:
   - clear selection
   - fetch lại catalog của công ty mới
5. Giữ rule confirm discard hiện có khi người dùng đang rời draft có thay đổi chưa lưu
6. Thay khu `Thêm từ danh mục công ty` trong chi tiết draft bằng CTA gọn, ví dụ `Thêm thuốc`
7. Khi mở modal ở mode `append`:
   - khóa `companyId` theo `selectedOrder.companyId`
   - fetch cùng catalog route
   - đánh dấu hoặc disable các dòng đã có trong `editorLines` để tránh trùng

### Acceptance Criteria

- Trang có một state model rõ cho modal catalog, không còn phụ thuộc `selectedOrder.options.companyDrugs` để render flow tạo mới
- Người dùng vẫn thêm được thuốc vào draft đang mở, nhưng qua cùng modal chuyên nghiệp thay vì card list
- Không mất khả năng tạo draft mới từ header

## Phase 3: Build Professional Catalog Modal And Multi-Select Table

### Objective

Triển khai modal lớn với data table đúng spec: tìm kiếm nhanh, chọn nhiều dòng, hiển thị đầy đủ cột và trạng thái rõ ràng.

### Tasks

1. Nâng dialog hiện tại lên shell lớn:
   - khoảng `sm:max-w-7xl`
   - body chia 2 tầng: form trên, bảng dưới
   - footer sticky hoặc luôn hiện CTA
2. Render form phần đầu:
   - `Công ty cung ứng`
   - `Tháng gốc XNT`
   - `Ghi chú ban đầu`
3. Render toolbar bảng:
   - ô tìm kiếm
   - `Đã chọn: n thuốc`
   - `Bỏ chọn tất cả`
   - toggle `Chỉ hiện thuốc đã liên kết thuốc chuẩn`
4. Render data table thay cho card list với các cột:
   - `Chọn`
   - `Mã thuốc công ty`
   - `Tên thuốc`
   - `Hoạt chất`
   - `Hàm lượng`
   - `Số đăng ký`
   - `Dạng bào chế`
   - `Quy cách`
   - `Thuốc chuẩn liên kết`
   - `Đơn vị`
5. Cài selection model:
   - click checkbox từng dòng
   - click cả row để toggle
   - checkbox header chọn tất cả kết quả đang hiển thị
6. Cài search client-side theo:
   - `companyDrugCode`
   - `companyDrugName`
   - `activeIngredient`
   - `masterDrug.maChung`
   - `masterDrug.tenThuoc`
7. Hiển thị badge mềm cho dòng chưa linked `MasterDrug`:
   - `Chưa liên kết thuốc chuẩn`
8. Hiển thị loading / empty states:
   - đang tải catalog
   - công ty chưa có danh mục
   - không có kết quả theo từ khóa
9. Chỉ bật CTA `Thêm vào dự trù` khi có ít nhất một lựa chọn hợp lệ

### Acceptance Criteria

- Modal hiển thị đúng bảng đầy đủ cột, không còn card list rút gọn
- Người dùng chọn được một hoặc nhiều thuốc trong một lần
- Search, filter, select-all hoạt động ổn trên tập kết quả đang hiển thị
- Empty state và loading state rõ ràng

## Phase 4: Integrate Modal Actions With Draft Editor Workspace

### Objective

Nối modal mới với màn chi tiết đơn để người dùng chuyển mượt từ `chọn thuốc` sang `nhập số lượng`.

### Tasks

1. Ở mode `create`, khi bấm `Thêm vào dự trù`:
   - gọi `POST /api/facility/dutru-dat-hang`
   - gửi `companyId`, `baseReportMonth`, `note`, `lines`
   - đóng modal sau khi thành công
   - mở đúng draft vừa tạo
2. Ở mode `append`, khi bấm `Thêm vào dự trù`:
   - append các dòng mới vào `editorLines` local
   - không thêm trùng các dòng đã có
   - set `isDirty = true`
   - đóng modal
3. Sau mỗi lần tạo hoặc append:
   - cuộn đến bảng dòng thuốc
   - highlight nhẹ các dòng mới thêm
   - focus ô `Số lượng yêu cầu` đầu tiên vừa thêm
4. Thêm summary strip ở chi tiết đơn:
   - `Tổng số dòng`
   - `Đã nhập số lượng`
   - `Chưa có gợi ý XNT`
   - `Chờ xác nhận danh mục`
5. Bổ sung invalid UX cho dòng `requestedQty = 0`:
   - input viền lỗi
   - text trạng thái ngắn nếu cần
6. Cập nhật điều kiện enabled của `Gửi công ty` trên client:
   - có ít nhất 1 dòng
   - không còn dòng `requestedQty <= 0`
7. Bổ sung thông điệp gần CTA:
   - `Còn n dòng chưa nhập số lượng hợp lệ.`
8. Nếu phạm vi cho phép, thêm tiện ích nhỏ:
   - `Dùng gợi ý` trên từng dòng
   - `Dùng tất cả gợi ý XNT` trên level bảng

### Acceptance Criteria

- Sau khi thêm thuốc, người dùng được đưa về đúng khu nhập số lượng
- Các dòng mới thêm nhìn thấy rõ và dễ hoàn thiện
- `Gửi công ty` bị chặn đúng khi draft còn thiếu số lượng
- Không phá vỡ `Lưu nháp`, `Thu hồi`, `Xác nhận thực nhận`

## Phase 5: Remove Old Add-From-Company Card Flow And Harden UX Copy

### Objective

Dọn bỏ luồng cũ để giao diện cuối cùng chỉ còn một cách làm việc nhất quán, dễ hiểu.

### Tasks

1. Xóa hoặc thay hoàn toàn block `Thêm từ danh mục công ty` dạng card list trong chi tiết draft
2. Chuẩn hóa microcopy:
   - `Thêm dự trù`
   - `Tạo dự trù đặt hàng`
   - `Thêm vào dự trù`
   - `Đã chọn n thuốc`
   - `Còn n dòng chưa nhập số lượng hợp lệ`
3. Chuẩn hóa toast:
   - thêm thành công
   - bỏ qua dòng trùng nếu có
   - lỗi fetch catalog
   - lỗi tạo draft
4. Giữ layout desktop rõ ràng và cho phép cuộn ngang khi viewport hẹp
5. Rà soát để modal không làm rối các dialog khác như `Xác nhận thực nhận`

### Acceptance Criteria

- Giao diện chỉ còn một flow chọn thuốc nhất quán
- Không còn copy cũ kiểu `Tạo nháp mới`
- Toast và trạng thái disabled phản ánh đúng nghiệp vụ mới

## Phase 6: Verification And Regression Checklist

### Objective

Xác nhận feature mới chạy đúng theo spec và không làm vỡ các luồng đã có trong module.

### Tasks

1. Chạy lint hoặc type-check cho phạm vi file thay đổi nếu môi trường cho phép
2. Manual test với checklist bên dưới
3. Rà soát kỹ merge vì hai file mục tiêu đang có thay đổi chưa commit
4. Dọn logic chết liên quan create dialog cũ và card list cũ

### Manual Verification Checklist

1. Mở `/dashboard/facility/dutru-dat-hang`
2. Bấm `Thêm dự trù`
3. Xác nhận modal lớn mở ra và hiển thị form + bảng catalog đầy đủ cột
4. Đổi công ty, xác nhận catalog được tải lại và selection reset
5. Tìm kiếm theo mã thuốc công ty, tên thuốc, hoạt chất, mã chuẩn, tên chuẩn
6. Chọn một dòng, tạo draft mới, xác nhận draft mở đúng và dòng mới có `requestedQty = 0`
7. Chọn nhiều dòng, tạo draft mới, xác nhận tất cả dòng xuất hiện trong editor
8. Thêm thuốc vào draft đang mở qua cùng modal, xác nhận không bị trùng dòng
9. Lưu draft khi còn dòng `0`, xác nhận lưu được
10. Thử `Gửi công ty` khi còn dòng `0`, xác nhận bị chặn với thông điệp rõ
11. Điền hết số lượng `> 0`, xác nhận `Gửi công ty` bật lại và submit thành công
12. Kiểm tra `Thu hồi`, `Xác nhận thực nhận`, và các shipment hiện có không bị regression

## Success Criteria

- `Thêm dự trù` mở đúng modal chuyên nghiệp với bảng `Danh mục công ty` đầy đủ cột
- Người dùng chọn được nhiều thuốc trong một lần
- Draft mới được tạo ngay với các dòng đã chọn
- Nhập số lượng diễn ra ở bảng chi tiết đơn, không còn bị nhồi vào popup
- Save draft cho phép trạng thái chưa hoàn tất, nhưng submit bị chặn đúng cho tới khi mọi dòng hợp lệ
- Luồng cũ dạng card list được loại bỏ mà không làm mất khả năng thêm thuốc vào draft
