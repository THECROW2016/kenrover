# KenRover Garage

A garage management system covering the whole shop workflow — customers, vehicles, service jobs, appointments, an inventory-linked services catalog, invoices/receipts with tax & discounts, tool hire, expenses, and staff — with two account types: **Admin** and **Staff**.

This is a **standalone, full-stack app**: a React (Vite) frontend and a small Express backend, in one repo, deployed as one service. It is not tied to Claude.ai.

## Architecture

```
┌─────────────┐      HTTP       ┌──────────────┐      file      ┌────────────────┐
│  React app  │ ───────────────▶│ Express API  │ ─────────────▶ │ data/db.json    │
│  (src/)     │  GET/PUT /api/db│ (server.js)  │                │ (one JSON doc)  │
└─────────────┘◀─────────────── └──────────────┘◀─────────────  └────────────────┘
      │
      └── also caches every read/write in the browser's localStorage,
          so the app keeps working even if the API is briefly unreachable
```

One Express process (`server.js`) serves the built frontend **and** the API from the same origin — no separate services, no CORS headaches. The whole app's data is one JSON document (customers, vehicles, jobs, invoices, everything), read and written through two endpoints:

- `GET /api/db` → the stored document, or `null` if nothing's been saved yet
- `PUT /api/db` → replaces the stored document with the request body

The frontend only ever talks to storage through `src/lib/storage.js` — that's the one file that would need to change if you swap this for a "real" database (Postgres, etc.) later. Everything else in the app has no idea where the data actually lives.

## Quick start

**Local development** (two terminals):
```bash
npm install
npm run dev:server   # terminal 1 — the API, on :8787
npm run dev          # terminal 2 — the frontend dev server, proxies /api to :8787
```

**Production build & run** (what Railway/most hosts do automatically):
```bash
npm install
npm run build     # builds the frontend into dist/
npm run start     # node server.js — serves dist/ AND the API, on $PORT
```

### Deploying (e.g. Railway)

This repo includes a `railway.json` that already runs `npm run build` then `npm run start` — deploying is just connecting the repo. Two things worth setting up:

1. **Persistent storage.** By default the API writes to `data/db.json` inside the container's filesystem, which most platforms (including Railway) wipe on every redeploy. Add a **volume** mounted at a stable path (e.g. Railway → your service → Settings → Volumes → mount at `/app/data`) and set the environment variable `DATA_DIR=/app/data` so your data survives redeploys.
2. **Lock down the API.** Set an environment variable `API_KEY` (any long random string) on the backend, and `VITE_API_KEY` (same value) at build time so the frontend sends it automatically. Without this, anyone who finds your URL can read and overwrite all your data — see "Access control" below.

## How it stores data — read this before relying on it

Data lives in one JSON file on the server (`data/db.json`), shared across every device that opens the app — this is real, multi-device persistence, not per-browser storage. The browser also keeps a local copy for resilience:
- If the API is briefly unreachable (network hiccup, backend redeploying), the app keeps working against that local copy and syncs the next time a save succeeds.
- If you open the app somewhere the API has *never* been reachable (e.g. running the frontend alone without the backend), it falls back to that browser's local copy entirely — useful for offline demos, but it means that copy can drift from the server's.

This is a **single JSON document**, not a relational database — fine for one shop's worth of data, but it means every save rewrites the whole document. If you outgrow that (very large datasets, need for concurrent multi-writer conflict resolution, reporting queries, etc.), the natural next step is swapping `data/db.json` for a real database — Postgres is a common choice on Railway — behind the same two endpoints, so the frontend wouldn't need to change at all.

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
