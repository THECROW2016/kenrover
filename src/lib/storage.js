// Persistence layer for the app. This now talks to the real backend
// (see server.js) so data is shared across devices/browsers, with the
// browser's localStorage kept as a write-through cache: every save lands
// locally immediately (fast, and safe if the network drops mid-save), and
// is also sent to the server. If the server is unreachable — offline, the
// backend isn't deployed yet, whatever — the app keeps working against the
// local cache and quietly retries syncing on the next save.
//
// The rest of the app doesn't know or care about any of this: it only ever
// calls storage.get('garage_db') / storage.set('garage_db', json). This file
// is the one place that would need to change again if you swap the backend
// for something else (Postgres, Firebase, etc.).

const STORE_KEY = 'kenrover:store';
const DOC_KEY = 'garage_db';

// Same-origin by default (the Express server serves the frontend AND the API
// from one place in production). Overridable via VITE_API_BASE_URL if the
// frontend and backend are ever deployed as separate services.
const API_BASE = (import.meta.env && import.meta.env.VITE_API_BASE_URL) || '/api';
const API_KEY = (import.meta.env && import.meta.env.VITE_API_KEY) || '';

function authHeaders() {
  return API_KEY ? { 'x-api-key': API_KEY } : {};
}

function readAll() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

function writeAll(obj) {
  localStorage.setItem(STORE_KEY, JSON.stringify(obj));
}

async function apiGetDoc() {
  const res = await fetch(`${API_BASE}/db`, { headers: { Accept: 'application/json', ...authHeaders() } });
  if (!res.ok) throw new Error(`API GET failed: ${res.status}`);
  return res.json(); // the stored object, or null if nothing saved yet
}

async function apiPutDoc(obj) {
  const res = await fetch(`${API_BASE}/db`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(obj),
  });
  if (!res.ok) throw new Error(`API PUT failed: ${res.status}`);
}

export const storage = {
  async get(key) {
    if (key === DOC_KEY) {
      try {
        const obj = await apiGetDoc();
        if (obj === null) return null; // backend reachable, confirmed empty
        const value = JSON.stringify(obj);
        writeAll({ ...readAll(), [key]: value }); // refresh local cache
        return { key, value };
      } catch (e) {
        console.warn('KenRover: backend unreachable, using local cache.', e);
        // fall through to local cache below
      }
    }
    const all = readAll();
    if (!(key in all)) return null;
    return { key, value: all[key] };
  },

  async set(key, value) {
    // Write the local cache first — this always succeeds and is instant.
    const all = readAll();
    all[key] = value;
    writeAll(all);

    if (key === DOC_KEY) {
      try {
        await apiPutDoc(JSON.parse(value));
      } catch (e) {
        console.warn('KenRover: could not sync to backend, saved locally only. Will retry on next change.', e);
      }
    }
    return { key, value };
  },

  async delete(key) {
    const all = readAll();
    const existed = key in all;
    delete all[key];
    writeAll(all);
    return { key, deleted: existed };
  },

  async list(prefix = '') {
    const all = readAll();
    const keys = Object.keys(all).filter((k) => k.startsWith(prefix));
    return { keys };
  },
};
