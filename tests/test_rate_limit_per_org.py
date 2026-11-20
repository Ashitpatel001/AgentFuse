"""
Per-org rate limiting (§7.4 noisy-neighbor): one tenant hitting its limit must
NOT degrade service for another tenant.
"""
import uuid
from datetime import datetime, timezone

import pytest
from fastapi.testclient import TestClient

from agentfuse.server.api import app, RATE_LIMIT_STORE
from agentfuse.config import settings
from agentfuse.storage.postgres import get_connection, init_db
from agentfuse.models.auth import hash_key


def _seed_key(org_id, role="VIEWER"):
    raw = f"ctx_{role.lower()}_{org_id}_{uuid.uuid4().hex[:6]}"
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """INSERT INTO api_keys (key_id, key_hash, key_prefix, name, org_id, role, created_at)
                   VALUES (%s, %s, %s, %s, %s, %s, %s)""",
                (str(uuid.uuid4()), hash_key(raw), raw[:16] + "...", "k",
                 org_id, role, datetime.now(timezone.utc)),
            )
        conn.commit()
    return raw


def _clear_keys():
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM api_keys;")
        conn.commit()


@pytest.fixture(autouse=True)
def _reset():
    init_db()
    _clear_keys()
    RATE_LIMIT_STORE.clear()
    original = settings.API_RATE_LIMIT_PER_MIN
    yield
    settings.API_RATE_LIMIT_PER_MIN = original
    RATE_LIMIT_STORE.clear()
    _clear_keys()


def test_rate_limit_is_per_org_not_shared():
    key_a = _seed_key("rl_org_a")
    key_b = _seed_key("rl_org_b")
    settings.API_RATE_LIMIT_PER_MIN = 5
    c = TestClient(app)

    # Exhaust org_a's budget.
    statuses_a = [c.get("/api/whoami", headers={"X-API-Key": key_a}).status_code
                  for _ in range(8)]
    assert 429 in statuses_a, f"org_a should have been rate-limited: {statuses_a}"

    # org_b is on its own bucket and must be unaffected.
    rb = c.get("/api/whoami", headers={"X-API-Key": key_b})
    assert rb.status_code == 200, f"org_b degraded by org_a's limit (noisy neighbor): {rb.status_code}"


def test_rate_limit_429_has_retry_after():
    key_a = _seed_key("rl_org_c")
    settings.API_RATE_LIMIT_PER_MIN = 3
    c = TestClient(app)
    last = None
    for _ in range(6):
        last = c.get("/api/whoami", headers={"X-API-Key": key_a})
        if last.status_code == 429:
            break
    assert last.status_code == 429
    assert "retry-after" in {k.lower() for k in last.headers.keys()}
