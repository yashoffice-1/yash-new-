-- Migration: Update existing tables for Supabase authentication
-- This script adds user_id foreign keys and soft delete fields to all tables

-- 1. Add user_id and soft delete fields to inventory table
ALTER TABLE public.inventory 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

-- 2. Add user_id and soft delete fields to generated_assets table
ALTER TABLE public.generated_assets 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

-- 3. Add user_id and soft delete fields to asset_library table
ALTER TABLE public.asset_library 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

-- 4. Update social_media_connections to reference profiles table
-- (This table already has profile_id, so we just need to ensure it references the new profiles table)

-- 5. Create indexes for performance
CREATE INDEX IF NOT EXISTS inventory_user_id_idx ON public.inventory(user_id);
CREATE INDEX IF NOT EXISTS inventory_is_active_idx ON public.inventory(is_active);
CREATE INDEX IF NOT EXISTS generated_assets_user_id_idx ON public.generated_assets(user_id);
CREATE INDEX IF NOT EXISTS generated_assets_is_active_idx ON public.generated_assets(is_active);
CREATE INDEX IF NOT EXISTS asset_library_user_id_idx ON public.asset_library(user_id);
CREATE INDEX IF NOT EXISTS asset_library_is_active_idx ON public.asset_library(is_active);

-- 6. Enable Row Level Security on all tables
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generated_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_media_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_media_cached_data ENABLE ROW LEVEL SECURITY;

-- 7. Create RLS policies for inventory
CREATE POLICY "Verified users can manage own inventory" ON public.inventory
  FOR ALL USING (
    auth.uid() = user_id AND 
    is_active = true AND 
    deleted_at IS NULL
  );

-- 8. Create RLS policies for generated_assets
CREATE POLICY "Verified users can manage own generated assets" ON public.generated_assets
  FOR ALL USING (
    auth.uid() = user_id AND 
    is_active = true AND 
    deleted_at IS NULL
  );

-- 9. Create RLS policies for asset_library
CREATE POLICY "Verified users can manage own asset library" ON public.asset_library
  FOR ALL USING (
    auth.uid() = user_id AND 
    is_active = true AND 
    deleted_at IS NULL
  );

-- 10. Create RLS policies for social_media_connections
CREATE POLICY "Verified users can manage own social connections" ON public.social_media_connections
  FOR ALL USING (
    auth.uid() = profile_id AND 
    is_active = true
  );

-- 11. Create RLS policies for social_media_cached_data
CREATE POLICY "Verified users can manage own cached data" ON public.social_media_cached_data
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.social_media_connections 
      WHERE id = connection_id AND profile_id = auth.uid()
    )
  );

-- 12. Create function to handle soft deletes
CREATE OR REPLACE FUNCTION public.soft_delete_record()
RETURNS TRIGGER AS $$
BEGIN
  NEW.is_active = false;
  NEW.deleted_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 13. Create triggers for soft delete (optional - you can handle this in application code)
-- DROP TRIGGER IF EXISTS soft_delete_inventory ON public.inventory;
-- CREATE TRIGGER soft_delete_inventory
--   BEFORE DELETE ON public.inventory
--   FOR EACH ROW EXECUTE FUNCTION public.soft_delete_record();

-- DROP TRIGGER IF EXISTS soft_delete_generated_assets ON public.generated_assets;
-- CREATE TRIGGER soft_delete_generated_assets
--   BEFORE DELETE ON public.generated_assets
--   FOR EACH ROW EXECUTE FUNCTION public.soft_delete_record();

-- DROP TRIGGER IF EXISTS soft_delete_asset_library ON public.asset_library;
-- CREATE TRIGGER soft_delete_asset_library
--   BEFORE DELETE ON public.asset_library
--   FOR EACH ROW EXECUTE FUNCTION public.soft_delete_record();

-- 14. Update existing records to have default values (if any exist)
UPDATE public.inventory SET is_active = true WHERE is_active IS NULL;
UPDATE public.generated_assets SET is_active = true WHERE is_active IS NULL;
UPDATE public.asset_library SET is_active = true WHERE is_active IS NULL;

-- 15. Make user_id NOT NULL after setting default values (optional - only if you want to enforce this)
-- ALTER TABLE public.inventory ALTER COLUMN user_id SET NOT NULL;
-- ALTER TABLE public.generated_assets ALTER COLUMN user_id SET NOT NULL;
-- ALTER TABLE public.asset_library ALTER COLUMN user_id SET NOT NULL; 