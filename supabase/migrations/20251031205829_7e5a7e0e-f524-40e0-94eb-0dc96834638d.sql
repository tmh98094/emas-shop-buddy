-- Add variant stock tracking system
CREATE TABLE IF NOT EXISTS variant_stock (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_combination JSONB NOT NULL,
  stock INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(product_id, variant_combination)
);

-- Enable RLS on variant_stock
ALTER TABLE variant_stock ENABLE ROW LEVEL SECURITY;

-- Anyone can view variant stock
CREATE POLICY "Anyone can view variant stock"
ON variant_stock FOR SELECT
USING (true);

-- Admins can manage variant stock
CREATE POLICY "Admins can manage variant stock"
ON variant_stock FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Function to calculate total product stock from variant stocks
CREATE OR REPLACE FUNCTION calculate_product_total_stock(p_product_id UUID)
RETURNS INTEGER AS $$
  SELECT COALESCE(SUM(stock), 0)::INTEGER
  FROM variant_stock
  WHERE product_id = p_product_id;
$$ LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public;

-- Trigger function to update products.stock whenever variant_stock changes
CREATE OR REPLACE FUNCTION sync_product_stock()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE products 
    SET stock = calculate_product_total_stock(OLD.product_id)
    WHERE id = OLD.product_id;
    RETURN OLD;
  ELSE
    UPDATE products 
    SET stock = calculate_product_total_stock(NEW.product_id)
    WHERE id = NEW.product_id;
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to sync stock
DROP TRIGGER IF EXISTS sync_stock_after_variant_change ON variant_stock;
CREATE TRIGGER sync_stock_after_variant_change
AFTER INSERT OR UPDATE OR DELETE ON variant_stock
FOR EACH ROW
EXECUTE FUNCTION sync_product_stock();

-- Add trigger to update variant_stock updated_at
DROP TRIGGER IF EXISTS update_variant_stock_updated_at ON variant_stock;
CREATE TRIGGER update_variant_stock_updated_at
BEFORE UPDATE ON variant_stock
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();