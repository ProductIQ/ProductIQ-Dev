"""
ProductIQ — Sentiment Router
GET  /api/sentiment/         — Get brand sentiment history for authenticated user
GET  /api/sentiment/latest   — Get latest score per tracked brand
POST /api/sentiment/track    — Add a brand to track
"""

from fastapi import APIRouter, Depends, HTTPException, Header, Query
from database import get_supabase
from celery_tasks import run_sentiment_check_task
from typing import Optional
import structlog

logger = structlog.get_logger()
router = APIRouter()


def get_current_user(authorization: str = Header(...)):
    db = get_supabase()
    try:
        return db.auth.get_user(authorization.replace("Bearer ", "").strip()).user
    except Exception:
        raise HTTPException(status_code=401, detail="Unauthorized")


def _require_pro(user, db):
    profile = db.table("profiles").select("plan").eq("id", str(user.id)).maybe_single().execute().data
    if not profile or profile.get("plan", "free") == "free":
        raise HTTPException(
            status_code=403,
            detail="Brand Sentiment Tracker is a Pro+ feature. Upgrade at /pricing."
        )


@router.get("/", summary="Get sentiment score history for the user's brand")
async def get_sentiment_history(
    brand: Optional[str] = Query(None, description="Filter by brand name"),
    days: int = Query(30, description="Number of days of history"),
    user=Depends(get_current_user),
):
    db = get_supabase()
    _require_pro(user, db)

    from datetime import datetime, timedelta
    cutoff = (datetime.utcnow() - timedelta(days=days)).isoformat()

    query = (
        db.table("sentiment_scores")
        .select("*")
        .eq("user_id", str(user.id))
        .gte("scored_at", cutoff)
        .order("scored_at", desc=True)
        .limit(200)
    )
    if brand:
        query = query.eq("brand_name", brand)

    result = query.execute()
    return {"scores": result.data, "total": len(result.data)}


@router.get("/latest", summary="Get the most recent sentiment score per tracked brand")
async def get_latest_sentiment(user=Depends(get_current_user)):
    db = get_supabase()
    _require_pro(user, db)

    # Get latest score per brand using grouping
    result = (
        db.table("sentiment_scores")
        .select("brand_name, score, positive_pct, negative_pct, neutral_pct, post_count, scored_at, alert_sent")
        .eq("user_id", str(user.id))
        .order("scored_at", desc=True)
        .limit(100)
        .execute()
    )

    # Deduplicate — keep only latest per brand
    seen = set()
    latest = []
    for row in result.data:
        brand = row["brand_name"]
        if brand not in seen:
            seen.add(brand)
            latest.append(row)

    return {"brands": latest, "total": len(latest)}


@router.post("/trigger", summary="Manually trigger a sentiment check for a brand")
async def trigger_sentiment_check(brand_name: str, user=Depends(get_current_user)):
    db = get_supabase()
    _require_pro(user, db)

    if not brand_name or len(brand_name.strip()) < 2:
        raise HTTPException(status_code=400, detail="Brand name must be at least 2 characters.")

    task = run_sentiment_check_task.delay(str(user.id), brand_name.strip())
    return {
        "queued": True,
        "brand": brand_name,
        "task_id": task.id,
        "message": "Sentiment check queued. Results will appear in your dashboard within a few minutes.",
    }
