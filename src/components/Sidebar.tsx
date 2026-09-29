import React, { useEffect } from 'react';
import {
  LayoutDashboard,
  FileText,
  BookOpen,
  Flame,
  CheckCircle2,
  Database,
  MapPin,
  ClipboardList,
  BarChart3,
  History,
  Trash2,
  DatabaseBackup,
  Users2,
  Settings,
  Archive as ArchiveIcon,
  X,
  Server,
  LogOut,
} from 'lucide-react';
import { ApiConfig, MainViewTab, User } from '../types';

interface SidebarProps {
  activeTab: MainViewTab;
  onNavigateTab: (tab: MainViewTab) => void;
  totalArsip: number;
  totalSampah: number;
  pendingApproval: number;
  apiConfig: ApiConfig;
  canManageUsers: boolean;
  canManageSettings: boolean;
  onOpenUserManagementModal: () => void;
  onOpenUnitModal: () => void;
  onOpenBackendModal: () => void;
  isOpen: boolean;
  onClose: () => void;
  currentUser?: User | null;
  onLogout?: () => void;
}

interface NavItem {
  label: string;
  icon: React.ElementType;
  tab?: MainViewTab;
  onClick?: () => void;
  badge?: number;
  dot?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onNavigateTab,
  totalArsip,
  totalSampah,
  pendingApproval,
  apiConfig,
  canManageUsers,
  canManageSettings,
  onOpenUserManagementModal,
  onOpenUnitModal,
  onOpenBackendModal,
  isOpen,
  onClose,
  currentUser,
  onLogout,
}) => {
  // Kunci scroll halaman di belakang sidebar selagi drawer mobile terbuka —
  // tanpa ini, scroll mouse/trackpad masih tembus ke konten di belakangnya.
  useEffect(() => {
    if (!isOpen) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = original;
    };
  }, [isOpen]);

  // Menu flat (tanpa grup) sesuai desain terbaru yang diminta.
  const items: NavItem[] = [
    { label: 'Dashboard', icon: LayoutDashboard, tab: 'dashboard' },
    { label: 'Arsip', icon: FileText, tab: 'arsip', badge: totalArsip },
    { label: 'Peminjaman', icon: BookOpen, tab: 'sirkulasi' },
    { label: 'JRA & Pemusnahan', icon: Flame, tab: 'retensi_pemusnahan' },
    { label: 'Approval', icon: CheckCircle2, tab: 'approval', dot: pendingApproval > 0 },
    { label: 'Master Data', icon: Database, tab: 'master' },
    { label: 'Lokasi (Gedung-Dus)', icon: MapPin, tab: 'hirarki_lokasi' },
    { label: 'Register SOP', icon: ClipboardList, tab: 'sop_register' },
    { label: 'Laporan & Retensi', icon: BarChart3, tab: 'laporan' },
    { label: 'Audit Log', icon: History, tab: 'audit_log' },
    { label: 'Recycle Bin', icon: Trash2, tab: 'recycle_bin', badge: totalSampah },
    { label: 'Backup / Restore', icon: DatabaseBackup, tab: 'backup_restore' },
    ...(canManageUsers
      ? [{ label: 'Pengguna', icon: Users2, onClick: onOpenUserManagementModal }]
      : []),
    ...(canManageSettings
      ? [{ label: 'Pengaturan', icon: Settings, onClick: onOpenUnitModal }]
      : []),
  ];

  const handleNavClick = (item: NavItem) => {
    if (item.tab) onNavigateTab(item.tab);
    else if (item.onClick) item.onClick();
    onClose();
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed lg:sticky top-0 left-0 h-screen w-64 bg-white text-slate-700 flex flex-col z-50 shrink-0 border-r border-slate-200 transition-transform duration-200 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0`}
      >
        {/* Logo */}
        <div className="h-16 px-5 flex items-center justify-between border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center shrink-0">
              <ArchiveIcon className="w-4.5 h-4.5 text-white" />
            </div>
            <span className="font-black text-slate-900 text-sm tracking-tight">Pertelaan Arsip</span>
          </div>
          <button onClick={onClose} className="lg:hidden text-slate-400 hover:text-slate-700 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-1">
          {items.map((item) => {
            const Icon = item.icon;
            const active = item.tab && item.tab === activeTab;
            return (
              <button
                key={item.label}
                onClick={() => handleNavClick(item)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                  active
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </span>
                {!!item.badge && item.badge > 0 && (
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center ${
                      active ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
                {item.dot && (
                  <span className="w-2 h-2 rounded-full bg-orange-400 shrink-0" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Profil pengguna + tombol keluar */}
        {currentUser && (
          <div className="shrink-0 border-t border-slate-200 px-3 py-3">
            <div className="flex items-center gap-2.5 px-1 mb-2">
              {currentUser.avatarUrl ? (
                <img
                  src={currentUser.avatarUrl}
                  alt={currentUser.name}
                  className="w-9 h-9 rounded-full object-cover shrink-0"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center shrink-0 text-slate-600 font-semibold text-sm">
                  {currentUser.name?.charAt(0)?.toUpperCase() || '?'}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-800 truncate">{currentUser.name}</p>
                <p className="text-xs text-slate-400 truncate capitalize">{currentUser.role}</p>
              </div>
            </div>
            <button
              onClick={() => {
                onLogout?.();
                onClose();
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4 shrink-0" />
              <span>Keluar</span>
            </button>
          </div>
        )}

        {/* Footer: status koneksi backend */}
        <button
          onClick={onOpenBackendModal}
          className="shrink-0 border-t border-slate-200 px-4 py-3 flex items-center justify-between text-xs hover:bg-slate-50 transition-colors cursor-pointer"
        >
          <span className="flex items-center gap-2 text-slate-500">
            <span
              className={`w-2 h-2 rounded-full ${apiConfig.useLaravelApi ? 'bg-emerald-500' : 'bg-slate-400'}`}
            />
            <span>{apiConfig.useLaravelApi ? 'Online' : 'Mode Lokal'}</span>
          </span>
          <span className="flex items-center gap-1 text-slate-400">
            <Server className="w-3 h-3" />
            <span>v1.0 · 2026</span>
          </span>
        </button>
      </aside>
    </>
  );
};
