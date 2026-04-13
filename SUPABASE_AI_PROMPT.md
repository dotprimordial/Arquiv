# Prompt para IA Assistant do Supabase

Copie e cole este texto na conversa com a IA Assistant do Supabase (no canto inferior direito do dashboard):

---

## PROMPT PARA COPIAR:

```
Preciso configurar meu banco de dados para busca semântica de normas técnicas. 

Por favor, execute os seguintes comandos em ordem:

1. Primeiro, habilite a extensão pgvector se ainda não estiver habilitada:
CREATE EXTENSION IF NOT EXISTS vector;

2. Crie a tabela norm_sections para armazenar seções de normas com embeddings vetoriais:
CREATE TABLE IF NOT EXISTS norm_sections (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    norm_id UUID REFERENCES norms(id) ON DELETE CASCADE,
    section_type VARCHAR(20) NOT NULL CHECK (section_type IN ('capitulo', 'artigo', 'secao', 'subsecao', 'item', 'alinea', 'paragrafo')),
    section_number VARCHAR(50),
    section_title TEXT,
    content TEXT NOT NULL,
    content_raw TEXT,
    embedding vector(1536),
    page_number INTEGER,
    order_index INTEGER NOT NULL DEFAULT 0,
    parent_section_id UUID REFERENCES norm_sections(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

3. Crie índices para performance:
CREATE INDEX IF NOT EXISTS idx_norm_sections_norm_id ON norm_sections(norm_id);
CREATE INDEX IF NOT EXISTS idx_norm_sections_type ON norm_sections(section_type);
CREATE INDEX IF NOT EXISTS idx_norm_sections_order ON norm_sections(norm_id, order_index);
CREATE INDEX IF NOT EXISTS idx_norm_sections_embedding ON norm_sections USING ivfflat (embedding vector_cosine_ops);

4. Crie a função de busca semântica:
CREATE OR REPLACE FUNCTION search_norm_sections(
    query_embedding vector(1536),
    match_threshold FLOAT DEFAULT 0.5,
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

5. Adicione colunas extras à tabela norms se não existirem:
ALTER TABLE IF EXISTS norms 
ADD COLUMN IF NOT EXISTS file_type VARCHAR(10),
ADD COLUMN IF NOT EXISTS file_url TEXT,
ADD COLUMN IF NOT EXISTS structured_content JSONB,
ADD COLUMN IF NOT EXISTS total_sections INTEGER DEFAULT 0;

Após executar, confirme se tudo foi criado corretamente.
```

---

## COMO USAR:

1. Acesse: https://app.supabase.com
2. Entre no seu projeto
3. No canto **inferior direito**, clique no ícone de **chat/robô** (IA Assistant)
4. Cole o prompt acima
5. A IA vai executar automaticamente os comandos SQL
6. Aguarde a confirmação de que tudo foi criado

---

## O QUE SERÁ CRIADO:

- ✅ Extensão pgvector habilitada
- ✅ Tabela `norm_sections` com campo `embedding` (vetor 1536 dimensões)
- ✅ Índices otimizados para busca rápida
- ✅ Função `search_norm_sections()` para busca semântica
- ✅ Colunas extras na tabela `norms`

---

Após a IA confirmar, sua busca semântica estará pronta para funcionar!
