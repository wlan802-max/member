# Restore Super Admin Access

## Problem
After applying RLS policies, you're getting:
- **500 Internal Server Error** when loading profile
- **"No profile found for user"** error
- **Access Denied** message

## Root Cause
The RLS policies created a **circular dependency**:
1. Loading super admin profile tries to JOIN with organizations table
2. Organizations RLS policy checks if user is super_admin by querying profiles table
3. This creates infinite recursion → 500 error

Additionally, the profile query used `!inner` join which requires a matching organization, but super admins should have `organization_id = NULL`.

## Solution

### Step 1: Run SQL Fix
Open **Supabase SQL Editor** and run `FINAL_RLS_FIX.sql`:

This will:
1. Drop all problematic policies
2. Set super admin's `organization_id` to NULL
3. Create new non-recursive policies
4. Verify everything is set up correctly

### Step 2: Refresh Browser
1. Clear your browser cache or hard refresh (Ctrl+Shift+R / Cmd+Shift+R)
2. Navigate to `http://87.106.101.79?org=admin`
3. Login as `will@w-j-lander.uk`

You should now see the super admin dashboard with all organizations.

## What Was Changed in Code

### auth.ts
Changed from `organizations!inner()` to `organizations()`:
```typescript
// Before (INNER JOIN - fails for NULL org_id)
organizations!inner(id, name, slug, ...)

// After (LEFT JOIN - works for NULL org_id)
organizations(id, name, slug, ...)
```

This allows super admins with no organization to load their profile successfully.

## Key Design Decisions

### Super Admins Have No Organization
- Super admins: `organization_id = NULL`
- Regular users: `organization_id = <some-uuid>`

This makes it easy to distinguish super admins in RLS policies.

### Non-Recursive Policies
All policies use simple subqueries that check:
- `role = 'super_admin'`
- `organization_id IS NULL`

This avoids circular dependencies.

## Verification

After running the SQL, check that:

1. **Super admin profile is correct**:
```sql
SELECT user_id, email, role, organization_id
FROM profiles
WHERE user_id = '06a91bf8-7754-4f20-80bf-ec4a44999b66';
```
Should show: `organization_id = NULL`

2. **Policies exist**:
```sql
SELECT policyname FROM pg_policies WHERE tablename = 'organizations';
```
Should show policies for SELECT, INSERT, UPDATE, DELETE

3. **Profile loads without error**:
Check browser console - should show:
```
Profile loaded: {role: 'super_admin', org: undefined, has_org: false}
```

## Troubleshooting

### Still getting 500 error?
1. Check Supabase logs for detailed error
2. Verify `organization_id IS NULL` for super admin
3. Make sure all old policies were dropped

### Still seeing "Access Denied"?
1. Check profile role is exactly `'super_admin'` (case-sensitive)
2. Verify you're using `?org=admin` in URL
3. Check browser console for profile data

### Organizations not loading in dashboard?
1. Run this in Supabase SQL Editor:
```sql
-- Should return organizations
SELECT * FROM organizations;
```
2. If empty, the demo org may not exist - create one manually
3. Check browser console for fetch errors
