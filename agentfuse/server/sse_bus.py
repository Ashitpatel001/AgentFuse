"""
SSE fan-out bus (ADR-004 §7.2).

Two responsibilities:
  1. Horizontal scale: when REDIS_URL is set, events are published to Redis
     pub/sub so any API replica can deliver them to its locally-connected
     clients. Without Redis, it degrades to in-process fan-out (single replica).
  2. Tenant isolation: events are published on a PER-ORG channel and delivered
     only to that org's local clients. A dashboard can never receive another
     org's real-time events. (The previous global fan-out leaked across tenants.)

Publishing is called from arbitrary threads (the telemetry worker, request
handlers). With Redis, publish() is a synchronous, thread-safe Redis call and
local delivery happens inside the async subscriber (same loop as the client
queues). Without Redis, delivery is marshalled onto the loop via
call_soon_threadsafe, so asyncio.Queue is only ever touched from its own loop.
"""
import asyncio
import json
import logging
import threading
from typing import Optional

from agentfuse.config import settings

logger = logging.getLogger(__name__)

_CHANNEL_PREFIX = "agentfuse:sse:"
_ORG_KEY = "__org__"  # org-wide subscription (the dashboard's default stream)

# local registry: {(org_id, key): set[asyncio.Queue]}
_local = {}
_lock = threading.Lock()

_loop = None            # main event loop (captured at startup)
_redis = None           # sync client for publishing
_redis_async = None     # async client for the subscriber
_subscriber_task = None


def redis_enabled() -> bool:
    return bool(getattr(settings, "REDIS_URL", ""))


def register_client(org_id: str, run_id: Optional[str] = None):
    """Register a local SSE client; returns (key, queue)."""
    key = run_id if run_id else _ORG_KEY
    q: asyncio.Queue = asyncio.Queue(maxsize=100)
    with _lock:
        _local.setdefault((org_id, key), set()).add(q)
    return key, q


def unregister_client(org_id: str, key: str, q: asyncio.Queue):
    with _lock:
        s = _local.get((org_id, key))
        if s:
            s.discard(q)
            if not s:
                _local.pop((org_id, key), None)


def _deliver_local(org_id: str, message: dict, keys):
    """Deliver to local queues for this org. Must run on the event loop."""
    with _lock:
        for key in keys:
            for q in list(_local.get((org_id, key), ())):
                try:
                    q.put_nowait(message)
                except asyncio.QueueFull:
                    pass  # slow client; drop rather than block the fan-out


def publish(org_id: str, event_type: str, data: dict, run_id: Optional[str] = None):
    """Fan an event out to an org's connected dashboards (this replica + others)."""
    if not org_id:
        return
    message = {"event": event_type, "data": data}
    keys = [_ORG_KEY] + ([run_id] if run_id else [])

    if redis_enabled() and _redis is not None:
        try:
            _redis.publish(_CHANNEL_PREFIX + org_id,
                           json.dumps({"message": message, "keys": keys}))
            return
        except Exception as e:
            logger.warning(f"SSE redis publish failed, falling back to local: {e}")

    # In-process fallback: marshal onto the loop so the queue is touched safely.
    if _loop is not None:
        try:
            _loop.call_soon_threadsafe(_deliver_local, org_id, message, keys)
            return
        except RuntimeError:
            pass
    _deliver_local(org_id, message, keys)


async def _subscribe_loop():
    import redis.asyncio as aioredis
    global _redis_async
    _redis_async = aioredis.from_url(settings.REDIS_URL)
    pubsub = _redis_async.pubsub()
    await pubsub.psubscribe(_CHANNEL_PREFIX + "*")
    logger.info("SSE bus: subscribed to Redis %s*", _CHANNEL_PREFIX)
    try:
        async for msg in pubsub.listen():
            if msg.get("type") != "pmessage":
                continue
            channel = msg["channel"]
            if isinstance(channel, (bytes, bytearray)):
                channel = channel.decode()
            org_id = channel[len(_CHANNEL_PREFIX):]
            try:
                payload = json.loads(msg["data"])
                _deliver_local(org_id, payload["message"], payload["keys"])
            except Exception as e:
                logger.warning(f"SSE bus: bad message on {channel}: {e}")
    except asyncio.CancelledError:
        await pubsub.close()
        raise


async def start():
    """Capture the loop and, if Redis is configured, launch the subscriber."""
    global _loop, _redis, _subscriber_task
    _loop = asyncio.get_event_loop()
    if redis_enabled():
        import redis as sync_redis
        _redis = sync_redis.from_url(settings.REDIS_URL)
        _subscriber_task = asyncio.create_task(_subscribe_loop())
        return _subscriber_task
    logger.info("SSE bus: REDIS_URL unset -> in-process fan-out (single replica)")
    return None


async def stop():
    global _subscriber_task
    if _subscriber_task:
        _subscriber_task.cancel()
        _subscriber_task = None
