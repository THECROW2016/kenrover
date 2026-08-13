# KenRover Garage

A garage management system covering the whole shop workflow — customers, vehicles, service jobs, appointments, an inventory-linked services catalog, invoices/receipts with tax & discounts, tool hire, expenses, and staff — with two account types: **Admin** and **Staff**.

This is a **standalone, deployable React app** (Vite + Tailwind). It is not tied to Claude.ai — you can run it locally, build it, and host it anywhere that serves static files.

## Quick start

```bash
npm install
npm run dev       # local dev server
npm run build     # production build -> dist/
npm run start     # serve the production build (used by Railway/most PaaS hosts)
npm run preview   # preview the production build locally via Vite
```

Deploy the contents of `dist/` to any static host (Vercel, Netlify, GitHub Pages, S3, etc.), or deploy the whole repo to a platform like Railway — it will run `npm run build` then `npm run start` automatically (see `railway.json`).

## How it stores data — read this before relying on it

Data is saved to the browser's **localStorage**, per device, per browser. There is no backend and no database.

This means:
- Everything a staff member enters on one computer stays on that computer. It will **not** sync to a phone, a second front-desk PC, or a different browser.
- Clearing browser data / site data will erase everything. **Use Settings → Export backup regularly.**
- This is appropriate for a single-till pilot, a demo, or a very small one-computer shop. It is **not** appropriate as-is for a multi-location or multi-device business.

If you need real multi-user/multi-device support, the fix is to replace `src/lib/storage.js` with calls to a real backend (a small API in front of Postgres/SQLite/Firebase/etc.). Every part of the app reads and writes through that one file, so that's the only place that needs to change — the rest of the UI doesn't know or care where the data lives.

## Accounts & access control — also read this before relying on it

There are two account types, each gated by its own PIN (changeable under Settings once signed in as Admin):
- **Admin** (default PIN `1234`) — full access, including Expenses, Staff management, and Settings (backups, PIN changes).
- **Staff** (default PIN `5678`) — day-to-day operations: jobs, appointments, customers, vehicles, services, inventory, invoices, and tool hire. Expenses, Staff, and Settings are hidden and blocked for this role.

This is a **basic deterrent for a shared front-desk device**, not real account security:
- It's enforced entirely in the browser — anyone with dev tools can bypass it.
- There's no per-employee login, no audit trail, no password hashing/salting, no rate limiting on attempts.

For anything handling real customer payment data or needing accountability per individual employee, put real authentication (e.g. Auth0, Clerk, Supabase Auth, or your own backend with hashed passwords) in front of this, ideally alongside the real backend mentioned above.

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

The original single-file version of this app, built to run as a "Claude Artifact" inside Claude.ai (it uses Claude's `window.storage` API instead of localStorage, and is meant to be pasted directly into a Claude.ai chat, not built with Vite). Kept here for reference — the actively maintained version is the one in `src/`.
