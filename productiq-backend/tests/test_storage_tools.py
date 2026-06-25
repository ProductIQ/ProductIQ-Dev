"""
Tests for tools/storage_tools.py — schema sanitization, JSON parsing, number extraction.

These are pure-function tests that don't require any external services.
"""
import json
import pytest
from unittest.mock import patch, MagicMock

from tools.storage_tools import (
    _sanitize,
    _parse_json,
    _parse_number,
    _insert_records,
    _fetch_records,
    _PRODUCT_COLUMNS,
    _REVIEW_COLUMNS,
    _COMPETITOR_COLUMNS,
)


class TestSanitize:
    """Test _sanitize strips unknown keys and coerces types."""

    def test_strips_unknown_keys(self):
        record = {"run_id": "abc", "product_name": "Whey", "evil_key": "hack"}
        result = _sanitize(record, _PRODUCT_COLUMNS)
        assert "evil_key" not in result
        assert result["run_id"] == "abc"
        assert result["product_name"] == "Whey"

    def test_converts_sets_to_lists(self):
        record = {"run_id": "abc", "images": {"img1", "img2"}}
        result = _sanitize(record, _PRODUCT_COLUMNS)
        assert isinstance(result["images"], list)
        assert set(result["images"]) == {"img1", "img2"}

    def test_empty_record(self):
        result = _sanitize({}, _PRODUCT_COLUMNS)
        assert result == {}

    def test_preserves_none_values(self):
        record = {"run_id": "abc", "brand": None}
        result = _sanitize(record, _PRODUCT_COLUMNS)
        assert result["brand"] is None


class TestParseJson:
    """Test _parse_json handles markdown codeblocks and trailing data."""

    def test_plain_json(self):
        assert _parse_json('{"key": "value"}') == {"key": "value"}

    def test_json_array(self):
        assert _parse_json('[1, 2, 3]') == [1, 2, 3]

    def test_markdown_codeblock(self):
        raw = '```json\n{"key": "value"}\n```'
        assert _parse_json(raw) == {"key": "value"}

    def test_markdown_codeblock_no_lang(self):
        raw = '```\n{"key": "value"}\n```'
        assert _parse_json(raw) == {"key": "value"}

    def test_trailing_data(self):
        # LLM sometimes appends extra text after JSON
        raw = '{"key": "value"}\n\nHere is some extra text.'
        result = _parse_json(raw)
        assert result == {"key": "value"}

    def test_non_string_passthrough(self):
        data = {"already": "a dict"}
        assert _parse_json(data) is data

    def test_invalid_json_raises(self):
        with pytest.raises(json.JSONDecodeError):
            _parse_json("not valid json at all")


class TestParseNumber:
    """Test _parse_number extracts numbers from various LLM output formats."""

    def test_int(self):
        assert _parse_number(42) == 42.0

    def test_float(self):
        assert _parse_number(3.14) == 3.14

    def test_string_number(self):
        assert _parse_number("1,299") == 1299.0

    def test_currency_string(self):
        assert _parse_number("₹2,499") == 2499.0

    def test_currency_dict(self):
        assert _parse_number({"currency": "INR", "value": 999}) == 999.0

    def test_none(self):
        assert _parse_number(None) is None

    def test_empty_string(self):
        assert _parse_number("") is None

    def test_garbage_string(self):
        assert _parse_number("no numbers here") is None


class TestInsertRecords:
    """Test _insert_records injects run_id and calls Supabase."""

    def test_injects_run_id(self):
        db = MagicMock()
        db.table.return_value.insert.return_value.execute.return_value.data = [{"id": "1"}, {"id": "2"}]
        with patch("tools.storage_tools.get_supabase", return_value=db):
            result = _insert_records("products", [{"product_name": "A"}, {"product_name": "B"}], run_id="run-123")
        assert result["stored"] == 2
        assert result["table"] == "products"
        # Verify run_id was injected
        inserted = db.table.return_value.insert.call_args[0][0]
        assert all(r["run_id"] == "run-123" for r in inserted)

    def test_no_run_id(self):
        db = MagicMock()
        db.table.return_value.insert.return_value.execute.return_value.data = [{"id": "1"}]
        with patch("tools.storage_tools.get_supabase", return_value=db):
            result = _insert_records("insights", [{"title": "test"}])
        assert result["stored"] == 1


class TestFetchRecords:
    """Test _fetch_records queries Supabase with run_id filter."""

    def test_basic_fetch(self):
        db = MagicMock()
        chain = db.table.return_value.select.return_value.eq.return_value.limit.return_value.execute.return_value
        chain.data = [{"id": "1", "run_id": "run-123"}]
        with patch("tools.storage_tools.get_supabase", return_value=db):
            records = _fetch_records("products", "run-123")
        assert len(records) == 1
        assert records[0]["run_id"] == "run-123"

    def test_empty_fetch(self):
        db = MagicMock()
        chain = db.table.return_value.select.return_value.eq.return_value.limit.return_value.execute.return_value
        chain.data = None
        with patch("tools.storage_tools.get_supabase", return_value=db):
            records = _fetch_records("products", "run-456")
        assert records == []
