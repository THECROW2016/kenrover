# KenRover Garage

A garage management system covering the whole shop workflow — customers, vehicles, service jobs, appointments, inventory, a services catalog, invoices/receipts, and staff — with separate Shop Staff and Customer interfaces.

## What's inside

- `GarageOS.jsx` — a single-file React app (Claude "artifact" format). It uses:
  - `window.storage` (a Claude.ai artifacts key-value API) for persistence — **this only works when run inside a Claude.ai artifact**, not as a standalone React app.
  - Tailwind utility classes for layout.
  - `lucide-react` for icons.

## Running it elsewhere

To run this outside Claude.ai (e.g. as a normal React app), you'd need to:
1. Replace the `window.storage` calls in `GarageOS.jsx` with your own persistence (a REST API, localStorage, Firebase, etc.).
2. Drop the component into a standard Vite/Next/CRA project with Tailwind and `lucide-react` installed.

## Features

- **Shop Staff**: dashboard with a live "bay board," customers, vehicles, service jobs (with a services checklist that totals automatically), appointments, inventory with low-stock alerts, invoices (services + parts, auto-totaled), and staff management.
- **Customer portal**: register/select a profile, add vehicles, book appointments, view service history and invoices.
- **Printing**: job cards, invoices, and receipts print via a generated standalone HTML document (opens in a new tab when possible, otherwise downloads as a file you can open and print from your own browser).
