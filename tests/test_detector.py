"""
StuckLoop / Budget detector tests.

The StuckLoopDetector is Postgres-backed: it counts consecutive repetitions by
querying the persisted `events` table for the run, so a valid test must persist
each event (exactly as the collector does: save_event THEN engine.evaluate)
before evaluating it. Each test uses a unique run_id so the per-run queries are
naturally isolated from other tests.
"""
import uuid

import pytest

from cortexheal.models.events import RuntimeEvent
from cortexheal.models.run import AgentRun
from cortexheal.detection.engine import DetectionEngine
from cortexheal.detection.stuck_loop import Config as SLConfig
from cortexheal.detection.budget import BudgetConfig
from cortexheal.storage.postgres import init_db, save_run, save_event


@pytest.fixture(autouse=True)
def _schema():
    init_db()
    yield


def new_run() -> str:
    run_id = f"det_{uuid.uuid4().hex[:10]}"
    save_run(AgentRun(
        run_id=run_id, agent_id="agent_1", org_id="test_org",
        framework="langgraph", status="running", protection_mode="ACTIVE",
    ))
    return run_id


def make_event(run_id, seq, event_type, tool=None, args_hash=None, resp_hash=None, cost=None):
    return RuntimeEvent(
        framework="langgraph",
        run_id=run_id,
        agent_id="agent_1",
        event_type=event_type,
        status="success",
        sequence_number=seq,
        idempotency_key=f"{run_id}_{seq}_{uuid.uuid4().hex[:6]}",
        tool=tool,
        arguments_hash=args_hash,
        response_hash=resp_hash,
        cost=cost,
    )


def feed(engine, events):
    """Persist each event (like the collector) then evaluate it; collect incidents."""
    incidents = []
    for e in events:
        save_event(e)
        incidents.extend(engine.evaluate(e))
    return incidents


def test_A_healthy_agent():
    run_id = new_run()
    engine = DetectionEngine()
    events = [
        make_event(run_id, 1, "TOOL_CALL_COMPLETED", "tool_a", "args_1", "resp_1"),
        make_event(run_id, 2, "TOOL_CALL_COMPLETED", "tool_b", "args_2", "resp_2"),
        make_event(run_id, 3, "TOOL_CALL_COMPLETED", "tool_a", "args_3", "resp_3"),
    ]
    assert len(feed(engine, events)) == 0


def test_B_exact_stuck_loop():
    run_id = new_run()
    config = SLConfig()
    config.repetition_threshold = 3
    engine = DetectionEngine(sl_config=config)
    events = [make_event(run_id, i, "TOOL_CALL_COMPLETED", "tool_a", "hash_a", "hash_r")
              for i in range(1, 4)]

    incidents = feed(engine, events)

    assert len(incidents) == 1
    assert incidents[0].failure_type == "STUCK_LOOP"
    # Exactly 3 identical calls -> reports exactly 3 (no off-by-one over-count).
    assert incidents[0].evidence["repetitions"] == 3


def test_B_no_false_positive_below_threshold():
    """Regression lock for the off-by-one: threshold=3 must NOT trip on 2 calls."""
    run_id = new_run()
    config = SLConfig()
    config.repetition_threshold = 3
    engine = DetectionEngine(sl_config=config)
    events = [make_event(run_id, i, "TOOL_CALL_COMPLETED", "tool_a", "hash_a", "hash_r")
              for i in range(1, 3)]  # only 2 identical calls

    assert len(feed(engine, events)) == 0


def test_C_legitimate_repeated_tool():
    run_id = new_run()
    config = SLConfig()
    config.repetition_threshold = 3
    config.ignored_tools = ["poll_status"]
    engine = DetectionEngine(sl_config=config)
    events = [make_event(run_id, i, "TOOL_CALL_COMPLETED", "poll_status", "hash_a", "hash_r")
              for i in range(1, 4)]

    assert len(feed(engine, events)) == 0


def test_D_budget_exceeded():
    run_id = new_run()
    config = BudgetConfig()
    config.max_cost_usd = 1.00
    engine = DetectionEngine(budget_config=config)
    events = [
        make_event(run_id, 1, "LLM_CALL_COMPLETED", cost=0.50),
        make_event(run_id, 2, "LLM_CALL_COMPLETED", cost=0.40),
        make_event(run_id, 3, "LLM_CALL_COMPLETED", cost=0.20),
    ]

    incidents = feed(engine, events)

    assert len(incidents) == 1
    assert incidents[0].failure_type == "BUDGET_EXCEEDED"
    assert incidents[0].observed_value == 1.10


def test_E_different_runs():
    config = SLConfig()
    config.repetition_threshold = 2
    engine = DetectionEngine(sl_config=config)

    run_1 = new_run()
    run_2 = new_run()
    i1 = feed(engine, [make_event(run_1, i, "TOOL_CALL_COMPLETED", "tool_a", "hash_a", "hash_r")
                       for i in range(1, 3)])
    i2 = feed(engine, [make_event(run_2, i, "TOOL_CALL_COMPLETED", "tool_a", "hash_a", "hash_r")
                       for i in range(1, 3)])

    assert len(i1) == 1
    assert len(i2) == 1
    assert i1[0].run_id == run_1
    assert i2[0].run_id == run_2


def test_F_recovery_after_repetition():
    run_id = new_run()
    config = SLConfig()
    config.repetition_threshold = 3
    engine = DetectionEngine(sl_config=config)
    events = [
        make_event(run_id, 1, "TOOL_CALL_COMPLETED", "tool_a", "hash_a", "hash_r"),
        make_event(run_id, 2, "TOOL_CALL_COMPLETED", "tool_a", "hash_a", "hash_r"),
        make_event(run_id, 3, "TOOL_CALL_COMPLETED", "tool_b", "hash_b", "hash_r2"),  # break
        make_event(run_id, 4, "TOOL_CALL_COMPLETED", "tool_a", "hash_a", "hash_r"),
    ]

    # Sequence was broken before hitting 3 consecutive.
    assert len(feed(engine, events)) == 0


def test_H_many_repetitions_one_incident():
    run_id = new_run()
    config = SLConfig()
    config.repetition_threshold = 8
    engine = DetectionEngine(sl_config=config)
    events = [make_event(run_id, i, "TOOL_CALL_COMPLETED", "tool_x", "hash_x", "hash_r")
              for i in range(1, 201)]

    incidents = feed(engine, events)

    # Engine-level dedup: many repetitions -> exactly one incident.
    assert len(incidents) == 1
    assert incidents[0].failure_type == "STUCK_LOOP"
    assert incidents[0].evidence["repetitions"] == 8
