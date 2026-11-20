"""
Detector per-event overhead.

The StuckLoopDetector is Postgres-backed: every evaluate() issues one indexed
SELECT on events(run_id). This measures realistic per-event overhead and reports
p50/p95/p99 (never a single mean, per the latency-reporting standard). It does
NOT assert "sub-millisecond" — that only ever held for the old in-memory
detector; the DB round-trip is real and is part of the end-to-end pipeline.
"""
import time
import uuid

import pytest

from agentfuse.detection.engine import DetectionEngine
from agentfuse.models.events import RuntimeEvent
from agentfuse.models.run import AgentRun
from agentfuse.storage.postgres import init_db, save_run, save_event


@pytest.fixture(autouse=True)
def _schema():
    init_db()
    yield


def _pct(values, p):
    s = sorted(values)
    k = int(round((p / 100.0) * (len(s) - 1)))
    return s[k]


def _event(run_id, seq):
    return RuntimeEvent(
        framework="langgraph", run_id=run_id, agent_id="perf_agent",
        event_type="TOOL_CALL_COMPLETED", status="success", sequence_number=seq,
        idempotency_key=f"{run_id}_{seq}", tool="tool_X",
        arguments_hash="args_X", response_hash="resp_X",
    )


def test_performance_detector_overhead():
    run_id = f"perf_{uuid.uuid4().hex[:8]}"
    save_run(AgentRun(
        run_id=run_id, agent_id="perf_agent", org_id="perf_org",
        framework="langgraph", status="running", protection_mode="ACTIVE",
    ))
    # A couple of prior events so the query returns rows but stays below the
    # default threshold (no match -> measures the pure detection SELECT path).
    for i in range(1, 3):
        save_event(_event(run_id, i))

    engine = DetectionEngine()
    probe = _event(run_id, 999)  # not persisted; evaluated repeatedly

    N = 1000
    latencies_ms = []
    for _ in range(N):
        t0 = time.perf_counter()
        engine.evaluate(probe)
        latencies_ms.append((time.perf_counter() - t0) * 1000.0)

    p50, p95, p99 = _pct(latencies_ms, 50), _pct(latencies_ms, 95), _pct(latencies_ms, 99)
    print(f"detector per-event overhead over {N} calls: "
          f"p50={p50:.3f}ms p95={p95:.3f}ms p99={p99:.3f}ms")

    # Realistic budget for one indexed SELECT over a warm local pool.
    assert p95 < 25.0, f"detector p95 overhead too high: {p95:.3f}ms"
    assert p99 < 50.0, f"detector p99 overhead too high: {p99:.3f}ms"
