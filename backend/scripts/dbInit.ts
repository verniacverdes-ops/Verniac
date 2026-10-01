// npm run db:init
// Menjalankan database/supabase-schema-dan-data.sql ke database yang ditunjuk
// DATABASE_URL (Supabase atau PostgreSQL lokal). Aman dijalankan berulang:
// semua statement memakai IF NOT EXISTS / ON CONFLICT DO NOTHING.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { pool, runSqlScript, closePool } from "../config/database.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SQL_PATH = path.resolve(__dirname, "..", "..", "database", "supabase-schema-dan-data.sql");

async function main() {
  if (!process.env.DATABASE_URL) {
    console.warn("[db:init] DATABASE_URL belum diisi -> memakai DB_HOST/DB_USER/... atau localhost.");
  }
  const sqlText = fs.readFileSync(SQL_PATH, "utf-8");
  console.log(`[db:init] Menjalankan ${path.basename(SQL_PATH)} ...`);
  await runSqlScript(sqlText);

  const tables = ["master_kategori", "master_unit", "master_gedung", "master_ruang", "master_rak", "master_dus", "users", "arsip"];
  for (const t of tables) {
    const [rows] = await pool.query<any[]>(`SELECT COUNT(*) AS total FROM ${t}`);
    console.log(`[db:init]   ${t}: ${rows[0].total} baris`);
  }
  console.log("[db:init] Selesai. Password akun demo = password123 (WAJIB diganti sebelum produksi).");
}

main()
  .catch((err) => {
    console.error("[db:init] GAGAL:", err.message);
    process.exitCode = 1;
  })
  .finally(() => closePool());
