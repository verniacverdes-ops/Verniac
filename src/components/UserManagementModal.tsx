import React, { useState } from 'react';
import { User, UserRole, NewUserInput, UpdateUserInput } from '../types';
import { Shield, Plus, Trash2, Edit3, X, Lock, Loader2, Eye, EyeOff, AlertTriangle } from 'lucide-react';

interface UserManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: User[];
  currentUser: User | null;
  isLoadingUsers?: boolean;
  loadError?: string;
  // "Buat Akun": ketiga handler ini sekarang memanggil backend sungguhan
  // (POST/PUT/DELETE /api/users, lihat backend/routes/users.ts) dan bisa
  // gagal (username/email dobel, password terlalu pendek, dst) — makanya
  // async & mengembalikan pesan error kalau gagal, supaya form tidak
  // langsung tertutup padahal akunnya belum tentu tersimpan.
  onAddUser: (input: NewUserInput) => Promise<string | null>;
  onUpdateUser: (input: UpdateUserInput) => Promise<string | null>;
  onDeleteUser: (id: string) => Promise<string | null>;
}

const MIN_PASSWORD_LENGTH = 8;

export const UserManagementModal: React.FC<UserManagementModalProps> = ({
  isOpen,
  onClose,
  users,
  currentUser,
  isLoadingUsers,
  loadError,
  onAddUser,
  onUpdateUser,
  onDeleteUser,
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('arsiparis');
  const [unitKerja, setUnitKerja] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleOpenAdd = () => {
    setEditingId(null);
    setName('');
    setUsername('');
    setEmail('');
    setRole('arsiparis');
    setUnitKerja('Subbagian Kearsipan');
    setPassword('');
    setFormError('');
    setIsAdding(true);
  };

  const handleEditUser = (user: User) => {
    setEditingId(user.id);
    setName(user.name);
    setUsername(user.username);
    setEmail(user.email);
    setRole(user.role);
    setUnitKerja(user.unitKerja || '');
    setPassword('');
    setFormError('');
    setIsAdding(true);
  };

  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!name.trim() || !username.trim() || !email.trim()) {
      setFormError('Harap isi Nama, Username, dan Email!');
      return;
    }

    // Password WAJIB untuk akun baru, OPSIONAL untuk edit (kosongkan =
    // tidak diubah) — lihat backend/routes/users.ts untuk aturan yang sama
    // di sisi server (form ini divalidasi dua kali: di sini untuk UX
    // instan, dan lagi di backend supaya tidak bisa dilewati lewat curl).
    if (!editingId && password.length < MIN_PASSWORD_LENGTH) {
      setFormError(`Kata sandi wajib diisi, minimal ${MIN_PASSWORD_LENGTH} karakter.`);
      return;
    }
    if (editingId && password && password.length < MIN_PASSWORD_LENGTH) {
      setFormError(`Kata sandi baru minimal ${MIN_PASSWORD_LENGTH} karakter, atau kosongkan untuk tidak mengubahnya.`);
      return;
    }

    setIsSaving(true);
    try {
      const errorMessage = editingId
        ? await onUpdateUser({
            id: editingId,
            name: name.trim(),
            username: username.trim().toLowerCase(),
            email: email.trim(),
            role,
            unitKerja: unitKerja.trim(),
            password: password || undefined,
          })
        : await onAddUser({
            name: name.trim(),
            username: username.trim().toLowerCase(),
            email: email.trim(),
            role,
            unitKerja: unitKerja.trim(),
            password,
          });

      if (errorMessage) {
        setFormError(errorMessage);
        return;
      }

      setIsAdding(false);
      setPassword('');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (user: User) => {
    if (!window.confirm(`Hapus akun ${user.name}?`)) return;
    setDeletingId(user.id);
    const errorMessage = await onDeleteUser(user.id);
    setDeletingId(null);
    if (errorMessage) {
      alert(errorMessage);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-6 flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-purple-600/30 text-purple-400 rounded-lg">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold">Manajemen Pengguna & Hak Akses (RBAC)</h2>
              <p className="text-xs text-slate-400">Atur Peran, Akses CRUD & Akun Petugas Arsip 2026</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5 text-xs">

          {loadError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs font-medium flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> {loadError}
            </div>
          )}

          {/* Top Actions */}
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 uppercase">
              Daftar Pengguna Sistem Kearsipan {isLoadingUsers && <Loader2 className="inline w-3 h-3 ml-1 animate-spin" />}
            </h3>
            {!isAdding && (
              <button
                onClick={handleOpenAdd}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Pengguna Baru</span>
              </button>
            )}
          </div>

          {/* Form Create / Edit */}
          {isAdding && (
            <form onSubmit={handleSaveForm} className="p-4 bg-purple-50/70 border border-purple-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between font-bold text-purple-900 text-xs uppercase">
                <span>{editingId ? 'Edit Data Pengguna' : 'Input Pengguna Baru'}</span>
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="text-slate-500 hover:text-slate-800"
                >
                  Batal
                </button>
              </div>

              {formError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-[11px] font-medium">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700">Nama Lengkap</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Contoh: Drs. Bambang Sutrisno"
                    className="w-full mt-1 p-2 bg-white border border-slate-300 rounded text-xs"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700">Username Login</label>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="bambang_arsip"
                    className="w-full mt-1 p-2 bg-white border border-slate-300 rounded text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-700">Email Official</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="bambang@arsip2026.go.id"
                    className="w-full mt-1 p-2 bg-white border border-slate-300 rounded text-xs"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700">Hak Akses / Role</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    className="w-full mt-1 p-2 bg-white border border-slate-300 rounded text-xs font-bold"
                  >
                    <option value="super_admin">Super Admin (Full Akses + Sangat Rahasia + User Mgmt)</option>
                    <option value="admin">Admin Arsip (Full CRUD + Rahasia + Backup + Approval)</option>
                    <option value="arsiparis">Arsiparis (Tambah/Edit + Terbatas + Approval)</option>
                    <option value="operator">Operator (Tambah/Edit + Internal)</option>
                    <option value="viewer">Viewer (Hanya Lihat & Ekspor Public/Internal)</option>
                    <option value="auditor">Auditor (Akses Audit + Verifikasi Semua Klasifikasi)</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700">Unit Kerja</label>
                  <input
                    type="text"
                    value={unitKerja}
                    onChange={(e) => setUnitKerja(e.target.value)}
                    placeholder="Subbagian Kepegawaian"
                    className="w-full mt-1 p-2 bg-white border border-slate-300 rounded text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 flex items-center gap-1">
                  <Lock className="w-3 h-3" />
                  {editingId ? 'Kata Sandi Baru (opsional)' : 'Kata Sandi Awal'}
                </label>
                <div className="relative mt-1">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required={!editingId}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={editingId ? 'Kosongkan kalau tidak diubah' : `Minimal ${MIN_PASSWORD_LENGTH} karakter`}
                    className="w-full p-2 pr-9 bg-white border border-slate-300 rounded text-xs font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute inset-y-0 right-0 px-2.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  Akun ini langsung bisa dipakai login lewat form "Masuk Akun Sistem" begitu disimpan
                  (bukan lagi cuma tersimpan di tampilan seperti sebelumnya).
                </p>
              </div>

              <div className="pt-2 text-right">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-1.5 bg-purple-700 hover:bg-purple-600 disabled:opacity-60 text-white font-bold rounded-lg text-xs cursor-pointer shadow-2xs inline-flex items-center gap-1.5"
                >
                  {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{isSaving ? 'Menyimpan...' : 'Simpan Pengguna'}</span>
                </button>
              </div>
            </form>
          )}

          {/* User Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-bold uppercase text-[11px] border-b border-slate-200">
                  <th className="p-2.5">Pengguna</th>
                  <th className="p-2.5">Username / Email</th>
                  <th className="p-2.5">Hak Akses (Role)</th>
                  <th className="p-2.5 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50">
                    <td className="p-2.5 font-bold text-slate-900 flex items-center gap-2">
                      <img
                        src={u.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'}
                        alt={u.name}
                        className="w-7 h-7 rounded-full object-cover border border-slate-300"
                      />
                      <div>
                        <div className="flex items-center gap-1.5">
                          {u.name}
                          {currentUser?.id === u.id && (
                            <span className="text-[9px] font-bold text-purple-700 bg-purple-100 border border-purple-200 px-1.5 py-0.5 rounded">
                              ANDA
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] font-normal text-slate-500">{u.unitKerja || 'Unit Kerja'}</div>
                      </div>
                    </td>
                    <td className="p-2.5">
                      <div className="font-mono text-slate-800 font-semibold">{u.username}</div>
                      <div className="text-slate-500 text-[10px]">{u.email}</div>
                    </td>
                    <td className="p-2.5">
                      <span
                        className={`font-bold px-2 py-0.5 rounded border uppercase text-[10px] ${
                          u.role === 'super_admin'
                            ? 'bg-purple-900 text-purple-100 border-purple-800'
                            : u.role === 'admin'
                            ? 'bg-purple-100 text-purple-800 border-purple-200'
                            : u.role === 'arsiparis'
                            ? 'bg-blue-100 text-blue-800 border-blue-200'
                            : u.role === 'operator'
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                            : u.role === 'auditor'
                            ? 'bg-amber-100 text-amber-800 border-amber-200'
                            : 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="p-2.5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleEditUser(u)}
                          className="p-1 text-slate-600 hover:text-amber-600 rounded cursor-pointer"
                          title="Edit User"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        {users.length > 1 && currentUser?.id !== u.id && (
                          <button
                            onClick={() => handleDelete(u)}
                            disabled={deletingId === u.id}
                            className="p-1 text-slate-600 hover:text-rose-600 rounded cursor-pointer disabled:opacity-50"
                            title="Hapus User"
                          >
                            {deletingId === u.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5" />
                            )}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Matrix Hak Akses Info */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <h4 className="font-bold text-slate-900 uppercase text-[11px] flex items-center gap-1">
              <Lock className="w-3.5 h-3.5 text-purple-600" /> Matriks Hak Akses (Hak Akses Matrix)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
              <div className="p-2 bg-white rounded border border-slate-200">
                <span className="font-bold text-purple-800">Super Admin:</span>
                <p className="text-slate-600 mt-0.5">Tambah, Edit, Hapus, Ekspor, Cetak, Atur Instansi, Manajemen User & API Laravel.</p>
              </div>

              <div className="p-2 bg-white rounded border border-slate-200">
                <span className="font-bold text-blue-800">Arsiparis:</span>
                <p className="text-slate-600 mt-0.5">Tambah, Edit, Duplikat, Cetak, dan Ekspor Arsip. (Tanpa Hapus Massal & User Admin).</p>
              </div>

              <div className="p-2 bg-white rounded border border-slate-200">
                <span className="font-bold text-slate-800">Viewer:</span>
                <p className="text-slate-600 mt-0.5">Hanya dapat mencari, memfilter, melihat detail, dan mencetak dokumen pertelaan.</p>
              </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 text-right shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-lg text-xs cursor-pointer"
          >
            Tutup Window
          </button>
        </div>

      </div>
    </div>
  );
};
