import React, { useState, useMemo } from 'react';
import { ArchiveItem, DestructionRecord, MasterKategori, UnitInfo, User } from '../types';
import { 
  FileSpreadsheet, 
  Trash2, 
  Flame, 
  ShieldAlert, 
  CheckCircle2, 
  Clock, 
  FileCheck2, 
  Printer, 
  PlusCircle, 
  X, 
  AlertOctagon, 
  Building2, 
  Calendar, 
  FileText, 
  FileSignature, 
  Layers,
  Search,
  Users
} from 'lucide-react';

interface RetentionDestructionViewProps {
  items: ArchiveItem[];
  destructionRecords: DestructionRecord[];
  masterKategori: MasterKategori[];
  unitInfo: UnitInfo;
  currentUser: User | null;
  onExecuteDestruction: (newRecord: DestructionRecord, targetArchiveIds: string[]) => void;
}

export const RetentionDestructionView: React.FC<RetentionDestructionViewProps> = ({
  items,
  destructionRecords,
  masterKategori,
  unitInfo,
  currentUser,
  onExecuteDestruction,
}) => {
  const [activeTab, setActiveTab] = useState<'jra' | 'proses_musnah' | 'riwayat_ba'>('jra');
  const [retentionFilter, setRetentionFilter] = useState<'ALL' | 'AKTIF' | 'INAKTIF' | 'SIAP_MUSNAH' | 'PERMANEN'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Multi-select for Destruction Batch
  const [selectedIdsForDestruction, setSelectedIdsForDestruction] = useState<string[]>([]);

  // BA Modal State
  const [isBaModalOpen, setIsBaModalOpen] = useState(false);
  const [nomorBA, setNomorBA] = useState(() => `BA-MUSNAH/${new Date().getFullYear()}/00${destructionRecords.length + 1}`);
  const [tanggalPemusnahan, setTanggalPemusnahan] = useState(() => new Date().toISOString().split('T')[0]);
  const [lokasiPemusnahan, setLokasiPemusnahan] = useState('Depo Pengolahan Limbah Kertas Terpadu');
  const [metodePemusnahan, setMetodePemusnahan] = useState<'PENCACAHAN' | 'PELEBURAN' | 'PEMBAKARAN' | 'KIMIAWI'>('PENCACAHAN');
  const [penanggungJawab, setPenanggungJawab] = useState(unitInfo.namaPetugas || 'Drs. Supriyadi, M.Si.');
  const [saksi1, setSaksi1] = useState(unitInfo.namaPimpinan || 'H. Ahmad Subagyo, S.H., M.H.');
  const [saksi2, setSaksi2] = useState('Ir. Hendra Kusuma, M.T. (Tim Inspektorat)');
  const [catatanBA, setCatatanBA] = useState('');

  // Print BA Modal State
  const [printingBA, setPrintingBA] = useState<DestructionRecord | null>(null);

  // Current Year for retention math
  const currentYear = useMemo(() => new Date().getFullYear(), []);

  // Compute JRA status for each active item
  const evaluatedArchives = useMemo(() => {
    return items
      .filter((i) => !i.isDeleted && i.statusSirkulasi !== 'DIMUSNAHKAN')
      .map((item) => {
        const itemYear = item.tanggal ? parseInt(item.tanggal.substring(0, 4), 10) : currentYear;
        const age = currentYear - itemYear;

        // Find category rule
        const categoryRule = masterKategori.find((k) => k.nama.toLowerCase() === (item.kategoriArsip || '').toLowerCase());
        const maxInactiveYear = categoryRule ? categoryRule.masaSimpanTahun : 2; // default 2 years

        let statusRetensi: 'AKTIF' | 'INAKTIF' | 'SIAP_MUSNAH' | 'PERMANEN' = 'INAKTIF';

        if (item.kategoriArsip?.toLowerCase().includes('permanen') || item.kategoriArsip?.toLowerCase().includes('vital')) {
          statusRetensi = 'PERMANEN';
        } else if (age < 1) {
          statusRetensi = 'AKTIF';
        } else if (age >= maxInactiveYear + 1) {
          statusRetensi = 'SIAP_MUSNAH';
        } else {
          statusRetensi = 'INAKTIF';
        }

        return {
          ...item,
          docYear: itemYear,
          docAge: age,
          computedRetention: statusRetensi,
          retentionLimit: maxInactiveYear,
        };
      });
  }, [items, masterKategori, currentYear]);

  // Derived Stats
  const countAktif = useMemo(() => evaluatedArchives.filter((a) => a.computedRetention === 'AKTIF').length, [evaluatedArchives]);
  const countInaktif = useMemo(() => evaluatedArchives.filter((a) => a.computedRetention === 'INAKTIF').length, [evaluatedArchives]);
  const countSiapMusnah = useMemo(() => evaluatedArchives.filter((a) => a.computedRetention === 'SIAP_MUSNAH').length, [evaluatedArchives]);
  const countPermanen = useMemo(() => evaluatedArchives.filter((a) => a.computedRetention === 'PERMANEN').length, [evaluatedArchives]);

  // Filtered Archives for JRA Tab
  const filteredJraArchives = useMemo(() => {
    let list = evaluatedArchives;

    if (retentionFilter !== 'ALL') {
      list = list.filter((a) => a.computedRetention === retentionFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (a) =>
          a.nomorKeputusan.toLowerCase().includes(q) ||
          a.perihal.toLowerCase().includes(q) ||
          a.noDus.toLowerCase().includes(q)
      );
    }

    return list;
  }, [evaluatedArchives, retentionFilter, searchQuery]);

  // Eligible Archives for Destruction
  const eligibleForDestruction = useMemo(() => {
    return evaluatedArchives.filter((a) => a.computedRetention === 'SIAP_MUSNAH' || a.computedRetention === 'INAKTIF');
  }, [evaluatedArchives]);

  // Toggle selection
  const handleToggleSelect = (id: string) => {
    setSelectedIdsForDestruction((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSelectAllSiapMusnah = () => {
    const siapMusnahIds = evaluatedArchives.filter((a) => a.computedRetention === 'SIAP_MUSNAH').map((a) => a.id);
    setSelectedIdsForDestruction(siapMusnahIds);
  };

  // Submit BA Pemusnahan
  const handleBaSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedIdsForDestruction.length === 0) {
      alert('Pilih minimal satu berkas arsip yang akan dimusnahkan.');
      return;
    }

    const selectedItems = evaluatedArchives.filter((a) => selectedIdsForDestruction.includes(a.id));

    const newRecord: DestructionRecord = {
      id: `ba-${Date.now()}`,
      nomorBA: nomorBA.trim(),
      tanggalPemusnahan,
      lokasiPemusnahan: lokasiPemusnahan.trim(),
      metodePemusnahan,
      penanggungJawab: penanggungJawab.trim(),
      saksi1: saksi1.trim(),
      saksi2: saksi2.trim(),
      totalBerkas: selectedItems.length,
      items: selectedItems.map((a) => ({
        archiveId: a.id,
        nomorKeputusan: a.nomorKeputusan,
        perihal: a.perihal,
        noDus: a.noDus,
        tanggalDokumen: a.tanggal,
        unitPengolah: a.unitPengolah,
      })),
      catatan: catatanBA.trim() || 'Pemusnahan dilaksanakan sesuai dengan Jadwal Retensi Arsip (JRA).',
      createdAt: new Date().toISOString(),
    };

    onExecuteDestruction(newRecord, selectedIdsForDestruction);
    setIsBaModalOpen(false);
    setSelectedIdsForDestruction([]);
    setActiveTab('riwayat_ba');
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-slate-900 via-rose-950 to-slate-900 text-white p-6 rounded-2xl shadow-md border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-rose-500/20 text-rose-400 rounded-lg">
              <FileSpreadsheet className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold">Modul Jadwal Retensi & Pemusnahan Arsip (JRA)</h2>
          </div>
          <p className="text-xs text-slate-300">
            Penilaian masa simpan berkas, verifikasi kelayakan pemusnahan, serta pembuatan Berita Acara Pemusnahan Arsip secara legal.
          </p>
        </div>

        {selectedIdsForDestruction.length > 0 && (
          <button
            onClick={() => setIsBaModalOpen(true)}
            className="px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-sm transition-all cursor-pointer flex items-center gap-2 shrink-0 animate-bounce"
          >
            <Flame className="w-4 h-4" />
            <span>Proses Pemusnahan ({selectedIdsForDestruction.length} Berkas)</span>
          </button>
        )}
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-3">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">{countAktif}</div>
            <div className="text-xs text-slate-500 font-medium">Arsip Aktif</div>
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-3">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">{countInaktif}</div>
            <div className="text-xs text-slate-500 font-medium">Arsip Inaktif (Depo)</div>
          </div>
        </div>

        <div className={`p-4 bg-white rounded-2xl border shadow-2xs flex items-center gap-3 ${countSiapMusnah > 0 ? 'border-rose-300 bg-rose-50/30' : 'border-slate-200'}`}>
          <div className={`p-3 rounded-xl ${countSiapMusnah > 0 ? 'bg-rose-100 text-rose-600 animate-pulse' : 'bg-slate-100 text-slate-600'}`}>
            <Flame className="w-6 h-6" />
          </div>
          <div>
            <div className={`text-2xl font-black ${countSiapMusnah > 0 ? 'text-rose-600' : 'text-slate-900'}`}>{countSiapMusnah}</div>
            <div className="text-xs text-slate-500 font-medium">Siap Dimusnahkan</div>
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-3">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">{countPermanen}</div>
            <div className="text-xs text-slate-500 font-medium">Permanen / Vital</div>
          </div>
        </div>

      </div>

      {/* Main Tab Controls & Views */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-4 space-y-4">
        
        {/* Navigation Sub-Tabs */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto scrollbar-none">
            
            <button
              onClick={() => setActiveTab('jra')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                activeTab === 'jra'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4 text-blue-400" />
              <span>Jadwal Retensi (JRA) ({evaluatedArchives.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('proses_musnah')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                activeTab === 'proses_musnah'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Flame className="w-4 h-4 text-rose-400" />
              <span>Proses Pemusnahan ({eligibleForDestruction.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('riwayat_ba')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                activeTab === 'riwayat_ba'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <FileSignature className="w-4 h-4 text-emerald-400" />
              <span>Berita Acara Pemusnahan ({destructionRecords.length})</span>
            </button>

          </div>

          {/* Search Field */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Cari nomor SK, perihal, dus..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* TAB 1: JRA Table */}
        {activeTab === 'jra' && (
          <div className="space-y-3">
            
            {/* Filter Buttons */}
            <div className="flex items-center gap-2 overflow-x-auto text-xs font-semibold py-1">
              <span className="text-slate-400 mr-1 text-[11px]">Filter Retensi:</span>
              {(['ALL', 'AKTIF', 'INAKTIF', 'SIAP_MUSNAH', 'PERMANEN'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setRetentionFilter(st)}
                  className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                    retentionFilter === st
                      ? 'bg-blue-600 text-white font-bold'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {st === 'ALL' ? 'Semua Status' : st.replace('_', ' ')}
                </button>
              ))}
            </div>

            {/* JRA List Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-slate-900 font-bold uppercase border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-3">Status JRA</th>
                    <th className="py-3 px-3">Nomor Keputusan & Tanggal</th>
                    <th className="py-3 px-3">Perihal Arsip</th>
                    <th className="py-3 px-3">Kategori & Batas Retensi</th>
                    <th className="py-3 px-3">Nomor Dus & Lokasi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredJraArchives.map((item) => {
                    return (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-3">
                          {item.computedRetention === 'SIAP_MUSNAH' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                              <Flame className="w-3 h-3 text-rose-600" /> Siap Musnah
                            </span>
                          ) : item.computedRetention === 'INAKTIF' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                              <Layers className="w-3 h-3" /> Inaktif (Depo)
                            </span>
                          ) : item.computedRetention === 'PERMANEN' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3" /> Permanen/Vital
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                              <Clock className="w-3 h-3" /> Aktif
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-3">
                          <div className="font-mono text-blue-700 font-bold">{item.nomorKeputusan}</div>
                          <div className="text-[11px] text-slate-500 mt-0.5">Tgl: {item.tanggal} ({item.docAge} Thn Lalu)</div>
                        </td>

                        <td className="py-3 px-3 max-w-sm">
                          <div className="font-medium text-slate-800 line-clamp-2">{item.perihal}</div>
                          <div className="text-[10px] text-slate-400 mt-0.5">{item.unitPengolah}</div>
                        </td>

                        <td className="py-3 px-3">
                          <span className="font-bold text-slate-900">{item.kategoriArsip || 'Inaktif'}</span>
                          <div className="text-[10px] text-slate-500 mt-0.5">Retensi Inaktif: {item.retentionLimit} Tahun</div>
                        </td>

                        <td className="py-3 px-3">
                          <span className="inline-block font-mono bg-slate-100 text-slate-800 text-[10px] font-bold px-2 py-0.5 rounded border border-slate-200">
                            {item.noDus}
                          </span>
                          <div className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">{item.lokasiPenyimpanan}</div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

          </div>
        )}

        {/* TAB 2: Batch Destruction Selection */}
        {activeTab === 'proses_musnah' && (
          <div className="space-y-4">
            
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between gap-3">
              <div>
                <h4 className="font-bold text-rose-900 text-xs uppercase flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-rose-600" /> Penyeleksian Berkas Siap Pemusnahan
                </h4>
                <p className="text-xs text-rose-800 mt-0.5">
                  Pilih berkas yang telah melewati masa retensi inaktif untuk dimasukkan ke dalam Berita Acara Pemusnahan Arsip (BA Pemusnahan).
                </p>
              </div>

              <button
                onClick={handleSelectAllSiapMusnah}
                className="px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shrink-0"
              >
                Pilih Semua Siap Musnah
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-slate-900 font-bold uppercase border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-3 w-10 text-center">Pilih</th>
                    <th className="py-3 px-3">Status Retensi</th>
                    <th className="py-3 px-3">Nomor Keputusan</th>
                    <th className="py-3 px-3">Perihal Dokumen</th>
                    <th className="py-3 px-3">Unit & Dus</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {eligibleForDestruction.map((item) => {
                    const isSelected = selectedIdsForDestruction.includes(item.id);

                    return (
                      <tr
                        key={item.id}
                        onClick={() => handleToggleSelect(item.id)}
                        className={`cursor-pointer transition-colors ${
                          isSelected ? 'bg-rose-50/70' : 'hover:bg-slate-50'
                        }`}
                      >
                        <td className="py-3 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelect(item.id)}
                            className="w-4 h-4 accent-rose-600 cursor-pointer"
                          />
                        </td>

                        <td className="py-3 px-3">
                          {item.computedRetention === 'SIAP_MUSNAH' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
                              Siap Musnah
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                              Inaktif
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-3 font-mono font-bold text-blue-700">{item.nomorKeputusan}</td>
                        <td className="py-3 px-3 max-w-md font-medium text-slate-800">{item.perihal}</td>
                        <td className="py-3 px-3">
                          <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-[10px] font-bold text-slate-800">
                            {item.noDus}
                          </span>
                          <div className="text-[10px] text-slate-500 mt-0.5">{item.unitPengolah}</div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

          </div>
        )}

        {/* TAB 3: Destruction Records History */}
        {activeTab === 'riwayat_ba' && (
          <div className="space-y-4">
            
            {destructionRecords.length === 0 ? (
              <div className="py-12 text-center text-slate-400 space-y-2">
                <FileSignature className="w-10 h-10 mx-auto text-slate-300" />
                <p className="text-sm font-medium">Belum ada Berita Acara Pemusnahan yang diterbitkan.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {destructionRecords.map((record) => (
                  <div key={record.id} className="p-5 bg-white border border-slate-200 rounded-2xl shadow-2xs space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <span className="font-mono font-bold text-rose-700 text-sm">{record.nomorBA}</span>
                      <span className="text-[10px] font-bold bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-full">
                        {record.tanggalPemusnahan}
                      </span>
                    </div>

                    <div className="text-xs space-y-1 text-slate-700">
                      <div>Metode: <strong>{record.metodePemusnahan}</strong></div>
                      <div>Total Berkas Dimusnahkan: <strong>{record.totalBerkas} Items</strong></div>
                      <div>Penanggung Jawab: {record.penanggungJawab}</div>
                      <div>Saksi: {record.saksi1}, {record.saksi2}</div>
                    </div>

                    <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                      <span className="text-[11px] text-slate-400 italic">Lokasi: {record.lokasiPemusnahan}</span>
                      <button
                        onClick={() => setPrintingBA(record)}
                        className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl cursor-pointer flex items-center gap-1.5"
                      >
                        <Printer className="w-3.5 h-3.5 text-blue-400" /> Cetak BA Official
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

          </div>
        )}

      </div>

      {/* MODAL: Form Berita Acara Pemusnahan */}
      {isBaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-rose-400" />
                <h3 className="font-bold text-base">Terbitkan Berita Acara Pemusnahan (BA-MUSNAH)</h3>
              </div>
              <button
                onClick={() => setIsBaModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleBaSubmit} className="p-6 space-y-4 text-xs">
              
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-900">
                Aksi ini akan menerbitkan Berita Acara Pemusnahan resmi untuk <strong>{selectedIdsForDestruction.length} berkas</strong> dan mengubah status arsip menjadi <strong>DIMUSNAHKAN</strong> secara permanen.
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-800 uppercase">Nomor Berita Acara *</label>
                  <input
                    type="text"
                    required
                    value={nomorBA}
                    onChange={(e) => setNomorBA(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold text-blue-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-800 uppercase">Tanggal Pemusnahan *</label>
                  <input
                    type="date"
                    required
                    value={tanggalPemusnahan}
                    onChange={(e) => setTanggalPemusnahan(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-800 uppercase">Lokasi Pelaksanaan *</label>
                  <input
                    type="text"
                    required
                    value={lokasiPemusnahan}
                    onChange={(e) => setLokasiPemusnahan(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-800 uppercase">Metode Pemusnahan *</label>
                  <select
                    value={metodePemusnahan}
                    onChange={(e) => setMetodePemusnahan(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="PENCACAHAN">PENCACAHAN (Shredding)</option>
                    <option value="PELEBURAN">PELEBURAN (Pulping)</option>
                    <option value="PEMBAKARAN">PEMBAKARAN (Incineration)</option>
                    <option value="KIMIAWI">KIMIAWI (Chemical Process)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-800 uppercase">Penanggung Jawab Pemusnahan (Arsiparis) *</label>
                <input
                  type="text"
                  required
                  value={penanggungJawab}
                  onChange={(e) => setPenanggungJawab(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-800 uppercase">Saksi 1 (Pimpinan/Atasan) *</label>
                  <input
                    type="text"
                    required
                    value={saksi1}
                    onChange={(e) => setSaksi1(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-800 uppercase">Saksi 2 (Inspektorat/Tim Penilai) *</label>
                  <input
                    type="text"
                    required
                    value={saksi2}
                    onChange={(e) => setSaksi2(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-800 uppercase">Catatan Tambahan Berita Acara</label>
                <textarea
                  rows={2}
                  value={catatanBA}
                  onChange={(e) => setCatatanBA(e.target.value)}
                  placeholder="e.g. Berkas dihancurkan fisik secara menyeluruh sampai tidak dapat dikenali kembali..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsBaModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Flame className="w-4 h-4" />
                  <span>Sahkah & Eksekusi Pemusnahan</span>
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* PRINT MODAL: Official Berita Acara Pemusnahan Document */}
      {printingBA && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            
            <div className="bg-slate-900 text-white px-6 py-3 flex items-center justify-between no-print">
              <span className="font-bold text-xs">Pratinjau Cetak Official Berita Acara Pemusnahan Arsip</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg cursor-pointer flex items-center gap-1"
                >
                  <Printer className="w-3.5 h-3.5" /> Cetak Dokumen Resmi
                </button>
                <button
                  onClick={() => setPrintingBA(null)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Document Canvas */}
            <div className="p-10 space-y-6 text-slate-900 text-xs font-serif bg-white" id="printable-ba-document">
              
              {/* Header Official */}
              <div className="border-b-4 border-double border-slate-900 pb-4 text-center space-y-1">
                <div className="text-base font-bold uppercase tracking-wider">{unitInfo.namaInstansi}</div>
                <div className="text-sm font-bold uppercase">{unitInfo.unitKerja}</div>
                <div className="text-xs italic text-slate-600">{unitInfo.lokasiGedungUtama}</div>
              </div>

              {/* Title */}
              <div className="text-center space-y-1 pt-2">
                <h2 className="text-sm font-bold uppercase underline tracking-wider">BERITA ACARA PEMUSNAHAN ARSIP</h2>
                <p className="font-mono text-xs font-bold text-slate-800">Nomor: {printingBA.nomorBA}</p>
              </div>

              {/* Body Text */}
              <p className="leading-relaxed text-justify">
                Pada hari ini, tanggal <strong>{printingBA.tanggalPemusnahan}</strong>, bertempat di <strong>{printingBA.lokasiPemusnahan}</strong>, kami yang bertanda tangan di bawah ini telah melaksanakan pemusnahan arsip inaktif sejumlah <strong>{printingBA.totalBerkas} (dua puluh dua) berkas</strong> dokumen keputusan/surat resmi yang telah habis masa simpan inaktifnya berdasarkan Jadwal Retensi Arsip (JRA).
              </p>

              {/* Destruction Method & Details */}
              <div className="p-3 bg-slate-50 border border-slate-300 rounded text-xs space-y-1">
                <div>• Metode Pelaksanaan Pemusnahan: <strong>{printingBA.metodePemusnahan}</strong></div>
                <div>• Catatan Pelaksanaan: {printingBA.catatan}</div>
              </div>

              {/* List of Destroyed Documents */}
              <div className="space-y-2">
                <div className="font-bold uppercase text-[11px] border-b border-slate-300 pb-1">Daftar Rincian Berkas Yang Dimusnahkan:</div>
                <table className="w-full text-left border-collapse border border-slate-300 text-[11px]">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="border border-slate-300 p-1.5 w-8 text-center">No</th>
                      <th className="border border-slate-300 p-1.5">Nomor Keputusan</th>
                      <th className="border border-slate-300 p-1.5">Perihal Dokumen</th>
                      <th className="border border-slate-300 p-1.5 w-20">No Dus</th>
                    </tr>
                  </thead>
                  <tbody>
                    {printingBA.items.map((item, idx) => (
                      <tr key={idx}>
                        <td className="border border-slate-300 p-1.5 text-center">{idx + 1}</td>
                        <td className="border border-slate-300 p-1.5 font-mono">{item.nomorKeputusan}</td>
                        <td className="border border-slate-300 p-1.5">{item.perihal}</td>
                        <td className="border border-slate-300 p-1.5 font-mono">{item.noDus}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Tanda Tangan Blocks (Saksi-Saksi & Penanggung Jawab) */}
              <div className="pt-8 space-y-8">
                <div className="grid grid-cols-3 gap-4 text-center text-xs">
                  <div>
                    <p className="font-bold">Saksi I (Pimpinan),</p>
                    <div className="h-16"></div>
                    <p className="font-bold underline">{printingBA.saksi1}</p>
                  </div>

                  <div>
                    <p className="font-bold">Saksi II (Inspektorat),</p>
                    <div className="h-16"></div>
                    <p className="font-bold underline">{printingBA.saksi2}</p>
                  </div>

                  <div>
                    <p className="font-bold">Penanggung Jawab,</p>
                    <div className="h-16"></div>
                    <p className="font-bold underline">{printingBA.penanggungJawab}</p>
                  </div>
                </div>

                <div className="text-center pt-4 border-t border-slate-200">
                  <p>Mengetahui / Menyetujui,</p>
                  <p className="font-bold">{unitInfo.jabatanPimpinan}</p>
                  <div className="h-16"></div>
                  <p className="font-bold underline">{unitInfo.namaPimpinan}</p>
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
};
