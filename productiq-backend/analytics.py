"""
ProductIQ — PostHog Analytics Integration
"""

import posthog
from config import settings
import structlog

logger = structlog.get_logger()

if settings.POSTHOG_API_KEY:
    posthog.project_api_key = settings.POSTHOG_API_KEY
    posthog.host = settings.POSTHOG_HOST
    posthog.on_error = lambda error, items: logger.warning("PostHog error", error=str(error))
else:
    logger.warning("POSTHOG_API_KEY not set — analytics disabled")


def track_event(user_id: str, event: str, properties: dict | None = None) -> None:
    """
    Track a product analytics event.
    Call from all routers. Never blocks — errors are silently swallowed.

    Key events used across the codebase:
        report_started          {category, plan, run_id}
        report_completed        {category, duration_seconds, run_id}
        report_failed           {category, error}
        report_downloaded       {format: pdf|pptx, run_id}
        payment_initiated       {plan, amount_inr}
        payment_completed       {plan, razorpay_payment_id}
        agent_failed            {agent_name, run_id, error}
        referral_used           {referred_by}
        referral_earned         {new_user}
        sentiment_alert_sent    {brand, score, drop}
    """
    if not settings.POSTHOG_API_KEY:
        return
    try:
        posthog.capture(
            distinct_id=str(user_id),
            event=event,
            properties=properties or {},
        )
    except Exception:
        pass  # Never let analytics break the main flow


def identify_user(user_id: str, properties: dict | None = None) -> None:
    """Set persistent user properties in PostHog (plan, company, etc.)."""
    if not settings.POSTHOG_API_KEY:
        return
    try:
        posthog.identify(
            distinct_id=str(user_id),
            properties=properties or {},
        )
    except Exception:
        pass