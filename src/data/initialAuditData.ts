import { AuditLogEntry } from '../types';

export const INITIAL_AUDIT_LOGS: AuditLogEntry[] = [
  {
    id: 'log-001',
    timestamp: '2026-08-09 09:15:22',
    userName: 'Ahmad Subagyo (Admin)',
    userRole: 'admin',
    action: 'TAMBAH',
    itemTarget: '188.4/01/SK/2026',
    details: 'Menambahkan berkas pertelaan arsip tentang Tim Pelaksana Kearsipan 2026',
  },
  {
    id: 'log-002',
    timestamp: '2026-08-09 10:20:05',
    userName: 'Dra. Endang Rahayu (Arsiparis)',
    userRole: 'arsiparis',
    action: 'UBAH',
    itemTarget: '188.4/02/SK/2026',
    details: 'Mengubah lokasi penyimpanan dari Depo A Rak 1 ke DUS-01/2026',
  },
  {
    id: 'log-003',
    timestamp: '2026-08-09 11:45:10',
    userName: 'Ahmad Subagyo (Admin)',
    userRole: 'admin',
    action: 'LOGIN',
    itemTarget: 'Sistem',
    details: 'Pengguna melakukan autentikasi login berhasil',
  },
  {
    id: 'log-004',
    timestamp: '2026-08-09 14:02:18',
    userName: 'Dra. Endang Rahayu (Arsiparis)',
    userRole: 'arsiparis',
    action: 'BACKUP',
    itemTarget: 'Database System',
    details: 'Mengunduh berkas backup snapshot JSON kearsipan lengkap',
  },
];
