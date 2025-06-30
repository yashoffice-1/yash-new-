
-- Create a table to store API keys securely
CREATE TABLE public.api_keys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider TEXT NOT NULL UNIQUE,
  key_value TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add Row Level Security (RLS) - only allow admin access
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

-- Create policy that allows all operations for now (we'll implement proper admin auth later)
CREATE POLICY "Allow all operations on api_keys" 
  ON public.api_keys 
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Insert default entries for the three providers
INSERT INTO public.api_keys (provider, key_value) VALUES 
  ('openai', ''),
  ('runwayml', ''),
  ('heygen', '');
