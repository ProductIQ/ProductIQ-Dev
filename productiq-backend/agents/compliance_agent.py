"""
ProductIQ — Agent 12: Regulatory Compliance Guardian
Uses RAG over FSSAI, AYUSH, BIS, and FDA regulatory documents.
"""

from crewai import Agent
from agents.base import GEMINI_FLASH_15
from rag.retriever import RAGRetrieverTool
from tools.storage_tools import SupabaseComplianceStoreTool


def create_compliance_agent() -> Agent:
    return Agent(
        role="Regulatory Compliance Guardian",
        goal=(
            "Check every product concept against FSSAI, FDA, AYUSH, and BIS regulations using "
            "the RAG knowledge base built from official regulatory documents. Produce a checklist "
            "of compliance items with pass/fail/needs-review status. Flag all risk areas and "
            "provide concrete remediation recommendations."
        ),
        backstory=(
            "You are a regulatory affairs expert with 10 years of experience getting products "
            "approved in India and internationally. You have read every FSSAI circular. You know "
            "exactly what gets a product rejected and what gets it fast-tracked. You are "
            "thorough, conservative, and precise. You never say 'probably compliant' — "
            "you cite the exact regulation and provide specific remediation steps."
        ),
        tools=[
            RAGRetrieverTool(),
            SupabaseComplianceStoreTool(),
        ],
        llm=GEMINI_FLASH_15(),
        verbose=False,
        allow_delegation=False,
        max_retry_limit=2,
    )