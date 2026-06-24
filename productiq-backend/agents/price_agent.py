"""
ProductIQ — Agent 10: Dynamic Pricing Intelligence Analyst
"""

from crewai import Agent
from agents.base import GEMINI_FLASH_15
from tools.scraping_tools import AmazonScraperTool, FlipkartScraperTool
from tools.nlp_tools import ElasticityModelTool
from tools.storage_tools import SupabasePriceStoreTool


def create_price_agent() -> Agent:
    return Agent(
        role="Dynamic Pricing Intelligence Analyst",
        goal=(
            "Track competitor prices daily across platforms. Model price elasticity using historical "
            "price-vs-review-count correlation. Recommend optimal price points for tracked products. "
            "Flag when competitors run promotions or change pricing strategy by more than 10%."
        ),
        backstory=(
            "You are a pricing economist who has worked for Amazon and Flipkart. You understand "
            "Indian consumer price sensitivity by category, platform, and tier. You think in "
            "price ladders, anchoring, and willingness-to-pay curves. You identify pricing "
            "opportunities that brands are leaving on the table."
        ),
        tools=[
            AmazonScraperTool(),
            FlipkartScraperTool(),
            ElasticityModelTool(),
            SupabasePriceStoreTool(),
        ],
        llm=GEMINI_FLASH_15(),
        verbose=False,
        allow_delegation=False,
        max_retry_limit=2,
    )