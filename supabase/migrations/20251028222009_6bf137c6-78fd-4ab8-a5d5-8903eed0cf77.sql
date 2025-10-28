-- Create update_updated_at_column function if it doesn't exist
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Fix stock deduction to prevent negative stock
CREATE OR REPLACE FUNCTION public.deduct_stock_on_order()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_stock INT;
BEGIN
  -- Check current stock
  SELECT stock INTO current_stock
  FROM products
  WHERE id = NEW.product_id;
  
  -- Prevent stock from going negative
  IF current_stock < NEW.quantity THEN
    RAISE EXCEPTION 'Insufficient stock for product. Available: %, Requested: %', current_stock, NEW.quantity;
  END IF;
  
  -- Deduct stock
  UPDATE products
  SET stock = stock - NEW.quantity
  WHERE id = NEW.product_id;
  
  RETURN NEW;
END;
$$;

-- Add pre-order functionality
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_preorder BOOLEAN DEFAULT FALSE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS preorder_deposit DECIMAL(10,2) DEFAULT 100.00;

-- Create pre_orders table to track pre-order status
CREATE TABLE IF NOT EXISTS pre_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  deposit_paid DECIMAL(10,2) NOT NULL,
  balance_due DECIMAL(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  ready_at TIMESTAMPTZ,
  final_payment_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on pre_orders
ALTER TABLE pre_orders ENABLE ROW LEVEL SECURITY;

-- RLS policies for pre_orders
CREATE POLICY "Users can view their own pre-orders"
  ON pre_orders FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = pre_orders.order_id
      AND (orders.user_id = auth.uid() OR has_role(auth.uid(), 'admin'))
    )
  );

CREATE POLICY "Admins can manage pre-orders"
  ON pre_orders FOR ALL
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "System can create pre-orders"
  ON pre_orders FOR INSERT
  WITH CHECK (true);

-- Add updated_at trigger for pre_orders
DROP TRIGGER IF EXISTS update_pre_orders_updated_at ON pre_orders;
CREATE TRIGGER update_pre_orders_updated_at
  BEFORE UPDATE ON pre_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();