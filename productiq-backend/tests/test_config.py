"""
Tests for config.py — SECRET_KEY validation and settings loading.
"""
import os
import pytest


class TestConfigValidation:
    """Test the production safety guard for SECRET_KEY."""

    def test_development_allows_default_secret(self):
        """In development mode, the default SECRET_KEY should be accepted."""
        os.environ["APP_ENV"] = "development"
        os.environ["SECRET_KEY"] = "change-me-in-production-32-char-min"
        # Force re-evaluation
        from config import get_settings
        get_settings.cache_clear()
        s = get_settings()
        assert s.SECRET_KEY == "change-me-in-production-32-char-min"
        get_settings.cache_clear()

    def test_production_rejects_insecure_secret(self):
        """In production, an insecure default SECRET_KEY should raise RuntimeError."""
        os.environ["APP_ENV"] = "production"
        os.environ["SECRET_KEY"] = "change-me-in-production-32-char-min"
        from config import get_settings
        get_settings.cache_clear()
        with pytest.raises(RuntimeError, match="SECRET_KEY"):
            get_settings()
        get_settings.cache_clear()

    def test_production_rejects_empty_secret(self):
        """Empty SECRET_KEY in production should raise."""
        os.environ["APP_ENV"] = "production"
        os.environ["SECRET_KEY"] = ""
        from config import get_settings
        get_settings.cache_clear()
        with pytest.raises(RuntimeError, match="SECRET_KEY"):
            get_settings()
        get_settings.cache_clear()

    def test_production_accepts_real_secret(self):
        """A real 32+ char random secret should be accepted in production."""
        os.environ["APP_ENV"] = "production"
        os.environ["SECRET_KEY"] = "a-very-secure-random-secret-key-32-chars-long"
        from config import get_settings
        get_settings.cache_clear()
        s = get_settings()
        assert s.is_production is True
        get_settings.cache_clear()

    def teardown_method(self):
        """Reset env vars after each test."""
        os.environ["APP_ENV"] = "development"
        os.environ["SECRET_KEY"] = "test-secret-key-32-chars-min-length"
        from config import get_settings
        get_settings.cache_clear()
