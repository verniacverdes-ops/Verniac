// =====================================================================
// FASE 7: Middleware otentikasi & otorisasi berbasis peran (role) untuk
// endpoint Express. Dipakai oleh backend/routes/*.ts.
// =====================================================================
import type { Request, Response, NextFunction } from "express";
import type { RowDataPacket } from "../config/database";
import { verifyToken, type AuthTokenPayload } from "../config/auth";
import { pool } from "../config/database";

// Menambahkan field `user` ke tipe Request Express supaya route handler
// bisa membaca `req.user` dengan aman (typed) setelah middleware ini.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthTokenPayload;
    }
  }
}

/**
 * Mengambil token dari header `Authorization: Bearer <token>`, atau
 * (khusus dipakai untuk endpoint pratinjau dokumen yang di-embed lewat
 * <iframe>, yang tidak bisa menyisipkan header custom) dari query
 * string `?token=...`.
 */
function extractToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (header && header.startsWith("Bearer ")) {
    return header.slice("Bearer ".length).trim();
  }
  if (typeof req.query.token === "string" && req.query.token) {
    return req.query.token;
  }
  return null;
}

// -----------------------------------------------------------------
// Logout JWT Blacklist: JWT pada dasarnya stateless (sah sampai `exp`
// lewat), jadi tanpa ini token yang sudah "dilogout" tetap bisa dipakai
// siapa pun yang sempat menyalinnya sampai 8 jam berikutnya. Setiap
// token punya `jti` unik (backend/config/auth.ts); POST /api/auth/logout
// mencatat jti token yang sedang dipakai ke tabel `token_blacklist`
// (database/daftar-pertelaan-arsip-2026.sql), dan di sinilah jti itu
// dicek pada SETIAP request yang butuh otentikasi.
// -----------------------------------------------------------------
async function isTokenBlacklisted(jti: string): Promise<boolean> {
  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT jti FROM token_blacklist WHERE jti = ? LIMIT 1",
      [jti]
    );
    return rows.length > 0;
  } catch (err) {
    // Kalau tabel token_blacklist belum ada (schema.sql belum diimport
    // ulang / npm run db:init belum dijalankan setelah update ini),
    // JANGAN sampai semua request auth ikut gagal 500 -- anggap saja
    // tidak ada token yang di-blacklist. /api/db-test akan tetap
    // melaporkan tabel yang hilang secara terpisah.
    console.error("[Auth] Gagal mengecek token_blacklist (tabel belum ada?):", (err as Error).message);
    return false;
  }
}

/**
 * Mewajibkan request memiliki token JWT yang valid, belum kedaluwarsa,
 * DAN belum di-logout (lihat isTokenBlacklisted di atas). Kalau valid,
 * `req.user` diisi dengan payload token (id, username, role, name, jti).
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const token = extractToken(req);

    if (!token) {
      return res.status(401).json({
        status: "error",
        message: "Otentikasi wajib. Sertakan header Authorization: Bearer <token>.",
      });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return res.status(401).json({
        status: "error",
        message: "Token tidak valid atau sudah kedaluwarsa. Silakan login ulang.",
      });
    }

    if (await isTokenBlacklisted(payload.jti)) {
      return res.status(401).json({
        status: "error",
        message: "Sesi ini sudah diakhiri (logout). Silakan login ulang.",
      });
    }

    req.user = payload;
    next();
  } catch (err: any) {
    res.status(500).json({ status: "error", message: "Gagal memverifikasi otentikasi: " + err.message });
  }
}

/**
 * Seperti requireAuth, tapi tidak menolak request jika token tidak ada
 * / tidak valid / sudah di-blacklist — hanya mengisi req.user kalau
 * tokennya benar-benar sah. Cocok untuk endpoint publik yang
 * perilakunya sedikit berbeda kalau user login (mis. GET dokumen PDF
 * yang butuh audit "siapa yang membuka").
 */
export async function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const token = extractToken(req);
  if (token) {
    const payload = verifyToken(token);
    if (payload && !(await isTokenBlacklisted(payload.jti))) {
      req.user = payload;
    }
  }
  next();
}

/**
 * Membatasi endpoint hanya untuk peran (role) tertentu. Selalu pasang
 * requireAuth() SEBELUM requireRole(...) di rantai middleware.
 */
export function requireRole(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ status: "error", message: "Otentikasi wajib." });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        status: "error",
        message: `Peran "${req.user.role}" tidak memiliki hak akses untuk aksi ini.`,
      });
    }
    next();
  };
}
