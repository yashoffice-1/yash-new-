# Migration Guide: From Custom JWT to Supabase Authentication

## Overview
This guide helps you migrate from the current custom JWT authentication system to Supabase authentication with email verification and password reset functionality.

## Prerequisites
- Supabase project created
- Supabase URL and anon key
- Access to your database

## Step 1: Set Up Supabase Project

1. **Create Supabase Project**
   - Go to [supabase.com](https://supabase.com)
   - Create a new project
   - Note your project URL and anon key

2. **Configure Environment Variables**
   ```env
   # .env
   VITE_SUPABASE_URL=your-supabase-project-url
   VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```

## Step 2: Database Schema Changes

### 2.1 Run Prisma Migration

Execute this command to add the required fields:

```bash
cd backend
npx prisma migrate dev --name add_user_id_and_soft_delete_fields
```

This will:
- ✅ Add `user_id` fields to all tables
- ✅ Add `is_active` and `deleted_at` fields
- ✅ Create migration files for easy rollback

### 2.2 Run Supabase Auth Setup

After Prisma migration, run this SQL script in your Supabase SQL Editor:

```sql
-- Supabase Authentication Setup
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
    auth.uid() = user_id AND 
    is_active = true AND 
    deleted_at IS NULL
  );

-- 3. Create RLS policies for generated_assets
CREATE POLICY "Verified users can manage own generated assets" ON public.generated_assets
  FOR ALL USING (
    auth.uid() = user_id AND 
    is_active = true AND 
    deleted_at IS NULL
  );

-- 4. Create RLS policies for asset_library
CREATE POLICY "Verified users can manage own asset library" ON public.asset_library
  FOR ALL USING (
    auth.uid() = user_id AND 
    is_active = true AND 
    deleted_at IS NULL
  );

-- 5. Create RLS policies for social_media_connections
CREATE POLICY "Verified users can manage own social connections" ON public.social_media_connections
  FOR ALL USING (
    auth.uid() = profile_id AND 
    is_active = true
  );

-- 6. Create RLS policies for social_media_cached_data
CREATE POLICY "Verified users can manage own cached data" ON public.social_media_cached_data
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.social_media_connections 
      WHERE id = connection_id AND profile_id = auth.uid()
    )
  );

-- 7. Create RLS policies for profiles
CREATE POLICY "Verified users can manage own profile" ON public.profiles
  FOR ALL USING (
    auth.uid() = id AND 
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
```

## Step 3: Frontend Changes

### 3.1 Updated Files
The following files have been updated to use Supabase authentication:

- ✅ `src/contexts/AuthContext.tsx` - Complete Supabase integration
- ✅ `src/components/auth/ProtectedRoute.tsx` - Email verification enforcement
- ✅ `src/App.tsx` - New authentication routes
- ✅ `src/pages/auth/ForgotPassword.tsx` - Password reset request
- ✅ `src/pages/auth/ResetPassword.tsx` - Password reset completion
- ✅ `src/pages/auth/VerifyEmail.tsx` - Email verification page
- ✅ `src/components/auth/SignUpForm.tsx` - Redirects to verification

### 3.2 New Authentication Flow

```
1. User Signs Up → Account created (unverified)
2. User receives verification email
3. User clicks verification link → Email verified
4. User can now sign in and access app
5. Unverified users are blocked from all app features
```

## Step 4: Backend Changes

### 4.1 Remove Custom Auth Routes
Remove or update these backend routes:
- `POST /auth/signup` - Now handled by Supabase
- `POST /auth/signin` - Now handled by Supabase
- `POST /auth/verify-email` - Now handled by Supabase
- `POST /auth/reset-password` - Now handled by Supabase

### 4.2 Update API Routes
All API routes should now:
1. Verify Supabase JWT tokens
2. Use `auth.uid()` for user identification
3. Include user_id in all database operations
4. Filter by `is_active = true` and `deleted_at IS NULL`

Example:
```typescript
// Before (custom JWT)
const userId = req.user.id;

// After (Supabase)
const { data: { user } } = await supabase.auth.getUser();
const userId = user?.id;
```

## Step 5: Data Migration

### 5.1 Migrate Existing Users
If you have existing users, you'll need to:

1. **Create Supabase accounts** for existing users
2. **Migrate user data** to the new profiles table
3. **Update existing records** with user_id foreign keys

```sql
-- Example migration script for existing users
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at)
SELECT 
  gen_random_uuid(),
  email,
  crypt(password, gen_salt('bf')),
  CASE WHEN status = 'verified' THEN NOW() ELSE NULL END,
  created_at
FROM old_profiles_table;

-- Then update existing records with user_id
UPDATE inventory SET user_id = (SELECT id FROM auth.users WHERE email = 'user@example.com')
WHERE user_id IS NULL;
```

### 5.2 Update Existing Records
```sql
-- Set default values for existing records
UPDATE inventory SET is_active = true WHERE is_active IS NULL;
UPDATE generated_assets SET is_active = true WHERE is_active IS NULL;
UPDATE asset_library SET is_active = true WHERE is_active IS NULL;
```

## Step 6: Testing

### 6.1 Test Authentication Flow
1. **Sign Up** → Should redirect to email verification
2. **Verify Email** → Should allow access to app
3. **Sign In (unverified)** → Should show verification required
4. **Forgot Password** → Should send reset email
5. **Reset Password** → Should allow password change

### 6.2 Test Data Access
1. **Verified user** → Should access own data only
2. **Unverified user** → Should be blocked from all data
3. **Different user** → Should not access other users' data

## Step 7: Security Verification

### 7.1 Row Level Security (RLS)
Verify RLS policies are working:
```sql
-- Test RLS policies
SELECT * FROM inventory WHERE user_id = auth.uid();
-- Should only return current user's data
```

### 7.2 Email Verification Enforcement
- Unverified users cannot sign in
- Unverified users cannot access protected routes
- Unverified users cannot access API endpoints

## ROLLBACK GUIDE

### Safe Rollback (Keep Data)
If you need to rollback at any stage:

#### Step 1: Rollback Supabase Changes
Run this SQL script in Supabase SQL Editor:

```sql
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
```

#### Step 2: Rollback Prisma Changes
```bash
cd backend
npx prisma migrate reset
```

### Complete Rollback (Remove Everything)
1. **Uncomment the dangerous lines** in the rollback script above
2. **Run the rollback script** in Supabase
3. **Rollback Prisma migration**
4. **Revert frontend changes** with git

## Troubleshooting

### Common Issues

1. **"User not found" errors**
   - Check if user exists in `auth.users` table
   - Verify email verification status

2. **RLS policy violations**
   - Ensure user is authenticated
   - Check if user_id matches auth.uid()
   - Verify is_active and deleted_at filters

3. **Email verification not working**
   - Check Supabase email settings
   - Verify email templates
   - Check spam folder

### Debug Commands
```sql
-- Check user verification status
SELECT id, email, email_confirmed_at FROM auth.users;

-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'inventory';

-- Test data access
SELECT * FROM inventory WHERE user_id = 'your-user-id';
```

## Support

For issues with:
- **Supabase setup**: Check [Supabase docs](https://supabase.com/docs)
- **Authentication flow**: Review the updated AuthContext
- **Database issues**: Check migration scripts
- **Frontend issues**: Review component updates 