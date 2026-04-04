# Hướng dẫn cấu hình Cloudflare Tunnel cho subdomain khoduoc.nvdcantho.com

## 🎯 Mục tiêu
Thêm subdomain `khoduoc.nvdcantho.com` vào tunnel hiện có của `nvdcantho.com` để trỏ tới ứng dụng `sudungthuoc` đang chạy trên Docker port 3003.

---

## ✅ PHƯƠNG ÁN 1: Sử dụng tunnel hiện có (KHUYẾN NGHỊ)

### Bước 1: Đăng nhập Cloudflare Zero Trust Dashboard

1. Truy cập: https://one.dash.cloudflare.com/
2. Chọn **Networks** → **Tunnels**
3. Tìm tunnel hiện tại đang chạy cho `nvdcantho.com`

### Bước 2: Thêm Public Hostname mới

1. Click vào tunnel hiện có
2. Chọn tab **Public Hostname**
3. Click **Add a public hostname**

### Bước 3: Cấu hình Subdomain

Điền thông tin như sau:

**Public Hostname:**
- **Subdomain**: `khoduoc`
- **Domain**: `nvdcantho.com`
- **Path**: (để trống)

**Service:**
- **Type**: `HTTP`
- **URL**: 
  - Nếu ứng dụng chạy trên **cùng máy** với tunnel: `http://localhost:3003`
  - Nếu ứng dụng chạy trong **Docker network riêng**: `http://host.docker.internal:3003`
  - Nếu tunnel và app trong **cùng Docker Compose**: `http://sudungthuoc_app:3000`

**Additional application settings** (Optional):
- **HTTP Host Header**: `khoduoc.nvdcantho.com` (nếu app yêu cầu)
- Các options khác để mặc định

### Bước 4: Lưu cấu hình

1. Click **Save hostname**
2. Đợi vài giây để cấu hình apply

### Bước 5: Cập nhật DNS (Tự động)

Cloudflare sẽ **tự động** tạo CNAME record cho `khoduoc.nvdcantho.com`. Bạn có thể kiểm tra:
1. Vào **Cloudflare Dashboard** → Chọn domain `nvdcantho.com`
2. Vào **DNS** → **Records**
3. Sẽ thấy record: `khoduoc CNAME xxx.cfargotunnel.com`

### Bước 6: Cập nhật AUTH_URL trong ứng dụng

Chỉnh sửa file `.env` hoặc `.env.docker`:

```bash
AUTH_URL="https://khoduoc.nvdcantho.com"
```

Khởi động lại ứng dụng:
```bash
# Nếu chạy trực tiếp
npm run start

# Nếu chạy Docker
docker-compose restart app
```

### Bước 7: Kiểm tra

1. Truy cập: `https://khoduoc.nvdcantho.com`
2. Kiểm tra login, các chức năng
3. Kiểm tra SSL certificate (Cloudflare tự động cấp)

---

## 🔧 PHƯƠNG ÁN 2: Tạo tunnel mới riêng (Nếu cần độc lập)

Nếu bạn muốn ứng dụng này có tunnel riêng:

### Bước 1: Tạo Tunnel mới

1. Vào **Networks** → **Tunnels** → **Create a tunnel**
2. Chọn **Cloudflared**
3. Đặt tên: `sudungthuoc-tunnel`
4. Click **Save tunnel**

### Bước 2: Copy Tunnel Token

Sau khi tạo xong, Cloudflare sẽ hiển thị cách cài đặt. Bạn cần:
1. Tìm phần **Install and run a connector**
2. Copy **token** (chuỗi dài bắt đầu với `eyJ...`)
3. Lưu lại

### Bước 3: Cấu hình Public Hostname

1. Vào tab **Public Hostname**
2. Click **Add a public hostname**
3. Cấu hình:
   - **Subdomain**: `khoduoc`
   - **Domain**: `nvdcantho.com`
   - **Service Type**: `HTTP`
   - **URL**: `http://app:3000` (tên container trong Docker network)
4. **Save**

### Bước 4: Cấu hình Docker

Tạo file `.env.docker`:

```bash
TUNNEL_TOKEN=eyJ... (token bạn vừa copy)
DATABASE_URL="postgresql://postgres:123456@db:5432/sudungthuoc_db?schema=public"
AUTH_SECRET="your-super-secret-key-change-in-production"
AUTH_URL="https://khoduoc.nvdcantho.com"
NODE_ENV="production"
```

### Bước 5: Chạy Docker Compose

```bash
# Load environment variables và start
docker-compose --env-file .env.docker up -d

# Đợi database ready, sau đó:
docker-compose exec app npx prisma db push
docker-compose exec app npm run db:seed
```

### Bước 6: Kiểm tra tunnel

```bash
# Xem logs tunnel
docker-compose logs -f tunnel

# Output mong đợi:
# "Connection ... registered"
# "Registered tunnel connection"
```

---

## 🎨 So sánh 2 phương án

| Tiêu chí | Phương án 1 (Tunnel hiện có) | Phương án 2 (Tunnel mới) |
|----------|----------------------------|------------------------|
| **Độ phức tạp** | ⭐ Rất đơn giản | ⭐⭐ Trung bình |
| **Tài nguyên** | ✅ Tiết kiệm | ⚠️ Cần thêm container |
| **Quản lý** | ✅ Tập trung 1 tunnel | ⚠️ Quản lý nhiều tunnel |
| **Độc lập** | ❌ Phụ thuộc tunnel chung | ✅ Hoàn toàn độc lập |
| **Khuyến nghị** | ✅ **KHUYẾN NGHỊ CHO HẦU HẾT** | Chỉ khi cần tách biệt |

---

## 🐛 Troubleshooting

### Lỗi "502 Bad Gateway"
**Nguyên nhân**: Tunnel không kết nối được tới app

**Giải pháp**:
1. Kiểm tra app đang chạy: `docker ps` hoặc kiểm tra `http://localhost:3003`
2. Kiểm tra URL trong tunnel config:
   - **Đúng**: `http://localhost:3003` (nếu tunnel chạy ngoài Docker)
   - **Đúng**: `http://host.docker.internal:3003` (nếu tunnel trong Docker khác network)
   - **Đúng**: `http://sudungthuoc_app:3000` (nếu cùng network)

### Lỗi "Unable to find a route to host"
**Nguyên nhân**: Firewall hoặc network isolation

**Giải pháp**:
```bash
# Nếu tunnel container không thấy app container
docker network inspect sudungthuoc_network

# Đảm bảo cả 2 containers trong cùng network
```

### Subdomain không resolve
**Nguyên nhân**: DNS chưa cập nhật

**Giải pháp**:
1. Đợi 1-2 phút
2. Kiểm tra DNS: `nslookup khoduoc.nvdcantho.com`
3. Xóa cache DNS local: `ipconfig /flushdns` (Windows)

### NextAuth callback error
**Nguyên nhân**: `AUTH_URL` không khớp

**Giải pháp**:
1. Đảm bảo `AUTH_URL="https://khoduoc.nvdcantho.com"` trong `.env`
2. Restart app: `docker-compose restart app`

---

## 📝 Checklist hoàn thành

- [ ] Đã thêm public hostname `khoduoc.nvdcantho.com` vào tunnel
- [ ] Đã cập nhật `AUTH_URL` trong `.env` hoặc `.env.docker`
- [ ] App đang chạy trên port 3003 (local) hoặc port 3000 (container)
- [ ] Truy cập được `https://khoduoc.nvdcantho.com`
- [ ] Đăng nhập thành công
- [ ] SSL certificate hiển thị đúng (Cloudflare)

---

## 💡 Lưu ý quan trọng

1. **Tunnel hiện có**: Nếu tunnel hiện tại đã chạy trên Docker, bạn có thể thêm app này vào **cùng Docker network** để dễ kết nối.

2. **Performance**: Cloudflare Tunnel có thể thêm ~50-100ms latency. Nếu cần tốc độ tối đa, cân nhắc expose port trực tiếp qua reverse proxy.

3. **Security**: Cloudflare Tunnel tự động có:
   - ✅ DDoS protection
   - ✅ SSL/TLS encryption
   - ✅ Hide origin IP
   - ✅ WAF (Web Application Firewall) - nếu bật

4. **Monitoring**: Theo dõi tunnel health tại Cloudflare Dashboard > Networks > Tunnels

---

**🎉 Chúc bạn triển khai thành công!**

Nếu gặp vấn đề, hãy kiểm tra:
1. Tunnel logs: `docker-compose logs tunnel` (nếu dùng phương án 2)
2. App logs: `docker-compose logs app`
3. Cloudflare Dashboard > Tunnels > (tunnel của bạn) > **Connectors** (phải là "Healthy")
