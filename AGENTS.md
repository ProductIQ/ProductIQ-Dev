# AGENTS.md — Build & Test Commands

This file provides quick reference for AI agents working on this codebase.

## Project Overview

ProductIQ is a full-stack AI product intelligence platform. Backend is FastAPI + CrewAI (Python), frontend is React 19 + Vite 8 (TypeScript). Deployed via Docker Compose, Railway, or Fly.io.

## Build Commands

### Frontend (productiq-frontend/)

```bash
# Install dependencies
npm install

# TypeScript type check
npx tsc --noEmit

# Build for production
npm run build

# Preview production build
npm run preview

# Lint
npm run lint
```

### Backend (productiq-backend/)

```bash
# Install dependencies
pip install -r requirements.txt

# Download spaCy model
python -m spacy download en_core_web_sm

# Install Playwright browser
playwright install chromium
```

## Test Commands

### Frontend E2E Tests

```bash
cd productiq-frontend

# Run all E2E tests
npm run test:e2e

# Run specific test file
npx playwright test e2e/tests/admin.spec.ts

# Interactive UI mode (for debugging)
npm run test:e2e:ui

# View HTML report
npm run test:e2e:report
```

E2E tests use Playwright with mocked API (no backend needed). Set `VITE_E2E_TEST=true`.

### Backend Tests

```bash
cd productiq-backend

# Run all tests
python3 -m pytest tests/ -v

# Run specific test file
python3 -m pytest tests/test_reports.py -v

# Run with short traceback
python3 -m pytest tests/ --tb=short
```

Backend tests mock all external services (Supabase, Gemini, Apify, Redis, Celery).

## Dev Server Commands

### Frontend

```bash
cd productiq-frontend
npm run dev
# Visit http://localhost:5173 (proxies /api to localhost:8000)
```

### Backend

```bash
cd productiq-backend
uvicorn main:app --reload --port 8000
# Visit http://localhost:8000/docs for Swagger UI
```

### Celery (for async pipeline)

```bash
cd productiq-backend
celery -A celery_app worker --loglevel=info -Q pipeline,monitoring,default
celery -A celery_app beat --loglevel=info
```

### Docker Compose (all services)

```bash
# Ensure root .env is populated first (cp .env.example .env)
docker compose up -d                          # Start all services
docker compose --profile monitoring up -d     # With Flower dashboard
docker compose logs -f api                    # View API logs
docker compose ps                             # Check service status

# With Doppler (no .env file needed):
doppler run -- docker compose up -d
```

## Coding Conventions

### Frontend (TypeScript/React)

- Use TypeScript strict mode (no `any` without justification)
- Use `@/` path alias for imports from `src/`
- Lazy-load route components with `React.lazy()`
- Use TanStack Query for server state (not useEffect + useState)
- Use Tailwind CSS classes (no custom CSS unless necessary)
- Follow existing component patterns in `src/pages/` and `src/components/`
- Add types to `src/types/` for new API response shapes
- Add API functions to `src/lib/api.ts` with proper TypeScript interfaces
- Use Sonner for toast notifications (`import { toast } from 'sonner'`)
- Use Motion for animations (`import { motion } from 'motion'`)

### Backend (Python/FastAPI)

- Use Pydantic 2 for request/response models
- Use structlog for structured logging (`logger = structlog.get_logger()`)
- Use `get_current_user` dependency for authenticated endpoints
- Use `require_plan("pro")` for plan-gated endpoints
- Use `require_admin()` for admin-only endpoints
- Use `require_admin` from `auth.py` for admin guards
- Routers go in `routers/` directory, registered in `main.py`
- Database queries go through Supabase client (`database.get_supabase()`)
- SQL migrations go in `supabase/migrations/` with sequential numbering
- Test fixtures and mocks in `tests/conftest.py`

### Database Migrations

Migrations are in `productiq-backend/supabase/migrations/`:
- `001_initial_schema.sql` — Core tables (profiles, agent_runs, agent_outputs, etc.)
- `002_v2_features.sql` — V2 tables (notifications, intelligence_events, brands, chat)
- `003_realtime_publication.sql` — Enable Supabase Realtime publications
- `004_admin_panel.sql` — Admin role column + audit log table

Run migrations in Supabase Dashboard → SQL Editor in order.

### Git Conventions

- Commit messages focus on "why" not "what"
- Use conventional commit prefixes: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`
- Never commit secrets or .env files
- Never push without explicit user request

## CI Pipeline

GitHub Actions (`.github/workflows/ci.yml`) runs on every push/PR:

1. **backend-tests** — Python pytest with mocked services
2. **frontend-build** — TypeScript check + Vite build (+ Sentry source maps on main)
3. **docker-build** — Verifies both Dockerfiles build
4. **e2e-tests** — Playwright tests against production build

## Key Files

| File | Purpose |
|---|---|
| `productiq-backend/main.py` | FastAPI app entry point |
| `productiq-backend/config.py` | Settings (env vars) |
| `productiq-backend/auth.py` | JWT auth + admin guard |
| `productiq-backend/sentry_init.py` | Sentry initialization |
| `productiq-backend/routers/` | API route handlers |
| `productiq-backend/crews/main_crew.py` | CrewAI agent definitions |
| `productiq-backend/celery_tasks.py` | Async pipeline tasks |
| `productiq-frontend/src/main.tsx` | React entry + ErrorBoundary |
| `productiq-frontend/src/App.tsx` | Routes + page transitions |
| `productiq-frontend/src/lib/api.ts` | All API functions |
| `productiq-frontend/src/lib/sentry.ts` | Sentry init + helpers |
| `productiq-frontend/src/hooks/useAuth.ts` | Auth context + profile |
| `productiq-frontend/vite.config.ts` | Vite + Sentry plugin config |
| `docker-compose.yml` | Full-stack Docker setup |
| `fly.toml` | Fly.io deployment config |

## Current Test Count

- Backend: 62 tests (all passing)
- Frontend E2E: 54 tests (all passing)
