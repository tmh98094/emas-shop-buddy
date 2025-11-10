-- Update existing touch_n_go orders to stripe_fpx
UPDATE orders 
SET payment_method = 'stripe_fpx' 
WHERE payment_method = 'touch_n_go';

-- Recreate payment_method enum without touch_n_go
ALTER TABLE orders ALTER COLUMN payment_method TYPE text;
DROP TYPE IF EXISTS payment_method CASCADE;
CREATE TYPE payment_method AS ENUM ('stripe_fpx');
ALTER TABLE orders ALTER COLUMN payment_method TYPE payment_method USING payment_method::text::payment_method;

-- Add comment to touch_n_go_payments table
COMMENT ON TABLE touch_n_go_payments IS 'DEPRECATED - Historical data only, no longer used';