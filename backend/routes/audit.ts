// =====================================================================
// FASE 8: Audit Log -> MySQL
//
// Sebelumnya log aktivitas ditampung di array in-memory di server.ts
// (lihat komentar lama di situ: "Audit Log Memory Storage") — artinya
// SEMUA riwayat hilang setiap kali server di-restart/redeploy. File ini
// menggantinya dengan tabel `audit_logs` sungguhan di MySQL (lihat
// database/daftar-pertelaan-arsip-2026.sql), jadi frontend -> API yang
// sudah ada sejak FASE 4/6 sekarang benar-benar tersambung ke
// penyimpanan permanen di kedua ujungnya.
// =====================================================================
import { Router, type Request, type Response } from "express";
import type { Pool, RowDataPacket } from "mysql2/promise";
import { requireAuth } from "../middleware/auth";

interface AuditLogRow extends RowDataPacket {
  id: string;
  timestamp: Date | string;
  user_name: string;
  user_role: string;
  action: string;
  item_target: string | null;
  details: string | null;
  ip_address: string | null;
}

function rowToAuditLog(row: AuditLogRow) {
  return {
    id: row.id,
    timestamp: row.timestamp,
    user: row.user_name,
    role: row.user_role,
    action: row.action,
    itemTarget: row.item_target ?? "-",
    details: row.details ?? "-",
    ip: row.ip_address ?? "-",
  };
}

// Dipakai baik oleh POST /api/audit-logs di bawah maupun langsung oleh
// backend/routes/auth.ts (POST /api/auth/logout) supaya action LOGOUT
// tercatat sebagai bagian dari SATU request logout yang sama -- bukan
// request terpisah dari frontend yang bisa saja gagal/terlambat kalau
// tokennya keburu di-blacklist duluan (lihat komentar di auth.ts).
export async function insertAuditLog(
  pool: Pool,
  entry: {
    userName: string;
    userRole: string;
    action: string;
    itemTarget?: string | null;
    details?: string | null;
    ip?: string | null;
  }
): Promise<string> {
  const id = `log-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  await pool.query(
    `INSERT INTO audit_logs (id, timestamp, user_name, user_role, action, item_target, details, ip_address)
     VALUES (?, NOW(), ?, ?, ?, ?, ?, ?)`,
    [
      id,
      entry.userName,
      entry.userRole,
      entry.action,
      entry.itemTarget ?? null,
      entry.details ?? "-",
      entry.ip ?? "127.0.0.1",
    ]
  );
  return id;
}

export function createAuditRouter(pool: Pool): Router {
  const router = Router();

  // Melihat audit log tetap butuh login (siapa pun yang login boleh
  // melihat, sesuai PERMISSION_MATRIX di src/lib/permissions.ts yang
  // menandai `lihat: true` untuk semua peran) — tapi mencatat log baru
  // dari aksi user yang sedang berjalan juga tetap harus login.
  router.use(requireAuth);

  // GET /api/audit-logs?limit=200
  router.get("/", async (req: Request, res: Response) => {
    try {
      const limitRaw = Number(req.query.limit);
      const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 1000) : 500;

      const [rows] = await pool.query<AuditLogRow[]>(
        "SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT ?",
        [limit]
      );

      res.json({ status: "success", total: rows.length, data: rows.map(rowToAuditLog) });
    } catch (err: any) {
      res.status(500).json({ status: "error", message: "Gagal mengambil audit log: " + err.message });
    }
  });

  // POST /api/audit-logs
  //
  // FIX KEAMANAN: sebelumnya endpoint ini mempercayai `user` dan `role`
  // yang dikirim client di body request (frontend App.tsx memang mengirim
  // nama & peran user yang sedang login, TAPI body request bisa dengan
  // mudah dipalsukan lewat DevTools/curl/Postman oleh siapa pun yang
  // punya token valid). Sekarang identitas pencatat log SELALU diambil
  // dari `req.user` (isi token JWT yang sudah diverifikasi tanda
  // tangannya oleh requireAuth), bukan dari body — supaya audit trail
  // tidak bisa dipalsukan menjadi seolah-olah dilakukan oleh orang lain
  // atau dengan peran yang lebih tinggi dari peran asli pemilik token.
  // Field `user`/`role` yang mungkin masih dikirim client akan diabaikan.
  const VALID_ACTIONS = new Set([
    "LOGIN", "LOGOUT", "TAMBAH", "EDIT", "HAPUS", "RESTORE", "HAPUS_PERMANEN",
    "DOWNLOAD", "EXPORT", "BACKUP", "APPROVAL", "TOLAK", "LIHAT_DOKUMEN",
    "KELOLA_USER", "AKTIVITAS",
  ]);

  router.post("/", async (req: Request, res: Response) => {
    try {
      const { action, details, itemTarget } = req.body as {
        action?: string;
        details?: string;
        itemTarget?: string;
      };

      // req.user dijamin ada karena router.use(requireAuth) di atas.
      const userName = req.user!.name;
      const userRole = req.user!.role;

      const finalAction = action && VALID_ACTIONS.has(action) ? action : "AKTIVITAS";
      const finalDetails = typeof details === "string" ? details.slice(0, 2000) : "-";
      const finalItemTarget = typeof itemTarget === "string" ? itemTarget.slice(0, 255) : null;

      const ip = (req.headers["x-forwarded-for"] as string) || req.ip || "127.0.0.1";

      const id = await insertAuditLog(pool, {
        userName,
        userRole,
        action: finalAction,
        itemTarget: finalItemTarget,
        details: finalDetails,
        ip,
      });

      const [rows] = await pool.query<AuditLogRow[]>("SELECT * FROM audit_logs WHERE id = ?", [id]);

      res.status(201).json({ status: "success", data: rowToAuditLog(rows[0]) });
    } catch (err: any) {
      res.status(500).json({ status: "error", message: "Gagal mencatat audit log: " + err.message });
    }
  });

  return router;
}
