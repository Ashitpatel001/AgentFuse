# AgentFuse — Enterprise Bare-Metal Deployment & Production Guide

This guide details the complete production deployment itinerary for **AgentFuse: The Automated Circuit Breaker & Safety Firewall for Autonomous AI Agents**.

It covers both **Option 1: Docker Compose (All-in-One)** and **Option 2: Native Bare-Metal (Native PostgreSQL Binaries + Systemd)**.

---

## Architecture & Data Residency

```
           COMPANY / CUSTOMER INFRASTRUCTURE                     AGENTFUSE CONTROL PLANE
    ┌───────────────────────────────────────────┐         ┌─────────────────────────────────────┐
    │   AI Agent Application (K8s / Lambda)     │         │      Bare-Metal / VPC Server        │
    │                                           │         │                                     │
    │  Option A: Zero-Code Proxy Gateway        │         │  ┌───────────────────────────────┐  │
    │    openai.base_url = "https://.../v1"     │────────┼─▶│ Caddy Reverse Proxy (443/TLS) │  │
    │                                           │         │  └──────────────┬────────────────┘  │
    │  Option B: Native Adapter (LangGraph)     │         │                 │                   │
    │    SHA-256 State Hashing & Tokens         │────────┼─▶│ FastAPI Safety Engine (:8000) │  │
    │                                           │         │  - Deterministic Breaker (≤24ms) │  │
    │                                           │         │  - BYOK LLM Proxy Forwarder      │  │
    │                                           │         │  - RuntimeCollector & SSE Bus    │  │
    │                                           │         │  └──────────────┬────────────────┘  │
    │  * Proprietary Prompts & Source Code      │         │                 │                   │
    │  * Live Customer PII Data                 │         │  ┌──────────────▼────────────────┐  │
    │  * Direct LLM API Keys (BYOK)             │         │  │ PostgreSQL 15/16 + Redis 7    │  │
    │  * NEVER EXITS CUSTOMER VPC               │         │  │ /var/lib/postgresql/data      │  │
    └───────────────────────────────────────────┘         └─────────────────────────────────────┘
```

### Where Data & Agents are Stored

| Component | Location | What is Stored |
|---|---|---|
| **Agent Logic & Prompts** | Customer's Server / Worker | Python source files, prompts, vector database, LangGraph state graph. AgentFuse **never** hosts or executes raw agent logic. |
| **Customer Private PII** | Customer's Datacenter | **Never transmitted** to AgentFuse. Only SHA-256 cryptographic fingerprints are sent. |
| **AgentFuse PostgreSQL** | Control Plane Server (`agentfuse_db`) | `runs` (agent ID, framework, status, token counts, cost)<br>`events` (step transitions, SHA-256 state hashes)<br>`incidents` (stuck loop trips, budget exceedances)<br>`recovery_plans` (suggested corrective prompt modifications & audits)<br>`organizations`, `users`, `api_keys` (RBAC & multi-tenancy) |
| **PostgreSQL On-Disk Location** | Bare-Metal Disk | Native binaries: `/var/lib/postgresql/15/main` (or custom mount `/mnt/nvme/postgres_data`).<br>Docker: `/opt/agentfuse/data/postgres`. |

---

## Deployment Option 1: Docker Compose (Fastest)

### 1. Host Preparation
```bash
sudo mkdir -p /opt/agentfuse/data/postgres
sudo mkdir -p /opt/agentfuse/backups
sudo chown -R 999:999 /opt/agentfuse/data/postgres
sudo systemctl enable docker
```

### 2. Clone & Configure
```bash
git clone <your-repo-url> /opt/agentfuse/app
cd /opt/agentfuse/app

cp .env.production.example .env.production
nano .env.production
```

Key variables to set:
- `POSTGRES_PASSWORD`: Strong 32+ character random string.
- `DATABASE_URL`: `postgresql://agentfuse:${POSTGRES_PASSWORD}@postgres:5432/agentfuse_db`
- `REDIS_URL`: `redis://redis:6379/0`
- `AGENTFUSE_CORS_ORIGINS`: `https://yourdomain.com,https://app.yourdomain.com`
- `ALLOW_DEV_TOKENS`: `False`

### 3. Build Frontends
```bash
# Dashboard SPA
cd /opt/agentfuse/app/frontend
npm ci && npm run build

# Marketing Site
cd /opt/agentfuse/app/site
npm ci && npm run build
```

### 4. Launch Stack
```bash
cd /opt/agentfuse/app
docker compose -f docker-compose.prod.yml up -d --build
```
The database migrations execute automatically on API boot via `init_db()`.

---

## Deployment Option 2: Native Bare-Metal (Native PG Binaries + Systemd)

If you have native PostgreSQL and Redis binaries installed directly on your Linux host:

### 1. Initialize PostgreSQL Cluster
```bash
# Verify binaries
psql --version  # e.g., PostgreSQL 15.x / 16.x

# Switch to postgres user and create database + credentials
sudo -u postgres psql <<EOF
CREATE USER agentfuse WITH ENCRYPTED PASSWORD 'your_super_strong_password';
CREATE DATABASE agentfuse_db OWNER agentfuse;
GRANT ALL PRIVILEGES ON DATABASE agentfuse_db TO agentfuse;
EOF
```

Data files will reside in the native directory configured by your OS package manager:
- Ubuntu/Debian: `/var/lib/postgresql/15/main`
- RHEL/Rocky: `/var/lib/pgsql/15/data`

### 2. Set Up Python Environment & Apply Schema
```bash
cd /opt/agentfuse/app

# Create virtual environment
python3.11 -m venv .venv
source .venv/bin/activate
pip install -U pip setuptools wheel
pip install -r requirements.txt
pip install -e .

# Initialize schema and run migrations
python -c "from agentfuse.storage.postgres import init_db; init_db()"
```

### 3. Create Systemd Service for AgentFuse API
Create `/etc/systemd/system/agentfuse.service`:

```ini
[Unit]
Description=AgentFuse Autonomous AI Circuit Breaker Control Plane
After=network.target postgresql.service redis.service
Requires=postgresql.service redis.service

[Service]
Type=simple
User=www-data
Group=www-data
WorkingDirectory=/opt/agentfuse/app
EnvironmentFile=/opt/agentfuse/app/.env.production
ExecStart=/opt/agentfuse/app/.venv/bin/uvicorn agentfuse.server.api:app --host 127.0.0.1 --port 8000 --workers 4 --proxy-headers
Restart=always
RestartSec=3
LimitNOFILE=65535

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl daemon-reload
sudo systemctl enable --now agentfuse
sudo systemctl status agentfuse
```

---

## Reverse Proxy & TLS Setup (Caddy)

Caddy automatically provisions free SSL/TLS certificates via Let's Encrypt and handles HTTP/2 / HTTP/3.

### 1. Install Caddy
```bash
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update && sudo apt install caddy
```

### 2. Configure `/etc/caddy/Caddyfile`
Copy [`deploy/Caddyfile`](deploy/Caddyfile) to `/etc/caddy/Caddyfile`:

```caddyfile
yourdomain.com, www.yourdomain.com {
    # 1. AI Circuit Breaker Proxy Gateway (Zero-Code OpenAI/Anthropic Drop-in)
    handle /v1/* {
        reverse_proxy 127.0.0.1:8000
    }

    # 2. Control Plane REST API
    handle /api/* {
        reverse_proxy 127.0.0.1:8000
    }

    # 3. Health & Uptime Probe
    handle /health {
        reverse_proxy 127.0.0.1:8000
    }

    # 4. Real-Time Telemetry SSE Stream (Unbuffered)
    handle /api/stream* {
        reverse_proxy 127.0.0.1:8000 {
            flush_interval -1
        }
    }

    # 5. Dashboard SPA (/dashboard)
    handle /dashboard* {
        root * /opt/agentfuse/app/frontend/dist
        uri strip_prefix /dashboard
        try_files {path} /index.html
        file_server
    }

    # 6. Public Marketing Site (Catch-all)
    root * /opt/agentfuse/app/site/dist
    try_files {path} /index.html
    file_server

    encode gzip zstd
}
```

Reload Caddy:
```bash
sudo systemctl reload caddy
```

---

## Verifying the Production Deployment

Run these validation probes:

```bash
# 1. Check health
curl -I https://yourdomain.com/health
# Expected: HTTP/2 200 OK {"status": "ok"}

# 2. Check Gateway Circuit Breaker
curl -X POST https://yourdomain.com/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk-test" \
  -d '{"model": "gpt-4o", "messages": [{"role": "user", "content": "ping"}]}'

# 3. Check SSE Real-time Bus
curl -N https://yourdomain.com/api/stream
```

---

## Automated Database Backups

Create `/etc/cron.daily/agentfuse-backup`:

```bash
#!/bin/bash
BACKUP_DIR="/opt/agentfuse/backups"
TIMESTAMP=$(date +\%Y\%m\%d_\%H\%M\%S)
mkdir -p "$BACKUP_DIR"

# For native PG:
sudo -u postgres pg_dump agentfuse_db | gzip > "$BACKUP_DIR/db_$TIMESTAMP.sql.gz"

# Retain 30 days of archives
find "$BACKUP_DIR" -name "db_*.sql.gz" -mtime +30 -delete
```

Make it executable:
```bash
sudo chmod +x /etc/cron.daily/agentfuse-backup
```
