"""
ProductIQ — Supabase Realtime Listener
Listens to Postgres changes for real-time dashboard updates and sentiment alerts.
"""

import asyncio
import httpx
import structlog
from datetime import datetime, timedelta

from config import settings

logger = structlog.get_logger()


async def start_realtime_listener():
    """
    Background task that listens to Supabase Realtime changes.

    Subscriptions:
    - sentiment_scores (INSERT) → check for sentiment drop alerts
    - agent_runs (UPDATE)       → log run status changes

    This runs as an asyncio task started in main.py lifespan.
    """
    try:
        from supabase import create_async_client
        db = await create_async_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)

        def on_sentiment_insert(payload: dict):
            """Called when a new sentiment_score row is inserted."""
            record = payload.get("new", {})
            score = record.get("score", 0)
            brand = record.get("brand_name", "")
            user_id = record.get("user_id", "")

            logger.info("Sentiment score inserted", brand=brand, score=score)
            asyncio.create_task(check_sentiment_alert(brand, user_id, score))

        def on_agent_run_update(payload: dict):
            """Called when agent_runs status changes."""
            record = payload.get("new", {})
            logger.debug("Agent run updated",
                         run_id=record.get("id"),
                         status=record.get("status"),
                         agent=record.get("current_agent"))

        # Subscribe to sentiment_scores inserts
        channel = db.channel("productiq-monitoring")
        channel.on(
            "postgres_changes",
            event="INSERT",
            schema="public",
            table="sentiment_scores",
            callback=on_sentiment_insert,
        ).on(
            "postgres_changes",
            event="UPDATE",
            schema="public",
            table="agent_runs",
            callback=on_agent_run_update,
        )
        await channel.subscribe()

        logger.info("Supabase Realtime subscriptions active")

        # Keep task alive
        while True:
            await asyncio.sleep(60)

    except Exception as e:
        logger.error("Realtime listener error", error=str(e))
        # Don't crash the API — Realtime is optional
        await asyncio.sleep(30)


async def check_sentiment_alert(brand: str, user_id: str, new_score: float):
    """
    Compare new sentiment score vs 7-day average.
    If drop > 15 percentage points, send Slack alert.
    """
    try:
        from supabase import create_client
        db = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)

        seven_days_ago = (datetime.utcnow() - timedelta(days=7)).isoformat()

        history = (
            db.table("sentiment_scores")
            .select("score")
            .eq("brand_name", brand)
            .eq("user_id", user_id)
            .gte("scored_at", seven_days_ago)
            .execute()
            .data
        )

        if len(history) < 2:
            return  # Not enough history to compare

        scores = [h["score"] for h in history]
        avg = sum(scores) / len(scores)
        drop = avg - new_score

        if drop > 0.15:  # Score dropped > 15 percentage points
            # Get user's Slack webhook
            profile = (
                db.table("profiles")
                .select("slack_webhook_url")
                .eq("id", user_id)
                .maybe_single()
                .execute()
                .data
            )
            webhook = profile.get("slack_webhook_url") if profile else None

            # Also try global webhook from config
            webhook = webhook or settings.SLACK_WEBHOOK_URL

            if webhook:
                message = (
                    f":warning: *ProductIQ Brand Alert*\n"
                    f"Brand: *{brand}*\n"
                    f"Sentiment dropped *{round(drop * 100, 1)} points* vs 7-day average.\n"
                    f"New score: *{round(new_score, 2)}* (avg was {round(avg, 2)})\n"
                    f"Check your dashboard: {settings.FRONTEND_URL}/sentiment"
                )
                async with httpx.AsyncClient(timeout=10) as client:
                    await client.post(webhook, json={"text": message})

            # Mark alert sent on this record
            db.table("sentiment_scores").update({"alert_sent": True}).eq(
                "brand_name", brand
            ).eq("user_id", user_id).order(
                "scored_at", desc=True
            ).limit(1).execute()

            logger.info("Sentiment alert sent", brand=brand, drop=round(drop, 3), user=user_id)

    except Exception as e:
        logger.error("Sentiment alert check failed", brand=brand, error=str(e))
