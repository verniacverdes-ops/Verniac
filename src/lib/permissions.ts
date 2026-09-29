import { UserRole, KlasifikasiAkses } from '../types';

export interface RolePermissionMatrix {
  lihat: boolean;
  tambah: boolean;
  edit: boolean;
  hapus: boolean;
  restore: boolean;
  download: boolean;
  export: boolean;
  approval: boolean;
  backup: boolean;
  manageUser: boolean;
  maxKlasifikasiAkses: KlasifikasiAkses;
}

export const PERMISSION_MATRIX: Record<UserRole, RolePermissionMatrix> = {
  super_admin: {
    lihat: true,
    tambah: true,
    edit: true,
    hapus: true,
    restore: true,
    download: true,
    export: true,
    approval: true,
    backup: true,
    manageUser: true,
    maxKlasifikasiAkses: 'SANGAT_RAHASIA',
  },
  admin: {
    lihat: true,
    tambah: true,
    edit: true,
    hapus: true,
    restore: true,
    download: true,
    export: true,
    approval: true,
    backup: true,
    manageUser: false,
    maxKlasifikasiAkses: 'RAHASIA',
  },
  arsiparis: {
    lihat: true,
    tambah: true,
    edit: true,
    hapus: false,
    restore: false,
    download: true,
    export: true,
    approval: true,
    backup: false,
    manageUser: false,
    maxKlasifikasiAkses: 'TERBATAS',
  },
  operator: {
    lihat: true,
    tambah: true,
    edit: true,
    hapus: false,
    restore: false,
    download: true,
    export: true,
    approval: false,
    backup: false,
    manageUser: false,
    maxKlasifikasiAkses: 'INTERNAL',
  },
  viewer: {
    lihat: true,
    tambah: false,
    edit: false,
    hapus: false,
    restore: false,
    download: false,
    export: true,
    approval: false,
    backup: false,
    manageUser: false,
    maxKlasifikasiAkses: 'INTERNAL',
  },
  auditor: {
    lihat: true,
    tambah: false,
    edit: false,
    hapus: false,
    restore: false,
    download: true,
    export: true,
    approval: false,
    backup: false,
    manageUser: false,
    maxKlasifikasiAkses: 'SANGAT_RAHASIA',
  },
};

const KLASIFIKASI_RANK: Record<KlasifikasiAkses, number> = {
  PUBLIK: 1,
  INTERNAL: 2,
  TERBATAS: 3,
  RAHASIA: 4,
  SANGAT_RAHASIA: 5,
};

export function canAccessClassification(role: UserRole | undefined, classification: KlasifikasiAkses = 'INTERNAL'): boolean {
  if (!role) return classification === 'PUBLIK';
  const userMax = PERMISSION_MATRIX[role]?.maxKlasifikasiAkses || 'INTERNAL';
  return KLASIFIKASI_RANK[userMax] >= KLASIFIKASI_RANK[classification];
}

export function hasRolePermission(role: UserRole | undefined, permission: keyof RolePermissionMatrix): boolean {
  if (!role) return false;
  return Boolean(PERMISSION_MATRIX[role]?.[permission]);
}

/**
 * Menyamarkan (redact) field-field sensitif dari sebuah ArchiveItem jika
 * peran pengguna tidak berwenang membuka klasifikasi akses item tersebut.
 * Field identitas (nomor keputusan, tanggal, no dus, kategori, klasifikasi,
 * unit pengolah) tetap tampil supaya pengguna tahu berkas itu ADA, tapi
 * ISI-nya (perihal, uraian, keterangan, lokasi fisik, lampiran PDF)
 * disembunyikan. Ini dipanggil satu kali di App.tsx sehingga semua
 * komponen turunan (tabel, dashboard, cetak, laporan, ekspor) otomatis
 * menerima data yang sudah aman tanpa perlu masing-masing mengecek ulang.
 */
export function redactArchiveItemIfRestricted<T extends {
  klasifikasiAkses?: KlasifikasiAkses;
  perihal?: string;
  uraianArsip?: string;
  keterangan?: string;
  lokasiPenyimpanan?: string;
  pdfAttachment?: unknown;
}>(item: T, role: UserRole | undefined): T {
  if (canAccessClassification(role, item.klasifikasiAkses || 'INTERNAL')) {
    return item;
  }
  return {
    ...item,
    perihal: '[Akses Dibatasi — Klasifikasi Terlalu Tinggi Untuk Peran Anda]',
    uraianArsip: undefined,
    keterangan: '[Akses Dibatasi]',
    lokasiPenyimpanan: '[Akses Dibatasi]',
    pdfAttachment: undefined,
  };
}