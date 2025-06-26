
-- Create a library table to store saved assets with additional metadata
CREATE TABLE public.asset_library (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  tags TEXT[], -- Array of tags for categorization
  asset_type TEXT NOT NULL CHECK (asset_type IN ('image', 'video', 'content')),
  asset_url TEXT NOT NULL,
  content TEXT, -- For content-type assets
  instruction TEXT NOT NULL,
  source_system TEXT NOT NULL CHECK (source_system IN ('runway', 'heygen', 'openai')),
  original_asset_id UUID REFERENCES public.generated_assets(id),
  favorited BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add Row Level Security
ALTER TABLE public.asset_library ENABLE ROW LEVEL SECURITY;

-- Create policies for asset_library (making it public for now, but you can add user-based policies later)
CREATE POLICY "Anyone can view library assets" 
  ON public.asset_library 
  FOR SELECT 
  USING (true);

CREATE POLICY "Anyone can create library assets" 
  ON public.asset_library 
  FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Anyone can update library assets" 
  ON public.asset_library 
  FOR UPDATE 
  USING (true);

CREATE POLICY "Anyone can delete library assets" 
  ON public.asset_library 
  FOR DELETE 
  USING (true);

-- Create indexes for better performance
CREATE INDEX idx_asset_library_asset_type ON public.asset_library(asset_type);
CREATE INDEX idx_asset_library_tags ON public.asset_library USING GIN(tags);
CREATE INDEX idx_asset_library_favorited ON public.asset_library(favorited);
CREATE INDEX idx_asset_library_created_at ON public.asset_library(created_at DESC);
