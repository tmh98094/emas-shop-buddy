-- Add stripe_session_id column to orders table for reliable session tracking
ALTER TABLE orders ADD COLUMN IF NOT EXISTS stripe_session_id TEXT;