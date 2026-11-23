"""
Security hardening tests:
1. Webhook SSRF validation at registration and dispatch (loopback, private, link-local, metadata, production HTTPS, no redirects).
2. CSRF defense: cookie-authenticated POST/PUT/DELETE require X-Requested-With; API keys exempt.
3. Route-walk test: iterate app.routes; public allowlist; every other route returns 401 without credentials, and 403/404 for org-B key on org-A object id; fails on unclassified routes.
4. Login lockout: 5 failures per email+IP in 15 minutes returns 429 with Retry-After.
"""
import uuid
import json
import time
from datetime import datetime, timezone
from unittest.mock import patch, MagicMock

import pytest
import httpx
from fastapi.testclient import TestClient

from agentfuse.server.api import (
    app,
    RATE_LIMIT_STORE,
    _LOGIN_FAILURE_STORE,
    _rl_get_redis,
    LOGIN_LOCKOUT_MAX_ATTEMPTS,
    LOGIN_LOCKOUT_WINDOW_SECONDS,
)
from agentfuse.alerting.security import validate_webhook_url, SSRFValidationError
from agentfuse.alerting.dispatcher import AlertDispatcher
from agentfuse.models.alerting import WebhookConfig
from agentfuse.models.incident import Incident
from agentfuse.models.auth import hash_key, hash_password, UserAccount
from agentfuse.storage import auth_store
from agentfuse.storage.postgres import get_connection, init_db, save_webhook_config

client = TestClient(app)


@pytest.fixture(autouse=True)
def _clean_security_state():
    init_db()
    _LOGIN_FAILURE_STORE.clear()
    RATE_LIMIT_STORE.clear()
    client.cookies.clear()
    r = _rl_get_redis()
    if r is not None:
        try:
            for k in r.keys("agentfuse:*"):
                r.delete(k)
        except Exception:
            pass
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM notification_records;")
            cur.execute("DELETE FROM webhook_configs;")
            cur.execute("DELETE FROM recovery_outcomes;")
            cur.execute("DELETE FROM incidents;")
            cur.execute("DELETE FROM events;")
            cur.execute("DELETE FROM runs;")
            cur.execute("DELETE FROM api_keys;")
            cur.execute("DELETE FROM sessions;")
            cur.execute("DELETE FROM users WHERE email LIKE '%@test.com' OR email LIKE '%@acme.com';")
        conn.commit()
    yield
    _LOGIN_FAILURE_STORE.clear()
    RATE_LIMIT_STORE.clear()
    client.cookies.clear()
    r = _rl_get_redis()
    if r is not None:
        try:
            for k in r.keys("agentfuse:*"):
                r.delete(k)
        except Exception:
            pass
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM notification_records;")
            cur.execute("DELETE FROM webhook_configs;")
            cur.execute("DELETE FROM recovery_outcomes;")
            cur.execute("DELETE FROM incidents;")
            cur.execute("DELETE FROM events;")
            cur.execute("DELETE FROM runs;")
            cur.execute("DELETE FROM api_keys;")
            cur.execute("DELETE FROM sessions;")
            cur.execute("DELETE FROM users WHERE email LIKE '%@test.com' OR email LIKE '%@acme.com';")
        conn.commit()


def _seed_user_and_session(org_id: str, email: str, role: str = "ADMIN") -> tuple[str, str]:
    """Create organization, user and active session cookie token."""
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """INSERT INTO organizations (org_id, name, created_at)
                   VALUES (%s, %s, %s) ON CONFLICT (org_id) DO NOTHING;""",
                (org_id, f"Org {org_id}", datetime.now(timezone.utc)),
            )
        conn.commit()
    user = UserAccount(
        org_id=org_id,
        email=email,
        password_hash=hash_password("ValidPassword123!"),
        role=role,
    )
    auth_store.create_user_account(user)
    raw_session = auth_store.create_session_for_user(user.user_id)
    return user.user_id, raw_session


def _seed_api_key(org_id: str, role: str = "ADMIN") -> str:
    raw_key = f"af_live_{role.lower()}_{org_id}_{uuid.uuid4().hex[:6]}"
    k_hash = hash_key(raw_key)
    prefix = raw_key[:16] + "..."
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """INSERT INTO api_keys (key_id, key_hash, key_prefix, name, org_id, role, created_at)
                   VALUES (%s, %s, %s, %s, %s, %s, %s)""",
                (str(uuid.uuid4()), k_hash, prefix, f"{org_id} Key", org_id, role, datetime.now(timezone.utc)),
            )
        conn.commit()
    return raw_key


# ==============================================================================
# 1. WEBHOOK SSRF TESTS (One test per blocked class)
# ==============================================================================

def test_webhook_ssrf_blocked_loopback():
    """Reject loopback addresses: 127.0.0.1, localhost, [::1]."""
    admin_key = _seed_api_key("org_ssrf", role="ADMIN")

    for url in ["http://127.0.0.1:8080/hook", "http://localhost/hook", "http://[::1]/hook"]:
        with pytest.raises(SSRFValidationError, match="forbidden loopback"):
            validate_webhook_url(url, environment="development")

        res = client.post(
            "/api/webhooks",
            json={"url": url, "target_type": "generic_webhook"},
            headers={"X-API-Key": admin_key},
        )
        assert res.status_code == 400
        assert "loopback" in res.json()["detail"].lower()


def test_webhook_ssrf_blocked_private_ip():
    """Reject RFC-1918 private network addresses: 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16."""
    admin_key = _seed_api_key("org_ssrf", role="ADMIN")

    for url in [
        "http://10.0.0.1/hook",
        "http://172.16.0.1/hook",
        "http://192.168.1.1/hook",
    ]:
        with pytest.raises(SSRFValidationError, match="forbidden private"):
            validate_webhook_url(url, environment="development")

        res = client.post(
            "/api/webhooks",
            json={"url": url, "target_type": "generic_webhook"},
            headers={"X-API-Key": admin_key},
        )
        assert res.status_code == 400
        assert "private" in res.json()["detail"].lower()


def test_webhook_ssrf_blocked_link_local():
    """Reject link-local addresses: 169.254.0.0/16, fe80::/10."""
    admin_key = _seed_api_key("org_ssrf", role="ADMIN")

    for url in ["http://169.254.1.1/hook", "http://[fe80::1]/hook"]:
        with pytest.raises(SSRFValidationError, match="forbidden link-local"):
            validate_webhook_url(url, environment="development")

        res = client.post(
            "/api/webhooks",
            json={"url": url, "target_type": "generic_webhook"},
            headers={"X-API-Key": admin_key},
        )
        assert res.status_code == 400
        assert "link-local" in res.json()["detail"].lower()


def test_webhook_ssrf_blocked_cloud_metadata():
    """Reject cloud instance metadata service address 169.254.169.254."""
    admin_key = _seed_api_key("org_ssrf", role="ADMIN")
    url = "http://169.254.169.254/latest/meta-data/"

    with pytest.raises(SSRFValidationError, match="169.254.169.254"):
        validate_webhook_url(url, environment="development")

    res = client.post(
        "/api/webhooks",
        json={"url": url, "target_type": "generic_webhook"},
        headers={"X-API-Key": admin_key},
    )
    assert res.status_code == 400
    assert "169.254.169.254" in res.json()["detail"]


def test_webhook_ssrf_blocked_production_non_https():
    """When ENVIRONMENT=production, reject plain http URLs."""
    with pytest.raises(SSRFValidationError, match="must use HTTPS"):
        validate_webhook_url("http://example.com/webhook", environment="production")

    # When https is used, it passes validation
    with patch("socket.getaddrinfo", return_value=[(2, 1, 6, "", ("93.184.216.34", 0))]):
        validate_webhook_url("https://example.com/webhook", environment="production")


def test_webhook_dispatch_validates_before_send_and_no_redirects():
    """Dispatcher validates URL before sending and disables HTTP redirects."""
    dispatcher = AlertDispatcher()
    incident = Incident(
        incident_id=str(uuid.uuid4()),
        run_id="run_test",
        agent_id="agent_1",
        failure_type="STUCK_LOOP",
        severity="CRITICAL",
        status="OPEN",
        detector="loop_detector",
        detector_version="1.0",
        trigger_event_id="evt_1",
        description="test incident",
        evidence={},
        observed_value=1,
        threshold=1,
    )

    # 1. SSRF URL is blocked before send
    bad_config = WebhookConfig(
        webhook_id=str(uuid.uuid4()),
        org_id="org_ssrf",
        target_type="generic_webhook",
        url="http://127.0.0.1:9999/hook",
    )
    record = dispatcher.dispatch_alert_to_config(bad_config, incident)
    assert record.status == "FAILED"
    assert "SSRF validation blocked" in (record.response_body or "")

    # 2. Check no redirects (follow_redirects=False)
    with patch("socket.getaddrinfo", return_value=[(2, 1, 6, "", ("93.184.216.34", 0))]):
        with patch("httpx.Client") as mock_client_cls:
            mock_client = MagicMock()
            mock_client_cls.return_value.__enter__.return_value = mock_client
            mock_res = MagicMock(status_code=200, text="ok")
            mock_client.post.return_value = mock_res

            good_config = WebhookConfig(
                webhook_id=str(uuid.uuid4()),
                org_id="org_ssrf",
                target_type="generic_webhook",
                url="https://example.com/hook",
            )
            dispatcher.dispatch_alert_to_config(good_config, incident)

            mock_client_cls.assert_called_with(timeout=5.0, follow_redirects=False)


# ==============================================================================
# 2. CSRF DEFENSE TESTS
# ==============================================================================

def test_csrf_cookie_auth_rejected_without_x_requested_with():
    """Cookie-authenticated POST/PUT/DELETE without X-Requested-With is rejected with 403."""
    _, session_token = _seed_user_and_session("org_csrf", "admin_csrf@test.com", role="ADMIN")
    c = TestClient(app)
    c.cookies.set("agentfuse_session", session_token)

    # Attempt POST /api/keys without X-Requested-With header
    res_post = c.post(
        "/api/keys",
        json={"name": "Test Key", "role": "OPERATOR"},
    )
    assert res_post.status_code == 403
    assert "CSRF check failed" in res_post.json()["detail"]

    # Attempt POST /api/auth/logout without X-Requested-With header
    res_logout = c.post("/api/auth/logout")
    assert res_logout.status_code == 403
    assert "CSRF check failed" in res_logout.json()["detail"]


def test_csrf_cookie_auth_accepted_with_x_requested_with():
    """Cookie-authenticated state mutation with X-Requested-With succeeds."""
    _, session_token = _seed_user_and_session("org_csrf", "admin_csrf2@test.com", role="ADMIN")
    c = TestClient(app)
    c.cookies.set("agentfuse_session", session_token)

    res = c.post(
        "/api/keys",
        json={"name": "Test Key", "role": "OPERATOR"},
        headers={"X-Requested-With": "XMLHttpRequest"},
    )
    assert res.status_code == 200
    assert "key_id" in res.json()


def test_csrf_api_key_auth_is_exempt():
    """Machine authentication (X-API-Key) is exempt from CSRF checks."""
    api_key = _seed_api_key("org_csrf_api", role="ADMIN")

    res = client.post(
        "/api/keys",
        json={"name": "Machine Key", "role": "OPERATOR"},
        headers={"X-API-Key": api_key},  # No X-Requested-With header
    )
    assert res.status_code == 200
    assert "key_id" in res.json()


# ==============================================================================
# 3. LOGIN LOCKOUT TESTS
# ==============================================================================

def test_login_lockout_5_failures_returns_429_with_retry_after():
    """5 failed logins per email+IP in 15 minutes locks out and returns 429 with Retry-After."""
    _seed_user_and_session("org_lockout", "target@test.com")
    email = "target@test.com"
    _LOGIN_FAILURE_STORE.clear()

    # 1. Exactly 5 failed login attempts return 401
    for i in range(LOGIN_LOCKOUT_MAX_ATTEMPTS):
        res = client.post(
            "/api/auth/login",
            json={"email": email, "password": "WrongPassword!"},
        )
        assert res.status_code == 401, f"Attempt {i+1} should fail with 401"

    # 2. The 6th attempt (locked out) returns 429 Too Many Requests
    res_lockout = client.post(
        "/api/auth/login",
        json={"email": email, "password": "ValidPassword123!"},
    )
    assert res_lockout.status_code == 429
    assert "retry-after" in {k.lower() for k in res_lockout.headers.keys()}
    retry_after = int(res_lockout.headers.get("Retry-After"))
    assert 0 < retry_after <= LOGIN_LOCKOUT_WINDOW_SECONDS

    # 3. A different email is NOT locked out
    res_other = client.post(
        "/api/auth/login",
        json={"email": "other@test.com", "password": "WrongPassword!"},
    )
    assert res_other.status_code == 401

    # 4. A different IP is NOT locked out
    res_diff_ip = client.post(
        "/api/auth/login",
        json={"email": email, "password": "WrongPassword!"},
        headers={"X-Forwarded-For": "198.51.100.55"},
    )
    assert res_diff_ip.status_code == 401


def test_login_lockout_clears_on_successful_login():
    """Successful login resets the failure counter."""
    _seed_user_and_session("org_lockout", "cleared@test.com")
    email = "cleared@test.com"
    _LOGIN_FAILURE_STORE.clear()

    # 3 failed attempts
    for _ in range(3):
        client.post("/api/auth/login", json={"email": email, "password": "WrongPassword!"})

    # Successful login
    res_success = client.post("/api/auth/login", json={"email": email, "password": "ValidPassword123!"})
    assert res_success.status_code == 200

    # Next 3 failed attempts should NOT trigger lockout (counter was reset)
    for _ in range(3):
        res = client.post("/api/auth/login", json={"email": email, "password": "WrongPassword!"})
        assert res.status_code == 401


# ==============================================================================
# 4. ROUTE-WALK TEST (Iterates app.routes, fails on unclassified routes)
# ==============================================================================

def test_route_walk_security():
    """
    Iterate app.routes:
    1. Public allowlist: health, readiness, metrics, login, accept-invitation, static.
    2. Fail on any unclassified route.
    3. Every other route returns 401 without credentials.
    4. For an org-B key on an org-A object id, return 404 or 403.
    """
    public_allowlist_patterns = {
        "health": "/health",
        "readiness": "/readiness",
        "metrics": "/metrics",
        "login": "/api/auth/login",
        "accept-invitation": "/api/auth/accept-invitation",
        "static": "/static",
    }

    # Seed Org A and Org B fixtures for cross-tenant object testing
    key_a = _seed_api_key("org_a", role="ADMIN")
    key_b = _seed_api_key("org_b", role="ADMIN")

    org_a_run_id = f"run_org_a_{uuid.uuid4().hex[:8]}"
    org_a_incident_id = str(uuid.uuid4())
    org_a_key_id = str(uuid.uuid4())
    org_a_webhook_id = str(uuid.uuid4())

    with get_connection() as conn:
        with conn.cursor() as cur:
            # Org A run
            cur.execute(
                """INSERT INTO runs (run_id, agent_id, status, start_time, org_id, framework, protection_mode)
                   VALUES (%s, %s, %s, %s, %s, %s, %s)""",
                (org_a_run_id, "agent_a", "running", datetime.now(timezone.utc), "org_a", "custom", "ACTIVE"),
            )
            # Org A incident
            cur.execute(
                """INSERT INTO incidents (incident_id, run_id, agent_id, failure_type, severity, status, detector, detector_version, trigger_event_id, triggered_at, evidence, observed_value, threshold, description)
                   VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)""",
                (org_a_incident_id, org_a_run_id, "agent_a", "STUCK_LOOP", "CRITICAL", "OPEN", "detector", "1.0", "evt_1", datetime.now(timezone.utc), json.dumps({}), json.dumps(1), json.dumps(1), "Incident A"),
            )
            # Org A secondary key
            cur.execute(
                """INSERT INTO api_keys (key_id, key_hash, key_prefix, name, org_id, role, created_at)
                   VALUES (%s, %s, %s, %s, %s, %s, %s)""",
                (org_a_key_id, hash_key(f"raw_{org_a_key_id}"), "prefix...", "Key A", "org_a", "VIEWER", datetime.now(timezone.utc)),
            )
            # Org A webhook
            cur.execute(
                """INSERT INTO webhook_configs (webhook_id, org_id, target_type, url, enabled, created_at)
                   VALUES (%s, %s, %s, %s, %s, %s)""",
                (org_a_webhook_id, "org_a", "generic_webhook", "https://example.com/hook", True, datetime.now(timezone.utc)),
            )
        conn.commit()

    classified_routes = set()

    for route in app.routes:
        path = getattr(route, "path", None)
        if not path:
            continue

        methods = getattr(route, "methods", {"GET"})

        # Check public allowlist
        is_public = False
        if path == "/health":
            is_public = True
            classified_routes.add("health")
        elif path == "/readiness":
            is_public = True
            classified_routes.add("readiness")
        elif path.startswith("/metrics"):
            is_public = True
            classified_routes.add("metrics")
        elif path == "/api/auth/login":
            is_public = True
            classified_routes.add("login")
        elif path == "/api/auth/accept-invitation":
            is_public = True
            classified_routes.add("accept-invitation")
        elif path.startswith("/static") or path == "/{full_path:path}":
            is_public = True
            classified_routes.add("static")

        if is_public:
            continue

        # Non-public route MUST be under /api/
        if not path.startswith("/api/"):
            pytest.fail(f"Unclassified new route found outside public allowlist: {path}")

        # Test every non-public route: returns 401 without credentials
        walk_client = TestClient(app)
        for method in methods:
            if method in ("HEAD", "OPTIONS"):
                continue

            # Build a test URL by replacing path parameters
            test_path = path.replace("{incident_id}", org_a_incident_id) \
                            .replace("{run_id}", org_a_run_id) \
                            .replace("{key_id}", org_a_key_id) \
                            .replace("{webhook_id}", org_a_webhook_id)

            # 1. Unauthenticated request MUST return 401
            res_unauth = walk_client.request(method, test_path)
            assert res_unauth.status_code == 401, (
                f"Leak detected on {method} {path}: expected 401 unauthenticated, got {res_unauth.status_code}"
            )

            # 2. Org-B key accessing Org-A object id MUST return 404 or 403
            if any(p in path for p in ["{incident_id}", "{run_id}", "{key_id}", "{webhook_id}"]):
                res_cross = walk_client.request(
                    method,
                    test_path,
                    headers={"X-API-Key": key_b},
                    json={"name": "test"} if method in ("POST", "PUT") else None,
                )
                assert res_cross.status_code in (403, 404), (
                    f"Cross-tenant leak on {method} {path}: expected 404/403 for org-B key, got {res_cross.status_code}"
                )

    # Confirm all categories in public allowlist were matched
    for cat in ["health", "readiness", "metrics", "login", "accept-invitation", "static"]:
        assert cat in classified_routes, f"Public allowlist category '{cat}' was not encountered in routes"
