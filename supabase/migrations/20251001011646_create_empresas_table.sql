/*
  # Create empresas table for multi-company support

  1. New Tables
    - `empresas`
      - `id` (uuid, primary key)
      - `nombre` (text, company name)
      - `created_at` (timestamp)
      - `user_id` (uuid, foreign key to auth.users)
  
  2. Security
    - Enable RLS on `empresas` table
    - Add policy for authenticated users to read their own companies
    - Add policy for authenticated users to create their own companies
    - Add policy for authenticated users to update their own companies
    - Add policy for authenticated users to delete their own companies
*/

CREATE TABLE IF NOT EXISTS empresas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE empresas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own empresas"
  ON empresas FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own empresas"
  ON empresas FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own empresas"
  ON empresas FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own empresas"
  ON empresas FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);