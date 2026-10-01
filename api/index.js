// backend/app.ts
import express from "express";
import path3 from "path";
import { fileURLToPath as fileURLToPath2 } from "url";
import "dotenv/config";

// backend/config/database.ts
import dotenv from "dotenv";
import pg from "pg";
import path from "path";
import { fileURLToPath } from "url";
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "..", "..", ".env.local") });
pg.types.setTypeParser(1082, (v) => v);
pg.types.setTypeParser(1114, (v) => v.replace(/\.\d+$/, ""));
pg.types.setTypeParser(20, (v) => parseInt(v, 10));
var connectionString = process.env.DATABASE_URL;
var isLocal = !connectionString || /(localhost|127\.0\.0\.1)/.test(connectionString);
var rawPool = new pg.Pool(
  connectionString ? {
    connectionString,
    // Supabase mewajibkan SSL. Pada koneksi lokal SSL dimatikan.
    ssl: isLocal ? void 0 : { rejectUnauthorized: false },
    // Di serverless (Vercel) tiap instance cukup memegang sedikit koneksi.
    max: process.env.VERCEL ? 3 : 10
  } : {
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT) || 5432,
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "postgres",
    max: 10
  }
);
function translateSql(sql) {
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
function mapPgError(err) {
  if (!err || !err.code) return err;
  err.pgCode = err.code;
  if (err.code === "23505") err.code = "ER_DUP_ENTRY";
  else if (err.code === "23503") {
    err.code = /still referenced/i.test(err.detail || "") ? "ER_ROW_IS_REFERENCED_2" : "ER_NO_REFERENCED_ROW_2";
  } else if (err.code === "23514") err.code = "ER_CHECK_CONSTRAINT_VIOLATED";
  return err;
}
var pool = {
  async query(sql, params) {
    try {
      const res = await rawPool.query(translateSql(sql), params);
      if (res.command === "SELECT") return [res.rows, res.fields];
      return [{ affectedRows: res.rowCount ?? 0, insertId: 0, rows: res.rows }, void 0];
    } catch (err) {
      throw mapPgError(err);
    }
  }
};
var REQUIRED_TABLES = [
  "arsip",
  "master_kategori",
  "master_unit",
  "master_gedung",
  "master_ruang",
  "master_rak",
  "master_dus",
  "users",
  "audit_logs",
  "token_blacklist"
];
async function checkDatabaseConnection() {
  try {
    const client = await rawPool.connect();
    try {
      const db = (await client.query("SELECT current_database() AS db")).rows[0]?.db;
      const t = await client.query(
        "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"
      );
      const existing = new Set(t.rows.map((r) => r.table_name));
      return {
        connected: true,
        database: db,
        missingTables: REQUIRED_TABLES.filter((x) => !existing.has(x))
      };
    } finally {
      client.release();
    }
  } catch (error) {
    return { connected: false, missingTables: REQUIRED_TABLES, error: error?.message || String(error) };
  }
}
function rowToArchiveItem(row) {
  return {
    id: row.id,
    nomorArsipOtomatis: row.nomor_arsip_otomatis ?? void 0,
    nomorKeputusan: row.nomor_keputusan,
    tanggal: row.tanggal,
    perihal: row.perihal,
    uraianArsip: row.uraian_arsip ?? void 0,
    jumlahBerkas: row.jumlah_berkas ?? void 0,
    noDus: row.no_dus,
    lokasiPenyimpanan: row.lokasi_penyimpanan,
    keterangan: row.keterangan ?? void 0,
    // Sumber: kolom teks lama unit_pengolah/kategori_arsip (bukan unit_id/kategori_id).
    unitPengolah: row.unit_pengolah ?? void 0,
    kategoriArsip: row.kategori_arsip ?? void 0,
    klasifikasiAkses: row.klasifikasi_akses ?? void 0,
    statusSirkulasi: row.status_sirkulasi ?? "TERSEDIA",
    peminjamAktif: row.peminjam_aktif ?? void 0,
    tanggalPinjamAktif: row.tanggal_pinjam_aktif ?? void 0,
    tanggalJatuhTempoAktif: row.tanggal_jatuh_tempo_aktif ?? void 0,
    statusRetensi: row.status_retensi ?? void 0,
    tahunRetensiInaktifEnd: row.tahun_retensi_inaktif_end ?? void 0,
    pdfAttachment: row.pdf_attachment ? typeof row.pdf_attachment === "string" ? JSON.parse(row.pdf_attachment) : row.pdf_attachment : void 0,
    gedungId: row.gedung_id ?? void 0,
    ruangId: row.ruang_id ?? void 0,
    rakId: row.rak_id ?? void 0,
    // FASE 11: Master Data + relasi database — sekarang dipetakan ke
    // response JSON (sebelumnya sengaja dibiarkan kosong menunggu
    // endpoint /api/master siap).
    unitId: row.unit_id ?? void 0,
    kategoriId: row.kategori_id ?? void 0,
    dusId: row.dus_id ?? void 0,
    isDeleted: !!row.is_deleted,
    deletedAt: row.deleted_at ?? void 0,
    deletedBy: row.deleted_by ?? void 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

// backend/routes/auth.ts
import { Router as Router2 } from "express";
import crypto2 from "crypto";

// backend/config/auth.ts
import crypto from "crypto";
var SCRYPT_KEYLEN = 64;
var JWT_SECRET = process.env.JWT_SECRET || "dev-only-secret-ganti-di-env-local-si-pertelaan-arsip-2026";
if (!process.env.JWT_SECRET) {
  console.warn(
    "[Auth] JWT_SECRET belum diset di .env.local \u2014 memakai secret default yang TIDAK aman untuk produksi. Tambahkan baris `JWT_SECRET=...` (string acak panjang) ke .env.local."
  );
}
var JWT_EXPIRES_IN_SECONDS = Number(process.env.JWT_EXPIRES_IN_SECONDS) || 8 * 60 * 60;
function hashPassword(plainPassword) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = crypto.scryptSync(plainPassword, salt, SCRYPT_KEYLEN);
  return `scrypt$${salt}$${derivedKey.toString("hex")}`;
}
function verifyPassword(plainPassword, storedHash) {
  try {
    const [scheme, salt, hashHex] = storedHash.split("$");
    if (scheme !== "scrypt" || !salt || !hashHex) return false;
    const derivedKey = crypto.scryptSync(plainPassword, salt, SCRYPT_KEYLEN);
    const storedBuffer = Buffer.from(hashHex, "hex");
    if (derivedKey.length !== storedBuffer.length) return false;
    return crypto.timingSafeEqual(derivedKey, storedBuffer);
  } catch {
    return false;
  }
}
function base64url(input) {
  return Buffer.from(input).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function base64urlDecode(input) {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/");
  const padLength = (4 - padded.length % 4) % 4;
  return Buffer.from(padded + "=".repeat(padLength), "base64");
}
function sign(data) {
  return base64url(crypto.createHmac("sha256", JWT_SECRET).update(data).digest());
}
function signToken(payload, expiresInSeconds = JWT_EXPIRES_IN_SECONDS) {
  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1e3);
  const fullPayload = {
    ...payload,
    jti: crypto.randomUUID(),
    iat: now,
    exp: now + expiresInSeconds
  };
  const encodedHeader = base64url(JSON.stringify(header));
  const encodedPayload = base64url(JSON.stringify(fullPayload));
  const signature = sign(`${encodedHeader}.${encodedPayload}`);
  return `${encodedHeader}.${encodedPayload}.${signature}`;
}
function verifyToken(token) {
  try {
    const [encodedHeader, encodedPayload, signature] = token.split(".");
    if (!encodedHeader || !encodedPayload || !signature) return null;
    const expectedSignature = sign(`${encodedHeader}.${encodedPayload}`);
    const sigBuf = Buffer.from(signature);
    const expectedBuf = Buffer.from(expectedSignature);
    if (sigBuf.length !== expectedBuf.length) return null;
    if (!crypto.timingSafeEqual(sigBuf, expectedBuf)) return null;
    const payload = JSON.parse(base64urlDecode(encodedPayload).toString("utf8"));
    const now = Math.floor(Date.now() / 1e3);
    if (typeof payload.exp === "number" && payload.exp < now) return null;
    return payload;
  } catch {
    return null;
  }
}

// backend/middleware/auth.ts
function extractToken(req) {
  const header = req.headers.authorization;
  if (header && header.startsWith("Bearer ")) {
    return header.slice("Bearer ".length).trim();
  }
  if (typeof req.query.token === "string" && req.query.token) {
    return req.query.token;
  }
  return null;
}
async function isTokenBlacklisted(jti) {
  try {
    const [rows] = await pool.query(
      "SELECT jti FROM token_blacklist WHERE jti = ? LIMIT 1",
      [jti]
    );
    return rows.length > 0;
  } catch (err) {
    console.error("[Auth] Gagal mengecek token_blacklist (tabel belum ada?):", err.message);
    return false;
  }
}
async function requireAuth(req, res, next) {
  try {
    const token = extractToken(req);
    if (!token) {
      return res.status(401).json({
        status: "error",
        message: "Otentikasi wajib. Sertakan header Authorization: Bearer <token>."
      });
    }
    const payload = verifyToken(token);
    if (!payload) {
      return res.status(401).json({
        status: "error",
        message: "Token tidak valid atau sudah kedaluwarsa. Silakan login ulang."
      });
    }
    if (await isTokenBlacklisted(payload.jti)) {
      return res.status(401).json({
        status: "error",
        message: "Sesi ini sudah diakhiri (logout). Silakan login ulang."
      });
    }
    req.user = payload;
    next();
  } catch (err) {
    res.status(500).json({ status: "error", message: "Gagal memverifikasi otentikasi: " + err.message });
  }
}
async function optionalAuth(req, _res, next) {
  const token = extractToken(req);
  if (token) {
    const payload = verifyToken(token);
    if (payload && !await isTokenBlacklisted(payload.jti)) {
      req.user = payload;
    }
  }
  next();
}
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ status: "error", message: "Otentikasi wajib." });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        status: "error",
        message: `Peran "${req.user.role}" tidak memiliki hak akses untuk aksi ini.`
      });
    }
    next();
  };
}

// backend/routes/audit.ts
import { Router } from "express";
function rowToAuditLog(row) {
  return {
    id: row.id,
    timestamp: row.timestamp,
    user: row.user_name,
    role: row.user_role,
    action: row.action,
    itemTarget: row.item_target ?? "-",
    details: row.details ?? "-",
    ip: row.ip_address ?? "-"
  };
}
async function insertAuditLog(pool2, entry) {
  const id = `log-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  await pool2.query(
    `INSERT INTO audit_logs (id, timestamp, user_name, user_role, action, item_target, details, ip_address)
     VALUES (?, NOW(), ?, ?, ?, ?, ?, ?)`,
    [
      id,
      entry.userName,
      entry.userRole,
      entry.action,
      entry.itemTarget ?? null,
      entry.details ?? "-",
      entry.ip ?? "127.0.0.1"
    ]
  );
  return id;
}
function createAuditRouter(pool2) {
  const router = Router();
  router.use(requireAuth);
  router.get("/", async (req, res) => {
    try {
      const limitRaw = Number(req.query.limit);
      const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 1e3) : 500;
      const [rows] = await pool2.query(
        "SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT ?",
        [limit]
      );
      res.json({ status: "success", total: rows.length, data: rows.map(rowToAuditLog) });
    } catch (err) {
      res.status(500).json({ status: "error", message: "Gagal mengambil audit log: " + err.message });
    }
  });
  const VALID_ACTIONS = /* @__PURE__ */ new Set([
    "LOGIN",
    "LOGOUT",
    "TAMBAH",
    "EDIT",
    "HAPUS",
    "RESTORE",
    "HAPUS_PERMANEN",
    "DOWNLOAD",
    "EXPORT",
    "BACKUP",
    "APPROVAL",
    "TOLAK",
    "LIHAT_DOKUMEN",
    "KELOLA_USER",
    "AKTIVITAS"
  ]);
  router.post("/", async (req, res) => {
    try {
      const { action, details, itemTarget } = req.body;
      const userName = req.user.name;
      const userRole = req.user.role;
      const finalAction = action && VALID_ACTIONS.has(action) ? action : "AKTIVITAS";
      const finalDetails = typeof details === "string" ? details.slice(0, 2e3) : "-";
      const finalItemTarget = typeof itemTarget === "string" ? itemTarget.slice(0, 255) : null;
      const ip = req.headers["x-forwarded-for"] || req.ip || "127.0.0.1";
      const id = await insertAuditLog(pool2, {
        userName,
        userRole,
        action: finalAction,
        itemTarget: finalItemTarget,
        details: finalDetails,
        ip
      });
      const [rows] = await pool2.query("SELECT * FROM audit_logs WHERE id = ?", [id]);
      res.status(201).json({ status: "success", data: rowToAuditLog(rows[0]) });
    } catch (err) {
      res.status(500).json({ status: "error", message: "Gagal mencatat audit log: " + err.message });
    }
  });
  return router;
}

// backend/routes/auth.ts
var MIN_PASSWORD_LENGTH = 8;
function rowToPublicUser(row) {
  return {
    id: row.id,
    username: row.username,
    name: row.name,
    email: row.email,
    role: row.role,
    unitKerja: row.unit_kerja ?? void 0,
    avatarUrl: row.avatar_url ?? void 0
  };
}
function createAuthRouter(pool2) {
  const router = Router2();
  router.post("/register", async (req, res) => {
    try {
      const { name, username, email, password } = req.body;
      if (!name?.trim() || !username?.trim() || !email?.trim()) {
        return res.status(400).json({ status: "error", message: "Nama, username, dan email wajib diisi." });
      }
      if (!password || password.length < MIN_PASSWORD_LENGTH) {
        return res.status(400).json({
          status: "error",
          message: `Kata sandi wajib diisi, minimal ${MIN_PASSWORD_LENGTH} karakter.`
        });
      }
      const id = crypto2.randomUUID();
      const passwordHash = hashPassword(password);
      const normalizedUsername = username.trim().toLowerCase();
      try {
        await pool2.query(
          `INSERT INTO users (id, username, password_hash, name, email, role, unit_kerja, is_active)
           VALUES (?, ?, ?, ?, ?, 'viewer', NULL, 1)`,
          [id, normalizedUsername, passwordHash, name.trim(), email.trim()]
        );
      } catch (err) {
        if (err.code === "ER_DUP_ENTRY") {
          return res.status(409).json({
            status: "error",
            message: "Username atau email tersebut sudah dipakai oleh akun lain."
          });
        }
        throw err;
      }
      const [rows] = await pool2.query("SELECT * FROM users WHERE id = ?", [id]);
      const userRow = rows[0];
      const token = signToken({
        sub: userRow.id,
        username: userRow.username,
        role: userRow.role,
        name: userRow.name
      });
      res.status(201).json({
        status: "success",
        message: `Akun berhasil dibuat sebagai Viewer (hanya lihat & cetak). Hubungi Super Admin untuk peningkatan hak akses.`,
        data: { user: rowToPublicUser(userRow), token }
      });
    } catch (err) {
      res.status(500).json({ status: "error", message: "Gagal mendaftarkan akun: " + err.message });
    }
  });
  router.post("/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({
          status: "error",
          message: "Username dan kata sandi wajib diisi."
        });
      }
      const [rows] = await pool2.query(
        "SELECT * FROM users WHERE username = ? LIMIT 1",
        [username.trim().toLowerCase()]
      );
      const userRow = rows[0];
      const genericError = {
        status: "error",
        message: "Username atau kata sandi salah."
      };
      if (!userRow) {
        return res.status(401).json(genericError);
      }
      if (!userRow.is_active) {
        return res.status(403).json({
          status: "error",
          message: "Akun ini telah dinonaktifkan. Hubungi Super Admin."
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
        name: userRow.name
      });
      await pool2.query("UPDATE users SET last_login_at = NOW() WHERE id = ?", [userRow.id]);
      res.json({
        status: "success",
        message: `Login berhasil. Selamat datang, ${userRow.name}.`,
        data: {
          user: rowToPublicUser(userRow),
          token
        }
      });
    } catch (err) {
      res.status(500).json({ status: "error", message: "Gagal memproses login: " + err.message });
    }
  });
  router.get("/me", requireAuth, async (req, res) => {
    try {
      const [rows] = await pool2.query(
        "SELECT * FROM users WHERE id = ? LIMIT 1",
        [req.user.sub]
      );
      const userRow = rows[0];
      if (!userRow || !userRow.is_active) {
        return res.status(401).json({ status: "error", message: "Sesi tidak valid. Silakan login ulang." });
      }
      res.json({ status: "success", data: { user: rowToPublicUser(userRow) } });
    } catch (err) {
      res.status(500).json({ status: "error", message: "Gagal memverifikasi sesi: " + err.message });
    }
  });
  router.post("/logout", requireAuth, async (req, res) => {
    try {
      const ip = req.headers["x-forwarded-for"] || req.ip || "127.0.0.1";
      await insertAuditLog(pool2, {
        userName: req.user.name,
        userRole: req.user.role,
        action: "LOGOUT",
        itemTarget: "Autentikasi User",
        details: `Pengguna ${req.user.name} keluar dari sistem`,
        ip
      });
      await pool2.query(
        "INSERT INTO token_blacklist (jti, expires_at) VALUES (?, to_timestamp(?) AT TIME ZONE 'UTC') ON CONFLICT (jti) DO NOTHING",
        [req.user.jti, req.user.exp]
      );
      res.json({ status: "success", message: "Sesi telah diakhiri dan token dicabut di server." });
    } catch (err) {
      res.status(500).json({ status: "error", message: "Gagal memproses logout: " + err.message });
    }
  });
  return router;
}

// backend/routes/arsip.ts
import { Router as Router3 } from "express";
import crypto3 from "crypto";
var MAX_PDF_BYTES = 15 * 1024 * 1024;
var ATTACHMENT_TYPES = {
  "application/pdf": { ext: "pdf", label: "PDF" },
  "application/msword": { ext: "doc", label: "Word (.doc)" },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": { ext: "docx", label: "Word (.docx)" },
  "application/vnd.ms-excel": { ext: "xls", label: "Excel (.xls)" },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": { ext: "xlsx", label: "Excel (.xlsx)" }
};
var ZIP_SIGNATURE = Buffer.from([80, 75]);
var OLE_SIGNATURE = Buffer.from([208, 207, 17, 224, 161, 177, 26, 225]);
function isValidSignature(mime, buffer) {
  if (mime === "application/pdf") {
    return buffer.subarray(0, 5).toString("ascii") === "%PDF-";
  }
  if (mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || mime === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") {
    return buffer.subarray(0, 2).equals(ZIP_SIGNATURE);
  }
  return buffer.subarray(0, 8).equals(OLE_SIGNATURE);
}
var ROLES_CAN_WRITE = ["super_admin", "admin", "arsiparis", "operator"];
var ROLES_CAN_DELETE = ["super_admin", "admin"];
var ROLES_CAN_BACKUP = ["super_admin", "admin"];
async function persistPdfAttachment(storage, input) {
  const dataUrl = input.fileData || "";
  const match = /^data:([a-zA-Z0-9.+/-]+);base64,(.+)$/.exec(dataUrl);
  if (!match) {
    throw new Error("Lampiran harus berupa berkas PDF, Word, atau Excel yang valid (data URL base64).");
  }
  const mime = match[1];
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
  if (!isValidSignature(mime, buffer)) {
    throw new Error(`Isi berkas tidak dikenali sebagai ${attachmentType.label} yang valid.`);
  }
  const storedFileName = `${crypto3.randomBytes(16).toString("hex")}.${attachmentType.ext}`;
  await storage.save(storedFileName, buffer, mime);
  return {
    fileName: input.fileName || `dokumen.${attachmentType.ext}`,
    fileSize: buffer.length,
    storedFileName,
    mime,
    uploadedAt: input.uploadedAt || (/* @__PURE__ */ new Date()).toISOString(),
    watermark: input.watermark
  };
}
function safeParsePdfMeta(raw) {
  if (!raw) return null;
  const value = typeof raw === "string" ? JSON.parse(raw) : raw;
  if (!value || typeof value !== "object" || !value.storedFileName) return null;
  return value;
}
function createArsipRouter(pool2, storage) {
  const router = Router3();
  router.use(requireAuth);
  router.get("/", async (req, res) => {
    try {
      const { search, no_dus, kategori, includeDeleted } = req.query;
      let sql = includeDeleted === "1" || includeDeleted === "true" ? "SELECT * FROM arsip WHERE 1 = 1" : "SELECT * FROM arsip WHERE is_deleted = 0";
      const params = [];
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
      const [rows] = await pool2.query(sql, params);
      const results = rows.map(rowToArchiveItem);
      res.json({ status: "success", total: results.length, data: results });
    } catch (err) {
      res.status(500).json({ status: "error", message: "Gagal mengambil data arsip: " + err.message });
    }
  });
  router.get("/:id", async (req, res) => {
    try {
      const [rows] = await pool2.query("SELECT * FROM arsip WHERE id = ? LIMIT 1", [
        req.params.id
      ]);
      if (rows.length === 0) {
        return res.status(404).json({ status: "error", message: "Berkas arsip tidak ditemukan" });
      }
      res.json({ status: "success", data: rowToArchiveItem(rows[0]) });
    } catch (err) {
      res.status(500).json({ status: "error", message: "Gagal mengambil data arsip: " + err.message });
    }
  });
  router.post("/", requireRole(...ROLES_CAN_WRITE), async (req, res) => {
    try {
      const {
        nomorKeputusan,
        tanggal,
        perihal,
        uraianArsip,
        jumlahBerkas,
        noDus,
        lokasiPenyimpanan,
        keterangan,
        unitPengolah,
        kategoriArsip,
        klasifikasiAkses,
        statusRetensi,
        gedungId,
        ruangId,
        rakId,
        unitId,
        kategoriId,
        dusId,
        pdfAttachment
      } = req.body;
      if (!nomorKeputusan || !perihal || !noDus || !lokasiPenyimpanan) {
        return res.status(400).json({
          status: "error",
          message: "Nomor Keputusan, Perihal, No Dus, dan Lokasi Penyimpanan wajib diisi."
        });
      }
      let pdfMeta = null;
      if (pdfAttachment && pdfAttachment.fileData) {
        try {
          pdfMeta = await persistPdfAttachment(storage, pdfAttachment);
        } catch (pdfErr) {
          return res.status(400).json({ status: "error", message: pdfErr.message });
        }
      }
      const id = `arsip-${Date.now().toString(36)}`;
      const now = (/* @__PURE__ */ new Date()).toISOString().slice(0, 19).replace("T", " ");
      await pool2.query(
        `INSERT INTO arsip
          (id, nomor_keputusan, tanggal, perihal, uraian_arsip, jumlah_berkas, no_dus, lokasi_penyimpanan,
           keterangan, unit_pengolah, kategori_arsip, klasifikasi_akses, status_retensi, gedung_id, ruang_id, rak_id,
           unit_id, kategori_id, dus_id,
           pdf_attachment, status_sirkulasi, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'TERSEDIA', ?, ?)`,
        [
          id,
          nomorKeputusan,
          tanggal || now.slice(0, 10),
          perihal,
          uraianArsip || null,
          jumlahBerkas === void 0 || jumlahBerkas === null || jumlahBerkas === "" ? 1 : jumlahBerkas,
          String(noDus).toUpperCase(),
          lokasiPenyimpanan,
          keterangan || null,
          unitPengolah || null,
          kategoriArsip || "Inaktif",
          klasifikasiAkses || "INTERNAL",
          statusRetensi || "AKTIF",
          gedungId || null,
          ruangId || null,
          rakId || null,
          // FASE 11: unit_id/kategori_id/dus_id — FK nullable ke
          // master_unit/master_kategori/master_dus. Kalau ID yang dikirim
          // tidak valid (sudah dihapus, dsb), MySQL akan menolak insert
          // dengan ER_NO_REFERENCED_ROW_2 dan pesan error yang jelas
          // dikembalikan lewat catch di bawah — bukan gagal diam-diam.
          unitId || null,
          kategoriId || null,
          dusId || null,
          pdfMeta ? JSON.stringify(pdfMeta) : null,
          now,
          now
        ]
      );
      const [rows] = await pool2.query("SELECT * FROM arsip WHERE id = ?", [id]);
      res.status(201).json({
        status: "success",
        message: "Data pertelaan arsip berhasil ditambahkan ke database",
        data: rowToArchiveItem(rows[0])
      });
    } catch (err) {
      res.status(500).json({ status: "error", message: "Gagal menyimpan data arsip: " + err.message });
    }
  });
  router.put("/:id", requireRole(...ROLES_CAN_WRITE), async (req, res) => {
    try {
      const { id } = req.params;
      const [existingRows] = await pool2.query("SELECT * FROM arsip WHERE id = ?", [id]);
      if (existingRows.length === 0) {
        return res.status(404).json({ status: "error", message: "Berkas arsip tidak ditemukan" });
      }
      const existing = existingRows[0];
      const {
        nomorKeputusan,
        tanggal,
        perihal,
        uraianArsip,
        jumlahBerkas,
        noDus,
        lokasiPenyimpanan,
        keterangan,
        unitPengolah,
        kategoriArsip,
        klasifikasiAkses,
        statusSirkulasi,
        statusRetensi,
        gedungId,
        ruangId,
        rakId,
        unitId,
        kategoriId,
        dusId,
        pdfAttachment
      } = req.body;
      let nextPdfJson = void 0;
      const previousPdfMeta = safeParsePdfMeta(existing.pdf_attachment);
      if (Object.prototype.hasOwnProperty.call(req.body, "pdfAttachment")) {
        if (pdfAttachment === null) {
          nextPdfJson = null;
          if (previousPdfMeta) {
            await storage.remove(previousPdfMeta.storedFileName).catch(() => {
            });
          }
        } else if (pdfAttachment && pdfAttachment.fileData) {
          try {
            const pdfMeta = await persistPdfAttachment(storage, pdfAttachment);
            nextPdfJson = JSON.stringify(pdfMeta);
            if (previousPdfMeta && previousPdfMeta.storedFileName !== pdfMeta.storedFileName) {
              await storage.remove(previousPdfMeta.storedFileName).catch(() => {
              });
            }
          } catch (pdfErr) {
            return res.status(400).json({ status: "error", message: pdfErr.message });
          }
        }
      }
      const now = (/* @__PURE__ */ new Date()).toISOString().slice(0, 19).replace("T", " ");
      if (nextPdfJson === void 0) {
        await pool2.query(
          `UPDATE arsip SET
            nomor_keputusan = ?, tanggal = ?, perihal = ?, uraian_arsip = ?, jumlah_berkas = ?,
            no_dus = ?, lokasi_penyimpanan = ?, keterangan = ?, unit_pengolah = ?, kategori_arsip = ?,
            klasifikasi_akses = ?, status_sirkulasi = ?, status_retensi = ?, gedung_id = ?, ruang_id = ?, rak_id = ?,
            unit_id = ?, kategori_id = ?, dus_id = ?, updated_at = ?
           WHERE id = ?`,
          [
            nomorKeputusan,
            tanggal,
            perihal,
            uraianArsip || null,
            jumlahBerkas === void 0 || jumlahBerkas === null || jumlahBerkas === "" ? 1 : jumlahBerkas,
            String(noDus).toUpperCase(),
            lokasiPenyimpanan,
            keterangan || null,
            unitPengolah || null,
            kategoriArsip || null,
            klasifikasiAkses || "INTERNAL",
            statusSirkulasi || "TERSEDIA",
            statusRetensi || "AKTIF",
            gedungId || null,
            ruangId || null,
            rakId || null,
            unitId || null,
            kategoriId || null,
            dusId || null,
            now,
            id
          ]
        );
      } else {
        await pool2.query(
          `UPDATE arsip SET
            nomor_keputusan = ?, tanggal = ?, perihal = ?, uraian_arsip = ?, jumlah_berkas = ?,
            no_dus = ?, lokasi_penyimpanan = ?, keterangan = ?, unit_pengolah = ?, kategori_arsip = ?,
            klasifikasi_akses = ?, status_sirkulasi = ?, status_retensi = ?, gedung_id = ?, ruang_id = ?, rak_id = ?,
            unit_id = ?, kategori_id = ?, dus_id = ?,
            pdf_attachment = ?, updated_at = ?
           WHERE id = ?`,
          [
            nomorKeputusan,
            tanggal,
            perihal,
            uraianArsip || null,
            jumlahBerkas === void 0 || jumlahBerkas === null || jumlahBerkas === "" ? 1 : jumlahBerkas,
            String(noDus).toUpperCase(),
            lokasiPenyimpanan,
            keterangan || null,
            unitPengolah || null,
            kategoriArsip || null,
            klasifikasiAkses || "INTERNAL",
            statusSirkulasi || "TERSEDIA",
            statusRetensi || "AKTIF",
            gedungId || null,
            ruangId || null,
            rakId || null,
            unitId || null,
            kategoriId || null,
            dusId || null,
            nextPdfJson,
            now,
            id
          ]
        );
      }
      const [rows] = await pool2.query("SELECT * FROM arsip WHERE id = ?", [id]);
      res.json({ status: "success", message: "Data arsip berhasil diperbarui", data: rowToArchiveItem(rows[0]) });
    } catch (err) {
      res.status(500).json({ status: "error", message: "Gagal memperbarui data arsip: " + err.message });
    }
  });
  router.delete("/:id", requireRole(...ROLES_CAN_DELETE), async (req, res) => {
    try {
      const now = (/* @__PURE__ */ new Date()).toISOString().slice(0, 19).replace("T", " ");
      const deletedBy = req.body && req.body.deletedBy || req.user?.name || "Sistem";
      const [result] = await pool2.query(
        "UPDATE arsip SET is_deleted = 1, deleted_at = ?, deleted_by = ? WHERE id = ?",
        [now, deletedBy, req.params.id]
      );
      if (result.affectedRows === 0) {
        return res.status(404).json({ status: "error", message: "Berkas arsip tidak ditemukan" });
      }
      res.json({ status: "success", message: "Data arsip dipindahkan ke recycle bin" });
    } catch (err) {
      res.status(500).json({ status: "error", message: "Gagal menghapus data arsip: " + err.message });
    }
  });
  router.post("/:id/restore", requireRole(...ROLES_CAN_DELETE), async (req, res) => {
    try {
      const [result] = await pool2.query(
        "UPDATE arsip SET is_deleted = 0, deleted_at = NULL, deleted_by = NULL WHERE id = ?",
        [req.params.id]
      );
      if (result.affectedRows === 0) {
        return res.status(404).json({ status: "error", message: "Berkas arsip tidak ditemukan" });
      }
      res.json({ status: "success", message: "Data arsip berhasil dipulihkan" });
    } catch (err) {
      res.status(500).json({ status: "error", message: "Gagal memulihkan data arsip: " + err.message });
    }
  });
  router.delete("/trash/empty", requireRole(...ROLES_CAN_DELETE), async (_req, res) => {
    try {
      const [toDelete] = await pool2.query(
        "SELECT pdf_attachment FROM arsip WHERE is_deleted = 1"
      );
      const [result] = await pool2.query("DELETE FROM arsip WHERE is_deleted = 1");
      for (const row of toDelete) {
        const meta = safeParsePdfMeta(row.pdf_attachment);
        if (meta) await storage.remove(meta.storedFileName).catch(() => {
        });
      }
      res.json({
        status: "success",
        message: `Recycle bin dikosongkan (${result.affectedRows} berkas dihapus permanen).`,
        deletedCount: result.affectedRows
      });
    } catch (err) {
      res.status(500).json({ status: "error", message: "Gagal mengosongkan recycle bin: " + err.message });
    }
  });
  router.delete("/:id/permanent", requireRole(...ROLES_CAN_DELETE), async (req, res) => {
    try {
      const [rows] = await pool2.query("SELECT pdf_attachment FROM arsip WHERE id = ?", [
        req.params.id
      ]);
      const [result] = await pool2.query("DELETE FROM arsip WHERE id = ?", [req.params.id]);
      if (result.affectedRows === 0) {
        return res.status(404).json({ status: "error", message: "Berkas arsip tidak ditemukan" });
      }
      const meta = rows[0] ? safeParsePdfMeta(rows[0].pdf_attachment) : null;
      if (meta) await storage.remove(meta.storedFileName).catch(() => {
      });
      res.json({ status: "success", message: "Data arsip dihapus permanen dari database" });
    } catch (err) {
      res.status(500).json({ status: "error", message: "Gagal menghapus permanen data arsip: " + err.message });
    }
  });
  router.get("/:id/pdf", async (req, res) => {
    try {
      const [rows] = await pool2.query(
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
          message: "Metadata lampiran ada di database, tapi berkas fisiknya tidak ditemukan di server."
        });
      }
      res.setHeader("Content-Type", meta.mime || "application/pdf");
      res.setHeader("Content-Disposition", `inline; filename="${meta.fileName.replace(/"/g, "")}"`);
      res.setHeader("Cache-Control", "private, max-age=3600");
      if (opened.size !== void 0) res.setHeader("Content-Length", String(opened.size));
      opened.stream.pipe(res);
    } catch (err) {
      res.status(500).json({ status: "error", message: "Gagal mengambil berkas lampiran: " + err.message });
    }
  });
  return router;
}
function createBackupRouter(pool2) {
  const router = Router3();
  router.get("/", requireAuth, requireRole(...ROLES_CAN_BACKUP), async (_req, res) => {
    try {
      const [rows] = await pool2.query(
        "SELECT * FROM arsip WHERE is_deleted = 0 ORDER BY created_at DESC"
      );
      const archives = rows.map(rowToArchiveItem);
      const backupData = {
        version: "SI-PERTELAAN-ARSIP-2026-v2.0",
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        database: "PostgreSQL (Supabase)",
        totalArchives: archives.length,
        archives
      };
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Content-Disposition", `attachment; filename="BACKUP_ARSIP_${Date.now()}.json"`);
      res.send(JSON.stringify(backupData, null, 2));
    } catch (err) {
      res.status(500).json({ status: "error", message: "Gagal mengambil data dari database: " + err.message });
    }
  });
  return router;
}
function createDocumentRouter(pool2, storage) {
  const router = Router3();
  const handler = async (req, res) => {
    const docId = (req.params.id || "").replace(/\.pdf$/i, "");
    if (!req.user) {
      return res.status(401).json({
        status: "error",
        message: "Otentikasi wajib untuk membuka dokumen ini. Sertakan ?token=<JWT> atau header Authorization."
      });
    }
    try {
      const [rows] = await pool2.query(
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
      if (opened.size !== void 0) res.setHeader("Content-Length", String(opened.size));
      opened.stream.pipe(res);
    } catch (err) {
      res.status(500).json({ status: "error", message: "Gagal mengambil dokumen: " + err.message });
    }
  };
  router.get("/:id.pdf", optionalAuth, handler);
  router.get("/:id", optionalAuth, handler);
  return router;
}

// backend/storage/fileStorage.ts
import fs from "fs";
import fsp from "fs/promises";
import path2 from "path";
import { Readable } from "stream";
import { createClient } from "@supabase/supabase-js";
function createLocalStorage(dir) {
  return {
    kind: "local",
    async save(name, data) {
      await fsp.mkdir(dir, { recursive: true });
      await fsp.writeFile(path2.join(dir, name), data);
    },
    async remove(name) {
      await fsp.unlink(path2.join(dir, name));
    },
    async open(name) {
      const filePath = path2.join(dir, name);
      if (!fs.existsSync(filePath)) return null;
      const stat = await fsp.stat(filePath);
      return { stream: fs.createReadStream(filePath), size: stat.size };
    }
  };
}
function createSupabaseStorage(url, key, bucket) {
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const bucketApi = () => client.storage.from(bucket);
  return {
    kind: "supabase",
    async save(name, data, mime) {
      const { error } = await bucketApi().upload(name, data, { contentType: mime, upsert: true });
      if (error) throw new Error(`Gagal menyimpan berkas ke Supabase Storage: ${error.message}`);
    },
    async remove(name) {
      const { error } = await bucketApi().remove([name]);
      if (error) throw new Error(`Gagal menghapus berkas di Supabase Storage: ${error.message}`);
    },
    async open(name) {
      const { data, error } = await bucketApi().download(name);
      if (error) {
        if (/not.?found|does not exist|404/i.test(error.message || "")) return null;
        throw new Error(`Gagal mengambil berkas dari Supabase Storage: ${error.message}`);
      }
      if (!data) return null;
      const buf = Buffer.from(await data.arrayBuffer());
      return { stream: Readable.from(buf), size: buf.length };
    }
  };
}
function createFileStorage(localDir) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (url && key) {
    return createSupabaseStorage(url, key, process.env.SUPABASE_BUCKET || "arsip-files");
  }
  return createLocalStorage(localDir);
}

// backend/routes/master.ts
import { Router as Router4 } from "express";
var ROLES_CAN_WRITE_MASTER = ["super_admin", "admin", "arsiparis"];
var ROLES_CAN_DELETE_MASTER = ["super_admin", "admin"];
var RESOURCES = [
  {
    key: "kategori",
    table: "master_kategori",
    idPrefix: "kat",
    label: "kategori arsip",
    fields: [
      { camel: "kode", column: "kode", required: true },
      { camel: "nama", column: "nama", required: true },
      { camel: "deskripsi", column: "deskripsi" },
      { camel: "masaSimpanTahun", column: "masa_simpan_tahun", type: "number" }
    ]
  },
  {
    key: "unit",
    table: "master_unit",
    idPrefix: "unit",
    label: "unit kerja",
    fields: [
      { camel: "kode", column: "kode", required: true },
      { camel: "namaUnit", column: "nama_unit", required: true },
      { camel: "kepalaUnit", column: "kepala_unit" }
    ]
  },
  {
    key: "gedung",
    table: "master_gedung",
    idPrefix: "gdg",
    label: "gedung",
    fields: [
      { camel: "kode", column: "kode", required: true },
      { camel: "namaGedung", column: "nama_gedung", required: true },
      { camel: "alamat", column: "alamat" }
    ]
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
      { camel: "namaRuang", column: "nama_ruang", required: true }
    ]
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
      { camel: "kapasitasDus", column: "kapasitas_dus", type: "number" }
    ]
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
      { camel: "keterangan", column: "keterangan" }
    ]
  }
];
function rowToCamel(row, config) {
  const out = { id: row.id };
  for (const f of config.fields) {
    out[f.camel] = row[f.column] ?? (f.type === "number" ? 0 : void 0);
  }
  return out;
}
function friendlyDbError(err, config) {
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
function validateBody(body, config) {
  for (const f of config.fields) {
    if (f.required && (body[f.camel] === void 0 || body[f.camel] === null || body[f.camel] === "")) {
      return `Field "${f.camel}" wajib diisi untuk data ${config.label}.`;
    }
  }
  return null;
}
function buildResourceRouter(pool2, config) {
  const router = Router4();
  router.get("/", requireAuth, async (_req, res) => {
    try {
      const [rows] = await pool2.query(`SELECT * FROM \`${config.table}\` ORDER BY created_at ASC`);
      res.json({ status: "success", total: rows.length, data: rows.map((r) => rowToCamel(r, config)) });
    } catch (err) {
      res.status(500).json({ status: "error", message: `Gagal mengambil data ${config.label}: ${err.message}` });
    }
  });
  router.post("/", requireAuth, requireRole(...ROLES_CAN_WRITE_MASTER), async (req, res) => {
    const validationError = validateBody(req.body, config);
    if (validationError) {
      return res.status(400).json({ status: "error", message: validationError });
    }
    const id = `${config.idPrefix}-${Date.now().toString(36)}`;
    const columns = ["id", ...config.fields.map((f) => f.column)];
    const placeholders = columns.map(() => "?").join(", ");
    const values = [id, ...config.fields.map((f) => req.body[f.camel] ?? null)];
    try {
      await pool2.query(
        `INSERT INTO \`${config.table}\` (${columns.map((c) => `\`${c}\``).join(", ")}) VALUES (${placeholders})`,
        values
      );
      const [rows] = await pool2.query(`SELECT * FROM \`${config.table}\` WHERE id = ?`, [id]);
      res.status(201).json({
        status: "success",
        message: `Data ${config.label} berhasil ditambahkan.`,
        data: rowToCamel(rows[0], config)
      });
    } catch (err) {
      res.status(400).json({ status: "error", message: friendlyDbError(err, config) });
    }
  });
  router.put("/:id", requireAuth, requireRole(...ROLES_CAN_WRITE_MASTER), async (req, res) => {
    const validationError = validateBody(req.body, config);
    if (validationError) {
      return res.status(400).json({ status: "error", message: validationError });
    }
    const assignments = config.fields.map((f) => `\`${f.column}\` = ?`).join(", ");
    const values = [...config.fields.map((f) => req.body[f.camel] ?? null), req.params.id];
    try {
      const [result] = await pool2.query(
        `UPDATE \`${config.table}\` SET ${assignments} WHERE id = ?`,
        values
      );
      if (result.affectedRows === 0) {
        return res.status(404).json({ status: "error", message: `Data ${config.label} tidak ditemukan.` });
      }
      const [rows] = await pool2.query(`SELECT * FROM \`${config.table}\` WHERE id = ?`, [req.params.id]);
      res.json({
        status: "success",
        message: `Data ${config.label} berhasil diperbarui.`,
        data: rowToCamel(rows[0], config)
      });
    } catch (err) {
      res.status(400).json({ status: "error", message: friendlyDbError(err, config) });
    }
  });
  router.delete("/:id", requireAuth, requireRole(...ROLES_CAN_DELETE_MASTER), async (req, res) => {
    try {
      const [result] = await pool2.query(`DELETE FROM \`${config.table}\` WHERE id = ?`, [req.params.id]);
      if (result.affectedRows === 0) {
        return res.status(404).json({ status: "error", message: `Data ${config.label} tidak ditemukan.` });
      }
      res.json({ status: "success", message: `Data ${config.label} berhasil dihapus.` });
    } catch (err) {
      res.status(400).json({ status: "error", message: friendlyDbError(err, config) });
    }
  });
  return router;
}
function createMasterRouter(pool2) {
  const router = Router4();
  for (const config of RESOURCES) {
    router.use(`/${config.key}`, buildResourceRouter(pool2, config));
  }
  return router;
}

// backend/routes/users.ts
import { Router as Router5 } from "express";
import crypto4 from "crypto";
var ROLES_CAN_MANAGE_USERS = ["super_admin"];
var VALID_ROLES = /* @__PURE__ */ new Set(["super_admin", "admin", "arsiparis", "operator", "viewer", "auditor"]);
var MIN_PASSWORD_LENGTH2 = 8;
function rowToPublicUser2(row) {
  return {
    id: row.id,
    username: row.username,
    name: row.name,
    email: row.email,
    role: row.role,
    unitKerja: row.unit_kerja ?? void 0,
    avatarUrl: row.avatar_url ?? void 0,
    isActive: !!row.is_active,
    lastLoginAt: row.last_login_at ?? void 0,
    createdAt: row.created_at
  };
}
function friendlyDbError2(err) {
  if (err.code === "ER_DUP_ENTRY") {
    return "Username atau email tersebut sudah dipakai oleh akun lain.";
  }
  return "Gagal memproses data pengguna: " + err.message;
}
function createUsersRouter(pool2) {
  const router = Router5();
  router.use(requireAuth, requireRole(...ROLES_CAN_MANAGE_USERS));
  router.get("/", async (_req, res) => {
    try {
      const [rows] = await pool2.query("SELECT * FROM users ORDER BY created_at ASC");
      res.json({ status: "success", total: rows.length, data: rows.map(rowToPublicUser2) });
    } catch (err) {
      res.status(500).json({ status: "error", message: "Gagal mengambil daftar pengguna: " + err.message });
    }
  });
  router.post("/", async (req, res) => {
    try {
      const { name, username, email, role, unitKerja, avatarUrl, password } = req.body;
      if (!name?.trim() || !username?.trim() || !email?.trim() || !role) {
        return res.status(400).json({ status: "error", message: "Nama, username, email, dan peran wajib diisi." });
      }
      if (!VALID_ROLES.has(role)) {
        return res.status(400).json({ status: "error", message: `Peran "${role}" tidak dikenal.` });
      }
      if (!password || password.length < MIN_PASSWORD_LENGTH2) {
        return res.status(400).json({
          status: "error",
          message: `Kata sandi wajib diisi, minimal ${MIN_PASSWORD_LENGTH2} karakter.`
        });
      }
      const id = crypto4.randomUUID();
      const passwordHash = hashPassword(password);
      await pool2.query(
        `INSERT INTO users (id, username, password_hash, name, email, role, unit_kerja, avatar_url, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        [id, username.trim().toLowerCase(), passwordHash, name.trim(), email.trim(), role, unitKerja?.trim() || null, avatarUrl || null]
      );
      const [rows] = await pool2.query("SELECT * FROM users WHERE id = ?", [id]);
      res.status(201).json({
        status: "success",
        message: `Akun "${username}" berhasil dibuat. Kata sandi awal sudah aktif dan bisa langsung dipakai login.`,
        data: rowToPublicUser2(rows[0])
      });
    } catch (err) {
      res.status(400).json({ status: "error", message: friendlyDbError2(err) });
    }
  });
  router.put("/:id", async (req, res) => {
    try {
      const { name, username, email, role, unitKerja, avatarUrl, password } = req.body;
      if (!name?.trim() || !username?.trim() || !email?.trim() || !role) {
        return res.status(400).json({ status: "error", message: "Nama, username, email, dan peran wajib diisi." });
      }
      if (!VALID_ROLES.has(role)) {
        return res.status(400).json({ status: "error", message: `Peran "${role}" tidak dikenal.` });
      }
      if (password && password.length < MIN_PASSWORD_LENGTH2) {
        return res.status(400).json({
          status: "error",
          message: `Kata sandi baru minimal ${MIN_PASSWORD_LENGTH2} karakter. Kosongkan field ini kalau tidak ingin mengubah kata sandi.`
        });
      }
      const setClauses = [
        "username = ?",
        "name = ?",
        "email = ?",
        "role = ?",
        "unit_kerja = ?",
        "avatar_url = ?"
      ];
      const values = [
        username.trim().toLowerCase(),
        name.trim(),
        email.trim(),
        role,
        unitKerja?.trim() || null,
        avatarUrl || null
      ];
      if (password) {
        setClauses.push("password_hash = ?");
        values.push(hashPassword(password));
      }
      values.push(req.params.id);
      const [result] = await pool2.query(
        `UPDATE users SET ${setClauses.join(", ")} WHERE id = ?`,
        values
      );
      if (result.affectedRows === 0) {
        return res.status(404).json({ status: "error", message: "Akun pengguna tidak ditemukan." });
      }
      const [rows] = await pool2.query("SELECT * FROM users WHERE id = ?", [req.params.id]);
      res.json({
        status: "success",
        message: password ? "Data akun & kata sandi berhasil diperbarui." : "Data akun berhasil diperbarui (kata sandi tidak diubah).",
        data: rowToPublicUser2(rows[0])
      });
    } catch (err) {
      res.status(400).json({ status: "error", message: friendlyDbError2(err) });
    }
  });
  router.delete("/:id", async (req, res) => {
    try {
      if (req.user?.sub === req.params.id) {
        return res.status(400).json({
          status: "error",
          message: "Tidak bisa menghapus akun yang sedang Anda gunakan untuk login saat ini."
        });
      }
      const [result] = await pool2.query("DELETE FROM users WHERE id = ?", [req.params.id]);
      if (result.affectedRows === 0) {
        return res.status(404).json({ status: "error", message: "Akun pengguna tidak ditemukan." });
      }
      res.json({ status: "success", message: "Akun pengguna berhasil dihapus." });
    } catch (err) {
      res.status(500).json({ status: "error", message: "Gagal menghapus akun pengguna: " + err.message });
    }
  });
  return router;
}

// backend/app.ts
var __filename2 = fileURLToPath2(import.meta.url);
var __dirname2 = path3.dirname(__filename2);
var UPLOADS_DIR = path3.join(__dirname2, "uploads", "arsip");
var fileStorage = createFileStorage(UPLOADS_DIR);
console.log(`[Storage] Lampiran disimpan di: ${fileStorage.kind === "supabase" ? "Supabase Storage" : "disk lokal (tidak permanen di Vercel)"}`);
function createApp() {
  const app = express();
  app.set("trust proxy", 1);
  app.use(express.json({ limit: "20mb" }));
  app.use(express.urlencoded({ extended: true, limit: "20mb" }));
  app.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-XSS-Protection", "1; mode=block");
    res.setHeader("X-Frame-Options", "SAMEORIGIN");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("Content-Security-Policy", "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: https:;");
    next();
  });
  app.get("/api/health", async (req, res) => {
    let database = "disconnected";
    try {
      await pool.query("SELECT 1");
      database = "connected";
    } catch {
      database = "disconnected";
    }
    res.json({
      status: "ok",
      service: "SI-PERTELAAN-ARSIP-API",
      engine: "Express 4.x + Vite Middleware + PostgreSQL (Supabase)",
      environment: "Production Cloud Run / Containerised Node",
      database,
      hint: database === "disconnected" ? "Cek /api/db-test untuk detail penyebabnya." : void 0,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  });
  app.get("/api/db-test", async (req, res) => {
    const status = await checkDatabaseConnection();
    if (!status.connected) {
      return res.status(500).json({
        status: "error",
        step: "connect",
        message: "Gagal konek ke database. Cek DATABASE_URL di .env.local (atau di Environment Variables Vercel).",
        detail: status.error
      });
    }
    if (status.error) {
      return res.status(500).json({
        status: "error",
        step: "select-database",
        message: status.error
      });
    }
    if (status.missingTables.length > 0) {
      return res.status(500).json({
        status: "error",
        step: "schema",
        database: status.database,
        message: `Terhubung ke database "${status.database}", tapi tabel berikut belum ada: ${status.missingTables.join(", ")}.`,
        hint: 'Jalankan "npm run db:init", atau tempel database/supabase-schema-dan-data.sql di Supabase SQL Editor.'
      });
    }
    try {
      const tables = [
        "arsip",
        "master_kategori",
        "master_unit",
        "master_gedung",
        "master_ruang",
        "master_rak",
        "master_dus",
        "users",
        "audit_logs",
        "token_blacklist"
      ];
      const counts = {};
      for (const t of tables) {
        const [rows] = await pool.query(`SELECT COUNT(*) AS total FROM \`${t}\``);
        counts[t] = rows[0].total;
      }
      const [sample] = await pool.query("SELECT * FROM arsip WHERE is_deleted = 0 ORDER BY created_at DESC LIMIT 3");
      const sampleArsip = sample.map(rowToArchiveItem);
      res.json({
        status: "success",
        message: `FASE 2 OK: server.ts berhasil membaca database "${status.database}".`,
        database: status.database,
        rowCounts: counts,
        sampleArsip
      });
    } catch (err) {
      res.status(500).json({
        status: "error",
        step: "read",
        message: "Tabel sudah ada tapi query SELECT gagal.",
        detail: err.message
      });
    }
  });
  app.use("/api/auth", createAuthRouter(pool));
  app.use("/api/audit-logs", createAuditRouter(pool));
  app.use("/api/master", createMasterRouter(pool));
  app.use("/api/users", createUsersRouter(pool));
  app.use("/api/arsip", createArsipRouter(pool, fileStorage));
  app.use("/api/backup", createBackupRouter(pool));
  const documentRouter = createDocumentRouter(pool, fileStorage);
  app.use("/documents", documentRouter);
  app.use("/api/documents", documentRouter);
  return app;
}

// backend/vercel.ts
var vercel_default = createApp();
export {
  vercel_default as default
};
