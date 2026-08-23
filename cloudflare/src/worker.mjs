// Entry point cho bản Cloudflare Workers. Dùng lại NGUYÊN VẸN toàn bộ route API từ app-core.js
// (cùng file với bản Render) — chỉ khác "db" (Hyperdrive thay vì pg.Pool trực tiếp) và không cần
// serve file tĩnh/catch-all ở đây vì Workers Static Assets đã lo việc đó (xem wrangler.jsonc:
// run_worker_first chỉ đưa /api/* vào Worker này, mọi request khác Cloudflare tự trả file tĩnh).
import { httpServerHandler } from "cloudflare:node";
import appCorePkg from "../../app-core.js";
import * as db from "./db.mjs";
import * as auth from "./auth.mjs";

const { createApp, errorHandler } = appCorePkg;

const app = createApp(db, auth);
app.use(errorHandler); // gắn sau cùng — không có static/catch-all nào khác cần thêm sau ở bản Workers
app.listen(3000);

export default httpServerHandler({ port: 3000 });
