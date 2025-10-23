-- Fix update_product_cached_prices to satisfy safety rules by adding a WHERE clause and only updating changed rows
CREATE OR REPLACE FUNCTION public.update_product_cached_prices()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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

  -- Update only relevant product rows and only when the value would change
  UPDATE products p
  SET cached_current_price = 
    CASE 
      WHEN p.gold_type = '916' THEN (price_916 * p.weight_grams) + p.labour_fee
      WHEN p.gold_type = '999' THEN (price_999 * p.weight_grams) + p.labour_fee
      ELSE 0
    END
  WHERE p.gold_type IN ('916','999')
    AND p.cached_current_price IS DISTINCT FROM (
      CASE 
        WHEN p.gold_type = '916' THEN (price_916 * p.weight_grams) + p.labour_fee
        WHEN p.gold_type = '999' THEN (price_999 * p.weight_grams) + p.labour_fee
        ELSE 0
      END
    );
END;
$$;