"""
ProductIQ — AI Observability
observability.py

D6: Tracks LLM token usage, latency, and errors across all Gemini calls.
Provides structured logging and optional Redis-based metrics aggregation
for dashboards and cost monitoring.

Usage:
    from observability import track_llm_call, get_usage_summary

    # Automatic tracking via wrapper:
    result = track_llm_call(
        model="gemini-2.5-flash",
        agent_name="Review Miner",
        run_id="run-123",
        fn=model.generate_content,
        prompt=prompt_text,
    )

    # Or manual tracking:
    from observability import log_llm_usage
    log_llm_usage(model="gemini-2.5-flash", agent="Insight", run_id="run-123",
                  input_tokens=1200, output_tokens=800, latency_ms=2300, status="ok")
"""
import time
import json
import structlog
from typing import Optional, Callable, Any, Dict
from datetime import datetime, timezone

logger = structlog.get_logger()


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _get_redis():
    """Get a Redis connection, or None if unavailable."""
    try:
        import redis
        from config import settings
        return redis.from_url(settings.REDIS_URL, decode_responses=True)
    except Exception:
        return None


def log_llm_usage(
    model: str,
    agent: str,
    run_id: Optional[str] = None,
    input_tokens: int = 0,
    output_tokens: int = 0,
    latency_ms: int = 0,
    status: str = "ok",
    error: Optional[str] = None,
    api_key_suffix: Optional[str] = None,
) -> None:
    """Log an LLM call to structured logging + Redis metrics.

    Args:
        model: The model name (e.g., "gemini-2.5-flash")
        agent: Agent name that made the call
        run_id: Associated run ID (if any)
        input_tokens: Prompt token count
        output_tokens: Response token count
        latency_ms: Call duration in milliseconds
        status: "ok", "error", "rate_limited", "timeout"
        error: Error message if status != "ok"
        api_key_suffix: Last 6 chars of the API key used (for rotation debugging)
    """
    total_tokens = input_tokens + output_tokens

    # Structured log entry
    log_data = {
        "model": model,
        "agent": agent,
        "run_id": run_id,
        "input_tokens": input_tokens,
        "output_tokens": output_tokens,
        "total_tokens": total_tokens,
        "latency_ms": latency_ms,
        "status": status,
        "timestamp": _utc_now(),
    }
    if error:
        log_data["error"] = error[:200]
    if api_key_suffix:
        log_data["key"] = api_key_suffix

    if status == "ok":
        logger.info("llm_call", **log_data)
    elif status == "rate_limited":
        logger.warning("llm_rate_limited", **log_data)
    else:
        logger.error("llm_call_failed", **log_data)

    # Push to Redis for aggregation (non-critical)
    r = _get_redis()
    if r is None:
        return
    try:
        # Daily aggregation key
        date_key = datetime.now(timezone.utc).strftime("%Y%m%d")
        metrics_key = f"llm_metrics:{date_key}"

        # Increment counters
        pipe = r.pipeline()
        pipe.hincrby(metrics_key, f"{model}:calls", 1)
        pipe.hincrby(metrics_key, f"{model}:input_tokens", input_tokens)
        pipe.hincrby(metrics_key, f"{model}:output_tokens", output_tokens)
        pipe.hincrby(metrics_key, f"{model}:total_tokens", total_tokens)
        pipe.hincrby(metrics_key, f"{model}:latency_ms_total", latency_ms)
        if status != "ok":
            pipe.hincrby(metrics_key, f"{model}:errors", 1)
        if run_id:
            pipe.sadd(f"run_llm_calls:{run_id}", json.dumps({
                "model": model, "agent": agent, "run_id": run_id,
                "input_tokens": input_tokens, "output_tokens": output_tokens,
                "total_tokens": total_tokens, "latency_ms": latency_ms,
                "status": status, "error": error, "timestamp": _utc_now(),
            }))
        pipe.expire(metrics_key, 86400 * 30)  # 30 day retention
        pipe.execute()
    except Exception as exc:
        logger.debug("Redis metrics push failed", error=str(exc)[:80])
    finally:
        try:
            r.close()
        except Exception:
            pass


def track_llm_call(
    model: str,
    agent: str,
    fn: Callable,
    run_id: Optional[str] = None,
    api_key_suffix: Optional[str] = None,
    **fn_kwargs,
) -> Any:
    """Wrap an LLM call with automatic observability tracking.

    Usage:
        result = track_llm_call(
            model="gemini-2.5-flash",
            agent="Review Miner",
            run_id=run_id,
            fn=model.generate_content,
            prompt=prompt_text,
        )
    """
    start = time.perf_counter()
    status = "ok"
    error_msg = None
    input_tokens = 0
    output_tokens = 0

    try:
        result = fn(**fn_kwargs)

        # Try to extract token usage from the response
        try:
            if hasattr(result, "usage_metadata"):
                usage = result.usage_metadata
                input_tokens = getattr(usage, "prompt_token_count", 0) or 0
                output_tokens = getattr(usage, "candidates_token_count", 0) or 0
            elif isinstance(result, dict) and "usage" in result:
                usage = result["usage"]
                input_tokens = usage.get("prompt_tokens", 0)
                output_tokens = usage.get("completion_tokens", 0)
        except Exception:
            pass

        return result

    except Exception as exc:
        error_str = str(exc).lower()
        if any(kw in error_str for kw in ("429", "resource_exhausted", "quota", "rate limit")):
            status = "rate_limited"
        elif "timeout" in error_str or "deadline" in error_str:
            status = "timeout"
        else:
            status = "error"
        error_msg = str(exc)[:200]
        raise

    finally:
        latency_ms = int((time.perf_counter() - start) * 1000)
        log_llm_usage(
            model=model,
            agent=agent,
            run_id=run_id,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            latency_ms=latency_ms,
            status=status,
            error=error_msg,
            api_key_suffix=api_key_suffix,
        )


def get_usage_summary(date: Optional[str] = None) -> Dict[str, Any]:
    """Get aggregated LLM usage metrics for a specific date.

    Args:
        date: Date string in YYYYMMDD format. Defaults to today.

    Returns:
        Dict mapping model names to their usage stats.
    """
    if date is None:
        date = datetime.now(timezone.utc).strftime("%Y%m%d")

    r = _get_redis()
    if r is None:
        return {"error": "Redis unavailable"}

    try:
        metrics_key = f"llm_metrics:{date}"
        raw = r.hgetall(metrics_key)
        if not raw:
            return {"date": date, "models": {}}

        # Parse into structured format
        models: Dict[str, Dict[str, int]] = {}
        for key, val in raw.items():
            model_name, metric = key.split(":", 1)
            if model_name not in models:
                models[model_name] = {}
            models[model_name][metric] = int(val)

        # Compute averages
        for model_name, stats in models.items():
            calls = stats.get("calls", 0)
            if calls > 0:
                stats["avg_latency_ms"] = round(stats.get("latency_ms_total", 0) / calls, 1)
                stats["avg_tokens_per_call"] = round(stats.get("total_tokens", 0) / calls, 1)

        return {"date": date, "models": models}
    except Exception as exc:
        return {"error": str(exc)}
    finally:
        try:
            r.close()
        except Exception:
            pass


def get_run_llm_calls(run_id: str) -> list:
    """Get all LLM calls made during a specific run."""
    r = _get_redis()
    if r is None:
        return []

    try:
        key = f"run_llm_calls:{run_id}"
        raw_calls = r.smembers(key)
        calls = []
        for raw in raw_calls:
            try:
                calls.append(json.loads(raw))
            except Exception:
                pass
        # Sort by timestamp
        calls.sort(key=lambda c: c.get("timestamp", ""))
        return calls
    except Exception:
        return []
    finally:
        try:
            r.close()
        except Exception:
            pass
