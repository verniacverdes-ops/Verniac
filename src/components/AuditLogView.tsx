import React, { useState } from 'react';
import { AuditLogEntry, User } from '../types';
import { 
  History, 
  Search, 
  Trash2, 
  Download, 
  ShieldCheck, 
  UserCheck, 
  Calendar, 
  Filter,
  CheckCircle2,
  FileSpreadsheet
} from 'lucide-react';

interface AuditLogViewProps {
  logs: AuditLogEntry[];
  currentUser: User | null;
  onClearLogs: () => void;
}

export const AuditLogView: React.FC<AuditLogViewProps> = ({
  logs,
  currentUser,
  onClearLogs,
}) => {
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('ALL');

  const isAdmin = currentUser?.role === 'admin';

  const filteredLogs = logs.filter((log) => {
    if (actionFilter !== 'ALL' && log.action !== actionFilter) return false;
    if (
      search &&
      !log.userName.toLowerCase().includes(search.toLowerCase()) &&
      !log.itemTarget.toLowerCase().includes(search.toLowerCase()) &&
      !log.details.toLowerCase().includes(search.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  const handleExportLogsCsv = () => {
    let csvRows: string[] = [];
    csvRows.push('"Timestamp","User Name","Role","Action","Target Item","Details"');

    filteredLogs.forEach((log) => {
      csvRows.push(
        `"${log.timestamp}","${log.userName}","${log.userRole}","${log.action}","${log.itemTarget}","${log.details.replace(/"/g, '""')}"`
      );
    });

    const csvContent = '\uFEFF' + csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Audit_Log_Kearsipan_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const getActionBadgeClass = (action: string) => {
    switch (action) {
      case 'TAMBAH':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'UBAH':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'SOFT_DELETE':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'PULIHKAN':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'HAPUS_PERMANEN':
        return 'bg-rose-100 text-rose-800 border-rose-300';
      case 'BACKUP':
      case 'RESTORE':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 uppercase">
            <History className="w-4 h-4" /> Audit Log & Rekam Jejak Sistem (Tahap 3)
          </div>
          <h2 className="text-xl font-bold text-slate-900 mt-0.5">Catatan Aktivitas Pengguna Real-Time</h2>
          <p className="text-xs text-slate-500">Transparansi penuh atas setiap pembuatan, perubahan, penghapusan, dan backup data.</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <button
            onClick={handleExportLogsCsv}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-sm transition-all"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Ekspor Log (CSV)</span>
          </button>

          {isAdmin && (
            <button
              onClick={() => {
                if (confirm('Apakah Anda yakin ingin mengosongkan riwayat Audit Log?')) {
                  onClearLogs();
                }
              }}
              className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              <span>Bersihkan Log</span>
            </button>
          )}
        </div>
      </div>

      {/* Search & Filter Controls */}
      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari pengguna, nomor SK, atau detail..."
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-600 uppercase text-[11px]">Filter Aksi:</span>
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="p-2 bg-white border border-slate-300 rounded-xl font-bold text-slate-800"
          >
            <option value="ALL">Semua Aktivitas</option>
            <option value="TAMBAH">TAMBAH</option>
            <option value="UBAH">UBAH</option>
            <option value="SOFT_DELETE">SOFT DELETE</option>
            <option value="PULIHKAN">PULIHKAN</option>
            <option value="HAPUS_PERMANEN">HAPUS PERMANEN</option>
            <option value="BACKUP">BACKUP / RESTORE</option>
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-100 text-slate-700 font-bold uppercase border-b border-slate-200">
              <th className="p-3">Waktu Log</th>
              <th className="p-3">Pengguna</th>
              <th className="p-3">Jenis Aktivitas</th>
              <th className="p-3">Target Berkas / Objek</th>
              <th className="p-3">Rincian Perubahan</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {filteredLogs.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-slate-400 italic">
                  Belum ada rekam jejak aktivitas pengguna yang cocok dengan kriteria.
                </td>
              </tr>
            ) : (
              filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-3 font-mono text-slate-600 whitespace-nowrap">{log.timestamp}</td>
                  <td className="p-3">
                    <div className="font-bold text-slate-900">{log.userName}</div>
                    <span className="text-[10px] text-slate-500 uppercase">{log.userRole}</span>
                  </td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded font-mono font-bold text-[10px] border ${getActionBadgeClass(log.action)}`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="p-3 font-mono font-bold text-blue-700 max-w-xs truncate">{log.itemTarget}</td>
                  <td className="p-3 text-slate-600 max-w-md">{log.details}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
};
