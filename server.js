const express = require("express");
const path = require("path");
const db = require("./db");
const auth = require("./auth");
const { createApp, errorHandler } = require("./app-core");

// Toàn bộ route API sống trong app-core.js (dùng chung với bản Cloudflare Workers ở cloudflare/).
// Ở đây chỉ thêm phần riêng cho bản Node/Render: phục vụ file tĩnh (public/) + trang chủ SPA.
// errorHandler phải gắn SAU CÙNG (sau cả static + catch-all) để bắt lỗi từ mọi middleware phía trên.
const app = createApp(db, auth);
app.use(express.static(path.join(__dirname, "public")));
app.use((req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
db.initDb()
  .then(() => {
    app.listen(PORT, () => console.log(`Café Hồng Hoa server đang chạy tại http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error("Không thể khởi tạo database:", err);
    process.exit(1);
  });
