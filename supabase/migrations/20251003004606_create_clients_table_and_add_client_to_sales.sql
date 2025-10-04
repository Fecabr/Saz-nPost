/*
  # Create clients table and add client support to sales

  1. New Tables
    - `clients`
      - `id` (uuid, primary key, default gen_random_uuid())
      - `company_id` (uuid, not null, references companies)
      - `name` (text, not null)
      - `identification_type` (text, not null, check constraint for valid values)
      - `identification_number` (text, not null)
      - `email` (text, nullable)
      - `phone` (text, nullable)
      - `created_at` (timestamptz, default now())

  2. Constraints
    - Unique constraint on (company_id, identification_number)
    - Check constraint for identification_type values

  3. Indexes
    - idx_clients_company on company_id
    - idx_clients_company_ident on (company_id, identification_number)

  4. Security
    - Enable RLS on clients table
    - Add policies for select, insert, update based on user_company_roles membership

  5. Schema Changes
    - Add client_id column to sales table
    - Update create_sale_v1 RPC to accept and store client_id
*/

-- Create clients table
CREATE TABLE IF NOT EXISTS clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  identification_type text NOT NULL CHECK (identification_type IN ('fisica', 'juridica', 'dimex', 'nite', 'otros')),
  identification_number text NOT NULL,
  email text,
  phone text,
  created_at timestamptz DEFAULT now(),
  UNIQUE (company_id, identification_number)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_clients_company ON clients(company_id);
CREATE INDEX IF NOT EXISTS idx_clients_company_ident ON clients(company_id, identification_number);

-- Enable RLS
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

-- RLS Policies for clients
CREATE POLICY "Users can view clients in their companies"
  ON clients FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_company_roles
      WHERE user_company_roles.company_id = clients.company_id
      AND user_company_roles.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert clients in their companies"
  ON clients FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_company_roles
      WHERE user_company_roles.company_id = clients.company_id
      AND user_company_roles.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update clients in their companies"
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

-- Add client_id to sales table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sales' AND column_name = 'client_id'
  ) THEN
    ALTER TABLE sales ADD COLUMN client_id uuid REFERENCES clients(id);
  END IF;
END $$;

-- Update create_sale_v1 RPC to accept and store client_id
CREATE OR REPLACE FUNCTION create_sale_v1(payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_company_id uuid;
  v_items jsonb;
  v_payment_method text;
  v_amount_cash numeric;
  v_amount_card numeric;
  v_notes text;
  v_client_id uuid;
  v_sale_id uuid;
  v_item jsonb;
  v_total numeric := 0;
  v_line_total numeric;
BEGIN
  v_company_id := (payload->>'company_id')::uuid;
  v_items := payload->'items';
  v_payment_method := payload->>'payment_method';
  v_amount_cash := (payload->>'amount_cash')::numeric;
  v_amount_card := (payload->>'amount_card')::numeric;
  v_notes := payload->>'notes';
  v_client_id := (payload->>'client_id')::uuid;

  IF NOT EXISTS (
    SELECT 1 FROM user_company_roles
    WHERE company_id = v_company_id
    AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Not authorized for this company';
  END IF;

  INSERT INTO sales (company_id, total, payment_method, notes, client_id)
  VALUES (v_company_id, 0, v_payment_method, v_notes, v_client_id)
  RETURNING id INTO v_sale_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(v_items)
  LOOP
    v_line_total := (v_item->>'qty')::numeric * (v_item->>'unit_price')::numeric;
    v_total := v_total + v_line_total;

    INSERT INTO sale_items (
      sale_id,
      item_id,
      qty,
      unit_price,
      line_total
    ) VALUES (
      v_sale_id,
      (v_item->>'item_id')::uuid,
      (v_item->>'qty')::numeric,
      (v_item->>'unit_price')::numeric,
      v_line_total
    );

    IF (v_item->>'kind') = 'batch_portion' THEN
      PERFORM decrement_batch_portions(
        v_company_id,
        (v_item->>'recipe_id')::uuid,
        (v_item->>'qty')::numeric
      );
    ELSIF (v_item->>'kind') = 'unit' THEN
      INSERT INTO item_stocks (
        company_id,
        item_id,
        qty,
        movement,
        note
      ) VALUES (
        v_company_id,
        (v_item->>'item_id')::uuid,
        -1 * (v_item->>'qty')::numeric,
        'sale',
        'Venta: ' || v_sale_id
      );
    END IF;
  END LOOP;

  UPDATE sales
  SET total = v_total
  WHERE id = v_sale_id;

  IF v_amount_cash > 0 THEN
    INSERT INTO payments (sale_id, amount, method)
    VALUES (v_sale_id, v_amount_cash, 'efectivo');

    INSERT INTO cash_movements (
      company_id,
      amount,
      movement_type,
      notes
    ) VALUES (
      v_company_id,
      v_amount_cash,
      'sale',
      'Venta: ' || v_sale_id
    );
  END IF;

  IF v_amount_card > 0 THEN
    INSERT INTO payments (sale_id, amount, method)
    VALUES (v_sale_id, v_amount_card, 'tarjeta');
  END IF;

  RETURN jsonb_build_object(
    'sale_id', v_sale_id,
    'total', v_total
  );
END;
$$;