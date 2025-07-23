-- Fix RLS Policies for Profiles and Other Tables
-- Run this in Supabase SQL Editor

-- 1. First, let's check and fix the profiles RLS policy
DROP POLICY IF EXISTS "Verified users can manage own profile" ON public.profiles;

-- Create a more permissive policy for profiles during development
CREATE POLICY "Users can manage own profile" ON public.profiles
  FOR ALL USING (
    auth.uid()::text = id::text
  );

-- 2. Fix inventory RLS policy
DROP POLICY IF EXISTS "Verified users can manage own inventory" ON public.inventory;
CREATE POLICY "Users can manage own inventory" ON public.inventory
  FOR ALL USING (
    auth.uid()::text = user_id::text
  );

-- 3. Fix generated_assets RLS policy
DROP POLICY IF EXISTS "Verified users can manage own generated assets" ON public.generated_assets;
CREATE POLICY "Users can manage own generated assets" ON public.generated_assets
  FOR ALL USING (
    auth.uid()::text = user_id::text
  );

-- 4. Fix asset_library RLS policy
DROP POLICY IF EXISTS "Verified users can manage own asset library" ON public.asset_library;
CREATE POLICY "Users can manage own asset library" ON public.asset_library
  FOR ALL USING (
    auth.uid()::text = user_id::text
  );

-- 5. Fix social_media_connections RLS policy
DROP POLICY IF EXISTS "Verified users can manage own social connections" ON public.social_media_connections;
CREATE POLICY "Users can manage own social connections" ON public.social_media_connections
  FOR ALL USING (
    auth.uid()::text = profile_id::text
  );

-- 6. Fix social_media_cached_data RLS policy
DROP POLICY IF EXISTS "Verified users can manage own cached data" ON public.social_media_cached_data;
CREATE POLICY "Users can manage own cached data" ON public.social_media_cached_data
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.social_media_connections 
      WHERE id = connection_id AND profile_id::text = auth.uid()::text
    )
  );

-- 7. For development, you might want to temporarily disable RLS on profiles
-- Uncomment the line below if you want to disable RLS temporarily
-- ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- 8. Test the policies
-- You can now try accessing the profiles table again 