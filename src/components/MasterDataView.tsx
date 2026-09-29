import React, { useState } from 'react';
import {
  MasterKategori,
  MasterUnit,
  MasterGedung,
  MasterRuang,
  MasterRak,
  MasterDus,
  User
} from '../types';
import {
  FolderKanban,
  Building2,
  Layers,
  Box,
  Plus,
  Edit3,
  Trash2,
  Search,
  CheckCircle2,
  X,
  Database
} from 'lucide-react';

interface MasterDataViewProps {
  currentUser?: User | null;
  kategoriList: MasterKategori[];
  unitList: MasterUnit[];
  gedungList: MasterGedung[];
  ruangList: MasterRuang[];
  rakList: MasterRak[];
  dusList: MasterDus[];

  onSaveKategori: (item: MasterKategori) => void;
  onDeleteKategori: (id: string) => void;

  onSaveUnit: (item: MasterUnit) => void;
  onDeleteUnit: (id: string) => void;

  onSaveGedung: (item: MasterGedung) => void;
  onDeleteGedung: (id: string) => void;

  onSaveRuang: (item: MasterRuang) => void;
  onDeleteRuang: (id: string) => void;

  onSaveRak: (item: MasterRak) => void;
  onDeleteRak: (id: string) => void;

  onSaveDus: (item: MasterDus) => void;
  onDeleteDus: (id: string) => void;
}

export const MasterDataView: React.FC<MasterDataViewProps> = ({
  currentUser,
  kategoriList,
  unitList,
  gedungList,
  ruangList,
  rakList,
  dusList,
  onSaveKategori,
  onDeleteKategori,
  onSaveUnit,
  onDeleteUnit,
  onSaveGedung,
  onDeleteGedung,
  onSaveRuang,
  onDeleteRuang,
  onSaveRak,
  onDeleteRak,
  onSaveDus,
  onDeleteDus,
}) => {
  const isAdminOrArsiparis = currentUser?.role === 'admin' || currentUser?.role === 'arsiparis';
  const isAdmin = currentUser?.role === 'admin';

  const [activeMasterTab, setActiveMasterTab] = useState<'kategori' | 'unit' | 'gedung_ruang_rak' | 'dus'>('kategori');
  const [search, setSearch] = useState('');

  // Modals / Inline Edit state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editObject, setEditObject] = useState<any>(null);

  // Form Fields State
  const [field1, setField1] = useState('');
  const [field2, setField2] = useState('');
  const [field3, setField3] = useState('');
  const [field4, setField4] = useState('');
  const [field5, setField5] = useState('');

  const handleOpenAdd = () => {
    setEditObject(null);
    setField1('');
    setField2('');
    setField3('');
    setField4('');
    setField5('');
    setIsFormOpen(true);
  };

  const handleOpenEdit = (obj: any) => {
    setEditObject(obj);
    if (activeMasterTab === 'kategori') {
      setField1(obj.kode || '');
      setField2(obj.nama || '');
      setField3(obj.deskripsi || '');
      setField4(String(obj.masaSimpanTahun || 5));
    } else if (activeMasterTab === 'unit') {
      setField1(obj.kode || '');
      setField2(obj.namaUnit || '');
      setField3(obj.kepalaUnit || '');
    } else if (activeMasterTab === 'gedung_ruang_rak') {
      setField1(obj.kode || '');
      setField2(obj.namaGedung || obj.namaRuang || obj.namaRak || '');
      setField3(obj.alamat || obj.gedungId || obj.ruangId || '');
      setField4(String(obj.kapasitasDus || ''));
    } else if (activeMasterTab === 'dus') {
      setField1(obj.noDus || '');
      setField2(obj.rakId || '');
      setField3(String(obj.kapasitasMaxItem || 50));
      setField4(obj.keterangan || '');
    }
    setIsFormOpen(true);
  };

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();

    if (activeMasterTab === 'kategori') {
      onSaveKategori({
        id: editObject?.id || `kat-${Date.now()}`,
        kode: field1.trim(),
        nama: field2.trim(),
        deskripsi: field3.trim(),
        masaSimpanTahun: parseInt(field4) || 5,
      });
    } else if (activeMasterTab === 'unit') {
      onSaveUnit({
        id: editObject?.id || `unit-${Date.now()}`,
        kode: field1.trim(),
        namaUnit: field2.trim(),
        kepalaUnit: field3.trim(),
      });
    } else if (activeMasterTab === 'gedung_ruang_rak') {
      onSaveGedung({
        id: editObject?.id || `gdg-${Date.now()}`,
        kode: field1.trim(),
        namaGedung: field2.trim(),
        alamat: field3.trim(),
      });
    } else if (activeMasterTab === 'dus') {
      onSaveDus({
        id: editObject?.id || `dus-${Date.now()}`,
        noDus: field1.trim().toUpperCase(),
        rakId: field2 || (rakList[0]?.id ?? 'rak-01'),
        kapasitasMaxItem: parseInt(field3) || 50,
        keterangan: field4.trim(),
      });
    }

    setIsFormOpen(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-blue-600 uppercase">
            <Database className="w-4 h-4" /> Master Data Management (Tahap 2)
          </div>
          <h2 className="text-xl font-bold text-slate-900 mt-0.5">Pengelolaan Master Data Kearsipan</h2>
          <p className="text-xs text-slate-500">Atur Kategori, Unit Pengolah, Gedung, Ruang, Rak, dan Dus/Boks standar ANRI.</p>
        </div>

        {isAdminOrArsiparis && (
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-sm shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Master {activeMasterTab.toUpperCase()}</span>
          </button>
        )}
      </div>

      {/* Sub Tabs Navigation */}
      <div className="bg-slate-100 p-1.5 rounded-2xl border border-slate-200 flex items-center gap-1 overflow-x-auto text-xs font-bold">
        <button
          onClick={() => setActiveMasterTab('kategori')}
          className={`py-2 px-4 rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
            activeMasterTab === 'kategori'
              ? 'bg-white text-blue-700 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <FolderKanban className="w-4 h-4" />
          <span>Kategori Arsip ({kategoriList.length})</span>
        </button>

        <button
          onClick={() => setActiveMasterTab('unit')}
          className={`py-2 px-4 rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
            activeMasterTab === 'unit'
              ? 'bg-white text-blue-700 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Unit Pengolah ({unitList.length})</span>
        </button>

        <button
          onClick={() => setActiveMasterTab('gedung_ruang_rak')}
          className={`py-2 px-4 rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
            activeMasterTab === 'gedung_ruang_rak'
              ? 'bg-white text-blue-700 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Gedung & Depo ({gedungList.length})</span>
        </button>

        <button
          onClick={() => setActiveMasterTab('dus')}
          className={`py-2 px-4 rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
            activeMasterTab === 'dus'
              ? 'bg-white text-blue-700 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Box className="w-4 h-4" />
          <span>Master Dus / Boks ({dusList.length})</span>
        </button>
      </div>

      {/* Search Input Bar */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={`Cari dalam master ${activeMasterTab}...`}
          className="w-full pl-10 pr-4 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Form Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm uppercase">
                {editObject ? 'Edit' : 'Tambah'} Master {activeMasterTab}
              </h3>
              <button onClick={() => setIsFormOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="space-y-3 text-xs">
              {/* Field 1: Kode / Nomor */}
              <div>
                <label className="font-bold text-slate-700 block mb-1 uppercase">
                  {activeMasterTab === 'dus' ? 'Nomor Dus / Boks' : 'Kode Master'}
                </label>
                <input
                  type="text"
                  required
                  value={field1}
                  onChange={(e) => setField1(e.target.value)}
                  placeholder="e.g. KAT-01 / DUS-01/2026"
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg font-mono"
                />
              </div>

              {/* Field 2: Nama / Unit */}
              <div>
                <label className="font-bold text-slate-700 block mb-1 uppercase">
                  {activeMasterTab === 'kategori'
                    ? 'Nama Kategori'
                    : activeMasterTab === 'unit'
                    ? 'Nama Unit Pengolah'
                    : activeMasterTab === 'gedung_ruang_rak'
                    ? 'Nama Gedung / Depo'
                    : 'Pilih Rak Penyimpanan'}
                </label>

                {activeMasterTab === 'dus' ? (
                  <select
                    value={field2}
                    onChange={(e) => setField2(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg font-bold"
                  >
                    {rakList.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.kode} - {r.namaRak}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    required
                    value={field2}
                    onChange={(e) => setField2(e.target.value)}
                    placeholder="Nama lengkap data master"
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg"
                  />
                )}
              </div>

              {/* Field 3: Deskripsi / Alamat / Kapasitas */}
              <div>
                <label className="font-bold text-slate-700 block mb-1 uppercase">
                  {activeMasterTab === 'kategori'
                    ? 'Deskripsi Kategori'
                    : activeMasterTab === 'unit'
                    ? 'Kepala Unit / Penanggung Jawab'
                    : activeMasterTab === 'gedung_ruang_rak'
                    ? 'Alamat Gedung'
                    : 'Kapasitas Max Items'}
                </label>
                <input
                  type={activeMasterTab === 'dus' ? 'number' : 'text'}
                  value={field3}
                  onChange={(e) => setField3(e.target.value)}
                  placeholder="Keterangan pendukung..."
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg"
                />
              </div>

              {/* Field 4: Masa Simpan / Keterangan Dus */}
              {(activeMasterTab === 'kategori' || activeMasterTab === 'dus') && (
                <div>
                  <label className="font-bold text-slate-700 block mb-1 uppercase">
                    {activeMasterTab === 'kategori' ? 'Masa Simpan Retensi (Tahun)' : 'Keterangan Tambahan'}
                  </label>
                  <input
                    type={activeMasterTab === 'kategori' ? 'number' : 'text'}
                    value={field4}
                    onChange={(e) => setField4(e.target.value)}
                    placeholder={activeMasterTab === 'kategori' ? '5' : 'Kotak karton standar ANRI'}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg"
                  />
                </div>
              )}

              <div className="pt-3 text-right">
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-xs cursor-pointer shadow-xs"
                >
                  Simpan Master Data
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Render Tables according to Active Tab */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        
        {/* TAB 1: KATEGORI */}
        {activeMasterTab === 'kategori' && (
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-bold uppercase border-b border-slate-200">
                <th className="p-3">Kode</th>
                <th className="p-3">Nama Kategori</th>
                <th className="p-3">Deskripsi Kearsipan</th>
                <th className="p-3">Retensi (Tahun)</th>
                <th className="p-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {kategoriList
                .filter((k) => k.nama.toLowerCase().includes(search.toLowerCase()) || k.kode.toLowerCase().includes(search.toLowerCase()))
                .map((kat) => (
                  <tr key={kat.id} className="hover:bg-slate-50">
                    <td className="p-3 font-mono font-bold text-blue-700">{kat.kode}</td>
                    <td className="p-3 font-bold text-slate-900">{kat.nama}</td>
                    <td className="p-3 text-slate-600 max-w-sm">{kat.deskripsi}</td>
                    <td className="p-3">
                      <span className="bg-blue-50 text-blue-800 border border-blue-200 font-bold px-2 py-0.5 rounded text-[10px]">
                        {kat.masaSimpanTahun} Tahun
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => handleOpenEdit(kat)} className="p-1 hover:text-amber-600">
                          <Edit3 className="w-4 h-4" />
                        </button>
                        {isAdmin && (
                          <button onClick={() => onDeleteKategori(kat.id)} className="p-1 hover:text-rose-600">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        )}

        {/* TAB 2: UNIT PENGOLAH */}
        {activeMasterTab === 'unit' && (
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-bold uppercase border-b border-slate-200">
                <th className="p-3">Kode Unit</th>
                <th className="p-3">Nama Unit Pengolah</th>
                <th className="p-3">Kepala / Penanggung Jawab</th>
                <th className="p-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {unitList
                .filter((u) => u.namaUnit.toLowerCase().includes(search.toLowerCase()) || u.kode.toLowerCase().includes(search.toLowerCase()))
                .map((unit) => (
                  <tr key={unit.id} className="hover:bg-slate-50">
                    <td className="p-3 font-mono font-bold text-blue-700">{unit.kode}</td>
                    <td className="p-3 font-bold text-slate-900">{unit.namaUnit}</td>
                    <td className="p-3 text-slate-600">{unit.kepalaUnit}</td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => handleOpenEdit(unit)} className="p-1 hover:text-amber-600">
                          <Edit3 className="w-4 h-4" />
                        </button>
                        {isAdmin && (
                          <button onClick={() => onDeleteUnit(unit.id)} className="p-1 hover:text-rose-600">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        )}

        {/* TAB 3: GEDUNG / DEPO */}
        {activeMasterTab === 'gedung_ruang_rak' && (
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-bold uppercase border-b border-slate-200">
                <th className="p-3">Kode Gedung</th>
                <th className="p-3">Nama Depo / Gedung</th>
                <th className="p-3">Alamat / Lokasi</th>
                <th className="p-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {gedungList
                .filter((g) => g.namaGedung.toLowerCase().includes(search.toLowerCase()) || g.kode.toLowerCase().includes(search.toLowerCase()))
                .map((gdg) => (
                  <tr key={gdg.id} className="hover:bg-slate-50">
                    <td className="p-3 font-mono font-bold text-blue-700">{gdg.kode}</td>
                    <td className="p-3 font-bold text-slate-900">{gdg.namaGedung}</td>
                    <td className="p-3 text-slate-600">{gdg.alamat}</td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => handleOpenEdit(gdg)} className="p-1 hover:text-amber-600">
                          <Edit3 className="w-4 h-4" />
                        </button>
                        {isAdmin && (
                          <button onClick={() => onDeleteGedung(gdg.id)} className="p-1 hover:text-rose-600">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        )}

        {/* TAB 4: MASTER DUS / BOKS */}
        {activeMasterTab === 'dus' && (
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-bold uppercase border-b border-slate-200">
                <th className="p-3">Nomor Dus</th>
                <th className="p-3">Rak Penyimpanan</th>
                <th className="p-3">Kapasitas Max</th>
                <th className="p-3">Keterangan</th>
                <th className="p-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {dusList
                .filter((d) => d.noDus.toLowerCase().includes(search.toLowerCase()))
                .map((dus) => {
                  const rakObj = rakList.find((r) => r.id === dus.rakId);
                  return (
                    <tr key={dus.id} className="hover:bg-slate-50">
                      <td className="p-3 font-mono font-bold text-amber-800 bg-amber-50/50">{dus.noDus}</td>
                      <td className="p-3 font-semibold text-slate-900">{rakObj ? `${rakObj.kode} - ${rakObj.namaRak}` : 'Rak Depo A1'}</td>
                      <td className="p-3">{dus.kapasitasMaxItem} Item Dokumen</td>
                      <td className="p-3 text-slate-600">{dus.keterangan || '-'}</td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => handleOpenEdit(dus)} className="p-1 hover:text-amber-600">
                            <Edit3 className="w-4 h-4" />
                          </button>
                          {isAdmin && (
                            <button onClick={() => onDeleteDus(dus.id)} className="p-1 hover:text-rose-600">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        )}

      </div>

    </div>
  );
};
