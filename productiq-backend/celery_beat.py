"""
ProductIQ — Celery Beat Scheduled Tasks
Configures the cron-like schedule for monitoring agents.
"""

from celery_app import app
from celery.schedules import crontab

app.conf.beat_schedule = {
    # Agent 9: Sentiment Tracker — 7am IST daily (1:30 UTC)
    "daily-sentiment-monitor": {
        "task": "run_sentiment_monitor_all",
        "schedule": crontab(hour=1, minute=30),
    },
    # Agent 10: Price Optimizer — 8am IST daily (2:30 UTC)
    "daily-price-monitor": {
        "task": "run_price_monitor_all",
        "schedule": crontab(hour=2, minute=30),
    },
    # Monthly reset — midnight IST on 1st of each month (18:30 UTC previous day)
    "monthly-report-reset": {
        "task": "reset_monthly_report_counts",
        "schedule": crontab(hour=18, minute=30, day_of_month="28-31"),
        # Note: adjusted to end-of-month IST. Use a Postgres cron job for exactness.
    },
}

# Import tasks so Celery Beat knows they exist
from celery_tasks import (  # noqa: F401, E402
    run_sentiment_monitor_all,
    run_price_monitor_all,
    reset_monthly_report_counts,
)
