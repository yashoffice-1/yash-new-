
-- Update the asset_library table constraint to include 'ad' as a valid asset type
ALTER TABLE asset_library DROP CONSTRAINT IF EXISTS asset_library_asset_type_check;

ALTER TABLE asset_library ADD CONSTRAINT asset_library_asset_type_check 
CHECK (asset_type IN ('image', 'video', 'content', 'ad'));
