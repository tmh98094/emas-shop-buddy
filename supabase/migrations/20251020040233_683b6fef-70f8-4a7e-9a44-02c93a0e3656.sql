-- Add low stock threshold to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS low_stock_threshold integer DEFAULT 10;

-- Create product reviews table
CREATE TABLE IF NOT EXISTS product_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  is_approved boolean DEFAULT true,
  UNIQUE(user_id, product_id)
);

-- Enable RLS on product_reviews
ALTER TABLE product_reviews ENABLE ROW LEVEL SECURITY;

-- RLS policies for product_reviews
CREATE POLICY "Anyone can view approved reviews"
  ON product_reviews FOR SELECT
  USING (is_approved = true OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can create reviews"
  ON product_reviews FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reviews"
  ON product_reviews FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all reviews"
  ON product_reviews FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- Create stock notifications table
CREATE TABLE IF NOT EXISTS stock_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  phone text,
  notified boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  notified_at timestamp with time zone
);

-- Enable RLS on stock_notifications
ALTER TABLE stock_notifications ENABLE ROW LEVEL SECURITY;

-- RLS policies for stock_notifications
CREATE POLICY "Users can view their own notifications"
  ON stock_notifications FOR SELECT
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can create stock notifications"
  ON stock_notifications FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can manage notifications"
  ON stock_notifications FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- Create admin logs table for audit trail
CREATE TABLE IF NOT EXISTS admin_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action text NOT NULL,
  table_name text NOT NULL,
  record_id uuid,
  old_data jsonb,
  new_data jsonb,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on admin_logs
ALTER TABLE admin_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for admin_logs
CREATE POLICY "Admins can view logs"
  ON admin_logs FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can create logs"
  ON admin_logs FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Insert shipping zones into settings if not exists
INSERT INTO settings (key, value, updated_by)
VALUES (
  'shipping_zones',
  '{"zones": [
    {"name": "West Malaysia", "code": "WM", "cost": 10},
    {"name": "East Malaysia", "code": "EM", "cost": 15},
    {"name": "Singapore", "code": "SG", "cost": 40}
  ]}'::jsonb,
  (SELECT id FROM auth.users LIMIT 1)
)
ON CONFLICT (key) DO NOTHING;

-- Add trigger for updated_at on product_reviews
CREATE TRIGGER update_product_reviews_updated_at
  BEFORE UPDATE ON product_reviews
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();