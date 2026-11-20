"""
SSE fan-out bus (ADR-004 §7.2): org-scoped delivery (no cross-tenant leak) in
both the in-process and Redis-backed modes.
"""
import asyncio

import pytest

from agentfuse.server import sse_bus
from agentfuse.config import settings

REDIS_URL = "redis://localhost:6379/0"


@pytest.fixture(autouse=True)
def _reset_bus():
    sse_bus._local.clear()
    if sse_bus._subscriber_task:
        sse_bus._subscriber_task.cancel()
    sse_bus._subscriber_task = None
    sse_bus._redis = None
    sse_bus._loop = None
    settings.REDIS_URL = ""
    yield
    sse_bus._local.clear()
    if sse_bus._subscriber_task:
        sse_bus._subscriber_task.cancel()
    sse_bus._subscriber_task = None
    sse_bus._redis = None
    settings.REDIS_URL = ""


@pytest.mark.asyncio
async def test_bus_is_org_scoped_in_process():
    await sse_bus.start()  # REDIS_URL empty -> in-process fan-out
    _, qa = sse_bus.register_client("org_a")
    _, qb = sse_bus.register_client("org_b")

    sse_bus.publish("org_a", "incident_created", {"incident_id": "i1"}, run_id="r1")
    await asyncio.sleep(0.1)

    assert qa.qsize() == 1, "owner org did not receive its event"
    assert qb.qsize() == 0, "CROSS-ORG SSE LEAK (in-process)"
    assert qa.get_nowait()["event"] == "incident_created"


@pytest.mark.asyncio
async def test_bus_run_scoped_and_org_default():
    await sse_bus.start()
    _, q_org = sse_bus.register_client("org_a")            # org-wide stream
    _, q_run = sse_bus.register_client("org_a", "run_1")   # a specific run
    _, q_other = sse_bus.register_client("org_a", "run_2")

    sse_bus.publish("org_a", "run_status_changed", {"run_id": "run_1"}, run_id="run_1")
    await asyncio.sleep(0.1)

    assert q_org.qsize() == 1    # org-wide sees all its runs
    assert q_run.qsize() == 1    # the matching run stream sees it
    assert q_other.qsize() == 0  # a different run stream does not


@pytest.mark.asyncio
async def test_bus_redis_roundtrip_and_isolation():
    import redis as sync_redis
    try:
        sync_redis.from_url(REDIS_URL).ping()
    except Exception:
        pytest.skip("redis not reachable on localhost:6379")

    settings.REDIS_URL = REDIS_URL
    await sse_bus.start()          # starts the Redis subscriber + sync publisher
    await asyncio.sleep(0.3)       # let psubscribe establish

    _, qa = sse_bus.register_client("org_a")
    _, qb = sse_bus.register_client("org_b")

    sse_bus.publish("org_a", "run_status_changed", {"status": "paused"})
    await asyncio.sleep(0.4)       # Redis publish -> subscriber -> local queue

    assert qa.qsize() == 1, "event not delivered via Redis"
    assert qb.qsize() == 0, "CROSS-ORG SSE LEAK (redis)"
    await sse_bus.stop()
