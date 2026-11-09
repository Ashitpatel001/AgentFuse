"""
Provable metrics endpoint (§10): org-scoped aggregates derived from real data.
"""
import json
import uuid
from datetime import datetime, timezone, timedelta

import pytest

from cortexheal.storage.postgres import init_db, get_connection, get_metrics_summary


@pytest.fixture(autouse=True)
def _schema():
    init_db()
    yield


def _seed_run(org_id, run_id, start_time, cost):
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """INSERT INTO runs (run_id, agent_id, status, start_time, org_id, framework, total_cost)
                   VALUES (%s, %s, %s, %s, %s, %s, %s)""",
                (run_id, "a", "running", start_time, org_id, "langgraph", cost),
            )
        conn.commit()


def _seed_incident(run_id, triggered_at):
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """INSERT INTO incidents (incident_id, run_id, agent_id, failure_type, severity,
                       status, detector, detector_version, trigger_event_id, triggered_at,
                       evidence, observed_value, threshold, description)
                   VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)""",
                (str(uuid.uuid4()), run_id, "a", "STUCK_LOOP", "CRITICAL", "OPEN",
                 "stuck_loop_detector", "1.0", str(uuid.uuid4()), triggered_at,
                 json.dumps({}), json.dumps(3), json.dumps(3), "x"),
            )
        conn.commit()


def test_metrics_summary_is_real_and_org_scoped():
    org_a = f"metrics_a_{uuid.uuid4().hex[:8]}"
    org_b = f"metrics_b_{uuid.uuid4().hex[:8]}"
    now = datetime.now(timezone.utc)

    # org_a: run1 (flagged, cost 5, detected ~2s after start), run2 (clean, cost 1)
    r1 = f"{org_a}_r1"
    _seed_run(org_a, r1, now - timedelta(seconds=10), 5.0)
    _seed_incident(r1, now - timedelta(seconds=8))
    _seed_run(org_a, f"{org_a}_r2", now, 1.0)

    # org_b: a flagged run with a large cost — must NOT appear in org_a's metrics
    rb = f"{org_b}_r1"
    _seed_run(org_b, rb, now - timedelta(seconds=5), 99.0)
    _seed_incident(rb, now - timedelta(seconds=4))

    m = get_metrics_summary(org_a)

    assert m["runs_monitored"] == 2
    assert m["incidents_detected"] == 1
    assert m["runs_flagged"] == 1
    # Only the flagged run's cost (5.0), NOT the clean run (1.0) nor org_b's (99.0).
    assert m["cost_on_flagged_runs_usd"] == 5.0
    assert m["time_to_detection_ms"]["count"] == 1
    # ~2000ms detection latency (10s start -> 8s-ago trigger).
    assert 1000 <= m["time_to_detection_ms"]["p50"] <= 3000
