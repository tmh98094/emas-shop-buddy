-- Create sequence for order numbers
CREATE SEQUENCE IF NOT EXISTS order_number_seq START 1;

-- Add Touch N Go QR code setting
INSERT INTO settings (key, value) 
VALUES ('touch_n_go_qr', '{"qr_code_url": ""}')
ON CONFLICT (key) DO NOTHING;

-- Update order number generation function to use JJ-00001 format
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.order_number IS NULL OR NEW.order_number = '' THEN
    NEW.order_number := 'JJ-' || LPAD(NEXTVAL('order_number_seq')::TEXT, 5, '0');
  END IF;
  RETURN NEW;
END;
$$;

-- Add more categories (adding 3 more to existing ones)
INSERT INTO categories (name, slug, description, display_order) VALUES
('Bracelets', 'bracelets', 'Elegant gold bracelets', 4),
('Earrings', 'earrings', 'Beautiful gold earrings', 5),
('Chains', 'chains', 'Premium gold chains', 6)
ON CONFLICT (slug) DO NOTHING;

-- Add sub-categories for each category (only if they don't exist)
DO $$
DECLARE
  cat_id uuid;
  cat_name text;
  sub_cat_exists boolean;
BEGIN
  FOR cat_id, cat_name IN 
    SELECT id, name FROM categories
  LOOP
    -- Check if sub-categories already exist for this category
    SELECT EXISTS(
      SELECT 1 FROM sub_categories 
      WHERE category_id = cat_id 
      AND name LIKE cat_name || ' - %'
    ) INTO sub_cat_exists;
    
    -- Only insert if they don't exist
    IF NOT sub_cat_exists THEN
      INSERT INTO sub_categories (category_id, name, slug, display_order)
      VALUES 
        (cat_id, cat_name || ' - Classic', LOWER(REPLACE(cat_name, ' ', '-')) || '-classic', 1),
        (cat_id, cat_name || ' - Modern', LOWER(REPLACE(cat_name, ' ', '-')) || '-modern', 2);
    END IF;
  END LOOP;
END $$;

-- Add 30 sample products
DO $$
DECLARE
  cat_ids uuid[];
  i integer;
  cat_id uuid;
  sub_cat_id uuid;
  gold_types text[] := ARRAY['916', '999'];
  gold_type text;
  product_names text[] := ARRAY[
    'Classic Band', 'Diamond Accent', 'Twisted Design', 'Smooth Polish',
    'Textured Finish', 'Engraved Pattern', 'Minimalist Style', 'Bold Statement',
    'Delicate Chain', 'Vintage Look', 'Contemporary Art', 'Traditional Design',
    'Floral Motif', 'Geometric Shape', 'Elegant Curve', 'Simple Beauty',
    'Intricate Detail', 'Timeless Classic', 'Modern Twist', 'Luxe Gold',
    'Refined Style', 'Graceful Design', 'Stunning Piece', 'Premium Quality',
    'Exquisite Craft', 'Brilliant Shine', 'Perfect Gift', 'Special Edition',
    'Limited Collection', 'Exclusive Design'
  ];
BEGIN
  -- Get all category IDs
  SELECT ARRAY_AGG(id) INTO cat_ids FROM categories;

  -- Insert 30 products
  FOR i IN 1..30 LOOP
    -- Random category
    cat_id := cat_ids[1 + (random() * (array_length(cat_ids, 1) - 1))::int];
    
    -- Get a random sub-category for this category
    SELECT id INTO sub_cat_id 
    FROM sub_categories 
    WHERE category_id = cat_id 
    ORDER BY random() 
    LIMIT 1;
    
    -- Random gold type
    gold_type := gold_types[1 + (random())::int];
    
    INSERT INTO products (
      name, 
      slug, 
      description, 
      gold_type, 
      weight_grams, 
      labour_fee, 
      stock, 
      category_id, 
      sub_category_id,
      is_featured,
      is_best_seller,
      is_new_arrival
    ) VALUES (
      product_names[i],
      'product-' || i || '-' || SUBSTRING(gen_random_uuid()::TEXT, 1, 8),
      'Premium quality gold jewelry crafted with precision and care. Perfect for any occasion.',
      gold_type::gold_type,
      (1 + random() * 10)::numeric(10,2),
      (50 + random() * 200)::numeric(10,2),
      (5 + (random() * 20)::int),
      cat_id,
      sub_cat_id,
      random() < 0.3,
      random() < 0.3,
      random() < 0.3
    );
  END LOOP;
END $$;