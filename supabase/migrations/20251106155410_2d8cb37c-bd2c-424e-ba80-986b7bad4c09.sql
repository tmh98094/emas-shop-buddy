-- Add cached Chinese translation columns to products
ALTER TABLE products 
ADD COLUMN name_zh TEXT,
ADD COLUMN description_zh TEXT;

-- Add cached Chinese translation columns to categories
ALTER TABLE categories 
ADD COLUMN name_zh TEXT,
ADD COLUMN description_zh TEXT;

-- Add cached Chinese translation columns to sub_categories
ALTER TABLE sub_categories 
ADD COLUMN name_zh TEXT,
ADD COLUMN description_zh TEXT;

-- Create index for faster lookups
CREATE INDEX idx_products_name_zh ON products(name_zh) WHERE name_zh IS NOT NULL;
CREATE INDEX idx_categories_name_zh ON categories(name_zh) WHERE name_zh IS NOT NULL;
CREATE INDEX idx_sub_categories_name_zh ON sub_categories(name_zh) WHERE name_zh IS NOT NULL;

-- Add email verification fields to profiles
ALTER TABLE profiles
ADD COLUMN email_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN email_verification_token TEXT,
ADD COLUMN email_verification_sent_at TIMESTAMP WITH TIME ZONE;

-- Create index for email verification lookups
CREATE INDEX idx_profiles_email_verification ON profiles(email_verification_token) WHERE email_verification_token IS NOT NULL;