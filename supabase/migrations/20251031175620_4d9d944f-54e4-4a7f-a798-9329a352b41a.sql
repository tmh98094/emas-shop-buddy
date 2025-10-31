-- Add featured_on_homepage column to sub_categories
ALTER TABLE sub_categories 
ADD COLUMN IF NOT EXISTS featured_on_homepage BOOLEAN DEFAULT false;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_sub_categories_featured 
ON sub_categories(featured_on_homepage) 
WHERE featured_on_homepage = true;