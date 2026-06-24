"""
ProductIQ — Main Crew (8-Agent Sequential Pipeline)
crews/main_crew.py

Orchestrates all 8 agents in sequence. Progress is tracked via:
  1. Supabase DB updates (persistent — survives page refresh)
  2. SSE callbacks pushed to the frontend via progress_callback

IMPORTANT: step_callback is passed to Crew() constructor — the only supported API.
"""

from crewai import Crew, Process
from datetime import datetime, timezone
from typing import Callable, Optional
import threading
import structlog

from agents.scraper_agent import create_scraper_agent
from agents.review_miner_agent import create_review_miner_agent
from agents.competitor_agent import create_competitor_agent
from agents.trend_agent import create_trend_agent
from agents.insight_agent import create_insight_agent
from agents.innovator_agent import create_innovator_agent
from agents.gtm_agent import create_gtm_agent
from agents.report_agent import create_report_agent
from tasks.tasks import (
    create_scraper_task,
    create_review_task,
    create_competitor_task,
    create_trend_task,
    create_insight_task,
    create_innovator_task,
    create_gtm_task,
    create_report_task,
)

logger = structlog.get_logger()

# Ordered agent metadata — must match task creation order
AGENT_SEQUENCE = [
    ("Web Scraper",          1),
    ("Review Miner",         2),
    ("Competitor Intel",     3),
    ("Trend Spotter",        4),
    ("Insight Synthesizer",  5),
    ("Product Innovator",    6),
    ("GTM Strategist",       7),
    ("Report Builder",       8),
]


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _safe_db_update(fn: Callable, label: str) -> None:
    """Run a DB update in a daemon thread — never blocks the crew."""
    def _run():
        try:
            fn()
        except Exception as exc:
            logger.warning(f"DB update failed ({label})", error=str(exc))
    threading.Thread(target=_run, daemon=True).start()


def _ensure_agent_output_rows(db, run_id: str) -> None:
    """
    Insert pending output rows for all 8 agents.
    Uses INSERT … ON CONFLICT DO NOTHING to handle Celery retries safely.
    Requires a UNIQUE constraint on (run_id, agent_name) in the DB.
    Falls back to individual inserts with error suppression if upsert fails.
    """
    for name, num in AGENT_SEQUENCE:
        try:
            # Try upsert first (requires unique constraint)
            db.table("agent_outputs").upsert(
                {
                    "run_id": run_id,
                    "agent_name": name,
                    "agent_number": num,
                    "status": "pending",
                },
                on_conflict="run_id,agent_name",
                ignore_duplicates=True,  # DO NOTHING on conflict
            ).execute()
        except Exception:
            # Fallback: plain insert (may fail on retry due to duplicate — that's OK)
            try:
                db.table("agent_outputs").insert({
                    "run_id": run_id,
                    "agent_name": name,
                    "agent_number": num,
                    "status": "pending",
                }).execute()
            except Exception as exc2:
                logger.debug("agent_outputs row already exists", agent=name, error=str(exc2))


def build_main_crew(
    product_category: str,
    brand_name: str,
    run_id: str,
    user_id: str,
    is_watermarked: bool = False,
    step_callback: Optional[Callable] = None,
) -> Crew:
    """Instantiate all 8 agents and their tasks with dependency context."""

    # ── Agents ────────────────────────────────────────────────────────────────
    scraper       = create_scraper_agent()
    review_miner  = create_review_miner_agent()
    competitor    = create_competitor_agent()
    trend_spotter = create_trend_agent()
    insight_synth = create_insight_agent()
    innovator     = create_innovator_agent()
    gtm           = create_gtm_agent()
    reporter      = create_report_agent()

    # ── Tasks ─────────────────────────────────────────────────────────────────
    t_scrape    = create_scraper_task(scraper, product_category, brand_name, run_id)
    t_review    = create_review_task(review_miner, product_category, run_id)
    t_competitor = create_competitor_task(competitor, product_category, brand_name, run_id)
    t_trend     = create_trend_task(trend_spotter, product_category, run_id)
    t_insight   = create_insight_task(insight_synth, product_category, run_id)
    t_innovate  = create_innovator_task(innovator, product_category, run_id)
    t_gtm       = create_gtm_task(gtm, product_category, run_id)
    t_report    = create_report_task(reporter, run_id, user_id, is_watermarked)

    # ── Task context (dependency graph) — downstream agents see upstream outputs
    t_review.context      = [t_scrape]
    t_competitor.context  = [t_scrape]
    t_trend.context       = [t_scrape]
    t_insight.context     = [t_scrape, t_review, t_competitor, t_trend]
    t_innovate.context    = [t_insight, t_review, t_trend]
    t_gtm.context         = [t_innovate, t_insight, t_competitor]
    t_report.context      = [t_scrape, t_review, t_competitor, t_trend,
                              t_insight, t_innovate, t_gtm]

    crew_kwargs = dict(
        agents=[scraper, review_miner, competitor, trend_spotter,
                insight_synth, innovator, gtm, reporter],
        tasks=[t_scrape, t_review, t_competitor, t_trend,
               t_insight, t_innovate, t_gtm, t_report],
        process=Process.sequential,
        verbose=True,
        memory=False,   # All state lives in Supabase
        max_rpm=30,     # Gemini API rate-limit guard (requests per minute)
    )

    # step_callback is the official CrewAI API for post-step hooks
    if step_callback:
        crew_kwargs["step_callback"] = step_callback

    return Crew(**crew_kwargs)


def run_main_crew(
    product_category: str,
    brand_name: str,
    run_id: str,
    user_id: str,
    is_watermarked: bool,
    progress_callback: Optional[Callable[[str, int, str], None]] = None,
) -> dict:
    """
    Execute the full 8-agent pipeline.

    progress_callback(agent_name, agent_number, status) is called when each
    agent starts and finishes, allowing SSE to push real-time updates.
    """
    from database import get_supabase

    db = get_supabase()

    # ── Mark run as started ───────────────────────────────────────────────────
    db.table("agent_runs").update({
        "status": "running",
        "started_at": _utc_now(),
    }).eq("id", run_id).execute()

    # ── Insert pending agent_output rows ──────────────────────────────────────
    _ensure_agent_output_rows(db, run_id)

    # ── Progress state tracker (shared across step_callback calls) ────────────
    _state = {
        "current_index": 0,
        "agent_start_times": {},
    }

    def _step_callback(step_output) -> None:
        """
        Called by CrewAI after every step (tool call or LLM response).
        We track transitions between agents by incrementing the index on each call.
        """
        idx = _state["current_index"]
        if idx >= len(AGENT_SEQUENCE):
            return

        agent_name, agent_num = AGENT_SEQUENCE[idx]

        # Only advance index on tool-call steps (not intermediate LLM thoughts)
        # CrewAI step_output type varies by version — handle both AgentAction and str
        is_final_answer = False
        try:
            # CrewAI 0.36+: step_output may be an AgentFinish or AgentAction
            output_type = type(step_output).__name__
            if "Finish" in output_type or "Final" in output_type:
                is_final_answer = True
        except Exception:
            pass

        if not _state["agent_start_times"].get(agent_num):
            # First step of this agent — mark running
            started = _utc_now()
            _state["agent_start_times"][agent_num] = started

            def _update_running(n=agent_name, num=agent_num, t=started):
                db.table("agent_outputs").update({
                    "status": "running",
                    "started_at": t,
                }).eq("run_id", run_id).eq("agent_name", n).execute()

                db.table("agent_runs").update({
                    "current_agent": n,
                    "progress_pct": int(((num - 1) / 8) * 100),
                }).eq("id", run_id).execute()

            _safe_db_update(_update_running, f"mark {agent_name} running")

            if progress_callback:
                try:
                    progress_callback(agent_name, agent_num, "running")
                except Exception as cb_err:
                    logger.warning("progress_callback error", error=str(cb_err))

        if is_final_answer:
            # Agent produced final answer — mark completed and advance
            completed = _utc_now()
            prev_name, prev_num = agent_name, agent_num
            _state["current_index"] += 1

            def _update_completed(n=prev_name, num=prev_num, t=completed):
                db.table("agent_outputs").update({
                    "status": "completed",
                    "completed_at": t,
                }).eq("run_id", run_id).eq("agent_name", n).execute()

            _safe_db_update(_update_completed, f"mark {prev_name} completed")

            if progress_callback:
                try:
                    progress_callback(prev_name, prev_num, "completed")
                except Exception:
                    pass

    # ── Build and execute the crew ────────────────────────────────────────────
    crew = build_main_crew(
        product_category=product_category,
        brand_name=brand_name,
        run_id=run_id,
        user_id=user_id,
        is_watermarked=is_watermarked,
        step_callback=_step_callback,
    )

    try:
        logger.info("Crew kickoff started", run_id=run_id, category=product_category)
        result = crew.kickoff()   # No inputs= needed — tasks already have values baked in

        # Force-mark any still-pending agents as completed
        completed_at = _utc_now()
        for name, num in AGENT_SEQUENCE:
            def _mark_done(n=name, t=completed_at):
                db.table("agent_outputs").update({
                    "status": "completed",
                    "completed_at": t,
                }).eq("run_id", run_id).eq("agent_name", n).in_("status", ["pending", "running"]).execute()
            _safe_db_update(_mark_done, f"force-complete {name}")

            if progress_callback:
                try:
                    progress_callback(name, num, "completed")
                except Exception:
                    pass

        # Trigger RAG ingestion (non-critical)
        try:
            from rag.ingestion import ingest_run_data
            ingest_run_data(run_id)
            logger.info("RAG ingestion triggered", run_id=run_id)
        except Exception as rag_err:
            logger.warning("RAG ingestion failed — non-critical", error=str(rag_err))

        # Build knowledge graph (non-critical)
        try:
            from graph import build_graph_for_run
            build_graph_for_run(run_id)
            logger.info("Knowledge graph built", run_id=run_id)
        except Exception as graph_err:
            logger.warning("Graph build failed — non-critical", error=str(graph_err))

        # Mark run completed
        db.table("agent_runs").update({
            "status": "completed",
            "progress_pct": 100,
            "current_agent": None,
            "completed_at": _utc_now(),
        }).eq("id", run_id).execute()

        logger.info("Pipeline completed", run_id=run_id)
        return {"status": "completed", "result": str(result)[:2000]}

    except Exception as exc:
        error_msg = str(exc)[:500]
        logger.error("Pipeline failed", run_id=run_id, error=error_msg)

        db.table("agent_runs").update({
            "status": "failed",
            "error_message": error_msg,
        }).eq("id", run_id).execute()

        # Mark remaining agents as failed
        db.table("agent_outputs").update({"status": "failed"}) \
            .eq("run_id", run_id).in_("status", ["pending", "running"]).execute()

        if progress_callback:
            try:
                progress_callback("Pipeline", 0, "failed")
            except Exception:
                pass

        raise