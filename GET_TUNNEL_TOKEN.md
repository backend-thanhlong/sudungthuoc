# HƯỚNG DẪN LẤY TUNNEL TOKEN

## Cách 1: Từ Cloudflare Dashboard (KHUYẾN NGHỊ nếu sử dụng tunnel hiện có)

Nếu bạn đang sử dụng tunnel hiện có cho nvdcantho.com:

### Bước A: Tìm Tunnel hiện tại
1. Vào https://one.dash.cloudflare.com/
2. Networks → Tunnels
3. Click vào tunnel đang chạy `nvdcantho.com`

### Bước B: Lấy Token
1. Vào tab **Configure**
2. Tìm phần **Install and run a connector**
3. Bạn sẽ thấy command dạng:
   ```
   cloudflared service install <TOKEN>
   ```
   hoặc
   ```
   docker run cloudflare/cloudflared:latest tunnel --no-autoupdate run --token <TOKEN>
   ```

4. Copy phần **TOKEN** (chuỗi dài bắt đầu với `eyJ...`)

---

## Cách 2: Tạo Tunnel mới riêng cho ứng dụng này

Nếu bạn muốn tunnel riêng:

### Bước 1: Tạo tunnel mới
1. Vào Networks → Tunnels
2. Click **Create a tunnel**
3. Chọn **Cloudflared**
4. Đặt tên: `sudungthuoc-tunnel`
5. Click **Save tunnel**

### Bước 2: Copy Token
Sau khi tạo xong, màn hình sẽ hiển thị:
```
cloudflared service install eyJ...
```
Copy token (bắt đầu từ `eyJ...` đến hết)

### Bước 3: Cấu hình Public Hostname
1. Skip phần install (vì ta sẽ chạy bằng Docker)
2. Vào tab **Public Hostname**
3. Add hostname:
   - Subdomain: `khoduoc`
   - Domain: `nvdcantho.com`
   - Service: `http://app:3000`

---

## ⚠️ QUAN TRỌNG

**Nếu bạn muốn sử dụng tunnel hiện có** (tunnel đang chạy nvdcantho.com):
- **KHÔNG CẦN** chạy tunnel container trong docker-compose này
- Chỉ cần chạy service `app` và `db`
- Tunnel hiện tại sẽ tự động route traffic từ `khoduoc.nvdcantho.com` → `http://localhost:3003`

**Nếu bạn muốn tunnel riêng** cho ứng dụng này:
- CẦN lấy token từ tunnel mới
- Chạy đầy đủ cả 3 services: app, db, tunnel

---

## 🎯 Quyết định

Bạn muốn:
- **Option A**: Dùng tunnel hiện có (đơn giản hơn, tiết kiệm tài nguyên)
- **Option B**: Tạo tunnel mới riêng (độc lập, dễ quản lý)

Hãy cho tôi biết bạn chọn option nào, sau đó:
- Nếu chọn A: Tôi sẽ chỉnh docker-compose để chỉ chạy app + db
- Nếu chọn B: Bạn cung cấp tunnel token, tôi sẽ setup tunnel container
