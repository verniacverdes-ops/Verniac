// =====================================================================
// npm run db:init
//
// server.ts & backend/config/database.ts sudah lama menyarankan
// "Jalankan npm run db:init" kalau tabel belum ada, tapi sebelumnya
// script ini bermasalah / bahkan sempat terduplikasi jadi dua file
// (backend/dbInit.ts dan backend/scripts/dbInit.ts) dengan isi yang
// saling berbeda dan sama-sama punya bug. File INI SATU-SATUNYA yang
// dipakai sekarang (backend/dbInit.ts sudah dihapus).
//
// Yang dilakukan script ini:
//   1. Membuka KONEKSI MENTAH (bukan lewat `pool` di backend/config/database.ts)
//      TANPA menyebut nama database, lalu menjalankan `CREATE DATABASE IF NOT
//      EXISTS` + `USE ...` + semua statement lain dari
//      database/daftar-pertelaan-arsip-2026.sql lewat koneksi itu.
//      Ini WAJIB dilakukan lewat koneksi terpisah: `pool` di
//      backend/config/database.ts sudah dikonfigurasi dengan
//      `database: DB_NAME` sejak awal, jadi kalau database itu belum
//      ada sama sekali, pool tidak akan pernah berhasil connect untuk
//      menjalankan CREATE DATABASE-nya sendiri (ayam-telur).
//   2. Setelah skema selesai dibuat, BARU memakai `pool` (yang sekarang
//      pasti berhasil connect karena database-nya sudah ada) untuk
//      mengecek & mengisi 6 akun demo (satu per peran, dari
//      src/data/initialUsers.ts) kalau tabel `users` masih kosong.
//      Password AWAL semua akun demo adalah "password123" — SAMA
//      PERSIS dengan DEMO_PASSWORD yang dipakai tombol "Simulasi Peran"
//      di src/components/LoginModal.tsx. (Sebelumnya versi lama script
//      ini memakai username sebagai password, yang berarti tombol demo
//      di LoginModal akan selalu gagal login karena mengirim
//      "password123", bukan usernamenya sendiri.) Ini HANYA untuk
//      demo/pengembangan lokal — ganti semua password ini sebelum
//      dipakai di lingkungan produksi sungguhan.
// =====================================================================
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import mysql from "mysql2/promise";
import crypto from "crypto";
import { pool, testConnection } from "../config/database";
import { hashPassword } from "../config/auth"; // BUKAN dari ../middleware/auth — hashPassword ada di config/auth.ts
import { DEFAULT_USERS } from "../../src/data/initialUsers";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// backend/scripts/dbInit.ts -> naik DUA level (scripts -> backend -> root project) -> database/...
const SQL_PATH = path.resolve(__dirname, "..", "..", "database", "daftar-pertelaan-arsip-2026.sql");

const DEMO_PASSWORD = "password123"; // harus SAMA dengan LoginModal.tsx

/**
 * Pisah file .sql jadi statement individual yang siap dieksekusi satu-satu.
 * Skema kita tidak memakai DELIMITER/trigger/stored procedure, jadi split
 * berbasis titik-koma (`;`) sudah cukup — TAPI baris komentar (`-- ...`)
 * harus dibuang dulu SEBELUM di-split, bukan sesudahnya. Kalau dibuang
 * sesudah split, blok yang diawali komentar tapi diikuti statement SQL
 * sungguhan (pola yang sangat umum di file .sql ini, mis. komentar
 * penjelasan tepat di atas tiap CREATE TABLE) akan ikut terbuang utuh
 * satu blok — termasuk CREATE TABLE/INSERT sungguhan di baris
 * berikutnya — karena test lama cuma cek "apakah blok ini DIAWALI
 * komentar", bukan "buang baris komentarnya saja".
 */
function splitStatements(sql: string): string[] {
  const withoutComments = sql
    .split("\n")
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n");

  return withoutComments
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

async function runSchema() {
  const sql = await fs.readFile(SQL_PATH, "utf8");
  const statements = splitStatements(sql);
  console.log(`[db:init] Menjalankan ${statements.length} statement dari ${path.basename(SQL_PATH)}...`);

  // Koneksi mentah TANPA `database` di opsinya — lihat catatan di header
  // file ini soal kenapa `pool` tidak bisa dipakai di sini.
  const bootstrapConnection = await mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    multipleStatements: false,
  });

  try {
    for (const statement of statements) {
      try {
        await bootstrapConnection.query(statement);
      } catch (err: any) {
        // CREATE TABLE pakai IF NOT EXISTS (aman dijalankan berkali-kali),
        // tapi beberapa INSERT seed (mis. baris contoh `arsip`) TIDAK
        // memakai ON DUPLICATE KEY UPDATE. Supaya `npm run db:init` tetap
        // aman dijalankan ulang di database yang sudah terisi (bukan cuma
        // sekali saat instalasi awal), duplicate-key pada statement INSERT
        // dianggap "sudah pernah di-seed sebelumnya" dan dilewati, bukan
        // menghentikan seluruh proses.
        if (err.code === "ER_DUP_ENTRY") {
          console.warn(`[db:init]   (lewati, data sudah ada) ${statement.slice(0, 60).replace(/\s+/g, " ")}...`);
          continue;
        }
        throw err;
      }
    }
    console.log("[db:init] Skema (tabel arsip, master data, users, audit_logs) siap.");
  } finally {
    await bootstrapConnection.end();
  }
}

async function seedDemoUsers() {
  // Dari sini dan seterusnya database sudah pasti ada (baru dibuat oleh
  // runSchema()), jadi aman memakai `pool` yang sudah dikonfigurasi
  // dengan DB_NAME dari .env.local.
  const [rows] = await pool.query<any[]>("SELECT COUNT(*) AS total FROM `users`");
  const total = rows[0]?.total ?? 0;

  if (total > 0) {
    console.log(`[db:init] Tabel users sudah berisi ${total} akun -- lewati seeding demo.`);
    return;
  }

  console.log("[db:init] Tabel users kosong, membuat akun demo (satu per peran)...");
  for (const user of DEFAULT_USERS) {
    const passwordHash = hashPassword(DEMO_PASSWORD); // sinkron, TIDAK perlu await
    await pool.query(
      `INSERT INTO \`users\`
        (id, name, username, email, password_hash, role, unit_kerja, avatar_url, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [
        crypto.randomUUID(),
        user.name,
        user.username,
        user.email,
        passwordHash,
        user.role,
        user.unitKerja ?? null,
        user.avatarUrl ?? null,
      ]
    );
    console.log(`[db:init]   + ${user.username} / ${DEMO_PASSWORD}  (role: ${user.role})`);
  }
  console.log(
    `[db:init] Akun demo dibuat. PENTING: password semua akun demo = "${DEMO_PASSWORD}" -- ` +
      "wajib diganti sebelum sistem ini dipakai dengan data arsip sungguhan."
  );
}

async function main() {
  await runSchema();
  await seedDemoUsers();
  await testConnection();
  await pool.end();
  console.log("[db:init] Selesai.");
}

main().catch((err) => {
  console.error("[db:init] Gagal:", err);
  process.exit(1);
});
