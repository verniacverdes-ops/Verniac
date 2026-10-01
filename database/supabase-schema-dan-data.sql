-- =====================================================================
-- SI PERTELAAN ARSIP 2026 -- Skema + data untuk SUPABASE (PostgreSQL)
-- Hasil konversi dari database/daftar-pertelaan-arsip-2026.sql (MySQL).
-- Cara pakai: Supabase Dashboard -> SQL Editor -> New query -> tempel
-- seluruh isi file ini -> Run. Aman dijalankan ulang (IF NOT EXISTS /
-- ON CONFLICT DO NOTHING).
-- Isi: 10 tabel, master data, 6 akun demo (password: password123 --
-- WAJIB diganti sebelum produksi), dan 1 data arsip milik Anda.
-- Baris arsip contoh (arsip-seed-001/002) sengaja tidak disertakan.
-- =====================================================================

-- ---------- Fungsi: updated_at otomatis (pengganti ON UPDATE CURRENT_TIMESTAMP MySQL)
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS master_kategori (
  id                VARCHAR(64)  PRIMARY KEY,
  kode              VARCHAR(50)  NOT NULL UNIQUE,
  nama              VARCHAR(150) NOT NULL,
  deskripsi         TEXT NULL,
  masa_simpan_tahun INT NOT NULL DEFAULT 0,
  created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS master_unit (
  id          VARCHAR(64)  PRIMARY KEY,
  kode        VARCHAR(50)  NOT NULL UNIQUE,
  nama_unit   VARCHAR(150) NOT NULL,
  kepala_unit VARCHAR(150) NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS master_gedung (
  id          VARCHAR(64)  PRIMARY KEY,
  kode        VARCHAR(50)  NOT NULL UNIQUE,
  nama_gedung VARCHAR(150) NOT NULL,
  alamat      VARCHAR(255) NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS master_ruang (
  id         VARCHAR(64)  PRIMARY KEY,
  gedung_id  VARCHAR(64)  NOT NULL REFERENCES master_gedung(id) ON DELETE CASCADE ON UPDATE CASCADE,
  kode       VARCHAR(50)  NOT NULL UNIQUE,
  nama_ruang VARCHAR(150) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_master_ruang_gedung ON master_ruang (gedung_id);

CREATE TABLE IF NOT EXISTS master_rak (
  id            VARCHAR(64)  PRIMARY KEY,
  ruang_id      VARCHAR(64)  NOT NULL REFERENCES master_ruang(id) ON DELETE CASCADE ON UPDATE CASCADE,
  kode          VARCHAR(50)  NOT NULL UNIQUE,
  nama_rak      VARCHAR(150) NOT NULL,
  kapasitas_dus INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_master_rak_ruang ON master_rak (ruang_id);

CREATE TABLE IF NOT EXISTS master_dus (
  id                 VARCHAR(64) PRIMARY KEY,
  no_dus             VARCHAR(50) NOT NULL UNIQUE,
  rak_id             VARCHAR(64) NOT NULL REFERENCES master_rak(id) ON DELETE CASCADE ON UPDATE CASCADE,
  kapasitas_max_item INT NOT NULL DEFAULT 0,
  keterangan         VARCHAR(255) NULL,
  created_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_master_dus_rak ON master_dus (rak_id);

CREATE TABLE IF NOT EXISTS arsip (
  id                        VARCHAR(64)  PRIMARY KEY,
  nomor_arsip_otomatis      VARCHAR(100) NULL,
  nomor_keputusan           VARCHAR(255) NOT NULL,
  tanggal                   DATE         NOT NULL,
  perihal                   VARCHAR(500) NOT NULL,
  uraian_arsip              TEXT NULL,
  jumlah_berkas             INT NULL DEFAULT 1,
  no_dus                    VARCHAR(50)  NOT NULL,
  lokasi_penyimpanan        VARCHAR(255) NOT NULL,
  keterangan                TEXT NULL,
  unit_pengolah             VARCHAR(255) NULL,
  kategori_arsip            VARCHAR(100) NULL,
  klasifikasi_akses         VARCHAR(20)  NOT NULL DEFAULT 'INTERNAL'
    CHECK (klasifikasi_akses IN ('PUBLIK','INTERNAL','TERBATAS','RAHASIA','SANGAT_RAHASIA')),
  status_sirkulasi          VARCHAR(20)  NOT NULL DEFAULT 'TERSEDIA'
    CHECK (status_sirkulasi IN ('TERSEDIA','DIPINJAM','DIUSULKAN_MUSNAH','DIMUSNAHKAN')),
  peminjam_aktif            VARCHAR(255) NULL,
  tanggal_pinjam_aktif      DATE NULL,
  tanggal_jatuh_tempo_aktif DATE NULL,
  status_retensi            VARCHAR(20)  NOT NULL DEFAULT 'AKTIF'
    CHECK (status_retensi IN ('AKTIF','INAKTIF','SIAP_MUSNAH','PERMANEN')),
  tahun_retensi_inaktif_end INT NULL,
  pdf_attachment            JSONB NULL,
  gedung_id   VARCHAR(64) NULL REFERENCES master_gedung(id)   ON DELETE SET NULL ON UPDATE CASCADE,
  ruang_id    VARCHAR(64) NULL REFERENCES master_ruang(id)    ON DELETE SET NULL ON UPDATE CASCADE,
  rak_id      VARCHAR(64) NULL REFERENCES master_rak(id)      ON DELETE SET NULL ON UPDATE CASCADE,
  unit_id     VARCHAR(64) NULL REFERENCES master_unit(id)     ON DELETE SET NULL ON UPDATE CASCADE,
  kategori_id VARCHAR(64) NULL REFERENCES master_kategori(id) ON DELETE SET NULL ON UPDATE CASCADE,
  dus_id      VARCHAR(64) NULL REFERENCES master_dus(id)      ON DELETE SET NULL ON UPDATE CASCADE,
  is_deleted  SMALLINT NOT NULL DEFAULT 0 CHECK (is_deleted IN (0,1)),
  deleted_at  TIMESTAMP NULL,
  deleted_by  VARCHAR(255) NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_arsip_no_dus           ON arsip (no_dus);
CREATE INDEX IF NOT EXISTS idx_arsip_kategori         ON arsip (kategori_arsip);
CREATE INDEX IF NOT EXISTS idx_arsip_is_deleted       ON arsip (is_deleted);
CREATE INDEX IF NOT EXISTS idx_arsip_status_sirkulasi ON arsip (status_sirkulasi);
CREATE INDEX IF NOT EXISTS idx_arsip_gedung           ON arsip (gedung_id);
CREATE INDEX IF NOT EXISTS idx_arsip_ruang            ON arsip (ruang_id);
CREATE INDEX IF NOT EXISTS idx_arsip_rak              ON arsip (rak_id);
CREATE INDEX IF NOT EXISTS idx_arsip_unit_id          ON arsip (unit_id);
CREATE INDEX IF NOT EXISTS idx_arsip_kategori_id      ON arsip (kategori_id);
CREATE INDEX IF NOT EXISTS idx_arsip_dus_id           ON arsip (dus_id);

CREATE TABLE IF NOT EXISTS users (
  id            VARCHAR(64)  PRIMARY KEY,
  username      VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  name          VARCHAR(150) NOT NULL,
  email         VARCHAR(150) NOT NULL UNIQUE,
  role          VARCHAR(20)  NOT NULL DEFAULT 'viewer'
    CHECK (role IN ('super_admin','admin','arsiparis','operator','viewer','auditor')),
  unit_kerja    VARCHAR(255) NULL,
  avatar_url    VARCHAR(500) NULL,
  is_active     SMALLINT NOT NULL DEFAULT 1 CHECK (is_active IN (0,1)),
  last_login_at TIMESTAMP NULL,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS token_blacklist (
  jti            VARCHAR(64) PRIMARY KEY,
  blacklisted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at     TIMESTAMP NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_token_blacklist_expires ON token_blacklist (expires_at);

CREATE TABLE IF NOT EXISTS audit_logs (
  id          VARCHAR(64)  PRIMARY KEY,
  "timestamp" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  user_name   VARCHAR(150) NOT NULL,
  user_role   VARCHAR(50)  NOT NULL,
  action      VARCHAR(50)  NOT NULL,
  item_target VARCHAR(255) NULL,
  details     TEXT NULL,
  ip_address  VARCHAR(64)  NULL
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs ("timestamp");
CREATE INDEX IF NOT EXISTS idx_audit_logs_action    ON audit_logs (action);

-- ---------- Trigger updated_at
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['master_kategori','master_unit','master_gedung','master_ruang',
                           'master_rak','master_dus','arsip','users'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%s_updated_at ON %I', t, t);
    EXECUTE format('CREATE TRIGGER trg_%s_updated_at BEFORE UPDATE ON %I
                    FOR EACH ROW EXECUTE FUNCTION set_updated_at()', t, t);
  END LOOP;
END $$;

-- ---------- KEAMANAN: aktifkan Row Level Security di semua tabel.
-- Supabase otomatis membuka tabel lewat REST API (kunci anon). Tanpa RLS,
-- siapa pun yang punya kunci anon bisa membaca tabel users (hash password)
-- dan seluruh arsip. Tanpa policy, hanya koneksi server (role postgres)
-- yang bisa mengakses; itu yang dipakai backend aplikasi ini.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['master_kategori','master_unit','master_gedung','master_ruang',
                           'master_rak','master_dus','arsip','users','token_blacklist','audit_logs'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
  END LOOP;
END $$;

-- ---------- SEED MASTER DATA & AKUN DEMO
INSERT INTO master_kategori (id, kode, nama, deskripsi, masa_simpan_tahun) VALUES
  ('kat-01', 'KAT-INAKTIF',  'Arsip Inaktif',            'Arsip yang frekuensi penggunaannya telah menurun namun masih memiliki nilai guna.', 5),
  ('kat-02', 'KAT-VITAL',    'Arsip Vital',              'Arsip keberadaannya merupakan persyaratan dasar bagi kelangsungan operasional instansi.', 10),
  ('kat-03', 'KAT-PERMANEN', 'Arsip Permanen',           'Arsip yang memiliki nilai guna kesejarahan/kebudayaan dan tidak boleh dimusnahkan.', 99),
  ('kat-04', 'KAT-TERBATAS', 'Arsip Terbatas / Rahasia', 'Arsip yang penggunaannya terbatas untuk pejabat berwenang.', 7)
ON CONFLICT (id) DO NOTHING;

INSERT INTO master_unit (id, kode, nama_unit, kepala_unit) VALUES
  ('unit-01', 'BAG-HUK',     'Bagian Hukum & Organisasi',       'H. Ahmad Subagyo, S.H., M.H.'),
  ('unit-02', 'BAG-RENKEU',  'Bagian Perencanaan & Keuangan',   'Dra. Endang Rahayu, M.Si.'),
  ('unit-03', 'SUBBAG-UMUM', 'Subbag Kepegawaian & Umum',       'Bambang Triyono, S.Sos.'),
  ('unit-04', 'BAG-TU',      'Bagian Tata Usaha & Kearsipan',   'Ir. Hendra Kusuma')
ON CONFLICT (id) DO NOTHING;

INSERT INTO master_gedung (id, kode, nama_gedung, alamat) VALUES
  ('gdg-01', 'GDG-A', 'Depo Arsip Utama (Gedung A)',          'Jl. Pemuda No. 45 Blok Central Kearsipan'),
  ('gdg-02', 'GDG-B', 'Gedung Depo Record Center (Gedung B)', 'Jl. Pemuda No. 47 Kompleks Pusat Data')
ON CONFLICT (id) DO NOTHING;

INSERT INTO master_ruang (id, gedung_id, kode, nama_ruang) VALUES
  ('rng-01', 'gdg-01', 'R-101', 'Ruang Storage Inaktif Lantai 1'),
  ('rng-02', 'gdg-01', 'R-102', 'Ruang Khusus Arsip Vital & Permanent'),
  ('rng-03', 'gdg-02', 'R-201', 'Ruang Record Center B-1')
ON CONFLICT (id) DO NOTHING;

INSERT INTO master_rak (id, ruang_id, kode, nama_rak, kapasitas_dus) VALUES
  ('rak-01', 'rng-01', 'RAK-A1', 'Rak Besi Presisi A1', 20),
  ('rak-02', 'rng-01', 'RAK-A2', 'Rak Besi Presisi A2', 20),
  ('rak-03', 'rng-02', 'RAK-B1', 'Rak Khusus Vault B1', 15)
ON CONFLICT (id) DO NOTHING;

INSERT INTO master_dus (id, no_dus, rak_id, kapasitas_max_item, keterangan) VALUES
  ('dus-01', 'DUS-01/2026', 'rak-01', 50, 'Kotak Karton Standar ANRI Kualifikasi A1'),
  ('dus-02', 'DUS-02/2026', 'rak-01', 50, 'Kotak Karton Standar ANRI Kualifikasi A2'),
  ('dus-03', 'DUS-03/2026', 'rak-02', 40, 'Kotak Khusus Dokumen SOP & Vital')
ON CONFLICT (id) DO NOTHING;

INSERT INTO users (id, username, password_hash, name, email, role, unit_kerja, avatar_url) VALUES
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
ON CONFLICT (id) DO NOTHING;

-- ---------- DATA ARSIP MILIK ANDA
INSERT INTO arsip
  (id, nomor_arsip_otomatis, nomor_keputusan, tanggal, perihal, uraian_arsip,
   jumlah_berkas, no_dus, lokasi_penyimpanan, keterangan, unit_pengolah,
   kategori_arsip, klasifikasi_akses, status_sirkulasi, peminjam_aktif,
   tanggal_pinjam_aktif, tanggal_jatuh_tempo_aktif, status_retensi,
   tahun_retensi_inaktif_end, gedung_id, ruang_id, rak_id,
   unit_id, kategori_id, dus_id,
   is_deleted, deleted_at, deleted_by, created_at, updated_at)
VALUES
  ('arsip-2026-001', '050/ARSIP-2026/001', '188.4/02/SK/2026', '2026-01-06',
   'Perubahan isi keputusan', NULL,
   1, 'DUS-01/2026', 'Depo Arsip Utama - Rak A1 - Baris 2', 'Dokumen Asli, 1 Berkas',
   'Bagian Hukum & Organisasi',
   'Permanen', 'INTERNAL', 'TERSEDIA', NULL,
   NULL, NULL, 'INAKTIF',
   NULL, 'gdg-01', 'rng-01', 'rak-01',
   'unit-01', NULL, 'dus-01',
   0, NULL, NULL, '2026-08-10 11:06:33', '2026-08-10 11:08:56')
ON CONFLICT (id) DO NOTHING;
