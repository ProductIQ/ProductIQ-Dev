"""
ProductIQ — SSE Real-Time Agent Streaming Manager
streaming.py

Architecture:
  - Celery workers PUBLISH events to Redis channel: "sse:{run_id}"
  - FastAPI SSE endpoint SUBSCRIBES to that Redis channel
  - This cleanly separates the two processes — no cross-loop calls.

  Fallback: if Redis is unavailable, falls back to the in-process asyncio Queue
  (works when USE_CELERY=False and pipeline runs in BackgroundTasks).
"""

import asyncio
import json
from collections import defaultdict
from typing import Dict, List, AsyncGenerator
import structlog

logger = structlog.get_logger()


# ── In-process SSE Manager (used when USE_CELERY=False) ─────────────────────

class SSEManager:
    """
    In-process pub/sub using asyncio.Queue.
    Used when the pipeline runs directly in FastAPI BackgroundTasks.
    """

    def __init__(self):
        self._queues: Dict[str, List[asyncio.Queue]] = defaultdict(list)
        self._lock = asyncio.Lock()

    async def subscribe(self, run_id: str) -> asyncio.Queue:
        """Register a new subscriber for a run_id. Returns the subscriber queue."""
        queue: asyncio.Queue = asyncio.Queue(maxsize=500)
        async with self._lock:
            self._queues[run_id].append(queue)
        logger.debug("SSE subscriber added", run_id=run_id, total=len(self._queues[run_id]))
        return queue

    async def unsubscribe(self, run_id: str, queue: asyncio.Queue) -> None:
        """Remove a subscriber. Cleans up empty run_id entries."""
        async with self._lock:
            if run_id in self._queues:
                try:
                    self._queues[run_id].remove(queue)
                except ValueError:
                    pass
                if not self._queues[run_id]:
                    del self._queues[run_id]
        logger.debug("SSE subscriber removed", run_id=run_id)

    async def broadcast(self, run_id: str, data: str) -> None:
        """Push a JSON-encoded event string to all in-process subscribers of run_id."""
        if run_id not in self._queues:
            return
        async with self._lock:
            queues = list(self._queues.get(run_id, []))

        dead: List[asyncio.Queue] = []
        for queue in queues:
            try:
                queue.put_nowait(data)
            except asyncio.QueueFull:
                logger.warning("SSE queue full — dropping event", run_id=run_id)
                dead.append(queue)

        if dead:
            async with self._lock:
                for q in dead:
                    try:
                        self._queues[run_id].remove(q)
                    except ValueError:
                        pass

    def subscriber_count(self, run_id: str) -> int:
        return len(self._queues.get(run_id, []))

    # ── Typed broadcast helpers ───────────────────────────────────────────────

    async def broadcast_agent_update(
        self,
        run_id: str,
        agent_name: str,
        agent_number: int,
        status: str,
        progress_pct: int,
        output_preview: str | None = None,
    ) -> None:
        from datetime import datetime, timezone
        payload = json.dumps({
            "type": "agent_update",
            "run_id": run_id,
            "agent_name": agent_name,
            "agent_number": agent_number,
            "status": status,
            "progress_pct": progress_pct,
            "output_preview": output_preview,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })
        await self.broadcast(run_id, payload)

    async def broadcast_run_completed(self, run_id: str, pdf_url: str | None, pptx_url: str | None) -> None:
        payload = json.dumps({
            "type": "run_completed",
            "run_id": run_id,
            "pdf_url": pdf_url,
            "pptx_url": pptx_url,
        })
        await self.broadcast(run_id, payload)

    async def broadcast_run_failed(self, run_id: str, error: str) -> None:
        payload = json.dumps({
            "type": "run_failed",
            "run_id": run_id,
            "error": error,
        })
        await self.broadcast(run_id, payload)


# ── Redis-backed SSE Publisher (used by Celery workers) ──────────────────────

class RedisSSEPublisher:
    """
    Publishes SSE events to Redis channels.
    Called from Celery worker processes (which cannot touch the FastAPI event loop).
    Thread-safe, synchronous.
    """

    def publish(self, run_id: str, data: str) -> None:
        """
        Synchronously publish event data to Redis channel.
        Safe to call from any thread / Celery worker.
        """
        try:
            import redis
            from config import settings
            r = redis.from_url(settings.REDIS_URL, decode_responses=True)
            channel = f"sse:{run_id}"
            r.publish(channel, data)
            r.close()
        except Exception as exc:
            # Redis failure is non-critical — Supabase DB is source of truth
            logger.warning("Redis SSE publish failed", run_id=run_id, error=str(exc))

    def publish_agent_update(
        self,
        run_id: str,
        agent_name: str,
        agent_number: int,
        status: str,
        progress_pct: int,
    ) -> None:
        from datetime import datetime, timezone
        payload = json.dumps({
            "type": "agent_update",
            "run_id": run_id,
            "agent_name": agent_name,
            "agent_number": agent_number,
            "status": status,
            "progress_pct": progress_pct,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })
        self.publish(run_id, payload)

    def publish_run_completed(self, run_id: str, pdf_url: str | None, pptx_url: str | None) -> None:
        payload = json.dumps({
            "type": "run_completed",
            "run_id": run_id,
            "pdf_url": pdf_url,
            "pptx_url": pptx_url,
        })
        self.publish(run_id, payload)

    def publish_run_failed(self, run_id: str, error: str) -> None:
        payload = json.dumps({
            "type": "run_failed",
            "run_id": run_id,
            "error": error,
        })
        self.publish(run_id, payload)


# ── Redis-backed SSE Subscriber (used by FastAPI SSE endpoint) ────────────────

async def redis_event_generator(
    run_id: str,
    request,
    *,
    heartbeat_interval: int = 20,
) -> AsyncGenerator[dict, None]:
    """
    Subscribe to Redis pub/sub channel for a run_id and yield SSE events.
    Sends heartbeats every `heartbeat_interval` seconds to keep connections alive.
    Falls back to in-process queue if Redis is unavailable.
    """
    try:
        import redis.asyncio as aioredis
        from config import settings

        r = await aioredis.from_url(settings.REDIS_URL, decode_responses=True)
        pubsub = r.pubsub()
        channel = f"sse:{run_id}"
        await pubsub.subscribe(channel)
        logger.info("SSE Redis subscriber connected", run_id=run_id, channel=channel)

        try:
            while True:
                if await request.is_disconnected():
                    logger.debug("SSE client disconnected", run_id=run_id)
                    break

                # Poll with a short timeout to allow heartbeat injection
                try:
                    message = await asyncio.wait_for(
                        pubsub.get_message(ignore_subscribe_messages=True),
                        timeout=heartbeat_interval,
                    )
                except asyncio.TimeoutError:
                    message = None

                if message and message.get("data"):
                    data = message["data"]
                    yield {"data": data}

                    # Stop after terminal events
                    try:
                        parsed = json.loads(data)
                        if parsed.get("type") in ("run_completed", "run_failed"):
                            logger.info("SSE terminal event — closing stream", run_id=run_id)
                            break
                    except (json.JSONDecodeError, AttributeError):
                        pass
                else:
                    # Timeout expired — send heartbeat
                    yield {"data": json.dumps({"type": "heartbeat"})}

        finally:
            await pubsub.unsubscribe(channel)
            await pubsub.aclose()
            await r.aclose()
            logger.debug("SSE Redis connection cleaned up", run_id=run_id)

    except Exception as exc:
        logger.warning(
            "Redis SSE unavailable — falling back to in-process queue",
            run_id=run_id,
            error=str(exc),
        )
        # Fall back to in-process queue (works for direct/BackgroundTasks mode)
        async for event in _in_process_generator(run_id, request, heartbeat_interval=heartbeat_interval):
            yield event


async def _in_process_generator(
    run_id: str,
    request,
    *,
    heartbeat_interval: int = 20,
) -> AsyncGenerator[dict, None]:
    """Fallback: consume from the global in-process SSEManager queue."""
    queue = await sse_manager.subscribe(run_id)
    logger.info("SSE in-process subscriber connected", run_id=run_id)

    try:
        while True:
            if await request.is_disconnected():
                break

            try:
                data = await asyncio.wait_for(queue.get(), timeout=heartbeat_interval)
                yield {"data": data}

                try:
                    parsed = json.loads(data)
                    if parsed.get("type") in ("run_completed", "run_failed"):
                        logger.info("SSE terminal event — closing stream", run_id=run_id)
                        break
                except (json.JSONDecodeError, AttributeError):
                    pass

            except asyncio.TimeoutError:
                yield {"data": json.dumps({"type": "heartbeat"})}

    except asyncio.CancelledError:
        pass
    finally:
        await sse_manager.unsubscribe(run_id, queue)
        logger.debug("SSE in-process connection cleaned up", run_id=run_id)


# ── Global singletons ─────────────────────────────────────────────────────────

# Used by FastAPI BackgroundTasks pipeline (in-process mode)
sse_manager = SSEManager()

# Used by Celery workers to publish events to Redis
redis_publisher = RedisSSEPublisher()