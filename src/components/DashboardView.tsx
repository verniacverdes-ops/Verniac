import React, { useMemo } from 'react';
import { ArchiveItem, AuditLogEntry, MasterDus, MasterGedung, MasterKategori, MasterRak, MasterRuang, MasterUnit } from '../types';
import {
  FileText,
  Box,
  MapPin,
  FileCheck,
  ArrowRight,
  ChevronRight,
  Building2,
  Trash2,
  FolderKanban,
  Plus,
  UserPlus,
  RotateCcw,
  PlusCircle,
  Pencil,
  ShieldAlert,
  LogIn as LogInIcon,
  FileWarning,
  Sparkles,
  Network,
} from 'lucide-react';

interface DashboardViewProps {
  items: ArchiveItem[];
  deletedCount: number;
  auditLogs: AuditLogEntry[];
  masterDusList: MasterDus[];
  masterGedungList: MasterGedung[];
  masterKategoriList: MasterKategori[];
  masterUnitList: MasterUnit[];
  canAdd: boolean;
  onOpenAddModal: () => void;
  onNavigateToArsipWithFilter: (dusFilter?: string, kategoriFilter?: string) => void;
  onNavigateTab: (tab: 'arsip' | 'master' | 'hirarki_lokasi' | 'qr_scanner' | 'sirkulasi' | 'retensi_pemusnahan' | 'recycle_bin' | 'audit_log') => void;
  onOpenPdfModal: (item: ArchiveItem) => void;
  onOpenQrModal: (item: ArchiveItem) => void;
}

// Label & warna status retensi -- dipetakan dari ArchiveItem.statusRetensi.
// Item tanpa statusRetensi dianggap 'AKTIF' (nilai default paling umum).
const RETENSI_META: Record<string, { label: string; dot: string; bar: string }> = {
  AKTIF: { label: 'Aktif', dot: 'bg-blue-500', bar: 'bg-blue-500' },
  INAKTIF: { label: 'Inaktif', dot: 'bg-amber-500', bar: 'bg-amber-500' },
  SIAP_MUSNAH: { label: 'Siap Musnah', dot: 'bg-rose-500', bar: 'bg-rose-500' },
  PERMANEN: { label: 'Permanen', dot: 'bg-emerald-500', bar: 'bg-emerald-500' },
};

function auditIconFor(action: AuditLogEntry['action']): { icon: React.ReactNode; bg: string } {
  switch (action) {
    case 'TAMBAH':
      return { icon: <PlusCircle className="w-4 h-4" />, bg: 'bg-emerald-100 text-emerald-700' };
    case 'UBAH':
      return { icon: <Pencil className="w-4 h-4" />, bg: 'bg-blue-100 text-blue-700' };
    case 'SOFT_DELETE':
      return { icon: <Trash2 className="w-4 h-4" />, bg: 'bg-rose-100 text-rose-700' };
    case 'HAPUS_PERMANEN':
      return { icon: <Trash2 className="w-4 h-4" />, bg: 'bg-rose-100 text-rose-700' };
    case 'PULIHKAN':
    case 'RESTORE':
      return { icon: <RotateCcw className="w-4 h-4" />, bg: 'bg-amber-100 text-amber-700' };
    case 'LOGIN':
      return { icon: <LogInIcon className="w-4 h-4" />, bg: 'bg-indigo-100 text-indigo-700' };
    case 'BACKUP':
      return { icon: <ShieldAlert className="w-4 h-4" />, bg: 'bg-purple-100 text-purple-700' };
    default:
      return { icon: <UserPlus className="w-4 h-4" />, bg: 'bg-slate-100 text-slate-700' };
  }
}

// "5 jam yang lalu" dsb -- dibuat manual (tanpa dependency date library
// baru) dari string timestamp yang sudah diformat addAuditLog() di App.tsx.
function timeAgo(timestamp: string): string {
  const parsed = new Date(timestamp);
  if (Number.isNaN(parsed.getTime())) return timestamp;
  const diffMs = Date.now() - parsed.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Baru saja';
  if (diffMin < 60) return `${diffMin} menit yang lalu`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} jam yang lalu`;
  const diffDay = Math.floor(diffHour / 24);
  return `${diffDay} hari yang lalu`;
}

// Ikon + warna kartu "Arsip Terbaru" -- diturunkan dari ada/tidaknya
// lampiran PDF. Saat ini hanya PDF yang didukung sebagai lampiran, jadi
// selain itu dianggap dokumen tanpa berkas dan diberi ikon netral.
function fileIconFor(item: ArchiveItem): { icon: React.ReactNode; bg: string } {
  if (item.pdfAttachment) {
    return { icon: <FileText className="w-4 h-4" />, bg: 'bg-rose-50 text-rose-600' };
  }
  return { icon: <FileWarning className="w-4 h-4" />, bg: 'bg-slate-100 text-slate-500' };
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  items,
  deletedCount,
  auditLogs,
  masterDusList,
  masterGedungList,
  masterKategoriList,
  masterUnitList,
  canAdd,
  onOpenAddModal,
  onNavigateToArsipWithFilter,
  onNavigateTab,
  onOpenPdfModal,
  onOpenQrModal,
}) => {
  const totalItems = items.length;

  const pdfCount = useMemo(() => items.filter((i) => i.pdfAttachment).length, [items]);
  const pdfPct = totalItems > 0 ? Math.round((pdfCount / totalItems) * 100) : 0;

  // Dus/boks yang benar-benar terisi arsip (bisa beda dari jumlah master
  // dus yang terdaftar -- sebagian master dus mungkin masih kosong).
  const dusDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    items.forEach((item) => {
      const key = item.noDus || 'Tanpa Dus';
      counts[key] = (counts[key] || 0) + 1;
    });
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    const max = Math.max(1, ...sorted.map(([, c]) => c));
    return {
      rows: sorted.slice(0, 6).map(([label, count]) => ({ label, count, pct: Math.max(6, Math.round((count / max) * 100)) })),
      usedCount: sorted.length,
    };
  }, [items]);

  // Distribusi status retensi arsip (Aktif/Inaktif/Siap Musnah/Permanen).
  const retentionData = useMemo(() => {
    const counts: Record<string, number> = {};
    items.forEach((item) => {
      const key = item.statusRetensi || 'AKTIF';
      counts[key] = (counts[key] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([key, count]) => ({
        key,
        label: RETENSI_META[key]?.label || key,
        dot: RETENSI_META[key]?.dot || 'bg-slate-400',
        bar: RETENSI_META[key]?.bar || 'bg-slate-400',
        count,
        pct: totalItems > 0 ? Math.round((count / totalItems) * 100) : 0,
      }));
  }, [items, totalItems]);

  const recentItems = useMemo(
    () => [...items].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5),
    [items]
  );

  const recentActivity = useMemo(() => [...auditLogs].slice(0, 5), [auditLogs]);

  const statCards = [
    {
      label: 'Total Pertelaan Arsip',
      value: totalItems.toLocaleString('id-ID'),
      subtitle: 'Berkas Dokumen',
      linkText: 'Siap Cetak & Ekspor',
      icon: <FileText className="w-5 h-5" />,
      color: 'bg-blue-50 text-blue-600',
      onClick: () => onNavigateToArsipWithFilter('ALL'),
    },
    {
      label: 'Total Dus / Boks Digunakan',
      value: dusDistribution.usedCount.toLocaleString('id-ID'),
      subtitle: `Boks Terisi (${masterDusList.length} Master)`,
      linkText: 'Tersusun di Depo & Rak',
      icon: <Box className="w-5 h-5" />,
      color: 'bg-amber-50 text-amber-600',
      onClick: () => onNavigateTab('hirarki_lokasi'),
    },
    {
      label: 'Dokumen Digital PDF',
      value: pdfCount.toLocaleString('id-ID'),
      subtitle: `File Terlampir (${pdfPct}%)`,
      linkText: 'Digitalisasi Dokumen',
      icon: <FileCheck className="w-5 h-5" />,
      color: 'bg-emerald-50 text-emerald-600',
      onClick: () => onNavigateToArsipWithFilter('ALL'),
    },
    {
      label: 'Master Data System',
      value: masterGedungList.length.toLocaleString('id-ID'),
      subtitle: 'Depo / Gedung Storage',
      linkText: 'Kategori, Unit & Gedung',
      icon: <Building2 className="w-5 h-5" />,
      color: 'bg-violet-50 text-violet-600',
      onClick: () => onNavigateTab('master'),
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">

      {/* Welcome Row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Selamat datang!</h1>
          <p className="text-sm text-slate-500 mt-0.5">Kelola pertelaan arsip dengan mudah dan efisien</p>
        </div>
        {canAdd && (
          <button
            onClick={onOpenAddModal}
            className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold px-4 py-2.5 rounded-xl shadow-sm transition-all cursor-pointer text-sm shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Arsip Baru</span>
          </button>
        )}
      </div>

      {/* Hero: Dashboard Eksekutif */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 rounded-2xl p-6 sm:p-8">
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-blue-200 bg-white/10 border border-white/10 rounded-full px-3 py-1">
              <Sparkles className="w-3 h-3" />
              Dashboard Eksekutif Kearsipan
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-white mt-3">Sistem Informasi Daftar Pertelaan Arsip</h2>
            <p className="text-sm text-blue-200/80 mt-1 max-w-xl">
              Pantau distribusi dus, kapasitas penyimpanan, dan status retensi arsip secara real-time.
            </p>
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={() => onNavigateTab('hirarki_lokasi')}
              className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/15 text-white font-bold px-4 py-2.5 rounded-xl transition-all cursor-pointer text-sm"
            >
              <Network className="w-4 h-4" />
              Hirarki Lokasi
            </button>
          </div>
        </div>
      </div>

      {/* Stat Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <button
            key={card.label}
            onClick={card.onClick}
            className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer text-left flex flex-col gap-3"
          >
            <div className="flex items-start justify-between">
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">{card.label}</p>
              <div className={`p-2.5 rounded-xl shrink-0 ${card.color}`}>{card.icon}</div>
            </div>
            <div>
              <p className="text-2xl font-black text-slate-900">{card.value}</p>
              <p className="text-xs text-slate-400 mt-0.5">{card.subtitle}</p>
            </div>
            <p className="text-xs font-bold text-blue-600 flex items-center gap-1 mt-auto pt-1">
              {card.linkText}
              <ArrowRight className="w-3.5 h-3.5" />
            </p>
          </button>
        ))}
      </div>

      {/* Distribusi & Klasifikasi Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Distribusi Kapasitas Arsip per Dus/Boks */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-amber-50 text-amber-600 rounded-lg shrink-0">
                <Box className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Distribusi Kapasitas Arsip per Dus/Boks</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">Banyaknya berkas pertelaan yang tersimpan dalam tiap nomor dus</p>
              </div>
            </div>
            <button
              onClick={() => onNavigateTab('hirarki_lokasi')}
              className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer shrink-0"
            >
              Lihat Detail
            </button>
          </div>

          {dusDistribution.rows.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">Belum ada arsip yang tersimpan di dus manapun.</p>
          ) : (
            <div className="space-y-3">
              {dusDistribution.rows.map((row) => (
                <div key={row.label} className="flex items-center gap-3">
                  <div className="p-1.5 bg-amber-50 text-amber-600 rounded-md shrink-0">
                    <Box className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-xs font-bold text-slate-800 truncate">{row.label}</span>
                      <span className="text-[11px] text-slate-400 shrink-0">{row.count} Item Dokumen</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${row.pct}%` }} />
                    </div>
                  </div>
                  <button
                    onClick={() => onNavigateToArsipWithFilter(row.label)}
                    className="text-[11px] font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 rounded-lg px-2.5 py-1.5 cursor-pointer shrink-0 whitespace-nowrap"
                  >
                    Buka Filter Dus
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Kategori & Klasifikasi Arsip */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-violet-50 text-violet-600 rounded-lg shrink-0">
                <FolderKanban className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Klasifikasi Retensi Arsip</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">Persentase status retensi arsip di sistem</p>
              </div>
            </div>
          </div>

          {retentionData.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">Belum ada data arsip.</p>
          ) : (
            <div className="space-y-1">
              {retentionData.map((row) => (
                <button
                  key={row.key}
                  onClick={() => onNavigateToArsipWithFilter('ALL')}
                  className="w-full flex items-center gap-3 hover:bg-slate-50 rounded-xl px-2 py-2.5 cursor-pointer text-left"
                >
                  <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${row.dot}`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-800">{row.label}</p>
                    <p className="text-[11px] text-slate-400">{row.pct}% dari total arsip</p>
                    <div className="h-1 bg-slate-100 rounded-full overflow-hidden mt-1">
                      <div className={`h-full rounded-full ${row.bar}`} style={{ width: `${row.pct}%` }} />
                    </div>
                  </div>
                  <span className="text-sm font-black text-slate-900 shrink-0">{row.count}</span>
                  <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Arsip Terbaru */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-bold text-slate-900 text-sm">Arsip Terbaru</h3>
            <button
              onClick={() => onNavigateToArsipWithFilter('ALL')}
              className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
            >
              <span>Lihat Semua</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {recentItems.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">Belum ada arsip.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {recentItems.slice(0, 3).map((item) => {
                const { icon, bg } = fileIconFor(item);
                return (
                  <div key={item.id} className="py-3 flex items-center gap-3">
                    <div className={`p-2 rounded-lg shrink-0 ${bg}`}>{icon}</div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-800 truncate">{item.perihal}</p>
                      <p className="text-[11px] text-slate-400 truncate">{item.kategoriArsip || 'Umum'} • {item.unitPengolah || 'Unit Umum'}</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {item.pdfAttachment && (
                        <button
                          onClick={() => onOpenPdfModal(item)}
                          className="p-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg cursor-pointer"
                          title="Lihat PDF"
                        >
                          <FileCheck className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <span className="text-[11px] text-slate-400 whitespace-nowrap">{timeAgo(item.createdAt)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Aktivitas Terbaru */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-bold text-slate-900 text-sm">Aktivitas Terbaru</h3>
            <button
              onClick={() => onNavigateTab('audit_log')}
              className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
            >
              <span>Lihat Semua</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {recentActivity.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">Belum ada aktivitas tercatat.</p>
          ) : (
            <div className="relative">
              {recentActivity.slice(0, 3).map((log, idx, arr) => {
                const { icon, bg } = auditIconFor(log.action);
                const isLast = idx === arr.length - 1;
                return (
                  <div key={log.id} className="relative py-3 flex items-start gap-3">
                    {!isLast && (
                      <span className="absolute left-[19px] top-11 bottom-0 w-px bg-slate-100" aria-hidden="true" />
                    )}
                    <div className={`p-2 rounded-full shrink-0 relative z-10 ${bg}`}>{icon}</div>
                    <div className="min-w-0 flex-1 pt-1">
                      <p className="text-sm font-semibold text-slate-800 truncate">
                        {log.userName} <span className="font-normal text-slate-500">{log.details}</span>
                      </p>
                      {log.itemTarget && log.itemTarget !== '-' && (
                        <p className="text-[11px] text-slate-400 truncate">{log.itemTarget}</p>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-400 whitespace-nowrap shrink-0 pt-1">{timeAgo(log.timestamp)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

    </div>
  );
};
