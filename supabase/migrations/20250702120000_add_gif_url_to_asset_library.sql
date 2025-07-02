
-- Add gif_url column to asset_library table for storing HeyGen GIF URLs
ALTER TABLE public.asset_library 
ADD COLUMN gif_url TEXT;

-- Add comment to document the new column
COMMENT ON COLUMN public.asset_library.gif_url IS 'URL to GIF version of video assets from HeyGen API';
