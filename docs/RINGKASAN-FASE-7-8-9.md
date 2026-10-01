# Ringkasan Perubahan — FASE 7, 8, 9

## Apa yang berubah

### FASE 7 — Login & Role → Backend
- Tabel `users` baru di MySQL (password di-hash pakai **scrypt**, bukan plaintext).
- `POST /api/auth/login`, `GET /api/auth/me`, `POST /api/auth/logout` (`backend/routes/auth.ts`).
- Token sesi = JWT (HS256) buatan sendiri lewat modul bawaan `crypto` Node — **tidak perlu install dependency baru**.
- Semua endpoint `/api/arsip`, `/api/audit-logs`, `/api/backup` sekarang **wajib login** (`requireAuth`), dan aksi
  tambah/edit/hapus/restore/backup dibatasi per **peran** (`requireRole`) sesuai `src/lib/permissions.ts`.
- `LoginModal.tsx` sekarang benar-benar memanggil backend, bukan mencocokkan username secara lokal.
- `App.tsx`: tidak lagi auto-login sebagai admin default — wajib login dulu; sesi divalidasi ulang lewat
  `GET /api/auth/me` saat aplikasi dibuka.

### FASE 8 — Audit Log → MySQL
- Tabel `audit_logs` baru; array in-memory di `server.ts` (hilang tiap restart) sudah dihapus total.
- `backend/routes/audit.ts`: `GET /api/audit-logs`, `POST /api/audit-logs`.
- **Fix keamanan**: identitas (`user_name`, `user_role`) yang tercatat di log **selalu diambil dari token JWT**
  yang sedang login, bukan dari body request — supaya audit trail tidak bisa dipalsukan.

### FASE 9 — PDF/Document Storage
- Lampiran PDF sekarang **disimpan sebagai file asli** di `backend/uploads/arsip/<random>.pdf`, bukan base64
  penuh di kolom database, dan bukan lagi PDF dummy yang sama untuk semua id.
- `GET /documents/:id.pdf` / `GET /api/documents/:id` (dan `GET /api/arsip/:id/pdf`) men-stream file asli yang
  pernah diunggah, dengan otentikasi (header `Authorization` atau `?token=` untuk `<iframe>`).
- Validasi: ukuran maks 15MB, harus benar-benar berformat PDF (cek magic bytes `%PDF-`).
- `PdfViewerModal.tsx` sekarang mengambil pratinjau/unduhan dari endpoint tersebut, bukan lagi dari base64 yang
  disimpan di memori.

## Cara menjalankan & testing

1. **Import skema database** (sudah termasuk tabel `users` & `audit_logs`, plus 6 akun demo):
   ```
   mysql -u root -p daftar-pertelaan-arsip-2026 < database/daftar-pertelaan-arsip-2026.sql
   ```
   (atau import lewat phpMyAdmin kalau pakai XAMPP)

2. **Cek `.env.local`** — sudah ada `JWT_SECRET` default untuk development. **Ganti nilainya** kalau mau dipakai
   di luar localhost.

3. **Install & jalankan**:
   ```
   npm install
   npm run dev
   ```

4. **Login** — buka aplikasinya, layar login akan muncul (tidak lagi auto-login). Semua akun demo pakai password
   yang sama: `password123`.
   | Username     | Peran        |
   |--------------|--------------|
   | superadmin   | super_admin  |
   | admin        | admin        |
   | arsiparis    | arsiparis    |
   | operator     | operator     |
   | viewer       | viewer       |
   | auditor      | auditor      |

5. **Uji cepat lewat curl** (opsional, di luar UI):
   ```bash
   # Login, ambil token
   curl -s -X POST http://localhost:3000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"username":"admin","password":"password123"}'

   # Pakai token dari respons di atas
   curl -s http://localhost:3000/api/audit-logs \
     -H "Authorization: Bearer <TOKEN_DARI_LOGIN>"

   # Tanpa token -> harus 401
   curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/api/arsip
   ```

6. **Uji PDF**: tambah/edit arsip lewat form, lampirkan PDF, simpan, lalu buka pratinjaunya (tombol mata/PDF di
   tabel). Cek juga bahwa file muncul sungguhan di `backend/uploads/arsip/` setelah disimpan.

## Catatan keamanan yang perlu diketahui

- `password123` di semua akun demo **hanya untuk development**. Ganti password akun sungguhan lewat
  `UserManagementModal.tsx` di aplikasi, atau `UPDATE users SET password_hash = ...` manual memakai
  `hashPassword()` dari `backend/config/auth.ts`.
- `JWT_SECRET` di `.env.local` juga contoh dev-only — wajib diganti string acak baru untuk lingkungan produksi
  (server akan mencetak peringatan di konsol kalau env var ini belum diset).
- Endpoint audit log (`POST /api/audit-logs`) tidak lagi mempercayai `user`/`role` dari body request — identitas
  selalu berasal dari token yang terverifikasi, supaya log tidak bisa dipalsukan oleh pemegang token yang sah
  sekalipun.
- File PDF divalidasi ukuran (maks 15MB) & tipe (harus header `%PDF-` yang valid) sebelum ditulis ke disk.
