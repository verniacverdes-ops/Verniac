export type UserRole = 'super_admin' | 'admin' | 'arsiparis' | 'operator' | 'viewer' | 'auditor';

export type KlasifikasiAkses = 'PUBLIK' | 'INTERNAL' | 'TERBATAS' | 'RAHASIA' | 'SANGAT_RAHASIA';

export interface User {
  id: string;
  name: string;
  username: string;
  email: string;
  role: UserRole;
  unitKerja?: string;
  avatarUrl?: string;
  // FASE 7: token JWT sungguhan dari POST /api/auth/login (backend/routes/auth.ts),
  // dipakai sebagai `apiConfig.bearerToken` untuk semua request berikutnya.
  token?: string;
}

// "Buat Akun": tipe input terpisah dari `User` KARENA sengaja membawa
// `password` sementara (dikirim sekali ke POST/PUT /api/users lalu
// langsung dibuang dari memori) — `User` sendiri TIDAK PERNAH menyimpan
// password, karena objek User hidup di state React & localStorage
// (lihat App.tsx STORAGE_KEY_USERS_LIST) yang tidak aman untuk plaintext.
export interface NewUserInput {
  name: string;
  username: string;
  email: string;
  role: UserRole;
  unitKerja?: string;
  avatarUrl?: string;
  password: string; // wajib diisi saat membuat akun baru
}

export interface UpdateUserInput {
  id: string;
  name: string;
  username: string;
  email: string;
  role: UserRole;
  unitKerja?: string;
  avatarUrl?: string;
  password?: string; // opsional — kosongkan untuk tidak mengubah kata sandi
}

export interface ApiConfig {
  useLaravelApi: boolean;
  apiUrl: string;
  bearerToken?: string;
}

export type AttachmentMime =
  | 'application/pdf'
  | 'application/msword'
  | 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  | 'application/vnd.ms-excel'
  | 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

export interface PdfAttachment {
  fileName: string;
  fileSize: number; // bytes
  mime?: AttachmentMime;
  // FASE 9: sebelum berkas diunggah, ArchiveFormModal.tsx mengisi ini
  // dengan data URL base64 hasil FileReader supaya bisa dikirim ke
  // backend. Backend (backend/routes/arsip.ts) menyimpan bytes-nya ke
  // disk lalu MENGHAPUS field ini dari respons — jadi begitu data
  // arsip dimuat ulang dari server, fileData akan undefined dan
  // pratinjau/unduhan harus lewat storedFileName di bawah
  // (endpoint /documents/:id.pdf atau /api/arsip/:id/pdf).
  fileData?: string;
  // Nama file fisik di server (backend/uploads/arsip/<storedFileName>),
  // diisi oleh backend setelah upload berhasil.
  storedFileName?: string;
  uploadedAt: string;
  watermark?: string;
  isPrivateProxy?: boolean;
}

export interface ArchiveItem {
  id: string;
  nomorArsipOtomatis?: string; // e.g. 050/ARSIP-2026/001
  nomorKeputusan: string;      // Nomor Keputusan / Surat / Dokumen
  tanggal: string;             // Tanggal Keputusan / Dokumen (YYYY-MM-DD or formatted string)
  perihal: string;             // Perihal / Isi Ringkas Arsip
  uraianArsip?: string;        // Uraian Rincian Informasi Berkas
  jumlahBerkas?: number;       // Jumlah Lembar / Sampul / Berkas
  noDus: string;               // Nomor Dus / Boks Arsip (nama tampilan, diturunkan dari MasterDus.noDus)
  dusId?: string;               // Ref ID MasterDus.id — sumber kebenaran untuk noDus
  lokasiPenyimpanan: string;   // Keterangan / Lokasi Penyimpanan Arsip
  keterangan?: string;          // Keterangan Tambahan (misal: Asli/Foto Kopi, Jumlah Berkas)
  unitPengolah?: string;       // Unit Kerja / Bagian (nama tampilan, diturunkan dari MasterUnit)
  unitId?: string;             // Ref ID MasterUnit.id — sumber kebenaran untuk unitPengolah
  kategoriArsip?: string;      // Inaktif, Vital, Permanen, dll. (nama tampilan, diturunkan dari MasterKategori)
  kategoriId?: string;         // Ref ID MasterKategori.id — sumber kebenaran untuk kategoriArsip
  klasifikasiAkses?: KlasifikasiAkses; // Klasifikasi Akses Keamanan Dokumen
  statusSirkulasi?: 'TERSEDIA' | 'DIPINJAM' | 'DIUSULKAN_MUSNAH' | 'DIMUSNAHKAN';
  peminjamAktif?: string;
  tanggalPinjamAktif?: string;
  tanggalJatuhTempoAktif?: string;
  statusRetensi?: 'AKTIF' | 'INAKTIF' | 'SIAP_MUSNAH' | 'PERMANEN';
  tahunRetensiInaktifEnd?: number;
  pdfAttachment?: PdfAttachment | null; // Lampiran file PDF (null = dihapus eksplisit oleh user)
  gedungId?: string;           // Ref ID Master Gedung
  ruangId?: string;            // Ref ID Master Ruang
  rakId?: string;              // Ref ID Master Rak
  isDeleted?: boolean;         // Soft delete status (Tahap 3)
  deletedAt?: string;          // Timestamp soft delete
  deletedBy?: string;          // Actor soft delete
  createdAt: string;
  updatedAt: string;
}

export interface LoanRecord {
  id: string;
  archiveId: string;
  nomorKeputusan: string;
  perihal: string;
  noDus: string;
  peminjamNama: string;
  peminjamNip?: string;
  peminjamUnit: string;
  peminjamKontak?: string;
  keperluan: string;
  tanggalPinjam: string;
  tanggalJatuhTempo?: string;
  // Item request: pengganti due date -- bukti/surat peminjaman diunggah
  // saat peminjaman dibuat, sebagai konfirmasi dokumen alih-alih due date.
  buktiPeminjaman?: PdfAttachment;
  tanggalKembali?: string;
  status: 'DIPINJAM' | 'DIKEMBALIKAN' | 'TERLAMBAT';
  kondisiKembali?: 'BAIK' | 'RUSAK' | 'HILANG';
  catatanKembali?: string;
  petugasName: string;
  createdAt: string;
}

export interface DestructionRecord {
  id: string;
  nomorBA: string; // e.g. BA-MUSNAH/2026/001
  tanggalPemusnahan: string;
  lokasiPemusnahan: string;
  metodePemusnahan: 'PENCACAHAN' | 'PELEBURAN' | 'PEMBAKARAN' | 'KIMIAWI';
  penanggungJawab: string;
  saksi1: string;
  saksi2: string;
  totalBerkas: number;
  items: Array<{
    archiveId: string;
    nomorKeputusan: string;
    perihal: string;
    noDus: string;
    tanggalDokumen: string;
    unitPengolah?: string;
  }>;
  catatan?: string;
  createdAt: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  userName: string;
  userRole: string;
  action: 'TAMBAH' | 'UBAH' | 'SOFT_DELETE' | 'PULIHKAN' | 'HAPUS_PERMANEN' | 'BACKUP' | 'RESTORE' | 'LOGIN' | 'LOGOUT';
  itemTarget: string;
  details: string;
}

export interface BackupDataPackage {
  version: string;
  exportedAt: string;
  exportedBy: string;
  unitInfo: UnitInfo;
  items: ArchiveItem[];
  masterKategori: MasterKategori[];
  masterUnit: MasterUnit[];
  masterGedung: MasterGedung[];
  masterRuang: MasterRuang[];
  masterRak: MasterRak[];
  masterDus: MasterDus[];
  auditLogs: AuditLogEntry[];
}

export type SortField = 'no' | 'nomorKeputusan' | 'tanggal' | 'perihal' | 'noDus' | 'lokasiPenyimpanan';
export type SortOrder = 'asc' | 'desc';

export interface FilterState {
  searchQuery: string;
  selectedDus: string;
  selectedKategori?: string;
  selectedUnit?: string;
  startDate: string;
  endDate: string;
}

export interface UnitInfo {
  namaInstansi: string;
  unitKerja: string;
  penciptaArsip: string;
  tahun: string;
  lokasiGedungUtama: string;
  namaPetugas: string;
  jabatanPetugas: string;
  namaPimpinan: string;
  jabatanPimpinan: string;
}

// Master Data Interfaces (Tahap 2)
export interface MasterKategori {
  id: string;
  kode: string;
  nama: string;
  deskripsi: string;
  masaSimpanTahun: number;
}

export interface MasterUnit {
  id: string;
  kode: string;
  namaUnit: string;
  kepalaUnit: string;
}

export interface MasterGedung {
  id: string;
  kode: string;
  namaGedung: string;
  alamat: string;
}

export interface MasterRuang {
  id: string;
  gedungId: string;
  kode: string;
  namaRuang: string;
}

export interface MasterRak {
  id: string;
  ruangId: string;
  kode: string;
  namaRak: string;
  kapasitasDus: number;
}

export interface MasterDus {
  id: string;
  noDus: string;
  rakId: string;
  kapasitasMaxItem: number;
  keterangan?: string;
}

export interface ApprovalItem {
  id: string;
  type: 'PEMINJAMAN' | 'PEMUSNAHAN' | 'INPUT_ARSIP';
  targetId: string;
  nomorDokumen: string;
  perihal: string;
  pemohonNama: string;
  pemohonUnit: string;
  tanggalPengajuan: string;
  status: 'MENUNGGU' | 'DISETUJUI' | 'DITOLAK';
  catatan?: string;
  approverNama?: string;
  approvedAt?: string;
}

export type MainViewTab = 
  | 'dashboard' 
  | 'arsip' 
  | 'sirkulasi'
  | 'retensi_pemusnahan'
  | 'approval'
  | 'master' 
  | 'hirarki_lokasi' 
  | 'qr_scanner' 
  | 'laporan' 
  | 'audit_log' 
  | 'recycle_bin' 
  | 'backup_restore'
  | 'sop_register';