// Drop-in replacement for the Claude.ai artifact `window.storage` API, backed by
// the browser's localStorage so the app works as a normal deployed website.
//
// IMPORTANT LIMITATION: localStorage is per-browser, per-device. Two staff on two
// different computers will NOT see each other's changes. This is fine for a single
// front-desk machine or a quick pilot, but for a real multi-user shop you should
// swap this module out for calls to a real backend/database — every other part of
// the app talks to storage only through the functions below, so that's the only
// file that needs to change.

const STORE_KEY = 'kenrover:store';

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

export const storage = {
  async get(key) {
    const all = readAll();
    if (!(key in all)) return null;
    return { key, value: all[key] };
  },
  async set(key, value) {
    const all = readAll();
    all[key] = value;
    writeAll(all);
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
