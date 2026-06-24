"""
ProductIQ — User Profile Router
GET    /api/profile/         — Get profile
PATCH  /api/profile/         — Update profile
GET    /api/profile/usage    — Usage stats
POST   /api/profile/referral — Apply referral code
"""

from fastapi import APIRouter, Depends, HTTPException, Header
from database import get_supabase
from models import UpdateProfileRequest, ReferralRequest, ReferralResponse
from analytics import identify_user, track_event
import structlog

logger = structlog.get_logger()
router = APIRouter()


def get_current_user(authorization: str = Header(...)):
    db = get_supabase()
    try:
        return db.auth.get_user(authorization.replace("Bearer ", "").strip()).user
    except Exception:
        raise HTTPException(status_code=401, detail="Unauthorized")


@router.get("/", summary="Get authenticated user's profile")
async def get_profile(user=Depends(get_current_user)):
    db = get_supabase()
    profile = db.table("profiles").select("*").eq("id", str(user.id)).maybe_single().execute().data

    if not profile:
        # Create profile on first access
        profile = {
            "id": str(user.id),
            "email": user.email or "",
            "plan": "free",
            "reports_used_this_month": 0,
            "reports_limit": 3,
            "extra_reports_from_referrals": 0,
        }
        db.table("profiles").insert(profile).execute()

    return {"profile": profile}


@router.patch("/", summary="Update profile (name, company, Slack webhook)")
async def update_profile(req: UpdateProfileRequest, user=Depends(get_current_user)):
    db = get_supabase()

    updates = req.dict(exclude_none=True)
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")

    from datetime import datetime
    updates["updated_at"] = datetime.utcnow().isoformat()

    result = db.table("profiles").update(updates).eq("id", str(user.id)).execute()

    if result.data:
        identify_user(str(user.id), {
            "company": req.company_name,
            "name": req.full_name,
        })

    return {"updated": True, "profile": result.data[0] if result.data else {}}


@router.get("/usage", summary="Get current month usage stats")
async def get_usage(user=Depends(get_current_user)):
    db = get_supabase()
    profile = db.table("profiles").select(
        "plan, reports_used_this_month, reports_limit, extra_reports_from_referrals"
    ).eq("id", str(user.id)).maybe_single().execute().data

    if not profile:
        return {"plan": "free", "used": 0, "limit": 3, "remaining": 3, "percentage": 0}

    total_limit = profile["reports_limit"] + profile.get("extra_reports_from_referrals", 0)
    used = profile["reports_used_this_month"]
    remaining = max(0, total_limit - used)

    return {
        "plan": profile["plan"],
        "used": used,
        "limit": total_limit,
        "remaining": remaining,
        "percentage": round(used / total_limit * 100, 1) if total_limit > 0 else 0,
    }


@router.post("/referral", response_model=ReferralResponse, summary="Apply a referral code to unlock extra reports")
async def apply_referral(req: ReferralRequest, user=Depends(get_current_user)):
    db = get_supabase()

    # Find the referrer
    referrer = (
        db.table("profiles")
        .select("id, referral_code, extra_reports_from_referrals")
        .eq("referral_code", req.referral_code.strip())
        .maybe_single()
        .execute()
        .data
    )

    if not referrer:
        raise HTTPException(status_code=404, detail="Invalid referral code")

    if referrer["id"] == str(user.id):
        raise HTTPException(status_code=400, detail="Cannot use your own referral code")

    # Check if user already used a referral
    my_profile = db.table("profiles").select("referred_by").eq("id", str(user.id)).single().execute().data
    if my_profile.get("referred_by"):
        raise HTTPException(status_code=400, detail="You have already used a referral code")

    # Give 1 extra report to both user and referrer
    db.table("profiles").update({
        "extra_reports_from_referrals": (my_profile.get("extra_reports_from_referrals", 0) or 0) + 1,
        "referred_by": referrer["id"],
    }).eq("id", str(user.id)).execute()

    db.table("profiles").update({
        "extra_reports_from_referrals": (referrer.get("extra_reports_from_referrals", 0) or 0) + 1,
    }).eq("id", referrer["id"]).execute()

    track_event(str(user.id), "referral_used", {"referred_by": referrer["id"]})
    track_event(referrer["id"], "referral_earned", {"new_user": str(user.id)})

    return ReferralResponse(
        success=True,
        extra_reports_added=1,
        message="Referral applied! You and your referrer each got +1 free report.",
    )
