-- Create function to restore stock for expired unpaid orders
CREATE OR REPLACE FUNCTION public.restore_stock_for_expired_orders()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  rec RECORD;
  variant_combo JSONB;
  items TEXT[];
BEGIN
  -- For each expired unpaid order
  FOR rec IN 
    SELECT o.id, oi.product_id, oi.quantity, oi.variant_selection
    FROM orders o
    JOIN order_items oi ON oi.order_id = o.id
    WHERE o.payment_status = 'pending'
      AND o.order_status != 'cancelled'
      AND o.created_at < NOW() - INTERVAL '24 hours'
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
  
  -- Mark expired orders as cancelled
  UPDATE orders
  SET order_status = 'cancelled'
  WHERE payment_status = 'pending'
    AND order_status != 'cancelled'
    AND created_at < NOW() - INTERVAL '24 hours';
END;
$function$;

-- Update the existing expire_unpaid_orders function to call the stock restoration
DROP FUNCTION IF EXISTS public.expire_unpaid_orders();

CREATE OR REPLACE FUNCTION public.expire_unpaid_orders()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Restore stock first
  PERFORM public.restore_stock_for_expired_orders();
END;
$function$;