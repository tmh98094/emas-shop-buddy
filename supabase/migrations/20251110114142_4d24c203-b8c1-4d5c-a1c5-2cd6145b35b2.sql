-- Fix JSONB comparison in stock management functions
-- Replace = with @> operator for proper JSONB matching

CREATE OR REPLACE FUNCTION public.deduct_stock_on_payment_success()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  rec RECORD;
  variant_combo JSONB;
  items TEXT[];
  current_stock INT;
BEGIN
  -- Only deduct when payment status changes from pending to completed
  IF NEW.payment_status = 'completed' AND OLD.payment_status = 'pending' AND NEW.stock_deducted_at IS NULL THEN
    
    FOR rec IN 
      SELECT product_id, quantity, variant_selection
      FROM order_items
      WHERE order_id = NEW.id
    LOOP
      -- Check if product has variants
      IF rec.variant_selection IS NOT NULL AND rec.variant_selection != '' THEN
        -- Parse variant selection
        items := string_to_array(rec.variant_selection, ', ');
        SELECT jsonb_object_agg(
          split_part(item, ': ', 1),
          split_part(item, ': ', 2)
        ) INTO variant_combo
        FROM unnest(items) AS item
        WHERE item LIKE '%: %';
        
        -- Check variant stock using JSONB containment
        SELECT stock INTO current_stock
        FROM variant_stock
        WHERE product_id = rec.product_id
          AND variant_combination @> variant_combo 
          AND variant_combo @> variant_combination;
        
        IF current_stock IS NULL OR current_stock < rec.quantity THEN
          RAISE EXCEPTION 'Insufficient variant stock at payment time. Available: %, Requested: %', 
            COALESCE(current_stock, 0), rec.quantity;
        END IF;
        
        -- Deduct variant stock using JSONB containment
        UPDATE variant_stock
        SET stock = stock - rec.quantity
        WHERE product_id = rec.product_id
          AND variant_combination @> variant_combo 
          AND variant_combo @> variant_combination;
      ELSE
        -- Check product stock
        SELECT stock INTO current_stock
        FROM products
        WHERE id = rec.product_id;
        
        IF current_stock < rec.quantity THEN
          RAISE EXCEPTION 'Insufficient product stock at payment time. Available: %, Requested: %', 
            current_stock, rec.quantity;
        END IF;
        
        -- Deduct product stock
        UPDATE products
        SET stock = stock - rec.quantity
        WHERE id = rec.product_id;
      END IF;
    END LOOP;
    
    -- Mark stock as deducted
    NEW.stock_deducted_at := NOW();
  END IF;
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.restore_stock_on_cancellation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  rec RECORD;
  variant_combo JSONB;
  items TEXT[];
BEGIN
  -- Only restore stock if order is being cancelled AND stock was actually deducted
  IF NEW.order_status = 'cancelled' 
     AND OLD.order_status != 'cancelled' 
     AND OLD.stock_deducted_at IS NOT NULL THEN
    
    FOR rec IN 
      SELECT product_id, quantity, variant_selection
      FROM order_items
      WHERE order_id = NEW.id
    LOOP
      IF rec.variant_selection IS NOT NULL AND rec.variant_selection != '' THEN
        items := string_to_array(rec.variant_selection, ', ');
        SELECT jsonb_object_agg(
          split_part(item, ': ', 1),
          split_part(item, ': ', 2)
        ) INTO variant_combo
        FROM unnest(items) AS item
        WHERE item LIKE '%: %';
        
        -- Restore variant stock using JSONB containment
        UPDATE variant_stock
        SET stock = stock + rec.quantity
        WHERE product_id = rec.product_id
          AND variant_combination @> variant_combo 
          AND variant_combo @> variant_combination;
      ELSE
        UPDATE products
        SET stock = stock + rec.quantity
        WHERE id = rec.product_id;
      END IF;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.restore_stock_on_payment_failure()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  rec RECORD;
  variant_combo JSONB;
  items TEXT[];
BEGIN
  -- Only restore if payment fails AND stock was actually deducted
  IF NEW.payment_status = 'failed' 
     AND OLD.payment_status != 'failed' 
     AND OLD.stock_deducted_at IS NOT NULL THEN
    
    FOR rec IN 
      SELECT product_id, quantity, variant_selection
      FROM order_items
      WHERE order_id = NEW.id
    LOOP
      IF rec.variant_selection IS NOT NULL AND rec.variant_selection != '' THEN
        items := string_to_array(rec.variant_selection, ', ');
        SELECT jsonb_object_agg(
          split_part(item, ': ', 1),
          split_part(item, ': ', 2)
        ) INTO variant_combo
        FROM unnest(items) AS item
        WHERE item LIKE '%: %';
        
        -- Restore variant stock using JSONB containment
        UPDATE variant_stock
        SET stock = stock + rec.quantity
        WHERE product_id = rec.product_id
          AND variant_combination @> variant_combo 
          AND variant_combo @> variant_combination;
      ELSE
        UPDATE products
        SET stock = stock + rec.quantity
        WHERE id = rec.product_id;
      END IF;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$function$;