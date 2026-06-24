"""
ProductIQ — Application Configuration
Centralized, typed settings loaded from .env via pydantic-settings.

Production rules:
  - All optional keys have safe defaults — missing vars never crash startup.
  - Placeholder detection prevents misconfigured tokens from silently failing.
  - USE_CELERY=False → pipeline runs via FastAPI BackgroundTasks (no Redis needed).
"""

from pathlib import Path
from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import Optional

# Resolve .env relative to THIS file so it works from any CWD
# (Celery workers, Docker containers, pytest — all load the same file)
_ENV_FILE = Path(__file__).resolve().parent / ".env"

# Common placeholder values that should be treated as "not set"
_PLACEHOLDER_VALUES = {
    "",
    "...",
    "your_apify_api_token_here",
    "your_token_here",
    "apify_api_token",
    "change_me",
    "rzp_live_...",
    "rzp_test_...",
}


def _is_real(value: Optional[str]) -> bool:
    """Return True only when value is non-None and not a known placeholder."""
    if not value:
        return False
    return value.strip() not in _PLACEHOLDER_VALUES


class Settings(BaseSettings):
    # ── App ──────────────────────────────────────────────────────────────────
    APP_ENV: str = "development"
    SECRET_KEY: str = "change-me-in-production-32-char-min"
    FRONTEND_URL: str = "http://localhost:5173"

    # ── Pipeline Mode ─────────────────────────────────────────────────────────
    # Set USE_CELERY=False to run the pipeline directly in FastAPI BackgroundTasks.
    # This mode requires NO Redis/Celery and is ideal for development/single-server.
    USE_CELERY: bool = False

    # ── Supabase ──────────────────────────────────────────────────────────────
    SUPABASE_URL: str
    SUPABASE_ANON_KEY: Optional[str] = None
    SUPABASE_SERVICE_KEY: str         # service_role key — bypasses RLS for backend writes
    DATABASE_URL: str                 # postgresql://... for asyncpg / pgvector / LlamaIndex

    # ── Gemini AI ─────────────────────────────────────────────────────────────
    GEMINI_API_KEY: str
    # Additional Gemini keys for rotation (add up to 6 free-tier keys)
    # Each free key = 15 RPM + 1500 req/day → 6 keys = 90 RPM + 9000 req/day
    GEMINI_API_KEY_2: Optional[str] = None
    GEMINI_API_KEY_3: Optional[str] = None
    GEMINI_API_KEY_4: Optional[str] = None
    GEMINI_API_KEY_5: Optional[str] = None
    GEMINI_API_KEY_6: Optional[str] = None
    # Conservative RPM cap per key (free tier: 15 for flash, 5 for pro)
    GEMINI_MAX_RPM: int = 10

    # ── Redis / Celery ────────────────────────────────────────────────────────
    REDIS_URL: str = "redis://localhost:6379/0"

    # ── Apify Scraping ────────────────────────────────────────────────────────
    APIFY_API_TOKEN: str = ""

    # Primary actors (verified working as of 2025-2026)
    APIFY_AMAZON_ACTOR_ID: str = "codingfrontend/amazon-product-scraper"

    # Flipkart: primary + fallback (community actors are sometimes disabled)
    APIFY_FLIPKART_ACTOR_ID: str = "shahidirfan/flipkart-product-scraper"
    APIFY_FLIPKART_ACTOR_ID_FALLBACK: str = "maxcopell/flipkart-scraper"

    # Amazon Reviews
    APIFY_REVIEWS_ACTOR_ID: str = "junglee/amazon-reviews-scraper"

    # Generic Apify Web Browser (always available)
    APIFY_WEB_BROWSER_ACTOR_ID: str = "apify/web-scraper"

    # ── External APIs ─────────────────────────────────────────────────────────
    SERPAPI_KEY: Optional[str] = None
    REDDIT_CLIENT_ID: Optional[str] = None
    REDDIT_CLIENT_SECRET: Optional[str] = None

    # ── Alerts ────────────────────────────────────────────────────────────────
    SLACK_WEBHOOK_URL: Optional[str] = None

    # ── Payments ──────────────────────────────────────────────────────────────
    RAZORPAY_KEY_ID: Optional[str] = None
    RAZORPAY_KEY_SECRET: Optional[str] = None

    # ── Analytics ─────────────────────────────────────────────────────────────
    POSTHOG_API_KEY: Optional[str] = None
    POSTHOG_HOST: str = "https://app.posthog.com"

    # ── Error Tracking (Sentry) ───────────────────────────────────────────────
    SENTRY_DSN: Optional[str] = None
    SENTRY_ENVIRONMENT: str = "development"
    SENTRY_TRACES_SAMPLE_RATE: float = 0.1

    # ── Optional: Neo4j ───────────────────────────────────────────────────────
    NEO4J_URI: Optional[str] = None
    NEO4J_USERNAME: Optional[str] = None
    NEO4J_PASSWORD: Optional[str] = None

    model_config = {
        "env_file": str(_ENV_FILE),
        "env_file_encoding": "utf-8",
        "case_sensitive": True,
        "extra": "ignore",
    }

    # ── Derived properties ────────────────────────────────────────────────────

    @property
    def is_production(self) -> bool:
        return self.APP_ENV == "production"

    @property
    def apify_configured(self) -> bool:
        """True only when a real Apify token is present."""
        return _is_real(self.APIFY_API_TOKEN)

    @property
    def serpapi_configured(self) -> bool:
        return _is_real(self.SERPAPI_KEY)

    @property
    def reddit_configured(self) -> bool:
        return _is_real(self.REDDIT_CLIENT_ID) and _is_real(self.REDDIT_CLIENT_SECRET)

    @property
    def razorpay_configured(self) -> bool:
        return _is_real(self.RAZORPAY_KEY_ID) and _is_real(self.RAZORPAY_KEY_SECRET)

    @property
    def slack_configured(self) -> bool:
        return _is_real(self.SLACK_WEBHOOK_URL)

    @property
    def gemini_api_keys(self) -> list[str]:
        """Return all configured Gemini API keys for rotation."""
        keys = [self.GEMINI_API_KEY]
        for extra in [
            self.GEMINI_API_KEY_2,
            self.GEMINI_API_KEY_3,
            self.GEMINI_API_KEY_4,
            self.GEMINI_API_KEY_5,
            self.GEMINI_API_KEY_6,
        ]:
            if extra and extra.strip() and extra.strip() not in _PLACEHOLDER_VALUES:
                keys.append(extra.strip())
        return keys

    def log_configuration_summary(self) -> dict:
        """Return a dict of which services are configured — useful at startup."""
        return {
            "app_env": self.APP_ENV,
            "use_celery": self.USE_CELERY,
            "apify": self.apify_configured,
            "serpapi": self.serpapi_configured,
            "reddit": self.reddit_configured,
            "razorpay": self.razorpay_configured,
            "slack": self.slack_configured,
            "supabase": bool(self.SUPABASE_URL),
            "gemini": bool(self.GEMINI_API_KEY),
            "gemini_keys_count": len(self.gemini_api_keys),
        }


@lru_cache()
def get_settings() -> Settings:
    s = Settings()

    # ── Production safety guard ───────────────────────────────────────────────
    # Crash early rather than silently running with an insecure default secret.
    _INSECURE_SECRETS = {
        "change-me-in-production-32-char-min",
        "replace-with-32-char-random-secret-key-here",
        "change_me",
        "secret",
        "",
    }
    if s.is_production and s.SECRET_KEY.strip() in _INSECURE_SECRETS:
        raise RuntimeError(
            "FATAL: SECRET_KEY is set to an insecure default but APP_ENV=production. "
            "Generate a real 32+ character random secret and set it in your .env file."
        )

    return s


settings = get_settings()