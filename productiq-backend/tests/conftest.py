"""
ProductIQ — Pytest Configuration & Shared Fixtures

All tests run WITHOUT real external services (no Supabase, no Gemini, no Apify).
We mock at the boundary: database calls, auth, and external APIs.

Run:  pytest tests/ -v
"""
import sys
import os
import types
from pathlib import Path
from unittest.mock import MagicMock, AsyncMock, patch

import pytest

# ── Path setup: allow imports from the backend root ───────────────────────────
BACKEND_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_ROOT))

# ── Environment: set test env vars BEFORE importing app modules ────────────────
os.environ.setdefault("APP_ENV", "development")
os.environ.setdefault("SECRET_KEY", "test-secret-key-32-chars-min-length")
os.environ.setdefault("GEMINI_API_KEY", "test-gemini-key")
os.environ.setdefault("SUPABASE_URL", "https://test.supabase.co")
os.environ.setdefault("SUPABASE_SERVICE_KEY", "test-service-key")
os.environ.setdefault("DATABASE_URL", "postgresql://test:test@localhost:5432/test")
os.environ.setdefault("REDIS_URL", "redis://localhost:6379/0")
os.environ.setdefault("FRONTEND_URL", "http://localhost:5173")

# ── Stub heavy/optional deps that may not be installed in the test env ────────
# This lets us import and test pure-function modules (storage_tools, etc.)
# without pulling in crewai, llama_index, bertopic, spacy, etc.
_STUB_MODULES = {
    "crewai": ["Agent", "Task", "Crew", "Process", "LLM"],
    "crewai_tools": ["BaseTool"],
    "apify_client": ["ApifyClient"],
    "supabase": ["create_client", "Client", "create_async_client"],
    "llama_index": [],
    "llama_index.core": ["VectorStoreIndex", "Settings", "Document", "IngestionPipeline"],
    "llama_index.core.node_parser": ["SentenceSplitter"],
    "llama_index.core.ingestion": ["IngestionPipeline"],
    "llama_index.embeddings.gemini": ["GeminiEmbedding"],
    "llama_index.llms.gemini": ["Gemini"],
    "llama_index.vector_stores.supabase": ["SupabaseVectorStore"],
    "bertopic": ["BERTopic"],
    "vaderSentiment": [],
    "vaderSentiment.vaderSentiment": ["SentimentIntensityAnalyzer"],
    "spacy": [],
    "praw": [],
    "pytrends": [],
    "weasyprint": [],
    "pptx": [],
    "posthog": [],
    "razorpay": [],
    "google": [],
    "google.generativeai": [],
    "litellm": [],
    "sse_starlette": [],
    "sse_starlette.sse": ["EventSourceResponse"],
    "redis": [],
    "celery": ["Celery"],
    "celery.schedules": ["crontab"],
    "google.generativeai": ["GenerativeModel", "configure"],
    "numpy": [],
    "scipy": [],
    "scipy.stats": ["linregress"],
}

for mod_name, attrs in _STUB_MODULES.items():
    if mod_name not in sys.modules:
        stub = types.ModuleType(mod_name)
        for attr in attrs:
            setattr(stub, attr, MagicMock())
        # For package-like stubs, allow submodule access
        if "." in mod_name:
            parent, child = mod_name.rsplit(".", 1)
            if parent not in sys.modules:
                parent_stub = types.ModuleType(parent)
                sys.modules[parent] = parent_stub
            setattr(sys.modules[parent], child, stub)
        sys.modules[mod_name] = stub

# ── Special stub: crewai.tools.BaseTool must be a REAL class (not MagicMock) ──
# so that subclasses like SentimentAnalysisTool can be instantiated in tests.
if "crewai.tools" not in sys.modules:
    _crewai_tools = types.ModuleType("crewai.tools")

    class _BaseToolStub:
        """Minimal BaseTool stub that allows subclassing with pydantic-style fields."""
        def __init__(self, **kwargs):
            for k, v in kwargs.items():
                setattr(self, k, v)
            # Set defaults for class-level attributes
            if not hasattr(self, "name"):
                self.name = self.__class__.__name__
            if not hasattr(self, "description"):
                self.description = ""

        def _run(self, *args, **kwargs):
            raise NotImplementedError

    _crewai_tools.BaseTool = _BaseToolStub
    sys.modules["crewai.tools"] = _crewai_tools
    # Also set on the crewai package stub
    if "crewai" in sys.modules:
        setattr(sys.modules["crewai"], "tools", _crewai_tools)


# ── Fixtures ──────────────────────────────────────────────────────────────────

@pytest.fixture
def mock_supabase():
    """Return a MagicMock that emulates the Supabase client.
    All table/query/auth operations return configurable mock data.
    """
    db = MagicMock()

    # Chainable query builder: db.table("x").select(...).eq(...).execute()
    def _chain(result_data=None, count=None):
        chain = MagicMock()
        chain.select.return_value = chain
        chain.insert.return_value = chain
        chain.update.return_value = chain
        chain.delete.return_value = chain
        chain.eq.return_value = chain
        chain.neq.return_value = chain
        chain.in_.return_value = chain
        chain.order.return_value = chain
        chain.limit.return_value = chain
        chain.maybe_single.return_value = chain
        chain.single.return_value = chain
        chain.range.return_value = chain
        execute_result = MagicMock()
        execute_result.data = result_data
        execute_result.count = count
        execute_result.error = None
        chain.execute.return_value = execute_result
        return chain

    def _table(name):
        return _chain(result_data=[] if name != "profiles" else None)

    db.table.side_effect = _table
    db.rpc.return_value = _chain(result_data=None)
    db.auth.get_user.return_value = MagicMock(user=MagicMock(id="test-user-id", email="test@productiq.in"))
    db.storage.from_.return_value = MagicMock()

    return db


@pytest.fixture
def mock_user():
    """A fake Supabase User object for auth tests."""
    user = MagicMock()
    user.id = "test-user-uuid-1234"
    user.email = "founder@productiq.in"
    user.user_metadata = {"full_name": "Test User", "company_name": "TestCo"}
    return user


@pytest.fixture
def mock_profile():
    """A fake profile dict matching the DB schema."""
    return {
        "id": "test-user-uuid-1234",
        "email": "founder@productiq.in",
        "full_name": "Test User",
        "company_name": "TestCo",
        "plan": "free",
        "reports_used_this_month": 1,
        "reports_limit": 3,
        "razorpay_customer_id": None,
        "razorpay_subscription_id": None,
        "referral_code": "TEST2024",
        "referred_by": None,
        "extra_reports_from_referrals": 0,
        "created_at": "2024-01-01T00:00:00Z",
        "updated_at": "2024-01-01T00:00:00Z",
    }


@pytest.fixture
def client(mock_supabase, mock_user):
    """FastAPI TestClient with mocked auth and database.
    Import here so env vars are set before app initialisation.
    """
    from fastapi.testclient import TestClient
    from main import app

    # Override get_current_user to return our mock user
    from routers.reports import get_current_user as reports_get_user
    from routers.payments import get_current_user as payments_get_user

    app.dependency_overrides[reports_get_user] = lambda: mock_user
    app.dependency_overrides[payments_get_user] = lambda: mock_user

    # Patch database.get_supabase everywhere it's imported at module level
    with patch("database.get_supabase", return_value=mock_supabase), \
         patch("routers.reports.get_supabase", return_value=mock_supabase), \
         patch("routers.payments.get_supabase", return_value=mock_supabase), \
         patch("routers.webhooks.get_supabase", return_value=mock_supabase), \
         patch("routers.sentiment.get_supabase", return_value=mock_supabase), \
         patch("routers.profile.get_supabase", return_value=mock_supabase), \
         patch("routers.products.get_supabase", return_value=mock_supabase), \
         patch("routers.graph.get_supabase", return_value=mock_supabase), \
         patch("analytics.track_event"), \
         patch("config.settings.USE_CELERY", False):
        yield TestClient(app)

    app.dependency_overrides.clear()
