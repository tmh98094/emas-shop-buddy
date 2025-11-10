-- Phase 1: Redesign Stock Flow - Stock deduction on payment success only
-- Drop old trigger that deducts stock on order creation
DROP TRIGGER IF EXISTS deduct_stock_after_order_item ON order_items;
DROP FUNCTION IF EXISTS deduct_stock_on_order() CASCADE;

-- Add tracking column for when stock was actually deducted
ALTER TABLE orders ADD COLUMN IF NOT EXISTS stock_deducted_at TIMESTAMP WITH TIME ZONE;

-- Remove stock_restored_at column as we no longer need it
ALTER TABLE orders DROP COLUMN IF EXISTS stock_restored_at;

-- Create new function: deduct stock ONLY when payment succeeds
CREATE OR REPLACE FUNCTION public.deduct_stock_on_payment_success()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  rec RECORD;
  variant_combo JSONB;
  items TEXT[];
  current_stock INT;
BEGIN
  -- Only deduct when payment status changes from pending to completed
  IF NEW.payment_status = 'completed' AND OLD.payment_status = 'pending' AND NEW.stock_deducted_at IS NULL THEN
    
    FOR rec IN 
      SELECT product_id, quantity, variant_selection
      FROM order_items
      WHERE order_id = NEW.id
    LOOP
      -- Check if product has variants
      IF rec.variant_selection IS NOT NULL AND rec.variant_selection != '' THEN
        -- Parse variant selection
        items := string_to_array(rec.variant_selection, ', ');
        SELECT jsonb_object_agg(
          split_part(item, ': ', 1),
          split_part(item, ': ', 2)
        ) INTO variant_combo
        FROM unnest(items) AS item
        WHERE item LIKE '%: %';
        
        -- Check variant stock
        SELECT stock INTO current_stock
        FROM variant_stock
        WHERE product_id = rec.product_id
          AND variant_combination = variant_combo;
        
        IF current_stock IS NULL OR current_stock < rec.quantity THEN
          RAISE EXCEPTION 'Insufficient variant stock at payment time. Available: %, Requested: %', 
            COALESCE(current_stock, 0), rec.quantity;
        END IF;
        
        -- Deduct variant stock
        UPDATE variant_stock
        SET stock = stock - rec.quantity
        WHERE product_id = rec.product_id
          AND variant_combination = variant_combo;
      ELSE
        -- Check product stock
        SELECT stock INTO current_stock
        FROM products
        WHERE id = rec.product_id;
        
        IF current_stock < rec.quantity THEN
          RAISE EXCEPTION 'Insufficient product stock at payment time. Available: %, Requested: %', 
            current_stock, rec.quantity;
        END IF;
        
        -- Deduct product stock
        UPDATE products
        SET stock = stock - rec.quantity
        WHERE id = rec.product_id;
      END IF;
    END LOOP;
    
    -- Mark stock as deducted
    NEW.stock_deducted_at := NOW();
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create trigger for payment success stock deduction
CREATE TRIGGER deduct_stock_on_payment
BEFORE UPDATE ON orders
FOR EACH ROW
EXECUTE FUNCTION deduct_stock_on_payment_success();

-- Drop old stock restoration functions since we don't deduct upfront anymore
DROP FUNCTION IF EXISTS restore_stock_for_expired_orders() CASCADE;

-- Simplified expire function - just cancel old orders, no stock restoration needed
CREATE OR REPLACE FUNCTION public.expire_unpaid_orders()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Cancel orders that are older than 24 hours and still pending
  UPDATE orders
  SET order_status = 'cancelled'
  WHERE payment_status = 'pending'
    AND order_status = 'pending'
    AND created_at < NOW() - INTERVAL '24 hours';
END;
$function$;

-- Update restore_stock_on_cancellation to only restore if stock was actually deducted
CREATE OR REPLACE FUNCTION public.restore_stock_on_cancellation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  rec RECORD;
  variant_combo JSONB;
  items TEXT[];
BEGIN
  -- Only restore stock if order is being cancelled AND stock was actually deducted
  IF NEW.order_status = 'cancelled' 
     AND OLD.order_status != 'cancelled' 
     AND OLD.stock_deducted_at IS NOT NULL THEN
    
    FOR rec IN 
      SELECT product_id, quantity, variant_selection
      FROM order_items
      WHERE order_id = NEW.id
    LOOP
      IF rec.variant_selection IS NOT NULL AND rec.variant_selection != '' THEN
        items := string_to_array(rec.variant_selection, ', ');
        SELECT jsonb_object_agg(
          split_part(item, ': ', 1),
          split_part(item, ': ', 2)
        ) INTO variant_combo
        FROM unnest(items) AS item
        WHERE item LIKE '%: %';
        
        UPDATE variant_stock
        SET stock = stock + rec.quantity
        WHERE product_id = rec.product_id
          AND variant_combination = variant_combo;
      ELSE
        UPDATE products
        SET stock = stock + rec.quantity
        WHERE id = rec.product_id;
      END IF;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Update restore_stock_on_payment_failure to only restore if stock was deducted
CREATE OR REPLACE FUNCTION public.restore_stock_on_payment_failure()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  rec RECORD;
  variant_combo JSONB;
  items TEXT[];
BEGIN
  -- Only restore if payment fails AND stock was actually deducted
  IF NEW.payment_status = 'failed' 
     AND OLD.payment_status != 'failed' 
     AND OLD.stock_deducted_at IS NOT NULL THEN
    
    FOR rec IN 
      SELECT product_id, quantity, variant_selection
      FROM order_items
      WHERE order_id = NEW.id
    LOOP
      IF rec.variant_selection IS NOT NULL AND rec.variant_selection != '' THEN
        items := string_to_array(rec.variant_selection, ', ');
        SELECT jsonb_object_agg(
          split_part(item, ': ', 1),
          split_part(item, ': ', 2)
        ) INTO variant_combo
        FROM unnest(items) AS item
        WHERE item LIKE '%: %';
        
        UPDATE variant_stock
        SET stock = stock + rec.quantity
        WHERE product_id = rec.product_id
          AND variant_combination = variant_combo;
      ELSE
        UPDATE products
        SET stock = stock + rec.quantity
        WHERE id = rec.product_id;
      END IF;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$function$;