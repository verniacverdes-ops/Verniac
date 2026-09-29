# Ringkasan Perubahan — FASE 7, 8, 9, 11 + Manajemen Pengguna

## Update terbaru: "Buat Akun", "Scroll Role Demo", "Testing Keseluruhan"

### Buat Akun → Backend
- Sebelumnya "Tambah Pengguna Baru" di `UserManagementModal.tsx` **tidak punya field password sama sekali**
  dan hanya menyimpan ke state React/localStorage — akun yang "dibuat" di situ tidak akan pernah bisa
  benar-benar login lewat `POST /api/auth/login`.
- `backend/routes/users.ts` (baru): `GET/POST/PUT/DELETE /api/users`, dibatasi untuk peran `super_admin`
  saja (sesuai `PERMISSION_MATRIX.manageUser` di `src/lib/permissions.ts`). Password wajib (≥8 karakter)
  saat membuat akun baru, opsional saat edit (kosongkan = tidak diubah). Tidak bisa hapus akun sendiri.
- `UserManagementModal.tsx`: ditambah field kata sandi (dengan toggle show/hide), validasi panjang minimum,
  indikator loading saat menyimpan/menghapus, dan pesan error dari server ditampilkan langsung di form.
- `App.tsx`: `handleAddUser`/`handleUpdateUser`/`handleDeleteUser` sekarang memanggil backend sungguhan dan
  memuat ulang daftar akun dari `GET /api/users` setiap kali modal dibuka.
- **Bug ditemukan & diperbaiki saat testing**: `Header.tsx` menggerbang tombol "Manajemen Hak Akses (RBAC)"
  dengan `role === 'admin'` — padahal `PERMISSION_MATRIX` hanya memberi `manageUser: true` ke `super_admin`.
  Akibatnya, `super_admin` (satu-satunya peran yang seharusnya bisa mengelola akun) **tidak pernah melihat
  tombolnya sama sekali**. Sudah diperbaiki untuk membaca `hasRolePermission(role, 'manageUser')` langsung
  dari matriks, bukan hardcode nama role. Tombol "Pengaturan Instansi" (beda urusan) tetap terbuka untuk
  `admin` & `super_admin` seperti semula — tidak ikut tercabut oleh perbaikan ini.
- Bug serupa juga ditemukan di `canAdd` (tombol tambah arsip): sebelumnya hanya mengizinkan `admin`/`arsiparis`
  padahal `operator` & `super_admin` juga punya `tambah: true` di matriks. Sudah diperbaiki dengan cara yang sama.

### Scroll Role Demo
- Modal login (`LoginModal.tsx`) sebelumnya memakai `overflow-hidden` tanpa batas tinggi sama sekali — di
  layar kecil/mobile, daftar "Simulasi Hak Akses & Peran" bisa terpotong di bawah viewport dan **tidak bisa
  di-scroll untuk dijangkau**.
- Diperbaiki: modal sekarang dibatasi `max-h-[90vh]`, header dipin (`shrink-0`), dan seluruh isi modal
  (form login + daftar demo) berada dalam area yang bisa di-scroll. Daftar akun demo juga diberi
  `max-h-64 overflow-y-auto` sendiri supaya tetap ringkas saat form login sedang terbuka bersamaan.

### Testing Keseluruhan (tanpa akses MySQL/npm langsung di sesi ini)
Karena lingkungan pengerjaan ini tidak punya akses jaringan/MySQL, pengujian dilakukan secara statis:
- Semua file baru/diedit dicek seimbang kurung `{}[]()`-nya.
- Parser `splitStatements` di `backend/scripts/dbInit.ts` disimulasikan terhadap SQL sungguhan (lihat bagian
  FASE sebelumnya) — 21 statement terbaca benar, tidak ada yang tertelan oleh komentar.
- Semua pemakaian prop antar komponen (`UserManagementModal`, `LoginModal`, `Header`) dicocokkan manual
  terhadap interface TypeScript-nya.
- Endpoint baru (`/api/users`) dicocokkan pola auth/role-guard-nya dengan endpoint yang sudah ada
  (`/api/arsip`, `/api/master`) untuk konsistensi.
- **Belum bisa** dijalankan end-to-end (`npm install` + MySQL sungguhan + klik-klik di browser) dari sisi
  saya — silakan jalankan langkah di bagian "Cara menjalankan & testing" di bawah dan kabari kalau ada yang
  masih tidak sesuai.

---

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
