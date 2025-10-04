/*
  # Create invitations table

  1. New Tables
    - `invitations`
      - `id` (uuid, primary key)
      - `company_id` (uuid, foreign key to companies)
      - `email` (text, email of invited user)
      - `role` (text, role to assign: admin/cashier/waiter/kitchen)
      - `status` (text, invitation status: pending/accepted)
      - `created_at` (timestamptz, when invitation was created)
      - `accepted_at` (timestamptz, when invitation was accepted)

  2. Security
    - Enable RLS on `invitations` table
    - Add policy for admins to manage invitations in their company
    - Add policy for users to view invitations sent to their email
*/

CREATE TABLE IF NOT EXISTS invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL CHECK (role IN ('admin', 'cashier', 'waiter', 'kitchen')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted')),
  created_at timestamptz DEFAULT now(),
  accepted_at timestamptz,
  UNIQUE(company_id, email, status)
);

ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view company invitations"
  ON invitations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_company_roles
      WHERE user_company_roles.company_id = invitations.company_id
      AND user_company_roles.user_id = auth.uid()
      AND user_company_roles.role = 'admin'
    )
  );

CREATE POLICY "Admins can create invitations"
  ON invitations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_company_roles
      WHERE user_company_roles.company_id = invitations.company_id
      AND user_company_roles.user_id = auth.uid()
      AND user_company_roles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update company invitations"
  ON invitations
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_company_roles
      WHERE user_company_roles.company_id = invitations.company_id
      AND user_company_roles.user_id = auth.uid()
      AND user_company_roles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_company_roles
      WHERE user_company_roles.company_id = invitations.company_id
      AND user_company_roles.user_id = auth.uid()
      AND user_company_roles.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete company invitations"
  ON invitations
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_company_roles
      WHERE user_company_roles.company_id = invitations.company_id
      AND user_company_roles.user_id = auth.uid()
      AND user_company_roles.role = 'admin'
    )
  );

CREATE POLICY "Users can view invitations sent to their email"
  ON invitations
  FOR SELECT
  TO authenticated
  USING (
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );
