-- ============================================================
-- SCRIPT: Corrigir Upload do Admin - Arquiv
-- Cole este script no SQL Editor do Supabase e execute
-- ============================================================


-- ============================================================
-- PARTE 1: LIMPAR POLÍTICAS ANTIGAS CONFLITUOSAS
-- ============================================================

-- Norms
DROP POLICY IF EXISTS "norms_select_public"        ON norms;
DROP POLICY IF EXISTS "norms_insert_admin"         ON norms;
DROP POLICY IF EXISTS "norms_update_admin"         ON norms;
DROP POLICY IF EXISTS "norms_delete_admin"         ON norms;
DROP POLICY IF EXISTS "Allow admin insert"         ON norms;
DROP POLICY IF EXISTS "Allow admin update"         ON norms;
DROP POLICY IF EXISTS "Allow admin delete"         ON norms;
DROP POLICY IF EXISTS "Allow public read"          ON norms;

-- Norm Sections
DROP POLICY IF EXISTS "norm_sections_select_public" ON norm_sections;
DROP POLICY IF EXISTS "norm_sections_insert_admin"  ON norm_sections;
DROP POLICY IF EXISTS "norm_sections_update_admin"  ON norm_sections;
DROP POLICY IF EXISTS "norm_sections_delete_admin"  ON norm_sections;

-- Countries
DROP POLICY IF EXISTS "countries_select_public"    ON countries;
DROP POLICY IF EXISTS "countries_insert_admin"     ON countries;
DROP POLICY IF EXISTS "countries_update_admin"     ON countries;
DROP POLICY IF EXISTS "countries_delete_admin"     ON countries;

-- Categories
DROP POLICY IF EXISTS "categories_select_public"   ON categories;
DROP POLICY IF EXISTS "categories_insert_admin"    ON categories;
DROP POLICY IF EXISTS "categories_update_admin"    ON categories;
DROP POLICY IF EXISTS "categories_delete_admin"    ON categories;


-- ============================================================
-- PARTE 2: CRIAR TABELA admin_users (limpa e única)
-- ============================================================

CREATE TABLE IF NOT EXISTS admin_users (
    id      BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    email   VARCHAR(255) NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inserir o admin principal
INSERT INTO admin_users (email, is_active)
VALUES ('seantomasytbr@gmail.com', true)
ON CONFLICT (email) DO UPDATE SET is_active = true;

-- RLS na própria tabela admin_users
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_users_select" ON admin_users;
CREATE POLICY "admin_users_select" ON admin_users FOR SELECT
  USING (auth.email() = email);


-- ============================================================
-- PARTE 3: FUNÇÃO CENTRAL is_admin_user()
-- (SECURITY DEFINER para contornar RLS ao consultar admin_users)
-- ============================================================

CREATE OR REPLACE FUNCTION is_admin_user()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admin_users
    WHERE email = auth.email()
      AND is_active = true
  );
$$;

-- Permissão para usuários autenticados chamarem a função
GRANT EXECUTE ON FUNCTION is_admin_user() TO authenticated;
GRANT EXECUTE ON FUNCTION is_admin_user() TO anon;


-- ============================================================
-- PARTE 4: RECRIAR POLÍTICAS RLS COM is_admin_user()
-- ============================================================

-- ---- NORMS ----
ALTER TABLE norms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "norms_select_public" ON norms
  FOR SELECT USING (true);

CREATE POLICY "norms_insert_admin" ON norms
  FOR INSERT WITH CHECK (is_admin_user());

CREATE POLICY "norms_update_admin" ON norms
  FOR UPDATE USING (is_admin_user());

CREATE POLICY "norms_delete_admin" ON norms
  FOR DELETE USING (is_admin_user());

-- ---- NORM_SECTIONS ----
ALTER TABLE norm_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "norm_sections_select_public" ON norm_sections
  FOR SELECT USING (true);

CREATE POLICY "norm_sections_insert_admin" ON norm_sections
  FOR INSERT WITH CHECK (is_admin_user());

CREATE POLICY "norm_sections_update_admin" ON norm_sections
  FOR UPDATE USING (is_admin_user());

CREATE POLICY "norm_sections_delete_admin" ON norm_sections
  FOR DELETE USING (is_admin_user());

-- ---- COUNTRIES ----
ALTER TABLE countries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "countries_select_public" ON countries
  FOR SELECT USING (true);

CREATE POLICY "countries_insert_admin" ON countries
  FOR INSERT WITH CHECK (is_admin_user());

CREATE POLICY "countries_update_admin" ON countries
  FOR UPDATE USING (is_admin_user());

CREATE POLICY "countries_delete_admin" ON countries
  FOR DELETE USING (is_admin_user());

-- ---- CATEGORIES ----
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "categories_select_public" ON categories
  FOR SELECT USING (true);

CREATE POLICY "categories_insert_admin" ON categories
  FOR INSERT WITH CHECK (is_admin_user());

CREATE POLICY "categories_update_admin" ON categories
  FOR UPDATE USING (is_admin_user());

CREATE POLICY "categories_delete_admin" ON categories
  FOR DELETE USING (is_admin_user());


-- ============================================================
-- PARTE 5: STORAGE BUCKET para PDFs
-- ============================================================

-- Criar bucket "arquiv-files" (público para leitura)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'arquiv-files',
  'arquiv-files',
  true,
  52428800,  -- 50 MB
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO UPDATE
  SET public = true,
      file_size_limit = 52428800,
      allowed_mime_types = ARRAY['application/pdf'];

-- Limpar políticas antigas do bucket
DROP POLICY IF EXISTS "arquiv_storage_select"  ON storage.objects;
DROP POLICY IF EXISTS "arquiv_storage_insert"  ON storage.objects;
DROP POLICY IF EXISTS "arquiv_storage_update"  ON storage.objects;
DROP POLICY IF EXISTS "arquiv_storage_delete"  ON storage.objects;

-- Leitura pública
CREATE POLICY "arquiv_storage_select" ON storage.objects
  FOR SELECT USING (bucket_id = 'arquiv-files');

-- Upload apenas para admin
CREATE POLICY "arquiv_storage_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'arquiv-files'
    AND is_admin_user()
  );

-- Actualização apenas para admin
CREATE POLICY "arquiv_storage_update" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'arquiv-files'
    AND is_admin_user()
  );

-- Eliminação apenas para admin
CREATE POLICY "arquiv_storage_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'arquiv-files'
    AND is_admin_user()
  );


-- ============================================================
-- PARTE 6: VERIFICAÇÃO FINAL
-- ============================================================

-- Ver se o admin está registado
SELECT 'admin_users' AS tabela, email, is_active
FROM admin_users;

-- Ver todas as políticas activas
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE tablename IN ('norms', 'norm_sections', 'countries', 'categories', 'objects')
ORDER BY tablename, cmd;

-- Testar a função (deve retornar TRUE quando executado como o admin)
-- SELECT is_admin_user();

SELECT 'Script executado com sucesso!' AS resultado;
