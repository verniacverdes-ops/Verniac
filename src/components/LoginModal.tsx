import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { DEFAULT_USERS } from '../data/initialUsers';
import { LogIn, Key, Shield, UserCheck, Eye, Lock, X, CheckCircle2, Server, Database, Loader2, ChevronDown, Archive, FileCheck2, ScanLine } from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  // FASE 7: onLogin sekarang menerima user yang SUDAH divalidasi backend
  // (lengkap dengan token JWT sungguhan dari POST /api/auth/login),
  // bukan lagi objek DEFAULT_USERS yang dicomot langsung dari frontend
  // tanpa verifikasi apa pun.
  onLogin: (user: User) => void;
  onLogout: () => void;
  onOpenBackendModal: () => void;
  // Base URL API backend, mis. "http://localhost:3000/api" — dipakai
  // untuk memanggil POST /auth/login secara langsung dari modal ini.
  apiUrl: string;
}

// Password demo untuk semua akun contoh di src/data/initialUsers.ts —
// lihat catatan seeding di database/daftar-pertelaan-arsip-2026.sql.
const DEMO_PASSWORD = 'password123';

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onLogin,
  onLogout,
  onOpenBackendModal,
  apiUrl,
}) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');

  // Sengaja dikosongkan (bukan lagi di-prefill "admin" / "password123")
  // supaya pengguna sungguhan mengetik kredensialnya sendiri, bukan
  // langsung melihat akun admin siap pakai di form utama.
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Daftar akun demo (Simulasi Hak Akses & Peran) sekarang disembunyikan
  // secara default -- ditaruh di balik bagian "Profil & Akun Demo" yang
  // baru terbuka kalau diklik, bukan langsung memenuhi form login utama.
  const [showDemoAccounts, setShowDemoAccounts] = useState(false);
  // Menyimpan username akun demo yang sedang diproses, supaya spinner
  // cuma muncul di tombol yang sedang diklik (bukan semua tombol).
  const [pendingDemoUsername, setPendingDemoUsername] = useState<string | null>(null);

  // FASE 7 (opsional): "Buat Akun langsung dari Login" — field terpisah
  // dari form login supaya tidak tertukar (nama/password registrasi
  // tidak otomatis dipakai lagi untuk login). Akun baru SELALU jadi
  // role "viewer" (server yang memaksa ini, lihat POST /api/auth/register
  // di backend/routes/auth.ts) -- Super Admin yang menaikkan hak akses
  // lewat panel Manajemen Pengguna kalau memang perlu.
  const [regName, setRegName] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');

  if (!isOpen) return null;

  const handleClose = () => {
    setMode('login');
    setErrorMessage('');
    setShowDemoAccounts(false);
    onClose();
  };

  /**
   * FASE 7: satu-satunya jalur otentikasi — SELALU lewat backend
   * (POST /api/auth/login). Backend yang memverifikasi password (hash
   * scrypt di tabel `users`), bukan frontend mencocokkan username ke
   * daftar statis seperti sebelumnya.
   */
  async function loginToBackend(usernameInput: string, passwordInput: string): Promise<User> {
    const response = await fetch(`${apiUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: usernameInput, password: passwordInput }),
    });

    let payload: any = null;
    try {
      payload = await response.json();
    } catch {
      // biarkan payload null, ditangani di bawah lewat !response.ok
    }

    if (!response.ok || !payload || payload.status !== 'success') {
      throw new Error(payload?.message || 'Login gagal. Periksa koneksi ke server backend.');
    }

    const apiUser = payload.data.user;
    const token = payload.data.token;

    // Cocokkan dengan DEFAULT_USERS supaya avatarUrl dari data statis
    // (tidak semua ikut disimpan di kolom users.avatar_url) tetap
    // konsisten dengan tampilan sebelumnya; kalau tidak ketemu, pakai
    // avatar_url dari server apa adanya.
    const staticMatch = DEFAULT_USERS.find((u) => u.username.toLowerCase() === apiUser.username.toLowerCase());

    return {
      id: apiUser.id,
      username: apiUser.username,
      name: apiUser.name,
      email: apiUser.email,
      role: apiUser.role as UserRole,
      unitKerja: apiUser.unitKerja || staticMatch?.unitKerja || '-',
      avatarUrl: apiUser.avatarUrl || staticMatch?.avatarUrl || '',
      token,
    };
  }

  const handleCustomLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsSubmitting(true);
    try {
      const user = await loginToBackend(username.trim(), password);
      onLogin(user);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Username atau kata sandi salah.');
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * "Buat Akun" — POST /api/auth/register. Server SELALU memaksa role
   * baru jadi "viewer" apa pun yang dikirim (lihat catatan di
   * backend/routes/auth.ts), jadi form ini sengaja tidak punya pilihan
   * role sama sekali.
   */
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsSubmitting(true);
    try {
      const response = await fetch(`${apiUrl}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: regName.trim(),
          username: regUsername.trim(),
          email: regEmail.trim(),
          password: regPassword,
        }),
      });

      let payload: any = null;
      try {
        payload = await response.json();
      } catch {
        // biarkan payload null, ditangani lewat !response.ok di bawah
      }

      if (!response.ok || !payload || payload.status !== 'success') {
        throw new Error(payload?.message || 'Pendaftaran akun gagal. Periksa koneksi ke server backend.');
      }

      const apiUser = payload.data.user;
      const token = payload.data.token;

      onLogin({
        id: apiUser.id,
        username: apiUser.username,
        name: apiUser.name,
        email: apiUser.email,
        role: apiUser.role as UserRole,
        unitKerja: apiUser.unitKerja || '-',
        avatarUrl: apiUser.avatarUrl || '',
        token,
      });
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Pendaftaran akun gagal.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectDemoUser = async (demoUser: User) => {
    setErrorMessage('');
    setPendingDemoUsername(demoUser.username);
    try {
      const user = await loginToBackend(demoUser.username, DEMO_PASSWORD);
      onLogin(user);
      onClose();
    } catch (err: any) {
      setErrorMessage(
        err.message ||
          `Gagal login sebagai ${demoUser.username}. Pastikan backend & tabel users sudah di-seed.`
      );
    } finally {
      setPendingDemoUsername(null);
    }
  };

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'super_admin':
        return {
          label: 'Super Admin (Akses Penuh + Sangat Rahasia)',
          bg: 'bg-purple-900 text-purple-100 border-purple-800',
        };
      case 'admin':
        return {
          label: 'Admin Arsip (Full CRUD + Rahasia + Backup)',
          bg: 'bg-purple-100 text-purple-800 border-purple-200',
        };
      case 'arsiparis':
        return {
          label: 'Arsiparis (Tambah, Edit, Approval)',
          bg: 'bg-blue-100 text-blue-800 border-blue-200',
        };
      case 'operator':
        return {
          label: 'Operator (Entry Berkas & Label)',
          bg: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        };
      case 'viewer':
        return {
          label: 'Viewer (Hanya Baca & Cetak)',
          bg: 'bg-slate-100 text-slate-800 border-slate-200',
        };
      case 'auditor':
        return {
          label: 'Auditor (Audit Log & Verifikasi)',
          bg: 'bg-amber-100 text-amber-800 border-amber-200',
        };
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs">
      <div className="bg-white w-full h-full overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col md:flex-row">

        {/* Panel Kiri: dekoratif/branding -- supaya modal tidak terlalu
            polos. Disembunyikan di layar sempit (md:flex) supaya form
            tetap jadi fokus utama di mobile. */}
        <div className="hidden md:flex md:w-[38%] shrink-0 relative overflow-hidden bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 text-white p-7 flex-col justify-between">
          <div
            className="absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage:
                'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
              backgroundSize: '18px 18px',
            }}
            aria-hidden="true"
          />

          <div className="relative">
            <div className="inline-flex p-2.5 bg-blue-600/25 text-blue-300 rounded-xl border border-blue-500/30">
              <Archive className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold mt-4 leading-snug">Otentikasi & Hak Akses</h2>
            <p className="text-xs text-blue-200/70 mt-1">Modul Login Pengelola Kearsipan Tahun 2026</p>
          </div>

          <div className="relative space-y-4 py-6">
            <div className="flex items-start gap-3">
              <div className="p-1.5 bg-white/10 rounded-lg shrink-0 mt-0.5">
                <Shield className="w-4 h-4 text-blue-300" />
              </div>
              <div>
                <p className="text-xs font-bold text-white">Kontrol Akses Berlapis</p>
                <p className="text-[11px] text-blue-200/60 mt-0.5">6 peran berbeda, dari Viewer sampai Super Admin.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="p-1.5 bg-white/10 rounded-lg shrink-0 mt-0.5">
                <FileCheck2 className="w-4 h-4 text-emerald-300" />
              </div>
              <div>
                <p className="text-xs font-bold text-white">Jejak Audit Lengkap</p>
                <p className="text-[11px] text-blue-200/60 mt-0.5">Setiap login & perubahan arsip tercatat otomatis.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="p-1.5 bg-white/10 rounded-lg shrink-0 mt-0.5">
                <ScanLine className="w-4 h-4 text-amber-300" />
              </div>
              <div>
                <p className="text-xs font-bold text-white">Terhubung ke Backend Sungguhan</p>
                <p className="text-[11px] text-blue-200/60 mt-0.5">MySQL & API — bukan sekadar simulasi di browser.</p>
              </div>
            </div>
          </div>

          <p className="relative text-[10px] text-blue-200/40">Pertelaan Arsip • v1.0 • 2026</p>
        </div>

        {/* Panel Kanan: form login/registrasi + profil akun demo */}
        <div className="flex-1 min-w-0 flex flex-col relative">

          {/* Header ringkas -- cuma tampil di layar sempit (md:hidden)
              sebagai pengganti panel kiri yang disembunyikan di sana. */}
          <div className="md:hidden bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-blue-600/30 text-blue-400 rounded-lg">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold">Otentikasi & Hak Akses</h2>
                <p className="text-xs text-slate-400">Modul Login Pengelola Kearsipan 2026</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tombol close mode desktop -- mengambang di kanan atas panel
              kanan, karena header gelap besar sudah dipindah jadi panel
              kiri di layar lebar. */}
          <button
            onClick={handleClose}
            className="hidden md:flex absolute top-4 right-4 text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer z-10"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Modal Body — sebelumnya tidak bisa di-scroll sama sekali (modal
              luar memakai overflow-hidden tanpa batas tinggi), jadi di layar
              kecil/mobile daftar "Simulasi Hak Akses & Peran" di bawah bisa
              terpotong dan sama sekali tidak terjangkau. Sekarang seluruh
              body ini yang men-scroll (bukan cuma daftar akun demo saja),
              supaya form login di atasnya tetap terlihat sebagai konteks
              saat men-scroll ke bawah.

              PENTING: pusat vertikal dibuat lewat wrapper "m-auto" di
              bawah (BUKAN `justify-center` langsung di container
              overflow-y-auto ini). Kombinasi `justify-content: center`
              dengan `overflow: auto` punya bug dikenal di semua browser:
              kalau konten di dalamnya lebih tinggi dari area yang
              terlihat (mis. form "Buat Akun Baru" yang lebih panjang),
              bagian ATAS konten jadi tidak bisa dijangkau sama sekali
              lewat scroll -- termasuk tab "Masuk (Login)" di atasnya,
              jadi terlihat seperti macet/tidak bisa diklik. `margin: auto`
              pada wrapper di dalam TIDAK punya bug ini: tetap center kalau
              konten muat, dan tetap bisa di-scroll penuh ke atas & bawah
              kalau konten melebihi tinggi layar. */}
          <div className="p-6 sm:p-8 overflow-y-auto flex-1 flex flex-col">
            <div className="m-auto w-full max-w-md space-y-5">

          {/* Currently Logged In Banner */}
          {currentUser ? (
            <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Sesi Pengguna Aktif
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getRoleBadge(currentUser.role).bg}`}>
                  {currentUser.role.toUpperCase()}
                </span>
              </div>

              <div className="flex items-center gap-3 pt-1">
                <img
                  src={currentUser.avatarUrl}
                  alt={currentUser.name}
                  className="w-12 h-12 rounded-full border-2 border-white shadow-sm object-cover"
                />
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{currentUser.name}</h3>
                  <p className="text-xs text-slate-500">{currentUser.email}</p>
                  <p className="text-[11px] font-medium text-blue-600 mt-0.5">{currentUser.unitKerja}</p>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-slate-200 text-xs">
                <button
                  type="button"
                  onClick={onLogout}
                  className="px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-semibold rounded-lg transition-all cursor-pointer"
                >
                  Keluar / Logout Sesi
                </button>
                <button
                  type="button"
                  onClick={onOpenBackendModal}
                  className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 font-semibold"
                >
                  <Server className="w-3.5 h-3.5" /> Lihat API & Schema MySQL
                </button>
              </div>
            </div>
          ) : (
            /* Login / Register Tabs */
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-lg text-xs font-bold">
                <button
                  type="button"
                  onClick={() => { setMode('login'); setErrorMessage(''); setShowDemoAccounts(false); }}
                  className={`py-1.5 rounded-md transition-all cursor-pointer ${
                    mode === 'login' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Masuk (Login)
                </button>
                <button
                  type="button"
                  onClick={() => { setMode('register'); setErrorMessage(''); setShowDemoAccounts(false); }}
                  className={`py-1.5 rounded-md transition-all cursor-pointer ${
                    mode === 'register' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Buat Akun Baru
                </button>
              </div>

              {errorMessage && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs font-medium">
                  {errorMessage}
                </div>
              )}

              {mode === 'login' ? (
            /* Login Form.

               PENTING soal autofill: form ini SEBELUMNYA sempat punya
               defaultValue="admin" / "password123" (sudah dihapus), tapi
               begitu Chrome pernah menyimpan kombinasi itu sebagai
               "saved password" untuk localhost:3000, Chrome akan TERUS
               mengisi ulang field ini secara otomatis di kunjungan
               berikutnya -- terlepas dari apa pun value awal di React.
               `autoComplete="off"` saja tidak cukup (Chrome sengaja
               mengabaikannya khusus untuk form login), jadi dipakai
               trik decoy: dua input tersembunyi bernama "username"/
               "password" di atas, supaya autofill Chrome "tertipu"
               mengisi decoy itu, bukan field asli (yang sengaja diberi
               name unik supaya tidak cocok dengan kredensial tersimpan). */
            <form onSubmit={handleCustomLogin} className="space-y-4" autoComplete="off">
              <input type="text" name="username" autoComplete="username" tabIndex={-1} aria-hidden="true" style={{ position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none' }} />
              <input type="password" name="password" autoComplete="current-password" tabIndex={-1} aria-hidden="true" style={{ position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none' }} />

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase flex items-center gap-1">
                  <UserCheck className="w-3.5 h-3.5 text-blue-600" /> Username
                </label>
                <input
                  type="text"
                  name="login_username_field"
                  autoComplete="off"
                  data-lpignore="true"
                  data-1p-ignore="true"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Ketik username (admin / arsiparis / viewer)"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase flex items-center gap-1">
                  <Key className="w-3.5 h-3.5 text-blue-600" /> Kata Sandi (Password)
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="login_password_field"
                    autoComplete="new-password"
                    data-lpignore="true"
                    data-1p-ignore="true"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Masukkan kata sandi..."
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold rounded-lg text-sm shadow-sm transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
                <span>{isSubmitting ? 'Memverifikasi...' : 'Masuk Akun Sistem'}</span>
              </button>
            </form>
              ) : (
                /* Register Form — akun baru selalu jadi role "viewer" di
                   server (lihat POST /api/auth/register), makanya di sini
                   sengaja tidak ada pilihan role sama sekali.

                   Sama seperti form login: pakai decoy field + name unik
                   supaya autofill Chrome (yang mengingat kredensial lama
                   dari domain ini) tidak salah mengisi "Nama Lengkap"
                   dengan username tersimpan seperti yang terlihat sebelumnya. */
                <form onSubmit={handleRegister} className="space-y-4" autoComplete="off">
                  <input type="text" name="username" autoComplete="username" tabIndex={-1} aria-hidden="true" style={{ position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none' }} />
                  <input type="password" name="password" autoComplete="current-password" tabIndex={-1} aria-hidden="true" style={{ position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none' }} />

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase flex items-center gap-1">
                      <UserCheck className="w-3.5 h-3.5 text-blue-600" /> Nama Lengkap
                    </label>
                    <input
                      type="text"
                      name="register_fullname_field"
                      autoComplete="off"
                      data-lpignore="true"
                      data-1p-ignore="true"
                      required
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      placeholder="Nama sesuai identitas resmi"
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase flex items-center gap-1">
                      <UserCheck className="w-3.5 h-3.5 text-blue-600" /> Username
                    </label>
                    <input
                      type="text"
                      name="register_username_field"
                      autoComplete="off"
                      data-lpignore="true"
                      data-1p-ignore="true"
                      required
                      value={regUsername}
                      onChange={(e) => setRegUsername(e.target.value)}
                      placeholder="Username unik untuk login"
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase flex items-center gap-1">
                      <UserCheck className="w-3.5 h-3.5 text-blue-600" /> Email
                    </label>
                    <input
                      type="email"
                      name="register_email_field"
                      autoComplete="off"
                      data-lpignore="true"
                      data-1p-ignore="true"
                      required
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="email@instansi.go.id"
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase flex items-center gap-1">
                      <Key className="w-3.5 h-3.5 text-blue-600" /> Kata Sandi (min. 8 karakter)
                    </label>
                    <input
                      type="password"
                      name="register_password_field"
                      autoComplete="new-password"
                      data-lpignore="true"
                      data-1p-ignore="true"
                      required
                      minLength={8}
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="Buat kata sandi baru..."
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <p className="text-[11px] text-slate-500 bg-slate-50 border border-slate-200 rounded-lg p-2.5">
                    Akun baru otomatis mendapat peran <strong>Viewer</strong> (hanya lihat, cari, dan cetak). Untuk hak
                    akses lebih tinggi, hubungi Super Admin agar peran Anda dinaikkan lewat panel Manajemen Pengguna.
                  </p>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold rounded-lg text-sm shadow-sm transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserCheck className="w-4 h-4" />}
                    <span>{isSubmitting ? 'Mendaftarkan...' : 'Buat Akun & Masuk'}</span>
                  </button>
                </form>
              )}
            </div>
          )}

          <hr className="border-slate-200" />

          {/* Profil & Akun Demo -- sebelumnya daftar "Simulasi Hak Akses &
              Peran" ini langsung tampil penuh di form login utama. Sekarang
              disembunyikan di belakang toggle ini (collapsed by default)
              supaya form login utama terasa lebih ringkas & tidak bikin
              orang mengira admin/password sudah "disediakan". */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setShowDemoAccounts((v) => !v)}
              className="w-full flex items-center justify-between text-left cursor-pointer group"
            >
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5 group-hover:text-blue-700 transition-colors">
                <Shield className="w-3.5 h-3.5 text-blue-600" /> Profil & Simulasi Akun Demo
              </span>
              <ChevronDown
                className={`w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-transform ${showDemoAccounts ? 'rotate-180' : ''}`}
              />
            </button>

            {showDemoAccounts && (
              <div className="space-y-2 pt-1 animate-in fade-in duration-150">
                <p className="text-[11px] text-slate-500">
                  Klik salah satu akun di bawah untuk login sungguhan lewat backend (kata sandi demo:{' '}
                  <span className="font-mono font-bold text-slate-700">{DEMO_PASSWORD}</span>):
                </p>

                <div className="space-y-2 pt-1 max-h-64 overflow-y-auto pr-1 -mr-1">
                  {DEFAULT_USERS.map((demoUser) => {
                    const badge = getRoleBadge(demoUser.role);
                    const isSelected = currentUser?.username === demoUser.username;
                    const isPending = pendingDemoUsername === demoUser.username;

                    return (
                      <button
                        key={demoUser.id}
                        type="button"
                        disabled={isPending}
                        onClick={() => handleSelectDemoUser(demoUser)}
                        className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer disabled:opacity-60 ${
                          isSelected
                            ? 'bg-blue-50 border-blue-400 ring-2 ring-blue-500/20'
                            : 'bg-slate-50 hover:bg-slate-100 border-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <img
                            src={demoUser.avatarUrl}
                            alt={demoUser.name}
                            className="w-8 h-8 rounded-full object-cover border border-slate-300"
                          />
                          <div>
                            <p className="text-xs font-bold text-slate-900">{demoUser.name}</p>
                            <p className="text-[10px] text-slate-500">Username: <span className="font-mono font-bold text-slate-700">{demoUser.username}</span></p>
                          </div>
                        </div>

                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border flex items-center gap-1 ${badge.bg}`}>
                          {isPending && <Loader2 className="w-3 h-3 animate-spin" />}
                          {demoUser.role}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Integration info button */}
          <div className="pt-2 text-center">
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenBackendModal();
              }}
              className="inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-blue-600 underline font-medium cursor-pointer"
            >
              <Database className="w-3.5 h-3.5 text-blue-600" />
              <span>Panduan Struktur Database MySQL & API Endpoint</span>
            </button>
          </div>

            </div>
        </div>

        </div>

      </div>
    </div>
  );
};
