# KenRover Garage

A garage management system covering the whole shop workflow — customers, vehicles, service jobs, appointments, an inventory-linked services catalog, invoices/receipts with tax & discounts, tool hire, expenses, and staff — with two account types: **Admin** and **Staff**.

This is a **standalone, full-stack app**: a React (Vite) frontend and a small Express backend, in one repo, deployed as one service. It is not tied to Claude.ai.

## Architecture

```
┌─────────────┐      HTTP       ┌──────────────┐                ┌────────────────┐
│  React app  │ ───────────────▶│ Express API  │ ─────────────▶ │ Postgres        │
│  (src/)     │  GET/PUT /api/db│ (server.js)  │  (DATABASE_URL) │ (real database) │
└─────────────┘◀─────────────── └──────────────┘◀─────────────  └────────────────┘
      │                                │
      │                                └── no DATABASE_URL set? falls back to a
      │                                    local JSON file — zero-setup local dev
      │
      └── also caches every read/write in the browser's localStorage,
          so the app keeps working even if the API is briefly unreachable
```

One Express process (`server.js`) serves the built frontend **and** the API from the same origin — no separate services, no CORS headaches, and it enforces HTTPS in production (see below). The whole app's data is one JSON document (customers, vehicles, jobs, invoices, everything), read and written through two endpoints:

- `GET /api/db` → the stored document, or `null` if nothing's been saved yet
- `PUT /api/db` → replaces the stored document with the request body

Storage is auto-detected: if a `DATABASE_URL` environment variable is present, the backend stores that document in a real **Postgres** database (one table, one row, a `jsonb` column — a document store running on real, durable, backed-up infrastructure). If `DATABASE_URL` isn't set, it falls back to a local JSON file, so `npm run dev:server` works instantly with nothing to install.

The frontend only ever talks to storage through `src/lib/storage.js`, and the backend only ever talks to storage through the `storeGet`/`storeSet` functions in `server.js` — those are the two places that would need to change if you later move to proper relational tables instead of one JSON document. Everything else in the app has no idea where the data actually lives.

## Quick start

**Local development** (two terminals):
```bash
npm install
npm run dev:server   # terminal 1 — the API, on :8787 (uses a local JSON file unless DATABASE_URL is set)
npm run dev          # terminal 2 — the frontend dev server, proxies /api to :8787
```

**Production build & run** (what Railway/most hosts do automatically):
```bash
npm install
npm run build     # builds the frontend into dist/
npm run start     # node server.js — serves dist/ AND the API, on $PORT
```

### Deploying on Railway

This repo includes a `railway.json` that already runs `npm run build` then `npm run start`. Three things to set up for a real deployment:

1. **Add a real Postgres database.** In your Railway project: **New → Database → Add PostgreSQL**. Railway creates a separate Postgres service with its own `DATABASE_URL`. Link it to this app's service by adding an environment variable on the app service: `DATABASE_URL` = `${{Postgres.DATABASE_URL}}` (Railway's variable-reference syntax — pick the Postgres service from the dropdown it offers when you start typing `${{`). The backend detects this automatically on next deploy and creates its table on startup — no manual migration needed.
2. **HTTPS is automatic.** Railway terminates HTTPS for you on the default `*.up.railway.app` domain — nothing to configure. The backend also actively redirects any stray HTTP request to HTTPS and sends an HSTS header, so even old bookmarked `http://` links get upgraded automatically. If you're using a **custom domain**, add it under your Railway service's Settings → Networking → Custom Domain, then point your domain's DNS at the CNAME target Railway gives you — Railway issues and renews the SSL certificate for it automatically.
3. **Lock down the API.** Set an environment variable `API_KEY` (any long random string) on the backend, and `VITE_API_KEY` (same value) at build time so the frontend sends it automatically. Without this, anyone who finds your URL can read and overwrite all your data — see "Access control" below.

## How it stores data — read this before relying on it

With `DATABASE_URL` set (the recommended production setup), your data lives in a real Postgres database — durable, automatically backed up by Railway, and genuinely shared across every device that opens the app. Without it, the backend falls back to a single JSON file on the server's disk, which works but won't survive a redeploy unless you also mount a persistent volume.

The browser also keeps a local copy for resilience either way:
- If the API is briefly unreachable (network hiccup, backend redeploying), the app keeps working against that local copy and syncs the next time a save succeeds.
- If you open the app somewhere the API has *never* been reachable (e.g. running the frontend alone without the backend), it falls back to that browser's local copy entirely — useful for offline demos, but it means that copy can drift from the server's.

Even on Postgres, this is currently a **single JSON document** rather than proper relational tables — a deliberate, pragmatic choice so the whole app didn't need a rewrite to get real database durability. It's fine for one shop's worth of data. If you outgrow it (very large datasets, need for concurrent multi-writer conflict resolution, real SQL reporting queries), the natural next step is normalizing into real tables (customers, vehicles, jobs, etc.) behind the same two endpoints — the frontend wouldn't need to change at all, only `storeGet`/`storeSet` in `server.js`.

## Accounts & access control — also read this before relying on it

There are two account types, each gated by its own PIN (changeable under Settings once signed in as Admin):
- **Admin** (default PIN `1234`) — full access, including Analytics, Expenses, Staff management, and Settings (backups, PIN changes).
- **Staff** (default PIN `5678`) — day-to-day operations: jobs, appointments, customers, vehicles, services, inventory, invoices, and tool hire. Analytics, Expenses, Staff, and Settings are hidden and blocked for this role.

This is a **basic deterrent for a shared front-desk device**, not real account security:
- It's enforced entirely in the browser — anyone with dev tools can bypass it.
- There's no per-employee login, no audit trail, no password hashing/salting, no rate limiting on attempts.
- The backend API itself is **open by default** — set the `API_KEY` / `VITE_API_KEY` pair described above before putting this anywhere public, or anyone with your URL can read and overwrite everything, PIN or no PIN.

For anything handling real customer payment data or needing accountability per individual employee, put real authentication (e.g. Auth0, Clerk, Supabase Auth) in front of this, and consider moving from the single-JSON-file store to a proper database with row-level access control.

## Features

- **Starts empty.** There's no demo/sample data — the app opens with nothing in it so the first things you add are your own. Admin → Settings has a **"Clear all data"** button any time you want to wipe back to that same clean state (export a backup first if there's anything worth keeping).
- **Dashboard** — live stats, a "bay board" of active jobs, low-stock alerts, upcoming appointments, revenue/expenses/net profit.
- **Analytics** (Admin only) — automated business-intelligence view: revenue vs. expenses over the last 6 months, top services by revenue, expense breakdown by category, and a plain-language "automated insights" panel that flags things like low stock, unpaid invoices, overdue rentals, and your top customer — all computed live from whatever data you've entered, no setup required.
- **Customers, Vehicles, Staff, Services** — full CRUD with search.
- **Service Jobs** — a services checklist that auto-totals the job cost; status pipeline (pending → in-progress → completed → delivered).
- **Appointments** — booking with status tracking.
- **Inventory** — stock levels with low-stock highlighting; **parts are automatically deducted from stock when an invoice using them is created.**
- **Invoices** — services + parts, discount and tax-rate fields, auto-computed totals, paid/unpaid status.
- **Tool Hire** — a tools catalog and rental tracking for equipment lent out to other mechanics/garages, billed per day.
- **Expenses** — categorized cost tracking (Admin only), feeding into the dashboard's net profit figure and Analytics.
- **Printing** — job cards, invoices, and receipts generate a standalone printable HTML document. It opens in a new tab and triggers your browser's print dialog when possible; if pop-ups are blocked, it downloads the file instead so you can open and print it yourself.
- **Backup & restore** — export the full dataset as JSON from Settings, and restore from a previous export.


## `claude-artifact/GarageOS.jsx`

The original single-file version of this app, built to run as a "Claude Artifact" inside Claude.ai. It uses Claude's own `window.storage` API rather than this repo's backend — it's a self-contained file meant to be pasted directly into a Claude.ai chat, not built with Vite, and it doesn't talk to `server.js` at all. Kept here for reference. The actively maintained, backend-connected version is the one in `src/`.
