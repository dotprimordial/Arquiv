    -- ============================================================
    -- Complete Schema Setup for Fresh Database
    -- ============================================================

    -- Enable pgvector extension for embeddings
    CREATE EXTENSION IF NOT EXISTS vector;

    -- ============================================================
    -- 1. COUNTRIES TABLE
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

    ALTER TABLE countries ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "countries_select_public" ON countries;
    CREATE POLICY "countries_select_public" ON countries FOR SELECT USING (true);

    DROP POLICY IF EXISTS "countries_insert_admin" ON countries;
    CREATE POLICY "countries_insert_admin" ON countries FOR INSERT WITH CHECK (auth.email() = 'seantomasytbr@gmail.com');

    DROP POLICY IF EXISTS "countries_update_admin" ON countries;
    CREATE POLICY "countries_update_admin" ON countries FOR UPDATE USING (auth.email() = 'seantomasytbr@gmail.com');

    DROP POLICY IF EXISTS "countries_delete_admin" ON countries;
    CREATE POLICY "countries_delete_admin" ON countries FOR DELETE USING (auth.email() = 'seantomasytbr@gmail.com');

    -- ============================================================
    -- 2. CATEGORIES TABLE
    -- ============================================================
    CREATE TABLE IF NOT EXISTS categories (
        id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
        name VARCHAR(100) NOT NULL UNIQUE,
        description TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_categories_name ON categories(name);

    ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "categories_select_public" ON categories;
    CREATE POLICY "categories_select_public" ON categories FOR SELECT USING (true);

    DROP POLICY IF EXISTS "categories_insert_admin" ON categories;
    CREATE POLICY "categories_insert_admin" ON categories FOR INSERT WITH CHECK (auth.email() = 'seantomasytbr@gmail.com');

    DROP POLICY IF EXISTS "categories_update_admin" ON categories;
    CREATE POLICY "categories_update_admin" ON categories FOR UPDATE USING (auth.email() = 'seantomasytbr@gmail.com');

    DROP POLICY IF EXISTS "categories_delete_admin" ON categories;
    CREATE POLICY "categories_delete_admin" ON categories FOR DELETE USING (auth.email() = 'seantomasytbr@gmail.com');

    -- ============================================================
    -- 3. NORMS TABLE (create from scratch)
    -- ============================================================
    CREATE TABLE IF NOT EXISTS norms (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        code VARCHAR(50) NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        country_id BIGINT NOT NULL,
        category_id BIGINT NOT NULL,
        keywords TEXT[],
        file_url TEXT,
        file_type VARCHAR(50),
        content TEXT,
        structured_content TEXT,
        total_sections INT DEFAULT 0,
        uploaded_by VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

        -- Keep old string columns for backward compatibility
        country VARCHAR(100),
        category VARCHAR(100),

        CONSTRAINT fk_norms_country_id FOREIGN KEY (country_id) REFERENCES countries(id) ON DELETE RESTRICT,
        CONSTRAINT fk_norms_category_id FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
        CONSTRAINT unique_norm_code_country UNIQUE(code, country_id)
    );

    CREATE INDEX IF NOT EXISTS idx_norms_country_id ON norms(country_id);
    CREATE INDEX IF NOT EXISTS idx_norms_category_id ON norms(category_id);
    CREATE INDEX IF NOT EXISTS idx_norms_code ON norms(code);
    CREATE INDEX IF NOT EXISTS idx_norms_title ON norms(title);

    ALTER TABLE norms ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "norms_select_public" ON norms;
    CREATE POLICY "norms_select_public" ON norms FOR SELECT USING (true);

    DROP POLICY IF EXISTS "norms_insert_admin" ON norms;
    CREATE POLICY "norms_insert_admin" ON norms FOR INSERT WITH CHECK (auth.email() = 'seantomasytbr@gmail.com');

    DROP POLICY IF EXISTS "norms_update_admin" ON norms;
    CREATE POLICY "norms_update_admin" ON norms FOR UPDATE USING (auth.email() = 'seantomasytbr@gmail.com');

    DROP POLICY IF EXISTS "norms_delete_admin" ON norms;
    CREATE POLICY "norms_delete_admin" ON norms FOR DELETE USING (auth.email() = 'seantomasytbr@gmail.com');

    -- ============================================================
    -- 4. NORM_SECTIONS TABLE
    -- ============================================================
    CREATE TABLE IF NOT EXISTS norm_sections (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        norm_id UUID NOT NULL REFERENCES norms(id) ON DELETE CASCADE,
        section_type VARCHAR(100),
        section_number VARCHAR(50),
        section_title VARCHAR(255),
        content TEXT NOT NULL,
        content_raw TEXT,
        embedding vector(1536),
        order_index INT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

        CONSTRAINT fk_norm_sections_norm_id FOREIGN KEY (norm_id) REFERENCES norms(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_norm_sections_norm_id ON norm_sections(norm_id);
    CREATE INDEX IF NOT EXISTS idx_norm_sections_embedding ON norm_sections USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 128);

    ALTER TABLE norm_sections ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "norm_sections_select_public" ON norm_sections;
    CREATE POLICY "norm_sections_select_public" ON norm_sections FOR SELECT USING (true);

    DROP POLICY IF EXISTS "norm_sections_insert_admin" ON norm_sections;
    CREATE POLICY "norm_sections_insert_admin" ON norm_sections FOR INSERT WITH CHECK (auth.email() = 'seantomasytbr@gmail.com');

    DROP POLICY IF EXISTS "norm_sections_update_admin" ON norm_sections;
    CREATE POLICY "norm_sections_update_admin" ON norm_sections FOR UPDATE USING (auth.email() = 'seantomasytbr@gmail.com');

    DROP POLICY IF EXISTS "norm_sections_delete_admin" ON norm_sections;
    CREATE POLICY "norm_sections_delete_admin" ON norm_sections FOR DELETE USING (auth.email() = 'seantomasytbr@gmail.com');

    -- ============================================================
    -- 5. SEED COUNTRIES
    -- ============================================================
    INSERT INTO countries (code, name) VALUES
        ('PT', 'Portugal'),
        ('BR', 'Brasil'),
        ('MZ', 'Moçambique'),
        ('AO', 'Angola')
    ON CONFLICT (name) DO NOTHING;

    -- ============================================================
    -- 6. SEED CATEGORIES
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
        ('Apresentação/Desenho', 'Normas de desenho e apresentação')
    ON CONFLICT (name) DO NOTHING;
