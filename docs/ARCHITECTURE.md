# AgentFuse — Architecture Decision Record

Status: living document. Authored during the SaaS-hardening pass. Decisions here
are made at senior-engineer level and are meant to be cheap to revisit with
evidence, expensive to revisit on a whim.

---

## ADR-001 — Keep a relational database (PostgreSQL). Do not go NoSQL.

**Decision:** PostgreSQL remains the system of record. No document/KV store.

**Why (this is not incidental — relational *is* the product):**
- The product sells **deterministic, auditable, tenant-isolated** safety. That is
  an ACID + relational-integrity story, not an eventual-consistency one.
- **Audit trail is a compliance artifact** (§7.4). It must be append-only,
  consistent, and exportable. That is a transactional relational table.
- **Tenant isolation** is enforced through `org_id` + foreign keys, and every
  org-scoped read joins through `runs.org_id`. FKs and constraints are the
  enforcement mechanism; a document store pushes that into application code where
  the two isolation leaks already found would multiply.
- **The learning system is relational** — trust scoring joins `pattern_records`
  to `recovery_outcomes` and aggregates. This is a `GROUP BY`, not a map-reduce.
- **The detector's hot query** ("last N tool calls for this run") is a single
  indexed range scan — Postgres does this in well under a millisecond.

**The one caveat — `events` is the high-volume table.** It is append-heavy and
grows unboundedly. The answer is *not* a different database; it is Postgres done
well: time-based partitioning + retention (ADR-004). If write throughput ever
truly outgrows a single primary, the path is TimescaleDB (a Postgres extension)
or read replicas — still Postgres, no rewrite.

**Rejected:** MongoDB/Dynamo (loses ACID audit + FK isolation), a KV store
(loses joins for trust/isolation). Considered-and-deferred: TimescaleDB
(premature until events volume is measured).

---

## ADR-002 — Replace Alembic with yoyo-migrations (plain SQL).

**Decision:** Remove Alembic. Use **yoyo-migrations** with plain-SQL migrations.
`init_db()` becomes a thin "apply all pending migrations" call — a single source
of truth.

**Why Alembic was dead here:** Alembic is built for SQLAlchemy's ORM/metadata.
This codebase is **raw psycopg2 with no ORM**. There was no metadata for Alembic
to autogenerate from, so migrations rotted: the `initial_schema` migration is an
empty `pass`, and `org_id` was only ever added by hand-run `ALTER`s that never
reached any migration. The result: `alembic upgrade head` built a broken database
and a fresh deploy's `save_run()` failed on the first event. Using the wrong tool
*caused* the outage-class bug.

**Why yoyo (over the alternatives):**
- Python-native, `pip install`, no ORM required, plain `.sql` up/down files —
  matches a raw-SQL codebase exactly.
- No extra binary/toolchain (unlike dbmate/Atlas/Flyway), so it works in the
  same venv, offline, in CI, and on a bare-metal deploy with nothing extra.
- Common in Python startups for exactly this "Postgres without an ORM" shape.
- Considered: **dbmate** (great, but adds a Go binary), **Atlas** (declarative,
  excellent, but another binary + a bigger mental model than this needs today),
  **sqitch** (heavier). yoyo is the lowest-friction *recognized* tool for the
  stack. Revisit Atlas if we adopt declarative schema diffing later.

**Single source of truth:** `init_db()` now runs migrations (idempotent — yoyo
tracks applied migrations in `_yoyo_migration`). Tests, `agentfuse init`, and
production all take the identical path. The schema-drift bug class is designed out.

**Migration discipline:**
- One ordered, immutable `.sql` file per change under `migrations/`.
- Baseline (`0001`) is the full current schema and is idempotent
  (`IF NOT EXISTS`) so it adopts the existing hand-built databases without a
  destructive reset. Every migration after `0001` is a plain forward delta.
- Never edit an applied migration; add a new one.

---

## ADR-003 — Connection pool is config-driven and capacity-planned.

**Decision:** `init_pool()` sizes from config, not a hardcoded `max(100, …)`.
- `DB_POOL_MIN` (default 2), `DB_POOL_SIZE` (default 10), `DB_MAX_OVERFLOW`
  (default 10) → pool max = `DB_POOL_SIZE + DB_MAX_OVERFLOW`.
- **Capacity rule (must hold):** `replicas × (DB_POOL_SIZE + DB_MAX_OVERFLOW)`
  `< postgres max_connections − reserved`. This is written next to the setting so
  the §5-item-10 pool bug (pool wanting more backends than the server allows)
  cannot recur silently.

**Why:** the old floor of 100 min-10 connections per process both violated the
capacity rule under multi-worker and, on Windows dev boxes, amplified the
`error 487` backend-spawn storm. A small `min` + explicit `max` is safer and
faster to warm.

---

## ADR-004 — `events` scaling: index now, partition when volume demands it.

**Now (implemented):** indexes that cover every hot path, each verified with
`EXPLAIN ANALYZE`:
- `events(run_id, sequence_number DESC)` — the detector's per-event query.
- `runs(org_id)` — fleet/runs list and the org-scope join source.
- `incidents(run_id)` — incident→run join, timeline, and dedup.
- existing `pattern_records(org_id, fingerprint)` unique — trust lookups.

**Later (designed, gated on measured volume — do NOT build prematurely):**
- **Partition `events` by time** (monthly `RANGE (timestamp)`); retention becomes
  an O(1) `DROP PARTITION` instead of a mass `DELETE`. Requires the PK/unique to
  include the partition key, so it is a deliberate migration, not a baseline
  change.
- **Retention policy per org:** raw `events` aged out (e.g. 90d) or rolled up;
  `incidents` + `audit_events` retained far longer (compliance). Implemented
  first as a scheduled cleanup, upgraded to partition-drop once partitioned.
- Trigger threshold to document: introduce partitioning when a single month of
  `events` crosses ~50–100M rows or the retention `DELETE` can't keep up.

This mirrors the brief's ingestion-durability guidance: don't jump to the heavy
mechanism until throughput actually demands it.

---

## ADR-005 — Two-plane authentication for SaaS (Phase 3).

The product is launching as a hosted SaaS, so human auth is now an adoption
blocker, not a nicety. Standard pattern (Sentry/Datadog/Stripe): separate machine
auth from human auth. Both map onto the **existing** VIEWER/OPERATOR/ADMIN RBAC —
we do not build a parallel permission system.

**Plane 1 — Machine auth (exists, keep):** `X-API-Key`, per-org, hashed at rest,
prefix-only display, revocable, role-bound. Additions: explicit rotation +
optional expiry + `last_used_at`.

**Plane 2 — Human auth (build):**
- **Data model:** `organizations (org_id, name, …)`, `users (user_id, org_id,
  email UNIQUE, password_hash, role, status, created_at, …)`, `sessions
  (session_id, user_id, created_at, expires_at, revoked_at)`, `invitations
  (invite_id, org_id, email, role, token_hash, expires_at, accepted_at)`. `org_id`
  is retrofitted as a real FK target; existing tables already scope by it.
- **Passwords:** hashed with **argon2id** (via `argon2-cffi`) — no hand-rolled
  crypto. Never stored or logged in plaintext.
- **Sessions:** server-side opaque session tokens (random 256-bit, stored
  hashed), delivered as an `HttpOnly`, `Secure`, `SameSite=Lax` cookie — **not**
  a long-lived API key pasted into a browser, and not a self-verifying JWT we
  can't revoke. Short TTL + sliding refresh; revocation = delete the row (instant
  logout / offboarding, which JWT can't do cleanly).
- **Authorization:** dashboard requests authenticate via session → resolve
  `user → org_id, role` → same `require_viewer/operator/admin` dependencies the
  API already enforces. One code path.
- **Invite flow:** an ADMIN invites by email → single-use, expiring, hashed
  token → invitee sets a password → user created in that org. No public
  self-service signup yet (deferred growth feature; the model supports adding it
  trivially).
- **Audit attribution:** every audit event records the **acting human user**
  (`actor_id = user_id`), so "who approved this resume at 3am?" is answerable.
  This is the payoff of building auth properly.
- **Enterprise (design-for, build-on-demand):** SSO/SAML + SCIM slot in behind
  the `users`/`sessions` model without a rewrite. Not built speculatively.

**Why server-side sessions over JWT:** revocability and per-user offboarding are
security-review table stakes for B2B; opaque server sessions give instant
revocation and keep no secret material in the browser. JWT's stateless win
doesn't matter at this scale and costs us revocation.

---

## Build order (phase-gated, evidence at each gate)
1. **Data layer** (ADR-002/003/004): yoyo migrations, baseline schema, pool,
   indexes, `EXPLAIN ANALYZE` — suite stays green. ← in progress
2. **Phase 3 auth** (ADR-005): orgs/users/sessions/invites, argon2, session
   middleware, per-user audit, negative isolation tests for every new endpoint.
3. **Phase 4** scale/security: SDK buffering + idempotent ingestion, Redis SSE
   fanout, per-org rate limiting, retention job, lift `WORKERS=1` if proven.
4. **Phase 5** frontend, **Phase 6** time-to-first-signal, **Phase 7** live demo.