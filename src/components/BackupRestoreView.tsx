import React, { useState } from 'react';
import { BackupDataPackage, ArchiveItem, UnitInfo, MasterKategori, MasterUnit, MasterGedung, MasterRuang, MasterRak, MasterDus, AuditLogEntry, User } from '../types';
import { 
  DatabaseBackup, 
  Download, 
  Upload, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  RefreshCw, 
  FileJson,
  Layers,
  Archive,
  History
} from 'lucide-react';

interface BackupRestoreViewProps {
  unitInfo: UnitInfo;
  items: ArchiveItem[];
  masterKategori: MasterKategori[];
  masterUnit: MasterUnit[];
  masterGedung: MasterGedung[];
  masterRuang: MasterRuang[];
  masterRak: MasterRak[];
  masterDus: MasterDus[];
  auditLogs: AuditLogEntry[];
  currentUser: User | null;
  onRestorePackage: (pkg: BackupDataPackage, mergeMode: boolean) => void;
}

export const BackupRestoreView: React.FC<BackupRestoreViewProps> = ({
  unitInfo,
  items,
  masterKategori,
  masterUnit,
  masterGedung,
  masterRuang,
  masterRak,
  masterDus,
  auditLogs,
  currentUser,
  onRestorePackage,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewPackage, setPreviewPackage] = useState<BackupDataPackage | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [mergeMode, setMergeMode] = useState<boolean>(false);
  const [isSuccessMessage, setIsSuccessMessage] = useState<string | null>(null);

  const isAdmin = currentUser?.role === 'admin';

  // Generate Backup JSON
  const handleDownloadBackup = () => {
    const backupPkg: BackupDataPackage = {
      version: '2026.3.0',
      exportedAt: new Date().toISOString(),
      exportedBy: currentUser ? `${currentUser.name} (${currentUser.role})` : 'System Admin',
      unitInfo,
      items,
      masterKategori,
      masterUnit,
      masterGedung,
      masterRuang,
      masterRak,
      masterDus,
      auditLogs,
    };

    const jsonStr = JSON.stringify(backupPkg, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Backup_DPA_Kearsipan_${new Date().toISOString().split('T')[0]}_v2026.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Handle Upload JSON File
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setParseError(null);
    setPreviewPackage(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content) as BackupDataPackage;

        if (!parsed.items || !Array.isArray(parsed.items)) {
          throw new Error('Format berkas JSON tidak valid: Properti "items" tidak ditemukan.');
        }

        setPreviewPackage(parsed);
      } catch (err: any) {
        setParseError(err.message || 'Gagal memproses berkas JSON.');
      }
    };
    reader.readAsText(file);
  };

  // Execute Restore
  const handleExecuteRestore = () => {
    if (!previewPackage) return;

    const confirmMsg = mergeMode
      ? 'Apakah Anda yakin ingin MENGGABUNGKAN data dari berkas backup ke dalam database saat ini?'
      : 'PERINGATAN: Seluruh data saat ini akan DIGANTIKAN SEPENUHNYA dengan data dari berkas backup. Lanjutkan?';

    if (confirm(confirmMsg)) {
      onRestorePackage(previewPackage, mergeMode);
      setIsSuccessMessage(`Pemulihan database berhasil! Mode: ${mergeMode ? 'Gabung Data' : 'Ganti Total'}.`);
      setPreviewPackage(null);
      setSelectedFile(null);
      setTimeout(() => setIsSuccessMessage(null), 5000);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-purple-600 uppercase">
            <DatabaseBackup className="w-4 h-4" /> Cadangan & Pemulihan Database (Tahap 3)
          </div>
          <h2 className="text-xl font-bold text-slate-900 mt-0.5">Pusat Backup & Restore Data Kearsipan</h2>
          <p className="text-xs text-slate-500">Amankan seluruh struktur berkas, master data, hierarki lokasi, dan audit log dalam berkas cadangan terstruktur.</p>
        </div>
      </div>

      {isSuccessMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-2xl text-emerald-900 font-bold text-xs flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          <span>{isSuccessMessage}</span>
        </div>
      )}

      {/* Grid 2 Column: Backup & Restore */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* CARD 1: UNDUH BACKUP */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-2xs space-y-4">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
            <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl border border-purple-200">
              <Download className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Unduh Cadangan Database</h3>
              <p className="text-xs text-slate-500">Ekspor snapshot komprehensif ke format JSON.</p>
            </div>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-xs">
            <div className="flex justify-between font-semibold">
              <span className="text-slate-600">Total Berkas Pertelaan:</span>
              <span className="font-mono font-bold text-slate-900">{items.length} Berkas</span>
            </div>
            <div className="flex justify-between font-semibold">
              <span className="text-slate-600">Master Data Kategori/Unit:</span>
              <span className="font-mono font-bold text-slate-900">{masterKategori.length + masterUnit.length} Item</span>
            </div>
            <div className="flex justify-between font-semibold">
              <span className="text-slate-600">Master Gedung/Ruang/Rak/Dus:</span>
              <span className="font-mono font-bold text-slate-900">{masterGedung.length + masterRuang.length + masterRak.length + masterDus.length} Lokasi</span>
            </div>
            <div className="flex justify-between font-semibold">
              <span className="text-slate-600">Rekam Jejak Audit Log:</span>
              <span className="font-mono font-bold text-slate-900">{auditLogs.length} Catatan</span>
            </div>
          </div>

          <button
            onClick={handleDownloadBackup}
            className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-sm cursor-pointer transition-all"
          >
            <Download className="w-4 h-4" />
            <span>Unduh Berkas Backup JSON (Snapshot)</span>
          </button>
        </div>

        {/* CARD 2: RESTORE DATA */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-2xs space-y-4">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl border border-blue-200">
              <Upload className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Pulihkan Database (Restore)</h3>
              <p className="text-xs text-slate-500">Unggah berkas cadangan JSON untuk memulihkan data.</p>
            </div>
          </div>

          {/* File Picker */}
          <div className="border-2 border-dashed border-slate-300 hover:border-blue-400 p-6 rounded-xl text-center bg-slate-50 transition-all">
            <FileJson className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p className="text-xs font-bold text-slate-700">Pilih berkas backup .json</p>
            <p className="text-[10px] text-slate-400 mt-1">Format JSON standar snapshot sistem DPA</p>
            <input
              type="file"
              accept=".json"
              onChange={handleFileUpload}
              className="mt-3 block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-blue-600 file:text-white hover:file:bg-blue-500 cursor-pointer"
            />
          </div>

          {parseError && (
            <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl text-rose-800 text-xs flex items-center gap-2 font-semibold">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{parseError}</span>
            </div>
          )}

          {/* Preview Package Info */}
          {previewPackage && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl space-y-3 text-xs">
              <div className="font-bold text-blue-900 border-b border-blue-200 pb-1 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-blue-600" />
                <span>Pratinjau Isi Cadangan:</span>
              </div>
              <ul className="space-y-1 text-blue-900 font-semibold text-[11px]">
                <li>• Versi Cadangan: {previewPackage.version || '2026.1'}</li>
                <li>• Waktu Ekspor: {previewPackage.exportedAt}</li>
                <li>• Oleh: {previewPackage.exportedBy || 'Admin'}</li>
                <li>• Total Berkas: {previewPackage.items?.length || 0} Arsip</li>
              </ul>

              <div className="pt-2 border-t border-blue-200 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={mergeMode}
                    onChange={(e) => setMergeMode(e.target.checked)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="font-bold text-slate-800 text-[11px]">
                    Mode Penggabungan (Merge without overwrite)
                  </span>
                </label>

                <button
                  onClick={handleExecuteRestore}
                  disabled={!isAdmin}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-sm cursor-pointer transition-all"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Jalankan Pemulihan Sekarang</span>
                </button>
                {!isAdmin && (
                  <p className="text-[10px] text-rose-600 font-bold text-center">
                    Akses Dibatasi: Hanya peran Admin yang dapat melakukan Restore Data.
                  </p>
                )}
              </div>
            </div>
          )}

        </div>

      </div>

    </div>
  );
};
