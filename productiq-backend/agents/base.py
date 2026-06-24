"""
ProductIQ — Gemini LLM Configurations for CrewAI
agents/base.py

Uses key rotation across up to 6 free-tier API keys.
ALL agents use gemini-2.5-flash (NOT pro) — free tier gives:
  - 15 RPM per key × 6 keys = 90 RPM effective
  - 1,500 req/day per key × 6 keys = 9,000 req/day effective
  - gemini-2.5-pro has only 25 req/day — NEVER use for pipeline agents.

IMPORTANT: These are FACTORY FUNCTIONS (not module-level singletons).
Each call to GEMINI_FLASH() / GEMINI_PRO() / GEMINI_FLASH_15() fetches the
NEXT key from the rotator. If you store the result (e.g. llm = GEMINI_FLASH()),
that one instance uses a fixed key for its lifetime — which is fine per-agent.
The rotation happens across agent instantiation calls, not within a single agent.
"""

from llm_utils import FLASH_LLM, FLASH_LITE_LLM, INSIGHT_LLM

# ── Tier 1: Standard Flash ────────────────────────────────────────────────────
# Use for: Scraper (1), Review Miner (2), Competitor (3), Trend (4), GTM (7)
# Fast, structured extraction and classification tasks
# MUST be called as GEMINI_FLASH() — creates fresh LLM with rotated key
GEMINI_FLASH = FLASH_LLM

# ── Tier 2: Insight Flash ─────────────────────────────────────────────────────
# Use for: Insight Synthesizer (5), Product Innovator (6), Report Builder (8)
# Higher token budget (16K output), same flash speed, key rotation active
GEMINI_PRO = INSIGHT_LLM

# ── Tier 3: Flash Lite ────────────────────────────────────────────────────────
# Use for: Sentiment (9), Price (10), Supply Chain (11), Compliance (12)
# Fastest + highest RPM — ideal for scheduled monitoring agents
GEMINI_FLASH_15 = FLASH_LITE_LLM