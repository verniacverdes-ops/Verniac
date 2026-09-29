import React, { useState, useMemo } from 'react';
import { ApprovalItem, User } from '../types';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  ShieldCheck, 
  Search, 
  FileCheck2, 
  BookOpenCheck, 
  Flame, 
  FilePlus, 
  User as UserIcon, 
  Building2, 
  Calendar, 
  MessageSquare,
  AlertCircle
} from 'lucide-react';

interface ApprovalViewProps {
  approvals: ApprovalItem[];
  currentUser: User | null;
  onApproveItem: (id: string, notes?: string) => void;
  onRejectItem: (id: string, notes?: string) => void;
}

export const ApprovalView: React.FC<ApprovalViewProps> = ({
  approvals,
  currentUser,
  onApproveItem,
  onRejectItem,
}) => {
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'MENUNGGU' | 'DISETUJUI' | 'DITOLAK'>('ALL');
  const [filterType, setFilterType] = useState<'ALL' | 'PEMINJAMAN' | 'PEMUSNAHAN' | 'INPUT_ARSIP'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Action Modal State
  const [selectedItem, setSelectedItem] = useState<ApprovalItem | null>(null);
  const [actionType, setActionType] = useState<'APPROVE' | 'REJECT' | null>(null);
  const [actionNotes, setActionNotes] = useState('');

  const canApprove = currentUser?.role === 'admin' || currentUser?.role === 'arsiparis';

  // Computed Counts
  const pendingCount = useMemo(() => approvals.filter((a) => a.status === 'MENUNGGU').length, [approvals]);
  const approvedCount = useMemo(() => approvals.filter((a) => a.status === 'DISETUJUI').length, [approvals]);
  const rejectedCount = useMemo(() => approvals.filter((a) => a.status === 'DITOLAK').length, [approvals]);

  // Filtered List
  const filteredApprovals = useMemo(() => {
    let list = approvals;

    if (filterStatus !== 'ALL') {
      list = list.filter((a) => a.status === filterStatus);
    }

    if (filterType !== 'ALL') {
      list = list.filter((a) => a.type === filterType);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (a) =>
          a.nomorDokumen.toLowerCase().includes(q) ||
          a.perihal.toLowerCase().includes(q) ||
          a.pemohonNama.toLowerCase().includes(q) ||
          a.pemohonUnit.toLowerCase().includes(q)
      );
    }

    return list;
  }, [approvals, filterStatus, filterType, searchQuery]);

  const handleConfirmAction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem || !actionType) return;

    if (actionType === 'APPROVE') {
      onApproveItem(selectedItem.id, actionNotes);
    } else {
      onRejectItem(selectedItem.id, actionNotes);
    }

    setSelectedItem(null);
    setActionType(null);
    setActionNotes('');
  };

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-purple-950 to-slate-900 text-white p-6 rounded-2xl shadow-md border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-purple-500/20 text-purple-400 rounded-lg">
              <ShieldCheck className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold">Pusat Persetujuan & Verifikasi (Approval Workflow)</h2>
          </div>
          <p className="text-xs text-slate-300">
            Fasilitas verifikasi berjenjang untuk pengajuan peminjaman berkas, persetujuan pemusnahan JRA, dan validasi registrasi pertelaan arsip baru.
          </p>
        </div>

        {pendingCount > 0 && (
          <div className="px-3.5 py-2 bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold text-xs rounded-xl flex items-center gap-2 shrink-0 animate-pulse">
            <Clock className="w-4 h-4" />
            <span>{pendingCount} Pengajuan Menunggu Persetujuan</span>
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-3">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">{pendingCount}</div>
            <div className="text-xs text-slate-500 font-medium">Menunggu Verifikasi</div>
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-3">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">{approvedCount}</div>
            <div className="text-xs text-slate-500 font-medium">Disetujui / Disahkan</div>
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-3">
          <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
            <XCircle className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">{rejectedCount}</div>
            <div className="text-xs text-slate-500 font-medium">Ditolak</div>
          </div>
        </div>

      </div>

      {/* Main Table Container */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-4 space-y-4">
        
        {/* Controls Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-slate-100 pb-3">
          
          <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto text-xs font-semibold">
            <button
              onClick={() => setFilterStatus('ALL')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                filterStatus === 'ALL'
                  ? 'bg-slate-900 text-white font-bold'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Semua Status
            </button>
            <button
              onClick={() => setFilterStatus('MENUNGGU')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1 ${
                filterStatus === 'MENUNGGU'
                  ? 'bg-amber-600 text-white font-bold'
                  : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
              }`}
            >
              <Clock className="w-3.5 h-3.5" /> Menunggu ({pendingCount})
            </button>
            <button
              onClick={() => setFilterStatus('DISETUJUI')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1 ${
                filterStatus === 'DISETUJUI'
                  ? 'bg-emerald-600 text-white font-bold'
                  : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" /> Disetujui ({approvedCount})
            </button>
            <button
              onClick={() => setFilterStatus('DITOLAK')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1 ${
                filterStatus === 'DITOLAK'
                  ? 'bg-rose-600 text-white font-bold'
                  : 'bg-rose-50 text-rose-800 hover:bg-rose-100'
              }`}
            >
              <XCircle className="w-3.5 h-3.5" /> Ditolak ({rejectedCount})
            </button>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Cari perihal, nomor, pemohon..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

        </div>

        {/* Approval Table */}
        {filteredApprovals.length === 0 ? (
          <div className="py-12 text-center text-slate-400 space-y-2">
            <ShieldCheck className="w-10 h-10 mx-auto text-slate-300" />
            <p className="text-sm font-medium">Tidak ada data persetujuan dalam kategori ini.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-900 font-bold uppercase border-b border-slate-200">
                <tr>
                  <th className="py-3 px-3">Tipe Approval</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Nomor Dokumen & Perihal</th>
                  <th className="py-3 px-3">Pemohon & Unit</th>
                  <th className="py-3 px-3">Tgl Pengajuan</th>
                  <th className="py-3 px-3 text-right">Tindakan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredApprovals.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-3">
                      {item.type === 'PEMINJAMAN' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                          <BookOpenCheck className="w-3 h-3" /> Peminjaman
                        </span>
                      ) : item.type === 'PEMUSNAHAN' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                          <Flame className="w-3 h-3 text-rose-600" /> Pemusnahan JRA
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                          <FilePlus className="w-3 h-3" /> Input Berkas
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-3">
                      {item.status === 'MENUNGGU' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 animate-pulse">
                          <Clock className="w-3 h-3" /> Menunggu
                        </span>
                      ) : item.status === 'DISETUJUI' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" /> Disetujui
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                          <XCircle className="w-3 h-3" /> Ditolak
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-3 max-w-xs">
                      <div className="font-mono text-[11px] font-bold text-blue-700">{item.nomorDokumen}</div>
                      <div className="text-[11px] text-slate-800 line-clamp-2 mt-0.5">{item.perihal}</div>
                      {item.catatan && (
                        <div className="text-[10px] text-slate-500 italic mt-1 bg-slate-50 p-1.5 rounded border border-slate-200">
                          Catatan: {item.catatan}
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 px-3">
                      <div className="font-bold text-slate-900 flex items-center gap-1">
                        <UserIcon className="w-3.5 h-3.5 text-purple-600" /> {item.pemohonNama}
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                        <Building2 className="w-3 h-3 text-slate-400" /> {item.pemohonUnit}
                      </div>
                    </td>

                    <td className="py-3.5 px-3 text-[11px] text-slate-600">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-400" /> {item.tanggalPengajuan}
                      </div>
                      {item.approvedAt && (
                        <div className="text-[10px] text-emerald-700 font-semibold mt-0.5">
                          Diproses: {item.approvedAt} oleh {item.approverNama}
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 px-3 text-right">
                      {item.status === 'MENUNGGU' && canApprove ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setSelectedItem(item);
                              setActionType('APPROVE');
                              setActionNotes('');
                            }}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] rounded-lg cursor-pointer flex items-center gap-1 shadow-2xs"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Setujui</span>
                          </button>

                          <button
                            onClick={() => {
                              setSelectedItem(item);
                              setActionType('REJECT');
                              setActionNotes('');
                            }}
                            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-[11px] rounded-lg cursor-pointer flex items-center gap-1 shadow-2xs"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Tolak</span>
                          </button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">Selesai Diproses</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>

      {/* Confirmation Modal */}
      {selectedItem && actionType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            
            <div className={`px-6 py-4 text-white flex items-center justify-between ${actionType === 'APPROVE' ? 'bg-emerald-700' : 'bg-rose-700'}`}>
              <div className="flex items-center gap-2 font-bold text-sm">
                {actionType === 'APPROVE' ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                <span>{actionType === 'APPROVE' ? 'Konfirmasi Persetujuan Approval' : 'Konfirmasi Penolakan Approval'}</span>
              </div>
            </div>

            <form onSubmit={handleConfirmAction} className="p-6 space-y-4 text-xs">
              
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <div className="font-mono text-blue-700 font-bold">{selectedItem.nomorDokumen}</div>
                <div className="text-slate-800 line-clamp-2">{selectedItem.perihal}</div>
                <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-200">
                  Pemohon: <strong>{selectedItem.pemohonNama}</strong> ({selectedItem.pemohonUnit})
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-800 uppercase">Catatan Verifikator / Approver</label>
                <textarea
                  rows={3}
                  value={actionNotes}
                  onChange={(e) => setActionNotes(e.target.value)}
                  placeholder={actionType === 'APPROVE' ? 'e.g. Pengajuan disetujui, sesuai prosedur...' : 'e.g. Berkas belum lengkap, harap diperbaiki...'}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedItem(null);
                    setActionType(null);
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className={`px-5 py-2 text-white font-bold rounded-xl shadow-xs cursor-pointer ${
                    actionType === 'APPROVE' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-rose-600 hover:bg-rose-500'
                  }`}
                >
                  {actionType === 'APPROVE' ? 'Sahkan Persetujuan' : 'Sahkan Penolakan'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
};
