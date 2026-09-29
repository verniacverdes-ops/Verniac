// =====================================================================
// FASE 7: Login & Role -> Backend
//
// Endpoint otentikasi sungguhan: kredensial diverifikasi terhadap
// tabel `users` di MySQL (password di-hash dengan scrypt, lihat
// backend/config/auth.ts), bukan lagi dicocokkan di frontend seperti
// sebelumnya (LoginModal.tsx dulu cuma mencocokkan `username` ke
// DEFAULT_USERS tanpa memeriksa password sama sekali).
//
//   POST /api/auth/register -> { name, username, email, password }
//                               => { user, token } (akun baru, role
//                               dipaksa "viewer" -- lihat catatan di
//                               handler-nya)
//   POST /api/auth/login  -> { username, password }  => { user, token }
//   GET  /api/auth/me     -> (Authorization: Bearer)  => { user }
//   POST /api/auth/logout -> (Authorization: Bearer) mencatat action
//                             LOGOUT ke audit_logs DAN mencabut token
//                             lewat token_blacklist (lihat
//                             backend/middleware/auth.ts) -- bukan lagi
//                             stateless / cuma "buang token di client".
// =====================================================================
import { Router, type Request, type Response } from "express";
import type { Pool, RowDataPacket } from "mysql2/promise";
import crypto from "crypto";
import { signToken, verifyPassword, hashPassword } from "../config/auth";
import { requireAuth } from "../middleware/auth";
import { insertAuditLog } from "./audit";

const MIN_PASSWORD_LENGTH = 8; // sinkron dengan backend/routes/users.ts

export interface UserRow extends RowDataPacket {
  id: string;
  username: string;
  password_hash: string;
  name: string;
  email: string;
  role: string;
  unit_kerja: string | null;
  avatar_url: string | null;
  is_active: number;
}

function rowToPublicUser(row: UserRow) {
  return {
    id: row.id,
    username: row.username,
    name: row.name,
    email: row.email,
    role: row.role,
    unitKerja: row.unit_kerja ?? undefined,
    avatarUrl: row.avatar_url ?? undefined,
  };
}

export function createAuthRouter(pool: Pool): Router {
  const router = Router();

  // -------------------------------------------------------------
  // POST /api/auth/register — "Buat Akun" langsung dari layar Login.
  //
  // SENGAJA publik (tidak ada requireAuth) supaya orang yang belum
  // pernah login pun bisa bikin akun sendiri, TAPI dengan dua pagar
  // pengaman yang tidak boleh dilonggarkan:
  //   1. `role` SELALU dipaksa "viewer" di server, mengabaikan apa pun
  //      yang dikirim client -- kalau tidak, siapa pun bisa daftar
  //      sebagai "super_admin" lewat body request dan langsung punya
  //      akses penuh ke arsip Rahasia/Sangat Rahasia (lihat
  //      src/lib/permissions.ts). Menaikkan peran akun ini adalah
  //      wewenang super_admin lewat panel Manajemen Pengguna
  //      (backend/routes/users.ts), bukan lewat endpoint publik ini.
  //   2. Aturan validasi (panjang password, username/email unik) sama
  //      persis dengan POST /api/users supaya tidak ada celah membuat
  //      akun "lebih lemah" lewat jalur registrasi mandiri ini.
  // -------------------------------------------------------------
  router.post("/register", async (req: Request, res: Response) => {
    try {
      const { name, username, email, password } = req.body as {
        name?: string; username?: string; email?: string; password?: string;
      };

      if (!name?.trim() || !username?.trim() || !email?.trim()) {
        return res.status(400).json({ status: "error", message: "Nama, username, dan email wajib diisi." });
      }
      if (!password || password.length < MIN_PASSWORD_LENGTH) {
        return res.status(400).json({
          status: "error",
          message: `Kata sandi wajib diisi, minimal ${MIN_PASSWORD_LENGTH} karakter.`,
        });
      }

      const id = crypto.randomUUID();
      const passwordHash = hashPassword(password);
      const normalizedUsername = username.trim().toLowerCase();

      try {
        await pool.query(
          `INSERT INTO users (id, username, password_hash, name, email, role, unit_kerja, is_active)
           VALUES (?, ?, ?, ?, ?, 'viewer', NULL, 1)`,
          [id, normalizedUsername, passwordHash, name.trim(), email.trim()]
        );
      } catch (err: any) {
        if (err.code === "ER_DUP_ENTRY") {
          return res.status(409).json({
            status: "error",
            message: "Username atau email tersebut sudah dipakai oleh akun lain.",
          });
        }
        throw err;
      }

      const [rows] = await pool.query<UserRow[]>("SELECT * FROM users WHERE id = ?", [id]);
      const userRow = rows[0];

      const token = signToken({
        sub: userRow.id,
        username: userRow.username,
        role: userRow.role,
        name: userRow.name,
      });

      res.status(201).json({
        status: "success",
        message: `Akun berhasil dibuat sebagai Viewer (hanya lihat & cetak). Hubungi Super Admin untuk peningkatan hak akses.`,
        data: { user: rowToPublicUser(userRow), token },
      });
    } catch (err: any) {
      res.status(500).json({ status: "error", message: "Gagal mendaftarkan akun: " + err.message });
    }
  });

  // -------------------------------------------------------------
  // POST /api/auth/login
  // -------------------------------------------------------------
  router.post("/login", async (req: Request, res: Response) => {
    try {
      const { username, password } = req.body as { username?: string; password?: string };

      if (!username || !password) {
        return res.status(400).json({
          status: "error",
          message: "Username dan kata sandi wajib diisi.",
        });
      }

      const [rows] = await pool.query<UserRow[]>(
        "SELECT * FROM users WHERE username = ? LIMIT 1",
        [username.trim().toLowerCase()]
      );

      const userRow = rows[0];

      // Pesan error sengaja dibuat generik (tidak membedakan "user tidak
      // ada" vs "password salah") supaya tidak membocorkan daftar username
      // yang valid ke penyerang (user enumeration).
      const genericError = {
        status: "error",
        message: "Username atau kata sandi salah.",
      };

      if (!userRow) {
        return res.status(401).json(genericError);
      }

      if (!userRow.is_active) {
        return res.status(403).json({
          status: "error",
          message: "Akun ini telah dinonaktifkan. Hubungi Super Admin.",
        });
      }

      const isValid = verifyPassword(password, userRow.password_hash);
      if (!isValid) {
        return res.status(401).json(genericError);
      }

      const token = signToken({
        sub: userRow.id,
        username: userRow.username,
        role: userRow.role,
        name: userRow.name,
      });

      await pool.query("UPDATE users SET last_login_at = NOW() WHERE id = ?", [userRow.id]);

      res.json({
        status: "success",
        message: `Login berhasil. Selamat datang, ${userRow.name}.`,
        data: {
          user: rowToPublicUser(userRow),
          token,
        },
      });
    } catch (err: any) {
      res.status(500).json({ status: "error", message: "Gagal memproses login: " + err.message });
    }
  });

  // -------------------------------------------------------------
  // GET /api/auth/me — validasi token & ambil data user terkini
  // (dipakai frontend untuk memulihkan sesi saat aplikasi dibuka lagi,
  // supaya kalau role/nama user diubah admin, sesi lama otomatis ikut
  // terbarui alih-alih memakai data basi dari localStorage).
  // -------------------------------------------------------------
  router.get("/me", requireAuth, async (req: Request, res: Response) => {
    try {
      const [rows] = await pool.query<UserRow[]>(
        "SELECT * FROM users WHERE id = ? LIMIT 1",
        [req.user!.sub]
      );
      const userRow = rows[0];

      if (!userRow || !userRow.is_active) {
        return res.status(401).json({ status: "error", message: "Sesi tidak valid. Silakan login ulang." });
      }

      res.json({ status: "success", data: { user: rowToPublicUser(userRow) } });
    } catch (err: any) {
      res.status(500).json({ status: "error", message: "Gagal memverifikasi sesi: " + err.message });
    }
  });

  // -------------------------------------------------------------
  // POST /api/auth/logout
  //
  // Dua hal terjadi dalam SATU request ini (bukan dua request terpisah
  // dari frontend) supaya urutannya terjamin -- audit LOGOUT dicatat
  // DULU pakai token yang masih sah, BARU token itu di-blacklist:
  //   1. Mencatat action "LOGOUT" ke audit_logs (identitas dari
  //      req.user, sama seperti POST /api/audit-logs -- tidak
  //      dipercayakan ke body request).
  //   2. Logout JWT Blacklist: mencatat jti token ini ke
  //      token_blacklist supaya token yang SAMA ditolak oleh
  //      requireAuth/optionalAuth walau tanda tangan & masa
  //      berlakunya (exp) masih sah -- lihat backend/middleware/auth.ts.
  // -------------------------------------------------------------
  router.post("/logout", requireAuth, async (req: Request, res: Response) => {
    try {
      const ip = (req.headers["x-forwarded-for"] as string) || req.ip || "127.0.0.1";

      await insertAuditLog(pool, {
        userName: req.user!.name,
        userRole: req.user!.role,
        action: "LOGOUT",
        itemTarget: "Autentikasi User",
        details: `Pengguna ${req.user!.name} keluar dari sistem`,
        ip,
      });

      await pool.query(
        "INSERT IGNORE INTO token_blacklist (jti, expires_at) VALUES (?, FROM_UNIXTIME(?))",
        [req.user!.jti, req.user!.exp]
      );

      res.json({ status: "success", message: "Sesi telah diakhiri dan token dicabut di server." });
    } catch (err: any) {
      res.status(500).json({ status: "error", message: "Gagal memproses logout: " + err.message });
    }
  });

  return router;
}
