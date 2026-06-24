# ProductIQ — Complete Vibe Coding Guide
> Full backend, agent orchestration, CrewAI pipeline, Supabase schema, Realtime, RAG, and architecture reference for IDE-first development. Frontend is described but not coded here.

---

## Table of Contents

1. [Project Overview & Philosophy](#1-project-overview--philosophy)
2. [Folder Structure](#2-folder-structure)
3. [Environment Setup](#3-environment-setup)
4. [Supabase Schema (Complete)](#4-supabase-schema-complete)
5. [Gemini Model Configuration](#5-gemini-model-configuration)
6. [CrewAI Agent Definitions (All 12)](#6-crewai-agent-definitions-all-12)
7. [CrewAI Task Definitions (All 12)](#7-crewai-task-definitions-all-12)
8. [CrewAI Crew Orchestration](#8-crewai-crew-orchestration)
9. [Custom Tools for Agents](#9-custom-tools-for-agents)
10. [FastAPI Backend (Complete)](#10-fastapi-backend-complete)
11. [Celery + Redis Scheduled Jobs](#11-celery--redis-scheduled-jobs)
12. [SSE Real-Time Agent Streaming](#12-sse-real-time-agent-streaming)
13. [Supabase Realtime Integration](#13-supabase-realtime-integration)
14. [RAG Pipeline (LlamaIndex + pgvector)](#14-rag-pipeline-llamaindex--pgvector)
15. [Report Builder (PDF + PPTX)](#15-report-builder-pdf--pptx)
16. [Razorpay Payments & Freemium Gating](#16-razorpay-payments--freemium-gating)
17. [Compliance Guardian Agent (RAG over Regulations)](#17-compliance-guardian-agent-rag-over-regulations)
18. [Supply Chain Scout Agent](#18-supply-chain-scout-agent)
19. [Sentiment Tracker Agent (Realtime)](#19-sentiment-tracker-agent-realtime)
20. [Price Optimizer Agent](#20-price-optimizer-agent)
21. [Product Knowledge Graph (JSONB → Neo4j path)](#21-product-knowledge-graph-jsonb--neo4j-path)
22. [PostHog Analytics Integration](#22-posthog-analytics-integration)
23. [Docker & Deployment](#23-docker--deployment)
24. [Frontend Overview (No Code)](#24-frontend-overview-no-code)
25. [8-Week Build Roadmap](#25-8-week-build-roadmap)
26. [Environment Variables Reference](#26-environment-variables-reference)

---

## 1. Project Overview & Philosophy

### What ProductIQ Is

ProductIQ is a **product intelligence OS** for D2C brands and FMCG companies. It replaces ₹2–5 lakh consulting market research reports with a 10-minute AI-generated equivalent costing ₹999. The platform orchestrates 12 specialised AI agents via CrewAI to go from raw scraping → review mining → competitor intelligence → trend spotting → insight synthesis → product ideation → go-to-market strategy → report generation.

### Core Design Decisions

| Decision | Choice | Reason |
|---|---|---|
| LLM provider | Gemini only (3 tiers) | Single API key, 1M token context, Google Search grounding |
| Orchestration | CrewAI | Purpose-built multi-agent framework, task dependencies, tool use |
| Primary DB | Supabase (Postgres) | SQL, pgvector for RAG, Realtime, RLS for multi-tenancy |
| Graph layer | Supabase JSONB (MVP) → Neo4j (scale) | Zero extra cost at MVP; migrate when Knowledge Graph feature ships |
| Backend | FastAPI + Celery + Redis | Async agent runs, SSE streaming, scheduled monitoring agents |
| Embeddings | Gemini `models/embedding-001` | Same API key, 768-dimension, strong multilingual |
| RAG | LlamaIndex + pgvector | Production-grade, native Supabase connector |
| Payments | Razorpay | India-first, UPI/cards, webhook-friendly |

### The Pipeline (High Level)

```
User submits product category + brand name
         ↓
FastAPI creates agent_run record in Supabase
         ↓
Celery task kicks off CrewAI Crew
         ↓
Agent 1: Scraper → Agent 2: Review Miner → Agent 3: Competitor Intel
→ Agent 4: Trend Spotter → Agent 5: Insight Synthesizer
→ Agent 6: Product Innovator → Agent 7: GTM Strategist → Agent 8: Report Builder
         ↓
Each agent writes its output to Supabase
         ↓
SSE stream broadcasts agent progress to React frontend in real time
         ↓
Report Builder generates PDF + PPTX → uploads to Supabase Storage
         ↓
User downloads report
```

Agents 9–12 (Sentiment Tracker, Price Optimizer, Supply Chain Scout, Compliance Guardian) run on **Celery Beat schedules** independently.

---

## 2. Folder Structure

```
productiq/
├── backend/
│   ├── main.py                    # FastAPI app entry point
│   ├── config.py                  # All settings, env vars
│   ├── database.py                # Supabase client setup
│   ├── models.py                  # Pydantic request/response models
│   │
│   ├── agents/
│   │   ├── __init__.py
│   │   ├── base.py                # Base Gemini LLM config for CrewAI
│   │   ├── scraper_agent.py       # Agent 1
│   │   ├── review_miner_agent.py  # Agent 2
│   │   ├── competitor_agent.py    # Agent 3
│   │   ├── trend_agent.py         # Agent 4
│   │   ├── insight_agent.py       # Agent 5
│   │   ├── innovator_agent.py     # Agent 6
│   │   ├── gtm_agent.py           # Agent 7
│   │   ├── report_agent.py        # Agent 8
│   │   ├── sentiment_agent.py     # Agent 9
│   │   ├── price_agent.py         # Agent 10
│   │   ├── supply_agent.py        # Agent 11
│   │   └── compliance_agent.py    # Agent 12
│   │
│   ├── tasks/
│   │   ├── __init__.py
│   │   ├── scraper_task.py
│   │   ├── review_task.py
│   │   ├── competitor_task.py
│   │   ├── trend_task.py
│   │   ├── insight_task.py
│   │   ├── innovator_task.py
│   │   ├── gtm_task.py
│   │   └── report_task.py
│   │
│   ├── tools/
│   │   ├── __init__.py
│   │   ├── scraping_tools.py      # Playwright + BeautifulSoup tools
│   │   ├── search_tools.py        # SerpAPI + pytrends tools
│   │   ├── nlp_tools.py           # spaCy + BERTopic tools
│   │   ├── storage_tools.py       # Supabase read/write tools
│   │   └── report_tools.py        # PDF + PPTX generation tools
│   │
│   ├── crews/
│   │   ├── __init__.py
│   │   ├── main_crew.py           # Core 8-agent crew
│   │   └── monitoring_crew.py     # Agents 9–12 crew
│   │
│   ├── rag/
│   │   ├── __init__.py
│   │   ├── pipeline.py            # LlamaIndex RAG setup
│   │   ├── ingestion.py           # Document ingestion
│   │   └── retriever.py           # Vector search queries
│   │
│   ├── routers/
│   │   ├── __init__.py
│   │   ├── reports.py             # Report generation endpoints
│   │   ├── stream.py              # SSE streaming endpoint
│   │   ├── products.py            # Product data endpoints
│   │   ├── payments.py            # Razorpay endpoints
│   │   └── webhooks.py            # Razorpay + external webhooks
│   │
│   ├── celery_app.py              # Celery + Redis config
│   ├── celery_tasks.py            # Async task wrappers for CrewAI
│   ├── celery_beat.py             # Scheduled tasks (agents 9–12)
│   ├── streaming.py               # SSE manager
│   ├── realtime.py                # Supabase Realtime listener
│   ├── graph.py                   # JSONB graph queries
│   ├── analytics.py               # PostHog event tracking
│   └── payments.py                # Razorpay client + webhook handler
│
├── migrations/
│   └── 001_initial_schema.sql     # Full Supabase schema
│
├── scripts/
│   ├── seed_regulations.py        # Seeds FSSAI/FDA docs for Compliance agent
│   └── test_crew.py               # Quick terminal test of the full pipeline
│
├── .env                           # Never commit — see section 26
├── .env.example
├── requirements.txt
├── Dockerfile
├── docker-compose.yml
└── README.md
```

---

## 3. Environment Setup

### requirements.txt

```txt
# Core
fastapi==0.111.0
uvicorn[standard]==0.30.1
pydantic==2.7.1
pydantic-settings==2.3.0
python-dotenv==1.0.1

# CrewAI
crewai==0.36.0
crewai-tools==0.4.6

# Gemini
google-generativeai==0.7.2
langchain-google-genai==1.0.6

# Supabase
supabase==2.4.6
psycopg2-binary==2.9.9
asyncpg==0.29.0

# RAG
llama-index==0.10.43
llama-index-vector-stores-supabase==0.1.3
llama-index-embeddings-gemini==0.1.6
llama-index-llms-gemini==0.1.11

# Celery + Redis
celery==5.4.0
redis==5.0.6
flower==2.0.1

# Scraping
playwright==1.44.0
beautifulsoup4==4.12.3
scrapy==2.11.2
httpx==0.27.0
fake-useragent==1.5.1

# NLP
spacy==3.7.5
bertopic==0.16.2
vaderSentiment==3.3.2
sentence-transformers==3.0.1

# Search & Trends
google-search-results==2.4.2
pytrends==4.9.2
praw==7.7.1

# Report generation
python-pptx==0.6.23
weasyprint==62.1
jinja2==3.1.4
Pillow==10.3.0

# Analytics & Payments
posthog==3.5.0
razorpay==1.4.1

# Utilities
scipy==1.13.1
numpy==1.26.4
pandas==2.2.2
python-multipart==0.0.9
sse-starlette==2.1.0
structlog==24.2.0
```

### Installation Steps

```bash
# 1. Clone and enter project
git clone https://github.com/yourname/productiq.git
cd productiq/backend

# 2. Create virtualenv
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Install spaCy model
python -m spacy download en_core_web_sm

# 5. Install Playwright browsers
playwright install chromium

# 6. Copy env file
cp .env.example .env
# Fill in all values — see Section 26

# 7. Start Redis (required for Celery)
# Option A: Docker
docker run -d -p 6379:6379 redis:alpine

# Option B: local
brew install redis && redis-server

# 8. Run database migrations
# Apply migrations/001_initial_schema.sql in Supabase SQL editor

# 9. Seed regulations for Compliance agent
python scripts/seed_regulations.py

# 10. Start all services
# Terminal 1 — FastAPI
uvicorn main:app --reload --port 8000

# Terminal 2 — Celery worker
celery -A celery_app worker --loglevel=info --concurrency=4

# Terminal 3 — Celery Beat (scheduler)
celery -A celery_app beat --loglevel=info

# Terminal 4 — Flower (optional monitoring UI)
celery -A celery_app flower --port=5555
```

---

## 4. Supabase Schema (Complete)

Run this entire file in the Supabase SQL editor at `supabase.com/dashboard → SQL Editor`.

```sql
-- migrations/001_initial_schema.sql

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";
CREATE EXTENSION IF NOT EXISTS "ltree";

-- ============================================================
-- USERS & SUBSCRIPTIONS
-- ============================================================

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  company_name TEXT,
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'enterprise')),
  reports_used_this_month INT NOT NULL DEFAULT 0,
  reports_limit INT NOT NULL DEFAULT 3,
  razorpay_customer_id TEXT,
  razorpay_subscription_id TEXT,
  referral_code TEXT UNIQUE DEFAULT gen_random_uuid()::TEXT,
  referred_by UUID REFERENCES public.profiles(id),
  extra_reports_from_referrals INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- ============================================================
-- AGENT RUNS (core pipeline execution record)
-- ============================================================

CREATE TABLE public.agent_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  product_category TEXT NOT NULL,
  brand_name TEXT,
  target_market TEXT DEFAULT 'India',
  status TEXT NOT NULL DEFAULT 'queued' CHECK (
    status IN ('queued', 'running', 'completed', 'failed')
  ),
  current_agent TEXT,
  progress_pct INT DEFAULT 0,
  error_message TEXT,
  celery_task_id TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.agent_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own runs" ON public.agent_runs FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- AGENT OUTPUTS (one row per agent per run)
-- ============================================================

CREATE TABLE public.agent_outputs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  run_id UUID NOT NULL REFERENCES public.agent_runs(id) ON DELETE CASCADE,
  agent_name TEXT NOT NULL,
  agent_number INT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'running', 'completed', 'failed')
  ),
  output JSONB,
  tokens_used INT,
  duration_seconds FLOAT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_agent_outputs_run_id ON public.agent_outputs(run_id);
ALTER TABLE public.agent_outputs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own outputs" ON public.agent_outputs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.agent_runs WHERE id = run_id AND user_id = auth.uid())
  );

-- ============================================================
-- PRODUCTS (scraped product data)
-- ============================================================

CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  run_id UUID REFERENCES public.agent_runs(id) ON DELETE SET NULL,
  platform TEXT NOT NULL,
  product_name TEXT NOT NULL,
  brand TEXT,
  category TEXT,
  sub_category TEXT,
  price_inr NUMERIC,
  mrp_inr NUMERIC,
  rating NUMERIC,
  review_count INT,
  in_stock BOOLEAN DEFAULT TRUE,
  images TEXT[],
  url TEXT,
  specs JSONB,
  seller_info JSONB,
  scraped_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_products_category ON public.products(category);
CREATE INDEX idx_products_brand ON public.products(brand);
CREATE INDEX idx_products_run_id ON public.products(run_id);

-- ============================================================
-- REVIEWS
-- ============================================================

CREATE TABLE public.reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  run_id UUID REFERENCES public.agent_runs(id) ON DELETE SET NULL,
  platform TEXT NOT NULL,
  reviewer_name TEXT,
  rating INT CHECK (rating BETWEEN 1 AND 5),
  title TEXT,
  body TEXT NOT NULL,
  verified_purchase BOOLEAN DEFAULT FALSE,
  helpful_votes INT DEFAULT 0,
  sentiment_score NUMERIC,    -- -1.0 to 1.0
  sentiment_label TEXT,       -- positive | negative | neutral
  topics TEXT[],              -- extracted themes
  pain_points TEXT[],
  feature_requests TEXT[],
  reviewed_at TIMESTAMPTZ,
  scraped_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_reviews_product_id ON public.reviews(product_id);
CREATE INDEX idx_reviews_run_id ON public.reviews(run_id);
CREATE INDEX idx_reviews_sentiment ON public.reviews(sentiment_label);

-- ============================================================
-- REVIEW CLUSTERS (BERTopic output)
-- ============================================================

CREATE TABLE public.review_clusters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  run_id UUID NOT NULL REFERENCES public.agent_runs(id) ON DELETE CASCADE,
  topic_id INT NOT NULL,
  topic_label TEXT NOT NULL,
  topic_type TEXT CHECK (topic_type IN ('pain_point', 'feature_request', 'praise', 'neutral')),
  representative_words TEXT[],
  review_count INT,
  avg_sentiment NUMERIC,
  sample_reviews TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- COMPETITORS
-- ============================================================

CREATE TABLE public.competitors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  run_id UUID REFERENCES public.agent_runs(id) ON DELETE SET NULL,
  brand_name TEXT NOT NULL,
  product_name TEXT,
  platform TEXT,
  price_inr NUMERIC,
  rating NUMERIC,
  review_count INT,
  key_strengths TEXT[],
  key_weaknesses TEXT[],
  positioning_statement TEXT,
  ad_copy TEXT,
  url TEXT,
  scraped_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_competitors_run_id ON public.competitors(run_id);

-- ============================================================
-- TRENDS
-- ============================================================

CREATE TABLE public.trends (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  run_id UUID REFERENCES public.agent_runs(id) ON DELETE SET NULL,
  trend_keyword TEXT NOT NULL,
  source TEXT NOT NULL,          -- google_trends | reddit | twitter | instagram
  trend_score NUMERIC,           -- 0–100 for Google Trends
  velocity TEXT,                 -- rising | stable | declining
  peak_predicted_at TIMESTAMPTZ,
  related_topics TEXT[],
  sample_posts TEXT[],
  detected_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- INSIGHTS
-- ============================================================

CREATE TABLE public.insights (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  run_id UUID NOT NULL REFERENCES public.agent_runs(id) ON DELETE CASCADE,
  insight_type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  confidence_score NUMERIC,
  sources JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- PRODUCT CONCEPTS (Innovator Agent output)
-- ============================================================

CREATE TABLE public.product_concepts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  run_id UUID NOT NULL REFERENCES public.agent_runs(id) ON DELETE CASCADE,
  concept_name TEXT NOT NULL,
  tagline TEXT,
  target_persona TEXT,
  usp TEXT,
  key_features TEXT[],
  suggested_price_inr NUMERIC,
  price_rationale TEXT,
  gap_it_fills TEXT,
  market_size_estimate TEXT,
  risks TEXT[],
  name_ideas TEXT[],
  validation_score NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- GTM PLANS
-- ============================================================

CREATE TABLE public.gtm_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  run_id UUID NOT NULL REFERENCES public.agent_runs(id) ON DELETE CASCADE,
  concept_id UUID REFERENCES public.product_concepts(id),
  launch_channels TEXT[],
  messaging_framework JSONB,
  pricing_strategy JSONB,
  influencer_targets JSONB,
  launch_timeline JSONB,
  budget_estimate JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- REPORTS
-- ============================================================

CREATE TABLE public.reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  run_id UUID NOT NULL REFERENCES public.agent_runs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  title TEXT NOT NULL,
  pdf_url TEXT,
  pptx_url TEXT,
  is_watermarked BOOLEAN DEFAULT FALSE,
  page_count INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own reports" ON public.reports FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- SENTIMENT SCORES (Agent 9 — daily brand health)
-- ============================================================

CREATE TABLE public.sentiment_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  brand_name TEXT NOT NULL,
  platform TEXT NOT NULL,
  score NUMERIC NOT NULL,         -- -1.0 to 1.0
  positive_pct NUMERIC,
  negative_pct NUMERIC,
  neutral_pct NUMERIC,
  post_count INT,
  alert_sent BOOLEAN DEFAULT FALSE,
  scored_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sentiment_brand ON public.sentiment_scores(brand_name, scored_at DESC);

-- ============================================================
-- PRICE HISTORY (Agent 10 — price optimizer)
-- ============================================================

CREATE TABLE public.price_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES public.products(id),
  run_id UUID REFERENCES public.agent_runs(id),
  brand TEXT,
  platform TEXT,
  price_inr NUMERIC NOT NULL,
  rating NUMERIC,
  review_count INT,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_price_history_brand ON public.price_history(brand, recorded_at DESC);

-- ============================================================
-- SUPPLIERS (Agent 11 — Supply Chain Scout)
-- ============================================================

CREATE TABLE public.suppliers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  run_id UUID REFERENCES public.agent_runs(id) ON DELETE SET NULL,
  company_name TEXT NOT NULL,
  category TEXT,
  contact_person TEXT,
  phone TEXT,
  email TEXT,
  location TEXT,
  platform TEXT,                  -- indiamart | alibaba | tradeindia
  verified BOOLEAN DEFAULT FALSE,
  min_order_qty TEXT,
  price_range TEXT,
  certifications TEXT[],
  profile_url TEXT,
  rfq_generated BOOLEAN DEFAULT FALSE,
  found_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- COMPLIANCE CHECKS (Agent 12)
-- ============================================================

CREATE TABLE public.compliance_checks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  run_id UUID REFERENCES public.agent_runs(id) ON DELETE SET NULL,
  concept_id UUID REFERENCES public.product_concepts(id),
  regulation_body TEXT NOT NULL,  -- FSSAI | FDA | AYUSH | BIS
  overall_status TEXT CHECK (overall_status IN ('compliant', 'non_compliant', 'needs_review')),
  checklist JSONB,                -- [{item, status, note}]
  risk_flags TEXT[],
  recommendations TEXT[],
  checked_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- PRODUCT KNOWLEDGE GRAPH (JSONB — Neo4j migration ready)
-- ============================================================

CREATE TABLE public.knowledge_nodes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  node_type TEXT NOT NULL CHECK (
    node_type IN ('product', 'brand', 'feature', 'customer_need', 'competitor', 'supplier', 'trend', 'ingredient')
  ),
  label TEXT NOT NULL,
  properties JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.knowledge_edges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  from_node UUID NOT NULL REFERENCES public.knowledge_nodes(id) ON DELETE CASCADE,
  to_node UUID NOT NULL REFERENCES public.knowledge_nodes(id) ON DELETE CASCADE,
  relationship TEXT NOT NULL,     -- e.g. HAS_FEATURE, COMPETES_WITH, ADDRESSES_NEED
  weight NUMERIC DEFAULT 1.0,
  properties JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_edges_from ON public.knowledge_edges(from_node);
CREATE INDEX idx_edges_to ON public.knowledge_edges(to_node);

-- ============================================================
-- RAG EMBEDDINGS (pgvector)
-- ============================================================

CREATE TABLE public.embeddings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  run_id UUID REFERENCES public.agent_runs(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL,      -- review | product | insight | regulation
  source_id TEXT,
  content TEXT NOT NULL,
  embedding VECTOR(768),          -- Gemini embedding-001 dimensions
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_embeddings_run ON public.embeddings(run_id);
CREATE INDEX idx_embeddings_vector ON public.embeddings
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- ============================================================
-- PAYMENT TRANSACTIONS
-- ============================================================

CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  razorpay_order_id TEXT UNIQUE,
  razorpay_payment_id TEXT,
  razorpay_signature TEXT,
  amount_paise INT NOT NULL,
  currency TEXT DEFAULT 'INR',
  type TEXT CHECK (type IN ('subscription', 'pay_per_report', 'enterprise')),
  status TEXT DEFAULT 'created' CHECK (status IN ('created', 'paid', 'failed', 'refunded')),
  plan TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own transactions" ON public.transactions FOR SELECT USING (auth.uid() = user_id);

-- ============================================================
-- REALTIME: Enable publications for live agent updates
-- ============================================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_runs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_outputs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sentiment_scores;

-- ============================================================
-- HELPER FUNCTION: Reset monthly report count (called by cron)
-- ============================================================

CREATE OR REPLACE FUNCTION reset_monthly_reports()
RETURNS void AS $$
BEGIN
  UPDATE public.profiles SET reports_used_this_month = 0;
END;
$$ LANGUAGE plpgsql;
```

---

## 5. Gemini Model Configuration

```python
# backend/agents/base.py

from crewai import LLM
from config import settings

# Three model tiers — assign based on agent task complexity

GEMINI_FLASH = LLM(
    model="gemini/gemini-2.0-flash",
    api_key=settings.GEMINI_API_KEY,
    temperature=0.3,
    max_tokens=8192,
)
# Use for: Scraper, Review Miner, Competitor Intel, Trend Spotter, GTM Strategist
# Why: Fast, cheap, handles structured extraction and classification well

GEMINI_PRO = LLM(
    model="gemini/gemini-1.5-pro",
    api_key=settings.GEMINI_API_KEY,
    temperature=0.4,
    max_tokens=16384,
    context_window=1048576,  # 1M tokens — feed entire datasets in one prompt
)
# Use for: Insight Synthesizer, Product Innovator, Report Builder
# Why: Deep reasoning, handles massive context, best for synthesis and creativity

GEMINI_FLASH_15 = LLM(
    model="gemini/gemini-1.5-flash",
    api_key=settings.GEMINI_API_KEY,
    temperature=0.2,
    max_tokens=8192,
)
# Use for: Sentiment Tracker, Price Optimizer, Supply Chain Scout, Compliance Guardian
# Why: Cost-efficient for daily/hourly scheduled runs, reliable structured output
```

```python
# backend/config.py

from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    # Gemini
    GEMINI_API_KEY: str

    # Supabase
    SUPABASE_URL: str
    SUPABASE_SERVICE_KEY: str
    DATABASE_URL: str  # postgresql://... direct connection for pgvector

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # External APIs
    SERPAPI_KEY: str
    RAZORPAY_KEY_ID: str
    RAZORPAY_KEY_SECRET: str
    POSTHOG_API_KEY: str

    # App
    APP_ENV: str = "development"
    SECRET_KEY: str
    FRONTEND_URL: str = "http://localhost:5173"

    class Config:
        env_file = ".env"

@lru_cache()
def get_settings():
    return Settings()

settings = get_settings()
```

```python
# backend/database.py

from supabase import create_client, Client
from config import settings

supabase: Client = create_client(
    settings.SUPABASE_URL,
    settings.SUPABASE_SERVICE_KEY  # Service key — bypasses RLS for backend writes
)

def get_supabase() -> Client:
    return supabase
```

---

## 6. CrewAI Agent Definitions (All 12)

```python
# backend/agents/scraper_agent.py

from crewai import Agent
from agents.base import GEMINI_FLASH
from tools.scraping_tools import (
    AmazonScraperTool,
    FlipkartScraperTool,
    PlaywrightBrowserTool,
    SupabaseStoreTool,
)

def create_scraper_agent() -> Agent:
    return Agent(
        role="E-Commerce Product Intelligence Scraper",
        goal=(
            "Scrape comprehensive product data — names, prices, ratings, specs, images, "
            "seller info — from Amazon India, Flipkart, and D2C brand sites for the given "
            "product category. Store all structured data in Supabase."
        ),
        backstory=(
            "You are a specialist in extracting structured product data from Indian e-commerce "
            "platforms. You handle pagination, CAPTCHAs, and dynamic JavaScript rendering. "
            "You output clean, validated JSON that downstream agents depend on."
        ),
        tools=[AmazonScraperTool(), FlipkartScraperTool(), PlaywrightBrowserTool(), SupabaseStoreTool()],
        llm=GEMINI_FLASH,
        verbose=True,
        allow_delegation=False,
        max_retry_limit=3,
    )
```

```python
# backend/agents/review_miner_agent.py

from crewai import Agent
from agents.base import GEMINI_FLASH
from tools.scraping_tools import ReviewScraperTool
from tools.nlp_tools import BERTopicClusterTool, SentimentAnalysisTool, SpacyNERTool
from tools.storage_tools import SupabaseReviewStoreTool

def create_review_miner_agent() -> Agent:
    return Agent(
        role="Consumer Review Intelligence Analyst",
        goal=(
            "Extract, clean, and analyse thousands of customer reviews. Identify the top pain "
            "points, feature requests, and praise themes using BERTopic clustering. Score "
            "sentiment per review and per cluster. Store all clusters and enriched reviews."
        ),
        backstory=(
            "You are an NLP specialist who has analysed millions of consumer reviews across FMCG "
            "categories. You understand the difference between surface-level complaints and deep "
            "unmet needs. Your clusters directly feed the product innovation pipeline."
        ),
        tools=[ReviewScraperTool(), BERTopicClusterTool(), SentimentAnalysisTool(), SpacyNERTool(), SupabaseReviewStoreTool()],
        llm=GEMINI_FLASH,
        verbose=True,
        allow_delegation=False,
    )
```

```python
# backend/agents/competitor_agent.py

from crewai import Agent
from agents.base import GEMINI_FLASH
from tools.search_tools import SerpAPITool, GoogleSearchTool
from tools.scraping_tools import PlaywrightBrowserTool
from tools.storage_tools import SupabaseCompetitorStoreTool

def create_competitor_agent() -> Agent:
    return Agent(
        role="Competitive Intelligence Specialist",
        goal=(
            "Map the full competitor landscape for the given product category. For each "
            "competitor brand, extract pricing, positioning, key strengths/weaknesses, ad copy, "
            "and recent launches. Identify white spaces and gaps in competitor offerings."
        ),
        backstory=(
            "You are a market research analyst who has tracked hundreds of brand wars in Indian FMCG "
            "and D2C. You see through marketing language to find the actual product differentiators. "
            "You think like a brand strategist."
        ),
        tools=[SerpAPITool(), GoogleSearchTool(), PlaywrightBrowserTool(), SupabaseCompetitorStoreTool()],
        llm=GEMINI_FLASH,
        verbose=True,
        allow_delegation=False,
    )
```

```python
# backend/agents/trend_agent.py

from crewai import Agent
from agents.base import GEMINI_FLASH
from tools.search_tools import GoogleTrendsTool, RedditTool, SerpAPITool
from tools.storage_tools import SupabaseTrendStoreTool

def create_trend_agent() -> Agent:
    return Agent(
        role="Consumer Trend Intelligence Scout",
        goal=(
            "Identify emerging consumer trends relevant to the product category from Google Trends, "
            "Reddit, and social media 2–6 weeks before they peak. Score each trend by velocity and "
            "predict peak timing. Flag micro-trends that competitors have not acted on."
        ),
        backstory=(
            "You are a cultural anthropologist and data scientist hybrid. You spot behavioural shifts "
            "in consumer language before they show up in sales data. You understand the Indian D2C "
            "consumer and Tier 1, Tier 2 market nuances."
        ),
        tools=[GoogleTrendsTool(), RedditTool(), SerpAPITool(), SupabaseTrendStoreTool()],
        llm=GEMINI_FLASH,
        verbose=True,
        allow_delegation=False,
    )
```

```python
# backend/agents/insight_agent.py

from crewai import Agent
from agents.base import GEMINI_PRO
from tools.storage_tools import SupabaseDataFetchTool
from rag.retriever import RAGRetrieverTool

def create_insight_agent() -> Agent:
    return Agent(
        role="Senior Product Intelligence Strategist",
        goal=(
            "Synthesise scraped product data, review clusters, competitor intelligence, and trend "
            "data into 8–12 high-confidence executive insights. Each insight must have a title, "
            "detailed body, confidence score 0–1, and cited data sources. Identify the top 3 "
            "market opportunity gaps with quantified rationale."
        ),
        backstory=(
            "You are a senior McKinsey-level product strategist with 15 years in FMCG and D2C. "
            "You synthesise complex, contradictory data into clear, actionable intelligence. "
            "You never hallucinate — every claim is grounded in the data you have been given."
        ),
        tools=[SupabaseDataFetchTool(), RAGRetrieverTool()],
        llm=GEMINI_PRO,  # Needs 1M context to process full dataset
        verbose=True,
        allow_delegation=False,
    )
```

```python
# backend/agents/innovator_agent.py

from crewai import Agent
from agents.base import GEMINI_PRO
from tools.storage_tools import SupabaseDataFetchTool, SupabaseConceptStoreTool

def create_innovator_agent() -> Agent:
    return Agent(
        role="Product Innovation Architect",
        goal=(
            "Generate exactly 3 validated new product concepts based on the identified market gaps, "
            "unmet consumer needs, and trend data. For each concept produce: name options, tagline, "
            "target persona with demographics and psychographics, USP, key features, suggested price "
            "with rationale, the gap it fills, market size estimate, risks, and a validation score."
        ),
        backstory=(
            "You are a product innovator who has launched 40+ consumer products across India. "
            "You balance creative ideation with commercial rigour. You think in terms of consumer "
            "jobs-to-be-done and know what sells in Indian Tier 1 and Tier 2 markets."
        ),
        tools=[SupabaseDataFetchTool(), SupabaseConceptStoreTool()],
        llm=GEMINI_PRO,
        verbose=True,
        allow_delegation=False,
    )
```

```python
# backend/agents/gtm_agent.py

from crewai import Agent
from agents.base import GEMINI_FLASH
from tools.search_tools import SerpAPITool
from tools.storage_tools import SupabaseGTMStoreTool

def create_gtm_agent() -> Agent:
    return Agent(
        role="Go-To-Market Strategy Director",
        goal=(
            "Create a complete, India-specific go-to-market plan for the top product concept. "
            "Include: launch channels ranked by ROI, messaging framework (hero message + supporting "
            "proof points), pricing strategy with tiers, influencer shortlist by category and "
            "follower tier, a 90-day launch timeline with milestones, and an indicative budget breakdown."
        ),
        backstory=(
            "You are a D2C growth marketer who has scaled brands from 0 to ₹10 Cr ARR. You know "
            "exactly which platforms work for which categories in India. You think in CAC, LTV, "
            "and payback periods. You write messaging that converts, not messaging that sounds good."
        ),
        tools=[SerpAPITool(), SupabaseGTMStoreTool()],
        llm=GEMINI_FLASH,
        verbose=True,
        allow_delegation=False,
    )
```

```python
# backend/agents/report_agent.py

from crewai import Agent
from agents.base import GEMINI_PRO
from tools.report_tools import PDFGeneratorTool, PPTXGeneratorTool, SupabaseUploadTool
from tools.storage_tools import SupabaseDataFetchTool

def create_report_agent() -> Agent:
    return Agent(
        role="Executive Report Architect",
        goal=(
            "Assemble a branded executive report in both PDF and PowerPoint formats from all agent "
            "outputs. The report must include: executive summary, market overview with key stats, "
            "consumer insights with verbatim review evidence, competitor landscape, trend analysis, "
            "3 product concepts, and GTM plan. Both files upload to Supabase Storage and return "
            "signed download URLs."
        ),
        backstory=(
            "You are a management consulting report designer who has produced deliverables for "
            "Fortune 500 clients. You know what a ₹5 lakh consulting deck looks like and you "
            "produce that quality in minutes. Every data point has a source. Every recommendation "
            "has evidence. The report tells a compelling story from problem to solution."
        ),
        tools=[SupabaseDataFetchTool(), PDFGeneratorTool(), PPTXGeneratorTool(), SupabaseUploadTool()],
        llm=GEMINI_PRO,
        verbose=True,
        allow_delegation=False,
    )
```

```python
# backend/agents/sentiment_agent.py

from crewai import Agent
from agents.base import GEMINI_FLASH_15
from tools.search_tools import SerpAPITool, RedditTool
from tools.nlp_tools import SentimentAnalysisTool
from tools.storage_tools import SupabaseSentimentStoreTool, SlackAlertTool

def create_sentiment_agent() -> Agent:
    return Agent(
        role="Brand Health & Sentiment Monitor",
        goal=(
            "Run daily brand health checks for tracked brands. Scrape latest mentions from "
            "Google, Reddit, and social platforms. Calculate an aggregate sentiment score. "
            "Store to Supabase (which triggers Realtime updates to the dashboard). If the "
            "score drops more than 15 points vs the 7-day average, send a Slack alert."
        ),
        backstory=(
            "You are a brand reputation manager who never sleeps. You track brand perception "
            "across digital channels and alert teams before small fires become crises. "
            "You are precise, systematic, and fast."
        ),
        tools=[SerpAPITool(), RedditTool(), SentimentAnalysisTool(), SupabaseSentimentStoreTool(), SlackAlertTool()],
        llm=GEMINI_FLASH_15,
        verbose=False,
        allow_delegation=False,
    )
```

```python
# backend/agents/price_agent.py

from crewai import Agent
from agents.base import GEMINI_FLASH_15
from tools.scraping_tools import AmazonScraperTool, FlipkartScraperTool
from tools.nlp_tools import ElasticityModelTool
from tools.storage_tools import SupabasePriceStoreTool

def create_price_agent() -> Agent:
    return Agent(
        role="Dynamic Pricing Intelligence Analyst",
        goal=(
            "Track competitor prices daily across platforms. Model price elasticity using historical "
            "price-vs-review-count correlation. Recommend optimal price points for tracked products. "
            "Flag when competitors run promotions or change pricing strategy."
        ),
        backstory=(
            "You are a pricing economist who has worked for Amazon and Flipkart. You understand "
            "Indian consumer price sensitivity by category, platform, and tier. You think in "
            "price ladders, anchoring, and willingness-to-pay curves."
        ),
        tools=[AmazonScraperTool(), FlipkartScraperTool(), ElasticityModelTool(), SupabasePriceStoreTool()],
        llm=GEMINI_FLASH_15,
        verbose=False,
        allow_delegation=False,
    )
```

```python
# backend/agents/supply_agent.py

from crewai import Agent
from agents.base import GEMINI_FLASH_15
from tools.search_tools import IndiaMArtTool, SerpAPITool
from tools.report_tools import RFQGeneratorTool
from tools.storage_tools import SupabaseSupplierStoreTool

def create_supply_agent() -> Agent:
    return Agent(
        role="Supply Chain & Manufacturer Scout",
        goal=(
            "Find the top 5–10 verified manufacturers, ingredient suppliers, and contract labs "
            "for the given product concept. Filter by certifications (FSSAI, ISO, GMP), minimum "
            "order quantities, location (prefer India), and credibility signals. Generate a "
            "ready-to-send RFQ PDF template for each shortlisted supplier."
        ),
        backstory=(
            "You are a sourcing expert who has built supply chains for 30+ FMCG brands across "
            "India. You know IndiaMart inside out. You can tell a reliable supplier from a broker "
            "in 30 seconds. You save brands months of supplier vetting."
        ),
        tools=[IndiaMArtTool(), SerpAPITool(), RFQGeneratorTool(), SupabaseSupplierStoreTool()],
        llm=GEMINI_FLASH_15,
        verbose=False,
        allow_delegation=False,
    )
```

```python
# backend/agents/compliance_agent.py

from crewai import Agent
from agents.base import GEMINI_FLASH_15
from rag.retriever import RAGRetrieverTool
from tools.storage_tools import SupabaseComplianceStoreTool

def create_compliance_agent() -> Agent:
    return Agent(
        role="Regulatory Compliance Guardian",
        goal=(
            "Check every product concept against FSSAI, FDA, AYUSH, and BIS regulations using "
            "the RAG knowledge base built from official regulatory documents. Produce a checklist "
            "of compliance items with pass/fail/needs-review status. Flag all risk areas and "
            "provide concrete remediation recommendations."
        ),
        backstory=(
            "You are a regulatory affairs expert with 10 years of experience getting products "
            "approved in India and internationally. You have read every FSSAI circular. You know "
            "exactly what gets a product rejected and what gets it fast-tracked. You are "
            "thorough, conservative, and precise."
        ),
        tools=[RAGRetrieverTool(), SupabaseComplianceStoreTool()],
        llm=GEMINI_FLASH_15,
        verbose=False,
        allow_delegation=False,
    )
```

---

## 7. CrewAI Task Definitions (All 12)

```python
# backend/tasks/scraper_task.py

from crewai import Task

def create_scraper_task(agent, product_category: str, brand_name: str, run_id: str) -> Task:
    return Task(
        description=f"""
Scrape product data for the category: **{product_category}**
Brand focus: **{brand_name}** and its top 10 competitors.

Steps:
1. Search Amazon India for "{product_category}" — scrape top 50 results (name, price, MRP, rating, review count, specs, images, URL).
2. Search Flipkart for the same category — scrape top 50 results.
3. If brand has a D2C website, scrape product catalogue pages.
4. For each product found, also extract the seller information.
5. Store all records to Supabase `products` table with run_id = {run_id}.
6. Return a JSON summary: total_products_scraped, platforms_covered, price_range, avg_rating.
        """,
        expected_output="JSON summary with total products scraped per platform, price range, and confirmation of Supabase storage.",
        agent=agent,
        async_execution=False,
    )
```

```python
# backend/tasks/review_task.py

from crewai import Task

def create_review_task(agent, product_category: str, run_id: str) -> Task:
    return Task(
        description=f"""
Mine and analyse all customer reviews for products in: **{product_category}**
Run ID: {run_id}

Steps:
1. Fetch all product IDs for this run_id from Supabase.
2. For each product, scrape all available reviews (paginate through all pages).
3. Clean review text (remove HTML, normalise encoding).
4. Run VADER sentiment analysis on each review — store score and label.
5. Run spaCy NER to extract product feature mentions.
6. Run BERTopic clustering on the full review corpus — generate 8–15 topic clusters.
7. For each cluster: label it (pain_point / feature_request / praise / neutral), get representative words, calculate average sentiment, store 3 sample reviews.
8. Store all enriched reviews to `reviews` table and all clusters to `review_clusters` table.
9. Return summary: total_reviews, total_clusters, top_3_pain_points, top_3_praised_features.
        """,
        expected_output="JSON summary with review stats, cluster count, and top pain points and features.",
        agent=agent,
        async_execution=False,
    )
```

```python
# backend/tasks/competitor_task.py

from crewai import Task

def create_competitor_task(agent, product_category: str, brand_name: str, run_id: str) -> Task:
    return Task(
        description=f"""
Build a competitor intelligence map for: **{product_category}** | Focus brand: **{brand_name}**
Run ID: {run_id}

Steps:
1. Search Google for "top {product_category} brands India 2024 2025" and identify top 10–15 competitors.
2. For each competitor:
   a. Find their top-selling product (Amazon/Flipkart/D2C).
   b. Extract pricing, rating, review count.
   c. Analyse their homepage and product page for positioning statement and messaging.
   d. Find their current Google ad copy using SerpAPI.
   e. List their key strengths and weaknesses based on review summaries and pricing.
3. Identify product/feature/price gaps that no competitor has filled.
4. Store all competitors to `competitors` table.
5. Return a JSON summary: competitors_found, avg_market_price, biggest_gap, price_leader, quality_leader.
        """,
        expected_output="JSON with competitor count, price landscape, and identified market gaps.",
        agent=agent,
        async_execution=False,
    )
```

```python
# backend/tasks/trend_task.py

from crewai import Task

def create_trend_task(agent, product_category: str, run_id: str) -> Task:
    return Task(
        description=f"""
Identify emerging consumer trends for: **{product_category}**
Run ID: {run_id}

Steps:
1. Use pytrends to get Google Trends data for the category and 10 related keywords — last 12 months, India.
2. Calculate velocity (rising/stable/declining) by comparing last 30 days vs previous 30 days.
3. Find trending subreddits and top posts mentioning the category on Reddit.
4. Use SerpAPI to search news articles from last 60 days for category trends.
5. For each trend with velocity = "rising", predict the approximate peak month based on trend trajectory.
6. Identify trends that competitors have NOT yet addressed in their products or marketing.
7. Store all trends to `trends` table.
8. Return: top_5_rising_trends, untapped_trend_opportunities, predicted_peaks.
        """,
        expected_output="JSON with rising trends, velocity scores, and untapped trend opportunities.",
        agent=agent,
        async_execution=False,
    )
```

```python
# backend/tasks/insight_task.py

from crewai import Task

def create_insight_task(agent, product_category: str, run_id: str) -> Task:
    return Task(
        description=f"""
Synthesise all collected intelligence into executive product insights for: **{product_category}**
Run ID: {run_id}

Steps:
1. Fetch from Supabase for run_id: all review clusters, competitor data, trend data, product listings.
2. Use RAG to retrieve the most relevant records (semantic search over embeddings).
3. Generate 10–12 insights. Each insight must have:
   - title (max 10 words)
   - body (200–400 words, actionable, evidence-backed)
   - insight_type (market_gap | consumer_need | competitive_advantage | trend_opportunity | risk)
   - confidence_score (0.0–1.0)
   - sources (list of specific data points that support it)
4. Identify top 3 market opportunity gaps with: gap description, evidence from reviews, size estimate, and why no competitor has filled it.
5. Store all insights to `insights` table.
6. Return: insight_count, top_3_opportunity_gaps, overall_market_health_score.
        """,
        expected_output="JSON with all insights, opportunity gaps, and market health summary.",
        agent=agent,
        async_execution=False,
    )
```

```python
# backend/tasks/innovator_task.py

from crewai import Task

def create_innovator_task(agent, product_category: str, run_id: str) -> Task:
    return Task(
        description=f"""
Generate 3 validated product concepts for: **{product_category}**
Run ID: {run_id}

Steps:
1. Fetch the top 3 opportunity gaps from insights table for this run_id.
2. Fetch top review clusters (pain_point type) for unmet needs.
3. Fetch rising trends that are currently untapped by competitors.
4. For each of the 3 concepts, generate:
   - concept_name: 3–5 word working product name
   - tagline: 1 compelling sentence
   - target_persona: detailed persona (age, income, location, lifestyle, buying behaviour, digital habits)
   - usp: one clear unique selling proposition sentence
   - key_features: list of 5–7 specific product features (not generic — tied to the pain points found)
   - suggested_price_inr: specific number with pricing rationale
   - gap_it_fills: which identified gap this addresses and how
   - market_size_estimate: TAM/SAM estimate with reasoning
   - risks: top 3 product/market risks
   - name_ideas: 5 creative name options with reasoning
   - validation_score: 0–100 based on evidence strength
5. Store all 3 concepts to `product_concepts` table.
6. Return: all 3 concept summaries with validation scores.
        """,
        expected_output="JSON with 3 complete product concepts including all fields specified.",
        agent=agent,
        async_execution=False,
    )
```

```python
# backend/tasks/gtm_task.py

from crewai import Task

def create_gtm_task(agent, product_category: str, run_id: str) -> Task:
    return Task(
        description=f"""
Create a complete India-specific go-to-market plan for the top product concept in: **{product_category}**
Run ID: {run_id}

Steps:
1. Fetch the product concept with the highest validation_score for this run_id.
2. Fetch the target persona and USP from that concept.
3. Generate GTM plan with:
   a. launch_channels: ranked list of 5–8 channels (D2C website, Amazon, Flipkart, Instagram, YouTube, offline, quick commerce) with rationale for each rank
   b. messaging_framework: hero message, 3 proof points, 3 objection handlers, call to action
   c. pricing_strategy: launch price, regular price, bundle options, promotional calendar
   d. influencer_targets: 5–10 specific influencer archetypes by tier (nano/micro/macro) with category rationale
   e. launch_timeline: 90-day week-by-week milestone plan (pre-launch, launch week, post-launch)
   f. budget_estimate: percentage breakdown by channel for ₹5L and ₹20L budget scenarios
4. Store GTM plan to `gtm_plans` table.
5. Return: top_channel, hero_message, launch_week_target, primary_budget_split.
        """,
        expected_output="JSON with complete GTM plan including all sections specified above.",
        agent=agent,
        async_execution=False,
    )
```

```python
# backend/tasks/report_task.py

from crewai import Task

def create_report_task(agent, run_id: str, user_id: str, is_watermarked: bool = False) -> Task:
    return Task(
        description=f"""
Build a comprehensive executive report for run_id: {run_id}
User ID: {user_id} | Watermarked: {is_watermarked}

Steps:
1. Fetch ALL agent outputs for this run_id from Supabase: products, review_clusters, competitors, trends, insights, product_concepts, gtm_plans.
2. Generate a PDF report using WeasyPrint with the Jinja2 template. Sections:
   - Cover page (brand, category, date, "Powered by ProductIQ")
   - Executive Summary (1 page, top 5 insights)
   - Market Overview (product landscape, price distribution chart, avg ratings)
   - Consumer Intelligence (top clusters, pain points, feature requests, sentiment breakdown)
   - Competitive Landscape (competitor table, gap analysis)
   - Trend Analysis (rising trends, untapped opportunities)
   - Product Concepts (all 3 concepts with full detail)
   - Go-To-Market Strategy (full GTM plan)
   - Appendix (methodology, data sources, agent pipeline description)
3. Generate a PowerPoint file using python-pptx with 20–25 slides covering the same sections.
4. If is_watermarked = True, add "ProductIQ Free Report — productiq.in" watermark to every PDF page.
5. Upload both files to Supabase Storage bucket `reports/{{user_id}}/{{run_id}}/`.
6. Create a signed URL for each file (valid 7 days).
7. Store report record to `reports` table.
8. Return: pdf_url, pptx_url, page_count, file_sizes.
        """,
        expected_output="JSON with signed PDF and PPTX download URLs and report metadata.",
        agent=agent,
        async_execution=False,
    )
```

---

## 8. CrewAI Crew Orchestration

```python
# backend/crews/main_crew.py

from crewai import Crew, Process
from agents.scraper_agent import create_scraper_agent
from agents.review_miner_agent import create_review_miner_agent
from agents.competitor_agent import create_competitor_agent
from agents.trend_agent import create_trend_agent
from agents.insight_agent import create_insight_agent
from agents.innovator_agent import create_innovator_agent
from agents.gtm_agent import create_gtm_agent
from agents.report_agent import create_report_agent
from tasks.scraper_task import create_scraper_task
from tasks.review_task import create_review_task
from tasks.competitor_task import create_competitor_task
from tasks.trend_task import create_trend_task
from tasks.insight_task import create_insight_task
from tasks.innovator_task import create_innovator_task
from tasks.gtm_task import create_gtm_task
from tasks.report_task import create_report_task


def build_main_crew(
    product_category: str,
    brand_name: str,
    run_id: str,
    user_id: str,
    is_watermarked: bool = False,
) -> Crew:
    # Instantiate all agents
    scraper = create_scraper_agent()
    review_miner = create_review_miner_agent()
    competitor = create_competitor_agent()
    trend_spotter = create_trend_agent()
    insight_synth = create_insight_agent()
    innovator = create_innovator_agent()
    gtm = create_gtm_agent()
    reporter = create_report_agent()

    # Instantiate all tasks in sequence
    t_scrape = create_scraper_task(scraper, product_category, brand_name, run_id)
    t_review = create_review_task(review_miner, product_category, run_id)
    t_competitor = create_competitor_task(competitor, product_category, brand_name, run_id)
    t_trend = create_trend_task(trend_spotter, product_category, run_id)
    t_insight = create_insight_task(insight_synth, product_category, run_id)
    t_innovate = create_innovator_task(innovator, product_category, run_id)
    t_gtm = create_gtm_task(gtm, product_category, run_id)
    t_report = create_report_task(reporter, run_id, user_id, is_watermarked)

    # Set task context dependencies (each task can reference outputs of previous tasks)
    t_review.context = [t_scrape]
    t_competitor.context = [t_scrape]
    t_trend.context = [t_scrape]
    t_insight.context = [t_scrape, t_review, t_competitor, t_trend]
    t_innovate.context = [t_insight, t_review, t_trend]
    t_gtm.context = [t_innovate, t_insight, t_competitor]
    t_report.context = [t_scrape, t_review, t_competitor, t_trend, t_insight, t_innovate, t_gtm]

    return Crew(
        agents=[scraper, review_miner, competitor, trend_spotter, insight_synth, innovator, gtm, reporter],
        tasks=[t_scrape, t_review, t_competitor, t_trend, t_insight, t_innovate, t_gtm, t_report],
        process=Process.sequential,  # Agents run in order; each waits for previous to complete
        verbose=True,
        memory=False,  # Stateless — all state lives in Supabase
        max_rpm=30,    # Gemini API rate limit safety
    )


def run_main_crew(
    product_category: str,
    brand_name: str,
    run_id: str,
    user_id: str,
    is_watermarked: bool,
    progress_callback=None,
) -> dict:
    """
    Execute the full 8-agent pipeline.
    progress_callback(agent_name: str, agent_number: int, status: str) is called
    before and after each task so SSE can stream updates to the frontend.
    """
    from database import get_supabase
    from datetime import datetime

    db = get_supabase()

    agent_sequence = [
        ("Web Scraper", 1),
        ("Review Miner", 2),
        ("Competitor Intel", 3),
        ("Trend Spotter", 4),
        ("Insight Synthesizer", 5),
        ("Product Innovator", 6),
        ("GTM Strategist", 7),
        ("Report Builder", 8),
    ]

    # Update run status to running
    db.table("agent_runs").update({
        "status": "running",
        "started_at": datetime.utcnow().isoformat(),
    }).eq("id", run_id).execute()

    # Create pending output rows for all 8 agents
    for name, num in agent_sequence:
        db.table("agent_outputs").insert({
            "run_id": run_id,
            "agent_name": name,
            "agent_number": num,
            "status": "pending",
        }).execute()

    crew = build_main_crew(product_category, brand_name, run_id, user_id, is_watermarked)

    # Monkey-patch task callbacks for progress streaming
    for i, task in enumerate(crew.tasks):
        agent_name, agent_num = agent_sequence[i]
        original_execute = task.execute

        def make_wrapper(original, a_name, a_num):
            def wrapper(*args, **kwargs):
                # Mark as running
                db.table("agent_outputs").update({
                    "status": "running",
                    "started_at": datetime.utcnow().isoformat(),
                }).eq("run_id", run_id).eq("agent_name", a_name).execute()

                db.table("agent_runs").update({
                    "current_agent": a_name,
                    "progress_pct": int((a_num / 8) * 100),
                }).eq("id", run_id).execute()

                if progress_callback:
                    progress_callback(a_name, a_num, "running")

                result = original(*args, **kwargs)

                # Mark as completed
                db.table("agent_outputs").update({
                    "status": "completed",
                    "completed_at": datetime.utcnow().isoformat(),
                }).eq("run_id", run_id).eq("agent_name", a_name).execute()

                if progress_callback:
                    progress_callback(a_name, a_num, "completed")

                return result
            return wrapper

        task.execute = make_wrapper(original_execute, agent_name, agent_num)

    try:
        result = crew.kickoff()
        db.table("agent_runs").update({
            "status": "completed",
            "progress_pct": 100,
            "completed_at": datetime.utcnow().isoformat(),
        }).eq("id", run_id).execute()
        return {"status": "completed", "result": str(result)}

    except Exception as e:
        db.table("agent_runs").update({
            "status": "failed",
            "error_message": str(e),
        }).eq("id", run_id).execute()
        raise
```

---

## 9. Custom Tools for Agents

```python
# backend/tools/scraping_tools.py

import httpx
import json
from crewai_tools import BaseTool
from bs4 import BeautifulSoup
from fake_useragent import UserAgent
from playwright.sync_api import sync_playwright


class AmazonScraperTool(BaseTool):
    name: str = "Amazon India Product Scraper"
    description: str = "Scrapes product listings from Amazon India for a given search query. Returns structured product data."

    def _run(self, query: str, max_results: int = 50) -> str:
        ua = UserAgent()
        headers = {
            "User-Agent": ua.random,
            "Accept-Language": "en-IN,en;q=0.9",
        }
        products = []
        page = 1

        while len(products) < max_results:
            url = f"https://www.amazon.in/s?k={query.replace(' ', '+')}&page={page}"
            try:
                resp = httpx.get(url, headers=headers, timeout=15, follow_redirects=True)
                soup = BeautifulSoup(resp.text, "html.parser")
                items = soup.select('[data-component-type="s-search-result"]')

                if not items:
                    break

                for item in items:
                    try:
                        name_el = item.select_one("h2 a span")
                        price_el = item.select_one(".a-price .a-offscreen")
                        rating_el = item.select_one(".a-icon-alt")
                        review_el = item.select_one('[aria-label*="ratings"]')
                        url_el = item.select_one("h2 a")
                        img_el = item.select_one("img.s-image")

                        product = {
                            "platform": "amazon_india",
                            "product_name": name_el.text.strip() if name_el else None,
                            "price_inr": float(price_el.text.replace("₹", "").replace(",", "").strip()) if price_el else None,
                            "rating": float(rating_el.text.split(" ")[0]) if rating_el else None,
                            "url": "https://www.amazon.in" + url_el["href"] if url_el else None,
                            "images": [img_el["src"]] if img_el else [],
                        }
                        if product["product_name"]:
                            products.append(product)
                    except Exception:
                        continue

                page += 1
                if page > 5:
                    break

            except Exception as e:
                return json.dumps({"error": str(e), "products_scraped": len(products)})

        return json.dumps({"products": products[:max_results], "total": len(products[:max_results])})


class FlipkartScraperTool(BaseTool):
    name: str = "Flipkart Product Scraper"
    description: str = "Scrapes product listings from Flipkart for a given search query."

    def _run(self, query: str, max_results: int = 50) -> str:
        ua = UserAgent()
        headers = {"User-Agent": ua.random}
        products = []

        url = f"https://www.flipkart.com/search?q={query.replace(' ', '%20')}"
        try:
            resp = httpx.get(url, headers=headers, timeout=15, follow_redirects=True)
            soup = BeautifulSoup(resp.text, "html.parser")
            items = soup.select("div[data-id]")

            for item in items[:max_results]:
                try:
                    name_el = item.select_one("div._4rR01T, a.s1Q9rs, a.IRpwTa")
                    price_el = item.select_one("div._30jeq3")
                    rating_el = item.select_one("div._3LWZlK")
                    url_el = item.select_one("a._1fQZEK, a.s1Q9rs")

                    product = {
                        "platform": "flipkart",
                        "product_name": name_el.text.strip() if name_el else None,
                        "price_inr": float(price_el.text.replace("₹", "").replace(",", "").strip()) if price_el else None,
                        "rating": float(rating_el.text) if rating_el else None,
                        "url": "https://www.flipkart.com" + url_el["href"] if url_el and url_el.get("href") else None,
                    }
                    if product["product_name"]:
                        products.append(product)
                except Exception:
                    continue

        except Exception as e:
            return json.dumps({"error": str(e)})

        return json.dumps({"products": products, "total": len(products)})


class ReviewScraperTool(BaseTool):
    name: str = "Amazon Review Scraper"
    description: str = "Scrapes all customer reviews for a given Amazon product URL."

    def _run(self, product_url: str, max_pages: int = 10) -> str:
        ua = UserAgent()
        headers = {"User-Agent": ua.random, "Accept-Language": "en-IN"}
        all_reviews = []

        # Convert product URL to reviews URL
        if "/dp/" in product_url:
            asin = product_url.split("/dp/")[1].split("/")[0]
            base_url = f"https://www.amazon.in/product-reviews/{asin}"
        else:
            return json.dumps({"error": "Cannot extract ASIN from URL"})

        for page in range(1, max_pages + 1):
            url = f"{base_url}?pageNumber={page}"
            try:
                resp = httpx.get(url, headers=headers, timeout=15, follow_redirects=True)
                soup = BeautifulSoup(resp.text, "html.parser")
                reviews = soup.select("[data-hook='review']")

                if not reviews:
                    break

                for rev in reviews:
                    try:
                        rating_el = rev.select_one("[data-hook='review-star-rating'] span")
                        title_el = rev.select_one("[data-hook='review-title'] span:last-child")
                        body_el = rev.select_one("[data-hook='review-body'] span")
                        date_el = rev.select_one("[data-hook='review-date']")
                        verified_el = rev.select_one("[data-hook='avp-badge']")

                        all_reviews.append({
                            "rating": int(rating_el.text.strip()[0]) if rating_el else None,
                            "title": title_el.text.strip() if title_el else "",
                            "body": body_el.text.strip() if body_el else "",
                            "reviewed_at": date_el.text.replace("Reviewed in India on ", "").strip() if date_el else None,
                            "verified_purchase": bool(verified_el),
                        })
                    except Exception:
                        continue

            except Exception:
                break

        return json.dumps({"reviews": all_reviews, "total": len(all_reviews)})


class PlaywrightBrowserTool(BaseTool):
    name: str = "JavaScript Browser Tool"
    description: str = "Renders JavaScript-heavy pages and returns the fully rendered HTML. Use for D2C sites and pages that require JS."

    def _run(self, url: str) -> str:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()
            page.set_extra_http_headers({"Accept-Language": "en-IN"})
            try:
                page.goto(url, wait_until="networkidle", timeout=20000)
                content = page.content()
                browser.close()
                soup = BeautifulSoup(content, "html.parser")
                for tag in soup(["script", "style"]):
                    tag.decompose()
                return soup.get_text(separator="\n", strip=True)[:8000]
            except Exception as e:
                browser.close()
                return f"Error rendering page: {str(e)}"
```

```python
# backend/tools/search_tools.py

import json
from crewai_tools import BaseTool
from serpapi import GoogleSearch
from pytrends.request import TrendReq
import praw
from config import settings


class SerpAPITool(BaseTool):
    name: str = "Google Search via SerpAPI"
    description: str = "Search Google for any query and return top organic results with title, link, and snippet."

    def _run(self, query: str, num_results: int = 10) -> str:
        search = GoogleSearch({
            "q": query,
            "location": "India",
            "hl": "en",
            "gl": "in",
            "api_key": settings.SERPAPI_KEY,
            "num": num_results,
        })
        results = search.get_dict()
        organic = results.get("organic_results", [])
        output = [{"title": r.get("title"), "link": r.get("link"), "snippet": r.get("snippet")} for r in organic]
        return json.dumps(output)


class GoogleTrendsTool(BaseTool):
    name: str = "Google Trends Analyser"
    description: str = "Gets Google Trends data for a keyword or list of keywords in India. Returns interest over time and related queries."

    def _run(self, keywords: str, timeframe: str = "today 12-m") -> str:
        kw_list = [k.strip() for k in keywords.split(",")][:5]
        try:
            pytrends = TrendReq(hl="en-IN", tz=330, geo="IN")
            pytrends.build_payload(kw_list, cat=0, timeframe=timeframe, geo="IN")

            iot = pytrends.interest_over_time()
            rising = pytrends.related_queries()

            result = {
                "keywords": kw_list,
                "avg_interest": {},
                "last_30d_interest": {},
                "related_rising": {},
            }

            if not iot.empty:
                for kw in kw_list:
                    if kw in iot.columns:
                        result["avg_interest"][kw] = round(float(iot[kw].mean()), 1)
                        result["last_30d_interest"][kw] = round(float(iot[kw].tail(4).mean()), 1)

            for kw in kw_list:
                if kw in rising and rising[kw]["rising"] is not None:
                    result["related_rising"][kw] = rising[kw]["rising"]["query"].head(5).tolist()

            return json.dumps(result)
        except Exception as e:
            return json.dumps({"error": str(e)})


class RedditTool(BaseTool):
    name: str = "Reddit Consumer Intelligence"
    description: str = "Searches Reddit for consumer discussions about a product category. Returns top posts with text."

    def _run(self, query: str, subreddits: str = "india,indiasocial,IndianFood,FitIndia", limit: int = 20) -> str:
        reddit = praw.Reddit(
            client_id="REDDIT_CLIENT_ID",       # Add to .env
            client_secret="REDDIT_CLIENT_SECRET",
            user_agent="ProductIQ/1.0",
        )
        posts = []
        for sub_name in subreddits.split(","):
            try:
                subreddit = reddit.subreddit(sub_name.strip())
                for post in subreddit.search(query, sort="relevance", limit=limit // 4):
                    posts.append({
                        "title": post.title,
                        "body": post.selftext[:500],
                        "score": post.score,
                        "url": post.url,
                        "subreddit": sub_name,
                    })
            except Exception:
                continue

        posts.sort(key=lambda x: x["score"], reverse=True)
        return json.dumps({"posts": posts[:limit], "total": len(posts)})


class IndiaMArtTool(BaseTool):
    name: str = "IndiaMart Supplier Search"
    description: str = "Searches IndiaMart for suppliers and manufacturers of a given product or ingredient."

    def _run(self, query: str) -> str:
        import httpx
        from bs4 import BeautifulSoup
        from fake_useragent import UserAgent

        ua = UserAgent()
        url = f"https://dir.indiamart.com/search.mp?ss={query.replace(' ', '+')}"
        headers = {"User-Agent": ua.random}

        try:
            resp = httpx.get(url, headers=headers, timeout=15, follow_redirects=True)
            soup = BeautifulSoup(resp.text, "html.parser")
            suppliers = []

            cards = soup.select(".card.bx")[:10]
            for card in cards:
                name_el = card.select_one(".lcname")
                company_el = card.select_one(".companyname")
                loc_el = card.select_one(".imt-text-14.text-color")
                link_el = card.select_one("a[href]")

                suppliers.append({
                    "company_name": company_el.text.strip() if company_el else None,
                    "product_name": name_el.text.strip() if name_el else None,
                    "location": loc_el.text.strip() if loc_el else None,
                    "platform": "indiamart",
                    "profile_url": link_el["href"] if link_el else None,
                })

            return json.dumps({"suppliers": suppliers, "total": len(suppliers)})
        except Exception as e:
            return json.dumps({"error": str(e)})
```

```python
# backend/tools/nlp_tools.py

import json
from crewai_tools import BaseTool
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
import spacy
from bertopic import BERTopic
import numpy as np


class SentimentAnalysisTool(BaseTool):
    name: str = "Sentiment Analyser"
    description: str = "Analyses sentiment of a list of text reviews. Returns sentiment score (-1 to 1) and label for each."

    def _run(self, reviews_json: str) -> str:
        analyzer = SentimentIntensityAnalyzer()
        reviews = json.loads(reviews_json)

        results = []
        for rev in reviews:
            text = rev.get("body", "")
            scores = analyzer.polarity_scores(text)
            compound = scores["compound"]
            label = "positive" if compound >= 0.05 else ("negative" if compound <= -0.05 else "neutral")
            results.append({**rev, "sentiment_score": round(compound, 3), "sentiment_label": label})

        pos = sum(1 for r in results if r["sentiment_label"] == "positive")
        neg = sum(1 for r in results if r["sentiment_label"] == "negative")
        neu = len(results) - pos - neg

        return json.dumps({
            "enriched_reviews": results,
            "summary": {
                "total": len(results),
                "positive": pos,
                "negative": neg,
                "neutral": neu,
                "avg_score": round(np.mean([r["sentiment_score"] for r in results]), 3),
            }
        })


class BERTopicClusterTool(BaseTool):
    name: str = "Review Topic Clusterer"
    description: str = "Clusters review texts into topics using BERTopic. Returns topic labels, representative words, and review assignments."

    def _run(self, reviews_json: str, n_topics: int = 12) -> str:
        reviews = json.loads(reviews_json)
        docs = [r.get("body", "") for r in reviews if len(r.get("body", "")) > 20]

        if len(docs) < 10:
            return json.dumps({"error": "Not enough reviews for clustering (need at least 10)"})

        try:
            topic_model = BERTopic(
                nr_topics=n_topics,
                min_topic_size=5,
                verbose=False,
            )
            topics, probs = topic_model.fit_transform(docs)

            topic_info = topic_model.get_topic_info()
            clusters = []

            for _, row in topic_info.iterrows():
                if row["Topic"] == -1:
                    continue
                topic_id = row["Topic"]
                words = [word for word, _ in topic_model.get_topic(topic_id)][:8]
                topic_docs = [docs[i] for i, t in enumerate(topics) if t == topic_id]

                clusters.append({
                    "topic_id": topic_id,
                    "topic_label": " / ".join(words[:3]),
                    "representative_words": words,
                    "review_count": len(topic_docs),
                    "sample_reviews": topic_docs[:3],
                })

            return json.dumps({"clusters": clusters, "total_clusters": len(clusters)})

        except Exception as e:
            return json.dumps({"error": str(e)})


class SpacyNERTool(BaseTool):
    name: str = "Product Feature Extractor"
    description: str = "Extracts product features, ingredients, and attributes mentioned in review text using spaCy NER."

    def _run(self, text: str) -> str:
        nlp = spacy.load("en_core_web_sm")
        doc = nlp(text[:5000])

        entities = [{"text": ent.text, "label": ent.label_} for ent in doc.ents]
        noun_chunks = list(set([chunk.text.lower() for chunk in doc.noun_chunks if len(chunk.text) > 3]))

        return json.dumps({"entities": entities, "noun_chunks": noun_chunks[:30]})


class ElasticityModelTool(BaseTool):
    name: str = "Price Elasticity Modeller"
    description: str = "Models price elasticity from historical price and review count data. Returns optimal price recommendation."

    def _run(self, price_data_json: str) -> str:
        from scipy import stats

        data = json.loads(price_data_json)
        prices = [d["price_inr"] for d in data if d.get("price_inr") and d.get("review_count")]
        demand = [d["review_count"] for d in data if d.get("price_inr") and d.get("review_count")]

        if len(prices) < 3:
            return json.dumps({"error": "Insufficient price-demand data points"})

        slope, intercept, r_value, p_value, std_err = stats.linregress(prices, demand)

        optimal_price = -intercept / (2 * slope) if slope != 0 else None

        return json.dumps({
            "slope": round(slope, 4),
            "r_squared": round(r_value ** 2, 3),
            "optimal_price_inr": round(optimal_price, 0) if optimal_price else None,
            "interpretation": "negative slope = higher price → lower demand" if slope < 0 else "unusual — verify data",
            "price_range_tested": {"min": min(prices), "max": max(prices)},
        })
```

```python
# backend/tools/storage_tools.py

import json
from crewai_tools import BaseTool
from database import get_supabase
import httpx
from config import settings


class SupabaseStoreTool(BaseTool):
    name: str = "Supabase Product Storage"
    description: str = "Stores a list of scraped products to the Supabase products table."

    def _run(self, products_json: str, run_id: str) -> str:
        db = get_supabase()
        data = json.loads(products_json)
        products = data.get("products", data) if isinstance(data, dict) else data

        for product in products:
            product["run_id"] = run_id

        result = db.table("products").insert(products).execute()
        return json.dumps({"stored": len(products), "run_id": run_id})


class SupabaseDataFetchTool(BaseTool):
    name: str = "Supabase Data Fetcher"
    description: str = "Fetches all data for a given run_id from Supabase. Specify table name and run_id."

    def _run(self, table: str, run_id: str, limit: int = 500) -> str:
        db = get_supabase()
        result = db.table(table).select("*").eq("run_id", run_id).limit(limit).execute()
        return json.dumps({"table": table, "count": len(result.data), "data": result.data})


class SlackAlertTool(BaseTool):
    name: str = "Slack Alert Sender"
    description: str = "Sends an alert message to the configured Slack webhook URL."

    def _run(self, message: str) -> str:
        webhook_url = settings.SLACK_WEBHOOK_URL
        try:
            resp = httpx.post(webhook_url, json={"text": message}, timeout=10)
            return json.dumps({"sent": resp.status_code == 200})
        except Exception as e:
            return json.dumps({"error": str(e)})


# Add similar patterns for:
# SupabaseReviewStoreTool, SupabaseCompetitorStoreTool, SupabaseTrendStoreTool,
# SupabaseConceptStoreTool, SupabaseGTMStoreTool, SupabaseSentimentStoreTool,
# SupabasePriceStoreTool, SupabaseSupplierStoreTool, SupabaseComplianceStoreTool
# — all follow the exact same BaseTool pattern above, just targeting different tables.
```

```python
# backend/tools/report_tools.py

import json
import os
from crewai_tools import BaseTool
from jinja2 import Environment, FileSystemLoader
from pptx import Presentation
from pptx.util import Inches, Pt
from database import get_supabase


class PDFGeneratorTool(BaseTool):
    name: str = "PDF Report Generator"
    description: str = "Generates a branded PDF report from structured report data using WeasyPrint and Jinja2."

    def _run(self, report_data_json: str, output_path: str, watermarked: bool = False) -> str:
        from weasyprint import HTML

        data = json.loads(report_data_json)
        env = Environment(loader=FileSystemLoader("templates/"))
        template = env.get_template("report.html")
        html_content = template.render(**data, watermarked=watermarked)

        HTML(string=html_content, base_url="templates/").write_pdf(output_path)
        size = os.path.getsize(output_path)
        return json.dumps({"path": output_path, "size_bytes": size})


class PPTXGeneratorTool(BaseTool):
    name: str = "PowerPoint Report Generator"
    description: str = "Generates a branded PPTX presentation from structured report data using python-pptx."

    def _run(self, report_data_json: str, output_path: str) -> str:
        data = json.loads(report_data_json)
        prs = Presentation()
        prs.slide_width = Inches(13.33)
        prs.slide_height = Inches(7.5)

        # Slide 1: Title
        slide = prs.slides.add_slide(prs.slide_layouts[0])
        slide.shapes.title.text = f"Product Intelligence Report: {data.get('category', '')}"
        slide.placeholders[1].text = f"Brand: {data.get('brand', '')} | Generated by ProductIQ"

        # Slide 2: Executive Summary
        slide = prs.slides.add_slide(prs.slide_layouts[1])
        slide.shapes.title.text = "Executive Summary"
        tf = slide.placeholders[1].text_frame
        for insight in data.get("top_insights", [])[:5]:
            p = tf.add_paragraph()
            p.text = f"• {insight.get('title', '')}"
            p.font.size = Pt(16)

        # Additional slides for: market overview, consumer intelligence,
        # competitor landscape, trends, product concepts, GTM plan, appendix
        # — follow same pattern, pulling from data dict

        prs.save(output_path)
        return json.dumps({"path": output_path, "slide_count": len(prs.slides)})


class SupabaseUploadTool(BaseTool):
    name: str = "Supabase Storage Uploader"
    description: str = "Uploads a file to Supabase Storage and returns a signed URL valid for 7 days."

    def _run(self, file_path: str, bucket: str, storage_path: str) -> str:
        db = get_supabase()
        with open(file_path, "rb") as f:
            db.storage.from_(bucket).upload(storage_path, f, {"upsert": "true"})

        url_response = db.storage.from_(bucket).create_signed_url(storage_path, 604800)
        signed_url = url_response.get("signedURL", "")
        return json.dumps({"signed_url": signed_url, "storage_path": storage_path})


class RFQGeneratorTool(BaseTool):
    name: str = "RFQ PDF Generator"
    description: str = "Generates a Request for Quotation PDF for a supplier."

    def _run(self, supplier_json: str, product_concept_json: str) -> str:
        from weasyprint import HTML
        from jinja2 import Environment, FileSystemLoader

        supplier = json.loads(supplier_json)
        concept = json.loads(product_concept_json)

        env = Environment(loader=FileSystemLoader("templates/"))
        template = env.get_template("rfq.html")
        html = template.render(supplier=supplier, concept=concept)

        path = f"/tmp/rfq_{supplier.get('company_name','').replace(' ','_')}.pdf"
        HTML(string=html).write_pdf(path)
        return json.dumps({"rfq_path": path})
```

---

## 10. FastAPI Backend (Complete)

```python
# backend/main.py

from fastapi import FastAPI, Depends, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import structlog

from config import settings
from routers import reports, stream, products, payments, webhooks

logger = structlog.get_logger()


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("ProductIQ API starting", env=settings.APP_ENV)
    yield
    logger.info("ProductIQ API shutting down")


app = FastAPI(
    title="ProductIQ API",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL, "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(reports.router, prefix="/api/reports", tags=["reports"])
app.include_router(stream.router, prefix="/api/stream", tags=["stream"])
app.include_router(products.router, prefix="/api/products", tags=["products"])
app.include_router(payments.router, prefix="/api/payments", tags=["payments"])
app.include_router(webhooks.router, prefix="/api/webhooks", tags=["webhooks"])


@app.get("/health")
async def health():
    return {"status": "ok", "version": "1.0.0"}
```

```python
# backend/models.py

from pydantic import BaseModel, Field
from typing import Optional
from uuid import UUID


class RunRequest(BaseModel):
    product_category: str = Field(..., min_length=3, max_length=100)
    brand_name: Optional[str] = Field(None, max_length=100)
    target_market: str = Field(default="India")


class RunResponse(BaseModel):
    run_id: str
    status: str
    celery_task_id: str


class AgentProgressEvent(BaseModel):
    run_id: str
    agent_name: str
    agent_number: int
    status: str
    progress_pct: int


class ReportResponse(BaseModel):
    run_id: str
    pdf_url: Optional[str]
    pptx_url: Optional[str]
    page_count: Optional[int]
    created_at: str
```

```python
# backend/routers/reports.py

from fastapi import APIRouter, Depends, HTTPException, Header
from models import RunRequest, RunResponse
from database import get_supabase
from celery_tasks import run_pipeline_task
from analytics import track_event
import uuid

router = APIRouter()


def get_current_user(authorization: str = Header(...)):
    """Validate Supabase JWT token and return user_id."""
    db = get_supabase()
    token = authorization.replace("Bearer ", "")
    try:
        user = db.auth.get_user(token)
        return user.user
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


@router.post("/run", response_model=RunResponse)
async def start_run(req: RunRequest, user=Depends(get_current_user)):
    db = get_supabase()

    # Check plan limits
    profile = db.table("profiles").select("*").eq("id", user.id).single().execute().data
    total_limit = profile["reports_limit"] + profile["extra_reports_from_referrals"]

    if profile["plan"] == "free" and profile["reports_used_this_month"] >= total_limit:
        raise HTTPException(
            status_code=403,
            detail=f"Monthly report limit reached ({total_limit}). Upgrade to Pro or refer a brand to unlock more."
        )

    # Create the run record
    run_id = str(uuid.uuid4())
    is_watermarked = profile["plan"] == "free"

    db.table("agent_runs").insert({
        "id": run_id,
        "user_id": user.id,
        "product_category": req.product_category,
        "brand_name": req.brand_name,
        "target_market": req.target_market,
        "status": "queued",
    }).execute()

    # Dispatch to Celery
    task = run_pipeline_task.delay(
        product_category=req.product_category,
        brand_name=req.brand_name or req.product_category,
        run_id=run_id,
        user_id=user.id,
        is_watermarked=is_watermarked,
    )

    # Update run with task ID
    db.table("agent_runs").update({"celery_task_id": task.id}).eq("id", run_id).execute()

    # Increment usage count
    db.table("profiles").update({
        "reports_used_this_month": profile["reports_used_this_month"] + 1
    }).eq("id", user.id).execute()

    track_event(user.id, "report_started", {
        "category": req.product_category,
        "plan": profile["plan"],
    })

    return RunResponse(run_id=run_id, status="queued", celery_task_id=task.id)


@router.get("/{run_id}")
async def get_report(run_id: str, user=Depends(get_current_user)):
    db = get_supabase()
    run = db.table("agent_runs").select("*").eq("id", run_id).eq("user_id", user.id).single().execute().data

    if not run:
        raise HTTPException(status_code=404, detail="Run not found")

    report = db.table("reports").select("*").eq("run_id", run_id).maybe_single().execute().data

    return {"run": run, "report": report}


@router.get("/")
async def list_reports(user=Depends(get_current_user)):
    db = get_supabase()
    runs = db.table("agent_runs").select("*, reports(*)").eq("user_id", user.id).order("created_at", desc=True).limit(20).execute()
    return {"runs": runs.data}
```

```python
# backend/routers/stream.py

from fastapi import APIRouter, Request, Depends, HTTPException, Header
from sse_starlette.sse import EventSourceResponse
from streaming import sse_manager
import asyncio

router = APIRouter()


def get_user_from_token(authorization: str = Header(...)):
    from database import get_supabase
    db = get_supabase()
    token = authorization.replace("Bearer ", "")
    try:
        return db.auth.get_user(token).user
    except Exception:
        raise HTTPException(status_code=401, detail="Unauthorized")


@router.get("/{run_id}")
async def stream_run_progress(run_id: str, request: Request, user=Depends(get_user_from_token)):
    """
    SSE endpoint — client connects and receives real-time agent progress events.
    Frontend uses: const source = new EventSource('/api/stream/{run_id}', {headers: {Authorization: ...}})
    """
    from database import get_supabase
    db = get_supabase()

    # Verify run belongs to user
    run = db.table("agent_runs").select("id, user_id").eq("id", run_id).maybe_single().execute().data
    if not run or run["user_id"] != user.id:
        raise HTTPException(status_code=403, detail="Forbidden")

    async def event_generator():
        queue = await sse_manager.subscribe(run_id)
        try:
            while True:
                if await request.is_disconnected():
                    break
                try:
                    data = queue.get_nowait()
                    yield {"data": data}
                except asyncio.QueueEmpty:
                    # Send heartbeat every 15 seconds
                    yield {"data": '{"type":"heartbeat"}'}
                    await asyncio.sleep(15)
        finally:
            await sse_manager.unsubscribe(run_id, queue)

    return EventSourceResponse(event_generator())
```

---

## 11. Celery + Redis Scheduled Jobs

```python
# backend/celery_app.py

from celery import Celery
from config import settings

app = Celery(
    "productiq",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=["celery_tasks", "celery_beat"],
)

app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="Asia/Kolkata",
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,   # One task at a time per worker (agents are heavy)
    task_soft_time_limit=1800,      # 30 min soft limit per task
    task_time_limit=2100,           # 35 min hard kill
)
```

```python
# backend/celery_tasks.py

from celery_app import app
from streaming import sse_manager
import asyncio
import json


@app.task(bind=True, name="run_pipeline")
def run_pipeline_task(self, product_category: str, brand_name: str, run_id: str, user_id: str, is_watermarked: bool):
    """Main 8-agent pipeline task. Long-running — up to 30 minutes."""
    from crews.main_crew import run_main_crew

    def progress_callback(agent_name: str, agent_num: int, status: str):
        """Called by the crew wrapper to push SSE events."""
        event_data = json.dumps({
            "type": "agent_update",
            "run_id": run_id,
            "agent_name": agent_name,
            "agent_number": agent_num,
            "status": status,
            "progress_pct": int((agent_num / 8) * 100),
        })
        # Use asyncio to push to SSE manager (sync bridge)
        try:
            loop = asyncio.get_event_loop()
        except RuntimeError:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)

        loop.run_until_complete(sse_manager.broadcast(run_id, event_data))

    return run_main_crew(
        product_category=product_category,
        brand_name=brand_name,
        run_id=run_id,
        user_id=user_id,
        is_watermarked=is_watermarked,
        progress_callback=progress_callback,
    )


@app.task(name="run_sentiment_check")
def run_sentiment_check_task(user_id: str, brand_name: str):
    """Runs Agent 9 for one brand. Called by Celery Beat."""
    from agents.sentiment_agent import create_sentiment_agent
    from tasks.sentiment_task import create_sentiment_task
    from crewai import Crew, Process

    agent = create_sentiment_agent()
    task = create_sentiment_task(agent, brand_name, user_id)
    crew = Crew(agents=[agent], tasks=[task], process=Process.sequential, verbose=False)
    crew.kickoff()


@app.task(name="run_price_check")
def run_price_check_task(run_id: str):
    """Runs Agent 10. Called by Celery Beat."""
    from agents.price_agent import create_price_agent
    from tasks.price_task import create_price_task
    from crewai import Crew, Process

    agent = create_price_agent()
    task = create_price_task(agent, run_id)
    crew = Crew(agents=[agent], tasks=[task], process=Process.sequential, verbose=False)
    crew.kickoff()
```

```python
# backend/celery_beat.py

from celery_app import app
from celery.schedules import crontab

app.conf.beat_schedule = {
    # Agent 9: Sentiment Tracker — runs every day at 7am IST for all pro users
    "daily-sentiment-check": {
        "task": "run_sentiment_monitor_all",
        "schedule": crontab(hour=1, minute=30),  # 7am IST = 1:30 UTC
    },
    # Agent 10: Price Optimizer — runs every day at 8am IST
    "daily-price-check": {
        "task": "run_price_monitor_all",
        "schedule": crontab(hour=2, minute=30),  # 8am IST = 2:30 UTC
    },
    # Reset monthly report counts — runs on 1st of each month
    "monthly-report-reset": {
        "task": "reset_monthly_report_counts",
        "schedule": crontab(0, 0, day_of_month="1"),
    },
}


@app.task(name="run_sentiment_monitor_all")
def run_sentiment_monitor_all():
    """Fetches all pro+ users' tracked brands and fires sentiment check tasks."""
    from database import get_supabase
    from celery_tasks import run_sentiment_check_task

    db = get_supabase()
    users = db.table("profiles").select("id, company_name").in_("plan", ["pro", "enterprise"]).execute().data

    for user in users:
        if user.get("company_name"):
            run_sentiment_check_task.delay(user["id"], user["company_name"])


@app.task(name="reset_monthly_report_counts")
def reset_monthly_report_counts():
    from database import get_supabase
    db = get_supabase()
    db.rpc("reset_monthly_reports").execute()
```

---

## 12. SSE Real-Time Agent Streaming

```python
# backend/streaming.py

import asyncio
import json
from collections import defaultdict
from typing import Dict, List


class SSEManager:
    """
    Manages Server-Sent Event queues per run_id.
    Multiple browser tabs can subscribe to the same run_id.
    Celery tasks push to all subscribers via broadcast().
    """

    def __init__(self):
        self._queues: Dict[str, List[asyncio.Queue]] = defaultdict(list)

    async def subscribe(self, run_id: str) -> asyncio.Queue:
        queue = asyncio.Queue(maxsize=100)
        self._queues[run_id].append(queue)
        return queue

    async def unsubscribe(self, run_id: str, queue: asyncio.Queue):
        if run_id in self._queues:
            try:
                self._queues[run_id].remove(queue)
            except ValueError:
                pass
            if not self._queues[run_id]:
                del self._queues[run_id]

    async def broadcast(self, run_id: str, data: str):
        """Push event data to all subscribers of a run_id."""
        if run_id in self._queues:
            dead = []
            for queue in self._queues[run_id]:
                try:
                    queue.put_nowait(data)
                except asyncio.QueueFull:
                    dead.append(queue)
            for queue in dead:
                self._queues[run_id].remove(queue)

    def subscriber_count(self, run_id: str) -> int:
        return len(self._queues.get(run_id, []))


sse_manager = SSEManager()
```

---

## 13. Supabase Realtime Integration

```python
# backend/realtime.py
# This runs as a background service that listens to Supabase Postgres changes.
# Used for: sentiment score updates triggering dashboard refreshes, agent_run status changes.

import asyncio
import json
from supabase import create_client
from config import settings


async def start_realtime_listener():
    """
    Listens to Supabase Realtime for changes on agent_runs and sentiment_scores.
    When sentiment drops sharply, triggers alert logic.
    """
    db = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)

    def on_sentiment_insert(payload):
        """Called when a new sentiment_score row is inserted."""
        record = payload.get("new", {})
        score = record.get("score", 0)
        brand = record.get("brand_name", "")
        user_id = record.get("user_id", "")

        # Check if score dropped > 15 points vs recent average
        asyncio.create_task(check_sentiment_alert(db, brand, user_id, score))

    channel = db.channel("sentiment-monitor")
    channel.on(
        "postgres_changes",
        event="INSERT",
        schema="public",
        table="sentiment_scores",
        callback=on_sentiment_insert,
    ).subscribe()

    # Keep alive
    while True:
        await asyncio.sleep(60)


async def check_sentiment_alert(db, brand: str, user_id: str, new_score: float):
    """Compare new score vs 7-day average; send Slack alert if drop > 15 points."""
    import httpx
    from datetime import datetime, timedelta

    seven_days_ago = (datetime.utcnow() - timedelta(days=7)).isoformat()
    history = db.table("sentiment_scores") \
        .select("score") \
        .eq("brand_name", brand) \
        .eq("user_id", user_id) \
        .gte("scored_at", seven_days_ago) \
        .execute().data

    if not history:
        return

    avg = sum(h["score"] for h in history) / len(history)

    if avg - new_score > 0.15:  # Score dropped > 15 percentage points
        profile = db.table("profiles").select("slack_webhook_url").eq("id", user_id).maybe_single().execute().data
        webhook = profile.get("slack_webhook_url") if profile else None

        if webhook:
            message = f":warning: *ProductIQ Alert* — Brand sentiment for *{brand}* dropped {round((avg - new_score) * 100, 1)} points vs 7-day average. Score: {round(new_score, 2)} (avg was {round(avg, 2)}). Check your dashboard."
            httpx.post(webhook, json={"text": message}, timeout=5)

        # Mark alert_sent
        db.table("sentiment_scores").update({"alert_sent": True}) \
            .eq("brand_name", brand).eq("user_id", user_id) \
            .order("scored_at", desc=True).limit(1).execute()
```

---

## 14. RAG Pipeline (LlamaIndex + pgvector)

```python
# backend/rag/pipeline.py

from llama_index.core import VectorStoreIndex, Settings as LlamaSettings
from llama_index.vector_stores.supabase import SupabaseVectorStore
from llama_index.embeddings.gemini import GeminiEmbedding
from llama_index.llms.gemini import Gemini
import vecs
from config import settings


def get_rag_index() -> VectorStoreIndex:
    """Returns a LlamaIndex VectorStoreIndex backed by Supabase pgvector."""

    # Configure Gemini embedding model
    LlamaSettings.embed_model = GeminiEmbedding(
        model_name="models/embedding-001",
        api_key=settings.GEMINI_API_KEY,
    )

    # Configure Gemini LLM
    LlamaSettings.llm = Gemini(
        model="models/gemini-1.5-pro",
        api_key=settings.GEMINI_API_KEY,
    )

    # Connect to Supabase vector store
    vx = vecs.create_client(settings.DATABASE_URL)
    collection = vx.get_or_create_collection(name="embeddings", dimension=768)

    vector_store = SupabaseVectorStore(
        postgres_connection_string=settings.DATABASE_URL,
        collection_name="embeddings",
    )

    return VectorStoreIndex.from_vector_store(vector_store)
```

```python
# backend/rag/ingestion.py

from llama_index.core import Document
from llama_index.core.ingestion import IngestionPipeline
from llama_index.core.node_parser import SentenceSplitter
from llama_index.embeddings.gemini import GeminiEmbedding
from llama_index.vector_stores.supabase import SupabaseVectorStore
from config import settings
from database import get_supabase


def ingest_run_data(run_id: str):
    """
    After agents 1–4 complete, ingest their outputs into pgvector
    so the Insight Synthesizer (Agent 5) can use semantic search.
    """
    db = get_supabase()
    documents = []

    # Ingest reviews
    reviews = db.table("reviews").select("body, rating, sentiment_label").eq("run_id", run_id).limit(2000).execute().data
    for rev in reviews:
        doc = Document(
            text=rev["body"],
            metadata={"source_type": "review", "run_id": run_id, "rating": rev["rating"], "sentiment": rev["sentiment_label"]},
        )
        documents.append(doc)

    # Ingest competitor data
    competitors = db.table("competitors").select("*").eq("run_id", run_id).execute().data
    for comp in competitors:
        text = f"Competitor: {comp['brand_name']}. Strengths: {comp.get('key_strengths', [])}. Weaknesses: {comp.get('key_weaknesses', [])}. Positioning: {comp.get('positioning_statement', '')}"
        documents.append(Document(text=text, metadata={"source_type": "competitor", "run_id": run_id}))

    # Ingest trends
    trends = db.table("trends").select("*").eq("run_id", run_id).execute().data
    for trend in trends:
        text = f"Trend: {trend['trend_keyword']}. Source: {trend['source']}. Velocity: {trend['velocity']}. Related: {trend.get('related_topics', [])}"
        documents.append(Document(text=text, metadata={"source_type": "trend", "run_id": run_id}))

    # Build ingestion pipeline
    embed_model = GeminiEmbedding(model_name="models/embedding-001", api_key=settings.GEMINI_API_KEY)
    vector_store = SupabaseVectorStore(
        postgres_connection_string=settings.DATABASE_URL,
        collection_name="embeddings",
    )

    pipeline = IngestionPipeline(
        transformations=[
            SentenceSplitter(chunk_size=512, chunk_overlap=50),
            embed_model,
        ],
        vector_store=vector_store,
    )

    pipeline.run(documents=documents)
    return len(documents)
```

```python
# backend/rag/retriever.py

from crewai_tools import BaseTool
import json
from rag.pipeline import get_rag_index


class RAGRetrieverTool(BaseTool):
    name: str = "RAG Knowledge Retriever"
    description: str = "Semantically retrieves the most relevant product intelligence from the vector store for a given query."

    def _run(self, query: str, top_k: int = 10) -> str:
        index = get_rag_index()
        retriever = index.as_retriever(similarity_top_k=top_k)
        nodes = retriever.retrieve(query)

        results = []
        for node in nodes:
            results.append({
                "text": node.text,
                "score": round(node.score, 3) if node.score else None,
                "metadata": node.metadata,
            })

        return json.dumps({"results": results, "count": len(results)})
```

---

## 15. Report Builder (PDF + PPTX)

The full report generation flow is handled by Agent 8's tools. You need two Jinja2 HTML templates:

**`templates/report.html`** — Full HTML document styled for WeasyPrint PDF generation. Structure:
- `<head>` with `@page` CSS for A4, fonts, header/footer
- Cover page with brand name, category, date, ProductIQ branding
- Each section as a page-broken `<div>`
- Charts as `<img>` tags (generate with matplotlib/seaborn before calling WeasyPrint, save as PNG, embed base64)
- Watermark via CSS `::after` pseudo-element on body if `watermarked=True`

**`templates/rfq.html`** — RFQ letter template with:
- ProductIQ letterhead
- Supplier company details
- Product concept summary
- Quantity inquiry, certification requirements, timeline
- Contact details

The python-pptx PPTX generation adds slides programmatically — see the `PPTXGeneratorTool` in Section 9 for the foundation. Extend with one slide layout per report section.

---

## 16. Razorpay Payments & Freemium Gating

```python
# backend/payments.py

import razorpay
import hmac
import hashlib
from config import settings

client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))


def create_order(amount_inr: float, receipt: str, notes: dict = {}) -> dict:
    """Create a Razorpay order. amount_inr is in rupees; converted to paise."""
    return client.order.create({
        "amount": int(amount_inr * 100),
        "currency": "INR",
        "receipt": receipt,
        "notes": notes,
    })


def verify_payment_signature(order_id: str, payment_id: str, signature: str) -> bool:
    """Verify Razorpay webhook/checkout signature to confirm payment is genuine."""
    message = f"{order_id}|{payment_id}"
    expected = hmac.new(
        settings.RAZORPAY_KEY_SECRET.encode(),
        message.encode(),
        hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(expected, signature)
```

```python
# backend/routers/payments.py

from fastapi import APIRouter, Depends, HTTPException, Header
from pydantic import BaseModel
from payments import create_order, verify_payment_signature
from database import get_supabase

router = APIRouter()

PLAN_PRICES = {
    "pro_monthly": 4999,
    "pay_per_report": 999,
}


class OrderRequest(BaseModel):
    plan: str  # "pro_monthly" | "pay_per_report"


class VerifyRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str
    plan: str


def get_current_user(authorization: str = Header(...)):
    db = get_supabase()
    try:
        return db.auth.get_user(authorization.replace("Bearer ", "")).user
    except Exception:
        raise HTTPException(status_code=401)


@router.post("/order")
async def create_payment_order(req: OrderRequest, user=Depends(get_current_user)):
    if req.plan not in PLAN_PRICES:
        raise HTTPException(status_code=400, detail="Unknown plan")

    order = create_order(
        amount_inr=PLAN_PRICES[req.plan],
        receipt=f"{user.id[:8]}-{req.plan}",
        notes={"user_id": user.id, "plan": req.plan},
    )

    db = get_supabase()
    db.table("transactions").insert({
        "user_id": user.id,
        "razorpay_order_id": order["id"],
        "amount_paise": order["amount"],
        "type": "subscription" if "monthly" in req.plan else "pay_per_report",
        "plan": req.plan,
        "status": "created",
    }).execute()

    return {
        "order_id": order["id"],
        "amount": order["amount"],
        "currency": "INR",
        "key": settings.RAZORPAY_KEY_ID,
    }


@router.post("/verify")
async def verify_payment(req: VerifyRequest, user=Depends(get_current_user)):
    if not verify_payment_signature(req.razorpay_order_id, req.razorpay_payment_id, req.razorpay_signature):
        raise HTTPException(status_code=400, detail="Invalid payment signature")

    db = get_supabase()

    # Update transaction
    db.table("transactions").update({
        "razorpay_payment_id": req.razorpay_payment_id,
        "razorpay_signature": req.razorpay_signature,
        "status": "paid",
    }).eq("razorpay_order_id", req.razorpay_order_id).execute()

    # Upgrade user plan
    if "monthly" in req.plan:
        db.table("profiles").update({
            "plan": "pro",
            "reports_limit": 999,
        }).eq("id", user.id).execute()
    elif req.plan == "pay_per_report":
        profile = db.table("profiles").select("reports_limit").eq("id", user.id).single().execute().data
        db.table("profiles").update({
            "reports_limit": profile["reports_limit"] + 1,
        }).eq("id", user.id).execute()

    return {"status": "success", "plan_activated": req.plan}
```

---

## 17. Compliance Guardian Agent (RAG over Regulations)

```python
# scripts/seed_regulations.py
# Run once: python scripts/seed_regulations.py
# Seeds FSSAI, AYUSH regulatory text into pgvector for Agent 12

from llama_index.core import Document
from llama_index.core.ingestion import IngestionPipeline
from llama_index.core.node_parser import SentenceSplitter
from llama_index.embeddings.gemini import GeminiEmbedding
from llama_index.vector_stores.supabase import SupabaseVectorStore
import os, sys
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from config import settings

REGULATIONS = [
    {
        "title": "FSSAI Food Safety Standards",
        "source": "fssai",
        "text": """
Food Safety and Standards Authority of India (FSSAI) key requirements:
1. All food business operators must obtain FSSAI licence or registration.
2. Product labelling must include: name of food, list of ingredients, nutritional info per 100g/100ml,
   net quantity, date of manufacture, best before/use by date, name and address of manufacturer,
   country of origin, FSSAI licence number, customer care details.
3. Health claims must be scientifically substantiated and pre-approved.
4. Proprietary food products require pre-market approval if they contain novel ingredients.
5. Nutraceuticals and dietary supplements regulated under Food Safety and Standards (Health Supplements,
   Nutraceuticals, Food for Special Dietary Use, Food for Special Medical Purpose, Functional Food
   and Novel Food) Regulations, 2016.
6. Maximum permissible limits for additives, pesticides, heavy metals, and contaminants are defined
   in respective schedules.
7. Organic food labelling requires certification from accredited certifying bodies.
        """
    },
    {
        "title": "AYUSH Ministry Regulations for Herbal Products",
        "source": "ayush",
        "text": """
AYUSH (Ayurveda, Yoga, Naturopathy, Unani, Siddha, Homeopathy) regulatory framework:
1. Ayurvedic, Siddha, and Unani (ASU) drugs regulated under Drugs and Cosmetics Act 1940.
2. Classical ASU formulations listed in official formularies (Ayurvedic Formulary of India) do not
   require formal clinical trials.
3. Patent and Proprietary ASU medicines require safety and efficacy data.
4. Claims for disease treatment, cure, mitigation, or prevention require drug licence — not food licence.
5. Adaptogen and wellness claims must be differentiated from therapeutic claims.
6. AYUSH premium products need quality testing for heavy metals (lead, mercury, arsenic, cadmium)
   within prescribed limits.
7. Good Manufacturing Practices (Schedule T) compliance mandatory for manufacturing licence.
        """
    },
    {
        "title": "BIS Standards for Consumer Products",
        "source": "bis",
        "text": """
Bureau of Indian Standards (BIS) requirements for packaged consumer goods:
1. ISI mark mandatory for products covered under Compulsory Certification Orders (CCOs).
2. For food supplements and nutritional products, BIS IS 14550 covers labelling and packaging.
3. Consumer goods must carry ISI mark if covered under Quality Control Orders (QCOs) issued by
   respective ministries.
4. Import of consumer goods may require BIS registration and conformity marking.
5. Products with electronic components may require additional BIS certification under Electronics
   and IT Goods Quality Control Order.
        """
    },
]


def seed():
    embed_model = GeminiEmbedding(model_name="models/embedding-001", api_key=settings.GEMINI_API_KEY)
    vector_store = SupabaseVectorStore(
        postgres_connection_string=settings.DATABASE_URL,
        collection_name="embeddings",
    )

    documents = []
    for reg in REGULATIONS:
        doc = Document(
            text=reg["text"],
            metadata={"source_type": "regulation", "source": reg["source"], "title": reg["title"]},
        )
        documents.append(doc)

    pipeline = IngestionPipeline(
        transformations=[SentenceSplitter(chunk_size=512, chunk_overlap=50), embed_model],
        vector_store=vector_store,
    )
    pipeline.run(documents=documents)
    print(f"Seeded {len(documents)} regulation documents into pgvector.")


if __name__ == "__main__":
    seed()
```

---

## 18. Supply Chain Scout Agent

The Supply Chain Scout (Agent 11) uses `IndiaMArtTool` from Section 9 plus `RFQGeneratorTool`. The RFQ template at `templates/rfq.html` should generate a professional letter with:

- ProductIQ letterhead
- To: `{{supplier.company_name}}`
- Subject: Request for Quotation — `{{concept.concept_name}}`
- Body: product spec summary, required certifications (FSSAI, ISO, GMP), MOQ requirements, timeline, contact details
- Footer: ProductIQ branding

The agent task description in Section 7 covers the full workflow. Store all found suppliers to the `suppliers` table and set `rfq_generated = True` after PDF creation.

---

## 19. Sentiment Tracker Agent (Realtime)

Agent 9 writes to `sentiment_scores`. Because `ALTER PUBLICATION supabase_realtime ADD TABLE public.sentiment_scores` is in the schema (Section 4), any INSERT to this table immediately broadcasts a Postgres change event to all connected Supabase Realtime clients.

On the frontend side (described in Section 24), the React dashboard subscribes to this channel and updates the sentiment gauge in real time without polling.

The Celery Beat schedule (Section 11) fires `run_sentiment_monitor_all` daily at 7am IST, which in turn dispatches individual `run_sentiment_check_task` jobs for every Pro/Enterprise user's brand.

---

## 20. Price Optimizer Agent

```python
# backend/tasks/price_task.py

from crewai import Task

def create_price_task(agent, run_id: str) -> Task:
    return Task(
        description=f"""
Run daily price intelligence for all tracked products in run_id: {run_id}

Steps:
1. Fetch all products for this run_id from Supabase.
2. For each product, re-scrape the current price from Amazon and Flipkart.
3. Store new price records to `price_history` table.
4. Fetch price history for last 90 days for each product.
5. Run ElasticityModelTool on price vs review_count data to find optimal price point.
6. Identify any competitor that changed price by more than 10% since last check.
7. Generate a price intelligence summary:
   - current_market_min_price
   - current_market_max_price
   - recommended_price (from elasticity model)
   - price_movers (brands that changed price)
   - pricing_opportunity (gap where no competitor is positioned)
8. Return the full summary JSON.
        """,
        expected_output="JSON with price intelligence summary, optimal price recommendation, and price movers.",
        agent=agent,
    )
```

---

## 21. Product Knowledge Graph (JSONB → Neo4j path)

```python
# backend/graph.py

from database import get_supabase
import json


def add_node(node_type: str, label: str, properties: dict = {}) -> str:
    """Insert a knowledge graph node. Returns node ID."""
    db = get_supabase()
    result = db.table("knowledge_nodes").insert({
        "node_type": node_type,
        "label": label,
        "properties": properties,
    }).execute()
    return result.data[0]["id"]


def add_edge(from_id: str, to_id: str, relationship: str, weight: float = 1.0, properties: dict = {}) -> str:
    db = get_supabase()
    result = db.table("knowledge_edges").insert({
        "from_node": from_id,
        "to_node": to_id,
        "relationship": relationship,
        "weight": weight,
        "properties": properties,
    }).execute()
    return result.data[0]["id"]


def find_competitors_sharing_feature(feature_label: str) -> list:
    """
    Traverse: Feature → COMPETES_WITH edge → Competitor nodes.
    Emulates a 2-hop graph query using SQL joins.
    """
    db = get_supabase()

    # Find feature node
    feature = db.table("knowledge_nodes") \
        .select("id") \
        .eq("node_type", "feature") \
        .eq("label", feature_label) \
        .maybe_single().execute().data

    if not feature:
        return []

    # Find all edges from this feature
    edges = db.table("knowledge_edges") \
        .select("to_node") \
        .eq("from_node", feature["id"]) \
        .execute().data

    node_ids = [e["to_node"] for e in edges]

    # Fetch competitor nodes
    if not node_ids:
        return []

    competitors = db.table("knowledge_nodes") \
        .select("*") \
        .in_("id", node_ids) \
        .eq("node_type", "competitor") \
        .execute().data

    return competitors


def build_graph_for_run(run_id: str):
    """
    Called after the main crew completes.
    Builds the knowledge graph from the run's data — products, features, competitors, trends.
    This powers the Knowledge Graph feature in the UI.
    """
    db = get_supabase()

    # Add brand node
    products = db.table("products").select("brand, category").eq("run_id", run_id).limit(1).execute().data
    if not products:
        return

    brand = products[0]["brand"]
    category = products[0]["category"]

    brand_id = add_node("brand", brand, {"category": category, "run_id": run_id})

    # Add competitor nodes and COMPETES_WITH edges
    competitors = db.table("competitors").select("*").eq("run_id", run_id).execute().data
    for comp in competitors:
        comp_id = add_node("competitor", comp["brand_name"], {"price": comp.get("price_inr")})
        add_edge(brand_id, comp_id, "COMPETES_WITH")

    # Add trend nodes and AFFECTED_BY edges
    trends = db.table("trends").select("*").eq("run_id", run_id).execute().data
    for trend in trends:
        trend_id = add_node("trend", trend["trend_keyword"], {"velocity": trend.get("velocity")})
        add_edge(brand_id, trend_id, "AFFECTED_BY", weight=float(trend.get("trend_score", 1.0)) / 100.0)

    # Add customer need nodes from review clusters
    clusters = db.table("review_clusters").select("*").eq("run_id", run_id).eq("topic_type", "pain_point").execute().data
    for cluster in clusters:
        need_id = add_node("customer_need", cluster["topic_label"], {"avg_sentiment": cluster.get("avg_sentiment")})
        add_edge(brand_id, need_id, "HAS_UNMET_NEED", weight=float(cluster.get("review_count", 1)))
```

**Neo4j migration note:** When you are ready to migrate to Neo4j, the `knowledge_nodes` and `knowledge_edges` tables map directly to Neo4j nodes and relationships. Each `node_type` becomes a Neo4j label, each `relationship` string becomes a Cypher relationship type, and `properties` JSONB maps to Neo4j node properties. The Cypher equivalent of `find_competitors_sharing_feature` is:
```cypher
MATCH (f:Feature {label: $feature_label})-[:COMPETES_WITH]->(c:Competitor)
RETURN c
```

---

## 22. PostHog Analytics Integration

```python
# backend/analytics.py

import posthog
from config import settings

posthog.project_api_key = settings.POSTHOG_API_KEY
posthog.host = "https://app.posthog.com"


def track_event(user_id: str, event: str, properties: dict = {}):
    """Track a product analytics event. Call this from all routers."""
    try:
        posthog.capture(user_id, event, properties)
    except Exception:
        pass  # Never let analytics break the main flow


def identify_user(user_id: str, properties: dict = {}):
    """Set user properties in PostHog (plan, company, etc.)."""
    try:
        posthog.identify(user_id, properties)
    except Exception:
        pass


# Key events to track across the codebase:
# track_event(user_id, "report_started", {"category": ..., "plan": ...})
# track_event(user_id, "report_completed", {"category": ..., "duration_seconds": ...})
# track_event(user_id, "report_downloaded", {"format": "pdf" | "pptx"})
# track_event(user_id, "payment_initiated", {"plan": ..., "amount": ...})
# track_event(user_id, "payment_completed", {"plan": ...})
# track_event(user_id, "agent_failed", {"agent_name": ..., "error": ...})
# track_event(user_id, "referral_used", {"referred_by": ...})
```

---

## 23. Docker & Deployment

```dockerfile
# Dockerfile

FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    curl \
    wget \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

RUN python -m spacy download en_core_web_sm
RUN playwright install chromium
RUN playwright install-deps chromium

COPY . .

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

```yaml
# docker-compose.yml

version: "3.9"

services:
  api:
    build: .
    ports:
      - "8000:8000"
    env_file: .env
    depends_on:
      - redis
    command: uvicorn main:app --host 0.0.0.0 --port 8000 --workers 2

  worker:
    build: .
    env_file: .env
    depends_on:
      - redis
    command: celery -A celery_app worker --loglevel=info --concurrency=2 -Q default

  beat:
    build: .
    env_file: .env
    depends_on:
      - redis
    command: celery -A celery_app beat --loglevel=info

  flower:
    build: .
    env_file: .env
    ports:
      - "5555:5555"
    depends_on:
      - redis
    command: celery -A celery_app flower --port=5555

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  redis_data:
```

### Railway Deployment

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and init
railway login
railway init

# Create services
railway add redis

# Set environment variables (from .env)
railway variables set GEMINI_API_KEY=... SUPABASE_URL=... # etc

# Deploy
railway up

# The docker-compose services map to Railway services:
# api → api service (public port 8000)
# worker → worker service (no public port)
# beat → beat service (no public port)
# Redis → Railway Redis plugin
```

---

## 24. Frontend Overview (No Code)

The frontend is a React + Vite + Tailwind + shadcn/ui single-page application. This section describes what it contains — implementation is a separate sprint.

### Pages & Views

**Auth pages** — Supabase Auth UI for sign up, login, and password reset. After login, user is redirected to dashboard.

**Dashboard (/)** — Shows: usage meter (reports used / limit), recent reports list with status, quick-start form to enter product category and brand name, sentiment gauge for tracked brand (updates via Supabase Realtime subscription), price trend mini-chart.

**New Report (/reports/new)** — Form: product category (text), brand name (optional), target market (default India). On submit, calls `POST /api/reports/run`. Immediately navigates to the Run Status page.

**Run Status (/reports/:run_id/status)** — The killer demo screen. Shows:
- 8 agent cards in a grid, each with: agent number, name, status indicator (pending / running / completed / failed)
- The currently active agent card pulses with a subtle animation
- Agent progress is received via `EventSource` (SSE) connection to `GET /api/stream/:run_id`
- Each SSE `agent_update` event updates the relevant agent card's status
- Progress bar at top shows overall percentage
- When status = completed, a "Download Report" button appears with PDF and PPTX links

**Report View (/reports/:run_id)** — Full report rendered in-browser:
- Tabbed layout: Overview, Consumer Intelligence, Competitor Map, Trends, Product Concepts, GTM Plan
- Data fetched from Supabase directly (since RLS is set, user only sees their own data)
- Charts via Recharts: sentiment distribution pie, price comparison bar, trend velocity line chart, cluster bubble chart
- Download buttons for PDF and PPTX (signed URLs from Supabase Storage)

**Knowledge Graph (/reports/:run_id/graph)** — Interactive graph visualisation using React Force Graph or Vis.js. Nodes are products, features, competitors, trends, customer needs. Edges show relationships. This is the premium differentiator for enterprise.

**Sentiment Dashboard (/sentiment)** — Pro+ feature. Brand health gauge (updated in real time via Supabase Realtime channel subscription). 30-day sentiment trend line. Platform breakdown (Amazon vs Reddit vs Google). Alert history.

**Price Tracker (/prices)** — Pro+ feature. Line chart of tracked product prices over time. Competitor price table. Elasticity curve chart from Agent 10 output.

**Settings (/settings)** — Profile, plan details, Slack webhook URL input (for sentiment alerts), referral link with copy button, billing history.

**Pricing (/pricing)** — Three-tier pricing cards (Free / Pro / Enterprise). Razorpay checkout integration. Uses the `/api/payments/order` and `/api/payments/verify` endpoints.

### Key Frontend Technical Decisions

- Supabase JS client (`@supabase/supabase-js`) used directly for data fetching where RLS is sufficient — avoids routing everything through FastAPI for read operations
- `EventSource` with polyfill for SSE — receives real-time agent updates without WebSocket complexity
- Supabase Realtime JS client for sentiment score live updates — subscribe to `INSERT` events on `sentiment_scores` table
- React Query for all async data fetching — automatic caching, background refetch, loading/error states
- State: React Context for auth user + plan, React Query for server state, useState for UI-only state

---

## 25. 8-Week Build Roadmap

### Week 1–2: POC (Terminal-only, no UI)

**Goal:** Agents 1 and 2 working end-to-end in terminal. First real data in Supabase.

- [ ] Set up project folder structure (Section 2)
- [ ] Install all dependencies (Section 3)
- [ ] Create and run Supabase schema (Section 4)
- [ ] Configure Gemini API + CrewAI LLM setup (Section 5)
- [ ] Implement `AmazonScraperTool` and `FlipkartScraperTool` (Section 9)
- [ ] Implement `ReviewScraperTool`, `SentimentAnalysisTool`, `BERTopicClusterTool` (Section 9)
- [ ] Build Agent 1 (Scraper) + Task 1 (Section 6, 7)
- [ ] Build Agent 2 (Review Miner) + Task 2 (Section 6, 7)
- [ ] Run `scripts/test_crew.py` with just these 2 agents — verify real data in Supabase
- [ ] Test: run on "protein powder" category, confirm 50+ products and 200+ reviews stored

**Success metric:** Terminal output shows agent logs, Supabase tables contain real scraped data.

### Week 3–4: Full 8-Agent Core Pipeline

**Goal:** All 8 core agents running sequentially, full CrewAI crew producing report data.

- [ ] Implement remaining scraping tools: `PlaywrightBrowserTool` (Section 9)
- [ ] Implement search tools: `SerpAPITool`, `GoogleTrendsTool`, `RedditTool` (Section 9)
- [ ] Build Agents 3–8 with their task definitions (Sections 6, 7)
- [ ] Build `main_crew.py` crew orchestration (Section 8)
- [ ] Set up LlamaIndex + pgvector RAG pipeline (Section 14)
- [ ] Seed regulations for Compliance agent (Section 17)
- [ ] Implement `PDFGeneratorTool` and `PPTXGeneratorTool` with basic templates (Section 9, 15)
- [ ] Run full 8-agent crew in terminal — verify complete report generated
- [ ] Test: full run for "skincare" category, confirm PDF + PPTX produced

**Success metric:** Full 8-agent pipeline completes in under 30 minutes, report files saved.

### Week 5–6: FastAPI + Celery + SSE + React Dashboard

**Goal:** Web-accessible API, real-time progress streaming, first frontend.

- [ ] Build FastAPI app with all routers (Section 10)
- [ ] Configure Celery + Redis (Section 11)
- [ ] Wrap crew execution in Celery task (Section 11)
- [ ] Build SSE streaming manager (Section 12)
- [ ] Wire progress callbacks from crew to SSE (Section 8)
- [ ] Test SSE stream via `curl -N http://localhost:8000/api/stream/:run_id`
- [ ] Build Supabase Realtime listener (Section 13)
- [ ] Build Auth middleware (JWT validation from Supabase)
- [ ] **Frontend (basic):** Auth flow + New Report form + Run Status page with live agent cards
- [ ] Deploy to Railway (Section 23)

**Success metric:** Start a report from browser, watch 8 agent cards activate one by one live.

### Week 7: New Agents 9–12 + Knowledge Graph

**Goal:** Monitoring agents running on schedule, Knowledge Graph built, graph UI.

- [ ] Build Agent 9 (Sentiment Tracker) + Celery Beat schedule (Sections 19, 11)
- [ ] Build Agent 10 (Price Optimizer) + Celery Beat schedule (Sections 20, 11)
- [ ] Build Agent 11 (Supply Chain Scout) + RFQ generator (Section 18)
- [ ] Build Agent 12 (Compliance Guardian) (Section 17)
- [ ] Implement `graph.py` — node/edge creation, JSONB graph queries (Section 21)
- [ ] Wire `build_graph_for_run()` call at end of main crew
- [ ] **Frontend:** Sentiment dashboard with Realtime gauge, Price tracker chart, Knowledge Graph view

**Success metric:** Daily sentiment check fires at 7am, score appears in dashboard within seconds via Realtime.

### Week 8: Payments + Analytics + Polish + First Customers

**Goal:** Paying customers possible, analytics tracking, cold outreach started.

- [ ] Integrate Razorpay payments (Sections 16)
- [ ] Implement freemium gating in reports router (Section 10)
- [ ] Implement referral unlock logic
- [ ] Set up PostHog event tracking across all routers (Section 22)
- [ ] Add watermark to free tier reports
- [ ] **Frontend:** Pricing page, Settings page with Slack webhook input
- [ ] Cold outreach to 50 D2C brands (template: "10-minute report replacing ₹2L consulting — try free")
- [ ] First ₹999 pay-per-report sale

**Success metric:** First paying customer, PostHog shows report funnel, Razorpay transaction confirmed.

---

## 26. Environment Variables Reference

```bash
# .env.example — copy to .env and fill all values

# ─── GEMINI ───────────────────────────────────────────────
GEMINI_API_KEY=AIzaSy...          # Google AI Studio → API Keys

# ─── SUPABASE ─────────────────────────────────────────────
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGci...  # Settings → API → service_role key (NOT anon key)
DATABASE_URL=postgresql://postgres:PASSWORD@db.xxxx.supabase.co:5432/postgres

# ─── REDIS ────────────────────────────────────────────────
REDIS_URL=redis://localhost:6379/0
# Railway Redis: redis://default:PASSWORD@monorail.proxy.rlwy.net:PORT/0

# ─── EXTERNAL APIs ────────────────────────────────────────
SERPAPI_KEY=...                   # serpapi.com → Dashboard → API Key
REDDIT_CLIENT_ID=...              # reddit.com/prefs/apps → Create App
REDDIT_CLIENT_SECRET=...

# ─── PAYMENTS ─────────────────────────────────────────────
RAZORPAY_KEY_ID=rzp_live_...     # Razorpay Dashboard → API Keys
RAZORPAY_KEY_SECRET=...

# ─── ANALYTICS ────────────────────────────────────────────
POSTHOG_API_KEY=phc_...          # app.posthog.com → Project → API Key

# ─── ALERTS ───────────────────────────────────────────────
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...   # Slack → Incoming Webhooks app

# ─── APP ──────────────────────────────────────────────────
APP_ENV=development               # development | production
SECRET_KEY=your-random-32-char-secret-here
FRONTEND_URL=http://localhost:5173

# ─── OPTIONAL: For Neo4j when you scale ───────────────────
# NEO4J_URI=neo4j+s://xxxx.databases.neo4j.io
# NEO4J_USERNAME=neo4j
# NEO4J_PASSWORD=...
```

---

## Quick Start Test Script

```python
# scripts/test_crew.py
# Run from backend/ directory: python scripts/test_crew.py

import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from crews.main_crew import run_main_crew
import uuid

TEST_RUN_ID = str(uuid.uuid4())
TEST_USER_ID = "test-user-000"

print(f"\n{'='*60}")
print("ProductIQ — Full Pipeline Test")
print(f"Run ID: {TEST_RUN_ID}")
print(f"{'='*60}\n")

result = run_main_crew(
    product_category="protein powder",
    brand_name="MuscleBlaze",
    run_id=TEST_RUN_ID,
    user_id=TEST_USER_ID,
    is_watermarked=True,
    progress_callback=lambda name, num, status: print(f"[{status.upper()}] Agent {num}: {name}"),
)

print(f"\n{'='*60}")
print("Pipeline complete!")
print(f"Result: {result}")
print(f"{'='*60}\n")
```

---

*Generated by ProductIQ Vibe Coding Guide v1.0 — April 2026*
*Stack: Python · FastAPI · CrewAI · Gemini · Supabase · pgvector · LlamaIndex · Celery · Redis · Razorpay · PostHog*
