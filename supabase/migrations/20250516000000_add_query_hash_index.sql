-- Migration: Add index on search_usage.query_hash for query deduplication
-- Date: 2025-05-16
-- Purpose: Optimize query deduplication checks in rate limiting

-- Create index for efficient query hash lookups
CREATE INDEX IF NOT EXISTS idx_search_usage_query_hash 
  ON search_usage(query_hash)
  WHERE query_hash IS NOT NULL;

COMMENT ON INDEX idx_search_usage_query_hash IS 
  'Optimizes query deduplication checks for rate limiting';
