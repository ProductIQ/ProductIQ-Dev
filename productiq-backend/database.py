"""
ProductIQ — Supabase Database Client
Service-role client bypasses RLS — only used server-side.
Lazy-initialised to avoid crashing on import if Supabase is unreachable.
"""

from supabase import create_client, Client
from config import settings
import structlog

logger = structlog.get_logger()

# Thread-safe singleton — never initialised at module load time
_supabase_client: Client | None = None


def get_supabase() -> Client:
    """Return the shared Supabase service-role client (lazy init)."""
    global _supabase_client
    if _supabase_client is None:
        try:
            _supabase_client = create_client(
                settings.SUPABASE_URL,
                settings.SUPABASE_SERVICE_KEY,
            )
            logger.info("Supabase client initialised", url=settings.SUPABASE_URL[:40])
        except Exception as e:
            logger.error("Supabase client init failed", error=str(e))
            raise RuntimeError(f"Cannot connect to Supabase: {e}") from e
    return _supabase_client


def reset_supabase_client() -> None:
    """Force re-init on next call (useful in tests or after credential rotation)."""
    global _supabase_client
    _supabase_client = None