# KenRover Garage

A garage management system covering the whole shop workflow — customers, vehicles, service jobs, appointments, an inventory-linked services catalog, invoices/receipts with tax & discounts, and staff — with separate **Shop Staff** and **Customer** interfaces.

This is a **standalone, deployable React app** (Vite + Tailwind). It is not tied to Claude.ai — you can run it locally, build it, and host it anywhere that serves static files.

## Quick start

```bash
npm install
npm run dev       # local dev server
npm run build     # production build -> dist/
npm run preview   # preview the production build locally
```

Deploy the contents of `dist/` to any static host (Vercel, Netlify, GitHub Pages, S3, etc.). No server or database is required to run it.

## How it stores data — read this before relying on it

Data is saved to the browser's **localStorage**, per device, per browser. There is no backend and no database.

This means:
- Everything a staff member enters on one computer stays on that computer. It will **not** sync to a phone, a second front-desk PC, or a different browser.
- Clearing browser data / site data will erase everything. **Use Settings → Export backup regularly.**
- This is appropriate for a single-till pilot, a demo, or a very small one-computer shop. It is **not** appropriate as-is for a multi-location or multi-device business.

If you need real multi-user/multi-device support, the fix is to replace `src/lib/storage.js` with calls to a real backend (a small API in front of Postgres/SQLite/Firebase/etc.). Every part of the app reads and writes through that one file, so that's the only place that needs to change — the rest of the UI doesn't know or care where the data lives.

## Access control — also read this before relying on it

The "Shop Staff" side is gated by a 4+ digit PIN (default `1234`, shown on first run, changeable under Settings). This is a **basic deterrent for a shared front-desk device**, not real account security:
- It's enforced entirely in the browser — anyone with dev tools can bypass it.
- There's no per-employee login, no audit trail, no password hashing/salting, no rate limiting on attempts.

For anything handling real customer payment data or needing accountability per staff member, put real authentication (e.g. Auth0, Clerk, Supabase Auth, or your own backend with hashed passwords) in front of this, ideally alongside the real backend mentioned above.

## Features

- **Dashboard** — live stats, a "bay board" of active jobs, low-stock alerts, upcoming appointments.
- **Customers, Vehicles, Staff, Services** — full CRUD with search.
- **Service Jobs** — a services checklist that auto-totals the job cost; status pipeline (pending → in-progress → completed → delivered).
- **Appointments** — booking with status tracking.
- **Inventory** — stock levels with low-stock highlighting; **parts are automatically deducted from stock when an invoice using them is created.**
- **Invoices** — services + parts, discount and tax-rate fields, auto-computed totals, paid/unpaid status.
- **Printing** — job cards, invoices, and receipts generate a standalone printable HTML document. It opens in a new tab and triggers your browser's print dialog when possible; if pop-ups are blocked, it downloads the file instead so you can open and print it yourself.
- **Customer portal** — customers pick or create their own profile, add vehicles, book appointments, and view their own service history and invoices/receipts.
- **Backup & restore** — export the full dataset as JSON from Settings, and restore from a previous export.

## `claude-artifact/GarageOS.jsx`

The original single-file version of this app, built to run as a "Claude Artifact" inside Claude.ai (it uses Claude's `window.storage` API instead of localStorage, and is meant to be pasted directly into a Claude.ai chat, not built with Vite). Kept here for reference — the actively maintained version is the one in `src/`.
