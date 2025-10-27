-- Fix OTP verifications table RLS policies
-- Remove the overly permissive public SELECT policy that exposes all OTP codes

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can view OTP for verification" ON public.otp_verifications;
DROP POLICY IF EXISTS "Anyone can verify OTP" ON public.otp_verifications;

-- Keep the INSERT policy so users can request OTPs
-- (Policy "Anyone can create OTP" remains unchanged)

-- Add a restricted UPDATE policy for system use only
-- Only the service role (used by edge functions) can update OTPs
CREATE POLICY "Only service role can update OTP"
ON public.otp_verifications
FOR UPDATE
TO service_role
USING (true);

-- Note: No SELECT policy means only service_role can read OTPs
-- This prevents attackers from enumerating OTP codes via client queries