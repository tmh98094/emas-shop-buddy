-- Fix RLS policy to allow guests to view their orders by phone number
DROP POLICY IF EXISTS "Users can view their own orders" ON orders;

CREATE POLICY "Users can view their own orders" ON orders
FOR SELECT
USING (
  auth.uid() = user_id 
  OR has_role(auth.uid(), 'admin'::app_role)
  OR (user_id IS NULL AND phone_number IS NOT NULL)
);

-- Similar fix for order_items
DROP POLICY IF EXISTS "Users can view their order items" ON order_items;

CREATE POLICY "Users can view their order items" ON order_items
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = order_items.order_id
    AND (
      orders.user_id = auth.uid() 
      OR has_role(auth.uid(), 'admin'::app_role)
      OR (orders.user_id IS NULL AND orders.phone_number IS NOT NULL)
    )
  )
);

-- Fix touch_n_go_payments policy similarly
DROP POLICY IF EXISTS "Users can view their touch n go payments" ON touch_n_go_payments;

CREATE POLICY "Users can view their touch n go payments" ON touch_n_go_payments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = touch_n_go_payments.order_id
    AND (
      orders.user_id = auth.uid() 
      OR has_role(auth.uid(), 'admin'::app_role)
      OR (orders.user_id IS NULL AND orders.phone_number IS NOT NULL)
    )
  )
);