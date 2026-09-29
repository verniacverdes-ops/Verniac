import {
  MasterKategori,
  MasterUnit,
  MasterGedung,
  MasterRuang,
  MasterRak,
  MasterDus
} from '../types';

export const DEFAULT_MASTER_KATEGORI: MasterKategori[] = [
  {
    id: 'kat-01',
    kode: 'KAT-INAKTIF',
    nama: 'Arsip Inaktif',
    deskripsi: 'Arsip yang frekuensi penggunaannya telah menurun namun masih memiliki nilai guna.',
    masaSimpanTahun: 5,
  },
  {
    id: 'kat-02',
    kode: 'KAT-VITAL',
    nama: 'Arsip Vital',
    deskripsi: 'Arsip keberadaannya merupakan persyaratan dasar bagi kelangsungan operasional instansi.',
    masaSimpanTahun: 10,
  },
  {
    id: 'kat-03',
    kode: 'KAT-PERMANEN',
    nama: 'Arsip Permanen',
    deskripsi: 'Arsip yang memiliki nilai guna kesejarahan/kebudayaan dan tidak boleh dimusnahkan.',
    masaSimpanTahun: 99,
  },
  {
    id: 'kat-04',
    kode: 'KAT-TERBATAS',
    nama: 'Arsip Terbatas / Rahasia',
    deskripsi: 'Arsip yang penggunaannya terbatas untuk pejabat berwenang.',
    masaSimpanTahun: 7,
  },
];

export const DEFAULT_MASTER_UNIT: MasterUnit[] = [
  {
    id: 'unit-01',
    kode: 'BAG-HUK',
    namaUnit: 'Bagian Hukum & Organisasi',
    kepalaUnit: 'H. Ahmad Subagyo, S.H., M.H.',
  },
  {
    id: 'unit-02',
    kode: 'BAG-RENKEU',
    namaUnit: 'Bagian Perencanaan & Keuangan',
    kepalaUnit: 'Dra. Endang Rahayu, M.Si.',
  },
  {
    id: 'unit-03',
    kode: 'SUBBAG-UMUM',
    namaUnit: 'Subbag Kepegawaian & Umum',
    kepalaUnit: 'Bambang Triyono, S.Sos.',
  },
  {
    id: 'unit-04',
    kode: 'BAG-TU',
    namaUnit: 'Bagian Tata Usaha & Kearsipan',
    kepalaUnit: 'Ir. Hendra Kusuma',
  },
];

export const DEFAULT_MASTER_GEDUNG: MasterGedung[] = [
  {
    id: 'gdg-01',
    kode: 'GDG-A',
    namaGedung: 'Depo Arsip Utama (Gedung A)',
    alamat: 'Jl. Pemuda No. 45 Blok Central Kearsipan',
  },
  {
    id: 'gdg-02',
    kode: 'GDG-B',
    namaGedung: 'Gedung Depo Record Center (Gedung B)',
    alamat: 'Jl. Pemuda No. 47 Kompleks Pusat Data',
  },
];

export const DEFAULT_MASTER_RUANG: MasterRuang[] = [
  {
    id: 'rng-01',
    gedungId: 'gdg-01',
    kode: 'R-101',
    namaRuang: 'Ruang Storage Inaktif Lantai 1',
  },
  {
    id: 'rng-02',
    gedungId: 'gdg-01',
    kode: 'R-102',
    namaRuang: 'Ruang Khusus Arsip Vital & Permanent',
  },
  {
    id: 'rng-03',
    gedungId: 'gdg-02',
    kode: 'R-201',
    namaRuang: 'Ruang Record Center B-1',
  },
];

export const DEFAULT_MASTER_RAK: MasterRak[] = [
  {
    id: 'rak-01',
    ruangId: 'rng-01',
    kode: 'RAK-A1',
    namaRak: 'Rak Besi Presisi A1',
    kapasitasDus: 20,
  },
  {
    id: 'rak-02',
    ruangId: 'rng-01',
    kode: 'RAK-A2',
    namaRak: 'Rak Besi Presisi A2',
    kapasitasDus: 20,
  },
  {
    id: 'rak-03',
    ruangId: 'rng-02',
    kode: 'RAK-B1',
    namaRak: 'Rak Khusus Vault B1',
    kapasitasDus: 15,
  },
];

export const DEFAULT_MASTER_DUS: MasterDus[] = [
  {
    id: 'dus-01',
    noDus: 'DUS-01/2026',
    rakId: 'rak-01',
    kapasitasMaxItem: 50,
    keterangan: 'Kotak Karton Standar ANRI Kualifikasi A1',
  },
  {
    id: 'dus-02',
    noDus: 'DUS-02/2026',
    rakId: 'rak-01',
    kapasitasMaxItem: 50,
    keterangan: 'Kotak Karton Standar ANRI Kualifikasi A2',
  },
  {
    id: 'dus-03',
    noDus: 'DUS-03/2026',
    rakId: 'rak-02',
    kapasitasMaxItem: 40,
    keterangan: 'Kotak Khusus Dokumen SOP & Vital',
  },
];
