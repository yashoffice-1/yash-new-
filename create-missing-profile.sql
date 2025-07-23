-- Script to create missing profile for current user
-- Run this in your Supabase SQL editor

-- First, let's see what users exist in auth.users
SELECT id, email, raw_user_meta_data, created_at 
FROM auth.users 
ORDER BY created_at DESC;

-- Then, let's see what profiles exist
SELECT id, email, first_name, last_name, display_name, created_at 
FROM public.profiles 
ORDER BY created_at DESC;

-- Create profile for the most recent user (replace with actual user ID if needed)
-- Replace 'YOUR_USER_ID_HERE' with the actual user ID from the first query
INSERT INTO public.profiles (
  id, 
  email, 
  first_name, 
  last_name, 
  display_name, 
  initials, 
  status,
  password,
  is_active,
  created_at,
  updated_at
) 
SELECT 
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'first_name', 'User'),
  COALESCE(au.raw_user_meta_data->>'last_name', 'Name'),
  COALESCE(au.raw_user_meta_data->>'display_name', 'User Name'),
  COALESCE(au.raw_user_meta_data->>'initials', 'UN'),
  'verified',
  '',
  true,
  NOW(),
  NOW()
FROM auth.users au
WHERE au.id = 'YOUR_USER_ID_HERE'  -- Replace with actual user ID
AND NOT EXISTS (
  SELECT 1 FROM public.profiles p WHERE p.id = au.id
);

-- Verify the profile was created
SELECT * FROM public.profiles WHERE id = 'YOUR_USER_ID_HERE'; 