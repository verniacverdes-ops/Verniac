// Pintu masuk fungsi serverless Vercel. Di-bundle menjadi api/index.js
// (npm run build:api). Semua permintaan /api/* dan /documents/* diarahkan
// ke sini lewat vercel.json.
import { createApp } from './app.ts';

export default createApp();
