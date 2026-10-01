-- Membuat bucket penyimpanan lampiran arsip di Supabase Storage.
-- Jalankan sekali di Supabase -> SQL Editor. Aman diulang.
-- Bucket bersifat PRIVATE: berkas hanya bisa dibuka lewat aplikasi (server)
-- setelah login, tidak lewat link publik.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'arsip-files', 'arsip-files', false, 15728640,  -- 15 MB, sama dengan batas di aplikasi
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
)
ON CONFLICT (id) DO UPDATE
  SET public = false,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;
