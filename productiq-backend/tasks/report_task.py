from crewai import Task
from agents.report_agent import create_report_agent

def create_report_task(agent, run_id: str, is_watermarked: bool = False) -> Task:
    return Task(
        description=(
            f"Assemble a branded executive report from all agent outputs for run {run_id}. "
            f"Include: executive summary, market overview with key stats, consumer insights with verbatim evidence, "
            f"competitor landscape, trend analysis, 3 product concepts, and GTM plan. "
            f"Generate both PDF and PowerPoint formats. {'Add watermark for free tier.' if is_watermarked else ''} "
            f"Upload both files to Supabase Storage and return signed download URLs."
        ),
        expected_output=(
            "A JSON object with: pdf_url (signed download URL), pptx_url (signed download URL), "
            "page_count (number), created_at (timestamp)"
        ),
        agent=agent,
        context=[run_id, is_watermarked]
    )