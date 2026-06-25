"""
ProductIQ — Webhooks Router
POST /api/webhooks/razorpay   — Razorpay payment event webhook
POST /api/webhooks/supabase   — Internal webhook from Supabase (optional)
"""

import hmac
import hashlib
import json
from fastapi import APIRouter, Request, HTTPException, Header
from database import get_supabase
from analytics import track_event
from config import settings
import structlog

logger = structlog.get_logger()
router = APIRouter()


@router.post("/razorpay", summary="Razorpay webhook endpoint")
async def razorpay_webhook(request: Request, x_razorpay_signature: str = Header(None)):
    """
    Razorpay sends events here for:
    - payment.captured     → mark transaction paid
    - payment.failed       → mark transaction failed
    - subscription.charged → auto-renew handling

    Security: signature is ALWAYS required. Requests without the
    x-razorpay-signature header are rejected to prevent forged webhooks.
    """
    body = await request.body()

    # ── Signature verification (mandatory) ────────────────────────────────────
    if not settings.RAZORPAY_KEY_SECRET:
        logger.error("Razorpay webhook received but RAZORPAY_KEY_SECRET not configured")
        raise HTTPException(
            status_code=503,
            detail="Webhook verification not configured (RAZORPAY_KEY_SECRET missing).",
        )

    if not x_razorpay_signature:
        logger.warning("Razorpay webhook rejected — missing x-razorpay-signature header")
        raise HTTPException(
            status_code=401,
            detail="Missing x-razorpay-signature header. Unsigned webhooks are not accepted.",
        )

    expected = hmac.new(
        settings.RAZORPAY_KEY_SECRET.encode(),
        body,
        hashlib.sha256,
    ).hexdigest()
    if not hmac.compare_digest(expected, x_razorpay_signature):
        logger.warning("Invalid Razorpay webhook signature")
        raise HTTPException(status_code=400, detail="Invalid webhook signature")

    try:
        payload = json.loads(body)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON payload")

    event = payload.get("event", "")
    entity = payload.get("payload", {}).get("payment", {}).get("entity", {})
    order_id = entity.get("order_id")
    payment_id = entity.get("id")

    db = get_supabase()

    if event == "payment.captured":
        # Mark transaction as paid
        if order_id:
            db.table("transactions").update({
                "status": "paid",
                "razorpay_payment_id": payment_id,
            }).eq("razorpay_order_id", order_id).execute()

            # Get transaction to find user and plan
            txn = db.table("transactions").select("user_id, plan").eq("razorpay_order_id", order_id).maybe_single().execute().data
            if txn:
                track_event(txn["user_id"], "payment_webhook_captured", {
                    "plan": txn.get("plan"),
                    "payment_id": payment_id,
                })

        logger.info("Razorpay payment.captured", order_id=order_id, payment_id=payment_id)

    elif event == "payment.failed":
        if order_id:
            db.table("transactions").update({"status": "failed"}).eq("razorpay_order_id", order_id).execute()
        logger.warning("Razorpay payment.failed", order_id=order_id)

    elif event == "subscription.charged":
        # Subscription renewal — extend pro expiry
        subscription_id = payload.get("payload", {}).get("subscription", {}).get("entity", {}).get("id")
        if subscription_id:
            db.table("profiles").update({
                "plan": "pro",
                "reports_limit": 999,
            }).eq("razorpay_subscription_id", subscription_id).execute()
        logger.info("Subscription renewed", subscription_id=subscription_id)

    return {"status": "ok", "event": event}
