-- Create content management table for all editable text content
CREATE TABLE IF NOT EXISTS public.content_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.content_pages ENABLE ROW LEVEL SECURITY;

-- Anyone can view content
CREATE POLICY "Anyone can view content pages"
ON public.content_pages
FOR SELECT
USING (true);

-- Only admins can manage content
CREATE POLICY "Admins can manage content pages"
ON public.content_pages
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Insert default content pages
INSERT INTO public.content_pages (key, title, content) VALUES
('privacy_policy', 'Privacy Policy', '<h2>1. Information We Collect</h2><p>We collect information that you provide directly to us, including:</p><ul><li>Name, email address, phone number</li><li>Shipping and billing addresses</li><li>Payment information (processed securely by our payment partners)</li><li>Order history and preferences</li><li>Communications with our customer service team</li></ul>'),
('terms_of_service', 'Terms of Service', '<h2>1. Agreement to Terms</h2><p>By accessing and using this website, you accept and agree to be bound by the terms and provision of this agreement.</p>'),
('shipping_policy', 'Shipping Policy', '<h2>Shipping Rates & Delivery Times</h2><p><strong>West Malaysia:</strong> RM 10 (3-5 business days)</p><p><strong>East Malaysia:</strong> RM 20 (5-7 business days)</p><p><strong>Singapore:</strong> RM 25 (5-7 business days)</p><p>Free shipping on orders above RM 500</p>'),
('return_policy', 'Return Policy', '<h2>Return Period</h2><p>You may return most new, unopened items within 14 days of delivery for a full refund.</p>'),
('faq', 'Frequently Asked Questions', '<h2>Orders</h2><p><strong>How do I place an order?</strong></p><p>Browse our products, add items to cart, and proceed to checkout.</p>'),
('order_confirmation_message', 'Order Confirmation Message', '<p>Thank you for your order! We will process it shortly and send you updates via WhatsApp and email.</p>')
ON CONFLICT (key) DO NOTHING;

-- Add trigger for updated_at
CREATE TRIGGER update_content_pages_updated_at
BEFORE UPDATE ON public.content_pages
FOR EACH ROW
EXECUTE FUNCTION handle_updated_at();