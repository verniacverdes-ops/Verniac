import React from 'react';
import { ArchiveItem, UnitInfo } from '../types';
import { Printer, ArrowLeft, Download } from 'lucide-react';

interface PrintViewProps {
  items: ArchiveItem[];
  unitInfo: UnitInfo;
  onClose: () => void;
}

export const PrintView: React.FC<PrintViewProps> = ({
  items,
  unitInfo,
  onClose,
}) => {
  const handlePrint = () => {
    window.print();
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

  const todayFormatted = formatDateIndo(new Date().toISOString().split('T')[0]);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/90 overflow-y-auto p-2 sm:p-6 print:p-0 print:bg-white print:static">
      
      {/* Non-printable Control Bar */}
      <div className="max-w-5xl mx-auto mb-4 bg-slate-800 text-white p-4 rounded-xl shadow-lg flex items-center justify-between print:hidden">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="inline-flex items-center gap-1.5 text-xs font-medium bg-slate-700 hover:bg-slate-600 px-3 py-2 rounded-lg text-slate-200 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali</span>
          </button>
          <div>
            <h2 className="text-sm font-bold text-white">Mode Cetak Dokumen Resmi</h2>
            <p className="text-xs text-slate-400">Siap dicetak ke Printer atau Simpan PDF</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            id="btn-trigger-print"
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold px-4 py-2 rounded-lg text-xs shadow-md transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak / PDF</span>
          </button>
        </div>
      </div>

      {/* Printable Sheet Area */}
      <div className="max-w-5xl mx-auto bg-white text-slate-900 p-8 sm:p-12 shadow-2xl rounded-xl print:shadow-none print:p-0 print:m-0 print:w-full print:max-w-none border border-slate-200 print:border-none font-serif">
        
        {/* Print Styles inline injection */}
        <style>{`
          @media print {
            body {
              background: white !important;
              color: black !important;
            }
            @page {
              size: A4 portrait;
              margin: 1.5cm 1.5cm 1.5cm 1.5cm;
            }
            .print\\:hidden {
              display: none !important;
            }
          }
        `}</style>

        {/* Document Kop Header */}
        <div className="text-center border-b-2 border-slate-900 pb-4 mb-6 uppercase tracking-wider">
          <h1 className="text-base sm:text-lg font-bold text-slate-900">
            {unitInfo.namaInstansi}
          </h1>
          <h2 className="text-sm sm:text-base font-bold text-slate-800">
            {unitInfo.unitKerja}
          </h2>
          <p className="text-xs text-slate-600 mt-0.5 font-sans">
            {unitInfo.lokasiGedungUtama}
          </p>
        </div>

        {/* Title */}
        <div className="text-center my-6 space-y-1">
          <h2 className="text-lg sm:text-xl font-bold uppercase underline tracking-wide">
            DAFTAR PERTELAAN ARSIP TAHUN {unitInfo.tahun}
          </h2>
          <p className="text-xs font-sans text-slate-700">
            Pencipta Arsip: <strong className="uppercase">{unitInfo.penciptaArsip}</strong>
          </p>
        </div>

        {/* Table Content */}
        <div className="my-6">
          <table className="w-full text-left border-collapse border-2 border-slate-900 text-xs font-sans">
            <thead>
              <tr className="bg-slate-100 border-b-2 border-slate-900 text-slate-900 uppercase font-bold text-center">
                <th className="p-2.5 border-r border-slate-900 w-12">NO</th>
                <th className="p-2.5 border-r border-slate-900 w-52">NOMOR KEPUTUSAN / TANGGAL</th>
                <th className="p-2.5 border-r border-slate-900">PERIHAL</th>
                <th className="p-2.5 border-r border-slate-900 w-32">NO. DUS</th>
                <th className="p-2.5 border-slate-900 w-64">KETERANGAN</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {items.length > 0 ? (
                items.map((item, index) => (
                  <tr key={item.id} className="align-top">
                    <td className="p-2.5 border-r border-slate-900 text-center font-bold">
                      {index + 1}
                    </td>
                    <td className="p-2.5 border-r border-slate-900">
                      <div className="font-bold text-slate-900">{item.nomorKeputusan}</div>
                      <div className="text-[11px] text-slate-600 mt-0.5">{formatDateIndo(item.tanggal)}</div>
                    </td>
                    <td className="p-2.5 border-r border-slate-900 leading-normal">
                      <div>{item.perihal}</div>
                      {item.keterangan && (
                        <div className="text-[10px] text-slate-600 mt-1 italic">
                          Ket: {item.keterangan}
                        </div>
                      )}
                    </td>
                    <td className="p-2.5 border-r border-slate-900 text-center font-mono font-bold">
                      {item.noDus}
                    </td>
                    <td className="p-2.5 border-slate-900">
                      <div className="font-medium">{item.lokasiPenyimpanan}</div>
                      {item.unitPengolah && (
                        <div className="text-[10px] text-slate-600 mt-0.5">
                          Unit: {item.unitPengolah}
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="p-6 text-center italic text-slate-500">
                    Nihil / Belum Ada Data Pertelaan Arsip yang Terdaftar.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Signature Blocks (Tanda Tangan) */}
        <div className="mt-12 pt-4 grid grid-cols-2 gap-8 text-xs font-sans break-inside-avoid">
          {/* Left Signature - Head of Unit */}
          <div className="text-center space-y-1">
            <p className="text-slate-600 font-medium">Mengetahui,</p>
            <p className="font-bold text-slate-900 uppercase">{unitInfo.jabatanPimpinan}</p>
            <div className="h-20"></div>
            <p className="font-bold text-slate-900 underline">{unitInfo.namaPimpinan}</p>
            <p className="text-[11px] text-slate-600">NIP. ....................................................</p>
          </div>

          {/* Right Signature - Archives Officer */}
          <div className="text-center space-y-1">
            <p className="text-slate-600 font-medium">Ditetapkan di Tempat, {todayFormatted}</p>
            <p className="font-bold text-slate-900 uppercase">{unitInfo.jabatanPetugas}</p>
            <div className="h-20"></div>
            <p className="font-bold text-slate-900 underline">{unitInfo.namaPetugas}</p>
            <p className="text-[11px] text-slate-600">NIP. ....................................................</p>
          </div>
        </div>

        {/* Footer Note */}
        <div className="mt-10 pt-3 border-t border-slate-300 text-[10px] text-slate-500 text-center font-sans">
          Dokumen Resmi Daftar Pertelaan Arsip Tahun {unitInfo.tahun} - Dicetak secara digital melalui Aplikasi Pengelolaan Arsip.
        </div>

      </div>
    </div>
  );
};
