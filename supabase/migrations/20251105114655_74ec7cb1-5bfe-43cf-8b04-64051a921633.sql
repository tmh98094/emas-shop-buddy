-- Create error_logs table for production error tracking
CREATE TABLE IF NOT EXISTS public.error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  error_message TEXT NOT NULL,
  stack_trace TEXT,
  route TEXT,
  user_agent TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_error_logs_created_at ON public.error_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_user_id ON public.error_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_error_logs_route ON public.error_logs(route);

-- Enable RLS
ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view error logs
CREATE POLICY "Admins can view all error logs"
  ON public.error_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- Allow inserting error logs (for error tracking)
CREATE POLICY "Anyone can insert error logs"
  ON public.error_logs
  FOR INSERT
  WITH CHECK (true);

COMMENT ON TABLE public.error_logs IS 'Production error tracking for debugging white screen issues';
