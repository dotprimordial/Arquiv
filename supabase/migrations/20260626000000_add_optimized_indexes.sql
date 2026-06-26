-- Migration: Add Optimized Database Indexes
-- Date: 2026-06-26
-- Purpose: Optimize database queries with composite indexes and improve rate limiting performance

-- ============================================================
-- 1. SEARCH_USAGE TABLE INDEX OPTIMIZATION
-- ============================================================

-- Add search_type to composite indexes for better rate limiting performance
-- This optimizes queries that filter by ip_address/user_id, search_type, and searched_at together
CREATE INDEX IF NOT EXISTS idx_search_usage_ip_type_searched_at 
  ON search_usage(ip_address, search_type, searched_at DESC) 
  WHERE ip_address IS NOT NULL;

COMMENT ON INDEX idx_search_usage_ip_type_searched_at IS 
  'Optimizes rate limit lookups for anonymous users by IP, search type, and timestamp';

CREATE INDEX IF NOT EXISTS idx_search_usage_user_type_searched_at 
  ON search_usage(user_id, search_type, searched_at DESC) 
  WHERE user_id IS NOT NULL;

COMMENT ON INDEX idx_search_usage_user_type_searched_at IS 
  'Optimizes rate limit lookups for authenticated users by user ID, search type, and timestamp';

-- Add index for SEO indexing status queries
CREATE INDEX IF NOT EXISTS idx_search_usage_submitted_at 
  ON search_usage(submitted_at DESC);

COMMENT ON INDEX idx_search_usage_submitted_at IS 
  'Optimizes SEO indexing status queries ordered by submission time';

-- ============================================================
-- 2. NORMS TABLE COMPOSITE INDEXES
-- ============================================================

-- Composite index for combined country and category filtering
-- Optimizes queries that filter by both country_id and category_id
CREATE INDEX IF NOT EXISTS idx_norms_country_category 
  ON norms(country_id, category_id);

COMMENT ON INDEX idx_norms_country_category IS 
  'Optimizes queries filtering norms by country and category together';

-- Composite index for country + code lookups (supports unique constraint)
-- Optimizes queries that look up norms by country and code
CREATE INDEX IF NOT EXISTS idx_norms_country_code 
  ON norms(country_id, code);

COMMENT ON INDEX idx_norms_country_code IS 
  'Optimizes unique norm lookups by country and code';

-- Index for trending queries ordered by creation date
-- Optimizes queries that fetch recently added norms
CREATE INDEX IF NOT EXISTS idx_norms_created_at 
  ON norms(created_at DESC);

COMMENT ON INDEX idx_norms_created_at IS 
  'Optimizes trending/recent norms queries ordered by creation date';
