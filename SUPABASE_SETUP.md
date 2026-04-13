# Configuração do Supabase para Busca Semântica

## Passo 1: Habilitar Extensão pgvector

1. Acesse o dashboard do Supabase: https://app.supabase.com
2. Selecione seu projeto
3. Vá em "Database" → "Extensions"
4. Procure por "vector" e habilite a extensão **pgvector**

Ou execute via SQL Editor:
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

## Passo 2: Aplicar a Migração SQL

1. No dashboard do Supabase, vá em "SQL Editor"
2. Crie uma "New Query"
3. Cole o conteúdo do arquivo `supabase/migrations/20250403000000_semantic_search.sql`
4. Clique em "Run"

Isso criará:
- Tabela `norm_sections` com campo `embedding` (vector 1536 dimensões)
- Índices para performance
- Função `search_norm_sections()` para busca semântica

## Passo 3: Verificar se as Tabelas foram Criadas

Execute no SQL Editor:
```sql
-- Verificar se a tabela norm_sections existe
SELECT * FROM information_schema.tables 
WHERE table_name = 'norm_sections';

-- Verificar se a função de busca existe
SELECT * FROM pg_proc 
WHERE proname = 'search_norm_sections';
```

## Passo 4: Configurar Variáveis de Ambiente

No arquivo `.env.local` do projeto:
```env
NEXT_PUBLIC_SUPABASE_URL=sua_url_do_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_anon
NEXT_PUBLIC_OPENROUTER_API_KEY=sua_chave_openrouter
```

## Passo 5: Testar a Configuração

Após configurar, faça upload de uma norma via `/upload` e teste a busca semântica.

## Troubleshooting

### Erro: "function search_norm_sections does not exist"
- A migração SQL não foi aplicada. Execute o Passo 2.

### Erro: "type 'vector' does not exist"
- A extensão pgvector não está habilitada. Execute o Passo 1.

### Erro: "column 'embedding' does not exist"
- A tabela norm_sections não foi criada. Execute o Passo 2.

## Estrutura Criada

### Tabela: norm_sections
- `id` - UUID primário
- `norm_id` - Referência à norma pai
- `section_type` - Tipo (capitulo, artigo, secao, etc)
- `section_number` - Número/identificador
- `section_title` - Título da seção
- `content` - Conteúdo textual
- `embedding` - Vetor de 1536 dimensões (OpenAI embeddings)
- `order_index` - Ordem sequencial

### Função: search_norm_sections()
Busca seções por similaridade semântica usando cosine similarity.

## Próximos Passos

1. Aplicar a migração SQL no Supabase
2. Fazer upload de algumas normas para testar
3. Testar a busca semântica na interface
