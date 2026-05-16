-- Create table for tracking user searches (rate limiting)
CREATE TABLE search_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  search_type TEXT NOT NULL, -- 'semantic', 'keyword', 'browse'
  searched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  country TEXT,
  query_hash TEXT, -- Hash of the query for deduplication
  ip_address TEXT, -- For tracking abuse patterns
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for efficient queries
CREATE INDEX idx_search_usage_user_time ON search_usage(user_id, searched_at DESC);
CREATE INDEX idx_search_usage_ip_time ON search_usage(ip_address, searched_at DESC);

-- Enable RLS for search_usage table
ALTER TABLE search_usage ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see their own search history
CREATE POLICY search_usage_user_access ON search_usage
  FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policy: Admin can see all search usage
CREATE POLICY search_usage_admin_access ON search_usage
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE admin_users.user_id = auth.uid()
    )
  );

-- Create aggregate view for search statistics
CREATE OR REPLACE VIEW user_search_stats AS
SELECT 
  user_id,
  COUNT(*) as total_searches,
  COUNT(*) FILTER (WHERE searched_at > NOW() - INTERVAL '1 hour') as searches_last_hour,
  COUNT(*) FILTER (WHERE searched_at > NOW() - INTERVAL '1 day') as searches_last_day,
  COUNT(*) FILTER (WHERE search_type = 'semantic') as semantic_searches,
  MAX(searched_at) as last_search
FROM search_usage
GROUP BY user_id;
