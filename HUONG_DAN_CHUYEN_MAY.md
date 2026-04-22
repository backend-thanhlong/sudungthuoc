# Hướng dẫn chuyển dự án sang máy khác (Localhost)

Tài liệu này hướng dẫn cách di chuyển mã nguồn website sang máy tính mới và chạy hoàn chỉnh.

## 1. Chuẩn bị trên máy mới

Trước khi copy code, hãy đảm bảo máy mới đã cài đặt các phần mềm sau:

1.  **Node.js**: Tải và cài đặt phiên bản mới nhất (LTS) tại [nodejs.org](https://nodejs.org/).
    *   Kiểm tra cài đặt thành công: Mở CMD/Terminal gõ `node -v` và `npm -v`.
2.  **PostgreSQL**: Cần cài đặt cơ sở dữ liệu nếu bạn chạy DB ở local. Tải tại [postgresql.org](https://www.postgresql.org/).
    *   Ghi nhớ **mật khẩu** của user `postgres` khi cài đặt.
3.  **Git** (Khuyến khích): Tải tại [git-scm.com](https://git-scm.com/).

## 2. Copy mã nguồn (Code)

Bạn cần copy thư mục dự án sang máy mới.

**LƯU Ý QUAN TRỌNG:**
KHÔNG copy các thư mục nặng và tự sinh ra sau:
*   `node_modules` (Thư viện tải về - rất nặng)
*   `.next` (File build tạm)
*   `.git` (Nếu bạn không dùng git clone)

Các thư mục/file **BẮT BUỘC** phải có:
*   `src/` (Mã nguồn chính)
*   `public/` (Hình ảnh, tài nguyên)
*   `prisma/` (Cấu trúc dữ liệu)
*   `package.json` & `package-lock.json`
*   `.env` (Chứa cấu hình bảo mật & kết nối DB)
*   `next.config.ts`, `tsconfig.json`, ... (Các file cấu hình ở thư mục gốc)

**Cách làm tốt nhất:** Nén (Zip) toàn bộ thư mục gốc lại, sau đó vào file zip xóa thư mục `node_modules` và `.next` đi để nhẹ file, rồi copy sang máy kia.

## 3. Thiết lập trên máy mới

Sau khi giải nén ở máy mới, làm theo các bước sau trong Terminal/Command Prompt (CMD) tại thư mục dự án:

### Bước 3.1: Cài đặt thư viện
Chạy lệnh:
```bash
npm install
```
Lệnh này sẽ tự động tải `node_modules` dựa trên `package.json`.

### Bước 3.2: Cấu hình Môi trường (.env)
File `.env` chứa thông tin kết nối Database.
Nếu bạn copy file `.env` từ máy cũ sang, hãy mở nó ra và kiểm tra dòng `DATABASE_URL`.

Ví dụ:
```env
DATABASE_URL="postgresql://TEN_USER_DB:MAT_KHAU_CUA_BAN@localhost:5432/TEN_DB?schema=public"
```
*   Nên dùng tài khoản ứng dụng riêng thay vì superuser `postgres`.
*   Đảm bảo `MAT_KHAU_CUA_BAN` đúng với mật khẩu user DB bạn tạo ở máy mới.
*   Đảm bảo `TEN_DB` (ví dụ `sudungthuoc`) là tên database bạn muốn dùng.

### Bước 3.3: Cài đặt Cơ sở dữ liệu (Database)

**Trường hợp 1: Dữ liệu mới hoàn toàn (Chạy từ đầu)**
Chạy lệnh sau để tạo bảng trong Database mới:
```bash
npx prisma migrate dev
```
(Nếu nó hỏi tên migration, cứ đặt tên bất kỳ ví dụ `init`).
Sau đó chạy lệnh seed để có dữ liệu mẫu (nếu dự án có cài sẵn seed):
```bash
npm run db:seed
```

**Trường hợp 2: Muốn giữ nguyên dữ liệu cũ**
Bạn cần backup database ở máy cũ và restore sang máy mới (Thao tác này nâng cao hơn, dùng `pg_dump` và `pg_restore`), hoặc dùng tool như pgAdmin 4 để Backup/Restore.
Nếu không quá quan trọng dữ liệu cũ, hãy dùng **Trường hợp 1** cho nhanh.

## 4. Chạy dự án

Sau khi xong hết, chạy lệnh:

```bash
npm run dev
```

Truy cập `http://localhost:3000` để sử dụng.
