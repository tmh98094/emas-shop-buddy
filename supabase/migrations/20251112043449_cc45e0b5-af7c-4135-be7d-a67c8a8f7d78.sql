-- Create visitor analytics table for bot-filtered tracking
CREATE TABLE IF NOT EXISTS public.visitor_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text UNIQUE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  first_visit timestamp with time zone NOT NULL DEFAULT now(),
  last_visit timestamp with time zone NOT NULL DEFAULT now(),
  page_views integer NOT NULL DEFAULT 1,
  pages_visited jsonb NOT NULL DEFAULT '[]'::jsonb,
  referrer text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  device_type text,
  browser text,
  country text,
  is_bot boolean NOT NULL DEFAULT false,
  session_duration integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.visitor_analytics ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert analytics (we'll filter bots client-side)
CREATE POLICY "Anyone can insert visitor analytics"
ON public.visitor_analytics
FOR INSERT
WITH CHECK (true);

-- Allow updates for session tracking
CREATE POLICY "Anyone can update their session"
ON public.visitor_analytics
FOR UPDATE
USING (true);

-- Admins can view all analytics
CREATE POLICY "Admins can view all analytics"
ON public.visitor_analytics
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create index for performance
CREATE INDEX idx_visitor_analytics_session_id ON public.visitor_analytics(session_id);
CREATE INDEX idx_visitor_analytics_first_visit ON public.visitor_analytics(first_visit);
CREATE INDEX idx_visitor_analytics_is_bot ON public.visitor_analytics(is_bot);
CREATE INDEX idx_visitor_analytics_user_id ON public.visitor_analytics(user_id);