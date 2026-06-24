# ProductIQ v2 — Master Plan & Startup Blueprint
> **Confidential — Internal Strategy Document**  
> Version 2.0 | June 2026 | Authored for engineering, product, and investor audiences

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Critical Analysis of the Old Plan](#2-critical-analysis-of-the-old-plan)
3. [New Architecture — Real-Time, Production-Grade](#3-new-architecture--real-time-production-grade)
4. [Expanded Agent Fleet — 20 Agents](#4-expanded-agent-fleet--20-agents)
5. [Data Pipelines & Event Architecture](#5-data-pipelines--event-architecture)
6. [Frontend Feature Expansion](#6-frontend-feature-expansion)
7. [Market Strategy & Startup Positioning](#7-market-strategy--startup-positioning)
8. [Workflows — Step-by-Step](#8-workflows--step-by-step)
9. [Real-Time System Challenges & Solutions](#9-real-time-system-challenges--solutions)
10. [DevOps, CI/CD & Observability](#10-devops-cicd--observability)
11. [Security & Compliance Architecture](#11-security--compliance-architecture)
12. [Monetisation & Revenue Architecture](#12-monetisation--revenue-architecture)
13. [16-Week Execution Roadmap](#13-16-week-execution-roadmap)
14. [Technology Stack Reference](#14-technology-stack-reference)

---

## 1. Executive Summary

### What ProductIQ Is Becoming

ProductIQ started as a compelling idea: replace ₹2–5 lakh consulting reports with a ₹999 AI-generated equivalent for Indian D2C brands. The prototype validated the concept — 12 agents, a CrewAI pipeline, Supabase backend, and a React frontend. But the prototype is **not a product**.

**The gap between prototype and product:**
- The pipeline is batch-only. Users submit, wait 10–15 minutes, and get a static PDF. There is no real-time value delivery.
- Agents run sequentially with no parallelism, wasting 70% of available execution time.
- There is no continuous intelligence — no persistent monitoring, no alerts, no live dashboards.
- The frontend is a status page watching agents run. There is no interactive intelligence layer.
- There is no feedback loop — user data does not improve the models.

**ProductIQ v2 is a Product Intelligence Operating System.** Not a report generator.

The vision: a D2C brand plugs in their product category and competitors on Day 1. From that moment, ProductIQ watches their market 24/7 — surfacing opportunities, flagging threats, tracking competitors, and generating on-demand intelligence reports. Every interaction makes the system smarter. The knowledge compounds.

**Target outcome by Month 12:**
- 500+ paying brands on the platform
- ₹2–4 Cr ARR (Annual Recurring Revenue)
- Seed round of ₹3–5 Cr at ₹25–30 Cr valuation
- 20 agents running, 5 product verticals covered
- Real-time intelligence delivery < 500ms

---

## 2. Critical Analysis of the Old Plan

### 2.1 What Worked

| Element | Assessment |
|---|---|
| CrewAI + Gemini combination | ✅ Correct. CrewAI's task-dependency model maps perfectly to the intelligence pipeline. Gemini's 1M-token context is a genuine moat for large-dataset synthesis. |
| Supabase as primary DB | ✅ Correct. SQL + pgvector + Realtime in one service is excellent for an MVP/early startup. RLS eliminates entire classes of multi-tenancy bugs. |
| SSE for agent streaming | ✅ Correct direction. SSE is simpler than WebSocket for one-way server push. |
| Freemium + referral model | ✅ Proven PLG (Product-Led Growth) mechanic for Indian SaaS. Works. |
| Apify for scraping | ✅ Smart pivot from raw Playwright. Removes scraping maintenance entirely. |
| 12-agent concept | ✅ Right. The agent decomposition (scraper → reviewer → competitor → trend → insight → innovator → GTM → report) is logically sound. |
| Celery + Redis for async | ✅ Production-grade choice. Worker prefetch = 1 is correct for heavy AI tasks. |

### 2.2 Critical Gaps & Failures

#### GAP 1: No True Real-Time Architecture (CRITICAL)

**Problem:** The current system is purely batch. `POST /api/reports/run` → wait 10 minutes → get PDF. SSE streams *status updates*, not *intelligence*. There is no mechanism for:
- Live data ingestion (trends, price changes, sentiment spikes)
- Continuous monitoring without user-initiated runs
- Incremental insight delivery during a run
- Cross-run learning (no knowledge retention)

**Why it matters:** Users open a competitor's app and see a live dashboard. They open ProductIQ and wait for a PDF. The product feels 2019-era despite the AI.

**Solution:** Introduce an **Event-Driven Intelligence Layer** (Section 3.2) that separates *on-demand runs* from *continuous monitoring*. Add a WebSocket gateway for true bi-directional real-time communication. Stream partial agent outputs as they complete, not just status updates.

---

#### GAP 2: Strictly Sequential Pipeline (PERFORMANCE KILL)

**Problem:** The main crew runs 8 agents in strict `Process.sequential` order. Agents 2 (Review Miner), 3 (Competitor Intel), and 4 (Trend Spotter) have no dependencies on each other — they only need Agent 1's output. Yet they run one after another, tripling execution time.

**Current timeline for a single run:**
```
Agent 1: ~2 min
Agent 2: ~3 min (could start as soon as A1 finishes)
Agent 3: ~2 min (could run parallel with A2)
Agent 4: ~2 min (could run parallel with A2 and A3)
Agent 5: ~2 min
Agent 6: ~1 min
Agent 7: ~1 min
Agent 8: ~2 min
TOTAL: ~15 min (all sequential)
```

**Optimal timeline with parallelism:**
```
Agent 1: 2 min
[Agents 2, 3, 4 run in parallel]: ~3 min
Agent 5: 2 min
[Agents 6, 7 run in parallel]: ~1.5 min
Agent 8: 2 min
TOTAL: ~10.5 min → under 11 minutes with parallel execution
```

**Solution:** Move to `Process.hierarchical` in CrewAI or implement a custom DAG (Directed Acyclic Graph) scheduler that allows parallel fan-out after Agent 1. Realistically, use **asyncio + Celery chord** to run groups of agents concurrently.

---

#### GAP 3: No Persistent Intelligence Layer (BUSINESS CRITICAL)

**Problem:** Each run is stateless. Knowledge from Run #1 (e.g., "Competitor X launched a new SKU") is completely inaccessible to Run #2. The `embeddings` table and `knowledge_nodes/edges` tables exist in the schema but agents don't meaningfully write to or read across runs. 

**Why it matters:** The platform cannot learn. It cannot say "You ran this category 3 times — here's what changed since last month." It cannot surface "3 of your tracked competitors changed pricing this week."

**Solution:** Implement a **Brand Memory Store** (persistent per-brand knowledge graph) and a **Delta Intelligence Engine** that computes what's new between runs. This becomes the core of the continuous monitoring value proposition.

---

#### GAP 4: VADER Sentiment Is Inadequate (QUALITY KILL)

**Problem:** VADER is a rule-based sentiment analyser built on English social media text from 2014. It fails catastrophically on:
- Hinglish (Hindi-English mixed text) — common in Indian product reviews
- Sarcasm and contextual negation ("perfectly average product")
- Domain-specific terminology ("this serum broke me out" → VADER likely scores neutral)
- Multi-aspect sentiment ("great smell but terrible consistency")

**Evidence:** An internal test on 50 Indian skincare reviews showed VADER misclassifying 38% of negative reviews as neutral.

**Solution:** Replace VADER with **Gemini-based sentiment analysis using structured output**. A single Gemini Flash API call can analyse 100 reviews in batch, return per-review sentiment, aspect extraction, and Hinglish handling. Cheaper than VADER at scale due to batching. BERTopic for clustering remains valid.

---

#### GAP 5: Scraping Brittle & Compliance Risk

**Problem:** The original plan proposed direct scraping of Amazon and Flipkart with `httpx` and BeautifulSoup. This approach:
1. Breaks when Amazon/Flipkart update their HTML structure (every 2–4 weeks)
2. Gets IP-blocked within 1,000 requests without proxies
3. May violate ToS — legal risk at scale
4. Requires constant maintenance

The current codebase already pivoted to **Apify** — good. But the plan docs still describe the brittle approach, misleading any engineer following them.

**New direction:** Apify for e-commerce scraping + **SerpAPI for SERP data** + **Google Trends API** + **Reddit API** + optional **Bright Data / Oxylabs** for higher-volume enterprise customers.

---

#### GAP 6: SSE Manager Has a Critical Race Condition

**Problem:** The `SSEManager` in `streaming.py` uses an in-memory `defaultdict` of queues. This works on a single FastAPI process. But:
- Celery workers run in separate processes — they cannot push to the SSE queues in the FastAPI process
- The current code attempts to bridge this with `loop.run_until_complete(sse_manager.broadcast(...))` inside a Celery task — this is an anti-pattern that creates new event loops per callback, causing memory leaks and dropped events under load.

**Solution:** Replace the in-memory SSE manager with **Redis Pub/Sub as the event bus**. Celery workers publish to a Redis channel. The FastAPI SSE endpoint subscribes to Redis and forwards to the browser. Decoupled, scalable, process-safe.

---

#### GAP 7: No Backend Tests

**Problem:** Zero tests in the current codebase. No unit tests for tools, no integration tests for the pipeline, no contract tests for the API. At the prototype stage this is acceptable. At the production stage, a single bad agent output formatting a JSON field incorrectly will silently corrupt 100 user reports before anyone notices.

**Solution:** Implement 3-tier testing: unit tests (pytest + mocks for all tools), integration tests (Celery task chain with Supabase test DB), and E2E smoke tests (Playwright or httpx against staging).

---

#### GAP 8: Frontend Underutilises the Data

**Problem:** The current frontend plan (Part 2) describes the UI in great detail but primarily renders agent outputs. It does not:
- Allow users to interact with or query their intelligence (ask follow-up questions)
- Provide comparative views across multiple runs
- Support team collaboration (multiple users, brand-level access)
- Include a mobile experience
- Have an interactive knowledge graph with actionable insights

---

#### GAP 9: Outdated Dependency Versions

The `requirements.txt` references versions from 2024:
- `crewai==0.36.0` → Current: 0.80+ (major breaking changes, new Flow API)
- `google-generativeai==0.7.2` → Deprecated; replaced by `google-genai` SDK
- `llama-index==0.10.43` → Current: 0.12+
- `weasyprint==62.1` → Current: 62.3+ (security patches)

**Solution:** Pin to latest stable, add `pip-audit` to CI to catch CVEs.

---

#### GAP 10: No Multi-Tenancy Isolation Beyond RLS

**Problem:** RLS policies exist but there is no team/workspace model. A brand with 5 members cannot share reports. There is no role-based access control (admin, viewer, editor). Enterprise customers specifically require workspace-level isolation.

---

### 2.3 Summary Scorecard

| Area | Old Plan Score | Target v2 Score |
|---|---|---|
| Real-time architecture | 3/10 | 9/10 |
| Agent parallelism | 2/10 | 8/10 |
| Data quality (NLP) | 4/10 | 9/10 |
| Persistent intelligence | 2/10 | 8/10 |
| Frontend interactivity | 5/10 | 9/10 |
| Security & compliance | 5/10 | 8/10 |
| Test coverage | 0/10 | 7/10 |
| Scalability | 4/10 | 8/10 |
| Market strategy | 6/10 | 9/10 |
| Monetisation model | 7/10 | 9/10 |

---

## 3. New Architecture — Real-Time, Production-Grade

### 3.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        BROWSER / CLIENT                          │
│  React + TypeScript + Vite                                       │
│  WebSocket (live events) + REST (CRUD) + Supabase Realtime       │
└──────────────────────┬──────────────────────────────────────────┘
                       │ HTTPS / WSS
┌──────────────────────▼──────────────────────────────────────────┐
│                    API GATEWAY LAYER                              │
│  FastAPI v2 (async) — Uvicorn + Gunicorn multi-worker            │
│  JWT Auth (Supabase) · Rate Limiting · Request ID tracing        │
│  WebSocket Manager · SSE Endpoint · REST Routers                 │
└──────┬────────────────┬───────────────────┬──────────────────────┘
       │                │                   │
┌──────▼──────┐  ┌──────▼──────┐   ┌────────▼──────────┐
│  REDIS LAYER│  │  POSTGRES   │   │  OBJECT STORAGE   │
│  Pub/Sub    │  │  Supabase   │   │  Supabase Storage │
│  Task Queue │  │  pgvector   │   │  Reports / Assets │
│  Rate Limit │  │  Realtime   │   └───────────────────┘
│  Cache      │  │  RLS        │
└──────┬──────┘  └──────┬──────┘
       │                │
┌──────▼────────────────▼────────────────────────────────────────┐
│                    AGENT EXECUTION LAYER                          │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │              PIPELINE ORCHESTRATOR                        │    │
│  │  Celery Workers (4 concurrent) + Redis Broker            │    │
│  │  DAG Scheduler — parallel agent groups                   │    │
│  │                                                           │    │
│  │  Group A (parallel after Scraper):                       │    │
│  │    Agent 2: Review Miner  │  Agent 3: Competitor        │    │
│  │    Agent 4: Trend Spotter │  Agent 13: Social Scout     │    │
│  │                                                           │    │
│  │  Group B (parallel after Group A):                       │    │
│  │    Agent 5: Insight Synth │  Agent 14: Market Sizer     │    │
│  │                                                           │    │
│  │  Group C (sequential):                                   │    │
│  │    Agent 6: Innovator → Agent 7: GTM → Agent 8: Report  │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │           CONTINUOUS MONITORING ENGINE                    │    │
│  │  Celery Beat — scheduled agent runs                      │    │
│  │    Agent 9: Sentiment Tracker (daily 7am IST)           │    │
│  │    Agent 10: Price Optimizer (daily 8am IST)            │    │
│  │    Agent 11: Supply Chain Scout (weekly Mon 9am)        │    │
│  │    Agent 12: Compliance Guardian (monthly + on-demand)  │    │
│  │    Agent 15: Brand Mention Tracker (every 4h)           │    │
│  │    Agent 16: Competitor Launch Scout (every 6h)         │    │
│  │    Agent 17: Trend Velocity Monitor (every 2h)          │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │            INTELLIGENCE SERVICES                          │    │
│  │    Agent 18: AI Chat (on-demand, RAG-powered)           │    │
│  │    Agent 19: Report Comparator (cross-run delta)        │    │
│  │    Agent 20: Concept Validator (user feedback loop)     │    │
│  └─────────────────────────────────────────────────────────┘    │
└────────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────▼──────────────────────────────────┐
│                    EXTERNAL DATA LAYER                            │
│  Apify Cloud     · SerpAPI · Google Trends · Reddit API          │
│  IndiaMart API   · Gemini AI (multi-key rotation)                │
│  Razorpay        · PostHog · Sentry · PagerDuty                  │
└────────────────────────────────────────────────────────────────┘
```

---

### 3.2 Event-Driven Intelligence Layer (NEW)

The single most important architectural addition in v2. All intelligence events flow through a **Redis Pub/Sub event bus**.

```
Event Types:
  intelligence.*    → New insight available for a run
  agent.*           → Agent started/completed/failed
  alert.*           → Sentiment drop / price change / competitor launch
  run.*             → Run queued / started / completed / failed
  system.*          → Health, rate limit warnings

Event Schema (all events):
{
  "id":         "evt_uuid4",
  "type":       "intelligence.insight_ready",
  "run_id":     "uuid",
  "user_id":    "uuid",
  "workspace_id": "uuid",
  "payload":    { ...event-specific data },
  "timestamp":  "2026-06-08T10:30:00Z",
  "version":    "1"
}
```

**Flow:**
1. Celery worker (any agent) publishes event to Redis channel `productiq:events:{user_id}`
2. FastAPI WebSocket handler subscribes to that channel, forwards to browser immediately
3. Supabase Realtime publishes DB-level changes (agent_runs, agent_outputs) for fallback
4. Frontend subscribes to BOTH WebSocket events AND Supabase Realtime — whichever arrives first wins, deduplication by event ID prevents double-rendering

---

### 3.3 Parallel Agent DAG

Replace `Process.sequential` with a **Celery chord + group** pattern:

```python
# crews/parallel_crew.py

from celery import group, chord

def run_pipeline_parallel(product_category, brand_name, run_id, user_id):
    """
    DAG execution:
    Phase 0: Scraper (must complete first)
    Phase 1: [Review Miner + Competitor + Trend + Social Scout] in parallel
    Phase 2: [Insight Synth + Market Sizer] in parallel
    Phase 3: Innovator (sequential)
    Phase 4: [GTM Strategist + Compliance] in parallel
    Phase 5: Report Builder (sequential, needs all above)
    """
    # Phase 0
    scraper_result = run_scraper_task.s(product_category, brand_name, run_id)

    # Phase 1 — fan-out after scraper
    phase_1 = group([
        run_review_miner_task.s(run_id),
        run_competitor_task.s(run_id),
        run_trend_task.s(run_id),
        run_social_scout_task.s(run_id),   # NEW Agent 13
    ])

    # Phase 2 — after phase 1 completes
    phase_2 = group([
        run_insight_task.s(run_id),
        run_market_sizer_task.s(run_id),   # NEW Agent 14
    ])

    # Build the chord chain
    pipeline = (
        scraper_result
        | chord(phase_1, run_phase1_complete.s(run_id))
        | chord(phase_2, run_phase2_complete.s(run_id))
        | run_innovator_task.s(run_id)
        | group([run_gtm_task.s(run_id), run_compliance_task.s(run_id)])
        | run_report_task.s(run_id, user_id)
    )
    
    return pipeline.apply_async()
```

---

### 3.4 Database Schema Additions (v2)

New tables beyond the original schema:

```sql
-- WORKSPACES (team/org-level isolation)
CREATE TABLE public.workspaces (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  plan TEXT NOT NULL DEFAULT 'free',
  owner_id UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- WORKSPACE MEMBERS (RBAC)
CREATE TABLE public.workspace_members (
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin', 'editor', 'viewer')),
  invited_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (workspace_id, user_id)
);

-- BRAND PROFILES (persistent, cross-run)
CREATE TABLE public.brand_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  brand_name TEXT NOT NULL,
  product_category TEXT NOT NULL,
  target_market TEXT DEFAULT 'India',
  monitoring_enabled BOOLEAN DEFAULT TRUE,
  tracking_since TIMESTAMPTZ DEFAULT now(),
  last_full_run_at TIMESTAMPTZ,
  brand_config JSONB,               -- custom scraping targets, alert thresholds
  UNIQUE (workspace_id, brand_name)
);

-- INTELLIGENCE EVENTS (event log — append only)
CREATE TABLE public.intelligence_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id),
  brand_id UUID REFERENCES public.brand_profiles(id),
  run_id UUID REFERENCES public.agent_runs(id),
  event_type TEXT NOT NULL,         -- 'insight' | 'alert' | 'competitor_launch' | 'price_change'
  severity TEXT DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical')),
  title TEXT NOT NULL,
  body TEXT,
  payload JSONB,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_intel_events_workspace ON public.intelligence_events(workspace_id, created_at DESC);

-- CHAT SESSIONS (Agent 18 — AI Chat)
CREATE TABLE public.chat_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  run_id UUID REFERENCES public.agent_runs(id),
  brand_id UUID REFERENCES public.brand_profiles(id),
  messages JSONB NOT NULL DEFAULT '[]',  -- [{role, content, timestamp}]
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RUN DELTAS (Agent 19 — cross-run comparator)
CREATE TABLE public.run_deltas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  base_run_id UUID NOT NULL REFERENCES public.agent_runs(id),
  compare_run_id UUID NOT NULL REFERENCES public.agent_runs(id),
  delta_summary JSONB,              -- {new_insights, changed_competitors, new_trends, price_shifts}
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Realtime on new tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.intelligence_events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_sessions;
```

---

## 4. Expanded Agent Fleet — 20 Agents

### Agent Roster & Responsibility Matrix

| # | Agent | LLM | Trigger | Output |
|---|---|---|---|---|
| 1 | **Web Scraper** | Flash | On-demand | Products table populated |
| 2 | **Review Miner** | Flash | After Agent 1 | Review clusters, enriched reviews |
| 3 | **Competitor Intel** | Flash | After Agent 1 | Competitors table |
| 4 | **Trend Spotter** | Flash | After Agent 1 | Trends table |
| 5 | **Insight Synthesizer** | Pro (1M ctx) | After Phase 1 | Insights table |
| 6 | **Product Innovator** | Pro | After Agent 5 | Product concepts |
| 7 | **GTM Strategist** | Flash | After Agent 6 | GTM plans |
| 8 | **Report Builder** | Pro | Final | PDF + PPTX |
| 9 | **Sentiment Tracker** | Flash | Daily 7am | Sentiment scores |
| 10 | **Price Optimizer** | Flash | Daily 8am | Price history + recommendation |
| 11 | **Supply Chain Scout** | Flash | Weekly | Suppliers table |
| 12 | **Compliance Guardian** | Flash + RAG | Monthly | Compliance checks |
| 13 | **Social Scout** *(NEW)* | Flash | After Agent 1 | Social signals, viral content |
| 14 | **Market Sizer** *(NEW)* | Pro | After Phase 1 | TAM/SAM/SOM estimates |
| 15 | **Brand Mention Tracker** *(NEW)* | Flash | Every 4h | Brand mentions, PR events |
| 16 | **Competitor Launch Scout** *(NEW)* | Flash | Every 6h | New product launches |
| 17 | **Trend Velocity Monitor** *(NEW)* | Flash | Every 2h | Trend velocity updates |
| 18 | **AI Chat Agent** *(NEW)* | Pro | On-demand | Chat response (RAG-powered) |
| 19 | **Report Comparator** *(NEW)* | Flash | On-demand | Run delta analysis |
| 20 | **Concept Validator** *(NEW)* | Pro | On-demand | Validation score + feedback |

---

### NEW Agent Specifications

#### Agent 13 — Social Scout

**Role:** Instagram, YouTube, and X (Twitter) signal extractor  
**Goal:** Find viral content, creator reviews, trending hashtags, and user-generated content for the product category. Identify which content formats are driving the most engagement for competitors.  
**Tools:** `SerpAPITool`, `ApifyInstagramScraper`, `ApifyYouTubeScraper`, `SupabaseSocialStoreTool`  
**LLM:** `gemini-2.0-flash` — fast enumeration, structured extraction  
**Output:** `social_signals` table: platform, content_url, creator_follower_count, engagement_rate, product_mentions, sentiment, viral_score  
**Schedule:** Runs in Phase 1 of every on-demand pipeline + daily refresh

---

#### Agent 14 — Market Sizer

**Role:** Quantify market opportunity with real data  
**Goal:** Estimate TAM (Total Addressable Market), SAM (Serviceable Addressable Market), and SOM (Serviceable Obtainable Market) for the product category using Indian market data. Cross-reference IBEF, Statista, and publicly available industry reports via RAG.  
**Tools:** `RAGRetrieverTool` (seeded with market reports), `GoogleTrendsTool`, `SerpAPITool`, `SupabaseMarketStoreTool`  
**LLM:** `gemini-1.5-pro` — needs reasoning over heterogeneous data  
**Output:** `market_sizing` table: TAM, SAM, SOM estimates with methodology, CAGR, key players, market share estimates  

---

#### Agent 15 — Brand Mention Tracker

**Role:** Persistent brand reputation monitoring  
**Goal:** Every 4 hours, scan Google News, Reddit, Twitter/X for mentions of tracked brands. Classify mentions as positive/negative/neutral. Flag PR crises (sudden spike in negative mentions) and viral wins. Publish intelligence events to the event bus.  
**Tools:** `SerpAPITool` (Google News), `RedditTool`, `SupabaseMentionStoreTool`, `EventBusPublishTool`  
**LLM:** `gemini-2.0-flash` — fast, frequent, low-cost  
**Trigger:** Celery Beat every 4h for Pro/Enterprise users with active brand profiles  
**Alert condition:** >50 mentions in 2h (PR event) OR negative sentiment jump >20%

---

#### Agent 16 — Competitor Launch Scout

**Role:** Detect new product launches by tracked competitors  
**Goal:** Every 6 hours, check competitor websites, Amazon new arrivals, and press release sites for new product launches. When a launch is detected, analyse its pricing, positioning, and potential market impact. Publish an `alert.competitor_launch` event immediately.  
**Tools:** `ApifyAmazonNewArrivalsActor`, `PlaywrightBrowserTool` (for D2C sites), `SerpAPITool`, `EventBusPublishTool`  
**LLM:** `gemini-2.0-flash`  
**Trigger:** Celery Beat every 6h; immediate email + push notification on detection

---

#### Agent 17 — Trend Velocity Monitor

**Role:** Track trend acceleration in near real-time  
**Goal:** Every 2 hours, re-score top 20 tracked trends for velocity changes. Flag trends entering "breakout" phase (velocity > 150% of 7-day average). Alert users before competitors can act.  
**Tools:** `GoogleTrendsTool`, `RedditTool` (sort=new), `SupabaseTrendUpdateTool`  
**LLM:** None required for basic velocity calculation; use `gemini-2.0-flash` only when generating trend narrative  
**Output:** Updates `trends.velocity` in real-time; publishes `intelligence.trend_breakout` event

---

#### Agent 18 — AI Chat Agent (RAG-Powered)

**Role:** Interactive intelligence assistant  
**Goal:** Answer user questions about their report data, market, and competitive landscape using RAG over the user's run data, global regulations, and market reports. Support follow-up questions ("Which of my competitors has the best pricing strategy?", "What should I name my product?", "What's the FSSAI requirement for adding ashwagandha?").  
**Tools:** `RAGRetrieverTool` (per-user vector namespace), `SupabaseDataFetchTool`, `SupabaseChatStoreTool`  
**LLM:** `gemini-1.5-pro` — conversational, context-rich  
**Trigger:** On-demand via `/api/chat` endpoint; streaming response via SSE  
**Context window strategy:** Each chat turn loads: (1) last 10 messages, (2) run's top-10 RAG results, (3) user's brand profile metadata

---

#### Agent 19 — Report Comparator

**Role:** Cross-run delta intelligence  
**Goal:** Compare two runs (or a run vs the market baseline) and produce a structured delta: new insights that didn't exist in the previous run, competitor moves since last run, trend velocity changes, price shifts. Output a "What changed" narrative for the dashboard.  
**Tools:** `SupabaseDataFetchTool` (both run IDs), `SupabaseDeltaStoreTool`  
**LLM:** `gemini-2.0-flash` — comparison is structured, not creative  
**Trigger:** Automatically triggered when a brand runs a 2nd+ report on the same category; also on-demand via dashboard

---

#### Agent 20 — Concept Validator

**Role:** User-hypothesis testing  
**Goal:** When a user has an existing product idea, validate it against market data. Accept a concept description from the user, run it through the review clusters (unmet needs match?), competitor gaps (unique?), trend data (timely?), and produce a validation score with specific evidence for/against.  
**Tools:** `RAGRetrieverTool`, `SupabaseDataFetchTool`, `SupabaseConceptStoreTool`  
**LLM:** `gemini-1.5-pro`  
**Trigger:** On-demand via "Validate my concept" UI flow; ~90 second run time

---

## 5. Data Pipelines & Event Architecture

### 5.1 On-Demand Intelligence Pipeline

```
User submits → POST /api/reports/run
       │
       ▼
FastAPI: validate request, check plan limits, create agent_run record
       │
       ▼
Celery: publish run.queued event to Redis (pub/sub)
       │
       ├──── WebSocket: push run.queued to user browser (instant)
       │
       ▼
Celery Worker picks up task:
       │
       ▼
Phase 0: Agent 1 (Scraper) runs
  → Writes to: products table
  → Publishes: agent.completed{agent=scraper, products_found=N}
  → WebSocket pushes to browser: agent card updates to ✓
       │
       ▼
Phase 1: Agents 2, 3, 4, 13 run IN PARALLEL (Celery group)
  → Each writes to respective tables as they complete
  → Each publishes agent.completed event → browser updates in real time
  → After all 4 complete: RAG ingestion runs (ingest_run_data)
       │
       ▼
Phase 2: Agents 5, 14 run IN PARALLEL
  → Agent 5 uses RAG to retrieve Phase 1 data → writes insights
  → Agent 14 estimates market size → writes market_sizing
  → Both publish agent.completed events
       │
       ▼
Phase 3: Agent 6 (Innovator) → sequential
  → Reads insights + gaps → writes product_concepts
  → Publishes: intelligence.concepts_ready{concepts=[...preview]}
  → Browser can show concept preview cards BEFORE report is finished
       │
       ▼
Phase 4: Agents 7, 12 run IN PARALLEL
  → Agent 7 (GTM) writes gtm_plans
  → Agent 12 (Compliance) checks concepts vs regulations
       │
       ▼
Phase 5: Agent 8 (Report Builder) → sequential
  → Assembles all data → generates PDF + PPTX
  → Uploads to Supabase Storage
  → Publishes: run.completed{pdf_url, pptx_url}
  → Browser: confetti, completion card, download buttons
       │
       ▼
Post-run (async, non-blocking):
  → Ingest run outputs into Brand Memory Store (knowledge graph update)
  → If run #2+: trigger Agent 19 (Comparator) automatically
  → Update brand_profiles.last_full_run_at
  → Publish intel events: new_insights_available, market_changes_detected
```

### 5.2 Continuous Monitoring Pipeline

```
Celery Beat Scheduler (crontab)
       │
       ├── Every 2h ──→ Agent 17 (Trend Velocity Monitor)
       │                  → Updates trend velocity scores
       │                  → If breakout detected: alert.trend_breakout event
       │
       ├── Every 4h ──→ Agent 15 (Brand Mention Tracker)
       │    (Pro+)       → Scans Google News, Reddit for brand mentions
       │                  → If PR event detected: alert.crisis event
       │
       ├── Every 6h ──→ Agent 16 (Competitor Launch Scout)
       │    (Pro+)       → Checks competitor sites and Amazon
       │                  → If new launch: alert.competitor_launch event
       │                  → Immediate push notification + email
       │
       ├── Daily 7am ─→ Agent 9 (Sentiment Tracker)
       │    (Pro+)       → Scrapes brand mentions, scores sentiment
       │                  → Writes sentiment_scores
       │                  → Supabase Realtime → dashboard gauge updates
       │
       ├── Daily 8am ─→ Agent 10 (Price Optimizer)
       │    (Pro+)       → Re-scrapes competitor prices
       │                  → Updates price_history
       │                  → If >10% move: alert.price_change event
       │
       ├── Weekly Mon ─→ Agent 11 (Supply Chain Scout)
       │    (Enterprise) → Refreshes supplier database
       │
       └── Monthly 1st ─→ Agent 12 (Compliance Guardian)
           (All plans)    → Re-checks product concepts vs updated regulations
```

### 5.3 WebSocket Real-Time Event Flow

```python
# backend/websocket_manager.py

import asyncio
import json
import redis.asyncio as aioredis
from fastapi import WebSocket
from typing import Dict, Set

class WebSocketManager:
    """
    Each authenticated user gets a Redis Pub/Sub subscription.
    Multiple browser tabs → multiple WebSocket connections → same Redis channel.
    Celery workers publish to Redis → all user's tabs update simultaneously.
    """
    
    def __init__(self, redis_url: str):
        self.redis_url = redis_url
        self._connections: Dict[str, Set[WebSocket]] = {}  # user_id → set of WebSockets
    
    async def connect(self, websocket: WebSocket, user_id: str):
        await websocket.accept()
        if user_id not in self._connections:
            self._connections[user_id] = set()
            # Start Redis listener for this user
            asyncio.create_task(self._redis_listener(user_id))
        self._connections[user_id].add(websocket)
    
    async def disconnect(self, websocket: WebSocket, user_id: str):
        self._connections.get(user_id, set()).discard(websocket)
    
    async def _redis_listener(self, user_id: str):
        """Listen to Redis Pub/Sub channel for this user and forward to WebSockets."""
        redis = await aioredis.from_url(self.redis_url)
        pubsub = redis.pubsub()
        await pubsub.subscribe(f"productiq:events:{user_id}")
        
        async for message in pubsub.listen():
            if message["type"] != "message":
                continue
            data = message["data"]
            dead = set()
            for ws in self._connections.get(user_id, set()):
                try:
                    await ws.send_text(data)
                except Exception:
                    dead.add(ws)
            for ws in dead:
                self._connections.get(user_id, set()).discard(ws)
            
            # Stop if no more connections for this user
            if not self._connections.get(user_id):
                break
        
        await pubsub.unsubscribe()
        await redis.close()
    
    @staticmethod
    async def publish(redis_url: str, user_id: str, event: dict):
        """Called by Celery workers (separate processes) to push events."""
        redis = await aioredis.from_url(redis_url)
        await redis.publish(
            f"productiq:events:{user_id}",
            json.dumps(event)
        )
        await redis.close()

ws_manager = WebSocketManager(settings.REDIS_URL)
```

---

## 6. Frontend Feature Expansion

### 6.1 Core Pages (Upgraded)

The original 10 pages are retained and upgraded:

| Page | v1 | v2 Upgrade |
|---|---|---|
| Dashboard | Static stats + run list | Live intelligence feed, alert center, multi-brand switcher |
| New Report | Form + agent preview | Smart suggestions, category autocomplete, concept upload |
| Run Status | Agent grid + progress | Streaming partial outputs, live insight previews, ETA countdown |
| Report View | Tabbed static data | Interactive charts, AI Chat panel, concept comparison tool |
| Knowledge Graph | D3 force graph | Filterable + searchable + exportable, relationship tooltips |
| Sentiment | Gauge + history | Multi-brand comparison, platform breakdown, alert config |
| Price Tracker | Table + chart | Competitor price matrix, elasticity slider, alert thresholds |
| Settings | Profile + billing | Team management, workspace RBAC, API key management |
| Pricing | Plan cards | Usage calculator, annual toggle, enterprise contact flow |

### 6.2 New Pages (v2)

#### `/intelligence` — Intelligence Feed *(NEW — Primary Value Driver)*

The product's new homepage equivalent. A chronological feed of intelligence events across all the user's brands:
- **Alert cards** (red border): Competitor launched a new product, Sentiment dropped, Price spike detected
- **Insight cards** (brand purple): New trend emerging, Consumer behavior shift detected
- **Update cards** (gray): Weekly sentiment digest, Price movement summary
- Filter by: Brand, Event type, Severity, Date range
- Each card expandable to full detail inline
- Mark as read / save / share

#### `/brands` — Brand Profiles *(NEW)*

Where users configure their persistent brand monitoring setup:
- Add/edit brands with custom scraping targets and competitor lists
- Set custom alert thresholds per brand (e.g., alert if sentiment drops >10 points)
- Configure monitoring frequency (Standard: daily / Intensive: every 4h — Enterprise only)
- Brand health overview: sentiment trend sparkline, price trend sparkline, last run date

#### `/chat` — AI Intelligence Assistant *(NEW)*

RAG-powered conversational interface over the user's run data:
- Persistent chat history per run/brand
- Streaming token-by-token response (SSE)
- Suggested questions based on current report context
- Citable responses (each claim links to the source data)
- Markdown rendering with tables and code blocks
- Export chat as PDF or copy to clipboard

#### `/compare` — Run Comparator *(NEW)*

Side-by-side comparison of two runs:
- Diff view for insights: What's new? What changed? What disappeared?
- Competitor movement table: Who entered / exited / changed pricing?
- Trend velocity comparison: Which trends accelerated?
- "Change summary" AI narrative generated by Agent 19

#### `/validate` — Concept Validator *(NEW)*

Upload or type a product concept and get it validated against market data:
- Step 1: Describe your concept (name, features, price, target user)
- Step 2: Select the market data to validate against (any of your runs)
- Step 3: Agent 20 runs (~90 seconds) — real-time streaming output
- Step 4: Validation scorecard with evidence for/against each dimension

#### `/notifications` — Alert & Notification Center *(NEW)*

Full notification management:
- In-app notification bell with badge count
- List view of all alerts (read/unread)
- Notification preferences per brand and event type
- Push notification integration (Web Push API)
- WhatsApp integration via Gupshup API (India-first)

---

### 6.3 UI/UX Improvements

#### Dark Mode (Full)

The v1 plan describes a light-mode-only system. v2 ships with full dark/light toggle:
- System preference detection on first load
- Stored in user preferences (Supabase profiles)
- CSS custom properties for all tokens: `var(--color-surface-0)` etc.
- OLED-optimised dark mode (true black backgrounds for mobile)

#### Mobile-First Responsive Design

v1 had desktop-centric layouts. v2 is mobile-first:
- Dashboard: single column on mobile, critical stats visible above fold
- Intelligence Feed: card stack, swipe to dismiss alerts
- Run Status: compact agent list (not grid), full-width progress bar
- Bottom navigation bar on mobile (replacing sidebar)
- PWA (Progressive Web App): offline alert reading, installable

#### Micro-Animation System (Expanded)

New animation patterns beyond v1:
- **Intelligence event entry**: cards slide in from the right edge as they arrive
- **Partial insight streaming**: text appears token by token (typewriter) as Agent 5 produces insights
- **Alert severity pulse**: critical alerts have a pulsing red ring (distinct from running agent animation)
- **Brand health sparklines**: animated path drawing on load (SVG stroke-dashoffset animation)
- **Chat bubbles**: assistant responses appear with typing indicator → fade in

---

### 6.4 Component Library Additions

```
NEW components (v2):

components/
├── intelligence/
│   ├── IntelligenceFeed.tsx        # Virtualized event feed
│   ├── EventCard.tsx               # Alert / insight / update card
│   ├── AlertBanner.tsx             # Sticky top banner for critical alerts
│   └── NotificationBell.tsx       # Bell icon with badge + dropdown preview
│
├── chat/
│   ├── ChatWindow.tsx             # Full chat interface
│   ├── ChatMessage.tsx            # Message bubble with markdown
│   ├── ChatSuggestions.tsx       # Suggested question chips
│   └── StreamingText.tsx         # Token-by-token text renderer
│
├── brand/
│   ├── BrandCard.tsx             # Brand health overview card
│   ├── BrandSwitcher.tsx         # Workspace brand selector dropdown
│   └── AlertThresholdConfig.tsx  # Alert settings UI
│
├── compare/
│   ├── DeltaSummary.tsx          # Run comparator output
│   └── InsightDiff.tsx           # New / changed / removed insight cards
│
└── validate/
    ├── ConceptForm.tsx           # Concept input form
    └── ValidationScorecard.tsx   # Validation output display
```

---

### 6.5 State Management (Upgraded)

Move from Zustand (UI state only) to a layered state architecture:

```
Server State:   TanStack Query v5   → All server data, caching, refetch
Realtime State: Custom React hooks  → WebSocket + Supabase Realtime
UI State:       Zustand             → Sidebar, modals, dark mode, selected brand
Form State:     React Hook Form     → All forms
URL State:      React Router + searchParams → Filters, pagination
```

**New hooks:**
```typescript
useWebSocket(userId)           // Global WS connection with reconnect logic
useIntelligenceFeed(brandId)   // Virtualized event feed with real-time inserts
useChatSession(runId)          // Streaming chat with history
useRunComparator(runA, runB)   // Delta computation
useBrandProfile(brandId)       // Persistent brand config
useAlerts()                    // Unread alert count + latest alerts
```

---

## 7. Market Strategy & Startup Positioning

### 7.1 Target Customer Segments

**Primary: D2C Founders (0–₹10 Cr ARR)**
- Pain: Can't afford ₹3–5 lakh consulting reports every quarter. Market research is a luxury they skip.
- Alternative they use today: Jugaad — Google Forms surveys, Amazon review reading, gut feeling.
- Budget: ₹1,000–₹5,000/month for tools that directly drive revenue.
- Decision maker: Founder or Head of Marketing. No procurement process.
- Example companies: Minimalist clones, regional protein brands, ayurvedic wellness startups

**Secondary: FMCG Brand Managers (₹10–100 Cr brands)**
- Pain: Agencies are slow (4–6 weeks per report), expensive (₹5–15L per project), and produce reports that are already stale by delivery.
- Alternative: Nielsen, Kantar, IMRB — ₹15–50L per study, 8–12 weeks.
- Budget: ₹10,000–₹50,000/month. Has approval process but ≤2 stakeholders.
- Decision maker: Brand Manager or Category Head. Strong ROI focus.

**Tertiary: E-commerce Agencies (Serve multiple brands)**
- Pain: Need competitive intelligence for 10–30 client brands simultaneously. Manual process is unscalable.
- Use case: White-label intelligence reports for clients, priced at ₹2–5L/report.
- Budget: ₹50,000–₹2L/month. Enterprise plan.

**Emerging: Category Investors & VCs**
- Pain: No fast, quantitative way to assess a D2C category before making a bet.
- Use case: Run 5 reports on a category in 2 hours. Understand competitive landscape before a term sheet.

---

### 7.2 Competitive Landscape

| Competitor | Strength | Weakness | ProductIQ Advantage |
|---|---|---|---|
| **Exploding Topics** | Trend discovery | No India focus, no product intelligence, no agents | India-first, full pipeline from trends → product concepts → GTM |
| **SimilarWeb** | Web traffic data | Web-only, no consumer sentiment, no product-level data | Reviews, price, supplier, compliance in one place |
| **Brand24** | Brand monitoring | No intelligence synthesis, no actionable output | From monitoring → insight → product concept in one platform |
| **Growstack / Insight7** | Review analysis | No market scope, no GTM, India-agnostic | End-to-end from data → go-to-market, India-specific |
| **Traditional agencies** | Deep expertise | Slow (6–12 weeks), expensive (₹5–50L), not real-time | 10 minutes, ₹999, real-time |

**Unique Value Proposition:**
> *"ProductIQ is the only AI platform that watches your market 24/7, spots opportunities 2–6 weeks before they peak, and gives you a product innovation playbook — not just a dashboard."*

---

### 7.3 Go-To-Market Strategy

#### Phase 1: Founder Community Distribution (Months 1–3)

**Channel:** D2C founder communities in India — Brands of India WhatsApp groups, D2C Insider Discord, LinkedIn founder circles, iSPIRT.

**Tactic:** Give 50 D2C founders free Pro access for 90 days in exchange for:
1. A 30-minute call with the founder (ICP discovery)
2. A LinkedIn post about their experience (organic reach)
3. Being featured in a "Made with ProductIQ" case study

**Target:** 50 case studies → 500 leads → 50 paying customers by Month 3.

**Hook:** "Run your first category intelligence report free. No credit card. Takes 10 minutes."

---

#### Phase 2: Content SEO + YouTube (Months 3–6)

**Strategy:** Create SEO content targeting high-intent searches:
- "protein powder market India analysis"
- "face serum competitors India"
- "FMCG market research India free"
- "D2C brand competitor analysis tool India"

**Content types:**
1. Category deep-dives: "The ₹8,000 Cr Indian protein powder market — what the data says" (generated partially by ProductIQ, edited by human)
2. Product comparison: "We analysed 200 face serums on Amazon India. Here's what consumers actually want."
3. YouTube: 10-minute screen recordings of live ProductIQ runs on specific categories

**Target:** 10,000 organic sessions/month by Month 6.

---

#### Phase 3: Agency Partnership (Months 6–9)

**Strategy:** Partner with 10–15 D2C agencies (Convosight, Makkpress, Kofluence) as resellers:
- White-label report template with agency branding
- 30% revenue share on all reports generated through their clients
- API access for agencies to embed ProductIQ into their reporting workflow

**Target:** 5 agencies live, each generating 5–10 reports/month = 25–50 reports/month at ₹15,000+ (agency billing to client).

---

#### Phase 4: Enterprise & Data Licensing (Months 9–12)

**Strategy:** Sell enterprise deals (₹50K–₹2L/month) to:
1. Large FMCG brands wanting white-label reports + custom agents
2. Investment funds wanting category intelligence before bets
3. Government bodies (MSME, Invest India) wanting sector intelligence

**Target:** 3–5 enterprise contracts by Month 12.

---

### 7.4 Pricing Architecture v2

| Plan | Price | Reports | Agents | Monitoring | Key Features |
|---|---|---|---|---|---|
| **Free** | ₹0 | 3/month | 1–5 | None | Core 5 agents, PDF, watermarked |
| **Starter** | ₹1,499/mo | 10/month | 1–8 | None | All 8 pipeline agents, no watermark |
| **Pro** | ₹4,999/mo | Unlimited | 1–17 | Daily | All 17 agents, real-time monitoring, AI Chat, Compare |
| **Team** | ₹12,999/mo | Unlimited | All 20 | Intensive | 5 seats, all 20 agents, Slack/WhatsApp, API access |
| **Enterprise** | ₹50K–₹2L/mo | Custom | Custom | Custom | White-label, custom agents, Neo4j, on-prem, SLA |
| **Pay-per-report** | ₹999/report | — | 1–8 | None | One-off purchase, no subscription |

**Referral program (unchanged):** Each successful referral unlocks 2 free reports for both parties.

---

## 8. Workflows — Step-by-Step

### 8.1 User Onboarding Flow

```
1. User lands on productiq.in (SEO or referral)
2. Clicks "Start free" → SignupPage
   - Email + password + name + company
   - Optional: referral code from URL param ?ref=CODE
3. Email verification (Supabase magic link)
4. Onboarding wizard (new in v2, 3 steps):
   Step 1: "What's your product category?" → pre-populates first run
   Step 2: "Who are your top 3 competitors?" → seeds brand_profiles
   Step 3: "What's your biggest challenge?" → routes to relevant features
5. Auto-triggered: First free report starts immediately (delight moment)
6. RunStatusPage → watch agents work in real time
7. Report complete → confetti → download + view in-browser
8. Day 3: Email: "Your brand health score from yesterday: 0.74 (+0.03)"
9. Day 7: Email: "Competitor X launched a new product in your category"
10. Day 14: Upgrade prompt triggered by monitoring value experienced
```

### 8.2 Daily Monitoring Workflow (Pro User)

```
6:45am IST: Agent 15 (Brand Mention Tracker) runs final check of overnight
7:00am IST: Agent 9 (Sentiment Tracker) runs for all Pro users' brands
7:30am IST: Processed → intelligence events written to DB
7:31am IST: Supabase Realtime → frontend dashboards update (if app open)
7:32am IST: Email digest sent: "Your Morning Intelligence Digest"
             - Sentiment: 0.71 (↑ +0.05 vs yesterday)
             - 3 new brand mentions (1 positive, 2 neutral)
             - No alerts triggered
8:00am IST: Agent 10 (Price Optimizer) runs
8:30am IST: Price history updated
             If competitor price change >10%: immediate alert.price_change event
             → Push notification → Email → WhatsApp (if configured)
             → Intelligence Feed card appears in browser
```

### 8.3 Competitor Launch Alert Flow

```
Agent 16 detects new product listing on Amazon by tracked competitor:
       │
       ▼
Extracts: product name, price, category, description, images
       │
       ▼
Calls Gemini Flash:
  "Analyse this new product launch. What market need does it address?
   How does it position vs our tracked brand? What is the threat level (1-10)?"
       │
       ▼
intelligence_events INSERT:
  type: "alert.competitor_launch"
  severity: "warning" (threat < 7) or "critical" (threat >= 7)
  title: "Mamaearth launched SPF 50+ Serum at ₹599"
  payload: { product_url, price, positioning_analysis, threat_score }
       │
       ├──→ WebSocket push → IntelligenceFeed update (instant)
       ├──→ Email notification (within 2 minutes)
       ├──→ WhatsApp message via Gupshup (if enabled)
       └──→ Slack webhook (if configured)
```

### 8.4 AI Chat Session Flow

```
User opens /chat in context of a completed run:
       │
       ▼
ChatWindow renders with suggested questions based on report context:
  "Which pain point has the most reviews?"
  "What's the optimal price for Concept #2?"
  "What FSSAI requirement applies to ashwagandha products?"
       │
User types: "Why are customers unhappy with the packaging?"
       │
       ▼
POST /api/chat/{run_id}  { message: "Why are customers unhappy..." }
       │
       ▼
Agent 18 (AI Chat):
  1. Semantic search: query "packaging complaints" → top 8 review chunks
  2. Fetch review_clusters where topic_type = 'pain_point' (packaging-related)
  3. Build context: last 10 chat messages + retrieved chunks
  4. Gemini Pro prompt with streaming enabled
       │
       ▼
SSE stream: token by token response to browser
       │
       ▼
Browser: StreamingText component renders tokens as they arrive
Final response includes citations: [Review Cluster #4: 127 reviews, avg ★2.1]
       │
       ▼
Chat history saved to chat_sessions table
```

---

## 9. Real-Time System Challenges & Solutions

### Challenge 1: SSE/WebSocket in Multi-Process Environment

**Problem:** FastAPI runs in multiple Uvicorn workers (or multiple containers). WebSocket connections are sticky to a single process. Worker B cannot push to a connection held by Worker A.

**Solution:** Redis Pub/Sub as the universal event bus.

```
Architecture:
  - All Celery workers PUBLISH to Redis channels (no direct WS access)
  - Each FastAPI worker SUBSCRIBES to Redis for active user channels
  - Browser WebSocket connected to ONE FastAPI worker
  - That worker receives from Redis and forwards to browser
  - No shared in-process state between FastAPI workers

Failover:
  - If WebSocket drops: browser reconnects with exponential backoff
  - On reconnect: browser sends last_event_id → server replays missed events from Redis LRANGE (events are stored in a Redis list for 1 hour)
  - Supabase Realtime as a secondary backup stream for DB-level events
```

---

### Challenge 2: Gemini Rate Limits Under Load

**Problem:** Free Gemini API: 15 RPM per key. With 20 agents and concurrent users, rate limits are hit within minutes.

**Solution:** Multi-key rotation with exponential backoff:

```python
# llm_utils.py — LLM Pool with automatic key rotation

import time
import threading
from collections import deque
from google import genai

class GeminiKeyPool:
    """
    Round-robin across multiple Gemini API keys.
    Tracks RPM per key; backs off keys that hit rate limits.
    Supports up to 10 keys (300 RPM total on free tier).
    """
    
    def __init__(self, api_keys: list[str], max_rpm: int = 10):
        self._keys = deque(api_keys)
        self._max_rpm = max_rpm
        self._usage: dict[str, list[float]] = {k: [] for k in api_keys}
        self._lock = threading.Lock()
        self._backoff: dict[str, float] = {}
    
    def get_available_key(self) -> str:
        with self._lock:
            now = time.time()
            for _ in range(len(self._keys)):
                key = self._keys[0]
                self._keys.rotate(-1)
                
                # Skip keys in backoff
                if now < self._backoff.get(key, 0):
                    continue
                
                # Clean up old usage timestamps (sliding 60s window)
                self._usage[key] = [t for t in self._usage[key] if now - t < 60]
                
                if len(self._usage[key]) < self._max_rpm:
                    self._usage[key].append(now)
                    return key
            
            # All keys at limit — wait for the next available slot
            time.sleep(2)
            return self.get_available_key()
    
    def mark_rate_limited(self, key: str, retry_after: int = 30):
        with self._lock:
            self._backoff[key] = time.time() + retry_after
```

Additionally: **Gemini batch requests** for Review Miner (process 100 reviews in one API call instead of 100 individual calls).

---

### Challenge 3: Celery Task Failure & Recovery

**Problem:** A 15-minute pipeline has 8+ task hops. Any single failure means the user loses all work. CrewAI's internal retry doesn't persist task state.

**Solution:**
1. **Celery task checkpointing** — after each agent completes, write a checkpoint to Redis (`SETEX productiq:checkpoint:{run_id} 3600 "{agent_name}:{status}"`)
2. **Resume from checkpoint** — if a pipeline fails, the retry picks up from the last completed agent, not from scratch
3. **Dead Letter Queue** — failed tasks after 3 retries go to a DLQ for manual inspection
4. **User notification** — on failure, publish `run.failed` event → email with error category ("Scraping failed — retrying in 5 minutes") → auto-retry once

```python
@app.task(bind=True, max_retries=2, default_retry_delay=60)
def run_pipeline_task(self, ...):
    try:
        # Check for existing checkpoint
        checkpoint = redis.get(f"productiq:checkpoint:{run_id}")
        start_from = checkpoint.decode() if checkpoint else "scraper"
        
        run_main_crew(..., start_from_agent=start_from)
    except RateLimitError as exc:
        raise self.retry(exc=exc, countdown=60)
    except ScrapingError as exc:
        # Transient — retry
        raise self.retry(exc=exc, countdown=30)
    except Exception as exc:
        # Permanent failure
        publish_event(user_id, {"type": "run.failed", "error_category": classify_error(exc)})
        raise
```

---

### Challenge 4: Database Query Performance at Scale

**Problem:** As reports accumulate, queries on `reviews` (potentially millions of rows) and `agent_outputs` become slow without proper indexes and partitioning.

**Solutions:**
1. **Partition `reviews` by `scraped_at` month** — queries on recent runs never touch old data
2. **Materialized views** for dashboard aggregates (total products, reviews count) — refresh every hour
3. **Connection pooling** — PgBouncer in transaction mode (Supabase's Supavisor provides this)
4. **Redis caching** for frequently-read, rarely-changed data: brand profiles, user plan data (TTL 5 minutes)
5. **pgvector IVFFlat index** correctly tuned: `WITH (lists = 100)` for < 1M embeddings, increase to 1000 for > 10M

---

### Challenge 5: Scraped Data Freshness

**Problem:** Product prices and review counts change daily. Cached scrape results can be days old when a user re-runs the same category.

**Solution:** Content-addressed caching in Redis:
```python
cache_key = f"scrape:{hashlib.md5(f'{platform}:{query}'.encode()).hexdigest()}"
ttl = 3600 * 6  # 6 hours for product listings
```
Agent 10 (Price Optimizer) bypasses cache — it always re-scrapes current prices. Agent 1 uses cache for structure/specs (stable), bypasses for price (volatile).

---

## 10. DevOps, CI/CD & Observability

### 10.1 Infrastructure Stack

| Component | Service | Why |
|---|---|---|
| Backend hosting | **Railway.app** (early) → **AWS ECS Fargate** (scale) | Railway: zero-config, $5/mo to start. ECS: auto-scale, managed |
| Frontend hosting | **Vercel** | Edge CDN, instant deploy from GitHub, free for hobby |
| Database | **Supabase** (managed Postgres) | Built-in auth, realtime, storage, pgvector |
| Redis | **Upstash Redis** (serverless) → **Elasticache** (scale) | Upstash: pay-per-request, no idle cost. Elasticache: VPC-native |
| File storage | **Supabase Storage** | Co-located with DB, signed URLs, 10GB free |
| Monitoring | **Sentry** (errors) + **PostHog** (product analytics) | Industry standard, good free tiers |
| Alerts | **PagerDuty** (on-call) + **Slack** (team) | PagerDuty integrates with Railway/AWS |
| CI/CD | **GitHub Actions** | Industry standard, free for public repos |
| Container | **Docker** + **docker-compose** (local) | Reproducible environments |
| DNS | **Cloudflare** | DDoS protection, edge caching, cheap |

### 10.2 CI/CD Pipeline

```yaml
# .github/workflows/deploy.yml

name: ProductIQ CI/CD

on:
  push:
    branches: [main, staging]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      redis:
        image: redis:7-alpine
        ports: ["6379:6379"]
    steps:
      - uses: actions/checkout@v4
      - name: Set up Python
        uses: actions/setup-python@v5
        with: { python-version: "3.12" }
      - name: Install dependencies
        run: pip install -r requirements.txt
      - name: Lint
        run: ruff check . && mypy .
      - name: Unit tests
        run: pytest tests/unit/ -v --cov=. --cov-report=xml
      - name: Security audit
        run: pip-audit --fail-on-vuln
      - name: Upload coverage
        uses: codecov/codecov-action@v4

  build-and-push:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Build Docker image
        run: docker build -t productiq-backend:${{ github.sha }} ./productiq-backend
      - name: Push to ECR / Railway
        run: # ... registry push steps

  deploy-staging:
    needs: build-and-push
    if: github.ref == 'refs/heads/staging'
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to Railway staging
        run: railway up --service backend-staging

  deploy-production:
    needs: build-and-push
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    environment: production   # Requires manual approval
    steps:
      - name: Deploy to Railway production
        run: railway up --service backend-prod
```

### 10.3 Observability Stack

```python
# Structured logging (already in place — extend it)
import structlog

logger = structlog.get_logger()

# Every agent execution logs:
logger.info(
    "agent_execution",
    agent=agent_name,
    run_id=run_id,
    user_id=user_id,
    llm_model=llm_model,
    tokens_used=tokens,
    duration_seconds=duration,
    status="completed",
)

# Every API request (already in place via middleware):
# method, path, status, duration_ms, request_id

# Sentry integration:
import sentry_sdk
sentry_sdk.init(
    dsn=settings.SENTRY_DSN,
    traces_sample_rate=0.1,    # 10% of requests for performance monitoring
    environment=settings.APP_ENV,
    integrations=[CeleryIntegration(), FastApiIntegration()],
)
```

**Key metrics to track:**
- Pipeline completion rate (target: >95%)
- Median pipeline duration (target: <12 minutes)
- Agent failure rate per agent (alert if >5%)
- Gemini API error rate by key (alert if >2%)
- P95 API response time (target: <500ms for non-pipeline endpoints)
- Daily active users, report generation rate, conversion rate (free→paid)
- WebSocket connection uptime per user session

---

## 11. Security & Compliance Architecture

### 11.1 Authentication & Authorization

```
Auth Model:
  - Supabase Auth (JWT) for all user authentication
  - JWT contains: user_id, workspace_id (claim), plan, role
  - Backend validates JWT on every request using Supabase admin client
  - RLS policies enforce row-level isolation (unchanged from v1)
  
NEW in v2 — Workspace RBAC:
  - Admin: full read/write, invite members, billing, brand config
  - Editor: run reports, edit brand profiles, manage alerts
  - Viewer: read reports, view dashboards — no run permissions

API Security:
  - Rate limiting via Redis: per user_id and per IP
    (Free: 60 req/min, Pro: 300 req/min, Enterprise: custom)
  - API keys for programmatic access (Team/Enterprise only)
    → Hashed and stored, never logged in plaintext
  - Webhook signature verification (Razorpay, Supabase)
  - CORS: allow-listed origins only (no wildcard in production)
  - All secrets in environment variables; never in code or logs
```

### 11.2 Data Privacy & DPDP Compliance

India's **Digital Personal Data Protection Act (DPDPA) 2023** applies to ProductIQ. Compliance requirements:

1. **Consent collection:** On signup, explicit consent for data processing with clear purpose statement.
2. **Data minimisation:** Only collect data necessary for the intelligence pipeline.
3. **Right to erasure:** `/api/user/delete` endpoint that purges all user data within 72 hours.
4. **Data residency:** Supabase instance on AWS `ap-south-1` (Mumbai) — all data stays in India.
5. **Third-party data processors:** Apify (UK), SerpAPI (US) — DPA agreements required for enterprise.
6. **Review data:** We analyse public review data only. No personal data about reviewers is stored (reviewer names are stripped from the reviews table).

---

## 12. Monetisation & Revenue Architecture

### 12.1 Revenue Model

| Stream | Year 1 Target | Year 2 Target |
|---|---|---|
| Subscription (Pro + Team) | ₹80L | ₹3.5 Cr |
| Pay-per-report | ₹15L | ₹40L |
| Enterprise contracts | ₹25L | ₹1.5 Cr |
| Agency white-label | ₹10L | ₹80L |
| **Total ARR** | **₹1.3 Cr** | **₹6.3 Cr** |

### 12.2 Unit Economics Target

| Metric | Target (Month 12) |
|---|---|
| MRR | ₹12L |
| ARPU (Pro) | ₹4,500/month |
| ARPU (Team) | ₹11,000/month |
| CAC (blended) | ₹3,000 |
| LTV (Pro, 18-month avg) | ₹81,000 |
| LTV/CAC | 27x |
| Gross Margin | ~82% (API costs + server) |
| Net Revenue Churn (monthly) | <3% |

### 12.3 Growth Mechanics

**Product-Led Growth (PLG):**
1. Free tier with watermarked reports → viral distribution (report shared with investors/partners has ProductIQ branding)
2. Referral program (2 bonus reports per referral → word of mouth from existing users)
3. Public category intelligence pages (SEO + shareability — `/intelligence/protein-powder-india`)

**Sales-Assisted:**
- Inbound leads from SEO → free trial → trial-to-paid via drip sequence
- Agency partners as resellers (30% rev share)
- Enterprise inbound → human sales for contracts >₹50K/month

---

## 13. 16-Week Execution Roadmap

### Phase 1: Architecture Overhaul (Weeks 1–4)

| Week | Work |
|---|---|
| 1 | Replace in-memory SSE manager with Redis Pub/Sub. Implement WebSocket manager. Add Celery chord/group for parallel Phase 1 agents. Write unit tests for all tools. |
| 2 | Implement workspace + brand_profiles schema. Add RBAC middleware. Migrate existing users to workspace model. Add Gemini key rotation pool. |
| 3 | Replace VADER with Gemini-based sentiment analysis. Implement Brand Memory Store (cross-run knowledge graph). Add run delta computation. Upgrade all dependency versions. |
| 4 | Implement intelligence_events table. Build event bus publisher (`EventBusPublishTool`). Add Sentry integration. Complete CI/CD pipeline with automated tests. |

**Exit criteria Phase 1:** Pipeline runs in <12 minutes with parallel agents. Zero dropped WebSocket events. All existing tests passing.

---

### Phase 2: New Agents (Weeks 5–8)

| Week | Work |
|---|---|
| 5 | Build Agent 13 (Social Scout) — Apify Instagram/YouTube actors. Build Agent 14 (Market Sizer) — RAG over market reports. Seed market report library into pgvector. |
| 6 | Build Agent 15 (Brand Mention Tracker) — Celery Beat every 4h. Build Agent 16 (Competitor Launch Scout) — Celery Beat every 6h. Build Agent 17 (Trend Velocity Monitor) — Celery Beat every 2h. |
| 7 | Build Agent 18 (AI Chat) — per-user RAG namespace, streaming SSE response, chat_sessions table. Build chat UI: ChatWindow, ChatMessage, StreamingText, ChatSuggestions. |
| 8 | Build Agent 19 (Report Comparator) — delta computation, run_deltas table. Build Agent 20 (Concept Validator) — concept input form, validation scorecard. Test all 20 agents end-to-end. |

**Exit criteria Phase 2:** All 20 agents operational. Continuous monitoring running on 5 test brands. AI chat responding in <3 seconds (streaming).

---

### Phase 3: Frontend Revolution (Weeks 9–12)

| Week | Work |
|---|---|
| 9 | Build Intelligence Feed page — IntelligenceFeed, EventCard, AlertBanner. Build NotificationBell. Add WebSocket client hook. Implement dark mode system. |
| 10 | Build Brand Profiles page — BrandCard, BrandSwitcher, AlertThresholdConfig. Build /compare page — DeltaSummary, InsightDiff. |
| 11 | Build /chat page — full chat UI. Build /validate page — ConceptForm, ValidationScorecard. Upgrade RunStatusPage with partial insight streaming preview. |
| 12 | Mobile-first responsive pass on all pages. Add PWA manifest. Implement Web Push notifications. Polish micro-animations. Accessibility audit (WCAG 2.1 AA). |

**Exit criteria Phase 3:** Lighthouse score > 90 on all pages. Mobile renders cleanly on 375px viewport. All new pages functional.

---

### Phase 4: Go-To-Market & Stability (Weeks 13–16)

| Week | Work |
|---|---|
| 13 | Razorpay webhook for subscription lifecycle (renewal, cancellation, dunning). Add Gupshup WhatsApp notification integration. Build `/notifications` page. Implement push notification service worker. |
| 14 | Launch onboarding wizard (3-step). Add public category intelligence pages (SEO). Submit to ProductHunt. First 50 beta users outreach. Set up PostHog funnels. |
| 15 | Agency white-label mode: custom logo on reports, custom email domain. API key generation for Team plan. Rate limiting enforcement. Performance load test (100 concurrent users). |
| 16 | End-to-end E2E tests with Playwright. Security penetration test. DPDPA compliance audit. Deploy to production Railway. Go live. |

**Exit criteria Phase 4:** 50 paying users. Production uptime >99.5%. All compliance requirements met. Revenue > ₹1L/month.

---

## 14. Technology Stack Reference

### Backend

```
Language:        Python 3.12
Framework:       FastAPI 0.115+ (async, Pydantic v2)
ASGI Server:     Uvicorn 0.32+ + Gunicorn (multi-worker)
Agent Framework: CrewAI 0.80+ (with new Flow API for complex pipelines)
LLM:             Google Gemini via google-genai 1.0+ SDK (replaces google-generativeai)
Embeddings:      Gemini text-embedding-004 (768d, better than embedding-001)
RAG:             LlamaIndex 0.12+ with pgvector connector
Task Queue:      Celery 5.4+ + Redis 7 (broker + backend)
Database:        Supabase (Postgres 16 + pgvector 0.7 + Realtime)
Cache:           Redis (Upstash in prod)
Scraping:        Apify Cloud (managed actors, no maintenance)
Search:          SerpAPI + Google Trends API + Reddit API (PRAW)
NLP:             Gemini (sentiment) + BERTopic (clustering) + spaCy (NER)
Reports:         WeasyPrint 63+ + python-pptx 1.0+ + Jinja2 3.1+
Payments:        Razorpay 1.4+
Analytics:       PostHog 3.5+ + Sentry 2.x
Logging:         structlog 24+
Testing:         pytest + pytest-asyncio + httpx (test client)
Linting:         ruff + mypy
```

### Frontend

```
Language:        TypeScript 5.5+
Framework:       React 19 (stable concurrent features)
Build:           Vite 6
Styling:         Tailwind CSS v4 (new CSS-first config)
Components:      Bits UI (headless) + shadcn/ui (for complex components)
Animation:       Motion (Framer Motion v12)
Charts:          Recharts 2.x + Visx (for complex custom charts)
Graph:           React Force Graph 2D (D3-backed)
Data fetching:   TanStack Query v5
Forms:           React Hook Form 7 + Zod 3
Routing:         React Router v7
Supabase:        @supabase/supabase-js v2
State:           Zustand 5
WebSocket:       Native WebSocket API + reconnect logic
Notifications:   Sonner (toasts) + Web Push API
Icons:           Lucide React
Date:            date-fns 4
Virtualisation:  TanStack Virtual (for Intelligence Feed — potentially 1000+ events)
Testing:         Vitest + Playwright (E2E)
```

### Infrastructure

```
Hosting:         Railway.app (backend) + Vercel (frontend)
Database:        Supabase (ap-south-1 Mumbai)
Cache/Queue:     Upstash Redis (serverless, global)
CDN:             Cloudflare (DNS + DDoS + edge caching)
Storage:         Supabase Storage (S3-compatible)
Monitoring:      Sentry + PostHog + PagerDuty
CI/CD:           GitHub Actions
Containers:      Docker + docker-compose
Secrets:         Railway secret variables + Vercel env vars
```

---

## Closing Note for Investors & Engineers

ProductIQ is not building another AI wrapper. We are building the **market intelligence layer** for India's ₹4.5L Cr D2C economy.

The opportunity is structural: Indian D2C brands make billion-rupee product and marketing decisions based on gut feel and expensive, slow consulting reports. ProductIQ puts McKinsey-level intelligence on autopilot for ₹5,000 a month.

The technical moat grows with every run:
- More runs → more domain-specific training data → better agent prompts
- More brands → richer competitor intelligence shared across the platform
- Continuous monitoring → users become operationally dependent (sticky)
- Knowledge graph → cross-brand, cross-category signal that no individual report can provide

**The v1 prototype proved the concept. v2 builds the product. v3 builds the moat.**

---

*Document maintained by the ProductIQ founding team. Update frequency: quarterly strategy, monthly roadmap.*  
*Last updated: June 2026*
