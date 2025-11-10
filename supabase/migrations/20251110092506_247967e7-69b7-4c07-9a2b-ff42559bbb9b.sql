-- Remove obsolete enum value stock_released from order_status safely
DO $$ BEGIN
  -- 1) Migrate any existing rows using the obsolete value to a supported value
  UPDATE public.orders SET order_status = 'cancelled'::order_status WHERE order_status::text = 'stock_released';

  -- 2) Rename old type
  ALTER TYPE public.order_status RENAME TO order_status_old;

  -- 3) Create the new type without 'stock_released'
  CREATE TYPE public.order_status AS ENUM ('pending','processing','completed','cancelled','refunded');

  -- 4) Alter the column to use the new type
  ALTER TABLE public.orders ALTER COLUMN order_status DROP DEFAULT;
  ALTER TABLE public.orders 
    ALTER COLUMN order_status TYPE public.order_status 
    USING order_status::text::public.order_status;
  ALTER TABLE public.orders ALTER COLUMN order_status SET DEFAULT 'pending'::public.order_status;

  -- 5) Drop the old type
  DROP TYPE public.order_status_old;
EXCEPTION WHEN others THEN
  RAISE NOTICE 'Migration failed: %', SQLERRM;
  RAISE;
END $$;