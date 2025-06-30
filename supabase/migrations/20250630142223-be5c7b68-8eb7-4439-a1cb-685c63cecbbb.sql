
-- Create the storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('generated-assets', 'generated-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Ensure proper RLS policies for the generated-assets bucket
DROP POLICY IF EXISTS "Anyone can view generated assets" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload generated assets" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can update generated assets" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete generated assets" ON storage.objects;

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
