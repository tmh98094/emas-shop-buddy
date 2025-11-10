-- Phase 1: Add stock_released to order_status enum
ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'stock_released';

-- Phase 3: Create trigger function to restore stock on payment failure
CREATE OR REPLACE FUNCTION public.restore_stock_on_payment_failure()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  rec RECORD;
  variant_combo JSONB;
  items TEXT[];
BEGIN
  -- Only restore stock when payment status changes to 'failed' and wasn't already failed or stock_released
  IF NEW.payment_status = 'failed' AND OLD.payment_status != 'failed' AND OLD.order_status NOT IN ('cancelled', 'stock_released') THEN
    
    -- Loop through all order items to restore stock
    FOR rec IN 
      SELECT oi.product_id, oi.quantity, oi.variant_selection
      FROM order_items oi
      WHERE oi.order_id = NEW.id
    LOOP
      -- Check if product has variants
      IF rec.variant_selection IS NOT NULL AND rec.variant_selection != '' THEN
        -- Parse variant selection to JSONB
        items := string_to_array(rec.variant_selection, ', ');
        SELECT jsonb_object_agg(
          split_part(item, ': ', 1),
          split_part(item, ': ', 2)
        ) INTO variant_combo
        FROM unnest(items) AS item
        WHERE item LIKE '%: %';
        
        -- Restore variant stock
        UPDATE variant_stock
        SET stock = stock + rec.quantity
        WHERE product_id = rec.product_id
          AND variant_combination = variant_combo;
      ELSE
        -- Restore product stock
        UPDATE products
        SET stock = stock + rec.quantity
        WHERE id = rec.product_id;
      END IF;
    END LOOP;
    
    -- Update order status to stock_released
    NEW.order_status := 'stock_released';
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create trigger on orders table for payment failure
DROP TRIGGER IF EXISTS trigger_restore_stock_on_payment_failure ON orders;
CREATE TRIGGER trigger_restore_stock_on_payment_failure
  BEFORE UPDATE ON orders
  FOR EACH ROW
  WHEN (NEW.payment_status = 'failed' AND OLD.payment_status != 'failed')
  EXECUTE FUNCTION restore_stock_on_payment_failure();