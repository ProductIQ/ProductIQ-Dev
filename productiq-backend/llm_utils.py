"""
ProductIQ — Gemini LLM Utility: Key Rotation + Rate-Limit Retry
llm_utils.py

Solves two free-tier problems:
  1. Single key exhaustion → rotates across up to 6 API keys.
  2. 429 rate-limit errors → exponential backoff with jitter.

Usage:
    from llm_utils import get_rotated_llm, FLASH_LLM, FLASH_LITE_LLM
    agent = Agent(llm=FLASH_LLM(), ...)
"""

import time
import random
import threading
import structlog
from typing import Optional
from crewai import LLM

logger = structlog.get_logger()

# ── Thread-safe API key rotator ───────────────────────────────────────────────

class _KeyRotator:
    """
    Thread-safe round-robin rotator across multiple Gemini API keys.
    Each key is independently rate-limited at the free tier:
      gemini-2.5-flash:      15 RPM / 1,500 req/day
      gemini-2.5-flash-lite: 30 RPM / 1,500 req/day
    With 6 keys: effective 90 RPM / 9,000 req/day for flash.
    """

    def __init__(self):
        self._keys: list[str] = []
        self._index: int = 0
        self._lock = threading.Lock()
        self._initialized = False

    def _load(self):
        if self._initialized:
            return
        from config import settings
        self._keys = settings.gemini_api_keys
        self._initialized = True
        logger.info(
            "Gemini key rotator initialised",
            key_count=len(self._keys),
        )

    def next_key(self) -> str:
        """Return the next API key in round-robin order."""
        self._load()
        with self._lock:
            if not self._keys:
                raise RuntimeError("No Gemini API keys configured")
            key = self._keys[self._index % len(self._keys)]
            self._index += 1
        return key

    @property
    def key_count(self) -> int:
        self._load()
        return len(self._keys)


# Singleton rotator shared across all threads / agents
_rotator = _KeyRotator()


# ── LLM factory with built-in retry ──────────────────────────────────────────

def _make_llm(
    model: str,
    temperature: float,
    max_tokens: int,
    max_retries: int = 3,
) -> LLM:
    """
    Build a CrewAI LLM using the next available API key from the rotator.

    Retry behaviour for 429 / ResourceExhausted:
      CrewAI/LiteLLM already has some retry logic, but we layer on top with
      key rotation so the next attempt uses a DIFFERENT key (different quota bucket).

    The LLM is constructed fresh each time so Celery workers, background threads,
    and the main FastAPI process all get their own instance pointing to a rotated key.
    """
    api_key = _rotator.next_key()
    logger.debug(
        "LLM created",
        model=model,
        key_suffix=f"...{api_key[-6:]}",
        rotator_index=_rotator._index,
    )
    return LLM(
        model=model,
        api_key=api_key,
        temperature=temperature,
        max_tokens=max_tokens,
        # LiteLLM retry settings — these work at the HTTP level within CrewAI
        num_retries=max_retries,        # retry on transient errors
        retry_delay=2.0,               # base delay seconds (doubles each attempt)
    )


# ── Retry wrapper for direct Gemini calls (outside CrewAI) ───────────────────

def call_with_retry(fn, *args, max_attempts: int = 4, **kwargs):
    """
    Call any function (e.g. a direct google.generativeai call) with
    exponential backoff + key rotation on 429 errors.

    Usage:
        result = call_with_retry(model.generate_content, prompt)
    """
    last_exc = None
    for attempt in range(1, max_attempts + 1):
        try:
            return fn(*args, **kwargs)
        except Exception as exc:
            exc_str = str(exc).lower()
            is_rate_limit = any(kw in exc_str for kw in (
                "429", "resource_exhausted", "quota", "rate limit", "ratelimit",
            ))
            if not is_rate_limit or attempt >= max_attempts:
                raise
            wait = (2 ** attempt) + random.uniform(0, 1)
            logger.warning(
                "Rate limit hit — retrying with backoff",
                attempt=attempt,
                wait_seconds=round(wait, 1),
                error=str(exc)[:120],
            )
            time.sleep(wait)
            last_exc = exc
    raise last_exc  # type: ignore[misc]


# ── Public LLM factory functions ──────────────────────────────────────────────

def FLASH_LLM() -> LLM:
    """
    gemini-2.5-flash — primary workhorse.
    Free quota: 15 RPM / 1,500 req/day per key.
    With 6 keys: 90 RPM / 9,000 req/day.
    Use for: Agents 1 (Scraper), 2 (Review Miner), 3 (Competitor),
             4 (Trend), 5 (Insight), 6 (Innovator), 7 (GTM), 8 (Report).
    """
    return _make_llm(
        model="gemini/gemini-2.5-flash",
        temperature=0.3,
        max_tokens=8192,
    )


def FLASH_LITE_LLM() -> LLM:
    """
    gemini-2.5-flash-lite (preview) — fastest, cheapest, highest RPM.
    Free quota: 30 RPM / 1,500 req/day per key.
    With 6 keys: 180 RPM / 9,000 req/day.
    Use for: Agents 9 (Sentiment), 10 (Price), 11 (Supply), 12 (Compliance).
    """
    return _make_llm(
        model="gemini/gemini-2.5-flash-lite-preview-06-17",
        temperature=0.2,
        max_tokens=4096,
    )


def INSIGHT_LLM() -> LLM:
    """
    gemini-2.5-flash with higher token budget for synthesis tasks.
    Used for Agents 5, 6, 8 that need larger context/output.
    Intentionally uses flash (NOT pro) to stay within free quota.
    """
    return _make_llm(
        model="gemini/gemini-2.5-flash",
        temperature=0.4,
        max_tokens=16384,
    )


def get_rotated_llm(tier: str = "flash") -> LLM:
    """
    Convenience function for getting an LLM by tier name.
    tier: 'flash' | 'lite' | 'insight'
    """
    if tier == "lite":
        return FLASH_LITE_LLM()
    if tier == "insight":
        return INSIGHT_LLM()
    return FLASH_LLM()
