"""
ProductIQ — Reports Router
POST /api/reports/run         — Start new 8-agent pipeline
GET  /api/reports/            — List user's runs
GET  /api/reports/{run_id}    — Get run + report detail + agent outputs
GET  /api/reports/{run_id}/insights  — Get all insights
GET  /api/reports/{run_id}/concepts  — Get all product concepts
GET  /api/reports/{run_id}/gtm       — Get GTM plan
DELETE /api/reports/{run_id}         — Delete a run

Pipeline Modes:
  USE_CELERY=True  → dispatches to Celery/Redis queue (production)
  USE_CELERY=False → runs crew in FastAPI BackgroundTasks threadpool (development)
"""

import uuid
import asyncio
import structlog
from concurrent.futures import ThreadPoolExecutor

from fastapi import APIRouter, Depends, HTTPException, Header, BackgroundTasks, Query
from typing import Optional

from models import RunRequest, RunResponse
from database import get_supabase
from analytics import track_event
from config import settings

logger = structlog.get_logger()
router = APIRouter()

# Threadpool for running synchronous CrewAI in BackgroundTasks without blocking event loop
_crew_executor = ThreadPoolExecutor(max_workers=2, thread_name_prefix="crewai")


# ── Auth dependency ───────────────────────────────────────────────────────────

def get_current_user(
    authorization: Optional[str] = Header(
        default=None,
        description="Bearer <Supabase JWT>",
    ),
    token: Optional[str] = Query(default=None),
):
    """Validate Supabase JWT and return the auth user object."""
    raw_token = token or (authorization or "").replace("Bearer ", "").strip()
    if not raw_token:
        raise HTTPException(
            status_code=401,
            detail="Authentication required. Provide Authorization header or ?token= param.",
        )
    db = get_supabase()
    try:
        response = db.auth.get_user(raw_token)
        if not response or not response.user:
            raise ValueError("No user in response")
        return response.user
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


# ── Pipeline runner (BackgroundTasks mode) ────────────────────────────────────

def _run_crew_in_thread(
    product_category: str,
    brand_name: str,
    run_id: str,
    user_id: str,
    is_watermarked: bool,
):
    """
    Synchronous function that runs the 8-agent crew.
    Called via ThreadPoolExecutor so it doesn't block the FastAPI event loop.

    SSE events go to sse_manager (in-process queue) which the SSE router subscribes to.
    """
    from crews.main_crew import run_main_crew
    from streaming import sse_manager
    import asyncio

    # Get or create event loop for this background thread
    try:
        loop = asyncio.get_event_loop()
        if loop.is_closed():
            raise RuntimeError("closed")
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)

    def progress_callback(agent_name: str, agent_num: int, status: str):
        """Push progress events to in-process SSE queue."""
        import json
        from datetime import datetime, timezone
        payload = json.dumps({
            "type": "agent_update",
            "run_id": run_id,
            "agent_name": agent_name,
            "agent_number": agent_num,
            "status": status,
            "progress_pct": int((agent_num / 8) * 100),
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })
        try:
            # sse_manager is async — schedule on the background thread's loop
            loop.run_until_complete(sse_manager.broadcast(run_id, payload))
        except Exception as sse_err:
            logger.warning("SSE broadcast failed in background thread",
                           run_id=run_id, error=str(sse_err))

    try:
        result = run_main_crew(
            product_category=product_category,
            brand_name=brand_name,
            run_id=run_id,
            user_id=user_id,
            is_watermarked=is_watermarked,
            progress_callback=progress_callback,
        )

        # Fetch report URLs and push completion event
        try:
            db = get_supabase()
            report = (
                db.table("reports")
                .select("pdf_url, pptx_url")
                .eq("run_id", run_id)
                .maybe_single()
                .execute()
                .data
            )
            import json
            completion_payload = json.dumps({
                "type": "run_completed",
                "run_id": run_id,
                "pdf_url": (report or {}).get("pdf_url"),
                "pptx_url": (report or {}).get("pptx_url"),
            })
            loop.run_until_complete(sse_manager.broadcast(run_id, completion_payload))
        except Exception:
            pass

        logger.info("Background crew finished", run_id=run_id)
        return result

    except Exception as exc:
        import json
        error_str = str(exc)[:300]
        logger.error("Background crew failed", run_id=run_id, error=error_str)
        try:
            fail_payload = json.dumps({
                "type": "run_failed",
                "run_id": run_id,
                "error": error_str,
            })
            loop.run_until_complete(sse_manager.broadcast(run_id, fail_payload))
        except Exception:
            pass


# ── Routes ────────────────────────────────────────────────────────────────────

@router.post("/run", response_model=RunResponse, summary="Start a new analysis pipeline")
async def start_run(
    req: RunRequest,
    background_tasks: BackgroundTasks,
    user=Depends(get_current_user),
):
    db = get_supabase()

    # ── Enforce freemium limits ───────────────────────────────────────────────
    profile_result = (
        db.table("profiles").select("*").eq("id", user.id).maybe_single().execute()
    )
    profile = profile_result.data

    if not profile:
        # Auto-create profile on first run
        db.table("profiles").insert({
            "id": user.id,
            "email": user.email or "",
            "plan": "free",
            "reports_used_this_month": 0,
            "reports_limit": 3,
        }).execute()
        profile = {
            "plan": "free",
            "reports_used_this_month": 0,
            "reports_limit": 3,
            "extra_reports_from_referrals": 0,
        }

    total_limit = profile["reports_limit"] + profile.get("extra_reports_from_referrals", 0)

    if profile["plan"] == "free" and profile["reports_used_this_month"] >= total_limit:
        raise HTTPException(
            status_code=403,
            detail=(
                f"Monthly limit reached ({total_limit} reports/month). "
                "Upgrade to Pro at ₹4,999/month or refer a brand to unlock more free reports."
            ),
        )

    # ── Create run record ─────────────────────────────────────────────────────
    run_id = str(uuid.uuid4())
    is_watermarked = profile["plan"] == "free"
    brand = req.brand_name or req.product_category

    db.table("agent_runs").insert({
        "id": run_id,
        "user_id": user.id,
        "product_category": req.product_category,
        "brand_name": req.brand_name,
        "target_market": req.target_market or "India",
        "status": "queued",
        "progress_pct": 0,
    }).execute()

    # ── Dispatch pipeline ─────────────────────────────────────────────────────
    celery_task_id = None

    if settings.USE_CELERY:
        # Production mode: dispatch to Celery
        try:
            from celery_tasks import run_pipeline_task
            task = run_pipeline_task.delay(
                product_category=req.product_category,
                brand_name=brand,
                run_id=run_id,
                user_id=str(user.id),
                is_watermarked=is_watermarked,
            )
            celery_task_id = task.id
            db.table("agent_runs").update({"celery_task_id": task.id}).eq("id", run_id).execute()
            logger.info("Pipeline queued in Celery", run_id=run_id, task_id=task.id)
        except Exception as celery_err:
            logger.error("Celery dispatch failed — falling back to BackgroundTasks",
                         run_id=run_id, error=str(celery_err))
            settings_dict = {"USE_CELERY": False}
            # Fall through to BackgroundTasks below

    if not settings.USE_CELERY or celery_task_id is None:
        # Development / fallback mode: run in background thread
        # Wrap the thread execution in a standard function so it doesn't fail
        # on asyncio.get_event_loop() inside a lambda
        def run_sync_in_pool():
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            loop.run_in_executor(
                _crew_executor,
                _run_crew_in_thread,
                req.product_category,
                brand,
                run_id,
                str(user.id),
                is_watermarked,
            )

        background_tasks.add_task(run_sync_in_pool)
        logger.info("Pipeline queued in BackgroundTasks", run_id=run_id)

    # ── Increment monthly usage ───────────────────────────────────────────────
    db.table("profiles").update({
        "reports_used_this_month": profile["reports_used_this_month"] + 1,
    }).eq("id", user.id).execute()

    track_event(str(user.id), "report_started", {
        "category": req.product_category,
        "plan": profile["plan"],
        "run_id": run_id,
        "mode": "celery" if celery_task_id else "direct",
    })

    logger.info("Pipeline dispatched",
                run_id=run_id, user=user.id, category=req.product_category,
                mode="celery" if celery_task_id else "direct")

    return RunResponse(
        run_id=run_id,
        status="queued",
        celery_task_id=celery_task_id,
    )


@router.get("/", summary="List all runs for authenticated user")
async def list_runs(
    user=Depends(get_current_user),
    limit: int = Query(default=20, le=100),
):
    db = get_supabase()
    result = (
        db.table("agent_runs")
        .select("*, reports(id, pdf_url, pptx_url, created_at)")
        .eq("user_id", user.id)
        .order("created_at", desc=True)
        .limit(limit)
        .execute()
    )
    return {"runs": result.data, "total": len(result.data)}


@router.get("/{run_id}", summary="Get run detail + agent outputs + report URLs")
async def get_run(run_id: str, user=Depends(get_current_user)):
    db = get_supabase()

    run = (
        db.table("agent_runs")
        .select("*")
        .eq("id", run_id)
        .eq("user_id", user.id)
        .maybe_single()
        .execute()
        .data
    )
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")

    report = (
        db.table("reports")
        .select("*")
        .eq("run_id", run_id)
        .maybe_single()
        .execute()
        .data
    )

    agent_outputs = (
        db.table("agent_outputs")
        .select("agent_name, agent_number, status, output, duration_seconds, started_at, completed_at")
        .eq("run_id", run_id)
        .order("agent_number")
        .execute()
        .data
    )

    return {
        "run": run,
        "report": report,
        "agent_outputs": agent_outputs,
    }


@router.get("/{run_id}/insights", summary="Get all insights for a run")
async def get_insights(run_id: str, user=Depends(get_current_user)):
    db = get_supabase()
    _verify_ownership(db, run_id, user.id)
    result = (
        db.table("insights")
        .select("*")
        .eq("run_id", run_id)
        .order("confidence_score", desc=True)
        .execute()
    )
    return {"insights": result.data, "total": len(result.data)}


@router.get("/{run_id}/concepts", summary="Get all product concepts for a run")
async def get_concepts(run_id: str, user=Depends(get_current_user)):
    db = get_supabase()
    _verify_ownership(db, run_id, user.id)
    result = (
        db.table("product_concepts")
        .select("*")
        .eq("run_id", run_id)
        .order("validation_score", desc=True)
        .execute()
    )
    return {"concepts": result.data, "total": len(result.data)}


@router.get("/{run_id}/gtm", summary="Get GTM plan for a run")
async def get_gtm(run_id: str, user=Depends(get_current_user)):
    db = get_supabase()
    _verify_ownership(db, run_id, user.id)
    result = db.table("gtm_plans").select("*").eq("run_id", run_id).execute()
    return {"gtm_plans": result.data}


@router.get("/{run_id}/clusters", summary="Get review clusters for a run")
async def get_clusters(run_id: str, user=Depends(get_current_user)):
    db = get_supabase()
    _verify_ownership(db, run_id, user.id)
    result = (
        db.table("review_clusters")
        .select("*")
        .eq("run_id", run_id)
        .order("review_count", desc=True)
        .execute()
    )
    return {"clusters": result.data, "total": len(result.data)}


@router.get("/{run_id}/competitors", summary="Get competitor data for a run")
async def get_competitors(run_id: str, user=Depends(get_current_user)):
    db = get_supabase()
    _verify_ownership(db, run_id, user.id)
    result = db.table("competitors").select("*").eq("run_id", run_id).execute()
    return {"competitors": result.data, "total": len(result.data)}


@router.get("/{run_id}/products", summary="Get scraped products for a run")
async def get_products(run_id: str, user=Depends(get_current_user)):
    db = get_supabase()
    _verify_ownership(db, run_id, user.id)
    result = (
        db.table("products")
        .select("*")
        .eq("run_id", run_id)
        .order("rating", desc=True)
        .limit(200)
        .execute()
    )
    return {"products": result.data, "total": len(result.data)}


@router.delete("/{run_id}", summary="Delete a run and all its data")
async def delete_run(run_id: str, user=Depends(get_current_user)):
    db = get_supabase()
    _verify_ownership(db, run_id, user.id)
    db.table("agent_runs").delete().eq("id", run_id).eq("user_id", user.id).execute()
    return {"deleted": True, "run_id": run_id}


# ── Helpers ───────────────────────────────────────────────────────────────────

def _verify_ownership(db, run_id: str, user_id: str) -> None:
    run = (
        db.table("agent_runs")
        .select("id")
        .eq("id", run_id)
        .eq("user_id", user_id)
        .maybe_single()
        .execute()
        .data
    )
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")