import React, { useState } from 'react';
import { ArchiveItem, User } from '../types';
import { 
  Trash2, 
  RotateCcw, 
  AlertTriangle, 
  Search, 
  Calendar, 
  Archive, 
  Building2, 
  ShieldAlert,
  CheckCircle2,
  FileX2
} from 'lucide-react';

interface RecycleBinViewProps {
  items: ArchiveItem[];
  currentUser: User | null;
  onRestoreItem: (id: string) => void;
  onHardDeleteItem: (id: string) => void;
  onEmptyRecycleBin: () => void;
}

export const RecycleBinView: React.FC<RecycleBinViewProps> = ({
  items,
  currentUser,
  onRestoreItem,
  onHardDeleteItem,
  onEmptyRecycleBin,
}) => {
  const [search, setSearch] = useState('');

  const deletedItems = items.filter((i) => i.isDeleted);

  const filteredDeletedItems = deletedItems.filter((item) => {
    if (
      search &&
      !item.nomorKeputusan.toLowerCase().includes(search.toLowerCase()) &&
      !item.perihal.toLowerCase().includes(search.toLowerCase()) &&
      !item.noDus.toLowerCase().includes(search.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  const canManage = currentUser?.role === 'admin' || currentUser?.role === 'arsiparis';

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-rose-600 uppercase">
            <Trash2 className="w-4 h-4" /> Tempat Sampah Kearsipan (Soft Delete)
          </div>
          <h2 className="text-xl font-bold text-slate-900 mt-0.5">Berkas Arsip Dalam Sampah ({deletedItems.length})</h2>
          <p className="text-xs text-slate-500">Berkas yang terhapus sementara disimpankan di sini. Anda dapat memulihkan kembali atau menghapus secara permanen.</p>
        </div>

        {deletedItems.length > 0 && canManage && (
          <button
            onClick={() => {
              if (confirm('APAKAH ANDA YAKIN? Tindakan ini akan menghapus SEMUA berkas di tempat sampah secara PERMANEN dan tidak dapat dikembalikan!')) {
                onEmptyRecycleBin();
              }
            }}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-sm transition-all"
          >
            <FileX2 className="w-4 h-4" />
            <span>Kosongkan Tempat Sampah</span>
          </button>
        )}
      </div>

      {/* Search Bar */}
      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 flex items-center justify-between gap-3 text-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari berkas terhapus..."
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-rose-500"
          />
        </div>

        <div className="text-slate-500 font-semibold text-[11px]">
          Sistem Pengamanan Data Pertelaan 2026
        </div>
      </div>

      {/* Deleted Items Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-100 text-slate-700 font-bold uppercase border-b border-slate-200">
              <th className="p-3">Nomor Keputusan</th>
              <th className="p-3">Perihal / Dokumen</th>
              <th className="p-3">Nomor Dus</th>
              <th className="p-3">Waktu Dihapus</th>
              <th className="p-3 text-center">Aksi Pemulihan</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {filteredDeletedItems.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-12 text-center text-slate-400">
                  <FileX2 className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="font-bold text-slate-600">Tidak ada berkas di Tempat Sampah</p>
                  <p className="text-[11px] text-slate-400">Seluruh data pertelaan arsip aktif dan tersimpan rapi.</p>
                </td>
              </tr>
            ) : (
              filteredDeletedItems.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-3 font-mono font-bold text-slate-800 line-through decoration-rose-400">
                    {item.nomorKeputusan}
                  </td>
                  <td className="p-3 text-slate-600 max-w-sm truncate">{item.perihal}</td>
                  <td className="p-3 font-mono font-semibold text-amber-800">{item.noDus}</td>
                  <td className="p-3 text-slate-500 text-[11px]">
                    <div>{item.deletedAt || item.updatedAt}</div>
                    <span className="text-[10px] text-rose-600">Oleh: {item.deletedBy || 'Admin'}</span>
                  </td>
                  <td className="p-3 text-center">
                    {canManage ? (
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => onRestoreItem(item.id)}
                          className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer text-[11px]"
                          title="Pulihkan Berkas Ke Pertelaan Aktif"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Pulihkan</span>
                        </button>

                        <button
                          onClick={() => {
                            if (confirm(`Hapus permanen berkas "${item.nomorKeputusan}"? Data tidak akan dapat dipulihkan!`)) {
                              onHardDeleteItem(item.id);
                            }
                          }}
                          className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer text-[11px]"
                          title="Hapus Permanen Dari Database"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Hapus Permanen</span>
                        </button>
                      </div>
                    ) : (
                      <span className="text-slate-400 italic">Hanya Admin/Arsiparis</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
};
