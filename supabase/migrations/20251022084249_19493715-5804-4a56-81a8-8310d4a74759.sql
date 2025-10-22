-- Add review columns to order_items for post-purchase reviews
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS review_rating integer;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS review_text text;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS reviewed_at timestamp with time zone;

-- Create index for faster review queries
CREATE INDEX IF NOT EXISTS idx_order_items_reviewed ON order_items(reviewed_at) WHERE reviewed_at IS NOT NULL;