-- =====================================================================
-- SI PERTELAAN ARSIP 2026 — Database Schema
-- FASE 1/7/8: Database MySQL
-- File: database/daftar-pertelaan-arsip-2026.sql
--
-- Isi:
--   1. Tabel arsip (kolom mengikuti backend/config/database.ts & server.ts)
--   2. Master dasar: master_kategori, master_unit, master_gedung,
--      master_ruang, master_rak, master_dus (mengikuti src/types.ts)
--   3. Foreign key arsip -> master_gedung/master_ruang/master_rak
--      (relasi lokasi fisik, sudah ada sejak revisi sebelumnya)
--   4. Foreign key arsip -> master_unit/master_kategori/master_dus
--      (relasi baru: unit_id, kategori_id, dus_id — semuanya nullable,
--      ON DELETE SET NULL, dan TIDAK menggantikan kolom teks lama
--      unit_pengolah/kategori_arsip/no_dus. Kolom teks lama tetap
--      dipertahankan supaya frontend yang belum memakai *_id tidak rusak.)
--   5. FASE 7 — tabel `users`: akun login sungguhan (password di-hash
--      dengan scrypt oleh backend/config/auth.ts, TIDAK plaintext),
--      dipakai oleh backend/routes/auth.ts (POST /api/auth/login, dst).
--   6. FASE 8 — tabel `audit_logs`: riwayat aktivitas permanen,
--      menggantikan array in-memory yang dulu ada di server.ts.
--   7. Seed data (disamakan dengan src/data/initialMasterData.ts &
--      src/data/initialUsers.ts), baris arsip contoh sekarang juga
--      mengisi unit_id/kategori_id/dus_id.
--   8. Query validasi (dikomentari) di bagian paling akhir file.
--
-- Kredensial demo (FASE 7) — SEMUA akun di bawah memakai kata sandi
-- yang sama untuk kemudahan demo: "password123". Wajib diganti sebelum
-- dipakai di lingkungan produksi sungguhan (lihat UserManagementModal.tsx
-- untuk mengganti password lewat UI, atau UPDATE manual tabel `users`
-- dengan hash baru dari backend/config/auth.ts#hashPassword()):
--   superadmin / admin / arsiparis / operator / viewer / auditor
--
-- Nama database mengandung tanda hubung karena sudah dipakai di
-- .env.local & backend/config/database.php, sehingga WAJIB dibungkus backtick.
-- Nama database TIDAK berubah: daftar-pertelaan-arsip-2026.
-- =====================================================================

CREATE DATABASE IF NOT EXISTS `daftar-pertelaan-arsip-2026`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `daftar-pertelaan-arsip-2026`;

SET FOREIGN_KEY_CHECKS = 0;

-- =====================================================================
-- 1. MASTER DATA (dibuat lebih dulu karena arsip mereferensikannya)
-- =====================================================================

-- ---------------------------------------------------------------------
-- master_kategori — kategori arsip (Inaktif, Vital, Permanen, Terbatas, ...)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `master_kategori` (
  `id`                VARCHAR(64)   NOT NULL,
  `kode`              VARCHAR(50)   NOT NULL,
  `nama`              VARCHAR(150)  NOT NULL,
  `deskripsi`         TEXT          NULL,
  `masa_simpan_tahun` INT           NOT NULL DEFAULT 0,
  `created_at`        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_master_kategori_kode` (`kode`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- master_unit — unit kerja / bagian pengolah arsip
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `master_unit` (
  `id`          VARCHAR(64)   NOT NULL,
  `kode`        VARCHAR(50)   NOT NULL,
  `nama_unit`   VARCHAR(150)  NOT NULL,
  `kepala_unit` VARCHAR(150)  NULL,
  `created_at`  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_master_unit_kode` (`kode`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- master_gedung — gedung/depo penyimpanan arsip
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `master_gedung` (
  `id`          VARCHAR(64)   NOT NULL,
  `kode`        VARCHAR(50)   NOT NULL,
  `nama_gedung` VARCHAR(150)  NOT NULL,
  `alamat`      VARCHAR(255)  NULL,
  `created_at`  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_master_gedung_kode` (`kode`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- master_ruang — ruang di dalam gedung
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `master_ruang` (
  `id`          VARCHAR(64)   NOT NULL,
  `gedung_id`   VARCHAR(64)   NOT NULL,
  `kode`        VARCHAR(50)   NOT NULL,
  `nama_ruang`  VARCHAR(150)  NOT NULL,
  `created_at`  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_master_ruang_kode` (`kode`),
  KEY `idx_master_ruang_gedung` (`gedung_id`),
  CONSTRAINT `fk_ruang_gedung` FOREIGN KEY (`gedung_id`)
    REFERENCES `master_gedung` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- master_rak — rak di dalam ruang
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `master_rak` (
  `id`             VARCHAR(64)   NOT NULL,
  `ruang_id`       VARCHAR(64)   NOT NULL,
  `kode`           VARCHAR(50)   NOT NULL,
  `nama_rak`       VARCHAR(150)  NOT NULL,
  `kapasitas_dus`  INT           NOT NULL DEFAULT 0,
  `created_at`     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_master_rak_kode` (`kode`),
  KEY `idx_master_rak_ruang` (`ruang_id`),
  CONSTRAINT `fk_rak_ruang` FOREIGN KEY (`ruang_id`)
    REFERENCES `master_ruang` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- master_dus — dus/boks arsip di dalam rak
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `master_dus` (
  `id`                 VARCHAR(64)   NOT NULL,
  `no_dus`             VARCHAR(50)   NOT NULL,
  `rak_id`             VARCHAR(64)   NOT NULL,
  `kapasitas_max_item` INT           NOT NULL DEFAULT 0,
  `keterangan`         VARCHAR(255)  NULL,
  `created_at`         DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`         DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_master_dus_no_dus` (`no_dus`),
  KEY `idx_master_dus_rak` (`rak_id`),
  CONSTRAINT `fk_dus_rak` FOREIGN KEY (`rak_id`)
    REFERENCES `master_rak` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
-- 2. TABEL UTAMA: arsip
-- Kolom & tipe disesuaikan 1:1 dengan rowToArchiveItem() di database.ts
-- gedung_id/ruang_id/rak_id/unit_id/kategori_id/dus_id semuanya nullable
-- & FK ON DELETE SET NULL supaya penghapusan data master tidak ikut
-- menghapus data arsip. Kolom teks lama (unit_pengolah, kategori_arsip,
-- no_dus) tetap dipertahankan apa adanya untuk kompatibilitas frontend
-- yang belum diupdate untuk memakai kolom *_id.
-- =====================================================================
CREATE TABLE IF NOT EXISTS `arsip` (
  `id`                          VARCHAR(64)     NOT NULL,
  `nomor_arsip_otomatis`        VARCHAR(100)    NULL,
  `nomor_keputusan`             VARCHAR(255)    NOT NULL,
  `tanggal`                     DATE            NOT NULL,
  `perihal`                     VARCHAR(500)    NOT NULL,
  `uraian_arsip`                TEXT            NULL,
  `jumlah_berkas`               INT             NULL DEFAULT 1,
  `no_dus`                      VARCHAR(50)     NOT NULL,
  `lokasi_penyimpanan`          VARCHAR(255)    NOT NULL,
  `keterangan`                  TEXT            NULL,

  -- Kolom teks lama — dipertahankan apa adanya untuk kompatibilitas frontend.
  `unit_pengolah`               VARCHAR(255)    NULL,
  `kategori_arsip`              VARCHAR(100)    NULL,

  `klasifikasi_akses`           ENUM('PUBLIK','INTERNAL','TERBATAS','RAHASIA','SANGAT_RAHASIA')
                                                 NOT NULL DEFAULT 'INTERNAL',

  `status_sirkulasi`            ENUM('TERSEDIA','DIPINJAM','DIUSULKAN_MUSNAH','DIMUSNAHKAN')
                                                 NOT NULL DEFAULT 'TERSEDIA',
  `peminjam_aktif`              VARCHAR(255)    NULL,
  `tanggal_pinjam_aktif`        DATE            NULL,
  `tanggal_jatuh_tempo_aktif`   DATE            NULL,

  `status_retensi`              ENUM('AKTIF','INAKTIF','SIAP_MUSNAH','PERMANEN')
                                                 NOT NULL DEFAULT 'AKTIF',
  `tahun_retensi_inaktif_end`   INT             NULL,

  -- Lampiran PDF disimpan sebagai JSON (fileName, fileSize, fileData, uploadedAt, watermark, isPrivateProxy)
  -- FASE 9 nanti akan mengganti isi JSON ini menjadi metadata file di disk, bukan base64 penuh.
  `pdf_attachment`              JSON            NULL,

  -- Referensi lokasi fisik (opsional, boleh kosong jika belum dipetakan ke master lokasi)
  `gedung_id`                   VARCHAR(64)     NULL,
  `ruang_id`                    VARCHAR(64)     NULL,
  `rak_id`                      VARCHAR(64)     NULL,

  -- Referensi relasional baru (opsional, mendampingi kolom teks lama di atas)
  `unit_id`                     VARCHAR(64)     NULL,
  `kategori_id`                 VARCHAR(64)     NULL,
  `dus_id`                      VARCHAR(64)     NULL,

  -- Soft delete (recycle bin)
  `is_deleted`                  TINYINT(1)      NOT NULL DEFAULT 0,
  `deleted_at`                  DATETIME        NULL,
  `deleted_by`                  VARCHAR(255)    NULL,

  `created_at`                  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`                  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (`id`),
  KEY `idx_arsip_no_dus` (`no_dus`),
  KEY `idx_arsip_kategori` (`kategori_arsip`),
  KEY `idx_arsip_is_deleted` (`is_deleted`),
  KEY `idx_arsip_status_sirkulasi` (`status_sirkulasi`),
  KEY `idx_arsip_gedung` (`gedung_id`),
  KEY `idx_arsip_ruang` (`ruang_id`),
  KEY `idx_arsip_rak` (`rak_id`),
  KEY `idx_arsip_unit_id` (`unit_id`),
  KEY `idx_arsip_kategori_id` (`kategori_id`),
  KEY `idx_arsip_dus_id` (`dus_id`),
  FULLTEXT KEY `ft_arsip_search` (`nomor_keputusan`, `perihal`, `uraian_arsip`),

  CONSTRAINT `fk_arsip_gedung` FOREIGN KEY (`gedung_id`)
    REFERENCES `master_gedung` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_arsip_ruang` FOREIGN KEY (`ruang_id`)
    REFERENCES `master_ruang` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_arsip_rak` FOREIGN KEY (`rak_id`)
    REFERENCES `master_rak` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_arsip_unit` FOREIGN KEY (`unit_id`)
    REFERENCES `master_unit` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_arsip_kategori` FOREIGN KEY (`kategori_id`)
    REFERENCES `master_kategori` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_arsip_dus` FOREIGN KEY (`dus_id`)
    REFERENCES `master_dus` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- =====================================================================
-- 2b. FASE 7 — users (Login & Role -> Backend)
-- Kredensial produksi sungguhan (bukan lagi disimulasikan di frontend).
-- `password_hash` berformat "scrypt$<saltHex>$<hashHex>" — dibuat oleh
-- backend/config/auth.ts (hashPassword). JANGAN pernah menyimpan
-- password polos di kolom ini.
-- =====================================================================
CREATE TABLE IF NOT EXISTS `users` (
  `id`             VARCHAR(64)   NOT NULL,
  `username`       VARCHAR(100)  NOT NULL,
  `password_hash`  VARCHAR(255)  NOT NULL,
  `name`           VARCHAR(150)  NOT NULL,
  `email`          VARCHAR(150)  NOT NULL,
  `role`           ENUM('super_admin','admin','arsiparis','operator','viewer','auditor')
                                  NOT NULL DEFAULT 'viewer',
  `unit_kerja`     VARCHAR(255)  NULL,
  `avatar_url`     VARCHAR(500)  NULL,
  `is_active`      TINYINT(1)    NOT NULL DEFAULT 1,
  `last_login_at`  DATETIME      NULL,
  `created_at`     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_users_username` (`username`),
  UNIQUE KEY `uq_users_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
-- 2b-2. FASE 7 (revisi) — token_blacklist (Logout JWT Blacklist)
-- JWT pada dasarnya stateless: begitu ditandatangani, token itu SAH
-- sampai `exp`-nya lewat, walau usernya sudah menekan "Logout". Tabel
-- ini menyimpan `jti` (id unik per token, lihat backend/config/auth.ts)
-- dari token yang sudah di-logout SEBELUM masa berlakunya habis --
-- requireAuth/optionalAuth (backend/middleware/auth.ts) menolak token
-- mana pun yang jti-nya ada di sini, walau tanda tangan & `exp`-nya
-- masih valid. Baris kedaluwarsa aman dibuang kapan saja (mis. lewat
-- cron `DELETE FROM token_blacklist WHERE expires_at < NOW()`) karena
-- token itu sendiri sudah otomatis ditolak begitu `exp` lewat.
-- =====================================================================
CREATE TABLE IF NOT EXISTS `token_blacklist` (
  `jti`             VARCHAR(64)  NOT NULL,
  `blacklisted_at`  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `expires_at`      DATETIME     NOT NULL,
  PRIMARY KEY (`jti`),
  KEY `idx_token_blacklist_expires` (`expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
-- 2c. FASE 8 — audit_logs (Audit Log -> MySQL)
-- Menggantikan array in-memory `auditLogs` yang dulu ada di server.ts.
-- user_name/user_role disimpan sebagai teks (bukan FK ke users.id)
-- supaya riwayat tetap terbaca apa adanya walau akun user-nya nanti
-- dihapus/diubah namanya.
-- =====================================================================
CREATE TABLE IF NOT EXISTS `audit_logs` (
  `id`           VARCHAR(64)   NOT NULL,
  `timestamp`    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `user_name`    VARCHAR(150)  NOT NULL,
  `user_role`    VARCHAR(50)   NOT NULL,
  `action`       VARCHAR(50)   NOT NULL,
  `item_target`  VARCHAR(255)  NULL,
  `details`      TEXT          NULL,
  `ip_address`   VARCHAR(64)   NULL,
  PRIMARY KEY (`id`),
  KEY `idx_audit_logs_timestamp` (`timestamp`),
  KEY `idx_audit_logs_action` (`action`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
-- 3. SEED DATA
-- Disamakan dengan src/data/initialMasterData.ts supaya tampilan
-- frontend & isi database konsisten sejak awal.
-- =====================================================================

INSERT INTO `master_kategori` (id, kode, nama, deskripsi, masa_simpan_tahun) VALUES
  ('kat-01', 'KAT-INAKTIF',  'Arsip Inaktif',            'Arsip yang frekuensi penggunaannya telah menurun namun masih memiliki nilai guna.', 5),
  ('kat-02', 'KAT-VITAL',    'Arsip Vital',              'Arsip keberadaannya merupakan persyaratan dasar bagi kelangsungan operasional instansi.', 10),
  ('kat-03', 'KAT-PERMANEN', 'Arsip Permanen',           'Arsip yang memiliki nilai guna kesejarahan/kebudayaan dan tidak boleh dimusnahkan.', 99),
  ('kat-04', 'KAT-TERBATAS', 'Arsip Terbatas / Rahasia', 'Arsip yang penggunaannya terbatas untuk pejabat berwenang.', 7)
ON DUPLICATE KEY UPDATE `nama` = VALUES(`nama`);

INSERT INTO `master_unit` (id, kode, nama_unit, kepala_unit) VALUES
  ('unit-01', 'BAG-HUK',     'Bagian Hukum & Organisasi',       'H. Ahmad Subagyo, S.H., M.H.'),
  ('unit-02', 'BAG-RENKEU',  'Bagian Perencanaan & Keuangan',   'Dra. Endang Rahayu, M.Si.'),
  ('unit-03', 'SUBBAG-UMUM', 'Subbag Kepegawaian & Umum',       'Bambang Triyono, S.Sos.'),
  ('unit-04', 'BAG-TU',      'Bagian Tata Usaha & Kearsipan',   'Ir. Hendra Kusuma')
ON DUPLICATE KEY UPDATE `nama_unit` = VALUES(`nama_unit`);

INSERT INTO `master_gedung` (id, kode, nama_gedung, alamat) VALUES
  ('gdg-01', 'GDG-A', 'Depo Arsip Utama (Gedung A)',          'Jl. Pemuda No. 45 Blok Central Kearsipan'),
  ('gdg-02', 'GDG-B', 'Gedung Depo Record Center (Gedung B)', 'Jl. Pemuda No. 47 Kompleks Pusat Data')
ON DUPLICATE KEY UPDATE `nama_gedung` = VALUES(`nama_gedung`);

INSERT INTO `master_ruang` (id, gedung_id, kode, nama_ruang) VALUES
  ('rng-01', 'gdg-01', 'R-101', 'Ruang Storage Inaktif Lantai 1'),
  ('rng-02', 'gdg-01', 'R-102', 'Ruang Khusus Arsip Vital & Permanent'),
  ('rng-03', 'gdg-02', 'R-201', 'Ruang Record Center B-1')
ON DUPLICATE KEY UPDATE `nama_ruang` = VALUES(`nama_ruang`);

INSERT INTO `master_rak` (id, ruang_id, kode, nama_rak, kapasitas_dus) VALUES
  ('rak-01', 'rng-01', 'RAK-A1', 'Rak Besi Presisi A1', 20),
  ('rak-02', 'rng-01', 'RAK-A2', 'Rak Besi Presisi A2', 20),
  ('rak-03', 'rng-02', 'RAK-B1', 'Rak Khusus Vault B1', 15)
ON DUPLICATE KEY UPDATE `nama_rak` = VALUES(`nama_rak`);

INSERT INTO `master_dus` (id, no_dus, rak_id, kapasitas_max_item, keterangan) VALUES
  ('dus-01', 'DUS-01/2026', 'rak-01', 50, 'Kotak Karton Standar ANRI Kualifikasi A1'),
  ('dus-02', 'DUS-02/2026', 'rak-01', 50, 'Kotak Karton Standar ANRI Kualifikasi A2'),
  ('dus-03', 'DUS-03/2026', 'rak-02', 40, 'Kotak Khusus Dokumen SOP & Vital')
ON DUPLICATE KEY UPDATE `keterangan` = VALUES(`keterangan`);

-- FASE 7: akun demo, disamakan dengan src/data/initialUsers.ts.
-- Password semua akun: "password123" (lihat catatan di header file ini).
INSERT INTO `users` (id, username, password_hash, name, email, role, unit_kerja, avatar_url) VALUES
  ('user-000', 'superadmin', 'scrypt$aa8f8bd14ee9f6c3994956b70fef5dd3$be68aebb8641779580e5291b59e4268eb3dd334672efb1f5a03d45f420f0eeb4168402af6e06fa47d037e856839c989a5bd4163e18b4abce572dc6e3af9872b5',
   'Ir. H. Gunawan (Super Admin)', 'superadmin@arsip2026.go.id', 'super_admin',
   'Kepala Pusat Teknologi & Sistem Kearsipan',
   'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=100&auto=format&fit=crop&q=80'),
  ('user-001', 'admin', 'scrypt$6180cdf81e6c6c786d90c070b28bad4e$8bbfd9da9272447a298aae46c2a0e83898209bb9927b8c8ad0a1ebebd8a936d0dfd8d8e9428cdc0b28388d881f0f70d23bdd26eb347b96b0c971f825cd951b05',
   'Administrator Utama', 'admin@arsip2026.go.id', 'admin',
   'Bagian Tata Usaha & Kearsipan',
   'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'),
  ('user-002', 'arsiparis', 'scrypt$d33b0699c51a573ee8fdb0c286b78569$ae2723778c3aeac8645c7076f9f17b3e95232e3e1e6b758973131942fde15371bafc8eea6cb8f299bad8adff72311e9444dbed8144bc50cb7c3d0cf0ae1376d7',
   'Supriyadi, S.AP (Arsiparis)', 'arsiparis@arsip2026.go.id', 'arsiparis',
   'Depo Arsip Utama',
   'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80'),
  ('user-004', 'operator', 'scrypt$aeeca5606cd0c30d55f747b4bbbab014$010287bdf4d75b6d2cb42a99d2cfedd6d8949c7a3236223775abe7dc1662c7fe6b7e1da56f10e05da0e7e985741f6add1e7a257ee4425b3dc172936e61309923',
   'Rina Wati, A.Md (Operator Entry)', 'operator@arsip2026.go.id', 'operator',
   'Subbag Pengolahan Berkas',
   'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&auto=format&fit=crop&q=80'),
  ('user-003', 'viewer', 'scrypt$c32558e81c0ebeb749ba8c89849af7ce$90bc1dfcf25e0c83b367a97f9cf47757629e00762dd14411392b31240fd2271cd6faa8c18ab72546dc00e7449fc249c067021c2ee76d023f762a78a4eef2d617',
   'Pegawai / Tamu Viewer', 'viewer@arsip2026.go.id', 'viewer',
   'Semua Subbagian Unit Kerja',
   'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80'),
  ('user-005', 'auditor', 'scrypt$7fd842662680c31375ed94c4c69750d2$2e4bc4dba864987c1ac438e92990cb69b1d3e0330b43c2bdb0d632b1ee6c5902025ad88477a13dce3b582fc480edd09065bba12831c29039a385956d1a62508c',
   'Drs. Herman, M.Si (Auditor Kearsipan)', 'auditor@arsip2026.go.id', 'auditor',
   'Inspektorat / Tim Audit Kearsipan',
   'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=100&auto=format&fit=crop&q=80')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

INSERT INTO `arsip`
  (id, nomor_keputusan, tanggal, perihal, uraian_arsip, jumlah_berkas, no_dus, lokasi_penyimpanan,
   keterangan, unit_pengolah, kategori_arsip, klasifikasi_akses, status_sirkulasi, status_retensi,
   gedung_id, ruang_id, rak_id, unit_id, kategori_id, dus_id, created_at, updated_at)
VALUES
  ('arsip-seed-001', '800/12/SK-KEP/2026', '2026-01-15',
   'Penetapan Struktur Organisasi Unit Kearsipan',
   'Berkas keputusan penetapan struktur organisasi beserta lampiran bagan.',
   3, 'DUS-01/2026', 'Gedung A / Ruang 101 / Rak A1',
   'Asli', 'Bagian Tata Usaha & Kearsipan', 'Arsip Vital', 'INTERNAL', 'TERSEDIA', 'AKTIF',
   'gdg-01', 'rng-01', 'rak-01', 'unit-04', 'kat-02', 'dus-01', NOW(), NOW()),
  ('arsip-seed-002', '800/28/SK-MUT/2026', '2026-02-03',
   'Mutasi Pegawai Antar Bidang',
   'Surat keputusan mutasi pegawai beserta berita acara serah terima.',
   2, 'DUS-02/2026', 'Gedung A / Ruang 101 / Rak A1',
   'Foto Kopi', 'Subbag Kepegawaian & Umum', 'Arsip Inaktif', 'INTERNAL', 'TERSEDIA', 'AKTIF',
   'gdg-01', 'rng-01', 'rak-01', 'unit-03', 'kat-01', 'dus-02', NOW(), NOW())
ON DUPLICATE KEY UPDATE `id` = `id`;

-- =====================================================================
-- 4. QUERY VALIDASI (opsional — jalankan manual di phpMyAdmin bila perlu)
-- =====================================================================

-- Hitung jumlah baris per tabel, pastikan semua ter-seed.
-- SELECT
--   (SELECT COUNT(*) FROM `master_kategori`) AS total_kategori,
--   (SELECT COUNT(*) FROM `master_unit`)     AS total_unit,
--   (SELECT COUNT(*) FROM `master_gedung`)   AS total_gedung,
--   (SELECT COUNT(*) FROM `master_ruang`)    AS total_ruang,
--   (SELECT COUNT(*) FROM `master_rak`)      AS total_rak,
--   (SELECT COUNT(*) FROM `master_dus`)      AS total_dus,
--   (SELECT COUNT(*) FROM `arsip`)           AS total_arsip,
--   (SELECT COUNT(*) FROM `users`)           AS total_users,
--   (SELECT COUNT(*) FROM `audit_logs`)      AS total_audit_logs;

-- Cek data arsip beserta nama master hasil JOIN unit_id/kategori_id/dus_id
-- (sekaligus memverifikasi FK baru mengarah ke baris yang benar).
-- SELECT
--   a.id, a.nomor_keputusan, a.perihal,
--   a.unit_pengolah AS unit_pengolah_teks, u.nama_unit AS unit_dari_relasi,
--   a.kategori_arsip AS kategori_teks, k.nama AS kategori_dari_relasi,
--   a.no_dus AS no_dus_teks, d.no_dus AS dus_dari_relasi
-- FROM `arsip` a
-- LEFT JOIN `master_unit` u     ON u.id = a.unit_id
-- LEFT JOIN `master_kategori` k ON k.id = a.kategori_id
-- LEFT JOIN `master_dus` d      ON d.id = a.dus_id;

-- Cari baris arsip yang unit_id/kategori_id/dus_id-nya kosong
-- (berguna untuk memantau progres migrasi dari kolom teks ke kolom relasi).
-- SELECT id, nomor_keputusan, unit_pengolah, unit_id, kategori_arsip, kategori_id, no_dus, dus_id
-- FROM `arsip`
-- WHERE unit_id IS NULL OR kategori_id IS NULL OR dus_id IS NULL;

-- Cek semua foreign key yang terpasang pada tabel arsip (harus ada 6:
-- gedung, ruang, rak, unit, kategori, dus).
-- SELECT constraint_name, column_name, referenced_table_name, referenced_column_name
-- FROM information_schema.KEY_COLUMN_USAGE
-- WHERE table_schema = 'daftar-pertelaan-arsip-2026'
--   AND table_name = 'arsip'
--   AND referenced_table_name IS NOT NULL;
