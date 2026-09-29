// Koneksi MySQL + mapper baris tabel `arsip` -> ArchiveItem (src/types.ts).
// Skema database ada di: database/daftar-pertelaan-arsip-2026.sql
//
// Catatan (FASE 1 revisi): tabel `arsip` sekarang punya kolom relasional
// tambahan unit_id -> master_unit, kategori_id -> master_kategori, dan
// dus_id -> master_dus (semuanya nullable, FK ON DELETE SET NULL).
// Kolom teks lama (unit_pengolah, kategori_arsip, no_dus) TETAP dipakai
// di bawah ini agar frontend yang sudah ada tidak rusak. rowToArchiveItem()
// belum memetakan unit_id/kategori_id/dus_id ke response JSON — itu
// menyusul di fase berikutnya begitu endpoint master data (FASE 11) siap.
import dotenv from "dotenv";
import mysql, { type RowDataPacket } from "mysql2/promise";
import path from "path";
import { fileURLToPath } from "url";
import type { ArchiveItem } from "../../src/types";

// FASE 2: path .env.local dihitung ABSOLUT dari lokasi file ini
// (backend/config/database.ts -> naik 2 folder -> root project),
// BUKAN relatif ke process.cwd(). Sebelumnya pakai path relatif
// (".env.local") yang cuma kebetulan jalan kalau "npm run dev"
// dieksekusi persis dari root project. Kalau server.ts suatu saat
// dijalankan dari direktori lain (mis. lewat dist/server.cjs hasil
// build, atau dari proses lain yang meng-import file ini), path
// relatif itu akan gagal menemukan .env.local secara diam-diam dan
// semua kredensial DB jatuh ke default hardcoded di bawah.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envLocalPath = path.resolve(__dirname, "..", "..", ".env.local");

const dotenvResult = dotenv.config({
  path: envLocalPath,
});

if (dotenvResult.error) {
  console.warn(
    `[MySQL] Tidak bisa membaca .env.local di "${envLocalPath}" (${dotenvResult.error.message}). ` +
      `Memakai nilai default (host=localhost, user=root, password=kosong, db=daftar-pertelaan-arsip-2026).`
  );
}

// =====================================================================
// Koneksi pool MySQL
// =====================================================================
export const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "daftar-pertelaan-arsip-2026",

  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  dateStrings: true,
});

// FASE 2: nama database yang WAJIB terhubung. Dipakai testConnection()
// untuk memverifikasi pool benar-benar nyambung ke database yang benar,
// bukan cuma "server MySQL menyala".
const EXPECTED_DB_NAME = process.env.DB_NAME || "daftar-pertelaan-arsip-2026";

// Tabel yang dibuat oleh database/daftar-pertelaan-arsip-2026.sql (FASE 1).
// Dipakai testConnection() untuk mendeteksi kalau schema.sql belum diimport.
const REQUIRED_TABLES = [
  "arsip",
  "master_kategori",
  "master_unit",
  "master_gedung",
  "master_ruang",
  "master_rak",
  "master_dus",
  "users", // FASE 7: Login & Role -> Backend
  "audit_logs", // FASE 8: Audit Log -> MySQL
  "token_blacklist", // FASE 7 (revisi): Logout JWT Blacklist
];

// =====================================================================
// FASE 2: Diagnostik koneksi (dipakai testConnection() & /api/db-test)
// =====================================================================

export interface DbConnectionStatus {
  connected: boolean;
  database?: string;
  missingTables: string[];
  error?: string;
}

/**
 * FASE 2: Tes koneksi menyeluruh (bukan sekadar ping).
 * Mengecek 3 hal:
 *   1. Koneksi ke MySQL berhasil dibuka.
 *   2. Nama database aktif (SELECT DATABASE()) sesuai DB_NAME di .env.local.
 *   3. Semua tabel dari database/daftar-pertelaan-arsip-2026.sql sudah ada
 *      (artinya schema.sql sudah diimport, bukan cuma database kosong).
 */
export async function checkDatabaseConnection(): Promise<DbConnectionStatus> {
  try {
    const connection = await pool.getConnection();

    try {
      const [dbRows] = await connection.query<any[]>("SELECT DATABASE() AS db");
      const activeDb = dbRows[0]?.db as string | null;

      const [tableRows] = await connection.query<any[]>("SHOW TABLES");
      const existingTables = new Set(
        tableRows.map((r: any) => Object.values(r)[0] as string)
      );
      const missingTables = REQUIRED_TABLES.filter((t) => !existingTables.has(t));

      if (activeDb !== EXPECTED_DB_NAME) {
        return {
          connected: true,
          database: activeDb ?? undefined,
          missingTables,
          error: `Terhubung ke MySQL, tapi database aktif ("${activeDb}") tidak sama dengan DB_NAME di .env.local ("${EXPECTED_DB_NAME}").`,
        };
      }

      return { connected: true, database: activeDb ?? undefined, missingTables };
    } finally {
      connection.release();
    }
  } catch (error: any) {
    return {
      connected: false,
      missingTables: REQUIRED_TABLES,
      error: error?.message || String(error),
    };
  }
}

export async function testConnection(): Promise<boolean> {
  try {
    const status = await checkDatabaseConnection();

    if (!status.connected) {
      console.error("[MySQL] Koneksi database gagal:", status.error);
      return false;
    }

    if (status.error) {
      // Terhubung, tapi ke database yang salah.
      console.error("[MySQL]", status.error);
      return false;
    }

    if (status.missingTables.length > 0) {
      console.warn(
        `[MySQL] Terhubung ke database "${status.database}", tapi tabel berikut belum ada: ${status.missingTables.join(", ")}.` +
          ` Jalankan "npm run db:init" atau import database/daftar-pertelaan-arsip-2026.sql lewat phpMyAdmin.`
      );
      // Tetap dianggap "tersambung" karena koneksi MySQL-nya sendiri berhasil;
      // yang bermasalah adalah schema-nya belum diimport.
      return true;
    }

    console.log(`[MySQL] Koneksi database berhasil. Database aktif: "${status.database}". Semua tabel FASE 1 terdeteksi.`);
    return true;
  } catch (error) {
    console.error("[MySQL] Koneksi database gagal:", error);
    return false;
  }
}

// =====================================================================
// Mapper: baris tabel `arsip` (snake_case) -> ArchiveItem (camelCase)
// Return type di-annotate eksplisit sebagai ArchiveItem supaya VS Code
// bisa autocomplete & langsung menandai kalau ada field yang salah nama.
// =====================================================================
export function rowToArchiveItem(row: RowDataPacket): ArchiveItem {
  return {
    id: row.id,
    nomorArsipOtomatis: row.nomor_arsip_otomatis ?? undefined,
    nomorKeputusan: row.nomor_keputusan,
    tanggal: row.tanggal,
    perihal: row.perihal,
    uraianArsip: row.uraian_arsip ?? undefined,
    jumlahBerkas: row.jumlah_berkas ?? undefined,
    noDus: row.no_dus,
    lokasiPenyimpanan: row.lokasi_penyimpanan,
    keterangan: row.keterangan ?? undefined,
    // Sumber: kolom teks lama unit_pengolah/kategori_arsip (bukan unit_id/kategori_id).
    unitPengolah: row.unit_pengolah ?? undefined,
    kategoriArsip: row.kategori_arsip ?? undefined,
    klasifikasiAkses: row.klasifikasi_akses ?? undefined,
    statusSirkulasi: row.status_sirkulasi ?? "TERSEDIA",
    peminjamAktif: row.peminjam_aktif ?? undefined,
    tanggalPinjamAktif: row.tanggal_pinjam_aktif ?? undefined,
    tanggalJatuhTempoAktif: row.tanggal_jatuh_tempo_aktif ?? undefined,
    statusRetensi: row.status_retensi ?? undefined,
    tahunRetensiInaktifEnd:
      row.tahun_retensi_inaktif_end ?? undefined,

    pdfAttachment: row.pdf_attachment
      ? typeof row.pdf_attachment === "string"
        ? JSON.parse(row.pdf_attachment)
        : row.pdf_attachment
      : undefined,

    gedungId: row.gedung_id ?? undefined,
    ruangId: row.ruang_id ?? undefined,
    rakId: row.rak_id ?? undefined,
    // FASE 11: Master Data + relasi database — sekarang dipetakan ke
    // response JSON (sebelumnya sengaja dibiarkan kosong menunggu
    // endpoint /api/master siap).
    unitId: row.unit_id ?? undefined,
    kategoriId: row.kategori_id ?? undefined,
    dusId: row.dus_id ?? undefined,

    isDeleted: !!row.is_deleted,
    deletedAt: row.deleted_at ?? undefined,
    deletedBy: row.deleted_by ?? undefined,

    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}