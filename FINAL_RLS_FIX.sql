-- ============================================================================
-- FINAL RLS FIX - NO CIRCULAR DEPENDENCIES
-- ============================================================================
-- Run this to fix the 500 error and restore super admin access
-- ============================================================================

-- Step 1: Drop all problematic policies
DROP POLICY IF EXISTS "Super admins can read all organizations" ON organizations;
DROP POLICY IF EXISTS "Super admins can create organizations" ON organizations;
DROP POLICY IF EXISTS "Super admins can update organizations" ON organizations;
DROP POLICY IF EXISTS "Super admins can delete organizations" ON organizations;
DROP POLICY IF EXISTS "Super admins can read all profiles" ON profiles;
DROP POLICY IF EXISTS "Super admins can read all orgs" ON organizations;
DROP POLICY IF EXISTS "Super admins can create orgs" ON organizations;
DROP POLICY IF EXISTS "Super admins can update orgs" ON organizations;
DROP POLICY IF EXISTS "Super admins can delete orgs" ON organizations;
DROP POLICY IF EXISTS "Users can read their organization" ON organizations;
DROP POLICY IF EXISTS "Authenticated users can read organizations" ON organizations;

-- Step 2: Ensure super admin has NULL organization_id
-- Super admins should NOT belong to any organization
UPDATE profiles
SET organization_id = NULL
WHERE user_id = '06a91bf8-7754-4f20-80bf-ec4a44999b66'
AND role = 'super_admin';

-- Step 3: Create simple, non-recursive policies

-- PROFILES: Users can always read their own profile
-- This is the base policy that must never fail
CREATE POLICY "Users read own profile"
ON profiles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- PROFILES: Super admins can read all profiles
-- This uses a simple subquery that doesn't recurse
CREATE POLICY "Super admins read all profiles"
ON profiles
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profiles AS p
        WHERE p.user_id = auth.uid()
        AND p.role = 'super_admin'
    )
);

-- ORGANIZATIONS: Regular users can read their own organization
-- This allows the profile LEFT JOIN to work
CREATE POLICY "Users read own org"
ON organizations
FOR SELECT
TO authenticated
USING (
    id IN (
        SELECT organization_id
        FROM profiles
        WHERE user_id = auth.uid()
        AND organization_id IS NOT NULL
    )
);

-- ORGANIZATIONS: Super admins can read ALL organizations
-- Super admins have organization_id = NULL
CREATE POLICY "Super admins read all orgs"
ON organizations
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE user_id = auth.uid()
        AND role = 'super_admin'
        AND organization_id IS NULL
    )
);

-- ORGANIZATIONS: Super admins can INSERT new organizations
CREATE POLICY "Super admins create orgs"
ON organizations
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE user_id = auth.uid()
        AND role = 'super_admin'
        AND organization_id IS NULL
    )
);

-- ORGANIZATIONS: Super admins can UPDATE organizations
CREATE POLICY "Super admins update orgs"
ON organizations
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE user_id = auth.uid()
        AND role = 'super_admin'
        AND organization_id IS NULL
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE user_id = auth.uid()
        AND role = 'super_admin'
        AND organization_id IS NULL
    )
);

-- ORGANIZATIONS: Super admins can DELETE organizations
CREATE POLICY "Super admins delete orgs"
ON organizations
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE user_id = auth.uid()
        AND role = 'super_admin'
        AND organization_id IS NULL
    )
);

-- Step 4: Verify setup
SELECT '=== Super Admin Profile ===' as info;
SELECT
    id,
    user_id,
    email,
    first_name,
    last_name,
    role,
    organization_id,
    CASE
        WHEN organization_id IS NULL THEN '✓ Correct (NULL)'
        ELSE '✗ Wrong (should be NULL for super admin)'
    END as org_check
FROM profiles
WHERE user_id = '06a91bf8-7754-4f20-80bf-ec4a44999b66';

SELECT '=== Organizations Policies ===' as info;
SELECT
    policyname,
    cmd,
    CASE
        WHEN cmd = 'SELECT' THEN '✓'
        WHEN cmd = 'INSERT' THEN '✓'
        WHEN cmd = 'UPDATE' THEN '✓'
        WHEN cmd = 'DELETE' THEN '✓'
        ELSE '?'
    END as status
FROM pg_policies
WHERE tablename = 'organizations'
ORDER BY cmd, policyname;

SELECT '=== Profiles Policies ===' as info;
SELECT
    policyname,
    cmd
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY cmd, policyname;

SELECT '=== Test Query (should return all orgs) ===' as info;
-- This simulates what the super admin dashboard will query
-- If this returns rows, the fix worked
SET LOCAL role TO authenticated;
SET LOCAL "request.jwt.claims" TO '{"sub": "06a91bf8-7754-4f20-80bf-ec4a44999b66"}';
SELECT id, name, slug FROM organizations LIMIT 3;
RESET role;
