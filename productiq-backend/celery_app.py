"""
ProductIQ — Celery Application Configuration
"""

from celery import Celery
from config import settings

app = Celery(
    "productiq",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=["celery_tasks", "celery_beat"],
)

app.conf.update(
    # Serialization
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",

    # Timezone
    timezone="Asia/Kolkata",
    enable_utc=True,

    # Reliability
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,   # One task per worker — agents are heavy
    task_soft_time_limit=1800,      # 30-minute soft kill → raises SoftTimeLimitExceeded
    task_time_limit=2100,           # 35-minute hard kill
    task_reject_on_worker_lost=True,

    # Results TTL
    result_expires=86400,           # Keep results for 24h

    # Routing
    task_routes={
        "run_pipeline": {"queue": "pipeline"},
        "run_sentiment_check": {"queue": "monitoring"},
        "run_price_check": {"queue": "monitoring"},
        "run_sentiment_monitor_all": {"queue": "monitoring"},
        "run_price_monitor_all": {"queue": "monitoring"},
        "reset_monthly_report_counts": {"queue": "default"},
    },
)