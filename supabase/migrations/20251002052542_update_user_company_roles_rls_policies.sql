/*
  # Update RLS policies for user_company_roles

  1. Changes
    - Add policy for users to select their own rows
    - Add policy for users to insert their own rows
  
  2. Security
    - Users can only view rows where they are the user
    - Users can only insert rows where they are the user
*/

DROP POLICY IF EXISTS "Users can view own company roles" ON user_company_roles;
DROP POLICY IF EXISTS "Users can insert own company roles" ON user_company_roles;

CREATE POLICY "Users can view own company roles"
  ON user_company_roles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own company roles"
  ON user_company_roles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);
