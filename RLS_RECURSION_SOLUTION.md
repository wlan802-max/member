# RLS Recursion Problem & Solution

## The Problem: Infinite Recursion

When we try to create RLS policies for super admins, we hit a recursion problem:

```
Policy on profiles checks → is user super_admin?
  ↓
Query profiles table → triggers RLS on profiles
  ↓
Policy on profiles checks → is user super_admin?
  ↓
Query profiles table → triggers RLS on profiles
  ↓
... INFINITE LOOP → ERROR: infinite recursion detected
```

## Why This Happens

RLS policies are **recursive by nature**. When a policy says:
```sql
USING (
    EXISTS (
        SELECT 1 FROM profiles  -- This SELECT triggers RLS again!
        WHERE user_id = auth.uid()
        AND role = 'super_admin'
    )
)
```

PostgreSQL tries to check the profiles policy while **already checking the profiles policy**, causing infinite recursion.

## The Solution: Security Definer Function

A **SECURITY DEFINER** function runs with the permissions of the function creator (who has full access), bypassing RLS:

```sql
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid()
    AND role = 'super_admin'
    AND organization_id IS NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### How It Works

1. **Function is created by superuser** (you, via SQL Editor)
2. **Function runs with superuser privileges** (SECURITY DEFINER)
3. **Function bypasses RLS** when checking profiles table
4. **Policies call the function** instead of querying directly

### Policy Example
```sql
-- Instead of this (causes recursion):
CREATE POLICY "Super admins read all profiles"
USING (
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'super_admin')
);

-- Use this (no recursion):
CREATE POLICY "Super admins read all profiles"
USING (is_super_admin());
```

## Complete Solution

**Run `FIX_RLS_NO_RECURSION.sql`** in Supabase SQL Editor.

This will:
1. ✅ Drop all problematic policies
2. ✅ Set super admin's `organization_id` to NULL
3. ✅ Create `is_super_admin()` security definer function
4. ✅ Create policies that use the function (no recursion!)
5. ✅ Verify everything is working

## After Running the SQL

1. **Refresh your browser** at `http://87.106.101.79?org=admin`
2. **Login as super admin** (`will@w-j-lander.uk`)
3. **You should see**:
   - Profile loads successfully (no 500 error)
   - Super admin dashboard appears
   - All organizations are visible
   - Can create new organizations

## Verification

### Check if function exists:
```sql
SELECT proname, prosecdef
FROM pg_proc
WHERE proname = 'is_super_admin';
```
Should return: `is_super_admin | true`

### Test the function:
```sql
-- Run as your super admin user
SELECT is_super_admin();
```
Should return: `true`

### Check policies:
```sql
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE tablename IN ('profiles', 'organizations')
ORDER BY tablename, cmd, policyname;
```
Should show policies using `is_super_admin()`

## Why This Works

### Before (Recursion):
```
Policy checks → Query profiles → Policy checks → Query profiles → ∞
```

### After (No Recursion):
```
Policy checks → Call is_super_admin() → Function queries profiles (bypasses RLS) → Returns boolean ✓
```

The SECURITY DEFINER function acts as a "break" in the recursion chain by running with elevated privileges that bypass RLS.

## Security Considerations

### Is SECURITY DEFINER safe?

**Yes, when used correctly:**

1. ✅ Function only checks **read-only** data (user's role)
2. ✅ Function only returns **boolean** (not sensitive data)
3. ✅ Function uses `auth.uid()` (can't check other users)
4. ✅ Function has simple logic (easy to audit)

### What it doesn't allow:

- ❌ Can't bypass RLS for other tables
- ❌ Can't check other users (uses `auth.uid()`)
- ❌ Can't modify data (returns boolean only)
- ❌ Can't expose sensitive information

### Best Practices:

1. Keep security definer functions **simple and focused**
2. Only return **boolean or non-sensitive data**
3. Always use `auth.uid()` to check **current user only**
4. Regularly **audit these functions**

## Alternative Approaches (Why We Didn't Use Them)

### 1. JWT Claims
Store role in JWT: `auth.jwt() ->> 'role'`
- ❌ Requires custom JWT modification
- ❌ More complex setup
- ❌ Harder to update roles in real-time

### 2. Separate Super Admins Table
Create `super_admins` table with user_ids
- ❌ Data duplication
- ❌ Sync issues between tables
- ❌ More maintenance overhead

### 3. Disable RLS
Turn off RLS for super admins
- ❌ Major security risk
- ❌ All-or-nothing approach
- ❌ Not recommended

**Security Definer Function** is the cleanest, most secure solution.

## Troubleshooting

### Still getting recursion error?
1. Make sure old policies are dropped
2. Verify function is SECURITY DEFINER
3. Check function uses auth.uid() correctly

### Function not found?
1. Grant execute: `GRANT EXECUTE ON FUNCTION is_super_admin() TO authenticated;`
2. Verify function exists: `SELECT * FROM pg_proc WHERE proname = 'is_super_admin';`

### Super admin check returns false?
1. Check profile: `SELECT * FROM profiles WHERE user_id = auth.uid();`
2. Verify: `role = 'super_admin'` and `organization_id IS NULL`
3. Update if needed: `UPDATE profiles SET organization_id = NULL, role = 'super_admin' WHERE user_id = '...';`

## Summary

- **Problem**: RLS policies checking profiles table from profiles policies cause infinite recursion
- **Solution**: Security definer function bypasses RLS when checking user role
- **Implementation**: Run `FIX_RLS_NO_RECURSION.sql`
- **Result**: No recursion, super admin access restored, all features working
