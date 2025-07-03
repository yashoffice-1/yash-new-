-- Update the asset library to replace 'processing' with actual HeyGen video URLs for the specific videos
-- This will fix the immediate display issue

UPDATE public.asset_library 
SET 
  asset_url = 'https://resource2.heygen.ai/video/9ba3458c79d841948fbffe7f4ce5e1b2.mp4',
  gif_url = 'https://resource2.heygen.ai/gif/9ba3458c79d841948fbffe7f4ce5e1b2.gif'
WHERE 
  source_system = 'heygen' 
  AND asset_url = 'processing' 
  AND title LIKE '%Xhorse XP-005L Dolphin II Key%';