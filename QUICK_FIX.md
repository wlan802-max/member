# Quick Fix for Infinite Recursion Error

## The Error You're Getting
```
ERROR: 42P17: infinite recursion detected in policy for relation "profiles"
```

## The 2-Minute Fix

### Step 1: Open Supabase SQL Editor
Go to your Supabase Dashboard → SQL Editor

### Step 2: Copy and Run This SQL
Run the entire contents of **`FIX_RLS_NO_RECURSION.sql`**

### Step 3: Refresh Your Browser
1. Go to `http://87.106.101.79?org=admin`
2. Login as `will@w-j-lander.uk`
3. ✅ Super admin dashboard should now work!

## What This Does

1. **Drops all broken policies** that cause recursion
2. **Creates a special function** (`is_super_admin()`) that checks your role without recursion
3. **Sets up new policies** that use this function
4. **Verifies everything** is configured correctly

## Expected Output After Running SQL

You should see several tables showing:
- ✓ Super Admin Profile (with `organization_id = NULL`)
- ✓ Security Definer Function created
- ✓ All policies created successfully
- ✓ List of organizations in your database

## Why This Works

The recursion happened because:
- Policy on profiles checked if you're super_admin
- That check queried the profiles table
- Which triggered the policy again
- Which queried profiles again
- = Infinite loop ⚠️

The solution:
- Creates a `SECURITY DEFINER` function that bypasses RLS
- Policies call this function instead
- No more recursion! ✅

## If You Still Have Issues

### Check 1: Verify function exists
```sql
SELECT proname, prosecdef FROM pg_proc WHERE proname = 'is_super_admin';
```
Should return: `is_super_admin | true`

### Check 2: Verify your profile
```sql
SELECT user_id, email, role, organization_id
FROM profiles
WHERE user_id = '06a91bf8-7754-4f20-80bf-ec4a44999b66';
```
Should show: `role = super_admin` and `organization_id = NULL`

### Check 3: Test the function
```sql
SELECT is_super_admin();
```
Should return: `true` (when logged in as super admin)

## For More Details

Read these files for complete explanation:
- **RLS_RECURSION_SOLUTION.md** - Full technical explanation
- **SUPER_ADMIN_FIX_SUMMARY.md** - Complete fix documentation

## Summary

**Problem**: Infinite recursion in RLS policies
**Solution**: Security definer function breaks the recursion
**Action**: Run `FIX_RLS_NO_RECURSION.sql` in Supabase SQL Editor
**Result**: Super admin access restored, dashboard works perfectly
