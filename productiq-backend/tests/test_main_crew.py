"""
Tests for crews/main_crew.py — _safe_db_update behavior (B5 fix).

Verifies that DB updates are synchronous (not daemon-threaded) and that
errors are caught and logged without crashing the caller.
"""
from unittest.mock import patch, MagicMock

import pytest


class TestSafeDbUpdate:
    """Test the _safe_db_update wrapper."""

    def test_successful_update(self):
        """A successful DB call should complete without error."""
        from crews.main_crew import _safe_db_update

        fn = MagicMock()
        _safe_db_update(fn, "test_label")
        fn.assert_called_once()

    def test_failed_update_does_not_raise(self):
        """A failed DB call should be caught and NOT raise."""
        from crews.main_crew import _safe_db_update

        fn = MagicMock(side_effect=ConnectionError("DB down"))
        # Should not raise
        _safe_db_update(fn, "test_label")
        fn.assert_called_once()

    def test_synchronous_not_threaded(self):
        """_safe_db_update should run synchronously — the fn should be called
        immediately and completed before the function returns.

        We verify this by checking that a side effect is visible immediately
        after the call (daemon threads would make this racy).
        """
        from crews.main_crew import _safe_db_update

        results = []
        def fn():
            results.append("done")
        _safe_db_update(fn, "sync_test")
        # If synchronous, results should be populated immediately
        assert results == ["done"]
