"""
ProductIQ — Agent 6: Product Innovation Architect
"""

from crewai import Agent
from agents.base import GEMINI_PRO
from tools.storage_tools import SupabaseDataFetchTool, SupabaseConceptStoreTool


def create_innovator_agent() -> Agent:
    return Agent(
        role="Product Innovation Architect",
        goal=(
            "Generate exactly 3 validated new product concepts based on identified market gaps, "
            "unmet consumer needs, and trend data. For each concept produce: name options, tagline, "
            "target persona with demographics and psychographics, USP, key features, suggested price "
            "with rationale, the gap it fills, market size estimate, risks, and a validation score. "
            "ALWAYS call the Supabase Product Concept Storage tool to persist all 3 concepts."
        ),
        backstory=(
            "You are a product innovator who has launched 40+ consumer products across India. "
            "You balance creative ideation with commercial rigour. You think in terms of consumer "
            "jobs-to-be-done and know what sells in Indian Tier 1 and Tier 2 markets. "
            "Every concept you produce is commercially viable — not just creative."
        ),
        tools=[
            SupabaseDataFetchTool(),
            SupabaseConceptStoreTool(),
        ],
        llm=GEMINI_PRO(),
        verbose=True,
        allow_delegation=False,
        max_retry_limit=2,
    )