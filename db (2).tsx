import mysql from "mysql2/promise";

/**
 * Konfigurasi koneksi MySQL.
 *
 * Gunakan file .env atau .env.local:
 *
 * DB_HOST=localhost
 * DB_PORT=3306
 * DB_USER=root
 * DB_PASSWORD=
 * DB_NAME=daftar-pertelaan-arsip-2026
 */

export const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database:
    process.env.DB_NAME || "daftar-pertelaan-arsip-2026",

  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  dateStrings: true,
});

/**
 * Mengecek koneksi database ketika server dijalankan.
 *
 * Jika MySQL belum aktif, server tidak langsung dimatikan.
 */
export async function testConnection(): Promise<boolean> {
  try {
    const conn = await pool.getConnection();

    await conn.ping();

    conn.release();

    console.log("[MySQL] Koneksi database berhasil.");

    return true;
  } catch (err: any) {
    console.warn(
      "[MySQL] Gagal konek ke database:",
      err.message
    );

    console.warn(
      "[MySQL] Periksa DB_HOST, DB_USER, DB_PASSWORD, dan DB_NAME."
    );

    return false;
  }
}

/**
 * Mapper:
 *
 * Database menggunakan snake_case
 * Frontend menggunakan camelCase
 */
export function rowToArchiveItem(row: any) {
  return {
    id: row.id,

    nomorArsipOtomatis:
      row.nomor_arsip_otomatis ?? undefined,

    nomorKeputusan:
      row.nomor_keputusan,

    tanggal:
      row.tanggal,

    perihal:
      row.perihal,

    uraianArsip:
      row.uraian_arsip ?? undefined,

    jumlahBerkas:
      row.jumlah_berkas ?? undefined,

    noDus:
      row.no_dus,

    lokasiPenyimpanan:
      row.lokasi_penyimpanan,

    keterangan:
      row.keterangan ?? undefined,

    unitPengolah:
      row.unit_pengolah ?? undefined,

    unitId:
      row.unit_id ?? undefined,

    kategoriArsip:
      row.kategori_arsip ?? undefined,

    kategoriId:
      row.kategori_id ?? undefined,

    klasifikasiAkses:
      row.klasifikasi_akses ?? undefined,

    statusSirkulasi:
      row.status_sirkulasi ?? "TERSEDIA",

    peminjamAktif:
      row.peminjam_aktif ?? undefined,

    tanggalPinjamAktif:
      row.tanggal_pinjam_aktif ?? undefined,

    tanggalJatuhTempoAktif:
      row.tanggal_jatuh_tempo_aktif ?? undefined,

    statusRetensi:
      row.status_retensi ?? undefined,

    tahunRetensiInaktifEnd:
      row.tahun_retensi_inaktif_end ?? undefined,

    pdfAttachment:
      row.pdf_attachment
        ? typeof row.pdf_attachment === "string"
          ? JSON.parse(row.pdf_attachment)
          : row.pdf_attachment
        : undefined,

    gedungId:
      row.gedung_id ?? undefined,

    ruangId:
      row.ruang_id ?? undefined,

    rakId:
      row.rak_id ?? undefined,

    isDeleted:
      !!row.is_deleted,

    deletedAt:
      row.deleted_at ?? undefined,

    deletedBy:
      row.deleted_by ?? undefined,

    createdAt:
      row.created_at,

    updatedAt:
      row.updated_at,
  };
}
