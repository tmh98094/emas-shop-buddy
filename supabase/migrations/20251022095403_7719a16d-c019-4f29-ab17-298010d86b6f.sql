-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can upload receipts" ON storage.objects;
DROP POLICY IF EXISTS "Admins can view all receipts" ON storage.objects;

-- Create new policies for payment-receipts bucket
CREATE POLICY "Anyone can upload receipts"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'payment-receipts');

CREATE POLICY "Admins can view all receipts"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'payment-receipts');