/*
  # Create Sales and Payments Tables

  1. New Tables
    - `sales`
      - `id` (uuid, primary key)
      - `company_id` (uuid, not null)
      - `user_id` (uuid, not null)
      - `created_at` (timestamptz)
      - `subtotal` (numeric, not null)
      - `tax` (numeric, not null, default 0)
      - `total` (numeric, not null)
      - `notes` (text)
    
    - `sale_items`
      - `id` (uuid, primary key)
      - `sale_id` (uuid, foreign key to sales)
      - `item_id` (uuid, not null)
      - `qty` (integer, not null)
      - `unit_price` (numeric, not null)
      - `line_total` (numeric, not null)
      - `kind` (text, not null, check: 'unit' or 'batch_portion')
      - `recipe_id` (uuid, nullable)
    
    - `payments`
      - `id` (uuid, primary key)
      - `sale_id` (uuid, foreign key to sales)
      - `method` (text, not null, check: 'efectivo', 'tarjeta', or 'mixto')
      - `amount_cash` (numeric, not null, default 0)
      - `amount_card` (numeric, not null, default 0)
      - `created_at` (timestamptz)

  2. Indexes
    - idx_sales_company on sales(company_id)
    - idx_sale_items_sale on sale_items(sale_id)

  3. Security
    - Enable RLS on all three tables
    - Add policies for authenticated users with company access
*/

CREATE TABLE IF NOT EXISTS sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  subtotal numeric NOT NULL,
  tax numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL,
  notes text
);

CREATE TABLE IF NOT EXISTS sale_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  item_id uuid NOT NULL,
  qty int NOT NULL,
  unit_price numeric NOT NULL,
  line_total numeric NOT NULL,
  kind text NOT NULL CHECK (kind IN ('unit', 'batch_portion')),
  recipe_id uuid
);

CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  method text NOT NULL CHECK (method IN ('efectivo', 'tarjeta', 'mixto')),
  amount_cash numeric NOT NULL DEFAULT 0,
  amount_card numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sales_company ON sales(company_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON sale_items(sale_id);

ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view sales for their companies"
  ON sales FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_company_roles
      WHERE user_company_roles.company_id = sales.company_id
      AND user_company_roles.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert sales for their companies"
  ON sales FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_company_roles
      WHERE user_company_roles.company_id = sales.company_id
      AND user_company_roles.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view sale items for their company sales"
  ON sale_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM sales
      JOIN user_company_roles ON user_company_roles.company_id = sales.company_id
      WHERE sales.id = sale_items.sale_id
      AND user_company_roles.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert sale items for their company sales"
  ON sale_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sales
      JOIN user_company_roles ON user_company_roles.company_id = sales.company_id
      WHERE sales.id = sale_items.sale_id
      AND user_company_roles.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view payments for their company sales"
  ON payments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM sales
      JOIN user_company_roles ON user_company_roles.company_id = sales.company_id
      WHERE sales.id = payments.sale_id
      AND user_company_roles.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert payments for their company sales"
  ON payments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sales
      JOIN user_company_roles ON user_company_roles.company_id = sales.company_id
      WHERE sales.id = payments.sale_id
      AND user_company_roles.user_id = auth.uid()
    )
  );