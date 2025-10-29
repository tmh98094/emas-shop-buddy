-- Function to expire unpaid orders older than 2 hours
CREATE OR REPLACE FUNCTION public.expire_unpaid_orders()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Update orders that are pending payment and older than 2 hours
  UPDATE public.orders
  SET order_status = 'cancelled'
  WHERE payment_status = 'pending'
    AND order_status = 'pending'
    AND created_at < NOW() - INTERVAL '2 hours';
END;
$$;

-- Schedule the function to run every 30 minutes
-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Add cron job (runs every 30 minutes)
SELECT cron.schedule(
  'expire-unpaid-orders',
  '*/30 * * * *', -- Every 30 minutes
  $$
  SELECT public.expire_unpaid_orders();
  $$
);