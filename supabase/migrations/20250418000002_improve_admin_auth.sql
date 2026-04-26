-- ============================================================
-- Migration: Improve Admin Authentication System
-- Date: 2025-04-18
-- Description: Add admin user management table for better RLS control
-- ============================================================

-- ============================================================
-- 1. CREATE AUTH_ADMIN_USERS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS auth_admin_users (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    email VARCHAR(255) NOT NULL UNIQUE,
    user_id UUID UNIQUE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auth_admin_users_email ON auth_admin_users(email);
CREATE INDEX IF NOT EXISTS idx_auth_admin_users_user_id ON auth_admin_users(user_id);

-- Enable RLS on auth_admin_users (only admins can manage)
ALTER TABLE auth_admin_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_admin_users_select_self" ON auth_admin_users;
CREATE POLICY "auth_admin_users_select_self"
  ON auth_admin_users FOR SELECT
  USING (auth.email() = email OR auth.email() = 'seantomasytbr@gmail.com');

DROP POLICY IF EXISTS "auth_admin_users_insert_admin" ON auth_admin_users;
CREATE POLICY "auth_admin_users_insert_admin"
  ON auth_admin_users FOR INSERT
  WITH CHECK (auth.email() = 'seantomasytbr@gmail.com');

DROP POLICY IF EXISTS "auth_admin_users_update_admin" ON auth_admin_users;
CREATE POLICY "auth_admin_users_update_admin"
  ON auth_admin_users FOR UPDATE
  USING (auth.email() = 'seantomasytbr@gmail.com');

DROP POLICY IF EXISTS "auth_admin_users_delete_admin" ON auth_admin_users;
CREATE POLICY "auth_admin_users_delete_admin"
  ON auth_admin_users FOR DELETE
  USING (auth.email() = 'seantomasytbr@gmail.com');

-- ============================================================
-- 2. CREATE ADMIN CHECK FUNCTION
-- ============================================================
CREATE OR REPLACE FUNCTION is_admin(email_to_check VARCHAR)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth_admin_users
    WHERE (email = email_to_check OR email = auth.email())
    AND is_active = true
  )
  OR auth.email() = 'seantomasytbr@gmail.com';
$$;

-- ============================================================
-- 3. SEED ADMIN USERS TABLE
-- ============================================================
INSERT INTO auth_admin_users (email, is_active) VALUES
  ('seantomasytbr@gmail.com', true)
ON CONFLICT (email) DO UPDATE SET is_active = true;

-- ============================================================
-- 4. UPDATE RLS POLICIES TO USE NEW FUNCTION
-- ============================================================
-- Countries
DROP POLICY IF EXISTS "countries_insert_admin" ON countries;
CREATE POLICY "countries_insert_admin" ON countries FOR INSERT
  WITH CHECK (is_admin(auth.email()));

DROP POLICY IF EXISTS "countries_update_admin" ON countries;
CREATE POLICY "countries_update_admin" ON countries FOR UPDATE
  USING (is_admin(auth.email()));

DROP POLICY IF EXISTS "countries_delete_admin" ON countries;
CREATE POLICY "countries_delete_admin" ON countries FOR DELETE
  USING (is_admin(auth.email()));

-- Categories
DROP POLICY IF EXISTS "categories_insert_admin" ON categories;
CREATE POLICY "categories_insert_admin" ON categories FOR INSERT
  WITH CHECK (is_admin(auth.email()));

DROP POLICY IF EXISTS "categories_update_admin" ON categories;
CREATE POLICY "categories_update_admin" ON categories FOR UPDATE
  USING (is_admin(auth.email()));

DROP POLICY IF EXISTS "categories_delete_admin" ON categories;
CREATE POLICY "categories_delete_admin" ON categories FOR DELETE
  USING (is_admin(auth.email()));

-- Norms
DROP POLICY IF EXISTS "norms_insert_admin" ON norms;
CREATE POLICY "norms_insert_admin" ON norms FOR INSERT
  WITH CHECK (is_admin(auth.email()));

DROP POLICY IF EXISTS "norms_update_admin" ON norms;
CREATE POLICY "norms_update_admin" ON norms FOR UPDATE
  USING (is_admin(auth.email()));

DROP POLICY IF EXISTS "norms_delete_admin" ON norms;
CREATE POLICY "norms_delete_admin" ON norms FOR DELETE
  USING (is_admin(auth.email()));

-- Norm Sections
DROP POLICY IF EXISTS "norm_sections_insert_admin" ON norm_sections;
CREATE POLICY "norm_sections_insert_admin" ON norm_sections FOR INSERT
  WITH CHECK (is_admin(auth.email()));

DROP POLICY IF EXISTS "norm_sections_update_admin" ON norm_sections;
CREATE POLICY "norm_sections_update_admin" ON norm_sections FOR UPDATE
  USING (is_admin(auth.email()));

DROP POLICY IF EXISTS "norm_sections_delete_admin" ON norm_sections;
CREATE POLICY "norm_sections_delete_admin" ON norm_sections FOR DELETE
  USING (is_admin(auth.email()));
