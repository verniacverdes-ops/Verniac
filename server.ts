import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import 'dotenv/config';
import { testConnection } from './backend/config/database.ts';
import { createApp } from './backend/app.ts';

async function startServer() {
  const PORT = 3000;

  // Cek koneksi database saat server start (tidak menghentikan server jika gagal)
  await testConnection();

  const app = createApp();

  // -------------------------------------------------------------
  // VITE & CLIENT SPA FALLBACK ROUTE
  // Routes like /arsip, /sirkulasi, /approval, /reports, /master
  // -------------------------------------------------------------
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server SI Pertelaan Arsip running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
