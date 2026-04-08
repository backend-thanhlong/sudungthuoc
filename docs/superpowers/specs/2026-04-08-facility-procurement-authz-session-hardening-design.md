# Facility Procurement Authorization And Session Hardening Design

## Context

Review bảo mật đã xác nhận 3 vấn đề cần xử lý ngay:

- route `facility/thong-bao-moi-thau/[goiThauId]` chỉ kiểm tra session, không ràng buộc `goiThauId` với cơ sở hiện tại
- cụm route `facility/ket-qua-lcnt` cho phép đọc, tạo, cập nhật, và xuất mẫu theo `tbmtId` hoặc `goiThauId` mà không xác minh ownership theo `facilityId`
- dashboard và nhiều route protected đang tin vào JWT session hiện có, nên user bị khóa hoặc đổi role trong DB không bị chặn ngay ở request kế tiếp

Các vấn đề này đều nằm trong phần hành vi server-side. Không cần thay schema dữ liệu để xử lý đợt này.

## Goal

Vá các mục `1-3` theo các yêu cầu sau:

- mọi thao tác `read/create/update/export` trong module đấu thầu của cơ sở chỉ được phép trên dữ liệu thuộc đúng `facilityId` của session hiện tại
- mọi request protected quan trọng phải re-check user từ DB thay vì chỉ tin `role` và `id` trong JWT
- user bị vô hiệu hóa hoặc bị đổi role phải mất quyền thực tế ở request kế tiếp vào dashboard hoặc API protected

## Scope

Bao gồm:

- tạo helper authz dùng chung cho server routes của cơ sở
- vá ownership checks trong các route:
  - `src/app/api/facility/thong-bao-moi-thau/[goiThauId]/route.ts`
  - `src/app/api/facility/ket-qua-lcnt/route.ts`
  - `src/app/api/facility/ket-qua-lcnt/[tbmtId]/route.ts`
  - `src/app/api/facility/ket-qua-lcnt/[tbmtId]/template/route.ts`
- cập nhật `src/app/dashboard/layout.tsx` để dashboard không render cho user đã bị khóa hoặc đổi role

Không bao gồm:

- thay đổi schema `User` để thêm `tokenVersion` hoặc `sessionVersion`
- thay đổi seed mặc định, Docker, hoặc cấu hình DB
- mở rộng hardening toàn bộ mọi route ngoài scope trên trong cùng đợt này

## Approach Options

### Option 1: Minimal route patch

Vá trực tiếp từng route bằng các truy vấn ownership riêng lẻ.

Ưu điểm:

- nhanh
- ít file mới

Nhược điểm:

- lặp logic
- dễ tái phát lỗi ở route mới
- mục `3` khó đồng bộ giữa page và API

### Option 2: Shared authz helpers

Tạo helper dùng chung để xác thực user đang còn hiệu lực và resolve record thuộc đúng cơ sở trước khi route thao tác.

Ưu điểm:

- vá sạch và nhất quán
- giảm copy-paste logic ownership
- giải quyết được cả `1`, `2`, và `3` mà không cần đổi schema

Nhược điểm:

- thêm một lớp helper mới
- một số request sẽ có thêm truy vấn DB nhỏ để re-check user

### Option 3: Full session versioning

Thêm version vào user/session để thu hồi JWT tức thời ở mọi nơi.

Ưu điểm:

- mạnh nhất về mặt session revocation

Nhược điểm:

- cần migration schema
- chạm sâu auth flow
- lớn hơn phạm vi vá cần thiết hiện tại

## Recommendation

Chọn Option 2.

Đây là phương án cân bằng nhất cho đợt vá này: xử lý được lỗi ownership nghiêm trọng trong procurement routes và giảm đáng kể độ tin cậy mù quáng vào JWT cũ, nhưng không cần đổi schema auth hay tăng blast radius triển khai.

## Server Authz Design

Thêm helper mới trong server layer, ví dụ `src/lib/server-authz.ts`.

Các hàm cốt lõi:

- `requireActiveSessionUser(expectedRole?: "ADMIN" | "FACILITY")`
  - gọi `auth()`
  - nếu không có session thì ném lỗi hoặc trả trạng thái unauthorized chuẩn hóa
  - nạp lại `User` từ DB theo `session.user.id`
  - chặn nếu user không tồn tại, `isActive = false`, hoặc role trong DB không còn khớp `expectedRole`
  - trả về bản ghi user DB đã được xác thực
- `getFacilityOwnedGoiThau(goiThauId, facilityId)`
  - chỉ trả `GoiThau` nếu `goiThau.keHoach.facilityId === facilityId`
- `getFacilityOwnedThongBaoMoiThauByGoiThauId(goiThauId, facilityId)`
  - resolve TBMT theo `goiThauId`, nhưng chỉ khi `goiThau` thuộc cơ sở hiện tại
- `getFacilityOwnedThongBaoMoiThauById(tbmtId, facilityId)`
  - resolve TBMT theo `tbmtId`, nhưng join ngược về `goiThau.keHoach.facilityId`
- `getFacilityOwnedKetQuaLCNTByTbmtId(tbmtId, facilityId)`
  - resolve KQLCNT theo `thongBaoMoiThauId`, nhưng join ownership theo cùng cây quan hệ

Helper này là nguồn sự thật duy nhất cho ownership trong scope vá hiện tại.

## Route Design

### `thong-bao-moi-thau/[goiThauId]`

- `GET`
  - dùng `requireActiveSessionUser("FACILITY")`
  - dùng helper ownership theo `goiThauId`
  - chỉ trả TBMT nếu gói thầu thuộc đúng cơ sở
- `POST`
  - xác minh `goiThauId` thuộc cơ sở hiện tại trước khi tạo
- `PATCH`
  - tìm TBMT hiện có qua helper ownership theo `goiThauId`
  - chỉ update trên record đã được xác thực ownership

### `ket-qua-lcnt/route.ts`

- `GET`
  - giữ nguyên nguyên tắc list theo `facilityId = current user`
- `POST`
  - xác minh `goiThauId` thuộc cơ sở hiện tại
  - xác minh `thongBaoMoiThauId` cũng thuộc chính `goiThauId` đó và thuộc cơ sở hiện tại
  - với từng `phanLoGoiThauId`, chỉ chấp nhận nếu phần lô thuộc đúng `goiThauId` đã xác thực
  - từ chối nếu các ID đầu vào không cùng một cây dữ liệu hợp lệ

### `ket-qua-lcnt/[tbmtId]`

- `GET`
  - resolve TBMT bằng helper ownership theo `tbmtId`
  - nếu có KQLCNT thì chỉ trả KQLCNT thuộc TBMT đó
  - nếu chưa có KQLCNT thì chỉ trả dữ liệu TBMT/Gói thầu đã được xác thực ownership
- `PATCH`
  - resolve KQLCNT qua helper ownership theo `tbmtId`
  - chỉ delete/recreate `ketQuaPhanLos` sau khi ownership hợp lệ
  - validate lại `phanLoGoiThauId` theo đúng gói thầu của TBMT hiện tại

### `ket-qua-lcnt/[tbmtId]/template`

- chỉ generate file nếu `tbmtId` thuộc cơ sở hiện tại
- không cho export cấu trúc lô thầu của cơ sở khác

## Session Hardening Design

Không thay JWT strategy trong đợt này. Thay vào đó, quyền thực tế sẽ luôn được re-check từ DB ở điểm vào dashboard và các route nằm trong scope.

### Dashboard layout

Sửa `src/app/dashboard/layout.tsx`:

- thay vì chỉ lấy `auth()` rồi render layout, gọi `requireActiveSessionUser()`
- nếu user không còn hợp lệ:
  - redirect về `/login`
  - không render `SessionProviderWrapper` hay `DashboardLayout`
- nếu user hợp lệ:
  - dùng session hiện tại để render như cũ

Kết quả:

- user bị khóa trong DB sẽ bị bật khỏi dashboard ở request kế tiếp
- user bị đổi role sẽ không tiếp tục ở dashboard cũ sau request kế tiếp

### API behavior

Các route procurement trong scope sẽ không còn dùng session JWT như nguồn sự thật cuối cùng cho role. Chúng sẽ dùng helper re-check DB mỗi request.

Điều này đủ để chặn quyền thực tế ở lần gọi API kế tiếp, dù cookie JWT vật lý chưa bị hủy.

## Error Handling

- thiếu session hoặc user không còn tồn tại: `401`
- user không active hoặc role không hợp lệ cho route: `403`
- record tồn tại nhưng không thuộc cơ sở hiện tại: `403`
- record không tồn tại thật: `404`

Nguyên tắc:

- không trả dữ liệu chéo cơ sở
- không update theo ID client gửi nếu chưa resolve ownership thành công
- không để `goiThauId`, `tbmtId`, `phanLoGoiThauId` từ client tự quyết định quan hệ dữ liệu

## Compatibility

- không đổi API shape thành công hiện tại nếu request hợp lệ
- không đổi schema Prisma
- không đổi UI workflow bình thường cho người dùng hợp lệ
- chỉ thay hành vi khi request đang dùng ID ngoài phạm vi sở hữu hoặc khi session đã stale so với DB

## Testing Plan

Kiểm tra thủ công tối thiểu:

1. đăng nhập cơ sở A, thử gọi `GET/POST/PATCH` cho `thong-bao-moi-thau` bằng `goiThauId` của cơ sở B, xác nhận bị chặn
2. đăng nhập cơ sở A, thử `POST` KQLCNT với `goiThauId` hoặc `thongBaoMoiThauId` của cơ sở B, xác nhận bị chặn
3. thử `GET/PATCH/template` với `tbmtId` của cơ sở B, xác nhận bị chặn
4. thử gửi `phanLoGoiThauId` không thuộc `goiThauId` đã xác thực, xác nhận bị từ chối
5. đăng nhập một user hợp lệ, sau đó đổi `isActive = false` trong DB, xác nhận request kế tiếp vào `/dashboard/*` bị redirect khỏi dashboard
6. đăng nhập một facility user, đổi role trong DB sang `ADMIN` hoặc ngược lại, xác nhận request kế tiếp không còn truy cập dashboard cũ/API cũ

## Risks And Limits

- vì chưa dùng session versioning, cookie JWT cũ vẫn còn tồn tại vật lý cho tới khi hết hạn hoặc đăng xuất
- tuy nhiên sau bản vá này, cookie cũ không còn đủ để duy trì quyền thực tế trong scope đã harden
- các route protected ngoài scope `1-3` vẫn nên được rà và chuyển dần sang helper re-check DB ở các đợt tiếp theo
