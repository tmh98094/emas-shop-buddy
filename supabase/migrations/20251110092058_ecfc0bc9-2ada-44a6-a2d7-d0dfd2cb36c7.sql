-- Update expire_unpaid_orders to cancel BOTH order_status AND payment_status
CREATE OR REPLACE FUNCTION public.expire_unpaid_orders()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Cancel orders that are older than 24 hours and still pending
  -- Update BOTH order_status AND payment_status
  UPDATE orders
  SET 
    order_status = 'cancelled',
    payment_status = 'cancelled'
  WHERE payment_status = 'pending'
    AND order_status = 'pending'
    AND created_at < NOW() - INTERVAL '24 hours';
END;
$function$;