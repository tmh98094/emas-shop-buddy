-- Ensure unique index on settings.key for upsert semantics
CREATE UNIQUE INDEX IF NOT EXISTS settings_key_unique ON public.settings (key);

-- RPC function to upsert gold prices and QR in one call and refresh cached prices
CREATE OR REPLACE FUNCTION public.upsert_gold_settings(
  price_916 NUMERIC,
  price_999 NUMERIC,
  qr_url TEXT,
  updated_by UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Upsert 916
  INSERT INTO public.settings (key, value, updated_by)
  VALUES ('gold_price_916', jsonb_build_object('price', price_916), updated_by)
  ON CONFLICT (key)
  DO UPDATE SET value = EXCLUDED.value, updated_by = EXCLUDED.updated_by;

  -- Upsert 999
  INSERT INTO public.settings (key, value, updated_by)
  VALUES ('gold_price_999', jsonb_build_object('price', price_999), updated_by)
  ON CONFLICT (key)
  DO UPDATE SET value = EXCLUDED.value, updated_by = EXCLUDED.updated_by;

  -- Upsert QR
  INSERT INTO public.settings (key, value, updated_by)
  VALUES ('touch_n_go_qr', jsonb_build_object('qr_code_url', qr_url), updated_by)
  ON CONFLICT (key)
  DO UPDATE SET value = EXCLUDED.value, updated_by = EXCLUDED.updated_by;

  -- Refresh cached product prices
  PERFORM public.update_product_cached_prices();
END;
$$;