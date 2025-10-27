-- Create OTP verifications table
CREATE TABLE public.otp_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number text NOT NULL,
  otp_code text NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  verified boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  verified_at timestamp with time zone,
  attempts integer DEFAULT 0
);

-- Enable RLS
ALTER TABLE public.otp_verifications ENABLE ROW LEVEL SECURITY;

-- Policies: Allow public access for OTP operations (pre-authentication)
CREATE POLICY "Anyone can create OTP" ON public.otp_verifications
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can verify OTP" ON public.otp_verifications
  FOR UPDATE USING (true);

CREATE POLICY "Anyone can view OTP for verification" ON public.otp_verifications
  FOR SELECT USING (true);

-- Indexes for performance
CREATE INDEX idx_otp_phone_number ON public.otp_verifications(phone_number);
CREATE INDEX idx_otp_expires_at ON public.otp_verifications(expires_at);

-- Function to clean up old OTPs (optional, for maintenance)
CREATE OR REPLACE FUNCTION public.cleanup_expired_otps()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  DELETE FROM public.otp_verifications
  WHERE expires_at < NOW() - INTERVAL '1 hour';
END;
$$;