/*
  # Create Item Current Stock View

  1. New Views
    - `v_item_current_stock`
      - `company_id` (uuid)
      - `item_id` (uuid)
      - `qty` (numeric) - sum of quantity from item_stocks
  
  2. Security
    - Enable RLS using security_invoker
    - View inherits RLS from underlying table item_stocks
*/

-- Create the view with security_invoker
CREATE OR REPLACE VIEW v_item_current_stock 
WITH (security_invoker = true)
AS
SELECT 
  company_id,
  item_id,
  COALESCE(SUM(quantity), 0) as qty
FROM item_stocks
GROUP BY company_id, item_id;

-- Grant access to authenticated users
GRANT SELECT ON v_item_current_stock TO authenticated;
