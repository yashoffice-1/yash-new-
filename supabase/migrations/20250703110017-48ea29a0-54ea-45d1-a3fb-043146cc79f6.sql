-- Add gif_url column to asset_library table for storing HeyGen GIF previews
ALTER TABLE public.asset_library 
ADD COLUMN gif_url TEXT;