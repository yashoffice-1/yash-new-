
-- Create table to store generated assets
CREATE TABLE public.generated_assets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  inventory_id TEXT, 
  channel TEXT NOT NULL CHECK (channel IN ('youtube', 'facebook', 'instagram', 'tiktok')),
  format TEXT NOT NULL,
  source_system TEXT NOT NULL CHECK (source_system IN ('openai', 'runway', 'heygen')),
  asset_type TEXT NOT NULL CHECK (asset_type IN ('image', 'video')),
  url TEXT NOT NULL,
  instruction TEXT,
  approved BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add Row Level Security
ALTER TABLE public.generated_assets ENABLE ROW LEVEL SECURITY;

-- Create policies for generated_assets
CREATE POLICY "Anyone can view generated assets" 
  ON public.generated_assets 
  FOR SELECT 
  USING (true);

CREATE POLICY "Anyone can create generated assets" 
  ON public.generated_assets 
  FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Anyone can update generated assets" 
  ON public.generated_assets 
  FOR UPDATE 
  USING (true);

-- Create index for better performance
CREATE INDEX idx_generated_assets_channel ON public.generated_assets(channel);
CREATE INDEX idx_generated_assets_source_system ON public.generated_assets(source_system);
CREATE INDEX idx_generated_assets_created_at ON public.generated_assets(created_at DESC);
