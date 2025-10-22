-- Fix admin access to profiles table for customer management
-- Admin should be able to view all profiles for customer management

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;

-- Create new admin policy for viewing profiles
CREATE POLICY "Admins can view all profiles" 
ON profiles 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));