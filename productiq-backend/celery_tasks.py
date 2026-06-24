"""
ProductIQ — Celery Tasks
All async task wrappers for CrewAI crew executions.

SSE event publishing from Celery workers:
  Workers publish events to Redis channels via RedisSSEPublisher.
  FastAPI SSE endpoint subscribes to Redis — clean process separation.
  If Redis is unavailable, events are silently dropped (DB is the source of truth).
"""

from celery_app import app
import json
import structlog

logger = structlog.get_logger()


# ── Redis SSE event publisher (used from all Celery tasks) ────────────────────

def _publish_event(run_id: str, event_data: dict) -> None:
    """
    Publish an SSE event from a Celery worker to the Redis channel.
    This is the CORRECT way to push events across the Celery→FastAPI boundary.
    Never touches the FastAPI event loop directly.
    """
    try:
        from streaming import redis_publisher
        redis_publisher.publish(run_id, json.dumps(event_data))
    except Exception as exc:
        # Event delivery is best-effort — DB is the authoritative state
        logger.warning("Redis SSE publish failed", run_id=run_id, error=str(exc))


# ── Main Pipeline Task ────────────────────────────────────────────────────────

@app.task(
    bind=True,
    name="run_pipeline",
    queue="pipeline",
    max_retries=0,           # Pipeline is long-running — no auto-retry
    soft_time_limit=2700,    # 45 min soft kill → triggers SoftTimeLimitExceeded
    time_limit=3000,         # 50 min hard kill
    acks_late=True,          # Keep task in queue until acknowledged (crash safety)
)
def run_pipeline_task(
    self,
    product_category: str,
    brand_name: str,
    run_id: str,
    user_id: str,
    is_watermarked: bool,
):
    """
    Main 8-agent pipeline task.
    Called by POST /api/reports/run via .delay()
    Publishes SSE progress events to Redis for connected frontend clients.
    """
    from crews.main_crew import run_main_crew
    from analytics import track_event
    import time

    start_time = time.time()

    def progress_callback(agent_name: str, agent_num: int, status: str):
        _publish_event(run_id, {
            "type": "agent_update",
            "run_id": run_id,
            "agent_name": agent_name,
            "agent_number": agent_num,
            "status": status,
            "progress_pct": int((agent_num / 8) * 100),
        })

    try:
        logger.info("Pipeline task started",
                    run_id=run_id, category=product_category, brand=brand_name)

        result = run_main_crew(
            product_category=product_category,
            brand_name=brand_name,
            run_id=run_id,
            user_id=user_id,
            is_watermarked=is_watermarked,
            progress_callback=progress_callback,
        )

        duration = round(time.time() - start_time)
        track_event(user_id, "report_completed", {
            "category": product_category,
            "duration_seconds": duration,
            "run_id": run_id,
        })

        # Fetch report URLs from DB and push completion event
        try:
            from database import get_supabase
            db = get_supabase()
            report = (
                db.table("reports")
                .select("pdf_url, pptx_url")
                .eq("run_id", run_id)
                .maybe_single()
                .execute()
                .data
            )
            _publish_event(run_id, {
                "type": "run_completed",
                "run_id": run_id,
                "pdf_url": (report or {}).get("pdf_url"),
                "pptx_url": (report or {}).get("pptx_url"),
            })
        except Exception as db_err:
            logger.warning("Could not fetch report URLs for SSE event", error=str(db_err))
            _publish_event(run_id, {
                "type": "run_completed",
                "run_id": run_id,
                "pdf_url": None,
                "pptx_url": None,
            })

        logger.info("Pipeline task finished", run_id=run_id, duration=duration)
        return result

    except Exception as exc:
        error_str = str(exc)[:300]
        logger.error("Pipeline task failed", run_id=run_id, error=error_str)

        try:
            track_event(user_id, "report_failed", {
                "category": product_category,
                "error": error_str[:200],
                "run_id": run_id,
            })
        except Exception:
            pass

        _publish_event(run_id, {
            "type": "run_failed",
            "run_id": run_id,
            "error": error_str,
        })
        raise


# ── Sentiment Check Tasks ─────────────────────────────────────────────────────

@app.task(name="run_sentiment_check", queue="monitoring", max_retries=2, default_retry_delay=60)
def run_sentiment_check_task(user_id: str, brand_name: str):
    """Agent 9 — checks sentiment for one brand. Called by daily Beat schedule."""
    from crews.monitoring_crew import run_sentiment_crew
    return run_sentiment_crew(user_id=user_id, brand_name=brand_name)


@app.task(name="run_sentiment_monitor_all", queue="monitoring")
def run_sentiment_monitor_all():
    """
    Dispatches per-brand sentiment checks for all Pro+ users.
    Called by Celery Beat daily at 7 AM IST.
    """
    from database import get_supabase
    db = get_supabase()

    users = (
        db.table("profiles")
        .select("id, company_name")
        .in_("plan", ["pro", "enterprise"])
        .execute()
        .data
    ) or []

    count = 0
    for user in users:
        brand = user.get("company_name")
        if brand:
            run_sentiment_check_task.delay(user["id"], brand)
            count += 1

    logger.info("Sentiment monitor dispatched", user_count=count)
    return {"dispatched": count}


# ── Price Check Tasks ─────────────────────────────────────────────────────────

@app.task(name="run_price_check", queue="monitoring", max_retries=2, default_retry_delay=60)
def run_price_check_task(run_id: str):
    """Agent 10 — re-scrapes current prices for one run. Called by Beat schedule."""
    from crews.monitoring_crew import run_price_crew
    return run_price_crew(run_id=run_id)


@app.task(name="run_price_monitor_all", queue="monitoring")
def run_price_monitor_all():
    """
    Dispatches price checks for all recent completed runs.
    Called by Celery Beat daily at 8 AM IST.
    """
    from database import get_supabase
    from datetime import datetime, timedelta, timezone

    db = get_supabase()
    cutoff = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()

    runs = (
        db.table("agent_runs")
        .select("id, user_id")
        .eq("status", "completed")
        .gte("created_at", cutoff)
        .execute()
        .data
    ) or []

    count = 0
    for run in runs:
        run_price_check_task.delay(run["id"])
        count += 1

    logger.info("Price monitor dispatched", run_count=count)
    return {"dispatched": count}


# ── Supply & Compliance Tasks (on-demand) ─────────────────────────────────────

@app.task(name="run_supply_check", queue="monitoring", max_retries=1)
def run_supply_check_task(concept_id: str, run_id: str):
    """Agent 11 — on-demand supplier scouting for a product concept."""
    from crews.monitoring_crew import run_supply_crew
    return run_supply_crew(concept_id=concept_id, run_id=run_id)


@app.task(name="run_compliance_check", queue="monitoring", max_retries=1)
def run_compliance_check_task(concept_id: str, run_id: str):
    """Agent 12 — on-demand regulatory compliance check for a product concept."""
    from crews.monitoring_crew import run_compliance_crew
    return run_compliance_crew(concept_id=concept_id, run_id=run_id)


# ── Monthly Reset ─────────────────────────────────────────────────────────────

@app.task(name="reset_monthly_report_counts", queue="default")
def reset_monthly_report_counts():
    """Reset all users' monthly report count on the 1st of every month."""
    from database import get_supabase
    db = get_supabase()
    db.rpc("reset_monthly_reports").execute()
    logger.info("Monthly report counts reset")
    return {"status": "reset"}