# ProductIQ Backend

Production-ready AI-powered product intelligence backend for D2C brands in India.

## Architecture

```
ProductIQ Backend
├── FastAPI (REST API + SSE streaming)
├── Celery + Redis (async task queue)
├── CrewAI (12-agent orchestration)
├── Google Gemini (LLM — Flash/Pro tiers)
├── Supabase (Postgres + pgvector + Realtime + Storage)
├── LlamaIndex (RAG pipeline over pgvector)
└── Razorpay (payments)
```

## Agent Pipeline

| # | Agent | Model | Role |
|---|-------|-------|------|
| 1 | Web Scraper | Gemini 2.0 Flash | Amazon India + Flipkart product data |
| 2 | Review Miner | Gemini 2.0 Flash | BERTopic + VADER sentiment on reviews |
| 3 | Competitor Intel | Gemini 2.0 Flash | Full competitor landscape mapping |
| 4 | Trend Spotter | Gemini 2.0 Flash | Google Trends + Reddit velocity |
| 5 | Insight Synthesizer | Gemini 1.5 Pro | Executive insights via RAG |
| 6 | Product Innovator | Gemini 1.5 Pro | 3 validated product concepts |
| 7 | GTM Strategist | Gemini 2.0 Flash | India-specific GTM plan |
| 8 | Report Builder | Gemini 1.5 Pro | PDF + PPTX report |
| 9 | Sentiment Monitor | Gemini 1.5 Flash | Daily brand health (scheduled) |
| 10 | Price Optimizer | Gemini 1.5 Flash | Daily price tracking (scheduled) |
| 11 | Supply Chain Scout | Gemini 1.5 Flash | IndiaMart supplier sourcing |
| 12 | Compliance Guardian | Gemini 1.5 Flash | FSSAI/AYUSH/BIS RAG compliance |

## Quick Start

### 1. Install dependencies
```bash
pip install -r requirements.txt
python -m spacy download en_core_web_sm
playwright install chromium
playwright install-deps chromium
```

### 2. Environment Setup
```bash
cp .env.example .env
# Fill all values in .env
```

### 3. Database Setup
Run `migrations/001_initial_schema.sql` in Supabase Dashboard → SQL Editor.

### 4. Seed Compliance Knowledge Base (Agent 12)
```bash
python scripts/seed_regulations.py
```

### 5. Start Services
```bash
# Terminal 1: FastAPI
uvicorn main:app --reload

# Terminal 2: Celery Worker
celery -A celery_app worker --loglevel=info -Q pipeline,monitoring,default

# Terminal 3: Celery Beat (scheduler)
celery -A celery_app beat --loglevel=info

# Optional: Flower (Celery monitoring UI)
celery -A celery_app flower --port=5555
```

### 6. Test the Pipeline
```bash
python scripts/test_crew.py --category "protein powder" --brand "MuscleBlaze"
```

## Docker
```bash
cp .env.example .env  # fill values
docker-compose up --build
```

Services:
- API: http://localhost:8000
- Flower: http://localhost:5555
- Docs: http://localhost:8000/docs

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/reports/run` | Start new pipeline |
| GET | `/api/reports/` | List user's runs |
| GET | `/api/reports/{run_id}` | Run detail + download URLs |
| GET | `/api/stream/{run_id}` | SSE real-time progress |
| POST | `/api/payments/order` | Create Razorpay order |
| POST | `/api/payments/verify` | Verify payment + upgrade plan |
| GET | `/api/sentiment/` | Brand sentiment history |
| GET | `/api/graph/{run_id}` | Knowledge graph |
| GET | `/api/profile/` | User profile |
| PATCH | `/api/profile/` | Update profile |
| POST | `/api/webhooks/razorpay` | Payment webhooks |

Full docs at `/docs` (Swagger UI).

## Real-Time Architecture

```
Browser ──SSE──► /api/stream/{run_id}
                      │
                 SSEManager.queue
                      ▲
           Celery Task (progress_callback)
                      │
              Supabase agent_runs UPDATE
                      │
           Supabase Realtime (frontend)
```

## Freemium Gates

| Plan | Reports/month | Features |
|------|--------------|---------|
| Free | 3 | Watermarked PDF, 8 agents |
| Pro (₹4,999/mo) | Unlimited | No watermark, Sentiment + Price monitoring |
| Pay-per-report (₹999) | +1 credit | Same as Pro for that report |
| Enterprise (₹14,999/mo) | Unlimited | All 12 agents, knowledge graph |

## Stack

- **Python** 3.11
- **FastAPI** 0.115 + **uvicorn**
- **CrewAI** 0.63 + **crewai-tools**
- **Google Gemini** (via `google-generativeai`)
- **Supabase** (Postgres + pgvector + Realtime + Storage Auth)
- **LlamaIndex** 0.10 with Gemini embeddings
- **Celery** 5.4 + **Redis** 7
- **WeasyPrint** (PDF) + **python-pptx** (PowerPoint)
- **BERTopic** + **VADER** + **spaCy** (NLP)
- **Playwright** (JS rendering)
- **Razorpay** (payments)
- **PostHog** (analytics)