# Production Database Hardening Design

## Context

Review vận hành trên VPS đã xác nhận 4 điểm rủi ro trực tiếp:

- `docker-compose.yml` hardcode `POSTGRES_PASSWORD: 123456`
- app runtime kết nối DB bằng chính superuser `postgres`
- Postgres publish port ra host qua `5435:5432`
- `prisma/seed.ts` tạo sẵn tài khoản mặc định yếu trong mọi môi trường

Mục tiêu đợt này là giảm bề mặt tấn công mà không đổi schema ứng dụng.

## Goal

- đóng truy cập Postgres từ bên ngoài Docker network
- tách tài khoản runtime của app khỏi superuser `postgres`
- bỏ secret hardcode khỏi `docker-compose.yml`
- giữ đường vận hành cho tác vụ quản trị DB/Prisma nhưng không nhét admin credential vào app runtime
- chặn seed production dùng mật khẩu mặc định yếu

## Scope

Bao gồm:

- cập nhật `docker-compose.yml`
- thêm bootstrap script tạo hoặc cập nhật DB role cho app
- thêm template biến môi trường cho Docker deploy
- harden `prisma/seed.ts`
- giảm log đăng nhập nhạy cảm trong `src/auth.ts`
- cập nhật tài liệu Docker/Tunnel liên quan

Không bao gồm:

- thay đổi `pg_hba.conf` hoặc `postgresql.conf`
- thêm TLS nội bộ cho kết nối app -> db
- thêm rate limiting phân tán cho đăng nhập
- xóa tự động các file dump `.sql` hiện có trên máy

## Approach Options

### Option 1: Giữ port DB mở nhưng bind `127.0.0.1`

Ưu điểm:

- ít thay đổi vận hành
- vẫn chạy được công cụ host-side trực tiếp

Nhược điểm:

- DB vẫn còn exposed trên host
- app vẫn dễ bị kéo theo dùng admin credential nếu không tách hẳn flow

### Option 2: Đóng port DB hoàn toàn, tách runtime role và admin path

Ưu điểm:

- giảm mạnh bề mặt tấn công
- app runtime không cần superuser
- vẫn giữ được flow Prisma quản trị qua service riêng khi cần

Nhược điểm:

- thao tác quản trị DB phải đi qua Docker compose thay vì host port
- cần thêm bootstrap script và biến môi trường mới

### Option 3: Triển khai đầy đủ secrets + custom Postgres auth config

Ưu điểm:

- mạnh nhất về mặt hardening

Nhược điểm:

- blast radius lớn hơn
- đụng sâu vào deploy hiện có
- không cần thiết cho đợt vá cấp tốc này

## Recommendation

Chọn Option 2.

Đây là phương án cân bằng nhất cho production hiện tại: đóng host exposure ngay, tách quyền runtime khỏi `postgres`, nhưng vẫn giữ khả năng chạy `prisma db push` qua service quản trị riêng thay vì nhồi admin secret vào container app đang phục vụ người dùng.

## Runtime Design

### Docker network

- bỏ `ports` khỏi service `db`
- chỉ cho phép `app`, `app-admin`, `db-bootstrap`, và `tunnel` đi qua network nội bộ

### Database accounts

- giữ `postgres` làm tài khoản quản trị
- thêm `APP_DB_USER` / `APP_DB_PASSWORD` cho runtime app
- `db-bootstrap` sẽ tạo hoặc cập nhật role runtime ở mỗi lần deploy cần thiết
- role runtime chỉ có:
  - `CONNECT` vào database
  - `USAGE` schema `public`
  - `SELECT/INSERT/UPDATE/DELETE` trên tables
  - `USAGE/SELECT/UPDATE` trên sequences

### Prisma admin path

- thêm service `app-admin` theo profile `admin`
- service này dùng `DATABASE_ADMIN_URL`
- chỉ chạy on-demand cho các lệnh như `prisma db push`
- app runtime thường trực chỉ giữ `APP_DATABASE_URL`

## Seed Design

- production seed bị chặn mặc định
- chỉ cho phép seed production khi `ALLOW_PRODUCTION_SEED=true`
- production seed yêu cầu `SEED_ADMIN_PASSWORD`
- production seed chỉ tạo user admin ban đầu, không tạo facility mẫu hay master drug mẫu
- non-production giữ nguyên seed mẫu để phục vụ dev/test

## Auth Logging Design

- bỏ log chi tiết kiểu `user not found`, `invalid password`, `login successful`
- normalize username trước khi truy vấn
- chỉ giữ log lỗi bất thường ở mức tổng quát

## Docs And Ops

- thêm `.env.docker.example`
- cập nhật Docker deployment docs sang flow:
  1. chuẩn bị `.env.docker`
  2. `docker compose --env-file .env.docker up -d`
  3. `docker compose --env-file .env.docker --profile admin run --rm app-admin npx prisma db push`
  4. nếu cần seed production, chạy explicit opt-in command với password mạnh

## Testing Plan

1. `docker compose config` phải render thành công với bộ biến môi trường mới
2. `db-bootstrap` phải chạy idempotent và không lỗi nếu role đã tồn tại
3. app runtime phải start được với `APP_DATABASE_URL`
4. `app-admin` phải chạy được `prisma db push`
5. `npm run db:seed` ở production phải fail nếu thiếu opt-in env
6. `npm run db:seed` ở non-production vẫn tạo dữ liệu mẫu như cũ

## Risks And Limits

- nếu vẫn giữ nguyên mật khẩu hiện tại của `postgres` trong `.env.docker`, mức độ bảo vệ chủ yếu đến từ việc đóng port và tách runtime role; xoay vòng superuser password vẫn nên làm ở cửa sổ bảo trì tiếp theo
- `db-bootstrap` chỉ grant runtime privileges; quyền DDL vẫn đi qua `app-admin`
- login rate limiting phân tán chưa nằm trong đợt này và vẫn nên bổ sung sau
