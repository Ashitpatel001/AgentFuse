import pytest

@pytest.fixture(autouse=True)
def reset_collector_state():
    """Ensure singleton collector state and queues are clean before and after each test."""
    try:
        from agentfuse.runtime.collector import collector
        collector._queue.join()
        if hasattr(collector.engine, "_emitted"):
            collector.engine._emitted.clear()
        if hasattr(collector.engine, "detectors"):
            for d in collector.engine.detectors:
                if hasattr(d, "state"):
                    d.state.clear()
                if hasattr(d, "runs"):
                    d.runs.clear()
                if hasattr(d, "budgets"):
                    d.budgets.clear()
                if hasattr(d, "config") and hasattr(d.config, "repetition_threshold"):
                    d.config.repetition_threshold = 4
    except Exception:
        pass

    yield

    try:
        from agentfuse.runtime.collector import collector
        collector._queue.join()
    except Exception:
        pass
