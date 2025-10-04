/*
  # Rename empresas to companies and usuarios_empresas to user_company_roles

  1. Changes
    - Rename table `empresas` to `companies`
    - Rename column `nombre` to `name` in companies table
    - Rename table `usuarios_empresas` to `user_company_roles`
    - Rename column `empresa_id` to `company_id` in user_company_roles table
    - Add `role` column to user_company_roles table with check constraint
    - Update primary key to composite (user_id, company_id)
    - Add indexes on company_id and user_id
    - Update foreign key constraints

  2. Security
    - Maintain existing RLS policies with updated table names
*/

-- Rename empresas table to companies
ALTER TABLE IF EXISTS empresas RENAME TO companies;

-- Rename nombre column to name in companies table
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'companies' AND column_name = 'nombre'
  ) THEN
    ALTER TABLE companies RENAME COLUMN nombre TO name;
  END IF;
END $$;

-- Rename usuarios_empresas table to user_company_roles
ALTER TABLE IF EXISTS usuarios_empresas RENAME TO user_company_roles;

-- Rename empresa_id column to company_id
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_company_roles' AND column_name = 'empresa_id'
  ) THEN
    ALTER TABLE user_company_roles RENAME COLUMN empresa_id TO company_id;
  END IF;
END $$;

-- Add role column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_company_roles' AND column_name = 'role'
  ) THEN
    ALTER TABLE user_company_roles 
    ADD COLUMN role text NOT NULL DEFAULT 'cashier' 
    CHECK (role IN ('admin', 'cashier', 'waiter', 'kitchen'));
  END IF;
END $$;

-- Drop existing primary key if exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'user_company_roles' AND constraint_type = 'PRIMARY KEY'
  ) THEN
    ALTER TABLE user_company_roles DROP CONSTRAINT IF EXISTS usuarios_empresas_pkey;
    ALTER TABLE user_company_roles DROP CONSTRAINT IF EXISTS user_company_roles_pkey;
  END IF;
END $$;

-- Add composite primary key
ALTER TABLE user_company_roles 
ADD CONSTRAINT user_company_roles_pkey PRIMARY KEY (user_id, company_id);

-- Drop existing foreign key constraint if exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'user_company_roles' 
    AND constraint_name = 'usuarios_empresas_empresa_id_fkey'
  ) THEN
    ALTER TABLE user_company_roles DROP CONSTRAINT usuarios_empresas_empresa_id_fkey;
  END IF;
END $$;

-- Add updated foreign key constraint with cascade delete
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'user_company_roles' 
    AND constraint_name = 'user_company_roles_company_id_fkey'
  ) THEN
    ALTER TABLE user_company_roles 
    ADD CONSTRAINT user_company_roles_company_id_fkey 
    FOREIGN KEY (company_id) 
    REFERENCES companies(id) 
    ON DELETE CASCADE;
  END IF;
END $$;

-- Create index on company_id if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_user_company_roles_company_id 
ON user_company_roles(company_id);

-- Create index on user_id if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_user_company_roles_user_id 
ON user_company_roles(user_id);