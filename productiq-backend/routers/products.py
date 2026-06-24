"""
ProductIQ — Products Router
Endpoints for product listings, reviews, competitors, trends, and direct Apify test.
"""

from fastapi import APIRouter, Depends, HTTPException, Header, Query
from fastapi.responses import JSONResponse
from database import get_supabase
from config import settings
from typing import Optional
import structlog

logger = structlog.get_logger()
router = APIRouter()


def get_current_user(
    authorization: Optional[str] = Header(default=None),
    token: Optional[str] = Query(default=None),
):
    raw = token or (authorization or "").replace("Bearer ", "").strip()
    if not raw:
        raise HTTPException(status_code=401, detail="Authentication required")
    db = get_supabase()
    try:
        result = db.auth.get_user(raw)
        if not result or not result.user:
            raise ValueError("empty user")
        return result.user
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


# ─── Run-scoped read endpoints ────────────────────────────────────────────────

@router.get("/{run_id}/products", summary="Get scraped products for a run")
async def get_products(
    run_id: str,
    platform: Optional[str] = Query(None, description="Filter: amazon_india | flipkart"),
    limit: int = Query(50, le=200),
    user=Depends(get_current_user),
):
    db = get_supabase()
    _verify_ownership(db, run_id, user.id)
    q = db.table("products").select("*").eq("run_id", run_id).limit(limit)
    if platform:
        q = q.eq("platform", platform)
    result = q.execute()
    return {"products": result.data, "total": len(result.data)}


@router.get("/{run_id}/reviews", summary="Get reviews for a run")
async def get_reviews(
    run_id: str,
    sentiment: Optional[str] = Query(None, description="Filter: positive | negative | neutral"),
    limit: int = Query(100, le=500),
    user=Depends(get_current_user),
):
    db = get_supabase()
    _verify_ownership(db, run_id, user.id)
    q = db.table("reviews").select("*").eq("run_id", run_id).limit(limit)
    if sentiment:
        q = q.eq("sentiment_label", sentiment)
    result = q.execute()
    return {"reviews": result.data, "total": len(result.data)}


@router.get("/{run_id}/clusters", summary="Get review topic clusters for a run")
async def get_clusters(run_id: str, user=Depends(get_current_user)):
    db = get_supabase()
    _verify_ownership(db, run_id, user.id)
    result = (
        db.table("review_clusters")
        .select("*").eq("run_id", run_id)
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


@router.get("/{run_id}/trends", summary="Get trend intelligence for a run")
async def get_trends(
    run_id: str,
    velocity: Optional[str] = Query(None, description="Filter: rising | stable | declining"),
    user=Depends(get_current_user),
):
    db = get_supabase()
    _verify_ownership(db, run_id, user.id)
    q = db.table("trends").select("*").eq("run_id", run_id)
    if velocity:
        q = q.eq("velocity", velocity)
    result = q.execute()
    return {"trends": result.data, "total": len(result.data)}


@router.get("/{run_id}/suppliers", summary="Get sourced suppliers for a run")
async def get_suppliers(run_id: str, user=Depends(get_current_user)):
    db = get_supabase()
    _verify_ownership(db, run_id, user.id)
    result = db.table("suppliers").select("*").eq("run_id", run_id).execute()
    return {"suppliers": result.data, "total": len(result.data)}


@router.get("/{run_id}/compliance", summary="Get compliance checks for a run")
async def get_compliance(run_id: str, user=Depends(get_current_user)):
    db = get_supabase()
    _verify_ownership(db, run_id, user.id)
    result = db.table("compliance_checks").select("*").eq("run_id", run_id).execute()
    return {"compliance_checks": result.data, "total": len(result.data)}


# ─── Apify Integration Tests (no auth needed in dev, useful for debugging) ────

@router.get(
    "/test/amazon",
    summary="[DEBUG] Test Amazon Apify scraper directly",
    tags=["debug"],
)
async def test_amazon_scraper(
    query: str = Query("whey protein", description="Search keyword"),
    max_results: int = Query(5, le=20),
):
    """
    Directly calls the Apify Amazon actor to validate the schema and token.
    Does NOT require authentication. Only usable in development.
    """
    if settings.is_production:
        raise HTTPException(status_code=404, detail="Not found")

    if not settings.apify_configured:
        return JSONResponse(
            status_code=503,
            content={"error": "APIFY_API_TOKEN not configured", "products": [], "total": 0},
        )

    try:
        from tools.scraping_tools import AmazonScraperTool
        tool = AmazonScraperTool()
        result_json = tool._run(query=query, max_results=max_results)
        import json
        result = json.loads(result_json)
        logger.info("Amazon test scrape", query=query, total=result.get("total", 0))
        return result
    except Exception as exc:
        logger.error("Amazon test scrape failed", error=str(exc))
        return JSONResponse(status_code=500, content={"error": str(exc)})


@router.get(
    "/test/flipkart",
    summary="[DEBUG] Test Flipkart Apify scraper directly",
    tags=["debug"],
)
async def test_flipkart_scraper(
    query: str = Query("whey protein", description="Search keyword"),
    max_results: int = Query(5, le=20),
):
    """Directly calls the Apify Flipkart actor (with fallback) to validate the schema."""
    if settings.is_production:
        raise HTTPException(status_code=404, detail="Not found")

    if not settings.apify_configured:
        return JSONResponse(
            status_code=503,
            content={"error": "APIFY_API_TOKEN not configured", "products": [], "total": 0},
        )

    try:
        from tools.scraping_tools import FlipkartScraperTool
        tool = FlipkartScraperTool()
        result_json = tool._run(query=query, max_results=max_results)
        import json
        result = json.loads(result_json)
        logger.info("Flipkart test scrape", query=query, total=result.get("total", 0))
        return result
    except Exception as exc:
        logger.error("Flipkart test scrape failed", error=str(exc))
        return JSONResponse(status_code=500, content={"error": str(exc)})


@router.get(
    "/test/reviews",
    summary="[DEBUG] Test Amazon Reviews Apify scraper directly",
    tags=["debug"],
)
async def test_review_scraper(
    product_url: str = Query(
        "https://www.amazon.in/dp/B07WQXF9Y8",
        description="Amazon.in product page URL",
    ),
    max_reviews: int = Query(10, le=50),
):
    """Directly calls the Apify Amazon Reviews actor to validate the schema."""
    if settings.is_production:
        raise HTTPException(status_code=404, detail="Not found")

    if not settings.apify_configured:
        return JSONResponse(
            status_code=503,
            content={"error": "APIFY_API_TOKEN not configured", "reviews": [], "total": 0},
        )

    try:
        from tools.scraping_tools import ReviewScraperTool
        tool = ReviewScraperTool()
        result_json = tool._run(product_url=product_url, max_reviews=max_reviews)
        import json
        result = json.loads(result_json)
        logger.info("Review test scrape", url=product_url, total=result.get("total", 0))
        return result
    except Exception as exc:
        logger.error("Review test scrape failed", error=str(exc))
        return JSONResponse(status_code=500, content={"error": str(exc)})


# ─── Helper ───────────────────────────────────────────────────────────────────

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
        raise HTTPException(status_code=404, detail="Run not found or access denied")
