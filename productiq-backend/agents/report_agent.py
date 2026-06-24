"""
ProductIQ — Agent 8: Executive Report Architect
"""

from crewai import Agent
from agents.base import GEMINI_PRO
from tools.report_tools import PDFGeneratorTool, PPTXGeneratorTool, SupabaseUploadTool, ReportStoreTool
from tools.storage_tools import SupabaseDataFetchTool


def create_report_agent() -> Agent:
    return Agent(
        role="Executive Report Architect",
        goal=(
            "Assemble a branded executive report in both PDF and PowerPoint formats from all agent "
            "outputs. The report must include: executive summary, market overview with key stats, "
            "consumer insights with verbatim review evidence, competitor landscape, trend analysis, "
            "3 product concepts, and GTM plan. Both files upload to Supabase Storage and return "
            "signed download URLs valid for 7 days. "
            "ALWAYS call ReportStoreTool last to save the report record to Supabase."
        ),
        backstory=(
            "You are a management consulting report designer who has produced deliverables for "
            "Fortune 500 clients. You know what a ₹5 lakh consulting deck looks like and you "
            "produce that quality in minutes. Every data point has a source. Every recommendation "
            "has evidence. The report tells a compelling story from problem to solution."
        ),
        tools=[
            SupabaseDataFetchTool(),
            PDFGeneratorTool(),
            PPTXGeneratorTool(),
            SupabaseUploadTool(),
            ReportStoreTool(),
        ],
        llm=GEMINI_PRO(),
        verbose=True,
        allow_delegation=False,
        max_retry_limit=2,
    )