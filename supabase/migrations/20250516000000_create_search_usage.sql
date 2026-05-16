-- Rate Limiting Table
CREATE TABLE IF NOT EXISTS public.search_usage (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    ip_address TEXT,
    search_type TEXT NOT NULL,
    query_hash TEXT,
    country TEXT,
    searched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indices for performance
CREATE INDEX IF NOT EXISTS idx_search_usage_user_id ON public.search_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_search_usage_ip_address ON public.search_usage(ip_address);
CREATE INDEX IF NOT EXISTS idx_search_usage_searched_at ON public.search_usage(searched_at);

-- RLS
ALTER TABLE public.search_usage ENABLE ROW LEVEL SECURITY;

-- Policy: Admin can do anything
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'admin_all' AND tablename = 'search_usage') THEN
        CREATE POLICY admin_all ON public.search_usage TO service_role USING (true) WITH CHECK (true);
    END IF;
END $$;

-- Policy: Users can view their own usage
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'user_view_own' AND tablename = 'search_usage') THEN
        CREATE POLICY user_view_own ON public.search_usage FOR SELECT TO authenticated USING (auth.uid() = user_id);
    END IF;
END $$;

-- Notify schema reload
NOTIFY pgrst, 'reload schema';
