-- Add stock restoration trigger
CREATE OR REPLACE FUNCTION public.restore_stock_on_cancellation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only restore stock if order is being cancelled
  IF NEW.order_status = 'cancelled' AND OLD.order_status != 'cancelled' THEN
    -- Restore stock for all items in the order
    UPDATE products p
    SET stock = stock + oi.quantity
    FROM order_items oi
    WHERE oi.order_id = NEW.id
      AND oi.product_id = p.id;
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger for stock restoration
DROP TRIGGER IF EXISTS trigger_restore_stock_on_cancellation ON orders;
CREATE TRIGGER trigger_restore_stock_on_cancellation
  AFTER UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION restore_stock_on_cancellation();

-- Drop review-related columns from order_items
ALTER TABLE order_items 
  DROP COLUMN IF EXISTS review_rating,
  DROP COLUMN IF EXISTS review_text,
  DROP COLUMN IF EXISTS reviewed_at;

-- Drop product_reviews table
DROP TABLE IF EXISTS product_reviews CASCADE;