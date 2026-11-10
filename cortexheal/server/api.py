from fastapi import FastAPI, HTTPException, Depends, Security, Request, Query, Response, Cookie
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.security import APIKeyHeader
from sse_starlette.sse import EventSourceResponse
import asyncio
import json
import csv
import io
from typing import List, Optional
from datetime import datetime, timezone
from contextlib import asynccontextmanager

from cortexheal.storage.postgres import (
    get_patterns_by_org,
    get_incidents, get_incident, get_all_runs, get_run,
    get_events_for_run, get_audit_events_for_run, get_recovery_plan_by_incident,
    save_api_key, get_api_key_by_hash, get_api_keys_by_org, revoke_api_key, update_api_key_last_used,
    save_webhook_config, get_webhook_configs_by_org, delete_webhook_config, get_notifications_by_org,
    get_audit_export_records, get_metrics_summary
)
from cortexheal.models.auth import (
    ApiKey, ApiKeyCreateRequest, ApiKeyResponse, ApiKeyCreatedResponse,
    hash_key, generate_raw_key,
    LoginRequest, InviteRequest, AcceptInviteRequest, AuthUserResponse,
    UserAccount, hash_password, verify_password,
    SESSION_COOKIE_NAME, SESSION_TTL_HOURS,
)
from cortexheal.storage import auth_store
from cortexheal.models.alerting import WebhookConfig, WebhookCreateRequest, NotificationRecord
from cortexheal.alerting.dispatcher import alert_dispatcher
from cortexheal.protection.controller import ProtectionController
from cortexheal.recovery.engine import RecoveryEngine
from cortexheal.learning.trust import TrustEngine
from cortexheal.recovery.executor import RecoveryExecutor
from cortexheal.config import settings
from cortexheal.logger import setup_logging
import os
import time
from prometheus_client import make_asgi_app
from cortexheal.telemetry import metrics

logger = setup_logging()

# --- SERVER-SENT EVENTS (SSE) ---
# Org-scoped fan-out via sse_bus (Redis-backed when REDIS_URL is set, in-process
# otherwise). Events are delivered ONLY to the owning org's dashboards — they
# never cross a tenant boundary.
from cortexheal.server import sse_bus


def broadcast_sse_event(event_type: str, data: dict, run_id: str = None, org_id: str = None):
    """Publish a typed SSE event to a single org's connected dashboards."""
    sse_bus.publish(org_id, event_type, data, run_id=run_id)

async def poll_db_for_updates():
    """
    Background poller that detects new incidents and run status changes.
    Emits typed SSE events: incident_created, run_status_changed.
    Acts as a catch-all for changes not already broadcast by API endpoints.
    """
    try:
        last_incidents = {i.incident_id: i for i in get_incidents()}
        last_runs = {r.run_id: r.status for r in get_all_runs()}
    except Exception:
        last_incidents = {}
        last_runs = {}
        
    while True:
        await asyncio.sleep(2)
        if not SSE_CLIENTS:
            continue
        try:
            current_incidents_list = get_incidents()
            current_runs_list = get_all_runs()
            
            current_incidents = {i.incident_id: i for i in current_incidents_list}
            current_runs = {r.run_id: r.status for r in current_runs_list}
            # Map run_id -> org_id so every SSE event is fanned out to the
            # correct tenant only (no cross-org leak).
            run_org = {r.run_id: r.org_id for r in current_runs_list}

            # Detect new incidents
            for iid, incident in current_incidents.items():
                if iid not in last_incidents:
                    broadcast_sse_event("incident_created", {
                        "incident_id": iid,
                        "run_id": incident.run_id,
                        "failure_type": incident.failure_type,
                        "severity": incident.severity,
                    }, run_id=incident.run_id, org_id=run_org.get(incident.run_id))

            # Detect run status changes
            for rid, status in current_runs.items():
                old_status = last_runs.get(rid)
                if old_status is not None and old_status != status:
                    broadcast_sse_event("run_status_changed", {
                        "run_id": rid,
                        "old_status": old_status,
                        "new_status": status,
                    }, run_id=rid, org_id=run_org.get(rid))
            
            last_incidents = current_incidents
            last_runs = current_runs
        except Exception as e:
            logger.error(f"SSE DB Polling error: {e}")

async def poll_escalations():
    """Background worker that audits unacknowledged incidents and fires escalations."""
    while True:
        try:
            await asyncio.sleep(15.0)
            await asyncio.to_thread(alert_dispatcher.check_and_dispatch_escalations)
        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.error(f"Escalation poller error: {e}")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: apply DB migrations so a fresh deployment is self-provisioning
    # (idempotent + advisory-locked, so concurrent workers/replicas are safe).
    try:
        from cortexheal.storage.postgres import init_db
        await asyncio.to_thread(init_db)
        logger.info("Startup: database migrations applied")
    except Exception as e:
        logger.error(f"Startup init_db failed: {e}")
    await sse_bus.start()  # capture loop; start Redis subscriber if configured
    polling_task = asyncio.create_task(poll_db_for_updates())
    escalation_task = asyncio.create_task(poll_escalations())
    yield
    # Shutdown
    polling_task.cancel()
    escalation_task.cancel()
    await sse_bus.stop()

app = FastAPI(title="CortexHeal Control Plane", lifespan=lifespan)

# --- PROMETHEUS METRICS ---
metrics_app = make_asgi_app()
app.mount("/metrics", metrics_app)

# --- RATE LIMITING (In-Memory for V1) ---
RATE_LIMIT_STORE = {}

_rl_redis = None


def _rl_get_redis():
    """Lazy sync Redis client for cross-replica rate limiting; None if unset."""
    global _rl_redis
    if not sse_bus.redis_enabled():
        return None
    if _rl_redis is None:
        import redis as _sync_redis
        _rl_redis = _sync_redis.from_url(settings.REDIS_URL)
    return _rl_redis


def _rl_bucket(request: Request) -> str:
    """Rate-limit bucket: per-ORG for authenticated callers (noisy-neighbor
    isolation, §7.4) so one tenant cannot degrade service for others; per-IP for
    unauthenticated requests (coarse DoS guard)."""
    api_key = request.headers.get(API_KEY_NAME)
    if api_key:
        try:
            k = get_api_key_by_hash(hash_key(api_key))
            if k:
                return f"org:{k.org_id}"
        except Exception:
            pass
        if settings.ALLOW_DEV_TOKENS and (
            api_key in ADMIN_TOKENS or api_key in OPERATOR_TOKENS or api_key in VIEWER_TOKENS
        ):
            return "org:default_org"
    token = request.cookies.get(SESSION_COOKIE_NAME)
    if token:
        try:
            row = auth_store.resolve_session(token)
            if row:
                return f"org:{row['org_id']}"
        except Exception:
            pass
    ip = request.client.host if request.client else "unknown"
    return f"ip:{ip}"


async def rate_limit(request: Request):
    bucket = _rl_bucket(request)
    limit = settings.API_RATE_LIMIT_PER_MIN
    now = time.time()

    r = _rl_get_redis()
    if r is not None:
        # Fixed-window counter in Redis — correct across horizontally-scaled replicas.
        window = int(now // 60)
        key = f"cortexheal:rl:{bucket}:{window}"
        try:
            count = r.incr(key)
            if count == 1:
                r.expire(key, 60)
            if count > limit:
                raise HTTPException(status_code=429, detail="Too Many Requests",
                                    headers={"Retry-After": str(max(1, 60 - int(now % 60)))})
            return
        except HTTPException:
            raise
        except Exception as e:
            logger.warning(f"rate-limit redis error, falling back to in-memory: {e}")

    # In-memory sliding window (single replica / dev).
    times = [t for t in RATE_LIMIT_STORE.get(bucket, []) if now - t < 60]
    if len(times) >= limit:
        retry_after = max(1, int(60 - (now - times[0])))
        RATE_LIMIT_STORE[bucket] = times
        raise HTTPException(status_code=429, detail="Too Many Requests",
                            headers={"Retry-After": str(retry_after)})
    times.append(now)
    RATE_LIMIT_STORE[bucket] = times

app.router.dependencies.append(Depends(rate_limit))

# --- AUTHENTICATION & AUTHORIZATION ---
API_KEY_NAME = "X-API-Key"
# auto_error=False: a request may authenticate via the session cookie instead of
# the API key header, so a missing header must not short-circuit to 403 here.
api_key_header = APIKeyHeader(name=API_KEY_NAME, auto_error=False)

# Simple V1 Token-based Auth configured via ENV (used only if ALLOW_DEV_TOKENS=True)
VIEWER_TOKENS = settings.get_viewer_tokens()
OPERATOR_TOKENS = settings.get_operator_tokens()
ADMIN_TOKENS = settings.get_admin_tokens()

class User:
    def __init__(self, username: str, role: str, org_id: str = "default_org",
                 key_id: str = None, user_id: str = None, auth: str = "api_key"):
        self.username = username
        self.role = role
        self.org_id = org_id
        self.key_id = key_id
        # Human user id when authenticated via a dashboard session; None for a
        # machine (API key). This is what lets audit events name the acting human.
        self.user_id = user_id
        self.auth = auth  # "api_key" | "session"

def get_current_user(
    api_key: str = Security(api_key_header),
    session_token: str = Cookie(default=None, alias=SESSION_COOKIE_NAME),
):
    """
    Two-plane auth (ADR-005). Machine plane: X-API-Key. Human plane: session
    cookie. Both resolve to the same User + RBAC role — one authorization path.
    """
    # --- Plane 1: machine auth (API key), when presented ---
    if api_key:
        try:
            db_key = get_api_key_by_hash(hash_key(api_key))
            if db_key:
                if db_key.revoked_at is not None:
                    raise HTTPException(status_code=403, detail="API Key is revoked")
                update_api_key_last_used(db_key.key_id)
                return User(username=db_key.name, role=db_key.role,
                            org_id=db_key.org_id, key_id=db_key.key_id, auth="api_key")
        except HTTPException:
            raise
        except Exception as e:
            logger.warning(f"Error querying API key from DB: {e}")

        if settings.ALLOW_DEV_TOKENS:
            if api_key in ADMIN_TOKENS:
                return User(username="admin_user", role="ADMIN", org_id="default_org")
            elif api_key in OPERATOR_TOKENS:
                return User(username="operator_user", role="OPERATOR", org_id="default_org")
            elif api_key in VIEWER_TOKENS:
                return User(username="viewer_user", role="VIEWER", org_id="default_org")

        raise HTTPException(status_code=403, detail="Invalid API Key")

    # --- Plane 2: human auth (dashboard session cookie) ---
    if session_token:
        row = auth_store.resolve_session(session_token)
        if row:
            return User(username=row["email"], role=row["role"], org_id=row["org_id"],
                        user_id=row["user_id"], auth="session")
        raise HTTPException(status_code=401, detail="Invalid or expired session")

    # No credentials on either plane -> 401 Unauthorized (matches the framework's
    # prior auto_error behavior and correct HTTP semantics for "not authenticated").
    raise HTTPException(status_code=401, detail="Not authenticated")

def require_operator(user: User = Depends(get_current_user)):
    if user.role not in ["OPERATOR", "ADMIN"]:
        raise HTTPException(status_code=403, detail="Requires OPERATOR or ADMIN role")
    return user

def require_admin(user: User = Depends(get_current_user)):
    if user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Requires ADMIN role")
    return user

# Hardened CORS for Production
# Reads comma-separated origins from CORTEXHEAL_CORS_ORIGINS.
# Falls back to localhost:3000 ONLY in non-production environments.
_cors_raw = os.environ.get("CORTEXHEAL_CORS_ORIGINS", "")
if _cors_raw:
    _cors_origins = [o.strip() for o in _cors_raw.split(",") if o.strip()]
elif settings.ENVIRONMENT != "production":
    _cors_origins = ["http://localhost:3000"]
else:
    _cors_origins = []  # production with no explicit origins = deny all cross-origin

# Never allow wildcard "*" — strip it if someone accidentally sets it
_cors_origins = [o for o in _cors_origins if o != "*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,  # session cookie auth for the dashboard (ADR-005)
    allow_methods=["GET", "POST", "DELETE"],
    allow_headers=["X-API-Key", "Content-Type"],
)

# ==========================================================================
# HUMAN AUTH (Plane 2) — sessions, login/logout, invitations (ADR-005).
# Machine auth (X-API-Key) is unchanged; both planes share the same RBAC.
# ==========================================================================
_COOKIE_SECURE = settings.ENVIRONMENT == "production"


def _set_session_cookie(response: Response, raw_token: str):
    response.set_cookie(
        key=SESSION_COOKIE_NAME, value=raw_token,
        httponly=True, secure=_COOKIE_SECURE, samesite="lax",
        max_age=SESSION_TTL_HOURS * 3600, path="/",
    )


@app.post("/api/auth/login", response_model=AuthUserResponse)
def api_login(payload: LoginRequest, response: Response):
    user = auth_store.get_user_by_email(payload.email)
    # Uniform error whether the email is unknown, disabled, or the password is
    # wrong — do not leak which accounts exist.
    if (not user or user.status != "ACTIVE"
            or not verify_password(user.password_hash, payload.password)):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    raw = auth_store.create_session_for_user(user.user_id)
    auth_store.update_user_last_login(user.user_id)
    _set_session_cookie(response, raw)
    return AuthUserResponse(user_id=user.user_id, email=user.email,
                            org_id=user.org_id, role=user.role, auth="session")


@app.post("/api/auth/logout")
def api_logout(response: Response,
               session_token: str = Cookie(default=None, alias=SESSION_COOKIE_NAME)):
    if session_token:
        auth_store.revoke_session(session_token)
    response.delete_cookie(SESSION_COOKIE_NAME, path="/")
    return {"status": "success"}


@app.get("/api/auth/me", response_model=AuthUserResponse)
def api_auth_me(user: User = Depends(get_current_user)):
    return AuthUserResponse(user_id=user.user_id or "", email=user.username,
                            org_id=user.org_id, role=user.role, auth=user.auth)


@app.get("/api/metrics/summary")
def api_metrics_summary(user: User = Depends(get_current_user)):
    """Org-scoped, provable value-prop metrics (detection latency, cost on
    flagged runs, counts). All numbers derived from real data."""
    return get_metrics_summary(user.org_id)


@app.get("/api/users")
def api_list_users(user: User = Depends(require_admin)):
    """List members of the caller's org (Team screen). org_id from the caller,
    never the request — no cross-org enumeration."""
    return auth_store.list_users_by_org(user.org_id)


@app.post("/api/invitations")
def api_create_invitation(payload: InviteRequest, user: User = Depends(require_admin)):
    """An ADMIN invites a teammate into their OWN org (org_id is taken from the
    caller, never the request body — no cross-org invitation is possible)."""
    if auth_store.get_user_by_email(payload.email):
        raise HTTPException(status_code=409, detail="A user with that email already exists")
    raw = auth_store.create_invitation(user.org_id, payload.email, payload.role,
                                       invited_by=user.user_id)
    # Emailed in production; returned here so the flow is usable before email
    # delivery exists. Never logged.
    return {"status": "success", "email": payload.email,
            "role": payload.role, "invite_token": raw}


@app.post("/api/auth/accept-invitation", response_model=AuthUserResponse)
def api_accept_invitation(payload: AcceptInviteRequest, response: Response):
    inv = auth_store.get_pending_invitation(payload.token)
    if not inv:
        raise HTTPException(status_code=400, detail="Invalid or expired invitation")
    if auth_store.get_user_by_email(inv.email):
        raise HTTPException(status_code=409, detail="A user with that email already exists")
    # Claim the single-use invite atomically before creating the account.
    if not auth_store.mark_invitation_accepted(inv.invite_id):
        raise HTTPException(status_code=400, detail="Invitation already used")
    user = UserAccount(org_id=inv.org_id, email=inv.email,
                       password_hash=hash_password(payload.password), role=inv.role)
    auth_store.create_user_account(user)
    raw = auth_store.create_session_for_user(user.user_id)
    _set_session_cookie(response, raw)
    return AuthUserResponse(user_id=user.user_id, email=user.email,
                            org_id=user.org_id, role=user.role, auth="session")

protection_controller = ProtectionController()
recovery_engine = RecoveryEngine()
recovery_executor = RecoveryExecutor()

# --- API ENDPOINTS ---

@app.get("/api/whoami")
def api_whoami(user: User = Depends(get_current_user)):
    """Return the currently authenticated user's role and organization."""
    return {"role": user.role, "org_id": user.org_id}

@app.post("/api/keys", response_model=ApiKeyCreatedResponse)
def api_create_key(
    payload: ApiKeyCreateRequest,
    user: User = Depends(require_admin)
):
    """Generate a new API key for caller's organization. ADMIN only."""
    raw_key = generate_raw_key(payload.role)
    k_hash = hash_key(raw_key)
    prefix = raw_key[:16] + "..."
    
    new_key = ApiKey(
        key_hash=k_hash,
        key_prefix=prefix,
        name=payload.name,
        org_id=user.org_id,  # Strictly bounded to caller's org_id
        role=payload.role
    )
    saved = save_api_key(new_key)
    return ApiKeyCreatedResponse(
        key_id=saved.key_id,
        key_prefix=saved.key_prefix,
        name=saved.name,
        org_id=saved.org_id,
        role=saved.role,
        created_at=saved.created_at,
        last_used_at=saved.last_used_at,
        revoked_at=saved.revoked_at,
        raw_key=raw_key
    )

@app.get("/api/keys", response_model=List[ApiKeyResponse])
def api_list_keys(
    user: User = Depends(require_admin)
):
    """List all API keys for caller's organization. ADMIN only."""
    keys = get_api_keys_by_org(user.org_id)
    return [
        ApiKeyResponse(
            key_id=k.key_id,
            key_prefix=k.key_prefix,
            name=k.name,
            org_id=k.org_id,
            role=k.role,
            created_at=k.created_at,
            last_used_at=k.last_used_at,
            revoked_at=k.revoked_at
        ) for k in keys
    ]

@app.post("/api/keys/{key_id}/revoke")
def api_revoke_key(
    key_id: str,
    user: User = Depends(require_admin)
):
    """Revoke an API key within caller's organization. ADMIN only."""
    revoked = revoke_api_key(key_id, user.org_id)
    if not revoked:
        raise HTTPException(status_code=404, detail="API key not found")
    return {"status": "success", "message": f"API key {key_id} revoked"}

# --- OUTBOUND WEBHOOKS & ALERTING ---

@app.post("/api/webhooks", response_model=WebhookConfig)
def api_create_webhook(
    payload: WebhookCreateRequest,
    user: User = Depends(require_admin)
):
    """Register a new outbound alerting webhook for caller's organization. ADMIN only."""
    config = WebhookConfig(
        org_id=user.org_id,
        target_type=payload.target_type,
        url=str(payload.url),
        secret_token=payload.secret_token,
        min_severity=payload.min_severity,
        escalation_timeout_minutes=payload.escalation_timeout_minutes
    )
    return save_webhook_config(config)

@app.get("/api/webhooks", response_model=List[WebhookConfig])
def api_list_webhooks(
    user: User = Depends(require_admin)
):
    """List all registered webhooks for caller's organization. ADMIN only."""
    return get_webhook_configs_by_org(user.org_id)

@app.delete("/api/webhooks/{webhook_id}")
def api_delete_webhook(
    webhook_id: str,
    user: User = Depends(require_admin)
):
    """Delete a registered webhook for caller's organization. ADMIN only."""
    deleted = delete_webhook_config(webhook_id, user.org_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Webhook configuration not found")
    return {"status": "success", "message": f"Webhook {webhook_id} deleted"}

@app.get("/api/notifications", response_model=List[NotificationRecord])
def api_list_notifications(
    limit: int = Query(50, ge=1, le=200),
    user: User = Depends(require_operator)
):
    """List recent notification audit logs for caller's organization. OPERATOR/ADMIN."""
    return get_notifications_by_org(user.org_id, limit=limit)

# --- AUDIT & COMPLIANCE EXPORT ---

@app.get("/api/audit/export")
def api_audit_export(
    format: str = Query("json", pattern="^(json|csv)$"),
    from_date: Optional[str] = Query(None),
    to_date: Optional[str] = Query(None),
    agent_id: Optional[str] = Query(None),
    failure_type: Optional[str] = Query(None),
    user: User = Depends(require_operator)
):
    """
    Compliance & Safety Audit Export.
    Returns complete deterministic incident, recovery, and audit verification history.
    Accessible to OPERATOR and ADMIN.
    """
    records = get_audit_export_records(
        org_id=user.org_id,
        from_date=from_date,
        to_date=to_date,
        agent_id=agent_id,
        failure_type=failure_type
    )
    
    if format == "json":
        return {
            "total_records": len(records),
            "exported_at": datetime.now(timezone.utc).isoformat(),
            "organization_id": user.org_id,
            "filters": {
                "from_date": from_date,
                "to_date": to_date,
                "agent_id": agent_id,
                "failure_type": failure_type
            },
            "records": records
        }

    # CSV Format
    output = io.StringIO()
    if not records:
        output.write("No audit records found for the specified filters\n")
    else:
        fieldnames = [
            "incident_id", "triggered_at", "run_id", "agent_id", "framework",
            "model", "provider", "run_status", "protection_mode",
            "failure_type", "severity", "incident_status", "detector", "detector_version",
            "observed_value", "threshold", "description", "evidence",
            "plan_id", "recovery_diagnosis", "proposed_actions", "plan_status", "verification_status",
            "audit_event_id", "audit_timestamp", "audit_action", "audit_actor_type",
            "audit_actor_id", "audit_result", "audit_reason", "audit_policy_version"
        ]
        writer = csv.DictWriter(output, fieldnames=fieldnames, extrasaction="ignore")
        writer.writeheader()
        for r in records:
            row_copy = dict(r)
            if isinstance(row_copy.get("evidence"), (dict, list)):
                row_copy["evidence"] = json.dumps(row_copy["evidence"])
            if isinstance(row_copy.get("proposed_actions"), (dict, list)):
                row_copy["proposed_actions"] = json.dumps(row_copy["proposed_actions"])
            writer.writerow(row_copy)

    date_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    filename = f"cortexheal_audit_export_{date_str}.csv"
    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"'
        }
    )


@app.get("/api/incidents")
def api_get_incidents(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    user: User = Depends(get_current_user)
):
    incidents = get_incidents(org_id=user.org_id)
    paginated = incidents[skip : skip + limit]
    
    # Enrich with run status
    result = []
    for inc in paginated:
        run = get_run(inc.run_id)
        inc_dict = inc.model_dump()
        inc_dict['run_status'] = run.status if run else 'unknown'
        inc_dict['protection_mode'] = run.protection_mode if run else 'UNKNOWN'
        result.append(inc_dict)
    
    return {
        "data": result,
        "total": len(incidents),
        "skip": skip,
        "limit": limit
    }

@app.get("/api/incidents/{incident_id}")
def api_get_incident(incident_id: str, user: User = Depends(get_current_user)):
    inc = get_incident(incident_id)
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")
    run = get_run(inc.run_id)
    # Tenant isolation: an incident belongs to the org of its run. 404 (not 403)
    # so another tenant cannot even confirm the incident exists.
    if not run or run.org_id != user.org_id:
        raise HTTPException(status_code=404, detail="Incident not found")
    inc_dict = inc.model_dump()
    inc_dict['run_status'] = run.status if run else 'unknown'
    inc_dict['protection_mode'] = run.protection_mode if run else 'UNKNOWN'
    return inc_dict

@app.get("/api/runs")
def api_get_runs(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    user: User = Depends(get_current_user)
):
    runs = get_all_runs(org_id=user.org_id)
    return {
        "data": runs[skip : skip + limit],
        "total": len(runs),
        "skip": skip,
        "limit": limit
    }

@app.get("/api/fleet")
def api_get_fleet(user: User = Depends(get_current_user)):
    """Return distinct active/recent agents and their latest run."""
    from cortexheal.storage.postgres import get_connection
    from psycopg2.extras import RealDictCursor
    
    with get_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                WITH RankedRuns AS (
                    SELECT 
                        r.run_id, r.agent_id, r.status, r.start_time, r.end_time, r.protection_mode, r.org_id,
                        ROW_NUMBER() OVER(PARTITION BY r.agent_id ORDER BY COALESCE(r.end_time, r.start_time) DESC) as rn
                    FROM runs r
                    WHERE r.org_id = %s
                )
                SELECT 
                    rr.run_id, rr.agent_id, rr.status, rr.start_time, rr.end_time, rr.protection_mode,
                    (SELECT COUNT(*) FROM events e WHERE e.run_id = rr.run_id) as event_count
                FROM RankedRuns rr
                WHERE rr.rn = 1
                ORDER BY COALESCE(rr.end_time, rr.start_time) DESC
                LIMIT 100
            """, (user.org_id,))
            fleet_data = cur.fetchall()
            for r in fleet_data:
                r['start_time'] = r['start_time'].isoformat() if r['start_time'] else None
                r['end_time'] = r['end_time'].isoformat() if r['end_time'] else None
            return fleet_data


@app.get("/api/runs/{run_id}")
def api_get_run(run_id: str, user: User = Depends(get_current_user)):
    run = get_run(run_id)
    # Tenant isolation: 404 (not 403) on cross-org access to avoid enumeration.
    if not run or run.org_id != user.org_id:
        raise HTTPException(status_code=404, detail="Run not found")
    return run

@app.get("/api/runs/{run_id}/timeline")
def api_get_run_timeline(run_id: str, user: User = Depends(get_current_user)):
    run = get_run(run_id)
    # Tenant isolation: 404 (not 403) on cross-org access to avoid enumeration.
    if not run or run.org_id != user.org_id:
        raise HTTPException(status_code=404, detail="Run not found")

    events = get_events_for_run(run_id)
    audits = get_audit_events_for_run(run_id)
    incidents = [i for i in get_incidents() if i.run_id == run_id]
    
    # Merge into a single chronological timeline
    timeline = []
    
    for e in events:
        timeline.append({
            "type": "event",
            "timestamp": e.timestamp,
            "data": e.model_dump()
        })
        
    for a in audits:
        timeline.append({
            "type": "audit",
            "timestamp": a.timestamp,
            "data": a.model_dump()
        })
        
    for i in incidents:
        timeline.append({
            "type": "incident",
            "timestamp": i.triggered_at,
            "data": i.model_dump()
        })
        
    # Sort by timestamp
    timeline.sort(key=lambda x: x["timestamp"])
    return timeline

@app.post("/api/runs/{run_id}/resume")
def api_resume_run(run_id: str, user: User = Depends(require_operator)):
    run = get_run(run_id)
    # Tenant isolation: a cross-org caller must not resume another org's run.
    if not run or run.org_id != user.org_id:
        raise HTTPException(status_code=404, detail="Run not found")

    if run.protection_mode == 'DISABLED':
        raise HTTPException(status_code=400, detail="Cannot resume a run that is PROTECTION_DISABLED")

    try:
        protection_controller.resume(run_id, actor_id=user.username, reason="Resumed via Control Plane")
        broadcast_sse_event("run_resumed", {
            "run_id": run_id,
            "actor": user.username,
        }, run_id=run_id, org_id=user.org_id)
        return {"status": "success", "message": f"Resume requested for run {run_id}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
def api_health():
    return {"status": "HEALTHY"}

@app.get("/readiness")
def api_readiness():
    try:
        from cortexheal.storage.postgres import get_connection
        # Fast DB check
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT 1")
        
        # Fast telemetry check
        from cortexheal.runtime.collector import collector
        if not collector._worker_thread or not collector._worker_thread.is_alive():
            return {"status": "DEGRADED", "reason": "Background telemetry worker is dead"}
            
        return {"status": "HEALTHY"}
    except Exception as e:
        return {"status": "NOT_READY", "reason": f"DB connection failed: {e}"}

@app.get("/api/incidents/{incident_id}/plan")
def api_get_recovery_plan(incident_id: str, user: User = Depends(get_current_user)):
    # Autogenerate or retrieve
    plan = get_recovery_plan_by_incident(incident_id)
    incident = get_incident(incident_id)
    # Tenant isolation: the incident (and thus its plan) must belong to the
    # caller's org, resolved via the incident's run. 404 to avoid enumeration.
    inc_run = get_run(incident.run_id) if incident else None
    if not incident or not inc_run or inc_run.org_id != user.org_id:
        raise HTTPException(status_code=404, detail="Incident not found")
    if not plan:
        plan = recovery_engine.generate_plan(incident)
        
    plan_dict = plan.model_dump()
    if incident:
        try:
            from cortexheal.storage.postgres import get_events_for_run
            from cortexheal.learning.pattern import PatternEngine
            from cortexheal.learning.trust import TrustEngine
            
            events = get_events_for_run(incident.run_id)
            incident_run = get_run(incident.run_id)
            trigger_event = next((e for e in events if e.event_id == incident.trigger_event_id), events[-1] if events else None)
            if trigger_event:
                pattern = PatternEngine().get_or_create_pattern(incident, trigger_event, incident_run.org_id)
                evidence = TrustEngine().calculate_trust(pattern.pattern_id)
                if evidence.occurrences > 0:
                    actions_summary = []
                    for action, stats in evidence.actions.items():
                        actions_summary.append({
                            "action": action,
                            "attempted": stats.attempted,
                            "verified_success": stats.verified_success,
                            "verified_failure": stats.verified_failure,
                            "success_rate": stats.success_rate,
                            "trust_score": stats.trust_score,
                            "risk_level": stats.risk_level
                        })
                    plan_dict["pattern_trust"] = {
                        "occurrences": evidence.occurrences,
                        "actions": actions_summary
                    }
        except Exception as e:
            pass
            
    return plan_dict

@app.post("/api/incidents/{incident_id}/plan/approve")
def api_approve_recovery_plan(incident_id: str, user: User = Depends(require_operator)):
    # Tenant isolation FIRST: a cross-org caller must never reach the executor.
    incident = get_incident(incident_id)
    inc_run = get_run(incident.run_id) if incident else None
    if not incident or not inc_run or inc_run.org_id != user.org_id:
        raise HTTPException(status_code=404, detail="Plan not found")

    plan = get_recovery_plan_by_incident(incident_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")

    success = recovery_executor.execute_plan(plan, user.role, user.username)
    if not success:
        raise HTTPException(status_code=400, detail="Plan execution failed or was denied")
    
    broadcast_sse_event("plan_approved", {
        "incident_id": incident_id,
        "plan_id": plan.plan_id,
        "actor": user.username,
    }, run_id=plan.run_id, org_id=user.org_id)
    return {"status": "success", "message": "Plan executed successfully"}

@app.post("/api/incidents/{incident_id}/plan/reject")
def api_reject_recovery_plan(incident_id: str, user: User = Depends(require_operator)):
    # Tenant isolation FIRST: a cross-org caller must never mutate another org's plan.
    incident = get_incident(incident_id)
    inc_run = get_run(incident.run_id) if incident else None
    if not incident or not inc_run or inc_run.org_id != user.org_id:
        raise HTTPException(status_code=404, detail="Plan not found")

    plan = get_recovery_plan_by_incident(incident_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")

    success = recovery_executor.reject_plan(plan, user.role, user.username)
    if not success:
        raise HTTPException(status_code=400, detail="Could not reject plan")
    
    broadcast_sse_event("plan_rejected", {
        "incident_id": incident_id,
        "plan_id": plan.plan_id,
        "actor": user.username,
    }, run_id=plan.run_id, org_id=user.org_id)
    return {"status": "success", "message": "Plan rejected"}



@app.get("/api/stream")
async def api_stream(request: Request, run_id: str = None, user: User = Depends(get_current_user)):
    """
    Org-scoped real-time stream for the dashboard. A client only ever receives
    events for its OWN organization — sse_bus publishes on per-org channels and
    registers this client under the caller's org_id.
    """
    # Subscribing to a specific run requires that run to belong to the caller's org.
    if run_id:
        run = get_run(run_id)
        if not run or run.org_id != user.org_id:
            raise HTTPException(status_code=404, detail="Run not found")

    sub_key, client_queue = sse_bus.register_client(user.org_id, run_id)

    async def event_generator():
        try:
            while True:
                if await request.is_disconnected():
                    break
                try:
                    message = await asyncio.wait_for(client_queue.get(), timeout=5.0)
                    if isinstance(message, dict):
                        yield {
                            "event": message.get("event", "update"),
                            "data": json.dumps(message.get("data", {})),
                        }
                    else:
                        yield {"event": "update", "data": str(message)}
                except asyncio.TimeoutError:
                    yield {"event": "heartbeat", "data": "ping"}
        finally:
            sse_bus.unregister_client(user.org_id, sub_key, client_queue)

    return EventSourceResponse(event_generator())


@app.get("/api/patterns")
def get_patterns_api(user: User = Depends(get_current_user)):
    if user.role not in ["ADMIN", "OPERATOR", "VIEWER"]:
        raise HTTPException(status_code=403, detail="Forbidden")
        
    patterns = get_patterns_by_org(user.org_id)
    trust_engine = TrustEngine()
    
    results = []
    for p in patterns:
        evidence = trust_engine.calculate_trust(p.pattern_id)
        actions_summary = []
        for action, stats in evidence.actions.items():
            actions_summary.append({
                "action": action,
                "attempted": stats.attempted,
                "verified_success": stats.verified_success,
                "verified_failure": stats.verified_failure,
                "success_rate": stats.success_rate,
                "trust_score": stats.trust_score,
                "risk_level": stats.risk_level
            })
            
        results.append({
            "pattern_id": p.pattern_id,
            "fingerprint": p.fingerprint,
            "failure_type": p.failure_type,
            "agent_id": p.agent_id,
            "occurrences": p.occurrences,
            "actions": actions_summary,
            "updated_at": p.updated_at
        })
        
    return {"data": results}


# --- PROXY GATEWAY ROUTER (/v1/chat/completions) ---
from cortexheal.server.gateway import gateway_router
app.include_router(gateway_router)


# --- STATIC FILES ---
# We serve the frontend directly from a static directory
frontend_dir = os.path.join(os.path.dirname(__file__), "static")
os.makedirs(frontend_dir, exist_ok=True)

app.mount("/static", StaticFiles(directory=frontend_dir), name="static")

@app.get("/{full_path:path}")
def serve_spa(full_path: str):
    # Check if a static file directly exists (e.g., assets/index.js, favicon.svg)
    if full_path:
        requested_file = os.path.abspath(os.path.join(frontend_dir, full_path))
        base_dir = os.path.abspath(frontend_dir)
        try:
            if os.path.commonpath([base_dir, requested_file]) == base_dir and os.path.isfile(requested_file):
                return FileResponse(requested_file)
        except ValueError:
            pass

    # Fallback to index.html for client-side SPA routing
    index_path = os.path.join(frontend_dir, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return {"message": "Frontend not built yet. Place index.html in cortexheal/server/static/"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
