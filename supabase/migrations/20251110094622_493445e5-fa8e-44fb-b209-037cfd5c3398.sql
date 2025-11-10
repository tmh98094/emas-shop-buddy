
-- Fix 1: Add admin role for user +6580565123
INSERT INTO public.user_roles (user_id, role)
VALUES ('285ed780-9960-45ba-bd80-9c9fe89c5370', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;

-- Fix 2: Update expire_unpaid_orders function to use 'failed' instead of 'cancelled' for payment_status
CREATE OR REPLACE FUNCTION public.expire_unpaid_orders()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- Update orders that are older than 24 hours and still pending
  -- Set both order_status AND payment_status to 'cancelled' and 'failed' respectively
  UPDATE orders
  SET 
    order_status = 'cancelled',
    payment_status = 'failed'  -- Changed from 'cancelled' to 'failed'
  WHERE payment_status = 'pending'
    AND order_status = 'pending'
    AND created_at < NOW() - INTERVAL '24 hours';
END;
$function$;
