# 🚀 HƯỚNG DẪN CẤU HÌNH CLOUDFLARE TUNNEL

## ✅ Trạng thái hiện tại
- ✅ Docker containers đang chạy (db, app, tunnel)
- ✅ App chạy tại: `http://localhost:3003` (host machine)
- ✅ App chạy tại: `http://app:3000` (trong Docker network)
- ✅ Tunnel token đã được cấu hình

## 🔧 Bước tiếp theo: Cấu hình Subdomain

### Bước 1: Vào Cloudflare Zero Trust Dashboard

1. Mở trình duyệt và truy cập: https://one.dash.cloudflare.com/
2. Chọn account của bạn
3. Vào **Networks** → **Tunnels**

### Bước 2: Tìm Tunnel đang chạy

Bạn sẽ thấy tunnel có token mà bạn đã sử dụng. Click vào tunnel đó.

### Bước 3: Thêm Public Hostname

1. Click vào tab **Public Hostname**
2. Click nút **Add a public hostname**
3. Điền thông tin:

   **Public hostname:**
   - Subdomain: `khoduoc`
   - Domain: `nvdcantho.com`
   - Path: (để trống)

   **Service:**
   - Type: `HTTP`
   - URL: `app:3000`
     > ⚠️ **QUAN TRỌNG**: Dùng `app:3000` vì tunnel container và app container trong cùng network Docker

   **Additional application settings:**
   - (Có thể để mặc định)

4. Click **Save hostname**

### Bước 4: Kiểm tra

Đợi khoảng 30 giây, sau đó truy cập:
```
https://khoduoc.nvdcantho.com
```

## 🔍 Troubleshooting

### Nếu vẫn không truy cập được:

**Check 1: Xem tunnel logs**
```powershell
cd d:\sudungthuoc
docker-compose logs tunnel -f
```

**Check 2: Xem app logs**
```powershell
docker-compose logs app -f
```

**Check 3: Test local**
Mở PowerShell và thử:
```powershell
curl http://localhost:3003
```

**Check 4: Kiểm tra DNS**
```powershell
nslookup khoduoc.nvdcantho.com
```

### Nếu tunnel báo lỗi "dial tcp connection refused":

Nghĩa là tunnel không kết nối được app. Kiểm tra:
1. App container có đang chạy không: `docker ps | Select-String "sudungthuoc"`
2. Service URL trong Cloudflare có đúng là `app:3000` không

### Nếu app báo lỗi database:

Chạy migration và seed:
```powershell
# Migration
docker-compose exec app npx prisma db push

# Seed data
docker-compose exec app npm run db:seed
```

## 📊 Kiểm tra trạng thái containers

```powershell
docker-compose ps
```

Kết quả mong đợi:
```
NAME                  STATUS
sudungthuoc_app       Up xxx seconds (healthy)
sudungthuoc_db        Up xxx seconds (healthy)
sudungthuoc_tunnel    Up xxx seconds
```

## 🎯 Tóm tắt cấu hình cần thiết

| Thông tin | Giá trị |
|-----------|---------|
| Subdomain | `khoduoc` |
| Domain | `nvdcantho.com` |
| Service Type | `HTTP` |
| Service URL | `app:3000` |
| App Port (host) | `3003` |
| DB Port (host) | `5435` |
| Tunnel Status | Running |

---

**Sau khi cấu hình xong, hãy cho tôi biết kết quả!** 🚀
