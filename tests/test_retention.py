"""
Retention job (ADR-004): raw events age out; incidents + audit_events are kept.
"""
import json
import uuid
from datetime import datetime, timezone

import pytest

from cortexheal.storage.postgres import (
    init_db, save_run, get_connection, purge_events_older_than, get_events_for_run,
)
from cortexheal.models.run import AgentRun


@pytest.fixture(autouse=True)
def _schema():
    init_db()
    yield


def _new_run():
    run_id = f"ret_{uuid.uuid4().hex[:10]}"
    save_run(AgentRun(run_id=run_id, agent_id="a", org_id="test_org",
                      framework="langgraph", status="running", protection_mode="ACTIVE"))
    return run_id


def _insert_event(run_id, label, age_days):
    idem = f"{label}-{uuid.uuid4().hex}"
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """INSERT INTO events (event_id, run_id, timestamp, event_type,
                       tool, arguments_hash, response_hash, sequence_number, status, idempotency_key)
                   VALUES (%s, %s, now() - make_interval(days => %s), %s, %s, %s, %s, %s, %s, %s)""",
                (str(uuid.uuid4()), run_id, age_days, "TOOL_CALL_COMPLETED",
                 "t", "a", "r", 1, "success", idem),
            )
        conn.commit()
    return idem


def _insert_incident(run_id):
    iid = str(uuid.uuid4())
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """INSERT INTO incidents (incident_id, run_id, agent_id, failure_type, severity,
                       status, detector, detector_version, trigger_event_id, triggered_at,
                       evidence, observed_value, threshold, description)
                   VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s, now() - make_interval(days => 100),
                           %s,%s,%s,%s)""",
                (iid, run_id, "a", "STUCK_LOOP", "CRITICAL", "OPEN", "stuck_loop_detector",
                 "1.0", str(uuid.uuid4()), json.dumps({}), json.dumps(3), json.dumps(3), "old"),
            )
        conn.commit()
    return iid


def _incident_exists(iid):
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT 1 FROM incidents WHERE incident_id = %s", (iid,))
            return cur.fetchone() is not None


def test_retention_purges_old_events_but_keeps_recent_and_incidents():
    run_id = _new_run()
    _insert_event(run_id, "old", age_days=100)
    recent_idem = _insert_event(run_id, "recent", age_days=1)
    iid = _insert_incident(run_id)  # 100 days old — must be retained

    deleted = purge_events_older_than(90)
    assert deleted >= 1

    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT idempotency_key FROM events WHERE run_id = %s", (run_id,))
            keys = [r[0] for r in cur.fetchall()]
    assert keys == [recent_idem], f"only the recent event should remain, got {keys}"
    # Compliance record is never touched by retention.
    assert _incident_exists(iid), "retention must NOT delete incidents"


def test_retention_rejects_nonpositive_days():
    with pytest.raises(ValueError):
        purge_events_older_than(0)
