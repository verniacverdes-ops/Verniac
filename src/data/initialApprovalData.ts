import { ApprovalItem } from '../types';

export const INITIAL_APPROVAL_ITEMS: ApprovalItem[] = [
  {
    id: 'appr-2026-001',
    type: 'PEMINJAMAN',
    targetId: 'loan-2026-002',
    nomorDokumen: '800/28/SK-MUT/2026',
    perihal: 'Permohonan Peminjaman Berkas Mutasi Pegawai Pelaksana Depo Wilayah I',
    pemohonNama: 'Budi Santoso, S.E.',
    pemohonUnit: 'Subbag Kepegawaian & Umum',
    tanggalPengajuan: '2026-02-10 09:30',
    status: 'MENUNGGU',
    catatan: 'Permohonan verifikasi audit kepegawaian tahunan.',
  },
  {
    id: 'appr-2026-002',
    type: 'PEMUSNAHAN',
    targetId: 'ba-2025-001',
    nomorDokumen: 'BA-MUSNAH/ARSIP/2025/004',
    perihal: 'Usulan Pemusnahan 3 Berkas Arsip Kadaluarsa (JRA 2018)',
    pemohonNama: 'Drs. Supriyadi, M.Si.',
    pemohonUnit: 'Subbag Pengolahan Depo Arsip',
    tanggalPengajuan: '2025-12-14 14:00',
    status: 'DISETUJUI',
    catatan: 'Telah disetujui oleh Inspektorat dan Pimpinan Depo.',
    approverNama: 'H. Ahmad Subagyo, S.H., M.H.',
    approvedAt: '2025-12-15 10:15',
  },
  {
    id: 'appr-2026-003',
    type: 'INPUT_ARSIP',
    targetId: 'arsip-2026-004',
    nomorDokumen: '050/112/SK-OPS/2026',
    perihal: 'Pendaftaran Dokumen Pertelaan Baru: Penetapan SOP Depo Arsip Terpadu',
    pemohonNama: 'Staff Arsiparis Muda',
    pemohonUnit: 'Subbag Pengolahan Depo Arsip',
    tanggalPengajuan: '2026-02-08 11:00',
    status: 'MENUNGGU',
    catatan: 'Pendaftaran berkas baru untuk diverifikasi oleh Arsiparis Senior.',
  }
];
