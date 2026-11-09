# Implementation Plan — Phases 4→7 (execute after usage reset)

Order (as directed): **Phase 4 remainder → compose dry-run → Phase 5 frontend →
Phase 6 → Phase 7.** Follow `docs/ARCHITECTURE.md` (ADRs). Baseline today: 129
tests green; Phases 1–3 + data-layer + idempotent ingestion done.

## Session resume checklist (do FIRST, every session)
1. Restart portable PG (it does NOT survive reboots): `bash /d/Ashit/_tools/pg-local.sh start`; verify `psql ... "SELECT 'up'"`.
2. `export PGCONNECT_TIMEOUT=8`. Use the venv `.venv`. Run tests **per-file** (Windows error-487 mitigation; shared_buffers=32MB already set).
3. Docker Desktop running (needed for Redis + compose).
4. Sanity: per-file sweep should be **129 passed**.

## Usage discipline (Pro plan)
Builders-first, lean, resumable. One phase at a time, phase-gate with raw evidence, update `_tools/SESSION-STATUS.md` as you go. Don't commit unless asked; never commit `pgdata/`/`pw.txt`.

---

## Phase 4 remainder

### 4a. Redis SSE fanout (§7.2) — FIRST
- **Provision Redis (no disk download):** `docker run -d --name cortexheal-redis -p 6379:6379 redis:7-alpine`. Add `REDIS_URL` (default `redis://localhost:6379/0`) to `config.py`, `.env`, `.env.production.example`. Add `redis` to pyproject deps.
- **Problem:** `/api/stream` fanout is in-process (per-client asyncio queues + global poller in `api.py`); breaks silently with >1 replica.
- **Build:** `cortexheal/server/sse_bus.py` — `publish(org_id, event)` → `redis.publish("cortexheal:sse:{org_id}", json)`; a per-process async subscriber task → routes to local client queues. **Org-scope the channel** (no cross-tenant SSE leak). Keep in-process path as fallback when `REDIS_URL` unset (single-replica dev).
- **Wire:** replace `broadcast_sse_event` internals to publish to the bus; `/api/stream` subscribes for the caller's `org_id` only.
- **Verify (raw evidence):** two uvicorn replicas + a client on each; event published via replica A reaches the client on replica B; a redis-backed integration test (skip if `REDIS_URL` unset). Negative: org_a client never receives org_b events.

### 4b. Per-org rate limiting (§7.4 noisy-neighbor)
- Redis token-bucket/sliding-window keyed by **org_id** (not IP). Middleware on ingestion + API. Use existing `API_RATE_LIMIT_PER_MIN`. Return **429 + Retry-After** (reuse existing pattern).
- **Verify:** exceed limit for org_a → 429; org_b unaffected (isolation test).

### 4c. Retention job (ADR-004)
- Function + CLI `cortexheal retention`: delete `events` older than `RETENTION_DAYS` (config) per org; **keep incidents + audit_events** (compliance). NOT partitioning yet (gated on volume).
- Schedule respecting laptop-off: logon/interval with `--if-due`, not fixed night slots.
- **Verify:** seed old+new events → run → old gone, incidents/audit retained (test).

### 4d. Lift `CORTEXHEAL_WORKERS=1` (§7.2)
- Detector state is Postgres-backed (verified). Prove stateless under multi-worker: 2 workers, concurrent runs, detection correct + no fragmentation. If proven, allow WORKERS>1 in docs/config; else document why 1 stays. **Verify:** multi-worker test run with raw output.

---

## Compose dry-run (Phase 2 leftover)
- Create **local** `.env.production` (gitignored, NOT committed) with dev-strength values (`POSTGRES_PASSWORD`, tokens, `DATABASE_URL`, `CORTEXHEAL_CORS_ORIGINS`). `config.py` must still refuse real prod with default tokens.
- `docker compose -f docker-compose.prod.yml build` → `up -d`; run migrations in-container (`init_db`/`cortexheal init`); verify `api`, `postgres` (bind-mount `/opt/cortexheal/data/postgres`), supervised `demo-runner`, `caddy` healthy; `curl /health` + `/readiness` through Caddy. Tear down. Fix build/env/healthcheck issues found. **Raw evidence:** `docker ps`, health curls.

---

## Phase 5 — Frontend rebuild (§9 locked visual language)
- Stack: React+TS+Vite+Tailwind+TanStack Query+native EventSource (`frontend/`). Dark ops-tool aesthetic (Sentry/Datadog/Linear restraint): dense bordered rows not cards, monospace for identifiers, semantic color only, one filled primary button/view, no gradients/glow/emoji, relative timestamps w/ ISO on hover.
- **5 screens only:** Fleet, Incident Queue (default), Incident Detail (evidence + plan + historical trust + exactly approve/reject), Runs+Timeline, Settings (tabbed: API keys, Team members, Webhooks). Resist adding more.
- **Login screen** using Phase-3 session auth (`/api/auth/login`, cookie). **Team tab** uses `/api/invitations` + users. Role-aware UI: VIEWER mutations pre-disabled w/ tooltip, no flash-of-enabled. Connection-status indicator always visible. SSE → targeted TanStack query invalidation (never global refetch). TS types for every response, no `any`. Explicit loading/empty/error states; empty = good news where apt.
- **No UI without a real endpoint** (flag "needs backend support" instead). "View Live Public Demo" prefills demo VIEWER key (not embedded in iframe src).
- **Verify:** `npm run build` clean; run against live API; screenshot each screen (use the browser pane); role-gating + isolation verified live.

## Phase 6 — Time-to-first-signal (§10)
- `pip install cortexheal` → `cortexheal init` → `cortexheal demo` → real incident visible, zero scripting. Polish first-5-min; real integration = 2–3 lines.
- Surface **provable** metrics backed by REAL aggregate endpoints (no fake charts): "$X runaway spend prevented" (from cost telemetry) and time-to-detection / time-to-pause (measured, **p50/p95/p99**, state exact boundary; never "sub-millisecond").
- **Verify:** fresh-install walkthrough with raw output; metrics from real pipeline runs.

## Phase 7 — Live demo + launch readiness
- Persistent always-on **synthetic-agent** fleet → real pipeline → real incidents, visible from marketing site, labeled **"Live demo — real CortexHeal instance, synthetic agents."** Honest labeling mandatory (agents simulated, pipeline 100% real; never imply real customer data).
- Supervised `demo-runner` container (`restart: always`). Deploy per §11 (Caddy auto-TLS, bind-mount PG, daily `pg_dump` + **tested restore**, `.env.production` refuses dev tokens, CORS allowlist).
- **Verify:** demo fleet runs unattended; marketing site shows live data; backup restore actually works.

---

## Cross-cutting (every phase)
- **Every new org-scoped endpoint → a permanent negative cross-org isolation test** (bug class found twice).
- Raw evidence for every claim; label DESIGN BOUNDARY vs BUG; no self-certification.
- New deps → `pyproject.toml`. Schema changes → NEW numbered yoyo migration (`0003_…`); never edit an applied one.
- Follow-up (small): wire per-user audit `actor_id = user.user_id` through approve/reject (currently email via username).
- Keep all work in `D:\Ashit`. Commit only when asked.
