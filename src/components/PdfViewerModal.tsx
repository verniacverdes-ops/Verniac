import React, { useEffect, useState } from 'react';
import { ArchiveItem, User } from '../types';
import { FileText, FileSpreadsheet, Download, X, HardDrive, FileCheck, Lock, Loader2, AlertTriangle } from 'lucide-react';
import { hasRolePermission } from '../lib/permissions';

// Hanya PDF yang bisa dipratinjau langsung lewat <iframe> di browser.
// Word/Excel (baik format lama .doc/.xls maupun .docx/.xlsx) tidak punya
// renderer bawaan browser, jadi untuk tipe itu ditampilkan kartu "tidak
// bisa dipratinjau" + tombol unduh, bukan iframe kosong/rusak. Data lama
// tanpa field `mime` (sebelum fitur multi-format) selalu dianggap PDF.
function isPreviewableInline(mime?: string): boolean {
  return !mime || mime === 'application/pdf';
}

function attachmentDisplay(mime?: string): { icon: React.ReactNode; label: string } {
  if (mime === 'application/vnd.ms-excel' || mime === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
    return { icon: <FileSpreadsheet className="w-12 h-12 text-emerald-500 mx-auto" />, label: 'Berkas Excel' };
  }
  if (mime === 'application/msword' || mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    return { icon: <FileText className="w-12 h-12 text-blue-500 mx-auto" />, label: 'Berkas Word' };
  }
  return { icon: <FileText className="w-12 h-12 text-rose-500 mx-auto" />, label: 'Berkas PDF' };
}

interface PdfViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: ArchiveItem | null;
  currentUser?: User | null;
  // FASE 9: base URL API backend (mis. "http://localhost:3000/api"),
  // dipakai untuk membangun URL /documents/:id yang men-stream berkas
  // PDF asli dari backend/uploads/arsip/.
  apiUrl: string;
}

export const PdfViewerModal: React.FC<PdfViewerModalProps> = ({
  isOpen,
  onClose,
  item,
  currentUser,
  apiUrl,
}) => {
  const [zoom, setZoom] = useState<number>(100);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState('');
  // Object URL sementara untuk pratinjau <iframe> saat berkas diambil
  // lewat fetch+Authorization header (bukan langsung dari data URL base64).
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState('');
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  const fileName = item?.pdfAttachment?.fileName || 'dokumen.pdf';
  const fileSizeKb = item?.pdfAttachment ? Math.round(item.pdfAttachment.fileSize / 1024) : 0;
  const isRestricted = item?.klasifikasiAkses === 'RAHASIA' || item?.klasifikasiAkses === 'SANGAT_RAHASIA';
  const canDownload = hasRolePermission(currentUser?.role, 'download');

  // FASE 9: begitu berkas sudah tersimpan sungguhan di server, respons
  // GET /api/arsip TIDAK LAGI membawa `fileData` base64 (lihat
  // backend/routes/arsip.ts — field itu sengaja dihapus dari kolom
  // pdf_attachment supaya baris database tidak bengkak). Jadi:
  //   - fileData masih ada  -> arsip baru saja diunggah di sesi ini
  //     (belum reload), pratinjau langsung pakai data URL tsb.
  //   - fileData sudah tidak ada -> ambil dari endpoint asli
  //     /documents/:id (dengan header Authorization) sebagai blob.
  const documentUrl = item ? `${apiUrl}/documents/${item.id}` : '';

  useEffect(() => {
    setPreviewBlobUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setPreviewError('');

    if (!isOpen || !item?.pdfAttachment) return;
    if (item.pdfAttachment.fileData) return; // sudah ada data URL, tidak perlu fetch

    let cancelled = false;
    setIsLoadingPreview(true);

    (async () => {
      try {
        const res = await fetch(documentUrl, {
          headers: currentUser?.token ? { Authorization: `Bearer ${currentUser.token}` } : {},
        });
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error(body?.message || `Gagal memuat dokumen (HTTP ${res.status})`);
        }
        const blob = await res.blob();
        if (cancelled) return;
        setPreviewBlobUrl(URL.createObjectURL(blob));
      } catch (err: any) {
        if (!cancelled) setPreviewError(err.message || 'Gagal memuat pratinjau PDF dari server.');
      } finally {
        if (!cancelled) setIsLoadingPreview(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, item?.id, item?.pdfAttachment?.fileData]);

  if (!isOpen || !item || !item.pdfAttachment) return null;

  const pdfPreviewSrc = item.pdfAttachment.fileData || previewBlobUrl;
  const attachmentMime = item.pdfAttachment.mime;
  const canPreviewInline = isPreviewableInline(attachmentMime);
  const attachmentInfo = attachmentDisplay(attachmentMime);

  const handleDownloadPdf = async () => {
    if (!canDownload) {
      alert('Peran pengguna Anda tidak memiliki hak akses unduh dokumen!');
      return;
    }

    setDownloadError('');

    // Jalur lama: berkas masih berupa data URL base64 di memori (arsip
    // baru saja diunggah, belum pernah reload dari server).
    if (item.pdfAttachment!.fileData) {
      const link = document.createElement('a');
      link.href = item.pdfAttachment!.fileData;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }

    // FASE 9: unduh berkas ASLI dari server lewat fetch (supaya header
    // Authorization bisa disertakan; <a href> biasa tidak bisa membawa
    // header custom).
    setIsDownloading(true);
    try {
      const res = await fetch(documentUrl, {
        headers: currentUser?.token ? { Authorization: `Bearer ${currentUser.token}` } : {},
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message || `Gagal mengunduh dokumen (HTTP ${res.status})`);
      }
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(objectUrl);
    } catch (err: any) {
      setDownloadError(err.message || 'Gagal mengunduh berkas PDF.');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 relative">

        {/* Header Bar */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-600/30 text-emerald-400 rounded-xl">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <span>Pratinjau {attachmentInfo.label} Digital</span>
                <span className="font-mono text-[10px] bg-blue-500/20 text-blue-300 border border-blue-400/30 px-2 py-0.5 rounded">
                  {item.nomorKeputusan}
                </span>
                {item.klasifikasiAkses && (
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase border ${
                    item.klasifikasiAkses === 'PUBLIK' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' :
                    item.klasifikasiAkses === 'SANGAT_RAHASIA' || item.klasifikasiAkses === 'RAHASIA' ? 'bg-rose-500/20 text-rose-300 border-rose-500/30' :
                    'bg-amber-500/20 text-amber-300 border-amber-500/30'
                  }`}>
                    {item.klasifikasiAkses}
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-400 font-mono">
                {fileName} ({fileSizeKb} KB) • Diunggah {item.pdfAttachment.uploadedAt}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {canDownload ? (
              <button
                onClick={handleDownloadPdf}
                disabled={isDownloading}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition-all"
              >
                {isDownloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                <span>{isDownloading ? 'Mengunduh...' : `Unduh ${attachmentInfo.label}`}</span>
              </button>
            ) : (
              <span className="px-3 py-1.5 bg-slate-800 text-slate-400 border border-slate-700 font-bold rounded-xl text-xs flex items-center gap-1 cursor-not-allowed">
                <Lock className="w-3.5 h-3.5" /> Unduh Dibatasi
              </span>
            )}

            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1.5 rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {downloadError && (
          <div className="px-6 py-2 bg-rose-50 border-b border-rose-200 text-rose-800 text-xs font-medium flex items-center gap-1.5 shrink-0">
            <AlertTriangle className="w-3.5 h-3.5" /> {downloadError}
          </div>
        )}

        {/* PDF Embedded Frame with Watermark Overlay */}
        <div className="flex-1 bg-slate-100 p-2 overflow-hidden flex items-center justify-center relative">

          {/* Watermark Overlay for Restricted/Confidential Documents */}
          {isRestricted && (
            <div className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center overflow-hidden opacity-25 select-none">
              <div className="transform -rotate-25 text-rose-900 font-black text-2xl sm:text-4xl text-center border-4 border-rose-900/60 p-6 rounded-2xl uppercase tracking-widest bg-white/40 shadow-2xl">
                <div>DOKUMEN {item.klasifikasiAkses}</div>
                <div className="text-sm font-bold mt-1 text-slate-900">DEPO ARSIP TERPADU 2026</div>
                <div className="text-xs font-mono mt-1 text-rose-800">PETUGAS: {currentUser?.name || 'OTENTIKASI RESMI'}</div>
              </div>
            </div>
          )}

          {isLoadingPreview ? (
            <div className="text-center p-8 space-y-2">
              <Loader2 className="w-8 h-8 text-blue-500 mx-auto animate-spin" />
              <p className="text-xs text-slate-600 font-bold">Memuat dokumen dari server...</p>
            </div>
          ) : !canPreviewInline ? (
            // Word/Excel tidak punya renderer bawaan browser -- tampilkan
            // kartu info + tombol unduh, bukan iframe kosong/rusak.
            <div className="text-center p-8 space-y-3 bg-white rounded-xl border border-slate-300 shadow-inner max-w-sm">
              {attachmentInfo.icon}
              <div>
                <p className="text-sm font-bold text-slate-800">{fileName}</p>
                <p className="text-xs text-slate-500 mt-1">
                  Pratinjau langsung belum didukung untuk {attachmentInfo.label.toLowerCase()}. Unduh berkas untuk membukanya di aplikasi Word/Excel Anda.
                </p>
              </div>
              {canDownload && (
                <button
                  onClick={handleDownloadPdf}
                  disabled={isDownloading}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-bold rounded-xl text-xs cursor-pointer shadow-xs transition-all"
                >
                  {isDownloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                  <span>{isDownloading ? 'Mengunduh...' : `Unduh ${attachmentInfo.label}`}</span>
                </button>
              )}
            </div>
          ) : pdfPreviewSrc ? (
            <iframe
              src={pdfPreviewSrc}
              title={fileName}
              className="w-full h-full rounded-xl border border-slate-300 bg-white shadow-inner"
              style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'center top' }}
            />
          ) : (
            <div className="text-center p-8 space-y-2">
              <FileText className="w-12 h-12 text-slate-400 mx-auto" />
              <p className="text-xs text-slate-600 font-bold">
                {previewError || 'File tidak dapat dimuat atau rusak.'}
              </p>
            </div>
          )}
        </div>

        {/* Footer Info Bar */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-slate-600 shrink-0">
          <p className="truncate max-w-md">
            <strong>Perihal:</strong> {item.perihal}
          </p>

          <div className="flex items-center gap-3 font-mono shrink-0">
            <span className="inline-flex items-center gap-1"><HardDrive className="w-3.5 h-3.5" /> STORAGE: <strong className="text-blue-700">/documents/{item.id}</strong></span>
            <span>BOKS: <strong>{item.noDus}</strong></span>
          </div>
        </div>

      </div>
    </div>
  );
};
