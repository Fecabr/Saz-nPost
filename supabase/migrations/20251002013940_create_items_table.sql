/*
  # Create items table

  1. New Tables
    - `items`
      - `id` (uuid, primary key, default gen_random_uuid())
      - `company_id` (uuid, not null, references companies)
      - `name` (text, not null)
      - `sku` (text, unique)
      - `type` (text, not null, check constraint for batch_portion, unit, ingredient)
      - `unit` (text, not null, default 'unit')
      - `price` (numeric(12,2), not null, default 0)
      - `active` (boolean, not null, default true)
      - `created_at` (timestamptz, default now())

  2. Indexes
    - Index on items(company_id)
    - Index on items(name)

  3. Security
    - Enable RLS on items table
    - Add policies for SELECT, INSERT, UPDATE, DELETE
    - Users can only access items from companies they belong to
*/

-- Create items table
CREATE TABLE IF NOT EXISTS items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  sku text UNIQUE,
  type text NOT NULL CHECK (type IN ('batch_portion', 'unit', 'ingredient')),
  unit text NOT NULL DEFAULT 'unit',
  price numeric(12,2) NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_items_company_id 
ON items(company_id);

CREATE INDEX IF NOT EXISTS idx_items_name 
ON items(name);

-- Enable RLS
ALTER TABLE items ENABLE ROW LEVEL SECURITY;

-- Items policies
CREATE POLICY "Users can select items from their companies"
  ON items
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM user_company_roles 
      WHERE user_company_roles.user_id = auth.uid() 
      AND user_company_roles.company_id = items.company_id
    )
  );

CREATE POLICY "Users can insert items to their companies"
  ON items
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM user_company_roles 
      WHERE user_company_roles.user_id = auth.uid() 
      AND user_company_roles.company_id = items.company_id
    )
  );

CREATE POLICY "Users can update items from their companies"
  ON items
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM user_company_roles 
      WHERE user_company_roles.user_id = auth.uid() 
      AND user_company_roles.company_id = items.company_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM user_company_roles 
      WHERE user_company_roles.user_id = auth.uid() 
      AND user_company_roles.company_id = items.company_id
    )
  );

CREATE POLICY "Users can delete items from their companies"
  ON items
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM user_company_roles 
      WHERE user_company_roles.user_id = auth.uid() 
      AND user_company_roles.company_id = items.company_id
    )
  );