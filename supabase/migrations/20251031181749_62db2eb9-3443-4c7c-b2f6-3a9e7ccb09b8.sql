-- Add weight_adjustment column to product_variants table
ALTER TABLE product_variants 
ADD COLUMN IF NOT EXISTS weight_adjustment NUMERIC;

-- Add comment explaining the column
COMMENT ON COLUMN product_variants.weight_adjustment IS 
'Optional weight adjustment in grams. If specified, this weight is used instead of the product default weight for price calculation.';