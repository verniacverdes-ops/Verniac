// =====================================================================
// "Buat Akun" — Manajemen Pengguna (User Management) -> Backend
//
// Sebelumnya UserManagementModal.tsx ("Tambah Pengguna Baru") HANYA
// menyimpan user baru ke state React + localStorage — tidak ada field
// password sama sekali, dan tidak pernah tersambung ke tabel `users` di
// MySQL. Akibatnya, akun yang "dibuat" lewat modal ini TIDAK PERNAH
// bisa dipakai untuk login sungguhan lewat POST /api/auth/login (FASE 7),
// karena baris users-nya memang tidak pernah ada di database.
//
// File ini menyediakan CRUD akun sungguhan:
//   GET    /api/users        daftar semua akun (tanpa password_hash)
//   POST   /api/users        buat akun baru (password WAJIB diisi)
//   PUT    /api/users/:id    ubah data akun (password OPSIONAL —
//                            kosongkan untuk tidak mengubah password)
//   DELETE /api/users/:id    hapus akun
//
// Sesuai src/lib/permissions.ts, HANYA `super_admin` yang punya
// `manageUser: true` — jadi semua endpoint di sini dibatasi ke peran
// itu saja (bukan "admin", yang justru TIDAK berwenang mengelola user
// menurut matriks hak akses aplikasi).
// =====================================================================
import { Router, type Request, type Response } from "express";
import type { Pool, RowDataPacket } from "../config/database";
import crypto from "crypto";
import { hashPassword } from "../config/auth";
import { requireAuth, requireRole } from "../middleware/auth";

const ROLES_CAN_MANAGE_USERS = ["super_admin"];
const VALID_ROLES = new Set(["super_admin", "admin", "arsiparis", "operator", "viewer", "auditor"]);
const MIN_PASSWORD_LENGTH = 8;

interface UserRow extends RowDataPacket {
  id: string;
  username: string;
  name: string;
  email: string;
  role: string;
  unit_kerja: string | null;
  avatar_url: string | null;
  is_active: number;
  last_login_at: string | null;
  created_at: string;
}

// TIDAK PERNAH menyertakan password_hash di response — endpoint ini
// dipakai untuk mengisi tabel manajemen user di UI, bukan untuk
// otentikasi (itu tugas backend/routes/auth.ts).
function rowToPublicUser(row: UserRow) {
  return {
    id: row.id,
    username: row.username,
    name: row.name,
    email: row.email,
    role: row.role,
    unitKerja: row.unit_kerja ?? undefined,
    avatarUrl: row.avatar_url ?? undefined,
    isActive: !!row.is_active,
    lastLoginAt: row.last_login_at ?? undefined,
    createdAt: row.created_at,
  };
}

function friendlyDbError(err: any): string {
  if (err.code === "ER_DUP_ENTRY") {
    return "Username atau email tersebut sudah dipakai oleh akun lain.";
  }
  return "Gagal memproses data pengguna: " + err.message;
}

export function createUsersRouter(pool: Pool): Router {
  const router = Router();

  router.use(requireAuth, requireRole(...ROLES_CAN_MANAGE_USERS));

  // GET /api/users
  router.get("/", async (_req: Request, res: Response) => {
    try {
      const [rows] = await pool.query<UserRow[]>("SELECT * FROM users ORDER BY created_at ASC");
      res.json({ status: "success", total: rows.length, data: rows.map(rowToPublicUser) });
    } catch (err: any) {
      res.status(500).json({ status: "error", message: "Gagal mengambil daftar pengguna: " + err.message });
    }
  });

  // POST /api/users
  router.post("/", async (req: Request, res: Response) => {
    try {
      const { name, username, email, role, unitKerja, avatarUrl, password } = req.body as {
        name?: string; username?: string; email?: string; role?: string;
        unitKerja?: string; avatarUrl?: string; password?: string;
      };

      if (!name?.trim() || !username?.trim() || !email?.trim() || !role) {
        return res.status(400).json({ status: "error", message: "Nama, username, email, dan peran wajib diisi." });
      }
      if (!VALID_ROLES.has(role)) {
        return res.status(400).json({ status: "error", message: `Peran "${role}" tidak dikenal.` });
      }
      if (!password || password.length < MIN_PASSWORD_LENGTH) {
        return res.status(400).json({
          status: "error",
          message: `Kata sandi wajib diisi, minimal ${MIN_PASSWORD_LENGTH} karakter.`,
        });
      }

      const id = crypto.randomUUID();
      const passwordHash = hashPassword(password);

      await pool.query(
        `INSERT INTO users (id, username, password_hash, name, email, role, unit_kerja, avatar_url, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        [id, username.trim().toLowerCase(), passwordHash, name.trim(), email.trim(), role, unitKerja?.trim() || null, avatarUrl || null]
      );

      const [rows] = await pool.query<UserRow[]>("SELECT * FROM users WHERE id = ?", [id]);
      res.status(201).json({
        status: "success",
        message: `Akun "${username}" berhasil dibuat. Kata sandi awal sudah aktif dan bisa langsung dipakai login.`,
        data: rowToPublicUser(rows[0]),
      });
    } catch (err: any) {
      res.status(400).json({ status: "error", message: friendlyDbError(err) });
    }
  });

  // PUT /api/users/:id
  router.put("/:id", async (req: Request, res: Response) => {
    try {
      const { name, username, email, role, unitKerja, avatarUrl, password } = req.body as {
        name?: string; username?: string; email?: string; role?: string;
        unitKerja?: string; avatarUrl?: string; password?: string;
      };

      if (!name?.trim() || !username?.trim() || !email?.trim() || !role) {
        return res.status(400).json({ status: "error", message: "Nama, username, email, dan peran wajib diisi." });
      }
      if (!VALID_ROLES.has(role)) {
        return res.status(400).json({ status: "error", message: `Peran "${role}" tidak dikenal.` });
      }
      // Password OPSIONAL saat edit — kalau field-nya dikosongkan, hash lama
      // TIDAK disentuh. Kalau diisi, wajib memenuhi panjang minimum yang sama
      // dengan pembuatan akun baru supaya tidak ada celah bikin password lemah
      // lewat form edit.
      if (password && password.length < MIN_PASSWORD_LENGTH) {
        return res.status(400).json({
          status: "error",
          message: `Kata sandi baru minimal ${MIN_PASSWORD_LENGTH} karakter. Kosongkan field ini kalau tidak ingin mengubah kata sandi.`,
        });
      }

      const setClauses = [
        "username = ?", "name = ?", "email = ?", "role = ?", "unit_kerja = ?", "avatar_url = ?",
      ];
      const values: any[] = [
        username.trim().toLowerCase(), name.trim(), email.trim(), role, unitKerja?.trim() || null, avatarUrl || null,
      ];

      if (password) {
        setClauses.push("password_hash = ?");
        values.push(hashPassword(password));
      }
      values.push(req.params.id);

      const [result]: any = await pool.query(
        `UPDATE users SET ${setClauses.join(", ")} WHERE id = ?`,
        values
      );
      if (result.affectedRows === 0) {
        return res.status(404).json({ status: "error", message: "Akun pengguna tidak ditemukan." });
      }

      const [rows] = await pool.query<UserRow[]>("SELECT * FROM users WHERE id = ?", [req.params.id]);
      res.json({
        status: "success",
        message: password
          ? "Data akun & kata sandi berhasil diperbarui."
          : "Data akun berhasil diperbarui (kata sandi tidak diubah).",
        data: rowToPublicUser(rows[0]),
      });
    } catch (err: any) {
      res.status(400).json({ status: "error", message: friendlyDbError(err) });
    }
  });

  // DELETE /api/users/:id
  router.delete("/:id", async (req: Request, res: Response) => {
    try {
      // Jangan biarkan admin yang sedang login menghapus akunnya sendiri
      // lewat panel ini — kalau ingin nonaktif, gunakan akun super_admin
      // lain, supaya tidak ada momen "tidak ada satu pun super_admin yang
      // bisa login" akibat salah klik.
      if (req.user?.sub === req.params.id) {
        return res.status(400).json({
          status: "error",
          message: "Tidak bisa menghapus akun yang sedang Anda gunakan untuk login saat ini.",
        });
      }

      const [result]: any = await pool.query("DELETE FROM users WHERE id = ?", [req.params.id]);
      if (result.affectedRows === 0) {
        return res.status(404).json({ status: "error", message: "Akun pengguna tidak ditemukan." });
      }
      res.json({ status: "success", message: "Akun pengguna berhasil dihapus." });
    } catch (err: any) {
      res.status(500).json({ status: "error", message: "Gagal menghapus akun pengguna: " + err.message });
    }
  });

  return router;
}
