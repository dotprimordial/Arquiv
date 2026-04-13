-- Migration: Sistema de Busca Semântica de Normas
-- Cria tabelas para ingestão inteligente e busca por embeddings

-- ============================================
-- Tabela norms (atualizada)
-- ============================================
-- Já existe, mas garantindo estrutura completa
ALTER TABLE IF EXISTS norms 
ADD COLUMN IF NOT EXISTS file_type VARCHAR(10) CHECK (file_type IN ('pdf', 'text')),
ADD COLUMN IF NOT EXISTS file_url TEXT,
ADD COLUMN IF NOT EXISTS structured_content JSONB,
ADD COLUMN IF NOT EXISTS total_sections INTEGER DEFAULT 0;

-- ============================================
-- Tabela norm_sections (nova)
-- ============================================
CREATE TABLE IF NOT EXISTS norm_sections (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    norm_id UUID REFERENCES norms(id) ON DELETE CASCADE,
    
    -- Hierarquia técnica
    section_type VARCHAR(20) NOT NULL CHECK (section_type IN ('capitulo', 'artigo', 'secao', 'subsecao', 'item', 'alinea', 'paragrafo')),
    section_number VARCHAR(50),
    section_title TEXT,
    
    -- Conteúdo
    content TEXT NOT NULL,
    content_raw TEXT, -- Texto bruto original
    
    -- Busca semântica (vector embedding)
    embedding vector(1536), -- Dimensão compatível com OpenAI text-embedding-3-small
    
    -- Metadados
    page_number INTEGER,
    order_index INTEGER NOT NULL DEFAULT 0,
    parent_section_id UUID REFERENCES norm_sections(id) ON DELETE CASCADE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_norm_sections_norm_id ON norm_sections(norm_id);
CREATE INDEX IF NOT EXISTS idx_norm_sections_type ON norm_sections(section_type);
CREATE INDEX IF NOT EXISTS idx_norm_sections_order ON norm_sections(norm_id, order_index);
CREATE INDEX IF NOT EXISTS idx_norm_sections_embedding ON norm_sections USING ivfflat (embedding vector_cosine_ops);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_norm_sections_updated_at ON norm_sections;
CREATE TRIGGER update_norm_sections_updated_at
    BEFORE UPDATE ON norm_sections
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Função de busca semântica
-- ============================================
CREATE OR REPLACE FUNCTION search_norm_sections(
    query_embedding vector(1536),
    match_threshold FLOAT DEFAULT 0.7,
    match_count INT DEFAULT 10,
    p_country VARCHAR DEFAULT NULL
)
RETURNS TABLE (
    section_id UUID,
    norm_id UUID,
    norm_code TEXT,
    norm_title TEXT,
    norm_country VARCHAR,
    section_type VARCHAR,
    section_number VARCHAR,
    section_title TEXT,
    content TEXT,
    similarity FLOAT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ns.id as section_id,
        n.id as norm_id,
        n.code as norm_code,
        n.title as norm_title,
        n.country as norm_country,
        ns.section_type,
        ns.section_number,
        ns.section_title,
        ns.content,
        1 - (ns.embedding <=> query_embedding) as similarity
    FROM norm_sections ns
    JOIN norms n ON n.id = ns.norm_id
    WHERE 
        ns.embedding IS NOT NULL
        AND 1 - (ns.embedding <=> query_embedding) > match_threshold
        AND (p_country IS NULL OR n.country = p_country)
    ORDER BY ns.embedding <=> query_embedding
    LIMIT match_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Função para gerar embeddings (placeholder)
-- ============================================
CREATE OR REPLACE FUNCTION generate_embedding(content_text TEXT)
RETURNS vector(1536) AS $$
-- Esta função será chamada pelo backend
-- O embedding real é gerado via API OpenAI no servidor
BEGIN
    RETURN NULL; -- Placeholder
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Tabela para cache de buscas (opcional - para performance)
-- ============================================
CREATE TABLE IF NOT EXISTS search_cache (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    query_hash VARCHAR(64) UNIQUE,
    query_text TEXT,
    country VARCHAR,
    results JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '1 hour'
);

CREATE INDEX IF NOT EXISTS idx_search_cache_hash ON search_cache(query_hash);
CREATE INDEX IF NOT EXISTS idx_search_cache_expires ON search_cache(expires_at);

-- Função para limpar cache expirado
CREATE OR REPLACE FUNCTION cleanup_expired_cache()
RETURNS void AS $$
BEGIN
    DELETE FROM search_cache WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;
