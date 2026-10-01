// =====================================================================
// FASE 11: Master Data + relasi database
//
// CRUD untuk 6 tabel data master (master_kategori, master_unit,
// master_gedung, master_ruang, master_rak, master_dus) yang sebelumnya
// HANYA hidup di state React + localStorage (App.tsx: setMasterKategori,
// setMasterUnit, dst) — tidak pernah tersambung ke MySQL sama sekali,
// padahal skema tabelnya (dengan relasi berjenjang gedung -> ruang ->
// rak -> dus, dan FK dari `arsip` ke masing-masing master) sudah ada
// sejak database/daftar-pertelaan-arsip-2026.sql.
//
// Endpoint yang disediakan (semua di-mount di /api/master/... lewat
// server.ts):
//   GET    /api/master/:resource          daftar semua baris
//   POST   /api/master/:resource          tambah baris baru
//   PUT    /api/master/:resource/:id      ubah baris
//   DELETE /api/master/:resource/:id      hapus baris
// dengan :resource salah satu dari: kategori, unit, gedung, ruang, rak, dus.
//
// Satu "resource config" generik dipakai untuk keenamnya (bukan 6 blok
// kode CRUD yang nyaris identik) supaya konsisten & lebih mudah dirawat.
// =====================================================================
import { Router, type Request, type Response } from "express";
import type { Pool, RowDataPacket } from "../config/database";
import { requireAuth, requireRole } from "../middleware/auth";

// Peran yang boleh mengubah data master (selaras dengan manajemen data
// referensi — dibatasi lebih ketat daripada CRUD arsip biasa karena
// perubahan di sini berdampak ke semua arsip yang mereferensikannya).
const ROLES_CAN_WRITE_MASTER = ["super_admin", "admin", "arsiparis"];
const ROLES_CAN_DELETE_MASTER = ["super_admin", "admin"];

interface FieldConfig {
  camel: string; // nama field di JSON (request/response)
  column: string; // nama kolom di MySQL
  required?: boolean;
  type?: "string" | "number";
}

interface ResourceConfig {
  key: string; // segmen URL, mis. "kategori"
  table: string; // nama tabel MySQL
  idPrefix: string;
  label: string; // label Bahasa Indonesia untuk pesan error, mis. "kategori arsip"
  fields: FieldConfig[]; // TIDAK termasuk id
  parentField?: string; // camel name dari field FK ke resource lain, mis. "gedungId" untuk master_ruang
}

const RESOURCES: ResourceConfig[] = [
  {
    key: "kategori",
    table: "master_kategori",
    idPrefix: "kat",
    label: "kategori arsip",
    fields: [
      { camel: "kode", column: "kode", required: true },
      { camel: "nama", column: "nama", required: true },
      { camel: "deskripsi", column: "deskripsi" },
      { camel: "masaSimpanTahun", column: "masa_simpan_tahun", type: "number" },
    ],
  },
  {
    key: "unit",
    table: "master_unit",
    idPrefix: "unit",
    label: "unit kerja",
    fields: [
      { camel: "kode", column: "kode", required: true },
      { camel: "namaUnit", column: "nama_unit", required: true },
      { camel: "kepalaUnit", column: "kepala_unit" },
    ],
  },
  {
    key: "gedung",
    table: "master_gedung",
    idPrefix: "gdg",
    label: "gedung",
    fields: [
      { camel: "kode", column: "kode", required: true },
      { camel: "namaGedung", column: "nama_gedung", required: true },
      { camel: "alamat", column: "alamat" },
    ],
  },
  {
    key: "ruang",
    table: "master_ruang",
    idPrefix: "rng",
    label: "ruang",
    parentField: "gedungId",
    fields: [
      { camel: "gedungId", column: "gedung_id", required: true },
      { camel: "kode", column: "kode", required: true },
      { camel: "namaRuang", column: "nama_ruang", required: true },
    ],
  },
  {
    key: "rak",
    table: "master_rak",
    idPrefix: "rak",
    label: "rak",
    parentField: "ruangId",
    fields: [
      { camel: "ruangId", column: "ruang_id", required: true },
      { camel: "kode", column: "kode", required: true },
      { camel: "namaRak", column: "nama_rak", required: true },
      { camel: "kapasitasDus", column: "kapasitas_dus", type: "number" },
    ],
  },
  {
    key: "dus",
    table: "master_dus",
    idPrefix: "dus",
    label: "dus/boks arsip",
    parentField: "rakId",
    fields: [
      { camel: "noDus", column: "no_dus", required: true },
      { camel: "rakId", column: "rak_id", required: true },
      { camel: "kapasitasMaxItem", column: "kapasitas_max_item", type: "number" },
      { camel: "keterangan", column: "keterangan" },
    ],
  },
];

function rowToCamel(row: RowDataPacket, config: ResourceConfig): Record<string, any> {
  const out: Record<string, any> = { id: row.id };
  for (const f of config.fields) {
    out[f.camel] = row[f.column] ?? (f.type === "number" ? 0 : undefined);
  }
  return out;
}

/**
 * Memetakan pesan error MySQL yang umum (constraint unik/FK) ke Bahasa
 * Indonesia yang siap ditampilkan ke user, supaya frontend tidak perlu
 * mem-parsing kode error MySQL sendiri.
 */
function friendlyDbError(err: any, config: ResourceConfig): string {
  if (err.code === "ER_DUP_ENTRY") {
    return `Kode/nomor pada data ${config.label} ini sudah dipakai oleh baris lain. Gunakan kode yang berbeda.`;
  }
  if (err.code === "ER_NO_REFERENCED_ROW_2" || err.code === "ER_NO_REFERENCED_ROW") {
    return `Data induk (${config.parentField || "referensi"}) yang dirujuk tidak ditemukan. Pastikan sudah memilih data yang valid.`;
  }
  if (err.code === "ER_ROW_IS_REFERENCED_2" || err.code === "ER_ROW_IS_REFERENCED") {
    return `Data ${config.label} ini masih dipakai oleh data lain (arsip atau data master turunannya) sehingga tidak bisa dihapus.`;
  }
  return `Gagal memproses data ${config.label}: ${err.message}`;
}

function validateBody(body: any, config: ResourceConfig): string | null {
  for (const f of config.fields) {
    if (f.required && (body[f.camel] === undefined || body[f.camel] === null || body[f.camel] === "")) {
      return `Field "${f.camel}" wajib diisi untuk data ${config.label}.`;
    }
  }
  return null;
}

function buildResourceRouter(pool: Pool, config: ResourceConfig): Router {
  const router = Router();

  // GET /api/master/:resource
  router.get("/", requireAuth, async (_req: Request, res: Response) => {
    try {
      const [rows] = await pool.query<RowDataPacket[]>(`SELECT * FROM \`${config.table}\` ORDER BY created_at ASC`);
      res.json({ status: "success", total: rows.length, data: rows.map((r) => rowToCamel(r, config)) });
    } catch (err: any) {
      res.status(500).json({ status: "error", message: `Gagal mengambil data ${config.label}: ${err.message}` });
    }
  });

  // POST /api/master/:resource
  router.post("/", requireAuth, requireRole(...ROLES_CAN_WRITE_MASTER), async (req: Request, res: Response) => {
    const validationError = validateBody(req.body, config);
    if (validationError) {
      return res.status(400).json({ status: "error", message: validationError });
    }

    const id = `${config.idPrefix}-${Date.now().toString(36)}`;
    const columns = ["id", ...config.fields.map((f) => f.column)];
    const placeholders = columns.map(() => "?").join(", ");
    const values = [id, ...config.fields.map((f) => req.body[f.camel] ?? null)];

    try {
      await pool.query(
        `INSERT INTO \`${config.table}\` (${columns.map((c) => `\`${c}\``).join(", ")}) VALUES (${placeholders})`,
        values
      );
      const [rows] = await pool.query<RowDataPacket[]>(`SELECT * FROM \`${config.table}\` WHERE id = ?`, [id]);
      res.status(201).json({
        status: "success",
        message: `Data ${config.label} berhasil ditambahkan.`,
        data: rowToCamel(rows[0], config),
      });
    } catch (err: any) {
      res.status(400).json({ status: "error", message: friendlyDbError(err, config) });
    }
  });

  // PUT /api/master/:resource/:id
  router.put("/:id", requireAuth, requireRole(...ROLES_CAN_WRITE_MASTER), async (req: Request, res: Response) => {
    const validationError = validateBody(req.body, config);
    if (validationError) {
      return res.status(400).json({ status: "error", message: validationError });
    }

    const assignments = config.fields.map((f) => `\`${f.column}\` = ?`).join(", ");
    const values = [...config.fields.map((f) => req.body[f.camel] ?? null), req.params.id];

    try {
      const [result]: any = await pool.query(
        `UPDATE \`${config.table}\` SET ${assignments} WHERE id = ?`,
        values
      );
      if (result.affectedRows === 0) {
        return res.status(404).json({ status: "error", message: `Data ${config.label} tidak ditemukan.` });
      }
      const [rows] = await pool.query<RowDataPacket[]>(`SELECT * FROM \`${config.table}\` WHERE id = ?`, [req.params.id]);
      res.json({
        status: "success",
        message: `Data ${config.label} berhasil diperbarui.`,
        data: rowToCamel(rows[0], config),
      });
    } catch (err: any) {
      res.status(400).json({ status: "error", message: friendlyDbError(err, config) });
    }
  });

  // DELETE /api/master/:resource/:id
  router.delete("/:id", requireAuth, requireRole(...ROLES_CAN_DELETE_MASTER), async (req: Request, res: Response) => {
    try {
      const [result]: any = await pool.query(`DELETE FROM \`${config.table}\` WHERE id = ?`, [req.params.id]);
      if (result.affectedRows === 0) {
        return res.status(404).json({ status: "error", message: `Data ${config.label} tidak ditemukan.` });
      }
      res.json({ status: "success", message: `Data ${config.label} berhasil dihapus.` });
    } catch (err: any) {
      // Kalau tabel ini punya anak (mis. hapus gedung -> ruang/rak/dus di
      // dalamnya CASCADE terhapus otomatis sesuai skema), MySQL tidak akan
      // menolak; yang bisa ditolak adalah kalau ada baris `arsip` yang
      // masih FK ke sini TANPA ON DELETE SET NULL — skema saat ini semua
      // FK dari arsip sudah SET NULL, jadi error di sini pada praktiknya
      // jarang terjadi, tapi tetap ditangani supaya pesannya jelas.
      res.status(400).json({ status: "error", message: friendlyDbError(err, config) });
    }
  });

  return router;
}

export function createMasterRouter(pool: Pool): Router {
  const router = Router();
  for (const config of RESOURCES) {
    router.use(`/${config.key}`, buildResourceRouter(pool, config));
  }
  return router;
}
