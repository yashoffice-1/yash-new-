-- Supabase Authentication Rollback Script
-- Run this to undo all Supabase auth changes

-- 1. Drop all RLS policies
DROP POLICY IF EXISTS "Verified users can manage own inventory" ON public.inventory;
DROP POLICY IF EXISTS "Verified users can manage own generated assets" ON public.generated_assets;
DROP POLICY IF EXISTS "Verified users can manage own asset library" ON public.asset_library;
DROP POLICY IF EXISTS "Verified users can manage own social connections" ON public.social_media_connections;
DROP POLICY IF EXISTS "Verified users can manage own cached data" ON public.social_media_cached_data;
DROP POLICY IF EXISTS "Verified users can manage own profile" ON public.profiles;

-- 2. Disable Row Level Security on all tables
ALTER TABLE public.inventory DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.generated_assets DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_library DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_media_connections DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_media_cached_data DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- 3. Drop triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS handle_profiles_updated_at ON public.profiles;

-- 4. Drop functions
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.handle_updated_at();

-- 5. Drop indexes (optional - for complete rollback)
DROP INDEX IF EXISTS inventory_user_id_idx;
DROP INDEX IF EXISTS inventory_is_active_idx;
DROP INDEX IF EXISTS generated_assets_user_id_idx;
DROP INDEX IF EXISTS generated_assets_is_active_idx;
DROP INDEX IF EXISTS asset_library_user_id_idx;
DROP INDEX IF EXISTS asset_library_is_active_idx;
DROP INDEX IF EXISTS profiles_is_active_idx;

-- 6. Remove user_id columns (WARNING: This will delete data!)
-- Uncomment these lines ONLY if you want to completely remove user_id columns
-- ALTER TABLE public.inventory DROP COLUMN IF EXISTS user_id;
-- ALTER TABLE public.generated_assets DROP COLUMN IF EXISTS user_id;
-- ALTER TABLE public.asset_library DROP COLUMN IF EXISTS user_id;

-- 7. Remove soft delete columns (WARNING: This will delete data!)
-- Uncomment these lines ONLY if you want to completely remove soft delete columns
-- ALTER TABLE public.inventory DROP COLUMN IF EXISTS is_active;
-- ALTER TABLE public.inventory DROP COLUMN IF EXISTS deleted_at;
-- ALTER TABLE public.generated_assets DROP COLUMN IF EXISTS is_active;
-- ALTER TABLE public.generated_assets DROP COLUMN IF EXISTS deleted_at;
-- ALTER TABLE public.asset_library DROP COLUMN IF EXISTS is_active;
-- ALTER TABLE public.asset_library DROP COLUMN IF EXISTS deleted_at;
-- ALTER TABLE public.profiles DROP COLUMN IF EXISTS is_active;
-- ALTER TABLE public.profiles DROP COLUMN IF EXISTS deleted_at; 