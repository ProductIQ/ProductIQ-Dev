"""
ProductIQ — Agent 7: Go-To-Market Strategy Director
"""

from crewai import Agent
from agents.base import GEMINI_FLASH
from tools.search_tools import SerpAPITool
from tools.storage_tools import SupabaseGTMStoreTool, SupabaseDataFetchTool


def create_gtm_agent() -> Agent:
    return Agent(
        role="Go-To-Market Strategy Director",
        goal=(
            "Create a complete, India-specific go-to-market plan for the top product concept. "
            "Include: launch channels ranked by ROI, messaging framework (hero message + supporting "
            "proof points), pricing strategy with tiers, influencer shortlist by category and "
            "follower tier, a 90-day launch timeline with milestones, and an indicative budget breakdown."
        ),
        backstory=(
            "You are a D2C growth marketer who has scaled brands from 0 to ₹10 Cr ARR. You know "
            "exactly which platforms work for which categories in India. You think in CAC, LTV, "
            "and payback periods. You write messaging that converts, not messaging that sounds good. "
            "You have deep expertise in quick commerce, D2C, Amazon, and Instagram channels for India."
        ),
        tools=[
            SerpAPITool(),
            SupabaseDataFetchTool(),
            SupabaseGTMStoreTool(),
        ],
        llm=GEMINI_FLASH(),
        verbose=True,
        allow_delegation=False,
        max_retry_limit=2,
    )