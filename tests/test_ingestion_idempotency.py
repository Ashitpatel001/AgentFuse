"""
Idempotent ingestion (§7.1 / ADR-004): a retried telemetry event must not be
double-counted, because a duplicated event could otherwise falsely trip a
detection threshold. save_event dedups on idempotency_key and reports whether
the row was newly inserted; the collector only runs detection on a new event.
"""
import uuid
from datetime import datetime, timezone

import pytest

from cortexheal.models.events import RuntimeEvent
from cortexheal.models.run import AgentRun
from cortexheal.detection.stuck_loop import StuckLoopDetector, Config as SLConfig
from cortexheal.storage.postgres import init_db, save_run, save_event, get_connection


@pytest.fixture(autouse=True)
def _schema():
    init_db()
    yield


def new_run():
    run_id = f"idem_{uuid.uuid4().hex[:10]}"
    save_run(AgentRun(run_id=run_id, agent_id="a", org_id="test_org",
                      framework="langgraph", status="running", protection_mode="ACTIVE"))
    return run_id


def event(run_id, seq, idem, tool="tool_x", args="A", resp="R"):
    return RuntimeEvent(
        framework="langgraph", run_id=run_id, agent_id="a",
        event_type="TOOL_CALL_COMPLETED", status="success", sequence_number=seq,
        idempotency_key=idem, tool=tool, arguments_hash=args, response_hash=resp,
    )


def _event_count(run_id):
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT count(*) FROM events WHERE run_id = %s", (run_id,))
            return cur.fetchone()[0]


def test_retried_event_is_deduped():
    run_id = new_run()
    e = event(run_id, 1, idem="dup-key-1")
    assert save_event(e) is True, "first delivery should insert"
    assert save_event(e) is False, "retried delivery (same idempotency_key) must be a no-op"
    assert _event_count(run_id) == 1, "duplicate must not create a second row"


def test_duplicate_delivery_does_not_falsely_trip_threshold():
    run_id = new_run()
    cfg = SLConfig()
    cfg.repetition_threshold = 3
    detector = StuckLoopDetector(cfg)

    # Two DISTINCT identical-signature events (below threshold 3).
    e1 = event(run_id, 1, idem="k1")
    e2 = event(run_id, 2, idem="k2")
    assert save_event(e1) is True
    assert save_event(e2) is True

    # Re-deliver both (network retry / at-least-once SDK). Must be deduped.
    assert save_event(e1) is False
    assert save_event(e2) is False
    assert _event_count(run_id) == 2, "retries must not inflate the event count"

    # With only 2 real repetitions, the detector must NOT trip (no false positive
    # from the duplicate deliveries).
    assert detector.evaluate(e2) is None

    # A genuine 3rd distinct event is what legitimately trips it.
    e3 = event(run_id, 3, idem="k3")
    assert save_event(e3) is True
    result = detector.evaluate(e3)
    assert result is not None and result.matched
    assert result.evidence["repetitions"] == 3
