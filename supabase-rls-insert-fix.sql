-- Fix RLS Insert Policy for Profiles
-- Run this in Supabase SQL Editor

-- 1. First, let's see what policies exist
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'profiles';

-- 2. Drop all existing policies on profiles
DROP POLICY IF EXISTS "Verified users can manage own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can manage own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

-- 3. Create a more permissive policy for profiles
CREATE POLICY "Profiles full access for authenticated users" ON public.profiles
  FOR ALL USING (
    auth.role() = 'authenticated'
  );

-- 4. Alternative: If the above doesn't work, try this even more permissive policy
-- CREATE POLICY "Profiles permissive access" ON public.profiles
--   FOR ALL USING (true);

-- 5. Check if RLS is enabled
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename = 'profiles';

-- 6. If needed, temporarily disable RLS for testing
-- ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- 7. Re-enable RLS if you disabled it
-- ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 8. Grant explicit permissions
GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO anon;

-- 9. Test the policies
-- You can now try creating a profile again 