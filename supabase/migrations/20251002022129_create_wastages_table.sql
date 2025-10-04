/*
  # Create wastages table

  1. New Tables
    - `wastages`
      - `id` (uuid, primary key) - Unique identifier
      - `company_id` (uuid, not null) - References companies table
      - `source_type` (text, not null) - Type of source: 'batch' or 'item'
      - `source_id` (uuid, not null) - ID from batches or items table
      - `qty` (numeric, not null) - Quantity wasted
      - `reason` (text, not null) - Reason: 'sobrante', 'desecho', 'cortesía', 'ajuste'
      - `user_id` (uuid, not null) - User who registered the wastage
      - `created_at` (timestamptz) - Timestamp of creation

  2. Security
    - Enable RLS on `wastages` table
    - Add policy for authenticated users to read wastages from their companies
    - Add policy for authenticated users to insert wastages for their companies

  3. Performance
    - Add indexes on (company_id, source_type, source_id) for efficient queries
*/

CREATE TABLE IF NOT EXISTS wastages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  source_type text NOT NULL CHECK (source_type IN ('batch', 'item')),
  source_id uuid NOT NULL,
  qty numeric(14, 3) NOT NULL,
  reason text NOT NULL CHECK (reason IN ('sobrante', 'desecho', 'cortesía', 'ajuste')),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE wastages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view wastages from their companies"
  ON wastages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_company_roles
      WHERE user_company_roles.company_id = wastages.company_id
      AND user_company_roles.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert wastages for their companies"
  ON wastages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_company_roles
      WHERE user_company_roles.company_id = wastages.company_id
      AND user_company_roles.user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_wastages_company_source 
  ON wastages(company_id, source_type, source_id);

CREATE INDEX IF NOT EXISTS idx_wastages_created_at 
  ON wastages(created_at DESC);