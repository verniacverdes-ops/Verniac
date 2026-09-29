import React from 'react';
import { ArchiveItem } from '../types';
import { X, FileText, Calendar, Box, MapPin, Building2, Tag, Info, Edit3, Copy } from 'lucide-react';

interface ArchiveDetailModalProps {
  item: ArchiveItem | null;
  onClose: () => void;
  onEdit: (item: ArchiveItem) => void;
  onDuplicate: (item: ArchiveItem) => void;
}

export const ArchiveDetailModal: React.FC<ArchiveDetailModalProps> = ({
  item,
  onClose,
  onEdit,
  onDuplicate,
}) => {
  if (!item) return null;

  const formatDateIndo = (dateStr: string) => {
    if (!dateStr) return '-';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      return new Intl.DateTimeFormat('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).format(date);
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-600/30 text-blue-400 rounded-lg">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold">Rincian Pertelaan Arsip</h2>
              <p className="text-xs text-slate-400">ID: {item.id}</p>
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
        <div className="p-6 space-y-4">
          
          {/* Main Title Box */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-100 px-2 py-0.5 rounded">
              Nomor Keputusan / Document
            </span>
            <h3 className="text-lg font-bold text-slate-900 mt-1">
              {item.nomorKeputusan}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>Tanggal Keputusan: {formatDateIndo(item.tanggal)}</span>
            </p>
          </div>

          {/* Perihal */}
          <div>
            <label className="text-xs font-bold uppercase text-slate-500 tracking-wider flex items-center gap-1 mb-1">
              <Info className="w-3.5 h-3.5 text-blue-600" /> Perihal / Isi Ringkas
            </label>
            <p className="text-sm font-medium text-slate-800 bg-white p-3 rounded-lg border border-slate-200 leading-relaxed">
              {item.perihal}
            </p>
          </div>

          {/* Grid Metadata */}
          <div className="grid grid-cols-2 gap-3">
            
            {/* Box Number */}
            <div className="bg-amber-50/80 p-3 rounded-xl border border-amber-200/80">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900 uppercase">
                <Box className="w-4 h-4 text-amber-600" /> No. Dus / Boks
              </div>
              <p className="text-base font-mono font-bold text-amber-950 mt-1">
                {item.noDus}
              </p>
            </div>

            {/* Category */}
            <div className="bg-purple-50/80 p-3 rounded-xl border border-purple-200/80">
              <div className="flex items-center gap-1.5 text-xs font-bold text-purple-900 uppercase">
                <Tag className="w-4 h-4 text-purple-600" /> Kategori Arsip
              </div>
              <p className="text-sm font-bold text-purple-950 mt-1">
                Arsip {item.kategoriArsip || 'Inaktif'}
              </p>
            </div>
          </div>

          {/* Storage Location */}
          <div className="bg-emerald-50/70 p-3.5 rounded-xl border border-emerald-200/80">
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900 uppercase">
              <MapPin className="w-4 h-4 text-emerald-600" /> Keterangan / Lokasi Penyimpanan
            </div>
            <p className="text-sm font-semibold text-emerald-950 mt-1">
              {item.lokasiPenyimpanan}
            </p>
          </div>

          {/* Unit & Keterangan */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            {item.unitPengolah && (
              <div>
                <span className="font-bold text-slate-500 uppercase flex items-center gap-1 mb-0.5">
                  <Building2 className="w-3 h-3 text-slate-400" /> Unit Pengolah
                </span>
                <p className="font-medium text-slate-800">{item.unitPengolah}</p>
              </div>
            )}

            {item.keterangan && (
              <div>
                <span className="font-bold text-slate-500 uppercase flex items-center gap-1 mb-0.5">
                  <Info className="w-3 h-3 text-slate-400" /> Keterangan Berkas
                </span>
                <p className="font-medium text-slate-800">{item.keterangan}</p>
              </div>
            )}
          </div>

        </div>

        {/* Footer Actions */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            onClick={() => {
              onClose();
              onDuplicate(item);
            }}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 hover:text-emerald-700 bg-white hover:bg-emerald-50 border border-slate-200 px-3 py-1.5 rounded-lg transition-all cursor-pointer"
          >
            <Copy className="w-3.5 h-3.5 text-emerald-600" />
            <span>Duplikat Item</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium rounded-lg text-xs transition-all cursor-pointer"
            >
              Tutup
            </button>
            <button
              onClick={() => {
                onClose();
                onEdit(item);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-medium rounded-lg text-xs transition-all cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit Data</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
