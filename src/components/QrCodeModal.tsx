import React, { useRef } from 'react';
import { ArchiveItem, UnitInfo } from '../types';
import { QRCodeSVG } from 'qrcode.react';
import { QrCode, Download, Printer, X, CheckCircle2, MapPin, Box, Calendar, FileText } from 'lucide-react';

interface QrCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: ArchiveItem | null;
  unitInfo: UnitInfo;
}

export const QrCodeModal: React.FC<QrCodeModalProps> = ({
  isOpen,
  onClose,
  item,
  unitInfo,
}) => {
  const labelRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !item) return null;

  const qrDataJson = JSON.stringify({
    id: item.id,
    noSurat: item.nomorKeputusan,
    tgl: item.tanggal,
    dus: item.noDus,
    lokasi: item.lokasiPenyimpanan,
    perihal: item.perihal,
  });

  const handlePrintLabel = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Cetak Label QR Code - ${item.nomorKeputusan}</title>
          <style>
            body { font-family: sans-serif; padding: 20px; background: #fff; }
            .label-box {
              width: 380px;
              border: 2px solid #000;
              padding: 16px;
              border-radius: 8px;
              margin: 0 auto;
              text-align: center;
            }
            .header-instansi { font-size: 10px; font-weight: bold; text-transform: uppercase; margin-bottom: 8px; border-b: 1px solid #000; padding-bottom: 4px; }
            .qr-container { margin: 12px 0; }
            .info-table { font-size: 11px; text-align: left; width: 100%; margin-top: 8px; }
            .info-table td { padding: 2px 0; }
            .no-dus { font-size: 14px; font-weight: bold; background: #eee; padding: 4px; border: 1px solid #000; display: inline-block; margin-top: 6px; }
            @media print {
              body { padding: 0; }
              .label-box { width: 100%; border: 2px solid #000; }
            }
          </style>
        </head>
        <body>
          <div class="label-box">
            <div class="header-instansi">
              ${unitInfo.namaInstansi}<br>
              LABEL IDENTIFIKASI PERTELAAN ARSIP 2026
            </div>
            
            <div class="qr-container">
              ${document.getElementById('qr-code-svg-element')?.outerHTML || ''}
            </div>

            <div class="no-dus">BOKS / DUS: ${item.noDus}</div>

            <table class="info-table">
              <tr>
                <td><strong>No. SK/Surat:</strong></td>
                <td>${item.nomorKeputusan}</td>
              </tr>
              <tr>
                <td><strong>Tanggal:</strong></td>
                <td>${item.tanggal}</td>
              </tr>
              <tr>
                <td><strong>Lokasi Depo:</strong></td>
                <td>${item.lokasiPenyimpanan}</td>
              </tr>
              <tr>
                <td><strong>Perihal:</strong></td>
                <td>${item.perihal.substring(0, 80)}...</td>
              </tr>
            </table>
          </div>
          <script>
            window.onload = function() { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-600/30 text-blue-400 rounded-lg">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold">Label QR Code Arsip</h2>
              <p className="text-xs text-slate-400">Identifikasi Cepat Boks & Berkas Dokumen</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Label Printable Content */}
        <div className="p-6 space-y-5">
          
          <div
            ref={labelRef}
            className="bg-slate-50 p-5 rounded-2xl border-2 border-slate-900 space-y-4 text-center shadow-xs"
          >
            <div className="border-b border-slate-300 pb-2">
              <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">{unitInfo.namaInstansi}</p>
              <h3 className="text-xs font-black text-slate-900 uppercase mt-0.5">LABEL DIGITAL PERTELAAN ARSIP</h3>
            </div>

            {/* QR Code Graphic */}
            <div className="flex justify-center py-2 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs w-fit mx-auto">
              <div id="qr-code-svg-element">
                <QRCodeSVG
                  value={qrDataJson}
                  size={140}
                  level="H"
                  includeMargin={true}
                />
              </div>
            </div>

            {/* Box Badge */}
            <div className="inline-block px-3 py-1 bg-amber-100 border border-amber-400 text-amber-950 font-mono font-black text-sm rounded-lg">
              NO. DUS: {item.noDus}
            </div>

            {/* Document Details Table */}
            <div className="text-left text-xs space-y-1.5 pt-1 border-t border-slate-200">
              <div className="flex items-start gap-1.5">
                <FileText className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                <span className="font-bold text-slate-900">{item.nomorKeputusan}</span>
              </div>

              <div className="flex items-center gap-1.5 text-slate-600">
                <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>Tanggal: <strong>{item.tanggal}</strong></span>
              </div>

              <div className="flex items-start gap-1.5 text-slate-600">
                <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <span>{item.lokasiPenyimpanan}</span>
              </div>

              <p className="text-[11px] text-slate-500 italic pt-1 line-clamp-2">
                "{item.perihal}"
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between gap-3 pt-1">
            <button
              onClick={handlePrintLabel}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak Label QR</span>
            </button>

            <button
              onClick={onClose}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer"
            >
              Tutup
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
