/*
  # Create recipes and batches tables

  1. New Tables
    - `recipes`
      - `id` (uuid, primary key, default gen_random_uuid())
      - `company_id` (uuid, not null, references companies)
      - `name` (text, not null)
      - `yield_portions` (int, not null)
      - `cost_per_batch` (numeric(12,2), not null)
      - `created_at` (timestamptz, default now())
    
    - `batches`
      - `id` (uuid, primary key, default gen_random_uuid())
      - `company_id` (uuid, not null, references companies)
      - `recipe_id` (uuid, not null, references recipes)
      - `portions_left` (int, not null)
      - `expiry_date` (date)
      - `created_at` (timestamptz, default now())

  2. Indexes
    - Index on batches(recipe_id, expiry_date)
    - Index on batches(company_id)

  3. Security
    - Enable RLS on both tables
    - Add policies for SELECT, INSERT, UPDATE, DELETE
    - Users can only access data from companies they belong to
*/

-- Create recipes table
CREATE TABLE IF NOT EXISTS recipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  yield_portions int NOT NULL,
  cost_per_batch numeric(12,2) NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create batches table
CREATE TABLE IF NOT EXISTS batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  recipe_id uuid NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  portions_left int NOT NULL,
  expiry_date date,
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_batches_recipe_id_expiry_date 
ON batches(recipe_id, expiry_date);

CREATE INDEX IF NOT EXISTS idx_batches_company_id 
ON batches(company_id);

-- Enable RLS
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE batches ENABLE ROW LEVEL SECURITY;

-- Recipes policies
CREATE POLICY "Users can select recipes from their companies"
  ON recipes
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM user_company_roles 
      WHERE user_company_roles.user_id = auth.uid() 
      AND user_company_roles.company_id = recipes.company_id
    )
  );

CREATE POLICY "Users can insert recipes to their companies"
  ON recipes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM user_company_roles 
      WHERE user_company_roles.user_id = auth.uid() 
      AND user_company_roles.company_id = recipes.company_id
    )
  );

CREATE POLICY "Users can update recipes from their companies"
  ON recipes
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM user_company_roles 
      WHERE user_company_roles.user_id = auth.uid() 
      AND user_company_roles.company_id = recipes.company_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM user_company_roles 
      WHERE user_company_roles.user_id = auth.uid() 
      AND user_company_roles.company_id = recipes.company_id
    )
  );

CREATE POLICY "Users can delete recipes from their companies"
  ON recipes
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM user_company_roles 
      WHERE user_company_roles.user_id = auth.uid() 
      AND user_company_roles.company_id = recipes.company_id
    )
  );

-- Batches policies
CREATE POLICY "Users can select batches from their companies"
  ON batches
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM user_company_roles 
      WHERE user_company_roles.user_id = auth.uid() 
      AND user_company_roles.company_id = batches.company_id
    )
  );

CREATE POLICY "Users can insert batches to their companies"
  ON batches
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM user_company_roles 
      WHERE user_company_roles.user_id = auth.uid() 
      AND user_company_roles.company_id = batches.company_id
    )
  );

CREATE POLICY "Users can update batches from their companies"
  ON batches
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM user_company_roles 
      WHERE user_company_roles.user_id = auth.uid() 
      AND user_company_roles.company_id = batches.company_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM user_company_roles 
      WHERE user_company_roles.user_id = auth.uid() 
      AND user_company_roles.company_id = batches.company_id
    )
  );

CREATE POLICY "Users can delete batches from their companies"
  ON batches
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM user_company_roles 
      WHERE user_company_roles.user_id = auth.uid() 
      AND user_company_roles.company_id = batches.company_id
    )
  );