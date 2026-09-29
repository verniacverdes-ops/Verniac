import React, { useState, useMemo } from 'react';
import { 
  ArchiveItem, 
  SortField, 
  SortOrder,
  User 
} from '../types';
import { hasRolePermission, canAccessClassification } from '../lib/permissions';
import { 
  Search, 
  Filter, 
  ArrowUpDown, 
  Edit3, 
  Trash2, 
  Copy, 
  Eye, 
  Box, 
  MapPin, 
  Calendar, 
  FileText, 
  CheckSquare, 
  Square, 
  Plus, 
  RefreshCw,
  Info,
  Archive,
  QrCode,
  FileCheck,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  SlidersHorizontal,
  LayoutList,
  Grid,
  X,
  Shield,
  Lock
} from 'lucide-react';

interface ArchiveTableProps {
  items: ArchiveItem[];
  currentUser?: User | null;
  onEdit: (item: ArchiveItem) => void;
  onDelete: (id: string) => void;
  onDuplicate: (item: ArchiveItem) => void;
  onViewDetail: (item: ArchiveItem) => void;
  onOpenAddModal: () => void;
  onResetSampleData: () => void;
  onOpenPdfModal?: (item: ArchiveItem) => void;
  onOpenQrModal?: (item: ArchiveItem) => void;
  // FASE (redesain sidebar): kotak pencarian di TopHeader.tsx sekarang
  // sudah global (tampil di semua halaman), bukan cuma di halaman Arsip
  // ini. Supaya mengetik di sana benar-benar menyaring tabel ini juga
  // (bukan cuma pindah tab tanpa efek), nilainya diteruskan ke sini dan
  // disinkronkan ke state pencarian lokal lewat useEffect di bawah.
  initialSearchQuery?: string;
}

export const ArchiveTable: React.FC<ArchiveTableProps> = ({
  items,
  currentUser,
  onEdit,
  onDelete,
  onDuplicate,
  onViewDetail,
  onOpenAddModal,
  onResetSampleData,
  onOpenPdfModal,
  onOpenQrModal,
  initialSearchQuery,
}) => {
  const canEdit = hasRolePermission(currentUser?.role, 'edit');
  const canDelete = hasRolePermission(currentUser?.role, 'hapus');

  // Basic Filter States
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery || '');
  const [selectedDusFilter, setSelectedDusFilter] = useState<string>('ALL');
  const [sortField, setSortField] = useState<SortField>('no');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Sinkron ulang setiap kali pencarian global di TopHeader berubah
  // (termasuk saat dikosongkan lagi), supaya kedua kotak pencarian selalu
  // menampilkan nilai yang sama, dari arah mana pun diketik.
  React.useEffect(() => {
    if (typeof initialSearchQuery === 'string') {
      setSearchQuery(initialSearchQuery);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSearchQuery]);

  // Tahap 4: Advanced Search & Pagination & Mobile View Mode States
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [filterUnit, setFilterUnit] = useState('ALL');
  const [filterPdfStatus, setFilterPdfStatus] = useState('ALL');
  const [minYear, setMinYear] = useState('');
  const [maxYear, setMaxYear] = useState('');

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

  // Unique lists for filters
  const uniqueDusList = useMemo(() => {
    const set = new Set<string>();
    items.forEach(item => {
      if (item.noDus) set.add(item.noDus);
    });
    return Array.from(set).sort();
  }, [items]);

  const uniqueKategoriList = useMemo(() => {
    const set = new Set<string>();
    items.forEach(item => {
      if (item.kategoriArsip) set.add(item.kategoriArsip);
    });
    return Array.from(set).sort();
  }, [items]);

  const uniqueUnitList = useMemo(() => {
    const set = new Set<string>();
    items.forEach(item => {
      if (item.unitPengolah) set.add(item.unitPengolah);
    });
    return Array.from(set).sort();
  }, [items]);

  // Filtered & Sorted items
  const filteredAndSortedItems = useMemo(() => {
    return items
      .filter((item) => !item.isDeleted)
      .filter((item) => {
        // Filter search query
        const query = searchQuery.toLowerCase().trim();
        const matchSearch =
          !query ||
          item.nomorKeputusan.toLowerCase().includes(query) ||
          item.perihal.toLowerCase().includes(query) ||
          item.noDus.toLowerCase().includes(query) ||
          item.lokasiPenyimpanan.toLowerCase().includes(query) ||
          (item.keterangan && item.keterangan.toLowerCase().includes(query)) ||
          (item.unitPengolah && item.unitPengolah.toLowerCase().includes(query));

        // Filter Dus
        const matchDus = selectedDusFilter === 'ALL' || item.noDus === selectedDusFilter;

        // Advanced Category
        const matchCat = filterCategory === 'ALL' || item.kategoriArsip === filterCategory;

        // Advanced Unit
        const matchUnit = filterUnit === 'ALL' || item.unitPengolah === filterUnit;

        // Advanced PDF Status
        const matchPdf =
          filterPdfStatus === 'ALL' ||
          (filterPdfStatus === 'HAS_PDF' && Boolean(item.pdfAttachment)) ||
          (filterPdfStatus === 'NO_PDF' && !item.pdfAttachment);

        // Advanced Year Range
        const itemYear = parseInt(item.tanggal?.substring(0, 4) || '0');
        const matchMinYear = !minYear || itemYear >= parseInt(minYear);
        const matchMaxYear = !maxYear || itemYear <= parseInt(maxYear);

        return matchSearch && matchDus && matchCat && matchUnit && matchPdf && matchMinYear && matchMaxYear;
      })
      .sort((a, b) => {
        let valA: string | number = '';
        let valB: string | number = '';

        if (sortField === 'no') {
          return sortOrder === 'asc' ? 0 : 0;
        } else if (sortField === 'nomorKeputusan') {
          valA = a.nomorKeputusan.toLowerCase();
          valB = b.nomorKeputusan.toLowerCase();
        } else if (sortField === 'tanggal') {
          valA = a.tanggal;
          valB = b.tanggal;
        } else if (sortField === 'perihal') {
          valA = a.perihal.toLowerCase();
          valB = b.perihal.toLowerCase();
        } else if (sortField === 'noDus') {
          valA = a.noDus.toLowerCase();
          valB = b.noDus.toLowerCase();
        } else if (sortField === 'lokasiPenyimpanan') {
          valA = a.lokasiPenyimpanan.toLowerCase();
          valB = b.lokasiPenyimpanan.toLowerCase();
        }

        if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
  }, [
    items, 
    searchQuery, 
    selectedDusFilter, 
    filterCategory, 
    filterUnit, 
    filterPdfStatus, 
    minYear, 
    maxYear, 
    sortField, 
    sortOrder
  ]);

  // Pagination calculation
  const totalItemsCount = filteredAndSortedItems.length;
  const totalPages = Math.ceil(totalItemsCount / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItemsCount);
  const paginatedItems = useMemo(() => {
    return filteredAndSortedItems.slice(startIndex, endIndex);
  }, [filteredAndSortedItems, startIndex, endIndex]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedDusFilter('ALL');
    setFilterCategory('ALL');
    setFilterUnit('ALL');
    setFilterPdfStatus('ALL');
    setMinYear('');
    setMaxYear('');
    setCurrentPage(1);
  };

  const handleSelectAllOnPage = () => {
    const pageIds = paginatedItems.map((item) => item.id);
    const allSelected = pageIds.every((id) => selectedIds.includes(id));

    if (allSelected) {
      setSelectedIds(selectedIds.filter((id) => !pageIds.includes(id)));
    } else {
      const combined = new Set([...selectedIds, ...pageIds]);
      setSelectedIds(Array.from(combined));
    }
  };

  const handleToggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((i) => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleBulkDelete = () => {
    if (
      window.confirm(
        `Apakah Anda yakin ingin memindahkan ${selectedIds.length} data pertelaan arsip ke Tempat Sampah?`
      )
    ) {
      selectedIds.forEach((id) => onDelete(id));
      setSelectedIds([]);
    }
  };

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
    <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden space-y-0">
      
      {/* Top Controls Header */}
      <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/80 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          
          {/* Main Search Input */}
          <div className="relative flex-1 max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Cari No. SK, Perihal, No. Dus, atau Lokasi..."
              id="input-pencarian-arsip"
              className="w-full pl-10 pr-10 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Filters & Toggle Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            
            {/* Advanced Search Toggle */}
            <button
              onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${
                isAdvancedOpen || filterCategory !== 'ALL' || filterUnit !== 'ALL' || minYear || maxYear
                  ? 'bg-blue-50 text-blue-700 border-blue-300'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Pencarian Lanjutan</span>
            </button>

            {/* Dus Filter Dropdown */}
            <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded-xl px-3 py-1.5 shadow-2xs">
              <Filter className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-xs text-slate-500 font-medium hidden sm:inline">Dus:</span>
              <select
                value={selectedDusFilter}
                onChange={(e) => {
                  setSelectedDusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="text-xs font-bold text-slate-800 bg-transparent focus:outline-none cursor-pointer"
              >
                <option value="ALL">Semua Dus</option>
                {uniqueDusList.map((dus) => (
                  <option key={dus} value={dus}>
                    {dus}
                  </option>
                ))}
              </select>
            </div>

            {/* View Mode Switcher for Mobile/Responsive */}
            <div className="flex items-center bg-slate-200/80 p-0.5 rounded-xl text-xs">
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg cursor-pointer ${
                  viewMode === 'table' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-600'
                }`}
                title="Tampilan Tabel"
              >
                <LayoutList className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('cards')}
                className={`p-1.5 rounded-lg cursor-pointer ${
                  viewMode === 'cards' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-600'
                }`}
                title="Tampilan Kartu Mobile"
              >
                <Grid className="w-4 h-4" />
              </button>
            </div>

            {/* Bulk Action Button */}
            {selectedIds.length > 0 && canDelete && (
              <button
                onClick={handleBulkDelete}
                className="inline-flex items-center gap-1.5 bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Hapus ({selectedIds.length})</span>
              </button>
            )}

            <button
              onClick={onOpenAddModal}
              disabled={!canEdit}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer ml-auto sm:ml-0"
            >
              <Plus className="w-4 h-4" />
              <span>Input Arsip</span>
            </button>
          </div>

        </div>

        {/* Expandable Advanced Search Drawer Panel */}
        {isAdvancedOpen && (
          <div className="p-4 bg-white rounded-xl border border-blue-200 shadow-2xs space-y-3 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="text-xs font-bold text-blue-900 uppercase flex items-center gap-1.5">
                <SlidersHorizontal className="w-3.5 h-3.5 text-blue-600" /> Filter Lanjutan Multikriteria
              </span>
              <button
                onClick={handleResetFilters}
                className="text-[11px] font-bold text-rose-600 hover:text-rose-800 underline cursor-pointer"
              >
                Reset Semua Filter
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              
              {/* Category Filter */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Kategori Arsip:</label>
                <select
                  value={filterCategory}
                  onChange={(e) => {
                    setFilterCategory(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg font-semibold text-slate-800"
                >
                  <option value="ALL">Semua Kategori</option>
                  {uniqueKategoriList.map((kat) => (
                    <option key={kat} value={kat}>{kat}</option>
                  ))}
                </select>
              </div>

              {/* Unit Pengolah Filter */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Unit Pengolah:</label>
                <select
                  value={filterUnit}
                  onChange={(e) => {
                    setFilterUnit(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg font-semibold text-slate-800"
                >
                  <option value="ALL">Semua Unit Kerja</option>
                  {uniqueUnitList.map((unit) => (
                    <option key={unit} value={unit}>{unit}</option>
                  ))}
                </select>
              </div>

              {/* Lampiran Digital Status (PDF/Word/Excel) */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Lampiran File Digital:</label>
                <select
                  value={filterPdfStatus}
                  onChange={(e) => {
                    setFilterPdfStatus(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg font-semibold text-slate-800"
                >
                  <option value="ALL">Semua Berkas</option>
                  <option value="HAS_PDF">Memiliki Lampiran Digital</option>
                  <option value="NO_PDF">Belum Ada Lampiran</option>
                </select>
              </div>

              {/* Year Range */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Rentang Tahun Dokumen:</label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    placeholder="Min (e.g 2020)"
                    value={minYear}
                    onChange={(e) => {
                      setMinYear(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-1/2 p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono"
                  />
                  <span className="text-slate-400 font-bold">-</span>
                  <input
                    type="number"
                    placeholder="Max (e.g 2026)"
                    value={maxYear}
                    onChange={(e) => {
                      setMaxYear(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-1/2 p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono"
                  />
                </div>
              </div>

            </div>
          </div>
        )}

      </div>

      {/* Dynamic Info Notice Bar */}
      <div className="px-5 py-2 bg-blue-50/60 border-b border-blue-100 flex items-center justify-between text-xs text-blue-900">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-blue-600 shrink-0" />
          <span>
            Menampilkan <strong>{startIndex + 1} - {endIndex}</strong> dari total <strong>{totalItemsCount}</strong> berkas pertelaan terfilter.
          </span>
        </div>
        <div className="flex items-center gap-2 text-slate-600">
          <span className="text-[11px] font-semibold">Tampilkan:</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="p-1 bg-white border border-blue-200 rounded text-xs font-bold cursor-pointer"
          >
            <option value={10}>10 Baris</option>
            <option value={25}>25 Baris</option>
            <option value={50}>50 Baris</option>
            <option value={100}>100 Baris</option>
          </select>
        </div>
      </div>

      {/* VIEW MODE 1: DESKTOP & TABLE VIEW */}
      {viewMode === 'table' ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse" id="tabel-pertelaan-arsip">
            <thead>
              <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-700 text-xs uppercase font-bold tracking-wider">
                <th className="py-3.5 px-3 text-center w-10">
                  <button
                    onClick={handleSelectAllOnPage}
                    className="text-slate-400 hover:text-slate-600 cursor-pointer"
                    title="Pilih Semua di Halaman Ini"
                  >
                    {paginatedItems.length > 0 && paginatedItems.every((i) => selectedIds.includes(i.id)) ? (
                      <CheckSquare className="w-4 h-4 text-blue-600" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </th>

                {/* Column 1: NO */}
                <th className="py-3.5 px-3 text-center w-12 border-r border-slate-200/80">
                  <button
                    onClick={() => handleSort('no')}
                    className="flex items-center justify-center gap-1 w-full hover:text-blue-600"
                  >
                    <span>NO</span>
                  </button>
                </th>

                {/* Column 2: NOMOR KEPUTUSAN / TANGGAL */}
                <th className="py-3.5 px-4 w-52 sm:w-60 border-r border-slate-200/80">
                  <button
                    onClick={() => handleSort('nomorKeputusan')}
                    className="flex items-center gap-1 hover:text-blue-600"
                  >
                    <span>NOMOR KEPUTUSAN / TGL</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </button>
                </th>

                {/* Column 3: PERIHAL */}
                <th className="py-3.5 px-4 border-r border-slate-200/80">
                  <button
                    onClick={() => handleSort('perihal')}
                    className="flex items-center gap-1 hover:text-blue-600"
                  >
                    <span>PERIHAL DOKUMEN</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </button>
                </th>

                {/* Column 4: NOMOR DUS */}
                <th className="py-3.5 px-4 w-32 sm:w-36 text-center border-r border-slate-200/80">
                  <button
                    onClick={() => handleSort('noDus')}
                    className="flex items-center justify-center gap-1 w-full hover:text-blue-600"
                  >
                    <span>NO. DUS</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </button>
                </th>

                {/* Column 5: LOKASI PENYIMPANAN */}
                <th className="py-3.5 px-4 w-44 sm:w-52 border-r border-slate-200/80">
                  <button
                    onClick={() => handleSort('lokasiPenyimpanan')}
                    className="flex items-center gap-1 hover:text-blue-600"
                  >
                    <span>LOKASI STORAGE</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </button>
                </th>

                {/* Column 6: AKSI */}
                <th className="py-3.5 px-4 w-36 text-center">
                  <span>AKSI</span>
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200 text-xs text-slate-800">
              {paginatedItems.length > 0 ? (
                paginatedItems.map((item, index) => {
                  const isSelected = selectedIds.includes(item.id);
                  const displayIndex = startIndex + index + 1;

                  return (
                    <tr
                      key={item.id}
                      className={`transition-colors hover:bg-blue-50/40 ${
                        isSelected ? 'bg-blue-50/70' : index % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-3.5 px-3 text-center align-top">
                        <button
                          onClick={() => handleToggleSelect(item.id)}
                          className="text-slate-400 hover:text-slate-600 cursor-pointer pt-0.5"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-blue-600" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </td>

                      {/* NO */}
                      <td className="py-3.5 px-3 text-center align-top font-mono font-medium text-slate-500 border-r border-slate-200/60">
                        {displayIndex}
                      </td>

                      {/* NOMOR KEPUTUSAN & TANGGAL */}
                      <td className="py-3.5 px-4 align-top border-r border-slate-200/60">
                        <div className="font-bold font-mono text-blue-900 hover:text-blue-600 cursor-pointer" onClick={() => onViewDetail(item)}>
                          {item.nomorKeputusan}
                        </div>
                        <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-1">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          <span>{formatDateIndo(item.tanggal)}</span>
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                          {item.kategoriArsip && (
                            <span className="px-2 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 rounded font-semibold text-[10px]">
                              {item.kategoriArsip}
                            </span>
                          )}
                          {item.klasifikasiAkses && (
                            <span className={`px-2 py-0.5 rounded font-bold text-[10px] uppercase border ${
                              item.klasifikasiAkses === 'PUBLIK' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                              item.klasifikasiAkses === 'SANGAT_RAHASIA' || item.klasifikasiAkses === 'RAHASIA' ? 'bg-rose-50 text-rose-800 border-rose-200' :
                              'bg-amber-50 text-amber-800 border-amber-200'
                            }`}>
                              {item.klasifikasiAkses}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* PERIHAL */}
                      <td className="py-3.5 px-4 align-top border-r border-slate-200/60">
                        {canAccessClassification(currentUser?.role, item.klasifikasiAkses || 'INTERNAL') ? (
                          <>
                            <p className="text-slate-900 leading-relaxed font-medium whitespace-pre-line">
                              {item.perihal}
                            </p>
                            {item.unitPengolah && (
                              <div className="mt-1 text-[10px] text-slate-500 font-semibold flex items-center gap-1">
                                <span>Unit: {item.unitPengolah}</span>
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="p-2.5 bg-rose-50/80 border border-rose-200 rounded-lg text-xs text-rose-900 flex items-center gap-2">
                            <Lock className="w-4 h-4 text-rose-600 shrink-0" />
                            <div>
                              <p className="font-bold">Akses Dibatasi ({item.klasifikasiAkses || 'RAHASIA'})</p>
                              <p className="text-[10px] text-rose-700">Peran pengguna tidak berwenang membuka rincian berkas ini.</p>
                            </div>
                          </div>
                        )}
                      </td>

                      {/* NO DUS */}
                      <td className="py-3.5 px-4 text-center align-top border-r border-slate-200/60">
                        <div className="inline-flex items-center gap-1 font-mono font-bold text-amber-900 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200 text-xs">
                          <Box className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span>{item.noDus}</span>
                        </div>
                      </td>

                      {/* LOKASI PENYIMPANAN */}
                      <td className="py-3.5 px-4 align-top border-r border-slate-200/60">
                        <div className="flex items-start gap-1.5 text-slate-700">
                          <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                          <span className="font-medium text-xs leading-tight">
                            {item.lokasiPenyimpanan}
                          </span>
                        </div>
                      </td>

                      {/* AKSI */}
                      <td className="py-3.5 px-4 text-center align-top">
                        <div className="flex items-center justify-center gap-1 flex-wrap">
                          {item.pdfAttachment && onOpenPdfModal && (
                            <button
                              onClick={() => onOpenPdfModal(item)}
                              className="p-1.5 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-md transition-colors cursor-pointer flex items-center gap-1 font-bold text-[10px]"
                              title="Buka Berkas Lampiran"
                            >
                              <FileCheck className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Berkas</span>
                            </button>
                          )}

                          {onOpenQrModal && (
                            <button
                              onClick={() => onOpenQrModal(item)}
                              className="p-1.5 text-slate-700 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors cursor-pointer"
                              title="Tampilkan QR Code & Cetak Label"
                            >
                              <QrCode className="w-4 h-4" />
                            </button>
                          )}

                          <button
                            onClick={() => onViewDetail(item)}
                            className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors cursor-pointer"
                            title="Lihat Rincian"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {canEdit && (
                            <button
                              onClick={() => onEdit(item)}
                              className="p-1.5 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors cursor-pointer"
                              title="Edit Data"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                          )}

                          <button
                            onClick={() => onDuplicate(item)}
                            className="p-1.5 text-slate-600 hover:text-purple-600 hover:bg-purple-50 rounded-md transition-colors cursor-pointer"
                            title="Duplikasi"
                          >
                            <Copy className="w-4 h-4" />
                          </button>

                          {canDelete && (
                            <button
                              onClick={() => onDelete(item.id)}
                              className="p-1.5 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                              title="Pindahkan ke Tempat Sampah"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 px-4 text-center">
                    <div className="max-w-md mx-auto space-y-3">
                      <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
                        <Archive className="w-6 h-6" />
                      </div>
                      <h3 className="text-base font-bold text-slate-900">
                        Tidak Ada Data Pertelaan
                      </h3>
                      <p className="text-xs text-slate-500">
                        Silakan tambahkan data baru atau reset filter pencarian.
                      </p>
                      <button
                        onClick={handleResetFilters}
                        className="px-3 py-1.5 bg-blue-50 text-blue-700 font-bold text-xs rounded-lg hover:bg-blue-100 cursor-pointer"
                      >
                        Reset Filter
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        /* VIEW MODE 2: RESPONSIVE MOBILE CARDS */
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50">
          {paginatedItems.map((item) => (
            <div key={item.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
              <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2">
                <div>
                  <span className="font-mono font-bold text-blue-900 text-xs block">{item.nomorKeputusan}</span>
                  <span className="text-[11px] text-slate-500">{formatDateIndo(item.tanggal)}</span>
                </div>
                <span className="font-mono font-bold text-amber-900 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded text-[10px]">
                  {item.noDus}
                </span>
              </div>

              <p className="text-xs text-slate-800 line-clamp-3">{item.perihal}</p>

              <div className="text-[11px] text-slate-600 space-y-1">
                <div>Lokasi: <strong>{item.lokasiPenyimpanan}</strong></div>
                {item.unitPengolah && <div>Unit: <strong>{item.unitPengolah}</strong></div>}
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <div className="flex items-center gap-1">
                  {item.pdfAttachment && onOpenPdfModal && (
                    <button
                      onClick={() => onOpenPdfModal(item)}
                      className="px-2 py-1 bg-emerald-50 text-emerald-700 font-bold rounded text-[10px]"
                    >
                      Berkas
                    </button>
                  )}
                  {onOpenQrModal && (
                    <button
                      onClick={() => onOpenQrModal(item)}
                      className="p-1 text-slate-600 hover:text-blue-600"
                    >
                      <QrCode className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onViewDetail(item)}
                    className="px-2.5 py-1 bg-blue-50 text-blue-700 font-bold rounded text-[11px]"
                  >
                    Detail
                  </button>
                  {canEdit && (
                    <button
                      onClick={() => onEdit(item)}
                      className="px-2.5 py-1 bg-emerald-50 text-emerald-700 font-bold rounded text-[11px]"
                    >
                      Edit
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* PAGINATION FOOTER CONTROL BAR */}
      {totalPages > 1 && (
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
          <div>
            Halaman <strong>{currentPage}</strong> dari <strong>{totalPages}</strong> ({totalItemsCount} total berkas)
          </div>

          <div className="flex items-center gap-1">
            {/* First Page */}
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg border border-slate-300 bg-white disabled:opacity-40 hover:bg-slate-100 cursor-pointer"
              title="Halaman Pertama"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>

            {/* Prev Page */}
            <button
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg border border-slate-300 bg-white disabled:opacity-40 hover:bg-slate-100 cursor-pointer"
              title="Sebelumnya"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Page Buttons */}
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .slice(Math.max(0, currentPage - 3), Math.min(totalPages, currentPage + 2))
              .map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`w-8 h-8 rounded-lg font-bold border transition-colors cursor-pointer ${
                    currentPage === page
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  {page}
                </button>
              ))}

            {/* Next Page */}
            <button
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg border border-slate-300 bg-white disabled:opacity-40 hover:bg-slate-100 cursor-pointer"
              title="Berikutnya"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {/* Last Page */}
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg border border-slate-300 bg-white disabled:opacity-40 hover:bg-slate-100 cursor-pointer"
              title="Halaman Terakhir"
            >
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
