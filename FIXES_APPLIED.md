# Organization Selector & Super Admin Access - Fixes Applied

## Issues Fixed

### Issue 1: Organization Selector Not Showing
**Problem:** `useTenant` was setting an error state when no org found, causing App.tsx to show error page

### Issue 2: Super Admin Profile Not Loading
**Problem:** Auth query used `.single()` instead of `.maybeSingle()`, failing silently when profile missing

## Changes Made

### 1. src/hooks/useTenant.ts (Line 23-32)

**Before:**
```typescript
if (!org) {
  console.log('No organization found, setting error')
  setError('Organization not found')
} else {
  console.log('Organization found:', org.name)
  setOrganization(org)
}
```

**After:**
```typescript
if (org) {
  console.log('Organization found:', org.name)
  setOrganization(org)
} else {
  console.log('No organization selected - will show selector')
  setOrganization(null)
}
```

**Why:** Don't set error when no org - this is expected when showing selector

### 2. src/lib/auth.ts (Line 50-97)

**Key Changes:**
- Changed `.single()` to `.maybeSingle()` (line 74)
- Added error logging to see why profile fails
- Added console warnings when profile not found
- Added success logging with role and org

**New Console Logs:**
```javascript
console.log('Getting profile for user:', user.id)
console.error('Error loading profile:', error)  // If query fails
console.warn('No profile found for user:', user.id)  // If no profile
console.log('Profile loaded:', { role, org })  // On success
```

## What You Need To Do Now

### Step 1: Check Your Profile in Database

Your user ID is: `06a91bf8-7754-4f20-80bf-ec4a44999b66`

Run this in Supabase SQL Editor:

```sql
-- Check if profile exists
SELECT
    p.user_id,
    p.email,
    p.first_name,
    p.last_name,
    p.role,
    p.is_active,
    o.id as org_id,
    o.slug as org_slug,
    o.name as org_name
FROM profiles p
LEFT JOIN organizations o ON p.organization_id = o.id
WHERE p.user_id = '06a91bf8-7754-4f20-80bf-ec4a44999b66';
```

### Expected Results:

#### If Profile Exists:
```
user_id: 06a91bf8-7754-4f20-80bf-ec4a44999b66
email: will@w-j-lander.uk
first_name: Will
last_name: Lander
role: super_admin
is_active: true
org_id: <admin-org-uuid>
org_slug: admin
org_name: System Administration
```

#### If No Results (Profile Missing):
You need to create the profile! Run this:

```sql
-- First get the admin organization ID
SELECT id FROM organizations WHERE slug = 'admin';
-- Copy the ID, then run:

INSERT INTO profiles (
    user_id,
    organization_id,
    email,
    first_name,
    last_name,
    role,
    is_active
) VALUES (
    '06a91bf8-7754-4f20-80bf-ec4a44999b66',
    'PASTE_ADMIN_ORG_ID_HERE',
    'will@w-j-lander.uk',
    'Will',
    'Lander',
    'super_admin',
    true
);
```

#### If Profile Has Wrong Role:
Update the role:

```sql
UPDATE profiles
SET role = 'super_admin'
WHERE user_id = '06a91bf8-7754-4f20-80bf-ec4a44999b66';
```

#### If Profile Has Wrong Organization:
Update the organization:

```sql
-- Get admin org ID first
SELECT id FROM organizations WHERE slug = 'admin';

-- Then update
UPDATE profiles
SET organization_id = 'PASTE_ADMIN_ORG_ID_HERE'
WHERE user_id = '06a91bf8-7754-4f20-80bf-ec4a44999b66';
```

### Step 2: Test Organization Selector

1. **Log out** if you're logged in
2. **Visit:** `http://87.106.199.5:5173` (no ?org= parameter)
3. **Expected:** You should now see:
   - "Select Organization" page
   - Both organizations listed (admin and demo)
   - Click to choose one

**Console should show:**
```
Loading organization...
Getting current organization...
Current organization result: null
No organization selected - will show selector
```

### Step 3: Test Super Admin Login

1. **Visit:** `http://87.106.199.5:5173?org=admin`
2. **Login** with your credentials
3. **Check console** for these new logs:

**Good Path (profile exists):**
```
Getting profile for user: 06a91bf8-7754-4f20-80bf-ec4a44999b66
Profile loaded: { role: 'super_admin', org: 'admin' }
Super admin portal detected, user: { id: ..., email: ..., profile: {...} }
User profile role: super_admin
Showing super admin dashboard
```

**Bad Path (profile missing):**
```
Getting profile for user: 06a91bf8-7754-4f20-80bf-ec4a44999b66
No profile found for user: 06a91bf8-7754-4f20-80bf-ec4a44999b66
Super admin portal detected, user: { id: ..., email: ..., profile: undefined }
User profile role: undefined
User is not super admin, showing access denied
```

## Troubleshooting

### Problem: Still see "Access Denied"

**Diagnosis:**
Look at console logs. If you see:
```
No profile found for user: 06a91bf8-7754-4f20-80bf-ec4a44999b66
```

**Solution:** Create the profile in database (see Step 1)

---

**Diagnosis:**
If you see an error like:
```
Error loading profile: { code: '...' }
```

**Solution:** Check RLS policies on profiles table:

```sql
-- Check policies
SELECT * FROM pg_policies WHERE tablename = 'profiles';

-- You need a policy like this:
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
```

---

### Problem: Organization Selector Still Not Showing

**Check these console logs:**

1. Visit `http://87.106.199.5:5173`
2. Open console (F12)
3. Look for:

```
Development mode (localhost/IP), no org param - showing selector
No organization selected - will show selector
```

If you DON'T see these, clear your browser cache completely.

**If you see:**
```
Organization not found
```

The old code is still cached. Do:
- Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
- Or open incognito/private window
- Or clear cache completely

---

### Problem: Can Login But Dashboard Shows Nothing

This means your profile exists but the super admin dashboard is empty.

**Solution:** The dashboard needs to be built out with features. For now, you should at least see:
- Header with "System Administration"
- Your name/email
- Logout button

## Quick Verification Script

Run all these in Supabase SQL Editor:

```sql
-- 1. Check organizations exist
SELECT slug, name, is_active FROM organizations ORDER BY name;
-- Should show: admin and demo

-- 2. Check your auth user
SELECT id, email, email_confirmed_at FROM auth.users
WHERE id = '06a91bf8-7754-4f20-80bf-ec4a44999b66';
-- Should show your user with confirmed email

-- 3. Check your profile
SELECT
    p.user_id,
    p.email,
    p.role,
    o.slug as org
FROM profiles p
JOIN organizations o ON p.organization_id = o.id
WHERE p.user_id = '06a91bf8-7754-4f20-80bf-ec4a44999b66';
-- Should show: role=super_admin, org=admin

-- 4. Check RLS policies on profiles
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE tablename = 'profiles';
-- Should have SELECT policy for authenticated users
```

## Summary Checklist

After refreshing your browser:

- ✅ Visit `http://87.106.199.5:5173` shows organization selector
- ✅ Organizations load and display correctly
- ✅ Clicking organization navigates to `?org=admin` or `?org=demo`
- ✅ Profile exists in database with role='super_admin'
- ✅ Login at `?org=admin` works
- ✅ Console shows "Profile loaded: { role: 'super_admin', org: 'admin' }"
- ✅ Super admin dashboard appears (not "Access Denied")

## Build Status

✅ Build completed successfully:
```
✓ 1559 modules transformed
✓ built in 3.84s
```

All TypeScript types valid and ready for testing!
