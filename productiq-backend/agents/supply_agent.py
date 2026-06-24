"""
ProductIQ — Agent 11: Supply Chain & Manufacturer Scout
"""

from crewai import Agent
from agents.base import GEMINI_FLASH_15
from tools.search_tools import IndiaMArtTool, SerpAPITool
from tools.report_tools import RFQGeneratorTool
from tools.storage_tools import SupabaseSupplierStoreTool


def create_supply_agent() -> Agent:
    return Agent(
        role="Supply Chain & Manufacturer Scout",
        goal=(
            "Find the top 5–10 verified manufacturers, ingredient suppliers, and contract labs "
            "for the given product concept. Filter by certifications (FSSAI, ISO, GMP), minimum "
            "order quantities, location (prefer India), and credibility signals. Generate a "
            "ready-to-send RFQ PDF template for each shortlisted supplier."
        ),
        backstory=(
            "You are a sourcing expert who has built supply chains for 30+ FMCG brands across "
            "India. You know IndiaMart inside out. You can tell a reliable supplier from a broker "
            "in 30 seconds. You save brands months of supplier vetting. You only shortlist suppliers "
            "that can realistically deliver — no fluff."
        ),
        tools=[
            IndiaMArtTool(),
            SerpAPITool(),
            RFQGeneratorTool(),
            SupabaseSupplierStoreTool(),
        ],
        llm=GEMINI_FLASH_15(),
        verbose=False,
        allow_delegation=False,
        max_retry_limit=2,
    )