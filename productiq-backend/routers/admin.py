"""
ProductIQ — Admin Router
Admin-only endpoints for the admin dashboard: user management, system stats,
revenue analytics, queue health, and audit log.

All endpoints require both get_current_user + require_admin dependencies.
"""

from fastapi import APIRouter, Depends, Query, HTTPException
from typing import Optional
import structlog
from datetime import datetime, timedelta, timezone

from auth import get_current_user, require_admin
from database import get_supabase
from config import settings

logger = structlog.get_logger()

router = APIRouter()


# ── Helper: log admin actions ─────────────────────────────────────────────────
def _audit_log(admin_id: str, action: str, target_id: str = None, details: dict = None):
    """Insert an entry into the admin audit log."""
    try:
        db = get_supabase()
        db.table("admin_audit_log").insert({
            "admin_id": admin_id,
            "action": action,
            "target_id": target_id,
            "target_type": "user",
            "details": details or {},
        }).execute()
    except Exception as exc:
        logger.warning("Failed to write audit log", action=action, error=str(exc))


# ── Overview Stats ────────────────────────────────────────────────────────────

@router.get("/stats", summary="Get platform overview stats")
async def get_stats(user=Depends(get_current_user), _=Depends(require_admin())):
    """High-level platform metrics for the admin dashboard overview cards."""
    db = get_supabase()

    # ── User stats ──
    profiles = db.table("profiles").select("id, plan, created_at").execute().data or []
    total_users = len(profiles)
    plan_counts = {"free": 0, "pro": 0, "enterprise": 0}
    for p in profiles:
        plan = p.get("plan", "free")
        plan_counts[plan] = plan_counts.get(plan, 0) + 1

    # New users in last 7 days
    seven_days_ago = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
    new_users_7d = sum(1 for p in profiles if p.get("created_at", "") >= seven_days_ago)

    # ── Run stats ──
    runs = db.table("agent_runs").select("id, status, created_at").execute().data or []
    total_runs = len(runs)
    completed_runs = sum(1 for r in runs if r.get("status") == "completed")
    failed_runs = sum(1 for r in runs if r.get("status") == "failed")
    running_runs = sum(1 for r in runs if r.get("status") in ("running", "queued"))
    runs_7d = sum(1 for r in runs if r.get("created_at", "") >= seven_days_ago)

    # ── Revenue stats ──
    transactions = (
        db.table("transactions")
        .select("amount_paise, status, created_at")
        .eq("status", "paid")
        .execute()
        .data or []
    )
    total_revenue_paise = sum(t.get("amount_paise", 0) for t in transactions)
    revenue_7d_paise = sum(
        t.get("amount_paise", 0)
        for t in transactions
        if t.get("created_at", "") >= seven_days_ago
    )

    # ── Notification stats ──
    notifications = db.table("notifications").select("id, read").execute().data or []
    total_notifications = len(notifications)

    # ── Intelligence events ──
    intel_events = db.table("intelligence_events").select("id, severity").execute().data or []
    total_intel_events = len(intel_events)
    critical_events = sum(1 for e in intel_events if e.get("severity") == "critical")

    return {
        "users": {
            "total": total_users,
            "new_7d": new_users_7d,
            "by_plan": plan_counts,
        },
        "runs": {
            "total": total_runs,
            "completed": completed_runs,
            "failed": failed_runs,
            "running": running_runs,
            "new_7d": runs_7d,
        },
        "revenue": {
            "total_paise": total_revenue_paise,
            "total_inr": total_revenue_paise / 100,
            "revenue_7d_paise": revenue_7d_paise,
            "revenue_7d_inr": revenue_7d_paise / 100,
            "transaction_count": len(transactions),
        },
        "notifications": {
            "total": total_notifications,
        },
        "intelligence": {
            "total_events": total_intel_events,
            "critical_events": critical_events,
        },
    }


# ── User Management ───────────────────────────────────────────────────────────

@router.get("/users", summary="List all users with pagination")
async def list_users(
    user=Depends(get_current_user),
    _=Depends(require_admin()),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    search: Optional[str] = Query(None, description="Search by email or name"),
    plan: Optional[str] = Query(None, description="Filter by plan"),
):
    """List all users for the admin user management table."""
    db = get_supabase()

    query = db.table("profiles").select(
        "id, email, full_name, company_name, plan, role, "
        "reports_used_this_month, reports_limit, created_at, updated_at"
    )

    if search:
        # Supabase doesn't support ILIKE via the JS client easily,
        # so we fetch and filter. For large datasets, use PostgREST filters.
        query = query.or_(f"email.ilike.%{search}%,full_name.ilike.%{search}%,company_name.ilike.%{search}%")
    if plan and plan != "all":
        query = query.eq("plan", plan)

    result = query.order("created_at", desc=True).range(offset, offset + limit - 1).execute()
    count_result = db.table("profiles").select("id", count="exact")
    if plan and plan != "all":
        count_result = count_result.eq("plan", plan)
    count_data = count_result.execute()

    return {
        "users": result.data or [],
        "total": count_result.count or 0,
        "offset": offset,
        "limit": limit,
    }


@router.patch("/users/{user_id}/plan", summary="Change a user's plan")
async def change_user_plan(
    user_id: str,
    new_plan: str,
    user=Depends(get_current_user),
    _=Depends(require_admin()),
):
    """Change a user's subscription plan (admin override)."""
    if new_plan not in ("free", "pro", "enterprise"):
        raise HTTPException(status_code=400, detail="Invalid plan. Must be free, pro, or enterprise.")

    plan_limits = {"free": 3, "pro": 50, "enterprise": 500}
    db = get_supabase()
    result = (
        db.table("profiles")
        .update({
            "plan": new_plan,
            "reports_limit": plan_limits[new_plan],
        })
        .eq("id", user_id)
        .execute()
    )

    _audit_log(str(user.id), "user.plan_change", user_id, {"new_plan": new_plan})

    return {"updated": True, "user_id": user_id, "new_plan": new_plan}


@router.patch("/users/{user_id}/role", summary="Change a user's admin role")
async def change_user_role(
    user_id: str,
    new_role: str,
    user=Depends(get_current_user),
    _=Depends(require_admin()),
):
    """Grant or revoke admin privileges."""
    if new_role not in ("user", "admin"):
        raise HTTPException(status_code=400, detail="Invalid role. Must be 'user' or 'admin'.")

    # Prevent self-demotion (safety check)
    if user_id == str(user.id) and new_role == "user":
        raise HTTPException(status_code=400, detail="Cannot revoke your own admin privileges.")

    db = get_supabase()
    db.table("profiles").update({"role": new_role}).eq("id", user_id).execute()

    _audit_log(str(user.id), "user.role_change", user_id, {"new_role": new_role})

    return {"updated": True, "user_id": user_id, "new_role": new_role}


# ── System Health ─────────────────────────────────────────────────────────────

@router.get("/health", summary="Get system health metrics")
async def get_health(user=Depends(get_current_user), _=Depends(require_admin())):
    """System health: Redis connectivity, Celery queue depth, LLM API status."""
    health = {
        "redis": {"status": "unknown", "latency_ms": None},
        "celery": {"status": "unknown", "queues": {}},
        "llm": {"status": "unknown", "keys_available": 0},
        "database": {"status": "unknown"},
    }

    # ── Redis health ──
    try:
        import time
        import redis as redis_lib
        r = redis_lib.from_url(settings.REDIS_URL, decode_responses=True)
        start = time.time()
        r.ping()
        latency = round((time.time() - start) * 1000, 1)
        health["redis"] = {"status": "healthy", "latency_ms": latency}

        # ── Celery queue depths (from Redis) ──
        queues = {}
        for queue_name in ["pipeline", "monitoring", "default"]:
            try:
                depth = r.llen(queue_name)
                queues[queue_name] = depth
            except Exception:
                queues[queue_name] = 0
        health["celery"] = {"status": "healthy" if sum(queues.values()) < 100 else "degraded", "queues": queues}
    except Exception as exc:
        health["redis"] = {"status": "unhealthy", "error": str(exc)[:100]}
        health["celery"] = {"status": "unknown", "queues": {}}

    # ── LLM API key availability ──
    try:
        keys = []
        if settings.GEMINI_API_KEY:
            keys.append("gemini-primary")
        # Check for rotated keys (gemini_key_2 through gemini_key_6)
        for i in range(2, 7):
            key_val = getattr(settings, f"GEMINI_API_KEY_{i}", None)
            if key_val:
                keys.append(f"gemini-key-{i}")
        health["llm"] = {"status": "healthy" if len(keys) > 0 else "unhealthy", "keys_available": len(keys)}
    except Exception:
        health["llm"] = {"status": "unknown", "keys_available": 0}

    # ── Database health ──
    try:
        db = get_supabase()
        db.table("profiles").select("id").limit(1).execute()
        health["database"] = {"status": "healthy"}
    except Exception as exc:
        health["database"] = {"status": "unhealthy", "error": str(exc)[:100]}

    return health


# ── Revenue Analytics ─────────────────────────────────────────────────────────

@router.get("/revenue", summary="Get revenue analytics")
async def get_revenue(
    user=Depends(get_current_user),
    _=Depends(require_admin()),
    days: int = Query(30, ge=1, le=365, description="Number of days to analyze"),
):
    """Revenue breakdown by day for charting."""
    db = get_supabase()
    start_date = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()

    transactions = (
        db.table("transactions")
        .select("amount_paise, status, plan, created_at, type")
        .eq("status", "paid")
        .gte("created_at", start_date)
        .order("created_at", desc=True)
        .execute()
        .data or []
    )

    # Group by day
    daily = {}
    for t in transactions:
        day = t.get("created_at", "")[:10]  # YYYY-MM-DD
        if day not in daily:
            daily[day] = {"date": day, "revenue_paise": 0, "count": 0}
        daily[day]["revenue_paise"] += t.get("amount_paise", 0)
        daily[day]["count"] += 1

    # Plan distribution
    plan_revenue = {"free": 0, "pro": 0, "enterprise": 0}
    for t in transactions:
        plan = t.get("plan", "free")
        plan_revenue[plan] = plan_revenue.get(plan, 0) + t.get("amount_paise", 0)

    return {
        "daily": sorted(daily.values(), key=lambda x: x["date"]),
        "plan_revenue_paise": plan_revenue,
        "total_revenue_paise": sum(t.get("amount_paise", 0) for t in transactions),
        "total_transactions": len(transactions),
        "avg_transaction_paise": sum(t.get("amount_paise", 0) for t in transactions) // max(len(transactions), 1),
    }


# ── Run Analytics ─────────────────────────────────────────────────────────────

@router.get("/runs", summary="Get run analytics")
async def get_run_analytics(
    user=Depends(get_current_user),
    _=Depends(require_admin()),
    days: int = Query(30, ge=1, le=365),
):
    """Run statistics for charting — daily runs, success rate, avg duration."""
    db = get_supabase()
    start_date = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()

    runs = (
        db.table("agent_runs")
        .select("id, status, created_at, product_category")
        .gte("created_at", start_date)
        .order("created_at", desc=True)
        .execute()
        .data or []
    )

    # Group by day
    daily = {}
    for r in runs:
        day = r.get("created_at", "")[:10]
        if day not in daily:
            daily[day] = {"date": day, "total": 0, "completed": 0, "failed": 0}
        daily[day]["total"] += 1
        status = r.get("status", "")
        if status == "completed":
            daily[day]["completed"] += 1
        elif status == "failed":
            daily[day]["failed"] += 1

    # Category distribution
    categories = {}
    for r in runs:
        cat = r.get("product_category", "Unknown")
        categories[cat] = categories.get(cat, 0) + 1

    total = len(runs)
    completed = sum(1 for r in runs if r.get("status") == "completed")
    failed = sum(1 for r in runs if r.get("status") == "failed")

    return {
        "daily": sorted(daily.values(), key=lambda x: x["date"]),
        "categories": sorted(categories.items(), key=lambda x: x[1], reverse=True)[:10],
        "total": total,
        "completed": completed,
        "failed": failed,
        "success_rate": round(completed / max(total, 1) * 100, 1),
    }


# ── Audit Log ─────────────────────────────────────────────────────────────────

@router.get("/audit-log", summary="Get admin audit log")
async def get_audit_log(
    user=Depends(get_current_user),
    _=Depends(require_admin()),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    """Get the admin action audit log."""
    db = get_supabase()
    result = (
        db.table("admin_audit_log")
        .select("id, admin_id, action, target_id, target_type, details, created_at")
        .order("created_at", desc=True)
        .range(offset, offset + limit - 1)
        .execute()
    )
    count_result = db.table("admin_audit_log").select("id", count="exact").execute()

    return {
        "entries": result.data or [],
        "total": count_result.count or 0,
        "offset": offset,
        "limit": limit,
    }
