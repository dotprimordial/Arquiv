-- ============================================================
-- Migration: Normalization - Separate Countries and Categories
-- Date: 2025-04-14
-- Description: Refactor from monolithic norms table to normalized schema
--              with countries and categories as separate tables
-- ============================================================

-- ============================================================
-- 1. CREATE COUNTRIES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS countries (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    code VARCHAR(3) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT code_format CHECK (code ~ '^[A-Z]{2}$')
);

CREATE INDEX IF NOT EXISTS idx_countries_code ON countries(code);
CREATE INDEX IF NOT EXISTS idx_countries_name ON countries(name);

-- Enable RLS on countries
ALTER TABLE countries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "countries_select_public" ON countries;
CREATE POLICY "countries_select_public" ON countries FOR SELECT USING (true);

-- ============================================================
-- 2. CREATE CATEGORIES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS categories (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_categories_name ON categories(name);

-- Enable RLS on categories
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "categories_select_public" ON categories;
CREATE POLICY "categories_select_public" ON categories FOR SELECT USING (true);

-- ============================================================
-- 3. ADD FOREIGN KEY COLUMNS TO NORMS
-- ============================================================
-- Add new FK columns (non-nullable initially, will be filled during migration)
ALTER TABLE norms
ADD COLUMN IF NOT EXISTS country_id BIGINT,
ADD COLUMN IF NOT EXISTS category_id BIGINT;

-- Add foreign key constraints
ALTER TABLE norms
ADD CONSTRAINT fk_norms_country_id FOREIGN KEY (country_id) REFERENCES countries(id) ON DELETE RESTRICT,
ADD CONSTRAINT fk_norms_category_id FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL;

-- Create indexes for better join performance
CREATE INDEX IF NOT EXISTS idx_norms_country_id ON norms(country_id);
CREATE INDEX IF NOT EXISTS idx_norms_category_id ON norms(category_id);

-- ============================================================
-- 4. SEED COUNTRIES TABLE
-- ============================================================
INSERT INTO countries (code, name) VALUES
    ('PT', 'Portugal'),
    ('BR', 'Brasil'),
    ('MZ', 'Moçambique'),
    ('AO', 'Angola')
ON CONFLICT (name) DO NOTHING;

-- Insert any additional countries from existing norms data
INSERT INTO countries (code, name)
SELECT DISTINCT '', norms.country
FROM norms
WHERE norms.country NOT IN (SELECT name FROM countries)
  AND norms.country IS NOT NULL
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- 5. SEED CATEGORIES TABLE
-- ============================================================
INSERT INTO categories (name, description) VALUES
    ('Urbanismo', 'Normas de planejamento urbano'),
    ('Estruturas', 'Normas estruturais e de engenharia'),
    ('Segurança contra Incêndio', 'Segurança contra incêndios'),
    ('Acessibilidade', 'Acessibilidade para pessoas com deficiência'),
    ('Instalações Elétricas', 'Normas de instalações elétricas'),
    ('Instalações Hidráulicas', 'Normas de instalações hidráulicas'),
    ('Térmica e Acústica', 'Isolamento térmico e acústico'),
    ('Materiais', 'Especificações de materiais de construção'),
    ('Sustentabilidade', 'Normas de sustentabilidade'),
    ('Apresentação/Desenho', 'Normas de desenho e apresentação'),
    ('Administração Municipal', 'Normas de administração e gestão municipal')
ON CONFLICT (name) DO NOTHING;

-- Insert any additional categories from existing norms data
INSERT INTO categories (name)
SELECT DISTINCT norms.category
FROM norms
WHERE norms.category NOT IN (SELECT name FROM categories)
  AND norms.category IS NOT NULL
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- 6. MIGRATE DATA: Link countries
-- ============================================================
UPDATE norms n
SET country_id = c.id
FROM countries c
WHERE n.country = c.name AND n.country_id IS NULL;

-- For any remaining NULLs (shouldn't exist), set to first available country
UPDATE norms
SET country_id = COALESCE(country_id, (SELECT id FROM countries LIMIT 1))
WHERE country_id IS NULL;

-- ============================================================
-- 7. MIGRATE DATA: Link categories
-- ============================================================
UPDATE norms n
SET category_id = cat.id
FROM categories cat
WHERE n.category = cat.name AND n.category_id IS NULL;

-- For any remaining NULLs, set to 'Estruturas' as default
UPDATE norms
SET category_id = COALESCE(category_id, (SELECT id FROM categories WHERE name = 'Estruturas' LIMIT 1))
WHERE category_id IS NULL;

-- ============================================================
-- 8. VALIDATION QUERIES (check these in Supabase dashboard)
-- ============================================================
-- SELECT COUNT(*) as missing_countries FROM norms WHERE country_id IS NULL;
-- SELECT COUNT(*) as missing_categories FROM norms WHERE category_id IS NULL;
-- SELECT c.name, COUNT(n.id) as norm_count FROM countries c LEFT JOIN norms n ON n.country_id = c.id GROUP BY c.id, c.name ORDER BY norm_count DESC;

-- ============================================================
-- 9. MAKE FOREIGN KEYS NOT NULL (after verification)
-- ============================================================
ALTER TABLE norms
ALTER COLUMN country_id SET NOT NULL,
ALTER COLUMN category_id SET NOT NULL;

-- ============================================================
-- 10. UPDATE RLS POLICIES — ensure admin can still modify
-- ============================================================
-- Norms policies remain unchanged, but ensure they're in place
ALTER TABLE norms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "norms_select_public" ON norms;
CREATE POLICY "norms_select_public"
  ON norms FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "norms_insert_admin" ON norms;
CREATE POLICY "norms_insert_admin"
  ON norms FOR INSERT
  WITH CHECK (auth.email() = 'seantomasytbr@gmail.com');

DROP POLICY IF EXISTS "norms_update_admin" ON norms;
CREATE POLICY "norms_update_admin"
  ON norms FOR UPDATE
  USING (auth.email() = 'seantomasytbr@gmail.com');

DROP POLICY IF EXISTS "norms_delete_admin" ON norms;
CREATE POLICY "norms_delete_admin"
  ON norms FOR DELETE
  USING (auth.email() = 'seantomasytbr@gmail.com');

-- ============================================================
-- NOTE: Old string columns (country, category) are kept
--       for 2-week transition period, then can be dropped
-- To drop (after verification):
-- ALTER TABLE norms DROP COLUMN country;
-- ALTER TABLE norms DROP COLUMN category;
-- ============================================================
