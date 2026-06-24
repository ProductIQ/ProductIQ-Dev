"""
ProductIQ — JWT Auth Middleware
Shared dependency injected into all protected routes.
"""

from fastapi import Header, HTTPException
from database import get_supabase
import structlog

logger = structlog.get_logger()


def get_current_user(authorization: str = Header(..., description="Bearer <Supabase JWT>")):
    """
    Validate Supabase JWT from the Authorization header.
    Returns the Supabase User object on success.
    Raises HTTP 401 on invalid / expired / missing tokens.

    Usage in any router:
        @router.get("/protected")
        async def protected_endpoint(user=Depends(get_current_user)):
            return {"user_id": user.id}
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=401,
            detail="Authorization header missing or malformed. Format: 'Bearer <token>'",
        )

    token = authorization.replace("Bearer ", "").strip()
    if not token:
        raise HTTPException(status_code=401, detail="Token is empty")

    db = get_supabase()
    try:
        response = db.auth.get_user(token)
        if not response or not response.user:
            raise HTTPException(status_code=401, detail="Invalid or expired token")
        return response.user
    except Exception as exc:
        logger.warning("JWT validation failed", error=str(exc)[:100])
        raise HTTPException(
            status_code=401,
            detail="Authentication failed. Please log in again.",
        )


def require_plan(plan: str):
    """
    Factory that returns a dependency checking the user is on a specific plan.

    Usage:
        @router.get("/pro-feature")
        async def pro_endpoint(user=Depends(get_current_user), _=Depends(require_plan("pro"))):
    """
    def _check(user=None):
        db = get_supabase()
        profile = (
            db.table("profiles")
            .select("plan")
            .eq("id", str(user.id))
            .maybe_single()
            .execute()
            .data
        )
        if not profile:
            raise HTTPException(status_code=403, detail="Profile not found")

        plan_hierarchy = {"free": 0, "pro": 1, "enterprise": 2}
        user_plan = profile.get("plan", "free")

        if plan_hierarchy.get(user_plan, 0) < plan_hierarchy.get(plan, 0):
            raise HTTPException(
                status_code=403,
                detail=f"This feature requires a {plan.capitalize()} plan or higher. "
                       f"Upgrade at the pricing page.",
            )
    return _check
