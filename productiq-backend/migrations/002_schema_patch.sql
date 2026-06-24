-- ============================================================
-- ProductIQ — Schema Patch 002
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- These are all ADDITIVE changes — safe to run on existing data
-- ============================================================

-- 1. Add asin column to products table (scrapers extract ASINs)
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS asin TEXT;
CREATE INDEX IF NOT EXISTS idx_products_asin ON public.products(asin) WHERE asin IS NOT NULL;

-- 2. Add asin column to reviews table (links review to Amazon product)
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS asin TEXT;
CREATE INDEX IF NOT EXISTS idx_reviews_asin ON public.reviews(asin) WHERE asin IS NOT NULL;

-- 3. Add UNIQUE constraint on agent_outputs (run_id, agent_name)
--    Required for the upsert-on-conflict in main_crew.py
--    First, remove any existing duplicates before adding constraint
DELETE FROM public.agent_outputs
WHERE id NOT IN (
    SELECT DISTINCT ON (run_id, agent_name) id
    FROM public.agent_outputs
    ORDER BY run_id, agent_name, id
);
ALTER TABLE public.agent_outputs
    DROP CONSTRAINT IF EXISTS uq_agent_outputs_run_agent;
ALTER TABLE public.agent_outputs
    ADD CONSTRAINT uq_agent_outputs_run_agent UNIQUE (run_id, agent_name);

-- 4. Ensure insights table has all required columns
ALTER TABLE public.insights ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- 5. Ensure product_concepts validation_score has a default
ALTER TABLE public.product_concepts ALTER COLUMN validation_score SET DEFAULT 0;

-- 6. Add output JSONB column to agent_outputs if not present  
--    (stores the agent's final structured output for frontend display)
ALTER TABLE public.agent_outputs ADD COLUMN IF NOT EXISTS output JSONB;
ALTER TABLE public.agent_outputs ADD COLUMN IF NOT EXISTS tokens_used INT;
ALTER TABLE public.agent_outputs ADD COLUMN IF NOT EXISTS duration_seconds FLOAT;

-- 7. Verify the structure is correct (run SELECT to confirm)
SELECT 
    table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('products', 'reviews', 'agent_outputs', 'insights', 'product_concepts')
  AND column_name IN ('asin', 'output', 'tokens_used', 'duration_seconds', 'validation_score', 'tags')
ORDER BY table_name, column_name;
