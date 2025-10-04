/*
  # Add item_id to recipes and create item_stocks and recipe_ingredients tables

  1. Modifications
    - Add `item_id` column to `recipes` table (uuid, unique, references items)
    - The recipe itself is a sellable item of type='batch_portion'

  2. New Tables
    - `item_stocks`
      - `id` (uuid, primary key, default gen_random_uuid())
      - `company_id` (uuid, not null, references companies)
      - `item_id` (uuid, not null, references items)
      - `quantity` (numeric(14,3), not null, default 0)
      - `updated_at` (timestamptz, default now())
    
    - `recipe_ingredients`
      - `recipe_id` (uuid, not null, references recipes)
      - `item_id` (uuid, not null, references items)
      - `amount_per_portion` (numeric(14,3), not null)
      - Primary key: (recipe_id, item_id)

  3. Indexes
    - Index on item_stocks(company_id, item_id)

  4. Security
    - Maintain RLS on recipes table
    - Enable RLS on item_stocks table with policies for company_id
    - Enable RLS on recipe_ingredients table with policies based on recipe's company_id
*/

-- Add item_id to recipes table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'recipes' AND column_name = 'item_id'
  ) THEN
    ALTER TABLE recipes ADD COLUMN item_id uuid UNIQUE REFERENCES items(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Create item_stocks table
CREATE TABLE IF NOT EXISTS item_stocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  quantity numeric(14,3) NOT NULL DEFAULT 0,
  updated_at timestamptz DEFAULT now()
);

-- Create recipe_ingredients table
CREATE TABLE IF NOT EXISTS recipe_ingredients (
  recipe_id uuid NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  amount_per_portion numeric(14,3) NOT NULL,
  PRIMARY KEY (recipe_id, item_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_item_stocks_company_id_item_id 
ON item_stocks(company_id, item_id);

-- Enable RLS
ALTER TABLE item_stocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_ingredients ENABLE ROW LEVEL SECURITY;

-- Item stocks policies
CREATE POLICY "Users can select stocks from their companies"
  ON item_stocks
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM user_company_roles 
      WHERE user_company_roles.user_id = auth.uid() 
      AND user_company_roles.company_id = item_stocks.company_id
    )
  );

CREATE POLICY "Users can insert stocks to their companies"
  ON item_stocks
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM user_company_roles 
      WHERE user_company_roles.user_id = auth.uid() 
      AND user_company_roles.company_id = item_stocks.company_id
    )
  );

CREATE POLICY "Users can update stocks from their companies"
  ON item_stocks
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM user_company_roles 
      WHERE user_company_roles.user_id = auth.uid() 
      AND user_company_roles.company_id = item_stocks.company_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM user_company_roles 
      WHERE user_company_roles.user_id = auth.uid() 
      AND user_company_roles.company_id = item_stocks.company_id
    )
  );

CREATE POLICY "Users can delete stocks from their companies"
  ON item_stocks
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM user_company_roles 
      WHERE user_company_roles.user_id = auth.uid() 
      AND user_company_roles.company_id = item_stocks.company_id
    )
  );

-- Recipe ingredients policies
CREATE POLICY "Users can select recipe ingredients from their companies"
  ON recipe_ingredients
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM recipes
      JOIN user_company_roles ON user_company_roles.company_id = recipes.company_id
      WHERE recipes.id = recipe_ingredients.recipe_id
      AND user_company_roles.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert recipe ingredients to their companies"
  ON recipe_ingredients
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM recipes
      JOIN user_company_roles ON user_company_roles.company_id = recipes.company_id
      WHERE recipes.id = recipe_ingredients.recipe_id
      AND user_company_roles.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update recipe ingredients from their companies"
  ON recipe_ingredients
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM recipes
      JOIN user_company_roles ON user_company_roles.company_id = recipes.company_id
      WHERE recipes.id = recipe_ingredients.recipe_id
      AND user_company_roles.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM recipes
      JOIN user_company_roles ON user_company_roles.company_id = recipes.company_id
      WHERE recipes.id = recipe_ingredients.recipe_id
      AND user_company_roles.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete recipe ingredients from their companies"
  ON recipe_ingredients
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM recipes
      JOIN user_company_roles ON user_company_roles.company_id = recipes.company_id
      WHERE recipes.id = recipe_ingredients.recipe_id
      AND user_company_roles.user_id = auth.uid()
    )
  );