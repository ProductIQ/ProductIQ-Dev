"""
ProductIQ — Sentry Initialization (Backend)
Initializes Sentry SDK for error tracking and performance monitoring.

If SENTRY_DSN is not set, Sentry is not initialized (no-op).
This allows local development without a Sentry account.
"""

import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.starlette import StarletteIntegration
from sentry_sdk.integrations.logging import LoggingIntegration
from config import settings
import structlog

logger = structlog.get_logger()


def init_sentry() -> bool:
    """
    Initialize Sentry SDK if SENTRY_DSN is configured.
    Returns True if Sentry was initialized, False otherwise.
    """
    if not settings.SENTRY_DSN:
        logger.info("Sentry not initialized — SENTRY_DSN not set")
        return False

    # Build integrations list — only include integrations whose deps are installed
    integrations = [
        StarletteIntegration(
            transaction_style="endpoint",
            failed_request_status_codes=[500, 599],
        ),
        FastApiIntegration(
            transaction_style="endpoint",
            failed_request_status_codes=[500, 599],
        ),
        LoggingIntegration(
            level=None,           # Don't capture stdlib logging as breadcrumbs
            event_level=None,     # Don't capture stdlib logging as events
        ),
    ]

    # Redis integration (optional — only if redis is installed)
    try:
        from sentry_sdk.integrations.redis import RedisIntegration
        import redis  # noqa: F401
        integrations.append(RedisIntegration())
    except ImportError:
        pass

    # Celery integration (optional — only if celery is installed)
    try:
        from sentry_sdk.integrations.celery import CeleryIntegration
        import celery  # noqa: F401
        integrations.append(CeleryIntegration())
    except ImportError:
        pass

    sentry_sdk.init(
        dsn=settings.SENTRY_DSN,
        environment=settings.SENTRY_ENVIRONMENT,
        traces_sample_rate=settings.SENTRY_TRACES_SAMPLE_RATE,
        profiles_sample_rate=0.1,
        send_default_pii=True,  # Capture user IP/email for debugging
        integrations=integrations,
        # Tag all events with the app version
        release=f"productiq-backend@2.0.0",
        # Don't send events in development unless explicitly enabled
        before_send=_filter_events,
    )

    # Set global tags
    sentry_sdk.set_tag("app", "productiq-backend")
    sentry_sdk.set_tag("app_env", settings.APP_ENV)

    logger.info("Sentry initialized",
                environment=settings.SENTRY_ENVIRONMENT,
                traces_sample_rate=settings.SENTRY_TRACES_SAMPLE_RATE)
    return True


def _filter_events(event, hint):
    """Filter out sensitive data before sending to Sentry."""
    # Don't send events in development unless there's an explicit DSN
    if settings.APP_ENV == "development" and not settings.SENTRY_DSN:
        return None

    # Scrub sensitive headers from request data
    if "request" in event and "headers" in event["request"]:
        headers = event["request"]["headers"]
        for sensitive_key in ["authorization", "x-api-key", "cookie", "x-supabase-key"]:
            if sensitive_key in headers:
                headers[sensitive_key] = "[REDACTED]"
            # Case-insensitive check
            for key in list(headers.keys()):
                if key.lower() == sensitive_key:
                    headers[key] = "[REDACTED]"

    # Scrub sensitive env vars
    if "extra" in event:
        extra = event["extra"]
        for sensitive_key in ["SUPABASE_SERVICE_KEY", "GEMINI_API_KEY", "RAZORPAY_KEY_SECRET",
                              "SECRET_KEY", "DATABASE_URL", "REDIS_URL"]:
            if sensitive_key in extra:
                extra[sensitive_key] = "[REDACTED]"

    return event


def set_user_context(user_id: str, email: str = None, username: str = None):
    """Set the Sentry user context for the current request."""
    sentry_sdk.set_user({
        "id": user_id,
        "email": email,
        "username": username,
    })


def clear_user_context():
    """Clear the Sentry user context (on logout)."""
    sentry_sdk.set_user(None)


def capture_exception(exc: Exception, **kwargs) -> str:
    """Capture an exception and return the event ID."""
    return sentry_sdk.capture_exception(exc, **kwargs)


def capture_message(msg: str, level: str = "info", **kwargs) -> str:
    """Capture a message and return the event ID."""
    return sentry_sdk.capture_message(msg, level=level, **kwargs)


def add_breadcrumb(category: str, message: str, level: str = "info", data: dict = None):
    """Add a breadcrumb to the current Sentry scope."""
    sentry_sdk.add_breadcrumb(
        category=category,
        message=message,
        level=level,
        data=data or {},
    )
