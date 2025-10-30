-- Ensure unique phone numbers in profiles
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_phone_unique ON public.profiles (phone_number);
