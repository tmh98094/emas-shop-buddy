-- Update stock deduction function to handle variant stock
CREATE OR REPLACE FUNCTION public.deduct_stock_on_order()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  current_stock INT;
  has_variants BOOLEAN;
  variant_combo JSONB;
BEGIN
  -- Check if product has variants
  SELECT EXISTS (
    SELECT 1 FROM product_variants WHERE product_id = NEW.product_id
  ) INTO has_variants;
  
  IF has_variants AND NEW.variant_selection IS NOT NULL AND NEW.variant_selection != '' THEN
    -- Parse variant selection string to JSONB combination
    -- Example: "Size: 10cm, Color: Gold" -> {"Size": "10cm", "Color": "Gold"}
    SELECT jsonb_object_agg(
      split_part(item, ': ', 1),
      split_part(item, ': ', 2)
    ) INTO variant_combo
    FROM unnest(string_to_array(NEW.variant_selection, ', ')) AS item
    WHERE item LIKE '%: %';
    
    -- Check variant stock
    SELECT stock INTO current_stock
    FROM variant_stock
    WHERE product_id = NEW.product_id
      AND variant_combination = variant_combo;
    
    IF current_stock IS NULL OR current_stock < NEW.quantity THEN
      RAISE EXCEPTION 'Insufficient variant stock. Available: %, Requested: %', COALESCE(current_stock, 0), NEW.quantity;
    END IF;
    
    -- Deduct variant stock
    UPDATE variant_stock
    SET stock = stock - NEW.quantity
    WHERE product_id = NEW.product_id
      AND variant_combination = variant_combo;
  ELSE
    -- No variants, use product stock
    SELECT stock INTO current_stock
    FROM products
    WHERE id = NEW.product_id;
    
    IF current_stock < NEW.quantity THEN
      RAISE EXCEPTION 'Insufficient stock for product. Available: %, Requested: %', current_stock, NEW.quantity;
    END IF;
    
    -- Deduct product stock
    UPDATE products
    SET stock = stock - NEW.quantity
    WHERE id = NEW.product_id;
  END IF;
  
  RETURN NEW;
END;
$$;