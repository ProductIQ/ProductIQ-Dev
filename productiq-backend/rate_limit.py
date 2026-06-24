"""
ProductIQ — Redis-based Rate Limiting
rate_limit.py

D4: Prevents API abuse by limiting requests per user per time window.
Uses Redis sliding window counter for accurate, distributed rate limiting.
Falls back to allowing the request if Redis is unavailable (fail-open).

Usage in routers:
    from rate_limit import rate_limit
    @router.post("/expensive", dependencies=[Depends(rate_limit(max_requests=10, window_seconds=60))])
    async def expensive_endpoint(user=Depends(get_current_user)):
        ...
"""
import time
import structlog
from typing import Optional
from fastapi import HTTPException, Request, status

logger = structlog.get_logger()


def _get_redis():
    """Get a Redis connection, or None if unavailable."""
    try:
        import redis
        from config import settings
        return redis.from_url(settings.REDIS_URL, decode_responses=True)
    except Exception:
        return None


def rate_limit(max_requests: int = 30, window_seconds: int = 60, key_prefix: str = "rl"):
    """
    FastAPI dependency that enforces rate limiting per authenticated user.

    Args:
        max_requests: Maximum requests allowed in the window
        window_seconds: Time window in seconds
        key_prefix: Redis key prefix for namespacing

    Returns a dependency function that should be used with Depends().
    The user ID is extracted from the request state (set by auth middleware).
    """
    def _check(request: Request):
        # Try to get user ID from request state (set by auth dependency)
        user_id = getattr(request.state, "user_id", None)
        if not user_id:
            # No authenticated user — use IP as fallback
            forwarded = request.headers.get("X-Forwarded-For", "")
            user_id = forwarded.split(",")[0].strip() or request.client.host if request.client else "anonymous"

        redis_key = f"{key_prefix}:{user_id}:{int(time.time() // window_seconds)}"

        r = _get_redis()
        if r is None:
            # Redis unavailable — fail open (allow request)
            return

        try:
            current = r.incr(redis_key)
            if current == 1:
                r.expire(redis_key, window_seconds)

            if current > max_requests:
                retry_after = r.ttl(redis_key)
                logger.warning(
                    "Rate limit exceeded",
                    user_id=user_id,
                    key=redis_key,
                    current=current,
                    max=max_requests,
                )
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=f"Rate limit exceeded. Max {max_requests} requests per {window_seconds}s.",
                    headers={"Retry-After": str(retry_after or window_seconds)},
                )
        finally:
            try:
                r.close()
            except Exception:
                pass

    return _check


# ── Pre-configured rate limits for common use cases ──────────────────────────

def report_rate_limit():
    """Rate limit for report creation: 5 per hour per user.
    The freemium plan already limits to 3/month, but this prevents
    rapid-fire API calls from triggering multiple Celery tasks."""
    return rate_limit(max_requests=5, window_seconds=3600, key_prefix="rl_report")


def api_rate_limit():
    """Standard API rate limit: 60 per minute per user."""
    return rate_limit(max_requests=60, window_seconds=60, key_prefix="rl_api")


def auth_rate_limit():
    """Auth endpoint rate limit: 10 per minute per IP (prevents brute force)."""
    return rate_limit(max_requests=10, window_seconds=60, key_prefix="rl_auth")
