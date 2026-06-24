"""
ProductIQ — Redis Cache for Hot Paths
cache.py

D5: Simple Redis-backed cache with TTL for frequently-accessed data.
Falls back to no caching if Redis is unavailable (fail-open).

Usage:
    from cache import cached

    @cached(key="profile:{user_id}", ttl=300)
    def get_profile_cached(user_id: str):
        return db.table("profiles").select("*").eq("id", user_id).execute().data

Or use the cache helper directly:
    from cache import cache_get, cache_set, cache_delete
    data = cache_get("profile:123") or fetch_from_db()
    cache_set("profile:123", data, ttl=300)
"""
import json
import structlog
from typing import Optional, Any, Callable

logger = structlog.get_logger()


def _get_redis():
    """Get a Redis connection, or None if unavailable."""
    try:
        import redis
        from config import settings
        return redis.from_url(settings.REDIS_URL, decode_responses=True)
    except Exception:
        return None


def cache_get(key: str) -> Optional[Any]:
    """Get a value from cache. Returns None on miss or Redis failure."""
    r = _get_redis()
    if r is None:
        return None
    try:
        raw = r.get(key)
        if raw:
            return json.loads(raw)
        return None
    except Exception as exc:
        logger.debug("Cache get failed", key=key, error=str(exc)[:80])
        return None
    finally:
        try:
            r.close()
        except Exception:
            pass


def cache_set(key: str, value: Any, ttl: int = 300) -> bool:
    """Set a value in cache with TTL in seconds. Returns False on failure."""
    r = _get_redis()
    if r is None:
        return False
    try:
        r.setex(key, ttl, json.dumps(value, default=str))
        return True
    except Exception as exc:
        logger.debug("Cache set failed", key=key, error=str(exc)[:80])
        return False
    finally:
        try:
            r.close()
        except Exception:
            pass


def cache_delete(key: str) -> bool:
    """Delete a key from cache. Returns False on failure."""
    r = _get_redis()
    if r is None:
        return False
    try:
        r.delete(key)
        return True
    except Exception:
        return False
    finally:
        try:
            r.close()
        except Exception:
            pass


def cache_delete_pattern(pattern: str) -> int:
    """Delete all keys matching a pattern (e.g., 'profile:*'). Returns count deleted."""
    r = _get_redis()
    if r is None:
        return 0
    try:
        keys = r.keys(pattern)
        if keys:
            r.delete(*keys)
        return len(keys)
    except Exception:
        return 0
    finally:
        try:
            r.close()
        except Exception:
            pass


def cached(key: str, ttl: int = 300):
    """
    Decorator that caches the result of a function.

    The key can contain {placeholder} patterns that are filled from
    the function's arguments.

    Usage:
        @cached(key="profile:{user_id}", ttl=300)
        def get_profile(user_id: str):
            ...

    Note: The function must accept keyword arguments matching the placeholders.
    """
    def decorator(fn: Callable) -> Callable:
        def wrapper(*args, **kwargs):
            # Build the cache key from kwargs
            try:
                resolved_key = key.format(**kwargs)
            except (KeyError, IndexError):
                # If key formatting fails, just call the function
                return fn(*args, **kwargs)

            # Try cache first
            cached_val = cache_get(resolved_key)
            if cached_val is not None:
                logger.debug("Cache hit", key=resolved_key)
                return cached_val

            # Cache miss — call the function
            result = fn(*args, **kwargs)

            # Cache the result (even if None — prevents repeated DB queries for missing data)
            cache_set(resolved_key, result, ttl=ttl)

            return result

        wrapper.__name__ = fn.__name__
        wrapper.__doc__ = fn.__doc__
        return wrapper

    return decorator
