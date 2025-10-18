-- Create cart items table
CREATE TABLE IF NOT EXISTS public.cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  variant_id UUID REFERENCES public.product_variants(id) ON DELETE SET NULL,
  color_id UUID REFERENCES public.product_colors(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  CONSTRAINT cart_items_user_or_session CHECK (user_id IS NOT NULL OR session_id IS NOT NULL)
);

-- Enable RLS
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for cart items
CREATE POLICY "Users can view their own cart items"
  ON public.cart_items FOR SELECT
  USING (auth.uid() = user_id OR session_id = current_setting('app.session_id', true));

CREATE POLICY "Users can insert their own cart items"
  ON public.cart_items FOR INSERT
  WITH CHECK (auth.uid() = user_id OR session_id IS NOT NULL);

CREATE POLICY "Users can update their own cart items"
  ON public.cart_items FOR UPDATE
  USING (auth.uid() = user_id OR session_id = current_setting('app.session_id', true));

CREATE POLICY "Users can delete their own cart items"
  ON public.cart_items FOR DELETE
  USING (auth.uid() = user_id OR session_id = current_setting('app.session_id', true));

CREATE POLICY "Admins can manage all cart items"
  ON public.cart_items FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Add trigger for updated_at
CREATE TRIGGER update_cart_items_updated_at
  BEFORE UPDATE ON public.cart_items
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Add indexes
CREATE INDEX idx_cart_items_user_id ON public.cart_items(user_id);
CREATE INDEX idx_cart_items_session_id ON public.cart_items(session_id);
CREATE INDEX idx_cart_items_product_id ON public.cart_items(product_id);