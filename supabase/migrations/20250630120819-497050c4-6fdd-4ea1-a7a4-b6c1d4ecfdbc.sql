
-- Create a storage bucket for generated assets
INSERT INTO storage.buckets (id, name, public)
VALUES ('generated-assets', 'generated-assets', true);

-- Create RLS policies for the generated-assets bucket
CREATE POLICY "Anyone can view generated assets" 
  ON storage.objects 
  FOR SELECT 
  USING (bucket_id = 'generated-assets');

CREATE POLICY "Anyone can upload generated assets" 
  ON storage.objects 
  FOR INSERT 
  WITH CHECK (bucket_id = 'generated-assets');

CREATE POLICY "Anyone can update generated assets" 
  ON storage.objects 
  FOR UPDATE 
  USING (bucket_id = 'generated-assets');

CREATE POLICY "Anyone can delete generated assets" 
  ON storage.objects 
  FOR DELETE 
  USING (bucket_id = 'generated-assets');
