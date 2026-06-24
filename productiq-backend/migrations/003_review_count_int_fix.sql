-- ============================================================
-- ProductIQ — Schema Patch 003
-- Fix review_count / helpful_votes column types
-- Run in Supabase SQL Editor: Dashboard → SQL Editor → New Query
-- ============================================================

-- 1. Ensure products.review_count is INTEGER (not NUMERIC/FLOAT)
--    Cast existing float values to int, then change column type
DO $$
BEGIN
    -- Only alter if column exists and is not already integer
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'products'
          AND column_name = 'review_count'
          AND data_type NOT IN ('integer', 'bigint', 'smallint')
    ) THEN
        ALTER TABLE public.products
            ALTER COLUMN review_count TYPE INTEGER USING ROUND(review_count)::INTEGER;
    END IF;
END $$;

-- 2. Ensure reviews.helpful_votes is INTEGER
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'reviews'
          AND column_name = 'helpful_votes'
          AND data_type NOT IN ('integer', 'bigint', 'smallint')
    ) THEN
        ALTER TABLE public.reviews
            ALTER COLUMN helpful_votes TYPE INTEGER USING ROUND(helpful_votes)::INTEGER;
    END IF;
END $$;

-- 3. Add missing columns to products table if not present
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS in_stock    BOOLEAN;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS category    TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS sub_category TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS seller_info  JSONB;

-- 4. Verify final column types
SELECT
    table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('products', 'reviews')
  AND column_name IN ('review_count', 'helpful_votes', 'in_stock', 'category', 'sub_category', 'seller_info')
ORDER BY table_name, column_name;
