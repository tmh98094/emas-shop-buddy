-- Phase 1: Add price locking columns to cart_items
ALTER TABLE cart_items 
ADD COLUMN calculated_price NUMERIC,
ADD COLUMN gold_price_snapshot NUMERIC,
ADD COLUMN locked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Phase 3: Add cached current price to products
ALTER TABLE products 
ADD COLUMN cached_current_price NUMERIC;

-- Create function to calculate and update cached prices
CREATE OR REPLACE FUNCTION update_product_cached_prices()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  price_916 NUMERIC;
  price_999 NUMERIC;
BEGIN
  -- Get current gold prices from settings
  SELECT (value->>'price')::NUMERIC INTO price_916 
  FROM settings WHERE key = 'gold_price_916';
  
  SELECT (value->>'price')::NUMERIC INTO price_999 
  FROM settings WHERE key = 'gold_price_999';
  
  -- Update all products with calculated prices
  UPDATE products
  SET cached_current_price = 
    CASE 
      WHEN gold_type = '916' THEN (price_916 * weight_grams) + labour_fee
      WHEN gold_type = '999' THEN (price_999 * weight_grams) + labour_fee
      ELSE 0
    END;
END;
$$;

-- Create trigger function for settings changes
CREATE OR REPLACE FUNCTION trigger_update_cached_prices()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only update if gold price settings changed
  IF NEW.key IN ('gold_price_916', 'gold_price_999') THEN
    PERFORM update_product_cached_prices();
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger on settings table
DROP TRIGGER IF EXISTS update_cached_prices_on_settings_change ON settings;
CREATE TRIGGER update_cached_prices_on_settings_change
AFTER UPDATE ON settings
FOR EACH ROW
EXECUTE FUNCTION trigger_update_cached_prices();

-- Initial population of cached prices
SELECT update_product_cached_prices();