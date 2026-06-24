"""
ProductIQ — Monitoring Crew (Agents 9-12)
Sentiment, Pricing, Supply Chain, Compliance — run on Celery Beat schedules.
"""

from crewai import Crew, Process
import structlog

logger = structlog.get_logger()


def run_sentiment_crew(user_id: str, brand_name: str) -> dict:
    """Agent 9: Daily brand health check for one brand."""
    from agents.sentiment_agent import create_sentiment_agent
    from tasks.tasks import create_sentiment_task

    agent = create_sentiment_agent()
    task = create_sentiment_task(agent, brand_name, user_id)
    crew = Crew(
        agents=[agent],
        tasks=[task],
        process=Process.sequential,
        verbose=False,
    )
    result = crew.kickoff()
    return {"status": "completed", "result": str(result)[:500]}


def run_price_crew(run_id: str) -> dict:
    """Agent 10: Daily price monitoring for a run's tracked products."""
    from agents.price_agent import create_price_agent
    from tasks.tasks import create_price_task

    agent = create_price_agent()
    task = create_price_task(agent, run_id)
    crew = Crew(
        agents=[agent],
        tasks=[task],
        process=Process.sequential,
        verbose=False,
    )
    result = crew.kickoff()
    return {"status": "completed", "result": str(result)[:500]}


def run_supply_crew(concept_id: str, run_id: str) -> dict:
    """Agent 11: Supply chain scouting for a specific product concept."""
    from agents.supply_agent import create_supply_agent
    from tasks.tasks import create_supply_task

    agent = create_supply_agent()
    task = create_supply_task(agent, concept_id, run_id)
    crew = Crew(
        agents=[agent],
        tasks=[task],
        process=Process.sequential,
        verbose=False,
    )
    result = crew.kickoff()
    return {"status": "completed", "result": str(result)[:500]}


def run_compliance_crew(concept_id: str, run_id: str) -> dict:
    """Agent 12: Regulatory compliance check for a product concept."""
    from agents.compliance_agent import create_compliance_agent
    from tasks.tasks import create_compliance_task

    agent = create_compliance_agent()
    task = create_compliance_task(agent, concept_id, run_id)
    crew = Crew(
        agents=[agent],
        tasks=[task],
        process=Process.sequential,
        verbose=False,
    )
    result = crew.kickoff()
    return {"status": "completed", "result": str(result)[:500]}
