"""
Human-auth plane (ADR-005): sessions, login/logout, invitations, and — critically
— that a dashboard session is tenant-isolated exactly like an API key.
"""
import uuid
from datetime import datetime, timezone

import pytest
from fastapi.testclient import TestClient

from agentfuse.server.api import app
from agentfuse.storage.postgres import get_connection, init_db
from agentfuse.storage import auth_store
from agentfuse.models.auth import SESSION_COOKIE_NAME, UserAccount, hash_password

_AUTH_TABLES = ["sessions", "invitations", "users", "organizations"]
_CORE_TABLES = ["recovery_outcomes", "recovery_actions", "recovery_plans",
                "incidents", "events", "audit_events", "runs", "api_keys"]


def _wipe():
    with get_connection() as conn:
        with conn.cursor() as cur:
            for t in _CORE_TABLES + _AUTH_TABLES:
                cur.execute(f"DELETE FROM {t};")
        conn.commit()


@pytest.fixture(autouse=True)
def setup_teardown():
    init_db()
    _wipe()
    yield
    _wipe()


def bootstrap_admin(org_name="Acme", email="admin@acme.test", password="hunter2pass"):
    org, user = auth_store.bootstrap_org_and_admin(org_name, email, password)
    return org, user, email, password


def _seed_run(org_id, run_id):
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """INSERT INTO runs (run_id, agent_id, status, start_time, org_id, framework)
                   VALUES (%s, %s, %s, %s, %s, %s)""",
                (run_id, "agent", "running", datetime.now(timezone.utc), org_id, "langgraph"),
            )
        conn.commit()


def test_login_sets_session_and_me_works():
    org, _, email, pw = bootstrap_admin()
    c = TestClient(app)
    r = c.post("/api/auth/login", json={"email": email, "password": pw})
    assert r.status_code == 200, r.text
    assert SESSION_COOKIE_NAME in c.cookies
    body = r.json()
    assert body["email"] == email and body["role"] == "ADMIN" and body["auth"] == "session"

    me = c.get("/api/auth/me")
    assert me.status_code == 200
    assert me.json()["org_id"] == org.org_id


def test_login_wrong_password_is_401():
    _, _, email, _ = bootstrap_admin()
    c = TestClient(app)
    r = c.post("/api/auth/login", json={"email": email, "password": "not-the-password"})
    assert r.status_code == 401


def test_login_unknown_email_is_401_uniform():
    bootstrap_admin()
    c = TestClient(app)
    r = c.post("/api/auth/login", json={"email": "nobody@nowhere.test", "password": "whatever1"})
    assert r.status_code == 401


def test_session_authorizes_protected_endpoint_without_api_key():
    _, _, email, pw = bootstrap_admin()
    c = TestClient(app)
    c.post("/api/auth/login", json={"email": email, "password": pw})
    r = c.get("/api/runs")  # cookie only, no X-API-Key
    assert r.status_code == 200, r.text


def test_logout_revokes_session():
    _, _, email, pw = bootstrap_admin()
    c = TestClient(app)
    c.post("/api/auth/login", json={"email": email, "password": pw})
    assert c.get("/api/auth/me").status_code == 200
    assert c.post("/api/auth/logout").status_code == 200
    # Cookie cleared client-side and revoked server-side.
    assert c.get("/api/auth/me").status_code in (401, 403)


def test_invite_and_accept_flow_single_use():
    org, _, email, pw = bootstrap_admin()
    admin = TestClient(app)
    admin.post("/api/auth/login", json={"email": email, "password": pw})

    inv = admin.post("/api/invitations", json={"email": "op@acme.test", "role": "OPERATOR"})
    assert inv.status_code == 200, inv.text
    token = inv.json()["invite_token"]

    invitee = TestClient(app)
    acc = invitee.post("/api/auth/accept-invitation",
                       json={"token": token, "password": "operatorpass1"})
    assert acc.status_code == 200, acc.text
    assert acc.json()["role"] == "OPERATOR"
    assert acc.json()["org_id"] == org.org_id
    assert invitee.get("/api/auth/me").status_code == 200

    # Single-use: the same token cannot be redeemed twice.
    again = TestClient(app)
    assert again.post("/api/auth/accept-invitation",
                      json={"token": token, "password": "anotherpass1"}).status_code == 400


def test_invite_requires_admin_role():
    org, _, _, _ = bootstrap_admin("Beta", "boss@beta.test", "bosspass12")
    op = UserAccount(org_id=org.org_id, email="op2@beta.test",
                     password_hash=hash_password("operatorpass1"), role="OPERATOR")
    auth_store.create_user_account(op)

    c = TestClient(app)
    c.post("/api/auth/login", json={"email": "op2@beta.test", "password": "operatorpass1"})
    r = c.post("/api/invitations", json={"email": "x@beta.test", "role": "VIEWER"})
    assert r.status_code == 403


def test_session_is_tenant_isolated():
    org_a, _, ea, pa = bootstrap_admin("OrgA", "a@a.test", "apassword12")
    org_b, _, _, _ = bootstrap_admin("OrgB", "b@b.test", "bpassword12")
    _seed_run(org_a.org_id, "run_a")
    _seed_run(org_b.org_id, "run_b")

    c = TestClient(app)
    c.post("/api/auth/login", json={"email": ea, "password": pa})
    r = c.get("/api/runs")
    assert r.status_code == 200
    runs = r.json()["data"]
    assert all(run["org_id"] == org_a.org_id for run in runs), "session leaked another org's runs"
    assert any(run["run_id"] == "run_a" for run in runs)
    assert not any(run["run_id"] == "run_b" for run in runs)


def test_invalid_session_cookie_is_rejected():
    c = TestClient(app)
    c.cookies.set(SESSION_COOKIE_NAME, "not-a-real-token")
    assert c.get("/api/auth/me").status_code in (401, 403)


def test_list_users_requires_admin():
    org, _, _, _ = bootstrap_admin("Gamma", "boss@gamma.test", "bosspass12")
    op = UserAccount(org_id=org.org_id, email="op3@gamma.test",
                     password_hash=hash_password("operatorpass1"), role="OPERATOR")
    auth_store.create_user_account(op)
    c = TestClient(app)
    c.post("/api/auth/login", json={"email": "op3@gamma.test", "password": "operatorpass1"})
    assert c.get("/api/users").status_code == 403


def test_list_users_is_org_scoped():
    org_a, _, ea, pa = bootstrap_admin("OrgU-A", "admin@ua.test", "apassword12")
    org_b, _, _, _ = bootstrap_admin("OrgU-B", "admin@ub.test", "bpassword12")
    c = TestClient(app)
    c.post("/api/auth/login", json={"email": ea, "password": pa})
    r = c.get("/api/users")
    assert r.status_code == 200
    emails = {u["email"] for u in r.json()}
    assert "admin@ua.test" in emails
    assert "admin@ub.test" not in emails, "GET /api/users leaked another org's members"
