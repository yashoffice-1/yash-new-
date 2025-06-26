
-- Create inventory table to store products
CREATE TABLE public.inventory (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2),
  sku TEXT UNIQUE,
  category TEXT,
  brand TEXT,
  images TEXT[] NOT NULL DEFAULT '{}', -- Array of image URLs
  metadata JSONB DEFAULT '{}', -- Additional product data
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'draft')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for better search performance
CREATE INDEX idx_inventory_name ON public.inventory USING gin(to_tsvector('english', name));
CREATE INDEX idx_inventory_category ON public.inventory(category);
CREATE INDEX idx_inventory_status ON public.inventory(status);
CREATE INDEX idx_inventory_sku ON public.inventory(sku);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_inventory_updated_at 
    BEFORE UPDATE ON public.inventory
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add Row Level Security (RLS) - for now allowing all operations for simplicity
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;

-- Create policies that allow all operations (you can restrict this later based on user roles)
CREATE POLICY "Allow all operations on inventory" 
  ON public.inventory 
  FOR ALL 
  USING (true) 
  WITH CHECK (true);
