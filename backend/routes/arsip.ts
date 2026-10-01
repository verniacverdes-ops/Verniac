// =====================================================================
// FASE 6/7/9: CRUD arsip + recycle bin + backup + penyimpanan dokumen
// PDF sungguhan (bukan dummy lagi).
//
// File ini memindahkan handler yang sebelumnya ditulis langsung di
// server.ts (FASE 4-6) ke Router terpisah supaya:
//   1. Bisa dipasangi middleware requireAuth/requireRole per-route
//      (FASE 7 — otentikasi & hak akses beneran di backend, bukan cuma
//      di frontend seperti sebelumnya).
//   2. Lampiran PDF (`pdfAttachment`) sekarang BENAR-BENAR disimpan
//      sebagai file di disk (backend/uploads/arsip/<random>.pdf),
//      bukan base64 penuh di kolom JSON `pdf_attachment` — kolom itu
//      sekarang cuma menyimpan metadata (nama asli, ukuran, nama file
//      tersimpan, watermark). Ini juga yang membuat endpoint
//      `/documents/:id.pdf` (FASE 9) berhenti mengembalikan PDF dummy
//      yang sama untuk semua id, dan sebagai gantinya men-stream file
//      asli yang pernah diunggah user.
// =====================================================================
import { Router, type Request, type Response } from "express";
import crypto from "crypto";
import type { Pool, RowDataPacket } from "../config/database";
import { rowToArchiveItem } from "../config/database";
import { optionalAuth, requireAuth, requireRole } from "../middleware/auth";
import type { FileStorage } from "../storage/fileStorage";

const MAX_PDF_BYTES = 15 * 1024 * 1024; // 15MB, sama dengan batas yang ditulis di ArchiveFormModal.tsx

// Jenis lampiran digital yang didukung -- awalnya cuma PDF (FASE 9), sekarang
// diperluas supaya Arsip juga bisa melampirkan berkas Word (.doc/.docx) dan
// Excel (.xls/.xlsx). Setiap entri berisi: ekstensi file tersimpan, dan
// signature byte awal berkas asli (dipakai untuk memastikan isi berkas
// benar-benar cocok dengan tipe yang diklaim, bukan cuma di-rename).
type SupportedMime =
  | "application/pdf"
  | "application/msword"
  | "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  | "application/vnd.ms-excel"
  | "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

const ATTACHMENT_TYPES: Record<SupportedMime, { ext: string; label: string }> = {
  "application/pdf": { ext: "pdf", label: "PDF" },
  "application/msword": { ext: "doc", label: "Word (.doc)" },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": { ext: "docx", label: "Word (.docx)" },
  "application/vnd.ms-excel": { ext: "xls", label: "Excel (.xls)" },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": { ext: "xlsx", label: "Excel (.xlsx)" },
};

// Signature (magic bytes) di awal berkas per format, dicek terhadap isi
// berkas sungguhan (bukan cuma percaya nama file/mime dari client):
//   - PDF                         -> ASCII "%PDF-"
//   - .docx / .xlsx (Office Open XML) -> keduanya file ZIP, mulai dengan "PK"
//   - .doc / .xls (format biner lama) -> keduanya OLE Compound File,
//     signature 8 byte yang sama: D0 CF 11 E0 A1 B1 1A E1
const ZIP_SIGNATURE = Buffer.from([0x50, 0x4b]); // "PK"
const OLE_SIGNATURE = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);

function isValidSignature(mime: SupportedMime, buffer: Buffer): boolean {
  if (mime === "application/pdf") {
    return buffer.subarray(0, 5).toString("ascii") === "%PDF-";
  }
  if (
    mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    mime === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  ) {
    return buffer.subarray(0, 2).equals(ZIP_SIGNATURE);
  }
  // application/msword & application/vnd.ms-excel (format biner lama)
  return buffer.subarray(0, 8).equals(OLE_SIGNATURE);
}

// Peran yang diizinkan menambah/mengubah data arsip (selaras dengan
// PERMISSION_MATRIX.tambah/.edit di src/lib/permissions.ts).
const ROLES_CAN_WRITE = ["super_admin", "admin", "arsiparis", "operator"];
// Peran yang diizinkan menghapus/memulihkan (selaras dengan .hapus/.restore).
const ROLES_CAN_DELETE = ["super_admin", "admin"];
// Peran yang diizinkan mengambil backup penuh (selaras dengan .backup).
const ROLES_CAN_BACKUP = ["super_admin", "admin"];

interface PdfAttachmentInput {
  fileName?: string;
  fileSize?: number;
  fileData?: string; // data URL base64, mis. "data:application/pdf;base64,...."
  uploadedAt?: string;
  watermark?: string;
}

interface StoredPdfMeta {
  fileName: string;
  fileSize: number;
  storedFileName: string;
  mime: SupportedMime;
  uploadedAt: string;
  watermark?: string;
}

/**
 * Menyimpan lampiran digital baru (dikirim frontend sebagai data URL
 * base64) ke disk, lalu mengembalikan metadata yang aman disimpan di
 * kolom `pdf_attachment` (TANPA fileData supaya baris database tidak
 * bengkak). Mendukung PDF, Word (.doc/.docx), dan Excel (.xls/.xlsx).
 * Melempar Error dengan pesan Bahasa Indonesia yang siap ditampilkan ke
 * user kalau validasi gagal.
 */
async function persistPdfAttachment(
  storage: FileStorage,
  input: PdfAttachmentInput
): Promise<StoredPdfMeta> {
  const dataUrl = input.fileData || "";
  const match = /^data:([a-zA-Z0-9.+/-]+);base64,(.+)$/.exec(dataUrl);

  if (!match) {
    throw new Error("Lampiran harus berupa berkas PDF, Word, atau Excel yang valid (data URL base64).");
  }

  const mime = match[1] as SupportedMime;
  const attachmentType = ATTACHMENT_TYPES[mime];
  if (!attachmentType) {
    throw new Error("Tipe berkas tidak didukung. Hanya PDF, Word (.doc/.docx), dan Excel (.xls/.xlsx) yang diizinkan.");
  }

  const buffer = Buffer.from(match[2], "base64");

  if (buffer.length === 0) {
    throw new Error("Berkas lampiran kosong.");
  }
  if (buffer.length > MAX_PDF_BYTES) {
    throw new Error(`Ukuran berkas melebihi batas maksimal ${MAX_PDF_BYTES / (1024 * 1024)}MB.`);
  }
  // Pengecekan signature byte awal mencegah file yang cuma di-rename
  // (mis. .txt diganti jadi .pdf) ikut tersimpan sebagai lampiran resmi.
  if (!isValidSignature(mime, buffer)) {
    throw new Error(`Isi berkas tidak dikenali sebagai ${attachmentType.label} yang valid.`);
  }

  const storedFileName = `${crypto.randomBytes(16).toString("hex")}.${attachmentType.ext}`;
  await storage.save(storedFileName, buffer, mime);

  return {
    fileName: input.fileName || `dokumen.${attachmentType.ext}`,
    fileSize: buffer.length,
    storedFileName,
    mime,
    uploadedAt: input.uploadedAt || new Date().toISOString(),
    watermark: input.watermark,
  };
}

function safeParsePdfMeta(raw: any): StoredPdfMeta | null {
  if (!raw) return null;
  const value = typeof raw === "string" ? JSON.parse(raw) : raw;
  if (!value || typeof value !== "object" || !value.storedFileName) return null;
  return value as StoredPdfMeta;
}

export function createArsipRouter(pool: Pool, storage: FileStorage): Router {
  const router = Router();

  // Semua endpoint di bawah /api/arsip mewajibkan login (FASE 7) —
  // sebelumnya siapa pun bisa memanggil endpoint ini tanpa token sama
  // sekali.
  router.use(requireAuth);

  // GET /api/arsip - Fetch all archives with optional search query
  router.get("/", async (req: Request, res: Response) => {
    try {
      const { search, no_dus, kategori, includeDeleted } = req.query;
      let sql =
        includeDeleted === "1" || includeDeleted === "true"
          ? "SELECT * FROM arsip WHERE 1 = 1"
          : "SELECT * FROM arsip WHERE is_deleted = 0";
      const params: any[] = [];

      if (search && typeof search === "string") {
        sql += " AND (nomor_keputusan ILIKE ? OR perihal ILIKE ? OR no_dus ILIKE ? OR lokasi_penyimpanan ILIKE ?)";
        const q = `%${search}%`;
        params.push(q, q, q, q);
      }

      if (no_dus && typeof no_dus === "string" && no_dus !== "ALL") {
        sql += " AND no_dus = ?";
        params.push(no_dus);
      }

      if (kategori && typeof kategori === "string" && kategori !== "ALL") {
        sql += " AND kategori_arsip = ?";
        params.push(kategori);
      }

      sql += " ORDER BY created_at DESC";

      const [rows] = await pool.query<RowDataPacket[]>(sql, params);
      const results = rows.map(rowToArchiveItem);

      res.json({ status: "success", total: results.length, data: results });
    } catch (err: any) {
      res.status(500).json({ status: "error", message: "Gagal mengambil data arsip: " + err.message });
    }
  });

  // GET /api/arsip/:id
  router.get("/:id", async (req: Request, res: Response) => {
    try {
      const [rows] = await pool.query<RowDataPacket[]>("SELECT * FROM arsip WHERE id = ? LIMIT 1", [
        req.params.id,
      ]);
      if (rows.length === 0) {
        return res.status(404).json({ status: "error", message: "Berkas arsip tidak ditemukan" });
      }
      res.json({ status: "success", data: rowToArchiveItem(rows[0]) });
    } catch (err: any) {
      res.status(500).json({ status: "error", message: "Gagal mengambil data arsip: " + err.message });
    }
  });

  // POST /api/arsip - Create new archive record
  router.post("/", requireRole(...ROLES_CAN_WRITE), async (req: Request, res: Response) => {
    try {
      const {
        nomorKeputusan, tanggal, perihal, uraianArsip, jumlahBerkas, noDus, lokasiPenyimpanan,
        keterangan, unitPengolah, kategoriArsip, klasifikasiAkses, statusRetensi, gedungId, ruangId, rakId,
        unitId, kategoriId, dusId, pdfAttachment,
      } = req.body;

      if (!nomorKeputusan || !perihal || !noDus || !lokasiPenyimpanan) {
        return res.status(400).json({
          status: "error",
          message: "Nomor Keputusan, Perihal, No Dus, dan Lokasi Penyimpanan wajib diisi.",
        });
      }

      let pdfMeta: StoredPdfMeta | null = null;
      if (pdfAttachment && pdfAttachment.fileData) {
        try {
          pdfMeta = await persistPdfAttachment(storage, pdfAttachment);
        } catch (pdfErr: any) {
          return res.status(400).json({ status: "error", message: pdfErr.message });
        }
      }

      const id = `arsip-${Date.now().toString(36)}`;
      const now = new Date().toISOString().slice(0, 19).replace("T", " ");

      await pool.query(
        `INSERT INTO arsip
          (id, nomor_keputusan, tanggal, perihal, uraian_arsip, jumlah_berkas, no_dus, lokasi_penyimpanan,
           keterangan, unit_pengolah, kategori_arsip, klasifikasi_akses, status_retensi, gedung_id, ruang_id, rak_id,
           unit_id, kategori_id, dus_id,
           pdf_attachment, status_sirkulasi, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'TERSEDIA', ?, ?)`,
        [
          id, nomorKeputusan, tanggal || now.slice(0, 10), perihal, uraianArsip || null,
          (jumlahBerkas === undefined || jumlahBerkas === null || jumlahBerkas === "") ? 1 : jumlahBerkas,
          String(noDus).toUpperCase(), lokasiPenyimpanan, keterangan || null, unitPengolah || null,
          kategoriArsip || "Inaktif", klasifikasiAkses || "INTERNAL", statusRetensi || "AKTIF",
          gedungId || null, ruangId || null, rakId || null,
          // FASE 11: unit_id/kategori_id/dus_id — FK nullable ke
          // master_unit/master_kategori/master_dus. Kalau ID yang dikirim
          // tidak valid (sudah dihapus, dsb), MySQL akan menolak insert
          // dengan ER_NO_REFERENCED_ROW_2 dan pesan error yang jelas
          // dikembalikan lewat catch di bawah — bukan gagal diam-diam.
          unitId || null, kategoriId || null, dusId || null,
          pdfMeta ? JSON.stringify(pdfMeta) : null,
          now, now,
        ]
      );

      const [rows] = await pool.query<RowDataPacket[]>("SELECT * FROM arsip WHERE id = ?", [id]);
      res.status(201).json({
        status: "success",
        message: "Data pertelaan arsip berhasil ditambahkan ke database",
        data: rowToArchiveItem(rows[0]),
      });
    } catch (err: any) {
      res.status(500).json({ status: "error", message: "Gagal menyimpan data arsip: " + err.message });
    }
  });

  // PUT /api/arsip/:id - Update existing archive record
  router.put("/:id", requireRole(...ROLES_CAN_WRITE), async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const [existingRows] = await pool.query<RowDataPacket[]>("SELECT * FROM arsip WHERE id = ?", [id]);
      if (existingRows.length === 0) {
        return res.status(404).json({ status: "error", message: "Berkas arsip tidak ditemukan" });
      }
      const existing = existingRows[0];

      const {
        nomorKeputusan, tanggal, perihal, uraianArsip, jumlahBerkas, noDus, lokasiPenyimpanan,
        keterangan, unitPengolah, kategoriArsip, klasifikasiAkses, statusSirkulasi, statusRetensi,
        gedungId, ruangId, rakId, unitId, kategoriId, dusId, pdfAttachment,
      } = req.body;

      // Logika lampiran PDF (FASE 9):
      //   - key `pdfAttachment` tidak dikirim sama sekali  -> biarkan kolom pdf_attachment apa adanya.
      //   - `pdfAttachment: null`                          -> user menghapus lampiran; file lama (kalau
      //                                                         ada) turut dihapus dari disk.
      //   - object berisi `fileData` (base64 baru)         -> simpan file baru, ganti metadata, hapus
      //                                                         file lama dari disk.
      //   - object TANPA `fileData` (metadata lama apa adanya, dikirim balik tanpa diubah) -> tidak
      //                                                         disentuh, dianggap tidak ada perubahan.
      let nextPdfJson: string | null | undefined = undefined; // undefined = jangan ubah kolom ini
      const previousPdfMeta = safeParsePdfMeta(existing.pdf_attachment);

      if (Object.prototype.hasOwnProperty.call(req.body, "pdfAttachment")) {
        if (pdfAttachment === null) {
          nextPdfJson = null;
          if (previousPdfMeta) {
            await storage.remove(previousPdfMeta.storedFileName).catch(() => {}); // file mungkin sudah tidak ada; abaikan
          }
        } else if (pdfAttachment && pdfAttachment.fileData) {
          try {
            const pdfMeta = await persistPdfAttachment(storage, pdfAttachment);
            nextPdfJson = JSON.stringify(pdfMeta);
            if (previousPdfMeta && previousPdfMeta.storedFileName !== pdfMeta.storedFileName) {
              await storage.remove(previousPdfMeta.storedFileName).catch(() => {});
            }
          } catch (pdfErr: any) {
            return res.status(400).json({ status: "error", message: pdfErr.message });
          }
        }
        // else: object tanpa fileData -> nextPdfJson tetap undefined (tidak diubah)
      }

      const now = new Date().toISOString().slice(0, 19).replace("T", " ");

      if (nextPdfJson === undefined) {
        await pool.query(
          `UPDATE arsip SET
            nomor_keputusan = ?, tanggal = ?, perihal = ?, uraian_arsip = ?, jumlah_berkas = ?,
            no_dus = ?, lokasi_penyimpanan = ?, keterangan = ?, unit_pengolah = ?, kategori_arsip = ?,
            klasifikasi_akses = ?, status_sirkulasi = ?, status_retensi = ?, gedung_id = ?, ruang_id = ?, rak_id = ?,
            unit_id = ?, kategori_id = ?, dus_id = ?, updated_at = ?
           WHERE id = ?`,
          [
            nomorKeputusan, tanggal, perihal, uraianArsip || null,
            (jumlahBerkas === undefined || jumlahBerkas === null || jumlahBerkas === "") ? 1 : jumlahBerkas,
            String(noDus).toUpperCase(), lokasiPenyimpanan, keterangan || null, unitPengolah || null,
            kategoriArsip || null, klasifikasiAkses || "INTERNAL", statusSirkulasi || "TERSEDIA", statusRetensi || "AKTIF",
            gedungId || null, ruangId || null, rakId || null,
            unitId || null, kategoriId || null, dusId || null, now, id,
          ]
        );
      } else {
        await pool.query(
          `UPDATE arsip SET
            nomor_keputusan = ?, tanggal = ?, perihal = ?, uraian_arsip = ?, jumlah_berkas = ?,
            no_dus = ?, lokasi_penyimpanan = ?, keterangan = ?, unit_pengolah = ?, kategori_arsip = ?,
            klasifikasi_akses = ?, status_sirkulasi = ?, status_retensi = ?, gedung_id = ?, ruang_id = ?, rak_id = ?,
            unit_id = ?, kategori_id = ?, dus_id = ?,
            pdf_attachment = ?, updated_at = ?
           WHERE id = ?`,
          [
            nomorKeputusan, tanggal, perihal, uraianArsip || null,
            (jumlahBerkas === undefined || jumlahBerkas === null || jumlahBerkas === "") ? 1 : jumlahBerkas,
            String(noDus).toUpperCase(), lokasiPenyimpanan, keterangan || null, unitPengolah || null,
            kategoriArsip || null, klasifikasiAkses || "INTERNAL", statusSirkulasi || "TERSEDIA", statusRetensi || "AKTIF",
            gedungId || null, ruangId || null, rakId || null,
            unitId || null, kategoriId || null, dusId || null,
            nextPdfJson, now, id,
          ]
        );
      }

      const [rows] = await pool.query<RowDataPacket[]>("SELECT * FROM arsip WHERE id = ?", [id]);
      res.json({ status: "success", message: "Data arsip berhasil diperbarui", data: rowToArchiveItem(rows[0]) });
    } catch (err: any) {
      res.status(500).json({ status: "error", message: "Gagal memperbarui data arsip: " + err.message });
    }
  });

  // DELETE /api/arsip/:id - Soft delete (pindah ke recycle bin)
  router.delete("/:id", requireRole(...ROLES_CAN_DELETE), async (req: Request, res: Response) => {
    try {
      const now = new Date().toISOString().slice(0, 19).replace("T", " ");
      const deletedBy = (req.body && req.body.deletedBy) || req.user?.name || "Sistem";
      const [result]: any = await pool.query(
        "UPDATE arsip SET is_deleted = 1, deleted_at = ?, deleted_by = ? WHERE id = ?",
        [now, deletedBy, req.params.id]
      );
      if (result.affectedRows === 0) {
        return res.status(404).json({ status: "error", message: "Berkas arsip tidak ditemukan" });
      }
      res.json({ status: "success", message: "Data arsip dipindahkan ke recycle bin" });
    } catch (err: any) {
      res.status(500).json({ status: "error", message: "Gagal menghapus data arsip: " + err.message });
    }
  });

  // POST /api/arsip/:id/restore
  router.post("/:id/restore", requireRole(...ROLES_CAN_DELETE), async (req: Request, res: Response) => {
    try {
      const [result]: any = await pool.query(
        "UPDATE arsip SET is_deleted = 0, deleted_at = NULL, deleted_by = NULL WHERE id = ?",
        [req.params.id]
      );
      if (result.affectedRows === 0) {
        return res.status(404).json({ status: "error", message: "Berkas arsip tidak ditemukan" });
      }
      res.json({ status: "success", message: "Data arsip berhasil dipulihkan" });
    } catch (err: any) {
      res.status(500).json({ status: "error", message: "Gagal memulihkan data arsip: " + err.message });
    }
  });

  // DELETE /api/arsip/trash/empty - Kosongkan recycle bin
  // (didaftarkan sebelum "/:id/permanent" supaya tidak pernah tertangkap
  // sebagai :id="trash" oleh route di bawahnya — urutan Express penting).
  router.delete("/trash/empty", requireRole(...ROLES_CAN_DELETE), async (_req: Request, res: Response) => {
    try {
      const [toDelete] = await pool.query<RowDataPacket[]>(
        "SELECT pdf_attachment FROM arsip WHERE is_deleted = 1"
      );
      const [result]: any = await pool.query("DELETE FROM arsip WHERE is_deleted = 1");

      // Bersihkan file PDF fisik milik arsip yang dihapus permanen supaya
      // folder uploads/ tidak menumpuk file yatim.
      for (const row of toDelete) {
        const meta = safeParsePdfMeta(row.pdf_attachment);
        if (meta) await storage.remove(meta.storedFileName).catch(() => {});
      }

      res.json({
        status: "success",
        message: `Recycle bin dikosongkan (${result.affectedRows} berkas dihapus permanen).`,
        deletedCount: result.affectedRows,
      });
    } catch (err: any) {
      res.status(500).json({ status: "error", message: "Gagal mengosongkan recycle bin: " + err.message });
    }
  });

  // DELETE /api/arsip/:id/permanent
  router.delete("/:id/permanent", requireRole(...ROLES_CAN_DELETE), async (req: Request, res: Response) => {
    try {
      const [rows] = await pool.query<RowDataPacket[]>("SELECT pdf_attachment FROM arsip WHERE id = ?", [
        req.params.id,
      ]);
      const [result]: any = await pool.query("DELETE FROM arsip WHERE id = ?", [req.params.id]);
      if (result.affectedRows === 0) {
        return res.status(404).json({ status: "error", message: "Berkas arsip tidak ditemukan" });
      }

      const meta = rows[0] ? safeParsePdfMeta(rows[0].pdf_attachment) : null;
      if (meta) await storage.remove(meta.storedFileName).catch(() => {});

      res.json({ status: "success", message: "Data arsip dihapus permanen dari database" });
    } catch (err: any) {
      res.status(500).json({ status: "error", message: "Gagal menghapus permanen data arsip: " + err.message });
    }
  });

  // -------------------------------------------------------------
  // GET /api/arsip/:id/pdf — FASE 9: stream file PDF ASLI yang
  // tersimpan di disk untuk arsip ini (bukan lagi PDF dummy yang sama
  // untuk semua id). 404 kalau arsip belum punya lampiran.
  // -------------------------------------------------------------
  router.get("/:id/pdf", async (req: Request, res: Response) => {
    try {
      const [rows] = await pool.query<RowDataPacket[]>(
        "SELECT pdf_attachment FROM arsip WHERE id = ? LIMIT 1",
        [req.params.id]
      );
      if (rows.length === 0) {
        return res.status(404).json({ status: "error", message: "Berkas arsip tidak ditemukan." });
      }

      const meta = safeParsePdfMeta(rows[0].pdf_attachment);
      if (!meta) {
        return res.status(404).json({ status: "error", message: "Arsip ini belum memiliki lampiran digital." });
      }

      const opened = await storage.open(meta.storedFileName);
      if (!opened) {
        return res.status(404).json({
          status: "error",
          message: "Metadata lampiran ada di database, tapi berkas fisiknya tidak ditemukan di server.",
        });
      }

      // mime disimpan sejak berkas diunggah (lihat persistPdfAttachment di
      // atas). Data lama sebelum fitur multi-format ini selalu PDF, jadi
      // fallback ke application/pdf kalau field mime belum ada.
      res.setHeader("Content-Type", meta.mime || "application/pdf");
      res.setHeader("Content-Disposition", `inline; filename="${meta.fileName.replace(/"/g, "")}"`);
      res.setHeader("Cache-Control", "private, max-age=3600");
      if (opened.size !== undefined) res.setHeader("Content-Length", String(opened.size));
      opened.stream.pipe(res);
    } catch (err: any) {
      res.status(500).json({ status: "error", message: "Gagal mengambil berkas lampiran: " + err.message });
    }
  });

  return router;
}

// GET /api/backup — dipisah dari router /api/arsip supaya tetap di path
// aslinya (/api/backup), persis seperti yang didokumentasikan di
// BackendApiModal.tsx.
export function createBackupRouter(pool: Pool): Router {
  const router = Router();

  router.get("/", requireAuth, requireRole(...ROLES_CAN_BACKUP), async (_req: Request, res: Response) => {
    try {
      const [rows] = await pool.query<RowDataPacket[]>(
        "SELECT * FROM arsip WHERE is_deleted = 0 ORDER BY created_at DESC"
      );
      const archives = rows.map(rowToArchiveItem);
      const backupData = {
        version: "SI-PERTELAAN-ARSIP-2026-v2.0",
        timestamp: new Date().toISOString(),
        database: "PostgreSQL (Supabase)",
        totalArchives: archives.length,
        archives,
      };
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Content-Disposition", `attachment; filename="BACKUP_ARSIP_${Date.now()}.json"`);
      res.send(JSON.stringify(backupData, null, 2));
    } catch (err: any) {
      res.status(500).json({ status: "error", message: "Gagal mengambil data dari database: " + err.message });
    }
  });

  return router;
}

// Dipakai oleh server.ts untuk route publik /documents/:id(.pdf), yang
// sengaja TIDAK di bawah prefix /api/arsip supaya path-nya tetap
// "/documents/:id.pdf" seperti disebut di footer PdfViewerModal.tsx
// ("PRIVATE STORAGE PROXY"). optionalAuth dipakai (bukan requireAuth)
// supaya <iframe src="...?token=..."> tetap bisa membaca token dari
// query string tanpa Express menolaknya sebelum handler ini sempat
// memvalidasi sendiri.
export function createDocumentRouter(pool: Pool, storage: FileStorage): Router {
  const router = Router();

  const handler = async (req: Request, res: Response) => {
    const docId = (req.params.id || "").replace(/\.pdf$/i, "");

    if (!req.user) {
      return res.status(401).json({
        status: "error",
        message: "Otentikasi wajib untuk membuka dokumen ini. Sertakan ?token=<JWT> atau header Authorization.",
      });
    }

    try {
      const [rows] = await pool.query<RowDataPacket[]>(
        "SELECT pdf_attachment FROM arsip WHERE id = ? LIMIT 1",
        [docId]
      );
      const meta = rows[0] ? safeParsePdfMeta(rows[0].pdf_attachment) : null;

      if (!meta) {
        return res.status(404).json({ status: "error", message: "Dokumen lampiran untuk arsip ini tidak ditemukan." });
      }

      const opened = await storage.open(meta.storedFileName);
      if (!opened) {
        return res.status(404).json({ status: "error", message: "Berkas fisik tidak ditemukan di server." });
      }

      res.setHeader("Content-Type", meta.mime || "application/pdf");
      res.setHeader("Content-Disposition", `inline; filename="${meta.fileName.replace(/"/g, "")}"`);
      res.setHeader("Cache-Control", "private, max-age=3600");
      if (opened.size !== undefined) res.setHeader("Content-Length", String(opened.size));
      opened.stream.pipe(res);
    } catch (err: any) {
      res.status(500).json({ status: "error", message: "Gagal mengambil dokumen: " + err.message });
    }
  };

  router.get("/:id.pdf", optionalAuth, handler);
  router.get("/:id", optionalAuth, handler);

  return router;
}
