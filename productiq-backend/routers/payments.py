"""
ProductIQ — Payments Router (Razorpay)
POST /api/payments/order   — Create Razorpay order
POST /api/payments/verify  — Verify payment + upgrade plan
GET  /api/payments/history — Transaction history
"""

import hmac
import hashlib
from fastapi import APIRouter, Depends, HTTPException, Header
from models import OrderRequest, OrderResponse, VerifyRequest, VerifyResponse
from database import get_supabase
from analytics import track_event
from config import settings
import structlog

logger = structlog.get_logger()
router = APIRouter()

PLAN_PRICES_INR = {
    "pro_monthly": 4999,
    "pay_per_report": 999,
    "enterprise": 14999,
}

PLAN_LIMITS = {
    "pro_monthly": {"plan": "pro", "limit": 999},
    "pay_per_report": {"plan": "free", "limit_add": 1},
    "enterprise": {"plan": "enterprise", "limit": 9999},
}


def get_current_user(authorization: str = Header(...)):
    db = get_supabase()
    try:
        return db.auth.get_user(authorization.replace("Bearer ", "").strip()).user
    except Exception:
        raise HTTPException(status_code=401, detail="Unauthorized")


def _get_razorpay_client():
    if not settings.RAZORPAY_KEY_ID or not settings.RAZORPAY_KEY_SECRET:
        raise HTTPException(status_code=503, detail="Razorpay not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.")
    import razorpay
    return razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))


@router.post("/order", response_model=OrderResponse, summary="Create a Razorpay payment order")
async def create_payment_order(req: OrderRequest, user=Depends(get_current_user)):
    if req.plan not in PLAN_PRICES_INR:
        raise HTTPException(status_code=400, detail=f"Unknown plan: {req.plan}. Use: {list(PLAN_PRICES_INR)}")

    client = _get_razorpay_client()
    amount_inr = PLAN_PRICES_INR[req.plan]
    amount_paise = amount_inr * 100

    order = client.order.create({
        "amount": amount_paise,
        "currency": "INR",
        "receipt": f"{str(user.id)[:8]}-{req.plan}",
        "notes": {
            "user_id": str(user.id),
            "plan": req.plan,
            "email": user.email or "",
        },
    })

    db = get_supabase()
    db.table("transactions").insert({
        "user_id": str(user.id),
        "razorpay_order_id": order["id"],
        "amount_paise": amount_paise,
        "currency": "INR",
        "type": "subscription" if "monthly" in req.plan else "pay_per_report" if req.plan == "pay_per_report" else "enterprise",
        "plan": req.plan,
        "status": "created",
    }).execute()

    track_event(str(user.id), "payment_initiated", {"plan": req.plan, "amount_inr": amount_inr})

    return OrderResponse(
        order_id=order["id"],
        amount=amount_paise,
        currency="INR",
        key=settings.RAZORPAY_KEY_ID,
    )


@router.post("/verify", response_model=VerifyResponse, summary="Verify Razorpay payment and activate plan")
async def verify_payment(req: VerifyRequest, user=Depends(get_current_user)):
    # ── Signature verification ────────────────────────────────────────────────
    message = f"{req.razorpay_order_id}|{req.razorpay_payment_id}"
    expected_sig = hmac.new(
        settings.RAZORPAY_KEY_SECRET.encode(),
        message.encode(),
        hashlib.sha256,
    ).hexdigest()

    if not hmac.compare_digest(expected_sig, req.razorpay_signature):
        logger.warning("Invalid payment signature", user=user.id, order=req.razorpay_order_id)
        raise HTTPException(status_code=400, detail="Invalid payment signature — possible tampering detected.")

    db = get_supabase()

    # ── Update transaction ────────────────────────────────────────────────────
    db.table("transactions").update({
        "razorpay_payment_id": req.razorpay_payment_id,
        "razorpay_signature": req.razorpay_signature,
        "status": "paid",
    }).eq("razorpay_order_id", req.razorpay_order_id).execute()

    # ── Upgrade user plan ─────────────────────────────────────────────────────
    plan_config = PLAN_LIMITS.get(req.plan, {})

    if "limit_add" in plan_config:
        # Pay-per-report: add 1 extra report
        profile = db.table("profiles").select("reports_limit").eq("id", user.id).single().execute().data
        db.table("profiles").update({
            "reports_limit": profile["reports_limit"] + plan_config["limit_add"],
        }).eq("id", user.id).execute()
        message = f"1 additional report credit added to your account."
    else:
        # Subscription: set plan and limit
        db.table("profiles").update({
            "plan": plan_config["plan"],
            "reports_limit": plan_config["limit"],
        }).eq("id", user.id).execute()
        message = f"Plan upgraded to {plan_config['plan'].capitalize()} successfully."

    track_event(str(user.id), "payment_completed", {
        "plan": req.plan,
        "razorpay_payment_id": req.razorpay_payment_id,
    })

    logger.info("Payment verified and plan activated", user=user.id, plan=req.plan)

    return VerifyResponse(
        status="success",
        plan_activated=req.plan,
        message=message,
    )


@router.get("/history", summary="Get payment transaction history")
async def payment_history(user=Depends(get_current_user)):
    db = get_supabase()
    result = (
        db.table("transactions")
        .select("*")
        .eq("user_id", str(user.id))
        .order("created_at", desc=True)
        .limit(20)
        .execute()
    )
    return {"transactions": result.data, "total": len(result.data)}
