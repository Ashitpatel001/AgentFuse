"""
Multi-worker safety (ADR / §7.2). Historically CORTEXHEAL_WORKERS=1 was required
because stuck-loop state lived in memory (fragmented across workers). Detection
is now Postgres-backed (stateless per worker) and incidents dedup on the DB
unique constraint (run_id, failure_type, detector_version). This proves two
independent workers can each detect the same loop yet produce exactly ONE
incident — so WORKERS>1 is correct.
"""
import uuid

import pytest

from cortexheal.models.events import RuntimeEvent
from cortexheal.models.run import AgentRun
from cortexheal.detection.engine import DetectionEngine
from cortexheal.detection.stuck_loop import Config as SLConfig
from cortexheal.storage.postgres import (
    init_db, save_run, save_event, save_incident, get_connection,
)


@pytest.fixture(autouse=True)
def _schema():
    init_db()
    yield


def _event(run_id, seq):
    return RuntimeEvent(
        framework="langgraph", run_id=run_id, agent_id="a",
        event_type="TOOL_CALL_COMPLETED", status="success", sequence_number=seq,
        idempotency_key=f"{run_id}_{seq}", tool="tool_x",
        arguments_hash="A", response_hash="R",
    )


def _incident_count(run_id):
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT count(*) FROM incidents WHERE run_id = %s", (run_id,))
            return cur.fetchone()[0]


def test_two_workers_detect_same_loop_but_one_incident():
    run_id = f"mw_{uuid.uuid4().hex[:10]}"
    save_run(AgentRun(run_id=run_id, agent_id="a", org_id="test_org",
                      framework="langgraph", status="running", protection_mode="ACTIVE"))

    cfg_a = SLConfig(); cfg_a.repetition_threshold = 3
    cfg_b = SLConfig(); cfg_b.repetition_threshold = 3
    worker_a = DetectionEngine(sl_config=cfg_a)   # separate in-memory _emitted
    worker_b = DetectionEngine(sl_config=cfg_b)   # separate in-memory _emitted

    # Persist 3 identical events (as the collector does before evaluating).
    events = [_event(run_id, i) for i in range(1, 4)]
    for e in events:
        save_event(e)

    trip = events[-1]
    inc_a = worker_a.evaluate(trip)
    inc_b = worker_b.evaluate(trip)

    # Each worker detects independently — no shared in-memory state needed.
    assert inc_a, "worker A did not detect the loop"
    assert inc_b, "worker B did not detect the loop"
    assert inc_a[0].failure_type == "STUCK_LOOP"

    # Both workers persist their incident; the DB unique constraint dedups.
    for inc in inc_a + inc_b:
        save_incident(inc)

    assert _incident_count(run_id) == 1, "multi-worker produced duplicate incidents"
