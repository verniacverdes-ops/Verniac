// =====================================================================
// FASE 7: Login & Role -> Backend
//
// Utilitas otentikasi mandiri (TANPA dependency tambahan seperti
// bcrypt/jsonwebtoken) supaya tidak perlu "npm install" ulang di
// lingkungan yang mungkin tidak selalu ada akses internet. Semua
// primitif kriptografi di bawah ini memakai modul bawaan Node.js
// (`crypto`), yang sudah cukup aman untuk kebutuhan sistem internal
// seperti ini:
//
//   - Hash kata sandi : scrypt (Node `crypto.scryptSync`) + salt acak
//                        per user, disimpan sebagai "scrypt$<salt>$<hash>".
//   - Token sesi      : JWT (HS256) buatan sendiri — format & isi
//                        (header.payload.signature, base64url) 100%
//                        kompatibel dengan JWT pada umumnya, hanya saja
//                        di-sign/verifikasi manual dengan HMAC-SHA256
//                        memakai `JWT_SECRET` dari .env.local.
// =====================================================================
import crypto from "crypto";

const SCRYPT_KEYLEN = 64;

// -----------------------------------------------------------------
// JWT secret & masa berlaku token. WAJIB diganti lewat .env.local
// (JWT_SECRET=...) saat dipakai di produksi — nilai default di bawah
// hanya untuk kenyamanan development lokal.
// -----------------------------------------------------------------
const JWT_SECRET =
  process.env.JWT_SECRET ||
  "dev-only-secret-ganti-di-env-local-si-pertelaan-arsip-2026";

if (!process.env.JWT_SECRET) {
  console.warn(
    "[Auth] JWT_SECRET belum diset di .env.local — memakai secret default " +
      "yang TIDAK aman untuk produksi. Tambahkan baris `JWT_SECRET=...` " +
      "(string acak panjang) ke .env.local."
  );
}

const JWT_EXPIRES_IN_SECONDS = Number(process.env.JWT_EXPIRES_IN_SECONDS) || 8 * 60 * 60; // 8 jam

// =====================================================================
// Password hashing (scrypt)
// =====================================================================
export function hashPassword(plainPassword: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = crypto.scryptSync(plainPassword, salt, SCRYPT_KEYLEN);
  return `scrypt$${salt}$${derivedKey.toString("hex")}`;
}

export function verifyPassword(plainPassword: string, storedHash: string): boolean {
  try {
    const [scheme, salt, hashHex] = storedHash.split("$");
    if (scheme !== "scrypt" || !salt || !hashHex) return false;

    const derivedKey = crypto.scryptSync(plainPassword, salt, SCRYPT_KEYLEN);
    const storedBuffer = Buffer.from(hashHex, "hex");

    // Panjang buffer harus sama sebelum timingSafeEqual dipanggil,
    // kalau tidak Node akan throw (bukan return false).
    if (derivedKey.length !== storedBuffer.length) return false;

    return crypto.timingSafeEqual(derivedKey, storedBuffer);
  } catch {
    return false;
  }
}

// =====================================================================
// JWT (HS256) — sign & verify manual
// =====================================================================
export interface AuthTokenPayload {
  sub: string; // user id
  username: string;
  role: string;
  name: string;
  // FASE 7 (revisi, Logout JWT Blacklist): id unik per-token, dibuat
  // sekali saat signToken() dipanggil. Dicatat ke tabel
  // `token_blacklist` saat POST /api/auth/logout supaya token yang
  // SAMA (walau tanda tangan & masa berlakunya masih sah) bisa ditolak
  // lagi oleh requireAuth/optionalAuth setelah user logout -- tanpa
  // jti, server tidak punya cara membedakan token ini dari token lain
  // milik user yang sama.
  jti: string;
  iat: number;
  exp: number;
}

function base64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function base64urlDecode(input: string): Buffer {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/");
  const padLength = (4 - (padded.length % 4)) % 4;
  return Buffer.from(padded + "=".repeat(padLength), "base64");
}

function sign(data: string): string {
  return base64url(crypto.createHmac("sha256", JWT_SECRET).update(data).digest());
}

export function signToken(
  payload: Pick<AuthTokenPayload, "sub" | "username" | "role" | "name">,
  expiresInSeconds: number = JWT_EXPIRES_IN_SECONDS
): string {
  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const fullPayload: AuthTokenPayload = {
    ...payload,
    jti: crypto.randomUUID(),
    iat: now,
    exp: now + expiresInSeconds,
  };

  const encodedHeader = base64url(JSON.stringify(header));
  const encodedPayload = base64url(JSON.stringify(fullPayload));
  const signature = sign(`${encodedHeader}.${encodedPayload}`);

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

export function verifyToken(token: string): AuthTokenPayload | null {
  try {
    const [encodedHeader, encodedPayload, signature] = token.split(".");
    if (!encodedHeader || !encodedPayload || !signature) return null;

    const expectedSignature = sign(`${encodedHeader}.${encodedPayload}`);

    const sigBuf = Buffer.from(signature);
    const expectedBuf = Buffer.from(expectedSignature);
    if (sigBuf.length !== expectedBuf.length) return null;
    if (!crypto.timingSafeEqual(sigBuf, expectedBuf)) return null;

    const payload = JSON.parse(base64urlDecode(encodedPayload).toString("utf8")) as AuthTokenPayload;

    const now = Math.floor(Date.now() / 1000);
    if (typeof payload.exp === "number" && payload.exp < now) return null; // expired

    return payload;
  } catch {
    return null;
  }
}
