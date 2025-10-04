/*
  # Create cash sessions and cash movements tables

  1. New Tables
    - `cash_sessions`
      - `id` (uuid, primary key) - Unique identifier
      - `company_id` (uuid, not null) - References companies table
      - `user_id` (uuid, not null) - User who opened the session
      - `opened_at` (timestamptz) - When the session was opened
      - `closed_at` (timestamptz) - When the session was closed
      - `opening_amount` (numeric, not null) - Initial cash amount
      - `closing_amount` (numeric) - Final cash amount when closed
      - `status` (text, not null) - Session status: 'open' or 'closed'
    
    - `cash_movements`
      - `id` (uuid, primary key) - Unique identifier
      - `company_id` (uuid, not null) - References companies table
      - `session_id` (uuid, not null) - References cash_sessions table
      - `type` (text, not null) - Movement type: 'sale', 'in', 'out', 'adjust'
      - `amount` (numeric, not null) - Movement amount
      - `note` (text) - Optional note
      - `created_at` (timestamptz) - Timestamp of creation

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users to read data from their companies
    - Add policies for authenticated users to insert data for their companies
    - Add policy for authenticated users to update cash_sessions if status='open'

  3. Performance
    - Add indexes on company_id and session_id for efficient queries
*/

CREATE TABLE IF NOT EXISTS cash_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  opened_at timestamptz DEFAULT now(),
  closed_at timestamptz,
  opening_amount numeric(12, 2) NOT NULL,
  closing_amount numeric(12, 2),
  status text NOT NULL CHECK (status IN ('open', 'closed')) DEFAULT 'open'
);

CREATE TABLE IF NOT EXISTS cash_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  session_id uuid NOT NULL REFERENCES cash_sessions(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('sale', 'in', 'out', 'adjust')),
  amount numeric(12, 2) NOT NULL,
  note text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE cash_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view cash sessions from their companies"
  ON cash_sessions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_company_roles
      WHERE user_company_roles.company_id = cash_sessions.company_id
      AND user_company_roles.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert cash sessions for their companies"
  ON cash_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_company_roles
      WHERE user_company_roles.company_id = cash_sessions.company_id
      AND user_company_roles.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update open cash sessions from their companies"
  ON cash_sessions
  FOR UPDATE
  TO authenticated
  USING (
    status = 'open' AND
    EXISTS (
      SELECT 1 FROM user_company_roles
      WHERE user_company_roles.company_id = cash_sessions.company_id
      AND user_company_roles.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_company_roles
      WHERE user_company_roles.company_id = cash_sessions.company_id
      AND user_company_roles.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view cash movements from their companies"
  ON cash_movements
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_company_roles
      WHERE user_company_roles.company_id = cash_movements.company_id
      AND user_company_roles.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert cash movements for their companies"
  ON cash_movements
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_company_roles
      WHERE user_company_roles.company_id = cash_movements.company_id
      AND user_company_roles.user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_cash_sessions_company 
  ON cash_sessions(company_id);

CREATE INDEX IF NOT EXISTS idx_cash_sessions_status 
  ON cash_sessions(status);

CREATE INDEX IF NOT EXISTS idx_cash_movements_company 
  ON cash_movements(company_id);

CREATE INDEX IF NOT EXISTS idx_cash_movements_session 
  ON cash_movements(session_id);

CREATE INDEX IF NOT EXISTS idx_cash_movements_created_at 
  ON cash_movements(created_at DESC);