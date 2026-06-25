-- ============================================================
-- ProductIQ -- Complete Supabase Database Schema
-- Consolidates ALL migrations + patches into one idempotent script.
--
-- Migrations included (in order):
--   001_initial_schema  -> core tables
--   002_schema_patch    -> asin columns, unique constraint, tags col
--   003_review_count_int_fix -> correct column types
--   002_v2_features     -> notifications, brands, chat, embeddings
--   003_realtime        -> realtime publications + helper functions
--   004_admin_panel     -> admin role + audit log
--
-- HOW TO RUN:
--   Supabase Dashboard > SQL Editor > paste entire file > Run
--   OR via psql:
--     psql "postgresql://postgres:PASSWORD@db.PROJECT.supabase.co:5432/postgres" -f complete_schema.sql
--
-- Safe to run on a FRESH (empty) Supabase project.
-- Uses IF NOT EXISTS / DROP TRIGGER IF EXISTS for idempotency.
-- ============================================================


-- ============================================================
-- STEP 1: EXTENSIONS
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";
CREATE EXTENSION IF NOT EXISTS "ltree";
-- Also register under extensions schema (pgvector compatibility)
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;


-- ============================================================
-- STEP 2: UTILITY TRIGGER FUNCTIONS
-- (Must exist before any triggers are attached)
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ============================================================
-- STEP 3: PROFILES (users & subscriptions)
-- Combines role column from 004_admin_panel.sql here directly.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id                           UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email                        TEXT        NOT NULL,
  full_name                    TEXT,
  company_name                 TEXT,
  plan                         TEXT        NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'enterprise')),
  role                         TEXT        NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  reports_used_this_month      INT         NOT NULL DEFAULT 0,
  reports_limit                INT         NOT NULL DEFAULT 3,
  razorpay_customer_id         TEXT,
  razorpay_subscription_id     TEXT,
  referral_code                TEXT        UNIQUE DEFAULT gen_random_uuid()::TEXT,
  referred_by                  UUID        REFERENCES public.profiles(id),
  extra_reports_from_referrals INT         NOT NULL DEFAULT 0,
  slack_webhook_url            TEXT,
  created_at                   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                   TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"   ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Admin elevated access (from 004_admin_panel.sql)
CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );
CREATE POLICY "Admins can update any profile" ON public.profiles
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );


-- ============================================================
-- STEP 4: AGENT RUNS (core pipeline execution records)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.agent_runs (
  id               UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  product_category TEXT        NOT NULL,
  brand_name       TEXT,
  target_market    TEXT        DEFAULT 'India',
  status           TEXT        NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'running', 'completed', 'failed')),
  current_agent    TEXT,
  progress_pct     INT         DEFAULT 0,
  error_message    TEXT,
  celery_task_id   TEXT,
  started_at       TIMESTAMPTZ,
  completed_at     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.agent_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own runs" ON public.agent_runs FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_agent_runs_user_id ON public.agent_runs(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_runs_status  ON public.agent_runs(status);


-- ============================================================
-- STEP 5: AGENT OUTPUTS (one row per agent per run)
-- Includes UNIQUE constraint from 002_schema_patch.sql.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.agent_outputs (
  id               UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  run_id           UUID        NOT NULL REFERENCES public.agent_runs(id) ON DELETE CASCADE,
  agent_name       TEXT        NOT NULL,
  agent_number     INT         NOT NULL,
  status           TEXT        NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  output           JSONB,
  tokens_used      INT,
  duration_seconds FLOAT,
  started_at       TIMESTAMPTZ,
  completed_at     TIMESTAMPTZ,
  CONSTRAINT uq_agent_outputs_run_agent UNIQUE (run_id, agent_name)
);

CREATE INDEX IF NOT EXISTS idx_agent_outputs_run_id ON public.agent_outputs(run_id);

ALTER TABLE public.agent_outputs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own outputs" ON public.agent_outputs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.agent_runs WHERE id = run_id AND user_id = auth.uid())
  );


-- ============================================================
-- STEP 6: PRODUCTS (scraped product data)
-- Includes asin column from 002_schema_patch.sql.
-- review_count is INTEGER (fixed in 003_review_count_int_fix.sql).
-- ============================================================

CREATE TABLE IF NOT EXISTS public.products (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  run_id       UUID        REFERENCES public.agent_runs(id) ON DELETE SET NULL,
  platform     TEXT        NOT NULL,
  product_name TEXT        NOT NULL,
  brand        TEXT,
  category     TEXT,
  sub_category TEXT,
  price_inr    NUMERIC,
  mrp_inr      NUMERIC,
  rating       NUMERIC,
  review_count INTEGER,
  in_stock     BOOLEAN     DEFAULT TRUE,
  images       TEXT[],
  url          TEXT,
  asin         TEXT,
  specs        JSONB,
  seller_info  JSONB,
  scraped_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category);
CREATE INDEX IF NOT EXISTS idx_products_brand    ON public.products(brand);
CREATE INDEX IF NOT EXISTS idx_products_run_id   ON public.products(run_id);
CREATE INDEX IF NOT EXISTS idx_products_asin     ON public.products(asin) WHERE asin IS NOT NULL;


-- ============================================================
-- STEP 7: REVIEWS
-- Includes asin column from 002_schema_patch.sql.
-- helpful_votes is INTEGER (fixed in 003_review_count_int_fix.sql).
-- ============================================================

CREATE TABLE IF NOT EXISTS public.reviews (
  id                UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id        UUID        REFERENCES public.products(id) ON DELETE CASCADE,
  run_id            UUID        REFERENCES public.agent_runs(id) ON DELETE SET NULL,
  platform          TEXT        NOT NULL,
  reviewer_name     TEXT,
  rating            INT         CHECK (rating BETWEEN 1 AND 5),
  title             TEXT,
  body              TEXT        NOT NULL,
  verified_purchase BOOLEAN     DEFAULT FALSE,
  helpful_votes     INTEGER     DEFAULT 0,
  sentiment_score   NUMERIC,
  sentiment_label   TEXT        CHECK (sentiment_label IN ('positive', 'negative', 'neutral')),
  topics            TEXT[],
  pain_points       TEXT[],
  feature_requests  TEXT[],
  asin              TEXT,
  reviewed_at       TIMESTAMPTZ,
  scraped_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reviews_product_id ON public.reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_run_id     ON public.reviews(run_id);
CREATE INDEX IF NOT EXISTS idx_reviews_sentiment  ON public.reviews(sentiment_label);
CREATE INDEX IF NOT EXISTS idx_reviews_asin       ON public.reviews(asin) WHERE asin IS NOT NULL;


-- ============================================================
-- STEP 8: REVIEW CLUSTERS (BERTopic output)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.review_clusters (
  id                   UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  run_id               UUID        NOT NULL REFERENCES public.agent_runs(id) ON DELETE CASCADE,
  topic_id             INT         NOT NULL,
  topic_label          TEXT        NOT NULL,
  topic_type           TEXT        CHECK (topic_type IN ('pain_point', 'feature_request', 'praise', 'neutral')),
  representative_words TEXT[],
  review_count         INT,
  avg_sentiment        NUMERIC,
  sample_reviews       TEXT[],
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_clusters_run_id ON public.review_clusters(run_id);


-- ============================================================
-- STEP 9: COMPETITORS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.competitors (
  id                    UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  run_id                UUID        REFERENCES public.agent_runs(id) ON DELETE SET NULL,
  brand_name            TEXT        NOT NULL,
  product_name          TEXT,
  platform              TEXT,
  price_inr             NUMERIC,
  rating                NUMERIC,
  review_count          INT,
  key_strengths         TEXT[],
  key_weaknesses        TEXT[],
  positioning_statement TEXT,
  ad_copy               TEXT,
  url                   TEXT,
  scraped_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_competitors_run_id ON public.competitors(run_id);


-- ============================================================
-- STEP 10: TRENDS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.trends (
  id                UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  run_id            UUID        REFERENCES public.agent_runs(id) ON DELETE SET NULL,
  trend_keyword     TEXT        NOT NULL,
  source            TEXT        NOT NULL,
  trend_score       NUMERIC,
  velocity          TEXT        CHECK (velocity IN ('rising', 'stable', 'declining')),
  peak_predicted_at TIMESTAMPTZ,
  related_topics    TEXT[],
  sample_posts      TEXT[],
  detected_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_trends_run_id ON public.trends(run_id);


-- ============================================================
-- STEP 11: INSIGHTS
-- Includes tags column from 002_schema_patch.sql.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.insights (
  id               UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  run_id           UUID        NOT NULL REFERENCES public.agent_runs(id) ON DELETE CASCADE,
  insight_type     TEXT        NOT NULL CHECK (
    insight_type IN ('market_gap', 'consumer_need', 'competitive_advantage', 'trend_opportunity', 'risk')
  ),
  title            TEXT        NOT NULL,
  body             TEXT        NOT NULL,
  confidence_score NUMERIC     CHECK (confidence_score BETWEEN 0 AND 1),
  sources          JSONB,
  tags             TEXT[]      DEFAULT '{}',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_insights_run_id ON public.insights(run_id);


-- ============================================================
-- STEP 12: PRODUCT CONCEPTS
-- validation_score default 0 included from 002_schema_patch.sql.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.product_concepts (
  id                   UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  run_id               UUID        NOT NULL REFERENCES public.agent_runs(id) ON DELETE CASCADE,
  concept_name         TEXT        NOT NULL,
  tagline              TEXT,
  target_persona       TEXT,
  usp                  TEXT,
  key_features         TEXT[],
  suggested_price_inr  NUMERIC,
  price_rationale      TEXT,
  gap_it_fills         TEXT,
  market_size_estimate TEXT,
  risks                TEXT[],
  name_ideas           TEXT[],
  validation_score     NUMERIC     DEFAULT 0 CHECK (validation_score BETWEEN 0 AND 100),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_concepts_run_id ON public.product_concepts(run_id);


-- ============================================================
-- STEP 13: GTM PLANS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.gtm_plans (
  id                  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  run_id              UUID        NOT NULL REFERENCES public.agent_runs(id) ON DELETE CASCADE,
  concept_id          UUID        REFERENCES public.product_concepts(id),
  launch_channels     TEXT[],
  messaging_framework JSONB,
  pricing_strategy    JSONB,
  influencer_targets  JSONB,
  launch_timeline     JSONB,
  budget_estimate     JSONB,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ============================================================
-- STEP 14: REPORTS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.reports (
  id             UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  run_id         UUID        NOT NULL REFERENCES public.agent_runs(id) ON DELETE CASCADE,
  user_id        UUID        NOT NULL REFERENCES public.profiles(id),
  title          TEXT        NOT NULL,
  pdf_url        TEXT,
  pptx_url       TEXT,
  is_watermarked BOOLEAN     DEFAULT FALSE,
  page_count     INT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own reports" ON public.reports FOR ALL USING (auth.uid() = user_id);


-- ============================================================
-- STEP 15: SENTIMENT SCORES (brand monitoring)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.sentiment_scores (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID        NOT NULL REFERENCES public.profiles(id),
  brand_name   TEXT        NOT NULL,
  platform     TEXT        NOT NULL DEFAULT 'multi-platform',
  score        NUMERIC     NOT NULL CHECK (score BETWEEN -1 AND 1),
  positive_pct NUMERIC,
  negative_pct NUMERIC,
  neutral_pct  NUMERIC,
  post_count   INT,
  alert_sent   BOOLEAN     DEFAULT FALSE,
  scored_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sentiment_brand ON public.sentiment_scores(brand_name, scored_at DESC);
CREATE INDEX IF NOT EXISTS idx_sentiment_user  ON public.sentiment_scores(user_id, scored_at DESC);


-- ============================================================
-- STEP 16: PRICE HISTORY
-- ============================================================

CREATE TABLE IF NOT EXISTS public.price_history (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id   UUID        REFERENCES public.products(id),
  run_id       UUID        REFERENCES public.agent_runs(id),
  brand        TEXT,
  platform     TEXT,
  price_inr    NUMERIC     NOT NULL,
  rating       NUMERIC,
  review_count INT,
  recorded_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_price_history_brand ON public.price_history(brand, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_price_history_run   ON public.price_history(run_id);


-- ============================================================
-- STEP 17: SUPPLIERS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.suppliers (
  id             UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  run_id         UUID        REFERENCES public.agent_runs(id) ON DELETE SET NULL,
  company_name   TEXT        NOT NULL,
  category       TEXT,
  contact_person TEXT,
  phone          TEXT,
  email          TEXT,
  location       TEXT,
  platform       TEXT,
  verified       BOOLEAN     DEFAULT FALSE,
  min_order_qty  TEXT,
  price_range    TEXT,
  certifications TEXT[],
  profile_url    TEXT,
  rfq_generated  BOOLEAN     DEFAULT FALSE,
  found_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ============================================================
-- STEP 18: COMPLIANCE CHECKS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.compliance_checks (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  run_id          UUID        REFERENCES public.agent_runs(id) ON DELETE SET NULL,
  concept_id      UUID        REFERENCES public.product_concepts(id),
  regulation_body TEXT        NOT NULL CHECK (regulation_body IN ('FSSAI', 'FDA', 'AYUSH', 'BIS')),
  overall_status  TEXT        CHECK (overall_status IN ('compliant', 'non_compliant', 'needs_review')),
  checklist       JSONB,
  risk_flags      TEXT[],
  recommendations TEXT[],
  checked_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ============================================================
-- STEP 19: KNOWLEDGE GRAPH (Neo4j-migration-ready JSONB)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.knowledge_nodes (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  node_type  TEXT        NOT NULL CHECK (
    node_type IN ('product', 'brand', 'feature', 'customer_need', 'competitor', 'supplier', 'trend', 'ingredient')
  ),
  label      TEXT        NOT NULL,
  properties JSONB       DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.knowledge_edges (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  from_node    UUID        NOT NULL REFERENCES public.knowledge_nodes(id) ON DELETE CASCADE,
  to_node      UUID        NOT NULL REFERENCES public.knowledge_nodes(id) ON DELETE CASCADE,
  relationship TEXT        NOT NULL,
  weight       NUMERIC     DEFAULT 1.0,
  properties   JSONB       DEFAULT '{}',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_edges_from ON public.knowledge_edges(from_node);
CREATE INDEX IF NOT EXISTS idx_edges_to   ON public.knowledge_edges(to_node);


-- ============================================================
-- STEP 20: TRANSACTIONS (Razorpay payments)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.transactions (
  id                  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID        NOT NULL REFERENCES public.profiles(id),
  razorpay_order_id   TEXT        UNIQUE,
  razorpay_payment_id TEXT,
  razorpay_signature  TEXT,
  amount_paise        INT         NOT NULL,
  currency            TEXT        DEFAULT 'INR',
  type                TEXT        CHECK (type IN ('subscription', 'pay_per_report', 'enterprise')),
  status              TEXT        DEFAULT 'created' CHECK (status IN ('created', 'paid', 'failed', 'refunded')),
  plan                TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own transactions" ON public.transactions
  FOR SELECT USING (auth.uid() = user_id);


-- ============================================================
-- STEP 21: RAG EMBEDDINGS (pgvector 768-dim Gemini)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.embeddings (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  run_id      UUID        REFERENCES public.agent_runs(id) ON DELETE CASCADE,
  user_id     UUID        REFERENCES auth.users(id) ON DELETE CASCADE,
  source_type TEXT        CHECK (source_type IN ('review', 'cluster', 'competitor', 'trend', 'regulation', 'product')),
  source_id   TEXT,
  content     TEXT        NOT NULL,
  embedding   VECTOR(768),
  metadata    JSONB       DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_embeddings_run     ON public.embeddings(run_id);
CREATE INDEX IF NOT EXISTS idx_embeddings_user_id ON public.embeddings(user_id);

-- HNSW for fast approximate nearest-neighbour similarity search
CREATE INDEX IF NOT EXISTS idx_embeddings_hnsw
  ON public.embeddings USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

ALTER TABLE public.embeddings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own embeddings" ON public.embeddings
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can insert embeddings" ON public.embeddings
  FOR INSERT WITH CHECK (true);


-- ============================================================
-- STEP 22: NOTIFICATIONS (V2 feature)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.notifications (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type       TEXT        NOT NULL DEFAULT 'info',    -- info | success | warning | error
  category   TEXT        NOT NULL DEFAULT 'system',  -- system | report | intelligence | billing | brand
  title      TEXT        NOT NULL,
  body       TEXT,
  link       TEXT,
  read       BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id     ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread  ON public.notifications(user_id) WHERE read = FALSE;
CREATE INDEX IF NOT EXISTS idx_notifications_created_at   ON public.notifications(created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;

CREATE POLICY "Users can view own notifications"   ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "System can insert notifications"    ON public.notifications FOR INSERT WITH CHECK (true);


-- ============================================================
-- STEP 23: INTELLIGENCE EVENTS (V2 feature)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.intelligence_events (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  brand_name TEXT,
  event_type TEXT        NOT NULL,                    -- competitor_move | trend_shift | sentiment_alert | price_change | market_gap
  severity   TEXT        NOT NULL DEFAULT 'info',     -- info | warning | critical
  title      TEXT        NOT NULL,
  body       TEXT,
  source     TEXT,                                     -- google_trends | reddit | amazon | news | internal
  metadata   JSONB       DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_intel_events_user_id    ON public.intelligence_events(user_id);
CREATE INDEX IF NOT EXISTS idx_intel_events_brand      ON public.intelligence_events(brand_name);
CREATE INDEX IF NOT EXISTS idx_intel_events_severity   ON public.intelligence_events(severity);
CREATE INDEX IF NOT EXISTS idx_intel_events_created_at ON public.intelligence_events(created_at DESC);

ALTER TABLE public.intelligence_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intelligence_events REPLICA IDENTITY FULL;

CREATE POLICY "Users can view own intel events"  ON public.intelligence_events FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can insert intel events"   ON public.intelligence_events FOR INSERT WITH CHECK (true);


-- ============================================================
-- STEP 24: BRAND PROFILES (V2 feature)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.brand_profiles (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  brand_name    TEXT        NOT NULL,
  category      TEXT,
  target_market TEXT        DEFAULT 'India',
  health_score  INTEGER,                       -- 0-100, computed by Agent 9
  is_active     BOOLEAN     NOT NULL DEFAULT TRUE,
  metadata      JSONB       DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_brand_profiles_user_id  ON public.brand_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_brand_profiles_active   ON public.brand_profiles(user_id) WHERE is_active = TRUE;
CREATE UNIQUE INDEX IF NOT EXISTS idx_brand_profiles_user_brand ON public.brand_profiles(user_id, brand_name);

ALTER TABLE public.brand_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brand_profiles REPLICA IDENTITY FULL;

CREATE POLICY "Users can CRUD own brands" ON public.brand_profiles
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS trg_brand_profiles_updated_at ON public.brand_profiles;
CREATE TRIGGER trg_brand_profiles_updated_at
  BEFORE UPDATE ON public.brand_profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


-- ============================================================
-- STEP 25: CHAT SESSIONS & MESSAGES (V2 RAG Chat)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.chat_sessions (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title      TEXT        NOT NULL DEFAULT 'New conversation',
  run_id     UUID,                              -- optional: link to a specific report run
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id    ON public.chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_updated_at ON public.chat_sessions(updated_at DESC);

ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own chat sessions" ON public.chat_sessions
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS trg_chat_sessions_updated_at ON public.chat_sessions;
CREATE TRIGGER trg_chat_sessions_updated_at
  BEFORE UPDATE ON public.chat_sessions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


CREATE TABLE IF NOT EXISTS public.chat_messages (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID        NOT NULL REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
  role       TEXT        NOT NULL,   -- user | assistant | system
  content    TEXT        NOT NULL,
  metadata   JSONB       DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON public.chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON public.chat_messages(created_at ASC);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view messages in own sessions" ON public.chat_messages
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.chat_sessions s WHERE s.id = chat_messages.session_id AND s.user_id = auth.uid())
  );
CREATE POLICY "Users can insert messages in own sessions" ON public.chat_messages
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.chat_sessions s WHERE s.id = chat_messages.session_id AND s.user_id = auth.uid())
  );
CREATE POLICY "Users can delete messages in own sessions" ON public.chat_messages
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.chat_sessions s WHERE s.id = chat_messages.session_id AND s.user_id = auth.uid())
  );


-- ============================================================
-- STEP 26: CONCEPT VALIDATIONS (V2 feature)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.concept_validations (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  concept_name    TEXT        NOT NULL,
  description     TEXT        NOT NULL,
  target_market   TEXT        DEFAULT 'India',
  run_id          UUID,                          -- optional: validate against a specific run
  status          TEXT        NOT NULL DEFAULT 'pending',  -- pending | completed | failed
  market_fit      INTEGER,
  differentiation INTEGER,
  feasibility     INTEGER,
  overall_score   INTEGER,
  summary         TEXT,
  strengths       TEXT[],
  risks           TEXT[],
  recommendations TEXT[],
  error           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_validations_user_id    ON public.concept_validations(user_id);
CREATE INDEX IF NOT EXISTS idx_validations_created_at ON public.concept_validations(created_at DESC);

ALTER TABLE public.concept_validations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own validations" ON public.concept_validations
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);


-- ============================================================
-- STEP 27: ADMIN AUDIT LOG (Admin Panel feature)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action      TEXT        NOT NULL,   -- user.ban | user.unban | user.plan_change | user.role_change | user.delete | config.update
  target_id   UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  target_type TEXT        DEFAULT 'user',
  details     JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_admin_id   ON public.admin_audit_log(admin_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON public.admin_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_target_id  ON public.admin_audit_log(target_id);

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read audit log" ON public.admin_audit_log
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );
CREATE POLICY "Admins can insert audit log" ON public.admin_audit_log
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );


-- ============================================================
-- STEP 28: STORED FUNCTIONS & AUTH TRIGGERS
-- ============================================================

-- Auto-create a profile row when a new Supabase Auth user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- Reset monthly report counters (called by Celery Beat on 1st of each month)
CREATE OR REPLACE FUNCTION public.reset_monthly_reports()
RETURNS void AS $$
BEGIN
  UPDATE public.profiles SET reports_used_this_month = 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Atomic increment of monthly usage count for a user
CREATE OR REPLACE FUNCTION public.increment_monthly_reports(p_user_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.profiles
  SET reports_used_this_month = reports_used_this_month + 1
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.increment_monthly_reports TO authenticated;


-- Push a notification to a user (used by Celery tasks & webhook handlers)
CREATE OR REPLACE FUNCTION public.notify_user(
  p_user_id  UUID,
  p_type     TEXT DEFAULT 'info',
  p_category TEXT DEFAULT 'system',
  p_title    TEXT DEFAULT NULL,
  p_body     TEXT DEFAULT NULL,
  p_link     TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE v_id UUID;
BEGIN
  INSERT INTO public.notifications (user_id, type, category, title, body, link)
  VALUES (p_user_id, p_type, p_category, p_title, p_body, p_link)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.notify_user TO authenticated;


-- Create an intelligence event record (called by monitoring Celery tasks)
CREATE OR REPLACE FUNCTION public.create_intel_event(
  p_user_id    UUID,
  p_brand_name TEXT  DEFAULT NULL,
  p_event_type TEXT  DEFAULT NULL,
  p_severity   TEXT  DEFAULT 'info',
  p_title      TEXT  DEFAULT NULL,
  p_body       TEXT  DEFAULT NULL,
  p_source     TEXT  DEFAULT NULL,
  p_metadata   JSONB DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE v_id UUID;
BEGIN
  INSERT INTO public.intelligence_events (user_id, brand_name, event_type, severity, title, body, source, metadata)
  VALUES (p_user_id, p_brand_name, p_event_type, p_severity, p_title, p_body, p_source, p_metadata)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_intel_event TO authenticated;


-- Check if a given user has the admin role
CREATE OR REPLACE FUNCTION public.is_admin(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = p_user_id AND role = 'admin'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_admin TO authenticated;


-- ============================================================
-- STEP 29: SUPABASE REALTIME PUBLICATIONS
-- ============================================================

-- Full replica identity needed for DELETE events to include row data
ALTER TABLE public.notifications       REPLICA IDENTITY FULL;
ALTER TABLE public.intelligence_events REPLICA IDENTITY FULL;
ALTER TABLE public.brand_profiles      REPLICA IDENTITY FULL;

-- Add tables to supabase_realtime publication (managed by Supabase)
ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_runs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_outputs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sentiment_scores;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.intelligence_events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.brand_profiles;


-- ============================================================
-- STEP 30: STORAGE BUCKET
-- ============================================================
-- Run these in Supabase Dashboard > Storage > New Bucket, or uncomment:

-- INSERT INTO storage.buckets (id, name, public) VALUES ('reports', 'reports', false)
--   ON CONFLICT (id) DO NOTHING;
-- CREATE POLICY "Users can upload own reports" ON storage.objects
--   FOR INSERT WITH CHECK (bucket_id = 'reports' AND auth.uid()::text = (storage.foldername(name))[1]);
-- CREATE POLICY "Users can read own reports" ON storage.objects
--   FOR SELECT USING (bucket_id = 'reports' AND auth.uid()::text = (storage.foldername(name))[1]);


-- ============================================================
-- MIGRATION COMPLETE
-- ============================================================
--
-- Tables created (27 total):
--   Core (20):  profiles, agent_runs, agent_outputs, products, reviews,
--               review_clusters, competitors, trends, insights, product_concepts,
--               gtm_plans, reports, sentiment_scores, price_history,
--               suppliers, compliance_checks, knowledge_nodes, knowledge_edges,
--               transactions, embeddings
--   V2 (6):     notifications, intelligence_events, brand_profiles,
--               chat_sessions, chat_messages, concept_validations
--   Admin (1):  admin_audit_log
--
-- Functions created (8):
--   handle_new_user, update_updated_at_column, handle_updated_at,
--   reset_monthly_reports, increment_monthly_reports,
--   notify_user, create_intel_event, is_admin
--
-- Post-migration actions required:
--   1. Create 'reports' storage bucket in Dashboard > Storage
--   2. To promote a user to admin:
--      UPDATE profiles SET role = 'admin' WHERE email = 'your@email.com';
-- ============================================================
