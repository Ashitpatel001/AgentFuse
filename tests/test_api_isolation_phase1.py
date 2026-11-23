"""
Phase 1 — Permanent negative cross-org isolation tests.

Covers the org-scoped endpoints that previously had NO isolation test
(the P0 backlog item). Each test asserts the desired, secure behavior:
a caller authenticated to org_b must NOT be able to read or mutate a
resource owned by org_a, and must receive 404 (not 403) so tenancy
cannot be enumerated — matching the established IDOR-on-key-revocation fix.

These tests are written to FAIL against a handler that omits the org
check, which is exactly how the leak is proven before it is fixed.
"""
import json
import uuid
from datetime import datetime, timezone

import pytest
from fastapi.testclient import TestClient

from agentfuse.server.api import app
from agentfuse.storage.postgres import get_connection, init_db, save_recovery_plan
from agentfuse.models.auth import hash_key
from agentfuse.models.recovery import RecoveryPlan, RecoveryAction

client = TestClient(app)

# Ordered so child rows are removed before parents (FK-safe).
_WIPE_TABLES = [
    "recovery_outcomes",
    "recovery_actions",
    "recovery_plans",
    "incidents",
    "events",
    "audit_events",
    "runs",
    "api_keys",
]


def _wipe():
    with get_connection() as conn:
        with conn.cursor() as cur:
            for table in _WIPE_TABLES:
                cur.execute(f"DELETE FROM {table};")
        conn.commit()


@pytest.fixture(autouse=True)
def setup_teardown():
    init_db()
    _wipe()
    yield
    _wipe()


def seed_org(org_id: str, role: str = "OPERATOR") -> dict:
    """
    Seed one org with an API key (of `role`), one run, one incident, and one
    recovery plan linked to them. Returns the raw key and the resource ids.
    """
    raw_key = f"af_live_{role.lower()}_{org_id}_{uuid.uuid4().hex[:6]}"
    k_hash = hash_key(raw_key)
    prefix = raw_key[:16] + "..."
    run_id = f"test_run_{org_id}_{uuid.uuid4().hex[:8]}"
    incident_id = str(uuid.uuid4())

    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """INSERT INTO api_keys
                   (key_id, key_hash, key_prefix, name, org_id, role, created_at)
                   VALUES (%s, %s, %s, %s, %s, %s, %s)""",
                (str(uuid.uuid4()), k_hash, prefix, f"{org_id} key",
                 org_id, role, datetime.now(timezone.utc)),
            )
            cur.execute(
                """INSERT INTO runs
                   (run_id, agent_id, status, start_time, org_id, framework)
                   VALUES (%s, %s, %s, %s, %s, %s)""",
                (run_id, "test_agent", "paused",
                 datetime.now(timezone.utc), org_id, "langgraph"),
            )
            cur.execute(
                """INSERT INTO incidents
                   (incident_id, run_id, agent_id, failure_type, severity, status,
                    detector, detector_version, trigger_event_id, triggered_at,
                    evidence, observed_value, threshold, description)
                   VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)""",
                (incident_id, run_id, "test_agent", "STUCK_LOOP", "CRITICAL", "OPEN",
                 "stuck_loop_detector", "1.0", str(uuid.uuid4()),
                 datetime.now(timezone.utc), json.dumps({}), json.dumps(5),
                 json.dumps(5), "Test Incident"),
            )
        conn.commit()

    plan = RecoveryPlan(
        incident_id=incident_id,
        run_id=run_id,
        diagnosis="seeded plan for isolation test",
        proposed_actions=[
            RecoveryAction(
                run_id=run_id,
                incident_id=incident_id,
                action_type="KEEP_PAUSED",
                reason="isolation test",
            )
        ],
        risk_level="LOW",
        status="PROPOSED",
    )
    save_recovery_plan(plan)

    return {
        "key": raw_key,
        "run_id": run_id,
        "incident_id": incident_id,
        "plan_id": plan.plan_id,
    }


def _h(key: str) -> dict:
    return {"X-API-Key": key}


# --------------------------------------------------------------------------
# Read isolation
# --------------------------------------------------------------------------

def test_incident_detail_cross_org_is_404():
    a = seed_org("org_a")
    b = seed_org("org_b")

    # Owner can read its own incident.
    own = client.get(f"/api/incidents/{a['incident_id']}", headers=_h(a["key"]))
    assert own.status_code == 200, own.text

    # Foreign org must NOT read it.
    foreign = client.get(f"/api/incidents/{a['incident_id']}", headers=_h(b["key"]))
    assert foreign.status_code == 404, (
        f"CROSS-ORG LEAK: org_b read org_a incident detail (got {foreign.status_code})"
    )


def test_run_detail_cross_org_is_404():
    a = seed_org("org_a")
    b = seed_org("org_b")

    own = client.get(f"/api/runs/{a['run_id']}", headers=_h(a["key"]))
    assert own.status_code == 200, own.text

    foreign = client.get(f"/api/runs/{a['run_id']}", headers=_h(b["key"]))
    assert foreign.status_code == 404, (
        f"CROSS-ORG LEAK: org_b read org_a run detail (got {foreign.status_code})"
    )


def test_run_timeline_cross_org_is_404():
    a = seed_org("org_a")
    b = seed_org("org_b")

    own = client.get(f"/api/runs/{a['run_id']}/timeline", headers=_h(a["key"]))
    assert own.status_code == 200, own.text

    foreign = client.get(f"/api/runs/{a['run_id']}/timeline", headers=_h(b["key"]))
    assert foreign.status_code == 404, (
        f"CROSS-ORG LEAK: org_b read org_a run timeline (got {foreign.status_code})"
    )


def test_recovery_plan_get_cross_org_is_404():
    a = seed_org("org_a")
    b = seed_org("org_b")

    own = client.get(f"/api/incidents/{a['incident_id']}/plan", headers=_h(a["key"]))
    assert own.status_code == 200, own.text

    foreign = client.get(f"/api/incidents/{a['incident_id']}/plan", headers=_h(b["key"]))
    assert foreign.status_code == 404, (
        f"CROSS-ORG LEAK: org_b read org_a recovery plan (got {foreign.status_code})"
    )


# --------------------------------------------------------------------------
# Mutation isolation (the critical class: cross-org execute / reject)
# --------------------------------------------------------------------------

def test_plan_approve_cross_org_is_404():
    a = seed_org("org_a", role="OPERATOR")
    b = seed_org("org_b", role="OPERATOR")

    # Sanity: the plan genuinely exists and is visible to its owner, so a 404
    # for the foreign org can only be an isolation decision, not a missing plan.
    assert client.get(
        f"/api/incidents/{a['incident_id']}/plan", headers=_h(a["key"])
    ).status_code == 200

    foreign = client.post(
        f"/api/incidents/{a['incident_id']}/plan/approve", headers=_h(b["key"])
    )
    assert foreign.status_code == 404, (
        f"CROSS-ORG PRIVILEGE ESCALATION: org_b approved/executed org_a plan "
        f"(got {foreign.status_code})"
    )


def test_plan_reject_cross_org_is_404():
    a = seed_org("org_a", role="OPERATOR")
    b = seed_org("org_b", role="OPERATOR")

    assert client.get(
        f"/api/incidents/{a['incident_id']}/plan", headers=_h(a["key"])
    ).status_code == 200

    foreign = client.post(
        f"/api/incidents/{a['incident_id']}/plan/reject", headers=_h(b["key"])
    )
    assert foreign.status_code == 404, (
        f"CROSS-ORG MUTATION: org_b rejected org_a plan (got {foreign.status_code})"
    )
