# Portfolio — Operations Guide

Single source of truth for running **www.hereaj.com**. Last updated: 2026-11-02 (migration to dedicated droplet + FastAPI rewrite).

## Overview

| | |
|---|---|
| Server | DigitalOcean droplet `ubuntu-s-1vcpu-1gb-sfo3-hereaj` — **143.110.238.18** (Ubuntu 24.04, 1 vCPU / 1 GB + 2 GB swap) |
| Domain | `www.hereaj.com` (canonical) — apex + http 301 here; DNS via Squarespace, two A records (`@`, `www`) |
| Stack | React 18 + Vite 4 static build (served by nginx) · FastAPI + uvicorn (`/api` only) · PostgreSQL 16 (local) |
| Process | `portfolio.service` (systemd) → uvicorn on `127.0.0.1:8000`, single worker |
| TLS | Let's Encrypt, one cert covering `www.hereaj.com` + `hereaj.com`; auto-renew via `certbot.timer` |
| Firewall | ufw: OpenSSH, 80, 443 only |

History: previously Express/Node + PM2 on the shared "Autobot" droplet (24.144.83.212); migrated off 2026-11-02. The final pre-migration backup bundle lives on the laptop at `backups/old-vps-final-2026-11-02/` (gitignored).

## Server layout

```
/var/www/portfolio/            repo checkout (branch: main)
├── .env                       secrets, mode 600 (see .env.example; loaded by backend)
├── backend/                   FastAPI app + .venv
├── client/dist/               built frontend — served by nginx directly
├── attached_assets/           PDFs/images — served by nginx at /attached_assets
└── deploy/                    source of the two config files below

/etc/systemd/system/portfolio.service    from deploy/portfolio.service
/etc/nginx/sites-available/portfolio     from deploy/nginx-portfolio.conf (+ certbot edits)
/etc/letsencrypt/live/www.hereaj.com/    cert lineage
/root/portfolio-admin.txt                admin login creds, mode 600
/root/backups/                           nightly DB dumps (14-day retention)
/usr/local/bin/portfolio-db-backup       backup script (cron: 03:30 UTC daily)
```

## Daily driving

```bash
systemctl status portfolio            # app status
journalctl -u portfolio -f            # app logs (uvicorn + SQL errors)
systemctl restart portfolio           # restart app
nginx -t && systemctl reload nginx    # after nginx config changes
curl -s localhost:8000/api/health     # {"status":"ok"}
tail -f /var/log/nginx/access.log
```

## Deploying an update

The frontend is **built locally and committed** (`client/dist` is tracked) — the server never runs npm/node.

1. Local: change code → `npm run build` (if client changed) → commit → PR → merge to main.
2. Server:
   ```bash
   cd /var/www/portfolio && git pull
   # only if backend/requirements.txt changed:
   backend/.venv/bin/pip install -r backend/requirements.txt
   systemctl restart portfolio
   ```

Local dev: `npm run install:all`, `npm run backend:setup`, copy `.env.example` → `.env`, then `npm run dev` (Vite on :3000 proxying `/api` → uvicorn :8000).

## Database

- DB `portfolio`, owner role `portfolio`, local Postgres 16. Connection string in `.env` (`DATABASE_URL`).
- `psql "$(grep ^DATABASE_URL= /var/www/portfolio/.env | cut -d= -f2-)"` for a shell.
- Schema is created at app boot (`backend/init_db.py`, `CREATE TABLE IF NOT EXISTS`); content tables are **seeded only if `hero_info` is empty** — never start the app against an empty DB you intend to restore into.
- Content is edited via the `/admin` UI; the DB is the source of truth for site content.

### Backups

- Nightly: cron `30 3 * * *` UTC runs `/usr/local/bin/portfolio-db-backup` → `/root/backups/portfolio-YYYY-MM-DD.sql.gz`, pruned after 14 days. Log: `/var/log/portfolio-db-backup.log`.
- Manual: `/usr/local/bin/portfolio-db-backup`
- Off-box: copy a dump to the laptop occasionally (`scp root@143.110.238.18:/root/backups/portfolio-$(date +%F).sql.gz .`) or enable DO droplet snapshots.

### Restore

```bash
systemctl stop portfolio
sudo -u postgres dropdb portfolio
sudo -u postgres createdb -O portfolio portfolio
gunzip -c /root/backups/portfolio-YYYY-MM-DD.sql.gz | \
  psql "$(grep ^DATABASE_URL= /var/www/portfolio/.env | cut -d= -f2-)" -v ON_ERROR_STOP=1 --single-transaction
systemctl start portfolio
```

## TLS

- One lineage `www.hereaj.com` covering both hosts. `certbot certificates` to inspect; `certbot renew --dry-run` to test; `certbot.timer` handles real renewals (nginx plugin).
- nginx config carries `# managed by Certbot` lines — leave them for certbot to manage.

## Security notes

- uvicorn binds localhost only; ufw blocks everything except 22/80/443.
- Admin API: `x-session-id` header auth, in-memory sessions (30-min absolute expiry — restart logs everyone out), login rate-limited to 5 failures / 15 min / IP. **Keep a single uvicorn worker** or sessions break.
- The old Express `POST /api/admin/clear-limits` (unauthenticated reset) was intentionally **not** ported.
- HSTS is 1 year with `preload` — never serve this domain without valid TLS.

## Rollback

- App-level: `git log` → `git checkout <commit> -- .` or revert PR, then redeploy (see above).
- Data: restore a dump (above).
- Full-server: rebuild from this guide + latest dump; the repo is public, secrets come from the laptop backup bundle or `/root` copies.
