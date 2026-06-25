"""
ProductIQ — FastAPI Application Entry Point
Production-grade: request-ID tracing, structured logging, global exception handler.
"""

import uuid
import asyncio
import structlog

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager

from config import settings
from routers import reports, stream, products, payments, webhooks, sentiment, graph, profile
from routers import v2 as v2_router
from routers import admin as admin_router

# ── Sentry initialization (must happen before app creation) ───────────────────
from sentry_init import init_sentry as _init_sentry
_sentry_enabled = _init_sentry()

logger = structlog.get_logger()


# ── Lifespan ──────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / shutdown lifecycle hooks."""
    # Print full configuration summary so we immediately know what's wired up
    cfg = settings.log_configuration_summary()
    logger.info("ProductIQ API starting", **cfg, supabase_url=settings.SUPABASE_URL[:40],
                sentry_enabled=_sentry_enabled)

    # Warn about missing critical config
    if not settings.apify_configured:
        logger.warning(
            "APIFY_API_TOKEN not configured — Agent 1 & 2 will return empty results. "
            "Set a real token in .env to enable real-time scraping."
        )
    if not settings.serpapi_configured:
        logger.info("SERPAPI_KEY not set — SerpAPI tool will use mock data")
    if not settings.reddit_configured:
        logger.info("Reddit credentials not set — Reddit tool will be skipped")

    # Warm up the Supabase client at startup so we fail fast if misconfigured
    try:
        from database import get_supabase
        get_supabase()
        logger.info("Supabase connection OK")
    except Exception as exc:
        logger.error("Supabase connection failed at startup", error=str(exc))
        # Don't abort startup — let individual requests handle the error gracefully

    # Start Supabase Realtime listener (non-critical — runs in background)
    try:
        from realtime_events import start_realtime_listener
        asyncio.create_task(start_realtime_listener())
        logger.info("Supabase Realtime listener started")
    except Exception as exc:
        logger.warning("Realtime listener failed to start", error=str(exc))

    yield

    logger.info("ProductIQ API shutting down")


# ── App instance ──────────────────────────────────────────────────────────────

app = FastAPI(
    title="ProductIQ API",
    version="2.0.0",
    description=(
        "AI-powered product intelligence for D2C brands in India. "
        "8-agent CrewAI pipeline with real-time SSE streaming."
    ),
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)


# ── Middleware: CORS ──────────────────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        settings.FRONTEND_URL,
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Request-ID"],
)


# ── Middleware: Request-ID tracing ────────────────────────────────────────────

@app.middleware("http")
async def request_id_middleware(request: Request, call_next):
    """
    Attaches a unique X-Request-ID to every request and response.
    Enables tracing across logs, Celery tasks, and Supabase rows.
    """
    request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())[:8]
    request.state.request_id = request_id

    structlog.contextvars.bind_contextvars(request_id=request_id)

    response = await call_next(request)
    response.headers["X-Request-ID"] = request_id

    structlog.contextvars.clear_contextvars()
    return response


# ── Middleware: Request logging ───────────────────────────────────────────────

@app.middleware("http")
async def access_log_middleware(request: Request, call_next):
    import time
    start = time.perf_counter()
    response = await call_next(request)
    duration_ms = round((time.perf_counter() - start) * 1000)

    # Skip health-check noise
    if request.url.path not in ("/health", "/"):
        logger.info(
            "HTTP",
            method=request.method,
            path=request.url.path,
            status=response.status_code,
            duration_ms=duration_ms,
        )
    return response


# ── Routers ───────────────────────────────────────────────────────────────────

app.include_router(profile.router,   prefix="/api/profile",   tags=["profile"])
app.include_router(reports.router,   prefix="/api/reports",   tags=["reports"])
app.include_router(stream.router,    prefix="/api/stream",    tags=["stream"])
app.include_router(products.router,  prefix="/api/products",  tags=["products"])
app.include_router(payments.router,  prefix="/api/payments",  tags=["payments"])
app.include_router(webhooks.router,  prefix="/api/webhooks",  tags=["webhooks"])
app.include_router(sentiment.router, prefix="/api/sentiment", tags=["sentiment"])
app.include_router(graph.router,     prefix="/api/graph",     tags=["graph"])
app.include_router(v2_router.router, prefix="/api/v2",        tags=["v2"])
app.include_router(admin_router.router, prefix="/api/admin",   tags=["admin"])


# ── Global exception handler ──────────────────────────────────────────────────

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    request_id = getattr(request.state, "request_id", "unknown")
    logger.error(
        "Unhandled exception",
        path=request.url.path,
        method=request.method,
        request_id=request_id,
        error=str(exc),
        exc_type=type(exc).__name__,
    )
    # Capture in Sentry (if enabled)
    if _sentry_enabled:
        import sentry_sdk
        sentry_sdk.capture_exception(exc)
    return JSONResponse(
        status_code=500,
        content={
            "detail": "Internal server error. Our engineering team has been notified.",
            "request_id": request_id,
        },
        headers={"X-Request-ID": request_id},
    )


# ── Health checks ─────────────────────────────────────────────────────────────

@app.get("/health", tags=["health"], summary="Liveness probe")
async def health():
    """Liveness probe for Railway / Docker / Kubernetes health checks."""
    return {
        "status": "ok",
        "version": "2.0.0",
        "sentry_enabled": _sentry_enabled,
        **settings.log_configuration_summary(),
    }


@app.get("/health/apify", tags=["health"], summary="Validate Apify token")
async def health_apify():
    """Validates the Apify token by listing available actors. For debugging."""
    if not settings.apify_configured:
        from fastapi.responses import JSONResponse
        return JSONResponse(
            status_code=503,
            content={"status": "error", "detail": "APIFY_API_TOKEN not configured"},
        )
    try:
        from apify_client import ApifyClient
        client = ApifyClient(settings.APIFY_API_TOKEN)
        me = client.user("me").get()
        return {
            "status": "ok",
            "apify_user": me.get("username") if me else "unknown",
            "monthly_usage_usd": (me or {}).get("monthlyUsage", {}).get("totalUsd"),
        }
    except Exception as exc:
        from fastapi.responses import JSONResponse
        return JSONResponse(
            status_code=503,
            content={"status": "error", "detail": str(exc)},
        )


@app.get("/health/db", tags=["health"], summary="Supabase connectivity check")
async def health_db():
    """Readiness probe — verifies Supabase connection is live."""
    try:
        from database import get_supabase
        db = get_supabase()
        # Lightweight query
        db.table("profiles").select("id").limit(1).execute()
        return {"status": "ok", "database": "connected"}
    except Exception as exc:
        logger.error("DB health check failed", error=str(exc))
        return JSONResponse(
            status_code=503,
            content={"status": "error", "database": "unreachable", "detail": str(exc)},
        )


@app.get("/", tags=["health"])
async def root():
    return {
        "message": "ProductIQ API v2 — visit /docs for the interactive API explorer.",
        "docs": "/docs",
        "health": "/health",
    }


# ── Observability endpoints (D6) ──────────────────────────────────────────────

@app.get("/health/llm-usage", tags=["health", "observability"], summary="LLM usage summary")
async def llm_usage_summary(date: str = None):
    """Get aggregated LLM token usage and latency metrics for a given date.
    Defaults to today. Useful for cost monitoring and debugging."""
    from observability import get_usage_summary
    return get_usage_summary(date)


@app.get("/health/run-llm-calls/{run_id}", tags=["health", "observability"],
         summary="LLM calls for a specific run")
async def run_llm_calls(run_id: str):
    """Get all LLM calls made during a specific pipeline run.
    Useful for debugging agent performance and token costs."""
    from observability import get_run_llm_calls
    calls = get_run_llm_calls(run_id)
    return {"run_id": run_id, "total_calls": len(calls), "calls": calls}