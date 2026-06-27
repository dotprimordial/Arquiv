-- Migration: Fix search_norm_sections function country filter
-- Date: 2026-06-27
-- Purpose: Update search function to work with new schema (countries table) and adjust threshold

DROP FUNCTION IF EXISTS public.search_norm_sections CASCADE;

CREATE OR REPLACE FUNCTION public.search_norm_sections(
    query_embedding vector(1536),
    match_threshold FLOAT DEFAULT 0.55,
    match_count INT DEFAULT 10,
    p_country TEXT DEFAULT NULL
)
RETURNS TABLE (
    section_id TEXT,
    norm_id TEXT,
    norm_code TEXT,
    norm_title TEXT,
    norm_country TEXT,
    section_type TEXT,
    section_number TEXT,
    section_title TEXT,
    content TEXT,
    ai_interpretation TEXT,
    similarity FLOAT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ns.id::TEXT as section_id,
        n.id::TEXT as norm_id,
        n.code as norm_code,
        n.title as norm_title,
        c.name as norm_country,
        ns.section_type,
        ns.section_number,
        ns.section_title,
        ns.content,
        ns.ai_interpretation,
        (1 - (ns.embedding <=> query_embedding))::FLOAT as similarity
    FROM norm_sections ns
    JOIN norms n ON n.id = ns.norm_id
    LEFT JOIN countries c ON c.id = n.country_id
    WHERE 
        ns.embedding IS NOT NULL
        AND 1 - (ns.embedding <=> query_embedding) > match_threshold
        AND (p_country IS NULL OR c.name = p_country)
    ORDER BY ns.embedding <=> query_embedding
    LIMIT match_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.search_norm_sections IS 'Função de busca semântica por similaridade de embeddings - updated to use countries table';
