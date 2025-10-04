/*
  # Create search_clients RPC function

  1. New Functions
    - `search_clients(q text, company uuid)`
      - Searches clients by name or identification_number using ILIKE
      - Filters by company_id
      - Returns up to 20 results ordered by name
      - Respects RLS (not SECURITY DEFINER)

  2. Security
    - Function runs with INVOKER rights (respects RLS)
    - Users can only see clients they have access to via RLS policies
*/

CREATE OR REPLACE FUNCTION search_clients(q text, company uuid)
RETURNS TABLE (
  id uuid,
  company_id uuid,
  name text,
  identification_type text,
  identification_number text,
  email text,
  phone text,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.company_id,
    c.name,
    c.identification_type,
    c.identification_number,
    c.email,
    c.phone,
    c.created_at
  FROM clients c
  WHERE c.company_id = company
    AND (c.name ILIKE '%' || q || '%' OR c.identification_number ILIKE '%' || q || '%')
  ORDER BY c.name
  LIMIT 20;
END;
$$;