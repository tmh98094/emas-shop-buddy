-- Add image_url to sub_categories
ALTER TABLE sub_categories ADD COLUMN IF NOT EXISTS image_url text;

-- Auto-generate slugs for categories
CREATE OR REPLACE FUNCTION generate_category_slug()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := LOWER(REGEXP_REPLACE(NEW.name, '[^a-zA-Z0-9]+', '-', 'g'));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER category_slug_trigger
BEFORE INSERT OR UPDATE ON categories
FOR EACH ROW
EXECUTE FUNCTION generate_category_slug();

-- Auto-generate slugs for sub_categories
CREATE OR REPLACE FUNCTION generate_sub_category_slug()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := LOWER(REGEXP_REPLACE(NEW.name, '[^a-zA-Z0-9]+', '-', 'g'));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER sub_category_slug_trigger
BEFORE INSERT OR UPDATE ON sub_categories
FOR EACH ROW
EXECUTE FUNCTION generate_sub_category_slug();