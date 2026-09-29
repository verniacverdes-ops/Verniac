import React, { useState, useMemo } from 'react';
import { ArchiveItem, LoanRecord, User, UnitInfo } from '../types';
import { 
  BookOpenCheck, 
  PlusCircle, 
  Search, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Printer, 
  User as UserIcon, 
  Building2, 
  Calendar, 
  FileText, 
  RotateCcw,
  X,
  FileCheck2,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';

interface CirculationViewProps {
  items: ArchiveItem[];
  loans: LoanRecord[];
  currentUser: User | null;
  unitInfo: UnitInfo;
  onAddLoan: (newLoan: LoanRecord) => void;
  onReturnLoan: (loanId: string, returnDate: string, condition: 'BAIK' | 'RUSAK' | 'HILANG', notes?: string) => void;
}

export const CirculationView: React.FC<CirculationViewProps> = ({
  items,
  loans,
  currentUser,
  unitInfo,
  onAddLoan,
  onReturnLoan,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'aktif' | 'riwayat'>('aktif');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'DIPINJAM' | 'TERLAMBAT' | 'DIKEMBALIKAN'>('ALL');

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedArchiveId, setSelectedArchiveId] = useState('');
  const [borrowerName, setBorrowerName] = useState('');
  const [borrowerNip, setBorrowerNip] = useState('');
  const [borrowerUnit, setBorrowerUnit] = useState('');
  const [borrowerPhone, setBorrowerPhone] = useState('');
  const [purpose, setPurpose] = useState('');
  const [loanDate, setLoanDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14); // default 14 days
    return d.toISOString().split('T')[0];
  });

  // Return Modal State
  const [returningLoan, setReturningLoan] = useState<LoanRecord | null>(null);
  const [returnDate, setReturnDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [returnCondition, setReturnCondition] = useState<'BAIK' | 'RUSAK' | 'HILANG'>('BAIK');
  const [returnNotes, setReturnNotes] = useState('');

  // Slip Modal State
  const [printingLoan, setPrintingLoan] = useState<LoanRecord | null>(null);

  // Filter available archives for new loan
  const availableArchives = useMemo(() => {
    return items.filter((i) => !i.isDeleted && i.statusSirkulasi !== 'DIPINJAM' && i.statusSirkulasi !== 'DIMUSNAHKAN');
  }, [items]);

  // Derived loan statistics
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  const enrichedLoans = useMemo(() => {
    return loans.map((loan) => {
      const isOverdue = loan.status === 'DIPINJAM' && loan.tanggalJatuhTempo < todayStr;
      return {
        ...loan,
        computedStatus: isOverdue ? ('TERLAMBAT' as const) : loan.status,
      };
    });
  }, [loans, todayStr]);

  const activeLoans = useMemo(() => {
    return enrichedLoans.filter((l) => l.computedStatus === 'DIPINJAM' || l.computedStatus === 'TERLAMBAT');
  }, [enrichedLoans]);

  const overdueCount = useMemo(() => {
    return activeLoans.filter((l) => l.computedStatus === 'TERLAMBAT').length;
  }, [activeLoans]);

  const returnedLoans = useMemo(() => {
    return enrichedLoans.filter((l) => l.status === 'DIKEMBALIKAN');
  }, [enrichedLoans]);

  // Filtered List
  const filteredLoans = useMemo(() => {
    let list = activeSubTab === 'aktif' ? activeLoans : returnedLoans;

    if (filterStatus !== 'ALL') {
      list = list.filter((l) => l.computedStatus === filterStatus);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (l) =>
          l.peminjamNama.toLowerCase().includes(q) ||
          l.peminjamUnit.toLowerCase().includes(q) ||
          l.nomorKeputusan.toLowerCase().includes(q) ||
          l.perihal.toLowerCase().includes(q) ||
          l.noDus.toLowerCase().includes(q)
      );
    }

    return list;
  }, [activeSubTab, activeLoans, returnedLoans, filterStatus, searchQuery]);

  const handleCreateLoanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedArchiveId) {
      alert('Pilih dokumen/arsip yang akan dipinjam.');
      return;
    }
    if (!borrowerName.trim() || !borrowerUnit.trim()) {
      alert('Nama peminjam dan unit kerja wajib diisi.');
      return;
    }

    const archive = items.find((i) => i.id === selectedArchiveId);
    if (!archive) return;

    const newLoan: LoanRecord = {
      id: `loan-${Date.now()}`,
      archiveId: archive.id,
      nomorKeputusan: archive.nomorKeputusan,
      perihal: archive.perihal,
      noDus: archive.noDus,
      peminjamNama: borrowerName.trim(),
      peminjamNip: borrowerNip.trim(),
      peminjamUnit: borrowerUnit.trim(),
      peminjamKontak: borrowerPhone.trim(),
      keperluan: purpose.trim() || 'Pemeriksaan / Kebutuhan Dinas',
      tanggalPinjam: loanDate,
      tanggalJatuhTempo: dueDate,
      status: 'DIPINJAM',
      petugasName: currentUser ? currentUser.name : 'Drs. Supriyadi, M.Si.',
      createdAt: new Date().toISOString(),
    };

    onAddLoan(newLoan);
    setIsAddModalOpen(false);

    // Reset Form
    setSelectedArchiveId('');
    setBorrowerName('');
    setBorrowerNip('');
    setBorrowerUnit('');
    setBorrowerPhone('');
    setPurpose('');
  };

  const handleReturnSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!returningLoan) return;

    onReturnLoan(returningLoan.id, returnDate, returnCondition, returnNotes);
    setReturningLoan(null);
    setReturnNotes('');
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner & Header */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white p-6 rounded-2xl shadow-md border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-blue-500/20 text-blue-400 rounded-lg">
              <BookOpenCheck className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold">Modul Sirkulasi Arsip: Peminjaman & Pengembalian</h2>
          </div>
          <p className="text-xs text-slate-300">
            Sistem pencatatan peminjaman dokumen fisik, batas waktu pengembalian, status ketersediaan, serta bukti peminjaman arsip.
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-sm transition-all cursor-pointer flex items-center gap-2 shrink-0"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Buat Peminjaman Baru</span>
        </button>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-3">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <BookOpenCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">{activeLoans.length}</div>
            <div className="text-xs text-slate-500 font-medium">Peminjaman Aktif</div>
          </div>
        </div>

        <div className={`p-4 bg-white rounded-2xl border shadow-2xs flex items-center gap-3 ${overdueCount > 0 ? 'border-rose-300 bg-rose-50/30' : 'border-slate-200'}`}>
          <div className={`p-3 rounded-xl ${overdueCount > 0 ? 'bg-rose-100 text-rose-600 animate-pulse' : 'bg-slate-100 text-slate-600'}`}>
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <div className={`text-2xl font-black ${overdueCount > 0 ? 'text-rose-600' : 'text-slate-900'}`}>{overdueCount}</div>
            <div className="text-xs text-slate-500 font-medium">Terlambat Dikembalikan</div>
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-3">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">{returnedLoans.length}</div>
            <div className="text-xs text-slate-500 font-medium">Selesai Dikembalikan</div>
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-3">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
            <FileCheck2 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">{availableArchives.length}</div>
            <div className="text-xs text-slate-500 font-medium">Berkas Siap Dipinjam</div>
          </div>
        </div>

      </div>

      {/* Main Tab Controls & Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-4 space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-slate-100 pb-3">
          
          {/* Sub-tab switcher */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => { setActiveSubTab('aktif'); setFilterStatus('ALL'); }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeSubTab === 'aktif'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Clock className="w-4 h-4 text-blue-400" />
              <span>Daftar Peminjaman Aktif ({activeLoans.length})</span>
            </button>

            <button
              onClick={() => { setActiveSubTab('riwayat'); setFilterStatus('ALL'); }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeSubTab === 'riwayat'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Riwayat Pengembalian ({returnedLoans.length})</span>
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Cari peminjam, unit, SK..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

        </div>

        {/* Loan Table */}
        {filteredLoans.length === 0 ? (
          <div className="py-12 text-center text-slate-400 space-y-2">
            <BookOpenCheck className="w-10 h-10 mx-auto text-slate-300" />
            <p className="text-sm font-medium">Tidak ada data peminjaman arsip dalam kategori ini.</p>
            <p className="text-xs text-slate-400">Klik "Buat Peminjaman Baru" untuk mencatat peminjaman dokumen.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-900 font-bold uppercase border-b border-slate-200">
                <tr>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Peminjam & Unit</th>
                  <th className="py-3 px-3">Nomor Keputusan / Perihal</th>
                  <th className="py-3 px-3">Dus & Keperluan</th>
                  <th className="py-3 px-3">Tgl Pinjam / Jatuh Tempo</th>
                  <th className="py-3 px-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLoans.map((loan) => {
                  const isOverdue = loan.computedStatus === 'TERLAMBAT';
                  const isReturned = loan.status === 'DIKEMBALIKAN';

                  return (
                    <tr key={loan.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-3">
                        {isReturned ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" /> Dikembalikan
                          </span>
                        ) : isOverdue ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200 animate-pulse">
                            <AlertTriangle className="w-3 h-3" /> Terlambat
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                            <Clock className="w-3 h-3" /> Dipinjam
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-3">
                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                          <UserIcon className="w-3.5 h-3.5 text-blue-600" /> {loan.peminjamNama}
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <Building2 className="w-3 h-3 text-slate-400" /> {loan.peminjamUnit}
                          {loan.peminjamNip && ` • NIP: ${loan.peminjamNip}`}
                        </div>
                      </td>

                      <td className="py-3.5 px-3 max-w-xs">
                        <div className="font-mono text-[11px] font-bold text-blue-700">{loan.nomorKeputusan}</div>
                        <div className="text-[11px] text-slate-600 line-clamp-2 mt-0.5">{loan.perihal}</div>
                      </td>

                      <td className="py-3.5 px-3">
                        <span className="inline-block font-mono bg-slate-100 text-slate-800 text-[10px] font-bold px-2 py-0.5 rounded border border-slate-200 mb-1">
                          {loan.noDus}
                        </span>
                        <div className="text-[11px] text-slate-500 italic line-clamp-1">{loan.keperluan}</div>
                      </td>

                      <td className="py-3.5 px-3 text-[11px]">
                        <div className="flex items-center gap-1 text-slate-700">
                          <Calendar className="w-3 h-3 text-slate-400" /> Pinjam: {loan.tanggalPinjam}
                        </div>
                        <div className={`flex items-center gap-1 font-semibold mt-0.5 ${isOverdue ? 'text-rose-600 font-bold' : 'text-slate-600'}`}>
                          <Clock className="w-3 h-3" /> Tempo: {loan.tanggalJatuhTempo}
                        </div>
                        {loan.tanggalKembali && (
                          <div className="text-emerald-700 font-semibold mt-0.5">
                            Kembali: {loan.tanggalKembali}
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          
                          {/* Slip Button */}
                          <button
                            onClick={() => setPrintingLoan(loan)}
                            title="Cetak Bukti Slip Peminjaman"
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>

                          {/* Return Button */}
                          {!isReturned && (
                            <button
                              onClick={() => {
                                setReturningLoan(loan);
                                setReturnDate(new Date().toISOString().split('T')[0]);
                              }}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] rounded-lg transition-all cursor-pointer flex items-center gap-1 shadow-2xs"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Pengembalian</span>
                            </button>
                          )}

                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

      </div>

      {/* MODAL 1: Buat Peminjaman Baru */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2">
                <BookOpenCheck className="w-5 h-5 text-blue-400" />
                <h3 className="font-bold text-base">Formulir Peminjaman Berkas Arsip</h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateLoanSubmit} className="p-6 space-y-4 text-xs">
              
              {/* Archive Selection */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-800 uppercase flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5 text-blue-600" /> Pilih Dokumen / Berkas Arsip *
                </label>
                <select
                  required
                  value={selectedArchiveId}
                  onChange={(e) => setSelectedArchiveId(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Pilih dari Berkas Tersedia ({availableArchives.length}) --</option>
                  {availableArchives.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.nomorKeputusan} - {item.perihal} [{item.noDus}]
                    </option>
                  ))}
                </select>
              </div>

              {/* Borrower Name & NIP */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-800 uppercase">Nama Peminjam *</label>
                  <input
                    type="text"
                    required
                    value={borrowerName}
                    onChange={(e) => setBorrowerName(e.target.value)}
                    placeholder="e.g. Ahmad Fauzi, S.STP"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-800 uppercase">NIP / ID Pegawai</label>
                  <input
                    type="text"
                    value={borrowerNip}
                    onChange={(e) => setBorrowerNip(e.target.value)}
                    placeholder="e.g. 198504122010011005"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Borrower Unit & Contact */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-800 uppercase">Unit Kerja / Pengolah *</label>
                  <input
                    type="text"
                    required
                    value={borrowerUnit}
                    onChange={(e) => setBorrowerUnit(e.target.value)}
                    placeholder="e.g. Bagian Hukum & Organisasi"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-800 uppercase">No. Telepon / WhatsApp</label>
                  <input
                    type="text"
                    value={borrowerPhone}
                    onChange={(e) => setBorrowerPhone(e.target.value)}
                    placeholder="e.g. 0812-3456-7890"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Loan Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-800 uppercase">Tanggal Pinjam *</label>
                  <input
                    type="date"
                    required
                    value={loanDate}
                    onChange={(e) => setLoanDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-800 uppercase">Batas Jatuh Tempo *</label>
                  <input
                    type="date"
                    required
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Purpose */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-800 uppercase">Keperluan / Alasan Peminjaman</label>
                <textarea
                  rows={2}
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  placeholder="e.g. Pemeriksaan Audit Kinerja Kearsipan..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-xs cursor-pointer"
                >
                  Simpan & Kunci Peminjaman
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* MODAL 2: Pengembalian Berkas */}
      {returningLoan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-base">Konfirmasi Pengembalian Arsip</h3>
              </div>
              <button
                onClick={() => setReturningLoan(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleReturnSubmit} className="p-6 space-y-4 text-xs">
              
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <div className="font-mono text-blue-700 font-bold">{returningLoan.nomorKeputusan}</div>
                <div className="text-slate-800 line-clamp-2">{returningLoan.perihal}</div>
                <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-200">
                  Peminjam: <strong>{returningLoan.peminjamNama}</strong> ({returningLoan.peminjamUnit})
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-800 uppercase">Tanggal Dikembalikan *</label>
                <input
                  type="date"
                  required
                  value={returnDate}
                  onChange={(e) => setReturnDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-800 uppercase">Kondisi Fisik Berkas *</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setReturnCondition('BAIK')}
                    className={`py-2 px-3 rounded-xl border text-center font-bold cursor-pointer ${
                      returnCondition === 'BAIK'
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-slate-50 text-slate-700 border-slate-300'
                    }`}
                  >
                    Baik & Utuh
                  </button>

                  <button
                    type="button"
                    onClick={() => setReturnCondition('RUSAK')}
                    className={`py-2 px-3 rounded-xl border text-center font-bold cursor-pointer ${
                      returnCondition === 'RUSAK'
                        ? 'bg-amber-600 text-white border-amber-600'
                        : 'bg-slate-50 text-slate-700 border-slate-300'
                    }`}
                  >
                    Ada Kerusakan
                  </button>

                  <button
                    type="button"
                    onClick={() => setReturnCondition('HILANG')}
                    className={`py-2 px-3 rounded-xl border text-center font-bold cursor-pointer ${
                      returnCondition === 'HILANG'
                        ? 'bg-rose-600 text-white border-rose-600'
                        : 'bg-slate-50 text-slate-700 border-slate-300'
                    }`}
                  >
                    Hilang
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-800 uppercase">Catatan Petugas (Opsional)</label>
                <textarea
                  rows={2}
                  value={returnNotes}
                  onChange={(e) => setReturnNotes(e.target.value)}
                  placeholder="e.g. Dikembalikan lengkap tanpa ada halaman yang hilang..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setReturningLoan(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-xs cursor-pointer"
                >
                  Proses Pengembalian
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* MODAL 3: Printable Slip Peminjaman */}
      {printingLoan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            
            <div className="bg-slate-900 text-white px-6 py-3 flex items-center justify-between no-print">
              <span className="font-bold text-xs">Pratinjau Bukti Peminjaman (Slip Peminjaman)</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg cursor-pointer flex items-center gap-1"
                >
                  <Printer className="w-3.5 h-3.5" /> Cetak
                </button>
                <button
                  onClick={() => setPrintingLoan(null)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Slip Canvas */}
            <div className="p-8 space-y-6 text-slate-900 text-xs font-serif bg-white" id="printable-loan-slip">
              
              {/* Kop Slip */}
              <div className="border-b-2 border-slate-900 pb-3 text-center space-y-1">
                <div className="text-sm font-bold uppercase tracking-wider">{unitInfo.namaInstansi}</div>
                <div className="text-xs font-bold uppercase">{unitInfo.unitKerja}</div>
                <div className="text-[10px] text-slate-600 italic">LEMBAR BUKTI PEMINJAMAN ARSIP INAKTIF</div>
              </div>

              {/* Slip Metadata Table */}
              <table className="w-full text-left border-collapse text-xs">
                <tbody>
                  <tr className="border-b border-slate-200">
                    <td className="py-1.5 font-bold w-36">No. Transaksi Pinjam</td>
                    <td className="py-1.5 font-mono font-bold text-blue-900">: {printingLoan.id}</td>
                  </tr>
                  <tr className="border-b border-slate-200">
                    <td className="py-1.5 font-bold">Nomor Keputusan/SK</td>
                    <td className="py-1.5 font-mono font-bold">: {printingLoan.nomorKeputusan}</td>
                  </tr>
                  <tr className="border-b border-slate-200">
                    <td className="py-1.5 font-bold">Perihal Dokumen</td>
                    <td className="py-1.5">: {printingLoan.perihal}</td>
                  </tr>
                  <tr className="border-b border-slate-200">
                    <td className="py-1.5 font-bold">Nomor Dus / Boks</td>
                    <td className="py-1.5 font-bold">: {printingLoan.noDus}</td>
                  </tr>
                  <tr className="border-b border-slate-200">
                    <td className="py-1.5 font-bold">Nama Peminjam</td>
                    <td className="py-1.5 font-bold">: {printingLoan.peminjamNama}</td>
                  </tr>
                  <tr className="border-b border-slate-200">
                    <td className="py-1.5 font-bold">Unit Kerja Peminjam</td>
                    <td className="py-1.5">: {printingLoan.peminjamUnit}</td>
                  </tr>
                  <tr className="border-b border-slate-200">
                    <td className="py-1.5 font-bold">Tanggal Peminjaman</td>
                    <td className="py-1.5">: {printingLoan.tanggalPinjam}</td>
                  </tr>
                  <tr className="border-b border-slate-200">
                    <td className="py-1.5 font-bold">Batas Pengembalian</td>
                    <td className="py-1.5 font-bold text-rose-800">: {printingLoan.tanggalJatuhTempo}</td>
                  </tr>
                  <tr>
                    <td className="py-1.5 font-bold">Keperluan Peminjaman</td>
                    <td className="py-1.5 italic">: {printingLoan.keperluan}</td>
                  </tr>
                </tbody>
              </table>

              {/* Tanda Tangan Block */}
              <div className="pt-6 grid grid-cols-2 gap-8 text-center text-xs">
                <div>
                  <p>Petugas Pengelola Depo,</p>
                  <div className="h-16"></div>
                  <p className="font-bold underline">{unitInfo.namaPetugas}</p>
                  <p className="text-[10px] text-slate-500">{unitInfo.jabatanPetugas}</p>
                </div>

                <div>
                  <p>Peminjam Arsip,</p>
                  <div className="h-16"></div>
                  <p className="font-bold underline">{printingLoan.peminjamNama}</p>
                  <p className="text-[10px] text-slate-500">{printingLoan.peminjamUnit}</p>
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
};
