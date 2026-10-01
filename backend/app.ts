// Aplikasi Express (semua endpoint API). Dipakai bersama oleh:
//   - server.ts        -> server biasa (npm run dev / hosting Node) + Vite/static
//   - backend/vercel.ts -> fungsi serverless Vercel (di-bundle ke api/index.js)
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';
import { pool, checkDatabaseConnection, rowToArchiveItem } from './config/database.ts';
import { createAuthRouter } from './routes/auth.ts';
import { createArsipRouter, createDocumentRouter, createBackupRouter } from './routes/arsip.ts';
import { createFileStorage } from './storage/fileStorage.ts';
import { createAuditRouter } from './routes/audit.ts';
import { createMasterRouter } from './routes/master.ts';
import { createUsersRouter } from './routes/users.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Folder lampiran untuk mode disk lokal (dipakai kalau Supabase Storage belum diisi).
const UPLOADS_DIR = path.join(__dirname, 'uploads', 'arsip');
// Penyimpanan lampiran: Supabase Storage kalau SUPABASE_URL & SUPABASE_SERVICE_ROLE_KEY
// diisi, kalau tidak memakai disk lokal (UPLOADS_DIR).
const fileStorage = createFileStorage(UPLOADS_DIR);
console.log(`[Storage] Lampiran disimpan di: ${fileStorage.kind === 'supabase' ? 'Supabase Storage' : 'disk lokal (tidak permanen di Vercel)'}`);

export function createApp() {
  const app = express();
  // Di belakang proxy (Vercel/Render) IP asli pengguna ada di header X-Forwarded-For.
  app.set('trust proxy', 1);

  // Middlewares
  app.use(express.json({ limit: '20mb' }));
  app.use(express.urlencoded({ extended: true, limit: '20mb' }));

  // Security Headers Middleware
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Content-Security-Policy', "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: https:;");
    next();
  });

  // -------------------------------------------------------------
  // API ROUTES
  // -------------------------------------------------------------

  // Health check & Engine Info
  // FASE 2: dijadikan langkah PERTAMA & RINGAN dalam rantai
  //   .env.local -> database.ts -> server.ts -> /api/health -> /api/db-test -> PostgreSQL
  // Cuma "SELECT 1" cepat (bukan cek semua tabel) supaya cocok dipakai sebagai
  // health check yang sering dipanggil (load balancer, uptime monitor, dst).
  // Untuk diagnosis lengkap (nama database benar + semua tabel ada + baca data),
  // pakai /api/db-test.
  app.get('/api/health', async (req, res) => {
    let database: 'connected' | 'disconnected' = 'disconnected';
    try {
      await pool.query('SELECT 1');
      database = 'connected';
    } catch {
      database = 'disconnected';
    }

    res.json({
      status: 'ok',
      service: 'SI-PERTELAAN-ARSIP-API',
      engine: 'Express 4.x + Vite Middleware + PostgreSQL (Supabase)',
      environment: 'Production Cloud Run / Containerised Node',
      database,
      hint: database === 'disconnected' ? 'Cek /api/db-test untuk detail penyebabnya.' : undefined,
      timestamp: new Date().toISOString()
    });
  });

  // -------------------------------------------------------------
  // FASE 2: KONEKSI BACKEND
  // Endpoint diagnostik untuk membuktikan alur:
  //   .env.local -> backend/config/database.ts -> PostgreSQL (Supabase)
  // benar-benar tersambung DAN server.ts benar-benar bisa membaca datanya
  // (bukan cuma ping kosong).
  // -------------------------------------------------------------
  app.get('/api/db-test', async (req, res) => {
    const status = await checkDatabaseConnection();

    if (!status.connected) {
      return res.status(500).json({
        status: 'error',
        step: 'connect',
        message: 'Gagal konek ke database. Cek DATABASE_URL di .env.local (atau di Environment Variables Vercel).',
        detail: status.error
      });
    }

    if (status.error) {
      return res.status(500).json({
        status: 'error',
        step: 'select-database',
        message: status.error
      });
    }

    if (status.missingTables.length > 0) {
      return res.status(500).json({
        status: 'error',
        step: 'schema',
        database: status.database,
        message: `Terhubung ke database "${status.database}", tapi tabel berikut belum ada: ${status.missingTables.join(', ')}.`,
        hint: 'Jalankan "npm run db:init", atau tempel database/supabase-schema-dan-data.sql di Supabase SQL Editor.'
      });
    }

    // Sampai sini: koneksi OK, database benar, semua tabel (termasuk
    // FASE 7 `users` & FASE 8 `audit_logs`) ada.
    // Terakhir, benar-benar SELECT dari tiap tabel supaya kebuktian server.ts
    // bisa MEMBACA isinya, bukan cuma tahu tabelnya ada.
    try {
      const tables = [
        'arsip', 'master_kategori', 'master_unit', 'master_gedung', 'master_ruang', 'master_rak',
        'master_dus', 'users', 'audit_logs', 'token_blacklist',
      ];
      const counts: Record<string, number> = {};
      for (const t of tables) {
        const [rows] = await pool.query(`SELECT COUNT(*) AS total FROM \`${t}\``);
        counts[t] = (rows as any[])[0].total;
      }

      const [sample] = await pool.query('SELECT * FROM arsip WHERE is_deleted = 0 ORDER BY created_at DESC LIMIT 3');
      const sampleArsip = (sample as any[]).map(rowToArchiveItem);

      res.json({
        status: 'success',
        message: `FASE 2 OK: server.ts berhasil membaca database "${status.database}".`,
        database: status.database,
        rowCounts: counts,
        sampleArsip
      });
    } catch (err: any) {
      res.status(500).json({
        status: 'error',
        step: 'read',
        message: 'Tabel sudah ada tapi query SELECT gagal.',
        detail: err.message
      });
    }
  });

  // FASE 7: Login & Role -> Backend (kredensial diverifikasi ke tabel `users`)
  app.use('/api/auth', createAuthRouter(pool));

  // FASE 8: Audit Log -> database (tabel `audit_logs`, bukan array in-memory lagi)
  app.use('/api/audit-logs', createAuditRouter(pool));

  // FASE 11: Master Data + relasi database (kategori/unit/gedung/ruang/rak/dus)
  app.use('/api/master', createMasterRouter(pool));

  // "Buat Akun": Manajemen Pengguna -> Backend (hanya super_admin, sesuai
  // PERMISSION_MATRIX.manageUser di src/lib/permissions.ts)
  app.use('/api/users', createUsersRouter(pool));

  // FASE 6/7/9: CRUD arsip + recycle bin + backup, dengan otentikasi &
  // hak akses per-peran, dan lampiran PDF disimpan sebagai file asli.
  app.use('/api/arsip', createArsipRouter(pool, fileStorage));
  app.use('/api/backup', createBackupRouter(pool));

  // -------------------------------------------------------------
  // FASE 9: SECURE PDF / DOCUMENT ROUTE
  // Endpoint: https://website.com/documents/:id.pdf atau /api/documents/:id
  // Sekarang men-stream berkas PDF asli yang tersimpan di
  // backend/uploads/arsip/ (lihat backend/routes/arsip.ts), BUKAN lagi
  // PDF dummy yang di-generate ulang untuk setiap id.
  // -------------------------------------------------------------
  const documentRouter = createDocumentRouter(pool, fileStorage);
  app.use('/documents', documentRouter);
  app.use('/api/documents', documentRouter);

  return app;
}
