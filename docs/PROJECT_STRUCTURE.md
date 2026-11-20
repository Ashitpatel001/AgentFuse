# AgentFuse Project Structure

AgentFuse is a deterministic Detection Engine and Self-Healing Platform for AI Agents, deployed as a multi-tenant SaaS product.

## Core Directories

- **`agentfuse/`**: The core library and application package.
  - **`adapters/`**: Framework integrations (LangGraph, AutoGen, CrewAI stub).
  - **`detection/`**: Deterministic runtime detection engine (stuck loops, budget overruns).
  - **`protection/`**: Safely pauses agent execution via `ProtectionController`.
  - **`recovery/`**: Incident analysis and structured recovery plan generation.
  - **`learning/`**: Failure-fingerprint → recovery-pattern mapping.
  - **`models/`**: Pydantic schemas (`events.py`, `run.py`, `auth.py`, `protection.py`).
  - **`runtime/`**: Event collector (bounded queue, background worker) and hashing.
  - **`server/`**: FastAPI control plane (`api.py`), SSE fan-out (`sse_bus.py`).
  - **`storage/`**: PostgreSQL pool + CRUD (`postgres.py`), auth store (`auth_store.py`).
  - **`alerting/`**: Webhook dispatch (async, non-blocking).
  - **`telemetry/`**: Prometheus metrics and operational counters.
  - **`cli/`**: Click CLI (`agentfuse start`, `create-org`, `retention`).
  - **`config.py`**: Pydantic Settings (env-driven).
  - **`client.py`**: Python SDK.
- **`migrations/`**: yoyo-migrations (plain Python). `0001_baseline_schema.py` (full schema), `0002_auth_tables.py` (multi-tenant auth).
- **`tests/`**: Unit, integration, adversarial, e2e, and performance tests (140 passing).
- **`frontend/`**: React 19 + TanStack Query + Tailwind 4 dashboard (dark-mode-first ops UI).
- **`site/`**: Marketing site (React + Vite, light theme).
- **`docs/`**: Architecture decisions, API contract, safety model, failure taxonomy.
- **`scripts/`**: `cron_demo_runner.py` (supervised demo data generator).
- **`examples/`**: Demo scenarios (stuck loop, budget overrun, multi-agent fleet).

## Configuration & Environment

- **`.env`**: Local environment (gitignored). Template values in `.env.example`.
- **`.env.production`**: Production secrets (gitignored).
- **`docker-compose.prod.yml`**: Production stack (postgres + redis + api + demo-runner).
- **`pyproject.toml`**: Package config. Core deps: psycopg2, yoyo-migrations, argon2-cffi, redis, httpx.

## Migration Tooling

**yoyo-migrations** (ADR-002). Alembic was removed — it could not autogenerate against raw psycopg2 (no ORM metadata), causing schema drift. `init_db()` applies yoyo migrations as the single source of truth. The container self-migrates on startup.

## Architecture Guidelines

- Deterministic safety decisions only — zero LLMs in the decision path.
- Database access flows through the config-driven connection pool in `agentfuse/storage/postgres.py`.
- All endpoints are org-scoped (tenant isolation enforced at the handler level).
- Two-plane auth: API keys (machine, X-API-Key header) + argon2id sessions (human, HttpOnly cookie) → same RBAC.
- Production credentials must never use dev-token defaults.
