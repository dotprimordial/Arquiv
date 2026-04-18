-- ============================================================
-- Migration: Apply Consistent RLS Policies to All Tables
-- Date: 2025-04-18
-- Description: Apply SELECT public + INSERT/UPDATE/DELETE admin-only rules everywhere
-- ============================================================

-- ============================================================
-- NORM_SECTIONS TABLE - Add missing policies
-- ============================================================
DROP POLICY IF EXISTS "norm_sections_insert_admin" ON norm_sections;
CREATE POLICY "norm_sections_insert_admin"
  ON norm_sections FOR INSERT
  WITH CHECK (auth.email() = 'seantomasytbr@gmail.com');

DROP POLICY IF EXISTS "norm_sections_update_admin" ON norm_sections;
CREATE POLICY "norm_sections_update_admin"
  ON norm_sections FOR UPDATE
  USING (auth.email() = 'seantomasytbr@gmail.com');

DROP POLICY IF EXISTS "norm_sections_delete_admin" ON norm_sections;
CREATE POLICY "norm_sections_delete_admin"
  ON norm_sections FOR DELETE
  USING (auth.email() = 'seantomasytbr@gmail.com');

-- ============================================================
-- COUNTRIES TABLE - Add missing policies
-- ============================================================
DROP POLICY IF EXISTS "countries_insert_admin" ON countries;
CREATE POLICY "countries_insert_admin"
  ON countries FOR INSERT
  WITH CHECK (auth.email() = 'seantomasytbr@gmail.com');

DROP POLICY IF EXISTS "countries_update_admin" ON countries;
CREATE POLICY "countries_update_admin"
  ON countries FOR UPDATE
  USING (auth.email() = 'seantomasytbr@gmail.com');

DROP POLICY IF EXISTS "countries_delete_admin" ON countries;
CREATE POLICY "countries_delete_admin"
  ON countries FOR DELETE
  USING (auth.email() = 'seantomasytbr@gmail.com');

-- ============================================================
-- CATEGORIES TABLE - Add missing policies
-- ============================================================
DROP POLICY IF EXISTS "categories_insert_admin" ON categories;
CREATE POLICY "categories_insert_admin"
  ON categories FOR INSERT
  WITH CHECK (auth.email() = 'seantomasytbr@gmail.com');

DROP POLICY IF EXISTS "categories_update_admin" ON categories;
CREATE POLICY "categories_update_admin"
  ON categories FOR UPDATE
  USING (auth.email() = 'seantomasytbr@gmail.com');

DROP POLICY IF EXISTS "categories_delete_admin" ON categories;
CREATE POLICY "categories_delete_admin"
  ON categories FOR DELETE
  USING (auth.email() = 'seantomasytbr@gmail.com');
