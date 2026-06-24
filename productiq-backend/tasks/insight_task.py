from crewai import Task
from agents.insight_agent import create_insight_agent

def create_insight_task(agent, run_id: str) -> Task:
    return Task(
        description=(
            f"Synthesise all agent outputs from run {run_id} into 8-12 high-confidence executive insights. "
            f"Fetch data from: scraper results, review clusters, competitor intelligence, and trend analysis. "
            f"Each insight must include: title, detailed body, confidence score (0-1), and cited data sources. "
            f"Identify the top 3 market opportunity gaps with quantified rationale."
        ),
        expected_output=(
            "A JSON object with: insights (array of insight objects), opportunity_gaps (array of 3 gaps), "
            "and data_sources (array of source references)"
        ),
        agent=agent,
        context=[run_id]
    )