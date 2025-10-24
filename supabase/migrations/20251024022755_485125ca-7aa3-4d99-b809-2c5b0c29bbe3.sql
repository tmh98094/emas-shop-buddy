-- Fix admin_notifications RLS policy to prevent spam
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Anyone can create notifications" ON admin_notifications;

-- Create restricted INSERT policy that only allows system triggers and admins
CREATE POLICY "Only system and admins can create notifications"
ON admin_notifications FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  auth.uid() IS NULL  -- Allow NULL for SECURITY DEFINER trigger context
);