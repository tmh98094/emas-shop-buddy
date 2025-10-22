-- Add shipping address fields to orders table
ALTER TABLE orders
ADD COLUMN shipping_address_line1 TEXT,
ADD COLUMN shipping_address_line2 TEXT,
ADD COLUMN shipping_city TEXT,
ADD COLUMN shipping_state TEXT,
ADD COLUMN shipping_postcode TEXT,
ADD COLUMN shipping_country TEXT DEFAULT 'Malaysia',
ADD COLUMN postage_delivery_id TEXT,
ADD COLUMN delivery_notes TEXT;

-- Add video support to product_images table
ALTER TABLE product_images
ADD COLUMN media_type TEXT DEFAULT 'image' CHECK (media_type IN ('image', 'video')),
ADD COLUMN is_thumbnail BOOLEAN DEFAULT false;

-- Create admin_notifications table
CREATE TABLE admin_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  order_id UUID REFERENCES orders(id),
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS for admin_notifications
ALTER TABLE admin_notifications ENABLE ROW LEVEL SECURITY;

-- Admins can view all notifications
CREATE POLICY "Admins can view notifications"
ON admin_notifications FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can update notifications
CREATE POLICY "Admins can update notifications"
ON admin_notifications FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Anyone can create notifications (for system triggers)
CREATE POLICY "Anyone can create notifications"
ON admin_notifications FOR INSERT
WITH CHECK (true);

-- Create search_history table
CREATE TABLE search_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  session_id TEXT,
  search_query TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS for search_history
ALTER TABLE search_history ENABLE ROW LEVEL SECURITY;

-- Users can view their own search history
CREATE POLICY "Users can view their search history"
ON search_history FOR SELECT
USING (auth.uid() = user_id OR (user_id IS NULL AND session_id IS NOT NULL));

-- Users can insert their own search history
CREATE POLICY "Users can insert search history"
ON search_history FOR INSERT
WITH CHECK (auth.uid() = user_id OR (user_id IS NULL AND session_id IS NOT NULL));

-- Create trigger to notify admins of new orders
CREATE OR REPLACE FUNCTION notify_admin_new_order()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO admin_notifications (type, title, message, order_id)
  VALUES (
    'new_order',
    'New Order Received',
    'Order ' || NEW.order_number || ' has been placed by ' || NEW.full_name,
    NEW.id
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_notify_admin_new_order
AFTER INSERT ON orders
FOR EACH ROW
EXECUTE FUNCTION notify_admin_new_order();

-- Add index for better performance
CREATE INDEX idx_admin_notifications_created_at ON admin_notifications(created_at DESC);
CREATE INDEX idx_search_history_user_id ON search_history(user_id);
CREATE INDEX idx_product_images_is_thumbnail ON product_images(product_id, is_thumbnail);