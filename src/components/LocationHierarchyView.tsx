import React, { useState } from 'react';
import {
  ArchiveItem,
  MasterDus,
  MasterGedung,
  MasterRak,
  MasterRuang
} from '../types';
import {
  Building2,
  Layers,
  Box,
  ChevronRight,
  ChevronDown,
  Folder,
  FileText,
  MapPin,
  Search,
  ArrowRight,
  HardDrive,
  QrCode,
  FileCheck,
  Building
} from 'lucide-react';

interface LocationHierarchyViewProps {
  items: ArchiveItem[];
  gedungList: MasterGedung[];
  ruangList: MasterRuang[];
  rakList: MasterRak[];
  dusList: MasterDus[];
  onNavigateToArsipWithFilter: (noDusFilter?: string) => void;
  onOpenPdfModal: (item: ArchiveItem) => void;
  onOpenQrModal: (item: ArchiveItem) => void;
}

export const LocationHierarchyView: React.FC<LocationHierarchyViewProps> = ({
  items,
  gedungList,
  ruangList,
  rakList,
  dusList,
  onNavigateToArsipWithFilter,
  onOpenPdfModal,
  onOpenQrModal,
}) => {
  const [selectedGedungId, setSelectedGedungId] = useState<string>(gedungList[0]?.id || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({
    'gdg-01': true,
    'rng-01': true,
    'rak-01': true,
  });

  const toggleNode = (nodeKey: string) => {
    setExpandedNodes((prev) => ({
      ...prev,
      [nodeKey]: !prev[nodeKey],
    }));
  };

  // Filter items matching location query
  const filteredItems = items.filter(
    (i) =>
      i.noDus.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.lokasiPenyimpanan.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.nomorKeputusan.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.perihal.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 uppercase">
            <Building2 className="w-4 h-4" /> Hirarki Lokasi Kearsipan (Tahap 2)
          </div>
          <h2 className="text-xl font-bold text-slate-900 mt-0.5">Penataan Terstruktur: Gedung / Depo → Ruang → Rak → Dus</h2>
          <p className="text-xs text-slate-500">Visualisasi tata letak fisik tempat penyimpanan berkas pertelaan arsip inaktif.</p>
        </div>

        {/* Search */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari lokasi, dus, atau perihal..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Main Hierarchy Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Side (5 cols): Interactive Tree Navigator */}
        <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-4">
          <h3 className="font-bold text-slate-900 text-xs uppercase flex items-center gap-2 border-b border-slate-100 pb-2">
            <Folder className="w-4 h-4 text-emerald-600" /> Navigasi Struktur Gedung Storage
          </h3>

          <div className="space-y-3 pt-1 text-xs">
            {gedungList.map((gedung) => {
              const gExpanded = expandedNodes[gedung.id] ?? true;
              const gRuangList = ruangList.filter((r) => r.gedungId === gedung.id);

              return (
                <div key={gedung.id} className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50/50">
                  
                  {/* Gedung Node Header */}
                  <div
                    onClick={() => toggleNode(gedung.id)}
                    className="p-3 bg-slate-100 hover:bg-slate-200/80 cursor-pointer flex items-center justify-between transition-colors font-bold text-slate-900"
                  >
                    <div className="flex items-center gap-2">
                      {gExpanded ? <ChevronDown className="w-4 h-4 text-slate-600" /> : <ChevronRight className="w-4 h-4 text-slate-600" />}
                      <Building className="w-4 h-4 text-emerald-600" />
                      <span>{gedung.namaGedung}</span>
                    </div>
                    <span className="font-mono text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded border border-emerald-200">
                      {gedung.kode}
                    </span>
                  </div>

                  {/* Ruang Child Nodes */}
                  {gExpanded && (
                    <div className="p-2 space-y-2 border-t border-slate-200/80 bg-white">
                      {gRuangList.map((ruang) => {
                        const rExpanded = expandedNodes[ruang.id] ?? true;
                        const rRakList = rakList.filter((r) => r.ruangId === ruang.id);

                        return (
                          <div key={ruang.id} className="ml-2 border-l-2 border-emerald-500/30 pl-2 space-y-1">
                            
                            {/* Ruang Header */}
                            <div
                              onClick={() => toggleNode(ruang.id)}
                              className="p-2 bg-slate-50 hover:bg-slate-100 rounded-lg cursor-pointer flex items-center justify-between transition-colors font-semibold text-slate-800"
                            >
                              <div className="flex items-center gap-1.5">
                                {rExpanded ? <ChevronDown className="w-3.5 h-3.5 text-slate-500" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-500" />}
                                <Layers className="w-3.5 h-3.5 text-blue-600" />
                                <span>{ruang.namaRuang}</span>
                              </div>
                              <span className="text-[10px] text-slate-500">{ruang.kode}</span>
                            </div>

                            {/* Rak Child Nodes */}
                            {rExpanded && (
                              <div className="ml-3 space-y-1 pt-1">
                                {rRakList.map((rak) => {
                                  const rakDusList = dusList.filter((d) => d.rakId === rak.id);

                                  return (
                                    <div key={rak.id} className="p-2 bg-slate-50/80 border border-slate-200/80 rounded-lg space-y-1.5">
                                      <div className="flex items-center justify-between font-bold text-slate-900">
                                        <div className="flex items-center gap-1.5">
                                          <HardDrive className="w-3.5 h-3.5 text-amber-600" />
                                          <span>{rak.namaRak}</span>
                                        </div>
                                        <span className="text-[10px] font-mono bg-amber-100 text-amber-800 px-1.5 rounded">{rak.kode}</span>
                                      </div>

                                      {/* Dus Badges inside Rak */}
                                      <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                                        {rakDusList.map((dus) => {
                                          const itemCount = items.filter((i) => i.noDus === dus.noDus).length;
                                          return (
                                            <button
                                              key={dus.id}
                                              onClick={() => onNavigateToArsipWithFilter(dus.noDus)}
                                              className="px-2 py-1 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded font-mono font-bold text-amber-900 text-[10px] flex items-center gap-1 cursor-pointer transition-colors"
                                            >
                                              <Box className="w-3 h-3 text-amber-600" />
                                              <span>{dus.noDus} ({itemCount})</span>
                                            </button>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                          </div>
                        );
                      })}
                    </div>
                  )}

                </div>
              );
            })}
          </div>
        </div>

        {/* Right Side (7 cols): Dus Storage Box Cards & Document Contents */}
        <div className="lg:col-span-7 space-y-4">
          <h3 className="font-bold text-slate-900 text-xs uppercase flex items-center gap-2">
            <Box className="w-4 h-4 text-amber-600" /> Status Dus / Boks Arsip & Isi Dokumen
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {dusList.map((dus) => {
              const dusItems = filteredItems.filter((i) => i.noDus === dus.noDus);
              const rakObj = rakList.find((r) => r.id === dus.rakId);

              return (
                <div key={dus.id} className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-black text-amber-900 bg-amber-100 px-2.5 py-1 rounded-lg border border-amber-300 text-xs flex items-center gap-1.5">
                        <Box className="w-4 h-4 text-amber-600" />
                        {dus.noDus}
                      </span>
                      <span className="text-[11px] font-bold text-slate-600">
                        {dusItems.length} / {dus.kapasitasMaxItem} Berkas
                      </span>
                    </div>

                    <div className="text-xs text-slate-500 space-y-0.5">
                      <p className="font-semibold text-slate-800 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                        {rakObj ? `${rakObj.kode} (${rakObj.namaRak})` : 'Depo Utama Rak A1'}
                      </p>
                      <p className="text-[11px] text-slate-400">{dus.keterangan || 'Standar ANRI Kualifikasi Box'}</p>
                    </div>

                    <hr className="border-slate-100" />

                    {/* Preview list of items in this box */}
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Daftar Dokumen di Dus:</span>
                      {dusItems.length === 0 ? (
                        <p className="text-[11px] text-slate-400 italic">Belum ada dokumen tersimpan di dus ini.</p>
                      ) : (
                        dusItems.slice(0, 3).map((item) => (
                          <div key={item.id} className="p-2 bg-slate-50 rounded-lg border border-slate-200/60 text-[11px] flex items-center justify-between gap-2">
                            <div className="space-y-0.5 max-w-[180px]">
                              <p className="font-bold text-slate-900 truncate">{item.nomorKeputusan}</p>
                              <p className="text-[10px] text-slate-500 truncate">{item.perihal}</p>
                            </div>

                            <div className="flex items-center gap-1">
                              {item.pdfAttachment && (
                                <button
                                  onClick={() => onOpenPdfModal(item)}
                                  className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                                  title="Pratinjau PDF"
                                >
                                  <FileCheck className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <button
                                onClick={() => onOpenQrModal(item)}
                                className="p-1 text-slate-600 hover:bg-slate-100 rounded"
                                title="QR Code"
                              >
                                <QrCode className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))
                      )}

                      {dusItems.length > 3 && (
                        <p className="text-[10px] text-blue-600 font-bold text-right pt-0.5">
                          +{dusItems.length - 3} Dokumen Lainnya...
                        </p>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => onNavigateToArsipWithFilter(dus.noDus)}
                    className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 mt-2"
                  >
                    <span>Buka Semua Dokumen Dus Ini</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

      </div>

    </div>
  );
};
