-- Phase 1: Fix NULL cached_current_price and add automatic calculation
-- First, update all products with NULL cached_current_price
DO $$
DECLARE
  price_916 NUMERIC;
  price_999 NUMERIC;
BEGIN
  -- Get current gold prices
  SELECT (value->>'price')::NUMERIC INTO price_916 
  FROM settings WHERE key = 'gold_price_916';
  
  SELECT (value->>'price')::NUMERIC INTO price_999 
  FROM settings WHERE key = 'gold_price_999';

  -- Update products with NULL cached_current_price
  UPDATE products
  SET cached_current_price = 
    CASE 
      WHEN gold_type = '916' THEN (price_916 * weight_grams) + labour_fee
      WHEN gold_type = '999' THEN (price_999 * weight_grams) + labour_fee
      ELSE 0
    END
  WHERE cached_current_price IS NULL AND gold_type IN ('916','999');
END $$;

-- Create trigger to auto-calculate cached_current_price on product insert/update
CREATE OR REPLACE FUNCTION calculate_cached_price()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  price_916 NUMERIC;
  price_999 NUMERIC;
BEGIN
  -- Get current gold prices
  SELECT (value->>'price')::NUMERIC INTO price_916 
  FROM settings WHERE key = 'gold_price_916';
  
  SELECT (value->>'price')::NUMERIC INTO price_999 
  FROM settings WHERE key = 'gold_price_999';

  -- Calculate cached price based on gold type
  IF NEW.gold_type = '916' THEN
    NEW.cached_current_price := (price_916 * NEW.weight_grams) + NEW.labour_fee;
  ELSIF NEW.gold_type = '999' THEN
    NEW.cached_current_price := (price_999 * NEW.weight_grams) + NEW.labour_fee;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger on products table
DROP TRIGGER IF EXISTS trigger_calculate_cached_price ON products;
CREATE TRIGGER trigger_calculate_cached_price
  BEFORE INSERT OR UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION calculate_cached_price();

-- Phase 3: Update storage bucket to allow video uploads
UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  'image/jpeg',
  'image/jpg', 
  'image/png',
  'image/webp',
  'image/gif',
  'video/mp4',
  'video/webm',
  'video/ogg',
  'video/quicktime'
]
WHERE id = 'product-images';