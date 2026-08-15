// KenRover Garage — backend
//
// One document store (the whole app database as a single JSON object) behind
// two endpoints, plus serving the built frontend. That matches how the
// frontend already works (src/lib/storage.js persists one JSON blob under the
// key "garage_db") — this backend is the real, shared, multi-device home for
// that blob.
//
// Storage backend is auto-detected:
//   - If DATABASE_URL is set (Railway Postgres, or any Postgres), data is
//     stored in a real Postgres database — durable, backed up, no ephemeral
//     disk concerns.
//   - If DATABASE_URL is NOT set, falls back to a local JSON file
//     (data/db.json) so local development works with zero setup.
//
// GET  /api/db      -> the stored object, or `null` if nothing has been saved yet
// PUT  /api/db      -> body is the new object; replaces what's stored
// GET  /api/health  -> { ok: true, storage: 'postgres' | 'file' }
//
// Everything else is served from ./dist (the Vite build output), with an
// index.html fallback so refreshing the page works.

import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'db.json');
const DIST_DIR = path.join(__dirname, 'dist');
const PORT = process.env.PORT || 8787;
const DOC_KEY = 'garage_db';

// Optional shared-secret protection for the API. If API_KEY is unset, the API
// is open — fine for local development, NOT fine for a real public deployment.
// Set API_KEY in your hosting platform's environment variables, and set the
// matching VITE_API_KEY at build time so the frontend sends it automatically.
const API_KEY = process.env.API_KEY || '';

/* --------------------------------- STORAGE --------------------------------- */
// Real Postgres when DATABASE_URL is provided (Railway sets this automatically
// once you attach a Postgres database to this service and reference it — see
// README). Falls back to a local JSON file otherwise, so `npm run dev:server`
// works out of the box with no database installed.

const DATABASE_URL = process.env.DATABASE_URL || '';
let pool = null;

if (DATABASE_URL) {
  pool = new pg.Pool({
    connectionString: DATABASE_URL,
    // Railway's managed Postgres (and most hosted Postgres) requires SSL but
    // uses a certificate that isn't in Node's default trust store — this is
    // the standard, documented workaround for that, not a security downgrade
    // of the connection itself (traffic is still encrypted).
    ssl: process.env.PGSSL_DISABLE ? false : { rejectUnauthorized: false },
  });
}

async function initStorage() {
  if (!pool) {
    ensureDataDir();
    return;
  }
  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_data (
      key TEXT PRIMARY KEY,
      value JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
}

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

async function storeGet(key) {
  if (pool) {
    const { rows } = await pool.query('SELECT value FROM app_data WHERE key = $1', [key]);
    return rows.length ? rows[0].value : null;
  }
  ensureDataDir();
  if (!fs.existsSync(DATA_FILE)) return null;
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

async function storeSet(key, value) {
  if (pool) {
    await pool.query(
      `INSERT INTO app_data (key, value, updated_at) VALUES ($1, $2, now())
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
      [key, value]
    );
    return;
  }
  ensureDataDir();
  fs.writeFileSync(DATA_FILE, JSON.stringify(value, null, 2));
}

/* ----------------------------------- APP ----------------------------------- */

const app = express();

// Railway (and most PaaS hosts) terminate HTTPS at a proxy and forward plain
// HTTP internally — "trust proxy" lets Express see the real originating
// protocol via the X-Forwarded-Proto header instead of always seeing "http".
app.set('trust proxy', 1);

// Force HTTPS in production, and tell browsers to remember that via HSTS.
// RAILWAY_ENVIRONMENT is set automatically by Railway, so this only kicks in
// on an actual deployment, never during local dev.
app.use((req, res, next) => {
  const onRailway = !!process.env.RAILWAY_ENVIRONMENT;
  if (onRailway && req.headers['x-forwarded-proto'] === 'http') {
    return res.redirect(301, `https://${req.headers.host}${req.originalUrl}`);
  }
  if (onRailway) {
    res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  }
  next();
});

app.use(cors());
app.use(express.json({ limit: '5mb' }));

app.get('/api/health', (req, res) => res.json({ ok: true, storage: pool ? 'postgres' : 'file' }));

app.use('/api', (req, res, next) => {
  if (req.path === '/health') return next();
  if (!API_KEY) return next(); // no key configured — open (dev convenience only)
  const provided = req.header('x-api-key');
  if (provided === API_KEY) return next();
  res.status(401).json({ error: 'Unauthorized — missing or wrong x-api-key header.' });
});

app.get('/api/db', async (req, res) => {
  try {
    const value = await storeGet(DOC_KEY);
    res.json(value);
  } catch (e) {
    console.error('Failed to read stored data:', e);
    res.status(500).json({ error: 'Could not read stored data.' });
  }
});

app.put('/api/db', async (req, res) => {
  try {
    await storeSet(DOC_KEY, req.body);
    res.json({ ok: true });
  } catch (e) {
    console.error('Failed to write stored data:', e);
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

initStorage()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`KenRover backend listening on port ${PORT}`);
      console.log(pool ? 'Storage: Postgres (DATABASE_URL detected)' : `Storage: local file (${DATA_FILE})`);
      console.log(API_KEY ? 'API key protection: ON' : 'API key protection: OFF (set API_KEY env var to enable)');
    });
  })
  .catch((e) => {
    console.error('Failed to initialize storage:', e);
    process.exit(1);
  });
