import React, { useState } from 'react';
import { ArchiveItem, UnitInfo, MasterKategori, MasterUnit, MasterGedung } from '../types';
import { 
  FileText, 
  BarChart3, 
  Download, 
  Printer, 
  Calendar, 
  Filter, 
  CheckCircle2, 
  FileSpreadsheet, 
  Building2, 
  FolderKanban, 
  Layers, 
  Clock,
  Sparkles
} from 'lucide-react';

interface ReportsViewProps {
  items: ArchiveItem[];
  unitInfo: UnitInfo;
  masterKategori: MasterKategori[];
  masterUnit: MasterUnit[];
  masterGedung: MasterGedung[];
  onOpenPrintModal: () => void;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  items,
  unitInfo,
  masterKategori,
  masterUnit,
  masterGedung,
  onOpenPrintModal,
}) => {
  const [reportType, setReportType] = useState<'unit' | 'kategori' | 'dus' | 'retensi'>('unit');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedUnitFilter, setSelectedUnitFilter] = useState('');

  // Active non-deleted items
  const activeItems = items.filter((i) => !i.isDeleted);

  // Date filtering
  const filteredItems = activeItems.filter((item) => {
    if (startDate && item.tanggal < startDate) return false;
    if (endDate && item.tanggal > endDate) return false;
    if (selectedUnitFilter && item.unitPengolah !== selectedUnitFilter) return false;
    return true;
  });

  // Calculate Groupings
  const unitStats = masterUnit.map((u) => {
    const matching = filteredItems.filter((i) => i.unitPengolah === u.namaUnit || i.unitPengolah?.includes(u.kode));
    return {
      namaUnit: u.namaUnit,
      kode: u.kode,
      kepala: u.kepalaUnit,
      count: matching.length,
      items: matching,
    };
  });

  const kategoriStats = masterKategori.map((k) => {
    const matching = filteredItems.filter((i) => i.kategoriArsip === k.nama || i.kategoriArsip?.includes(k.kode));
    return {
      namaKategori: k.nama,
      kode: k.kode,
      retensi: k.masaSimpanTahun,
      count: matching.length,
      items: matching,
    };
  });

  // Export CSV Helper with BOM for Excel UTF-8
  const handleExportReportCsv = () => {
    let csvRows: string[] = [];

    csvRows.push(`LAPORAN LAPORAN PERTELAAN ARSIP (${reportType.toUpperCase()})`);
    csvRows.push(`Instansi: ${unitInfo.namaInstansi}`);
    csvRows.push(`Tanggal Cetak: ${new Date().toLocaleDateString('id-ID')}`);
    csvRows.push('');

    csvRows.push('"No","Nomor Keputusan","Tanggal","Perihal","Unit Pengolah","Kategori","Nomor Dus","Lokasi Storage"');

    filteredItems.forEach((item, index) => {
      csvRows.push(
        `"${index + 1}","${item.nomorKeputusan}","${item.tanggal}","${item.perihal.replace(/"/g, '""')}","${item.unitPengolah || '-'}","${item.kategoriArsip || '-'}","${item.noDus}","${item.lokasiPenyimpanan}"`
      );
    });

    const csvContent = '\uFEFF' + csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Laporan_Kearsipan_${reportType}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-blue-600 uppercase">
            <BarChart3 className="w-4 h-4" /> modul Laporan & Rekapitulasi (Tahap 3)
          </div>
          <h2 className="text-xl font-bold text-slate-900 mt-0.5">Laporan Eksekutif Pertelaan Arsip 2026</h2>
          <p className="text-xs text-slate-500">Rekapitulasi berkas pertelaan arsip per unit kerja, kategori, lokasi, serta perkiraan masa retensi.</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <button
            onClick={handleExportReportCsv}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-sm transition-all"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Ekspor Excel / CSV</span>
          </button>

          <button
            onClick={onOpenPrintModal}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-sm transition-all"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak PDF Laporan ANRI</span>
          </button>
        </div>
      </div>

      {/* Filter & Report Type Selector Bar */}
      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          
          {/* Report Type Pills */}
          <div className="flex items-center gap-1 overflow-x-auto text-xs font-bold bg-slate-200/70 p-1 rounded-xl">
            <button
              onClick={() => setReportType('unit')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                reportType === 'unit' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-600'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Rekap per Unit</span>
            </button>

            <button
              onClick={() => setReportType('kategori')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                reportType === 'kategori' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-600'
              }`}
            >
              <FolderKanban className="w-3.5 h-3.5" />
              <span>Rekap per Kategori</span>
            </button>

            <button
              onClick={() => setReportType('retensi')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                reportType === 'retensi' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-600'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Laporan Masa Retensi</span>
            </button>
          </div>

          {/* Date & Unit Filter Controls */}
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl border border-slate-300">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-transparent focus:outline-none text-slate-800 font-mono text-[11px]"
              />
              <span className="text-slate-400">s/d</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-transparent focus:outline-none text-slate-800 font-mono text-[11px]"
              />
            </div>

            {(startDate || endDate || selectedUnitFilter) && (
              <button
                onClick={() => {
                  setStartDate('');
                  setEndDate('');
                  setSelectedUnitFilter('');
                }}
                className="px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-lg text-[11px] cursor-pointer"
              >
                Reset Filter
              </button>
            )}
          </div>

        </div>
      </div>

      {/* Report Content Body */}
      <div className="space-y-6">
        
        {/* REPORT TYPE 1: PER UNIT PENGOLAH */}
        {reportType === 'unit' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {unitStats.map((stat) => (
              <div key={stat.kode} className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div>
                    <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded text-[10px] border border-blue-200">
                      {stat.kode}
                    </span>
                    <h3 className="font-bold text-slate-900 text-sm mt-1">{stat.namaUnit}</h3>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-black text-slate-900">{stat.count}</span>
                    <span className="block text-[10px] text-slate-500 font-semibold">Berkas Arsip</span>
                  </div>
                </div>

                <p className="text-xs text-slate-500">
                  Kepala Unit: <strong>{stat.kepala || '-'}</strong>
                </p>

                {/* Top 3 Sample Items */}
                <div className="space-y-1.5 pt-1">
                  {stat.items.slice(0, 3).map((item) => (
                    <div key={item.id} className="p-2 bg-slate-50 rounded-lg border border-slate-200/60 text-[11px] flex items-center justify-between">
                      <span className="font-mono font-bold text-slate-800">{item.nomorKeputusan}</span>
                      <span className="font-mono text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded text-[10px]">{item.noDus}</span>
                    </div>
                  ))}
                  {stat.items.length > 3 && (
                    <p className="text-[10px] text-slate-400 font-bold text-right">
                      +{stat.items.length - 3} berkas lainnya
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* REPORT TYPE 2: PER KATEGORI ARSIP */}
        {reportType === 'kategori' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {kategoriStats.map((stat) => (
              <div key={stat.kode} className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div>
                    <span className="font-mono font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded text-[10px] border border-purple-200">
                      {stat.kode}
                    </span>
                    <h3 className="font-bold text-slate-900 text-sm mt-1">{stat.namaKategori}</h3>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-black text-slate-900">{stat.count}</span>
                    <span className="block text-[10px] text-slate-500 font-semibold">Berkas</span>
                  </div>
                </div>

                <p className="text-xs text-slate-500">
                  Masa Retensi Simpan Standard: <strong>{stat.retensi} Tahun</strong>
                </p>

                <div className="space-y-1.5 pt-1">
                  {stat.items.slice(0, 3).map((item) => (
                    <div key={item.id} className="p-2 bg-slate-50 rounded-lg border border-slate-200/60 text-[11px] flex items-center justify-between">
                      <span className="font-mono font-bold text-slate-800">{item.nomorKeputusan}</span>
                      <span className="text-slate-500">{item.tanggal}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* REPORT TYPE 3: RETENSI ARSIP */}
        {reportType === 'retensi' && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Proyeksi Jadwal Retensi Arsip (JRA)</h3>
                <p className="text-xs text-slate-500">Evaluasi umur berkas berdasarkan tahun penetapan dan kategori kearsipan.</p>
              </div>
              <span className="px-3 py-1 bg-amber-100 text-amber-900 font-bold rounded-full text-xs">
                {filteredItems.length} Total Berkas Dievaluasi
              </span>
            </div>

            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-bold uppercase border-b border-slate-200">
                  <th className="p-3">Nomor Keputusan</th>
                  <th className="p-3">Tanggal Dokumen</th>
                  <th className="p-3">Kategori</th>
                  <th className="p-3">Estimasi Habis Retensi</th>
                  <th className="p-3">Status JRA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredItems.map((item) => {
                  const docYear = parseInt(item.tanggal.substring(0, 4)) || 2026;
                  const masaTahun = item.kategoriArsip?.includes('Vital') ? 10 : item.kategoriArsip?.includes('Permanen') ? 99 : 5;
                  const expYear = docYear + masaTahun;
                  const isExp = expYear <= 2026;

                  return (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="p-3 font-mono font-bold text-blue-700">{item.nomorKeputusan}</td>
                      <td className="p-3">{item.tanggal}</td>
                      <td className="p-3 font-semibold text-slate-800">{item.kategoriArsip || 'Inaktif'}</td>
                      <td className="p-3 font-mono font-bold text-slate-900">{expYear}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                          isExp ? 'bg-rose-100 text-rose-800 border border-rose-300' : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        }`}>
                          {isExp ? 'Siap Dinilai / Pemusnahan' : 'Aktif Dalam Penyimpanan'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

      </div>

    </div>
  );
};
