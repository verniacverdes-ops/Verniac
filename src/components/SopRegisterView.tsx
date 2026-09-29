import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Plus,
  Trash2,
  FileText,
  Upload,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Search,
  MoreVertical,
  Info,
  Pencil,
} from 'lucide-react';

// =====================================================================
// SopRegisterView.tsx
// "REGISTER SOP KEPALA BADAN TAHUN 2025" — tabel terpisah/berdiri
// sendiri sesuai permintaan (bukan bagian dari tabel Arsip yang sudah
// ada). Dibuat mandiri (tidak mengimpor ../types atau ../lib/permissions)
// karena kedua file itu tidak ada di dalam paket proyek yang diunggah,
// jadi komponen ini bisa langsung ditempel tanpa menunggu file lain.
//
// Cara pasang ke App.tsx Anda (3 langkah):
//   1) import { SopRegisterView } from './components/SopRegisterView';
//   2) Tambahkan 'sop-register' ke union type MainViewTab di types.ts
//   3) Render <SopRegisterView /> saat activeTab === 'sop-register',
//      dan tambahkan menu "Register SOP" di Sidebar.tsx (lihat contoh
//      di bagian bawah file ini / pesan chat).
// =====================================================================

interface SopRow {
  id: string;
  no: string; // biasanya angka urut, tapi dibuat teks agar bisa "1", "1a", dst.
  noKeputusan: string;
  tentang: string;
  fileName: string; // nama file yang diupload
  fileUrl: string; // link manual (kalau diisi tangan), KOSONG kalau file disimpan di IndexedDB
  storedInIdb?: boolean; // true = file PDF-nya disimpan di IndexedDB (bukan base64 di localStorage)
  sourceFile?: string; // nama file asli di folder public/sop-files/ (untuk fitur "Import Otomatis")
  keterangan: string;
}

// =====================================================================
// Penyimpanan file PDF via IndexedDB
// File PDF (SK + lampiran) ukurannya bisa besar (rata-rata beberapa MB,
// total ratusan MB kalau diupload semua) — jauh melebihi kapasitas
// localStorage (~5-10MB). Jadi isi teks tabel tetap di localStorage
// seperti sebelumnya, tapi berkas PDF-nya disimpan terpisah di
// IndexedDB (kapasitas jauh lebih besar), dikunci per id baris.
// =====================================================================
const IDB_NAME = 'sop_register_files_db';
const IDB_STORE = 'files';

function openSopFilesDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbPutFile(rowId: string, file: File): Promise<void> {
  const db = await openSopFilesDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).put(file, rowId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

async function idbGetFile(rowId: string): Promise<File | undefined> {
  const db = await openSopFilesDb();
  const result = await new Promise<File | undefined>((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readonly');
    const req = tx.objectStore(IDB_STORE).get(rowId);
    req.onsuccess = () => resolve(req.result as File | undefined);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return result;
}

async function idbDeleteFile(rowId: string): Promise<void> {
  const db = await openSopFilesDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).delete(rowId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

// Menyamakan nama file dengan kolom "Tentang" supaya upload massal bisa
// otomatis mencocokkan tiap PDF ke barisnya masing-masing.
// Pola nama file asli: "013 - SK + LAMPIRAN SOP PENGENDALIAN, ... .pdf"
// atau "013 - SK SOP ANALISIS POTENSI PAJAK DAERAH.pdf" (kadang ada
// " (1)" di belakang untuk file duplikat).
function normalizeForMatch(text: string): string {
  return text
    .replace(/\.pdf$/i, '')
    .replace(/^\d+\s*-\s*SK(\s*\+\s*LAMPIRAN)?\s*/i, '')
    .replace(/\s*\(\d+\)\s*$/, '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, ' ');
}

interface SopSection {
  id: string;
  kode: string; // A, B, C, D, E ...
  judul: string;
  rows: SopRow[];
}

const STORAGE_KEY = 'sop_register_kepala_badan_2025_v1';

const uid = () => Math.random().toString(36).slice(2, 10);

const emptyRow = (no: string): SopRow => ({
  id: uid(),
  no,
  noKeputusan: '',
  tentang: '',
  fileName: '',
  fileUrl: '',
  storedInIdb: false,
  sourceFile: undefined,
  keterangan: '',
});

// Struktur awal persis sesuai foto register yang diberikan.
// Jumlah baris kosong per bagian mengikuti jumlah baris pada foto,
// silakan tambah/kurangi lewat tombol "Tambah Baris" di tiap bagian.
const buildInitialSections = (): SopSection[] => [
  {
    id: uid(),
    kode: 'A',
    judul: 'SOP SEKRETARIAT',
    rows: [
      { id: uid(), no: '1', noKeputusan: '000.5.3/5297.001-Bappenda/2025', tentang: 'SOP PENGELOLAAN ARSIP', fileName: '', fileUrl: '', keterangan: '', sourceFile: '001 - SK + LAMPIRAN SOP PENGELOLAAN ARSIP.pdf' },
      { id: uid(), no: '2', noKeputusan: '000.5.3/5297.002-Bappenda/2025', tentang: 'SOP PENGELOLAAN PERSURATAN', fileName: '', fileUrl: '', keterangan: '', sourceFile: '002 - SK + LAMPIRAN SOP PENGELOLAAN PERSURATAN.pdf' },
      { id: uid(), no: '3', noKeputusan: '000.3.2/5297.003-Bappenda/2025', tentang: 'SOP PENGELOLAAN PENGADAAN BARANG DAN JASA', fileName: '', fileUrl: '', keterangan: '', sourceFile: '003 - SK + LAMPIRAN SOP PENGELOLAAN PENGADAAN BARANG DAN JASA.pdf' },
      { id: uid(), no: '4', noKeputusan: '000.2.2/5297.004-Bappenda/2025', tentang: 'SOP PEMELIHARAAN BARANG MILIK DAERAH (BMD)', fileName: '', fileUrl: '', keterangan: '', sourceFile: '004 - SK + LAMPIRAN SOP PEMELIHARAAN BARANG MILIK DAERAH (BMD).pdf' },
      { id: uid(), no: '5', noKeputusan: '000.2.1/5297.005-Bappenda/2025', tentang: 'SOP PENATAUSAHAAN DAN PELAPORAN BARANG MILIK DAERAH (BMD)', fileName: '', fileUrl: '', keterangan: '', sourceFile: '005 - SK + LAMPIRAN SOP PENATAUSAHAAN DAN PELAPORAN BARANG MILIK DAERAH (BMD).pdf' },
      { id: uid(), no: '6', noKeputusan: '000.2.4/5297.006-Bappenda/2025', tentang: 'SOP PENGUSULAN PEMINDAHTANGANAN DAN PEMUSNAHAN BARANG MILIK DAERAH (BMD)', fileName: '', fileUrl: '', keterangan: '', sourceFile: '006 - SK + LAMPIRAN SOP PENGUSULAN PEMINDAHTANGANAN DAN PEMUSNAHAN BARANG MILIK DAERAH (BMD).pdf' },
      { id: uid(), no: '7', noKeputusan: '000.3.1/5297.007-Bappenda/2025', tentang: 'SOP PERENCANAAN PENGADAAN DAN PEMELIHARAAN BARANG MILIK DAERAH (BMD)', fileName: '', fileUrl: '', keterangan: '', sourceFile: '007 - SK + LAMPIRAN SOP PERENCANAAN PENGADAAN DAN PEMELIHARAAN BARANG MILIK DAERAH (BMD).pdf' },
      { id: uid(), no: '8', noKeputusan: '800.1.11.13/5297.008-Bappenda/2025', tentang: 'SOP PELAYANAN KENAIKAN GAJI BERKALA', fileName: '', fileUrl: '', keterangan: '', sourceFile: '008 - SK + LAMPIRAN SOP PELAYANAN KENAIKAN GAJI BERKALA.pdf' },
      { id: uid(), no: '9', noKeputusan: '800.1.11/5297.009-Bappenda/2025', tentang: 'SOP PELAYANAN IZIN CUTI ASN', fileName: '', fileUrl: '', keterangan: '', sourceFile: '009 - SK + LAMPIRAN SOP PELAYANAN IZIN CUTI ASN.pdf' },
      { id: uid(), no: '10', noKeputusan: '800.1.11/5297.010-Bappenda/2025', tentang: 'SOP PELAYANAN IZIN BELAJAR', fileName: '', fileUrl: '', keterangan: '', sourceFile: '010 - SK + LAMPIRAN SOP PELAYANAN IZIN BELAJAR.pdf' },
      { id: uid(), no: '11', noKeputusan: '800.1.11/5297.011-Bappenda/2025', tentang: 'SOP PELAYANAN PENERBITAN SURAT KETERANGAN UNTUK MENDAPATKAN PEMBAYARAN TUNJANGAN KELUARGA', fileName: '', fileUrl: '', keterangan: '', sourceFile: '011 - SK + LAMPIRAN SOP PELAYANAN PENERBITAN SURAT KETERANGAN UNTUK MENDAPATKAN PEMBAYARAN TUNJANGAN KELUARGA.pdf' },
      { id: uid(), no: '12', noKeputusan: '800.1.3.2/5297.012-Bappenda/2025', tentang: 'SOP UJIAN DINAS DAN UJIAN PENYESUAIAN KENAIKAN PANGKAT', fileName: '', fileUrl: '', keterangan: '', sourceFile: '012 - SK + LAMPIRAN SOP UJIAN DINAS DAN UJIAN PENYESUAIAN KENAIKAN PANGKAT.pdf' },
      { id: uid(), no: '13', noKeputusan: '800.1.11/5297.013-Bappenda/2025', tentang: 'SOP PENCANTUMAN GELAR AKADEMIK', fileName: '', fileUrl: '', keterangan: '', sourceFile: '013 - SK + LAMPIRAN SOP PENCANTUMAN GELAR AKADEMIK.pdf' },
      { id: uid(), no: '14', noKeputusan: '800.1.12.8/5297.014-Bappenda/2025', tentang: 'SOP PELAYANAN PENGUSULAN PENGHARGAAN SATYALANCANA KARYA SATYA', fileName: '', fileUrl: '', keterangan: '', sourceFile: '014 - SK + LAMPIRAN SOP PELAYANAN PENGUSULAN PENGHARGAAN SATYALANCANA KARYA SATYA.pdf' },
      { id: uid(), no: '15', noKeputusan: '800.1.1.4/5297.015-Bappenda/2025', tentang: 'SOP PENGEMBANGAN KOMPETENSI SUMBER DAYA MANUSIA BAPPENDA', fileName: '', fileUrl: '', keterangan: '', sourceFile: '015 - SK + LAMPIRAN SOP PENGEMBANGAN KOMPETENSI SUMBER DAYA MANUSIA BAPPENDA.pdf' },
      { id: uid(), no: '16', noKeputusan: '800.1.3.1/5297.016-Bappenda/2025', tentang: 'SOP PENGELOLAAN MUTASI ASN ALIH TUGAS INTERN DI LINGKUNGAN BAPPENDA', fileName: '', fileUrl: '', keterangan: '', sourceFile: '016 - SK + LAMPIRAN SOP PENGELOLAAN MUTASI ASN ALIH TUGAS INTERN DI LINGKUNGAN BAPPENDA.pdf' },
      { id: uid(), no: '17', noKeputusan: '800.1.5.3/5297.017-Bappenda/2025', tentang: 'SOP PENILAIAN KINERJA TAHUNAN SDM BAPPENDA', fileName: '', fileUrl: '', keterangan: '', sourceFile: '017 - SK + LAMPIRAN SOP PENILAIAN KINERJA TAHUNAN SDM BAPPENDA.pdf' },
      { id: uid(), no: '18', noKeputusan: '800.1.3.2/5297.018-Bappenda/2025', tentang: 'SOP PENGELOLAAN KENAIKAN PANGKAT', fileName: '', fileUrl: '', keterangan: '', sourceFile: '018 - SK + LAMPIRAN SOP PENGELOLAAN KENAIKAN PANGKAT.pdf' },
      { id: uid(), no: '19', noKeputusan: '800.1.5.3/5297.019-Bappenda/2025', tentang: 'SOP PELAKSANAAN VERIFIKASI DAN EVALUASI LAPORAN KEHADIRAN DAN KINERJA PEGAWAI SEBAGAI DASAR PEMBERIAN TAMBAHAN PENGHASILAN PEGAWAI', fileName: '', fileUrl: '', keterangan: '', sourceFile: '019 - SK + LAMPIRAN SOP PELAKSANAAN VERIFIKASI DAN EVALUASI LAPORAN KEHADIRAN DAN KINERJA PEGAWAI SEBAGAI DASAR PEMBERIAN TAMBAHAN PENGHASILAN PEGAWAI.pdf' },
      { id: uid(), no: '20', noKeputusan: '800.1.10.3/5297.020-Bappenda/2025', tentang: 'SOP REKONSILIASI DATA KEPEGAWAIAN DAN DATA GAJI ASN', fileName: '', fileUrl: '', keterangan: '', sourceFile: '020 - SK + LAMPIRAN SOP REKONSILIASI DATA KEPEGAWAIAN DAN DATA GAJI ASN.pdf' },
      { id: uid(), no: '21', noKeputusan: '000.1.2.3/5297.021-Bappenda/2025', tentang: 'SOP PENGELOLAAN PERINTAH PERJALANAN DINAS', fileName: '', fileUrl: '', keterangan: '', sourceFile: '021 - SK + LAMPIRAN SOP PENGELOLAAN PERINTAH PERJALANAN DINAS.pdf' },
      { id: uid(), no: '22', noKeputusan: '800.1.1.1/5297.022-Bappenda/2025', tentang: 'SOP PENYUSUNAN PROYEKSI KEBUTUHAN APARATUR SIPIL NEGARA (ASN) BAPPENDA', fileName: '', fileUrl: '', keterangan: '', sourceFile: '022 - SK + LAMPIRAN SOP PENYUSUNAN PROYEKSI KEBUTUHAN APARATUR SIPIL NEGARA (ASN) BAPPENDA.pdf' },
      { id: uid(), no: '24', noKeputusan: '800.1.6/5297.024-Bappenda/2025', tentang: 'SOP PENGELOLAAN ADMINISTRASI PEMBERHENTIAN ASN', fileName: '', fileUrl: '', keterangan: '', sourceFile: '023 - SK + LAMPIRAN SOP PENGELOLAAN ADMINISTRASI PEMBERHENTIAN ASN.pdf' },
      { id: uid(), no: '26', noKeputusan: '800.2.2/5297.026-Bappenda/2025', tentang: 'SOP ANALISIS KEBUTUHAN PENGEMBANGAN KOMPETENSI SUMBER DAYA MANUSIA', fileName: '', fileUrl: '', keterangan: '', sourceFile: '024 - SK + LAMPIRAN SOP ANALISIS KEBUTUHAN PENGEMBANGAN KOMPETENSI SUMBER DAYA MANUSIA.pdf' },
      { id: uid(), no: '27', noKeputusan: '900.1.15.5/5297.027-Bappenda/2025', tentang: 'SOP VERIFIKASI SURAT PERTANGGUNGJAWABAN (SPJ) KEUANGAN', fileName: '', fileUrl: '', keterangan: '', sourceFile: '025 - SK + LAMPIRAN SOP VERIFIKASI SURAT PERTANGGUNGJAWABAN (SPJ) KEUANGAN.pdf' },
      { id: uid(), no: '28', noKeputusan: '900.1.3.1/5297.028-Bappenda/2025', tentang: 'SOP PENERBITAN SPP, SPM DAN SP2D PEMBAYARAN GU, LS BARANG DAN JASA', fileName: '', fileUrl: '', keterangan: '', sourceFile: '026 - SK + LAMPIRAN SOP PENERBITAN SPP, SPM DAN SP2D PEMBAYARAN GU, LS BARANG DAN JASA.pdf' },
      { id: uid(), no: '29', noKeputusan: '900.1.3.7/5297.029-Bappenda/2025', tentang: 'SOP PEMBAYARAN GAJI, TUNJANGAN PENGHASILAN DAN INSENTIF PEGAWAI', fileName: '', fileUrl: '', keterangan: '', sourceFile: '027 - SK + LAMPIRAN SOP PEMBAYARAN GAJI, TUNJANGAN PENGHASILAN DAN INSENTIF PEGAWAI.pdf' },
      { id: uid(), no: '30', noKeputusan: '900.1.6.4/5297.030-Bappenda/2025', tentang: 'SOP PENYUSUNAN LAPORAN PROGNOSIS REALISASI ANGGARAN', fileName: '', fileUrl: '', keterangan: '', sourceFile: '028 - SK + LAMPIRAN SOP PENYUSUNAN LAPORAN PROGNOSIS REALISASI ANGGARAN.pdf' },
      { id: uid(), no: '31', noKeputusan: '900.1.3.10/5297.031-Bappenda/2025', tentang: 'SOP PENYUSUNAN LAPORAN KEUANGAN', fileName: '', fileUrl: '', keterangan: '', sourceFile: '029 - SK + LAMPIRAN SOP PENYUSUNAN LAPORAN KEUANGAN.pdf' },
      { id: uid(), no: '32', noKeputusan: '900.1.13/5297.032-Bappenda/2025', tentang: 'SOP PENATAUSAHAAN DAN PERTANGGUNGJAWABAN PENERIMAAN PENDAPATAN DAERAH', fileName: '', fileUrl: '', keterangan: '', sourceFile: '030 - SK + LAMPIRAN SOP PENATAUSAHAAN DAN PERTANGGUNGJAWABAN PENERIMAAN PENDAPATAN DAERAH.pdf' },
      { id: uid(), no: '33', noKeputusan: '900.1.2/5297.033-Bappenda/2025', tentang: 'SOP PENYUSUNAN DOKUMEN PERENCANAAN BAPPENDA', fileName: '', fileUrl: '', keterangan: '', sourceFile: '031 - SK + LAMPIRAN SOP PENYUSUNAN DOKUMEN PERENCANAAN BAPPENDA.pdf' },
      { id: uid(), no: '34', noKeputusan: '000.8.5/5297.034-Bappenda/2025', tentang: 'SOP PENGELOLAAN MONITORING DAN EVALUASI PROGRAM, ANGGARAN, DAN KINERJA', fileName: '', fileUrl: '', keterangan: '', sourceFile: '032 - SK + LAMPIRAN SOP PENGELOLAAN MONITORING DAN EVALUASI PROGRAM, ANGGARAN, DAN KINERJA.pdf' },
      { id: uid(), no: '35', noKeputusan: '900.1.11/5297.035-Bappenda/2025', tentang: 'SOP MONITORING CONTROLLING SURVEILLANCE FOR PREVENTION KOMISI PEMBERANTASAN KORUPSI', fileName: '', fileUrl: '', keterangan: '', sourceFile: '033 - SK + LAMPIRAN SOP MONITORING CONTROLLING SURVEILLANCE FOR PREVENTION KOMISI PEMBERANTASAN KORUPSI.pdf' },
      { id: uid(), no: '36', noKeputusan: '000.8.6.3/5297.036-Bappenda/2025', tentang: 'SOP PENYUSUNAN LAPORAN KINERJA INSTANSI PEMERINTAHAN (LKIP)', fileName: '', fileUrl: '', keterangan: '', sourceFile: '034 - SK + LAMPIRAN SOP PENYUSUNAN LAPORAN KINERJA INSTANSI PEMERINTAHAN (LKIP).pdf' },
      { id: uid(), no: '37', noKeputusan: '000.8.6.3/5297.037-Bappenda/2025', tentang: 'SOP PENGELOLAAN TINDAK LANJUT HASIL SURVEI KEPUASAN MASYARAKAT', fileName: '', fileUrl: '', keterangan: '', sourceFile: '035 - SK + LAMPIRAN SOP PENGELOLAAN TINDAK LANJUT HASIL SURVEI KEPUASAN MASYARAKAT.pdf' },
      { id: uid(), no: '38', noKeputusan: '700.1.2.4/5297.038-Bappenda/2025', tentang: 'SOP PENGELOLAAN SISTEM PENGELOLAAN PENGADUAN PELAYANAN PUBLIK NASIONAL LAYANAN ASPIRASI DAN PENGADUAN ONLINE RAKYAT (SP4N LAPOR)', fileName: '', fileUrl: '', keterangan: '', sourceFile: '036 - SK + LAMPIRAN SOP PENGELOLAAN SISTEM PENGELOLAAN PENGADUAN PELAYANAN PUBLIK NASIONAL LAYANAN ASPIRASI DAN PENGADUAN ONLINE RAKYAT (SP4N LAPOR).pdf' },
      { id: uid(), no: '39', noKeputusan: '900.1.1.2/5297.039-Bappenda/2025', tentang: 'SOP PENYUSUNAN RENCANA KERJA DAN ANGGARAN', fileName: '', fileUrl: '', keterangan: '', sourceFile: '037 - SK + LAMPIRAN SOP PENYUSUNAN RENCANA KERJA DAN ANGGARAN.pdf' },
      { id: uid(), no: '40', noKeputusan: '900.1.2.4/5297.040-Bappenda/2025', tentang: 'SOP PENYUSUNAN DOKUMEN PELAKSANAAN ANGGARAN', fileName: '', fileUrl: '', keterangan: '', sourceFile: '038 - SK + LAMPIRAN SOP PENYUSUNAN DOKUMEN PELAKSANAAN ANGGARAN.pdf' },
      { id: uid(), no: '41', noKeputusan: '000.8.6.3/5297.041-Bappenda/2025', tentang: 'SOP PENGELOLAAN MANAJEMEN RISIKO', fileName: '', fileUrl: '', keterangan: '', sourceFile: '039 - SK + LAMPIRAN SOP PENGELOLAAN MANAJEMEN RISIKO.pdf' },
      { id: uid(), no: '42', noKeputusan: '000.8.6.3/5297.042-Bappenda/2025', tentang: 'SOP PENYIAPAN BAHAN PENILAIAN REFORMASI BIROKRASI', fileName: '', fileUrl: '', keterangan: '', sourceFile: '040 - SK + LAMPIRAN SOP PENYIAPAN BAHAN PENILAIAN REFORMASI BIROKRASI.pdf' },
      { id: uid(), no: '43', noKeputusan: '700.1.2.4/5297.043-Bappenda/2025', tentang: 'SOP PENGELOLAAN LAYANAN INFORMASI DAN PENGADUAN', fileName: '', fileUrl: '', keterangan: '', sourceFile: '041 - SK + LAMPIRAN SOP PENGELOLAAN LAYANAN INFORMASI DAN PENGADUAN.pdf' },
    ],
  },
  {
    id: uid(),
    kode: 'B',
    judul: 'SOP BIDANG PERENCANAAN DAN PENGEMBANGAN',
    rows: [
      { id: uid(), no: '1', noKeputusan: '900.1.13.1/5298.001-Bappenda/2025', tentang: 'SOP ANALISIS POTENSI PAJAK DAERAH', fileName: '', fileUrl: '', keterangan: '', sourceFile: '001 - SK SOP ANALISIS POTENSI PAJAK DAERAH.pdf' },
      { id: uid(), no: '2', noKeputusan: '900.1.13.1/5298.002-Bappenda/2025', tentang: 'SOP PENYUSUNAN TARGET PAJAK DAERAH', fileName: '', fileUrl: '', keterangan: '', sourceFile: '002 - SK SOP PENYUSUNAN TARGET PAJAK DAERAH.pdf' },
      { id: uid(), no: '3', noKeputusan: '900.1.13.1/5298.003-Bappenda/2025', tentang: 'SOP PERENCANAAN TARGET PAJAK DAERAH', fileName: '', fileUrl: '', keterangan: '', sourceFile: '003 - SK SOP PERENCANAAN TARGET PAJAK DAERAH.pdf' },
      { id: uid(), no: '4', noKeputusan: '900.1.13.1/5298.004-Bappenda/2025', tentang: 'SOP PENYUSUNAN PERJANJIAN KERJA SAMA DI BIDANG PAJAK DAERAH', fileName: '', fileUrl: '', keterangan: '', sourceFile: '004 - SK + LAMPIRAN SOP PENYUSUNAN PERJANJIAN KERJA SAMA DI BIDANG PAJAK DAERAH.pdf' },
      { id: uid(), no: '5', noKeputusan: '100.3.2/5298.005-Bappenda/2025', tentang: 'SOP PENYUSUNAN PRODUK HUKUM DI BIDANG PAJAK DAERAH', fileName: '', fileUrl: '', keterangan: '', sourceFile: '005 - SK + LAMPIRAN SOP PENYUSUNAN PRODUK HUKUM DI BIDANG PAJAK DAERAH.pdf' },
      { id: uid(), no: '6', noKeputusan: '900.1.13.1/5298.006-Bappenda/2025', tentang: 'SOP KEGIATAN PENYULUHAN DAN PENYEBARLUASAN INFORMASI PAJAK DAERAH', fileName: '', fileUrl: '', keterangan: '', sourceFile: '006 - SK + LAMPIRAN SOP KEGIATAN PENYULUHAN DAN PENYEBARLUASAN INFORMASI PAJAK DAERAH.pdf' },
      { id: uid(), no: '7', noKeputusan: '900.1.13.1/5298.007-Bappenda/2025', tentang: 'SOP PENGELOLAAN DAN PEMELIHARAAN SISTEM INFORMASI PAJAK DAERAH', fileName: '', fileUrl: '', keterangan: '', sourceFile: '007 - SK + LAMPIRAN SOP PENGELOLAAN DAN PEMELIHARAAN SISTEM INFORMASI PAJAK DAERAH.pdf' },
      { id: uid(), no: '8', noKeputusan: '900.1.15.5/5298.008-Bappenda/2025', tentang: 'SOP DISASTER RECOVERY PLAN DAN BACKUP DATA', fileName: '', fileUrl: '', keterangan: '', sourceFile: '008 - SK + LAMPIRAN SOP DISASTER RECOVERY PLAN DAN BACKUP DATA.pdf' },
      { id: uid(), no: '9', noKeputusan: '900.1.13.1/5298.009-Bappenda/2025', tentang: 'SOP PEMBANGUNAN SISTEM INFORMASI PAJAK DAERAH', fileName: '', fileUrl: '', keterangan: '', sourceFile: '009 - SK + LAMPIRAN SOP PEMBANGUNAN SISTEM INFORMASI PAJAK DAERAH.pdf' },
      { id: uid(), no: '10', noKeputusan: '900.1.13.1/5298.010-Bappenda/2025', tentang: 'SOP PENGEMBANGAN SISTEM INFORMASI PAJAK DAERAH', fileName: '', fileUrl: '', keterangan: '', sourceFile: '010 - SK + LAMPIRAN SOP PENGEMBANGAN SISTEM INFORMASI PAJAK DAERAH.pdf' },
      { id: uid(), no: '11', noKeputusan: '900.1.13.1/5298.011-Bappenda/2025', tentang: 'SOP PENGELOLAAN WEBSITE DAN SOSIAL MEDIA BADAN PENDAPATAN DAERAH', fileName: '', fileUrl: '', keterangan: '', sourceFile: '011 - SK + LAMPIRAN SOP PENGELOLAAN WEBSITE DAN SOSIAL MEDIA BADAN PENDAPATAN DAERAH.pdf' },
      { id: uid(), no: '12', noKeputusan: '900.1.13.1/5298.012-Bappenda/2025', tentang: 'SOP PERENCANAAN SARANA DAN PRASARANA SISTEM INFORMASI PAJAK DAERAH', fileName: '', fileUrl: '', keterangan: '', sourceFile: '012 - SK + LAMPIRAN SOP PERENCANAAN SARANA DAN PRASARANA SISTEM INFORMASI PAJAK DAERAH.pdf' },
      { id: uid(), no: '13', noKeputusan: '000.8.6.3/5298.013-Bappenda/2025', tentang: 'SOP PELAKSANAAN SURVEI KEPUASAN MASYARAKAT', fileName: '', fileUrl: '', keterangan: '', sourceFile: '013 - SK + LAMPIRAN SOP PELAKSANAAN SURVEI KEPUASAN MASYARAKAT.pdf' },
    ],
  },
  {
    id: uid(),
    kode: 'C',
    judul: 'SOP BIDANG PENDATAAN DAN PENILAIAN',
    rows: [
      { id: uid(), no: '1', noKeputusan: '900.1.13.1/5299.001-Bappenda/2025', tentang: 'SOP PENDAFTARAN OBJEK DAN SUBJEK PBB P2', fileName: '', fileUrl: '', keterangan: '', sourceFile: '001 - SK + LAMPIRAN SOP PENDAFTARAN OBJEK DAN SUBJEK PBB P2.pdf' },
      { id: uid(), no: '2', noKeputusan: '900.1.13.1/5299.002-Bappenda/2025', tentang: 'SOP PENDAFTARAN OBJEK DAN SUBJEK PBJT INSIDENTIL', fileName: '', fileUrl: '', keterangan: '', sourceFile: '002 - SK + LAMPIRAN SOP PENDAFTARAN OBJEK DAN SUBJEK PBJT INSIDENTIL.pdf' },
      { id: uid(), no: '3', noKeputusan: '900.1.13.1/5299.003-Bappenda/2025', tentang: 'SOP PENDAFTARAN OBJEK DAN SUBJEK PBJT, MBLB DAN PAT', fileName: '', fileUrl: '', keterangan: '', sourceFile: '003 - SK + LAMPIRAN SOP PENDAFTARAN OBJEK DAN SUBJEK PBJT, MBLB DAN PAT.pdf' },
      { id: uid(), no: '4', noKeputusan: '900.1.13.1/5299.004-Bappenda/2025', tentang: 'SOP PEMUTAKHIRAN DATA PBB P2', fileName: '', fileUrl: '', keterangan: '', sourceFile: '004 - SK + LAMPIRAN SOP PEMUTAKHIRAN DATA PBB P2.pdf' },
      { id: uid(), no: '5', noKeputusan: '900.1.13.1/5299.005-Bappenda/2025', tentang: 'SOP INTENSIFIKASI PBJT', fileName: '', fileUrl: '', keterangan: '', sourceFile: '005 - SK + LAMPIRAN SOP INTENSIFIKASI PBJT.pdf' },
      { id: uid(), no: '6', noKeputusan: '900.1.13.1/5299.006-Bappenda/2025', tentang: 'SOP INTENSIFIKASI PAJAK MBLB', fileName: '', fileUrl: '', keterangan: '', sourceFile: '006 - SK + LAMPIRAN SOP INTENSIFIKASI PAJAK MBLB.pdf' },
      { id: uid(), no: '7', noKeputusan: '900.1.13.1/5299.007-Bappenda/2025', tentang: 'SOP INTENSIFIKASI PAJAK AIR TANAH', fileName: '', fileUrl: '', keterangan: '', sourceFile: '007 - SK + LAMPIRAN SOP INTENSIFIKASI PAJAK AIR TANAH.pdf' },
      { id: uid(), no: '8', noKeputusan: '900.1.13.1/5299.008-Bappenda/2025', tentang: 'SOP PEMBENTUKAN DATA PBB P2', fileName: '', fileUrl: '', keterangan: '', sourceFile: '008 - SK + LAMPIRAN SOP PEMBENTUKAN DATA PBB P2.pdf' },
      { id: uid(), no: '9', noKeputusan: '900.1.13.1/5299.009-Bappenda/2025', tentang: 'SOP EKSTENSIFIKASI PBJT', fileName: '', fileUrl: '', keterangan: '', sourceFile: '009 - SK + LAMPIRAN SOP EKSTENSIFIKASI PBJT.pdf' },
      { id: uid(), no: '10', noKeputusan: '900.1.13.1/5299.010-Bappenda/2025', tentang: 'SOP EKSTENSIFIKASI PAJAK REKLAME', fileName: '', fileUrl: '', keterangan: '', sourceFile: '010 - SK + LAMPIRAN SOP EKSTENSIFIKASI PAJAK REKLAME.pdf' },
      { id: uid(), no: '11', noKeputusan: '900.1.13.1/5299.011-Bappenda/2025', tentang: 'SOP EKSTENSIFIKASI PAJAK MBLB', fileName: '', fileUrl: '', keterangan: '', sourceFile: '011 - SK + LAMPIRAN SOP EKSTENSIFIKASI PAJAK MBLB.pdf' },
      { id: uid(), no: '12', noKeputusan: '900.1.13.1/5299.012-Bappenda/2025', tentang: 'SOP EKSTENSIFIKASI PAJAK AIR TANAH', fileName: '', fileUrl: '', keterangan: '', sourceFile: '012 - SK + LAMPIRAN SOP EKSTENSIFIKASI PAJAK AIR TANAH.pdf' },
      { id: uid(), no: '13', noKeputusan: '900.1.13.1/5299.013-Bappenda/2025', tentang: 'SOP PELAPORAN DATA OMSET DAN NILAI PAJAK', fileName: '', fileUrl: '', keterangan: '', sourceFile: '013 - SK + LAMPIRAN SOP PELAPORAN DATA OMSET DAN NILAI PAJAK.pdf' },
      { id: uid(), no: '14', noKeputusan: '900.1.13.1/5299.014-Bappenda/2025', tentang: 'SOP PENETAPAN WAJIB PAJAK SECARA JABATAN PBJT, MBLB DAN PAT', fileName: '', fileUrl: '', keterangan: '', sourceFile: '014 - SK + LAMPIRAN SOP PENETAPAN WAJIB PAJAK SECARA JABATAN PBJT, MBLB DAN PAT.pdf' },
      { id: uid(), no: '16', noKeputusan: '900.1.13.1/5299.016-Bappenda/2025', tentang: 'SOP PENERBITAN DAN PENDISTRIBUSIAN SURAT TEGURAN TIDAK LAPOR SPTPD', fileName: '', fileUrl: '', keterangan: '', sourceFile: '015 - SK + LAMPIRAN SOP PENERBITAN DAN PENDISTRIBUSIAN SURAT TEGURAN TIDAK LAPOR SPTPD.pdf' },
      { id: uid(), no: '17', noKeputusan: '900.1.13.1/5299.017-Bappenda/2025', tentang: 'SOP PENDATAAN OBJEK BPHTB', fileName: '', fileUrl: '', keterangan: '', sourceFile: '016 - SK + LAMPIRAN SOP PENDATAAN OBJEK BPHTB.pdf' },
      { id: uid(), no: '18', noKeputusan: '900.1.13.1/5299.018-Bappenda/2025', tentang: 'SOP PENILAIAN OBJEK PBB P2', fileName: '', fileUrl: '', keterangan: '', sourceFile: '017 - SK + LAMPIRAN SOP PENILAIAN OBJEK PBB P2.pdf' },
      { id: uid(), no: '19', noKeputusan: '900.1.13.1/5299.019-Bappenda/2025', tentang: 'SOP PEMUTAHIRAN NILAI INDIKASI RATA-RATA DAN ZONA NILAI TANAH', fileName: '', fileUrl: '', keterangan: '', sourceFile: '018 - SK + LAMPIRAN SOP PEMUTAHIRAN NILAI INDIKASI RATA-RATA DAN ZONA NILAI TANAH.pdf' },
      { id: uid(), no: '20', noKeputusan: '900.1.13.1/5299.020-Bappenda/2025', tentang: 'SOP PEMUTAHIRAN DATA DAFTAR BIAYA KOMPONEN BANGUNAN (DBKB)', fileName: '', fileUrl: '', keterangan: '', sourceFile: '019 - SK + LAMPIRAN SOP PEMUTAHIRAN DATA DAFTAR BIAYA KOMPONEN BANGUNAN (DBKB).pdf' },
      { id: uid(), no: '21', noKeputusan: '900.1.13.1/5299.021-Bappenda/2025', tentang: 'SOP PENGELOLAAN, PEMELIHARAAN DAN PELAPORAN BASIS DATA PAJAK DAERAH', fileName: '', fileUrl: '', keterangan: '', sourceFile: '020 - SK + LAMPIRAN SOP PENGELOLAAN, PEMELIHARAAN DAN PELAPORAN BASIS DATA PAJAK DAERAH.pdf' },
      { id: uid(), no: '22', noKeputusan: '900.1.13.1/5299.022-Bappenda/2025', tentang: 'SOP PENERBITAN DAN PENCETAKAN SK PENGUKUHAN WAJIB PAJAK SERTA NPWPD', fileName: '', fileUrl: '', keterangan: '', sourceFile: '021 - SK + LAMPIRAN SOP PENERBITAN DAN PENCETAKAN SK PENGUKUHAN WAJIB PAJAK SERTA NPWPD.pdf' },
      { id: uid(), no: '23', noKeputusan: '900.1.13.1/5299.023-Bappenda/2025', tentang: 'SOP PENONAKTIFAN ATAU PENGHAPUSAN NPWPD', fileName: '', fileUrl: '', keterangan: '', sourceFile: '022 - SK + LAMPIRAN SOP PENONAKTIFAN ATAU PENGHAPUSAN NPWPD.pdf' },
      { id: uid(), no: '24', noKeputusan: '900.1.13.1/5299.024-Bappenda/2025', tentang: 'PENGOLAHAN DATA HASIL INTEGRASI', fileName: '', fileUrl: '', keterangan: '', sourceFile: '023 - SK + LAMPIRAN PENGOLAHAN DATA HASIL INTEGRASI.pdf' },
      { id: uid(), no: '25', noKeputusan: '900.1.13.1/5299.025-Bappenda/2025', tentang: 'SOP SIMULASI PENETAPAN PBB P2 TAHUN BERIKUTNYA', fileName: '', fileUrl: '', keterangan: '', sourceFile: '024 - SK + LAMPIRAN SOP SIMULASI PENETAPAN PBB P2 TAHUN BERIKUTNYA.pdf' },
      { id: uid(), no: '26', noKeputusan: '900.1.13.1/5299.026-Bappenda/2025', tentang: 'SOP PENYAMPAIAN DATA ATAS PERMOHONAN PIHAK EKSTERNAL', fileName: '', fileUrl: '', keterangan: '', sourceFile: '025 - SK + LAMPIRAN SOP PENYAMPAIAN DATA ATAS PERMOHONAN PIHAK EKSTERNAL.pdf' },
    ],
  },
  {
    id: uid(),
    kode: 'D',
    judul: 'SOP BIDANG PELAYANAN DAN PENETAPAN',
    rows: [
      { id: uid(), no: '1', noKeputusan: '900.1.13.1/5300.001-Bappenda/2025', tentang: 'SOP PENDAFTARAN OBJEK DAN SUBJEK PBB', fileName: '', fileUrl: '', keterangan: '', sourceFile: '001 - SK + LAMPIRAN SOP PENDAFTARAN OBJEK DAN SUBJEK PBB.pdf' },
      { id: uid(), no: '2', noKeputusan: '900.1.13.1/5300.002-Bappenda/2025', tentang: 'SOP PENDAFTARAN OBJEK DAN SUBJEK PBJT INSIDENTIL', fileName: '', fileUrl: '', keterangan: '', sourceFile: '002 - SK + LAMPIRAN SOP PENDAFTARAN OBJEK DAN SUBJEK PBJT INSIDENTIL (1).pdf' },
      { id: uid(), no: '3', noKeputusan: '900.1.13.1/5300.003-Bappenda/2025', tentang: 'SOP PENDAFTARAN OBJEK DAN SUBJEK PBJT, MBLB dan PAT', fileName: '', fileUrl: '', keterangan: '', sourceFile: '003 - SK + LAMPIRAN SOP PENDAFTARAN OBJEK DAN SUBJEK PBJT, MBLB dan PAT (1).pdf' },
      { id: uid(), no: '4', noKeputusan: '900.1.13.1/5300.004-Bappenda/2025', tentang: 'SOP INTENSIFIKASI PAJAK MBLB', fileName: '', fileUrl: '', keterangan: '', sourceFile: '004 - SK + LAMPIRAN SOP INTENSIFIKASI PAJAK MBLB.pdf' },
      { id: uid(), no: '5', noKeputusan: '900.1.13.1/5300.005-Bappenda/2025', tentang: 'SOP EKSTENSIFIKASI PAJAK REKLAME', fileName: '', fileUrl: '', keterangan: '', sourceFile: '005 - SK + LAMPIRAN SOP EKSTENSIFIKASI PAJAK REKLAME.pdf' },
      { id: uid(), no: '6', noKeputusan: '900.1.13.1/5300.006-Bappenda/2025', tentang: 'SOP USULAN PENETAPAN PAJAK TERHUTANG SECARA JABATAN', fileName: '', fileUrl: '', keterangan: '', sourceFile: '006 - SK + LAMPIRAN SOP USULAN PENETAPAN PAJAK TERHUTANG SECARA JABATAN.pdf' },
      { id: uid(), no: '7', noKeputusan: '900.1.13.1/5300.007-Bappenda/2025', tentang: 'SOP PENDATAAN OBJEK BPHTB', fileName: '', fileUrl: '', keterangan: '', sourceFile: '007 - SK + LAMPIRAN SOP PENDATAAN OBJEK BPHTB.pdf' },
      { id: uid(), no: '8', noKeputusan: '900.1.13.1/5300.008-Bappenda/2025', tentang: 'SOP PENERBITAN DAN PENCETAKAN SK PENGUKUHAN WAJIB PAJAK SERTA NPWPD', fileName: '', fileUrl: '', keterangan: '', sourceFile: '008 - SK + LAMPIRAN SOP PENERBITAN DAN PENCETAKAN SK PENGUKUHAN WAJIB PAJAK SERTA NPWPD.pdf' },
      { id: uid(), no: '9', noKeputusan: '900.1.13.1/5300.009-Bappenda/2025', tentang: 'SOP PENONAKTIFAN ATAU PENGHAPUSAN NPWPD', fileName: '', fileUrl: '', keterangan: '', sourceFile: '009 - SK + LAMPIRAN SOP PENONAKTIFAN ATAU PENGHAPUSAN NPWPD.pdf' },
      { id: uid(), no: '10', noKeputusan: '900.1.13.1/5300.010-Bappenda/2025', tentang: 'SOP SIMULASI PENETAPAN PBB P2 TAHUN BERIKUTNYA', fileName: '', fileUrl: '', keterangan: '', sourceFile: '010 - SK + LAMPIRAN SOP SIMULASI PENETAPAN PBB P2 TAHUN BERIKUTNYA.pdf' },
      { id: uid(), no: '11', noKeputusan: '900.1.13.1/5300.011-Bappenda/2025', tentang: 'SOP PENANGANAN PERMOHONAN KEBERATAN STPD KB BPHTB', fileName: '', fileUrl: '', keterangan: '', sourceFile: '011 - SK + LAMPIRAN SOP PENANGANAN PERMOHONAN KEBERATAN STPD KB BPHTB.pdf' },
      { id: uid(), no: '12', noKeputusan: '900.1.13.1/5300.012-Bappenda/2025', tentang: 'SOP PENANGANAN PERMOHONAN PEMBETULAN OBJEK DAN SUBJEK PBB P2 DENGAN MENGUBAH KETETAPAN', fileName: '', fileUrl: '', keterangan: '', sourceFile: '012 - SK + LAMPIRAN SOP PENANGANAN PERMOHONAN PEMBETULAN OBJEK DAN SUBJEK PBB P2 DENGAN MENGUBAH KETETAPAN.pdf' },
      { id: uid(), no: '13', noKeputusan: '900.1.13.1/5300.013-Bappenda/2025', tentang: 'SOP PENANGAN PERMOHONAN PENGURANGAN KETETAPAN PAJAK DAERAH', fileName: '', fileUrl: '', keterangan: '', sourceFile: '013 - SK + LAMPIRAN SOP PENANGAN PERMOHONAN PENGURANGAN KETETAPAN PAJAK DAERAH.pdf' },
      { id: uid(), no: '14', noKeputusan: '900.1.13.1/5300.014-Bappenda/2025', tentang: 'SOP PEMBATALAN KETETAPAN PBB P2', fileName: '', fileUrl: '', keterangan: '', sourceFile: '014 - SK + LAMPIRAN SOP PEMBATALAN KETETAPAN PBB P2.pdf' },
      { id: uid(), no: '15', noKeputusan: '900.1.13.1/5300.015-Bappenda/2025', tentang: 'SOP PEMBATALAN NOMOR BOOKING BPHTB', fileName: '', fileUrl: '', keterangan: '', sourceFile: '015 - SK + LAMPIRAN SOP PEMBATALAN NOMOR BOOKING BPHTB.pdf' },
      { id: uid(), no: '16', noKeputusan: '900.1.13.1/5300.016-Bappenda/2025', tentang: 'SOP PENANGANAN PERMOHONAN PENGHAPUSAN SANKSI ADMINISTRATIF PAJAK DAERAH', fileName: '', fileUrl: '', keterangan: '', sourceFile: '016 - SK + LAMPIRAN SOP PENANGANAN PERMOHONAN PENGHAPUSAN SANKSI ADMINISTRATIF PAJAK DAERAH.pdf' },
      { id: uid(), no: '17', noKeputusan: '900.1.13.1/5300.017-Bappenda/2025', tentang: 'SOP PENANGANAN PERMOHONAN RESTITUSI PAJAK DAERAH', fileName: '', fileUrl: '', keterangan: '', sourceFile: '017 - SK + LAMPIRAN SOP PENANGANAN PERMOHONAN RESTITUSI PAJAK DAERAH.pdf' },
      { id: uid(), no: '18', noKeputusan: '900.1.13.1/5300.018-Bappenda/2025', tentang: 'SOP PENANGANAN PERMOHONAN KERINGANAN PAJAK DAERAH', fileName: '', fileUrl: '', keterangan: '', sourceFile: '018 - SK + LAMPIRAN SOP PENANGANAN PERMOHONAN KERINGANAN PAJAK DAERAH.pdf' },
      { id: uid(), no: '19', noKeputusan: '900.1.13.1/5300.019-Bappenda/2025', tentang: 'SOP PENANGANAN PERMOHONAN PEMBEBASAN PAJAK DAERAH ATAS OBJEK PAJAK YANG DIKECUALIKAN', fileName: '', fileUrl: '', keterangan: '', sourceFile: '019 - SK + LAMPIRAN SOP PENANGANAN PERMOHONAN PEMBEBASAN PAJAK DAERAH ATAS OBJEK PAJAK YANG DIKECUALIKAN.pdf' },
      { id: uid(), no: '20', noKeputusan: '900.1.13.1/5300.020-Bappenda/2025', tentang: 'SOP PENANGANAN PERMOHONAN KOMPENSASI PAJAK DAERAH', fileName: '', fileUrl: '', keterangan: '', sourceFile: '020 - SK + LAMPIRAN SOP PENANGANAN PERMOHONAN KOMPENSASI PAJAK DAERAH.pdf' },
      { id: uid(), no: '21', noKeputusan: '900.1.13.1/5300.021-Bappenda/2025', tentang: 'SOP PENGENDALIAN PEMERIKSAAN DAN PENGAWASAN PAJAK DAERAH', fileName: '', fileUrl: '', keterangan: '', sourceFile: '021 - SK + LAMPIRAN SOP PENGENDALIAN PEMERIKSAAN DAN PENGAWASAN PAJAK DAERAH.pdf' },
    ],
  },
  {
    id: uid(),
    kode: 'E',
    judul: 'SOP BIDANG PENAGIHAN, KEBERATAN DAN PENGAWASAN PENDAPATAN DAERAH',
    rows: [
      { id: uid(), no: '1', noKeputusan: '900.1.13.1/5319.001-Bappenda/2025', tentang: 'SOP PENGADMINISTRASIAN DAN PENAGIHAN PIUTANG PAJAK DAERAH DENGAN JURU SITA', fileName: '', fileUrl: '', keterangan: '', sourceFile: '001 - SK + LAMPIRAN SOP PENGADMINISTRASIAN DAN PENAGIHAN PIUTANG PAJAK DAERAH DENGAN JURU SITA.pdf' },
      { id: uid(), no: '2', noKeputusan: '900.1.13.1/5319.002-Bappenda/2025', tentang: 'SOP PENGADMINISTRASIAN DAN PENAGIHAN PIUTANG PAJAK DAERAH DENGAN PROSES PERSIDANGAN', fileName: '', fileUrl: '', keterangan: '', sourceFile: '002 - SK + LAMPIRAN SOP PENGADMINISTRASIAN DAN PENAGIHAN PIUTANG PAJAK DAERAH DENGAN PROSES PERSIDANGAN.pdf' },
      { id: uid(), no: '3', noKeputusan: '900.1.13.1/5319.003-Bappenda/2025', tentang: 'SOP PENANGANAN PERMOHONAN KEBERATAN STPD KB BPHTB', fileName: '', fileUrl: '', keterangan: '', sourceFile: '003 - SK + LAMPIRAN SOP PENANGANAN PERMOHONAN KEBERATAN STPD KB BPHTB.pdf' },
      { id: uid(), no: '4', noKeputusan: '900.1.13.1/5319.004-Bappenda/2025', tentang: 'SOP PENANGANAN PERMOHONAN PEMBETULAN OBJEK DAN SUBJEK PBB P2 DENGAN MENGUBAH KETETAPAN', fileName: '', fileUrl: '', keterangan: '', sourceFile: '004 - SK + LAMPIRAN SOP PENANGANAN PERMOHONAN PEMBETULAN OBJEK DAN SUBJEK PBB P2 DENGAN MENGUBAH KETETAPAN.pdf' },
      { id: uid(), no: '5', noKeputusan: '900.1.13.1/5319.005-Bappenda/2025', tentang: 'SOP PENANGANAN PERMOHONAN PENGURANGAN KETETAPAN PAJAK DAERAH', fileName: '', fileUrl: '', keterangan: '', sourceFile: '005 - SK + LAMPIRAN SOP PENANGANAN PERMOHONAN PENGURANGAN KETETAPAN PAJAK DAERAH.pdf' },
      { id: uid(), no: '6', noKeputusan: '900.1.13.1/5319.006-Bappenda/2025', tentang: 'SOP PELAKSANAAN PEMBATALAN KETETAPAN SPPT PBB P2', fileName: '', fileUrl: '', keterangan: '', sourceFile: '006 - SK + LAMPIRAN SOP PELAKSANAAN PEMBATALAN KETETAPAN SPPT PBB P2.pdf' },
      { id: uid(), no: '7', noKeputusan: '900.1.13.1/5319.007-Bappenda/2025', tentang: 'SOP PELAKSANAAN PEMBATALAN NOMOR BOOKING BPHTB', fileName: '', fileUrl: '', keterangan: '', sourceFile: '007 - SK + LAMPIRAN SOP PELAKSANAAN PEMBATALAN NOMOR BOOKING BPHTB.pdf' },
      { id: uid(), no: '8', noKeputusan: '900.1.13.1/5319.008-Bappenda/2025', tentang: 'SOP PENANGANAN PERMOHONAN PENGHAPUSAN SANKSI ADMINISTRATIF PAJAK DAERAH', fileName: '', fileUrl: '', keterangan: '', sourceFile: '008 - SK + LAMPIRAN SOP PENANGANAN PERMOHONAN PENGHAPUSAN SANKSI ADMINISTRATIF PAJAK DAERAH.pdf' },
      { id: uid(), no: '9', noKeputusan: '900.1.13.1/5319.009-Bappenda/2025', tentang: 'SOP PENANGANAN PERMOHONAN RESTITUSI PAJAK DAERAH', fileName: '', fileUrl: '', keterangan: '', sourceFile: '009 - SK + LAMPIRAN SOP PENANGANAN PERMOHONAN RESTITUSI PAJAK DAERAH.pdf' },
      { id: uid(), no: '10', noKeputusan: '900.1.13.1/5319.010-Bappenda/2025', tentang: 'SOP PENANGANAN PERMOHONAN KERINGANAN PAJAK DAERAH', fileName: '', fileUrl: '', keterangan: '', sourceFile: '010 - SK + LAMPIRAN SOP PENANGANAN PERMOHONAN KERINGANAN PAJAK DAERAH.pdf' },
      { id: uid(), no: '11', noKeputusan: '900.1.13.1/5319.011-Bappenda/2025', tentang: 'SOP PENANGANAN PERMOHONAN PEMBEBASAN PAJAK DAERAH ATAS OBJEK PAJAK YANG DIKECUALIKAN', fileName: '', fileUrl: '', keterangan: '', sourceFile: '011 - SK + LAMPIRAN SOP PENANGANAN PERMOHONAN PEMBEBASAN PAJAK DAERAH ATAS OBJEK PAJAK YANG DIKECUALIKAN.pdf' },
      { id: uid(), no: '12', noKeputusan: '900.1.13.1/5319.012-Bappenda/2025', tentang: 'SOP PENANGANAN PERMOHONAN KOMPENSASI PAJAK DAERAH', fileName: '', fileUrl: '', keterangan: '', sourceFile: '012 - SK + LAMPIRAN SOP PENANGANAN PERMOHONAN KOMPENSASI PAJAK DAERAH.pdf' },
      { id: uid(), no: '13', noKeputusan: '900.1.13.1/5319.013-Bappenda/2025', tentang: 'SOP PENGENDALIAN, PEMERIKSAAN DAN PENGAWASAN PAJAK DAERAH', fileName: '', fileUrl: '', keterangan: '', sourceFile: '013 - SK + LAMPIRAN SOP PENGENDALIAN, PEMERIKSAAN DAN PENGAWASAN PAJAK DAERAH.pdf' },
      { id: uid(), no: '14', noKeputusan: '900.1.13.1/5319.014-Bappenda/2025', tentang: 'SOP EVALUASI PEMUNGUTAN PAJAK DAERAH', fileName: '', fileUrl: '', keterangan: '', sourceFile: '014 - SK + LAMPIRAN SOP EVALUASI PEMUNGUTAN PAJAK DAERAH.pdf' },
      { id: uid(), no: '15', noKeputusan: '900.1.13.1/5319.015-Bappenda/2025', tentang: 'SOP PENYUSUNAN LAPORAN PENDAPATAN DAERAH', fileName: '', fileUrl: '', keterangan: '', sourceFile: '015 - SK + LAMPIRAN SOP PENYUSUNAN LAPORAN PENDAPATAN DAERAH (1).pdf' },
      { id: uid(), no: '16', noKeputusan: '900.1.13.1/5319.016-Bappenda/2025', tentang: 'SOP PENGHITUNGAN BAGIAN DESA DARI PENERIMAAN PAJAK DAN RETRIBUSI DAERAH', fileName: '', fileUrl: '', keterangan: '', sourceFile: '016 - SK + LAMPIRAN SOP PENGHITUNGAN BAGIAN DESA DARI PENERIMAAN PAJAK DAN RETRIBUSI DAERAH (1).pdf' },
      { id: uid(), no: '17', noKeputusan: '900.1.13.1/5319.017-Bappenda/2025', tentang: 'SOP PEMBINAAN DAN PENGAWASAN PENGELOLAAN RETRIBUSI DAERAH', fileName: '', fileUrl: '', keterangan: '', sourceFile: '017 - SK + LAMPIRAN SOP PEMBINAAN DAN PENGAWASAN PENGELOLAAN RETRIBUSI DAERAH.pdf' },
      { id: uid(), no: '18', noKeputusan: '900.1.13.1/5319.018-Bappenda/2025', tentang: 'SOP MONITORING PELAPORAN PPAT', fileName: '', fileUrl: '', keterangan: '', sourceFile: '018 - SK + LAMPIRAN SOP MONITORING PELAPORAN PPAT.pdf' },
      { id: uid(), no: '19', noKeputusan: '900.1.13.1/5319.019-Bappenda/2025', tentang: 'SOP PELAKSANAAN PERFORASI BENDA BERHARGA', fileName: '', fileUrl: '', keterangan: '', sourceFile: '019 - SK + LAMPIRAN SOP PELAKSANAAN PERFORASI BENDA BERHARGA (1).pdf' },
    ],
  },
];

// =====================================================================
// Modal "Input SOP" — form input satu data baru, gaya sama seperti
// "+ Input Arsip" (pilih Bagian, isi No. Keputusan / Tentang /
// Keterangan, opsional langsung upload PDF-nya).
// =====================================================================
const NEW_SECTION_VALUE = '__new_section__';

const InputSopModal: React.FC<{
  sections: SopSection[];
  onClose: () => void;
  onSubmit: (
    target: { sectionId: string } | { newSectionTitle: string },
    data: { noKeputusan: string; tentang: string; keterangan: string; file: File | null }
  ) => void | Promise<void>;
  editing?: boolean;
  initial?: { noKeputusan: string; tentang: string; keterangan: string };
}> = ({ sections, onClose, onSubmit, editing, initial }) => {
  const [sectionId, setSectionId] = useState(editing ? '' : sections[0]?.id || '');
  const [newSectionTitle, setNewSectionTitle] = useState('');
  const [noKeputusan, setNoKeputusan] = useState(initial?.noKeputusan ?? '');
  const [tentang, setTentang] = useState(initial?.tentang ?? '');
  const [keterangan, setKeterangan] = useState(initial?.keterangan ?? '');
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const isNewSection = sectionId === NEW_SECTION_VALUE;
  const canSubmit =
    tentang.trim().length > 0 && (editing || (isNewSection ? newSectionTitle.trim().length > 0 : !!sectionId));

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSaving(true);
    const target = isNewSection ? { newSectionTitle: newSectionTitle.trim() } : { sectionId };
    await onSubmit(target, {
      noKeputusan: noKeputusan.trim(),
      tentang: tentang.trim(),
      keterangan: keterangan.trim(),
      file,
    });
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <h2 className="font-semibold text-slate-800">{editing ? 'Edit SOP' : 'Input SOP Baru'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-xl leading-none">
            &times;
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {!editing && (<>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Bagian</label>
            <select
              value={sectionId}
              onChange={e => setSectionId(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-indigo-400"
            >
              {sections.map(sec => (
                <option key={sec.id} value={sec.id}>
                  {sec.kode} — {sec.judul}
                </option>
              ))}
              <option value={NEW_SECTION_VALUE}>+ Buat Bagian Baru…</option>
            </select>
          </div>

          {isNewSection && (
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Judul Bagian Baru <span className="text-red-500">*</span>
              </label>
              <input
                value={newSectionTitle}
                onChange={e => setNewSectionTitle(e.target.value)}
                placeholder="mis. SOP BIDANG PENGAWASAN INTERNAL"
                autoFocus
                className="w-full border border-indigo-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-indigo-400"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Kode huruf bagian (A, B, C, …) akan dibuat otomatis mengikuti urutan.
              </p>
            </div>
          )}
          </>)}

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">No. Keputusan</label>
            <input
              value={noKeputusan}
              onChange={e => setNoKeputusan(e.target.value)}
              placeholder="mis. 900.1.13.1/5298.014-Bappenda/2025"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-indigo-400"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Tentang <span className="text-red-500">*</span>
            </label>
            <textarea
              value={tentang}
              onChange={e => setTentang(e.target.value)}
              placeholder="Perihal / judul SOP"
              rows={2}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-indigo-400 resize-y"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Keterangan</label>
            <input
              value={keterangan}
              onChange={e => setKeterangan(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-indigo-400"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">{editing ? 'Ganti file PDF (opsional)' : 'File PDF (opsional, bisa nanti)'}</label>
            <label className="flex items-center gap-2 border border-dashed border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-500 hover:border-indigo-400 hover:text-indigo-600 cursor-pointer">
              <Upload className="w-4 h-4 shrink-0" />
              <span className="truncate">{file ? file.name : 'Klik untuk pilih file PDF'}</span>
              <input
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={e => setFile(e.target.files?.[0] || null)}
              />
            </label>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-slate-200 bg-slate-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium rounded-lg text-slate-600 hover:bg-slate-200"
          >
            Batal
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit || saving}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Menyimpan…' : 'Simpan'}
          </button>
        </div>
      </div>
    </div>
  );
};

// =====================================================================
// Tampilan utama: header, filter, tabel dengan header tetap (sticky),
// bagian yang bisa dilipat, paginasi per bagian, tombol Lihat + menu ⋮
// =====================================================================
const PAGE_SIZES = [10, 20, 50, 100];

// URL file di server. PENTING: jangan pakai encodeURIComponent — "+" dan ","
// pada nama file (mis. "SK + LAMPIRAN ...") akan jadi %2B / %2C yang TIDAK
// dikenali server statis (Vite), sehingga malah dikirim halaman aplikasi
// (tampak seperti kembali ke login). encodeURI membiarkan karakter itu apa adanya.
const sopFileUrl = (name: string) =>
  `/sop-files/${encodeURI(name).replace(/#/g, '%23').replace(/\?/g, '%3F')}`;

const hasFile = (row: SopRow) => !!(row.sourceFile || (row.storedInIdb && row.fileName) || row.fileUrl);

const fullFileName = (row: SopRow) => row.sourceFile || row.fileName || '';

// "001 - SK + LAMPIRAN SOP ....pdf" -> "001.pdf" (nama pendek, nama lengkap ada di tooltip)
const shortFileLabel = (row: SopRow) => {
  const src = fullFileName(row);
  const m = src.match(/^(\d+)\s*-/);
  if (m) return `${m[1]}.pdf`;
  return src.length > 18 ? `${src.slice(0, 15)}….pdf` : src;
};

const yearOf = (row: SopRow) => (row.noKeputusan.match(/(\d{4})\s*$/) || [])[1] || '';

const pageNumbers = (current: number, total: number) => {
  const start = Math.max(1, Math.min(current - 2, total - 4));
  const end = Math.min(total, start + 4);
  const out: number[] = [];
  for (let i = start; i <= end; i++) out.push(i);
  return out;
};

export const SopRegisterView: React.FC = () => {
  const [sections, setSections] = useState<SopSection[]>(() => {
    const initial = buildInitialSections();
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed: SopSection[] = JSON.parse(saved);
        // Migrasi: data lama di browser belum punya "sourceFile" (link ke file di
        // server). Cocokkan lewat No. Keputusan supaya file otomatis bisa dibuka
        // dari komputer manapun, tanpa menimpa file yang diunggah manual.
        const srcByNomor = new Map<string, string>();
        initial.forEach(sec =>
          sec.rows.forEach(r => {
            if (r.sourceFile) srcByNomor.set(r.noKeputusan, r.sourceFile);
          })
        );
        return parsed.map(sec => ({
          ...sec,
          rows: sec.rows.map(r => {
            const src = srcByNomor.get(r.noKeputusan);
            if (!r.sourceFile && src && (!r.fileName || r.fileName === src)) {
              return { ...r, sourceFile: src };
            }
            return r;
          }),
        }));
      }
    } catch {
      /* ignore corrupt storage */
    }
    return initial;
  });

  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState('');
  const [filterSection, setFilterSection] = useState('all');
  const [filterYear, setFilterYear] = useState('all');
  const [pageSize, setPageSize] = useState(20);
  const [pages, setPages] = useState<Record<string, number>>({});
  const [menu, setMenu] = useState<{ sectionId: string; rowId: string; top: number; left: number } | null>(null);
  const [showInputModal, setShowInputModal] = useState(false);
  const [editing, setEditing] = useState<{ sectionId: string; rowId: string } | null>(null);
  const [bulkResult, setBulkResult] = useState<{ matched: string[]; unmatched: string[] } | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);

  const uploadTarget = useRef<{ sectionId: string; rowId: string } | null>(null);
  const singleFileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sections));
  }, [sections]);

  useEffect(() => {
    setPages({});
  }, [search, filterSection, filterYear, pageSize]);

  const years = useMemo(
    () =>
      Array.from(new Set(sections.flatMap(sec => sec.rows.map(yearOf)).filter(Boolean)))
        .sort()
        .reverse(),
    [sections]
  );

  const q = search.trim().toLowerCase();
  const filtering = q !== '' || filterYear !== 'all';

  const visible = useMemo(
    () =>
      sections
        .filter(sec => filterSection === 'all' || sec.id === filterSection)
        .map(sec => ({
          sec,
          rows: sec.rows.filter(
            r =>
              (!q ||
                [r.noKeputusan, r.tentang, r.keterangan, r.fileName, r.sourceFile || ''].some(v =>
                  v.toLowerCase().includes(q)
                )) &&
              (filterYear === 'all' || yearOf(r) === filterYear)
          ),
        }))
        .filter(v => v.rows.length > 0 || !filtering),
    [sections, q, filterSection, filterYear, filtering]
  );

  // ---------- operasi data ----------
  const patchRow = (sectionId: string, rowId: string, patch: Partial<SopRow>) =>
    setSections(prev =>
      prev.map(sec =>
        sec.id !== sectionId
          ? sec
          : { ...sec, rows: sec.rows.map(r => (r.id === rowId ? { ...r, ...patch } : r)) }
      )
    );

  const handleFileUpload = async (sectionId: string, rowId: string, file: File | null) => {
    if (!file) return;
    await idbPutFile(rowId, file);
    patchRow(sectionId, rowId, { fileName: file.name, fileUrl: '', storedInIdb: true, sourceFile: undefined });
  };

  const removeFile = (sectionId: string, rowId: string) => {
    idbDeleteFile(rowId);
    patchRow(sectionId, rowId, { fileName: '', fileUrl: '', storedInIdb: false, sourceFile: undefined });
  };

  const deleteRow = (sectionId: string, rowId: string) => {
    if (!confirm('Hapus baris SOP ini?')) return;
    idbDeleteFile(rowId);
    setSections(prev =>
      prev.map(sec => (sec.id !== sectionId ? sec : { ...sec, rows: sec.rows.filter(r => r.id !== rowId) }))
    );
  };

  const addRowWithData = async (
    target: { sectionId: string } | { newSectionTitle: string },
    data: { noKeputusan: string; tentang: string; keterangan: string; file: File | null }
  ) => {
    const newRow: SopRow = {
      ...emptyRow(''),
      noKeputusan: data.noKeputusan,
      tentang: data.tentang,
      keterangan: data.keterangan,
    };
    if (data.file) {
      await idbPutFile(newRow.id, data.file);
      newRow.fileName = data.file.name;
      newRow.storedInIdb = true;
    }
    if ('newSectionTitle' in target) {
      setSections(prev => {
        const nextKode = String.fromCharCode('A'.charCodeAt(0) + prev.length);
        return [...prev, { id: uid(), kode: nextKode, judul: target.newSectionTitle, rows: [{ ...newRow, no: '1' }] }];
      });
      return;
    }
    setSections(prev =>
      prev.map(sec =>
        sec.id !== target.sectionId
          ? sec
          : { ...sec, rows: [...sec.rows, { ...newRow, no: String(sec.rows.length + 1) }] }
      )
    );
  };

  const saveEdit = async (
    ref: { sectionId: string; rowId: string },
    data: { noKeputusan: string; tentang: string; keterangan: string; file: File | null }
  ) => {
    const patch: Partial<SopRow> = {
      noKeputusan: data.noKeputusan,
      tentang: data.tentang,
      keterangan: data.keterangan,
    };
    if (data.file) {
      await idbPutFile(ref.rowId, data.file);
      Object.assign(patch, { fileName: data.file.name, fileUrl: '', storedInIdb: true, sourceFile: undefined });
    }
    patchRow(ref.sectionId, ref.rowId, patch);
  };

  const addSection = () => {
    const judul = prompt('Judul bagian baru:', 'BAGIAN BARU');
    if (judul === null || !judul.trim()) return;
    setSections(prev => [
      ...prev,
      { id: uid(), kode: String.fromCharCode('A'.charCodeAt(0) + prev.length), judul: judul.trim(), rows: [] },
    ]);
  };

  const renameSection = (sec: SopSection) => {
    const judul = prompt('Ubah judul bagian:', sec.judul);
    if (judul === null || !judul.trim()) return;
    setSections(prev => prev.map(s => (s.id === sec.id ? { ...s, judul: judul.trim() } : s)));
  };

  const deleteSection = (sec: SopSection) => {
    if (!confirm(`Hapus bagian "${sec.judul}" beserta ${sec.rows.length} baris di dalamnya?`)) return;
    sec.rows.forEach(r => idbDeleteFile(r.id));
    setSections(prev => prev.filter(s => s.id !== sec.id));
  };

  const openRowFile = async (row: SopRow) => {
    if (row.sourceFile) {
      window.open(sopFileUrl(row.sourceFile), '_blank', 'noopener');
      return;
    }
    if (row.storedInIdb) {
      const file = await idbGetFile(row.id);
      if (!file) {
        alert('File tidak ditemukan di penyimpanan browser ini. Silakan unggah ulang.');
        return;
      }
      const url = URL.createObjectURL(file);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      return;
    }
    if (row.fileUrl) window.open(row.fileUrl, '_blank', 'noopener');
  };

  // ---- Upload massal: cocokkan nama file PDF ke kolom "Tentang" ----
  const handleBulkUpload = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setBulkBusy(true);
    const index = new Map<string, { sectionId: string; rowId: string; onServer: boolean }>();
    sections.forEach(sec =>
      sec.rows.forEach(row => {
        if (row.tentang) index.set(normalizeForMatch(row.tentang), { sectionId: sec.id, rowId: row.id, onServer: !!row.sourceFile });
      })
    );
    const matched: string[] = [];
    const unmatched: string[] = [];
    const updates: { sectionId: string; rowId: string; fileName: string }[] = [];
    for (const file of Array.from(fileList)) {
      const target = index.get(normalizeForMatch(file.name));
      if (!target) {
        unmatched.push(file.name);
        continue;
      }
      matched.push(file.name);
      if (target.onServer) continue; // sudah ada di server, tidak perlu disalin ke browser
      await idbPutFile(target.rowId, file);
      updates.push({ sectionId: target.sectionId, rowId: target.rowId, fileName: file.name });
    }
    if (updates.length > 0) {
      setSections(prev =>
        prev.map(sec => ({
          ...sec,
          rows: sec.rows.map(r => {
            const u = updates.find(x => x.sectionId === sec.id && x.rowId === r.id);
            return u ? { ...r, fileName: u.fileName, fileUrl: '', storedInIdb: true } : r;
          }),
        }))
      );
    }
    setBulkResult({ matched, unmatched });
    setBulkBusy(false);
  };

  const openMenu = (e: React.MouseEvent, sectionId: string, rowId: string) => {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const height = 176;
    const top = rect.bottom + height > window.innerHeight ? Math.max(8, rect.top - height - 4) : rect.bottom + 4;
    setMenu({ sectionId, rowId, top, left: Math.max(8, rect.right - 176) });
  };

  const requestUpload = (sectionId: string, rowId: string) => {
    uploadTarget.current = { sectionId, rowId };
    singleFileInput.current?.click();
  };

  const menuRow = menu ? sections.find(s => s.id === menu.sectionId)?.rows.find(r => r.id === menu.rowId) : undefined;
  const editRow = editing ? sections.find(s => s.id === editing.sectionId)?.rows.find(r => r.id === editing.rowId) : undefined;

  const selectCls =
    'border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white text-slate-700 outline-none focus:ring-1 focus:ring-blue-400';

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col lg:flex-row lg:items-center gap-4">
        <div className="flex items-start gap-4 flex-1 min-w-0">
          <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
            <ClipboardList className="w-6 h-6 text-blue-600" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-slate-900">Register SOP Kepala Badan Tahun 2025</h1>
            <p className="text-sm text-slate-500">
              Tabel terpisah dari daftar arsip — untuk mencatat SOP per bidang beserta file keputusannya.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <label className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg border border-blue-200 text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors cursor-pointer">
            <Upload className="w-4 h-4" />
            {bulkBusy ? 'Memproses…' : 'Upload Massal'}
            <input
              type="file"
              accept="application/pdf"
              multiple
              className="hidden"
              disabled={bulkBusy}
              onChange={e => {
                handleBulkUpload(e.target.files);
                e.target.value = '';
              }}
            />
          </label>
          <button
            onClick={() => setShowInputModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
          >
            <Plus className="w-4 h-4" /> Input SOP
          </button>
          <button
            onClick={addSection}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" /> Tambah Bagian
          </button>
        </div>
      </div>

      {bulkResult && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="font-medium text-slate-700">
              Upload massal selesai — {bulkResult.matched.length} file cocok, {bulkResult.unmatched.length} tidak ditemukan
              pasangannya.
            </span>
            <button onClick={() => setBulkResult(null)} className="text-slate-400 hover:text-slate-700">
              Tutup
            </button>
          </div>
          {bulkResult.unmatched.length > 0 && (
            <ul className="list-disc list-inside text-slate-500 max-h-32 overflow-y-auto">
              {bulkResult.unmatched.map(name => (
                <li key={name}>{name}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Filter + tabel */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Cari nomor keputusan, judul SOP, atau kata kunci..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg outline-none focus:ring-1 focus:ring-blue-400"
            />
          </div>
          <select value={filterSection} onChange={e => setFilterSection(e.target.value)} className={selectCls}>
            <option value="all">Semua Bagian</option>
            {sections.map(sec => (
              <option key={sec.id} value={sec.id}>
                {sec.kode} — {sec.judul}
              </option>
            ))}
          </select>
          <select value={filterYear} onChange={e => setFilterYear(e.target.value)} className={selectCls}>
            <option value="all">Semua Tahun</option>
            {years.map(y => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <div className="flex items-center gap-2 text-sm text-slate-500 whitespace-nowrap">
            Tampilkan
            <select value={pageSize} onChange={e => setPageSize(Number(e.target.value))} className={selectCls}>
              {PAGE_SIZES.map(n => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            data per halaman
          </div>
        </div>

        <div className="max-h-[68vh] overflow-auto rounded-lg border border-slate-200">
          <table className="w-full text-sm border-collapse min-w-[900px]">
            <thead>
              <tr className="text-left text-slate-600">
                {['No', 'No. Keputusan', 'Tentang', 'File', 'Keterangan', 'Aksi'].map(h => (
                  <th
                    key={h}
                    className="sticky top-0 z-10 bg-slate-50 px-4 py-3 font-semibold border-b border-slate-200"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                    Tidak ada data yang cocok dengan pencarian/filter.
                  </td>
                </tr>
              )}
              {visible.map(({ sec, rows }) => {
                const isCollapsed = !!collapsed[sec.id];
                const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
                const page = Math.min(pages[sec.id] ?? 1, totalPages);
                const from = (page - 1) * pageSize;
                const pageRows = rows.slice(from, from + pageSize);
                return (
                  <React.Fragment key={sec.id}>
                    <tr
                      className="bg-blue-50 cursor-pointer"
                      onClick={() => setCollapsed(prev => ({ ...prev, [sec.id]: !prev[sec.id] }))}
                    >
                      <td colSpan={6} className="px-4 py-2.5 border-b border-slate-200">
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 rounded-md bg-blue-600 text-white text-xs font-bold flex items-center justify-center shrink-0">
                            {sec.kode}
                          </span>
                          <span className="font-bold text-slate-800 uppercase">{sec.judul}</span>
                          <span className="ml-auto flex items-center gap-1 text-slate-500">
                            <span className="text-sm mr-2">{rows.length} data</span>
                            <button
                              title="Ubah judul bagian"
                              onClick={e => {
                                e.stopPropagation();
                                renameSection(sec);
                              }}
                              className="p-1.5 rounded hover:bg-blue-100"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              title="Hapus bagian"
                              onClick={e => {
                                e.stopPropagation();
                                deleteSection(sec);
                              }}
                              className="p-1.5 rounded hover:bg-rose-100 hover:text-rose-600"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </span>
                        </div>
                      </td>
                    </tr>

                    {!isCollapsed &&
                      pageRows.map(row => (
                        <tr key={row.id} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="px-4 py-2.5 text-slate-600 align-middle w-14">{row.no}</td>
                          <td className="px-4 py-2.5 text-slate-700 align-middle whitespace-nowrap">
                            {row.noKeputusan || '-'}
                          </td>
                          <td className="px-4 py-2.5 text-slate-800 align-middle min-w-[260px]">{row.tentang}</td>
                          <td className="px-4 py-2.5 align-middle whitespace-nowrap">
                            {hasFile(row) ? (
                              <button
                                onClick={() => openRowFile(row)}
                                title={fullFileName(row)}
                                className="inline-flex items-center gap-1.5 text-blue-600 hover:underline"
                              >
                                <FileText className="w-4 h-4 text-rose-500" />
                                {shortFileLabel(row)}
                              </button>
                            ) : (
                              <span className="text-xs text-slate-400">Belum ada file</span>
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-slate-600 align-middle">
                            {row.keterangan ? (
                              <span className="inline-flex items-center gap-1.5">
                                <Info className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                                {row.keterangan}
                              </span>
                            ) : (
                              '-'
                            )}
                          </td>
                          <td className="px-4 py-2.5 align-middle whitespace-nowrap">
                            <div className="flex items-center gap-1">
                              {hasFile(row) ? (
                                <button
                                  onClick={() => openRowFile(row)}
                                  className="px-3 py-1 text-xs font-semibold rounded-md bg-blue-600 text-white hover:bg-blue-700"
                                >
                                  Lihat
                                </button>
                              ) : (
                                <button
                                  onClick={() => requestUpload(sec.id, row.id)}
                                  className="px-3 py-1 text-xs font-semibold rounded-md border border-blue-300 text-blue-600 hover:bg-blue-50"
                                >
                                  Unggah
                                </button>
                              )}
                              <button
                                title="Menu"
                                onClick={e => openMenu(e, sec.id, row.id)}
                                className="p-1.5 rounded text-slate-500 hover:bg-slate-100"
                              >
                                <MoreVertical className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}

                    {!isCollapsed && rows.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-4 py-5 text-center text-xs text-slate-400 border-b border-slate-100">
                          Belum ada SOP di bagian ini — klik “Input SOP” untuk menambah.
                        </td>
                      </tr>
                    )}

                    {!isCollapsed && rows.length > 0 && (
                      <tr>
                        <td colSpan={6} className="px-4 py-3 border-b border-slate-200">
                          <div className="flex items-center justify-between gap-3 text-xs text-slate-500">
                            <span>
                              Menampilkan {from + 1} - {from + pageRows.length} dari {rows.length} data
                            </span>
                            {totalPages > 1 && (
                              <div className="flex items-center gap-1">
                                <button
                                  disabled={page === 1}
                                  onClick={() => setPages(p => ({ ...p, [sec.id]: page - 1 }))}
                                  className="w-8 h-8 flex items-center justify-center rounded-md border border-slate-300 disabled:opacity-40"
                                >
                                  <ChevronLeft className="w-4 h-4" />
                                </button>
                                {pageNumbers(page, totalPages).map(n => (
                                  <button
                                    key={n}
                                    onClick={() => setPages(p => ({ ...p, [sec.id]: n }))}
                                    className={`w-8 h-8 rounded-md border text-sm font-medium ${
                                      n === page
                                        ? 'bg-blue-600 border-blue-600 text-white'
                                        : 'border-slate-300 text-slate-600 hover:bg-slate-100'
                                    }`}
                                  >
                                    {n}
                                  </button>
                                ))}
                                <button
                                  disabled={page === totalPages}
                                  onClick={() => setPages(p => ({ ...p, [sec.id]: page + 1 }))}
                                  className="w-8 h-8 flex items-center justify-center rounded-md border border-slate-300 disabled:opacity-40"
                                >
                                  <ChevronRight className="w-4 h-4" />
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        <p className="text-xs text-slate-400">
          Teks tabel tersimpan di browser ini. File dari server (folder public/sop-files) bisa dibuka dari komputer
          manapun; file yang diunggah manual tersimpan di browser ini saja.
        </p>
      </div>

      {/* input file tunggal (dipakai tombol Unggah / Ganti file) */}
      <input
        ref={singleFileInput}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={e => {
          const t = uploadTarget.current;
          if (t) handleFileUpload(t.sectionId, t.rowId, e.target.files?.[0] || null);
          e.target.value = '';
        }}
      />

      {/* menu ⋮ */}
      {menu && menuRow && (
        <>
          <div className="fixed inset-0 z-50" onClick={() => setMenu(null)} />
          <div
            className="fixed z-[60] w-44 bg-white border border-slate-200 rounded-lg shadow-lg py-1 text-sm"
            style={{ top: menu.top, left: menu.left }}
          >
            <button
              className="w-full text-left px-3 py-2 text-slate-700 hover:bg-slate-100"
              onClick={() => {
                setEditing({ sectionId: menu.sectionId, rowId: menu.rowId });
                setMenu(null);
              }}
            >
              Edit data
            </button>
            <button
              className="w-full text-left px-3 py-2 text-slate-700 hover:bg-slate-100"
              onClick={() => {
                requestUpload(menu.sectionId, menu.rowId);
                setMenu(null);
              }}
            >
              {hasFile(menuRow) ? 'Ganti file' : 'Unggah file'}
            </button>
            {hasFile(menuRow) && (
              <button
                className="w-full text-left px-3 py-2 text-slate-700 hover:bg-slate-100"
                onClick={() => {
                  removeFile(menu.sectionId, menu.rowId);
                  setMenu(null);
                }}
              >
                Hapus file
              </button>
            )}
            <button
              className="w-full text-left px-3 py-2 text-rose-600 hover:bg-rose-50"
              onClick={() => {
                deleteRow(menu.sectionId, menu.rowId);
                setMenu(null);
              }}
            >
              Hapus baris
            </button>
          </div>
        </>
      )}

      {showInputModal && (
        <InputSopModal
          sections={sections}
          onClose={() => setShowInputModal(false)}
          onSubmit={async (target, data) => {
            await addRowWithData(target, data);
            setShowInputModal(false);
          }}
        />
      )}

      {editing && editRow && (
        <InputSopModal
          editing
          sections={sections}
          initial={{ noKeputusan: editRow.noKeputusan, tentang: editRow.tentang, keterangan: editRow.keterangan }}
          onClose={() => setEditing(null)}
          onSubmit={async (_target, data) => {
            await saveEdit(editing, data);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
};
