-- Update the restore_stock_on_cancellation trigger to also handle stock_released status
CREATE OR REPLACE FUNCTION public.restore_stock_on_cancellation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Only restore stock if order is being cancelled and wasn't already stock_released
  IF NEW.order_status = 'cancelled' AND OLD.order_status NOT IN ('cancelled', 'stock_released') THEN
    -- Restore stock for all items in the order
    UPDATE products p
    SET stock = stock + oi.quantity
    FROM order_items oi
    WHERE oi.order_id = NEW.id
      AND oi.product_id = p.id;
  END IF;
  RETURN NEW;
END;
$function$;