"""
ProductIQ — V2 Feature Router
routers/v2.py

Endpoints for v2 features that don't fit in the existing routers:
  - Notifications (user notification feed)
  - Intelligence events (real-time market intelligence stream)
  - Brand profiles (tracked brands with health scores)
  - Chat (RAG-powered Q&A over run data)
  - Compare (delta between two runs)
  - Validate (concept validation scoring)

All endpoints require authentication. Data is stored in Supabase tables
that are created by the v2 migration script.
"""
from fastapi import APIRouter, Depends, HTTPException, Header, Query
from pydantic import BaseModel, Field
from typing import Optional, List
from database import get_supabase
from analytics import track_event
import structlog

logger = structlog.get_logger()
router = APIRouter()


# ── Auth dependency (shared pattern) ──────────────────────────────────────────

def get_current_user(authorization: str = Header(...)):
    db = get_supabase()
    try:
        return db.auth.get_user(authorization.replace("Bearer ", "").strip()).user
    except Exception:
        raise HTTPException(status_code=401, detail="Unauthorized")


# ══════════════════════════════════════════════════════════════════════════════
# NOTIFICATIONS
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/notifications", summary="Get user notifications")
async def list_notifications(
    user=Depends(get_current_user),
    limit: int = Query(50, ge=1, le=200),
    unread_only: bool = Query(False),
):
    """Get the authenticated user's notification feed."""
    db = get_supabase()
    query = db.table("notifications").select("*").eq("user_id", str(user.id))
    if unread_only:
        query = query.eq("read", False)
    result = query.order("created_at", desc=True).limit(limit).execute()
    return {"notifications": result.data or [], "total": len(result.data or [])}


@router.patch("/notifications/{notification_id}/read", summary="Mark notification as read")
async def mark_notification_read(notification_id: str, user=Depends(get_current_user)):
    """Mark a single notification as read."""
    db = get_supabase()
    result = (
        db.table("notifications")
        .update({"read": True})
        .eq("id", notification_id)
        .eq("user_id", str(user.id))
        .execute()
    )
    return {"updated": True, "notification": result.data[0] if result.data else None}


@router.patch("/notifications/read-all", summary="Mark all notifications as read")
async def mark_all_notifications_read(user=Depends(get_current_user)):
    """Mark all of the user's notifications as read."""
    db = get_supabase()
    db.table("notifications").update({"read": True}).eq("user_id", str(user.id)).eq("read", False).execute()
    return {"updated": True}


@router.get("/notifications/unread-count", summary="Get unread notification count")
async def unread_count(user=Depends(get_current_user)):
    """Get the count of unread notifications for the badge indicator."""
    db = get_supabase()
    result = (
        db.table("notifications")
        .select("id", count="exact")
        .eq("user_id", str(user.id))
        .eq("read", False)
        .execute()
    )
    return {"count": result.count or 0}


# ══════════════════════════════════════════════════════════════════════════════
# INTELLIGENCE EVENTS
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/intelligence/events", summary="Get intelligence events feed")
async def list_intel_events(
    user=Depends(get_current_user),
    limit: int = Query(50, ge=1, le=200),
    brand: Optional[str] = Query(None),
    severity: Optional[str] = Query(None),
):
    """Get recent intelligence events (competitor moves, trend shifts, sentiment alerts)."""
    db = get_supabase()
    query = db.table("intelligence_events").select("*").eq("user_id", str(user.id))
    if brand:
        query = query.eq("brand_name", brand)
    if severity:
        query = query.eq("severity", severity)
    result = query.order("created_at", desc=True).limit(limit).execute()
    return {"events": result.data or [], "total": len(result.data or [])}


@router.get("/intelligence/brands", summary="Get tracked brands for intelligence filter")
async def list_intel_brands(user=Depends(get_current_user)):
    """Get the list of brands the user is tracking (for the intelligence filter dropdown)."""
    db = get_supabase()
    result = (
        db.table("brand_profiles")
        .select("brand_name, category, health_score, is_active")
        .eq("user_id", str(user.id))
        .eq("is_active", True)
        .order("brand_name")
        .execute()
    )
    return {"brands": result.data or []}


# ══════════════════════════════════════════════════════════════════════════════
# BRAND PROFILES
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/brands", summary="List tracked brand profiles")
async def list_brands(user=Depends(get_current_user)):
    """Get all brand profiles for the authenticated user."""
    db = get_supabase()
    result = (
        db.table("brand_profiles")
        .select("*")
        .eq("user_id", str(user.id))
        .order("created_at", desc=True)
        .execute()
    )
    return {"brands": result.data or []}


class CreateBrandRequest(BaseModel):
    brand_name: str
    category: str
    target_market: Optional[str] = "India"


@router.post("/brands", summary="Add a brand to track")
async def create_brand(req: CreateBrandRequest, user=Depends(get_current_user)):
    """Add a new brand profile for monitoring."""
    db = get_supabase()
    result = (
        db.table("brand_profiles")
        .insert({
            "user_id": str(user.id),
            "brand_name": req.brand_name,
            "category": req.category,
            "target_market": req.target_market,
            "is_active": True,
            "health_score": None,  # Will be computed by Agent 9
        })
        .execute()
    )
    track_event(str(user.id), "brand_added", {"brand": req.brand_name})
    return {"brand": result.data[0] if result.data else None}


@router.delete("/brands/{brand_id}", summary="Remove a tracked brand")
async def delete_brand(brand_id: str, user=Depends(get_current_user)):
    """Remove a brand from tracking (soft delete — sets is_active=False)."""
    db = get_supabase()
    db.table("brand_profiles").update({"is_active": False}).eq("id", brand_id).eq("user_id", str(user.id)).execute()
    return {"deleted": True}


# ══════════════════════════════════════════════════════════════════════════════
# CHAT (RAG-powered Q&A)
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/chat/sessions", summary="List chat sessions")
async def list_chat_sessions(user=Depends(get_current_user)):
    """Get all chat sessions for the authenticated user."""
    db = get_supabase()
    result = (
        db.table("chat_sessions")
        .select("id, title, created_at, updated_at, run_id")
        .eq("user_id", str(user.id))
        .order("updated_at", desc=True)
        .execute()
    )
    return {"sessions": result.data or []}


@router.get("/chat/sessions/{session_id}/messages", summary="Get messages in a chat session")
async def get_chat_messages(session_id: str, user=Depends(get_current_user)):
    """Get all messages in a chat session."""
    db = get_supabase()
    result = (
        db.table("chat_messages")
        .select("*")
        .eq("session_id", session_id)
        .order("created_at", asc=True)
        .execute()
    )
    return {"messages": result.data or []}


class ChatMessageRequest(BaseModel):
    message: str
    run_id: Optional[str] = None
    session_id: Optional[str] = None


@router.post("/chat/message", summary="Send a message and get a RAG-powered response")
async def send_chat_message(req: ChatMessageRequest, user=Depends(get_current_user)):
    """Send a chat message and receive a response powered by RAG over run data.

    If session_id is not provided, a new session is created.
    If run_id is provided, the RAG query is scoped to that run's data.
    """
    db = get_supabase()
    import uuid

    # Create or get session
    session_id = req.session_id
    if not session_id:
        session_id = str(uuid.uuid4())
        # Generate a title from the first message
        title = req.message[:60] + ("..." if len(req.message) > 60 else "")
        db.table("chat_sessions").insert({
            "id": session_id,
            "user_id": str(user.id),
            "title": title,
            "run_id": req.run_id,
        }).execute()

    # Save user message
    db.table("chat_messages").insert({
        "session_id": session_id,
        "role": "user",
        "content": req.message,
    }).execute()

    # Generate response via RAG
    try:
        from rag.query import query_rag
        answer = query_rag(question=req.message, run_id=req.run_id, user_id=str(user.id))
        source = "rag"
    except Exception as rag_err:
        logger.warning("RAG query failed, using fallback", error=str(rag_err)[:120])
        answer = (
            "I'm currently unable to search the report data. "
            "This usually means the RAG index hasn't been built yet for this run. "
            "Please wait for a report to complete and try again."
        )
        source = "fallback"

    # Save assistant message
    db.table("chat_messages").insert({
        "session_id": session_id,
        "role": "assistant",
        "content": answer,
        "metadata": {"source": source, "run_id": req.run_id},
    }).execute()

    # Update session timestamp
    db.table("chat_sessions").update({"updated_at": "now()"}).eq("id", session_id).execute()

    return {
        "session_id": session_id,
        "answer": answer,
        "source": source,
    }


@router.delete("/chat/sessions/{session_id}", summary="Delete a chat session")
async def delete_chat_session(session_id: str, user=Depends(get_current_user)):
    """Delete a chat session and all its messages."""
    db = get_supabase()
    # Verify ownership
    session = (
        db.table("chat_sessions")
        .select("id")
        .eq("id", session_id)
        .eq("user_id", str(user.id))
        .maybe_single()
        .execute()
        .data
    )
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    db.table("chat_messages").delete().eq("session_id", session_id).execute()
    db.table("chat_sessions").delete().eq("id", session_id).execute()
    return {"deleted": True}


# ══════════════════════════════════════════════════════════════════════════════
# COMPARE (run delta)
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/compare/{run_id_1}/{run_id_2}", summary="Compare two runs")
async def compare_runs(run_id_1: str, run_id_2: str, user=Depends(get_current_user)):
    """Compare two pipeline runs and return deltas for key metrics.

    Returns side-by-side data for insights, competitors, sentiment, and trends.
    """
    db = get_supabase()

    # Fetch both runs (verify ownership)
    runs = (
        db.table("agent_runs")
        .select("*")
        .in_("id", [run_id_1, run_id_2])
        .eq("user_id", str(user.id))
        .execute()
        .data
    )
    if len(runs) < 2:
        raise HTTPException(status_code=404, detail="One or both runs not found")

    run1 = next((r for r in runs if r["id"] == run_id_1), None)
    run2 = next((r for r in runs if r["id"] == run_id_2), None)

    # Fetch insights for both runs
    insights1 = db.table("insights").select("*").eq("run_id", run_id_1).execute().data or []
    insights2 = db.table("insights").select("*").eq("run_id", run_id_2).execute().data or []

    # Fetch competitors for both runs
    competitors1 = db.table("competitors").select("*").eq("run_id", run_id_1).execute().data or []
    competitors2 = db.table("competitors").select("*").eq("run_id", run_id_2).execute().data or []

    # Fetch review clusters for both runs
    clusters1 = db.table("review_clusters").select("*").eq("run_id", run_id_1).execute().data or []
    clusters2 = db.table("review_clusters").select("*").eq("run_id", run_id_2).execute().data or []

    # Compute deltas
    deltas = {
        "run_1": {
            "id": run1["id"],
            "category": run1["product_category"],
            "brand": run1.get("brand_name"),
            "created_at": run1["created_at"],
            "status": run1["status"],
        },
        "run_2": {
            "id": run2["id"],
            "category": run2["product_category"],
            "brand": run2.get("brand_name"),
            "created_at": run2["created_at"],
            "status": run2["status"],
        },
        "insights": {
            "run_1_count": len(insights1),
            "run_2_count": len(insights2),
            "delta": len(insights2) - len(insights1),
        },
        "competitors": {
            "run_1_count": len(competitors1),
            "run_2_count": len(competitors2),
            "delta": len(competitors2) - len(competitors1),
        },
        "clusters": {
            "run_1_count": len(clusters1),
            "run_2_count": len(clusters2),
            "delta": len(clusters2) - len(clusters1),
        },
        "run_1_insights": insights1,
        "run_2_insights": insights2,
        "run_1_competitors": competitors1,
        "run_2_competitors": competitors2,
    }

    return deltas


# ══════════════════════════════════════════════════════════════════════════════
# VALIDATE (concept validation)
# ══════════════════════════════════════════════════════════════════════════════

class ValidateRequest(BaseModel):
    concept_name: str = Field(..., description="Product concept name")
    description: str = Field(..., description="Detailed concept description")
    target_market: Optional[str] = "India"
    run_id: Optional[str] = None  # Optional: validate against a specific run's data


@router.post("/validate", summary="Validate a product concept")
async def validate_concept(req: ValidateRequest, user=Depends(get_current_user)):
    """Validate a product concept against market data.

    Uses Gemini to score the concept on:
    - Market fit (0-100)
    - Differentiation (0-100)
    - Feasibility (0-100)
    - Overall score (0-100)

    If run_id is provided, uses that run's data as context.
    """
    import uuid
    db = get_supabase()

    # Create validation record
    validation_id = str(uuid.uuid4())
    db.table("concept_validations").insert({
        "id": validation_id,
        "user_id": str(user.id),
        "concept_name": req.concept_name,
        "description": req.description,
        "target_market": req.target_market,
        "run_id": req.run_id,
        "status": "pending",
    }).execute()

    # Run validation synchronously (it's a single LLM call, ~10 seconds)
    try:
        from llm_utils import call_with_retry
        import google.generativeai as genai
        from config import settings

        genai.configure(api_key=settings.GEMINI_API_KEY)
        model = genai.GenerativeModel("gemini-2.5-flash")

        # Build context from run data if available
        context = ""
        if req.run_id:
            insights = db.table("insights").select("title, description, category").eq("run_id", req.run_id).limit(10).execute().data or []
            competitors = db.table("competitors").select("brand_name, key_strengths, key_weaknesses").eq("run_id", req.run_id).limit(5).execute().data or []
            context = f"\n\nMarket context:\nInsights: {insights}\nCompetitors: {competitors}"

        prompt = f"""You are a product validation expert. Score this product concept on a scale of 0-100.

Concept: {req.concept_name}
Description: {req.description}
Target market: {req.target_market}{context}

Return a JSON object with:
{{
  "market_fit": <0-100 score>,
  "differentiation": <0-100 score>,
  "feasibility": <0-100 score>,
  "overall_score": <0-100 score>,
  "summary": "<2-3 sentence summary>",
  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "risks": ["<risk 1>", "<risk 2>", "<risk 3>"],
  "recommendations": ["<recommendation 1>", "<recommendation 2>"]
}}

Return ONLY the JSON, no markdown."""

        response = call_with_retry(model.generate_content, prompt)
        response_text = response.text.strip()
        if response_text.startswith("```"):
            response_text = response_text.split("\n", 1)[-1].rsplit("```", 1)[0].strip()

        import json
        result = json.loads(response_text)

        # Update validation record
        db.table("concept_validations").update({
            "status": "completed",
            "market_fit": result.get("market_fit", 0),
            "differentiation": result.get("differentiation", 0),
            "feasibility": result.get("feasibility", 0),
            "overall_score": result.get("overall_score", 0),
            "summary": result.get("summary", ""),
            "strengths": result.get("strengths", []),
            "risks": result.get("risks", []),
            "recommendations": result.get("recommendations", []),
        }).eq("id", validation_id).execute()

        track_event(str(user.id), "concept_validated", {"concept": req.concept_name})

        return {
            "validation_id": validation_id,
            "status": "completed",
            "result": result,
        }

    except Exception as exc:
        logger.error("Concept validation failed", error=str(exc)[:200])
        db.table("concept_validations").update({
            "status": "failed",
            "error": str(exc)[:500],
        }).eq("id", validation_id).execute()
        raise HTTPException(status_code=500, detail=f"Validation failed: {str(exc)[:200]}")


@router.get("/validate/history", summary="Get validation history")
async def validation_history(user=Depends(get_current_user)):
    """Get past concept validations for the authenticated user."""
    db = get_supabase()
    result = (
        db.table("concept_validations")
        .select("id, concept_name, overall_score, status, created_at")
        .eq("user_id", str(user.id))
        .order("created_at", desc=True)
        .limit(20)
        .execute()
    )
    return {"validations": result.data or []}
