-- ============================================================
-- Migration: RLS Policies - Public Read + Admin Write
-- Date: 2025-04-18
-- Description: Everyone can read, only admin (seantomasytbr@gmail.com) can create/update/delete
-- ============================================================

-- ============================================================
-- RLS POLICIES FOR NORMS
-- ============================================================
DROP POLICY IF EXISTS "norms_select_public" ON norms;
CREATE POLICY "norms_select_public" ON norms FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "norms_insert_admin" ON norms;
CREATE POLICY "norms_insert_admin" ON norms FOR INSERT
  WITH CHECK (auth.email() = 'seantomasytbr@gmail.com');

DROP POLICY IF EXISTS "norms_update_admin" ON norms;
CREATE POLICY "norms_update_admin" ON norms FOR UPDATE
  USING (auth.email() = 'seantomasytbr@gmail.com');

DROP POLICY IF EXISTS "norms_delete_admin" ON norms;
CREATE POLICY "norms_delete_admin" ON norms FOR DELETE
  USING (auth.email() = 'seantomasytbr@gmail.com');

-- ============================================================
-- RLS POLICIES FOR NORM_SECTIONS
-- ============================================================
DROP POLICY IF EXISTS "norm_sections_select_public" ON norm_sections;
CREATE POLICY "norm_sections_select_public" ON norm_sections FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "norm_sections_insert_admin" ON norm_sections;
CREATE POLICY "norm_sections_insert_admin" ON norm_sections FOR INSERT
  WITH CHECK (auth.email() = 'seantomasytbr@gmail.com');

DROP POLICY IF EXISTS "norm_sections_update_admin" ON norm_sections;
CREATE POLICY "norm_sections_update_admin" ON norm_sections FOR UPDATE
  USING (auth.email() = 'seantomasytbr@gmail.com');

DROP POLICY IF EXISTS "norm_sections_delete_admin" ON norm_sections;
CREATE POLICY "norm_sections_delete_admin" ON norm_sections FOR DELETE
  USING (auth.email() = 'seantomasytbr@gmail.com');

-- ============================================================
-- RLS POLICIES FOR COUNTRIES
-- ============================================================
DROP POLICY IF EXISTS "countries_select_public" ON countries;
CREATE POLICY "countries_select_public" ON countries FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "countries_insert_admin" ON countries;
CREATE POLICY "countries_insert_admin" ON countries FOR INSERT
  WITH CHECK (auth.email() = 'seantomasytbr@gmail.com');

DROP POLICY IF EXISTS "countries_update_admin" ON countries;
CREATE POLICY "countries_update_admin" ON countries FOR UPDATE
  USING (auth.email() = 'seantomasytbr@gmail.com');

DROP POLICY IF EXISTS "countries_delete_admin" ON countries;
CREATE POLICY "countries_delete_admin" ON countries FOR DELETE
  USING (auth.email() = 'seantomasytbr@gmail.com');

-- ============================================================
-- RLS POLICIES FOR CATEGORIES
-- ============================================================
DROP POLICY IF EXISTS "categories_select_public" ON categories;
CREATE POLICY "categories_select_public" ON categories FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "categories_insert_admin" ON categories;
CREATE POLICY "categories_insert_admin" ON categories FOR INSERT
  WITH CHECK (auth.email() = 'seantomasytbr@gmail.com');

DROP POLICY IF EXISTS "categories_update_admin" ON categories;
CREATE POLICY "categories_update_admin" ON categories FOR UPDATE
  USING (auth.email() = 'seantomasytbr@gmail.com');

DROP POLICY IF EXISTS "categories_delete_admin" ON categories;
CREATE POLICY "categories_delete_admin" ON categories FOR DELETE
  USING (auth.email() = 'seantomasytbr@gmail.com');
