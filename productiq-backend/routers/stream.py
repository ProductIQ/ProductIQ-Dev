"""
ProductIQ — SSE Streaming Router
GET /api/stream/{run_id}  — Real-time agent progress via Server-Sent Events

Event types emitted:
  agent_update   : {run_id, agent_name, agent_number, status, progress_pct, timestamp}
  run_completed  : {run_id, pdf_url, pptx_url}
  run_failed     : {run_id, error}
  heartbeat      : {} (every 20s to keep proxy connections alive)

Authentication:
  Option A (recommended): Authorization: Bearer <token> header
  Option B: ?token=<jwt>  query parameter
  (Option B is required for native browser EventSource which cannot set headers)

Pub/Sub model:
  - WITH Redis  (USE_CELERY=True):  uses Redis pub/sub channel "sse:{run_id}"
  - WITHOUT Redis (USE_CELERY=False): uses in-process asyncio.Queue via SSEManager
"""

import json
import structlog

from fastapi import APIRouter, Request, HTTPException, Header, Query
from sse_starlette.sse import EventSourceResponse
from typing import Optional

from streaming import redis_event_generator, sse_manager

logger = structlog.get_logger()
router = APIRouter()


def _verify_token(token: str) -> object:
    """Validate Supabase JWT and return the user object."""
    from database import get_supabase
    db = get_supabase()
    token = token.replace("Bearer ", "").strip()
    if not token:
        raise HTTPException(status_code=401, detail="Missing authentication token")
    try:
        result = db.auth.get_user(token)
        if not result or not result.user:
            raise ValueError("No user in token response")
        return result.user
    except Exception as exc:
        logger.warning("Token verification failed", error=str(exc))
        raise HTTPException(status_code=401, detail="Invalid or expired token")


@router.get("/{run_id}", summary="SSE stream for real-time agent progress")
async def stream_run_progress(
    run_id: str,
    request: Request,
    authorization: Optional[str] = Header(
        default=None,
        description="Bearer <Supabase JWT>. Use this OR the 'token' query param."
    ),
    token: Optional[str] = Query(
        default=None,
        description="Supabase JWT as query param (for native EventSource clients)."
    ),
):
    """
    Connect from the browser:
        // With header (fetch-based EventSource polyfill):
        Authorization: Bearer <jwt>

        // With query param (native EventSource):
        const es = new EventSource(`/api/stream/${runId}?token=${jwt}`)
    """
    # ── Resolve token from header OR query param ──────────────────────────────
    raw_token = token or (authorization or "").replace("Bearer ", "").strip()
    if not raw_token:
        raise HTTPException(
            status_code=401,
            detail="Authentication required. Pass token via Authorization header or ?token= query param."
        )

    user = _verify_token(raw_token)

    # ── Verify run ownership ──────────────────────────────────────────────────
    from database import get_supabase
    db = get_supabase()

    run = (
        db.table("agent_runs")
        .select("id, user_id, status, error_message")
        .eq("id", run_id)
        .maybe_single()
        .execute()
        .data
    )
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
    if str(run["user_id"]) != str(user.id):
        raise HTTPException(status_code=403, detail="Access forbidden")

    # ── Already-finished run: send one terminal event and close ───────────────
    if run["status"] in ("completed", "failed"):
        report = None
        if run["status"] == "completed":
            try:
                report = (
                    db.table("reports")
                    .select("pdf_url, pptx_url")
                    .eq("run_id", run_id)
                    .maybe_single()
                    .execute()
                    .data
                )
            except Exception:
                pass

        async def _immediate():
            if run["status"] == "completed":
                yield {
                    "data": json.dumps({
                        "type": "run_completed",
                        "run_id": run_id,
                        "pdf_url": (report or {}).get("pdf_url"),
                        "pptx_url": (report or {}).get("pptx_url"),
                    })
                }
            else:
                yield {
                    "data": json.dumps({
                        "type": "run_failed",
                        "run_id": run_id,
                        "error": run.get("error_message") or "Unknown error",
                    })
                }

        logger.info("Returning immediate SSE for finished run", run_id=run_id, status=run["status"])
        return EventSourceResponse(_immediate())

    # ── Live stream — choose Redis or in-process based on config ──────────────
    from config import settings
    logger.info("Opening SSE stream", run_id=run_id, user=user.id, use_celery=settings.USE_CELERY)

    if settings.USE_CELERY:
        # Celery mode: read from Redis pub/sub
        return EventSourceResponse(
            redis_event_generator(run_id, request, heartbeat_interval=20)
        )
    else:
        # Direct mode: read from in-process asyncio.Queue
        import asyncio

        async def _direct_generator():
            queue = await sse_manager.subscribe(run_id)
            try:
                while True:
                    if await request.is_disconnected():
                        break
                    try:
                        data = await asyncio.wait_for(queue.get(), timeout=20)
                        yield {"data": data}
                        try:
                            if json.loads(data).get("type") in ("run_completed", "run_failed"):
                                break
                        except (json.JSONDecodeError, AttributeError):
                            pass
                    except asyncio.TimeoutError:
                        yield {"data": json.dumps({"type": "heartbeat"})}
            except asyncio.CancelledError:
                pass
            finally:
                await sse_manager.unsubscribe(run_id, queue)
                logger.debug("SSE direct connection closed", run_id=run_id)

        return EventSourceResponse(_direct_generator())


@router.get("/{run_id}/subscribers", summary="Debug: SSE subscriber count")
async def get_subscriber_count(
    run_id: str,
    authorization: Optional[str] = Header(default=None),
    token: Optional[str] = Query(default=None),
):
    """Returns the current in-process SSE subscriber count for a run. For debugging."""
    raw_token = token or (authorization or "").replace("Bearer ", "").strip()
    if not raw_token:
        raise HTTPException(status_code=401, detail="Authentication required")
    _verify_token(raw_token)
    return {
        "run_id": run_id,
        "subscribers": sse_manager.subscriber_count(run_id),
        "mode": "celery+redis" if __import__("config").settings.USE_CELERY else "direct",
    }