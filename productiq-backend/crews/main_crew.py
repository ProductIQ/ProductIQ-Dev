"""
ProductIQ — Main Crew (8-Agent Parallel DAG Pipeline)
crews/main_crew.py

Orchestrates 8 agents in a 3-phase DAG:
  Phase 1: Agent 1 (Scraper) — runs alone, produces raw data
  Phase 2: Agents 2, 3, 4 (Review Miner, Competitor, Trend) — run IN PARALLEL
  Phase 3: Agents 5-8 (Insight, Innovator, GTM, Report) — run sequentially

RAG ingestion is triggered between Phase 2 and Phase 3 so Agent 5 can
use semantic search over the full dataset.

Progress is tracked via:
  1. Supabase DB updates (persistent — survives page refresh)
  2. SSE callbacks pushed to the frontend via progress_callback
"""

from crewai import Crew, Process
from datetime import datetime, timezone
from typing import Callable, Optional
from concurrent.futures import ThreadPoolExecutor, as_completed
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

# Agents that can run in parallel after Agent 1 completes
# (name, number, agent_factory, task_factory)
PARALLEL_AGENTS = [
    ("Review Miner",     2, create_review_miner_agent,   create_review_task),
    ("Competitor Intel", 3, create_competitor_agent,     create_competitor_task),
    ("Trend Spotter",    4, create_trend_agent,          create_trend_task),
]


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _safe_db_update(fn: Callable, label: str) -> None:
    """Run a DB update synchronously, logging errors but never crashing the crew.

    Previously this used daemon threads, which meant writes could be lost on
    process exit (crash, deploy) — leaving agents stuck in "running" forever.
    Synchronous writes are slightly slower but guarantee the DB state is
    consistent with the crew progress shown to the user.
    """
    try:
        fn()
    except Exception as exc:
        logger.warning(f"DB update failed ({label})", error=str(exc))


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


def _mark_agent_status(db, run_id: str, agent_name: str, agent_num: int,
                       status: str, progress_callback=None) -> None:
    """Update agent_outputs and agent_runs status, plus fire progress callback."""
    now = _utc_now()

    def _update():
        if status == "running":
            db.table("agent_outputs").update({
                "status": "running",
                "started_at": now,
            }).eq("run_id", run_id).eq("agent_name", agent_name).execute()

            db.table("agent_runs").update({
                "current_agent": agent_name,
                "progress_pct": int(((agent_num - 1) / 8) * 100),
            }).eq("id", run_id).execute()
        elif status == "completed":
            db.table("agent_outputs").update({
                "status": "completed",
                "completed_at": now,
            }).eq("run_id", run_id).eq("agent_name", agent_name).execute()

    _safe_db_update(_update, f"mark {agent_name} {status}")

    if progress_callback:
        try:
            progress_callback(agent_name, agent_num, status)
        except Exception:
            pass


# ── Phase-specific crew builders (D1: parallel DAG) ──────────────────────────

def _build_phase1_crew(
    product_category: str,
    brand_name: str,
    run_id: str,
    step_callback: Optional[Callable] = None,
) -> Crew:
    """Phase 1: Agent 1 (Scraper) — runs alone, produces raw product data."""
    scraper = create_scraper_agent()
    t_scrape = create_scraper_task(scraper, product_category, brand_name, run_id)

    kwargs = dict(
        agents=[scraper],
        tasks=[t_scrape],
        process=Process.sequential,
        verbose=True,
        memory=False,
        max_rpm=30,
    )
    if step_callback:
        kwargs["step_callback"] = step_callback
    return Crew(**kwargs)


def _build_phase2_crew(
    agent_name: str,
    agent_num: int,
    agent_factory: Callable,
    task_factory: Callable,
    product_category: str,
    brand_name: str,
    run_id: str,
    step_callback: Optional[Callable] = None,
) -> Crew:
    """Phase 2: One of agents 2/3/4 — runs in parallel with the other two."""
    agent = agent_factory()

    # Competitor task takes brand_name as extra arg
    if agent_num == 3:
        task = task_factory(agent, product_category, brand_name, run_id)
    else:
        task = task_factory(agent, product_category, run_id)

    kwargs = dict(
        agents=[agent],
        tasks=[task],
        process=Process.sequential,
        verbose=True,
        memory=False,
        max_rpm=30,
    )
    if step_callback:
        kwargs["step_callback"] = step_callback
    return Crew(**kwargs)


def _build_phase3_crew(
    product_category: str,
    run_id: str,
    user_id: str,
    is_watermarked: bool,
    step_callback: Optional[Callable] = None,
) -> Crew:
    """Phase 3: Agents 5-8 (Insight, Innovator, GTM, Report) — sequential."""
    insight_synth = create_insight_agent()
    innovator     = create_innovator_agent()
    gtm           = create_gtm_agent()
    reporter      = create_report_agent()

    t_insight   = create_insight_task(insight_synth, product_category, run_id)
    t_innovate  = create_innovator_task(innovator, product_category, run_id)
    t_gtm       = create_gtm_task(gtm, product_category, run_id)
    t_report    = create_report_task(reporter, run_id, user_id, is_watermarked)

    # Context: downstream tasks reference upstream task objects
    t_innovate.context    = [t_insight]
    t_gtm.context         = [t_innovate, t_insight]
    t_report.context      = [t_insight, t_innovate, t_gtm]

    kwargs = dict(
        agents=[insight_synth, innovator, gtm, reporter],
        tasks=[t_insight, t_innovate, t_gtm, t_report],
        process=Process.sequential,
        verbose=True,
        memory=False,
        max_rpm=30,
    )
    if step_callback:
        kwargs["step_callback"] = step_callback
    return Crew(**kwargs)


# ── Backwards-compatible full crew builder ───────────────────────────────────

def build_main_crew(
    product_category: str,
    brand_name: str,
    run_id: str,
    user_id: str,
    is_watermarked: bool = False,
    step_callback: Optional[Callable] = None,
) -> Crew:
    """Instantiate all 8 agents and their tasks with dependency context.

    NOTE: This builds the FULL sequential crew. run_main_crew now uses the
    3-phase parallel DAG instead. Kept for backwards compatibility and fallback.
    """
    scraper       = create_scraper_agent()
    review_miner  = create_review_miner_agent()
    competitor    = create_competitor_agent()
    trend_spotter = create_trend_agent()
    insight_synth = create_insight_agent()
    innovator     = create_innovator_agent()
    gtm           = create_gtm_agent()
    reporter      = create_report_agent()

    t_scrape    = create_scraper_task(scraper, product_category, brand_name, run_id)
    t_review    = create_review_task(review_miner, product_category, run_id)
    t_competitor = create_competitor_task(competitor, product_category, brand_name, run_id)
    t_trend     = create_trend_task(trend_spotter, product_category, run_id)
    t_insight   = create_insight_task(insight_synth, product_category, run_id)
    t_innovate  = create_innovator_task(innovator, product_category, run_id)
    t_gtm       = create_gtm_task(gtm, product_category, run_id)
    t_report    = create_report_task(reporter, run_id, user_id, is_watermarked)

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
        memory=False,
        max_rpm=30,
    )
    if step_callback:
        crew_kwargs["step_callback"] = step_callback
    return Crew(**crew_kwargs)


# ── Main pipeline executor (3-phase parallel DAG) ────────────────────────────

def run_main_crew(
    product_category: str,
    brand_name: str,
    run_id: str,
    user_id: str,
    is_watermarked: bool,
    progress_callback: Optional[Callable[[str, int, str], None]] = None,
) -> dict:
    """
    Execute the full 8-agent pipeline using a 3-phase parallel DAG.

    Phase 1: Agent 1 (Scraper) — sequential, alone
    Phase 2: Agents 2, 3, 4 — run in parallel via ThreadPoolExecutor
    Phase 2.5: RAG ingestion (between phases 2 and 3, so Agent 5 can use it)
    Phase 3: Agents 5-8 — sequential, with context from all prior outputs

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

    # ── Helper: simple step callback for single-agent crews ───────────────────
    def _make_step_cb(agent_name: str, agent_num: int):
        """Returns a step_callback that marks the agent running on first call,
        and completed when the crew finishes."""
        started = [False]

        def _cb(step_output) -> None:
            if not started[0]:
                started[0] = True
                _mark_agent_status(db, run_id, agent_name, agent_num,
                                   "running", progress_callback)

        return _cb

    # ── Helper: run a single-agent crew and return its output ─────────────────
    def _run_single_crew(crew: Crew, agent_name: str, agent_num: int) -> str:
        result = crew.kickoff()
        _mark_agent_status(db, run_id, agent_name, agent_num,
                           "completed", progress_callback)
        return str(result)

    # ══════════════════════════════════════════════════════════════════════════
    # Phase 1: Agent 1 — Scraper (sequential, alone)
    # ══════════════════════════════════════════════════════════════════════════
    try:
        logger.info("Phase 1: Scraper starting", run_id=run_id)
        phase1_crew = _build_phase1_crew(
            product_category, brand_name, run_id,
            step_callback=_make_step_cb("Web Scraper", 1),
        )
        scraper_output = _run_single_crew(phase1_crew, "Web Scraper", 1)
        logger.info("Phase 1 complete", run_id=run_id)

    except Exception as exc:
        _handle_pipeline_failure(db, run_id, exc, progress_callback)
        raise

    # ══════════════════════════════════════════════════════════════════════════
    # Phase 2: Agents 2, 3, 4 — run in parallel
    # ══════════════════════════════════════════════════════════════════════════
    phase2_outputs = {}
    try:
        logger.info("Phase 2: Parallel agents starting", run_id=run_id)

        with ThreadPoolExecutor(max_workers=3, thread_name_prefix="phase2") as executor:
            futures = {}
            for agent_name, agent_num, agent_factory, task_factory in PARALLEL_AGENTS:
                crew = _build_phase2_crew(
                    agent_name, agent_num, agent_factory, task_factory,
                    product_category, brand_name, run_id,
                    step_callback=_make_step_cb(agent_name, agent_num),
                )
                future = executor.submit(_run_single_crew, crew, agent_name, agent_num)
                futures[future] = (agent_name, agent_num)

            for future in as_completed(futures):
                agent_name, agent_num = futures[future]
                try:
                    output = future.result()
                    phase2_outputs[agent_name] = output
                    logger.info("Phase 2 agent done", run_id=run_id, agent=agent_name)
                except Exception as agent_exc:
                    logger.error("Phase 2 agent failed", run_id=run_id,
                                 agent=agent_name, error=str(agent_exc)[:200])
                    # Mark this agent as failed but continue — other agents may still succeed
                    _mark_agent_status(db, run_id, agent_name, agent_num,
                                       "failed", progress_callback)
                    phase2_outputs[agent_name] = f"ERROR: {agent_exc}"

        logger.info("Phase 2 complete", run_id=run_id, agents=list(phase2_outputs.keys()))

    except Exception as exc:
        _handle_pipeline_failure(db, run_id, exc, progress_callback)
        raise

    # ══════════════════════════════════════════════════════════════════════════
    # Phase 2.5: RAG ingestion (D2 — moved here from end of pipeline)
    # ══════════════════════════════════════════════════════════════════════════
    try:
        from rag.ingestion import ingest_run_data
        doc_count = ingest_run_data(run_id)
        logger.info("RAG ingestion complete (mid-pipeline)", run_id=run_id, docs=doc_count)
    except Exception as rag_err:
        logger.warning("RAG ingestion failed — non-critical, continuing", error=str(rag_err))

    # ══════════════════════════════════════════════════════════════════════════
    # Phase 3: Agents 5-8 — sequential
    # ══════════════════════════════════════════════════════════════════════════
    # Progress state tracker for phase 3 step callback
    _phase3_state = {"current_index": 0}
    phase3_agents = [
        ("Insight Synthesizer", 5),
        ("Product Innovator",   6),
        ("GTM Strategist",      7),
        ("Report Builder",      8),
    ]

    def _phase3_step_cb(step_output) -> None:
        """Track agent transitions within phase 3."""
        idx = _phase3_state["current_index"]
        if idx >= len(phase3_agents):
            return

        agent_name, agent_num = phase3_agents[idx]

        is_final = False
        try:
            output_type = type(step_output).__name__
            if "Finish" in output_type or "Final" in output_type:
                is_final = True
        except Exception:
            pass

        # Mark running on first step
        if not _phase3_state.get(f"started_{agent_num}"):
            _phase3_state[f"started_{agent_num}"] = True
            _mark_agent_status(db, run_id, agent_name, agent_num,
                               "running", progress_callback)

        if is_final:
            _phase3_state["current_index"] += 1
            _mark_agent_status(db, run_id, agent_name, agent_num,
                               "completed", progress_callback)

    try:
        logger.info("Phase 3: Synthesis agents starting", run_id=run_id)
        phase3_crew = _build_phase3_crew(
            product_category, run_id, user_id, is_watermarked,
            step_callback=_phase3_step_cb,
        )
        result = phase3_crew.kickoff()

        # Force-mark any still-pending phase 3 agents as completed
        for name, num in phase3_agents:
            def _mark_done(n=name, t=_utc_now()):
                db.table("agent_outputs").update({
                    "status": "completed",
                    "completed_at": t,
                }).eq("run_id", run_id).eq("agent_name", n) \
                  .in_("status", ["pending", "running"]).execute()
            _safe_db_update(_mark_done, f"force-complete {name}")

            if progress_callback:
                try:
                    progress_callback(name, num, "completed")
                except Exception:
                    pass

        logger.info("Phase 3 complete", run_id=run_id)

    except Exception as exc:
        _handle_pipeline_failure(db, run_id, exc, progress_callback)
        raise

    # ══════════════════════════════════════════════════════════════════════════
    # Post-pipeline: knowledge graph + mark run completed
    # ══════════════════════════════════════════════════════════════════════════

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


def _handle_pipeline_failure(db, run_id: str, exc: Exception, progress_callback=None) -> None:
    """Mark the run as failed and update agent statuses."""
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
