import React, { useState, useEffect } from 'react';
import { ArchiveItem, PdfAttachment, AttachmentMime, KlasifikasiAkses, MasterKategori, MasterUnit } from '../types';
import { X, Save, FileText, FileSpreadsheet, Calendar, AlignLeft, Box, MapPin, Tag, Building2, HelpCircle, Upload, FileCheck, Trash2, Shield } from 'lucide-react';

// Jenis lampiran digital yang bisa diunggah lewat form ini -- selaras
// dengan ATTACHMENT_TYPES di backend/routes/arsip.ts. Kunci = MIME type,
// value = label ringkas + ekstensi yang diterima (dipakai untuk pesan error
// dan atribut `accept` pada <input type="file">).
const ACCEPTED_ATTACHMENT_TYPES: Record<string, string> = {
  'application/pdf': 'PDF',
  'application/msword': 'Word (.doc)',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word (.docx)',
  'application/vnd.ms-excel': 'Excel (.xls)',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'Excel (.xlsx)',
};
const ACCEPTED_ATTACHMENT_ACCEPT = [
  '.pdf', '.doc', '.docx', '.xls', '.xlsx',
  ...Object.keys(ACCEPTED_ATTACHMENT_TYPES),
].join(',');
const MAX_ATTACHMENT_MB = 15;

interface ArchiveFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: Partial<ArchiveItem>) => void;
  initialData?: ArchiveItem | null;
  existingDusList: string[];
  masterKategoriList: MasterKategori[];
  masterUnitList: MasterUnit[];
}

export const ArchiveFormModal: React.FC<ArchiveFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  existingDusList,
  masterKategoriList,
  masterUnitList,
}) => {
  const [nomorKeputusan, setNomorKeputusan] = useState('');
  const [tanggal, setTanggal] = useState('');
  const [perihal, setPerihal] = useState('');
  const [noDus, setNoDus] = useState('');
  const [lokasiPenyimpanan, setLokasiPenyimpanan] = useState('');
  const [keterangan, setKeterangan] = useState('');
  const [unitId, setUnitId] = useState('');
  const [kategoriId, setKategoriId] = useState('');
  const [klasifikasiAkses, setKlasifikasiAkses] = useState<KlasifikasiAkses>('INTERNAL');
  const [pdfAttachment, setPdfAttachment] = useState<PdfAttachment | undefined>(undefined);

  useEffect(() => {
    if (initialData) {
      setNomorKeputusan(initialData.nomorKeputusan || '');
      setTanggal(initialData.tanggal || '');
      setPerihal(initialData.perihal || '');
      setNoDus(initialData.noDus || '');
      setLokasiPenyimpanan(initialData.lokasiPenyimpanan || '');
      setKeterangan(initialData.keterangan || '');

      // Sumber kebenaran utama: kategoriId/unitId. Untuk data lama yang belum
      // punya id (hanya teks bebas), coba cocokkan ke master data by nama;
      // kalau tetap tidak ketemu, fallback ke opsi pertama supaya nilai yang
      // tersimpan selalu valid & konsisten dengan master data.
      const matchedUnit =
        (initialData.unitId && masterUnitList.find(u => u.id === initialData.unitId)) ||
        masterUnitList.find(u => u.namaUnit === initialData.unitPengolah);
      setUnitId(matchedUnit?.id || masterUnitList[0]?.id || '');

      const matchedKategori =
        (initialData.kategoriId && masterKategoriList.find(k => k.id === initialData.kategoriId)) ||
        masterKategoriList.find(k => k.nama === initialData.kategoriArsip || k.nama === `Arsip ${initialData.kategoriArsip}`);
      setKategoriId(matchedKategori?.id || masterKategoriList[0]?.id || '');

      setKlasifikasiAkses(initialData.klasifikasiAkses || 'INTERNAL');
      setPdfAttachment(initialData.pdfAttachment);
    } else {
      // Default reset for new entry
      const today = new Date().toISOString().split('T')[0];
      setNomorKeputusan('');
      setTanggal(today);
      setPerihal('');
      setNoDus(existingDusList.length > 0 ? existingDusList[0] : 'DUS-01/2026');
      setLokasiPenyimpanan('Depo Arsip Utama - Rak A1 - Baris 1');
      setKeterangan('Dokumen Asli, 1 Berkas');
      setUnitId(masterUnitList[0]?.id || '');
      setKategoriId(masterKategoriList[0]?.id || '');
      setKlasifikasiAkses('INTERNAL');
      setPdfAttachment(undefined);
    }
  }, [initialData, isOpen, existingDusList, masterUnitList, masterKategoriList]);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Beberapa browser tidak mengisi file.type dengan benar untuk berkas
    // Word/Excel format lama (.doc/.xls), jadi tipe juga dicoba ditebak
    // dari ekstensi nama file sebagai fallback.
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    const extToMime: Record<string, AttachmentMime> = {
      pdf: 'application/pdf',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      xls: 'application/vnd.ms-excel',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };
    const resolvedMime: AttachmentMime | undefined =
      (file.type && ACCEPTED_ATTACHMENT_TYPES[file.type] ? (file.type as AttachmentMime) : undefined) ||
      extToMime[ext];

    if (!resolvedMime) {
      alert('Harap unggah berkas berformat PDF, Word (.doc/.docx), atau Excel (.xls/.xlsx)!');
      return;
    }
    if (file.size > MAX_ATTACHMENT_MB * 1024 * 1024) {
      alert(`Ukuran berkas melebihi batas maksimal ${MAX_ATTACHMENT_MB}MB!`);
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const raw = event.target?.result as string;
      // Data URL dibangun ulang dengan mime yang sudah dipastikan valid
      // (bukan langsung dari raw hasil FileReader), supaya validasi mime
      // di backend (backend/routes/arsip.ts) selalu konsisten walau
      // browser salah mendeteksi tipe berkas lama seperti .doc/.xls.
      const base64 = raw.substring(raw.indexOf(',') + 1);
      setPdfAttachment({
        fileName: file.name,
        fileSize: file.size,
        fileData: `data:${resolvedMime};base64,${base64}`,
        mime: resolvedMime,
        uploadedAt: new Date().toLocaleDateString('id-ID'),
      });
    };
    reader.readAsDataURL(file);
  };

  // Ikon + warna badge lampiran, disesuaikan dengan tipe berkas. Data lama
  // tanpa field `mime` (diunggah sebelum fitur multi-format ini ada)
  // diperlakukan sebagai PDF.
  const attachmentVisual = (mime?: AttachmentMime) => {
    if (mime === 'application/vnd.ms-excel' || mime === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
      return { icon: <FileSpreadsheet className="w-4 h-4" />, bg: 'bg-emerald-600', panel: 'bg-emerald-50 border-emerald-300', text: 'text-emerald-950', sub: 'text-emerald-700' };
    }
    if (mime === 'application/msword' || mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      return { icon: <FileText className="w-4 h-4" />, bg: 'bg-blue-600', panel: 'bg-blue-50 border-blue-300', text: 'text-blue-950', sub: 'text-blue-700' };
    }
    return { icon: <FileText className="w-4 h-4" />, bg: 'bg-rose-600', panel: 'bg-rose-50 border-rose-300', text: 'text-rose-950', sub: 'text-rose-700' };
  };

  const handleRemovePdf = () => {
    setPdfAttachment(undefined);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomorKeputusan.trim() || !perihal.trim() || !noDus.trim() || !lokasiPenyimpanan.trim()) {
      alert('Harap lengkapi kolom Nomor Keputusan, Perihal, No. Dus, dan Lokasi Penyimpanan!');
      return;
    }

    // Validasi referensial: unitId & kategoriId wajib menunjuk ke entri yang
    // benar-benar ada di master data. Ini mencegah data arsip "nyasar" (unit
    // atau kategori yang sudah dihapus/tidak dikenal) seperti yang pernah
    // terjadi pada data sample sebelumnya.
    const selectedUnit = masterUnitList.find(u => u.id === unitId);
    const selectedKategori = masterKategoriList.find(k => k.id === kategoriId);

    if (!selectedUnit) {
      alert('Unit Pengolah tidak valid. Silakan pilih unit dari daftar master data.');
      return;
    }
    if (!selectedKategori) {
      alert('Kategori Arsip tidak valid. Silakan pilih kategori dari daftar master data.');
      return;
    }

    onSave({
      id: initialData?.id,
      nomorKeputusan: nomorKeputusan.trim(),
      tanggal: tanggal || new Date().toISOString().split('T')[0],
      perihal: perihal.trim(),
      noDus: noDus.trim().toUpperCase(),
      lokasiPenyimpanan: lokasiPenyimpanan.trim(),
      keterangan: keterangan.trim(),
      unitId: selectedUnit.id,
      unitPengolah: selectedUnit.namaUnit,
      kategoriId: selectedKategori.id,
      kategoriArsip: selectedKategori.nama,
      klasifikasiAkses: klasifikasiAkses,
      // FASE 9: kirim `null` eksplisit (bukan `undefined`, yang akan
      // hilang begitu saja saat JSON.stringify) kalau user menghapus
      // lampiran lewat tombol hapus. Backend (backend/routes/arsip.ts)
      // membedakan tiga kondisi: key tidak dikirim sama sekali (jangan
      // diubah), `null` (hapus), atau object baru berisi fileData
      // (ganti berkas).
      pdfAttachment: pdfAttachment ?? null,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-600/30 text-blue-400 rounded-lg">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">
                {initialData ? 'Edit Data Pertelaan Arsip' : 'Tambah Pertelaan Arsip Baru'}
              </h2>
              <p className="text-xs text-slate-400">
                Lengkapi rincian berkas arsip untuk Daftar Pertelaan Tahun 2026
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          
          {/* Row 1: Nomor Keputusan & Tanggal */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2 space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 uppercase">
                <FileText className="w-3.5 h-3.5 text-blue-600" />
                <span>Nomor Keputusan / Surat <span className="text-rose-500">*</span></span>
              </label>
              <input
                type="text"
                required
                value={nomorKeputusan}
                onChange={(e) => setNomorKeputusan(e.target.value)}
                placeholder="Contoh: 188.4/01/SK/2026 atau 050/12/KPTS/2026"
                id="input-nomor-keputusan"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 uppercase">
                <Calendar className="w-3.5 h-3.5 text-blue-600" />
                <span>Tanggal <span className="text-rose-500">*</span></span>
              </label>
              <input
                type="date"
                required
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
                id="input-tanggal-keputusan"
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
              />
            </div>
          </div>

          {/* Row 2: Perihal */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 uppercase">
              <AlignLeft className="w-3.5 h-3.5 text-blue-600" />
              <span>Perihal / Uraian Isi Ringkas Arsip <span className="text-rose-500">*</span></span>
            </label>
            <textarea
              required
              rows={3}
              value={perihal}
              onChange={(e) => setPerihal(e.target.value)}
              placeholder="Jelaskan mengenai isi keputusan/surat secara singkat dan jelas..."
              id="input-perihal-arsip"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
            />
          </div>

          {/* Row 3: No. Dus, Kategori, & Klasifikasi Akses */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            
            {/* No. Dus Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 uppercase">
                <Box className="w-3.5 h-3.5 text-amber-600" />
                <span>No. Dus / Boks <span className="text-rose-500">*</span></span>
              </label>
              <input
                type="text"
                required
                value={noDus}
                onChange={(e) => setNoDus(e.target.value)}
                placeholder="Contoh: DUS-01/2026 atau BOX-05"
                id="input-no-dus"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-amber-900 font-mono font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all uppercase"
              />
              
              {/* Quick Dus suggestion pills */}
              {existingDusList.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  <span className="text-[10px] text-slate-400">Dus terdaftar:</span>
                  {existingDusList.slice(0, 3).map((dus) => (
                    <button
                      key={dus}
                      type="button"
                      onClick={() => setNoDus(dus)}
                      className="text-[10px] bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.5 rounded font-mono hover:bg-amber-100 cursor-pointer"
                    >
                      {dus}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Kategori Arsip */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 uppercase">
                <Tag className="w-3.5 h-3.5 text-blue-600" />
                <span>Kategori Arsip</span>
              </label>
              <select
                value={kategoriId}
                onChange={(e) => setKategoriId(e.target.value)}
                id="select-kategori-arsip"
                required
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium cursor-pointer"
              >
                {masterKategoriList.length === 0 && (
                  <option value="">-- Belum ada Master Kategori --</option>
                )}
                {masterKategoriList.map((kat) => (
                  <option key={kat.id} value={kat.id}>
                    {kat.nama} ({kat.kode})
                  </option>
                ))}
              </select>
            </div>

            {/* Klasifikasi Akses (Poin 5) */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 uppercase">
                <Shield className="w-3.5 h-3.5 text-purple-600" />
                <span>Klasifikasi Akses</span>
              </label>
              <select
                value={klasifikasiAkses}
                onChange={(e) => setKlasifikasiAkses(e.target.value as KlasifikasiAkses)}
                id="select-klasifikasi-akses"
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all cursor-pointer"
              >
                <option value="PUBLIK">Publik (Bebas Akses)</option>
                <option value="INTERNAL">Internal (Petugas/Operator)</option>
                <option value="TERBATAS">Terbatas (Arsiparis+ Admin)</option>
                <option value="RAHASIA">Rahasia (Admin/Auditor)</option>
                <option value="SANGAT_RAHASIA">Sangat Rahasia (Super Admin)</option>
              </select>
            </div>

          </div>

          {/* Row 4: Lokasi Penyimpanan Arsip */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 uppercase">
              <MapPin className="w-3.5 h-3.5 text-emerald-600" />
              <span>Keterangan / Lokasi Penyimpanan <span className="text-rose-500">*</span></span>
            </label>
            <input
              type="text"
              required
              value={lokasiPenyimpanan}
              onChange={(e) => setLokasiPenyimpanan(e.target.value)}
              placeholder="Contoh: Depo Arsip Utama - Rak A1 - Baris 2"
              id="input-lokasi-penyimpanan"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-medium"
            />
            <p className="text-[11px] text-slate-500 italic">
              Sebutkan rincian gedung, nama ruang/depo, nomor rak, serta tingkat baris/lemari.
            </p>
          </div>

          {/* Row 5: Unit Pengolah & Keterangan Tambahan */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 uppercase">
                <Building2 className="w-3.5 h-3.5 text-slate-600" />
                <span>Unit Pengolah / Bagian</span>
              </label>
              <select
                value={unitId}
                onChange={(e) => setUnitId(e.target.value)}
                id="select-unit-pengolah"
                required
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer"
              >
                {masterUnitList.length === 0 && (
                  <option value="">-- Belum ada Master Unit --</option>
                )}
                {masterUnitList.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.namaUnit} ({unit.kode})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 uppercase">
                <HelpCircle className="w-3.5 h-3.5 text-slate-600" />
                <span>Keterangan Tambahan / Berkas</span>
              </label>
              <input
                type="text"
                value={keterangan}
                onChange={(e) => setKeterangan(e.target.value)}
                placeholder="Misal: Asli, 1 Berkas (12 Lembar)"
                id="input-keterangan-tambahan"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
            </div>
          </div>

          {/* Row 6: Upload Document File (PDF / Word / Excel) */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <label className="text-xs font-bold text-slate-700 flex items-center justify-between uppercase">
              <span className="flex items-center gap-1.5">
                <Upload className="w-3.5 h-3.5 text-emerald-600" />
                <span>Lampiran File Digital</span>
              </span>
              <span className="text-[10px] text-slate-400 font-normal normal-case">PDF, Word, Excel • Max {MAX_ATTACHMENT_MB}MB</span>
            </label>

            {pdfAttachment ? (() => {
              const visual = attachmentVisual(pdfAttachment.mime);
              return (
                <div className={`p-3 border rounded-xl flex items-center justify-between text-xs ${visual.panel}`}>
                  <div className="flex items-center gap-2.5">
                    <div className={`p-2 text-white rounded-lg ${visual.bg}`}>
                      {visual.icon}
                    </div>
                    <div>
                      <p className={`font-bold truncate max-w-xs ${visual.text}`}>{pdfAttachment.fileName}</p>
                      <p className={`text-[10px] ${visual.sub}`}>
                        {Math.round(pdfAttachment.fileSize / 1024)} KB • Diunggah {pdfAttachment.uploadedAt}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleRemovePdf}
                    className="p-1.5 bg-rose-100 hover:bg-rose-200 text-rose-700 rounded-lg font-bold text-xs flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Hapus</span>
                  </button>
                </div>
              );
            })() : (
              <label className="p-4 border-2 border-dashed border-slate-300 hover:border-emerald-500 bg-slate-50 hover:bg-emerald-50/50 rounded-xl cursor-pointer flex flex-col items-center justify-center gap-1 transition-all">
                <Upload className="w-5 h-5 text-emerald-600" />
                <span className="text-xs font-bold text-slate-800">Klik untuk Pilih & Unggah Dokumen</span>
                <span className="text-[10px] text-slate-400 text-center">
                  Mendukung PDF, Word (.doc/.docx), dan Excel (.xls/.xlsx) — arsip digital akan langsung dapat dipratinjau & diunduh
                </span>
                <input
                  type="file"
                  accept={ACCEPTED_ATTACHMENT_ACCEPT}
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            )}
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg text-sm transition-all cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              id="btn-simpan-arsip"
              className="inline-flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg text-sm shadow-sm transition-all cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Simpan Data Arsip</span>
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};