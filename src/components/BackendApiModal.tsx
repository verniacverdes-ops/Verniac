import React, { useState } from 'react';
import { ApiConfig } from '../types';
import { 
  Server, 
  Database, 
  Code2, 
  Check, 
  Copy, 
  RefreshCw, 
  Globe, 
  Key, 
  ShieldCheck, 
  Terminal, 
  X, 
  UserCheck, 
  Lock, 
  FolderTree, 
  Layers,
  FileCode2
} from 'lucide-react';

interface BackendApiModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiConfig: ApiConfig;
  onSaveApiConfig: (config: ApiConfig) => void;
}

export const BackendApiModal: React.FC<BackendApiModalProps> = ({
  isOpen,
  onClose,
  apiConfig,
  onSaveApiConfig,
}) => {
  const [activeTab, setActiveTab] = useState<'config' | 'mysql' | 'auth-security' | 'laravel' | 'hierarchy' | 'api-docs'>('config');
  const [copied, setCopied] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  const [useLaravelApi, setUseLaravelApi] = useState(apiConfig.useLaravelApi);
  const [apiUrl, setApiUrl] = useState(apiConfig.apiUrl || 'http://localhost:8000/api');
  const [bearerToken, setBearerToken] = useState(apiConfig.bearerToken || '');

  if (!isOpen) return null;

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveApiConfig({
      useLaravelApi,
      apiUrl: apiUrl.trim(),
      bearerToken: bearerToken.trim(),
    });
    alert('Pengaturan koneksi API Laravel & MySQL berhasil disimpan!');
    onClose();
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await fetch(`${apiUrl}/arsip`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...(bearerToken ? { Authorization: `Bearer ${bearerToken}` } : {}),
        },
      });

      if (res.ok) {
        const data = await res.json();
        setTestResult(`SUCCESS (Status 200 OK): Berhasil terhubung ke Server API Laravel! Total arsip: ${Array.isArray(data) ? data.length : 0}`);
      } else {
        setTestResult(`HTTP ERROR ${res.status}: ${res.statusText}. Pastikan server Laravel sudah berjalan di ${apiUrl}`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setTestResult(`KONEKSI GAGAL: ${msg}. (Note: Jika di cloud sandbox tanpa CORS/Server Lokal, Anda dapat menguji via Postman/cURL)`);
    } finally {
      setIsTesting(false);
    }
  };

  const mysqlMigrationSql = `-- Skema Database MySQL Lengkap untuk Sistem Informasi Pertelaan Arsip 2026
-- Mendukung Hirarki Lokasi (Gedung -> Ruang -> Rak -> Dus), Authentication, Role & Audit Log

CREATE DATABASE IF NOT EXISTS \`db_pertelaan_arsip\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE \`db_pertelaan_arsip\`;

-- 1. Tabel Users & Authentication Sanctum
CREATE TABLE IF NOT EXISTS \`users\` (
  \`id\` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  \`name\` VARCHAR(100) NOT NULL,
  \`email\` VARCHAR(100) NOT NULL UNIQUE,
  \`nip\` VARCHAR(30) NULL,
  \`jabatan\` VARCHAR(100) NULL,
  \`password\` VARCHAR(255) NOT NULL,
  \`role\` ENUM('admin', 'arsiparis', 'verifikator', 'viewer') NOT NULL DEFAULT 'viewer',
  \`remember_token\` VARCHAR(100) NULL,
  \`created_at\` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Master Data: Kategori Arsip
CREATE TABLE IF NOT EXISTS \`master_kategori\` (
  \`id\` VARCHAR(32) PRIMARY KEY,
  \`kode_kategori\` VARCHAR(20) NOT NULL UNIQUE,
  \`nama_kategori\` VARCHAR(100) NOT NULL,
  \`retensi_aktif\` INT UNSIGNED NOT NULL DEFAULT 2, -- Dalam Tahun
  \`retensi_inaktif\` INT UNSIGNED NOT NULL DEFAULT 5, -- Dalam Tahun
  \`keterangan_akhir\` ENUM('Musnah', 'Permanen', 'Dinilai Kembali') NOT NULL DEFAULT 'Musnah',
  \`created_at\` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Master Data: Unit Kerja / Pengolah
CREATE TABLE IF NOT EXISTS \`master_unit\` (
  \`id\` VARCHAR(32) PRIMARY KEY,
  \`kode_unit\` VARCHAR(20) NOT NULL UNIQUE,
  \`nama_unit\` VARCHAR(150) NOT NULL,
  \`penanggung_jawab\` VARCHAR(100) NULL,
  \`created_at\` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. Hirarki Lokasi Level 1: Gedung / Depo
CREATE TABLE IF NOT EXISTS \`master_gedung\` (
  \`id\` VARCHAR(32) PRIMARY KEY,
  \`kode_gedung\` VARCHAR(20) NOT NULL UNIQUE,
  \`nama_gedung\` VARCHAR(100) NOT NULL,
  \`alamat\` TEXT NULL,
  \`created_at\` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. Hirarki Lokasi Level 2: Ruang Penyimpanan
CREATE TABLE IF NOT EXISTS \`master_ruang\` (
  \`id\` VARCHAR(32) PRIMARY KEY,
  \`gedung_id\` VARCHAR(32) NOT NULL,
  \`kode_ruang\` VARCHAR(20) NOT NULL,
  \`nama_ruang\` VARCHAR(100) NOT NULL,
  \`kapasitas_rak\` INT UNSIGNED DEFAULT 10,
  \`created_at\` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (\`gedung_id\`) REFERENCES \`master_gedung\`(\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6. Hirarki Lokasi Level 3: Rak / Lemari
CREATE TABLE IF NOT EXISTS \`master_rak\` (
  \`id\` VARCHAR(32) PRIMARY KEY,
  \`ruang_id\` VARCHAR(32) NOT NULL,
  \`kode_rak\` VARCHAR(20) NOT NULL,
  \`kapasitas_dus\` INT UNSIGNED DEFAULT 50,
  \`created_at\` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (\`ruang_id\`) REFERENCES \`master_ruang\`(\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 7. Hirarki Lokasi Level 4: Dus Arsip
CREATE TABLE IF NOT EXISTS \`master_dus\` (
  \`id\` VARCHAR(32) PRIMARY KEY,
  \`rak_id\` VARCHAR(32) NOT NULL,
  \`no_dus\` VARCHAR(32) NOT NULL UNIQUE,
  \`tahun_dus\` VARCHAR(10) NULL,
  \`kapasitas_berkas\` INT UNSIGNED DEFAULT 20,
  \`keterangan\` VARCHAR(255) NULL,
  \`created_at\` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (\`rak_id\`) REFERENCES \`master_rak\`(\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 8. Tabel Utama: Pertelaan Arsip
CREATE TABLE IF NOT EXISTS \`pertelaan_arsip\` (
  \`id\` VARCHAR(64) PRIMARY KEY,
  \`nomor_keputusan\` VARCHAR(128) NOT NULL,
  \`tanggal\` DATE NOT NULL,
  \`perihal\` TEXT NOT NULL,
  \`no_dus\` VARCHAR(64) NOT NULL,
  \`lokasi_penyimpanan\` TEXT NOT NULL,
  \`keterangan\` VARCHAR(255) NULL,
  \`unit_pengolah\` VARCHAR(128) NULL,
  \`kategori_arsip\` VARCHAR(64) DEFAULT 'Inaktif',
  \`pdf_attachment\` LONGTEXT NULL, -- Base64 PDF Attachment
  \`is_deleted\` TINYINT(1) DEFAULT 0,
  \`deleted_at\` TIMESTAMP NULL,
  \`deleted_by\` VARCHAR(100) NULL,
  \`created_at\` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX \`idx_no_dus\` (\`no_dus\`),
  INDEX \`idx_nomor_keputusan\` (\`nomor_keputusan\`),
  INDEX \`idx_tanggal\` (\`tanggal\`),
  INDEX \`idx_is_deleted\` (\`is_deleted\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 9. Tabel Audit Log Kebijakan
CREATE TABLE IF NOT EXISTS \`audit_logs\` (
  \`id\` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  \`user_name\` VARCHAR(100) NOT NULL,
  \`user_role\` VARCHAR(30) NOT NULL,
  \`action\` VARCHAR(30) NOT NULL,
  \`item_target\` VARCHAR(128) NOT NULL,
  \`details\` TEXT NOT NULL,
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`;

  const laravelAuthCode = `<?php
// Laravel API Auth (Sanctum) & Role Middleware Example

namespace App\\Http\\Controllers\\Api;

use App\\Http\\Controllers\\Controller;
use Illuminate\\Http\\Request;
use Illuminate\\Support\\Facades\\Auth;
use Illuminate\\Support\\Facades\\Hash;
use App\\Models\\User;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required',
        ]);

        $user = User::where('email', $request->email)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            return response()->json([
                'message' => 'Kredensial email atau password tidak valid'
            ], 401);
        }

        // Generate Sanctum Bearer Token
        $token = $user->createToken('arsip_auth_token')->plainTextToken;

        return response()->json([
            'message' => 'Login berhasil',
            'token' => $token,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
                'nip' => $user->nip,
                'jabatan' => $user->jabatan,
            ]
        ], 200);
    }

    public function me(Request $request)
    {
        return response()->json($request->user());
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();
        return response()->json(['message' => 'Sesi login berhasil diakhiri']);
    }
}`;

  const laravelControllerPhp = `<?php
// app/Http/Controllers/Api/PertelaanArsipController.php

namespace App\\Http\\Controllers\\Api;

use App\\Http\\Controllers\\Controller;
use Illuminate\\Http\\Request;
use Illuminate\\Support\\Facades\\DB;
use Illuminate\\Support\\Str;

class PertelaanArsipController extends Controller
{
    public function index(Request $request)
    {
        $query = DB::table('pertelaan_arsip')->where('is_deleted', 0);

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function($q) use ($search) {
                $q->where('nomor_keputusan', 'like', "%{$search}%")
                  ->orWhere('perihal', 'like', "%{$search}%")
                  ->orWhere('no_dus', 'like', "%{$search}%")
                  ->orWhere('lokasi_penyimpanan', 'like', "%{$search}%");
            });
        }

        if ($request->filled('no_dus') && $request->input('no_dus') !== 'ALL') {
            $query->where('no_dus', $request->input('no_dus'));
        }

        $items = $query->orderBy('created_at', 'desc')->paginate($request->input('per_page', 25));
        return response()->json($items, 200);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'nomorKeputusan' => 'required|string|max:128',
            'tanggal' => 'required|date',
            'perihal' => 'required|string',
            'noDus' => 'required|string|max:64',
            'lokasiPenyimpanan' => 'required|string',
            'keterangan' => 'nullable|string',
            'unitPengolah' => 'nullable|string',
            'kategoriArsip' => 'nullable|string',
            'pdfAttachment' => 'nullable|string',
        ]);

        $id = 'arsip-2026-' . Str::uuid();

        DB::table('pertelaan_arsip')->insert([
            'id' => $id,
            'nomor_keputusan' => $validated['nomorKeputusan'],
            'tanggal' => $validated['tanggal'],
            'perihal' => $validated['perihal'],
            'no_dus' => strtoupper($validated['noDus']),
            'lokasi_penyimpanan' => $validated['lokasiPenyimpanan'],
            'keterangan' => $validated['keterangan'] ?? null,
            'unit_pengolah' => $validated['unitPengolah'] ?? null,
            'kategori_arsip' => $validated['kategoriArsip'] ?? 'Inaktif',
            'pdf_attachment' => $validated['pdfAttachment'] ?? null,
            'is_deleted' => 0,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json(['id' => $id, 'message' => 'Data pertelaan arsip berhasil disimpan'], 201);
    }

    public function update(Request $request, $id)
    {
        $validated = $request->validate([
            'nomorKeputusan' => 'sometimes|required|string',
            'tanggal' => 'sometimes|required|date',
            'perihal' => 'sometimes|required|string',
            'noDus' => 'sometimes|required|string',
            'lokasiPenyimpanan' => 'sometimes|required|string',
            'keterangan' => 'nullable|string',
            'unitPengolah' => 'nullable|string',
            'kategoriArsip' => 'nullable|string',
            'pdfAttachment' => 'nullable|string',
        ]);

        DB::table('pertelaan_arsip')->where('id', $id)->update([
            'nomor_keputusan' => $validated['nomorKeputusan'],
            'tanggal' => $validated['tanggal'],
            'perihal' => $validated['perihal'],
            'no_dus' => $validated['noDus'],
            'lokasi_penyimpanan' => $validated['lokasiPenyimpanan'],
            'keterangan' => $validated['keterangan'] ?? null,
            'unit_pengolah' => $validated['unitPengolah'] ?? null,
            'kategori_arsip' => $validated['kategoriArsip'] ?? 'Inaktif',
            'pdf_attachment' => $validated['pdfAttachment'] ?? null,
            'updated_at' => now(),
        ]);

        return response()->json(['message' => 'Data arsip berhasil diperbarui']);
    }

    public function destroy(Request $request, $id)
    {
        // Soft delete implementation
        DB::table('pertelaan_arsip')->where('id', $id)->update([
            'is_deleted' => 1,
            'deleted_at' => now(),
            'deleted_by' => $request->user() ? $request->user()->name : 'Admin',
        ]);

        return response()->json(['message' => 'Berkas berhasil dipindahkan ke tempat sampah']);
    }
}`;

  const locationHierarchyCode = `<?php
// Controller Hirarki Lokasi: Gedung -> Ruang -> Rak -> Dus -> Arsip

namespace App\\Http\\Controllers\\Api;

use App\\Http\\Controllers\\Controller;
use Illuminate\\Http\\Request;
use Illuminate\\Support\\Facades\\DB;

class LocationHierarchyController extends Controller
{
    public function tree()
    {
        $gedungList = DB::table('master_gedung')->get();

        $tree = $gedungList->map(function($gedung) {
            $ruangList = DB::table('master_ruang')->where('gedung_id', $gedung->id)->get();

            $ruangTree = $ruangList->map(function($ruang) {
                $rakList = DB::table('master_rak')->where('ruang_id', $ruang->id)->get();

                $rakTree = $rakList->map(function($rak) {
                    $dusList = DB::table('master_dus')->where('rak_id', $rak->id)->get();

                    $dusTree = $dusList->map(function($dus) {
                        $totalArsip = DB::table('pertelaan_arsip')
                            ->where('no_dus', $dus->no_dus)
                            ->where('is_deleted', 0)
                            ->count();

                        return [
                            'id' => $dus->id,
                            'noDus' => $dus->no_dus,
                            'tahunDus' => $dus->tahun_dus,
                            'kapasitas' => $dus->kapasitas_berkas,
                            'totalTerisi' => $totalArsip,
                        ];
                    });

                    return [
                        'id' => $rak->id,
                        'kodeRak' => $rak->kode_rak,
                        'dus' => $dusTree,
                    ];
                });

                return [
                    'id' => $ruang->id,
                    'kodeRuang' => $ruang->kode_ruang,
                    'namaRuang' => $ruang->nama_ruang,
                    'rak' => $rakTree,
                ];
            });

            return [
                'id' => $gedung->id,
                'kodeGedung' => $gedung->kode_gedung,
                'namaGedung' => $gedung->nama_gedung,
                'ruang' => $ruangTree,
            ];
        });

        return response()->json($tree, 200);
    }
}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[92vh]">
        
        {/* Modal Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-600/30 text-emerald-400 rounded-lg">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold">Spesifikasi Backend Laravel API & MySQL Architecture</h2>
              <p className="text-xs text-slate-400">Authentication, Role & Permission, Security, CRUD Arsip & Hirarki Lokasi</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation Header */}
        <div className="bg-slate-100 border-b border-slate-200 px-6 pt-2 flex items-center gap-2 overflow-x-auto shrink-0 text-xs font-bold scrollbar-none">
          <button
            onClick={() => setActiveTab('config')}
            className={`py-2.5 px-3.5 rounded-t-lg border-b-2 transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeTab === 'config'
                ? 'bg-white border-blue-600 text-blue-700 shadow-2xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Globe className="w-4 h-4" />
            <span>Koneksi API</span>
          </button>

          <button
            onClick={() => setActiveTab('mysql')}
            className={`py-2.5 px-3.5 rounded-t-lg border-b-2 transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeTab === 'mysql'
                ? 'bg-white border-blue-600 text-blue-700 shadow-2xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>Skema MySQL (.SQL)</span>
          </button>

          <button
            onClick={() => setActiveTab('auth-security')}
            className={`py-2.5 px-3.5 rounded-t-lg border-b-2 transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeTab === 'auth-security'
                ? 'bg-white border-blue-600 text-blue-700 shadow-2xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Lock className="w-4 h-4 text-amber-500" />
            <span>Auth & Role Security</span>
          </button>

          <button
            onClick={() => setActiveTab('laravel')}
            className={`py-2.5 px-3.5 rounded-t-lg border-b-2 transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeTab === 'laravel'
                ? 'bg-white border-blue-600 text-blue-700 shadow-2xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Code2 className="w-4 h-4" />
            <span>CRUD Arsip Controller</span>
          </button>

          <button
            onClick={() => setActiveTab('hierarchy')}
            className={`py-2.5 px-3.5 rounded-t-lg border-b-2 transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeTab === 'hierarchy'
                ? 'bg-white border-blue-600 text-blue-700 shadow-2xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <FolderTree className="w-4 h-4 text-emerald-500" />
            <span>Hirarki Lokasi API</span>
          </button>

          <button
            onClick={() => setActiveTab('api-docs')}
            className={`py-2.5 px-3.5 rounded-t-lg border-b-2 transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeTab === 'api-docs'
                ? 'bg-white border-blue-600 text-blue-700 shadow-2xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Terminal className="w-4 h-4" />
            <span>Tabel REST API Routes</span>
          </button>
        </div>

        {/* Modal Body Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5 text-sm">
          
          {/* TAB 1: Config API */}
          {activeTab === 'config' && (
            <form onSubmit={handleSave} className="space-y-4">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-blue-900 text-xs uppercase flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-blue-600" /> Status Koneksi Multi-Mode Architecture
                  </span>
                  <span className="text-[10px] bg-blue-200 text-blue-900 font-bold px-2 py-0.5 rounded">
                    Full-Stack Ready
                  </span>
                </div>
                <p className="text-xs text-blue-800 leading-relaxed">
                  Aplikasi ini berjalan dengan penyimpanan lokal berkecepatan tinggi (LocalStorage) secara default. Anda dapat mengaktifkan <strong>Mode Laravel API Live</strong> di bawah ini untuk menghubungkan langsung frontend React ini ke backend Laravel & MySQL Anda.
                </p>
              </div>

              {/* Mode Toggle Switch */}
              <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl">
                <div>
                  <label className="font-bold text-slate-900 text-sm">Gunakan Endpoint REST API Laravel Real</label>
                  <p className="text-xs text-slate-500">Hubungkan CRUD arsip langsung ke server backend MySQL</p>
                </div>
                <input
                  type="checkbox"
                  checked={useLaravelApi}
                  onChange={(e) => setUseLaravelApi(e.target.checked)}
                  className="w-5 h-5 accent-blue-600 cursor-pointer"
                />
              </div>

              {/* API URL */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase flex items-center gap-1">
                  <Globe className="w-3.5 h-3.5 text-blue-600" /> Base URL Laravel API
                </label>
                <input
                  type="url"
                  value={apiUrl}
                  onChange={(e) => setApiUrl(e.target.value)}
                  placeholder="e.g. http://localhost:8000/api atau https://api.instansi.go.id/api"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>

              {/* Bearer Token */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase flex items-center gap-1">
                  <Key className="w-3.5 h-3.5 text-amber-600" /> Laravel Sanctum / API Bearer Token (Opsional)
                </label>
                <input
                  type="text"
                  value={bearerToken}
                  onChange={(e) => setBearerToken(e.target.value)}
                  placeholder="e.g. 1|xyz123abc456tokenlaravel"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>

              {/* Test Connection Button */}
              <div className="pt-2 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={isTesting}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-lg transition-all cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
                  <span>Uji Koneksi Endpoint</span>
                </button>

                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition-all cursor-pointer"
                >
                  Simpan Pengaturan
                </button>
              </div>

              {/* Test Result Banner */}
              {testResult && (
                <div
                  className={`p-3 rounded-lg text-xs font-medium border ${
                    testResult.startsWith('SUCCESS')
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                      : 'bg-amber-50 border-amber-300 text-amber-900'
                  }`}
                >
                  {testResult}
                </div>
              )}
            </form>
          )}

          {/* TAB 2: MySQL SQL Script */}
          {activeTab === 'mysql' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-xs uppercase">Skema Database Relasional MySQL (.SQL)</h3>
                  <p className="text-xs text-slate-500">Relasi Foreign Keys, Indexes & Multi-level Hirarki Lokasi (Gedung-Ruang-Rak-Dus)</p>
                </div>
                <button
                  onClick={() => handleCopy(mysqlMigrationSql, 'mysql')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-bold cursor-pointer"
                >
                  {copied === 'mysql' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied === 'mysql' ? 'Tersalin!' : 'Salin SQL Schema'}</span>
                </button>
              </div>

              <pre className="p-4 bg-slate-900 text-emerald-400 font-mono text-xs rounded-xl overflow-x-auto leading-relaxed border border-slate-800 max-h-96">
                {mysqlMigrationSql}
              </pre>
            </div>
          )}

          {/* TAB 3: Auth & Security */}
          {activeTab === 'auth-security' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-xs uppercase">Laravel Sanctum Authentication & Policy</h3>
                  <p className="text-xs text-slate-500">Pengamanan Endpoint REST API, Token Sanctum & Hak Akses Berbasis Role</p>
                </div>
                <button
                  onClick={() => handleCopy(laravelAuthCode, 'auth')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-bold cursor-pointer"
                >
                  {copied === 'auth' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied === 'auth' ? 'Tersalin!' : 'Salin Kode Auth'}</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  <div className="font-bold text-slate-900 flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4 text-blue-600" /> 1. Admin
                  </div>
                  <p className="text-slate-600">Akses Penuh: CRUD Arsip, Master Data, Kelola User, Backup/Restore, Empty Trash & Log Audit.</p>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  <div className="font-bold text-slate-900 flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4 text-emerald-600" /> 2. Arsiparis
                  </div>
                  <p className="text-slate-600">Akses Input & Edit Arsip, Cetak Label QR, Upload PDF Digital, & Pindai Barcode Dus.</p>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  <div className="font-bold text-slate-900 flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4 text-purple-600" /> 3. Verifikator / Viewer
                  </div>
                  <p className="text-slate-600">Akses Read-Only: Pencarian Lanjutan, Ekspor Excel/PDF, Audit Trail & Verifikasi Masa Retensi.</p>
                </div>
              </div>

              <pre className="p-4 bg-slate-900 text-amber-300 font-mono text-xs rounded-xl overflow-x-auto leading-relaxed border border-slate-800 max-h-80">
                {laravelAuthCode}
              </pre>
            </div>
          )}

          {/* TAB 4: CRUD Controller */}
          {activeTab === 'laravel' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-xs uppercase">Laravel Controller: `PertelaanArsipController.php`</h3>
                  <p className="text-xs text-slate-500">Salin kode berikut ke `app/Http/Controllers/Api/PertelaanArsipController.php`</p>
                </div>
                <button
                  onClick={() => handleCopy(laravelControllerPhp, 'laravel')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-bold cursor-pointer"
                >
                  {copied === 'laravel' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied === 'laravel' ? 'Tersalin!' : 'Salin Controller PHP'}</span>
                </button>
              </div>

              <pre className="p-4 bg-slate-900 text-blue-300 font-mono text-xs rounded-xl overflow-x-auto leading-relaxed border border-slate-800 max-h-80">
                {laravelControllerPhp}
              </pre>
            </div>
          )}

          {/* TAB 5: Hierarchy API */}
          {activeTab === 'hierarchy' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-xs uppercase">Controller Hirarki Lokasi: Gedung -&gt; Ruang -&gt; Rak -&gt; Dus</h3>
                  <p className="text-xs text-slate-500">Endpoint JSON Tree untuk Visualisasi Pemetaan Lokasi Fisik Penyimpanan</p>
                </div>
                <button
                  onClick={() => handleCopy(locationHierarchyCode, 'hier')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-bold cursor-pointer"
                >
                  {copied === 'hier' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied === 'hier' ? 'Tersalin!' : 'Salin Hierarchy PHP'}</span>
                </button>
              </div>

              <pre className="p-4 bg-slate-900 text-emerald-300 font-mono text-xs rounded-xl overflow-x-auto leading-relaxed border border-slate-800 max-h-80">
                {locationHierarchyCode}
              </pre>
            </div>
          )}

          {/* TAB 6: API Docs Specification */}
          {activeTab === 'api-docs' && (
            <div className="space-y-4 text-xs">
              <h3 className="font-bold text-slate-900 uppercase">Spesifikasi Lengkap Endpoint REST API 2026</h3>
              
              <div className="space-y-3">
                {/* Auth Endpoints */}
                <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-200 space-y-1">
                  <div className="font-bold text-amber-900 text-xs uppercase flex items-center gap-1">
                    <Lock className="w-3.5 h-3.5" /> Autentikasi API Sanctum
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 font-mono text-[11px] pt-1">
                    <div>POST /api/auth/login</div>
                    <div>GET /api/auth/me</div>
                    <div>POST /api/auth/logout</div>
                  </div>
                </div>

                {/* Arsip Endpoints */}
                <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-200 space-y-1">
                  <div className="font-bold text-blue-900 text-xs uppercase flex items-center gap-1">
                    <FileCode2 className="w-3.5 h-3.5" /> CRUD Pertelaan Arsip
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 font-mono text-[11px] pt-1">
                    <div>GET /api/arsip</div>
                    <div>POST /api/arsip</div>
                    <div>PUT /api/arsip/{'{id}'}</div>
                    <div>DELETE /api/arsip/{'{id}'}</div>
                  </div>
                </div>

                {/* Master Data Endpoints */}
                <div className="p-3 bg-purple-50/70 rounded-xl border border-purple-200 space-y-1">
                  <div className="font-bold text-purple-900 text-xs uppercase flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5" /> Master Data Management
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 font-mono text-[11px] pt-1">
                    <div>GET /api/master/kategori</div>
                    <div>GET /api/master/unit</div>
                    <div>GET /api/master/gedung</div>
                    <div>GET /api/master/ruang</div>
                    <div>GET /api/master/rak</div>
                    <div>GET /api/master/dus</div>
                  </div>
                </div>

                {/* Location Hierarchy */}
                <div className="p-3 bg-emerald-50/70 rounded-xl border border-emerald-200 space-y-1">
                  <div className="font-bold text-emerald-900 text-xs uppercase flex items-center gap-1">
                    <FolderTree className="w-3.5 h-3.5" /> Pemetaan Hirarki Lokasi
                  </div>
                  <div className="font-mono text-[11px] pt-1">
                    GET /api/lokasi/tree — Mengembalikan struktur pohon lokasi fisik beserta jumlah keterisian berkas
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500 flex items-center gap-1">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Spesifikasi Backend Laravel & MySQL Lengkap</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-lg text-xs cursor-pointer"
          >
            Tutup Window
          </button>
        </div>

      </div>
    </div>
  );
};
