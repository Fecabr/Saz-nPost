/*
  # Create usuarios_empresas table for user roles per company

  1. New Tables
    - `usuarios_empresas`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `empresa_id` (uuid, references empresas)
      - `rol` (text, role: admin, cajero, mesero)
      - `created_at` (timestamptz)
      - Unique constraint on (user_id, empresa_id)
  
  2. Security
    - Enable RLS on `usuarios_empresas` table
    - Add policy for authenticated users to read their own company roles
    - Add policy for admins to manage company users
*/

CREATE TABLE IF NOT EXISTS usuarios_empresas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  empresa_id uuid NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  rol text NOT NULL CHECK (rol IN ('admin', 'cajero', 'mesero')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, empresa_id)
);

ALTER TABLE usuarios_empresas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own company roles"
  ON usuarios_empresas
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can insert company users"
  ON usuarios_empresas
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios_empresas ue
      WHERE ue.empresa_id = usuarios_empresas.empresa_id
      AND ue.user_id = auth.uid()
      AND ue.rol = 'admin'
    )
  );

CREATE POLICY "Admins can update company users"
  ON usuarios_empresas
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios_empresas ue
      WHERE ue.empresa_id = usuarios_empresas.empresa_id
      AND ue.user_id = auth.uid()
      AND ue.rol = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios_empresas ue
      WHERE ue.empresa_id = usuarios_empresas.empresa_id
      AND ue.user_id = auth.uid()
      AND ue.rol = 'admin'
    )
  );

CREATE POLICY "Admins can delete company users"
  ON usuarios_empresas
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios_empresas ue
      WHERE ue.empresa_id = usuarios_empresas.empresa_id
      AND ue.user_id = auth.uid()
      AND ue.rol = 'admin'
    )
  );
