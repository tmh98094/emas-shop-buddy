-- Add blur_placeholder column to product_images for faster loading
ALTER TABLE product_images 
ADD COLUMN blur_placeholder TEXT;