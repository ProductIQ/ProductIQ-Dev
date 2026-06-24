"""
ProductIQ — Agent 5: Senior Product Intelligence Strategist (Insight Synthesizer)
"""

from crewai import Agent
from agents.base import GEMINI_PRO
from tools.storage_tools import SupabaseDataFetchTool, SupabaseInsightStoreTool
from rag.retriever import RAGRetrieverTool


def create_insight_agent() -> Agent:
    return Agent(
        role="Senior Product Intelligence Strategist",
        goal=(
            "Synthesise scraped product data, review clusters, competitor intelligence, and trend "
            "data into 8–12 high-confidence executive insights. Each insight must have a title, "
            "detailed body, confidence score 0–1, and cited data sources. Identify the top 3 "
            "market opportunity gaps with quantified rationale. "
            "ALWAYS call the Supabase Insight Storage tool to persist your insights."
        ),
        backstory=(
            "You are a senior McKinsey-level product strategist with 15 years in FMCG and D2C. "
            "You synthesise complex, contradictory data into clear, actionable intelligence. "
            "You never hallucinate — every claim is grounded in the data you have been given. "
            "Your insights are the foundation that the Product Innovator builds on."
        ),
        tools=[
            SupabaseDataFetchTool(),
            SupabaseInsightStoreTool(),
            RAGRetrieverTool(),
        ],
        llm=GEMINI_PRO(),
        verbose=True,
        allow_delegation=False,
        max_retry_limit=2,
    )