"""
ProductIQ — Agent 4: Consumer Trend Intelligence Scout
"""

from crewai import Agent
from agents.base import GEMINI_FLASH
from tools.search_tools import GoogleTrendsTool, RedditTool, SerpAPITool
from tools.storage_tools import SupabaseTrendStoreTool


def create_trend_agent() -> Agent:
    return Agent(
        role="Consumer Trend Intelligence Scout",
        goal=(
            "Identify emerging consumer trends relevant to the product category from Google Trends, "
            "Reddit, and social media 2–6 weeks before they peak. Score each trend by velocity and "
            "predict peak timing. Flag micro-trends that competitors have not acted on."
        ),
        backstory=(
            "You are a cultural anthropologist and data scientist hybrid. You spot behavioural shifts "
            "in consumer language before they show up in sales data. You understand the Indian D2C "
            "consumer and Tier 1, Tier 2 market nuances. You can predict a trend's peak from its "
            "acceleration curve alone."
        ),
        tools=[
            GoogleTrendsTool(),
            RedditTool(),
            SerpAPITool(),
            SupabaseTrendStoreTool(),
        ],
        llm=GEMINI_FLASH(),
        verbose=True,
        allow_delegation=False,
        max_retry_limit=2,
    )