-- Add ic_number field to profiles table
ALTER TABLE public.profiles ADD COLUMN ic_number TEXT;

-- Add ic_number field to orders table
ALTER TABLE public.orders ADD COLUMN ic_number TEXT NOT NULL DEFAULT '';