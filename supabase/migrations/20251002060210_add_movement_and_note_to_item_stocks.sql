/*
  # Add movement and note columns to item_stocks

  1. Changes
    - Add `movement` column (text) to indicate 'in' or 'out'
    - Add `note` column (text, optional) for additional information
  
  2. Notes
    - Existing rows will have NULL movement, which is acceptable for historical data
*/

-- Add movement column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'item_stocks' AND column_name = 'movement'
  ) THEN
    ALTER TABLE item_stocks ADD COLUMN movement text;
  END IF;
END $$;

-- Add note column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'item_stocks' AND column_name = 'note'
  ) THEN
    ALTER TABLE item_stocks ADD COLUMN note text;
  END IF;
END $$;
