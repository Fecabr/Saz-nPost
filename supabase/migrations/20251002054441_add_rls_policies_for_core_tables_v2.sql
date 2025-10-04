/*
  # Add RLS Policies for Core Tables

  1. Security Changes
    - Enable RLS on companies table (if not already enabled)
    - Enable RLS on items, item_stocks, recipes, batches tables
    - Add SELECT policies for authenticated users based on company membership
    
  2. Policies
    - companies: Users can select companies they belong to
    - user_company_roles: Users can select their own roles
    - items: Users can select items from their companies
    - item_stocks: Users can select stocks from their companies
    - recipes: Users can select recipes from their companies
    - batches: Users can select batches from their companies
*/

-- Enable RLS on companies (if not already enabled)
DO $$
BEGIN
  ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- Enable RLS on items
ALTER TABLE items ENABLE ROW LEVEL SECURITY;

-- Enable RLS on item_stocks
ALTER TABLE item_stocks ENABLE ROW LEVEL SECURITY;

-- Enable RLS on recipes
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;

-- Enable RLS on batches
ALTER TABLE batches ENABLE ROW LEVEL SECURITY;

-- Policy for companies: SELECT if user belongs to the company
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'companies'
    AND policyname = 'Users can view companies they belong to'
  ) THEN
    CREATE POLICY "Users can view companies they belong to"
      ON companies
      FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM user_company_roles
          WHERE user_company_roles.company_id = companies.id
          AND user_company_roles.user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Policy for user_company_roles: SELECT own roles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'user_company_roles'
    AND policyname = 'Users can view their own roles'
  ) THEN
    CREATE POLICY "Users can view their own roles"
      ON user_company_roles
      FOR SELECT
      TO authenticated
      USING (user_id = auth.uid());
  END IF;
END $$;

-- Policy for items: SELECT from companies user belongs to
CREATE POLICY "Users can view items from their companies"
  ON items
  FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_company_roles
      WHERE user_id = auth.uid()
    )
  );

-- Policy for item_stocks: SELECT from companies user belongs to
CREATE POLICY "Users can view item stocks from their companies"
  ON item_stocks
  FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_company_roles
      WHERE user_id = auth.uid()
    )
  );

-- Policy for recipes: SELECT from companies user belongs to
CREATE POLICY "Users can view recipes from their companies"
  ON recipes
  FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_company_roles
      WHERE user_id = auth.uid()
    )
  );

-- Policy for batches: SELECT from companies user belongs to
CREATE POLICY "Users can view batches from their companies"
  ON batches
  FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_company_roles
      WHERE user_id = auth.uid()
    )
  );
