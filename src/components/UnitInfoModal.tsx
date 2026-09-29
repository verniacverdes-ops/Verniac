import React, { useState, useEffect } from 'react';
import { UnitInfo } from '../types';
import { X, Save, Building, UserCheck, ShieldCheck, MapPin } from 'lucide-react';

interface UnitInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  unitInfo: UnitInfo;
  onSave: (info: UnitInfo) => void;
}

export const UnitInfoModal: React.FC<UnitInfoModalProps> = ({
  isOpen,
  onClose,
  unitInfo,
  onSave,
}) => {
  const [formData, setFormData] = useState<UnitInfo>(unitInfo);

  useEffect(() => {
    setFormData(unitInfo);
  }, [unitInfo, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-slate-800 text-slate-300 rounded-lg">
              <Building className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold">Pengaturan Instansi & Tanda Tangan</h2>
              <p className="text-xs text-slate-400">Atur kop dokumen resmi dan lembar pengesahan cetak</p>
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
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-sm">
          
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2.5 py-1 rounded flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5" /> Data Identitas Organisasi / Depo
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700">Nama Instansi Utama</label>
                <input
                  type="text"
                  required
                  value={formData.namaInstansi}
                  onChange={(e) => setFormData({ ...formData, namaInstansi: e.target.value })}
                  className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700">Unit Kerja / Satuan Kerja</label>
                <input
                  type="text"
                  required
                  value={formData.unitKerja}
                  onChange={(e) => setFormData({ ...formData, unitKerja: e.target.value })}
                  className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700">Pencipta Arsip / Unit Pengolah</label>
                <input
                  type="text"
                  required
                  value={formData.penciptaArsip}
                  onChange={(e) => setFormData({ ...formData, penciptaArsip: e.target.value })}
                  className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700">Tahun Pertelaan</label>
                <input
                  type="text"
                  required
                  value={formData.tahun}
                  onChange={(e) => setFormData({ ...formData, tahun: e.target.value })}
                  className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-slate-500" /> Lokasi Depo Utama
              </label>
              <input
                type="text"
                value={formData.lokasiGedungUtama}
                onChange={(e) => setFormData({ ...formData, lokasiGedungUtama: e.target.value })}
                className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <hr className="border-slate-200" />

          {/* Signatures Settings */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5" /> Pejabat Penandatangan Cetak
            </h3>

            {/* Petugas Pengelola */}
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                <UserCheck className="w-3.5 h-3.5 text-blue-600" /> Pengelola / Petugas Arsip
              </span>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Nama Lengkap & Gelar"
                  value={formData.namaPetugas}
                  onChange={(e) => setFormData({ ...formData, namaPetugas: e.target.value })}
                  className="px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs"
                />
                <input
                  type="text"
                  placeholder="Jabatan"
                  value={formData.jabatanPetugas}
                  onChange={(e) => setFormData({ ...formData, jabatanPetugas: e.target.value })}
                  className="px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs"
                />
              </div>
            </div>

            {/* Head of Unit */}
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Atasan / Pimpinan Unit Kerja
              </span>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Nama Lengkap & Gelar"
                  value={formData.namaPimpinan}
                  onChange={(e) => setFormData({ ...formData, namaPimpinan: e.target.value })}
                  className="px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs"
                />
                <input
                  type="text"
                  placeholder="Jabatan"
                  value={formData.jabatanPimpinan}
                  onChange={(e) => setFormData({ ...formData, jabatanPimpinan: e.target.value })}
                  className="px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs"
                />
              </div>
            </div>
          </div>

          {/* Footer Action */}
          <div className="pt-3 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg text-xs cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg text-xs shadow-sm cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Simpan Pengaturan</span>
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
