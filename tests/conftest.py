import pytest
import psycopg2
from agentfuse.config import settings

@pytest.fixture(scope="session", autouse=True)
def check_postgres_connection():
    """Fail fast with a clear message if PostgreSQL is unreachable."""
    db_url = settings.DATABASE_URL
    try:
        conn = psycopg2.connect(db_url, connect_timeout=3)
        conn.close()
    except Exception as exc:
        pytest.exit(
            f"\n[FATAL] PostgreSQL is unreachable at {db_url} (connect_timeout=3s).\n"
            f"Error: {exc}\n"
            f"Please ensure PostgreSQL is running before executing tests.\n",
            returncode=1
        )

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
