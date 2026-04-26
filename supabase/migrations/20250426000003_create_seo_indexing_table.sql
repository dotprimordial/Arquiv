-- Migration: Create SEO indexing status table
-- Track Google Search Console indexing status for norms

-- Create table to track indexing status
CREATE TABLE IF NOT EXISTS seo_indexing_status (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    norm_id UUID REFERENCES norms(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    
    -- Status de indexação
    indexed BOOLEAN DEFAULT false,
    indexed_at TIMESTAMP WITH TIME ZONE,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Tentativas
    submission_attempts INTEGER DEFAULT 1,
    last_error TEXT,
    
    -- Metadados
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_seo_indexing_norm_id ON seo_indexing_status(norm_id);
CREATE INDEX IF NOT EXISTS idx_seo_indexing_submitted ON seo_indexing_status(submitted_at);
CREATE INDEX IF NOT EXISTS idx_seo_indexing_indexed ON seo_indexing_status(indexed);

-- Enable RLS
ALTER TABLE seo_indexing_status ENABLE ROW LEVEL SECURITY;

-- Policy: Only admins can view/edit indexing status
CREATE POLICY "seo_indexing_select_admin" ON seo_indexing_status
    FOR SELECT USING (is_admin_user());

CREATE POLICY "seo_indexing_insert_admin" ON seo_indexing_status
    FOR INSERT WITH CHECK (is_admin_user());

CREATE POLICY "seo_indexing_update_admin" ON seo_indexing_status
    FOR UPDATE USING (is_admin_user());

CREATE POLICY "seo_indexing_delete_admin" ON seo_indexing_status
    FOR DELETE USING (is_admin_user());

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_seo_indexing_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_seo_indexing_timestamp ON seo_indexing_status;
CREATE TRIGGER update_seo_indexing_timestamp
    BEFORE UPDATE ON seo_indexing_status
    FOR EACH ROW
    EXECUTE FUNCTION update_seo_indexing_updated_at();
