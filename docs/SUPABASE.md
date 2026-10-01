# Menjalankan dengan Supabase (PostgreSQL)

1. Supabase -> SQL Editor -> tempel isi `database/supabase-schema-dan-data.sql` -> Run
   (atau lokal: isi `DATABASE_URL` di `.env.local`, lalu `npm run db:init`).
2. Isi `DATABASE_URL` dan `JWT_SECRET` (lihat `.env.example`).
3. `npm install` lalu `npm run dev`, buka http://localhost:3000/api/db-test
   untuk memastikan koneksi dan jumlah baris tiap tabel.
4. Login demo: superadmin / password123 (ganti sebelum produksi).

Catatan:
- Kode lama tetap memakai `pool.query("... ?")`; `backend/config/database.ts`
  menerjemahkannya ke PostgreSQL ($1, $2, ...).


## Tahap 1 — Lampiran arsip di Supabase Storage
1. Supabase -> SQL Editor -> jalankan `database/supabase-storage.sql`
   (membuat bucket privat `arsip-files`, maks 15 MB per berkas).
2. Isi `SUPABASE_URL` dan `SUPABASE_SERVICE_ROLE_KEY` di `.env.local`.
3. Saat server start, terminal menampilkan
   `[Storage] Lampiran disimpan di: Supabase Storage`.
   Kalau tertulis "disk lokal", berarti dua variabel di atas belum terisi.
- Berkas hanya bisa dibuka lewat aplikasi setelah login (bucket tidak publik).
- Kunci rahasia hanya dipakai di server (`backend/storage/fileStorage.ts`).

## Tahap 3 — Deploy ke Vercel
File yang ditambahkan: `vercel.json`, `backend/app.ts`, `backend/vercel.ts`, dan
`api/index.js` (hasil bundle; dibuat oleh `npm run build:api`).
1. Unggah seluruh isi proyek ke GitHub (tanpa `.env.local`, `node_modules`, `dist`).
2. Vercel -> Project -> Settings -> Environment Variables, isi:
   `DATABASE_URL`, `JWT_SECRET` (acak baru), `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.
3. Deploy ulang (Deployments -> Redeploy).
4. Buka `https://<domain-anda>/api/db-test` untuk memastikan database terbaca.
- Setelah mengubah kode di folder `backend/`, jalankan `npm run build:api` lalu
  unggah ulang `api/index.js` bersama perubahan lainnya.
- Batas Vercel: badan permintaan maksimal 4,5 MB, jadi lampiran lebih dari
  sekitar 3 MB akan ditolak sampai unggah-langsung ke Storage dibuat.

## Belum dikerjakan
- Halaman Register SOP masih tersimpan di browser (localStorage/IndexedDB).
