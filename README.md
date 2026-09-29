# Mini E-Commerce REST API 🛒

> **Modular RESTful API** cho nền tảng thương mại điện tử (E-Commerce) được xây dựng bằng **NestJS**, **TypeScript**, **PostgreSQL**, **Prisma ORM**, **JWT Authentication (Multi-device Refresh Tokens)**, **ACID Transactions** và **Socket.io Real-time**.

---

## 🚀 Tính năng nổi bật

- **Kiến trúc Modular NestJS**: Phân tách rõ ràng giữa Controller, Service, Module và DTOs.
- **Authentication & RBAC**:
  - Mã hoá mật khẩu bằng `bcrypt`.
  - Cặp token `access_token` (15m) & `refresh_token` (7d) xoay vòng (Token Rotation).
  - Lưu Refresh Token vào bảng riêng trong PostgreSQL hỗ trợ đăng nhập đa thiết bị (Multi-device), đăng xuất từng thiết bị hoặc tất cả thiết bị.
  - Phân quyền theo vai trò (`Role.CUSTOMER` vs `Role.ADMIN`) bằng Guards.
- **Quản lý Danh mục & Sản phẩm**:
  - Tìm kiếm tương đối đa trường (tên, mô tả).
  - Lọc theo danh mục, khoảng giá, sắp xếp linh hoạt.
  - Phân trang chuẩn metadata.
- **Đặt hàng an toàn với ACID Transactions**:
  - Xử lý qua `prisma.$transaction`.
  - **Chống Race Condition tuyệt đối** (Atomic Check-and-Decrement ở tầng PostgreSQL) khi nhiều khách cùng đặt sản phẩm cuối cùng.
  - Tự động hoàn tồn kho (Restock) khi Admin hủy đơn hàng (`CANCELLED`).
- **Thông báo thời gian thực (Socket.io)**:
  - WebSocket Gateway phát sự kiện `orderCreated` và `orderStatusUpdated` tới Admin và từng khách hàng cụ thể theo Rooms.
- **Tài liệu API Swagger**: Tự động sinh tài liệu OpenAPI tại `/api/docs`.

---

## 🛠️ Công nghệ sử dụng

- **Backend**: NestJS 12, Node.js (v22), TypeScript (ESM)
- **Database & ORM**: PostgreSQL, Prisma ORM
- **Authentication**: Passport.js, JWT, Bcrypt
- **Real-time**: Socket.io
- **Hạ tầng**: Docker, Docker Compose (WSL 2)
- **Testing**: Vitest

---

## 📦 Cài đặt & Khởi chạy

### 1. Yêu cầu môi trường
- Node.js >= 20
- Docker & Docker Compose

### 2. Cài đặt dependencies
```bash
npm install
```

### 3. Cấu hình biến môi trường
Tạo file `.env` từ `.env.example`:
```bash
cp .env.example .env
```

### 4. Khởi động PostgreSQL qua Docker
```bash
docker compose up -d
```

### 5. Chạy Migration & Seed dữ liệu mẫu
```bash
npx prisma migrate dev
npm run seed
```

### 6. Khởi chạy ứng dụng
```bash
# Chế độ phát triển (Development với Hot-reload)
npm run start:dev

# Chế độ Production
npm run build
npm run start:prod
```

---

## 📖 Tài liệu API

Mở trình duyệt và truy cập:
👉 **`http://localhost:3000/api/docs`**

### Tài khoản thử nghiệm (Seed data):
- **Admin**: `admin@ecommerce.com` / Mật khẩu: `123456`
- **Customer**: `son.nguyen@example.com` / Mật khẩu: `123456`
- **Customer**: `mai.tran@example.com` / Mật khẩu: `123456`

---

## ⚡ Kiểm thử Real-time Socket.io

Mở file `test-socket.html` trên trình duyệt để nhận thông báo thời gian thực khi đặt hàng hoặc cập nhật trạng thái đơn!
