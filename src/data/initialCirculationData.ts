import { LoanRecord, DestructionRecord } from '../types';

export const INITIAL_LOAN_RECORDS: LoanRecord[] = [
  {
    id: 'loan-2026-001',
    archiveId: 'arsip-2026-001',
    nomorKeputusan: '188.4/01/SK/2026',
    perihal: 'Keputusan Kepala Dinas tentang Penetapan Tim Kerja Pengelolaan Kearsipan dan Retensi Arsip Tahun 2026',
    noDus: 'DUS-01/2026',
    peminjamNama: 'Ahmad Fauzi, S.STP',
    peminjamNip: '198504122010011005',
    peminjamUnit: 'Bagian Hukum & Organisasi',
    peminjamKontak: '0812-3456-7890',
    keperluan: 'Pemeriksaan Inspektorat & Audit Kinerja Tata Kelola Arsip',
    tanggalPinjam: '2026-02-01',
    tanggalJatuhTempo: '2026-02-15',
    tanggalKembali: '2026-02-12',
    status: 'DIKEMBALIKAN',
    kondisiKembali: 'BAIK',
    catatanKembali: 'Dokumen dikembalikan utuh tanpa kerusakan',
    petugasName: 'Drs. Supriyadi, M.Si.',
    createdAt: '2026-02-01T09:00:00Z',
  },
  {
    id: 'loan-2026-002',
    archiveId: 'arsip-2026-003',
    nomorKeputusan: '800/28/SK-MUT/2026',
    perihal: 'Keputusan Mutasi dan Penempatan Pegawai Pelaksana Cadangan Pengelola Depo Arsip Wilayah I',
    noDus: 'DUS-02/2026',
    peminjamNama: 'Budi Santoso, S.E.',
    peminjamNip: '198902152014021002',
    peminjamUnit: 'Subbag Kepegawaian & Umum',
    peminjamKontak: '0857-1122-3344',
    keperluan: 'Verifikasi Berkas Kepegawaian Kenaikan Pangkat Pegawai Depo',
    tanggalPinjam: '2026-02-10',
    tanggalJatuhTempo: '2026-02-24',
    status: 'DIPINJAM',
    petugasName: 'Drs. Supriyadi, M.Si.',
    createdAt: '2026-02-10T11:20:00Z',
  }
];

export const INITIAL_DESTRUCTION_RECORDS: DestructionRecord[] = [
  {
    id: 'ba-2025-001',
    nomorBA: 'BA-MUSNAH/ARSIP/2025/004',
    tanggalPemusnahan: '2025-12-15',
    lokasiPemusnahan: 'Depo Pengolahan Limbah Kertas Terpadu Pemda',
    metodePemusnahan: 'PENCACAHAN',
    penanggungJawab: 'Drs. Supriyadi, M.Si.',
    saksi1: 'H. Ahmad Subagyo, S.H., M.H.',
    saksi2: 'Ir. Hendra Kusuma, M.T. (Inspektorat)',
    totalBerkas: 3,
    items: [
      {
        archiveId: 'arsip-old-001',
        nomorKeputusan: '028/12/SK-INAKTIF/2018',
        perihal: 'Surat Keputusan Panitia Pengadaan Alat Tulis Kantor Tahun Anggaran 2018 (Kadaluarsa)',
        noDus: 'DUS-OLD-01',
        tanggalDokumen: '2018-03-10',
        unitPengolah: 'Subbag Perlengkapan',
      },
      {
        archiveId: 'arsip-old-002',
        nomorKeputusan: '050/88/SK-OPS/2018',
        perihal: 'Laporan Pertanggungjawaban Kegiatan Khusus Hari Jadi Kota Tahun 2018',
        noDus: 'DUS-OLD-01',
        tanggalDokumen: '2018-05-20',
        unitPengolah: 'Bagian Umum',
      }
    ],
    catatan: 'Pemusnahan disaksikan oleh Tim Inspektorat dan Panitia Penilai Arsip sesuai JRA.',
    createdAt: '2025-12-15T14:00:00Z',
  }
];
