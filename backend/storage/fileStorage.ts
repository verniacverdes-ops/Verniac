// Penyimpanan berkas lampiran arsip (PDF / Word / Excel).
//
// Dua mode, dipilih otomatis lewat environment variable:
//   - SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY terisi -> Supabase Storage
//     (permanen, tidak hilang saat server/Vercel restart).
//   - kalau tidak -> disk lokal backend/uploads/arsip/ (untuk pengembangan
//     di komputer sendiri; TIDAK permanen di Vercel).
//
// Kunci Supabase hanya dipakai di server (backend). Jangan pernah
// menaruhnya di kode frontend (src/).
import fs from "fs";
import fsp from "fs/promises";
import path from "path";
import { Readable } from "stream";
import { createClient } from "@supabase/supabase-js";

export interface OpenedFile {
  stream: Readable;
  size?: number;
}

export interface FileStorage {
  readonly kind: "local" | "supabase";
  save(name: string, data: Buffer, mime: string): Promise<void>;
  /** Melempar error kalau gagal; pemanggil biasanya `.catch(() => {})`. */
  remove(name: string): Promise<void>;
  /** null = berkas tidak ditemukan. */
  open(name: string): Promise<OpenedFile | null>;
}

export function createLocalStorage(dir: string): FileStorage {
  return {
    kind: "local",
    async save(name, data) {
      await fsp.mkdir(dir, { recursive: true });
      await fsp.writeFile(path.join(dir, name), data);
    },
    async remove(name) {
      await fsp.unlink(path.join(dir, name));
    },
    async open(name) {
      const filePath = path.join(dir, name);
      if (!fs.existsSync(filePath)) return null;
      const stat = await fsp.stat(filePath);
      return { stream: fs.createReadStream(filePath), size: stat.size };
    },
  };
}

export function createSupabaseStorage(url: string, key: string, bucket: string): FileStorage {
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const bucketApi = () => client.storage.from(bucket);

  return {
    kind: "supabase",
    async save(name, data, mime) {
      const { error } = await bucketApi().upload(name, data, { contentType: mime, upsert: true });
      if (error) throw new Error(`Gagal menyimpan berkas ke Supabase Storage: ${error.message}`);
    },
    async remove(name) {
      const { error } = await bucketApi().remove([name]);
      if (error) throw new Error(`Gagal menghapus berkas di Supabase Storage: ${error.message}`);
    },
    async open(name) {
      const { data, error } = await bucketApi().download(name);
      if (error) {
        if (/not.?found|does not exist|404/i.test(error.message || "")) return null;
        throw new Error(`Gagal mengambil berkas dari Supabase Storage: ${error.message}`);
      }
      if (!data) return null;
      const buf = Buffer.from(await data.arrayBuffer());
      return { stream: Readable.from(buf), size: buf.length };
    },
  };
}

/** Pilih penyimpanan berdasarkan environment variable. */
export function createFileStorage(localDir: string): FileStorage {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (url && key) {
    return createSupabaseStorage(url, key, process.env.SUPABASE_BUCKET || "arsip-files");
  }
  return createLocalStorage(localDir);
}
