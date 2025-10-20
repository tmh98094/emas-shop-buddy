-- Fix orders RLS policy to explicitly allow guest orders
DROP POLICY IF EXISTS "Anyone can create orders" ON orders;

CREATE POLICY "Anyone can create orders" 
ON orders 
FOR INSERT 
TO anon, authenticated
WITH CHECK (true);