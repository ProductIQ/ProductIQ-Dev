-- ============================================================
-- ProductIQ — Complete Supabase Database Schema
-- migrations/001_initial_schema.sql
--
-- Run this ONCE in: Supabase Dashboard → SQL Editor
-- ============================================================

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
  slack_webhook_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

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
CREATE POLICY "Users see own runs" ON public.agent_runs
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX idx_agent_runs_user_id ON public.agent_runs(user_id);
CREATE INDEX idx_agent_runs_status ON public.agent_runs(status);

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
  sentiment_score NUMERIC,
  sentiment_label TEXT CHECK (sentiment_label IN ('positive', 'negative', 'neutral')),
  topics TEXT[],
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

CREATE INDEX idx_clusters_run_id ON public.review_clusters(run_id);

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
  source TEXT NOT NULL,
  trend_score NUMERIC,
  velocity TEXT CHECK (velocity IN ('rising', 'stable', 'declining')),
  peak_predicted_at TIMESTAMPTZ,
  related_topics TEXT[],
  sample_posts TEXT[],
  detected_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_trends_run_id ON public.trends(run_id);

-- ============================================================
-- INSIGHTS
-- ============================================================

CREATE TABLE public.insights (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  run_id UUID NOT NULL REFERENCES public.agent_runs(id) ON DELETE CASCADE,
  insight_type TEXT NOT NULL CHECK (
    insight_type IN ('market_gap', 'consumer_need', 'competitive_advantage', 'trend_opportunity', 'risk')
  ),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  confidence_score NUMERIC CHECK (confidence_score BETWEEN 0 AND 1),
  sources JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_insights_run_id ON public.insights(run_id);

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
  validation_score NUMERIC CHECK (validation_score BETWEEN 0 AND 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_concepts_run_id ON public.product_concepts(run_id);

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
CREATE POLICY "Users see own reports" ON public.reports
  FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- SENTIMENT SCORES (Agent 9)
-- ============================================================

CREATE TABLE public.sentiment_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  brand_name TEXT NOT NULL,
  platform TEXT NOT NULL DEFAULT 'multi-platform',
  score NUMERIC NOT NULL CHECK (score BETWEEN -1 AND 1),
  positive_pct NUMERIC,
  negative_pct NUMERIC,
  neutral_pct NUMERIC,
  post_count INT,
  alert_sent BOOLEAN DEFAULT FALSE,
  scored_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sentiment_brand ON public.sentiment_scores(brand_name, scored_at DESC);
CREATE INDEX idx_sentiment_user ON public.sentiment_scores(user_id, scored_at DESC);

-- ============================================================
-- PRICE HISTORY (Agent 10)
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
CREATE INDEX idx_price_history_run ON public.price_history(run_id);

-- ============================================================
-- SUPPLIERS (Agent 11)
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
  platform TEXT,
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
  regulation_body TEXT NOT NULL CHECK (regulation_body IN ('FSSAI', 'FDA', 'AYUSH', 'BIS')),
  overall_status TEXT CHECK (overall_status IN ('compliant', 'non_compliant', 'needs_review')),
  checklist JSONB,
  risk_flags TEXT[],
  recommendations TEXT[],
  checked_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- KNOWLEDGE GRAPH (JSONB — Neo4j migration ready)
-- ============================================================

CREATE TABLE public.knowledge_nodes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  node_type TEXT NOT NULL CHECK (
    node_type IN ('product', 'brand', 'feature', 'customer_need', 'competitor', 'supplier', 'trend', 'ingredient')
  ),
  label TEXT NOT NULL,
  properties JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.knowledge_edges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  from_node UUID NOT NULL REFERENCES public.knowledge_nodes(id) ON DELETE CASCADE,
  to_node UUID NOT NULL REFERENCES public.knowledge_nodes(id) ON DELETE CASCADE,
  relationship TEXT NOT NULL,
  weight NUMERIC DEFAULT 1.0,
  properties JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_edges_from ON public.knowledge_edges(from_node);
CREATE INDEX idx_edges_to ON public.knowledge_edges(to_node);

-- ============================================================
-- RAG EMBEDDINGS (pgvector, 768-dim Gemini)
-- ============================================================

CREATE TABLE public.embeddings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  run_id UUID REFERENCES public.agent_runs(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL CHECK (source_type IN ('review', 'cluster', 'competitor', 'trend', 'regulation', 'product')),
  source_id TEXT,
  content TEXT NOT NULL,
  embedding VECTOR(768),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_embeddings_run ON public.embeddings(run_id);
CREATE INDEX idx_embeddings_vector ON public.embeddings
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- ============================================================
-- TRANSACTIONS (Razorpay)
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
CREATE POLICY "Users see own transactions" ON public.transactions
  FOR SELECT USING (auth.uid() = user_id);

-- ============================================================
-- REALTIME: Enable publications for live updates
-- ============================================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_runs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_outputs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sentiment_scores;

-- ============================================================
-- FUNCTIONS
-- ============================================================

-- Reset monthly report count — called by Celery Beat on 1st of month
CREATE OR REPLACE FUNCTION reset_monthly_reports()
RETURNS void AS $$
BEGIN
  UPDATE public.profiles SET reports_used_this_month = 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Auto-create profile on new user signup
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

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- STORAGE BUCKETS (run these separately or via Supabase dashboard)
-- ============================================================

-- INSERT INTO storage.buckets (id, name, public) VALUES ('reports', 'reports', false);
-- CREATE POLICY "Users can upload own reports" ON storage.objects
--   FOR INSERT WITH CHECK (bucket_id = 'reports' AND auth.uid()::text = (storage.foldername(name))[1]);
-- CREATE POLICY "Users can read own reports" ON storage.objects
--   FOR SELECT USING (bucket_id = 'reports' AND auth.uid()::text = (storage.foldername(name))[1]);