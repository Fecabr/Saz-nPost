/*
  # Create RPC function create_sale_v1

  1. New Function
    - `create_sale_v1(payload jsonb)` - SECURITY DEFINER function
      - Verifies open cash session for company and user
      - Calculates subtotal and total
      - Inserts sale record
      - Inserts sale_items records
      - Applies inventory decrements:
        - For 'unit' items: inserts item_stocks outbound movement
        - For 'batch_portion' items: applies FEFO consumption on batches
      - Inserts payment record
      - Inserts cash_movements for efectivo payment
      - Returns { sale_id, total }

  2. Security
    - SECURITY DEFINER to allow inventory operations
    - Validates open cash session
    - Validates sufficient stock
*/

CREATE OR REPLACE FUNCTION create_sale_v1(payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_company_id uuid;
  v_user_id uuid;
  v_session_id uuid;
  v_sale_id uuid;
  v_subtotal numeric := 0;
  v_total numeric := 0;
  v_item record;
  v_payment_method text;
  v_amount_cash numeric;
  v_amount_card numeric;
  v_batch record;
  v_remaining_qty int;
  v_consumed_qty int;
BEGIN
  v_company_id := (payload->>'company_id')::uuid;
  v_user_id := auth.uid();

  SELECT id INTO v_session_id
  FROM cash_sessions
  WHERE company_id = v_company_id
    AND user_id = v_user_id
    AND status = 'open'
    AND closed_at IS NULL
  LIMIT 1;

  IF v_session_id IS NULL THEN
    RAISE EXCEPTION 'No hay caja abierta';
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(payload->'items')
  LOOP
    v_subtotal := v_subtotal + ((v_item.value->>'qty')::int * (v_item.value->>'unit_price')::numeric);
  END LOOP;

  v_total := v_subtotal;

  INSERT INTO sales (company_id, user_id, subtotal, tax, total, notes)
  VALUES (v_company_id, v_user_id, v_subtotal, 0, v_total, payload->>'notes')
  RETURNING id INTO v_sale_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(payload->'items')
  LOOP
    INSERT INTO sale_items (sale_id, item_id, qty, unit_price, line_total, kind, recipe_id)
    VALUES (
      v_sale_id,
      (v_item.value->>'item_id')::uuid,
      (v_item.value->>'qty')::int,
      (v_item.value->>'unit_price')::numeric,
      (v_item.value->>'qty')::int * (v_item.value->>'unit_price')::numeric,
      v_item.value->>'kind',
      (v_item.value->>'recipe_id')::uuid
    );

    IF v_item.value->>'kind' = 'unit' THEN
      INSERT INTO item_stocks (company_id, item_id, movement, qty, note)
      VALUES (
        v_company_id,
        (v_item.value->>'item_id')::uuid,
        'out',
        (v_item.value->>'qty')::int,
        'Venta #' || v_sale_id::text
      );
    ELSIF v_item.value->>'kind' = 'batch_portion' THEN
      v_remaining_qty := (v_item.value->>'qty')::int;

      FOR v_batch IN 
        SELECT id, portions_left
        FROM batches
        WHERE company_id = v_company_id
          AND recipe_id = (v_item.value->>'recipe_id')::uuid
          AND portions_left > 0
        ORDER BY expiration_date ASC
      LOOP
        IF v_remaining_qty <= 0 THEN
          EXIT;
        END IF;

        v_consumed_qty := LEAST(v_remaining_qty, v_batch.portions_left);

        UPDATE batches
        SET portions_left = portions_left - v_consumed_qty
        WHERE id = v_batch.id;

        v_remaining_qty := v_remaining_qty - v_consumed_qty;
      END LOOP;

      IF v_remaining_qty > 0 THEN
        RAISE EXCEPTION 'Stock insuficiente';
      END IF;
    END IF;
  END LOOP;

  v_payment_method := payload->>'payment_method';
  v_amount_cash := COALESCE((payload->>'amount_cash')::numeric, 0);
  v_amount_card := COALESCE((payload->>'amount_card')::numeric, 0);

  INSERT INTO payments (sale_id, method, amount_cash, amount_card)
  VALUES (v_sale_id, v_payment_method, v_amount_cash, v_amount_card);

  IF v_amount_cash > 0 THEN
    INSERT INTO cash_movements (session_id, movement_type, amount, description)
    VALUES (v_session_id, 'in', v_amount_cash, 'Venta #' || v_sale_id::text);
  END IF;

  RETURN jsonb_build_object('sale_id', v_sale_id, 'total', v_total);
END;
$$;