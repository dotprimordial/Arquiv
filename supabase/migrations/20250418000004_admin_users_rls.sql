-- ============================================================
-- Migration: Admin Users Table + Function for RLS
-- Date: 2025-04-18
-- Description: Create admin users table and function for proper RLS
-- ============================================================

-- ============================================================
-- 1. CREATE ADMIN_USERS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS admin_users (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    email VARCHAR(255) NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email);

-- Insert the main admin
INSERT INTO admin_users (email, is_active) VALUES
    ('seantomasytbr@gmail.com', true)
ON CONFLICT (email) DO NOTHING;

-- ============================================================
-- 2. CREATE FUNCTION TO CHECK IF USER IS ADMIN
-- ============================================================
CREATE OR REPLACE FUNCTION is_admin_user()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM admin_users
    WHERE email = auth.email()
    AND is_active = true
  );
$$;

-- ============================================================
-- 3. UPDATE RLS POLICIES TO USE NEW FUNCTION
-- ============================================================

-- NORMS
DROP POLICY IF EXISTS "norms_select_public" ON norms;
CREATE POLICY "norms_select_public" ON norms FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "norms_insert_admin" ON norms;
CREATE POLICY "norms_insert_admin" ON norms FOR INSERT
  WITH CHECK (is_admin_user());

DROP POLICY IF EXISTS "norms_update_admin" ON norms;
CREATE POLICY "norms_update_admin" ON norms FOR UPDATE
  USING (is_admin_user());

DROP POLICY IF EXISTS "norms_delete_admin" ON norms;
CREATE POLICY "norms_delete_admin" ON norms FOR DELETE
  USING (is_admin_user());

-- NORM_SECTIONS
DROP POLICY IF EXISTS "norm_sections_select_public" ON norm_sections;
CREATE POLICY "norm_sections_select_public" ON norm_sections FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "norm_sections_insert_admin" ON norm_sections;
CREATE POLICY "norm_sections_insert_admin" ON norm_sections FOR INSERT
  WITH CHECK (is_admin_user());

DROP POLICY IF EXISTS "norm_sections_update_admin" ON norm_sections;
CREATE POLICY "norm_sections_update_admin" ON norm_sections FOR UPDATE
  USING (is_admin_user());

DROP POLICY IF EXISTS "norm_sections_delete_admin" ON norm_sections;
CREATE POLICY "norm_sections_delete_admin" ON norm_sections FOR DELETE
  USING (is_admin_user());

-- COUNTRIES
DROP POLICY IF EXISTS "countries_select_public" ON countries;
CREATE POLICY "countries_select_public" ON countries FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "countries_insert_admin" ON countries;
CREATE POLICY "countries_insert_admin" ON countries FOR INSERT
  WITH CHECK (is_admin_user());

DROP POLICY IF EXISTS "countries_update_admin" ON countries;
CREATE POLICY "countries_update_admin" ON countries FOR UPDATE
  USING (is_admin_user());

DROP POLICY IF EXISTS "countries_delete_admin" ON countries;
CREATE POLICY "countries_delete_admin" ON countries FOR DELETE
  USING (is_admin_user());

-- CATEGORIES
DROP POLICY IF EXISTS "categories_select_public" ON categories;
CREATE POLICY "categories_select_public" ON categories FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "categories_insert_admin" ON categories;
CREATE POLICY "categories_insert_admin" ON categories FOR INSERT
  WITH CHECK (is_admin_user());

DROP POLICY IF EXISTS "categories_update_admin" ON categories;
CREATE POLICY "categories_update_admin" ON categories FOR UPDATE
  USING (is_admin_user());

DROP POLICY IF EXISTS "categories_delete_admin" ON categories;
CREATE POLICY "categories_delete_admin" ON categories FOR DELETE
  USING (is_admin_user());
