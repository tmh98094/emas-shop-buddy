-- Phase 1: Add variant_selection column to order_items
ALTER TABLE order_items 
ADD COLUMN IF NOT EXISTS variant_selection TEXT;

-- Phase 2: Admin Email Notification System
-- First, ensure we have admin_email setting
INSERT INTO settings (key, value)
VALUES ('admin_email', '{"email": "tmh0249@gmail.com"}')
ON CONFLICT (key) DO NOTHING;

-- Trigger 1: Notify admin when product goes out of stock
CREATE OR REPLACE FUNCTION notify_admin_out_of_stock()
RETURNS TRIGGER AS $$
DECLARE
  admin_email_setting JSONB;
  supabase_url TEXT;
  supabase_anon_key TEXT;
BEGIN
  IF NEW.stock = 0 AND OLD.stock > 0 THEN
    -- Get admin email from settings
    SELECT value INTO admin_email_setting 
    FROM settings 
    WHERE key = 'admin_email';
    
    -- Get Supabase URL and anon key from environment
    supabase_url := current_setting('app.settings.supabase_url', true);
    supabase_anon_key := current_setting('app.settings.supabase_anon_key', true);
    
    -- Call edge function via pg_net
    PERFORM net.http_post(
      url := supabase_url || '/functions/v1/send-admin-email',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || supabase_anon_key
      ),
      body := jsonb_build_object(
        'type', 'out_of_stock',
        'product_id', NEW.id,
        'product_name', NEW.name,
        'gold_type', NEW.gold_type,
        'weight_grams', NEW.weight_grams,
        'admin_email', COALESCE((admin_email_setting->>'email')::text, 'tmh0249@gmail.com')
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_out_of_stock
AFTER UPDATE OF stock ON products
FOR EACH ROW
EXECUTE FUNCTION notify_admin_out_of_stock();

-- Trigger 2: Notify admin on new pre-order
CREATE OR REPLACE FUNCTION notify_admin_new_pre_order()
RETURNS TRIGGER AS $$
DECLARE
  order_info RECORD;
  admin_email_setting JSONB;
  supabase_url TEXT;
  supabase_anon_key TEXT;
BEGIN
  -- Get order details
  SELECT o.order_number, o.full_name, o.phone_number, o.total_amount
  INTO order_info
  FROM orders o
  WHERE o.id = NEW.order_id;
  
  SELECT value INTO admin_email_setting 
  FROM settings 
  WHERE key = 'admin_email';
  
  supabase_url := current_setting('app.settings.supabase_url', true);
  supabase_anon_key := current_setting('app.settings.supabase_anon_key', true);
  
  PERFORM net.http_post(
    url := supabase_url || '/functions/v1/send-admin-email',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || supabase_anon_key
    ),
    body := jsonb_build_object(
      'type', 'new_pre_order',
      'order_number', order_info.order_number,
      'customer_name', order_info.full_name,
      'customer_phone', order_info.phone_number,
      'deposit_paid', NEW.deposit_paid,
      'balance_due', NEW.balance_due,
      'order_id', NEW.order_id,
      'admin_email', COALESCE((admin_email_setting->>'email')::text, 'tmh0249@gmail.com')
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_new_pre_order
AFTER INSERT ON pre_orders
FOR EACH ROW
EXECUTE FUNCTION notify_admin_new_pre_order();

-- Trigger 3: Notify admin on Touch N Go payment upload
CREATE OR REPLACE FUNCTION notify_admin_touch_n_go()
RETURNS TRIGGER AS $$
DECLARE
  order_info RECORD;
  admin_email_setting JSONB;
  supabase_url TEXT;
  supabase_anon_key TEXT;
BEGIN
  SELECT o.order_number, o.full_name, o.total_amount
  INTO order_info
  FROM orders o
  WHERE o.id = NEW.order_id;
  
  SELECT value INTO admin_email_setting 
  FROM settings 
  WHERE key = 'admin_email';
  
  supabase_url := current_setting('app.settings.supabase_url', true);
  supabase_anon_key := current_setting('app.settings.supabase_anon_key', true);
  
  PERFORM net.http_post(
    url := supabase_url || '/functions/v1/send-admin-email',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || supabase_anon_key
    ),
    body := jsonb_build_object(
      'type', 'new_touch_n_go_payment',
      'order_number', order_info.order_number,
      'customer_name', order_info.full_name,
      'total_amount', order_info.total_amount,
      'receipt_url', NEW.receipt_image_url,
      'order_id', NEW.order_id,
      'admin_email', COALESCE((admin_email_setting->>'email')::text, 'tmh0249@gmail.com')
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_new_touch_n_go
AFTER INSERT ON touch_n_go_payments
FOR EACH ROW
EXECUTE FUNCTION notify_admin_touch_n_go();