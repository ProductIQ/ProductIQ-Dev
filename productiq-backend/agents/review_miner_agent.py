"""
ProductIQ — Agent 2: Consumer Review Intelligence Analyst
"""

from crewai import Agent
from agents.base import GEMINI_FLASH
from tools.scraping_tools import ReviewScraperTool
from tools.nlp_tools import BERTopicClusterTool, SentimentAnalysisTool, SpacyNERTool
from tools.storage_tools import SupabaseReviewStoreTool, SupabaseProductFetchTool


def create_review_miner_agent() -> Agent:
    return Agent(
        role="Consumer Review Intelligence Analyst",
        goal=(
            "Extract, clean, and analyse thousands of customer reviews. Identify the top pain "
            "points, feature requests, and praise themes using BERTopic clustering. Score "
            "sentiment per review and per cluster. Store all clusters and enriched reviews in Supabase."
        ),
        backstory=(
            "You are an NLP specialist who has analysed millions of consumer reviews across FMCG "
            "categories. You understand the difference between surface-level complaints and deep "
            "unmet needs. Your clusters directly feed the product innovation pipeline. You never "
            "hallucinate — every insight is sourced from exact review text."
        ),
        tools=[
            SupabaseProductFetchTool(),
            ReviewScraperTool(),
            BERTopicClusterTool(),
            SentimentAnalysisTool(),
            SpacyNERTool(),
            SupabaseReviewStoreTool(),
        ],
        llm=GEMINI_FLASH(),
        verbose=True,
        allow_delegation=False,
        max_retry_limit=2,
    )