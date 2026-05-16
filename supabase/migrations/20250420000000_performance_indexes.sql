-- Migration: Performance Optimization - Database Indexes
-- Date: 2025-04-20
-- Purpose: Add strategic indexes to optimize rate limiting, semantic search, and norm filtering queries

-- ============================================================
-- 1. SEARCH_USAGE TABLE INDEXES (Rate Limiting)
-- ============================================================

-- Index for authenticated user rate limiting queries
-- Optimizes: SELECT COUNT(*) FROM search_usage 
--           WHERE user_id = $1 AND searched_at > $2
CREATE INDEX IF NOT EXISTS idx_search_usage_user_searched_at 
  ON search_usage(user_id, searched_at DESC)
  WHERE user_id IS NOT NULL;

COMMENT ON INDEX idx_search_usage_user_searched_at IS 
  'Optimizes rate limit lookups for authenticated users by user_id and timestamp';

-- Index for anonymous user rate limiting queries
-- Optimizes: SELECT COUNT(*) FROM search_usage 
--           WHERE ip_address = $1 AND searched_at > $2
CREATE INDEX IF NOT EXISTS idx_search_usage_ip_searched_at 
  ON search_usage(ip_address, searched_at DESC)
  WHERE ip_address IS NOT NULL;

COMMENT ON INDEX idx_search_usage_ip_searched_at IS 
  'Optimizes rate limit lookups for anonymous users by IP address and timestamp';

-- ============================================================
-- 2. NORM_SECTIONS TABLE INDEXES (Semantic Search)
-- ============================================================

-- Index for efficient sorting of semantic search results by similarity
-- Optimizes: ORDER BY similarity DESC when norm_id is filtered
-- Note: Similarity calculated as (1 - embedding <=> query_embedding) 
-- so we index norm_id for filtering on results already sorted by embedding distance
CREATE INDEX IF NOT EXISTS idx_norm_sections_norm_id_order 
  ON norm_sections(norm_id ASC, order_index ASC)
  WHERE embedding IS NOT NULL;

COMMENT ON INDEX idx_norm_sections_norm_id_order IS 
  'Optimizes semantic search result ordering and filtering by norm and section order';

-- ============================================================
-- 3. NORMS TABLE INDEXES (Norm Filtering)
-- ============================================================

-- Index for filtering and grouping norms by country and category
-- Optimizes: SELECT ... FROM norms 
--           WHERE country_id = $1 AND category_id = $2
CREATE INDEX IF NOT EXISTS idx_norms_country_category 
  ON norms(country_id, category_id)
  WHERE country_id IS NOT NULL AND category_id IS NOT NULL;

COMMENT ON INDEX idx_norms_country_category IS 
  'Optimizes norm filtering by country and category combinations';

-- ============================================================
-- 4. NORM_SECTIONS EMBEDDING INDEX (Embedding Lookups)
-- ============================================================

-- Index for fast lookups of sections by norm_id where embeddings exist
-- Optimizes: SELECT ... FROM norm_sections 
--           WHERE norm_id = $1 AND embedding IS NOT NULL
CREATE INDEX IF NOT EXISTS idx_norm_sections_norm_embedding 
  ON norm_sections(norm_id)
  WHERE embedding IS NOT NULL;

COMMENT ON INDEX idx_norm_sections_norm_embedding IS 
  'Optimizes embedding lookups by norm_id for sections with computed embeddings';
