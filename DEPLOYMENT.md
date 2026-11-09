# CortexHeal — Bare-Metal Deployment Guide

Single-server deployment: Docker Compose for backend services, Caddy for TLS and static file serving.

## Architecture

```
Internet → Caddy (443) ─┬─ /api/*      → api container :8000
                         ├─ /health     → api container :8000
                         ├─ /dashboard* → frontend/dist (static SPA)
                         └─ /*          → site/dist (static marketing)
```

**Stack:** PostgreSQL 15 · Redis 7 · FastAPI + uvicorn (4 workers) · React 19 + Vite (static) · Caddy 2

---

## Prerequisites

| Requirement | Minimum |
|---|---|
| OS | Ubuntu 22.04+ / Debian 12+ (any systemd Linux) |
| Docker Engine | 24+ with `docker compose` v2 |
| Caddy | 2.7+ |
| RAM | 2 GB |
| Disk | 20 GB free |
| DNS | A record for your domain pointing at the server IP |

---

## 1. Server preparation

```bash
# Host directories (Docker won't create bind-mount sources)
sudo mkdir -p /opt/cortexheal/data/postgres
sudo mkdir -p /opt/cortexheal/backups
sudo chown -R 999:999 /opt/cortexheal/data/postgres

# Ensure Docker starts on boot
sudo systemctl enable docker
```

## 2. Clone and configure

```bash
git clone <your-repo-url> /opt/cortexheal/app
cd /opt/cortexheal/app

cp .env.production.example .env.production
nano .env.production
```

Edit `.env.production` — set at minimum:

| Variable | Action |
|---|---|
| `POSTGRES_PASSWORD` | Strong random string (32+ chars) |
| `DATABASE_URL` | Match the password in the connection string |
| `CORTEXHEAL_CORS_ORIGINS` | Your actual domain: `https://yourdomain.com` |

**Never commit `.env.production` to version control.**

## 3. Build frontend assets

```bash
# Dashboard SPA
cd /opt/cortexheal/app/frontend
npm ci && npm run build
# → frontend/dist/

# Marketing site
cd /opt/cortexheal/app/site
npm ci && npm run build
# → site/dist/
```

If serving the dashboard under `/dashboard` (recommended), set `base` in
`frontend/vite.config.ts` before building:

```ts
export default defineConfig({
  base: '/dashboard/',
  // ...rest of config
})
```

## 4. Start the Docker stack

```bash
cd /opt/cortexheal/app
docker compose -f docker-compose.prod.yml up -d --build
```

Services started:

- **postgres** — PostgreSQL 15, loopback :5432, data persisted to `/opt/cortexheal/data/postgres`
- **redis** — Redis 7 Alpine, internal network only
- **api** — FastAPI on loopback :8000, 4 uvicorn workers
- **demo-runner** — Synthetic demo data (remove from compose if not needed)

**Migrations run automatically** — the API calls `init_db()` on startup, which
applies yoyo migrations. No manual migration step needed.

Verify:

```bash
curl http://127.0.0.1:8000/health
# {"status": "ok"}
```

## 5. Configure Caddy

Install Caddy:

```bash
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | \
  sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | \
  sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update && sudo apt install caddy
```

Create `/etc/caddy/Caddyfile` (replace `yourdomain.com`):

```caddyfile
yourdomain.com {
    # API reverse proxy
    handle /api/* {
        reverse_proxy 127.0.0.1:8000
    }
    handle /health {
        reverse_proxy 127.0.0.1:8000
    }

    # SSE — disable response buffering
    handle /api/sse* {
        reverse_proxy 127.0.0.1:8000 {
            flush_interval -1
        }
    }

    # Dashboard SPA
    handle /dashboard* {
        root * /opt/cortexheal/app/frontend/dist
        uri strip_prefix /dashboard
        try_files {path} /index.html
        file_server
    }

    # Marketing site (catch-all)
    root * /opt/cortexheal/app/site/dist
    try_files {path} /index.html
    file_server

    encode gzip zstd
}
```

Reload:

```bash
sudo systemctl reload caddy
```

Caddy auto-provisions TLS via Let's Encrypt. Site is now live at `https://yourdomain.com`.

## 6. Create admin user

The API ships with no default accounts. Create the first org and admin:

```bash
docker compose -f docker-compose.prod.yml exec api \
  python scripts/init_demo_org.py
```

Or use the programmatic approach from a Python shell inside the container.

## 7. Scheduled backups

Add to root crontab (`sudo crontab -e`):

```cron
0 3 * * * docker exec cortexheal-app-postgres-1 \
  pg_dump -U cortexheal cortexheal_db | \
  gzip > /opt/cortexheal/backups/db-$(date +\%Y\%m\%d).sql.gz

0 4 * * * find /opt/cortexheal/backups -name "db-*.sql.gz" -mtime +30 -delete
```

## 8. Monitoring

| Endpoint | Purpose |
|---|---|
| `GET /health` | Returns `{"status": "ok"}` when API + DB are healthy |
| `GET /api/metrics` | Incident counts, detection latency p50/p95, cost data |
| Docker logs | `docker compose -f docker-compose.prod.yml logs -f api` |

Point your uptime monitor (UptimeRobot, Healthchecks.io) at `https://yourdomain.com/health`.

## 9. Updating

```bash
cd /opt/cortexheal/app
git pull origin main

# Rebuild frontends
cd frontend && npm ci && npm run build && cd ..
cd site && npm ci && npm run build && cd ..

# Rebuild and restart API (migrations run automatically)
docker compose -f docker-compose.prod.yml up -d --build

# Caddy serves static files — no restart needed
```

## Security checklist

- [ ] `ALLOW_DEV_TOKENS=False` in `.env.production`
- [ ] `POSTGRES_PASSWORD` is a strong random string
- [ ] `.env.production` is not committed to git
- [ ] Firewall: only 80/443 inbound; Postgres 5432 and API 8000 are loopback-only
- [ ] `CORTEXHEAL_CORS_ORIGINS` lists only your actual domain(s)
- [ ] Demo runner removed from compose if not needed in production
