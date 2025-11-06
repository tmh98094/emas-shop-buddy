-- Add payment session URL columns to orders table
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS stripe_session_url TEXT,
ADD COLUMN IF NOT EXISTS stripe_session_expires_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS payment_link_generated_at TIMESTAMP WITH TIME ZONE;

-- Create index for faster payment pending queries
CREATE INDEX IF NOT EXISTS idx_orders_payment_pending 
ON public.orders(payment_status, created_at) 
WHERE payment_status = 'pending';

-- Update expire_unpaid_orders function to 24 hours instead of 2 hours
CREATE OR REPLACE FUNCTION public.expire_unpaid_orders()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- Update orders that are pending payment and older than 24 hours
  UPDATE public.orders
  SET order_status = 'cancelled'
  WHERE payment_status = 'pending'
    AND order_status = 'pending'
    AND created_at < NOW() - INTERVAL '24 hours';
END;
$function$;