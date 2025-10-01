-- ============================================================================
-- FIX RLS WITHOUT RECURSION - FINAL SOLUTION
-- ============================================================================
-- Uses a security definer function to break the recursion cycle
-- ============================================================================

-- Step 1: Drop all existing policies to start clean
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
DROP POLICY IF EXISTS "Users read own profile" ON profiles;
DROP POLICY IF EXISTS "Super admins read all profiles" ON profiles;
DROP POLICY IF EXISTS "Users read own org" ON organizations;
DROP POLICY IF EXISTS "Super admins read all orgs" ON organizations;
DROP POLICY IF EXISTS "Super admins create orgs" ON organizations;
DROP POLICY IF EXISTS "Super admins update orgs" ON organizations;
DROP POLICY IF EXISTS "Super admins delete orgs" ON organizations;

-- Step 2: Ensure super admin has NULL organization_id
UPDATE profiles
SET organization_id = NULL
WHERE user_id = '06a91bf8-7754-4f20-80bf-ec4a44999b66'
AND role = 'super_admin';

-- Step 3: Create a security definer function to check if user is super admin
-- This function runs with elevated privileges and breaks the recursion cycle
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

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION is_super_admin() TO authenticated;

-- Step 4: Create non-recursive policies using the function

-- PROFILES: Users can always read their own profile
CREATE POLICY "Users read own profile"
ON profiles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- PROFILES: Super admins can read all profiles (no recursion!)
CREATE POLICY "Super admins read all profiles"
ON profiles
FOR SELECT
TO authenticated
USING (is_super_admin());

-- ORGANIZATIONS: Regular users can read their own organization
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
CREATE POLICY "Super admins read all orgs"
ON organizations
FOR SELECT
TO authenticated
USING (is_super_admin());

-- ORGANIZATIONS: Super admins can INSERT new organizations
CREATE POLICY "Super admins create orgs"
ON organizations
FOR INSERT
TO authenticated
WITH CHECK (is_super_admin());

-- ORGANIZATIONS: Super admins can UPDATE organizations
CREATE POLICY "Super admins update orgs"
ON organizations
FOR UPDATE
TO authenticated
USING (is_super_admin())
WITH CHECK (is_super_admin());

-- ORGANIZATIONS: Super admins can DELETE organizations
CREATE POLICY "Super admins delete orgs"
ON organizations
FOR DELETE
TO authenticated
USING (is_super_admin());

-- Step 5: Verify setup
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

SELECT '=== is_super_admin() Function ===' as info;
SELECT
    proname as function_name,
    prosecdef as is_security_definer,
    CASE
        WHEN prosecdef THEN '✓ Security Definer (correct)'
        ELSE '✗ Not Security Definer'
    END as security_check
FROM pg_proc
WHERE proname = 'is_super_admin';

SELECT '=== Organizations Policies ===' as info;
SELECT
    policyname,
    cmd,
    '✓' as status
FROM pg_policies
WHERE tablename = 'organizations'
ORDER BY cmd, policyname;

SELECT '=== Profiles Policies ===' as info;
SELECT
    policyname,
    cmd,
    '✓' as status
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY cmd, policyname;

SELECT '=== All Organizations (visible to super admin) ===' as info;
SELECT id, name, slug, is_active FROM organizations ORDER BY created_at DESC;
