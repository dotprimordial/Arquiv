-- ============================================================
-- Migration: Correções de RLS, Busca Semântica e Performance
-- ============================================================

-- ============================================================
-- 1. RLS POLICIES — Fix para delete/update falhar silenciosamente
-- ============================================================

-- Habilitar RLS nas tabelas (se ainda não estiver ativo)
ALTER TABLE norms ENABLE ROW LEVEL SECURITY;
ALTER TABLE norm_sections ENABLE ROW LEVEL SECURITY;

-- Política: qualquer utilizador autenticado pode ler normas
DROP POLICY IF EXISTS "norms_select_public" ON norms;
CREATE POLICY "norms_select_public"
  ON norms FOR SELECT
  USING (true); -- leitura pública

-- Política: apenas admin pode inserir normas
DROP POLICY IF EXISTS "norms_insert_admin" ON norms;
CREATE POLICY "norms_insert_admin"
  ON norms FOR INSERT
  WITH CHECK (auth.email() = 'seantomasytbr@gmail.com');

-- Política: apenas admin pode atualizar normas
DROP POLICY IF EXISTS "norms_update_admin" ON norms;
CREATE POLICY "norms_update_admin"
  ON norms FOR UPDATE
  USING (auth.email() = 'seantomasytbr@gmail.com');

-- Política: apenas admin pode deletar normas
DROP POLICY IF EXISTS "norms_delete_admin" ON norms;
CREATE POLICY "norms_delete_admin"
  ON norms FOR DELETE
  USING (auth.email() = 'seantomasytbr@gmail.com');

-- Políticas para norm_sections (espelha a lógica de norms)
DROP POLICY IF EXISTS "sections_select_public" ON norm_sections;
CREATE POLICY "sections_select_public"
  ON norm_sections FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "sections_insert_admin" ON norm_sections;
CREATE POLICY "sections_insert_admin"
  ON norm_sections FOR INSERT
  WITH CHECK (auth.email() = 'seantomasytbr@gmail.com');

DROP POLICY IF EXISTS "sections_delete_admin" ON norm_sections;
CREATE POLICY "sections_delete_admin"
  ON norm_sections FOR DELETE
  USING (auth.email() = 'seantomasytbr@gmail.com');

-- ============================================================
-- 2. FUNÇÃO DE BUSCA SEMÂNTICA MELHORADA
--    Fix: filtro de país aplicado corretamente
--    Fix: threshold configurável
--    Fix: ordenação por similarity DESC
-- ============================================================
CREATE OR REPLACE FUNCTION search_norm_sections(
    query_embedding vector(1536),
    match_threshold FLOAT DEFAULT 0.4,
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
        n.code::TEXT as norm_code,
        n.title as norm_title,
        n.country as norm_country,
        ns.section_type,
        ns.section_number,
        ns.section_title,
        ns.content,
        1 - (ns.embedding <=> query_embedding) as similarity
    FROM norm_sections ns
    INNER JOIN norms n ON n.id = ns.norm_id
    WHERE
        ns.embedding IS NOT NULL
        AND 1 - (ns.embedding <=> query_embedding) > match_threshold
        -- FIX: filtro de país com cast explícito para evitar type mismatch
        AND (p_country IS NULL OR n.country::VARCHAR = p_country::VARCHAR)
    ORDER BY ns.embedding <=> query_embedding ASC
    LIMIT match_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 3. ÍNDICE IVFFLAT — Garantir que está criado corretamente
--    O índice precisa de pelo menos 100 registos para funcionar
-- ============================================================
DROP INDEX IF EXISTS idx_norm_sections_embedding;
CREATE INDEX IF NOT EXISTS idx_norm_sections_embedding
  ON norm_sections USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 10); -- listas = max(1, sqrt(nrows)); 10 é seguro para < 1000 registos

-- Índice parcial para filtrar apenas seções com embedding
CREATE INDEX IF NOT EXISTS idx_norm_sections_embedding_notnull
  ON norm_sections (norm_id)
  WHERE embedding IS NOT NULL;

-- ============================================================
-- 4. ÍNDICE NO CAMPO COUNTRY DE NORMS — Fix de latência
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_norms_country ON norms(country);
CREATE INDEX IF NOT EXISTS idx_norms_country_category ON norms(country, category);

-- ============================================================
-- 5. CACHE DE BUSCAS — Tabela e função de limpeza automática
-- ============================================================
CREATE TABLE IF NOT EXISTS search_cache (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    query_hash VARCHAR(64) UNIQUE NOT NULL,
    query_text TEXT NOT NULL,
    country VARCHAR,
    results JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '2 hours'
);

CREATE INDEX IF NOT EXISTS idx_search_cache_hash ON search_cache(query_hash);
CREATE INDEX IF NOT EXISTS idx_search_cache_expires ON search_cache(expires_at);

-- Limpeza automática de cache via trigger no INSERT
CREATE OR REPLACE FUNCTION cleanup_expired_cache()
RETURNS TRIGGER AS $$
BEGIN
    DELETE FROM search_cache WHERE expires_at < NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_cleanup_cache ON search_cache;
CREATE TRIGGER trigger_cleanup_cache
    AFTER INSERT ON search_cache
    FOR EACH STATEMENT
    EXECUTE FUNCTION cleanup_expired_cache();

-- RLS para search_cache
ALTER TABLE search_cache ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "cache_select_public" ON search_cache;
CREATE POLICY "cache_select_public" ON search_cache FOR SELECT USING (true);
DROP POLICY IF EXISTS "cache_insert_all" ON search_cache;
CREATE POLICY "cache_insert_all" ON search_cache FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "cache_delete_expired" ON search_cache;
CREATE POLICY "cache_delete_expired" ON search_cache FOR DELETE USING (expires_at < NOW());
