"""
ProductIQ — Payments Module (Razorpay Client)
Low-level client used by the payments router.
"""

import hmac
import hashlib
from config import settings


def create_order(amount_inr: float, receipt: str, notes: dict | None = None) -> dict:
    """
    Create a Razorpay order.
    amount_inr is in Indian Rupees — converted to paise internally.
    """
    if not settings.RAZORPAY_KEY_ID or not settings.RAZORPAY_KEY_SECRET:
        raise RuntimeError("Razorpay credentials not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.")

    import razorpay
    client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))

    return client.order.create({
        "amount": int(amount_inr * 100),  # Convert to paise
        "currency": "INR",
        "receipt": receipt[:40],          # Max 40 chars
        "notes": notes or {},
    })


def verify_payment_signature(order_id: str, payment_id: str, signature: str) -> bool:
    """
    Verify the Razorpay payment signature.
    Returns True if the signature is valid (payment is genuine).
    """
    if not settings.RAZORPAY_KEY_SECRET:
        raise RuntimeError("RAZORPAY_KEY_SECRET not configured")

    message = f"{order_id}|{payment_id}"
    expected = hmac.new(
        settings.RAZORPAY_KEY_SECRET.encode("utf-8"),
        message.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()

    return hmac.compare_digest(expected, signature)
