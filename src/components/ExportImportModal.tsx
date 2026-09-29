import React, { useRef } from 'react';
import { ArchiveItem } from '../types';
import { X, Download, Upload, FileSpreadsheet, FileCode, RefreshCw, AlertTriangle } from 'lucide-react';

interface ExportImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: ArchiveItem[];
  onImport: (importedItems: ArchiveItem[]) => void;
  onResetSample: () => void;
  onClearAll: () => void;
}

export const ExportImportModal: React.FC<ExportImportModalProps> = ({
  isOpen,
  onClose,
  items,
  onImport,
  onResetSample,
  onClearAll,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Export to CSV
  const handleExportCSV = () => {
    if (items.length === 0) {
      alert('Tidak ada data pertelaan untuk diekspor!');
      return;
    }

    const headers = ['NO', 'NOMOR KEPUTUSAN', 'TANGGAL', 'PERIHAL', 'NO DUS', 'LOKASI PENYIMPANAN', 'KETERANGAN', 'UNIT PENGOLAH', 'KATEGORI'];
    
    const rows = items.map((item, index) => [
      index + 1,
      `"${(item.nomorKeputusan || '').replace(/"/g, '""')}"`,
      `"${item.tanggal || ''}"`,
      `"${(item.perihal || '').replace(/"/g, '""')}"`,
      `"${(item.noDus || '').replace(/"/g, '""')}"`,
      `"${(item.lokasiPenyimpanan || '').replace(/"/g, '""')}"`,
      `"${(item.keterangan || '').replace(/"/g, '""')}"`,
      `"${(item.unitPengolah || '').replace(/"/g, '""')}"`,
      `"${(item.kategoriArsip || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Daftar_Pertelaan_Arsip_2026_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export to JSON
  const handleExportJSON = () => {
    if (items.length === 0) {
      alert('Tidak ada data pertelaan untuk diekspor!');
      return;
    }

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(items, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `Backup_Pertelaan_Arsip_2026_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Import JSON File
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (Array.isArray(json)) {
          onImport(json);
          alert(`Berhasil mengimpor ${json.length} data pertelaan arsip!`);
          onClose();
        } else {
          alert('Format berkas tidak valid! File harus berupa array JSON data pertelaan arsip.');
        }
      } catch (err) {
        alert('Gagal membaca berkas JSON. Pastikan format file benar: ' + err);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-600/30 text-amber-400 rounded-lg">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold">Ekspor & Impor Data Arsip</h2>
              <p className="text-xs text-slate-400">Unduh laporan CSV/Excel atau lakukan cadangan data</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5">
          
          {/* Section 1: Export */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Download className="w-4 h-4 text-blue-600" /> Ekspor / Unduh Data
            </h3>
            
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleExportCSV}
                className="flex flex-col items-center justify-center p-4 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-900 rounded-xl transition-all cursor-pointer group"
              >
                <FileSpreadsheet className="w-8 h-8 text-emerald-600 group-hover:scale-110 transition-transform mb-1.5" />
                <span className="text-xs font-bold">Unduh Format CSV/Excel</span>
                <span className="text-[10px] text-emerald-700">Untuk Microsoft Excel</span>
              </button>

              <button
                onClick={handleExportJSON}
                className="flex flex-col items-center justify-center p-4 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-900 rounded-xl transition-all cursor-pointer group"
              >
                <FileCode className="w-8 h-8 text-blue-600 group-hover:scale-110 transition-transform mb-1.5" />
                <span className="text-xs font-bold">Cadangan JSON</span>
                <span className="text-[10px] text-blue-700">Backup Sistem Full</span>
              </button>
            </div>
          </div>

          <hr className="border-slate-200" />

          {/* Section 2: Import */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Upload className="w-4 h-4 text-amber-600" /> Impor / Pulihkan Data
            </h3>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".json"
              className="hidden"
            />

            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-3 px-4 bg-slate-50 hover:bg-slate-100 border-2 border-dashed border-slate-300 hover:border-slate-400 rounded-xl flex items-center justify-center gap-2 text-slate-700 font-medium text-xs transition-all cursor-pointer"
            >
              <Upload className="w-4 h-4 text-slate-500" />
              <span>Unggah Berkas Cadangan (.JSON)</span>
            </button>
          </div>

          <hr className="border-slate-200" />

          {/* Section 3: Reset options */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-rose-500" /> Pengaturan Data
            </h3>

            <div className="flex items-center justify-between gap-3 pt-1">
              <button
                onClick={() => {
                  if (window.confirm('Muat ulang data contoh resmi 2026? Data saat ini akan digantikan dengan data contoh.')) {
                    onResetSample();
                    onClose();
                  }
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Muat Ulang Contoh</span>
              </button>

              <button
                onClick={() => {
                  if (window.confirm('PERHATIAN: Apakah Anda benar-benar yakin ingin MENGHAPUS SEMUA DATA pertelaan? Tindakan ini tidak dapat dibatalkan.')) {
                    onClearAll();
                    onClose();
                  }
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-medium cursor-pointer"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Kosongkan Semua Data</span>
              </button>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 text-right">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-lg text-xs cursor-pointer"
          >
            Tutup
          </button>
        </div>

      </div>
    </div>
  );
};
