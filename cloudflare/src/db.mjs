// Bản Cloudflare Workers của db.js — cùng "hình dạng" API (query/get/all/run/uid/hashPassword)
// để app-core.js dùng chung được với bản Render, nhưng lấy kết nối Postgres qua Hyperdrive
// thay vì pg.Pool + DATABASE_URL trực tiếp (Workers không mở kết nối TCP dài hạn ở module scope).
//
// Theo hướng dẫn chính thức của Cloudflare: tạo 1 pg.Client MỚI cho mỗi câu truy vấn — Hyperdrive
// đã lo việc pooling kết nối thật ở phía nó, nên việc tạo Client mới là rẻ, không cần tự pool lại.
// https://developers.cloudflare.com/hyperdrive/examples/connect-to-postgres/postgres-drivers-and-libraries/node-postgres/
import { env } from "cloudflare:workers";
import crypto from "node:crypto";
import { Client } from "pg";

/** Chuyển các dấu `?` tuần tự thành $1,$2,... để giữ cách gọi quen thuộc kiểu sqlite (giống db.js). */
async function query(text, params = []) {
  let i = 0;
  const converted = text.replace(/\?/g, () => `$${++i}`);
  const client = new Client({ connectionString: env.HYPERDRIVE.connectionString });
  await client.connect();
  try {
    return await client.query(converted, params);
  } finally {
    await client.end();
  }
}
async function get(text, params = []) {
  const res = await query(text, params);
  return res.rows[0] || null;
}
async function all(text, params = []) {
  const res = await query(text, params);
  return res.rows;
}
async function run(text, params = []) {
  const res = await query(text, params);
  return { changes: res.rowCount };
}

function uid(prefix = "") {
  return prefix + crypto.randomBytes(6).toString("hex");
}
function hashPassword(plain, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto.scryptSync(plain, salt, 64).toString("hex");
  return { hash, salt };
}

export { query, get, all, run, uid, hashPassword };
