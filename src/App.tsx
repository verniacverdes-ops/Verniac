import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  ArchiveItem, 
  UnitInfo, 
  User, 
  ApiConfig, 
  MainViewTab, 
  MasterKategori, 
  MasterUnit, 
  MasterGedung, 
  MasterRuang, 
  MasterRak, 
  MasterDus,
  AuditLogEntry,
  BackupDataPackage,
  LoanRecord,
  DestructionRecord,
  ApprovalItem,
  NewUserInput,
  UpdateUserInput
} from './types';
import { INITIAL_ARCHIVE_ITEMS, INITIAL_UNIT_INFO, SAMPLE_ARCHIVE_ITEMS } from './data/initialData';
import { DEFAULT_USERS } from './data/initialUsers';
import {
  DEFAULT_MASTER_KATEGORI,
  DEFAULT_MASTER_UNIT,
  DEFAULT_MASTER_GEDUNG,
  DEFAULT_MASTER_RUANG,
  DEFAULT_MASTER_RAK,
  DEFAULT_MASTER_DUS
} from './data/initialMasterData';
import { INITIAL_AUDIT_LOGS } from './data/initialAuditData';
import { INITIAL_LOAN_RECORDS, INITIAL_DESTRUCTION_RECORDS } from './data/initialCirculationData';
import { INITIAL_APPROVAL_ITEMS } from './data/initialApprovalData';
import { canAccessClassification, redactArchiveItemIfRestricted, hasRolePermission } from './lib/permissions';

// =====================================================================
// FASE 4/5/6: Helper request ke backend Express (server.ts), BUKAN Laravel.
// Nama field `useLaravelApi`/`apiUrl` di ApiConfig peninggalan desain awal
// (rencana lama pakai backend Laravel terpisah); sekarang diarahkan ke
// backend Express+MySQL kita sendiri di port 3000. Nama field sengaja
// tidak diubah dulu supaya tidak merambat ke banyak file lain
// (BackendApiModal.tsx dll) — cuma perilakunya yang diperbaiki di sini.
// =====================================================================
async function apiRequest<T = any>(
  apiConfig: ApiConfig,
  path: string,
  options: RequestInit = {}
): Promise<{ ok: boolean; data?: T; error?: string }> {
  try {
    const res = await fetch(`${apiConfig.apiUrl}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(apiConfig.bearerToken ? { Authorization: `Bearer ${apiConfig.bearerToken}` } : {}),
        ...(options.headers || {}),
      },
    });

    const body = await res.json().catch(() => null);

    if (!res.ok) {
      return { ok: false, error: body?.message || `Request gagal (HTTP ${res.status})` };
    }

    return { ok: true, data: body };
  } catch (e: any) {
    return { ok: false, error: e?.message || 'Tidak bisa menghubungi server backend.' };
  }
}

import { Sidebar } from './components/Sidebar';
import { TopHeader } from './components/TopHeader';
import { ArchiveTable } from './components/ArchiveTable';
import { ArchiveFormModal } from './components/ArchiveFormModal';
import { ArchiveDetailModal } from './components/ArchiveDetailModal';
import { UnitInfoModal } from './components/UnitInfoModal';
import { ExportImportModal } from './components/ExportImportModal';
import { PrintView } from './components/PrintView';
import { LoginModal } from './components/LoginModal';
import { BackendApiModal } from './components/BackendApiModal';
import { UserManagementModal } from './components/UserManagementModal';
import { NotificationToast, ToastMessage } from './components/NotificationToast';

// Tahap 2 Components
import { DashboardView } from './components/DashboardView';
import { MasterDataView } from './components/MasterDataView';
import { LocationHierarchyView } from './components/LocationHierarchyView';
import { QrCodeModal } from './components/QrCodeModal';
import { QrScannerModal } from './components/QrScannerModal';
import { PdfViewerModal } from './components/PdfViewerModal';

// Phase 2 Circulation & Retention Components
import { CirculationView } from './components/CirculationView';
import { RetentionDestructionView } from './components/RetentionDestructionView';

// Tahap 3 Administrasi Components
import { ApprovalView } from './components/ApprovalView';
import { ReportsView } from './components/ReportsView';
import { AuditLogView } from './components/AuditLogView';
import { RecycleBinView } from './components/RecycleBinView';
import { BackupRestoreView } from './components/BackupRestoreView';
import { SopRegisterView } from './components/SopRegisterView';

import { 
  LayoutDashboard, 
  FileText, 
  Database, 
  Building2, 
  QrCode, 
  BarChart3, 
  History, 
  Trash2, 
  DatabaseBackup,
  BookOpenCheck,
  Flame,
  ShieldCheck,
  Lock,
  LogIn
} from 'lucide-react';

const STORAGE_KEY_ITEMS = 'daftar_pertelaan_arsip_2026_v2';
const STORAGE_KEY_UNIT = 'daftar_pertelaan_unit_2026_v2';
const STORAGE_KEY_USER = 'daftar_pertelaan_user_2026_v2';
const STORAGE_KEY_USERS_LIST = 'daftar_pertelaan_users_list_2026_v2';
const STORAGE_KEY_API_CONFIG = 'daftar_pertelaan_api_config_2026_v2';

const STORAGE_KEY_KAT = 'master_kategori_2026_v2';
const STORAGE_KEY_UNITS = 'master_units_2026_v2';
const STORAGE_KEY_GDG = 'master_gedung_2026_v2';
const STORAGE_KEY_RNG = 'master_ruang_2026_v2';
const STORAGE_KEY_RAK = 'master_rak_2026_v2';
const STORAGE_KEY_DUS = 'master_dus_2026_v2';
const STORAGE_KEY_AUDIT_LOGS = 'daftar_pertelaan_audit_logs_2026_v2';
const STORAGE_KEY_LOANS = 'daftar_pertelaan_loans_2026_v2';
const STORAGE_KEY_DESTRUCTION = 'daftar_pertelaan_destruction_2026_v2';
const STORAGE_KEY_APPROVALS = 'daftar_pertelaan_approvals_2026_v2';

export default function App() {
  // Navigation Tab State
  const [activeTab, setActiveTab] = useState<MainViewTab>('dashboard');

  // FASE (redesain sidebar): drawer sidebar di layar sempit (mobile/tablet)
  // -- di layar lebar (lg:) sidebar selalu statis/permanen, state ini
  // diabaikan lewat class Tailwind `lg:translate-x-0` di Sidebar.tsx.
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Kotak pencarian global di TopHeader.tsx -- diteruskan ke ArchiveTable
  // (lihat prop `initialSearchQuery`) supaya mengetik di header benar-benar
  // menyaring tabel arsip, bukan cuma navigasi tanpa efek.
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');

  const handleGlobalSearchChange = (value: string) => {
    setGlobalSearchQuery(value);
    if (value.trim().length > 0 && activeTab !== 'arsip') {
      setActiveTab('arsip');
    }
  };

  // Tahap 4: Toast Notification Stack State
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((type: 'success' | 'error' | 'warning' | 'info', title: string, description?: string) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, type, title, description, timestamp: new Date().toLocaleTimeString() }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Users & Auth state
  const [users, setUsers] = useState<User[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_USERS_LIST);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to parse users list:', e);
    }
    return DEFAULT_USERS;
  });

  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_USER);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to parse current user:', e);
    }
    // FASE 7: dulu auto-login sebagai DEFAULT_USERS[0] tanpa password
    // sama sekali. Sekarang wajib login sungguhan lewat backend, jadi
    // default-nya "belum login" (null) sampai LoginModal berhasil
    // memanggil POST /api/auth/login.
    return null;
  });

  const [apiConfig, setApiConfig] = useState<ApiConfig>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_API_CONFIG);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to parse API config:', e);
    }
    return {
      // FASE 4: backend server.ts jalan di port 3000 (lihat server.ts:PORT),
      // bukan 8000 — sebelumnya default ini salah sehingga toggle manapun
      // yang dipilih user tetap gagal connect. Sekarang default AKTIF
      // karena backend + MySQL sudah siap (FASE 1-3).
      useLaravelApi: true,
      apiUrl: 'http://localhost:3000/api',
      bearerToken: '',
    };
  });

  // FASE 7: apiConfig (URL, dsb) dan currentUser (termasuk token JWT)
  // disimpan di localStorage KEY terpisah supaya konfigurasi API tidak
  // ikut ke-reset tiap logout. Efek ini menjaga keduanya tetap sinkron:
  // begitu currentUser (dan tokennya) berubah, apiConfig.bearerToken
  // ikut diperbarui supaya semua pemanggilan apiRequest() otomatis
  // terautentikasi tanpa perlu diulang di setiap handler.
  useEffect(() => {
    setApiConfig((prev) => {
      const nextToken = currentUser?.token || '';
      if (prev.bearerToken === nextToken) return prev;
      return { ...prev, bearerToken: nextToken };
    });
  }, [currentUser?.token]);

  // FASE 7: saat aplikasi baru dibuka dan ada sesi tersimpan di
  // localStorage, verifikasi ulang token itu ke backend (GET /auth/me).
  // Kalau token sudah kedaluwarsa/tidak valid lagi (mis. akun
  // dinonaktifkan admin), sesi lokal otomatis dibersihkan supaya user
  // tidak "terlihat login" padahal request berikutnya pasti ditolak 401.
  useEffect(() => {
    if (!currentUser?.token || !apiConfig.useLaravelApi) return;

    let cancelled = false;
    (async () => {
      const result = await apiRequest<{ user: any }>(
        { ...apiConfig, bearerToken: currentUser.token },
        '/auth/me'
      );
      if (cancelled) return;
      if (!result.ok) {
        setCurrentUser(null);
      }
    })();

    return () => {
      cancelled = true;
    };
    // Sengaja hanya dijalankan sekali saat mount (memakai nilai awal
    // currentUser dari localStorage) — bukan tiap kali currentUser berubah,
    // supaya tidak memvalidasi ulang berkali-kali setelah login normal.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  const [items, setItems] = useState<ArchiveItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_ITEMS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error('Failed to parse saved archive items:', e);
    }
    return SAMPLE_ARCHIVE_ITEMS; // Default to sample items so app starts rich
  });

  const [unitInfo, setUnitInfo] = useState<UnitInfo>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_UNIT);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to parse saved unit info:', e);
    }
    return INITIAL_UNIT_INFO;
  });

  // Master Data States (Tahap 2)
  const [masterKategori, setMasterKategori] = useState<MasterKategori[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_KAT);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return DEFAULT_MASTER_KATEGORI;
  });

  const [masterUnit, setMasterUnit] = useState<MasterUnit[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_UNITS);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return DEFAULT_MASTER_UNIT;
  });

  const [masterGedung, setMasterGedung] = useState<MasterGedung[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_GDG);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return DEFAULT_MASTER_GEDUNG;
  });

  const [masterRuang, setMasterRuang] = useState<MasterRuang[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_RNG);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return DEFAULT_MASTER_RUANG;
  });

  const [masterRak, setMasterRak] = useState<MasterRak[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_RAK);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return DEFAULT_MASTER_RAK;
  });

  const [masterDus, setMasterDus] = useState<MasterDus[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_DUS);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return DEFAULT_MASTER_DUS;
  });

  // Audit Logs State (Tahap 3)
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_AUDIT_LOGS);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return INITIAL_AUDIT_LOGS;
  });

  // Loans State (Phase 2)
  const [loans, setLoans] = useState<LoanRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_LOANS);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return INITIAL_LOAN_RECORDS;
  });

  // Destruction Records State (Phase 2)
  const [destructionRecords, setDestructionRecords] = useState<DestructionRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_DESTRUCTION);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return INITIAL_DESTRUCTION_RECORDS;
  });

  // Approvals State (Phase 3)
  const [approvals, setApprovals] = useState<ApprovalItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_APPROVALS);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return INITIAL_APPROVAL_ITEMS;
  });

  // Modal & View States
  const [isAddEditOpen, setIsAddEditOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ArchiveItem | null>(null);
  const [viewingDetailItem, setViewingDetailItem] = useState<ArchiveItem | null>(null);
  const [isUnitModalOpen, setIsUnitModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isPrintViewOpen, setIsPrintViewOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isBackendModalOpen, setIsBackendModalOpen] = useState(false);
  const [isUserManagementModalOpen, setIsUserManagementModalOpen] = useState(false);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [usersLoadError, setUsersLoadError] = useState('');

  // "Buat Akun": memuat daftar akun SUNGGUHAN dari MySQL (GET /api/users)
  // begitu modal manajemen pengguna dibuka -- sebelumnya modal ini hanya
  // menampilkan `users` dari localStorage yang bisa saja sudah tidak
  // sinkron dengan siapa yang benar-benar bisa login. Endpoint ini hanya
  // bisa dipanggil oleh super_admin (lihat backend/routes/users.ts), jadi
  // effect ini otomatis tidak melakukan apa-apa untuk peran lain --
  // konsisten dengan tombol pemicunya yang juga sudah digerbang dengan
  // `hasRolePermission(role, 'manageUser')` di Header.tsx.
  useEffect(() => {
    if (!isUserManagementModalOpen || !apiConfig.useLaravelApi || !currentUser?.token) return;
    let cancelled = false;
    setIsLoadingUsers(true);
    setUsersLoadError('');

    (async () => {
      const result = await apiRequest<{ data: any[] }>(apiConfig, '/users');
      if (cancelled) return;
      if (result.ok && result.data?.data) {
        const mapped: User[] = result.data.data.map((u) => ({
          id: u.id,
          name: u.name,
          username: u.username,
          email: u.email,
          role: u.role,
          unitKerja: u.unitKerja,
          avatarUrl: u.avatarUrl,
        }));
        setUsers(mapped);
      } else if (result.error) {
        setUsersLoadError(result.error);
      }
      setIsLoadingUsers(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [isUserManagementModalOpen, apiConfig.useLaravelApi, apiConfig.apiUrl, currentUser?.token]);

  // QR Code & PDF Modals
  const [selectedQrItem, setSelectedQrItem] = useState<ArchiveItem | null>(null);
  const [selectedPdfItem, setSelectedPdfItem] = useState<ArchiveItem | null>(null);

  // Sync with LocalStorage
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY_ITEMS, JSON.stringify(items)); } catch (e) {}
  }, [items]);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY_UNIT, JSON.stringify(unitInfo)); } catch (e) {}
  }, [unitInfo]);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(currentUser)); } catch (e) {}
  }, [currentUser]);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY_USERS_LIST, JSON.stringify(users)); } catch (e) {}
  }, [users]);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY_API_CONFIG, JSON.stringify(apiConfig)); } catch (e) {}
  }, [apiConfig]);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY_KAT, JSON.stringify(masterKategori)); } catch (e) {}
  }, [masterKategori]);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY_UNITS, JSON.stringify(masterUnit)); } catch (e) {}
  }, [masterUnit]);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY_GDG, JSON.stringify(masterGedung)); } catch (e) {}
  }, [masterGedung]);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY_RNG, JSON.stringify(masterRuang)); } catch (e) {}
  }, [masterRuang]);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY_RAK, JSON.stringify(masterRak)); } catch (e) {}
  }, [masterRak]);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY_DUS, JSON.stringify(masterDus)); } catch (e) {}
  }, [masterDus]);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY_AUDIT_LOGS, JSON.stringify(auditLogs)); } catch (e) {}
  }, [auditLogs]);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY_LOANS, JSON.stringify(loans)); } catch (e) {}
  }, [loans]);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY_DESTRUCTION, JSON.stringify(destructionRecords)); } catch (e) {}
  }, [destructionRecords]);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY_APPROVALS, JSON.stringify(approvals)); } catch (e) {}
  }, [approvals]);

  // =====================================================================
  // FASE 4: Muat data awal dari backend (MySQL) saat aplikasi dibuka,
  // menggantikan localStorage/SAMPLE_ARCHIVE_ITEMS sebagai sumber utama.
  // includeDeleted=1 supaya recycle bin (FASE 6) langsung ikut termuat
  // dalam satu request yang sama (lihat activeItems/deletedItems di bawah,
  // keduanya diturunkan dari array `items` yang sama).
  //
  // Kalau backend tidak terjangkau (server mati, dsb), fallback DIAM-DIAM
  // ke data yang sudah ada di state (localStorage/sample) supaya frontend
  // tetap bisa dipakai untuk demo/offline — cuma dikasih toast peringatan.
  // =====================================================================
  useEffect(() => {
    if (!apiConfig.useLaravelApi) return;
    // FASE 7: /api/arsip & /api/audit-logs sekarang mewajibkan login
    // (requireAuth di backend). Tanpa pengecekan ini, effect akan selalu
    // gagal dengan 401 tiap kali aplikasi dibuka sebelum user login, dan
    // menampilkan toast "Backend Tidak Terhubung" yang menyesatkan
    // (padahal backend-nya terhubung, cuma request-nya belum terautentikasi).
    if (!currentUser?.token) return;
    let cancelled = false;

    (async () => {
      const [arsipResult, auditResult] = await Promise.all([
        apiRequest<{ status: string; total: number; data: ArchiveItem[] }>(
          apiConfig,
          '/arsip?includeDeleted=1'
        ),
        apiRequest<{
          status: string;
          total: number;
          data: Array<{ id: string; timestamp: string; user: string; role: string; action: string; itemTarget: string; details: string }>;
        }>(apiConfig, '/audit-logs'),
      ]);

      if (cancelled) return;

      if (arsipResult.ok && arsipResult.data?.data) {
        setItems(arsipResult.data.data);
      } else if (arsipResult.error) {
        console.warn('[FASE 4] Gagal memuat arsip dari backend, memakai data lokal:', arsipResult.error);
        addToast(
          'warning',
          'Backend Tidak Terhubung',
          `Menampilkan data lokal/tersimpan. Detail: ${arsipResult.error}`
        );
      }

      if (auditResult.ok && auditResult.data?.data) {
        const mapped: AuditLogEntry[] = auditResult.data.data.map((row) => ({
          id: row.id,
          timestamp: row.timestamp,
          userName: row.user,
          userRole: row.role,
          // FASE 8: tabel audit_logs sungguhan di MySQL — cast ini aman
          // karena hanya dipakai untuk label tampilan.
          action: row.action as AuditLogEntry['action'],
          itemTarget: row.itemTarget || '-',
          details: row.details,
        }));
        setAuditLogs(mapped);
      }
    })();

    return () => {
      cancelled = true;
    };
    // Reload data kalau user login/logout (currentUser?.token berubah),
    // atau kalau toggle API/apiUrl diganti lewat BackendApiModal.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiConfig.useLaravelApi, apiConfig.apiUrl, currentUser?.token]);

  // Helper to record Audit Logs
  // FASE 8: sekarang benar-benar tersambung ke tabel `audit_logs` di
  // MySQL (backend/routes/audit.ts), bukan lagi array in-memory di
  // server.ts yang hilang tiap restart. State lokal (`auditLogs`) tetap
  // dipakai duluan (optimistic) supaya UI tidak menunggu network; POST
  // ke backend jalan di background. Backend TIDAK memakai user/role
  // yang dikirim dari sini (identitas selalu diambil dari token JWT
  // yang sedang login, demi keamanan audit trail — lihat komentar di
  // backend/routes/audit.ts), jadi kolom itu tidak perlu dikirim lagi.
  const addAuditLog = (
    action: 'TAMBAH' | 'UBAH' | 'SOFT_DELETE' | 'PULIHKAN' | 'HAPUS_PERMANEN' | 'BACKUP' | 'RESTORE' | 'LOGIN' | 'LOGOUT',
    itemTarget: string,
    details: string
  ) => {
    const newLog: AuditLogEntry = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userName: currentUser ? `${currentUser.name}` : 'Sistem / Anonim',
      userRole: currentUser ? currentUser.role : 'viewer',
      action,
      itemTarget,
      details,
    };
    setAuditLogs((prev) => [newLog, ...prev]);

    if (apiConfig.useLaravelApi && currentUser?.token) {
      apiRequest(apiConfig, '/audit-logs', {
        method: 'POST',
        body: JSON.stringify({ action, itemTarget, details }),
      }).then((result) => {
        if (!result.ok) {
          console.warn('[Audit Log] Gagal sinkron ke backend:', result.error);
        }
      });
    }
  };

  // Derived stats (Active vs Soft Deleted)
  const activeItems = useMemo(() => items.filter((i) => !i.isDeleted), [items]);
  const deletedItems = useMemo(() => items.filter((i) => i.isDeleted), [items]);

  // Versi arsip yang sudah disamarkan (redacted) sesuai klasifikasi akses &
  // peran pengguna yang sedang login. WAJIB dipakai untuk semua tampilan
  // (tabel, dashboard, cetak, laporan, ekspor) — jangan pakai `activeItems`
  // mentah untuk hal-hal yang dirender ke layar, supaya isi arsip
  // Rahasia/Sangat Rahasia tidak bocor ke peran yang tidak berwenang.
  const visibleItems = useMemo(
    () => activeItems.map((item) => redactArchiveItemIfRestricted(item, currentUser?.role)),
    [activeItems, currentUser]
  );

  const totalDus = useMemo(() => {
    const dusSet = new Set<string>();
    activeItems.forEach((item) => {
      if (item.noDus) dusSet.add(item.noDus);
    });
    return dusSet.size;
  }, [activeItems]);

  const totalLocations = useMemo(() => {
    const locSet = new Set<string>();
    activeItems.forEach((item) => {
      if (item.lokasiPenyimpanan) locSet.add(item.lokasiPenyimpanan);
    });
    return locSet.size;
  }, [activeItems]);

  const existingDusList = useMemo(() => {
    const dusSet = new Set<string>();
    activeItems.forEach((item) => {
      if (item.noDus) dusSet.add(item.noDus);
    });
    return Array.from(dusSet).sort();
  }, [activeItems]);

  // User & Role Handlers
  const handleLogin = (user: User) => {
    setCurrentUser(user);

    const loginLog: AuditLogEntry = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userName: user.name,
      userRole: user.role,
      action: 'LOGIN',
      itemTarget: 'Autentikasi User',
      details: `Pengguna ${user.name} (${user.role}) berhasil masuk ke sistem`,
    };
    setAuditLogs((prev) => [loginLog, ...prev]);

    // Dikirim dengan token dari parameter `user` secara langsung (bukan
    // lewat addAuditLog/apiConfig.bearerToken) karena setCurrentUser di
    // atas belum tentu sudah membuat efek `apiConfig.bearerToken` selaras
    // pada saat baris ini dieksekusi (setState bersifat asinkron) — tanpa
    // ini, POST log LOGIN yang pertama bisa terkirim tanpa header
    // Authorization dan ditolak 401 oleh backend.
    if (apiConfig.useLaravelApi && user.token) {
      apiRequest({ ...apiConfig, bearerToken: user.token }, '/audit-logs', {
        method: 'POST',
        body: JSON.stringify({ action: 'LOGIN', itemTarget: 'Autentikasi User', details: loginLog.details }),
      }).then((result) => {
        if (!result.ok) console.warn('[Audit Log] Gagal sinkron log LOGIN ke backend:', result.error);
      });
    }

    addToast('success', 'Berhasil Masuk', `Selamat datang kembali, ${user.name} (${user.role})`);
  };

  const handleLogout = () => {
    if (currentUser) {
      // FASE 7 (revisi): sebelumnya baris ini memanggil
      // addAuditLog('LOGIN', 'Keluar User', ...) -- action-nya SALAH
      // (menandai logout sebagai LOGIN), dan juga mengirim POST
      // /api/audit-logs terpisah dari POST /api/auth/logout di bawah.
      // Kalau dua request async itu tiba di server tidak berurutan,
      // ada risiko token sudah keburu masuk token_blacklist duluan
      // sebelum audit log-nya sempat tercatat (POST /api/audit-logs
      // ikut ditolak 401). Sekarang backend yang mencatat action
      // LOGOUT sebagai bagian dari SATU request POST /api/auth/logout
      // yang sama (lihat backend/routes/auth.ts) -- baris di sini
      // hanya menambah entri lokal untuk tampilan optimistic (dan
      // satu-satunya sumber log kalau mode demo tanpa backend).
      const logoutLog: AuditLogEntry = {
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString(),
        userName: currentUser.name,
        userRole: currentUser.role,
        action: 'LOGOUT',
        itemTarget: 'Autentikasi User',
        details: `Pengguna ${currentUser.name} keluar dari sistem`,
      };
      setAuditLogs((prev) => [logoutLog, ...prev]);
      addToast('info', 'Berhasil Keluar', `Pengguna ${currentUser.name} telah keluar dari sesi.`);

      // Logout JWT Blacklist: memberi tahu backend supaya token yang
      // sedang dipakai dicabut (dicatat ke token_blacklist) -- bukan
      // cuma dibuang di sisi client. Lihat backend/middleware/auth.ts.
      if (apiConfig.useLaravelApi && currentUser.token) {
        apiRequest({ ...apiConfig, bearerToken: currentUser.token }, '/auth/logout', { method: 'POST' });
      }
    }
    setCurrentUser(null);
  };

  // "Buat Akun": sebelumnya ketiga handler ini cuma memanipulasi state
  // `users` lokal (localStorage) -- akun yang "dibuat" di sini TIDAK
  // PERNAH benar-benar ada di tabel `users` MySQL, jadi tidak akan
  // pernah bisa dipakai untuk login sungguhan lewat POST /api/auth/login.
  // Sekarang ketiganya memanggil backend/routes/users.ts, dan
  // mengembalikan pesan error (string) kalau gagal supaya
  // UserManagementModal bisa menampilkannya di form alih-alih menutup
  // form seolah berhasil.
  const handleAddUser = async (input: NewUserInput): Promise<string | null> => {
    if (!apiConfig.useLaravelApi) {
      return 'Backend API sedang nonaktif (lihat Tahap 1 Fondasi). Aktifkan dulu untuk membuat akun sungguhan.';
    }
    const result = await apiRequest<{ data: any }>(apiConfig, '/users', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    if (!result.ok) return result.error || 'Gagal membuat akun pengguna.';

    const created = result.data!.data;
    const newUser: User = {
      id: created.id,
      name: created.name,
      username: created.username,
      email: created.email,
      role: created.role,
      unitKerja: created.unitKerja,
      avatarUrl: created.avatarUrl,
    };
    setUsers((prev) => [...prev, newUser]);
    addAuditLog('TAMBAH', `Akun: ${newUser.username}`, `Akun baru "${newUser.name}" (${newUser.role}) dibuat.`);
    addToast('success', 'Pengguna Ditambahkan', `User ${newUser.name} berhasil dibuat & bisa langsung login.`);
    return null;
  };

  const handleUpdateUser = async (input: UpdateUserInput): Promise<string | null> => {
    if (!apiConfig.useLaravelApi) {
      return 'Backend API sedang nonaktif (lihat Tahap 1 Fondasi). Aktifkan dulu untuk mengubah akun sungguhan.';
    }
    const result = await apiRequest<{ data: any }>(apiConfig, `/users/${input.id}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    });
    if (!result.ok) return result.error || 'Gagal memperbarui akun pengguna.';

    const updated = result.data!.data;
    const updatedUser: User = {
      id: updated.id,
      name: updated.name,
      username: updated.username,
      email: updated.email,
      role: updated.role,
      unitKerja: updated.unitKerja,
      avatarUrl: updated.avatarUrl,
    };
    setUsers((prev) => prev.map((u) => (u.id === updatedUser.id ? updatedUser : u)));
    // Kalau yang diedit adalah diri sendiri, sinkronkan currentUser juga
    // (TAPI token JWT yang sedang aktif tetap dipakai apa adanya --
    // mengubah role/nama tidak mencabut sesi yang sedang berjalan; kalau
    // role berubah, hak akses baru berlaku efektif setelah login ulang).
    if (currentUser?.id === updatedUser.id) {
      setCurrentUser((prev) => (prev ? { ...prev, ...updatedUser, token: prev.token } : prev));
    }
    addAuditLog('UBAH', `Akun: ${updatedUser.username}`, `Data akun "${updatedUser.name}" diperbarui.`);
    addToast('info', 'Pengguna Diperbarui', `Data user ${updatedUser.name} telah disimpan.`);
    return null;
  };

  const handleDeleteUser = async (userId: string): Promise<string | null> => {
    if (!apiConfig.useLaravelApi) {
      return 'Backend API sedang nonaktif (lihat Tahap 1 Fondasi). Aktifkan dulu untuk menghapus akun sungguhan.';
    }
    const target = users.find((u) => u.id === userId);
    const result = await apiRequest(apiConfig, `/users/${userId}`, { method: 'DELETE' });
    if (!result.ok) return result.error || 'Gagal menghapus akun pengguna.';

    setUsers((prev) => prev.filter((u) => u.id !== userId));
    addAuditLog('HAPUS_PERMANEN', `Akun: ${target?.username || userId}`, `Akun "${target?.name || userId}" dihapus dari sistem.`);
    addToast('warning', 'Pengguna Dihapus', 'User telah dihapus dari sistem.');
    return null;
  };

  // Master Data Handlers
  const handleSaveKategori = (item: MasterKategori) => {
    setMasterKategori((prev) => {
      const idx = prev.findIndex((k) => k.id === item.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = item;
        return next;
      }
      return [...prev, item];
    });
    addToast('success', 'Master Kategori Tersimpan', `Kategori ${item.nama} berhasil diperbarui.`);
  };
  const handleDeleteKategori = (id: string) => {
    // Cegah data yatim: jangan hapus kategori yang masih dipakai oleh arsip.
    const usedCount = items.filter((it) => !it.isDeleted && (it.kategoriId === id)).length;
    if (usedCount > 0) {
      addToast('error', 'Kategori Tidak Dapat Dihapus', `Kategori ini masih dipakai oleh ${usedCount} arsip. Ubah kategori arsip tersebut terlebih dahulu.`);
      return;
    }
    setMasterKategori((prev) => prev.filter((k) => k.id !== id));
    addToast('warning', 'Master Kategori Dihapus', `Kategori telah dihapus.`);
  };

  const handleSaveUnit = (item: MasterUnit) => {
    setMasterUnit((prev) => {
      const idx = prev.findIndex((u) => u.id === item.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = item;
        return next;
      }
      return [...prev, item];
    });
    addToast('success', 'Master Unit Tersimpan', `Unit Kerja ${item.namaUnit} berhasil disimpan.`);
  };
  const handleDeleteUnit = (id: string) => {
    // Cegah data yatim: jangan hapus unit yang masih dipakai oleh arsip.
    const usedCount = items.filter((it) => !it.isDeleted && (it.unitId === id)).length;
    if (usedCount > 0) {
      addToast('error', 'Unit Tidak Dapat Dihapus', `Unit Kerja ini masih dipakai oleh ${usedCount} arsip. Ubah unit pengolah arsip tersebut terlebih dahulu.`);
      return;
    }
    setMasterUnit((prev) => prev.filter((u) => u.id !== id));
    addToast('warning', 'Master Unit Dihapus', `Unit Kerja telah dihapus.`);
  };

  const handleSaveGedung = (item: MasterGedung) => {
    setMasterGedung((prev) => {
      const idx = prev.findIndex((g) => g.id === item.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = item;
        return next;
      }
      return [...prev, item];
    });
    addToast('success', 'Master Gedung Tersimpan', `Gedung/Depo ${item.namaGedung} disimpan.`);
  };
  const handleDeleteGedung = (id: string) => setMasterGedung((prev) => prev.filter((g) => g.id !== id));

  const handleSaveRuang = (item: MasterRuang) => setMasterRuang((prev) => [...prev.filter(r => r.id !== item.id), item]);
  const handleDeleteRuang = (id: string) => setMasterRuang((prev) => prev.filter((r) => r.id !== id));

  const handleSaveRak = (item: MasterRak) => setMasterRak((prev) => [...prev.filter(r => r.id !== item.id), item]);
  const handleDeleteRak = (id: string) => setMasterRak((prev) => prev.filter((r) => r.id !== id));

  const handleSaveDus = (item: MasterDus) => setMasterDus((prev) => [...prev.filter(d => d.id !== item.id), item]);
  const handleDeleteDus = (id: string) => setMasterDus((prev) => prev.filter((d) => d.id !== id));

  // Item Handlers (Tahap 3 Soft Delete & Audit Logging & Tahap 4 Toast)
  const handleOpenAdd = () => {
    setEditingItem(null);
    setIsAddEditOpen(true);
  };

  const handleEdit = (item: ArchiveItem) => {
    if (!canAccessClassification(currentUser?.role, item.klasifikasiAkses || 'INTERNAL')) {
      addToast('error', 'Akses Ditolak', 'Peran Anda tidak berwenang mengedit arsip dengan klasifikasi akses ini.');
      return;
    }
    setEditingItem(item);
    setIsAddEditOpen(true);
  };

  const handleSaveItem = async (data: Partial<ArchiveItem>) => {
    if (data.id) {
      // Edit existing.
      // FASE 5: kalau backend aktif, PUT dulu dan pakai hasil balikan
      // server (sumber kebenaran = MySQL) untuk update state. Kalau
      // gagal/backend mati, tetap fallback ke update optimistic lokal
      // supaya form tidak "hilang" perubahan user.
      if (apiConfig.useLaravelApi) {
        const result = await apiRequest<{ status: string; data: ArchiveItem }>(
          apiConfig,
          `/arsip/${data.id}`,
          { method: 'PUT', body: JSON.stringify(data) }
        );

        if (result.ok && result.data?.data) {
          const saved = result.data.data;
          setItems((prev) => prev.map((item) => (item.id === saved.id ? saved : item)));
          addAuditLog('UBAH', saved.nomorKeputusan, `Memperbarui rincian berkas perihal: "${saved.perihal}"`);
          addToast('success', 'Berkas Diperbarui', `Dokumen SK ${saved.nomorKeputusan} berhasil disimpan ke database.`);
          return;
        }

        addToast(
          'warning',
          'Gagal Sinkron ke Server',
          `Perubahan disimpan lokal saja. Detail: ${result.error || 'tidak diketahui'}`
        );
      }

      // Mode lokal (backend nonaktif) atau fallback saat request gagal.
      setItems((prev) =>
        prev.map((item) =>
          item.id === data.id
            ? ({
                ...item,
                ...data,
                updatedAt: new Date().toISOString(),
              } as ArchiveItem)
            : item
        )
      );
      addAuditLog('UBAH', data.nomorKeputusan || data.id, `Memperbarui rincian berkas perihal: "${data.perihal}"`);
      addToast('success', 'Berkas Diperbarui', `Dokumen SK ${data.nomorKeputusan} berhasil disimpan.`);
    } else {
      // Add new.
      // FASE 5: kalau backend aktif, POST dulu — biarkan MySQL yang
      // membuat id (AUTO dari server.ts, format arsip-<base36 timestamp>),
      // bukan id yang dibuat di klien, supaya tidak ada dua sumber id.
      if (apiConfig.useLaravelApi) {
        const result = await apiRequest<{ status: string; data: ArchiveItem }>(
          apiConfig,
          '/arsip',
          { method: 'POST', body: JSON.stringify(data) }
        );

        if (result.ok && result.data?.data) {
          const saved = result.data.data;
          setItems((prev) => [saved, ...prev]);
          addAuditLog('TAMBAH', saved.nomorKeputusan, `Menambahkan berkas pertelaan baru ke dalam ${saved.noDus}`);
          addToast('success', 'Berkas Ditambahkan', `Dokumen SK ${saved.nomorKeputusan} disimpan di ${saved.noDus} (database).`);
          return;
        }

        addToast(
          'warning',
          'Gagal Sinkron ke Server',
          `Berkas disimpan lokal saja. Detail: ${result.error || 'tidak diketahui'}`
        );
      }

      // Mode lokal (backend nonaktif) atau fallback saat request gagal.
      const newItem: ArchiveItem = {
        id: `arsip-2026-${Date.now()}`,
        nomorKeputusan: data.nomorKeputusan || '',
        tanggal: data.tanggal || new Date().toISOString().split('T')[0],
        perihal: data.perihal || '',
        noDus: data.noDus || 'DUS-01/2026',
        lokasiPenyimpanan: data.lokasiPenyimpanan || '',
        keterangan: data.keterangan || '',
        unitPengolah: data.unitPengolah || '',
        kategoriArsip: data.kategoriArsip || 'Inaktif',
        pdfAttachment: data.pdfAttachment,
        isDeleted: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      setItems((prev) => [newItem, ...prev]);
      addAuditLog('TAMBAH', newItem.nomorKeputusan, `Menambahkan berkas pertelaan baru ke dalam ${newItem.noDus}`);
      addToast('success', 'Berkas Ditambahkan', `Dokumen SK ${newItem.nomorKeputusan} disimpan di ${newItem.noDus}.`);
    }
  };

  // Soft Delete Handler
  const handleSoftDelete = async (id: string) => {
    const target = items.find((i) => i.id === id);
    if (!target) return;

    const deletedBy = currentUser ? currentUser.name : 'Admin';

    if (apiConfig.useLaravelApi) {
      const result = await apiRequest(apiConfig, `/arsip/${id}`, {
        method: 'DELETE',
        body: JSON.stringify({ deletedBy }),
      });

      if (!result.ok) {
        addToast('warning', 'Gagal Sinkron ke Server', `Dipindahkan lokal saja. Detail: ${result.error}`);
      }
    }

    setItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              isDeleted: true,
              deletedAt: new Date().toLocaleString('id-ID'),
              deletedBy,
            }
          : item
      )
    );

    addAuditLog('SOFT_DELETE', target.nomorKeputusan, `Memindahkan berkas ke Tempat Sampah (Recycle Bin)`);
    addToast('warning', 'Dipindahkan ke Tempat Sampah', `Berkas ${target.nomorKeputusan} dipindahkan ke sampah.`);
  };

  // Restore Soft Deleted Item
  // FASE 6: sekarang benar-benar memanggil POST /api/arsip/:id/restore
  // (endpoint ini sudah ada di server.ts sejak FASE 3, tapi sebelumnya
  // tidak pernah dipanggil dari frontend sama sekali).
  const handleRestoreItem = async (id: string) => {
    const target = items.find((i) => i.id === id);
    if (!target) return;

    if (apiConfig.useLaravelApi) {
      const result = await apiRequest(apiConfig, `/arsip/${id}/restore`, { method: 'POST' });
      if (!result.ok) {
        addToast('warning', 'Gagal Sinkron ke Server', `Dipulihkan lokal saja. Detail: ${result.error}`);
      }
    }

    setItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              isDeleted: false,
              deletedAt: undefined,
              deletedBy: undefined,
            }
          : item
      )
    );

    addAuditLog('PULIHKAN', target.nomorKeputusan, `Memulihkan berkas dari Tempat Sampah ke Pertelaan Aktif`);
    addToast('success', 'Berkas Dipulihkan', `Dokumen ${target.nomorKeputusan} dikembalikan ke daftar aktif.`);
  };

  // Hard Delete Permanently
  // FASE 6: sekarang memanggil DELETE /api/arsip/:id/permanent
  // (endpoint sudah ada sejak FASE 3, sebelumnya tidak pernah dipanggil).
  const handleHardDeleteItem = async (id: string) => {
    const target = items.find((i) => i.id === id);
    if (!target) return;

    if (apiConfig.useLaravelApi) {
      const result = await apiRequest(apiConfig, `/arsip/${id}/permanent`, { method: 'DELETE' });
      if (!result.ok) {
        addToast('warning', 'Gagal Sinkron ke Server', `Dihapus lokal saja. Detail: ${result.error}`);
      }
    }

    setItems((prev) => prev.filter((item) => item.id !== id));
    addAuditLog('HAPUS_PERMANEN', target.nomorKeputusan, `Menghapus berkas secara PERMANEN dari database`);
    addToast('error', 'Dihapus Permanen', `Dokumen ${target.nomorKeputusan} telah dihapus selamanya.`);
  };

  // Empty Recycle Bin
  // FASE 6: sekarang memanggil DELETE /api/arsip/trash/empty (endpoint
  // baru, sebelumnya recycle bin cuma dikosongkan di state lokal saja).
  const handleEmptyRecycleBin = async () => {
    const deletedCount = deletedItems.length;

    if (apiConfig.useLaravelApi) {
      const result = await apiRequest(apiConfig, '/arsip/trash/empty', { method: 'DELETE' });
      if (!result.ok) {
        addToast('warning', 'Gagal Sinkron ke Server', `Dikosongkan lokal saja. Detail: ${result.error}`);
      }
    }

    setItems((prev) => prev.filter((item) => !item.isDeleted));
    addAuditLog('HAPUS_PERMANEN', `${deletedCount} Berkas`, `Mengosongkan tempat sampah secara permanen`);
    addToast('error', 'Tempat Sampah Dikosongkan', `${deletedCount} berkas dihapus secara permanen.`);
  };

  const handleDuplicateItem = (item: ArchiveItem) => {
    if (!canAccessClassification(currentUser?.role, item.klasifikasiAkses || 'INTERNAL')) {
      addToast('error', 'Akses Ditolak', 'Peran Anda tidak berwenang menduplikasi arsip dengan klasifikasi akses ini.');
      return;
    }
    const copyItem: ArchiveItem = {
      ...item,
      id: `arsip-2026-${Date.now()}`,
      nomorKeputusan: `${item.nomorKeputusan} (Salinan)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setItems((prev) => [copyItem, ...prev]);
    addAuditLog('TAMBAH', copyItem.nomorKeputusan, `Menduplikasi berkas dari ${item.nomorKeputusan}`);
    addToast('info', 'Salinan Dibuat', `Duplikasi dokumen ${copyItem.nomorKeputusan} dibuat.`);
  };

  const handleResetSampleData = () => {
    setItems(SAMPLE_ARCHIVE_ITEMS);
    setUnitInfo(INITIAL_UNIT_INFO);
    addAuditLog('RESTORE', 'Sample Data', `Memuat ulang sampel data pertelaan awal`);
    addToast('info', 'Muat Sampel Data', `Data sampel pertelaan berhasil dimuat ulang.`);
  };

  const handleClearAllData = () => {
    setItems([]);
    addAuditLog('HAPUS_PERMANEN', 'Semua Data', `Mengosongkan seluruh database pertelaan arsip`);
    addToast('warning', 'Database Dikosongkan', `Semua data pertelaan telah dihapus.`);
  };

  const handleImportItems = (importedItems: ArchiveItem[]) => {
    // Rekonsiliasi terhadap master data: file impor bisa berasal dari sumber
    // luar (backup lama, sistem lain) yang unitId/kategoriId-nya sudah tidak
    // cocok atau malah tidak ada sama sekali. Tanpa ini, data arsip bisa
    // kembali "nyasar" seperti kasus sebelumnya.
    let unmatchedCount = 0;
    const reconciled = importedItems.map((item) => {
      const matchedUnit =
        masterUnit.find((u) => u.id === item.unitId) ||
        masterUnit.find((u) => u.namaUnit === item.unitPengolah);
      const matchedKategori =
        masterKategori.find((k) => k.id === item.kategoriId) ||
        masterKategori.find((k) => k.nama === item.kategoriArsip || k.nama === `Arsip ${item.kategoriArsip}`);

      if ((item.unitId && !matchedUnit) || (item.kategoriId && !matchedKategori) || (!item.unitId && item.unitPengolah && !matchedUnit) || (!item.kategoriId && item.kategoriArsip && !matchedKategori)) {
        unmatchedCount++;
      }

      return {
        ...item,
        unitId: matchedUnit?.id,
        unitPengolah: matchedUnit?.namaUnit ?? item.unitPengolah,
        kategoriId: matchedKategori?.id,
        kategoriArsip: matchedKategori?.nama ?? item.kategoriArsip,
      };
    });

    setItems(reconciled);
    addAuditLog('TAMBAH', `${reconciled.length} Item`, `Mengimpor data pertelaan dari file eksternal`);
    if (unmatchedCount > 0) {
      addToast('warning', 'Impor Selesai dengan Catatan', `${reconciled.length} data diimpor, namun ${unmatchedCount} item memiliki Unit/Kategori yang tidak cocok dengan Master Data dan perlu diperiksa ulang.`);
    } else {
      addToast('success', 'Impor Berhasil', `${reconciled.length} data pertelaan berhasil diimpor.`);
    }
  };

  // Phase 2: Circulation Loan Handler
  const handleAddLoan = (newLoan: LoanRecord) => {
    setLoans((prev) => [newLoan, ...prev]);
    setItems((prev) =>
      prev.map((item) =>
        item.id === newLoan.archiveId
          ? {
              ...item,
              statusSirkulasi: 'DIPINJAM',
              peminjamAktif: newLoan.peminjamNama,
              tanggalPinjamAktif: newLoan.tanggalPinjam,
              tanggalJatuhTempoAktif: newLoan.tanggalJatuhTempo,
            }
          : item
      )
    );
    addAuditLog('UBAH', newLoan.nomorKeputusan, `Peminjaman berkas oleh ${newLoan.peminjamNama} (${newLoan.peminjamUnit})`);
    addToast('success', 'Peminjaman Diterbitkan', `Dokumen ${newLoan.nomorKeputusan} dipinjam oleh ${newLoan.peminjamNama}.`);
  };

  // Phase 2: Circulation Return Handler
  const handleReturnLoan = (
    loanId: string,
    returnDate: string,
    condition: 'BAIK' | 'RUSAK' | 'HILANG',
    notes?: string
  ) => {
    const loan = loans.find((l) => l.id === loanId);
    if (!loan) return;

    setLoans((prev) =>
      prev.map((l) =>
        l.id === loanId
          ? {
              ...l,
              tanggalKembali: returnDate,
              status: 'DIKEMBALIKAN',
              kondisiKembali: condition,
              catatanKembali: notes,
            }
          : l
      )
    );

    setItems((prev) =>
      prev.map((item) =>
        item.id === loan.archiveId
          ? {
              ...item,
              statusSirkulasi: 'TERSEDIA',
              peminjamAktif: undefined,
              tanggalPinjamAktif: undefined,
              tanggalJatuhTempoAktif: undefined,
            }
          : item
      )
    );

    addAuditLog('UBAH', loan.nomorKeputusan, `Pengembalian berkas (Kondisi: ${condition}) dari ${loan.peminjamNama}`);
    addToast('success', 'Pengembalian Berhasil', `Dokumen ${loan.nomorKeputusan} telah dikembalikan ke depo.`);
  };

  // Phase 2: Destruction Handler
  const handleExecuteDestruction = (
    newRecord: DestructionRecord,
    targetArchiveIds: string[]
  ) => {
    setDestructionRecords((prev) => [newRecord, ...prev]);

    setItems((prev) =>
      prev.map((item) =>
        targetArchiveIds.includes(item.id)
          ? {
              ...item,
              statusSirkulasi: 'DIMUSNAHKAN',
            }
          : item
      )
    );

    addAuditLog('HAPUS_PERMANEN', newRecord.nomorBA, `Pemusnahan resmi ${targetArchiveIds.length} berkas (BA ${newRecord.nomorBA})`);
    addToast('warning', 'Pemusnahan Berkas Selesai', `BA ${newRecord.nomorBA} diterbitkan. ${targetArchiveIds.length} berkas dimusnahkan.`);
  };

  // Phase 3: Approval Handlers
  const handleApproveItem = (id: string, notes?: string) => {
    const item = approvals.find((a) => a.id === id);
    if (!item) return;

    setApprovals((prev) =>
      prev.map((a) =>
        a.id === id
          ? {
              ...a,
              status: 'DISETUJUI',
              catatan: notes || a.catatan,
              approverNama: currentUser?.name || 'Admin Arsiparis',
              approvedAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
            }
          : a
      )
    );

    addAuditLog('UBAH', item.nomorDokumen, `Persetujuan ${item.type} disahkan oleh ${currentUser?.name || 'Admin'}`);
    addToast('success', 'Pengajuan Disetujui', `Pengajuan ${item.type} untuk ${item.nomorDokumen} berhasil disahkan.`);
  };

  const handleRejectItem = (id: string, notes?: string) => {
    const item = approvals.find((a) => a.id === id);
    if (!item) return;

    setApprovals((prev) =>
      prev.map((a) =>
        a.id === id
          ? {
              ...a,
              status: 'DITOLAK',
              catatan: notes || a.catatan,
              approverNama: currentUser?.name || 'Admin Arsiparis',
              approvedAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
            }
          : a
      )
    );

    addAuditLog('UBAH', item.nomorDokumen, `Penolakan ${item.type} oleh ${currentUser?.name || 'Admin'}`);
    addToast('warning', 'Pengajuan Ditolak', `Pengajuan ${item.type} untuk ${item.nomorDokumen} telah ditolak.`);
  };

  // Restore Full Package Handler
  const handleRestorePackage = (pkg: BackupDataPackage, mergeMode: boolean) => {
    if (mergeMode) {
      setItems((prev) => [...pkg.items, ...prev]);
      addAuditLog('RESTORE', 'Database Merge', `Menggabungkan data cadangan (${pkg.items.length} item)`);
      addToast('success', 'Penggabungan Berhasil', `${pkg.items.length} item cadangan digabungkan.`);
    } else {
      setItems(pkg.items || []);
      if (pkg.unitInfo) setUnitInfo(pkg.unitInfo);
      if (pkg.masterKategori) setMasterKategori(pkg.masterKategori);
      if (pkg.masterUnit) setMasterUnit(pkg.masterUnit);
      if (pkg.masterGedung) setMasterGedung(pkg.masterGedung);
      if (pkg.masterRuang) setMasterRuang(pkg.masterRuang);
      if (pkg.masterRak) setMasterRak(pkg.masterRak);
      if (pkg.masterDus) setMasterDus(pkg.masterDus);
      if (pkg.auditLogs) setAuditLogs(pkg.auditLogs);
      addAuditLog('RESTORE', 'Database Overwrite', `Memulihkan penuh database dari cadangan versi ${pkg.version}`);
      addToast('success', 'Pemulihan Database Sukses', `Database dipulihkan penuh dari cadangan.`);
    }
  };

  // ---------------------------------------------------------------
  // Auth Gate: seluruh isi aplikasi (data arsip, dashboard, laporan,
  // dll.) HANYA ditampilkan setelah pengguna login. Sebelumnya modal
  // login ini murni opsional/kosmetik dan data tetap tampil ke siapa
  // saja — sekarang akses diblokir di level render sampai ada
  // currentUser yang valid.
  // ---------------------------------------------------------------
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="text-center max-w-sm space-y-4">
          <div className="w-16 h-16 mx-auto bg-slate-900 text-white rounded-2xl flex items-center justify-center">
            <Lock className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900">Sistem Informasi Pertelaan Arsip</h1>
            <p className="text-sm text-slate-500 mt-1">
              Data arsip bersifat internal. Silakan masuk (login) terlebih dahulu untuk mengakses sistem.
            </p>
          </div>
          <button
            onClick={() => setIsLoginModalOpen(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-sm shadow-sm transition-all cursor-pointer"
          >
            <LogIn className="w-4 h-4" />
            <span>Masuk Akun Sistem</span>
          </button>
        </div>

        <LoginModal
          isOpen={true}
          onClose={() => setIsLoginModalOpen(false)}
          currentUser={currentUser}
          onLogin={handleLogin}
          onLogout={handleLogout}
          onOpenBackendModal={() => {}}
          apiUrl={apiConfig.apiUrl}
        />
      </div>
    );
  }

  // FASE (redesain sidebar): dulu dua permission ini dihitung di dalam
  // Header.tsx (sekarang diganti Sidebar.tsx + TopHeader.tsx), jadi
  // dipindah ke sini supaya kedua komponen baru itu bisa memakainya.
  //   - canManageUsers -> item menu "Pengguna", HARUS mengikuti
  //     PERMISSION_MATRIX.manageUser (hanya super_admin).
  //   - canManageSettings -> item menu "Pengaturan", tidak punya key
  //     permission khusus di matriks, tetap dibuka untuk admin &
  //     super_admin seperti perilaku sebelumnya.
  const canManageUsers = hasRolePermission(currentUser?.role, 'manageUser');
  const canManageSettings = currentUser?.role === 'admin' || currentUser?.role === 'super_admin';

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex font-sans">

      {/* Left Sidebar Navigation (FASE: pengganti tab bar horizontal) */}
      <Sidebar
        activeTab={activeTab}
        onNavigateTab={(tab) => setActiveTab(tab)}
        totalArsip={activeItems.length}
        totalSampah={deletedItems.length}
        pendingApproval={approvals.filter((a) => a.status === 'MENUNGGU').length}
        apiConfig={apiConfig}
        canManageUsers={canManageUsers}
        canManageSettings={canManageSettings}
        onOpenUserManagementModal={() => setIsUserManagementModalOpen(true)}
        onOpenUnitModal={() => setIsUnitModalOpen(true)}
        onOpenBackendModal={() => setIsBackendModalOpen(true)}
        isOpen={isMobileSidebarOpen}
        onClose={() => setIsMobileSidebarOpen(false)}
        currentUser={currentUser}
        onLogout={handleLogout}
      />

      <div className="flex-1 flex flex-col min-w-0">

        {/* Slim Top Header (FASE: pengganti banner Header besar) */}
        <TopHeader
          currentUser={currentUser}
          pendingApprovalCount={approvals.filter((a) => a.status === 'MENUNGGU').length}
          searchQuery={globalSearchQuery}
          onSearchChange={handleGlobalSearchChange}
          onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
          onOpenPrintModal={() => setIsPrintViewOpen(true)}
          onOpenExportModal={() => setIsExportModalOpen(true)}
          onOpenLoginModal={() => setIsLoginModalOpen(true)}
          onLogout={handleLogout}
          canManageUsers={canManageUsers}
          onOpenUserManagementModal={() => setIsUserManagementModalOpen(true)}
        />

        {/* Main Content Area */}
        <main className="flex-1 w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 max-w-7xl">
        
        {activeTab === 'dashboard' && (
          <DashboardView
            items={visibleItems}
            deletedCount={deletedItems.length}
            auditLogs={auditLogs}
            masterDusList={masterDus}
            masterGedungList={masterGedung}
            masterKategoriList={masterKategori}
            masterUnitList={masterUnit}
            currentUser={currentUser}
            canAdd={hasRolePermission(currentUser?.role, 'tambah')}
            onOpenAddModal={handleOpenAdd}
            onNavigateToArsipWithFilter={() => setActiveTab('arsip')}
            onNavigateTab={(tab) => setActiveTab(tab)}
            onOpenPdfModal={(item) => setSelectedPdfItem(item)}
            onOpenQrModal={(item) => setSelectedQrItem(item)}
          />
        )}

        {activeTab === 'arsip' && (
          <ArchiveTable
            items={visibleItems}
            currentUser={currentUser}
            onEdit={handleEdit}
            onDelete={handleSoftDelete}
            onDuplicate={handleDuplicateItem}
            onViewDetail={(item) => setViewingDetailItem(item)}
            onOpenAddModal={handleOpenAdd}
            onResetSampleData={handleResetSampleData}
            onOpenPdfModal={(item) => setSelectedPdfItem(item)}
            onOpenQrModal={(item) => setSelectedQrItem(item)}
          />
        )}

        {activeTab === 'sirkulasi' && (
          <CirculationView
            items={items}
            loans={loans}
            currentUser={currentUser}
            unitInfo={unitInfo}
            onAddLoan={handleAddLoan}
            onReturnLoan={handleReturnLoan}
          />
        )}

        {activeTab === 'retensi_pemusnahan' && (
          <RetentionDestructionView
            items={items}
            destructionRecords={destructionRecords}
            masterKategori={masterKategori}
            unitInfo={unitInfo}
            currentUser={currentUser}
            onExecuteDestruction={handleExecuteDestruction}
          />
        )}

        {activeTab === 'approval' && (
          <ApprovalView
            approvals={approvals}
            currentUser={currentUser}
            onApproveItem={handleApproveItem}
            onRejectItem={handleRejectItem}
          />
        )}

        {activeTab === 'master' && (
          <MasterDataView
            currentUser={currentUser}
            kategoriList={masterKategori}
            unitList={masterUnit}
            gedungList={masterGedung}
            ruangList={masterRuang}
            rakList={masterRak}
            dusList={masterDus}
            onSaveKategori={handleSaveKategori}
            onDeleteKategori={handleDeleteKategori}
            onSaveUnit={handleSaveUnit}
            onDeleteUnit={handleDeleteUnit}
            onSaveGedung={handleSaveGedung}
            onDeleteGedung={handleDeleteGedung}
            onSaveRuang={handleSaveRuang}
            onDeleteRuang={handleDeleteRuang}
            onSaveRak={handleSaveRak}
            onDeleteRak={handleDeleteRak}
            onSaveDus={handleSaveDus}
            onDeleteDus={handleDeleteDus}
          />
        )}

        {activeTab === 'hirarki_lokasi' && (
          <LocationHierarchyView
            items={activeItems}
            gedungList={masterGedung}
            ruangList={masterRuang}
            rakList={masterRak}
            dusList={masterDus}
            onNavigateToArsipWithFilter={() => setActiveTab('arsip')}
            onOpenPdfModal={(item) => setSelectedPdfItem(item)}
            onOpenQrModal={(item) => setSelectedQrItem(item)}
          />
        )}

        {activeTab === 'sop_register' && <SopRegisterView />}

        {activeTab === 'laporan' && (
          <ReportsView
            items={visibleItems}
            unitInfo={unitInfo}
            masterKategori={masterKategori}
            masterUnit={masterUnit}
            masterGedung={masterGedung}
            onOpenPrintModal={() => setIsPrintViewOpen(true)}
          />
        )}

        {activeTab === 'audit_log' && (
          <AuditLogView
            logs={auditLogs}
            currentUser={currentUser}
            onClearLogs={() => setAuditLogs([])}
          />
        )}

        {activeTab === 'recycle_bin' && (
          <RecycleBinView
            items={items}
            currentUser={currentUser}
            onRestoreItem={handleRestoreItem}
            onHardDeleteItem={handleHardDeleteItem}
            onEmptyRecycleBin={handleEmptyRecycleBin}
          />
        )}

        {activeTab === 'backup_restore' && (
          <BackupRestoreView
            unitInfo={unitInfo}
            items={items}
            masterKategori={masterKategori}
            masterUnit={masterUnit}
            masterGedung={masterGedung}
            masterRuang={masterRuang}
            masterRak={masterRak}
            masterDus={masterDus}
            auditLogs={auditLogs}
            currentUser={currentUser}
            onRestorePackage={handleRestorePackage}
          />
        )}

        {activeTab === 'qr_scanner' && (
          <QrScannerModal
            items={activeItems}
            onSelectFoundItem={(item) => setViewingDetailItem(item)}
            onClose={() => setActiveTab('dashboard')}
          />
        )}

      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 text-xs py-4 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>
            © 2026 Aplikasi Daftar Pertelaan Arsip • {unitInfo.namaInstansi} • Tahap 4 Penyempurnaan Complete
          </p>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsBackendModalOpen(true)}
              className="text-emerald-400 hover:text-emerald-300 font-semibold cursor-pointer"
            >
              API Laravel & MySQL Schema
            </button>
            <span>•</span>
            <button
              onClick={handleResetSampleData}
              className="text-slate-300 hover:text-white underline cursor-pointer"
            >
              Muat Ulang Contoh Data
            </button>
          </div>
        </div>
      </footer>

      </div>

      {/* Modals */}
      <ArchiveFormModal
        isOpen={isAddEditOpen}
        onClose={() => setIsAddEditOpen(false)}
        onSave={handleSaveItem}
        initialData={editingItem}
        existingDusList={existingDusList}
        masterKategoriList={masterKategori}
        masterUnitList={masterUnit}
      />

      <ArchiveDetailModal
        item={viewingDetailItem}
        onClose={() => setViewingDetailItem(null)}
        onEdit={handleEdit}
        onDuplicate={handleDuplicateItem}
      />

      <UnitInfoModal
        isOpen={isUnitModalOpen}
        onClose={() => setIsUnitModalOpen(false)}
        unitInfo={unitInfo}
        onSave={(updated) => {
          setUnitInfo(updated);
          addToast('info', 'Identitas Diperbarui', 'Informasi unit dan instansi telah disimpan.');
        }}
      />

      <ExportImportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        items={visibleItems}
        onImport={handleImportItems}
        onResetSample={handleResetSampleData}
        onClearAll={handleClearAllData}
      />

      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        currentUser={currentUser}
        onLogin={handleLogin}
        onLogout={handleLogout}
        onOpenBackendModal={() => {
          setIsLoginModalOpen(false);
          setIsBackendModalOpen(true);
        }}
        apiUrl={apiConfig.apiUrl}
      />

      <BackendApiModal
        isOpen={isBackendModalOpen}
        onClose={() => setIsBackendModalOpen(false)}
        apiConfig={apiConfig}
        onSaveApiConfig={(cfg) => {
          setApiConfig(cfg);
          addToast('success', 'Konfigurasi API Disimpan', `Mode Laravel API ${cfg.useLaravelApi ? 'Aktif' : 'Non-aktif'}`);
        }}
      />

      <UserManagementModal
        isOpen={isUserManagementModalOpen}
        onClose={() => setIsUserManagementModalOpen(false)}
        users={users}
        currentUser={currentUser}
        isLoadingUsers={isLoadingUsers}
        loadError={usersLoadError}
        onAddUser={handleAddUser}
        onUpdateUser={handleUpdateUser}
        onDeleteUser={handleDeleteUser}
      />

      {/* QR Code Modal Generator & Printable Label */}
      <QrCodeModal
        isOpen={Boolean(selectedQrItem)}
        onClose={() => setSelectedQrItem(null)}
        item={selectedQrItem}
        unitInfo={unitInfo}
      />

      {/* PDF Viewer Modal */}
      <PdfViewerModal
        isOpen={Boolean(selectedPdfItem)}
        onClose={() => setSelectedPdfItem(null)}
        item={selectedPdfItem}
        currentUser={currentUser}
        apiUrl={apiConfig.apiUrl}
      />

      {/* Fullscreen Print Modal View */}
      {isPrintViewOpen && (
        <PrintView
          items={visibleItems}
          unitInfo={unitInfo}
          onClose={() => setIsPrintViewOpen(false)}
        />
      )}

      {/* Tahap 4: Toast Notifications Stack Container */}
      <NotificationToast toasts={toasts} onDismiss={removeToast} />

    </div>
  );
}