# Deployment Guide

## Current Setup: Railway

This app is deployed on **Railway** and requires a backend to run (cannot be deployed to GitHub Pages static hosting).

### Database

Add a Postgres database in Railway (**New → Database → Add PostgreSQL**), then link it to the app service by setting the app's `DATABASE_URL` environment variable to `${{Postgres.DATABASE_URL}}`. Without this, the app falls back to a local file that gets wiped on every redeploy — fine for testing, not for real use. See the main `README.md` → "Deploying on Railway" for the full walkthrough.

### Domain Configuration

Your custom domain `www.kenroversgms.co.ke` is configured to point to Railway.

#### To complete the setup:

1. **In Railway Dashboard:**
   - Go to your project **Settings**
   - Add custom domain: `www.kenroversgms.co.ke`
   - Note the Railway domain provided (e.g., `kenrover-production.railway.app`)

2. **At Your DNS Registrar** (where you registered `kenroversgms.co.ke`):
   
   **For www subdomain:**
   - Type: `CNAME`
   - Name: `www`
   - Value: Your Railway domain
   
   **For root domain** (optional, if you want `kenroversgms.co.ke` to work):
   - Type: `A` record or follow your registrar's guide for apex domain pointing
   - Point to Railway's IP address (provided in Railway settings)

3. **DNS Propagation:**
   - Changes typically take 5-30 minutes
   - Check status: `nslookup www.kenroversgms.co.ke`

### Why Not GitHub Pages?

GitHub Pages only hosts **static files**. This app needs a backend server, so it must be deployed to Railway or similar hosting that supports full-stack apps.

### Testing

Once DNS propagates, visit `www.kenroversgms.co.ke` and verify your app is running with the backend operational.

---

**Last updated:** August 13, 2026
