# Café Hồng Hoa trên Cloudflare Workers (thay cho Render)

Bản này chạy **cùng một database Neon** bạn đang dùng với Render — không cần tạo database mới,
không mất menu/đơn hàng/tài khoản admin đang có. Khác biệt chính so với Render:

- **Không bao giờ "ngủ"** — Cloudflare Workers chạy ở edge, luôn sẵn sàng, không có khái niệm
  "sleep sau 15 phút" như gói free của Render. Khách vào lúc nào cũng nhanh ngay từ lượt đầu.
- Miễn phí: gói Workers Free (100.000 request/ngày) + Hyperdrive (đi kèm sẵn, 100.000 truy vấn
  database/ngày) — dư sức cho một quán nhỏ.
- Route API (`/api/...`) dùng **chung y hệt code** với bản Render (file `../app-core.js`) — mọi
  tính năng (menu, size, topping, đơn hàng, admin...) hoạt động giống hệt nhau, không viết lại gì.

Đã test end-to-end thật (không phải chỉ đọc tài liệu) bằng `wrangler dev` trên Postgres local:
load menu, đăng nhập admin, thêm/xoá size, tạo món, đặt hàng, in bill/tem — tất cả chạy đúng qua
runtime Cloudflare thật (workerd), không phải giả lập.

## 1. Cài công cụ

```bash
cd cloudflare
npm install
```

## 2. Đăng nhập Cloudflare (miễn phí, chỉ cần 1 lần)

```bash
npx wrangler login
```

Trình duyệt sẽ mở ra để bạn đăng nhập/đăng ký tài khoản Cloudflare miễn phí.

## 3. Trỏ Hyperdrive vào đúng database Neon đang dùng

Lấy lại chuỗi kết nối Neon bạn đã dùng cho Render (`DATABASE_URL`, dạng
`postgresql://user:password@host/db?sslmode=require`), rồi chạy:

```bash
npx wrangler hyperdrive create hong-hoa-db --connection-string="<DATABASE_URL của bạn>"
```

Lệnh này in ra một `id` — mở file `wrangler.jsonc`, tìm dòng `"id": "REPLACE_WITH_HYPERDRIVE_ID"`
và thay bằng id vừa nhận được.

> Vì đây là database ĐANG CÓ DỮ LIỆU (menu thật, đơn hàng, tài khoản admin từ Render), bạn
> **không cần** chạy lại bước khởi tạo database — chỉ cần trỏ đúng vào là dùng được ngay.

## 4. (Tuỳ chọn) Chạy thử ở máy bạn trước khi deploy thật

```bash
npx wrangler dev
```

Mở `http://localhost:8787` để thử — dùng đúng database thật ở bước 3 (hoặc thêm dòng
`"localConnectionString"` vào `wrangler.jsonc` để trỏ vào 1 Postgres khác chỉ dùng để thử,
không đụng tới dữ liệu thật).

## 5. Deploy thật

```bash
npx wrangler deploy
```

Sau khoảng 10-20 giây, Wrangler in ra một địa chỉ dạng
`https://cafe-hong-hoa.<tên-bạn>.workers.dev` — đây là link công khai, thay thế cho link
`onrender.com` cũ. Đăng nhập admin bằng đúng tài khoản/mật khẩu đang dùng trên Render (cùng
database).

## 6. Gắn tên miền riêng (tuỳ chọn)

Vào [dash.cloudflare.com](https://dash.cloudflare.com) → **Workers & Pages** → chọn worker
`cafe-hong-hoa` → tab **Settings → Domains & Routes** → **Add** để gắn tên miền riêng (miễn phí,
tên miền cần được quản lý qua Cloudflare DNS).

## 7. Có thể giữ cả Render lẫn Cloudflare song song không?

Được — hai bên dùng chung 1 database nên luôn đồng bộ dữ liệu (đơn hàng đặt ở bên nào cũng vào
cùng 1 chỗ). Khi đã ưng ý với Cloudflare, tắt service trên Render (hoặc để đó làm dự phòng) là
xong, không cần "chuyển" dữ liệu gì cả.

## Cấu trúc

```
cloudflare/
  wrangler.jsonc   # cấu hình Worker: static assets, Hyperdrive binding, nodejs_compat
  package.json     # chỉ có wrangler (CLI deploy), KHÔNG lặp lại express/pg — dùng lại
                    # node_modules ở thư mục cha (../node_modules)
  src/
    worker.mjs     # entry point — bọc app-core.js (route API) bằng httpServerHandler
    db.mjs         # bản Hyperdrive của db.js (Node/pg.Pool) — cùng API get/all/run/uid/hashPassword
    auth.mjs       # bản Hyperdrive của auth.js — logic session giống hệt bản Node
```

File **`../app-core.js`** (route API `/api/...`) và **`../public/`** (giao diện) dùng chung
100% với bản Render — sửa 1 lần, cả 2 nơi deploy đều nhận thay đổi.

## Vài lưu ý kỹ thuật (cho người tò mò / khi cần debug)

- Mỗi câu truy vấn Postgres mở 1 kết nối ngắn qua Hyperdrive rồi đóng lại ngay (theo đúng khuyến
  nghị chính thức của Cloudflare) — Hyperdrive tự pool kết nối thật ở phía nó nên việc này nhanh,
  không cần tối ưu thêm cho quy mô một quán nhỏ.
- Ảnh món tải lên dạng base64 (tối đa 12MB/request) — Workers free plan hỗ trợ request khá lớn,
  nhưng nếu sau này thấy upload ảnh lớn bị chậm/lỗi, có thể cần nén ảnh nhỏ hơn trước khi tải lên.
- File tĩnh (`index.html`, `app.js`, ảnh logo) được Cloudflare phục vụ trực tiếp từ
  `../public/`, không tốn lượt gọi Worker — chỉ `/api/*` mới thật sự chạy vào code.
