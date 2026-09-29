import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import 'dotenv/config';
import { pool, testConnection, checkDatabaseConnection, rowToArchiveItem } from './backend/config/database.ts';
import { createAuthRouter } from './backend/routes/auth.ts';
import { createArsipRouter, createDocumentRouter, createBackupRouter } from './backend/routes/arsip.ts';
import { createAuditRouter } from './backend/routes/audit.ts';
import { createMasterRouter } from './backend/routes/master.ts';
import { createUsersRouter } from './backend/routes/users.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// FASE 9: folder fisik tempat semua lampiran PDF arsip disimpan.
// Sebelumnya endpoint /documents/:id.pdf men-generate PDF dummy yang
// sama untuk semua id secara on-the-fly (lihat riwayat git); sekarang
// file yang diunggah user beneran ditulis ke sini oleh
// backend/routes/arsip.ts, dan dibaca lagi dari sini saat diminta.
const UPLOADS_DIR = path.join(__dirname, 'backend', 'uploads', 'arsip');

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Cek koneksi MySQL saat server start (tidak menghentikan server jika gagal)
  await testConnection();

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
  //   .env.local -> database.ts -> server.ts -> /api/health -> /api/db-test -> MySQL
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
      engine: 'Express 4.x + Vite Middleware + MySQL Engine',
      environment: 'Production Cloud Run / Containerised Node',
      database,
      hint: database === 'disconnected' ? 'Cek /api/db-test untuk detail penyebabnya.' : undefined,
      timestamp: new Date().toISOString()
    });
  });

  // -------------------------------------------------------------
  // FASE 2: KONEKSI BACKEND
  // Endpoint diagnostik untuk membuktikan alur:
  //   .env.local -> backend/config/database.ts -> MySQL "daftar-pertelaan-arsip-2026"
  // benar-benar tersambung DAN server.ts benar-benar bisa membaca datanya
  // (bukan cuma ping kosong).
  // -------------------------------------------------------------
  app.get('/api/db-test', async (req, res) => {
    const status = await checkDatabaseConnection();

    if (!status.connected) {
      return res.status(500).json({
        status: 'error',
        step: 'connect',
        message: 'Gagal konek ke MySQL. Cek DB_HOST/DB_PORT/DB_USER/DB_PASSWORD di .env.local dan pastikan MySQL (XAMPP) sedang aktif.',
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
        hint: 'Jalankan "npm run db:init", atau import database/daftar-pertelaan-arsip-2026.sql lewat phpMyAdmin.'
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

  // FASE 8: Audit Log -> MySQL (tabel `audit_logs`, bukan array in-memory lagi)
  app.use('/api/audit-logs', createAuditRouter(pool));

  // FASE 11: Master Data + relasi database (kategori/unit/gedung/ruang/rak/dus)
  app.use('/api/master', createMasterRouter(pool));

  // "Buat Akun": Manajemen Pengguna -> Backend (hanya super_admin, sesuai
  // PERMISSION_MATRIX.manageUser di src/lib/permissions.ts)
  app.use('/api/users', createUsersRouter(pool));

  // FASE 6/7/9: CRUD arsip + recycle bin + backup, dengan otentikasi &
  // hak akses per-peran, dan lampiran PDF disimpan sebagai file asli.
  app.use('/api/arsip', createArsipRouter(pool, UPLOADS_DIR));
  app.use('/api/backup', createBackupRouter(pool));

  // -------------------------------------------------------------
  // FASE 9: SECURE PDF / DOCUMENT ROUTE
  // Endpoint: https://website.com/documents/:id.pdf atau /api/documents/:id
  // Sekarang men-stream berkas PDF asli yang tersimpan di
  // backend/uploads/arsip/ (lihat backend/routes/arsip.ts), BUKAN lagi
  // PDF dummy yang di-generate ulang untuk setiap id.
  // -------------------------------------------------------------
  const documentRouter = createDocumentRouter(pool, UPLOADS_DIR);
  app.use('/documents', documentRouter);
  app.use('/api/documents', documentRouter);

  // -------------------------------------------------------------
  // VITE & CLIENT SPA FALLBACK ROUTE
  // Routes like /arsip, /sirkulasi, /approval, /reports, /master
  // -------------------------------------------------------------
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server SI Pertelaan Arsip running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
