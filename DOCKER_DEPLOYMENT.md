# Hướng dẫn chạy ứng dụng với Docker và Cloudflare Tunnel

## 📋 Tổng quan cấu hình

Compose hiện chạy theo mô hình mạng nội bộ:

- `db` không publish port ra host
- `app` truy cập DB qua `db:5432` trong Docker network
- thao tác quản trị Prisma dùng service `app-admin` theo profile `admin`
- Cloudflare Tunnel truy cập `app:3000` trong cùng network

## 🚀 Cách triển khai

### Bước 1: Cấu hình Cloudflare Tunnel

1. Đăng nhập vào [Cloudflare Zero Trust Dashboard](https://one.dash.cloudflare.com/)
2. Vào **Networks** > **Tunnels**
3. Tạo tunnel mới:
   - Click **Create a tunnel**
   - Đặt tên: `sudungthuoc-tunnel`
   - Chọn **Cloudflared**
   - Copy **Tunnel Token** (bắt đầu với `eyJ...`)

4. Cấu hình Public Hostname:
   - **Public hostname**: `sudungthuoc.yourdomain.com` (hoặc subdomain bạn muốn)
   - **Service**: `http://app:3000` (sử dụng tên container trong Docker network)
   - **Save**

### Bước 2: Cấu hình biến môi trường

Tạo file `.env.docker` từ template:

```bash
cp .env.docker.example .env.docker
```

Chỉnh sửa `.env.docker` và thêm **TUNNEL_TOKEN** bạn vừa copy:

```env
POSTGRES_DB=sudungthuoc_db
POSTGRES_SUPERUSER=postgres
POSTGRES_SUPERUSER_PASSWORD=doi-mat-khau-superuser-manh
APP_DB_USER=sudungthuoc_app
APP_DB_PASSWORD=doi-mat-khau-app-manh
APP_DATABASE_URL="postgresql://sudungthuoc_app:doi-mat-khau-app-manh@db:5432/sudungthuoc_db?schema=public"
DATABASE_ADMIN_URL="postgresql://postgres:doi-mat-khau-superuser-manh@db:5432/sudungthuoc_db?schema=public"
AUTH_SECRET="your-super-secret-key-change-in-production"
REPORT_UPLOAD_SIGNING_SECRET="another-long-random-secret"
TUNNEL_TOKEN=eyJhIjoiN...your-actual-token...
ALLOW_PRODUCTION_SEED=false

# AI Agent MVP
AI_PRIMARY_PROVIDER=google
AI_PRIMARY_MODEL=gemini-2.5-flash-lite
GOOGLE_GENERATIVE_AI_API_KEY="your-google-ai-key"
AI_ENABLE_FALLBACK=false
AI_MAX_OUTPUT_TOKENS=1200
```

AI Agent dùng `Gemini 2.5 Flash-Lite` mặc định. Khi chưa cấu hình `GOOGLE_GENERATIVE_AI_API_KEY`, chat AI sẽ báo lỗi provider có kiểm soát; riêng nút `AI kiểm tra` vẫn trả được kết quả rule nội bộ cho báo cáo/ánh xạ để không chặn workflow.

Chỉ bật fallback sau giai đoạn pilot:

```env
AI_ENABLE_FALLBACK=true
AI_FALLBACK_PROVIDER=openai
AI_FALLBACK_MODEL=gpt-5.4-mini
OPENAI_API_KEY="your-openai-key"
```

### Bước 3: Build và chạy Docker

```bash
# Build và start tất cả services
docker compose --env-file .env.docker up -d

# Chạy Prisma DDL bằng service admin riêng
docker compose --env-file .env.docker --profile admin run --build --rm app-admin npm run db:push

# Nếu cần tạo admin ban đầu trong production, chạy explicit opt-in:
docker compose --env-file .env.docker --profile admin run --build --rm \
  -e ALLOW_PRODUCTION_SEED=true \
  -e SEED_ADMIN_PASSWORD='doi-mat-khau-admin-dau-tien' \
  app-admin npm run db:seed

# Xem logs
docker compose logs -f app
```

### Bước 4: Kiểm tra

- **Public** (qua tunnel): `https://sudungthuoc.yourdomain.com`
- **Nội bộ container**: `docker compose exec app wget -qO- http://127.0.0.1:3000`

## 🔧 Các lệnh hữu ích

```bash
# Dừng tất cả containers
docker compose down

# Xóa volumes (database data)
docker compose down -v

# Rebuild app sau khi có thay đổi code
docker compose --env-file .env.docker up -d --build app

# Xem logs của service cụ thể
docker compose logs -f app
docker compose logs -f db
docker compose logs -f tunnel

# Chạy Prisma DDL bằng admin profile
docker compose --env-file .env.docker --profile admin run --build --rm app-admin npm run db:push
docker compose --env-file .env.docker --profile admin run --build --rm app-admin npm run db:generate

# Truy cập shell của container
docker compose exec app sh
docker compose exec db psql -U postgres -d sudungthuoc_db
```

## 🔐 Bảo mật

Trong production, **nhớ thay đổi**:
- `AUTH_SECRET` trong `.env.docker`
- `POSTGRES_SUPERUSER_PASSWORD` và `APP_DB_PASSWORD` trong `.env.docker`
- chỉ chạy tác vụ Prisma/seed quản trị qua `app-admin`
- giữ `ALLOW_PRODUCTION_SEED=false` mặc định

## 🐛 Troubleshooting

### Database connection failed
```bash
# Kiểm tra database đã ready chưa
docker compose exec db pg_isready -U postgres

# Khởi động lại database
docker compose restart db
```

### App không build được
```bash
# Xóa cache và rebuild
docker compose down
docker compose build --no-cache app
docker compose --env-file .env.docker up -d
```

### Tunnel không kết nối
```bash
# Kiểm tra logs tunnel
docker compose logs tunnel

# Đảm bảo TUNNEL_TOKEN đúng trong .env.docker
```

## 📝 Cấu trúc Docker Network

Tất cả containers chạy trong cùng network `sudungthuoc_network`:
- `app` → có thể kết nối tới `db:5432`
- `app-admin` → chỉ dùng cho lệnh Prisma quản trị khi cần
- `tunnel` → có thể kết nối tới `app:3000`
- Host machine → không truy cập trực tiếp Postgres trong cấu hình mặc định
