/*
  # Enable RLS on companies and user_company_roles tables

  1. Security
    - Enable RLS on `companies` table
    - Enable RLS on `user_company_roles` table
    - Add policy for authenticated users to select companies they have access to
    - Add policy for authenticated users to select their own user_company_roles
    - Add policy for authenticated users to insert their own user_company_roles (for testing)

  2. Policies
    - Companies: Users can view companies they are members of
    - User Company Roles: Users can view and insert their own roles
*/

-- Enable RLS on companies table
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- Enable RLS on user_company_roles table
ALTER TABLE user_company_roles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view companies they belong to" ON companies;
DROP POLICY IF EXISTS "Users can view their own company roles" ON user_company_roles;
DROP POLICY IF EXISTS "Users can insert their own company roles" ON user_company_roles;

-- Policy: Users can select companies they have access to
CREATE POLICY "Users can view companies they belong to"
  ON companies
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM user_company_roles u 
      WHERE u.company_id = companies.id 
      AND u.user_id = auth.uid()
    )
  );

-- Policy: Users can select their own user_company_roles
CREATE POLICY "Users can view their own company roles"
  ON user_company_roles
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Policy: Users can insert their own user_company_roles (for testing purposes)
CREATE POLICY "Users can insert their own company roles"
  ON user_company_roles
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());