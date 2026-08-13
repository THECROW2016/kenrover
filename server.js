// KenRover Garage — backend
//
// This is intentionally small: one document store (the whole app database as a
// single JSON object) behind two endpoints, plus serving the built frontend.
// That matches how the frontend already works (src/lib/storage.js persists one
// JSON blob under the key "garage_db") — this backend just becomes the real,
// shared, multi-device home for that blob instead of each browser's localStorage.
//
// GET  /api/db   -> the stored object, or `null` if nothing has been saved yet
// PUT  /api/db   -> body is the new object; replaces what's stored
// GET  /api/health -> { ok: true }, for quick checks
//
// Everything else is served from ./dist (the Vite build output), with an
// index.html fallback so refreshing the page works.

import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'db.json');
const DIST_DIR = path.join(__dirname, 'dist');
const PORT = process.env.PORT || 8787;

// Optional shared-secret protection for the API. If API_KEY is unset, the API
// is open — fine for local development, NOT fine for a real public deployment.
// Set API_KEY in your hosting platform's environment variables, and set the
// matching VITE_API_KEY at build time so the frontend sends it automatically.
const API_KEY = process.env.API_KEY || '';

const app = express();
app.use(cors());
app.use(express.json({ limit: '5mb' }));

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.use('/api', (req, res, next) => {
  if (req.path === '/health') return next();
  if (!API_KEY) return next(); // no key configured — open (dev convenience only)
  const provided = req.header('x-api-key');
  if (provided === API_KEY) return next();
  res.status(401).json({ error: 'Unauthorized — missing or wrong x-api-key header.' });
});

app.get('/api/db', (req, res) => {
  ensureDataDir();
  if (!fs.existsSync(DATA_FILE)) return res.json(null);
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    res.json(JSON.parse(raw));
  } catch (e) {
    console.error('Failed to read data file:', e);
    res.status(500).json({ error: 'Could not read stored data.' });
  }
});

app.put('/api/db', (req, res) => {
  ensureDataDir();
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(req.body, null, 2));
    res.json({ ok: true });
  } catch (e) {
    console.error('Failed to write data file:', e);
    res.status(500).json({ error: 'Could not save data.' });
  }
});

if (fs.existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(DIST_DIR, 'index.html'));
  });
} else {
  console.warn(`No build found at ${DIST_DIR} — run "npm run build" first. The API will still work on its own.`);
}

app.listen(PORT, () => {
  console.log(`KenRover backend listening on port ${PORT}`);
  console.log(`Data file: ${DATA_FILE}`);
  console.log(API_KEY ? 'API key protection: ON' : 'API key protection: OFF (set API_KEY env var to enable)');
});
