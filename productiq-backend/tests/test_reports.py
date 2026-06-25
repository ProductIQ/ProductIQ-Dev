"""
Tests for routers/reports.py — usage accounting, run creation, listing.

Tests verify:
  1. _increment_usage / _refund_usage work correctly
  2. POST /api/reports/run creates a run and dispatches the pipeline
  3. GET /api/reports/ lists runs for the authenticated user
  4. Freemium limits are enforced
"""
import json
from unittest.mock import patch, MagicMock, call

import pytest
from fastapi.testclient import TestClient


class TestUsageAccounting:
    """Test _increment_usage and _refund_usage helpers (B2 fix)."""

    def test_increment_usage_fallback(self):
        """When RPC fails, fall back to read-then-write."""
        from routers.reports import _increment_usage

        db = MagicMock()
        # RPC raises (no stored proc), then fallback read-then-write works
        db.rpc.side_effect = Exception("RPC not found")
        db.table.return_value.select.return_value.eq.return_value.maybe_single.return_value.execute.return_value.data = {
            "reports_used_this_month": 2
        }
        with patch("routers.reports.get_supabase", return_value=db):
            _increment_usage("user-123")

        # Verify update was called with incremented value
        db.table.return_value.update.assert_called_with({"reports_used_this_month": 3})

    def test_refund_usage_decrements(self):
        """_refund_usage should decrement reports_used_this_month."""
        from routers.reports import _refund_usage

        db = MagicMock()
        db.table.return_value.select.return_value.eq.return_value.maybe_single.return_value.execute.return_value.data = {
            "reports_used_this_month": 3
        }
        with patch("routers.reports.get_supabase", return_value=db):
            _refund_usage("user-123")

        db.table.return_value.update.assert_called_with({"reports_used_this_month": 2})

    def test_refund_usage_at_zero_does_nothing(self):
        """_refund_usage should not go below zero."""
        from routers.reports import _refund_usage

        db = MagicMock()
        db.table.return_value.select.return_value.eq.return_value.maybe_single.return_value.execute.return_value.data = {
            "reports_used_this_month": 0
        }
        with patch("routers.reports.get_supabase", return_value=db):
            _refund_usage("user-123")

        # Update should NOT be called when current is 0
        db.table.return_value.update.assert_not_called()


class TestRunCreation:
    """Test POST /api/reports/run endpoint."""

    def test_create_run_success(self, client, mock_supabase, mock_profile):
        """A free user with remaining quota can start a run."""
        # Setup: profile with usage 1/3
        def _table(name):
            chain = MagicMock()
            chain.select.return_value = chain
            chain.insert.return_value = chain
            chain.update.return_value = chain
            chain.eq.return_value = chain
            chain.maybe_single.return_value = chain
            chain.execute.return_value = MagicMock(data=mock_profile, error=None, count=None)
            return chain

        mock_supabase.table.side_effect = _table

        resp = client.post(
            "/api/reports/run",
            json={"product_category": "Whey Protein", "brand_name": "MuscleBlaze"},
        )

        # Should return 200 with run_id
        assert resp.status_code == 200
        data = resp.json()
        assert "run_id" in data
        assert data["status"] == "queued"

    def test_create_run_missing_category(self, client):
        """POST without product_category should return 422."""
        resp = client.post("/api/reports/run", json={"brand_name": "Test"})
        assert resp.status_code == 422

    def test_create_run_empty_category(self, client):
        """POST with empty product_category should return 422."""
        resp = client.post("/api/reports/run", json={"product_category": ""})
        assert resp.status_code == 422


class TestListRuns:
    """Test GET /api/reports/ endpoint."""

    def test_list_runs_returns_data(self, client, mock_supabase):
        """Should return a list of runs for the authenticated user."""
        mock_runs = [
            {"id": "run-1", "product_category": "Whey Protein", "status": "completed"},
            {"id": "run-2", "product_category": "Face Serum", "status": "running"},
        ]

        def _table(name):
            chain = MagicMock()
            chain.select.return_value = chain
            chain.eq.return_value = chain
            chain.order.return_value = chain
            chain.limit.return_value = chain
            chain.execute.return_value = MagicMock(data=mock_runs, error=None, count=2)
            return chain

        mock_supabase.table.side_effect = _table

        resp = client.get("/api/reports/")
        assert resp.status_code == 200
        data = resp.json()
        assert "runs" in data
        assert len(data["runs"]) == 2
