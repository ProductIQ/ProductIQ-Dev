"""
ProductIQ — Agent 9: Brand Health & Sentiment Monitor
Runs on Celery Beat schedule — daily at 7am IST for pro+ users.
"""

from crewai import Agent
from agents.base import GEMINI_FLASH_15
from tools.search_tools import SerpAPITool, RedditTool
from tools.nlp_tools import SentimentAnalysisTool
from tools.storage_tools import SupabaseSentimentStoreTool, SlackAlertTool


def create_sentiment_agent() -> Agent:
    return Agent(
        role="Brand Health & Sentiment Monitor",
        goal=(
            "Run daily brand health checks for tracked brands. Scrape latest mentions from "
            "Google, Reddit, and social platforms. Calculate an aggregate sentiment score (-1 to 1). "
            "Store to Supabase (which triggers Realtime updates to the dashboard). If the "
            "score drops more than 15 points vs the 7-day average, send a Slack alert."
        ),
        backstory=(
            "You are a brand reputation manager who never sleeps. You track brand perception "
            "across digital channels and alert teams before small fires become crises. "
            "You are precise, systematic, and fast. You calculate scores mathematically — "
            "never estimate. Every alert you send is actionable."
        ),
        tools=[
            SerpAPITool(),
            RedditTool(),
            SentimentAnalysisTool(),
            SupabaseSentimentStoreTool(),
            SlackAlertTool(),
        ],
        llm=GEMINI_FLASH_15(),
        verbose=False,
        allow_delegation=False,
        max_retry_limit=2,
    )