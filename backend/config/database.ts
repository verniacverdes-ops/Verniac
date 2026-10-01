// Koneksi PostgreSQL (Supabase) + mapper baris tabel `arsip` -> ArchiveItem.
// Skema database: database/supabase-schema-dan-data.sql
//
// Aplikasi ini awalnya memakai MySQL (mysql2). Supaya semua route lama
// (arsip, auth, users, master, audit) tidak perlu ditulis ulang, file ini
// menyediakan `pool` dengan antarmuka yang sama seperti mysql2:
//   - placeholder `?` otomatis diubah menjadi $1, $2, ...
//   - backtick MySQL dibuang
//   - hasil SELECT  -> [rows, fields]
//   - hasil INSERT/UPDATE/DELETE -> [{ affectedRows }, undefined]
//   - kode error PostgreSQL dipetakan ke kode MySQL yang dipakai route
//     (ER_DUP_ENTRY, ER_NO_REFERENCED_ROW_2, ER_ROW_IS_REFERENCED_2)
import dotenv from "dotenv";
import pg from "pg";
import path from "path";
import { fileURLToPath } from "url";
import type { ArchiveItem } from "../../src/types";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "..", "..", ".env.local") });

// Tipe hasil dibuat sama seperti mysql2 (dateStrings + angka biasa):
pg.types.setTypeParser(1082, (v) => v); // DATE      -> "YYYY-MM-DD"
pg.types.setTypeParser(1114, (v) => v.replace(/\.\d+$/, "")); // TIMESTAMP -> "YYYY-MM-DD HH:MM:SS"
pg.types.setTypeParser(20, (v) => parseInt(v, 10)); // COUNT(*) (bigint) -> number

export type RowDataPacket = Record<string, any>;
export interface Pool {
  query<T = any>(sql: string, params?: any[]): Promise<[T, any]>;
}

const connectionString = process.env.DATABASE_URL;
const isLocal = !connectionString || /(localhost|127\.0\.0\.1)/.test(connectionString);

const rawPool = new pg.Pool(
  connectionString
    ? {
        connectionString,
        // Supabase mewajibkan SSL. Pada koneksi lokal SSL dimatikan.
        ssl: isLocal ? undefined : { rejectUnauthorized: false },
        // Di serverless (Vercel) tiap instance cukup memegang sedikit koneksi.
        max: process.env.VERCEL ? 3 : 10,
      }
    : {
        host: process.env.DB_HOST || "localhost",
        port: Number(process.env.DB_PORT) || 5432,
        user: process.env.DB_USER || "postgres",
        password: process.env.DB_PASSWORD || "",
        database: process.env.DB_NAME || "postgres",
        max: 10,
      }
);

/** `?` -> $1..$n dan buang backtick, dengan melewati isi string literal. */
export function translateSql(sql: string): string {
  let out = "";
  let n = 0;
  let inStr = false;
  for (const ch of sql) {
    if (ch === "'") inStr = !inStr;
    if (!inStr && ch === "`") continue;
    if (!inStr && ch === "?") {
      out += "$" + ++n;
      continue;
    }
    out += ch;
  }
  return out;
}

function mapPgError(err: any) {
  if (!err || !err.code) return err;
  err.pgCode = err.code;
  if (err.code === "23505") err.code = "ER_DUP_ENTRY";
  else if (err.code === "23503") {
    err.code = /still referenced/i.test(err.detail || "") ? "ER_ROW_IS_REFERENCED_2" : "ER_NO_REFERENCED_ROW_2";
  } else if (err.code === "23514") err.code = "ER_CHECK_CONSTRAINT_VIOLATED";
  return err;
}

export const pool: Pool = {
  async query(sql: string, params?: any[]) {
    try {
      const res = await rawPool.query(translateSql(sql), params);
      if (res.command === "SELECT") return [res.rows as any, res.fields];
      return [{ affectedRows: res.rowCount ?? 0, insertId: 0, rows: res.rows } as any, undefined];
    } catch (err) {
      throw mapPgError(err);
    }
  },
};

/** Dipakai script db:init (menjalankan file .sql berisi banyak statement). */
export async function runSqlScript(sqlText: string): Promise<void> {
  await rawPool.query(sqlText);
}

export async function closePool(): Promise<void> {
  await rawPool.end();
}

// Tabel yang dibuat oleh database/supabase-schema-dan-data.sql
const REQUIRED_TABLES = [
  "arsip",
  "master_kategori",
  "master_unit",
  "master_gedung",
  "master_ruang",
  "master_rak",
  "master_dus",
  "users",
  "audit_logs",
  "token_blacklist",
];

export interface DbConnectionStatus {
  connected: boolean;
  database?: string;
  missingTables: string[];
  error?: string;
}

/** Tes koneksi menyeluruh: bisa konek + semua tabel sudah ada. */
export async function checkDatabaseConnection(): Promise<DbConnectionStatus> {
  try {
    const client = await rawPool.connect();
    try {
      const db = (await client.query("SELECT current_database() AS db")).rows[0]?.db as string | undefined;
      const t = await client.query(
        "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"
      );
      const existing = new Set(t.rows.map((r: any) => r.table_name as string));
      return {
        connected: true,
        database: db,
        missingTables: REQUIRED_TABLES.filter((x) => !existing.has(x)),
      };
    } finally {
      client.release();
    }
  } catch (error: any) {
    return { connected: false, missingTables: REQUIRED_TABLES, error: error?.message || String(error) };
  }
}

export async function testConnection(): Promise<boolean> {
  const status = await checkDatabaseConnection();
  if (!status.connected) {
    console.error("[Postgres] Koneksi database gagal:", status.error);
    return false;
  }
  if (status.missingTables.length > 0) {
    console.warn(
      `[Postgres] Terhubung ke "${status.database}", tapi tabel berikut belum ada: ${status.missingTables.join(", ")}. ` +
        `Jalankan "npm run db:init" atau tempel database/supabase-schema-dan-data.sql di Supabase SQL Editor.`
    );
    return true;
  }
  console.log(`[Postgres] Koneksi berhasil. Database aktif: "${status.database}". Semua tabel terdeteksi.`);
  return true;
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