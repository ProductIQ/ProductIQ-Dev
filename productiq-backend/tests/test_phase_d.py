"""
Tests for Phase D modules: rate_limit.py, cache.py, observability.py

These test the pure-function logic and Redis fallback behavior.
Redis is mocked — no real Redis connection needed.
"""
import json
import time
from unittest.mock import patch, MagicMock, PropertyMock

import pytest
from fastapi import HTTPException


# ══════════════════════════════════════════════════════════════════════════════
# D4: Rate Limiting
# ══════════════════════════════════════════════════════════════════════════════

class TestRateLimit:
    """Test the rate_limit dependency factory."""

    def test_allows_request_under_limit(self):
        """Requests under the limit should be allowed."""
        from rate_limit import rate_limit

        mock_redis = MagicMock()
        mock_redis.incr.return_value = 1
        mock_redis.ttl.return_value = 60

        mock_request = MagicMock()
        mock_request.state.user_id = "user-123"
        mock_request.headers.get.return_value = ""
        mock_request.client.host = "127.0.0.1"

        with patch("rate_limit._get_redis", return_value=mock_redis):
            check = rate_limit(max_requests=10, window_seconds=60)
            # Should not raise
            check(mock_request)

    def test_blocks_request_over_limit(self):
        """Requests over the limit should raise HTTP 429."""
        from rate_limit import rate_limit

        mock_redis = MagicMock()
        mock_redis.incr.return_value = 11  # Over limit of 10
        mock_redis.ttl.return_value = 45

        mock_request = MagicMock()
        mock_request.state.user_id = "user-123"
        mock_request.headers.get.return_value = ""
        mock_request.client.host = "127.0.0.1"

        with patch("rate_limit._get_redis", return_value=mock_redis):
            check = rate_limit(max_requests=10, window_seconds=60)
            with pytest.raises(HTTPException) as exc_info:
                check(mock_request)
            assert exc_info.value.status_code == 429
            assert "Rate limit exceeded" in exc_info.value.detail

    def test_fails_open_without_redis(self):
        """If Redis is unavailable, requests should be allowed (fail-open)."""
        from rate_limit import rate_limit

        mock_request = MagicMock()
        mock_request.state.user_id = "user-123"

        with patch("rate_limit._get_redis", return_value=None):
            check = rate_limit(max_requests=10, window_seconds=60)
            # Should not raise — fail open
            check(mock_request)


# ══════════════════════════════════════════════════════════════════════════════
# D5: Cache
# ══════════════════════════════════════════════════════════════════════════════

class TestCache:
    """Test the Redis cache helpers."""

    def test_cache_get_hit(self):
        """cache_get should return deserialized data on hit."""
        from cache import cache_get

        mock_redis = MagicMock()
        mock_redis.get.return_value = json.dumps({"key": "value"})

        with patch("cache._get_redis", return_value=mock_redis):
            result = cache_get("test_key")
        assert result == {"key": "value"}

    def test_cache_get_miss(self):
        """cache_get should return None on miss."""
        from cache import cache_get

        mock_redis = MagicMock()
        mock_redis.get.return_value = None

        with patch("cache._get_redis", return_value=mock_redis):
            result = cache_get("test_key")
        assert result is None

    def test_cache_get_redis_unavailable(self):
        """cache_get should return None if Redis is unavailable."""
        from cache import cache_get

        with patch("cache._get_redis", return_value=None):
            result = cache_get("test_key")
        assert result is None

    def test_cache_set_success(self):
        """cache_set should store data with TTL."""
        from cache import cache_set

        mock_redis = MagicMock()
        mock_redis.setex.return_value = True

        with patch("cache._get_redis", return_value=mock_redis):
            result = cache_set("test_key", {"data": 1}, ttl=300)
        assert result is True
        mock_redis.setex.assert_called_once()

    def test_cache_delete_success(self):
        """cache_delete should remove the key."""
        from cache import cache_delete

        mock_redis = MagicMock()
        mock_redis.delete.return_value = 1

        with patch("cache._get_redis", return_value=mock_redis):
            result = cache_delete("test_key")
        assert result is True

    def test_cached_decorator_hit(self):
        """The @cached decorator should return cached value without calling fn."""
        from cache import cached

        call_count = [0]

        @cached(key="test:{user_id}", ttl=60)
        def expensive_fn(user_id: str):
            call_count[0] += 1
            return {"user": user_id, "computed": True}

        with patch("cache.cache_get", return_value={"user": "123", "cached": True}):
            result = expensive_fn(user_id="123")

        assert result == {"user": "123", "cached": True}
        assert call_count[0] == 0  # Function was NOT called

    def test_cached_decorator_miss(self):
        """The @cached decorator should call fn on cache miss and cache result."""
        from cache import cached

        call_count = [0]

        @cached(key="test:{user_id}", ttl=60)
        def expensive_fn(user_id: str):
            call_count[0] += 1
            return {"user": user_id, "computed": True}

        with patch("cache.cache_get", return_value=None), \
             patch("cache.cache_set", return_value=True) as mock_set:
            result = expensive_fn(user_id="123")

        assert result == {"user": "123", "computed": True}
        assert call_count[0] == 1  # Function WAS called
        mock_set.assert_called_once()


# ══════════════════════════════════════════════════════════════════════════════
# D6: Observability
# ══════════════════════════════════════════════════════════════════════════════

class TestObservability:
    """Test the LLM observability tracking."""

    def test_log_llm_usage_ok(self):
        """log_llm_usage should log without error on success."""
        from observability import log_llm_usage

        mock_redis = MagicMock()
        pipe = MagicMock()
        mock_redis.pipeline.return_value = pipe
        pipe.execute.return_value = [1, 1, 1, 1, 1, 0]

        with patch("observability._get_redis", return_value=mock_redis):
            # Should not raise
            log_llm_usage(
                model="gemini-2.5-flash",
                agent="Review Miner",
                run_id="run-123",
                input_tokens=500,
                output_tokens=300,
                latency_ms=1500,
                status="ok",
            )

        # Verify Redis pipeline was called
        pipe.hincrby.assert_called()
        pipe.execute.assert_called_once()

    def test_log_llm_usage_redis_unavailable(self):
        """log_llm_usage should not crash if Redis is unavailable."""
        from observability import log_llm_usage

        with patch("observability._get_redis", return_value=None):
            # Should not raise
            log_llm_usage(
                model="gemini-2.5-flash",
                agent="Test",
                input_tokens=100,
                output_tokens=50,
                latency_ms=500,
            )

    def test_track_llm_call_success(self):
        """track_llm_call should wrap a function and track metrics."""
        from observability import track_llm_call

        mock_fn = MagicMock()
        mock_fn.return_value = MagicMock(usage_metadata=MagicMock(
            prompt_token_count=100,
            candidates_token_count=50,
        ))

        with patch("observability._get_redis", return_value=None):
            result = track_llm_call(
                model="gemini-2.5-flash",
                agent="Test",
                fn=mock_fn,
                prompt="test prompt",
            )

        assert result is mock_fn.return_value
        mock_fn.assert_called_once_with(prompt="test prompt")

    def test_track_llm_call_error(self):
        """track_llm_call should re-raise errors and log them."""
        from observability import track_llm_call

        mock_fn = MagicMock(side_effect=RuntimeError("API error"))

        with patch("observability._get_redis", return_value=None):
            with pytest.raises(RuntimeError, match="API error"):
                track_llm_call(
                    model="gemini-2.5-flash",
                    agent="Test",
                    fn=mock_fn,
                )

    def test_track_llm_call_rate_limited(self):
        """track_llm_call should detect rate limit errors."""
        from observability import track_llm_call

        mock_fn = MagicMock(side_effect=Exception("429 Resource Exhausted"))

        with patch("observability._get_redis", return_value=None):
            with pytest.raises(Exception):
                track_llm_call(
                    model="gemini-2.5-flash",
                    agent="Test",
                    fn=mock_fn,
                )

    def test_get_usage_summary_no_redis(self):
        """get_usage_summary should return error dict if Redis unavailable."""
        from observability import get_usage_summary

        with patch("observability._get_redis", return_value=None):
            result = get_usage_summary()
        assert "error" in result

    def test_get_usage_summary_empty(self):
        """get_usage_summary should return empty models dict if no data."""
        from observability import get_usage_summary

        mock_redis = MagicMock()
        mock_redis.hgetall.return_value = {}

        with patch("observability._get_redis", return_value=mock_redis):
            result = get_usage_summary("20240101")
        assert result["date"] == "20240101"
        assert result["models"] == {}

    def test_get_usage_summary_with_data(self):
        """get_usage_summary should parse Redis hash into structured format."""
        from observability import get_usage_summary

        mock_redis = MagicMock()
        mock_redis.hgetall.return_value = {
            "gemini-2.5-flash:calls": "10",
            "gemini-2.5-flash:input_tokens": "5000",
            "gemini-2.5-flash:output_tokens": "3000",
            "gemini-2.5-flash:total_tokens": "8000",
            "gemini-2.5-flash:latency_ms_total": "15000",
            "gemini-2.5-flash:errors": "1",
        }

        with patch("observability._get_redis", return_value=mock_redis):
            result = get_usage_summary("20240101")

        model_stats = result["models"]["gemini-2.5-flash"]
        assert model_stats["calls"] == 10
        assert model_stats["total_tokens"] == 8000
        assert model_stats["avg_latency_ms"] == 1500.0
        assert model_stats["avg_tokens_per_call"] == 800.0


# ══════════════════════════════════════════════════════════════════════════════
# D3: Gemini Sentiment (fallback test)
# ══════════════════════════════════════════════════════════════════════════════

class TestSentimentTool:
    """Test the SentimentAnalysisTool Gemini + VADER fallback logic."""

    def test_empty_reviews(self):
        """Empty reviews list should return empty result."""
        from tools.nlp_tools import SentimentAnalysisTool

        tool = SentimentAnalysisTool()
        result = json.loads(tool._run(json.dumps({"reviews": []})))
        assert result["enriched_reviews"] == []
        assert result["summary"] == {}

    def test_invalid_json(self):
        """Invalid JSON should return error response."""
        from tools.nlp_tools import SentimentAnalysisTool

        tool = SentimentAnalysisTool()
        result = json.loads(tool._run("not valid json"))
        assert "error" in result

    def test_vader_fallback(self):
        """When Gemini is unavailable, should fall back to VADER."""
        import sys
        from tools.nlp_tools import SentimentAnalysisTool

        tool = SentimentAnalysisTool()
        reviews = [{"body": "This product is amazing! Love it!"}]

        # Mock the VADER analyzer to return a known positive score
        mock_analyzer = MagicMock()
        mock_analyzer.polarity_scores.return_value = {
            "compound": 0.85, "pos": 0.7, "neg": 0.0, "neu": 0.3,
        }

        # Mock numpy.mean to return the average
        mock_np = MagicMock()
        mock_np.mean.return_value = 0.85

        # Force Gemini to fail, VADER should work
        with patch.object(tool, "_analyze_with_gemini", side_effect=RuntimeError("No API key")), \
             patch("vaderSentiment.vaderSentiment.SentimentIntensityAnalyzer", return_value=mock_analyzer), \
             patch.dict(sys.modules, {"numpy": mock_np}):
            result = json.loads(tool._run(json.dumps({"reviews": reviews})))

        assert "enriched_reviews" in result
        assert len(result["enriched_reviews"]) == 1
        assert result["summary"]["method"] == "vader"
        # Mocked VADER returns positive compound score
        assert result["enriched_reviews"][0]["sentiment_label"] == "positive"
