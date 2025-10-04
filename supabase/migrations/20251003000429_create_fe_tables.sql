/*
  # Create electronic invoicing tables

  1. New Tables
    - `clients`
      - `id` (uuid, primary key)
      - `company_id` (uuid, not null)
      - `name` (text)
      - `identification_type` (text)
      - `identification_number` (text)
      - `email` (text)
      - `phone` (text)
      - `created_at` (timestamptz)
    
    - `fe_company_settings`
      - `company_id` (uuid, primary key)
      - `environment` (text, check constraint: 'stag' or 'prod')
      - `vat_number` (text)
      - `cert_alias` (text)
      - `created_at` (timestamptz)
    
    - `fe_documents`
      - `id` (uuid, primary key)
      - `company_id` (uuid, not null)
      - `sale_id` (uuid, foreign key to sales)
      - `client_id` (uuid, foreign key to clients, nullable)
      - `doc_type` (text, check constraint: 'tiquete', 'factura', 'nc', 'nd')
      - `clave` (text)
      - `consecutivo` (text)
      - `status` (text, check constraint: 'pendiente', 'enviado', 'aceptado', 'rechazado')
      - `hacienda_track_id` (text)
      - `xml_url` (text)
      - `pdf_url` (text)
      - `created_at` (timestamptz)
    
    - `fe_document_lines`
      - `id` (uuid, primary key)
      - `fe_document_id` (uuid, foreign key to fe_documents)
      - `item_id` (uuid)
      - `qty` (numeric)
      - `unit_price` (numeric)
      - `line_total` (numeric)
      - `cabys` (text)

  2. Security
    - Enable RLS on all tables
    - Add policies for company-based access control
*/

CREATE TABLE IF NOT EXISTS clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name text,
  identification_type text,
  identification_number text,
  email text,
  phone text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view clients in their company"
  ON clients FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_company_roles
      WHERE user_company_roles.company_id = clients.company_id
      AND user_company_roles.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert clients in their company"
  ON clients FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_company_roles
      WHERE user_company_roles.company_id = clients.company_id
      AND user_company_roles.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update clients in their company"
  ON clients FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_company_roles
      WHERE user_company_roles.company_id = clients.company_id
      AND user_company_roles.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_company_roles
      WHERE user_company_roles.company_id = clients.company_id
      AND user_company_roles.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete clients in their company"
  ON clients FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_company_roles
      WHERE user_company_roles.company_id = clients.company_id
      AND user_company_roles.user_id = auth.uid()
    )
  );

CREATE TABLE IF NOT EXISTS fe_company_settings (
  company_id uuid PRIMARY KEY REFERENCES companies(id) ON DELETE CASCADE,
  environment text CHECK (environment IN ('stag', 'prod')),
  vat_number text,
  cert_alias text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE fe_company_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view fe settings in their company"
  ON fe_company_settings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_company_roles
      WHERE user_company_roles.company_id = fe_company_settings.company_id
      AND user_company_roles.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert fe settings in their company"
  ON fe_company_settings FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_company_roles
      WHERE user_company_roles.company_id = fe_company_settings.company_id
      AND user_company_roles.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update fe settings in their company"
  ON fe_company_settings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_company_roles
      WHERE user_company_roles.company_id = fe_company_settings.company_id
      AND user_company_roles.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_company_roles
      WHERE user_company_roles.company_id = fe_company_settings.company_id
      AND user_company_roles.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete fe settings in their company"
  ON fe_company_settings FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_company_roles
      WHERE user_company_roles.company_id = fe_company_settings.company_id
      AND user_company_roles.user_id = auth.uid()
    )
  );

CREATE TABLE IF NOT EXISTS fe_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  sale_id uuid REFERENCES sales(id) ON DELETE CASCADE,
  client_id uuid REFERENCES clients(id),
  doc_type text CHECK (doc_type IN ('tiquete', 'factura', 'nc', 'nd')),
  clave text,
  consecutivo text,
  status text CHECK (status IN ('pendiente', 'enviado', 'aceptado', 'rechazado')) DEFAULT 'pendiente',
  hacienda_track_id text,
  xml_url text,
  pdf_url text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE fe_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view fe documents in their company"
  ON fe_documents FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_company_roles
      WHERE user_company_roles.company_id = fe_documents.company_id
      AND user_company_roles.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert fe documents in their company"
  ON fe_documents FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_company_roles
      WHERE user_company_roles.company_id = fe_documents.company_id
      AND user_company_roles.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update fe documents in their company"
  ON fe_documents FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_company_roles
      WHERE user_company_roles.company_id = fe_documents.company_id
      AND user_company_roles.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_company_roles
      WHERE user_company_roles.company_id = fe_documents.company_id
      AND user_company_roles.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete fe documents in their company"
  ON fe_documents FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_company_roles
      WHERE user_company_roles.company_id = fe_documents.company_id
      AND user_company_roles.user_id = auth.uid()
    )
  );

CREATE TABLE IF NOT EXISTS fe_document_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fe_document_id uuid NOT NULL REFERENCES fe_documents(id) ON DELETE CASCADE,
  item_id uuid,
  qty numeric,
  unit_price numeric,
  line_total numeric,
  cabys text
);

ALTER TABLE fe_document_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view fe document lines in their company"
  ON fe_document_lines FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM fe_documents
      JOIN user_company_roles ON user_company_roles.company_id = fe_documents.company_id
      WHERE fe_documents.id = fe_document_lines.fe_document_id
      AND user_company_roles.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert fe document lines in their company"
  ON fe_document_lines FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM fe_documents
      JOIN user_company_roles ON user_company_roles.company_id = fe_documents.company_id
      WHERE fe_documents.id = fe_document_lines.fe_document_id
      AND user_company_roles.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update fe document lines in their company"
  ON fe_document_lines FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM fe_documents
      JOIN user_company_roles ON user_company_roles.company_id = fe_documents.company_id
      WHERE fe_documents.id = fe_document_lines.fe_document_id
      AND user_company_roles.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM fe_documents
      JOIN user_company_roles ON user_company_roles.company_id = fe_documents.company_id
      WHERE fe_documents.id = fe_document_lines.fe_document_id
      AND user_company_roles.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete fe document lines in their company"
  ON fe_document_lines FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM fe_documents
      JOIN user_company_roles ON user_company_roles.company_id = fe_documents.company_id
      WHERE fe_documents.id = fe_document_lines.fe_document_id
      AND user_company_roles.user_id = auth.uid()
    )
  );