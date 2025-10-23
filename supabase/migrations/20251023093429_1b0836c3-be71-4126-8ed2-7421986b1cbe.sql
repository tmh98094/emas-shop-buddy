-- Ensure unique constraint on settings.key for upsert to work
CREATE UNIQUE INDEX IF NOT EXISTS settings_key_unique_idx ON public.settings (key);

-- Create trigger to auto-generate order numbers using existing function
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'before_insert_generate_order_number'
  ) THEN
    CREATE TRIGGER before_insert_generate_order_number
    BEFORE INSERT ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION public.generate_order_number();
  END IF;
END $$;

-- Create trigger to update product cached prices when settings change
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'after_settings_update_update_cached_prices'
  ) THEN
    CREATE TRIGGER after_settings_update_update_cached_prices
    AFTER INSERT OR UPDATE ON public.settings
    FOR EACH ROW
    EXECUTE FUNCTION public.trigger_update_cached_prices();
  END IF;
END $$;

-- Function to fetch next order sequence for frontend use
CREATE OR REPLACE FUNCTION public.get_next_order_sequence()
RETURNS bigint
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT nextval('order_number_seq');
$$;

-- Simple phone normalization helper in SQL (conservative cleanup)
CREATE OR REPLACE FUNCTION public.normalize_phone_sql(p_input text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  p text := coalesce(p_input, '');
BEGIN
  -- Trim and keep only digits and plus
  p := regexp_replace(trim(p), '[^0-9+]', '', 'g');
  -- Collapse multiple + to a single at start
  p := regexp_replace(p, '^(\++)', '+', 'g');
  -- Convert leading 00 to +
  p := regexp_replace(p, '^00', '+');
  -- Ensure leading + exists
  IF p <> '' AND p !~ '^\+' THEN
    p := '+' || p;
  END IF;
  RETURN NULLIF(p, '');
END;
$$;

-- One-time cleanup of existing phone numbers
UPDATE public.orders
SET phone_number = public.normalize_phone_sql(phone_number)
WHERE phone_number IS NOT NULL;

UPDATE public.profiles
SET phone_number = public.normalize_phone_sql(phone_number)
WHERE phone_number IS NOT NULL;

UPDATE public.stock_notifications
SET phone = public.normalize_phone_sql(phone)
WHERE phone IS NOT NULL;