import React, { useState, useRef, useEffect } from 'react';
import { User } from '../types';
import { Menu, Search, Bell, HelpCircle, ChevronDown, LogOut, LogIn, Printer, FileSpreadsheet, Shield } from 'lucide-react';

interface TopHeaderProps {
  currentUser: User | null;
  pendingApprovalCount: number;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onOpenMobileSidebar: () => void;
  // Toggle mode ciut/lebar untuk sidebar di layar lebar (lg:) -- tombol
  // "3 garis" yang sama tetap tampil di semua ukuran layar (tidak
  // disembunyikan lagi di desktop), supaya pengguna selalu punya cara
  // meringkas sidebar agar konten halaman bisa memakai lebar lebih penuh.
  onToggleSidebarCollapse: () => void;
  onOpenPrintModal: () => void;
  onOpenExportModal: () => void;
  onOpenLoginModal: () => void;
  onLogout: () => void;
  canManageUsers: boolean;
  onOpenUserManagementModal: () => void;
}

// FASE: pengganti banner Header lama yang besar (judul instansi + 3 kartu
// statistik di dalam header). Sekarang navigasi utama sudah pindah ke
// Sidebar.tsx, jadi header cukup jadi bar tipis khas dashboard admin:
// tombol menu (mobile), pencarian, cetak/ekspor cepat, notifikasi,
// bantuan, dan profil pengguna. Tombol "Tambah Data Arsip" TIDAK
// dipindah ke sini -- sudah ada di DashboardView (tombol "+ Tambah Arsip
// Baru") dan di ArchiveTable sendiri (tombol tambah di halaman Arsip),
// jadi tidak hilang, cuma tidak diduplikasi di header lagi.
export const TopHeader: React.FC<TopHeaderProps> = ({
  currentUser,
  pendingApprovalCount,
  searchQuery,
  onSearchChange,
  onOpenMobileSidebar,
  onToggleSidebarCollapse,
  onOpenPrintModal,
  onOpenExportModal,
  onOpenLoginModal,
  onLogout,
  canManageUsers,
  onOpenUserManagementModal,
}) => {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setIsProfileOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const initials = currentUser?.name
    ? currentUser.name
        .split(' ')
        .map((p) => p[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : '?';

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between gap-3 px-4 sm:px-6 sticky top-0 z-30 shrink-0">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {/* Tombol "3 garis" mode mobile: buka/tutup drawer sidebar off-canvas. */}
        <button
          onClick={onOpenMobileSidebar}
          title="Buka menu"
          className="lg:hidden text-slate-500 hover:text-slate-800 cursor-pointer p-1.5 -ml-1.5 rounded-lg hover:bg-slate-100"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Tombol "3 garis" mode desktop: sengaja TIDAK disembunyikan lagi
            di layar lebar -- fungsinya di sini meringkas/melebarkan
            sidebar (bukan buka/tutup drawer) supaya konten halaman bisa
            memakai lebar lebih penuh. */}
        <button
          onClick={onToggleSidebarCollapse}
          title="Ciutkan/lebarkan sidebar"
          className="hidden lg:inline-flex text-slate-500 hover:text-slate-800 cursor-pointer p-1.5 -ml-1.5 rounded-lg hover:bg-slate-100"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="relative max-w-xs w-full hidden sm:block">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Cari arsip..."
            className="w-full pl-9 pr-3 py-2 bg-slate-100 border border-transparent focus:border-slate-300 focus:bg-white rounded-lg text-sm focus:outline-none transition-colors"
          />
        </div>
      </div>

      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
        <button
          onClick={onOpenPrintModal}
          title="Cetak Dokumen"
          className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg cursor-pointer hidden sm:inline-flex"
        >
          <Printer className="w-[18px] h-[18px]" />
        </button>
        <button
          onClick={onOpenExportModal}
          title="Ekspor / Impor"
          className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg cursor-pointer hidden sm:inline-flex"
        >
          <FileSpreadsheet className="w-[18px] h-[18px]" />
        </button>

        <button
          title={pendingApprovalCount > 0 ? `${pendingApprovalCount} menunggu persetujuan` : 'Tidak ada notifikasi baru'}
          className="relative p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg cursor-pointer"
        >
          <Bell className="w-[18px] h-[18px]" />
          {pendingApprovalCount > 0 && (
            <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {pendingApprovalCount}
            </span>
          )}
        </button>

        <button
          title="Bantuan"
          className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg cursor-pointer hidden sm:inline-flex"
        >
          <HelpCircle className="w-[18px] h-[18px]" />
        </button>

        <div className="w-px h-6 bg-slate-200 mx-1 hidden sm:block" />

        {currentUser ? (
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setIsProfileOpen((v) => !v)}
              className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-lg hover:bg-slate-100 cursor-pointer"
            >
              {currentUser.avatarUrl ? (
                <img src={currentUser.avatarUrl} alt={currentUser.name} className="w-8 h-8 rounded-full object-cover border border-slate-200" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center text-xs font-bold">
                  {initials}
                </div>
              )}
              <div className="text-left hidden md:block">
                <p className="text-xs font-bold text-slate-800 leading-tight truncate max-w-[120px]">{currentUser.name}</p>
                <p className="text-[10px] text-slate-500 capitalize leading-tight">{currentUser.role.replace('_', ' ')}</p>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden md:block" />
            </button>

            {isProfileOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-lg py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-3.5 py-2 border-b border-slate-100">
                  <p className="text-sm font-bold text-slate-800 truncate">{currentUser.name}</p>
                  <p className="text-xs text-slate-500 truncate">{currentUser.email}</p>
                </div>
                {canManageUsers && (
                  <button
                    onClick={() => {
                      onOpenUserManagementModal();
                      setIsProfileOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                  >
                    <Shield className="w-3.5 h-3.5 text-purple-600" />
                    <span>Manajemen Hak Akses</span>
                  </button>
                )}
                <button
                  onClick={() => {
                    onLogout();
                    setIsProfileOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Keluar</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={onOpenLoginModal}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-xs cursor-pointer"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Masuk</span>
          </button>
        )}
      </div>
    </header>
  );
};
