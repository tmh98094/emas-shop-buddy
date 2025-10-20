-- Update RLS policies for cart_items to work with guest sessions
DROP POLICY IF EXISTS "Users can view their own cart items" ON cart_items;
DROP POLICY IF EXISTS "Users can insert their own cart items" ON cart_items;
DROP POLICY IF EXISTS "Users can update their own cart items" ON cart_items;
DROP POLICY IF EXISTS "Users can delete their own cart items" ON cart_items;

-- Recreate policies with proper session_id support
CREATE POLICY "Users can view their own cart items"
ON cart_items FOR SELECT
USING (
  (auth.uid() = user_id) OR 
  (user_id IS NULL AND session_id IS NOT NULL)
);

CREATE POLICY "Users can insert their own cart items"
ON cart_items FOR INSERT
WITH CHECK (
  (auth.uid() = user_id) OR 
  (user_id IS NULL AND session_id IS NOT NULL)
);

CREATE POLICY "Users can update their own cart items"
ON cart_items FOR UPDATE
USING (
  (auth.uid() = user_id) OR 
  (user_id IS NULL AND session_id IS NOT NULL)
);

CREATE POLICY "Users can delete their own cart items"
ON cart_items FOR DELETE
USING (
  (auth.uid() = user_id) OR 
  (user_id IS NULL AND session_id IS NOT NULL)
);