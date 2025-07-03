-- Update existing external video URLs to show failed status
UPDATE asset_library 
SET asset_url = 'failed' 
WHERE asset_url LIKE 'https://dnznrvs05pmza.cloudfront.net%' 
  AND asset_type = 'video';