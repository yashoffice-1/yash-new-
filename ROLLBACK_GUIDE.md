# Rollback Guide: Undoing Supabase Authentication Changes

## Overview
This guide shows you how to safely rollback all changes made during the Supabase authentication implementation.

## Current Stage: After Prisma Migration + Supabase Auth Setup

### What We've Done So Far:
1. ✅ Added `user_id`, `is_active`, `deleted_at` fields to tables (Prisma)
2. ✅ Enabled RLS policies (Supabase)
3. ✅ Created triggers and functions (Supabase)
4. ✅ Added performance indexes (Supabase)

## Rollback Options

### Option 1: Safe Rollback (Keep Data)
This removes Supabase auth features but keeps your data intact.

#### Step 1: Rollback Supabase Changes
1. Go to Supabase Dashboard → SQL Editor
2. Run the rollback script: `backend/prisma/supabase-rollback.sql`
3. This will:
   - Remove RLS policies
   - Disable RLS on tables
   - Drop triggers and functions
   - Drop performance indexes
   - **Keep your data and columns**

#### Step 2: Rollback Prisma Changes
```bash
cd backend
npx prisma migrate reset
# OR
npx prisma migrate resolve --rolled-back add_user_id_and_soft_delete_fields
```

### Option 2: Complete Rollback (Remove Everything)
This completely removes all changes and data.

#### Step 1: Complete Supabase Rollback
1. Go to Supabase Dashboard → SQL Editor
2. Edit `backend/prisma/supabase-rollback.sql`
3. **Uncomment the dangerous lines** (lines 6 and 7)
4. Run the script
5. This will **DELETE** all user_id and soft delete columns

#### Step 2: Complete Prisma Rollback
```bash
cd backend
npx prisma migrate reset
```

## Rollback at Different Stages

### Stage 1: After Prisma Migration Only
```bash
# Just rollback Prisma
cd backend
npx prisma migrate reset
```

### Stage 2: After Supabase Auth Setup (Current)
```bash
# 1. Rollback Supabase (run rollback script)
# 2. Rollback Prisma
cd backend
npx prisma migrate reset
```

### Stage 3: After Frontend Changes
```bash
# 1. Revert frontend changes (git)
git checkout main
# 2. Rollback Supabase (run rollback script)
# 3. Rollback Prisma
cd backend
npx prisma migrate reset
```

## Verification Commands

### Check Current State
```sql
-- Check if RLS is enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';

-- Check RLS policies
SELECT tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public';

-- Check if columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'inventory' 
AND column_name IN ('user_id', 'is_active', 'deleted_at');
```

### Verify Rollback Success
```sql
-- Should return no rows if rollback successful
SELECT tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public';

-- Should return no rows if columns removed
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'inventory' 
AND column_name IN ('user_id', 'is_active', 'deleted_at');
```

## Safety Tips

### Before Rolling Back:
1. **Backup your data** (if important)
2. **Test rollback on a copy** first
3. **Document current state** for reference

### During Rollback:
1. **Run commands one by one**
2. **Verify each step** before proceeding
3. **Keep terminal open** to see any errors

### After Rollback:
1. **Test your application** thoroughly
2. **Verify data integrity**
3. **Check all functionality** works as before

## Emergency Recovery

If something goes wrong:

### Database Issues:
```sql
-- Check for errors
SELECT * FROM pg_stat_activity WHERE state = 'active';

-- Kill problematic queries
SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = 'active';
```

### Prisma Issues:
```bash
# Reset Prisma client
npx prisma generate

# Reset database connection
npx prisma db pull
```

### Application Issues:
```bash
# Clear node modules and reinstall
rm -rf node_modules
npm install

# Restart development server
npm run dev
```

## Quick Rollback Commands

### Complete Rollback (One Command):
```bash
# 1. Run Supabase rollback script
# 2. Rollback Prisma
cd backend && npx prisma migrate reset
# 3. Revert frontend
git checkout main
```

### Safe Rollback (Keep Data):
```bash
# 1. Run Supabase rollback script (without uncommenting dangerous lines)
# 2. Rollback Prisma
cd backend && npx prisma migrate reset
```

## Next Steps After Rollback

1. **Verify application works** as before
2. **Test all features** thoroughly
3. **Consider alternative approaches** if needed
4. **Document lessons learned** for future

## Support

If you encounter issues during rollback:
1. Check the error messages carefully
2. Verify your database connection
3. Ensure you have proper permissions
4. Contact support if needed 