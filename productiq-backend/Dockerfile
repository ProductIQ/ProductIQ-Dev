# ──────────────────────────────────────────────────────────────────────────────
# ProductIQ Backend — Production Dockerfile (multi-stage)
#
# Stage 1: builder — installs Python deps, downloads spaCy model, Playwright
# Stage 2: runtime — slim image with only runtime deps
#
# Image size: ~1.2 GB (down from ~2.5 GB in single-stage)
# ──────────────────────────────────────────────────────────────────────────────

# ── Stage 1: Builder ──────────────────────────────────────────────────────────
FROM python:3.11-slim AS builder

WORKDIR /build

# System deps for compiling native extensions (psycopg2, cairocffi, etc.)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    gcc \
    libcairo2-dev \
    libpango1.0-dev \
    libgdk-pixbuf2.0-dev \
    libffi-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies to a separate prefix for clean copy
COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

# Download spaCy model into the install prefix
RUN pip install --no-cache-dir --prefix=/install spacy && \
    python -m spacy download en_core_web_sm && \
    cp -r /usr/local/lib/python3.11/site-packages/en_core_web_sm \
          /install/lib/python3.11/site-packages/ 2>/dev/null || true

# ── Stage 2: Runtime ──────────────────────────────────────────────────────────
FROM python:3.11-slim AS runtime

WORKDIR /app

# Runtime system deps (no -dev packages)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    libcairo2 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libgdk-pixbuf2.0-0 \
    libffi8 \
    shared-mime-info \
    curl \
    # Playwright Chromium runtime deps
    libnss3 \
    libnspr4 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libdbus-1-3 \
    libxcb1 \
    libxkbcommon0 \
    libx11-6 \
    libxcomposite1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libpango-1.0-0 \
    libcairo2 \
    libasound2 \
    && rm -rf /var/lib/apt/lists/*

# Copy installed Python packages from builder
COPY --from=builder /install /usr/local

# Install Playwright Chromium browser (runtime only, no deps install)
RUN playwright install chromium

# Copy application source
COPY . .

# Create non-root user for security
RUN groupadd -r appuser && useradd -r -g appuser appuser && \
    chown -R appuser:appuser /app
USER appuser

EXPOSE 8000

# Health check via /health endpoint
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Production uvicorn config: 2 workers, no reload, 60s timeout for long SSE
CMD ["uvicorn", "main:app", \
     "--host", "0.0.0.0", \
     "--port", "8000", \
     "--workers", "2", \
     "--timeout-keep-alive", "65", \
     "--access-log"]
