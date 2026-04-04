# Hướng dẫn chạy ứng dụng với Docker và Cloudflare Tunnel

## 📋 Tổng quan cấu hình

Ứng dụng sử dụng các port sau để **tránh xung đột** với các ứng dụng hiện có:

- **App (Next.js)**: Port `3003` (thay vì 3001, 3002)
- **PostgreSQL**: Port `5434` (thay vì 5433)
- **Cloudflare Tunnel**: Tự động xử lý

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
TUNNEL_TOKEN=eyJhIjoiN...your-actual-token...
```

### Bước 3: Build và chạy Docker

```bash
# Build và start tất cả services
docker-compose up -d

# Chờ database khởi động hoàn toàn, sau đó:
docker-compose exec app npx prisma db push
docker-compose exec app npm run db:seed

# Xem logs
docker-compose logs -f app
```

### Bước 4: Kiểm tra

- **Local**: `http://localhost:3003`
- **Public** (qua tunnel): `https://sudungthuoc.yourdomain.com`

## 🔧 Các lệnh hữu ích

```bash
# Dừng tất cả containers
docker-compose down

# Xóa volumes (database data)
docker-compose down -v

# Rebuild app sau khi có thay đổi code
docker-compose up -d --build app

# Xem logs của service cụ thể
docker-compose logs -f app
docker-compose logs -f db
docker-compose logs -f tunnel

# Chạy Prisma migrations
docker-compose exec app npx prisma db push
docker-compose exec app npx prisma generate

# Truy cập shell của container
docker-compose exec app sh
docker-compose exec db psql -U postgres -d sudungthuoc_db
```

## 📊 Port Mapping

| Service | Container Port | Host Port | Tránh xung đột với |
|---------|---------------|-----------|-------------------|
| App     | 3000          | 3003      | app-1 (3001), webivd (3002) |
| DB      | 5432          | 5434      | db-1, webivd_db (5433) |
| Tunnel  | N/A           | N/A       | Tự động |

## 🔐 Bảo mật

Trong production, **nhớ thay đổi**:
- `AUTH_SECRET` trong `.env.docker`
- Mật khẩu database trong `docker-compose.yml`
- Giới hạn truy cập database chỉ từ app container

## 🐛 Troubleshooting

### Database connection failed
```bash
# Kiểm tra database đã ready chưa
docker-compose exec db pg_isready -U postgres

# Khởi động lại database
docker-compose restart db
```

### App không build được
```bash
# Xóa cache và rebuild
docker-compose down
docker-compose build --no-cache app
docker-compose up -d
```

### Tunnel không kết nối
```bash
# Kiểm tra logs tunnel
docker-compose logs tunnel

# Đảm bảo TUNNEL_TOKEN đúng trong .env.docker
```

## 📝 Cấu trúc Docker Network

Tất cả containers chạy trong cùng network `sudungthuoc_network`:
- `app` → có thể kết nối tới `db:5432`
- `tunnel` → có thể kết nối tới `app:3000`
- Host machine → truy cập qua ports đã map (3003, 5434)
