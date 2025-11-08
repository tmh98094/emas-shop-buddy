-- Update function to restore stock after 30 minutes instead of 24 hours
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
  -- For each order with pending payment that's older than 30 minutes
  FOR rec IN 
    SELECT o.id, oi.product_id, oi.quantity, oi.variant_selection
    FROM orders o
    JOIN order_items oi ON oi.order_id = o.id
    WHERE o.payment_status = 'pending'
      AND o.order_status = 'pending'
      AND o.created_at < NOW() - INTERVAL '30 minutes'
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
  
  -- Update order status to 'stock_released' so we don't process them again
  UPDATE orders
  SET order_status = 'stock_released'
  WHERE payment_status = 'pending'
    AND order_status = 'pending'
    AND created_at < NOW() - INTERVAL '30 minutes';
END;
$function$;