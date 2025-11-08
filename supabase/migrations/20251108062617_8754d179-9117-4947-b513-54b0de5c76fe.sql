-- Also update the order cancellation to 24 hours (stock released at 30min, cancelled at 24h)
CREATE OR REPLACE FUNCTION public.expire_unpaid_orders()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- First restore stock for orders older than 30 minutes
  PERFORM public.restore_stock_for_expired_orders();
  
  -- Then cancel orders that are older than 24 hours
  UPDATE orders
  SET order_status = 'cancelled'
  WHERE payment_status = 'pending'
    AND order_status IN ('pending', 'stock_released')
    AND created_at < NOW() - INTERVAL '24 hours';
END;
$function$;