"""
ProductIQ — Agent 3: Competitive Intelligence Specialist
"""

from crewai import Agent
from agents.base import GEMINI_FLASH
from tools.search_tools import SerpAPITool, GoogleSearchTool
from tools.scraping_tools import ApifyWebBrowserTool
from tools.storage_tools import SupabaseCompetitorStoreTool


def create_competitor_agent() -> Agent:
    return Agent(
        role="Competitive Intelligence Specialist",
        goal=(
            "Map the full competitor landscape for the given product category. For each "
            "competitor brand, extract pricing, positioning, key strengths/weaknesses, ad copy, "
            "and recent launches. Identify white spaces and gaps in competitor offerings."
        ),
        backstory=(
            "You are a market research analyst who has tracked hundreds of brand wars in Indian FMCG "
            "and D2C. You see through marketing language to find actual product differentiators. "
            "You think like a brand strategist. You identify gaps that competitors have missed, "
            "which become the foundation for product innovation downstream."
        ),
        tools=[
            SerpAPITool(),
            GoogleSearchTool(),
            ApifyWebBrowserTool(),
            SupabaseCompetitorStoreTool(),
        ],
        llm=GEMINI_FLASH(),
        verbose=True,
        allow_delegation=False,
        max_retry_limit=2,
    )