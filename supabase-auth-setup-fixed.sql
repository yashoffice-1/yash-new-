-- Supabase Authentication Setup (FIXED VERSION)
-- Run this AFTER Prisma migrations to set up auth-specific features

-- 1. Enable Row Level Security on all tables
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generated_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_media_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_media_cached_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 2. Create RLS policies for inventory
CREATE POLICY "Verified users can manage own inventory" ON public.inventory
  FOR ALL USING (
    auth.uid()::text = user_id::text AND 
    is_active = true AND 
    deleted_at IS NULL
  );

-- 3. Create RLS policies for generated_assets
CREATE POLICY "Verified users can manage own generated assets" ON public.generated_assets
  FOR ALL USING (
    auth.uid()::text = user_id::text AND 
    is_active = true AND 
    deleted_at IS NULL
  );

-- 4. Create RLS policies for asset_library
CREATE POLICY "Verified users can manage own asset library" ON public.asset_library
  FOR ALL USING (
    auth.uid()::text = user_id::text AND 
    is_active = true AND 
    deleted_at IS NULL
  );

-- 5. Create RLS policies for social_media_connections
CREATE POLICY "Verified users can manage own social connections" ON public.social_media_connections
  FOR ALL USING (
    auth.uid()::text = profile_id::text AND 
    is_active = true
  );

-- 6. Create RLS policies for social_media_cached_data
CREATE POLICY "Verified users can manage own cached data" ON public.social_media_cached_data
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.social_media_connections 
      WHERE id = connection_id AND profile_id::text = auth.uid()::text
    )
  );

-- 7. Create RLS policies for profiles
CREATE POLICY "Verified users can manage own profile" ON public.profiles
  FOR ALL USING (
    auth.uid()::text = id::text AND 
    is_active = true AND 
    deleted_at IS NULL
  );

-- 8. Create function to handle user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name, display_name, initials, password)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'display_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'initials', ''),
    '' -- Empty password since Supabase handles auth
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Create trigger for new user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 10. Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 11. Create trigger for updated_at on profiles
DROP TRIGGER IF EXISTS handle_profiles_updated_at ON public.profiles;
CREATE TRIGGER handle_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 12. Update existing records to have default values
UPDATE public.inventory SET is_active = true WHERE is_active IS NULL;
UPDATE public.generated_assets SET is_active = true WHERE is_active IS NULL;
UPDATE public.asset_library SET is_active = true WHERE is_active IS NULL;
UPDATE public.profiles SET is_active = true WHERE is_active IS NULL;

-- 13. Create indexes for performance
CREATE INDEX IF NOT EXISTS inventory_user_id_idx ON public.inventory(user_id);
CREATE INDEX IF NOT EXISTS inventory_is_active_idx ON public.inventory(is_active);
CREATE INDEX IF NOT EXISTS generated_assets_user_id_idx ON public.generated_assets(user_id);
CREATE INDEX IF NOT EXISTS generated_assets_is_active_idx ON public.generated_assets(is_active);
CREATE INDEX IF NOT EXISTS asset_library_user_id_idx ON public.asset_library(user_id);
CREATE INDEX IF NOT EXISTS asset_library_is_active_idx ON public.asset_library(is_active);
CREATE INDEX IF NOT EXISTS profiles_is_active_idx ON public.profiles(is_active); 