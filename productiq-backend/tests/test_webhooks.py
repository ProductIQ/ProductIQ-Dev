"""
Tests for routers/webhooks.py — Razorpay webhook signature verification.

This is the most security-critical endpoint. Tests verify:
  1. Unsigned webhooks are rejected (B1 fix)
  2. Webhooks with invalid signatures are rejected
  3. Webhooks with valid signatures are accepted
  4. Missing RAZORPAY_KEY_SECRET returns 503
"""
import hashlib
import hmac
import json
from unittest.mock import patch, MagicMock

import pytest
from fastapi.testclient import TestClient


class TestRazorpayWebhookSignature:
    """Verify that the webhook endpoint enforces signature validation."""

    _SECRET = "test_razorpay_secret"
    _BODY = json.dumps({
        "event": "payment.captured",
        "payload": {"payment": {"entity": {"id": "pay_test123", "amount": 99900}}},
    }).encode()

    def _valid_signature(self):
        return hmac.new(self._SECRET.encode(), self._BODY, hashlib.sha256).hexdigest()

    def test_missing_signature_header_rejected(self, client):
        """Webhook without x-razorpay-signature header must be rejected with 401."""
        with patch("routers.webhooks.settings") as mock_settings:
            mock_settings.RAZORPAY_KEY_SECRET = self._SECRET
            resp = client.post(
                "/api/webhooks/razorpay",
                content=self._BODY,
                headers={"Content-Type": "application/json"},
            )
        assert resp.status_code == 401
        assert "Missing" in resp.json()["detail"] or "signature" in resp.json()["detail"].lower()

    def test_invalid_signature_rejected(self, client):
        """Webhook with wrong signature must be rejected with 400."""
        with patch("routers.webhooks.settings") as mock_settings:
            mock_settings.RAZORPAY_KEY_SECRET = self._SECRET
            resp = client.post(
                "/api/webhooks/razorpay",
                content=self._BODY,
                headers={
                    "Content-Type": "application/json",
                    "x-razorpay-signature": "deadbeef_invalid_signature",
                },
            )
        assert resp.status_code == 400
        assert "Invalid" in resp.json()["detail"]

    def test_missing_secret_returns_503(self, client):
        """If RAZORPAY_KEY_SECRET is not configured, return 503."""
        with patch("routers.webhooks.settings") as mock_settings:
            mock_settings.RAZORPAY_KEY_SECRET = None
            resp = client.post(
                "/api/webhooks/razorpay",
                content=self._BODY,
                headers={
                    "Content-Type": "application/json",
                    "x-razorpay-signature": "any_signature",
                },
            )
        assert resp.status_code == 503

    def test_valid_signature_accepted(self, client, mock_supabase):
        """A webhook with a valid signature should be processed (200)."""
        with patch("routers.webhooks.settings") as mock_settings:
            mock_settings.RAZORPAY_KEY_SECRET = self._SECRET
            # Mock the DB calls inside the handler
            mock_supabase.table.return_value.select.return_value.eq.return_value.maybe_single.return_value.execute.return_value.data = {
                "id": "txn-1",
                "status": "created",
                "razorpay_order_id": "order_test",
            }
            resp = client.post(
                "/api/webhooks/razorpay",
                content=self._BODY,
                headers={
                    "Content-Type": "application/json",
                    "x-razorpay-signature": self._valid_signature(),
                },
            )
        # Should not be 401, 400, or 503 — signature passed
        assert resp.status_code not in (401, 400, 503)
